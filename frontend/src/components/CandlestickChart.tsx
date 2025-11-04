import { useEffect, useRef } from "react";
import type { FC } from "react";
import {
  ColorType,
  CrosshairMode,
  createChart,
  type CandlestickData,
  type ISeriesApi,
  type HistogramData,
} from "lightweight-charts";

export type CandlePoint = CandlestickData & {
  volume?: number;
};

type CandlestickChartProps = {
  data: CandlePoint[];
  includeVolume?: boolean;
};

export const CandlestickChart: FC<CandlestickChartProps> = ({ data, includeVolume = true }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReturnType<typeof createChart>>();
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick">>();
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram">>();
  const dataBoundsRef = useRef<{ from: number; to: number } | null>(null);
  const windowSizeRef = useRef<number | null>(null);

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
          top: 0.88,
          bottom: 0.02,
        },
        drawTicks: false,
        drawLabels: false,
      });
    }

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const timeScale = chart.timeScale();
    const ensureDataVisible = (range: { from: number; to: number } | null) => {
      const bounds = dataBoundsRef.current;
      if (!range || !bounds) {
        return;
      }
      const currentWidth = range.to - range.from;
      if (currentWidth > 0 && Number.isFinite(currentWidth)) {
        windowSizeRef.current = currentWidth;
      }
      const targetWidth = windowSizeRef.current ?? Math.max(bounds.to - bounds.from, 0);
      if (range.to > bounds.to) {
        const from = Math.max(bounds.to - targetWidth, bounds.from);
        timeScale.setVisibleRange({ from, to: bounds.to });
        return;
      }
      if (range.from < bounds.from) {
        const to = Math.min(bounds.from + targetWidth, bounds.to);
        timeScale.setVisibleRange({ from: bounds.from, to });
      }
    };

    timeScale.subscribeVisibleTimeRangeChange(ensureDataVisible);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      timeScale.unsubscribeVisibleTimeRangeChange(ensureDataVisible);
      chart.remove();
    };
  }, [includeVolume]);

  useEffect(() => {
    if (!candleSeriesRef.current) {
      return;
    }
    const formattedData = data.map(({ volume, ...candle }) => candle);
    candleSeriesRef.current.setData(formattedData);
    if (chartRef.current && data.length > 0) {
      const timeScale = chartRef.current.timeScale();
      windowSizeRef.current = null;
      timeScale.resetTimeScale();
      const first = Number(formattedData[0].time);
      const last = Number(formattedData[formattedData.length - 1].time);
      if (Number.isFinite(first) && Number.isFinite(last)) {
        dataBoundsRef.current = { from: first, to: last };
        const windowStartIndex = Math.max(0, formattedData.length - 24);
        const windowFromRaw = Number(formattedData[windowStartIndex].time);
        const windowFrom = Number.isFinite(windowFromRaw) ? windowFromRaw : first;
        const windowWidth = last - windowFrom;
        windowSizeRef.current = windowWidth > 0 ? windowWidth : null;
        timeScale.applyOptions({ barSpacing: 14, minBarSpacing: 6, rightOffset: 1.5 });
        timeScale.setVisibleRange({ from: windowFrom, to: last });
        timeScale.scrollToRealTime();
      } else {
        dataBoundsRef.current = null;
        windowSizeRef.current = null;
      }
    }

    if (includeVolume && volumeSeriesRef.current) {
      const volumeData: HistogramData[] = data.map((point) => ({
        time: point.time,
        value: point.volume ?? 0,
        color: point.close >= point.open ? "rgba(255, 107, 107, 0.8)" : "rgba(78, 205, 196, 0.8)",
      }));
      volumeSeriesRef.current.setData(volumeData);
    }
  }, [data, includeVolume]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
};
