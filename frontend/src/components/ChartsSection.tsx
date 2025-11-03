import type { FC } from "react";
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

export const CandleChartCard: FC<{ candles: CandlePoint[] }> = ({ candles }) => {
  return (
    <section className="dashboard-card" style={{ minHeight: 320, height: "100%" }}>
      <div className="flex-between" style={{ marginBottom: 12 }}>
        <h2>K线图（分钟）</h2>
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
  return (
    <div className="grid cols-2">
      <section className="dashboard-card" style={{ minHeight: 320 }}>
        <div className="flex-between">
          <h2>价格走势图</h2>
          <span className="muted">分钟级</span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={priceSeries}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#00d4ff" stopOpacity={0.05} />
              </linearGradient>
            </defs>
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
            <Area type="monotone" dataKey="value" stroke="#00f2ff" fill="url(#priceGradient)" strokeWidth={2} />
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
