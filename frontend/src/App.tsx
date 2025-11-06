import { useEffect, useMemo, useRef, useState, type FC } from "react";
import { buildMarketData, type MarketKey } from "./data/mock";
import { DashboardHeader, type NavKey } from "./components/DashboardHeader";
import { MetricCard } from "./components/MetricCard";
import { OrderBookPanel } from "./components/OrderBookPanel";
import { TradesTable } from "./components/TradesTable";
import { CandleChartCard, SecondaryCharts } from "./components/ChartsSection";
import { StatsGrid } from "./components/StatsGrid";
import {
  fetchHealth,
  fetchLatest,
  type DashboardEnvelope,
  type SnapshotRecord,
} from "./services/dashboard";

type MetricView = {
  label: string;
  value: string;
  unit?: string;
  trend?: string;
  trendDirection?: "up" | "down";
};

type MetricGroups = {
  primary: MetricView[];
  secondary: MetricView[];
};

const numberFormatter = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const formatNumber = (value: number | null | undefined): string =>
  value === null || value === undefined ? "--" : numberFormatter.format(value);

const formatPercent = (value: number | null | undefined): string =>
  value === null || value === undefined
    ? "--"
    : `${value >= 0 ? "+" : ""}${percentFormatter.format(value)}%`;

const mapSnapshotToMetrics = (
  snapshot: SnapshotRecord,
  unitLabel: string,
): MetricView[] => {
  const changePct = snapshot.change_pct ?? null;
  const trendDirection: "up" | "down" =
    changePct === null || changePct === undefined ? "up" : changePct >= 0 ? "up" : "down";

  return [
    {
      label: "最新价",
      value: formatNumber(snapshot.latest_price),
      unit: unitLabel,
      trend: changePct === null || changePct === undefined ? undefined : formatPercent(changePct),
      trendDirection,
    },
    {
      label: "涨跌幅",
      value: formatPercent(snapshot.change_pct),
    },
    {
      label: "最高价",
      value: formatNumber(snapshot.high),
      unit: unitLabel,
    },
    {
      label: "最低价",
      value: formatNumber(snapshot.low),
      unit: unitLabel,
    },
    {
      label: "买入价",
      value: formatNumber(snapshot.bid),
      unit: unitLabel,
    },
    {
      label: "卖出价",
      value: formatNumber(snapshot.ask),
      unit: unitLabel,
    },
    {
      label: "今开",
      value: formatNumber(snapshot.open),
      unit: unitLabel,
    },
    {
      label: "昨收",
      value: formatNumber(snapshot.prev_settlement),
      unit: unitLabel,
    },
  ];
};

const cloneMetrics = (metrics: MetricView[] | undefined): MetricView[] =>
  metrics ? metrics.map((metric) => ({ ...metric })) : [];

const splitMetrics = (metrics: MetricView[]): MetricGroups => {
  const primary = metrics.slice(0, 4);
  const secondary = metrics.slice(4, 8);
  return { primary, secondary };
};

type ReportHighlight = {
  title: string;
  summary: string;
  tag: string;
  impact: "up" | "down" | "neutral";
};

type ReportArticle = {
  title: string;
  source: string;
  publishedAt: string;
  excerpt: string;
};

type ReportContent = {
  heroTitle: string;
  heroSubtitle: string;
  updatedAt: string;
  summaryMetrics: MetricView[];
  highlights: ReportHighlight[];
  articles: ReportArticle[];
};

const NAV_TITLE_MAP: Record<NavKey, string> = {
  home: "镍金属期货实时数据大屏",
  morning: "镍市晨报速览",
  daily: "日度研报摘要",
  weekly: "周度盘面回顾",
  monthly: "月度趋势洞察",
  yearly: "年度策略展望",
};

