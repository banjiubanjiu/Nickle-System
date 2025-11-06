import type { FC } from "react";

import { MetricCard } from "../../components/MetricCard";
import type { BriefReportContent, ReportHighlight } from "../../types/reports";

type MorningDailyReportProps = {
  content: BriefReportContent;
};

const impactClassMap: Record<ReportHighlight["impact"], string> = {
  up: "report-impact-up",
  down: "report-impact-down",
  neutral: "report-impact-neutral",
};

export const MorningDailyReport: FC<MorningDailyReportProps> = ({ content }) => {
  return (
    <div className="report-page">
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

      <div className="report-grid">
        <section className="dashboard-card report-section">
          <div className="flex-between">
            <h2>焦点速览</h2>
            <span className="muted">重点事件 · 风险提示</span>
          </div>
          <ul className="report-highlights">
            {content.highlights.map((item) => (
              <li key={item.title} className="report-highlight">
                <div className="report-highlight-header">
                  <span className={`report-highlight-tag ${impactClassMap[item.impact]}`}>{item.tag}</span>
                  <h3>{item.title}</h3>
                </div>
                <p>{item.summary}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="dashboard-card report-section">
          <div className="flex-between">
            <h2>精选研报</h2>
            <span className="muted">覆盖主流机构观点</span>
          </div>
          <div className="report-articles">
            {content.articles.map((article) => (
              <article key={article.title} className="report-article">
                <header>
                  <h3>{article.title}</h3>
                  <div className="report-article-meta">
                    <span>{article.source}</span>
                    <span>{article.publishedAt}</span>
                  </div>
                </header>
                <p>{article.excerpt}</p>
                <button type="button" className="report-article-link">
                  查看详情
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
