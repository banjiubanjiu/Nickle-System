import type { FC } from "react";

import { MetricCard } from "../../components/MetricCard";
import "../../styles/pages/reports-base.css";
import "../../styles/pages/reports-monthly.css";
import type { MonthlyReportContent } from "../../types/reports";

type MonthlyReportProps = {
  content: MonthlyReportContent;
};

export const MonthlyReport: FC<MonthlyReportProps> = ({ content }) => {
  return (
    <div className="report-page monthly-report">
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

      <div className="monthly-grid">
        <section className="dashboard-card monthly-section">
          <div className="monthly-header">
            <h2>核心观点</h2>
            <span className="muted">价格 · 供给 · 宏观</span>
          </div>
          <div className="monthly-highlights">
            {content.highlights.map((item) => (
              <article key={item.title} className="monthly-highlight-card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="dashboard-card monthly-section">
          <div className="monthly-header">
            <h2>成本结构</h2>
            <span className="muted">估算比例</span>
          </div>
          <div className="monthly-cost-list">
            {content.costBreakdown.map((item) => (
              <div key={item.item} className="monthly-cost-row">
                <div className="monthly-cost-item">
                  <span>{item.item}</span>
                  <small>{item.ratio}</small>
                </div>
                <span className="monthly-cost-value">{item.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="dashboard-card monthly-section scenarios">
        <div className="monthly-header">
          <h2>情景分析</h2>
          <span className="muted">基准 / 利多 / 利空</span>
        </div>
        <div className="monthly-scenarios">
          {content.scenarios.map((scenario) => (
            <article key={scenario.scenario} className="monthly-scenario-card">
              <h3>{scenario.scenario}</h3>
              <p>{scenario.outlook}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
