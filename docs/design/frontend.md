# Nickel Dashboard 前端实现说明

## 1. 技术栈与整体目标
- **框架**：React 18 + TypeScript，使用 Vite 作为开发与构建工具（见 `frontend/package.json`）。
- **运行目标**：构建面向大屏展示的单页应用，呈现镍金属实时行情、图表与成交明细。目前阶段以 MVP 原型展示为主，尚未接入真实 API。
- **主要依赖**：
  - `lightweight-charts`：绘制 K 线及量价叠加图。
  - `recharts`：承载面积图、柱状图等辅助可视化。
  - 其余依赖保持最小化，仅包含 React 及类型定义。

## 2. 目录结构
```
frontend/
  src/
    components/   # 头部、图表、指标卡等复用组件
    data/         # mock 数据生成脚本
    styles/       # 全局样式与主题变量
    App.tsx       # 页面容器，组合所有模块
    main.tsx      # React 挂载入口
```
- `src/main.tsx`：加载全局样式并挂载 `<App />`。
- `src/App.tsx`：负责交易所/合约切换与组件拼装。
- `src/data/mock.ts`：提供所有展示所需的假数据；后续联调时替换为真实接口调用。

## 3. 数据与状态流
- 页面级状态仅存在于 `App.tsx`：`selectedExchange` / `selectedContract`。
- 根据状态从 `marketDatasets` 中取出对应市场数据（指标、K 线、盘口、成交等），以 props 传递给子组件。
- 暂未使用全局状态库；未来联调时计划引入 Axios + TanStack Query 管理请求、缓存与轮询（参见 `frontend/README.md` 与 `docs/design/mvp-front-plan.md`）。

## 4. 核心组件
| 组件 | 位置 | 说明 |
| --- | --- | --- |
| `DashboardHeader` | `src/components/DashboardHeader.tsx` | 顶部吸顶区域，包含标题、交易所/合约选择器。 |
| `MetricCard` | `src/components/MetricCard.tsx` | 指标卡片，展示最新价、成交量等摘要信息。 |
| `CandlestickChart` | `src/components/CandlestickChart.tsx` | Lightweight Charts 封装，负责 K 线与成交量渲染。 |
| `ChartsSection` | `src/components/ChartsSection.tsx` | 组合 K 线卡片与 Recharts 辅助图表。 |
| `OrderBookPanel` | `src/components/OrderBookPanel.tsx` | 模拟盘口深度，显示五档买卖盘。 |
| `StatsGrid` | `src/components/StatsGrid.tsx` | 展示开盘价/最高价等会话统计。 |
| `TradesTable` | `src/components/TradesTable.tsx` | 成交明细列表，支持滚动查看。 |

组件之间仅通过 props 传递数据，便于后续替换数据源或接入状态管理。

## 5. 样式与主题
- 全局样式集中在 `src/styles/global.css`：
  - 定义配色、字体、阴影等主题变量，对应深色玻璃风格。
  - `.dashboard-card`、`.grid`、`.panels` 等 layout 类实现卡片化布局与 hover 光效。
  - 表格、盘口、页脚等局部样式同样在该文件维护。
- 设计规范详见 `docs/design/mvp-front-plan.md`，CSS 已落地 Sticky Header、渐变背景等关键效果。

## 6. 图表方案
- **K 线图**：`CandlestickChart` 负责初始化 Lightweight Chart、监听窗口尺寸、维护 time range，并可选叠加成交量直方图。
- **辅助图表**：`ChartsSection` 的 `SecondaryCharts` 使用 Recharts 绘制：
  - 价格走势：对最近 60 分钟数据进行 5 分钟聚合后渲染面积图。
  - 成交量与持仓量：使用双系列柱状图展示 24 个时间点的体量变化。
- 所有图表都包裹在 `dashboard-card` 中，以保持布局统一。

## 7. 开发与构建
- 启动开发：`npm install && npm run dev`（默认端口 `5173`）。
- 构建产物：`npm run build` 将运行 TypeScript 校验并调用 `vite build`，输出至 `dist/`。
- 暂未引入 ESLint/Prettier；TypeScript 编译承担基本质量保障。
- 若需本地联调，可在 `vite.config.ts` 配置 `server.proxy` 解决跨域问题。

## 8. 联调与后续计划
与 `docs/design/mvp-front-plan.md` 保持一致的短期目标：
1. **接入真实 API**：在 `src/data` 中新增数据服务层，封装请求与错误处理；`App.tsx` 使用 `useEffect` 或 TanStack Query 管理数据。
2. **状态同步**：将交易所/合约选择与请求参数绑定，处理加载与错误态。
3. **定时刷新**：依据 `/health` 返回的 `intraday_interval_seconds` 实现轮询。
4. **可访问性与响应式优化**：补充键盘焦点、断点布局等能力。
5. **工程治理**：视需要引入 lint/format、代码拆分与缓存策略。

后续如有实现调整，请同步更新本文与 `frontend/README.md`，保持文档与代码一致。
