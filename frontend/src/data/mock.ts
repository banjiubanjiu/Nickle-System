export const summaryMetrics = [
  {
    label: "最新价",
    value: "18,527.09",
    unit: "元/吨",
    trend: "+0.31%",
    trendDirection: "up" as const,
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

export const orderBook = {
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
};

const baseDate = new Date("2025-11-03T03:00:00");
export const timelineCandles = Array.from({ length: 300 }).map((_, idx) => {
  const current = new Date(baseDate.getTime() + idx * 60 * 1000);
  const open = 18500 + Math.sin(idx / 4) * 150 + (idx % 3) * 25;
  const close = open + (Math.random() - 0.5) * 90;
  const high = Math.max(open, close) + Math.random() * 70;
  const low = Math.min(open, close) - Math.random() * 70;
  const volume = Math.round(800 + Math.random() * 1200);
  return {
    time: Math.floor(current.getTime() / 1000),
    open: Number(open.toFixed(2)),
    close: Number(close.toFixed(2)),
    high: Number(high.toFixed(2)),
    low: Number(low.toFixed(2)),
    volume,
  };
});

const formatTime = (hour: number, minute: number) => `${hour.toString().padStart(2, "0")}:${minute
  .toString()
  .padStart(2, "0")}`;

export const priceSeries = Array.from({ length: 24 }).map((_, idx) => {
  const hour = 11 + Math.floor(idx / 6);
  const minute = (idx % 6) * 10 + 3;
  return {
    time: formatTime(hour, minute),
    value: 18400 + Math.sin(idx / 3) * 180 + Math.random() * 60,
  };
});

export const volumeSeries = Array.from({ length: 24 }).map((_, idx) => {
  const hour = 18 + Math.floor(idx / 6);
  const minute = (idx % 6) * 10;
  return {
    time: formatTime(hour, minute),
    volume: Math.round(25000 + Math.random() * 90000),
    openInterest: Math.round(20000 + Math.random() * 70000),
  };
});

export const sessionStats = [
  { label: "开盘价", value: "18,450.00", unit: "元/吨" },
  { label: "最高价", value: "18,620.00", unit: "元/吨" },
  { label: "最低价", value: "18,420.00", unit: "元/吨" },
  { label: "昨结算", value: "18,470.00", unit: "元/吨" },
];

export const trades = [
  { time: "12:22:54", price: "18,536.90", volume: "245.0", side: "卖出" },
  { time: "12:21:54", price: "18,536.57", volume: "448.0", side: "买入" },
  { time: "12:20:54", price: "18,527.59", volume: "514.0", side: "卖出" },
  { time: "12:19:54", price: "18,532.51", volume: "333.0", side: "买入" },
  { time: "12:18:54", price: "18,526.98", volume: "172.0", side: "买入" },
];

export const dashboardMeta = {
  title: "镍金属期货实时数据大屏",
  exchange: "上海期货交易所",
  contract: "NI2501",
  lastUpdated: "2025/11/3 12:22:54",
};
