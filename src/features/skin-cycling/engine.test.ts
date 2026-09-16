import { describe, it, expect } from "vitest";
import { decideTonight, buildForecast, settleAfterCheckin, computeEffectiveInterval } from "./engine";
import type { EngineInputs, CategoryState, CategoryProductInfo } from "./types";

const TODAY = "2026-03-10";

const retinolProduct: CategoryProductInfo = {
  category: "retinol",
  addedAt: "2026-01-01",
  frequency: "weekly",
  frequencyDays: null,
  productId: "prod-retinol-1",
  productName: "Sérum Rétinol",
};

const exfoliantProduct: CategoryProductInfo = {
  category: "exfoliant",
  addedAt: "2026-01-01",
  frequency: "weekly",
  frequencyDays: null,
  productId: "prod-exfoliant-1",
  productName: "Exfoliant AHA/BHA",
};

function baseInputs(overrides: Partial<EngineInputs> = {}): EngineInputs {
  return {
    today: TODAY,
    states: [],
    products: [retinolProduct, exfoliantProduct],
    cyclePhase: "Folliculaire",
    weather: null,
    recentIrritationDates: [],
    recentStressLevels: [],
    ...overrides,
  };
}

describe("decideTonight", () => {
  it("recommends recovery when no strong active exists in the routine", () => {
    const decision = decideTonight(baseInputs({ products: [] }));
    expect(decision.category).toBe("recovery");
  });

  it("forces recovery the day after any strong active was applied (no back-to-back)", () => {
    const states: CategoryState[] = [
      { category: "retinol", lastAppliedDate: "2026-03-09", currentIntervalDays: 7, toleranceScore: 1.0 },
    ];
    const decision = decideTonight(baseInputs({ states }));
    expect(decision.category).toBe("recovery");
    expect(decision.justificationFr).toMatch(/utilisé hier/);
  });

  it("never recommends both retinol and exfoliant the same night", () => {
    const states: CategoryState[] = [
      { category: "retinol", lastAppliedDate: "2026-03-01", currentIntervalDays: 7, toleranceScore: 1.0 },
      { category: "exfoliant", lastAppliedDate: "2026-03-01", currentIntervalDays: 7, toleranceScore: 1.0 },
    ];
    const decision = decideTonight(baseInputs({ states }));
    expect(["retinol", "exfoliant"]).toContain(decision.category);
    expect(decision.conflictsToExclude).toContain(
      decision.category === "retinol" ? "exfoliant" : "retinol",
    );
  });

  it("forces recovery when two or more cumulative stress signals are present", () => {
    const decision = decideTonight(
      baseInputs({
        recentIrritationDates: [TODAY],
        recentStressLevels: [{ date: TODAY, level: 5 }],
      }),
    );
    expect(decision.category).toBe("recovery");
    expect(decision.justificationFr).toMatch(/stress cutané/);
  });

  it("picks the most overdue category when both are eligible", () => {
    const states: CategoryState[] = [
      { category: "retinol", lastAppliedDate: "2026-02-01", currentIntervalDays: 7, toleranceScore: 1.0 },
      { category: "exfoliant", lastAppliedDate: "2026-03-05", currentIntervalDays: 7, toleranceScore: 1.0 },
    ];
    const decision = decideTonight(baseInputs({ states }));
    expect(decision.category).toBe("retinol");
  });

  it("names the specific product driving the decision (structured, not inline in the sentence)", () => {
    const decision = decideTonight(baseInputs());
    expect(decision.productName).not.toBeNull();
    expect(decision.productId).not.toBeNull();
  });

  it("returns no product name for a recovery decision", () => {
    const states: CategoryState[] = [
      { category: "retinol", lastAppliedDate: "2026-03-09", currentIntervalDays: 7, toleranceScore: 1.0 },
    ];
    const decision = decideTonight(baseInputs({ states }));
    expect(decision.category).toBe("recovery");
    expect(decision.productName).toBeNull();
    expect(decision.productId).toBeNull();
  });
});

describe("computeEffectiveInterval — no declared frequency (products are now added without one)", () => {
  const noFreqRetinol: CategoryProductInfo = { ...retinolProduct, frequency: null, frequencyDays: null };
  const noFreqExfoliant: CategoryProductInfo = { ...exfoliantProduct, frequency: null, frequencyDays: null };

  it("defaults an un-declared retinol to a ~3-day target cadence", () => {
    const detail = computeEffectiveInterval("retinol", undefined, [noFreqRetinol], "Folliculaire", null, TODAY);
    expect(detail.effectiveDays).toBe(3);
  });

  it("defaults an un-declared exfoliant to a ~7-day target cadence (not the same as retinol)", () => {
    const detail = computeEffectiveInterval("exfoliant", undefined, [noFreqExfoliant], "Folliculaire", null, TODAY);
    expect(detail.effectiveDays).toBe(7);
  });

  it("still respects an explicit frequency_days override when one is set", () => {
    const customRetinol: CategoryProductInfo = { ...retinolProduct, frequency: null, frequencyDays: 5 };
    const detail = computeEffectiveInterval("retinol", undefined, [customRetinol], "Folliculaire", null, TODAY);
    expect(detail.effectiveDays).toBe(5);
  });
});

