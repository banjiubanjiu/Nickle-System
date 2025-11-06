import type { FC } from "react";

import { MetricCard } from "../../components/MetricCard";
import type { YearlyReportContent } from "../../types/reports";

type YearlyReportProps = {
  content: YearlyReportContent;
};

export const YearlyReport: FC<YearlyReportProps> = ({ content }) => {
  return (
    <div className="report-page yearly-report">
      <section className="dashboard-card report-hero">
        <div>
          <h2>{content.heroTitle}</h2>
          <p>{content.heroSubtitle}</p>
        </div>
        <div className="report-hero-meta">
          <span>更新：{content.updatedAt}</span>
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
