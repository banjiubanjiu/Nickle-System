# Nickel Dashboard Frontend

基于 React + Vite 的大屏原型，展示镍金属期货的实时指标、图表与成交明细。当前版本使用假数据，样式参考 `mvp-front-plan.md` 与设计稿 `nickel-dashboard-screenshot.png`。

## 快速开始

```bash
cd frontend
npm install
npm run dev
```

开发服务器默认监听 `http://127.0.0.1:5173`。

## 目录结构

```
frontend/
  src/
    components/   # UI 组件（Header、图表、指标卡片等）
    data/         # 假数据
    styles/       # 全局样式与主题变量
    App.tsx       # 页面组合
    main.tsx      # 入口文件
```

## 后续接入真实数据

1. 在 `src/data/` 中新增基于后端 API 的数据服务（例如 `services/dashboard.ts`），封装 `fetch`/`axios` 请求。
2. 将 `App.tsx` 中使用的假数据替换为 `useEffect + useState` 或 SWR/React Query 等状态管理方案。
3. 根据接口字段调整组件的 props，保持与 `backend` 提供的 `meta.labels` 映射一致。
4. 如需与后端跨域联调，可在 `vite.config.ts` 中配置 `server.proxy`。

## 自定义主题

主题色、字体、阴影等均集中定义在 `src/styles/global.css` 的 CSS 变量中，可根据设计稿迭代。
