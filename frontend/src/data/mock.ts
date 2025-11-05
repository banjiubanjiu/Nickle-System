// Mock 数据生成脚本：演示用途的动态行情。
// 每次导入都会根据当前北京时间生成 48 小时历史，并默认展示最近 12 小时窗口。

const TOTAL_HOURS = 48;
const DEFAULT_VISIBLE_HOURS = 12;
const HOUR_MS = 60 * 60 * 1000;
const BEIJING_OFFSET_MINUTES = -8 * 60;
const TIME_ZONE = "Asia/Shanghai";

const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const timeWithSecondsFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const numberFormatter = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat("zh-CN");

const toBeijingDate = (input: Date) => {
  const localOffset = input.getTimezoneOffset();
  const diffMinutes = BEIJING_OFFSET_MINUTES - localOffset;
  return new Date(input.getTime() + diffMinutes * 60 * 1000);
};

const formatTime = (date: Date) => timeFormatter.format(date);
const formatTimeWithSeconds = (date: Date) => timeWithSecondsFormatter.format(date);
const formatDateTime = (date: Date) => dateTimeFormatter.format(date);

const formatPrice = (value: number, fractionDigits = 2) =>
  numberFormatter.format(Number(value.toFixed(fractionDigits)));

const formatVolume = (value: number) => integerFormatter.format(Math.round(value));

const toUTCTimestamp = (date: Date) =>
  Math.floor((date.getTime() - date.getTimezoneOffset() * 60 * 1000) / 1000);

type SummaryMetric = {
  label: string;
  value: string;
  unit?: string;
  trend?: string;
  trendDirection?: "up" | "down";
};

type GenerateConfig = {
  basePrice: number;
  priceUnit: string;
  volumeBase: number;
  volumeVariance: number;
  openInterestBase: number;
  openInterestVariance: number;
};

const generateHourlyCandles = (anchor: Date, config: GenerateConfig) => {
  const candles: Array<{
    timestamp: Date;
    open: number;
    close: number;
    high: number;
    low: number;
    volume: number;
  }> = [];

  let previousClose = config.basePrice;

  for (let i = 0; i < TOTAL_HOURS; i += 1) {
    const timestamp = new Date(anchor.getTime() - (TOTAL_HOURS - 1 - i) * HOUR_MS);
    const trend =
      Math.sin((timestamp.getHours() + i) / 2.3) * 35 +
      Math.cos((timestamp.getHours() + i) / 3.1) * 25;
    const noise = (Math.random() - 0.5) * 40;
    const open = previousClose;
    const close = open + trend + noise;
    const high = Math.max(open, close) + Math.random() * 25;
    const low = Math.min(open, close) - Math.random() * 25;
    const volume =
      config.volumeBase + Math.random() * config.volumeVariance + Math.max(trend, 0) * 120;

    candles.push({
      timestamp,
      open,
      close,
      high,
      low,
      volume,
    });

    previousClose = close;
  }

  return candles;
};

