export type ActiveCategory = "retinol" | "exfoliant";

export type CyclePhase = "Menstruelle" | "Folliculaire" | "Ovulatoire" | "Lutéale";

export interface CategoryState {
  category: ActiveCategory;
  lastAppliedDate: string | null;
  currentIntervalDays: number;
  toleranceScore: number;
}

export interface CategoryProductInfo {
  category: ActiveCategory;
  addedAt: string | null;
  frequency: string | null;
  frequencyDays: number | null;
}

export interface WeatherSnapshot {
  humidity: number | null;
  uvIndex: number | null;
}

export interface StressSignal {
  date: string;
  level: number;
}

export interface EngineInputs {
  today: string;
  states: CategoryState[];
  products: CategoryProductInfo[];
  cyclePhase: CyclePhase | null;
  weather: WeatherSnapshot | null;
  recentIrritationDates: string[];
  recentStressLevels: StressSignal[];
}

export interface NightDecision {
  category: ActiveCategory | "recovery";
  justificationFr: string;
  conflictsToExclude: ActiveCategory[];
}

export interface ForecastDay {
  date: string;
  category: ActiveCategory | "recovery";
  justificationFr: string;
}

export interface SettleInputs {
  appliedCategory: ActiveCategory | null;
  irritationReportedToday: boolean;
  states: CategoryState[];
  today: string;
}

export interface SettleResult {
  category: ActiveCategory;
  lastAppliedDate?: string;
  toleranceScore?: number;
  currentIntervalDays?: number;
}
