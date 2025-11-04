import type { FC } from "react";
import {
  dashboardMeta,
  orderBook,
  priceSeries,
  sessionStats,
  summaryMetrics,
  timelineCandles,
  trades,
  volumeSeries,
} from "./data/mock";
import { DashboardHeader } from "./components/DashboardHeader";
import { MetricCard } from "./components/MetricCard";
import { OrderBookPanel } from "./components/OrderBookPanel";
import { TradesTable } from "./components/TradesTable";
import { CandleChartCard, SecondaryCharts } from "./components/ChartsSection";
import { StatsGrid } from "./components/StatsGrid";

const App: FC = () => {
  return (
    <div className="dashboard-layout">
      <DashboardHeader
        title={dashboardMeta.title}
        exchange={dashboardMeta.exchange}
        contract={dashboardMeta.contract}
      />

      <div className="dashboard-container">
        <section className="grid cols-4">
          {summaryMetrics.map((metric) => (
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
          <CandleChartCard candles={timelineCandles} />
          <OrderBookPanel {...orderBook} />
        </div>

        <SecondaryCharts priceSeries={priceSeries} volumeSeries={volumeSeries} />

        <StatsGrid stats={sessionStats} />

        <TradesTable trades={trades} />

        <footer className="footer">
          <span>数据更新时间：{dashboardMeta.lastUpdated}</span>
          <a href="#" className="trend-up">
            实时行情
          </a>
        </footer>
      </div>
    </div>
  );
};

export default App;
