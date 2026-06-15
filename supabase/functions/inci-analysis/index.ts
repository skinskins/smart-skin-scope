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
    const { eveningProducts, morningProducts, cyclePhase, uvIndex, tempC, skinType, factors } = await req.json() as {
      eveningProducts: ProductInput[];
      morningProducts: ProductInput[];
      cyclePhase: string | null;
      uvIndex: number | null;
      tempC: number | null;
      skinType: string | null;
      factors: string[];
    };

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const isEvening = eveningProducts.length > 0;
    const activeProducts = isEvening ? eveningProducts : morningProducts;
    const contextProducts = isEvening ? morningProducts : eveningProducts;
    const period = isEvening ? "soir" : "matin";

    const activeList = activeProducts
      .map(p => {
        const line = `- ${p.product_name}${p.brand ? ` (${p.brand})` : ""}`;
        return p.ingredients ? `${line}\n  INCI : ${p.ingredients}` : line;
      })
      .join("\n") || "Aucun produit";

    const contextList = contextProducts.length > 0
      ? contextProducts.map(p => `- ${p.product_name}${p.brand ? ` (${p.brand})` : ""}`).join("\n")
      : "aucun";

    const prompt = `Tu es dermatologue. Voici la routine du ${period} prévue pour une patiente.

ROUTINE DU ${period.toUpperCase()} :
${activeList}

CONTEXTE PATIENT :
- Type de peau : ${skinType ?? "non renseigné"}
- Phase du cycle : ${cyclePhase ?? "non renseignée"}
- Température extérieure : ${tempC != null ? `${tempC}°C` : "non disponible"}
- Indice UV : ${uvIndex != null ? uvIndex : "non disponible"}
- Facteurs notés aujourd'hui : ${factors.length > 0 ? factors.join(", ") : "aucun"}
- Produits utilisés ce ${isEvening ? "matin" : "soir"} : ${contextList}

Analyse cette routine comme tu le ferais pour une vraie patiente. Identifie ce qui devrait être ajusté pour CE contexte précis : redondances, textures inadaptées à la météo, actifs trop forts pour la phase du cycle, associations déconseillées, etc.

Pour chaque produit de la liste, décide :
- "remove" si le produit est inadapté à ce contexte et doit être retiré aujourd'hui
- "keep" si le produit convient

Retourne UNIQUEMENT ce JSON (sans texte autour) :
{
  "adjustments": [
    { "product_name": string, "action": "remove" | "keep", "reason": string }
  ]
}
Inclure tous les produits de la liste. Raisons courtes, ton bienveillant.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
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
