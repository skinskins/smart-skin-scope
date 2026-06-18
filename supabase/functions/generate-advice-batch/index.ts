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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_KEY) {
      throw new Error("Env vars manquantes : SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY");
    }

    const body = await req.json().catch(() => ({}));
    const period: string = body.period ?? "morning";
    console.log(`[batch] period=${period}`);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const today = new Date().toISOString().split("T")[0];
    console.log("[batch] Date:", today);

    const profilesResult = await supabase
      .from("profiles")
      .select("id, skin_goals");

    if (profilesResult.error) throw new Error(`Profiles query: ${profilesResult.error.message}`);

    const profiles = (profilesResult.data ?? []).filter(
      (p: any) => p.skin_goals && Array.isArray(p.skin_goals) && p.skin_goals.length > 0
    );

    const total = profiles.length;
    console.log(`[batch] ${total} utilisatrices à traiter — ${today} ${period}`);

    let generated = 0;
    let skipped   = 0;
    let errors    = 0;

    for (const profile of profiles) {
      // Skip si déjà traité aujourd'hui pour cette période
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
        const res = await fetch(`${SUPABASE_URL}/functions/v1/inci-analysis`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({ user_id: profile.id, period }),
        });

        if (res.ok) {
          generated++;
          console.log(`[batch] ✅ ${profile.id}`);
        } else {
          errors++;
          const text = await res.text().catch(() => res.status.toString());
          console.warn(`[batch] ⚠️ ${profile.id}: ${text}`);
        }
      } catch (e) {
        errors++;
        console.error(`[batch] ❌ ${profile.id}:`, e);
      }

      // Pause pour ne pas saturer l'API Anthropic
      await new Promise(r => setTimeout(r, 800));
    }

    const summary = { total, generated, skipped, errors, date: today, period };
    console.log("[batch] Terminé :", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[batch] Erreur fatale :", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
