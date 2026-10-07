import { supabase } from "@/integrations/supabase/client";

// Curation matin + soir via inci-analysis (2 appels Claude, ~30 s). Le résultat n'est écrit
// dans daily_routine_log qu'à la toute fin : pendant ce délai, le Dashboard et Vanity ne voient
// encore aucune routine du jour et relançaient chacun leur propre curation (jusqu'à 6 appels
// pour 1 clic). On partage donc la paire en cours par utilisatrice : tout appel concurrent
// réutilise la même promesse au lieu d'en démarrer une nouvelle.
type InciAnalysisResponse = { routine?: { product_id: string }[]; explanation?: string | null };
type InvokeResult = { data: InciAnalysisResponse | null; error: unknown };
export type RoutineCurationResult = { morningRes: InvokeResult; eveningRes: InvokeResult };

const inflight = new Map<string, Promise<RoutineCurationResult>>();

export function curateDailyRoutine(userId: string): Promise<RoutineCurationResult> {
  const pending = inflight.get(userId);
  if (pending) return pending;

  const promise = Promise.all([
    supabase.functions.invoke<InciAnalysisResponse>("inci-analysis", { body: { user_id: userId, period: "morning" } }),
    supabase.functions.invoke<InciAnalysisResponse>("inci-analysis", { body: { user_id: userId, period: "evening" } }),
  ])
    .then(([morningRes, eveningRes]) => ({ morningRes, eveningRes }))
    .finally(() => inflight.delete(userId));

  inflight.set(userId, promise);
  return promise;
}
