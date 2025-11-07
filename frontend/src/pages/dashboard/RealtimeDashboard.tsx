import type { FC } from "react";

import "../../styles/pages/dashboard.css";

import { CandleChartCard, SecondaryCharts } from "../../components/ChartsSection";
import { MetricCard } from "../../components/MetricCard";
import { OrderBookPanel } from "../../components/OrderBookPanel";
import { StatsGrid } from "../../components/StatsGrid";
import { TradesTable } from "../../components/TradesTable";
import type { MarketDataset } from "../../data/mock";
import type { MetricView } from "../../types/reports";

type RealtimeDashboardProps = {
  primaryMetrics: MetricView[];
  secondaryMetrics: MetricView[];
  market: MarketDataset;
  lastUpdated: string;
};

export const RealtimeDashboard: FC<RealtimeDashboardProps> = ({
  primaryMetrics,
  secondaryMetrics,
  market,
  lastUpdated,
}) => {
  return (
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
          candles={market.timelineCandles}
          visibleRange={market.timelineVisibleRange}
          unitLabel={market.priceUnit}
        />
        <OrderBookPanel {...market.orderBook} />
      </div>

      <SecondaryCharts priceSeries={market.priceSeries} volumeSeries={market.volumeSeries} />

      <StatsGrid stats={secondaryMetrics} />

      <TradesTable trades={market.trades} />

      <footer className="footer">
        <span>数据更新时间：{lastUpdated}</span>
        <a href="#" className="trend-up">
          实时行情
        </a>
      </footer>
    </>
  );
};
