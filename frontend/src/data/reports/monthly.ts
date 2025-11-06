import type { MonthlyReportContent } from "../../types/reports";

export const monthlyReport: MonthlyReportContent = {
  heroTitle: "月报 · 趋势拆解",
  heroSubtitle: "价格中枢、成本曲线与宏观变量的多维复盘。",
  updatedAt: "2025-11-01",
  summaryMetrics: [
    { label: "月度涨幅", value: "+5.4%", trend: "+980 元/吨", trendDirection: "up" },
    { label: "平均成交", value: "15.2万", unit: "手/日" },
    { label: "进口窗口", value: "关闭", trend: "价差 -220", trendDirection: "down" },
    { label: "成本支撑", value: "17500", unit: "元/吨" },
  ],
  highlights: [
    {
      title: "价格中枢抬升",
      description: "国内外价格脱离成本区，回到 18 万上方，资金面配合积极。",
    },
    {
      title: "供应弹性有限",
      description: "印尼湿法项目释放不及预期，海外精炼镍供应偏紧。",
    },
    {
      title: "宏观情绪改善",
      description: "美元指数回落、利率预期降温，为有色带来整体支撑。",
    },
  ],
  costBreakdown: [
    { item: "镍矿+运输", value: "54%", ratio: "核心成本" },
    { item: "冶炼与加工", value: "28%", ratio: "加工费" },
    { item: "环保与能源", value: "11%", ratio: "刚性成本" },
    { item: "财务与其他", value: "7%", ratio: "管理费用" },
  ],
  scenarios: [
    {
      scenario: "基准情景",
      outlook: "需求维持稳定增长，价格围绕 18.0-19.2 万波动。",
    },
    {
      scenario: "利多情景",
      outlook: "新能源排产超预期叠加供应扰动，价格上看 20 万。",
    },
    {
      scenario: "利空情景",
      outlook: "印尼产能集中投放且宏观走弱，价格回撤至 17 万附近。",
    },
  ],
};
