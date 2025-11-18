import type { FC } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { YearlyChart as YearlyChartPayload, YearlySeries, YearlySeriesPoint } from "../services/yearly";

type YearlyChartProps = {
  chart: YearlyChartPayload;
  yAxisDomain?: [number, number];
  yAxisTickCount?: number;
  yAxisTicks?: number[];
  secondaryYAxisDomain?: [number, number];
  secondaryYAxisTickCount?: number;
  secondaryYAxisTicks?: number[];
  stackBars?: boolean;
  xAxisAngle?: number;
  xAxisHeight?: number;
  xAxisTextAnchor?: "start" | "middle" | "end";
};

const chartGridStyle = {
  stroke: "rgba(255, 255, 255, 0.1)",
  strokeDasharray: "4 4",
};

const defaultColors = ["#08599C", "#EF0808", "#4BACC6", "#F7A600", "#7A49A5", "#4FBF26"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatValue = (value: YearlySeriesPoint): number | undefined => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

const formatCategoryLabel = (value: YearlySeriesPoint, index: number): string => {
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      const month = MONTH_LABELS[parsed.getUTCMonth()];
      const year = String(parsed.getUTCFullYear()).slice(-2);
      return `${month}-${year}`;
    }
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (Number.isInteger(value)) {
      return value.toString();
    }
    return value.toFixed(2).replace(/\.?0+$/, "");
  }
  return `${index + 1}`;
};

const collectNumericValues = (seriesList: YearlySeries[]): number[] =>
  seriesList
    .flatMap((series) => series.values.map((value) => formatValue(value ?? null)))
    .filter((value): value is number => typeof value === "number");

const computeDomain = (
  seriesList: YearlySeries[],
  override?: [number, number],
  fallback?: YearlyChartPayload["valueRange"],
): [number, number] | undefined => {
  if (override) {
    return override;
  }
  if (fallback) {
    return [
      fallback.suggestedMin ?? fallback.dataMin,
      fallback.suggestedMax ?? fallback.dataMax,
    ];
  }
  const values = collectNumericValues(seriesList);
  if (!values.length) {
    return undefined;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    return [min - pad, max + pad];
  }
  const span = max - min;
  const padding = span * 0.1 || 1;
  return [min - padding, max + padding];
};

