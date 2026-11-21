# AI Agent Guide — 项目规范

## 项目定位与边界

本项目（**AI Agent Guide**）是面向软件工程师的**零构建、中英双语（`zh/` 与 `en/`）交互式开源工程指南**，托管于 GitHub Pages（`docs/` 目录），配套可运行示例统一放在同仓 `examples/` 下。

- **核心定位**：通过交互演示、精炼解释和单点可运行示例，讲清 LLM 约束、Agent 执行机制与 RAG 证据链路（核心机制与编程语言无关，参考代码默认使用 TypeScript）。
- **明确不做的范围**：
  - 不做重型完整商业项目（不写从 0 到 1 搭 Next.js + 数据库 + 多租户 + Docker 部署的实战）；
  - 不覆盖模型后训练（SFT / RL）、多模态生成与复杂多 Agent 系统；
  - 不设置选修模块，安全、评测、可观测性与成本控制贯穿各模块；
  - **公开仓库卫生边界**：严禁在任何公开页面或示例里带入个人绝对路径、真实 API Key、私人笔记或内部草稿信息。

## 目录结构

```text
ai-agent-fullstack-roadmap/
├── AGENTS.md                        # 本文件：项目唯一规范入口
├── README.md                        # 课程大纲、术语安排与本地预览说明
├── docs/                            # GitHub Pages 静态站点根目录（零构建，完全隔离）
│   ├── index.html                   # 语言自动路由页
│   ├── chapters.json                # 双语章节目录、siteUrl 与上线状态唯一索引
│   ├── sitemap.xml                  # 自动生成的双语站点地图
│   ├── robots.txt                   # 自动生成的爬虫协议
│   ├── shared/
│   │   ├── tokens.css               # 全局设计 Token、暗黑模式、通用组件样式
│   │   └── site.js                  # 顶栏导航、章节抽屉、浮动目录、中英切换
│   ├── zh/<slug>.html               # 中文交互式章节
│   └── en/<slug>.html               # 英文交互式章节（必须与中文版同 slug）
├── examples/                        # 与章节配套的可运行 TypeScript 示例
├── scripts/
│   └── generate-seo.mjs             # 同步每章 SEO 标签与 sitemap.xml / robots.txt
└── skills/
    └── interactive-book-chapter/    # 章节生成与更新专用 Skill（本地源目录）
```

## 大纲结构（19 篇：导览 + 3 个模块）

全站目录以 `README.md` 和 `docs/chapters.json` 为准，遵循“**尽早跑通最小 Agent，完整 RAG 不是前置要求**”“**区分信息层面的上下文压缩与程序层面的执行恢复**”的设计原则：

1. **导览（`overview`）**
   - `agent-architecture-map`：AI Agent 工程全景图（通过一次完整任务解释各组件协作，并提供按“模型与信息、Agent 运行、工程保障”分组的术语速查，重点区分 Prompt 与 Context、RAG 与 Memory、Tool Calling 与 MCP、上下文压缩与检查点恢复）
2. **模块一 · LLM 工程基础（`llm-foundations`）**
   - `prompt-engineering`：Prompt Engineering
   - `structured-output`：结构化输出与结果校验
   - `context-engineering`：Context Engineering
   - `prompt-regression`：Prompt 回归评测
3. **模块二 · Agent 核心机制（`agent-core`）**
   - `tool-calling-loop`：Tool Calling 与 Mini Agent Loop
   - `workflow-vs-agent`：Workflow 与 Agent 的架构选择
   - `planning-feedback-loop`：任务规划与反馈修正
   - `harness-engineering`：Harness 与执行边界
   - `memory-and-compaction`：记忆管理与上下文压缩
   - `state-checkpoint-recovery`：任务状态与中断恢复
   - `streaming-execution-ui`：流式交互与执行状态展示
   - `mcp-and-skills`：MCP 与 Skills 扩展机制
   - `agent-eval-tracing`：Agent 评测与轨迹诊断
4. **模块三 · RAG 检索与证据（`rag-evidence`）**
   - `document-parsing-chunking`：文档解析与分块策略
   - `embedding-vector-search`：Embedding 与向量检索
   - `hybrid-search-reranking`：混合检索、查询改写与重排
   - `citation-hallucination`：引用溯源与证据校验
   - `rag-evaluation-agentic-rag`：RAG 评测与 Agentic RAG

## 章节组织与交互规范

新建或改写任何章节时，必须先阅读 `skills/interactive-book-chapter/SKILL.md` 与 `references/html-architecture.md`，并遵守以下原则：

1. **核心叙事链**：每篇解决一个工程问题、增加一个关键机制，围绕 **“具体问题 → 最简实现 → 触发失败 → 增加机制 → 对比验证”** 展开。
2. **交互因果性**：交互实验台必须揭示参数或机制变化带来的因果关系，禁止无意义的纯装饰动画。
3. **公共层复用**：所有页面必须复用 `../shared/tokens.css` 与 `../shared/site.js`，不在单页 HTML 内重复实现全局顶栏、抽屉目录或暗黑模式逻辑。
4. **代码与复现同仓**：正文 `<details class="code-fold">` 展示核心 TypeScript 机制代码，并在 `.code-header` 或文末附带指向本仓库 `https://github.com/qufei1993/ai-agent-fullstack-roadmap/blob/main/examples/...` 的绝对源码链接（不可使用会 404 的相对路径）。
5. **Skill 维护规范**：更新 `interactive-book-chapter` 时，必须编辑本仓库的 `skills/interactive-book-chapter/` 源目录，再通过 `skillshub-cli skills update` 同步到 Skills Hub，严禁直接修改 `~/.gemini/config/skills/` 下的软链接副本。

## 信息准确性与引用规范

- **严禁编造数据与链接**：涉及论文指标、基准测试、API 特性时，必须保留真实来源链接，不得捏造。
- **区分模拟与真实**：交互实验台中的模拟数据、预设回答和预设轨迹必须在界面明确标注“模拟 / Simulated”，真实模型实验引导通过配套示例运行。

## 语言与排版规范

### 中文规范（`docs/zh/`）

- 中英文之间加空格（如 `使用 TypeScript 编写`），数字与中文之间加空格（如 `共 3 个实验台`）。
- 全角中文引号使用 `“”`，禁止在中文正文里使用英文直引号 `""`。
- **禁用破折号 `——`**，改用逗号、句号或冒号断句。
- 禁用“第一、第二、第三”式列举，改用 `1. 2. 3.` 或小标题。
- 禁止使用“读完本章你能做到：”开头列表和“自检清单”复选框收尾。
- 禁止把读者写成旁观者（如“让读者看到”“省得读者疑惑”）以及元叙述句（如“这一节我们将讲解”）。

### 英文规范（`docs/en/`）

- 英文版重写为地道、简洁的工程师技术英语，并将交互实验台里的示例文本本地化为英文语境。
- 中英文页面必须使用完全一致的 `<slug>.html` 文件名，并在 `docs/chapters.json` 的 `langs` 数组中准确登记。

## 提交前验收门禁

每次新增或修改 `docs/` 下的页面后，必须完成以下检查：

1. `README.md`、`docs/chapters.json` 与 `docs/zh/`、`docs/en/` 实际文件严格一致，无死链。
2. 行内 JS 语法校验通过（`node -e` 使用 `vm.Script` 校验无语法错误）。
3. 本地预览（`python3 -m http.server 8766 --directory docs`）打开验证：控制台 `0` 报错，交互控件、浅色/深色主题切换、章节抽屉与中英切换均正常工作。
