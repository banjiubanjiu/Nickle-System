﻿﻿﻿﻿﻿﻿﻿import { useEffect, useMemo, useRef, useState, type FC, type ReactNode } from "react";
import { buildMarketData, type MarketKey } from "./data/mock";
import { DashboardHeader, type NavKey } from "./components/DashboardHeader";
import { RealtimeDashboard } from "./pages/dashboard/RealtimeDashboard";
import { MorningDailyReport } from "./pages/reports/MorningDailyReport";
import { WeeklyReport } from "./pages/reports/WeeklyReport";
import { MonthlyReport } from "./pages/reports/MonthlyReport";
import { YearlyReport } from "./pages/reports/YearlyReport";
import {
  fetchHealth,
  fetchLatest,
  type DashboardEnvelope,
  type SnapshotRecord,
} from "./services/dashboard";
import type { MetricView } from "./types/reports";
import { morningDailyReports } from "./data/reports/morningDaily";
import { weeklyReport } from "./data/reports/weekly";
import { monthlyReport } from "./data/reports/monthly";
import { yearlyReport } from "./data/reports/yearly";

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

const NAV_TITLE_MAP: Record<NavKey, string> = {
  home: "镍金属期货实时数据大屏",
  morning: "镍市晨报速览",
  daily: "日度研报摘要",
  weekly: "周度盘面回顾",
  monthly: "月度趋势洞察",
  yearly: "年度策略展望",
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
        // ignore health fetch errors, fall back to default interval
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

  let reportSection: ReactNode = null;
  let reportUpdatedAt = "";

  if (!isHomeView) {
    switch (selectedNavKey) {
      case "morning": {
        const content = morningDailyReports.morning;
        reportSection = <MorningDailyReport content={content} />;
        reportUpdatedAt = content.updatedAt;
        break;
      }
      case "daily": {
        const content = morningDailyReports.daily;
        reportSection = <MorningDailyReport content={content} />;
        reportUpdatedAt = content.updatedAt;
        break;
      }
      case "weekly": {
        const content = weeklyReport;
        reportSection = <WeeklyReport content={content} />;
        reportUpdatedAt = content.updatedAt;
        break;
      }
      case "monthly": {
        const content = monthlyReport;
        reportSection = <MonthlyReport content={content} />;
        reportUpdatedAt = content.updatedAt;
        break;
      }
      case "yearly": {
        const content = yearlyReport;
        reportSection = <YearlyReport content={content} />;
        reportUpdatedAt = content.updatedAt;
        break;
      }
      default:
        break;
    }
  }

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
          <RealtimeDashboard
            primaryMetrics={primaryMetrics}
            secondaryMetrics={secondaryMetrics}
            market={activeMarket}
            lastUpdated={lastUpdated}
          />
        ) : (
          reportSection && (
            <>
              {reportSection}
              <footer className="footer">
                <span>报告更新：{reportUpdatedAt}</span>
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
}

export default App;
