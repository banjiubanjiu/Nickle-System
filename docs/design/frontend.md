# Nickel Dashboard 前端实现说明

## 1. 技术栈与目标
- **框架**：React 18 + TypeScript，使用 Vite 作为开发与构建工具（参考 `frontend/package.json`）。
- **目标**：构建面向交易大屏的单页应用，展示镍金属的实时/历史指标、图表与成交明细。当前阶段以演示为主，后端 API 仍在联调。
- **主要依赖**：
  - `lightweight-charts`：绘制 K 线与量价叠加图。
  - `recharts`：绘制面积图、柱状图等辅助可视化。

## 2. 目录概览
```
frontend/
  src/
    components/   # 复用组件（头部、图表、指标卡等）
    data/         # mock 数据生成脚本
    styles/       # 主题与全局样式
    App.tsx       # 页面容器
    main.tsx      # React 挂载入口
```
- `App.tsx` 负责切换交易所/合约并组合各组件。
- `data/mock.ts` 按当前时间动态生成 12 小时演示数据（北京时间），用于模拟“准实时”体验。

## 3. 数据与状态流
- 页面级状态仅在 `App.tsx` 中维护：`selectedExchange`、`selectedContract`。
- 自 `marketDatasets` 中读取对应市场的数据后传给子组件，各子组件保持纯展示属性。
- 当前尚未引入全局状态库。真实环境计划使用 Axios + TanStack Query 管理请求、缓存与轮询逻辑（详见 `frontend/README.md` 与 `docs/design/mvp-front-plan.md`）。

## 4. Mock 数据策略（演示模式）
- 加载时刻捕获北京时间 `now`，生成 **过去 12 小时、1 小时粒度** 的 K 线、价格折线与成交量柱状图；最新一条数据与 `now` 对齐。
- 盘口、摘要指标、`lastUpdated`、成交明细等均与该时间窗口同步，实现“页面刷新即获得最新 12 小时回放”的效果。
- SHFE 与 LME 数据使用不同基准价与波动幅度，并为 LME 引入时区偏移（演示伦敦交易时段）。
- 后续接入真实 API 时，可替换 `marketDatasets` 的生成逻辑或新增数据服务并在 `App.tsx` 中切换来源。

## 5. 核心组件
| 组件 | 路径 | 作用 |
| --- | --- | --- |
| `DashboardHeader` | `components/DashboardHeader.tsx` | 顶部吸顶区域，包含页面标题及交易所/合约选择器 |
| `MetricCard` | `components/MetricCard.tsx` | 显示最新价、成交量等指标 |
| `CandlestickChart` | `components/CandlestickChart.tsx` | 封装 Lightweight Chart，渲染小时 K 线并可叠加成交量 |
| `ChartsSection` | `components/ChartsSection.tsx` | 包含 K 线卡片及价格走势/成交量柱状图 |
| `OrderBookPanel` | `components/OrderBookPanel.tsx` | 模拟盘口深度 |
| `StatsGrid` | `components/StatsGrid.tsx` | 展示最高价、最低价、均价等统计信息 |
| `TradesTable` | `components/TradesTable.tsx` | 展示最近 30 条成交明细（最新记录靠近当前时间） |

## 6. 样式与主题
- `styles/global.css` 定义深色玻璃风格主题，包括背景渐变、卡片阴影、语义色彩与响应式布局。
- 样式类如 `.dashboard-card`、`.grid`、`.panels` 控制卡片布局与 hover 效果。
- 设计规范与色板参考 `docs/design/mvp-front-plan.md`。

## 7. 图表方案
- **K 线图**：`CandlestickChart` 负责初始化图表、处理 resize 与时间窗口约束，可切换是否显示成交量。
- **辅助图表**：`ChartsSection` 中的 `SecondaryCharts` 使用 Recharts 展示：
  - 小时价格走势（面积图，过去 12 小时）。
  - 小时成交量与持仓量（双系列柱状图）。
- 各图表共享同一数据窗口，确保时间轴对齐。

## 8. 开发与构建
- 开发启动：`npm install && npm run dev`（默认 `http://127.0.0.1:5173`）。
- 生产构建：`npm run build`（先 TypeScript 检查，再执行 `vite build`，产物在 `dist/`）。
- 当前未启用 ESLint/Prettier。后续可根据团队需求补充。
- 本地联调 API 时，可在 `vite.config.ts` 的 `server.proxy` 中配置跨域转发。

## 9. 后续计划
与 `docs/design/mvp-front-plan.md` 保持一致：
1. 接入真实 API，替换 mock 数据。
2. 使用 TanStack Query 或自研轮询逻辑管理数据刷新。
3. 完善无障碍与响应式支持（断点、键盘焦点等）。
4. 引入 Lint/Format、代码拆分等工程治理手段。

如实现方案或交互有调整，请同步更新本文与 `frontend/README.md`，保持文档与代码的一致性。***
