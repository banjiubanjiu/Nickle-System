import { useMemo, useState, type FC } from "react";
import { exchangeOptions, marketDatasets, type MarketKey } from "./data/mock";
import { DashboardHeader } from "./components/DashboardHeader";
import { MetricCard } from "./components/MetricCard";
import { OrderBookPanel } from "./components/OrderBookPanel";
import { TradesTable } from "./components/TradesTable";
import { CandleChartCard, SecondaryCharts } from "./components/ChartsSection";
import { StatsGrid } from "./components/StatsGrid";

const App: FC = () => {
  const [selectedExchange, setSelectedExchange] = useState<MarketKey>("shfe");
  const activeMarket = marketDatasets[selectedExchange];

  const activeExchangeOption = useMemo(
    () => exchangeOptions.find((option) => option.key === selectedExchange) ?? exchangeOptions[0],
    [selectedExchange],
  );

  const [selectedContract, setSelectedContract] = useState(() => activeMarket.contracts[0]?.key ?? "");

  const contractOptions = activeExchangeOption.contracts;

  const contractLabel = useMemo(() => {
    const matched = contractOptions.find((item) => item.key === selectedContract);
    return matched?.label ?? contractOptions[0]?.label ?? activeMarket.meta.contract;
  }, [activeMarket.meta.contract, contractOptions, selectedContract]);

  const handleExchangeChange = (key: string) => {
    const nextExchange = (key as MarketKey) ?? "shfe";
    setSelectedExchange(nextExchange);
    const nextContracts = exchangeOptions.find((option) => option.key === nextExchange)?.contracts ?? [];
    setSelectedContract(nextContracts[0]?.key ?? "");
  };

  const handleContractChange = (key: string) => {
    setSelectedContract(key);
  };

  const headerTitle = activeMarket.meta.title;
  const headerMeta = {
    exchange: activeExchangeOption.label,
    contract: contractLabel,
    lastUpdated: activeMarket.meta.lastUpdated,
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
          {activeMarket.summaryMetrics.map((metric) => (
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
          <CandleChartCard candles={activeMarket.timelineCandles} />
          <OrderBookPanel {...activeMarket.orderBook} />
        </div>

        <SecondaryCharts priceSeries={activeMarket.priceSeries} volumeSeries={activeMarket.volumeSeries} />

        <StatsGrid stats={activeMarket.sessionStats} />

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
