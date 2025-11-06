import type { WeeklyReportContent } from "../../types/reports";

export const weeklyReport: WeeklyReportContent = {
  heroTitle: "周报 · 供需与库存追踪",
  heroSubtitle: "跨品种对比、库存走势与策略建议汇总。",
  updatedAt: "2025-11-03",
  summaryMetrics: [
    { label: "周度涨幅", value: "+2.6%", trend: "+480 元/吨", trendDirection: "up" },
    { label: "社会库存", value: "5.3万", unit: "吨", trend: "-4.2%", trendDirection: "down" },
    { label: "不锈钢开工", value: "76%", unit: "开工率" },
    { label: "新能源排产", value: "+5.8%", unit: "环比" },
  ],
  supplyDemand: [
    {
      title: "库存降幅扩大",
      detail: "全国样本库存连续第三周下降，周度降幅较前一周扩大 1.6 个百分点。",
      badge: "库存",
    },
    {
      title: "终端排产回升",
      detail: "不锈钢与三元材料排产双回暖，订单兑现率提升至 82%。",
      badge: "需求",
    },
    {
      title: "供应扰动有限",
      detail: "印尼 NPI 产量维持高位，国内冶炼检修计划有限，供给仍然充裕。",
      badge: "供给",
    },
  ],
  inventoryTrend: [
    { name: "保税区", value: "2.1 万吨", change: "-5.3%" },
    { name: "国内样本仓", value: "3.2 万吨", change: "-3.4%" },
    { name: "LME 注册仓", value: "7.8 万吨", change: "-1.8%" },
    { name: "SHFE 库存", value: "3.5 万吨", change: "-2.1%" },
  ],
  strategyNotes: [
    "短线：关注 18.5 万附近压力，多头仓位以跟随盘为主，严格风控。",
    "中期：库存降幅与需求回暖共振，可分批布局多单，回调 17.8-18 万附近加仓。",
    "套利：关注内外盘价差回归，LME-沪镍价差缩窄后可逐步离场。",
  ],
};
