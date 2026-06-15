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
    const { user_id, imageBase64, age: ageParam } = await req.json();

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

    const today = new Date().toISOString().split("T")[0];

    // ── 1. Si user connecté : vérifier cache ──────────────────────────────
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
    const prompt = `Tu es un expert en analyse cutanée clinique. Analyse cette photo de visage et génère UNIQUEMENT un diagnostic objectif de l'état de la peau, sans recommandations ni conseils.

CONTEXTE :
- Âge déclaré : ${age} ans

INSTRUCTIONS QUALITÉ :
Avant d'analyser, évalue la qualité de la photo :
- Éclairage insuffisant → rejette
- Visage flou ou trop loin → rejette
- Maquillage épais visible → rejette
- Angle de profil (pas de face) → rejette

Si rejetée, réponds UNIQUEMENT :
{"photo_quality":"rejected","rejection_reason":"message court en français avec conseil pratique"}

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
    "acne": {
      "score": "0-4",
      "type": "aucune | comédons | papules | pustules | mixte",
      "zones": "description courte ou null"
    },
    "points_forts": ["point positif 1", "point positif 2"],
    "points_attention": ["observation clinique 1", "observation clinique 2"],
    "observations_libres": "2-3 phrases cliniques objectives et bienveillantes"
  }
}`;

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
      return new Response(
        JSON.stringify({ rejected: true, reason: parsed.rejection_reason }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 6. Sauvegarde (seulement si user connecté) ────────────────────────
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

      console.log("[skin-analysis] Analyse sauvegardée ✅");
    }

    return new Response(
      JSON.stringify({ cached: false, analysis: parsed.analyse }),
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