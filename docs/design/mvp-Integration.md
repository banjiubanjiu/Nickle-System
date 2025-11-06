# MVP 前后端联调规划（契约梳理）
> 目标：明确前端所需的数据契约，核对现有后端 API，并给出后续对齐与改造步骤，为真实数据接入打好基础。

## 1. 关键接口与责任划分
| 场景 | 前端期望 | 后端现状（2025-11-05 curl 验证） | 待对齐事项 |
| --- | --- | --- | --- |
| 健康检查 | 服务状态、intraday_interval_seconds、最近一次采集时间 | /health 返回 status、database、latest_lme_snapshot、intraday_interval_seconds、etention_hours、	imestamp | ? 字段齐全；如需 SHFE 最新时间或告警信息，可再评估是否扩展 |
| 最新快照 | 最新行情（价格、涨跌幅、盘口、时间） | /api/v1/dashboard/latest?exchange=shfe/lme 返回完整快照字段及 meta.labels | ? 满足指标卡与盘口需求；确保 UI 与字段名一致 |
| 分时（实时序列） | 最近 N 条蜡烛（供 K 线、价格折线、成交量图使用） | /api/v1/dashboard/intraday?exchange=&limit= 按 captured_at 降序返回快照，字段与最新快照一致 | ? 可直接使用；若需要小时聚合，可前端处理或讨论新增后端聚合接口 |
| 历史日线 | 日线图或统计用途 | /api/v1/dashboard/daily?...（示例区间暂无数据，但结构包含 labels、start_date、end_date） | ?? 需使用有数据的日期再验证字段完整性、排序规则 |
| 成交明细/盘口 | 最新成交列表、盘口五档 | 快照中仅有买价/卖价一档，暂无专门接口 | ? 若要展示真实盘口/成交，需要补采集或新接口；当前建议前端继续使用 mock |

## 2. 数据字段映射
- 摘要指标：latest_price、change、change_pct、olume、open_interest、prev_settlement。
- K 线 / 价格走势：open、high、low、close、captured_at、quote_date。
- 成交量 / 持仓量：olume、open_interest。
- 盘口：id、sk（当前仅单档）。
- 成交明细：前端 mock 自造，等待后端提供真实接口或采集策略。

## 3. 契约差异与解决思路
1. 时间戳：API 使用 ISO8601（UTC），满足前端需求；若后端改为本地时间，需要统一转换策略。
2. 字段单位：价格单位（元/吨、USD/吨）建议在 meta 明确，避免硬编码。
3. 盘口/成交明细：短期继续在前端 mock，长期由后端补采集。
4. 排序与限制：/intraday 已支持 limit 且按时间降序；若需要升序展示可由前端反转。日线接口需确认排序与分页策略。
5. LME 成交量：实时接口缺乏成交量，目前使用上一交易日数据回填，需在文档与前端 UI 说明差异，并规划后续采集方案。

## 4. 后续步骤
1. 确认契约：与后端对照上表，决定缺失字段或接口的处理方式。
2. 完善文档：在 docs/design/pr.md 或独立文档记录字段说明、单位与示例响应。
3. 实现落地：
   - 后端补齐所需字段/接口并更新 Swagger。
   - 前端封装真实 API 服务层，替换 mock，加入加载/错误/轮询逻辑。
4. 联调与测试：准备端到端测试（脚本或 Playwright），验证关键数据流；保留 mock 作为演示 / 回退模式。

## 5. 待办清单
- [ ] 成交明细：短期继续使用前端 mock，等待后端提供真实接口或采集方案。
- [ ] LME 成交量：现为上一交易日数据，需要后端评估是否能采集实时成交量或提供替代指标。
