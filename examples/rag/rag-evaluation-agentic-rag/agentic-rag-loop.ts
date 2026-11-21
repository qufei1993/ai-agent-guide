/**
 * Agentic RAG 最小实现：带步数预算与多跳检索的动态检索循环（OpenAI 兼容接口）
 *
 * 演示当固定单轮检索（Top-2）漏掉跨文档依赖时，
 * Agent 如何通过 Tool Calling 拆分子查询并补全缺失证据。
 *
 * 运行（Node.js 22）：
 *   npx tsx --env-file=.env examples/rag/rag-evaluation-agentic-rag/agentic-rag-loop.ts
 */

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

const MODEL = process.env.OPENAI_MODEL || process.env.MODEL || "gpt-4o-mini";
const MAX_STEPS = 4;

interface KnowledgeDoc {
  id: string;
  title: string;
  tags: string[];
  content: string;
}

const KNOWLEDGE_BASE: KnowledgeDoc[] = [
  {
    id: "api-error-codes-001",
    title: "deleteAccount API 错误码说明",
    tags: ["deleteAccount", "409", "401", "外键", "错误码"],
    content:
      "deleteAccount API 返回 409 表示数据库外键约束冲突，常见原因是该账号仍有关联的审计记录或未结算账单。文档建议：若遇到 409，请先按《账号注销与保留策略》走软删除流程，不要强行执行硬删除。",
  },
  {
    id: "account-deletion-flow-003",
    title: "账号注销与保留策略",
    tags: ["软删除", "硬删除", "注销", "30天", "保留"],
    content:
      "软删除会将账号状态置为 pending_deletion 并保留 30 天冷静期；冷静期结束后系统才会触发硬删除作业。硬删除前必须确认审计日志归档规则，详见《SOC2 审计日志合规规范》。",
  },
  {
    id: "audit-log-schema-006",
    title: "SOC2 审计日志合规规范",
    tags: ["审计日志", "SOC2", "7年", "合规", "不可删除"],
    content:
      "根据 SOC2 合规要求，所有审计日志必须独立归档保存 7 年。即使主账号完成硬删除，审计表中的关联记录也不得物理删除，必须通过匿名化 user_hash 解除外键依赖。",
  },
  {
    id: "auth-token-refresh-007",
    title: "认证令牌刷新流程",
    tags: ["令牌", "401", "refresh_token", "access_token"],
    content:
      "当 API 返回 401 Token Expired 时，客户端应使用 refresh_token 调用 POST /v1/auth/refresh 换取新的 access_token。",
  },
];

// 简易关键词检索，模拟线上单路检索器
function searchKnowledgeBase(query: string, topK = 2): KnowledgeDoc[] {
  const terms = query.toLowerCase().split(/[\s,，。？！?、]+/).filter(Boolean);
  return KNOWLEDGE_BASE.map((doc) => {
    const haystack = `${doc.title} ${doc.tags.join(" ")} ${doc.content}`.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (haystack.includes(t)) score += 1;
    }
    for (const tag of doc.tags) {
      if (query.toLowerCase().includes(tag.toLowerCase())) score += 2;
    }
    return { doc, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((item) => item.doc);
}

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_knowledge_base",
      description: "按关键词或主题检索企业知识库，返回最相关的 Top-2 文档摘要。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "聚焦单一子问题的检索词，例如：deleteAccount 409 或 审计日志 保留 7年",
          },
        },
        required: ["query"],
      },
    },
  },
];

async function runAgenticRag(question: string) {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: [
        "你是企业知识库检索助手。必须完全基于 search_knowledge_base 返回的文档作答。",
        "如果首轮检索结果引用了其他文档或政策，但证据还不完整，可以继续调用 search_knowledge_base 发起补充查询。",
        "最多执行有限步数；证据凑齐后立即总结并标注引用文档 ID。",
      ].join("\n"),
    },
    { role: "user", content: question },
  ];

  let totalTokens = 0;
  const retrievedIds = new Set<string>();

  for (let step = 1; step <= MAX_STEPS; step++) {
    const res = await client.chat.completions.create({
      model: MODEL,
      temperature: 0,
      messages,
      tools,
    });

    totalTokens += res.usage?.total_tokens ?? 0;
    const msg = res.choices[0]?.message;
    if (!msg) break;
    messages.push(msg);

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      console.log(`\n[Step ${step}] 证据充足，生成最终回答：`);
      console.log(msg.content);
      console.log(
        `\n统计：共 ${step} 轮 LLM 调用 | 检索文档 [${[...retrievedIds].join(", ")}] | 约 ${totalTokens} tokens`,
      );
      return;
    }

    for (const toolCall of msg.tool_calls) {
      if (toolCall.type !== "function") continue;
      const args = JSON.parse(toolCall.function.arguments || "{}") as { query?: string };
      const query = args.query ?? question;
      const docs = searchKnowledgeBase(query, 2);
      docs.forEach((d) => retrievedIds.add(d.id));

      console.log(
        `[Step ${step}] 调用 search_knowledge_base("${query}") -> 命中 [${docs.map((d) => d.id).join(", ") || "无"}]`,
      );

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(
          docs.map((d) => ({ id: d.id, title: d.title, content: d.content })),
        ),
      });
    }
  }

  console.log(`\n达到最大步数预算（MAX_STEPS=${MAX_STEPS}），强制终止循环以防失控。`);
}

async function main() {
  const multiHopQuestion =
    "deleteAccount 返回 409 时，应该走什么删除流程？审计日志最后能一起物理删除吗？";

  console.log("=== 对照 1：固定单轮检索（Top-2）===");
  const fixedHits = searchKnowledgeBase(multiHopQuestion, 2);
  console.log("命中文档：", fixedHits.map((d) => d.id));

  console.log("\n=== 对照 2：Agentic RAG 多步检索 ===");
  await runAgenticRag(multiHopQuestion);
}

main().catch((err) => {
  console.error("运行失败：", err instanceof Error ? err.message : err);
  process.exit(1);
});
