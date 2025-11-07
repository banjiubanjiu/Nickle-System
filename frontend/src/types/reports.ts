export type MetricView = {
  label: string;
  value: string;
  unit?: string;
  trend?: string;
  trendDirection?: "up" | "down";
};

export type ReportHighlightImpact = "up" | "down" | "neutral";

export type ReportHighlight = {
  title: string;
  summary: string;
  tag: string;
  impact: ReportHighlightImpact;
};

export type ReportArticle = {
  title: string;
  source: string;
  publishedAt: string;
  excerpt: string;
};

export type BriefNarrativeSection = {
  title: string;
  paragraphs: string[];
};

export type BriefReportContent = {
  heroTitle: string;
  heroSubtitle: string;
  updatedAt: string;
  summaryMetrics: MetricView[];
  highlights: ReportHighlight[];
  articles: ReportArticle[];
  narrative?: BriefNarrativeSection[];
  chartAnalysis?: Array<{
    title: string;
    paragraphs: string[];
  }>;
};

export type WeeklySection = {
  title: string;
  detail: string;
  badge?: string;
};

export type WeeklyInventoryDatum = {
  name: string;
  value: string;
  change: string;
};

export type WeeklyReportContent = {
  heroTitle: string;
  heroSubtitle: string;
  updatedAt: string;
  summaryMetrics: MetricView[];
  supplyDemand: WeeklySection[];
  inventoryTrend: WeeklyInventoryDatum[];
  strategyNotes: string[];
};

export type MonthlyHighlight = {
  title: string;
  description: string;
};

export type MonthlyCostBreakdown = {
  item: string;
  value: string;
  ratio: string;
};

export type MonthlyScenario = {
  scenario: string;
  outlook: string;
};

export type MonthlyReportContent = {
  heroTitle: string;
  heroSubtitle: string;
  updatedAt: string;
  summaryMetrics: MetricView[];
  highlights: MonthlyHighlight[];
  costBreakdown: MonthlyCostBreakdown[];
  scenarios: MonthlyScenario[];
};

export type YearlyHypothesis = {
  title: string;
  detail: string;
};

export type YearlyRisk = {
  title: string;
  impact: string;
};

export type YearlyStrategyStage = {
  phase: string;
  approach: string;
};

export type YearlyReportContent = {
  heroTitle: string;
  heroSubtitle: string;
  updatedAt: string;
  summaryMetrics: MetricView[];
  coreHypotheses: YearlyHypothesis[];
  riskFactors: YearlyRisk[];
  strategyFramework: YearlyStrategyStage[];
};
