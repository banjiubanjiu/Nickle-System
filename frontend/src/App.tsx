import { useEffect, useMemo, useRef, useState, type FC, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { buildMarketData, type MarketDataset, type MarketKey } from "./data/mock";
import { DashboardHeader, type NavKey } from "./components/DashboardHeader";
import { RealtimeDashboard } from "./pages/dashboard/RealtimeDashboard";
import { MorningDailyReport } from "./pages/reports/MorningDailyReport";
import { WeeklyReport } from "./pages/reports/WeeklyReport";
import { MonthlyReport } from "./pages/reports/MonthlyReport";
import { YearlyReport } from "./pages/reports/YearlyReport";
import { getMorningDailyReports } from "./data/reports/morningDaily";
import { weeklyReport } from "./data/reports/weekly";
import { monthlyReport } from "./data/reports/monthly";
import { yearlyReport } from "./data/reports/yearly";
import {
  fetchHealth,
  fetchLatest,
  type DashboardEnvelope,
  type SnapshotRecord,
} from "./services/dashboard";
import type { MetricView } from "./types/reports";

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

const mapSnapshotToMetrics = (snapshot: SnapshotRecord, unitLabel: string): MetricView[] => {
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
      label: "涨跌%",
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

const cloneMetrics = (metrics?: MetricView[]): MetricView[] =>
  metrics ? metrics.map((metric) => ({ ...metric })) : [];

const splitMetrics = (metrics: MetricView[]): MetricGroups => {
  const primary = metrics.slice(0, 4);
  const secondary = metrics.slice(4, 8);
  return { primary, secondary };
};

const buildFallbackMetrics = (market?: MarketDataset): MetricGroups =>
  splitMetrics(cloneMetrics(market?.summaryMetrics as MetricView[] | undefined));

const normalizePath = (pathname: string): string => {
  if (pathname === "/") {
    return "/";
  }
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
};

const NAV_TITLE_MAP: Record<NavKey, string> = {
  home: "镍金属期货实时数据大屏",
  morning: "镍市晨报速览",
  daily: "日度研报摘要",
  weekly: "周度盘面回顾",
  monthly: "月度趋势洞察",
  yearly: "年度策略展望",
};

const NAV_KEY_TO_PATH: Record<NavKey, string> = {
  home: "/",
  morning: "/reports/morning",
  daily: "/reports/daily",
  weekly: "/reports/weekly",
  monthly: "/reports/monthly",
  yearly: "/reports/yearly",
};

const PATH_TO_NAV_KEY: Record<string, NavKey> = Object.entries(NAV_KEY_TO_PATH).reduce(
  (acc, [key, path]) => {
    acc[normalizePath(path)] = key as NavKey;
    return acc;
  },
  {} as Record<string, NavKey>,
);

const App: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { datasets, exchangeOptions } = useMemo(() => buildMarketData(), []);
  const exchangeKeys = Object.keys(datasets) as MarketKey[];
  const defaultExchange = exchangeKeys[0] ?? "shfe";

  const [selectedExchange, setSelectedExchange] = useState<MarketKey>(defaultExchange);
  const activeMarket: MarketDataset =
    datasets[selectedExchange] ?? datasets[defaultExchange];

  const [selectedContract, setSelectedContract] = useState(
    activeMarket?.contracts[0]?.key ?? "",
  );

  const fallbackMetrics = useMemo(() => buildFallbackMetrics(activeMarket), [activeMarket]);
  const [primaryMetrics, setPrimaryMetrics] = useState<MetricView[]>(fallbackMetrics.primary);
  const [secondaryMetrics, setSecondaryMetrics] = useState<MetricView[]>(fallbackMetrics.secondary);
  const [lastUpdated, setLastUpdated] = useState<string>(
    activeMarket?.meta.lastUpdated ?? "",
  );

  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestSnapshotRef = useRef<SnapshotRecord | null>(null);

  const currentPath = normalizePath(location.pathname);
  const selectedNavKey = PATH_TO_NAV_KEY[currentPath] ?? "home";
  const isHomeView = selectedNavKey === "home";
  const headerTitle = NAV_TITLE_MAP[selectedNavKey] ?? NAV_TITLE_MAP.home;
  const morningDailyReports = getMorningDailyReports();

  useEffect(() => {
    const contracts = activeMarket?.contracts ?? [];
    setSelectedContract((prev) =>
      contracts.some((item) => item.key === prev) ? prev : contracts[0]?.key ?? "",
    );
  }, [activeMarket]);

  useEffect(() => {
    let cancelled = false;

    const clearTimer = () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };

    if (!isHomeView) {
      const fallback = buildFallbackMetrics(activeMarket);
      setPrimaryMetrics(fallback.primary);
      setSecondaryMetrics(fallback.secondary);
      setLastUpdated(activeMarket?.meta.lastUpdated ?? "");
      latestSnapshotRef.current = null;
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
      const fallback = buildFallbackMetrics(activeMarket);
      setPrimaryMetrics(fallback.primary);
      setSecondaryMetrics(fallback.secondary);
      setLastUpdated(activeMarket?.meta.lastUpdated ?? "");
    };

    const fetchLatestSnapshot = async () => {
      try {
        const response: DashboardEnvelope<SnapshotRecord> = await fetchLatest(selectedExchange);
        if (!cancelled) {
          applySnapshot(response.data);
        }
      } catch {
        if (!cancelled) {
          loadFallback();
        }
      }
    };

    const initialise = async () => {
      clearTimer();
      loadFallback();
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
  }, [selectedExchange, activeMarket, isHomeView]);

  const handleExchangeChange = (key: string) => {
    const nextExchange = (key as MarketKey) ?? defaultExchange;
    setSelectedExchange(nextExchange);
    const market = datasets[nextExchange] ?? datasets[defaultExchange];
    const fallback = buildFallbackMetrics(market);
    setPrimaryMetrics(fallback.primary);
    setSecondaryMetrics(fallback.secondary);
    setLastUpdated(market?.meta.lastUpdated ?? "");
    setSelectedContract(market?.contracts[0]?.key ?? "");
    latestSnapshotRef.current = null;
  };

  const handleContractChange = (key: string) => {
    setSelectedContract(key);
  };

  const handleNavChange = (key: NavKey) => {
    const targetPath = NAV_KEY_TO_PATH[key] ?? "/";
    navigate(targetPath);
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
        onNavChange={handleNavChange}
      />

      <div className="dashboard-container">
        <Routes>
          <Route
            path="/"
            element={
              <RealtimeDashboard
                primaryMetrics={primaryMetrics}
                secondaryMetrics={secondaryMetrics}
                market={activeMarket}
                lastUpdated={lastUpdated}
              />
            }
          />
          <Route
            path="/reports/morning"
            element={
              <ReportLayout updatedAt={morningDailyReports.morning.updatedAt}>
                <MorningDailyReport content={morningDailyReports.morning} />
              </ReportLayout>
            }
          />
          <Route
            path="/reports/daily"
            element={
              <ReportLayout updatedAt={morningDailyReports.daily.updatedAt}>
                <MorningDailyReport content={morningDailyReports.daily} />
              </ReportLayout>
            }
          />
          <Route
            path="/reports/weekly"
            element={
              <ReportLayout updatedAt={weeklyReport.updatedAt}>
                <WeeklyReport content={weeklyReport} />
              </ReportLayout>
            }
          />
          <Route
            path="/reports/monthly"
            element={
              <ReportLayout updatedAt={monthlyReport.updatedAt}>
                <MonthlyReport content={monthlyReport} />
              </ReportLayout>
            }
          />
          <Route
            path="/reports/yearly"
            element={
              <ReportLayout updatedAt={yearlyReport.updatedAt}>
                <YearlyReport content={yearlyReport} />
              </ReportLayout>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default App;

const ReportLayout: FC<{ updatedAt: string; children: ReactNode }> = ({ children, updatedAt }) => (
  <>
    {children}
    <footer className="footer">
      <span>报告更新：{updatedAt}</span>
      <a href="#" className="trend-up">
        研报归档
      </a>
    </footer>
  </>
);
