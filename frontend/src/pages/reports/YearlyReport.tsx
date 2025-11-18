import { useEffect, useState, type FC } from "react";

import { MetricCard } from "../../components/MetricCard";
import { YearlyChart } from "../../components/YearlyChart";
import "../../styles/pages/reports-base.css";
import "../../styles/pages/reports-yearly.css";
import type { YearlySlide } from "../../services/yearly";
import { fetchYearlySlide } from "../../services/yearly";
import type { YearlyReportContent } from "../../types/reports";

type YearlyReportProps = {
  content: YearlyReportContent;
};

type ChartConfig = {
  title?: string;
  yAxisDomain?: [number, number];
  yAxisTickCount?: number;
  yAxisTicks?: number[];
  seriesNameOverride?: string;
  secondaryYAxisDomain?: [number, number];
  secondaryYAxisTickCount?: number;
  secondaryYAxisTicks?: number[];
  stackBars?: boolean;
  xAxisAngle?: number;
  xAxisHeight?: number;
  xAxisTextAnchor?: "start" | "middle" | "end";
};

type SlideSectionConfig = {
  id: string;
  heading?: string;
  chartConfigs: ChartConfig[];
  footerNote?: string;
};

const SLIDE_SECTIONS: SlideSectionConfig[] = [
  {
    id: "03",
    heading: "镍矿：RKAB配额过剩，但开采效率受限",
    chartConfigs: [
      {
        title: "印尼镍矿消费量（万吨）",
        yAxisDomain: [0, 2500],
        yAxisTickCount: 6,
        xAxisAngle: -90,
      },
      { title: "印尼从菲律宾进口镍矿（万吨）", yAxisDomain: [0, 250], yAxisTickCount: 6 },
    ],
  },
  {
    id: "04",
    footerNote: "供应：印尼和中国镍产业",
    chartConfigs: [
      {
        title: "印尼火法镍矿升水（美元/吨）",
        xAxisAngle: -90,
        yAxisDomain: [0, 30],
        yAxisTicks: [0, 5, 10, 15, 20, 25, 30],
      },
      {
        title: "印尼湿法镍矿价格（美元/吨）",
        seriesNameOverride: "印尼湿法镍矿价格（美元/吨）",
        yAxisDomain: [20, 27],
        yAxisTickCount: 6,
        yAxisTicks: [20, 21, 22, 23, 24, 25, 26, 27],
        xAxisAngle: -90,
      },
    ],
  },
  {
    id: "06",
    chartConfigs: [
      {
        title: "印尼NPI产能利用率",
        yAxisDomain: [6, 18],
        yAxisTicks: [6, 9, 12, 15, 18],
      },
      {
        title: "印尼NPI产量（万吨）",
        yAxisDomain: [16, 22],
        yAxisTickCount: 7,
        secondaryYAxisDomain: [0.62, 0.82],
        secondaryYAxisTickCount: 6,
      },
    ],
  },
  {
    id: "07",
    chartConfigs: [
      {
        title: "印尼NPI投建产线和在产产线（条）",
        yAxisDomain: [0, 90],
        yAxisTickCount: 7,
        stackBars: false,
      },
      {
        title: "印尼新增NPI产线情况（条）",
        yAxisDomain: [0, 60],
        yAxisTickCount: 6,
      },
    ],
  },
];


type SlideState = {
  data: YearlySlide | null;
  loading: boolean;
  error: string | null;
};

