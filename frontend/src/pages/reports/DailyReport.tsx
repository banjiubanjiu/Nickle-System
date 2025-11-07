import type { FC } from "react";

import { MetricCard } from "../../components/MetricCard";
import "../../styles/pages/reports-base.css";
import "../../styles/pages/reports-morning.css";
import type { BriefReportContent, ReportHighlight } from "../../types/reports";

type DailyReportProps = {
  content: BriefReportContent;
};

const impactClassMap: Record<ReportHighlight["impact"], string> = {
  up: "report-impact-up",
  down: "report-impact-down",
  neutral: "report-impact-neutral",
};

export const DailyReport: FC<DailyReportProps> = ({ content }) => {
  const chartImages = content.charts?.slice(0, 2) ?? [];

  return (
    <div className="report-page">
      <section className="dashboard-card report-hero">
        <div className="report-hero-row">
          <h2>{content.heroTitle}</h2>
          <span className="report-hero-updated">更新：{content.updatedAt}</span>
        </div>
        <div className="report-hero-row">
          <p>{content.heroSubtitle}</p>
          <button type="button" className="report-export-button">
            导出日评
          </button>
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

      <div className="morning-report-layout">
        <div className="morning-report-left">
          <section className="dashboard-card report-section morning-focus">
            <div className="flex-between">
              <h2>结构亮点</h2>
              <span className="muted">升贴水 · 成本 · 情绪</span>
            </div>
            <ul className="report-highlights compact">
              {content.highlights.map((item) => (
                <li key={item.title} className="report-highlight compact">
                  <div className="report-highlight-header">
                    <span className={`report-highlight-tag ${impactClassMap[item.impact]}`}>{item.tag}</span>
                    <h3>{item.title}</h3>
                  </div>
                  <p>{item.summary}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="dashboard-card report-section morning-articles">
            <div className="flex-between">
              <h2>海外市场资讯</h2>
              <span className="muted">Mining.com · EXIM 等</span>
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
                </article>
              ))}
            </div>
          </section>
        </div>

        {content.narrative ? (
          <section className="dashboard-card morning-report-brief">
            <div className="flex-between">
              <h2>镍报日评</h2>
              <span className="muted">结构 · 成本 · 情绪</span>
            </div>
            <div className="morning-report-body">
              {content.narrative.map((section) => (
                <article key={section.title} className="morning-report-section">
                  <h3>{section.title}</h3>
                  {section.paragraphs.map((paragraph, index) => (
                    <p key={`${section.title}-${index}`}>{paragraph}</p>
                  ))}
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {(chartImages.length > 0 || content.chartAnalysis) && (
        <section className="dashboard-card morning-chart-card">
          <div className="flex-between morning-chart-header">
            <h2>图表技术分析</h2>
            <span className="muted">价格走势 & 期现结构</span>
          </div>
          {chartImages.length > 0 && (
            <div className="morning-chart">
              {chartImages.map((chart) => (
                <div key={chart.src} className="morning-chart-image">
                  <img src={chart.src} alt={chart.alt} />
                  {chart.caption ? <p className="chart-caption">{chart.caption}</p> : null}
                </div>
              ))}
            </div>
          )}
          {content.chartAnalysis ? (
            <div className="morning-chart-analysis">
              {content.chartAnalysis.map((section) => (
                <article key={section.title}>
                  <h3>{section.title}</h3>
                  {section.paragraphs.map((paragraph, index) => (
                    <p key={`${section.title}-${index}`}>{paragraph}</p>
                  ))}
                </article>
              ))}
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
};