describe("computeEffectiveInterval", () => {
  it("widens spacing during ramp-up (first 21 days)", () => {
    const rampingProduct: CategoryProductInfo = { ...retinolProduct, addedAt: "2026-03-05" };
    const detail = computeEffectiveInterval("retinol", undefined, [rampingProduct], "Folliculaire", null, TODAY);
    expect(detail.rampActive).toBe(true);
    expect(detail.effectiveDays).toBeGreaterThan(7);
  });

  it("widens spacing during luteal/menstrual cycle phase", () => {
    const follicular = computeEffectiveInterval("retinol", undefined, [retinolProduct], "Folliculaire", null, TODAY);
    const luteal = computeEffectiveInterval("retinol", undefined, [retinolProduct], "Lutéale", null, TODAY);
    expect(luteal.effectiveDays).toBeGreaterThan(follicular.effectiveDays);
  });

  it("widens exfoliant spacing under dry or high-UV weather", () => {
    const neutral = computeEffectiveInterval("exfoliant", undefined, [exfoliantProduct], "Folliculaire", null, TODAY);
    const dry = computeEffectiveInterval("exfoliant", undefined, [exfoliantProduct], "Folliculaire", { humidity: 20, uvIndex: 2 }, TODAY);
    expect(dry.effectiveDays).toBeGreaterThan(neutral.effectiveDays);
  });

  it("never goes below the hard minimum spacing for the category", () => {
    const highTolerance: CategoryState = { category: "retinol", lastAppliedDate: null, currentIntervalDays: 1, toleranceScore: 1.0 };
    const dailyProduct: CategoryProductInfo = { ...retinolProduct, frequency: "daily" };
    const detail = computeEffectiveInterval("retinol", highTolerance, [dailyProduct], "Folliculaire", null, TODAY);
    expect(detail.effectiveDays).toBeGreaterThanOrEqual(2);
  });

  it("never spaces an exfoliant less than its hard minimum (3j), even if declared \"daily\"", () => {
    const dailyExfoliant: CategoryProductInfo = { ...exfoliantProduct, frequency: "daily" };
    const detail = computeEffectiveInterval("exfoliant", undefined, [dailyExfoliant], "Folliculaire", null, TODAY);
    expect(detail.effectiveDays).toBeGreaterThanOrEqual(3);
  });

  it("decideTonight never recommends an exfoliant declared \"daily\" two nights in a row", () => {
    const dailyExfoliant: CategoryProductInfo = { ...exfoliantProduct, frequency: "daily" };
    // Applied yesterday — the back-to-back rule alone would already block it, but this also
    // exercises the case where overdueRatio is checked directly (state cleared, only 1 day
    // simulated below via a fresh decideTonight call for "today").
    const states: CategoryState[] = [
      { category: "exfoliant", lastAppliedDate: TODAY, currentIntervalDays: 3, toleranceScore: 1.0 },
    ];
    const tomorrow = "2026-03-11";
    const decision = decideTonight(
      baseInputs({ products: [dailyExfoliant], states, today: tomorrow }),
    );
    expect(decision.category).not.toBe("exfoliant");
  });
});

describe("settleAfterCheckin", () => {
  it("advances last applied date and nudges tolerance up when no irritation is reported", () => {
    const states: CategoryState[] = [
      { category: "retinol", lastAppliedDate: "2026-03-01", currentIntervalDays: 7, toleranceScore: 0.8 },
    ];
    const results = settleAfterCheckin({ appliedCategory: "retinol", irritationReportedToday: false, states, today: TODAY });
    const retinolResult = results.find((r) => r.category === "retinol")!;
    expect(retinolResult.lastAppliedDate).toBe(TODAY);
    expect(retinolResult.toleranceScore).toBeGreaterThan(0.8);
  });

  it("penalizes tolerance and widens interval for categories applied recently when irritation is reported", () => {
    const states: CategoryState[] = [
      { category: "retinol", lastAppliedDate: TODAY, currentIntervalDays: 7, toleranceScore: 0.8 },
    ];
    const results = settleAfterCheckin({ appliedCategory: "retinol", irritationReportedToday: true, states, today: TODAY });
    const retinolResult = results.find((r) => r.category === "retinol")!;
    expect(retinolResult.toleranceScore).toBeLessThan(0.8);
    expect(retinolResult.currentIntervalDays).toBeGreaterThan(7);
  });
});

describe("buildForecast", () => {
  it("produces a deterministic forecast of the requested length for fixed inputs", () => {
    const forecastA = buildForecast(baseInputs(), 3);
    const forecastB = buildForecast(baseInputs(), 3);
    expect(forecastA).toHaveLength(3);
    expect(forecastA).toEqual(forecastB);
  });

  it("never schedules both categories on the same forecast night", () => {
    const forecast = buildForecast(baseInputs(), 5);
    for (const day of forecast) {
      expect(["retinol", "exfoliant", "recovery"]).toContain(day.category);
    }
  });
});
