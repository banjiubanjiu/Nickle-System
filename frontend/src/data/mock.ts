// Mock 数据生成脚本：用于在未联通后端时支撑前端页面展示。
// 后续接入真实接口后，可保留该文件作为 Storybook 或离线演示数据来源。

const formatTime = (hour: number, minute: number) => `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

type SummaryMetric = {
  label: string;
  value: string;
  unit?: string;
  trend?: string;
  trendDirection?: "up" | "down";
};

const createShfeData = () => {
  // 交易所及合约信息，结构与后端计划保持一致。
  const contracts = [
    { key: "ni2501", label: "NI2501" },
    { key: "ni2505", label: "NI2505" },
    { key: "ni2509", label: "NI2509" },
  ];

  const baseDate = new Date("2025-11-03T09:00:00");

  // 生成 5 分钟级别的 K 线数据，叠加正弦趋势与噪声制造波动。
  const timelineCandles = Array.from({ length: 120 }).map((_, idx) => {
    const current = new Date(baseDate.getTime() + idx * 5 * 60 * 1000);
    const trend = Math.sin(idx / 18) * 160 + Math.cos(idx / 9) * 120;
    const noise = (Math.random() - 0.5) * 60;
    const open = 18480 + trend + noise;
    const close = open + (Math.random() - 0.5) * 80;
    const high = Math.max(open, close) + Math.random() * 90;
    const low = Math.min(open, close) - Math.random() * 90;
    const volume = Math.round(800 + Math.random() * 3500);
    return {
      time: Math.floor(current.getTime() / 1000),
      open: Number(open.toFixed(2)),
      close: Number(close.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      volume,
    };
  });

  // 价格折线图（每分钟），用于 5 分钟均线展示。
  const priceSeries = Array.from({ length: 120 }).map((_, idx) => {
    const current = new Date(baseDate.getTime() + idx * 60 * 1000);
    const drift = Math.sin(idx / 12) * 120 + Math.cos(idx / 8) * 60;
    const noise = (Math.random() - 0.5) * 25;
    return {
      time: formatTime(current.getHours(), current.getMinutes()),
      value: Number((18420 + drift + noise).toFixed(2)),
    };
  });

  // 10 分钟采样的成交量与持仓量序列，供柱状图使用。
  const volumeSeries = Array.from({ length: 24 }).map((_, idx) => {
    const hour = 18 + Math.floor(idx / 6);
    const minute = (idx % 6) * 10;
    return {
      time: formatTime(hour, minute),
      volume: Math.round(25000 + Math.random() * 90000),
      openInterest: Math.round(20000 + Math.random() * 70000),
    };
  });

  const summaryMetrics: SummaryMetric[] = [
    {
      label: "最新价",
      value: "18,527.09",
      unit: "元/吨",
      trend: "+0.31%",
      trendDirection: "up",
    },
    {
      label: "成交量",
      value: "245,600",
      unit: "手",
    },
    {
      label: "持仓量",
      value: "128,400",
      unit: "手",
    },
    {
      label: "结算价",
      value: "18,532.09",
      unit: "元/吨",
    },
  ];

  return {
    meta: {
      title: "镍金属期货实时数据大屏",
      exchange: "上海期货交易所",
      contract: "NI2501",
      lastUpdated: "2025/11/3 12:22:54",
    },
    contracts,
    priceUnit: "元/吨",
    summaryMetrics,
    orderBook: {
      bestPrice: "18,525.09",
      asks: [
        { price: "18,537.09", volume: 443 },
        { price: "18,535.09", volume: 708 },
        { price: "18,533.09", volume: 210 },
        { price: "18,531.09", volume: 824 },
        { price: "18,529.09", volume: 284 },
      ],
      bids: [
        { price: "18,525.09", volume: 945 },
        { price: "18,523.09", volume: 618 },
        { price: "18,521.09", volume: 439 },
        { price: "18,519.09", volume: 289 },
        { price: "18,517.09", volume: 713 },
      ],
    },
    timelineCandles,
    priceSeries,
    volumeSeries,
    sessionStats: [
      { label: "开盘价", value: "18,450.00", unit: "元/吨" },
      { label: "最高价", value: "18,620.00", unit: "元/吨" },
      { label: "最低价", value: "18,420.00", unit: "元/吨" },
      { label: "昨结算", value: "18,470.00", unit: "元/吨" },
    ],
    trades: Array.from({ length: 30 }).map((_, idx) => {
      const time = new Date(baseDate.getTime() + idx * 61 * 1000);
      const price = 18500 + Math.sin(idx / 4) * 65 + (Math.random() - 0.5) * 25;
      const volume = 200 + Math.round(Math.random() * 320);
      const side = idx % 2 === 0 ? "买入" : "卖出";
      return {
        time: formatTime(time.getHours(), time.getMinutes()),
        price: price.toFixed(2),
        volume: volume.toFixed(1),
        side,
      };
    }),
  };
};

const createLmeData = () => {
  const contracts = [
    { key: "nickel3m", label: "Nickel 3M" },
    { key: "nickel15m", label: "Nickel 15M" },
    { key: "nickel27m", label: "Nickel 27M" },
  ];

  const baseDate = new Date("2025-11-03T07:00:00Z");

  // LME 时间粒度采用 15 分钟，覆盖更长时间范围。
  const timelineCandles = Array.from({ length: 160 }).map((_, idx) => {
    const current = new Date(baseDate.getTime() + idx * 15 * 60 * 1000);
    const trend = Math.sin(idx / 20) * 95 + Math.cos(idx / 11) * 70;
    const noise = (Math.random() - 0.5) * 45;
    const open = 18650 + trend + noise;
    const close = open + (Math.random() - 0.5) * 65;
    const high = Math.max(open, close) + Math.random() * 75;
    const low = Math.min(open, close) - Math.random() * 75;
    const volume = Math.round(420 + Math.random() * 1800);
    return {
      time: Math.floor(current.getTime() / 1000),
      open: Number(open.toFixed(2)),
      close: Number(close.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      volume,
    };
  });

  const priceSeries = Array.from({ length: 120 }).map((_, idx) => {
    const current = new Date(baseDate.getTime() + idx * 60 * 1000);
    const drift = Math.sin(idx / 15) * 85 + Math.cos(idx / 10) * 55;
    const noise = (Math.random() - 0.5) * 20;
    return {
      time: formatTime(current.getUTCHours(), current.getUTCMinutes()),
      value: Number((18620 + drift + noise).toFixed(2)),
    };
  });

  const volumeSeries = Array.from({ length: 24 }).map((_, idx) => {
    const hour = 14 + Math.floor(idx / 6);
    const minute = (idx % 6) * 10;
    return {
      time: formatTime(hour, minute),
      volume: Math.round(18000 + Math.random() * 50000),
      openInterest: Math.round(12000 + Math.random() * 48000),
    };
  });

  return {
    meta: {
      title: "LME Nickel 市场看板",
      exchange: "伦敦金属交易所",
      contract: "Nickel 3M",
      lastUpdated: "2025/11/3 12:12:10 (Beijing)",
    },
    contracts,
    priceUnit: "USD/吨",
    summaryMetrics: [
      { label: "最新价", value: "18,642", unit: "USD/吨", trend: "+0.18%", trendDirection: "up" },
      { label: "成交量", value: "58,320", unit: "手" },
      { label: "持仓量", value: "92,140", unit: "手" },
      { label: "结算价", value: "18,610", unit: "USD/吨" },
    ],
    orderBook: {
      bestPrice: "18,640",
      asks: [
        { price: "18,652", volume: 168 },
        { price: "18,648", volume: 214 },
        { price: "18,643", volume: 187 },
        { price: "18,638", volume: 153 },
        { price: "18,633", volume: 145 },
      ],
      bids: [
        { price: "18,640", volume: 242 },
        { price: "18,636", volume: 198 },
        { price: "18,631", volume: 205 },
        { price: "18,626", volume: 176 },
        { price: "18,621", volume: 162 },
      ],
    },
    timelineCandles,
    priceSeries,
    volumeSeries,
    sessionStats: [
      { label: "开盘价", value: "18,575", unit: "USD/吨" },
      { label: "最高价", value: "18,702", unit: "USD/吨" },
      { label: "最低价", value: "18,512", unit: "USD/吨" },
      { label: "昨结算", value: "18,590", unit: "USD/吨" },
    ],
    trades: Array.from({ length: 30 }).map((_, idx) => {
      const time = new Date(baseDate.getTime() + idx * 61 * 1000);
      const price = 18610 + Math.sin(idx / 4) * 65 + (Math.random() - 0.5) * 25;
      const volume = 120 + Math.round(Math.random() * 320);
      const side = idx % 2 === 0 ? "买入" : "卖出";
      return {
        time: formatTime(time.getUTCHours(), time.getUTCMinutes()),
        price: price.toFixed(2),
        volume: volume.toFixed(1),
        side,
      };
    }),
  };
};

export const marketDatasets = {
  shfe: createShfeData(),
  lme: createLmeData(),
};

// 市场标识枚举，便于组件声明 state 类型。
export type MarketKey = keyof typeof marketDatasets;

// 将数据源转换为下拉需要的选项结构。
export const exchangeOptions = Object.entries(marketDatasets).map(([key, dataset]) => ({
  key,
  label: dataset.meta.exchange,
  contracts: dataset.contracts,
}));
