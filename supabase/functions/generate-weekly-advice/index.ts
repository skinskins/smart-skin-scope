import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Renvoie le lundi (YYYY-MM-DD) de la semaine d'une date donnee
function getMonday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

// Plafond de régénérations MANUELLES (force:true) par semaine — la génération automatique
// de début de semaine (force:false, aucun conseil encore présent) ne compte pas dedans,
// elle est toujours autorisée une fois. Ça évite qu'un clic répété sur "Mettre à jour mes
// conseils" ne fasse exploser les coûts Claude et ne recrédite les scans à l'infini.
const MAX_MANUAL_REGENS_PER_WEEK = 2;

// Cette fonction reset scan_credits_remaining (ressource limitée) en étape 10 — on ne peut
// donc pas faire confiance à un user_id envoyé dans le body (même règle que product-scan) :
// n'importe qui pourrait sinon se recréditer à volonté via force:true, ou regénérer les
// conseils d'une autre utilisatrice. On dérive l'identité du JWT de session à la place.
async function resolveAuthenticatedUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  if (!SUPABASE_URL || !ANON_KEY) return null;

  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await authClient.auth.getUser();
  if (error || !data?.user) return null;
  return data.user.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { force } = await req.json();

    const user_id = await resolveAuthenticatedUserId(req);
    if (!user_id) {
      return new Response(JSON.stringify({ error: "Authentification requise" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date().toISOString().split("T")[0];
    const weekStart = getMonday(today);

    console.log(`[generate-weekly-advice] user=${user_id} week=${weekStart} force=${!!force}`);

    // ── 1. Deja des conseils hebdo pour cette semaine ? ────────────────────
    const { data: existingWeek } = await supabase
      .from("weekly_advice_log")
      .select("id")
      .eq("user_id", user_id)
      .eq("week_start", weekStart)
      .limit(1);

    if (existingWeek && existingWeek.length > 0 && !force) {
      console.log(`[generate-weekly-advice] user=${user_id} → cached`);
      const { data: current } = await supabase
        .from("weekly_advice_log")
        .select("*")
        .eq("user_id", user_id)
        .eq("week_start", weekStart)
        .order("priority", { ascending: true });
      return new Response(JSON.stringify({ cached: true, conseils: current }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 1bis. Plafond de régénérations MANUELLES pour la semaine ────────────
    const { data: regenProfile } = await supabase
      .from("profiles")
      .select("weekly_advice_regen_count, weekly_advice_regen_week")
      .eq("id", user_id)
      .single();

    const manualRegensUsedThisWeek =
      regenProfile?.weekly_advice_regen_week === weekStart
        ? (regenProfile?.weekly_advice_regen_count ?? 0)
        : 0;

    if (
      existingWeek && existingWeek.length > 0 && force &&
      manualRegensUsedThisWeek >= MAX_MANUAL_REGENS_PER_WEEK
    ) {
      console.log(`[generate-weekly-advice] user=${user_id} → rate-limited (${manualRegensUsedThisWeek}/${MAX_MANUAL_REGENS_PER_WEEK})`);
      return new Response(
        JSON.stringify({
          error: `Limite de ${MAX_MANUAL_REGENS_PER_WEEK} mises à jour atteinte pour cette semaine — reviens la semaine prochaine.`,
          regens_remaining: 0,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Si force : supprimer les anciens conseils de la semaine avant de regenerer
    if (force) {
      await supabase
        .from("weekly_advice_log")
        .delete()
        .eq("user_id", user_id)
        .eq("week_start", weekStart);
    }

    // ── 2. Profil ──────────────────────────────────────────────────────────
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("age, cycle_phase, skin_type, skin_problems, skin_goals, carnation, default_factors")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) throw new Error("Profil introuvable");

    // ── 3. Derniere analyse de peau ─────────────────────────────────────────
    const { data: lastPhoto } = await supabase
      .from("skin_photos")
      .select("date, analysis_json")
      .eq("user_id", user_id)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const basedOnPhoto = !!lastPhoto?.analysis_json;

    // ── 4. Produits actifs ──────────────────────────────────────────────────
    const { data: products } = await supabase
      .from("user_products")
      .select("product_name, brand, product_type, ingredients, morning_use, evening_use")
      .eq("user_id", user_id)
      .eq("is_active", true);

    const cosmetics = (products ?? []).filter((p) => p.product_type !== "device");

    // ── 5. Blocs de prompt ──────────────────────────────────────────────────
    const skinAnalysis = lastPhoto?.analysis_json as Record<string, any> | undefined;

    const skinStateBlock = skinAnalysis
      ? `- Eclat global : ${skinAnalysis.eclat_global}/10
- Hydratation : ${skinAnalysis.hydratation?.score}/4${skinAnalysis.hydratation?.zones ? ` (${skinAnalysis.hydratation.zones})` : ""}
- Erytheme : ${skinAnalysis.erytheme?.score}/4${skinAnalysis.erytheme?.zones ? ` (${skinAnalysis.erytheme.zones})` : ""}
- Acne : ${skinAnalysis.acne?.score}/4 (type : ${skinAnalysis.acne?.type ?? "non renseigne"})
- Sebum : zone T ${skinAnalysis.sebum?.zone_t}/5, zone U ${skinAnalysis.sebum?.zone_u}/5
- Texture : pores front ${skinAnalysis.texture?.pores_front}/4, pores joues ${skinAnalysis.texture?.pores_joues}/4
- Pigmentation : ${skinAnalysis.pigmentation?.uniformite ?? "non renseignee"}, type ${skinAnalysis.pigmentation?.type ?? "non renseigne"}
- Rides : periorbital ${skinAnalysis.rides?.periorbital}/5, front ${skinAnalysis.rides?.front}/5
- Phototype : ${skinAnalysis.fitzpatrick ?? "non renseigne"} — Glogau : ${skinAnalysis.glogau ?? "non renseigne"}${skinAnalysis.points_attention?.length ? `\n- Points d'attention : ${skinAnalysis.points_attention.join(", ")}` : ""}`
      : "- Aucune analyse de peau disponible cette semaine (mode degrade : base-toi sur le profil declare)";

    const productsBlock = cosmetics.length > 0
      ? cosmetics.map((p) => {
          const moments = [p.morning_use ? "matin" : null, p.evening_use ? "soir" : null].filter(Boolean).join(" + ");
          return `- ${p.product_name} (${p.brand}) — ${p.product_type}${moments ? ` [${moments}]` : ""}${p.ingredients ? `\n  INCI : ${p.ingredients}` : ""}`;
        }).join("\n")
      : "- Aucun produit enregistre";

    const prompt = `Tu es l'assistant skincare expert d'une application premium francaise.
Nous sommes en debut de semaine. Genere le PLAN DE LA SEMAINE : 2 a 3 conseils PILIERS structurants qui vont guider l'utilisatrice pendant les 7 prochains jours.

## PROFIL
- Age : ${profile.age ?? "non renseigne"}
- Phase du cycle : ${profile.cycle_phase ?? "non renseignee"}
- Carnation : ${profile.carnation ?? "non renseignee"}
- Type de peau : ${profile.skin_type ?? "non renseigne"}
- Problemes : ${Array.isArray(profile.skin_problems) ? profile.skin_problems.join(", ") : profile.skin_problems ?? "non renseignes"}
- Objectifs : ${Array.isArray(profile.skin_goals) ? profile.skin_goals.join(", ") : profile.skin_goals ?? "non renseignes"}

## ETAT DE PEAU${lastPhoto?.date ? ` (analyse du ${lastPhoto.date})` : ""}
${skinStateBlock}

## PRODUITS EN ROUTINE (avec moments d'application)
${productsBlock}

## TON OBJECTIF
Genere 2 a 3 conseils PILIERS pour la semaine qui :
1. Definissent les PRIORITES de la semaine selon l'etat de peau observe
2. Evaluent, parmi les produits possedes listes ci-dessus, lesquels sont reellement adaptes a son type de peau, ses problemes et ses objectifs — possede un produit ne veut pas dire qu'il lui convient
3. S'appuient sur les ingredients actifs des produits pertinents (cite les actifs precis : niacinamide, retinol, acide hyaluronique, etc.) et signalent clairement si un produit possede ne convient pas ou est a utiliser avec prudence, plutot que de l'ignorer silencieusement
4. Tiennent compte de la phase du cycle
5. Sont structurants (une direction pour la semaine, pas un geste ponctuel)
6. Restent actionnables et experts

## REGLES
- STRICTEMENT 2 ou 3 conseils, jamais plus, jamais moins — priorise et regroupe plutot que d'en ajouter un quatrieme
- JAMAIS de conseils de base (pas "buvez de l'eau", pas "demaquillez-vous")
- Ces femmes sont expertes — va au-dela des fondamentaux
- Cite les ACTIFS des produits possedes quand c'est pertinent pour son profil — ne cite pas un produit juste parce qu'elle le possede s'il n'apporte rien a ses priorites de la semaine
- Bienveillant, jamais condescendant ni alarmiste
- Ne recommande jamais de marques a acheter
- Parle uniquement le langage skincare (ingredients, type de peau, contexte) — ne mentionne jamais tes propres criteres/regles de generation ("criteres d'inclusion", "regle", "pertinence au profil"...) ni le fonctionnement interne de l'app

## TYPE DE CHAQUE CONSEIL
En plus de la priorite, classe chaque conseil par type (nature du conseil, different de la priorite) :
- "observation" : constat sur l'etat de la peau, sans action urgente
- "astuce" : conseil actionnable positif, une astuce experte a appliquer
- "alerte" : point de vigilance a surveiller cette semaine (peut evoluer, pas grave dans l'immediat)
- "warning" : point qui necessite une vraie attention/action cette semaine (le plus prioritaire)
Varie les types entre les conseils plutot que de tout mettre dans la meme categorie.

## FORMAT DE SORTIE
Reponds UNIQUEMENT en JSON valide, sans texte autour :
{
  "conseils": [
    {
      "priorite": "haute" | "moyenne" | "basse",
      "type": "observation" | "astuce" | "alerte" | "warning",
      "titre": "Priorite de la semaine, phrase courte",
      "corps": "Explication du pourquoi, lien avec l'etat de peau et les actifs disponibles",
      "action": "La direction concrete a suivre cette semaine"
    }
  ]
}`;

    // ── 6. Appel Claude ─────────────────────────────────────────────────────
    console.log(`[generate-weekly-advice] user=${user_id} → génération (basedOnPhoto=${basedOnPhoto}, produits=${cosmetics.length})`);
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY non configuree");

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

    // ── 7. Monitoring tokens ────────────────────────────────────────────────
    const usage = claudeData.usage;
    await supabase.from("api_usage").insert({
      user_id,
      input_tokens: usage?.input_tokens ?? 0,
      output_tokens: usage?.output_tokens ?? 0,
      total_tokens: (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0),
      fonction: "generate-weekly-advice",
    }).then(({ error }) => {
      if (error) console.warn("api_usage warning:", error.message);
    });

    // ── 8. Parser ───────────────────────────────────────────────────────────
    const rawContent = claudeData.content?.[0]?.text;
    if (!rawContent) throw new Error("Reponse Claude vide");
    const cleaned = rawContent.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(cleaned);

    // ── 9. Sauvegarder dans weekly_advice_log ───────────────────────────────
    const VALID_GROUPS = ["observation", "astuce", "alerte", "warning"];
    const MAX_ADVICE_COUNT = 3;
    const rows = parsed.conseils
      .map((c: {
        priorite: string; type?: string; titre: string; corps: string; action: string;
      }) => ({
        user_id,
        week_start: weekStart,
        advice_title: c.titre,
        advice_text: c.corps,
        advice_tip: c.action,
        priority: c.priorite === "haute" ? "1" : c.priorite === "moyenne" ? "2" : "3",
        advice_group: VALID_GROUPS.includes(c.type ?? "") ? c.type : "astuce",
        based_on_photo: basedOnPhoto,
      }))
      // Filet de sécurité : le prompt demande 2-3 conseils max, mais rien ne garantit que
      // Claude respecte la consigne — on garde les plus prioritaires si jamais il en renvoie plus.
      .sort((a: { priority: string }, b: { priority: string }) => Number(a.priority) - Number(b.priority))
      .slice(0, MAX_ADVICE_COUNT);

    const { error: insertError } = await supabase
      .from("weekly_advice_log")
      .insert(rows);

    if (insertError) throw new Error(`Insert weekly_advice_log: ${insertError.message}`);
    console.log(`[generate-weekly-advice] user=${user_id} → ${rows.length} conseils insérés`);

    // ── 10. Reset des crédits de scan hebdo + compteur de régénérations MANUELLES ──
    // Indexé sur CETTE génération individuelle (pas un cron calendaire global) :
    // chaque exécution réussie de generate-weekly-advice repart à 5 crédits pour
    // l'utilisatrice concernée, quelle que soit la date. Les crédits non utilisés
    // sont perdus (use-it-or-lose-it), pas de rollover. On ne reset pas sur le
    // chemin "cached" plus haut, puisqu'aucune génération n'a alors eu lieu.
    // Le compteur de régénérations, lui, n'avance QUE sur un force:true — la génération
    // automatique de début de semaine reste gratuite et illimitée (une seule par semaine
    // de toute façon, grâce au cache existingWeek).
    const manualRegensUsedNow = force ? manualRegensUsedThisWeek + 1 : manualRegensUsedThisWeek;
    const { error: creditResetError } = await supabase
      .from("profiles")
      .update({
        scan_credits_remaining: 5,
        last_weekly_advice_at: new Date().toISOString(),
        weekly_advice_regen_count: manualRegensUsedNow,
        weekly_advice_regen_week: weekStart,
      })
      .eq("id", user_id);
    if (creditResetError) {
      console.warn("[generate-weekly-advice] scan credits reset warning:", creditResetError.message);
    }

    const { data: inserted } = await supabase
      .from("weekly_advice_log")
      .select("id, advice_title, advice_text, advice_tip, priority, advice_group, based_on_photo")
      .eq("user_id", user_id)
      .eq("week_start", weekStart)
      .order("priority", { ascending: true });

    return new Response(
      JSON.stringify({
        cached: false,
        conseils: inserted ?? [],
        based_on_photo: basedOnPhoto,
        regens_remaining: Math.max(0, MAX_MANUAL_REGENS_PER_WEEK - manualRegensUsedNow),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[generate-weekly-advice] error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});