import type { BriefReportContent } from "../../types/reports";

const pad = (value: number): string => value.toString().padStart(2, "0");

const buildTimestamp = (targetHour: number, targetMinute: number, now: Date): string => {
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), targetHour, targetMinute, 0, 0);
  if (now < target) {
    target.setDate(target.getDate() - 1);
  }
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())} ${pad(targetHour)}:${pad(targetMinute)}`;
};

export const getMorningDailyReports = (now: Date = new Date()): Record<"morning" | "daily", BriefReportContent> => {
  const morningTimestamp = buildTimestamp(8, 30, now);
  const dailyTimestamp = buildTimestamp(15, 30, now);

  return {
    morning: {
      heroTitle: "晨报 · 关键洞察",
      heroSubtitle: "LME夜盘回顾、宏观要闻与今日操作建议速览。",
      updatedAt: morningTimestamp,
      summaryMetrics: [
        { label: "夜盘收盘", value: "18650", unit: "元/吨", trend: "+1.2%", trendDirection: "up" },
        { label: "美元指数", value: "104.2", trend: "-0.3%", trendDirection: "down" },
        { label: "沪镍持仓", value: "11.7万", unit: "手" },
        { label: "LME 库存", value: "7.9万", unit: "吨" },
      ],
      highlights: [
        {
          title: "夜盘震荡走高",
          summary: "宏观情绪修复叠加供应扰动，沪镍主力夜盘收涨 1.2%。",
          tag: "行情",
          impact: "up",
        },
        {
          title: "不锈钢厂排产回暖",
          summary: "样本钢厂 11 月计划环比回升 3.5%，对镍需求形成支撑。",
          tag: "需求",
          impact: "up",
        },
        {
          title: "印尼矿区运输受阻",
          summary: "受暴雨影响部分矿山发运延迟，短期关注港口库存变化。",
          tag: "供给",
          impact: "neutral",
        },
      ],
      articles: [
        {
          title: "夜盘复盘：宏观气氛提振镍价反弹",
          source: "卓创资讯",
          publishedAt: "08:05",
          excerpt: "美国经济数据走弱压制美元指数，夜盘基本金属普涨，沪镍领涨逾 1%。",
        },
        {
          title: "炼厂调研：不锈钢厂排产连续第二周回升",
          source: "Mysteel",
          publishedAt: "07:55",
          excerpt: "主要钢厂反馈 11 月订单改善，原料备货意愿增强，建议关注现货升贴水。",
        },
        {
          title: "印尼矿雨季提前，供应稳定性仍存变量",
          source: "SMM",
          publishedAt: "07:40",
          excerpt: "雨季扰动尚属局部，整体供应稳定，建议密切监测港口库存和船期变化。",
        },
      ],
    },
    daily: {
      heroTitle: "日报 · 交易日综述",
      heroSubtitle: "收盘表现、主力资金与跨市场价差一览。",
      updatedAt: dailyTimestamp,
      summaryMetrics: [
        { label: "主力收盘", value: "18720", unit: "元/吨", trend: "+0.8%", trendDirection: "up" },
        { label: "LME-沪镍价差", value: "-1,520", unit: "元/吨", trend: "缩窄 230", trendDirection: "up" },
        { label: "主力成交量", value: "18.6万", unit: "手" },
        { label: "主力持仓", value: "11.2万", unit: "手" },
      ],
      highlights: [
        {
          title: "资金流向",
          summary: "主力合约多头增仓 5,200 手，空头小幅离场，净多持仓扩大。",
          tag: "资金",
          impact: "up",
        },
        {
          title: "基差结构",
          summary: "现货贴水收窄至 320 元/吨，月差维持 contango 结构。",
          tag: "价差",
          impact: "neutral",
        },
        {
          title: "行情驱动",
          summary: "新能源排产与不锈钢排产双轮驱动，原料端干扰有限。",
          tag: "驱动",
          impact: "up",
        },
      ],
      articles: [
        {
          title: "日度收盘点评：多头增仓支撑镍价上行",
          source: "方正中期",
          publishedAt: "16:45",
          excerpt: "资金面出现净流入，宏观情绪平稳，预计短线维持区间震荡偏强格局。",
        },
        {
          title: "基差视角：内外盘价差继续回归",
          source: "华泰期货",
          publishedAt: "16:20",
          excerpt: "内外盘价差缩窄，套利盘离场，交割月前关注库存变化与进口窗口。",
        },
        {
          title: "终端调研：动力电池企业维持刚需采购",
          source: "长江有色",
          publishedAt: "15:55",
          excerpt: "三元材料企业采购节奏平稳，价格波动对排产影响有限。",
        },
      ],
    },
  };
};
