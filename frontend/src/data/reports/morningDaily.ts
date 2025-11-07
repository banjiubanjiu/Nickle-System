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
          summary: "欧美经济数据扰动下，LME 镍价维持区间震荡，市场观望为主。",
          tag: "行情",
          impact: "neutral",
        },
        {
          title: "需求回暖",
          summary: "300 系不锈钢排产计划维持高位，补库需求逐步显现。",
          tag: "需求",
          impact: "up",
        },
        {
          title: "供应链风险",
          summary: "印尼矿区运输与能源价格波动持续，供应链弹性仍需关注。",
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
          title: "供给观察：能源与运输成本",
          source: "SMM",
          publishedAt: "07:40",
          excerpt: "能源与运费波动逐步传导至镍铁成本，关注上游供给弹性。",
        },
      ],
      narrative: [
        {
          title: "全球宏观概览",
          paragraphs: [
            "隔夜海外市场避险情绪升温，欧美经济数据对有色金属板块形成扰动。LME 镍价维持区间震荡，市场观望情绪浓厚。从全球市场来看，隔夜欧美股市表现分化，大宗商品整体承压。美元指数相对稳定，为有色金属提供相对中性的外部环境。地缘政治不确定性持续，供应链安全考量支撑战略金属配置需求。能源价格波动对镍铁生产成本传导效应显现，产业链上游成本压力有所缓解。",
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
            "供应端监测显示，LME 库存 22.0 万吨处于中性水平，供需基本平衡。需求端结构看，不锈钢行业传统旺季效应逐步显现，产能利用率环比改善，300 系不锈钢排产计划维持高位。新能源领域三元电池产量持续增长，硫酸镍消费量同比增长 15%-20%，储能电池需求贡献增量。成本传导链条看，原油价格相对稳定，镍铁生产成本支撑暂时不变。电力成本、海运费用等因素对原料到岸成本产生一定影响，整体成本端支撑力度中性偏强。",
          ],
        },
        {
          title: "宏观政策与产业链",
          paragraphs: [
            "宏观环境方面，主要央行政策分歧加大，美联储紧缩预期与欧央行、中国央行宽松立场形成对比。中美制造业 PMI 分化（中国 49.5，美国 52.0），全球制造业复苏不均，需求预期存在不确定性。国内政策面，稳增长政策持续发力，基建投资保持韧性，新能源产业政策支持力度不减。环保政策趋严推动镍冶炼行业技术升级和产能调整，供给侧结构性改革深入推进。",
            "产业链跟踪显示，上游矿山企业三季度业绩预期改善，镍矿品位提升带动生产成本下降。中游镍铁企业开工率保持相对高位，但利润空间受到挤压。下游不锈钢厂库存周期进入尾声，补库需求逐步显现。新能源产业链中，正极材料企业排产计划积极，对高镍三元材料需求保持旺盛。资金流向方面，机构资金保持谨慎，短期资金交投活跃度一般。持仓量 8.0 万手处于中性水平，多空分歧并存。",
          ],
        },
        {
          title: "日内关注与风险提示",
          paragraphs: [
            "技术形态上，镍价运行于中性区间，短期均线纠缠，方向选择关键期。成交量配合是关键信号。价格预期仍为区间震荡，上方 15150 美元阻力、下方 14850 美元支撑。日内重点关注：① 沪伦比值变化和内外盘价差修复情况；② 国内宏观数据公布对市场情绪的影响；③ 现货升贴水调整和贸易商报价变化。风险提示：美联储政策预期变化可能引发美元指数大幅波动，对有色金属价格产生冲击；印尼镍矿政策调整及国内房地产政策变化仍需持续关注。",
          ],
        },
      ],
      chartAnalysis: [
        {
          title: "技术形态与趋势分析",
          paragraphs: [
            "镍价当前处于均线系统纠结状态，表明多空力量均衡。布林带内价格位于中轨附近，显示短期内缺乏明确方向性突破的动力。结合近期的震荡走势来看，市场可能正处在选择方向的关键时期，需密切关注未来几日是否会出现显著的价格波动或成交量放大以确认趋势。",
          ],
        },
        {
          title: "关键技术指标解读",
          paragraphs: [
            "RSI 值为 49.7，处于中性区域，未显示出明显的超买或超卖信号；同时 MACD 线在零轴附近徘徊，暗示动量变化不明显。这两大指标共同反映当前市场态度犹豫，若后续 MACD 形成金叉，可能预示短期反弹机会。",
          ],
        },
        {
          title: "量价结构分析",
          paragraphs: [
            "成交量偏低且持仓量几乎为零，但期现基差较小，说明现货与期货价格较为一致，套利空间有限。资金流动偏弱也反映投资者对于当前价位持谨慎态度，低成交与低持仓限制了价格大幅波动的可能性。",
          ],
        },
        {
          title: "支撑阻力与价格区间",
          paragraphs: [
            "15055 美元/吨是当前价格中枢，上方 15356 美元/吨构成主要阻力，下方 14754 美元/吨提供关键支撑。在动能不足的情况下，预计短期仍将维持窄幅整理；一旦有效突破上述关键点位，则有望开启新一轮趋势行情。",
          ],
        },
      ],
    },
    daily: {
      heroTitle: "日报 · 交易日综述",
      heroSubtitle: "收盘表现、主力资金与跨市场价差一览。",
      updatedAt: dailyTimestamp,
      summaryMetrics: [
        { label: "主力收盘", value: "119750", unit: "元/吨", trend: "-0.07%", trendDirection: "down" },
        { label: "期现升水", value: "24417", unit: "元/吨" },
        { label: "成交量", value: "11.1万", unit: "手" },
        { label: "持仓量", value: "8.9万", unit: "手" },
      ],
      highlights: [
        {
          title: "结构亮点",
          summary: "期现升水 24417 元/吨，现货需求旺盛，贸易商囤货意愿强。",
          tag: "结构",
          impact: "up",
        },
        {
          title: "成本传导",
          summary: "原油、能源成本保持平稳，镍铁成本支撑暂稳，库存高位压制价格。",
          tag: "成本",
          impact: "neutral",
        },
        {
          title: "市场情绪",
          summary: "成交放量但价格承压，获利了结盘与逢低接盘博弈加剧。",
          tag: "情绪",
          impact: "neutral",
        },
      ],
      articles: [
        {
          title: "国际采矿与金属理事会发布尾矿进展报告",
          source: "Mining.com",
          publishedAt: "08:10",
          excerpt: "36 个成员设施中已有 67% 完全符合 GISTM 要求，行业环境风险下降利好镍价。",
        },
        {
          title: "Electra 重启安大略钴精炼厂建设",
          source: "Newswire",
          publishedAt: "07:55",
          excerpt: "项目预计 2027 年投产，电池级钴供应改善有望带动镍需求联动增长。",
        },
        {
          title: "Kinterra 获 2 亿美元融资意向支持铜矿复产",
          source: "EXIM",
          publishedAt: "07:40",
          excerpt: "虽以铜矿为主，但对北美战略金属投资信心提升，对镍需求预期形成间接支撑。",
        },
      ],
      narrative: [
        {
          title: "市场概览",
          paragraphs: [
            "国内商品市场当日整体平稳，沪镍主连收于 119750 元/吨，微跌 0.07%。成交显著放量至 11.1 万手，持仓量 8.9 万手，显示资金在关键价位博弈加剧。",
            "现货均价 144167 元/吨，期现升水达 24417 元/吨，体现现货端仍偏紧。贸易商囤货意愿较强，升水结构对盘面下行形成支撑。",
          ],
        },
        {
          title: "结构与成本",
          paragraphs: [
            "期现升水凸显现货需求旺盛，沪伦比值约 0.01，外盘相对更优。合约曲线趋于平坦，远月升水体现仓储成本，市场预期平稳。",
            "原油价格稳定、能源成本平稳，镍铁生产成本支撑暂时不变。LME 显性库存 152102 吨，库存高位对价格上行形成压制，菲律宾雨季扰动被库存缓冲对冲。",
          ],
        },
        {
          title: "需求与情绪",
          paragraphs: [
            "不锈钢 300 系排产稳定，占比约 70%，传统需求主导仍在。新能源领域硫酸镍需求同比增长 15%-20%，结构性需求改善但体量仍需积累。",
            "成交放量且价格承压，说明分歧加剧；产业资金参与度提升，套保需求增加。期现升水结构下，现货贸易商惜售，期货下行空间有限。",
          ],
        },
        {
          title: "宏观与展望",
          paragraphs: [
            "美联储与欧央行政策分歧加大，国内稳增长政策持续推进，基建投资对不锈钢需求形成支撑。宏观环境整体偏中性。",
            "短期价格重心预计保持稳定，关注期现结构修复、政策催化与库存变化。若升水继续抬升，可能促使现货流入盘面，压制升水幅度。",
          ],
        },
      ],
      chartAnalysis: [
        {
          title: "技术形态与趋势分析",
          paragraphs: [
            "镍价运行在均线纠缠区间，缺乏明确突破信号。布林带中轨附近震荡，短期大概率维持区间整理，但需警惕方向选择。",
          ],
        },
        {
          title: "关键技术指标解读",
          paragraphs: [
            "RSI 值 49.3 接近中性，未见超买超卖。MACD 在零轴附近徘徊，动能不足，后续若形成背离或金叉才可能提供更明确信号。",
          ],
        },
        {
          title: "量价结构分析",
          paragraphs: [
            "成交量温和放大而持仓量较高，显示谨慎乐观。资金流动正常但高持仓意味着潜在波动加剧的可能，需要关注后续换手。",
          ],
        },
        {
          title: "支撑阻力与价格区间",
          paragraphs: [
            "当前价位 119750 元/吨处于关键关口，上方 122145 元/吨为阻力，下方 117355 元/吨为支撑。较大的期现基差提示需关注现货供需对盘面的影响。",
          ],
        },
      ],
      charts: [
        {
          src: "https://banjiu518-1314557698.cos.ap-beijing.myqcloud.com/nickel_price_trend_20251106.png",
          alt: "沪镍价格走势图",
          caption: "价格走势与技术指标",
        },
        {
          src: "https://banjiu518-1314557698.cos.ap-beijing.myqcloud.com/nickel_basis_curve_20251106.png",
          alt: "期现基差与合约曲线",
          caption: "期现基差与合约结构",
        },
      ],
    },
  };
};
