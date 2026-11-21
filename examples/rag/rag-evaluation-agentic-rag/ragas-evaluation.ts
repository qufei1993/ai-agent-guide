/**
 * RAGAS 风格答案质量评测（LLM-as-Judge，OpenAI 兼容接口）
 * 四大核心指标：faithfulness、answer_relevancy、context_precision、context_recall
 *
 * 运行（Node.js 22）：
 *   npx tsx --env-file=.env examples/rag/rag-evaluation-agentic-rag/ragas-evaluation.ts
 */

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

const MODEL = process.env.OPENAI_MODEL || process.env.MODEL || "gpt-4o-mini";

interface EvalSample {
  question: string;
  contexts: string[];
  answer: string;
  groundTruth: string;
}

interface RagasScore {
  faithfulness: number;
  answerRelevancy: number;
  contextPrecision: number;
  contextRecall: number;
  overall: number;
}

const evalDataset: EvalSample[] = [
  {
    question: "deleteAccount API 返回 409 的原因是什么，如何处理？",
    contexts: [
      "deleteAccount API 在删除用户前必须校验二次确认令牌。令牌过期会返回 401，数据库约束冲突会返回 409。删除前需检查外键引用，确认审计记录是否仍被其他服务占用。",
      "账号注销流程分为软删除和硬删除两个阶段。软删除标记账号为注销状态并保留 30 天，硬删除才会真正清理数据库记录。",
    ],
    answer:
      "deleteAccount API 返回 409 是因为数据库约束冲突，常见原因是审计记录仍被其他服务占用。建议先检查并清理外键引用后再发起删除。",
    groundTruth:
      "409 状态码表示数据库约束冲突，通常由审计记录的外键引用引起。应先清除外键依赖或改用软删除流程。",
  },
  {
    question: "用户数据在系统里会保留多久？",
    contexts: [
      "账号注销流程分为软删除和硬删除两个阶段。软删除标记账号为注销状态并保留 30 天，硬删除才会真正清理数据库记录。",
      "审计日志单独保留 7 年，满足 SOC2 合规要求。即使账号硬删除，审计记录也不会一并删除。",
    ],
    answer:
      "账号信息在软删除后保留 30 天才进入硬删除；审计日志单独保留 7 年以满足 SOC2 合规要求，不随账号删除清除。",
    groundTruth:
      "账号数据软删除后保留 30 天再硬删除；审计日志独立保留 7 年以满足 SOC2 合规。",
  },
  {
    question: "如何刷新过期的认证令牌？",
    contexts: [
      "deleteAccount API 在删除用户前必须校验二次确认令牌。令牌过期会返回 401，数据库约束冲突会返回 409。",
    ],
    // 故意放入一条脱离上下文编造步骤的回答，验证评测能否抓出低 faithfulness + 低 context_recall
    answer:
      "令牌过期会返回 401。请调用 /oauth/token 接口，携带 refresh_token 换取新的 access_token。",
    groundTruth:
      "令牌过期后使用 refresh_token 调用认证刷新端点换取新的 access_token，无需重新登录。",
  },
];

async function judgeJson<T>(prompt: string): Promise<T | null> {
  const res = await client.chat.completions.create({
    model: MODEL,
    temperature: 0,
    max_tokens: 256,
    messages: [
      {
        role: "system",
        content: "你是严谨的 RAG 质量评测器。只输出合法 JSON，不要输出 Markdown 代码块或多余解释。",
      },
      { role: "user", content: prompt },
    ],
  });

  const text = res.choices[0]?.message?.content ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

async function scoreFaithfulness(contexts: string[], answer: string): Promise<number> {
  const ctx = contexts.map((c, i) => `[${i + 1}] ${c}`).join("\n\n");
  const result = await judgeJson<{ score: number }>([
    "判断回答里的每个主要事实，是否都能在上下文中找到直接依据。",
    `上下文：\n${ctx}`,
    `回答：${answer}`,
    '输出 JSON：{"score": 0到1的数字, "reason": "一句话说明"}',
  ].join("\n\n"));
  return clamp01(result?.score ?? 0);
}

async function scoreAnswerRelevancy(question: string, answer: string): Promise<number> {
  const result = await judgeJson<{ score: number }>([
    "评估回答对用户问题的切题程度（是否直接回应核心问题，且无明显冗余）。",
    `问题：${question}`,
    `回答：${answer}`,
    '输出 JSON：{"score": 0到1的数字, "reason": "一句话说明"}',
  ].join("\n\n"));
  return clamp01(result?.score ?? 0);
}

async function scoreContextPrecision(question: string, contexts: string[]): Promise<number> {
  const verdicts = await Promise.all(
    contexts.map(async (ctx) => {
      const result = await judgeJson<{ useful: boolean }>([
        "以下上下文片段是否对回答该问题有直接帮助？",
        `问题：${question}`,
        `上下文片段：${ctx}`,
        '输出 JSON：{"useful": true 或 false}',
      ].join("\n\n"));
      return Boolean(result?.useful);
    }),
  );
  return contexts.length === 0 ? 0 : verdicts.filter(Boolean).length / contexts.length;
}

async function scoreContextRecall(contexts: string[], groundTruth: string): Promise<number> {
  const ctx = contexts.map((c, i) => `[${i + 1}] ${c}`).join("\n\n");
  const result = await judgeJson<{ score: number }>([
    "参考答案中的关键事实，在以下上下文中覆盖了多大比例？",
    `参考答案：${groundTruth}`,
    `上下文：\n${ctx}`,
    '输出 JSON：{"score": 0到1的数字, "reason": "一句话说明"}',
  ].join("\n\n"));
  return clamp01(result?.score ?? 0);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
}

async function evaluateSample(sample: EvalSample): Promise<RagasScore> {
  const [faithfulness, answerRelevancy, contextPrecision, contextRecall] =
    await Promise.all([
      scoreFaithfulness(sample.contexts, sample.answer),
      scoreAnswerRelevancy(sample.question, sample.answer),
      scoreContextPrecision(sample.question, sample.contexts),
      scoreContextRecall(sample.contexts, sample.groundTruth),
    ]);

  const overall = (faithfulness + answerRelevancy + contextPrecision + contextRecall) / 4;
  return { faithfulness, answerRelevancy, contextPrecision, contextRecall, overall };
}

async function main() {
  console.log(`RAGAS 答案质量评测 | 模型: ${MODEL} | 样本数: ${evalDataset.length}\n`);
  const scores: RagasScore[] = [];

  for (const [index, sample] of evalDataset.entries()) {
    const score = await evaluateSample(sample);
    scores.push(score);
    console.log(`[${index + 1}] ${sample.question}`);
    console.log(
      `    faithfulness=${score.faithfulness.toFixed(2)} | relevancy=${score.answerRelevancy.toFixed(2)} | precision=${score.contextPrecision.toFixed(2)} | recall=${score.contextRecall.toFixed(2)} | overall=${score.overall.toFixed(2)}`,
    );
  }

  const avg = (k: keyof RagasScore) =>
    scores.reduce((sum, s) => sum + s[k], 0) / scores.length;

  console.log("\n=== 评测汇总 ===");
  console.log(`Overall 均值：${avg("overall").toFixed(2)}（起始参考门槛 >= 0.80，且单指标 >= 0.60）`);
}

main().catch((err) => {
  console.error("运行失败：", err instanceof Error ? err.message : err);
  process.exit(1);
});
