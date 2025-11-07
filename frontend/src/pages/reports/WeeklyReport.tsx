import type { FC } from "react";

import { MetricCard } from "../../components/MetricCard";
import "../../styles/pages/reports-base.css";
import "../../styles/pages/reports-weekly.css";
import type { WeeklyReportContent } from "../../types/reports";

type WeeklyReportProps = {
  content: WeeklyReportContent;
};

export const WeeklyReport: FC<WeeklyReportProps> = ({ content }) => {
  return (
    <div className="report-page weekly-report">
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

      <div className="weekly-layout">
        <section className="dashboard-card weekly-section supply-demand">
          <div className="weekly-header">
            <h2>供需速览</h2>
            <span className="muted">库存 · 排产 · 供给</span>
          </div>
          <div className="weekly-supply-grid">
            {content.supplyDemand.map((item) => (
              <article key={item.title} className="weekly-supply-card">
                {item.badge ? <span className="weekly-supply-badge">{item.badge}</span> : null}
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="dashboard-card weekly-section inventory">
          <div className="weekly-header">
            <h2>库存对比</h2>
            <span className="muted">周度变化（单位：吨）</span>
          </div>
          <div className="weekly-inventory-table">
            {content.inventoryTrend.map((item) => (
              <div key={item.name} className="weekly-inventory-row">
                <span className="weekly-inventory-name">{item.name}</span>
                <span className="weekly-inventory-value">{item.value}</span>
                <span className="weekly-inventory-change">{item.change}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="dashboard-card weekly-section strategy">
        <div className="weekly-header">
          <h2>策略速记</h2>
          <span className="muted">交易建议与风险提示</span>
        </div>
        <ul className="weekly-strategy-list">
          {content.strategyNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>
    </div>
  );
};
