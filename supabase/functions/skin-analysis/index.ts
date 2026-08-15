import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Messages figés côté serveur (plutôt que rédigés librement par Claude) pour les deux
// cas de rejet les plus fréquents, afin d'avoir une formulation soignée et constante.
// Les autres rejets (éclairage, flou, maquillage, angle) gardent le message généré
// dynamiquement par le modèle.
const REJECTION_MESSAGES: Record<string, string> = {
  sunglasses: "Retire tes lunettes  pour une analyse fiable de ton visage.",
  no_face: "On ne détecte pas ton visage sur cette photo, recadre-toi bien de face, à bonne distance de la caméra.",
};

// Renvoie le lundi (YYYY-MM-DD) de la semaine d'une date donnee — cohérent avec les autres
// fonctions puisqu'on tourne en UTC côté serveur (pas de piège de fuseau ici).
function getMonday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

const MAX_SKIN_SCANS_PER_WEEK = 2;

// Le cache/plafond de scans protège un userId : on ne peut donc pas faire confiance au
// user_id envoyé dans le body (même règle que product-scan / generate-weekly-advice). On
// dérive l'identité du JWT de session quand il y en a un ; l'appel pendant l'onboarding
// (avant création de compte) n'a pas de session — dans ce cas on reste en mode anonyme,
// sans cache ni plafond ni sauvegarde (comportement historique).
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
    const { imageBase64, age: ageParam } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY non configurée");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const user_id = await resolveAuthenticatedUserId(req);
    const today = new Date().toISOString().split("T")[0];

    // ── 1. Si user connecté : vérifier cache + plafond hebdo ──────────────
    let scansUsedThisWeek = 0;
    const weekStart = getMonday(today);
    if (user_id) {
      const { data: existing } = await supabase
        .from("skin_photos")
        .select("id, analysis_json")
        .eq("user_id", user_id)
        .eq("date", today)
        .single();

      if (existing?.analysis_json) {
        console.log("[skin-analysis] Analyse déjà faite aujourd'hui ✅");
        return new Response(
          JSON.stringify({ cached: true, analysis: existing.analysis_json }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("skin_scan_count, skin_scan_week")
        .eq("id", user_id)
        .single();
      scansUsedThisWeek = profile?.skin_scan_week === weekStart ? (profile?.skin_scan_count ?? 0) : 0;

      if (scansUsedThisWeek >= MAX_SKIN_SCANS_PER_WEEK) {
        return new Response(
          JSON.stringify({
            error: `Limite de ${MAX_SKIN_SCANS_PER_WEEK} analyses de peau atteinte pour cette semaine — reviens la semaine prochaine.`,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── 2. Récupérer l'âge ────────────────────────────────────────────────
    let age = ageParam ?? "non renseigné";
    if (user_id && age === "non renseigné") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("age")
        .eq("id", user_id)
        .single();
      age = profile?.age ?? "non renseigné";
    }

    // ── 3. Détecter le format de l'image ──────────────────────────────────
    const mediaType = imageBase64.startsWith("/9j/")
      ? "image/jpeg"
      : imageBase64.startsWith("iVBORw0KGgo")
        ? "image/png"
        : "image/webp";

    // ── 4. Appel Claude Vision ─────────────────────────────────────────────
    const prompt = `Tu es un expert en analyse cutanée clinique et dermatologie. Analyse cette photo de visage et génère UNIQUEMENT un diagnostic objectif de l'état de la peau, sans recommandations ni conseils.

CONTEXTE :
- Âge déclaré : ${age} ans

INSTRUCTIONS QUALITÉ :
Avant d'analyser, évalue la qualité de la photo :
- Lunettes (de vue ou de soleil) portées, yeux masqués → rejette avec le code "sunglasses"
- Aucun visage détecté sur la photo → rejette avec le code "no_face"
- Éclairage insuffisant → rejette avec le code "lighting"
- Visage flou ou trop loin → rejette avec le code "blur"
- Maquillage épais visible → rejette avec le code "makeup"
- Angle de profil (pas de face) → rejette avec le code "angle"

Si rejetée, réponds UNIQUEMENT :
{"photo_quality":"rejected","rejection_code":"sunglasses|no_face|lighting|blur|makeup|angle","rejection_reason":"message court en français avec conseil pratique (utilisé seulement si le code n'est pas sunglasses/no_face)"}

Si acceptable, réponds UNIQUEMENT avec ce JSON sans texte autour :
{
  "photo_quality": "ok",
  "analyse": {
    "fitzpatrick": "I | II | III | IV | V | VI",
    "carnation_detectee": "très claire | claire | beige dorée | olive-caramel | foncée | ébène",
    "type_peau_detecte": "normale | sèche | grasse | mixte | sensible",
    "age_peau_estime": "nombre entier (peut différer de l'âge réel)",
    "glogau": "I | II | III | IV",
    "eclat_global": "1-10",
    "texture": {
      "pores_front": "1-4",
      "pores_joues": "1-4",
      "microrelief": "lisse | légèrement irrégulier | irrégulier | très irrégulier"
    },
    "rides": {
      "periorbital": "0-5",
      "front": "0-5",
      "periorale": "0-5"
    },
    "pigmentation": {
      "uniformite": "uniforme | légèrement inégale | inégale | très inégale",
      "type": "aucune | taches solaires | hyperpigmentation post-inflammatoire | mélasma | mixte",
      "zones": "description courte ou null"
    },
    "erytheme": {
      "score": "0-4",
      "zones": "description courte ou null"
    },
    "sebum": {
      "zone_t": "1-5",
      "zone_u": "1-5"
    },
    "hydratation": {
      "score": "0-4",
      "zones": "description courte ou null"
    },
    "cernes": {
      "score": "Sévérité des cernes (coloration bleutée/brunâtre ou creux sous les yeux, distincte des rides periorbitales). 0 = absents, 4 = très marqués",
      "zones": "description courte ou null"
    },
    "acne": {
      "score": "0-4",
      "type": "aucune | comédons | papules | pustules | mixte",
      "zones": "description courte ou null"
    },
    "conditions_detectees": {
      "eczema": "Cherche activement : plaques sèches délimitées, desquamation, lichénification (peau épaissie), rougeurs localisées différentes de l'acné, zones affectées typiques (joues, contour yeux, cou). Retourne true si présent, false sinon.",
      "eczema_zones": "zones visibles ou null",
      "rosacea": "Cherche : rougeur diffuse centro-faciale, télangiectasies (petits vaisseaux visibles), papules sans comédons, flush chronique. true | false",
      "rosacea_zones": "zones visibles ou null",
      "dermite_seborrheique": "Cherche : squames jaunâtres front/ailes du nez/sourcils, peau grasse localisée. true | false",
      "perioral_dermatitis": "Cherche : petites papules/pustules regroupées autour de la bouche ou du nez. true | false",
      "milium": "Cherche : petits kystes blancs 1-2mm, souvent contour yeux. true | false",
      "hypersensibilite_reactive": "Peau visiblement réactive, capillaires dilatés, aspect fragile généralisé. true | false"
    },
    "points_forts": ["point positif 1", "point positif 2"],
    "points_attention": ["observation clinique 1", "observation clinique 2"],
    "observations_libres": "2-3 phrases cliniques objectives et bienveillantes"
  }
}

IMPORTANT pour conditions_detectees : sois précis et n'hésite pas à détecter même une légère manifestation. Une plaque sèche localisée sur la joue avec contours nets = eczéma probable. Mieux vaut signaler et laisser l'utilisatrice confirmer que de passer à côté d'une condition importante pour sa routine.`;

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
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageBase64 },
            },
            { type: "text", text: prompt },
          ],
        }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      throw new Error(`Claude API error: ${claudeRes.status} ${err}`);
    }

    const claudeData = await claudeRes.json();
    const raw = claudeData.content?.[0]?.text?.trim() ?? "";
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("Réponse Claude invalide");
    const parsed = JSON.parse(raw.slice(start, end + 1));

    // ── 5. Photo rejetée ──────────────────────────────────────────────────
    if (parsed.photo_quality === "rejected") {
      const reason = REJECTION_MESSAGES[parsed.rejection_code] ?? parsed.rejection_reason;
      return new Response(
        JSON.stringify({ rejected: true, reason }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 6. Sauvegarde (seulement si user connecté) ────────────────────────
    let skinScansRemaining: number | null = null;
    if (user_id) {
      const photoBytes = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
      const storagePath = `${user_id}/${today}.jpg`;

      await supabase.storage
        .from("skin-photos")
        .upload(storagePath, photoBytes, { contentType: "image/jpeg", upsert: true });

      const { error: insertError } = await supabase
        .from("skin_photos")
        .upsert({
          user_id,
          date: today,
          storage_path: storagePath,
          analysis_json: parsed.analyse,
        }, { onConflict: "user_id,date" });

      if (insertError) throw new Error(`Insert error: ${insertError.message}`);

      const usage = claudeData.usage;
      await supabase.from("api_usage").insert({
        user_id,
        input_tokens: usage?.input_tokens ?? 0,
        output_tokens: usage?.output_tokens ?? 0,
        total_tokens: (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0),
        fonction: "skin-analysis",
      });

      // Décompte du plafond hebdo seulement maintenant que l'analyse est acceptée et
      // sauvegardée — une photo rejetée (mauvaise qualité) ne consomme pas de scan.
      skinScansRemaining = Math.max(0, MAX_SKIN_SCANS_PER_WEEK - (scansUsedThisWeek + 1));
      await supabase
        .from("profiles")
        .update({ skin_scan_count: scansUsedThisWeek + 1, skin_scan_week: weekStart })
        .eq("id", user_id);

      console.log("[skin-analysis] Analyse sauvegardée ✅");
    }

    return new Response(
      JSON.stringify({ cached: false, analysis: parsed.analyse, skin_scans_remaining: skinScansRemaining }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[skin-analysis] error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});