import { useEffect, useMemo, useRef, useState, type FC } from "react";
import { buildMarketData, type MarketKey } from "./data/mock";
import { DashboardHeader } from "./components/DashboardHeader";
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

const App: FC = () => {
  const { datasets, exchangeOptions } = useMemo(() => buildMarketData(), []);
  const exchangeKeys = Object.keys(datasets) as MarketKey[];
  const defaultExchange = exchangeKeys[0] ?? "shfe";

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
  }, [selectedExchange, activeMarket]);

  const headerTitle = "镍金属期货实时数据大屏";
  const headerMeta = {
    exchange: activeExchangeOption.label,
    contract: contractLabel,
    lastUpdated,
  };

  return (
    <div className="dashboard-layout">
      <DashboardHeader
        title={headerTitle}
        exchangeOptions={exchangeOptions}
        selectedExchangeKey={selectedExchange}
        selectedContractKey={selectedContract}
        onExchangeChange={handleExchangeChange}
        onContractChange={handleContractChange}
      />

      <div className="dashboard-container">
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
      </div>
    </div>
  );
};

export default App;