export const YearlyReport: FC<YearlyReportProps> = ({ content }) => {
  const [slidesState, setSlidesState] = useState<Record<string, SlideState>>(() => {
    const initial: Record<string, SlideState> = {};
    SLIDE_SECTIONS.forEach((section) => {
      initial[section.id] = { data: null, loading: true, error: null };
    });
    return initial;
  });

  useEffect(() => {
    let cancelled = false;
    SLIDE_SECTIONS.forEach((section) => {
      fetchYearlySlide(section.id)
        .then((payload) => {
          if (cancelled) {
            return;
          }
          setSlidesState((prev) => ({
            ...prev,
            [section.id]: { data: payload, loading: false, error: null },
          }));
        })
        .catch((err) => {
          if (cancelled) {
            return;
          }
          setSlidesState((prev) => ({
            ...prev,
            [section.id]: {
              ...prev[section.id],
              loading: false,
              error: err instanceof Error ? err.message : "年报图表加载失败",
            },
          }));
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="report-page yearly-report">
      <section className="dashboard-card report-hero">
        <div className="report-hero-row">
          <h2>{content.heroTitle}</h2>
          <span className="report-hero-updated">更新：{content.updatedAt}</span>
        </div>
        <div className="report-hero-row">
          <p>{content.heroSubtitle}</p>
          <span />
        </div>
      </section>

      <section className="grid cols-4 report-summary">
        {content.summaryMetrics.map((metric) => (
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

      {SLIDE_SECTIONS.map((section) => {
        const state = slidesState[section.id];
        const charts = state?.data?.charts ?? [];
        return (
          <section key={section.id} className="yearly-chart-section">
            {section.heading ? (
              <div className="yearly-header">
                <h2>{section.heading}</h2>
              </div>
            ) : null}
            {state?.loading ? <p className="muted">图表加载中...</p> : null}
            {state?.error ? <p className="error-text">{state.error}</p> : null}
            {!state?.loading && !state?.error && charts.length === 0 ? (
              <p className="muted">暂无图表数据</p>
            ) : null}
            {!state?.loading && !state?.error ? (
              <>
                <div className="yearly-chart-grid">
                  {charts.map((chart, index) => {
                    const overrides = section.chartConfigs[index];
                    const chartWithSeriesOverride =
                      overrides?.seriesNameOverride && chart.series.length === 1
                        ? {
                            ...chart,
                            series: chart.series.map((series, seriesIdx) =>
                              seriesIdx === 0 ? { ...series, name: overrides.seriesNameOverride! } : series,
                          ),
                        }
                        : chart;
                    return (
                      <YearlyChart
                        key={`${section.id}-${chart.chartPath}`}
                        chart={{
                          ...chartWithSeriesOverride,
                          title: overrides?.title ?? chartWithSeriesOverride.title,
                        }}
                        yAxisDomain={overrides?.yAxisDomain}
                        yAxisTickCount={overrides?.yAxisTickCount}
                        yAxisTicks={overrides?.yAxisTicks}
                        secondaryYAxisDomain={overrides?.secondaryYAxisDomain}
                        secondaryYAxisTickCount={overrides?.secondaryYAxisTickCount}
                        secondaryYAxisTicks={overrides?.secondaryYAxisTicks}
                        stackBars={overrides?.stackBars}
                        xAxisAngle={overrides?.xAxisAngle}
                        xAxisHeight={overrides?.xAxisHeight}
                        xAxisTextAnchor={overrides?.xAxisTextAnchor}
                      />
                    );
                  })}
                </div>
                {section.footerNote ? (
                  <div className="yearly-header yearly-section-note">
                    <h2>{section.footerNote}</h2>
                    <span />
                  </div>
                ) : null}
              </>
            ) : null}
          </section>
        );
      })}

      <div className="yearly-grid">
        <section className="dashboard-card yearly-section hypotheses">
          <div className="yearly-header">
            <h2>核心假设</h2>
            <span className="muted">需求 · 供给 · 宏观</span>
          </div>
          <ul>
            {content.coreHypotheses.map((item) => (
              <li key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="dashboard-card yearly-section risks">
          <div className="yearly-header">
            <h2>关键风险</h2>
            <span className="muted">需提前预案</span>
          </div>
          <ul>
            {content.riskFactors.map((risk) => (
              <li key={risk.title}>
                <h3>{risk.title}</h3>
                <p>{risk.impact}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="dashboard-card yearly-section strategy">
        <div className="yearly-header">
          <h2>年度操作框架</h2>
          <span className="muted">阶段性仓位与策略</span>
        </div>
        <div className="yearly-strategy-grid">
          {content.strategyFramework.map((stage) => (
            <article key={stage.phase} className="yearly-strategy-card">
              <h3>{stage.phase}</h3>
              <p>{stage.approach}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
