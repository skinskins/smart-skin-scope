import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date().toISOString().split("T")[0];

    // ── 1. Vérifier si conseils déjà générés aujourd'hui ───────────────────
    const { data: existing } = await supabase
      .from("daily_advice_log")
      .select("id")
      .eq("user_id", user_id)
      .eq("date", today)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log("[generate-advice] Conseils déjà générés aujourd'hui ✅");
      const { data: todayAdvices } = await supabase
        .from("daily_advice_log")
        .select("*")
        .eq("user_id", user_id)
        .eq("date", today);
      return new Response(JSON.stringify({ cached: true, conseils: todayAdvices }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Récupérer le profil ──────────────────────────────────────────────
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("age, cycle_phase, stress_level, skin_type, skin_problems, skin_goals, carnation, manual_location, last_period_date, cycle_duration, default_factors")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) throw new Error("Profil introuvable");
    console.log("[generate-advice] Profil récupéré ✅");

    // ── 3. Récupérer la météo du jour ───────────────────────────────────────
    const { data: weather } = await supabase
      .from("daily_weather")
      .select("temp_c, humidity, uv_index, aqi_score, pollution_label, location")
      .eq("user_id", user_id)
      .eq("date", today)
      .maybeSingle();

    console.log("[generate-advice] Météo:", weather ? "✅" : "❌ absente");

    // ── 3b. Récupérer le check-in du jour (si disponible) ──────────────────
    const { data: checkin } = await supabase
      .from("daily_checkins")
      .select("stress_level, sleep_hours, food_quality, alcohol_drinks, extra_factors")
      .eq("user_id", user_id)
      .eq("date", today)
      .maybeSingle();

    console.log("[generate-advice] Check-in:", checkin ? "✅" : "absent — fallback default_factors");

    // ── 4. Récupérer les produits actifs ────────────────────────────────────
    const { data: products } = await supabase
      .from("user_products")
      .select("product_name, brand, product_type, ingredients")
      .eq("user_id", user_id)
      .eq("is_active", true);

    console.log("[generate-advice] Produits:", products?.length ?? 0);

    // ── 5. Récupérer la dernière analyse de peau (skin-analysis) ────────────
    const { data: lastPhoto } = await supabase
      .from("skin_photos")
      .select("date, analysis_json")
      .eq("user_id", user_id)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log("[generate-advice] Analyse de peau:", lastPhoto?.analysis_json ? "✅" : "❌ absente");

    // ── 6. Récupérer historique conseils 7 derniers jours ───────────────────
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: history } = await supabase
      .from("daily_advice_log")
      .select("advice_title, date")
      .eq("user_id", user_id)
      .gte("date", sevenDaysAgo.toISOString().split("T")[0])
      .order("date", { ascending: false });

    // ── 7. Construire le prompt ─────────────────────────────────────────────

    // Bloc mode de vie : check-in du jour en priorité, sinon default_factors
    const DEFAULT_FACTOR_LABELS: Record<string, string> = {
      poor_sleep: "manque de sommeil habituel", good_sleep: "dors bien en général",
      high_stress: "niveau de stress élevé habituellement", serene: "plutôt sereine habituellement",
      high_sugar: "alimentation sucrée/grasse habituelle", low_water: "hydratation insuffisante habituelle",
      balanced_diet: "alimentation équilibrée habituelle", sport: "sport régulier",
      sedentary: "mode de vie sédentaire", sun: "exposition solaire fréquente",
      screens: "beaucoup d'écrans", smoking: "fumeuse", hormonal: "contraception hormonale",
    };

    let lifestyleBlock: string;
    if (checkin) {
      const factors: string[] = [];
      if (checkin.stress_level !== null) {
        if (checkin.stress_level >= 4) factors.push("stress très élevé aujourd'hui");
        else if (checkin.stress_level === 3) factors.push("stress modéré");
        else if (checkin.stress_level === 1) factors.push("sereine");
      }
      if (checkin.sleep_hours !== null) {
        if (checkin.sleep_hours <= 5) factors.push(`sommeil insuffisant (${checkin.sleep_hours}h)`);
        else if (checkin.sleep_hours >= 7) factors.push(`bon sommeil (${checkin.sleep_hours}h)`);
      }
      if (checkin.food_quality === "Grasses / Sucrées") factors.push("alimentation grasse/sucrée");
      else if (checkin.food_quality === "Équilibrée") factors.push("alimentation équilibrée");
      if ((checkin.alcohol_drinks ?? 0) >= 1) factors.push("consommation d'alcool");
      if (checkin.extra_factors?.sun_exposure) factors.push("exposition solaire");
      if (checkin.extra_factors?.medication) factors.push("prise de médicament");
      if (checkin.extra_factors?.travel) factors.push("voyage/changement d'environnement");
      lifestyleBlock = factors.length > 0
        ? `Données du jour (check-in réel) : ${factors.join(", ")}`
        : "Check-in effectué — aucun facteur particulier noté aujourd'hui";
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

    const weatherBlock = weather
      ? `- Température : ${weather.temp_c}°C
- Humidité : ${weather.humidity}%
- Indice UV : ${weather.uv_index}
- Qualité de l'air : ${weather.pollution_label} (AQI ${weather.aqi_score})`
      : "- Données météo non disponibles aujourd'hui";

    const skinAnalysis = lastPhoto?.analysis_json as Record<string, any> | undefined;

    const skinStateBlock = skinAnalysis
      ? `- Éclat global : ${skinAnalysis.eclat_global}/10
- Hydratation : ${skinAnalysis.hydratation?.score}/4${skinAnalysis.hydratation?.zones ? ` (${skinAnalysis.hydratation.zones})` : ""}
- Érythème : ${skinAnalysis.erytheme?.score}/4${skinAnalysis.erytheme?.zones ? ` (${skinAnalysis.erytheme.zones})` : ""}
- Acné : ${skinAnalysis.acne?.score}/4 (type : ${skinAnalysis.acne?.type ?? "non renseigné"})${skinAnalysis.acne?.zones ? ` (${skinAnalysis.acne.zones})` : ""}
- Sébum : zone T ${skinAnalysis.sebum?.zone_t}/5, zone U ${skinAnalysis.sebum?.zone_u}/5
- Texture : pores front ${skinAnalysis.texture?.pores_front}/4, pores joues ${skinAnalysis.texture?.pores_joues}/4, microrelief ${skinAnalysis.texture?.microrelief ?? "non renseigné"}
- Pigmentation : ${skinAnalysis.pigmentation?.uniformite ?? "non renseignée"}, type ${skinAnalysis.pigmentation?.type ?? "non renseigné"}
- Rides : périorbital ${skinAnalysis.rides?.periorbital}/5, front ${skinAnalysis.rides?.front}/5, périorale ${skinAnalysis.rides?.periorale}/5
- Phototype (Fitzpatrick) : ${skinAnalysis.fitzpatrick ?? "non renseigné"} — Photovieillissement (Glogau) : ${skinAnalysis.glogau ?? "non renseigné"}${skinAnalysis.points_attention?.length ? `\n- Points d'attention observés : ${skinAnalysis.points_attention.join(", ")}` : ""}`
      : "- Aucune analyse de peau récente disponible";

    const productsBlock = products && products.length > 0
      ? products.map((p) =>
          `- ${p.product_name} (${p.brand}) — ${p.product_type}${p.ingredients ? `\n  INCI : ${p.ingredients}` : ""}`
        ).join("\n")
      : "- Aucun produit enregistré";

    const historyBlock = history && history.length > 0
      ? history.map((h) => `- ${h.date} : ${h.advice_title}`).join("\n")
      : "- Aucun historique disponible";

    const prompt = `Tu es l'assistant skincare intelligent d'une application mobile premium de soins de la peau.
Tu génères des conseils personnalisés, bienveillants et experts pour des utilisatrices françaises.

## PROFIL UTILISATRICE
- Âge : ${profile.age ?? "non renseigné"}
- Phase du cycle menstruel : ${profile.cycle_phase ?? "non renseignée"}
- Carnation : ${profile.carnation ?? "non renseignée"}
- Type de peau : ${profile.skin_type ?? "non renseigné"}
- Problèmes de peau : ${Array.isArray(profile.skin_problems) ? profile.skin_problems.join(", ") : profile.skin_problems ?? "non renseignés"}
- Objectifs : ${Array.isArray(profile.skin_goals) ? profile.skin_goals.join(", ") : profile.skin_goals ?? "non renseignés"}
- Niveau de stress : ${profile.stress_level ?? "non renseigné"}

## FACTEURS QUOTIDIENS & MODE DE VIE
- ${lifestyleBlock}

## DONNÉES MÉTÉO (aujourd'hui — ${today})
${weatherBlock}

## ÉTAT DE PEAU OBSERVÉ${lastPhoto?.date ? ` (analyse du ${lastPhoto.date})` : ""}
${skinStateBlock}

## PRODUITS EN ROUTINE ACTIVE
${productsBlock}

## HISTORIQUE CONSEILS (7 derniers jours)
${historyBlock}

## TON OBJECTIF
Analyser ces données de manière holistique et générer 3 à 4 conseils qui :
1. Expliquent les liens de causalité entre facteurs environnementaux, hormonaux et état de la peau
2. Tiennent compte des produits déjà utilisés
3. Identifient synergies ou conflits entre ingrédients actifs et conditions du jour
4. Restent actionnables et précis
5. Ne répètent pas les conseils des 7 derniers jours

## RÈGLES CRITIQUES
- JAMAIS de conseils de base (pas "buvez de l'eau", pas "protégez-vous du soleil")
- Ces femmes sont expertes en skincare — va au-delà des fondamentaux
- Bienveillant, jamais condescendant ni alarmiste
- Ne recommande jamais de marques spécifiques
- Ne mentionne jamais des données non disponibles

## FORMAT DE SORTIE
Réponds UNIQUEMENT en JSON valide, sans texte autour :
{
  "conseils": [
    {
      "type": "observation" | "alerte" | "astuce" | "warning",
      "priorite": "haute" | "moyenne" | "basse",
      "source_donnee": ["cycle", "meteo", "pollution", "uv", "stress", "produits", "skin_analysis"],
      "titre": "Phrase courte évocatrice",
      "corps": "Paragraphe bienveillant avec explication et lien de causalité",
      "action": "Action concrète suggérée"
    }
  ],
  "resume_journalier": "Phrase de synthèse positive et motivante"
}`;

    // ── 8. Appel Claude ─────────────────────────────────────────────────────
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY non configurée");

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      throw new Error(`Claude API error: ${claudeRes.status} ${err}`);
    }

    const claudeData = await claudeRes.json();

    // ── 9. Monitoring tokens ────────────────────────────────────────────────
    const usage = claudeData.usage;
    console.log(`[generate-advice] Tokens — input: ${usage?.input_tokens}, output: ${usage?.output_tokens}`);

    await supabase.from("api_usage").insert({
      user_id,
      input_tokens: usage?.input_tokens ?? 0,
      output_tokens: usage?.output_tokens ?? 0,
      total_tokens: (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0),
      fonction: "generate-advice",
    }).then(({ error }) => {
      if (error) console.warn("[generate-advice] api_usage insert warning:", error.message);
    });

    // ── 10. Parser la réponse ───────────────────────────────────────────────
    const rawContent = claudeData.content?.[0]?.text;
    if (!rawContent) throw new Error("Réponse Claude vide");

    const cleaned = rawContent.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(cleaned);

    // ── 11. Sauvegarder dans daily_advice_log ───────────────────────────────
    const rows = parsed.conseils.map((conseil: {
      type: string;
      priorite: string;
      titre: string;
      corps: string;
      action: string;
      source_donnee: string[];
    }) => ({
      user_id,
      date: today,
      advice_title: conseil.titre,
      advice_text: conseil.corps,
      advice_tip: conseil.action,
      advice_group: conseil.type,
      priority: conseil.priorite === "haute" ? "1" : conseil.priorite === "moyenne" ? "2" : "3",
    }));

    const { error: insertError } = await supabase
      .from("daily_advice_log")
      .insert(rows);

    if (insertError) throw new Error(`Insert daily_advice_log: ${insertError.message}`);
    console.log("[generate-advice] Conseils sauvegardés ✅");

    return new Response(
      JSON.stringify({
        cached: false,
        conseils: parsed.conseils,
        resume_journalier: parsed.resume_journalier,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[generate-advice] error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});