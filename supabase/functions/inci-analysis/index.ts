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
- Objectifs : ${Array.isArray(profile.skin_goals) ? profile.skin_goals.join(", ") : profile.skin_goals ?? "non renseignés"}
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

Elle possède les produits listés ci-dessus, mais posséder un produit ne veut pas dire qu'il doit finir dans sa routine : ce sont les produits qu'elle a chez elle, pas une présélection déjà validée. Sélectionne UNIQUEMENT ceux qui sont réellement pertinents pour SON profil (type de peau, problèmes, objectifs) et pour le contexte du jour — pas "un peu de chaque catégorie qu'elle possède".

CRITÈRES D'INCLUSION, dans cet ordre :
1. Le produit convient-il à son type de peau et à ses problèmes déclarés ?
2. Sert-il un de ses objectifs peau ?
3. Est-il adapté à CE moment précis de la journée (${periodLabel}) — pas seulement "pas contre-indiqué", mais réellement pertinent pour le matin ou pour le soir ?
4. Est-il cohérent avec l'état de peau observé, la phase de cycle et la météo ?
5. N'est-il pas redondant avec un autre produit déjà retenu dans la même catégorie fonctionnelle ?

DIFFÉRENCIATION MATIN / SOIR — cette fonction est appelée séparément pour le matin et pour le soir : les deux routines ne doivent PAS être une simple copie l'une de l'autre par défaut. Une routine matin identique à la routine soir n'est légitime que si le(s) produit(s) retenu(s) sont explicitement adaptés aux deux moments (ex. nettoyant doux neutre, crème hydratante sans actif sensible) — ce n'est jamais le choix par défaut, c'est un résultat qui doit être justifiable produit par produit.
- Matin : privilégier protection et légèreté — vitamine C, niacinamide, acide hyaluronique, antioxydants, SPF.
- Soir : privilégier réparation et actifs exigeants — rétinol/rétinoïdes, AHA/BHA/acides exfoliants, peptides, huiles nourrissantes. Ne jamais retenir de rétinoïdes ou d'exfoliants forts le matin.
- SI l'utilisatrice possède plusieurs produits dans une même catégorie fonctionnelle avec des profils d'actifs différents (ex. un sérum vitamine C et un sérum rétinol) → répartis-les entre matin et soir selon leur profil plutôt que de n'en retenir qu'un seul pour les deux moments.

RÈGLES PAR CATÉGORIE FONCTIONNELLE (pads/toners actifs, crèmes/émollients, sérums, nettoyants) :
- Maximum 1 produit par catégorie, sauf sérums avec familles d'actifs clairement complémentaires (max 2).
- N'inclus un produit d'une catégorie QUE s'il remplit les critères d'inclusion ci-dessus pour cette utilisatrice précisément, CE moment de la journée inclus.
- SI aucun produit d'une catégorie ne convient à son profil, au contexte du jour ou à ce moment précis → exclus TOUTE la catégorie (0 produit), avec la raison dans excluded[]. Ce n'est pas une exception rare, c'est un résultat normal et attendu quand c'est justifié.
- SPF : 1 maximum (matin uniquement). Le soir : exclure avec raison "non adapté au soir".
- Accessoires (gua sha, etc.) : inclure si contexte favorable.

CRITÈRE DE SÉLECTION entre produits candidats d'une même catégorie :
Choisir celui dont les INCI sont les plus adaptés à :
1. La période (${periodLabel} : ${period === "morning" ? "légèreté, protection" : "nutrition, récupération, réparation"})
2. Son type de peau, ses problèmes et ses objectifs déclarés
3. La phase de cycle et l'état de peau observé
4. La météo du jour (UV, humidité, pollution)
5. Les conditions de vie du jour

Exclure aussi tout produit en incompatibilité chimique avérée avec un autre produit retenu (pH antagonistes, photosensibilisant le matin, irritant actif si peau fragilisée) — mais l'incompatibilité chimique est un motif d'exclusion supplémentaire, pas le seul : un produit inadapté au profil ou au moment de la journée s'exclut même sans danger chimique.

ORDRE D'APPLICATION : Texture eau → tonique → essence/pad → sérum → contour yeux → soin/crème → huile → SPF.

TON DES TEXTES DESTINÉS À L'UTILISATRICE (explanation, excluded[].reason, conseils) : ces textes sont lus tels quels dans l'app, jamais retravaillés. Parle uniquement le langage skincare — ingrédients, type de peau, état de peau, contexte du jour. N'expose JAMAIS le fonctionnement interne : pas de mention de "règle", "critère d'inclusion", "catégorie fonctionnelle", "1 produit par catégorie", "candidat", "algorithme" ou toute autre formulation qui révèle qu'une logique de sélection automatisée est derrière la routine. Explique un choix par ce qu'il apporte à SA peau ce jour-là, jamais par la règle qui l'a produit.

## MISSION 2 — CONSEILS LIÉS À LA ROUTINE

Génère 2 à 3 conseils qui expliquent les choix de la Mission 1.
- Toujours lier au contexte précis du jour (phase cycle, météo, état peau)
- Expliquer POURQUOI un produit a été choisi ou exclu, en termes skincare (jamais en citant une règle de sélection)
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
      "reason": "<raison courte, en langage skincare — jamais de mention de règle/critère interne>"
    }
  ],
  "explanation": "<phrase expliquant les ajustements principaux en langage skincare, jamais de mention de règle/critère interne — null si aucun produit exclu>",
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

    // Fallback : uniquement si Claude a produit une réponse invalide (routine non-vide dans
    // le JSON mais aucun ID ne correspond à un produit connu → parsing/hallucination, pas un
    // choix légitime). Un routine[] réellement vide (aucun produit jugé pertinent) est un
    // résultat valide qu'on ne doit pas écraser en réintroduisant tous les produits.
    const claudeRoutineWasEmpty = Array.isArray(result.routine) && result.routine.length === 0;
    const finalRoutine = routineItems.length > 0 || claudeRoutineWasEmpty
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

    // ── 9. Sauvegarder daily_advice_log — DELETE + INSERT systématique ───────
    await supabase
      .from("daily_advice_log")
      .delete()
      .eq("user_id", user_id)
      .eq("date", today);

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
