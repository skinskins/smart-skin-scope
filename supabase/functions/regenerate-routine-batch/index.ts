import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Régénération de routine "batch avec debounce" (choix B, cf. spec crédits section 3) :
// un scan marque profiles.routine_regen_pending_since (voir Vanity.tsx insertScannedProduct).
// Cette fonction traite les profils dont le flag est posé depuis au moins DEBOUNCE_MS,
// régénère la routine complète (matin + soir, via inci-analysis) puis efface le flag.
//
// ⚠️ Comme generate-advice-batch (cron 2h, jamais câblé dans ce repo), cette fonction a besoin
// d'un déclencheur planifié externe (Supabase Dashboard → scheduled trigger, ex. toutes les
// minutes) — rien dans le code ne l'invoque automatiquement.
const DEBOUNCE_MS = 5 * 60 * 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_KEY) {
      throw new Error("Env vars manquantes : SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const debounceThreshold = new Date(Date.now() - DEBOUNCE_MS).toISOString();
    console.log("[regenerate-routine-batch] threshold:", debounceThreshold);

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, routine_regen_pending_since")
      .not("routine_regen_pending_since", "is", null)
      .lte("routine_regen_pending_since", debounceThreshold);

    if (profilesError) throw new Error(`Profiles query: ${profilesError.message}`);

    const total = profiles?.length ?? 0;
    console.log(`[regenerate-routine-batch] ${total} profils à régénérer`);

    let regenerated = 0;
    let errors = 0;

    for (const profile of profiles ?? []) {
      try {
        const results = await Promise.all(
          ["morning", "evening"].map((period) =>
            fetch(`${SUPABASE_URL}/functions/v1/inci-analysis`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SERVICE_KEY}`,
              },
              body: JSON.stringify({ user_id: profile.id, period }),
            })
          )
        );

        const allOk = results.every((r) => r.ok);
        if (!allOk) {
          errors++;
          console.warn(`[regenerate-routine-batch] ⚠️ ${profile.id}: échec partiel`);
          continue;
        }

        // On n'efface le flag que si la régénération a réussi — sinon elle sera retentée
        // au prochain passage du batch plutôt que silencieusement abandonnée.
        await supabase
          .from("profiles")
          .update({ routine_regen_pending_since: null })
          .eq("id", profile.id);

        regenerated++;
        console.log(`[regenerate-routine-batch] ✅ ${profile.id}`);
      } catch (e) {
        errors++;
        console.error(`[regenerate-routine-batch] ❌ ${profile.id}:`, e);
      }

      // Pause pour ne pas saturer l'API Anthropic
      await new Promise((r) => setTimeout(r, 800));
    }

    const summary = { total, regenerated, errors };
    console.log("[regenerate-routine-batch] Terminé :", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[regenerate-routine-batch] Erreur fatale :", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
