export type YearlySeriesPoint = number | string | null;

export type YearlySeries = {
  name: string;
  values: YearlySeriesPoint[];
  range?: string | null;
  color?: string | null;
  renderAs?: "bar" | "line";
};

export type YearlyValueRange = {
  dataMin: number;
  dataMax: number;
  suggestedMin?: number;
  suggestedMax?: number;
};

export type YearlyChart = {
  chartPath: string;
  chartType: string;
  title?: string | null;
  workbook?: string | null;
  categoryLabels?: YearlySeriesPoint[];
  categoryRange?: string | null;
  series: YearlySeries[];
  notes?: string[];
  hasDateAxis?: boolean;
  valueRange?: YearlyValueRange;
};

export type YearlySlide = {
  slide: number;
  title: string | null;
  charts: YearlyChart[];
};

const YEARLY_BASE_PATH = "/yearly";

const formatSlideId = (id: string | number): string => {
  const numeric = typeof id === "string" ? parseInt(id, 10) : id;
  if (Number.isNaN(numeric)) {
    throw new Error("Invalid slide id");
  }
  return numeric.toString().padStart(2, "0");
};

export async function fetchYearlySlide(slideId: string | number): Promise<YearlySlide> {
  const formattedId = formatSlideId(slideId);
  const response = await fetch(`${YEARLY_BASE_PATH}/slide-${formattedId}.json`);
  if (!response.ok) {
    throw new Error(`Failed to load yearly slide ${formattedId}`);
  }
  return (await response.json()) as YearlySlide;
}