export const YearlyChart: FC<YearlyChartProps> = ({
  chart,
  yAxisDomain,
  yAxisTickCount,
  yAxisTicks,
  secondaryYAxisDomain,
  secondaryYAxisTickCount,
  secondaryYAxisTicks,
  stackBars,
  xAxisAngle,
  xAxisHeight,
  xAxisTextAnchor,
}) => {
  const categories = chart.categoryLabels ?? [];
  const data = categories.map((label, index) => {
    const row: Record<string, number | string> = {
      category: formatCategoryLabel(label, index),
    };
    chart.series.forEach((series) => {
      const value = formatValue(series.values[index] ?? null);
      if (value !== undefined) {
        row[series.name] = value;
      }
    });
    return row;
  });

  const isComboChart = chart.chartType === "comboChart";
  const getSeriesColor = (series: YearlySeries, idx: number): string => {
    if (series.color && series.color.startsWith("#")) {
      return series.color;
    }
    return defaultColors[idx % defaultColors.length];
  };

  const chartSeriesMode = (seriesIndex: number): "bar" | "line" => {
    const fallback = chart.chartType === "lineChart" ? "line" : "bar";
    const renderAs = chart.series[seriesIndex].renderAs;
    if (renderAs === "bar" || renderAs === "line") {
      return renderAs;
    }
    return fallback;
  };

  const barSeries = chart.series.filter((_, idx) => chartSeriesMode(idx) === "bar");
  const lineSeries = chart.series.filter((_, idx) => chartSeriesMode(idx) === "line");

  const primaryDomain = computeDomain(chart.series, yAxisDomain, isComboChart ? undefined : chart.valueRange);
  const barDomain = isComboChart ? computeDomain(barSeries, yAxisDomain) : primaryDomain;
  const lineDomain = isComboChart ? computeDomain(lineSeries, secondaryYAxisDomain) : undefined;
  const shouldStackBars = stackBars ?? true;
  const axisAngle = xAxisAngle ?? 0;
  const axisTextAnchorValue =
    xAxisTextAnchor ?? (axisAngle > 0 ? "start" : axisAngle < 0 ? "end" : ("middle" as const));
  const resolveXAxisHeight = (base: number): number => {
    if (typeof xAxisHeight === "number") {
      return xAxisHeight;
    }
    return axisAngle === 0 ? base : base + 40;
  };

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={data}
        barCategoryGap={shouldStackBars ? "30%" : "25%"}
        barGap={shouldStackBars ? 0 : 10}
        margin={{ top: 20, right: 8, left: 0, bottom: 20 }}
      >
        <CartesianGrid {...chartGridStyle} />
        <XAxis
          dataKey="category"
          type="category"
          allowDuplicatedCategory={false}
          tick={{ fill: "#AABAD4", fontSize: 11 }}
          height={resolveXAxisHeight(40)}
          angle={axisAngle}
          textAnchor={axisTextAnchorValue}
        />
        <YAxis
          tick={{ fill: "#AABAD4" }}
          tickFormatter={(value) => (typeof value === "number" ? value.toString() : "")}
          tickCount={yAxisTickCount}
          ticks={yAxisTicks}
          domain={barDomain}
          allowDecimals={false}
        />
        <Tooltip wrapperClassName="yearly-chart-tooltip" />
        <Legend />
        {chart.series.map((series, idx) => {
          const isRenderedAsBar = chartSeriesMode(idx) === "bar";
          if (!isRenderedAsBar) {
            return null;
          }
          const isTopSeries = idx === chart.series.length - 1;
          const radius: [number, number, number, number] = isTopSeries ? [4, 4, 0, 0] : [0, 0, 0, 0];
          return (
            <Bar
              key={series.name}
              dataKey={series.name}
              fill={getSeriesColor(series, idx)}
              stackId={shouldStackBars ? "yearly" : undefined}
              radius={radius}
            />
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
        <CartesianGrid {...chartGridStyle} />
        <XAxis
          dataKey="category"
          type="category"
          allowDuplicatedCategory={false}
          tick={{ fill: "#AABAD4", fontSize: 12 }}
          height={resolveXAxisHeight(20)}
          angle={axisAngle}
          textAnchor={axisTextAnchorValue}
        />
        <YAxis
          tick={{ fill: "#AABAD4" }}
          allowDecimals={false}
          tickCount={yAxisTickCount}
          ticks={yAxisTicks}
          domain={primaryDomain}
        />
        <Tooltip wrapperClassName="yearly-chart-tooltip" />
        <Legend />
        {chart.series.map((series, idx) => (
          <Line
            key={series.name}
            type="monotone"
            dataKey={series.name}
            stroke={getSeriesColor(series, idx)}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );

  const renderComboChart = () => {
    const lineFormatter =
      lineDomain && lineDomain[1] <= 2 ? (value: number) => `${((value ?? 0) * 100).toFixed(0)}%` : undefined;

    return (
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid {...chartGridStyle} />
          <XAxis
            dataKey="category"
            type="category"
            allowDuplicatedCategory={false}
            tick={{ fill: "#AABAD4", fontSize: 12 }}
            height={resolveXAxisHeight(40)}
            angle={axisAngle}
            textAnchor={axisTextAnchorValue}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: "#AABAD4" }}
            allowDecimals={false}
            tickCount={yAxisTickCount}
            ticks={yAxisTicks}
            domain={barDomain}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: "#AABAD4" }}
            allowDecimals
            tickFormatter={lineFormatter}
            tickCount={secondaryYAxisTickCount ?? yAxisTickCount}
            ticks={secondaryYAxisTicks}
            domain={lineDomain}
          />
          <Tooltip wrapperClassName="yearly-chart-tooltip" />
          <Legend />
          {chart.series.map((series, idx) => {
            const mode = chartSeriesMode(idx);
            if (mode === "line") {
              return (
                <Line
                  key={`${series.name}-line`}
                  type="monotone"
                  dataKey={series.name}
                  stroke={getSeriesColor(series, idx)}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls={false}
                  yAxisId="right"
                />
              );
            }
            return (
              <Bar
                key={`${series.name}-bar`}
                dataKey={series.name}
                fill={getSeriesColor(series, idx)}
                barSize={22}
                yAxisId="left"
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="dashboard-card yearly-chart-card">
      <div className="yearly-chart-header">
        <div>
          <h3>{chart.title ?? "年报图表"}</h3>
        </div>
      </div>
      <div className="yearly-chart-body">
        {chart.chartType === "barChart"
          ? renderBarChart()
          : chart.chartType === "comboChart"
            ? renderComboChart()
            : renderLineChart()}
      </div>
    </div>
  );
};