const createDataset = (
  now: Date,
  anchor: Date,
  config: GenerateConfig,
  meta: { title: string; exchange: string; contract: string },
) => {
  const candles = generateHourlyCandles(anchor, config);
  const visibleCandles =
    candles.length >= DEFAULT_VISIBLE_HOURS
      ? candles.slice(-DEFAULT_VISIBLE_HOURS)
      : candles.slice();

  const priceSeries = visibleCandles.map((candle) => ({
    time: formatTime(candle.timestamp),
    value: Number(candle.close.toFixed(2)),
  }));

  const volumeSeries = visibleCandles.map((candle) => ({
    time: formatTime(candle.timestamp),
    volume: Math.round(candle.volume),
    openInterest: Math.round(
      config.openInterestBase +
        Math.random() * config.openInterestVariance +
        Math.max(candle.close - candle.open, 0) * 15,
    ),
  }));

  const latestCandle = candles[candles.length - 1];
  const previousCandle = candles[candles.length - 2] ?? latestCandle;
  const latestPrice = latestCandle.close;
  const prevClose = previousCandle.close;
  const change = latestPrice - prevClose;
  const changePct = prevClose === 0 ? 0 : (change / prevClose) * 100;

  const summaryMetrics: SummaryMetric[] = [
    {
      label: "最新价",
      value: formatPrice(latestPrice),
      unit: config.priceUnit,
      trend: `${change >= 0 ? "+" : ""}${formatPrice(change, 2)} (${changePct >= 0 ? "+" : ""}${formatPrice(changePct, 2)}%)`,
      trendDirection: change >= 0 ? "up" : "down",
    },
    {
      label: "成交量",
      value: formatVolume(volumeSeries.reduce((total, item) => total + item.volume, 0)),
      unit: "手",
    },
    {
      label: "持仓量",
      value: formatVolume(volumeSeries.reduce((total, item) => total + item.openInterest, 0) / volumeSeries.length),
      unit: "手",
    },
    {
      label: "结算价",
      value: formatPrice(previousCandle.close),
      unit: config.priceUnit,
    },
  ];

  const midpointPrice = (latestCandle.high + latestCandle.low) / 2;
  const depthSpread = 6;
  const orderBook = {
    bestPrice: formatPrice(midpointPrice),
    asks: Array.from({ length: 5 }).map((_, idx) => ({
      price: formatPrice(midpointPrice + (idx + 1) * depthSpread),
      volume: Math.round(200 + Math.random() * 600),
    })),
    bids: Array.from({ length: 5 }).map((_, idx) => ({
      price: formatPrice(midpointPrice - (idx + 1) * depthSpread),
      volume: Math.round(200 + Math.random() * 600),
    })),
  };

  const trades = Array.from({ length: 30 }).map((_, idx) => {
    const tradeTime = new Date(now.getTime() - idx * 45 * 1000);
    const base = latestPrice + (Math.random() - 0.5) * 20;
    const volume = 80 + Math.random() * 220;
    return {
      time: formatTimeWithSeconds(tradeTime),
      price: formatPrice(base),
      volume: numberFormatter.format(Number(volume.toFixed(1))),
      side: idx % 2 === 0 ? "买入" : "卖出",
    };
  });

  return {
    meta: {
      title: meta.title,
      exchange: meta.exchange,
      contract: meta.contract,
      lastUpdated: formatDateTime(now),
    },
    contracts: [
      { key: meta.contract.toLowerCase().replace(/\s+/g, ""), label: meta.contract },
    ],
    priceUnit: config.priceUnit,
    summaryMetrics,
    orderBook,
    timelineCandles: candles.map((candle) => ({
      time: toUTCTimestamp(candle.timestamp),
      open: Number(candle.open.toFixed(2)),
      close: Number(candle.close.toFixed(2)),
      high: Number(candle.high.toFixed(2)),
      low: Number(candle.low.toFixed(2)),
      volume: Math.round(candle.volume),
    })),
    timelineVisibleRange:
      visibleCandles.length > 0
        ? {
            from: toUTCTimestamp(visibleCandles[0].timestamp),
            to: toUTCTimestamp(visibleCandles[visibleCandles.length - 1].timestamp),
          }
        : undefined,
    priceSeries,
    volumeSeries,
    sessionStats: [
      { label: "最高价", value: formatPrice(Math.max(...candles.map((item) => item.high))), unit: config.priceUnit },
      { label: "最低价", value: formatPrice(Math.min(...candles.map((item) => item.low))), unit: config.priceUnit },
      { label: "平均价", value: formatPrice(candles.reduce((total, item) => total + item.close, 0) / candles.length), unit: config.priceUnit },
      { label: "昨日收盘", value: formatPrice(previousCandle.close), unit: config.priceUnit },
    ],
    trades,
  };
};

const createDatasets = () => {
  const now = toBeijingDate(new Date());
  const anchor = new Date(now);
  anchor.setMinutes(0, 0, 0);

  const shfe = createDataset(now, anchor, {
    basePrice: 18600,
    priceUnit: "元/吨",
    volumeBase: 28000,
    volumeVariance: 55000,
    openInterestBase: 150000,
    openInterestVariance: 45000,
  }, {
    title: "镍金属期货实时数据大屏",
    exchange: "上海期货交易所",
    contract: "NI 主力",
  });

  const lme = createDataset(now, anchor, {
    basePrice: 18720,
    priceUnit: "USD/吨",
    volumeBase: 6500,
    volumeVariance: 15000,
    openInterestBase: 82000,
    openInterestVariance: 26000,
  }, {
    title: "LME Nickel 市场看板",
    exchange: "伦敦金属交易所",
    contract: "Nickel 3M",
  });

  return {
    shfe: {
      ...shfe,
      contracts: [
        { key: "ni_main", label: "NI 主力" },
        { key: "ni2505", label: "NI2505" },
      ],
    },
    lme: {
      ...lme,
      contracts: [
        { key: "nickel3m", label: "Nickel 3M" },
        { key: "nickel15m", label: "Nickel 15M" },
      ],
    },
  };
};

type MarketDatasets = ReturnType<typeof createDatasets>;

export type MarketKey = keyof MarketDatasets;

export const buildMarketData = () => {
  const datasets = createDatasets();
  const options = Object.entries(datasets).map(([key, dataset]) => ({
    key,
    label: dataset.meta.exchange,
    contracts: dataset.contracts,
  }));
  return { datasets, exchangeOptions: options };
};
