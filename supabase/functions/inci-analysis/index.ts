import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ProductInput = {
  product_name: string;
  brand?: string | null;
  ingredients?: string | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eveningProducts, morningProducts, cyclePhase, uvIndex } = await req.json() as {
      eveningProducts: ProductInput[];
      morningProducts: ProductInput[];
      cyclePhase: string | null;
      uvIndex: number | null;
    };

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const eveningList = eveningProducts
      .map(p => {
        const line = `- ${p.product_name}${p.brand ? ` (${p.brand})` : ""}`;
        return p.ingredients ? `${line}\n  INCI : ${p.ingredients}` : line;
      })
      .join("\n");

    const morningList =
      morningProducts.length > 0
        ? morningProducts.map(p => `- ${p.product_name}${p.brand ? ` (${p.brand})` : ""}`).join("\n")
        : "Aucun produit utilisé ce matin";

    const prompt = `Tu es un expert en cosmétologie et dermatologie.
Voici les produits que cette utilisatrice va appliquer ce soir :
${eveningList}

Contexte :
- Phase cycle : ${cyclePhase ?? "non renseignée"}
- UV aujourd'hui : ${uvIndex != null ? uvIndex : "non disponible"}
- Produits utilisés ce matin : ${morningList}

Analyse les incompatibilités (actifs antagonistes, risques liés à la phase cycle ou aux UV) et retourne UNIQUEMENT ce JSON :
{
  "incompatibilities": [
    {
      "product_name": string,
      "verdict": "danger" | "warning",
      "reason": string,
      "rule": string
    }
  ]
}
Si aucune incompatibilité → retourner {"incompatibilities": []}`;

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
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[inci-analysis] Anthropic status:", response.status, errText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const aiData = await response.json();
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
    console.error("inci-analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
