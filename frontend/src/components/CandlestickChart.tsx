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
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#ff6b6b",
      downColor: "#4ecdc4",
      wickUpColor: "#ff6b6b",
      wickDownColor: "#4ecdc4",
      borderVisible: false,
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
          top: 0.75,
          bottom: 0.05,
        },
      });
    }

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [includeVolume]);

  useEffect(() => {
    if (!candleSeriesRef.current) {
      return;
    }
    const formattedData = data.map(({ volume, ...candle }) => candle);
    candleSeriesRef.current.setData(formattedData);

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
