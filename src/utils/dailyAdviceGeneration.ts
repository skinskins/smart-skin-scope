import { supabase } from "@/integrations/supabase/client";

// generate-weekly-advice prend ~20 s (appel Claude). Si l'auto-génération du jour (Dashboard,
// WeeklyPlan, après une photo) est encore en cours quand l'utilisatrice clique sur "Mettre à
// jour" / "Recharger ma routine", on lançait deux générations en parallèle pour rien. On
// partage donc la génération en cours par utilisatrice : tout appel concurrent — forcé ou
// non — réutilise la même promesse, puisque les conseils qu'elle produit sont déjà frais.
type InvokeResult = Awaited<ReturnType<typeof supabase.functions.invoke>>;

const inflight = new Map<string, Promise<InvokeResult>>();

export function generateDailyAdvice(
  userId: string,
  body: { date: string; force?: boolean },
): Promise<InvokeResult> {
  const pending = inflight.get(userId);
  if (pending) return pending;

  const promise = supabase.functions
    .invoke("generate-weekly-advice", { body })
    .finally(() => inflight.delete(userId));

  inflight.set(userId, promise);
  return promise;
}
