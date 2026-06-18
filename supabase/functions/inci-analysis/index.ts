import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_FACTOR_LABELS: Record<string, string> = {
  poor_sleep: "manque de sommeil habituel", good_sleep: "dors bien en général",
  high_stress: "niveau de stress élevé habituellement", serene: "plutôt sereine habituellement",
  high_sugar: "alimentation sucrée/grasse habituelle", low_water: "hydratation insuffisante habituelle",
  balanced_diet: "alimentation équilibrée habituelle", sport: "sport régulier",
  sedentary: "mode de vie sédentaire", sun: "exposition solaire fréquente",
  screens: "beaucoup d'écrans", smoking: "fumeuse", hormonal: "contraception hormonale",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, period } = await req.json();
    if (!user_id || !period) {
      return new Response(JSON.stringify({ error: "user_id et period requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const today        = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const periodLabel  = period === "morning" ? "matin" : "soir";

    console.log(`[inci-analysis] ${user_id} — ${period} — ${today}`);

    // ── 1. Fetch toutes les données en parallèle ───────────────────────────────
    const [profileRes, productsRes, weatherRes, checkinRes, skinPhotoRes, historyRes] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("age, cycle_phase, carnation, skin_type, skin_problems, skin_goals, default_factors, skin_diagnostic_baseline, skin_diagnostic_source")
          .eq("id", user_id)
          .single(),
        supabase
          .from("user_products")
          .select("id, product_name, brand, product_type, photo_url, ingredients, frequency")
          .eq("user_id", user_id)
          .eq("is_active", true)
          .eq(period === "morning" ? "morning_use" : "evening_use", true),
        supabase
          .from("daily_weather")
          .select("temp_c, humidity, uv_index, aqi_score, pollution_label")
          .eq("user_id", user_id)
          .eq("date", today)
          .maybeSingle(),
        supabase
          .from("daily_checkins")
          .select("stress_level, sleep_hours, food_quality, alcohol_drinks, extra_factors")
          .eq("user_id", user_id)
          .eq("date", today)
          .maybeSingle(),
        supabase
          .from("skin_photos")
          .select("date, analysis_json")
          .eq("user_id", user_id)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("daily_advice_log")
          .select("advice_title, date")
          .eq("user_id", user_id)
          .gte("date", sevenDaysAgo)
          .order("date", { ascending: false }),
      ]);

    const profile = profileRes.data;
    if (!profile) throw new Error("Profil introuvable");

    const allProducts  = productsRes.data ?? [];
    const weather      = weatherRes.data;
    const checkin      = checkinRes.data;
    const skinAnalysis = skinPhotoRes.data?.analysis_json as Record<string, any> | undefined;
    const history      = historyRes.data ?? [];

    console.log(`[inci-analysis] ${allProducts.length} produits, météo: ${weather ? "✅" : "❌"}, checkin: ${checkin ? "✅" : "❌"}`);

    // ── 2. Bloc mode de vie ────────────────────────────────────────────────────
    let lifestyleBlock: string;
    if (checkin) {
      const factors: string[] = [];
      if (checkin.stress_level !== null) {
        if (checkin.stress_level >= 4)      factors.push("stress très élevé aujourd'hui");
        else if (checkin.stress_level === 3) factors.push("stress modéré");
        else if (checkin.stress_level === 1) factors.push("sereine");
      }
      if (checkin.sleep_hours !== null) {
        if (checkin.sleep_hours <= 5)       factors.push(`sommeil insuffisant (${checkin.sleep_hours}h)`);
        else if (checkin.sleep_hours >= 7)  factors.push(`bon sommeil (${checkin.sleep_hours}h)`);
      }
      if (checkin.food_quality === "Grasses / Sucrées") factors.push("alimentation grasse/sucrée");
      else if (checkin.food_quality === "Équilibrée")   factors.push("alimentation équilibrée");
      if ((checkin.alcohol_drinks ?? 0) >= 1)           factors.push("consommation d'alcool");
      if (checkin.extra_factors?.sun_exposure)          factors.push("exposition solaire");
      if (checkin.extra_factors?.medication)            factors.push("prise de médicament");
      if (checkin.extra_factors?.travel)                factors.push("voyage/changement d'environnement");
      lifestyleBlock = factors.length > 0
        ? `Données du jour (check-in réel) : ${factors.join(", ")}`
        : "Check-in effectué — aucun facteur particulier noté";
    } else {
      const defaultFactors = profile.default_factors as Record<string, boolean> | null;
      if (defaultFactors) {
        const active = Object.entries(defaultFactors)
          .filter(([, v]) => v)
          .map(([k]) => DEFAULT_FACTOR_LABELS[k] ?? k);
        lifestyleBlock = active.length > 0
          ? `Mode de vie habituel déclaré : ${active.join(", ")}`
          : "Mode de vie déclaré sans facteur particulier";
      } else {
        lifestyleBlock = "Données de mode de vie non disponibles";
      }
    }

    // ── 3. Blocs contexte ──────────────────────────────────────────────────────
    const weatherBlock = weather
      ? `- Température : ${weather.temp_c}°C\n- Humidité : ${weather.humidity}%\n- Indice UV : ${weather.uv_index}\n- Qualité de l'air : ${weather.pollution_label} (AQI ${weather.aqi_score})`
      : "- Données météo non disponibles";

    const skinStateBlock = skinAnalysis
      ? `- Éclat global : ${skinAnalysis.eclat_global}/10
- Hydratation : ${skinAnalysis.hydratation?.score}/4${skinAnalysis.hydratation?.zones ? ` (${skinAnalysis.hydratation.zones})` : ""}
- Érythème : ${skinAnalysis.erytheme?.score}/4${skinAnalysis.erytheme?.zones ? ` (${skinAnalysis.erytheme.zones})` : ""}
- Acné : ${skinAnalysis.acne?.score}/4 (type : ${skinAnalysis.acne?.type ?? "non renseigné"})
- Sébum : zone T ${skinAnalysis.sebum?.zone_t}/5, zone U ${skinAnalysis.sebum?.zone_u}/5
- Texture : pores front ${skinAnalysis.texture?.pores_front}/4, pores joues ${skinAnalysis.texture?.pores_joues}/4
- Pigmentation : ${skinAnalysis.pigmentation?.uniformite ?? "non renseignée"}, type ${skinAnalysis.pigmentation?.type ?? "non renseigné"}
- Rides : périorbital ${skinAnalysis.rides?.periorbital}/5, front ${skinAnalysis.rides?.front}/5`
      : "- Aucune analyse de peau récente disponible";

    const diag = profile.skin_diagnostic_baseline as Record<string, any> | null;
    const diagBlock = diag
      ? `- Hydratation : ${diag.hydratation?.score ?? "n/a"}/4 · Sébum T : ${diag.sebum?.zone_t ?? "n/a"}/5 · Pores : ${diag.pores?.score ?? "n/a"}/4 · Taches : ${diag.taches?.score ?? "n/a"}/4 · Rougeurs : ${diag.rougeurs?.score ?? "n/a"}/4 · Éclat : ${diag.eclat_global ?? "n/a"}/10`
      : "Aucun diagnostic professionnel disponible";

    const historyBlock = history.length > 0
      ? history.map((h: any) => `- ${h.date} : ${h.advice_title}`).join("\n")
      : "- Aucun historique";

    // ── 4. Liste produits avec IDs ─────────────────────────────────────────────
    const productList = allProducts.length > 0
      ? allProducts.map(p => {
          const freq = p.frequency && p.frequency !== "daily" ? ` [fréquence: ${p.frequency}]` : "";
          const line = `[ID:${p.id}] ${p.product_name}${p.brand ? ` (${p.brand})` : ""}${p.product_type ? ` — ${p.product_type}` : ""}${freq}`;
          return p.ingredients ? `${line}\n  INCI: ${p.ingredients}` : line;
        }).join("\n")
      : "Aucun produit disponible";

    // ── 5. Prompt fusionné ─────────────────────────────────────────────────────
    const prompt = `Tu es l'assistante skincare intelligente d'une application mobile premium. Accomplis deux missions en un seul JSON.

## PROFIL
- Âge : ${profile.age ?? "non renseigné"}
- Carnation : ${profile.carnation ?? "non renseignée"}
- Type de peau : ${profile.skin_type ?? "non renseigné"}
- Problèmes : ${Array.isArray(profile.skin_problems) ? profile.skin_problems.join(", ") : profile.skin_problems ?? "non renseignés"}
- Phase cycle : ${profile.cycle_phase ?? "non renseignée"}

## ÉTAT DE PEAU OBSERVÉ${skinPhotoRes.data?.date ? ` (analyse du ${skinPhotoRes.data.date})` : ""}
${skinStateBlock}

## DIAGNOSTIC PROFESSIONNEL
${diagBlock}

## MÉTÉO DU JOUR (${today})
${weatherBlock}

## MODE DE VIE
${lifestyleBlock}

## HISTORIQUE CONSEILS (7 derniers jours — éviter répétitions)
${historyBlock}

---

## PRODUITS DISPONIBLES POUR CE ${periodLabel.toUpperCase()}
⚠️ IMPORTANT : Les "product_id" dans ta réponse DOIVENT être des valeurs [ID:...] copiées EXACTEMENT depuis la liste ci-dessous. Ne jamais inventer ou modifier un ID.

${productList}

---

## MISSION 1 — ROUTINE OPTIMALE

Sélectionne les produits les plus adaptés pour ce ${periodLabel}.

RÈGLES DE DÉDUPLICATION — 1 seul produit par catégorie fonctionnelle :
- Pads / cotons exfoliants / toners actifs → 1 maximum
- Crèmes hydratantes / émollientes → 1 maximum
- Sérums (si même famille d'actifs) → 1 maximum
- Nettoyants / huiles démaquillantes → 1 maximum
- SPF → 1 maximum (matin uniquement)
- Accessoires (gua sha, etc.) → inclure si contexte favorable

CRITÈRE DE SÉLECTION entre doublons fonctionnels :
Choisir le produit dont les INCI sont les plus adaptés à :
1. La phase de cycle et l'état de peau observé
2. La météo du jour (UV, humidité, pollution)
3. Les conditions de vie du jour
4. La période (${periodLabel} : ${period === "morning" ? "légèreté, protection" : "nutrition, récupération, réparation"})

INCOMPATIBILITÉS : Exclure tout produit dangereux pour les conditions actuelles (pH antagonistes, photosensibilisants le matin, irritants si peau fragilisée).

ORDRE D'APPLICATION : Texture eau → tonique → essence/pad → sérum → contour yeux → soin/crème → huile → SPF.

## MISSION 2 — CONSEILS LIÉS À LA ROUTINE

Génère 2 à 3 conseils qui expliquent les choix de la Mission 1.
- Toujours lier au contexte précis du jour (phase cycle, météo, état peau)
- Expliquer POURQUOI un produit a été choisi ou exclu
- Jamais de conseils génériques ("buvez de l'eau", "protégez-vous du soleil")
- Types : "warning" (danger actif) | "alerte" (prudence) | "astuce" (optimisation) | "observation" (info)
- Priorités : "1" haute | "2" moyenne | "3" basse

---

## FORMAT DE SORTIE — JSON strict, rien autour :
{
  "routine": [
    {
      "product_id": "<ID EXACT copié depuis [ID:...] ci-dessus>",
      "order": <entier commençant à 1>
    }
  ],
  "excluded": [
    {
      "product_id": "<ID EXACT>",
      "product_name": "<nom>",
      "reason": "<raison courte>"
    }
  ],
  "explanation": "<phrase expliquant les ajustements principaux — null si aucun produit exclu>",
  "conseils": [
    {
      "advice_title": "<titre court percutant>",
      "advice_text": "<explication bienveillante avec lien de causalité>",
      "advice_tip": "<action concrète>",
      "advice_group": "warning|alerte|astuce|observation",
      "priority": "1|2|3"
    }
  ]
}`;

    // ── 6. Appel Claude Sonnet ─────────────────────────────────────────────────
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      throw new Error(`Claude API error: ${claudeRes.status} ${err}`);
    }

    const claudeData = await claudeRes.json();
    const usage = claudeData.usage;
    console.log(`[inci-analysis] Tokens — input: ${usage?.input_tokens}, output: ${usage?.output_tokens}`);

    await supabase.from("api_usage").insert({
      user_id,
      input_tokens:  usage?.input_tokens  ?? 0,
      output_tokens: usage?.output_tokens ?? 0,
      total_tokens:  (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0),
      fonction: "inci-analysis",
    }).then(({ error }) => {
      if (error) console.warn("[inci-analysis] api_usage warning:", error.message);
    });

    const rawContent = claudeData.content?.[0]?.text;
    if (!rawContent) throw new Error("Réponse Claude vide");

    const cleaned = rawContent.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const result  = JSON.parse(cleaned);

    // ── 7. Mapper les product_ids → objets complets ────────────────────────────
    const productMap = new Map(allProducts.map((p: any) => [p.id, p]));

    const routineItems: any[] = (result.routine ?? [])
      .map((r: { product_id: string; order: number }) => {
        const p = productMap.get(r.product_id);
        if (!p) {
          console.warn(`[inci-analysis] product_id inconnu dans routine: ${r.product_id}`);
          return null;
        }
        return {
          product_id:   p.id,
          product_name: p.product_name,
          brand:        p.brand,
          product_type: p.product_type,
          photo_url:    p.photo_url,
          order:        r.order,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.order - b.order);

    // Fallback : si Claude a tout exclu ou retourné des IDs invalides, on prend tous les produits
    const finalRoutine = routineItems.length > 0
      ? routineItems
      : allProducts.map((p: any, i: number) => ({
          product_id: p.id, product_name: p.product_name, brand: p.brand,
          product_type: p.product_type, photo_url: p.photo_url, order: i + 1,
        }));

    // ── 8. Sauvegarder daily_routine_log ──────────────────────────────────────
    await supabase.from("daily_routine_log").upsert(
      {
        user_id,
        date:        today,
        period,
        product_ids: finalRoutine.map((p: any) => p.product_id),
        inci_message: result.explanation ?? null,
      },
      { onConflict: "user_id,date,period" }
    );
    console.log(`[inci-analysis] daily_routine_log sauvegardé (${finalRoutine.length} produits)`);

    // ── 9. Sauvegarder daily_advice_log (seulement si vide pour aujourd'hui) ──
    const { data: existingAdvice } = await supabase
      .from("daily_advice_log")
      .select("id")
      .eq("user_id", user_id)
      .eq("date", today)
      .limit(1);

    if (!existingAdvice || existingAdvice.length === 0) {
      const rows = (result.conseils ?? []).map((c: any, i: number) => ({
        user_id,
        date:         today,
        advice_title: c.advice_title,
        advice_text:  c.advice_text,
        advice_tip:   c.advice_tip,
        advice_group: c.advice_group,
        priority:     c.priority ?? String(i + 1),
      }));
      if (rows.length > 0) {
        const { error: adviceErr } = await supabase.from("daily_advice_log").insert(rows);
        if (adviceErr) console.warn("[inci-analysis] daily_advice_log insert warning:", adviceErr.message);
        else console.log(`[inci-analysis] ${rows.length} conseils sauvegardés`);
      }
    } else {
      console.log("[inci-analysis] daily_advice_log déjà rempli pour aujourd'hui — pas d'écrasement");
    }

    // ── 10. Réponse ────────────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        routine:     finalRoutine,
        excluded:    result.excluded    ?? [],
        explanation: result.explanation ?? null,
        conseils:    result.conseils    ?? [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[inci-analysis] Erreur fatale:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
