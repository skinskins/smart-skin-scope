import type {
  ActiveCategory,
  CategoryProductInfo,
  CategoryState,
  CyclePhase,
  EngineInputs,
  ForecastDay,
  NightDecision,
  SettleInputs,
  SettleResult,
  WeatherSnapshot,
} from "./types";

export const CATEGORY_MIN_SPACING_DAYS: Record<ActiveCategory, number> = {
  retinol: 2,
  exfoliant: 3,
};

const REACTIVE_PHASES: CyclePhase[] = ["Lutéale", "Menstruelle"];
const RAMP_UP_WINDOW_DAYS = 21;
const RAMP_UP_FACTOR = 2.0;
const CYCLE_FACTOR = 1.3;
const EXFOLIANT_WEATHER_FACTOR = 1.4;
const RETINOL_DRY_FACTOR = 1.2;
const DRY_HUMIDITY_THRESHOLD = 30;
const HIGH_UV_THRESHOLD = 6;
const MAX_INTERVAL_DAYS = 21;

function parseLocalDate(dateISO: string): Date {
  return new Date(dateISO + "T00:00:00");
}

function daysBetween(laterISO: string, earlierISO: string): number {
  const ms = parseLocalDate(laterISO).getTime() - parseLocalDate(earlierISO).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function addDays(dateISO: string, days: number): string {
  const d = parseLocalDate(dateISO);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function declaredIntervalDays(products: CategoryProductInfo[]): number {
  const intervals = products.map((p) => {
    if (p.frequencyDays) return p.frequencyDays;
    switch (p.frequency) {
      case "daily":
        return 1;
      case "weekly":
        return 7;
      case "monthly":
        return 30;
      default:
        return 3;
    }
  });
  return intervals.length > 0 ? Math.min(...intervals) : 3;
}

function isRampingUp(products: CategoryProductInfo[], today: string): boolean {
  const addedDates = products.map((p) => p.addedAt).filter((d): d is string => !!d);
  if (addedDates.length === 0) return false;
  const earliest = addedDates.reduce((a, b) => (a < b ? a : b));
  return daysBetween(today, earliest) < RAMP_UP_WINDOW_DAYS;
}

function weatherFactorFor(category: ActiveCategory, weather: WeatherSnapshot | null): number {
  if (!weather) return 1.0;
  const dry = weather.humidity !== null && weather.humidity < DRY_HUMIDITY_THRESHOLD;
  const highUv = weather.uvIndex !== null && weather.uvIndex >= HIGH_UV_THRESHOLD;
  if (category === "exfoliant" && (dry || highUv)) return EXFOLIANT_WEATHER_FACTOR;
  if (category === "retinol" && dry) return RETINOL_DRY_FACTOR;
  return 1.0;
}

interface EffectiveIntervalDetail {
  effectiveDays: number;
  rampActive: boolean;
  toleranceLow: boolean;
  cycleActive: boolean;
  weatherActive: boolean;
}

export function computeEffectiveInterval(
  category: ActiveCategory,
  state: CategoryState | undefined,
  products: CategoryProductInfo[],
  cyclePhase: CyclePhase | null,
  weather: WeatherSnapshot | null,
  today: string,
): EffectiveIntervalDetail {
  const categoryProducts = products.filter((p) => p.category === category);
  const base = declaredIntervalDays(categoryProducts);

  const rampActive = isRampingUp(categoryProducts, today);
  const rampFactor = rampActive ? RAMP_UP_FACTOR : 1.0;

  const toleranceScore = state?.toleranceScore ?? 1.0;
  const toleranceLow = toleranceScore < 0.7;
  const toleranceFactor = 2 - toleranceScore;

  const cycleActive = cyclePhase !== null && REACTIVE_PHASES.includes(cyclePhase);
  const cycleFactor = cycleActive ? CYCLE_FACTOR : 1.0;

  const weatherFactor = weatherFactorFor(category, weather);
  const weatherActive = weatherFactor > 1.0;

  const computed = Math.round(base * rampFactor * toleranceFactor * cycleFactor * weatherFactor);
  const floored = Math.max(CATEGORY_MIN_SPACING_DAYS[category], computed);
  const persistedFloor = state?.currentIntervalDays ?? CATEGORY_MIN_SPACING_DAYS[category];
  const effectiveDays = Math.min(MAX_INTERVAL_DAYS, Math.max(floored, persistedFloor));

  return { effectiveDays, rampActive, toleranceLow, cycleActive, weatherActive };
}

function describeModifiers(detail: EffectiveIntervalDetail): string {
  const clauses: string[] = [];
  if (detail.rampActive) clauses.push("nouvel actif, on introduit en douceur");
  if (detail.toleranceLow) clauses.push("tolérance encore fragile");
  if (detail.cycleActive) clauses.push("peau plus réactive en ce moment du cycle");
  if (detail.weatherActive) clauses.push("météo peu favorable");
  return clauses.length > 0 ? ` (${clauses.join(", ")})` : "";
}

const CATEGORY_LABEL_FR: Record<ActiveCategory, string> = {
  retinol: "Rétinol",
  exfoliant: "Exfoliant",
};

function recentIrritationOrStressCount(inputs: EngineInputs): number {
  const since = addDays(inputs.today, -3);
  let count = 0;
  if (inputs.recentIrritationDates.some((d) => d >= since && d <= inputs.today)) count += 1;
  if (inputs.recentStressLevels.some((s) => s.date >= since && s.date <= inputs.today && s.level >= 4)) count += 1;
  if (inputs.cyclePhase === "Menstruelle") count += 1;
  return count;
}

function usedYesterday(states: CategoryState[], today: string): boolean {
  const yesterday = addDays(today, -1);
  return states.some((s) => s.lastAppliedDate === yesterday);
}

export function decideTonight(inputs: EngineInputs): NightDecision {
  const presentCategories = Array.from(new Set(inputs.products.map((p) => p.category)));

  if (presentCategories.length === 0) {
    return {
      category: "recovery",
      justificationFr: "Pas d'actif fort dans ta routine du soir — routine douce ce soir.",
      conflictsToExclude: ["retinol", "exfoliant"],
    };
  }

  if (usedYesterday(inputs.states, inputs.today)) {
    return {
      category: "recovery",
      justificationFr: "Ce soir : récupération — actif fort utilisé hier, on laisse la peau respirer.",
      conflictsToExclude: ["retinol", "exfoliant"],
    };
  }

  if (recentIrritationOrStressCount(inputs) >= 2) {
    return {
      category: "recovery",
      justificationFr: "Ce soir : récupération — plusieurs signaux de stress cutané cette semaine, mieux vaut souffler.",
      conflictsToExclude: ["retinol", "exfoliant"],
    };
  }

  const stateByCategory = new Map(inputs.states.map((s) => [s.category, s]));

  const candidates = presentCategories.map((category) => {
    const state = stateByCategory.get(category);
    const detail = computeEffectiveInterval(category, state, inputs.products, inputs.cyclePhase, inputs.weather, inputs.today);
    const daysSince = state?.lastAppliedDate ? daysBetween(inputs.today, state.lastAppliedDate) : Infinity;
    const overdueRatio = daysSince / detail.effectiveDays;
    return { category, detail, daysSince, overdueRatio };
  });

  const eligible = candidates.filter((c) => c.overdueRatio >= 1);

  if (eligible.length === 0) {
    return {
      category: "recovery",
      justificationFr: "Aucun actif fort dû ce soir — routine douce.",
      conflictsToExclude: presentCategories,
    };
  }

  eligible.sort((a, b) => {
    if (b.overdueRatio !== a.overdueRatio) return b.overdueRatio - a.overdueRatio;
    return a.category === "retinol" ? -1 : 1;
  });

  const winner = eligible[0];
  const daysSinceLabel = Number.isFinite(winner.daysSince)
    ? `dernière application il y a ${winner.daysSince} j`
    : "jamais appliqué jusqu'ici";

  return {
    category: winner.category,
    justificationFr: `${CATEGORY_LABEL_FR[winner.category]} ce soir — ${daysSinceLabel}${describeModifiers(winner.detail)}.`,
    conflictsToExclude: presentCategories.filter((c) => c !== winner.category),
  };
}

export function buildForecast(inputs: EngineInputs, days = 3): ForecastDay[] {
  let states = inputs.states.map((s) => ({ ...s }));
  const forecast: ForecastDay[] = [];

  for (let i = 1; i <= days; i++) {
    const date = addDays(inputs.today, i);
    const decision = decideTonight({ ...inputs, today: date, states });
    forecast.push({ date, category: decision.category, justificationFr: decision.justificationFr });

    if (decision.category !== "recovery") {
      states = states.map((s) =>
        s.category === decision.category
          ? { ...s, lastAppliedDate: date, toleranceScore: Math.min(1, s.toleranceScore + 0.05) }
          : s,
      );
      if (!states.some((s) => s.category === decision.category)) {
        states = [
          ...states,
          { category: decision.category, lastAppliedDate: date, currentIntervalDays: CATEGORY_MIN_SPACING_DAYS[decision.category], toleranceScore: 1.0 },
        ];
      }
    }
  }

  return forecast;
}

export function settleAfterCheckin(inputs: SettleInputs): SettleResult[] {
  const { appliedCategory, irritationReportedToday, states, today } = inputs;
  const stateByCategory = new Map(states.map((s) => [s.category, s]));
  const results: SettleResult[] = [];
  const yesterday = addDays(today, -1);

  if (appliedCategory) {
    const state = stateByCategory.get(appliedCategory);
    const currentIntervalDays = state?.currentIntervalDays ?? CATEGORY_MIN_SPACING_DAYS[appliedCategory];
    const toleranceScore = state?.toleranceScore ?? 1.0;
    results.push({
      category: appliedCategory,
      lastAppliedDate: today,
      toleranceScore: irritationReportedToday ? toleranceScore : Math.min(1, toleranceScore + 0.05),
      currentIntervalDays: irritationReportedToday
        ? currentIntervalDays
        : Math.max(CATEGORY_MIN_SPACING_DAYS[appliedCategory], currentIntervalDays - 1),
    });
  }

  if (irritationReportedToday) {
    for (const state of states) {
      if (state.lastAppliedDate === today || state.lastAppliedDate === yesterday) {
        const already = results.find((r) => r.category === state.category);
        const penalizedTolerance = Math.max(0, state.toleranceScore - 0.25);
        const penalizedInterval = Math.min(MAX_INTERVAL_DAYS, Math.round(state.currentIntervalDays * 1.5));
        if (already) {
          already.toleranceScore = penalizedTolerance;
          already.currentIntervalDays = penalizedInterval;
        } else {
          results.push({
            category: state.category,
            toleranceScore: penalizedTolerance,
            currentIntervalDays: penalizedInterval,
          });
        }
      }
    }
  }

  return results;
}
