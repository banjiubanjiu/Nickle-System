import type { YearlyReportContent } from "../../types/reports";

export const yearlyReport: YearlyReportContent = {
  heroTitle: "年度 · 策略展望",
  heroSubtitle: "核心假设、关键变量与年度操作框架。",
  updatedAt: "2025-10-15",
  summaryMetrics: [
    { label: "年度区间", value: "16500 - 21500", unit: "元/吨" },
    { label: "基准预测", value: "19800", unit: "元/吨" },
    { label: "核心驱动", value: "新能源需求" },
    { label: "风险因素", value: "印尼供给超预期" },
  ],
  coreHypotheses: [
    {
      title: "需求主线",
      detail: "新能源与不锈钢双驱动，全年需求增速预计保持 6%-8%。",
    },
    {
      title: "供应弹性",
      detail: "印尼湿法项目决定供给弹性，关注配额政策与投产节奏。",
    },
    {
      title: "宏观环境",
      detail: "全球货币周期进入宽松阶段，大宗资产重获配置需求。",
    },
  ],
  riskFactors: [
    { title: "印尼产能超预期", impact: "若新增项目集中释放，将压制价格上行空间。" },
    { title: "全球经济放缓", impact: "需求端承压，终端排产可能低于预期。" },
    { title: "汇率波动", impact: "美元指数反弹会削弱金属表现，需关注对冲策略。" },
  ],
  strategyFramework: [
    { phase: "上半年", approach: "围绕 18 万一线择机布局多单，关注成本支撑力度。" },
    { phase: "三季度", approach: "留意印尼投产节奏及库存表现，灵活调整仓位。" },
    { phase: "年底前", approach: "结合宏观利率与需求强度，择机做多跨年度套利。" },
  ],
};
