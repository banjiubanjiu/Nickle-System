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
import { useEffect, useRef } from "react";
import {
  ColorType,
  CrosshairMode,
  createChart,
  type CandlestickData,
  type HistogramData,
  type ISeriesApi,
  type Range,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";

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

// 帮助函数：生成人类友好的轴刻度（nice number algorithm）。
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

type VisibleRange = { from: UTCTimestamp; to: UTCTimestamp };

type CandlePoint = CandlestickData<UTCTimestamp> & {
  volume?: number;
};

type CandlestickChartProps = {
  data: CandlePoint[];
  includeVolume?: boolean;
  visibleRange?: VisibleRange;
};

const CandlestickChart: FC<CandlestickChartProps> = ({ data, includeVolume = true, visibleRange }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReturnType<typeof createChart>>();
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick">>();
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram">>();
  const boundsRef = useRef<VisibleRange | null>(null);
  const windowWidthRef = useRef<number | null>(null);

  const isTimestamp = (value: unknown): value is UTCTimestamp => typeof value === "number";
  const toTimestamp = (value: number): UTCTimestamp => value as UTCTimestamp;

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(232, 242, 255, 0.75)",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.05)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
      },
      localization: {
        priceFormatter: (price: number) => price.toFixed(2),
      },
      watermark: { visible: false },
      leftPriceScale: { visible: false },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#ff6b6b",
      downColor: "#4ecdc4",
      borderUpColor: "#ff6b6b",
      borderDownColor: "#4ecdc4",
      wickUpColor: "#ff6b6b",
      wickDownColor: "#4ecdc4",
    });

    let volumeSeries: ISeriesApi<"Histogram"> | undefined;
    if (includeVolume) {
      volumeSeries = chart.addHistogramSeries({
        color: "rgba(0, 212, 255, 0.6)",
        priceFormat: {
          type: "volume",
        },
        priceScaleId: "",
        base: 0,
      });
      chart.priceScale("").applyOptions({
        scaleMargins: {
          top: 0.85,
          bottom: 0.02,
        },
        borderVisible: false,
      });
    }

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const timeScale = chart.timeScale();

    const clampVisibleRange = (range: Range<Time> | null) => {
      const bounds = boundsRef.current;
      if (!bounds || !range || !isTimestamp(range.from) || !isTimestamp(range.to)) {
        return;
      }
      const width = range.to - range.from;
      if (Number.isFinite(width) && width > 0) {
        windowWidthRef.current = width;
      }
      const targetWidth = windowWidthRef.current ?? width;
      if (range.to > bounds.to) {
        const from = toTimestamp(Math.max(bounds.to - targetWidth, bounds.from));
        timeScale.setVisibleRange({ from, to: bounds.to });
      } else if (range.from < bounds.from) {
        const to = toTimestamp(Math.min(bounds.from + targetWidth, bounds.to));
        timeScale.setVisibleRange({ from: bounds.from, to });
      }
    };

    timeScale.subscribeVisibleTimeRangeChange(clampVisibleRange);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      timeScale.unsubscribeVisibleTimeRangeChange(clampVisibleRange);
      chart.remove();
      boundsRef.current = null;
      windowWidthRef.current = null;
    };
  }, [includeVolume]);

  useEffect(() => {
    if (!candleSeriesRef.current || !chartRef.current) {
      return;
    }
    const formatted = data.map(({ volume, ...candle }) => candle);
    candleSeriesRef.current.setData(formatted);

    if (formatted.length > 0) {
      const first = formatted[0].time as UTCTimestamp;
      const last = formatted[formatted.length - 1].time as UTCTimestamp;
      if (first !== undefined && last !== undefined) {
        boundsRef.current = { from: first, to: last };
        const timeScale = chartRef.current.timeScale();
        timeScale.applyOptions({ barSpacing: 15, minBarSpacing: 6, rightOffset: 1.5 });
        const fallbackCount = Math.min(12, formatted.length);
        const fallbackIndex = formatted.length > fallbackCount ? formatted.length - fallbackCount : 0;
        const fallbackSource = formatted[fallbackIndex] ?? formatted[0];
        const fallbackFrom = fallbackSource.time as UTCTimestamp;
        const fallbackRange: VisibleRange = { from: fallbackFrom, to: last };
        const defaultRange: VisibleRange = visibleRange ?? fallbackRange;
        timeScale.setVisibleRange(defaultRange);
        timeScale.scrollToRealTime();
        windowWidthRef.current = Number(defaultRange.to) - Number(defaultRange.from);
      }
    }

    if (includeVolume && volumeSeriesRef.current) {
      const volumeData: HistogramData<UTCTimestamp>[] = data.map((point) => ({
        time: point.time,
        value: point.volume ?? 0,
        color: point.close >= point.open ? "rgba(255, 107, 107, 0.8)" : "rgba(78, 205, 196, 0.8)",
      }));
      volumeSeriesRef.current.setData(volumeData);
    }
  }, [data, includeVolume]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
};

type CandleChartCardProps = {
  candles: CandlePoint[];
  visibleRange?: VisibleRange;
  unitLabel?: string;
};

export const CandleChartCard: FC<CandleChartCardProps> = ({ candles, visibleRange, unitLabel = "元/吨" }) => {
  return (
    <section className="dashboard-card" style={{ minHeight: 320, height: "100%" }}>
      <div className="flex-between" style={{ marginBottom: 12 }}>
        <h2>K 线图（小时）</h2>
        <span className="muted">单位：{unitLabel}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <CandlestickChart data={candles} visibleRange={visibleRange} />
      </div>
    </section>
  );
};

export const SecondaryCharts: FC<{ priceSeries: PriceDatum[]; volumeSeries: VolumeDatum[] }> = ({
  priceSeries,
  volumeSeries,
}) => {
  const displayPriceSeries = priceSeries;
  const priceScale =
    displayPriceSeries.length > 0 ? buildNiceScale(displayPriceSeries.map((item) => item.value), 6) : undefined;

  return (
    <div className="grid cols-2">
      <section className="dashboard-card" style={{ minHeight: 320 }}>
        <div className="flex-between">
          <h2>价格走势</h2>
          <span className="muted">过去 12 小时</span>
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
          <span className="muted">过去 12 小时</span>
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
