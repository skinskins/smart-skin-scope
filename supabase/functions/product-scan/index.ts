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
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Image requise" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const prompt = `Analyse cette photo de produit cosmétique et extrais les informations suivantes.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après :
{
  "product_name": "<nom exact du produit>",
  "brand": "<marque>",
  "product_type": "<nettoyant|sérum|hydratant|spf|contour-yeux|masque|tonique|huile|autre>",
  "ingredients": ["<ingrédient INCI 1>", "<ingrédient INCI 2>"]
}
Si une information n'est pas visible sur la photo, utilise null.
Les ingredients ne sont à extraire que s'ils sont clairement lisibles sur le packaging.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: "image/jpeg", data: imageBase64 },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[product-scan] Anthropic status:", response.status);
      console.error("[product-scan] Anthropic body:", errText);
      throw new Error(`Anthropic API error: ${response.status} ${errText}`);
    }

    console.log("[product-scan] Anthropic status:", response.status);
    const aiData = await response.json();
    console.log("[product-scan] Anthropic full response:", JSON.stringify(aiData, null, 2));
    const rawContent = aiData.content?.[0]?.text;
    if (!rawContent) throw new Error("Réponse IA vide");

    let jsonStr = rawContent.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const result = JSON.parse(jsonStr);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("product-scan error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
