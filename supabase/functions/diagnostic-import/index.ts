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
    const { pdfBase64 } = await req.json();

    if (!pdfBase64) {
      return new Response(JSON.stringify({ error: "pdfBase64 requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY non configurée");

    const prompt = `Tu es un expert en analyse cutanée clinique. Tu reçois le rapport PDF généré par une machine de diagnostic de peau professionnelle (type Observ, Visia, ou équivalent).

Analyse ce rapport et extrais les métriques de peau pertinentes.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, au format suivant :
{
  "source": "<nom de la machine ou de la marque détecté dans le rapport, ex: Observ, Visia. Si non identifiable, utilise \\"Diagnostic professionnel\\">",
  "raw_metrics": {
    "hydratation": { "score": "0-4", "commentaire": "..." },
    "sebum": { "zone_t": "1-5", "zone_u": "1-5", "commentaire": "..." },
    "pores": { "score": "1-4", "zones": "..." },
    "taches": { "score": "0-4", "type": "pigmentaires | UV | mixte | aucune", "commentaire": "..." },
    "rougeurs": { "score": "0-4", "commentaire": "..." },
    "rides": { "score": "0-5", "zones": "..." },
    "eclat_global": "1-10",
    "autres_observations": "synthèse libre des autres métriques présentes dans le rapport"
  },
  "summary": "résumé en 2-3 phrases, en français, bienveillant et clair pour l'utilisatrice"
}

Convertis les échelles propres à la machine vers les échelles ci-dessus de la manière la plus fidèle possible.
Si une métrique n'est pas présente dans le rapport, garde la clé avec une valeur null.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "pdfs-2024-09-25",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[diagnostic-import] Anthropic status:", response.status);
      console.error("[diagnostic-import] Anthropic body:", errText);
      throw new Error(`Anthropic API error: ${response.status} ${errText}`);
    }

    const aiData = await response.json();
    const rawContent = aiData.content?.[0]?.text;
    if (!rawContent) throw new Error("Réponse IA vide");

    const cleaned = rawContent.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const result = JSON.parse(cleaned);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[diagnostic-import] error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
