/**
 * 检索质量评测：Recall@K 与 MRR
 *
 * 运行（Node.js 22）：
 *   npx tsx examples/rag/rag-evaluation-agentic-rag/retrieval-metrics.ts
 */

export interface EvalRecord {
  query: string;
  relevantDocIds: string[]; // 人工标注的 Ground Truth 相关文档 ID
  retrievedDocIds: string[]; // 检索系统返回的排序列表
}

// 5 个典型业务问题与人工标注的相关文档 ID
export const evalDataset: EvalRecord[] = [
  {
    query: "deleteAccount API 返回 409 是什么原因？",
    relevantDocIds: ["api-error-codes-001", "account-deletion-flow-003"],
    retrievedDocIds: [
      "api-error-codes-001",
      "auth-token-refresh-007",
      "account-deletion-flow-003",
      "user-permissions-012",
      "session-management-004",
    ],
  },
  {
    query: "软删除和硬删除的区别是什么？",
    relevantDocIds: ["account-deletion-flow-003"],
    retrievedDocIds: [
      "account-deletion-flow-003",
      "data-retention-policy-009",
      "gdpr-compliance-011",
      "user-permissions-012",
      "audit-log-schema-006",
    ],
  },
  {
    query: "审计日志保留多少天？",
    relevantDocIds: ["audit-log-schema-006", "data-retention-policy-009"],
    retrievedDocIds: [
      "data-retention-policy-009",
      "gdpr-compliance-011",
      "audit-log-schema-006",
      "backup-strategy-015",
      "auth-token-refresh-007",
    ],
  },
  {
    query: "令牌过期后如何刷新认证？",
    relevantDocIds: ["auth-token-refresh-007"],
    retrievedDocIds: [
      "session-management-004",
      "user-permissions-012",
      "api-error-codes-001",
      "auth-token-refresh-007",
      "account-deletion-flow-003",
    ],
  },
  {
    query: "GDPR 合规要求删除哪些用户数据？",
    relevantDocIds: [
      "gdpr-compliance-011",
      "data-retention-policy-009",
      "audit-log-schema-006",
    ],
    retrievedDocIds: [
      "gdpr-compliance-011",
      "data-retention-policy-009",
      "user-permissions-012",
      "account-deletion-flow-003",
      "backup-strategy-015",
    ],
  },
];

// Recall@K：Top-K 里命中相关文档占全部相关文档的比例
export function recallAtK(
  retrieved: string[],
  relevant: string[],
  k: number,
): number {
  if (relevant.length === 0) return 0;
  const topK = retrieved.slice(0, k);
  const hits = topK.filter((id) => relevant.includes(id)).length;
  return hits / relevant.length;
}

// Reciprocal Rank：首个相关文档命中位置的倒数
export function reciprocalRank(
  retrieved: string[],
  relevant: string[],
): number {
  for (let i = 0; i < retrieved.length; i++) {
    if (relevant.includes(retrieved[i])) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

export function evaluateRetrieval(dataset: EvalRecord[], k: number) {
  const details = dataset.map((record) => {
    const recall = recallAtK(record.retrievedDocIds, record.relevantDocIds, k);
    const rr = reciprocalRank(record.retrievedDocIds, record.relevantDocIds);
    return {
      query: record.query,
      [`Recall@${k}`]: Number(recall.toFixed(3)),
      RR: Number(rr.toFixed(3)),
    };
  });

  const avgRecall =
    details.reduce(
      (sum, row) => sum + Number(row[`Recall@${k}` as keyof typeof row]),
      0,
    ) / dataset.length;
  const mrr =
    details.reduce((sum, row) => sum + row.RR, 0) / dataset.length;

  return { recallAtK: avgRecall, mrr, details };
}

function printReport(
  k: number,
  result: ReturnType<typeof evaluateRetrieval>,
) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`检索质量评测报告（K = ${k}）`);
  console.log("=".repeat(60));
  console.table(result.details);
  console.log(`汇总 Recall@${k}: ${(result.recallAtK * 100).toFixed(1)}%`);
  console.log(`汇总 MRR     : ${result.mrr.toFixed(3)}`);

  const recallOk = result.recallAtK >= 0.8;
  const mrrOk = result.mrr >= 0.6;
  console.log(
    `  Recall@${k} ${recallOk ? "✓ 达标 (>= 80%)" : "✗ 未达标 (< 80%)，建议排查 Top-K、切片粒度或 Embedding 模型"}`,
  );
  console.log(
    `  MRR       ${mrrOk ? "✓ 达标 (>= 0.60)" : "✗ 未达标 (< 0.60)，相关文档排名靠后，建议优化 Reranker"}`,
  );
}

function main() {
  const uniqueDocs = new Set(evalDataset.flatMap((r) => r.relevantDocIds));
  console.log(
    `评测集：${evalDataset.length} 条问题，涉及 ${uniqueDocs.size} 篇相关文档`,
  );

  printReport(3, evaluateRetrieval(evalDataset, 3));
  printReport(5, evaluateRetrieval(evalDataset, 5));
}

main();
