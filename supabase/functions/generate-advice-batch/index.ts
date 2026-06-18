import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const today = new Date().toISOString().split("T")[0];

    // Utilisatrices ayant complété leur onboarding (skin_goals renseigné)
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id")
      .not("skin_goals", "is", null)
      .not("skin_goals", "eq", "{}");

    if (profErr) throw new Error(`Profiles query: ${profErr.message}`);

    const total = profiles?.length ?? 0;
    console.log(`[generate-advice-batch] ${total} utilisatrices à traiter pour le ${today}`);

    let generated = 0;
    let skipped   = 0;
    let errors    = 0;

    for (const profile of profiles ?? []) {
      // Éviter de regénérer si déjà fait aujourd'hui
      const { data: existing } = await supabase
        .from("daily_advice_log")
        .select("id")
        .eq("user_id", profile.id)
        .eq("date", today)
        .limit(1);

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-advice`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({ user_id: profile.id }),
        });

        if (res.ok) {
          generated++;
          console.log(`[generate-advice-batch] ✅ ${profile.id}`);
        } else {
          errors++;
          const body = await res.text().catch(() => res.status.toString());
          console.warn(`[generate-advice-batch] ⚠️ ${profile.id}: ${body}`);
        }
      } catch (e) {
        errors++;
        console.error(`[generate-advice-batch] ❌ ${profile.id}:`, e);
      }

      // Pause entre les appels pour ne pas saturer l'API Anthropic
      await new Promise(r => setTimeout(r, 800));
    }

    const summary = { total, generated, skipped, errors, date: today };
    console.log("[generate-advice-batch] Terminé :", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[generate-advice-batch] Erreur fatale :", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
