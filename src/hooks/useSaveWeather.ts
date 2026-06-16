import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWeatherData } from "@/hooks/useWeatherData";

export const useSaveWeather = (manualLocation?: string) => {
  const { weather, loading } = useWeatherData(manualLocation);

  useEffect(() => {
    console.log("[useSaveWeather] hook triggered, weather:", weather);
    if (weather.locationName === "...") return;
    const save = async () => {
      console.log("[useSaveWeather] weather chargé:", weather);
      const { data: { session } } = await supabase.auth.getSession();
      console.log("[useSaveWeather] session:", !!session, "user_id:", session?.user?.id ?? "null");
      if (!session) return;
      const today = new Date().toISOString().split("T")[0];
      const hour = new Date().getHours();
      const isPeakWindow = hour >= 11 && hour < 15;

      // Hors 11h-15h : garder l'uv_index de pic s'il existe déjà
      let uvIndex: number = weather.uv;
      if (!isPeakWindow) {
        const { data: existing } = await (supabase as any)
          .from("daily_weather")
          .select("uv_index")
          .eq("user_id", session.user.id)
          .eq("date", today)
          .maybeSingle();
        if (existing?.uv_index != null) uvIndex = existing.uv_index;
      }

      const payload = {
        user_id:         session.user.id,
        date:            today,
        temp_c:          weather.temp,
        uv_index:        uvIndex,
        aqi_score:       weather.aqiScore,
        pollution_label: weather.pollution,
        humidity:        weather.humidity,
        location:        weather.locationName,
      };
      console.log("[useSaveWeather] payload:", payload);

      const { data, error } = await (supabase as any)
        .from("daily_weather")
        .upsert(payload, { onConflict: "user_id,date" });
      console.log("[useSaveWeather] result:", data, "error:", JSON.stringify(error));
    };
    save();
  }, [weather]);

  return { weather, loading };
};
