import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { imageBase64, formData } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Image requise" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Tu es un expert en dermatologie esthétique. Analyse cette photo de peau d'un point de vue ESTHÉTIQUE (pas médical).

Données utilisateur:
- Qualité sommeil: ${formData?.sleep ?? 7}/10
- Hydratation: ${formData?.hydration ?? 7}/10
- Cycle menstruel: ${formData?.cycle ?? "non renseigné"}
- Pollution: ${formData?.pollution ?? 5}/10
- Humidité air: ${formData?.humidity ?? 50}%
- Indice UV: ${formData?.uv ?? 3}/10

IMPORTANT: Tu DOIS répondre UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, respectant exactement cette structure:

{
  "globalScore": <nombre 0-100>,
  "summary": "<résumé général en 1-2 phrases>",
  "zones": [
    {
      "id": "forehead",
      "label": "Front",
      "score": <0-100>,
      "status": "<good|warning|alert>",
      "trend": "stable",
      "summary": "<résumé court de la zone>",
      "detail": "<analyse détaillée 2-3 phrases>",
      "tips": ["<conseil 1>", "<conseil 2>", "<conseil 3>"]
    },
    {
      "id": "left-cheek",
      "label": "Joue gauche",
      "score": <0-100>,
      "status": "<good|warning|alert>",
      "trend": "stable",
      "summary": "<résumé>",
      "detail": "<détail>",
      "tips": ["<conseil>"]
    },
    {
      "id": "right-cheek",
      "label": "Joue droite",
      "score": <0-100>,
      "status": "<good|warning|alert>",
      "trend": "stable",
      "summary": "<résumé>",
      "detail": "<détail>",
      "tips": ["<conseil>"]
    },
    {
      "id": "tzone",
      "label": "Zone T / Nez",
      "score": <0-100>,
      "status": "<good|warning|alert>",
      "trend": "stable",
      "summary": "<résumé>",
      "detail": "<détail>",
      "tips": ["<conseil>"]
    },
    {
      "id": "chin",
      "label": "Menton",
      "score": <0-100>,
      "status": "<good|warning|alert>",
      "trend": "stable",
      "summary": "<résumé>",
      "detail": "<détail>",
      "tips": ["<conseil>"]
    },
    {
      "id": "jaw",
      "label": "Mâchoire",
      "score": <0-100>,
      "status": "<good|warning|alert>",
      "trend": "stable",
      "summary": "<résumé>",
      "detail": "<détail>",
      "tips": ["<conseil>"]
    }
  ],
  "correlations": ["<corrélation sommeil/peau>", "<corrélation UV/peau>"],
  "ingredients": ["<ingrédient recommandé 1>", "<ingrédient recommandé 2>", "<ingrédient recommandé 3>"]
}

Règles pour les scores:
- good: score >= 70
- warning: score 50-69
- alert: score < 50
- Sois honnête et précis dans l'évaluation visuelle
- Les tips doivent être des recommandations concrètes avec des ingrédients spécifiques`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`,
                  },
                },
                {
                  type: "text",
                  text: prompt,
                },
              ],
            },
          ],
          max_tokens: 2000,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes, réessayez dans un instant." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés. Rechargez dans Paramètres > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error("Réponse IA vide");
    }

    // Parse the JSON from the AI response (strip markdown fences if present)
    let jsonStr = rawContent.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const analysisResult = JSON.parse(jsonStr);

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("skin-analysis error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
