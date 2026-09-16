import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateCyclePhaseForDate } from "@/utils/cycle";
import { decideTonight, buildForecast, settleAfterCheckin } from "./engine";
import { resolveActiveCategory } from "./resolveActiveCategory";
import type {
  ActiveCategory,
  CategoryProductInfo,
  CategoryState,
  CyclePhase,
  ForecastDay,
  NightDecision,
  WeatherSnapshot,
} from "./types";

type EveningProduct = {
  id: string;
  product_name: string;
  product_type: string | null;
  ingredients: string | null;
  added_at: string | null;
  frequency: string | null;
  frequency_days: number | null;
};

type RecommendationData = {
  states: CategoryState[];
  weather: WeatherSnapshot | null;
  cyclePhase: CyclePhase | null;
  recentIrritationDates: string[];
  recentStressLevels: { date: string; level: number }[];
};

const RECENT_DAYS_WINDOW = 3;

const addDaysISO = (dateISO: string, days: number): string => {
  const d = new Date(dateISO + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

async function fetchRecommendationData(userId: string, todayISO: string): Promise<RecommendationData> {
  const sinceDate = addDaysISO(todayISO, -RECENT_DAYS_WINDOW);

  const [stateRes, weatherRes, profileRes, checkinsRes, feedbackRes] = await Promise.all([
    (supabase as any)
      .from("skin_cycling_state")
      .select("category, last_applied_date, current_interval_days, tolerance_score")
      .eq("user_id", userId),
    (supabase as any)
      .from("daily_weather")
      .select("humidity, uv_index")
      .eq("user_id", userId)
      .eq("date", todayISO)
      .maybeSingle(),
    (supabase as any)
      .from("profiles")
      .select("last_period_date, cycle_duration, period_duration")
      .eq("id", userId)
      .maybeSingle(),
    (supabase as any)
      .from("daily_checkins")
      .select("date, stress_level")
      .eq("user_id", userId)
      .gte("date", sinceDate)
      .lte("date", todayISO),
    (supabase as any)
      .from("skin_feedback_log")
      .select("date, issues")
      .eq("user_id", userId)
      .gte("date", sinceDate)
      .lte("date", todayISO),
  ]);

  const states: CategoryState[] = (stateRes.data ?? []).map((r: any) => ({
    category: r.category as ActiveCategory,
    lastAppliedDate: r.last_applied_date,
    currentIntervalDays: Number(r.current_interval_days),
    // Postgres `numeric` columns come back from PostgREST as strings (precision-safe
    // serialization) — must coerce explicitly, otherwise `toleranceScore + 0.05` silently
    // becomes string concatenation instead of addition.
    toleranceScore: Number(r.tolerance_score),
  }));

  const weather: WeatherSnapshot | null = weatherRes.data
    ? { humidity: weatherRes.data.humidity, uvIndex: weatherRes.data.uv_index }
    : null;

  const profile = profileRes.data;
  const cyclePhase = profile?.last_period_date
    ? (calculateCyclePhaseForDate(
        profile.last_period_date,
        profile.cycle_duration ?? 28,
        profile.period_duration ?? 5,
        todayISO,
      ) as CyclePhase | null)
    : null;

  const checkins = checkinsRes.data ?? [];
  const recentStressLevels = checkins
    .filter((c: any) => c.stress_level !== null && c.stress_level !== undefined)
    .map((c: any) => ({ date: c.date, level: c.stress_level }));

  const feedback = feedbackRes.data ?? [];
  const recentIrritationDates = feedback
    .filter((f: any) => (f.issues ?? []).length > 0)
    .map((f: any) => f.date);

  return { states, weather, cyclePhase, recentIrritationDates, recentStressLevels };
}

export function useSkinCyclingRecommendation(
  eveningProducts: EveningProduct[],
  userId: string | null,
  todayISO: string,
) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ["skin-cycling-recommendation", userId, todayISO] as const,
    [userId, todayISO],
  );

  // Cached by (userId, todayISO): switching dashboard tabs and coming back shows the
  // already-computed recommendation instantly instead of flashing back to a "no advice yet"
  // state while it refetches in the background.
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchRecommendationData(userId as string, todayISO),
    enabled: !!userId,
    staleTime: 60_000,
  });

  const loading = !!userId && isLoading;
  const states = data?.states ?? [];
  const weather = data?.weather ?? null;
  const cyclePhase = data?.cyclePhase ?? null;
  const recentIrritationDates = data?.recentIrritationDates ?? [];
  const recentStressLevels = data?.recentStressLevels ?? [];

  const products: CategoryProductInfo[] = useMemo(
    () =>
      eveningProducts
        .map((p) => {
          const category = resolveActiveCategory(p.product_type, p.ingredients);
          return category
            ? {
                category,
                addedAt: p.added_at,
                frequency: p.frequency,
                frequencyDays: p.frequency_days,
                productId: p.id,
                productName: p.product_name,
              }
            : null;
        })
        .filter((p): p is CategoryProductInfo => p !== null),
    [eveningProducts],
  );

  const decision: NightDecision | null = useMemo(() => {
    if (loading || !data) return null;
    return decideTonight({
      today: todayISO,
      states,
      products,
      cyclePhase,
      weather,
      recentIrritationDates,
      recentStressLevels,
    });
  }, [loading, data, todayISO, states, products, cyclePhase, weather, recentIrritationDates, recentStressLevels]);

  // 7 jours : assez pour un "plan de la semaine" cliquable (Vanity), les autres écrans
  // n'affichent qu'un extrait (NightRecommendationBanner tronque à 3 par défaut).
  const forecast: ForecastDay[] = useMemo(() => {
    if (loading || !data) return [];
    return buildForecast(
      { today: todayISO, states, products, cyclePhase, weather, recentIrritationDates, recentStressLevels },
      7,
    );
  }, [loading, data, todayISO, states, products, cyclePhase, weather, recentIrritationDates, recentStressLevels]);

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const settle = useCallback(
    async (args: { appliedCategory: ActiveCategory | null; irritationReportedToday?: boolean }) => {
      if (!userId) return;

      // Idempotency guard: if the applied category's state already reflects today, skip.
      if (args.appliedCategory) {
        const existing = states.find((s) => s.category === args.appliedCategory);
        if (existing?.lastAppliedDate === todayISO) return;
      }

      const results = settleAfterCheckin({
        appliedCategory: args.appliedCategory,
        irritationReportedToday: args.irritationReportedToday ?? recentIrritationDates.includes(todayISO),
        states,
        today: todayISO,
      });

      for (const result of results) {
        const payload: Record<string, unknown> = {
          user_id: userId,
          category: result.category,
          updated_at: new Date().toISOString(),
        };
        if (result.lastAppliedDate !== undefined) payload.last_applied_date = result.lastAppliedDate;
        if (result.toleranceScore !== undefined) payload.tolerance_score = result.toleranceScore;
        if (result.currentIntervalDays !== undefined) payload.current_interval_days = result.currentIntervalDays;

        await (supabase as any)
          .from("skin_cycling_state")
          .upsert(payload, { onConflict: "user_id,category" });
      }

      await refetch();
    },
    [userId, todayISO, states, refetch, recentIrritationDates],
  );

  const irritationReportedToday = recentIrritationDates.includes(todayISO);

  return { decision, forecast, loading, settle, irritationReportedToday, refetch };
}