const REPORT_CONTENT: Record<Exclude<NavKey, "home">, ReportContent> = {
  morning: {
    heroTitle: "晨报 · 关键洞察",
    heroSubtitle: "夜盘回顾、宏观要闻与今日操作建议速览。",
    updatedAt: "2025-11-05 08:30",
    summaryMetrics: [
      { label: "夜盘收盘", value: "18650", unit: "元/吨", trend: "+1.2%", trendDirection: "up" },
      { label: "美元指数", value: "104.2", unit: "", trend: "-0.3%", trendDirection: "down" },
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
    updatedAt: "2025-11-05 16:30",
    summaryMetrics: [
      { label: "主力收盘", value: "18720", unit: "元/吨", trend: "+0.8%", trendDirection: "up" },
      { label: "LME-沪镍价差", value: "-1520", unit: "元/吨", trend: "缩窄 230", trendDirection: "up" },
      { label: "主力成交量", value: "18.6万", unit: "手" },
      { label: "主力持仓", value: "11.2万", unit: "手" },
    ],
    highlights: [
      {
        title: "资金流向",
        summary: "主力合约多头增仓 5200 手，空头小幅离场，净多持仓扩大。",
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
  weekly: {
    heroTitle: "周报 · 供需与库存追踪",
    heroSubtitle: "跨品种对比、库存走势与策略建议汇总。",
    updatedAt: "2025-11-03",
    summaryMetrics: [
      { label: "周度涨幅", value: "+2.6%", unit: "", trend: "+480 元/吨", trendDirection: "up"},
      { label: "社会库存", value: "5.3万", unit: "吨", trend: "-4.2%", trendDirection: "down" },
      { label: "不锈钢开工", value: "76%", unit: "利用率" },
      { label: "新能源排产", value: "+5.8%", unit: "环比" },
    ],
    highlights: [
      {
        title: "库存降幅扩大",
        summary: "全国样本库存连续三周下降，降幅较前一周扩大 1.6 个百分点。",
        tag: "库存",
        impact: "up",
      },
      {
        title: "终端需求",
        summary: "不锈钢与电池行业排产双回暖，镍需求进入季节性旺季。",
        tag: "需求",
        impact: "up",
      },
      {
        title: "供应观察",
        summary: "印尼 NPI 产量维持高位，国内冶炼厂检修计划有限。",
        tag: "供给",
        impact: "neutral",
      },
    ],
    articles: [
      {
        title: "周度供需：库存回落支撑镍价",
        source: "中信期货",
        publishedAt: "周一",
        excerpt: "库存去化与下游排产改善共振，建议逢低布局多单并关注外盘价差。",
      },
      {
        title: "海外观察：LME 交割库存创年内新低",
        source: "Metal Bulletin",
        publishedAt: "周日",
        excerpt: "海外库存降至 7.8 万吨，进口窗口开启，关注到港节奏。",
      },
      {
        title: "交易策略：多头趋势仍需宏观确认",
        source: "国泰君安期货",
        publishedAt: "周六",
        excerpt: "建议继续关注宏观利率预期与美元指数走向，控制仓位。",
      },
    ],
  },
  monthly: {
    heroTitle: "月报 · 趋势拆解",
    heroSubtitle: "价格中枢、成本曲线与宏观变量的多维复盘。",
    updatedAt: "2025-11-01",
    summaryMetrics: [
      { label: "月度涨幅", value: "+5.4%", unit: "", trend: "+980 元/吨", trendDirection: "up" },
      { label: "平均成交", value: "15.2万", unit: "手/日" },
      { label: "进口窗口", value: "关闭", unit: "", trend: "价差 -220", trendDirection: "down"},
      { label: "成本支撑", value: "17500", unit: "元/吨" },
    ],
    highlights: [
      {
        title: "价格中枢上移",
        summary: "月内价格脱离成本区，重回 18 万上方，资金面积极配合。",
        tag: "价格",
        impact: "up",
      },
      {
        title: "供给压力缓解",
        summary: "印尼新增产能释放不及预期，海外精炼镍供应偏紧。",
        tag: "供给",
        impact: "up",
      },
      {
        title: "宏观变量",
        summary: "美联储加息预期降温、美元指数回落，为金属整体带来支撑。",
        tag: "宏观",
        impact: "up",
      },
    ],
    articles: [
      {
        title: "月度回顾：多重因素抬升镍价中枢",
        source: "银河期货",
        publishedAt: "11-01",
        excerpt: "成本、需求与资金的共振推动价格向上，建议顺势而为并设置止损。",
      },
      {
        title: "成本曲线：印尼项目盈利区间变化",
        source: "光大期货",
        publishedAt: "10-30",
        excerpt: "NPI 成本端上移，部分高成本产能盈利承压，供给或有波动。",
      },
      {
        title: "宏观视角：美元回落与风险偏好改善",
        source: "申银万国",
        publishedAt: "10-28",
        excerpt: "全球风险资产普涨，金属获得资金关注，建议关注美元走势。",
      },
    ],
  },
  yearly: {
    heroTitle: "年度 · 策略展望",
    heroSubtitle: "核心假设、关键变量与年度操作框架。",
    updatedAt: "2025-10-15",
    summaryMetrics: [
      { label: "年度区间", value: "16500 - 21500", unit: "元/吨" },
      { label: "基准预测", value: "19800", unit: "元/吨" },
      { label: "核心驱动", value: "新能源需求", unit: "" },
      { label: "风险因素", value: "印尼供给超预期", unit: "" },
    ],
    highlights: [
      {
        title: "需求主线",
        summary: "新能源与不锈钢双驱动，全年需求增速预计保持 6%-8%。",
        tag: "需求",
        impact: "up",
      },
      {
        title: "供应弹性",
        summary: "印尼湿法项目决定供给弹性，关注投产节奏与政策变化。",
        tag: "供给",
        impact: "neutral",
      },
      {
        title: "策略建议",
        summary: "建议核心仓位在 18.0-18.5 万区间布局多单，设好风险对冲。",
        tag: "策略",
        impact: "up",
      },
    ],
    articles: [
      {
        title: "年度展望：新能源驱动下的镍价中枢",
        source: "中金公司",
        publishedAt: "10-10",
        excerpt: "需求侧韧性与供给端不确定并存，预计价格中枢抬升至 19.8 万元。",
      },
      {
        title: "风险提示：印尼产能扩张与环保政策",
        source: "华安期货",
        publishedAt: "10-12",
        excerpt: "印尼政策可能释放更多配额，需关注国内冶炼厂盈利压力。",
      },
      {
        title: "操作框架：趋势+套利双线布局",
        source: "兴证期货",
        publishedAt: "10-14",
        excerpt: "建议趋势多单搭配内外盘价差套利策略，提升收益稳定性。",
      },
    ],
  },
};

const App: FC = () => {
  const { datasets, exchangeOptions } = useMemo(() => buildMarketData(), []);
  const exchangeKeys = Object.keys(datasets) as MarketKey[];
  const defaultExchange = exchangeKeys[0] ?? "shfe";

  const [selectedNavKey, setSelectedNavKey] = useState<NavKey>("home");
  const [selectedExchange, setSelectedExchange] = useState<MarketKey>(defaultExchange);
  const activeMarket = datasets[selectedExchange] ?? datasets[defaultExchange];

  const getFallbackMetricGroups = () =>
    splitMetrics(cloneMetrics(activeMarket?.summaryMetrics as MetricView[] | undefined));

  const [selectedContract, setSelectedContract] = useState(
    () => activeMarket?.contracts[0]?.key ?? "",
  );
  const [primaryMetrics, setPrimaryMetrics] = useState<MetricView[]>(() => getFallbackMetricGroups().primary);
  const [secondaryMetrics, setSecondaryMetrics] = useState<MetricView[]>(() => getFallbackMetricGroups().secondary);
  const [lastUpdated, setLastUpdated] = useState<string>(activeMarket?.meta.lastUpdated ?? "");

  const activeExchangeOption =
    exchangeOptions.find((option) => option.key === selectedExchange) ?? exchangeOptions[0];
  const contractOptions = activeExchangeOption?.contracts ?? [];

  const contractLabel = useMemo(() => {
    const matched = contractOptions.find((item) => item.key === selectedContract);
    return matched?.label ?? contractOptions[0]?.label ?? activeMarket?.meta.contract ?? "";
  }, [activeMarket?.meta.contract, contractOptions, selectedContract]);

  const handleExchangeChange = (key: string) => {
    const nextExchange = (key as MarketKey) ?? "shfe";
    setSelectedExchange(nextExchange);
    const nextContracts = datasets[nextExchange]?.contracts ?? [];
    setSelectedContract(nextContracts[0]?.key ?? "");
  };

  const handleContractChange = (key: string) => {
    setSelectedContract(key);
  };

  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestSnapshotRef = useRef<SnapshotRecord | null>(null);

  useEffect(() => {
    let cancelled = false;

    const clearTimer = () => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

    if (selectedNavKey !== "home") {
      const fallback = getFallbackMetricGroups();
      setPrimaryMetrics(fallback.primary);
      setSecondaryMetrics(fallback.secondary);
      setLastUpdated(activeMarket?.meta.lastUpdated ?? "");
      clearTimer();
      return () => {
        cancelled = true;
        clearTimer();
      };
    }

    const unitLabel = activeMarket?.priceUnit ?? "";

    const applySnapshot = (snapshot: SnapshotRecord) => {
      latestSnapshotRef.current = snapshot;
      const metrics = mapSnapshotToMetrics(snapshot, unitLabel);
      const { primary, secondary } = splitMetrics(metrics);
      setPrimaryMetrics(primary);
      setSecondaryMetrics(secondary);
      setLastUpdated(dateTimeFormatter.format(new Date(snapshot.captured_at)));
    };

    const loadFallback = () => {
      if (!latestSnapshotRef.current && activeMarket) {
        const fallback = getFallbackMetricGroups();
        setPrimaryMetrics(fallback.primary);
        setSecondaryMetrics(fallback.secondary);
        setLastUpdated(activeMarket.meta.lastUpdated ?? "");
      }
    };

    const fetchLatestSnapshot = async () => {
      try {
        const response: DashboardEnvelope<SnapshotRecord> = await fetchLatest(selectedExchange);
        if (cancelled) {
          return;
        }
        applySnapshot(response.data);
      } catch {
        if (!cancelled) {
          loadFallback();
        }
      }
    };

    const initialise = async () => {
      clearTimer();
      const fallback = getFallbackMetricGroups();
      setPrimaryMetrics(fallback.primary);
      setSecondaryMetrics(fallback.secondary);
      setLastUpdated(activeMarket?.meta.lastUpdated ?? "");

      await fetchLatestSnapshot();

      let intervalMs = 30_000;
      try {
        const health = await fetchHealth();
        intervalMs = Math.max(health.intraday_interval_seconds, 5) * 1000;
      } catch {
        // ignore health fetch errors, fall back to默认间隔
      }

      if (!cancelled) {
        refreshTimerRef.current = setInterval(fetchLatestSnapshot, intervalMs);
      }
    };

    initialise();

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, [selectedExchange, activeMarket, selectedNavKey]);

  const isHomeView = selectedNavKey === "home";
  const headerTitle = NAV_TITLE_MAP[selectedNavKey] ?? NAV_TITLE_MAP.home;
  const reportContent = !isHomeView ? REPORT_CONTENT[selectedNavKey as Exclude<NavKey, "home">] : null;
  const headerMeta = {
    exchange: activeExchangeOption.label,
    contract: contractLabel,
    lastUpdated,
  };

  return (
    <div className="dashboard-layout">
      <DashboardHeader
        title={headerTitle}
        activeNavKey={selectedNavKey}
        exchangeOptions={exchangeOptions}
        selectedExchangeKey={selectedExchange}
        selectedContractKey={selectedContract}
        onExchangeChange={handleExchangeChange}
        onContractChange={handleContractChange}
        onNavChange={(key) => setSelectedNavKey(key)}
      />

      <div className="dashboard-container">
        {isHomeView ? (
          <>
            <section className="grid cols-4">
              {primaryMetrics.map((metric) => (
                <MetricCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  unit={metric.unit}
                  trend={metric.trend}
                  trendDirection={metric.trendDirection}
                />
              ))}
            </section>

            <div className="panels">
              <CandleChartCard
                candles={activeMarket.timelineCandles}
                visibleRange={activeMarket.timelineVisibleRange}
                unitLabel={activeMarket.priceUnit}
              />
              <OrderBookPanel {...activeMarket.orderBook} />
            </div>

            <SecondaryCharts priceSeries={activeMarket.priceSeries} volumeSeries={activeMarket.volumeSeries} />

            <StatsGrid stats={secondaryMetrics} />

            <TradesTable trades={activeMarket.trades} />

            <footer className="footer">
              <span>数据更新时间：{headerMeta.lastUpdated}</span>
              <a href="#" className="trend-up">
                实时行情
              </a>
            </footer>
          </>
        ) : (
          reportContent && (
            <>
              <ReportPage content={reportContent} />
              <footer className="footer">
                <span>报告更新：{reportContent.updatedAt}</span>
                <a href="#" className="trend-up">
                  研报归档
                </a>
              </footer>
            </>
          )
        )}
      </div>
    </div>
  );
};

export default App;

type ReportPageProps = {
  content: ReportContent;
};

const impactClassMap: Record<ReportHighlight["impact"], string> = {
  up: "report-impact-up",
  down: "report-impact-down",
  neutral: "report-impact-neutral",
};

const ReportPage: FC<ReportPageProps> = ({ content }) => {
  return (
    <div className="report-page">
      <section className="dashboard-card report-hero">
        <div>
          <h2>{content.heroTitle}</h2>
          <p>{content.heroSubtitle}</p>
        </div>
        <div className="report-hero-meta">
          <span>更新：{content.updatedAt}</span>
        </div>
      </section>

      <section className="grid cols-4 report-summary">
        {content.summaryMetrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            unit={metric.unit}
            trend={metric.trend}
            trendDirection={metric.trendDirection}
          />
        ))}
      </section>

      <div className="report-grid">
        <section className="dashboard-card report-section">
          <div className="flex-between">
            <h2>焦点速览</h2>
            <span className="muted">重点事件 · 风险提示</span>
          </div>
          <ul className="report-highlights">
            {content.highlights.map((item) => (
              <li key={item.title} className="report-highlight">
                <div className="report-highlight-header">
                  <span className={`report-highlight-tag ${impactClassMap[item.impact]}`}>{item.tag}</span>
                  <h3>{item.title}</h3>
                </div>
                <p>{item.summary}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="dashboard-card report-section">
          <div className="flex-between">
            <h2>精选研报</h2>
            <span className="muted">覆盖主流机构观点</span>
          </div>
          <div className="report-articles">
            {content.articles.map((article) => (
              <article key={article.title} className="report-article">
                <header>
                  <h3>{article.title}</h3>
                  <div className="report-article-meta">
                    <span>{article.source}</span>
                    <span>{article.publishedAt}</span>
                  </div>
                </header>
                <p>{article.excerpt}</p>
                <button type="button" className="report-article-link">
                  查看详情
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
