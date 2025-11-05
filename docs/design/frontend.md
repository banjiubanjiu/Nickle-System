# Nickel Dashboard 前端实现说明

## 1. 技术栈与目标
- **框架**：React 18 + TypeScript，使用 Vite 作为构建工具（见 `frontend/package.json`）。
- **目标**：搭建面向交易大屏的单页应用，展示镍金属行情的实时/历史数据、图表和成交明细。当前仍处于演示阶段，后端 API 尚未完全联调。
- **主要依赖**：
  - `lightweight-charts`：渲染小时级 K 线与成交量叠加。
  - `recharts`：绘制面积图、柱状图等辅助可视化。

## 2. 目录结构
```
frontend/
  src/
    components/      # 头部、图表、指标卡等复用组件
    data/            # 动态生成 mock 数据的脚本
    styles/          # 主题与全局样式
    App.tsx          # 页面容器
    main.tsx         # React 挂载入口
```
- `App.tsx` 负责交易所/合约切换及各模块组合。
- `data/mock.ts` 会在加载时依据当前北京时间生成 mock 数据，供整个页面使用。

## 3. 数据与状态流
- 页面级状态仅存在于 `App.tsx`：`selectedExchange`、`selectedContract`。
- `buildMarketData()` 返回 mock 数据集与下拉选项；子组件通过 props 接收数据，暂未引入全局状态库。
- 后续接入真实 API 时计划使用 Axios + TanStack Query 管理请求、缓存与轮询（详见 `frontend/README.md` 与 `docs/design/mvp-front-plan.md`）。

## 4. Mock 数据策略
- 加载瞬间记录北京时间 `now`，生成 **过去 48 小时、1 小时粒度** 的 K 线数据，并将默认可视窗口限定在最近 12 小时；用户可向左滚动查看更多历史，但无法向未来滚动。
- 价格走势、成交量柱状图等二级图表使用最近 12 小时数据，保证页面聚焦；盘口、摘要指标、`lastUpdated`、成交明细等均基于同一时间锚点生成。
- SHFE 与 LME 使用不同基准价和波动幅度，模拟两地市场特征。

## 5. 主要组件
| 组件 | 路径 | 说明 |
| --- | --- | --- |
| `DashboardHeader` | `components/DashboardHeader.tsx` | 顶部吸顶区域，含页面标题与交易所/合约选择器 |
| `MetricCard` | `components/MetricCard.tsx` | 展示最新价、成交量、持仓量等指标 |
| `ChartsSection` | `components/ChartsSection.tsx` | 内部封装了小时 K 线（Lightweight Charts）及价格/成交量 Recharts 图表 |
| `OrderBookPanel` | `components/OrderBookPanel.tsx` | 模拟盘口深度，显示五档买卖盘 |
| `StatsGrid` | `components/StatsGrid.tsx` | 展示最高价、最低价、均价、昨日收盘等统计信息 |
| `TradesTable` | `components/TradesTable.tsx` | 最近 30 条成交明细，最新记录在顶部 |

## 6. 样式与主题
- `styles/global.css` 定义深色玻璃风格主题（背景渐变、卡片阴影、语义色彩及响应式布局）。
- 样式类如 `.dashboard-card`、`.grid`、`.panels` 控制卡片布局、网格间距及 hover 光效。
- 设计规范参考 `docs/design/mvp-front-plan.md`。

## 7. 图表行为
- **K 线卡片**：Lightweight Charts 初始化时根据 mock 提供的 `timelineVisibleRange` 仅展示最近 12 小时，可通过滚动查看更早的 48 小时历史；向右超出时自动限制在最新蜡烛之前。
- **辅助图表**：`SecondaryCharts` 使用 Recharts 绘制 12 小时价格趋势（面积图）和成交量/持仓量（柱状图），时间轴与 K 线保持一致。

## 8. 开发与构建
- 本地开发：`npm install && npm run dev`（默认 `http://127.0.0.1:5173`）。
- 生产构建：`npm run build`（先 TypeScript 校验，再执行 `vite build`，产物位于 `dist/`）。
- 目前尚未启用 ESLint/Prettier；后续可根据项目稳定度逐步加入。
- 联调后端时，可在 `vite.config.ts` 的 `server.proxy` 中配置 API 代理。

## 9. 后续计划
1. 接入真实调度/API 数据源，替换 mock 逻辑。
2. 引入 TanStack Query（或等价方案）管理请求缓存、轮询与错误处理。
3. 提升无障碍与响应式体验（键盘焦点、断点适配、对比度等）。
4. 补充 Lint/Format 规则及更细的工程治理（代码拆分、性能优化）。

如实现或交互策略发生变化，请同步更新本文及 `frontend/README.md`，保持文档与代码一致。
