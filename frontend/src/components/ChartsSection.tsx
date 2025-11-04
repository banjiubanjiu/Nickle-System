import { useMemo, type FC } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CandlestickChart, type CandlePoint } from "./CandlestickChart";

type PriceDatum = {
  time: string;
  value: number;
};

type VolumeDatum = {
  time: string;
  volume: number;
  openInterest: number;
};

const chartGridStyle = {
  strokeDasharray: "3 3",
  stroke: "rgba(255,255,255,0.08)",
};

const niceNumber = (range: number, round: boolean): number => {
  if (!isFinite(range) || range <= 0) {
    return 1;
  }
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / Math.pow(10, exponent);
  let niceFraction: number;
  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }
  return niceFraction * Math.pow(10, exponent);
};

const buildNiceScale = (values: number[], targetTicks = 6) => {
  if (!values.length) {
    return undefined;
  }
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (!isFinite(min) || !isFinite(max)) {
    return undefined;
  }
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const padding = Math.max(5, (max - min) * 0.05);
  min -= padding;
  max += padding;

  const range = niceNumber(max - min, false);
  const tickSpacing = niceNumber(range / Math.max(targetTicks - 1, 1), true);
  const niceMin = Math.floor(min / tickSpacing) * tickSpacing;
  const niceMax = Math.ceil(max / tickSpacing) * tickSpacing;

  const precision = Math.max(0, -Math.floor(Math.log10(tickSpacing)));
  const ticks: number[] = [];
  for (let tick = niceMin; tick <= niceMax + tickSpacing / 2; tick += tickSpacing) {
    ticks.push(Number(tick.toFixed(precision)));
  }

  return {
    domain: [ticks[0], ticks[ticks.length - 1]] as [number, number],
    ticks,
    base: ticks[0],
  };
};

export const CandleChartCard: FC<{ candles: CandlePoint[] }> = ({ candles }) => {
  return (
    <section className="dashboard-card" style={{ minHeight: 320, height: "100%" }}>
      <div className="flex-between" style={{ marginBottom: 12 }}>
        <h2>K线图（分时）</h2>
        <span className="muted">单位：元/吨</span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <CandlestickChart data={candles} />
      </div>
    </section>
  );
};

export const SecondaryCharts: FC<{ priceSeries: PriceDatum[]; volumeSeries: VolumeDatum[] }> = ({
  priceSeries,
  volumeSeries,
}) => {
  const aggregatedPriceSeries = useMemo(() => {
    if (!priceSeries || priceSeries.length === 0) {
      return [];
    }
    const minuteSeries = priceSeries.slice(-60);
    const buckets: PriceDatum[] = [];
    for (let i = 0; i < minuteSeries.length; i += 5) {
      const bucket = minuteSeries.slice(i, i + 5);
      if (!bucket.length) {
        continue;
      }
      const average = bucket.reduce((sum, item) => sum + item.value, 0) / bucket.length;
      buckets.push({
        time: bucket[bucket.length - 1].time,
        value: Number(average.toFixed(2)),
      });
    }
    return buckets;
  }, [priceSeries]);

  const displayPriceSeries = aggregatedPriceSeries.length > 0 ? aggregatedPriceSeries : priceSeries;
  const priceScale = useMemo(() => buildNiceScale(displayPriceSeries.map((item) => item.value), 6), [
    displayPriceSeries,
  ]);

  return (
    <div className="grid cols-2">
      <section className="dashboard-card" style={{ minHeight: 320 }}>
        <div className="flex-between">
          <h2>价格走势图</h2>
          <span className="muted">5 分钟均线 · 最近 60 分钟</span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={displayPriceSeries}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#00d4ff" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid {...chartGridStyle} />
            <XAxis dataKey="time" tick={{ fill: "rgba(232,242,255,0.75)", fontSize: 15 }} />
            <YAxis
              tick={{ fill: "rgba(232,242,255,0.75)", fontSize: 15 }}
              width={80}
              domain={priceScale ? priceScale.domain : ["auto", "auto"]}
              ticks={priceScale?.ticks}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(18, 28, 46, 0.95)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
              }}
              formatter={(value: number) => [value.toFixed(2), "price"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#00f2ff"
              fill="url(#priceGradient)"
              strokeWidth={2}
              baseValue={priceScale ? priceScale.base : "dataMin"}
            />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      <section className="dashboard-card" style={{ minHeight: 320 }}>
        <div className="flex-between">
          <h2>成交量 & 持仓量</h2>
          <span className="muted">最近 24 点位</span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={volumeSeries}>
            <CartesianGrid {...chartGridStyle} />
            <XAxis dataKey="time" tick={{ fill: "rgba(232,242,255,0.75)", fontSize: 15 }} />
            <YAxis tick={{ fill: "rgba(232,242,255,0.75)", fontSize: 15 }} width={80} />
            <Tooltip
              contentStyle={{
                background: "rgba(18, 28, 46, 0.95)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
              }}
            />
            <Legend wrapperStyle={{ color: "rgba(232,242,255,0.5)" }} />
            <Bar dataKey="volume" name="成交量" fill="#00d4ff" radius={[6, 6, 0, 0]} />
            <Bar dataKey="openInterest" name="持仓量" fill="#4ecdc4" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
};
