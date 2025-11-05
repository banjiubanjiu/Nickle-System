import { useMemo, useState, type FC } from "react";
import { exchangeOptions, marketDatasets, type MarketKey } from "./data/mock";
import { DashboardHeader } from "./components/DashboardHeader";
import { MetricCard } from "./components/MetricCard";
import { OrderBookPanel } from "./components/OrderBookPanel";
import { TradesTable } from "./components/TradesTable";
import { CandleChartCard, SecondaryCharts } from "./components/ChartsSection";
import { StatsGrid } from "./components/StatsGrid";

const App: FC = () => {
  // 记录当前展示的交易所（默认展示上期所数据视图）。
  const [selectedExchange, setSelectedExchange] = useState<MarketKey>("shfe");
  const activeMarket = marketDatasets[selectedExchange];

  // 派生出当前交易所的配置（包含可选合约与展示名称）。
  const activeExchangeOption = useMemo(
    () => exchangeOptions.find((option) => option.key === selectedExchange) ?? exchangeOptions[0],
    [selectedExchange],
  );

  // 初始合约取自当前交易所的第一个合约；切换交易所时会同步更新。
  const [selectedContract, setSelectedContract] = useState(() => activeMarket.contracts[0]?.key ?? "");

  const contractOptions = activeExchangeOption.contracts;

  // 根据选中的合约 key 计算显示用的文案，若缺失则兜底为配置中的首个合约。
  const contractLabel = useMemo(() => {
    const matched = contractOptions.find((item) => item.key === selectedContract);
    return matched?.label ?? contractOptions[0]?.label ?? activeMarket.meta.contract;
  }, [activeMarket.meta.contract, contractOptions, selectedContract]);

  // 切换交易所时同时刷新合约选项与对应数据集合。
  const handleExchangeChange = (key: string) => {
    const nextExchange = (key as MarketKey) ?? "shfe";
    setSelectedExchange(nextExchange);
    const nextContracts = exchangeOptions.find((option) => option.key === nextExchange)?.contracts ?? [];
    setSelectedContract(nextContracts[0]?.key ?? "");
  };

  // 合约下拉仅影响当前展示的合约标签（mock 数据下其它指标暂共用同一数据集）。
  const handleContractChange = (key: string) => {
    setSelectedContract(key);
  };

  // 更新时间由 mock 数据提供，未来接入 API 后可直接替换。
  const headerTitle = "镍金属期货实时数据大屏";
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
        {/* 顶部四宫格展示关键指标，按数据顺序渲染指标卡组件。 */}
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

        {/* 主体区域：左侧为 K 线图，右侧为盘口深度面板。 */}
        <div className="panels">
          <CandleChartCard candles={activeMarket.timelineCandles} unitLabel={activeMarket.priceUnit} />
          <OrderBookPanel {...activeMarket.orderBook} />
        </div>

        {/* 二级图表区，包含价格均线趋势与成交/持仓柱状图。 */}
        <SecondaryCharts priceSeries={activeMarket.priceSeries} volumeSeries={activeMarket.volumeSeries} />

        {/* 会话统计卡片（开盘、最高等）。 */}
        <StatsGrid stats={activeMarket.sessionStats} />

        {/* 成交明细列表。 */}
        <TradesTable trades={activeMarket.trades} />

        {/* 页脚展示最新更新时间及快速操作链接。 */}
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
