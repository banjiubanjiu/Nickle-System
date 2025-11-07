import type { BriefReportContent } from "../../types/reports";

const pad = (value: number): string => value.toString().padStart(2, "0");

const buildTimestamp = (targetHour: number, targetMinute: number, now: Date): string => {
  const target = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    targetHour,
    targetMinute,
    0,
    0,
  );
  if (now < target) {
    target.setDate(target.getDate() - 1);
  }
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())} ${pad(targetHour)}:${pad(targetMinute)}`;
};

export const getMorningDailyReports = (
  now: Date = new Date(),
): Record<"morning" | "daily", BriefReportContent> => {
  const morningTimestamp = buildTimestamp(8, 30, now);
  const dailyTimestamp = buildTimestamp(15, 30, now);

  return {
    morning: {
      heroTitle: "晨报 · 关键洞察",
      heroSubtitle: "LME夜盘回顾、宏观要闻与今日操作建议速览。",
      updatedAt: morningTimestamp,
      summaryMetrics: [
        { label: "夜盘收盘", value: "15055", unit: "美元/吨", trend: "-0.03%", trendDirection: "down" },
        { label: "美元指数", value: "104.2", trend: "-0.3%", trendDirection: "down" },
        { label: "持仓量", value: "11.7万", unit: "手" },
        { label: "库存", value: "7.9万", unit: "吨" },
      ],
      highlights: [
        {
          title: "夜盘震荡走高",
          summary: "宏观情绪修复叠加供应扰动，LME 镍价宽幅震荡，市场观望情绪浓厚。",
          tag: "行情",
          impact: "neutral",
        },
        {
          title: "不锈钢厂排产回暖",
          summary: "样本钢厂 11 月计划环比回升 3.5%，补库需求逐步显现。",
          tag: "需求",
          impact: "up",
        },
        {
          title: "供应链风险仍在",
          summary: "印尼矿区运输与能源价格波动持续，供应链安全受关注。",
          tag: "供给",
          impact: "neutral",
        },
      ],
      articles: [
        {
          title: "夜盘复盘：宏观扰动下的区间震荡",
          source: "卓创资讯",
          publishedAt: "08:05",
          excerpt: "欧美数据与避险情绪交织，镍价再度回归区间，关注量能变化。",
        },
        {
          title: "排产调研：300 系维持高位",
          source: "Mysteel",
          publishedAt: "07:55",
          excerpt: "不锈钢厂排产延续旺季节奏，原料补库意愿增强。",
        },
        {
          title: "供给观察：能源价格与运输成本",
          source: "SMM",
          publishedAt: "07:40",
          excerpt: "能源与运费波动逐步传导至镍铁成本，关注上游供给弹性。",
        },
      ],
      narrative: [
        {
          title: "全球宏观概览",
          paragraphs: [
            "隔夜海外市场避险情绪升温，欧美经济数据对有色金属板块形成扰动。LME 镍价维持区间震荡，市场观望情绪浓厚。从全球市场来看，隔夜欧美股市表现分化，大宗商品整体承压。美元指数相对稳定，为有色金属提供中性外部环境。地缘政治不确定性持续，供应链安全考量支撑战略金属配置需求。能源价格波动对镍铁生产成本传导效应显现，产业链上游成本压力有所缓解。",
          ],
        },
        {
          title: "夜盘行情与价差",
          paragraphs: [
            "隔夜 LME 镍价收于 15055 美元/吨，较前一交易日下跌 5 美元/吨，跌幅 0.03%，成交量 0.7 万手，市场参与度有限。国内现货预估 15105 元/吨，内外价差升水 50 元/吨，汇率折算显示内盘相对强势。技术面看，LME 镍价运行于 14800-15200 美元中性区间，方向选择关键期，需关注量价配合情况。成交量 0.5 万手偏低，市场观望情绪浓厚，等待催化因素出现。期现升水 20000 元/吨处于合理区间，供需基本平衡。",
          ],
        },
        {
          title: "供需与成本",
          paragraphs: [
            "供应端监测显示，LME 库存 22.0 万吨处于中性水平，供需基本平衡。需求端看，不锈钢行业传统旺季效应显现，产能利用率环比改善，300 系排产维持高位。新能源领域三元电池产量持续增长，硫酸镍消费量同比增长 15%-20%，储能电池需求贡献增量。成本端方面，原油价格相对稳定，镍铁生产成本支撑暂时不变。电力成本、海运费用对原料到岸成本仍有影响，整体成本端支撑力度中性偏强。",
          ],
        },
        {
          title: "宏观政策与产业链",
          paragraphs: [
            "宏观环境方面，主要央行政策分歧加大，美联储紧缩预期与欧央行、中国央行的宽松立场形成对比。中美制造业 PMI 分化（中国 49.5，美国 52.0），全球制造业复苏不均，需求预期存在不确定性。国内政策持续发力稳增长，基建与新能源产业政策支持力度不减。环保政策趋严推动镍冶炼行业技术升级和产能调整，供给侧结构性改革深入推进。",
            "产业链跟踪显示，上游矿山企业三季度业绩预期改善，镍矿品位提升带动生产成本下降。中游镍铁企业开工率保持高位，但利润空间受到挤压。下游不锈钢厂库存周期进入尾声，补库需求逐步显现。新能源产业链中，正极材料企业排产计划积极，对高镍三元材料需求保持旺盛。资金流向方面，机构资金保持谨慎，短期资金交投活跃度一般，持仓量 8.0 万手处于中性水平，多空分歧并存。",
          ],
        },
        {
          title: "技术形态与风险提示",
          paragraphs: [
            "技术形态上镍价仍在中性区间徘徊，短期均线纠缠，量能配合将决定方向。价格预期仍为区间震荡，上方 15150 美元阻力、下方 14850 美元支撑。日内重点关注沪伦比值、宏观数据以及现货升贴水调整。风险提示：美联储政策预期变化可能引发美元指数大幅波动，对有色金属价格造成冲击；印尼镍矿政策调整及国内房地产政策变化仍是潜在变量。",
          ],
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
