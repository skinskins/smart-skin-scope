import { useState, useEffect } from "react";

interface WeatherData {
  temp: number;
  humidity: number;
  uv: number;
  pollution: string;
  aqiScore: number;
  locationName: string;
}

const getAirQualityLabel = (aqi: number): string => {
  if (aqi <= 2) return "Bon";
  if (aqi <= 3) return "Moyen";
  if (aqi <= 4) return "Médiocre";
  return "Mauvais";
};

const getCoords = (): Promise<{ lat: number; lon: number }> => {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => reject()
    );
  });
};

export const useWeatherData = (queryLocation?: string) => {
  const [weather, setWeather] = useState<WeatherData>({
    temp: 0,
    humidity: 0,
    uv: 0,
    pollution: "...",
    aqiScore: 0,
    locationName: "...",
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchWeather = async () => {
      setLoading(true);

      try {
        let q = "Paris"; // fallback Paris

        if (queryLocation) {
          q = encodeURIComponent(queryLocation);
        } else {
          try {
            const coords = await getCoords();
            q = `${coords.lat},${coords.lon}`;
          } catch {
            console.log("Geolocation refusée → fallback Paris");
          }
        }

        const res = await fetch(
          `https://api.weatherapi.com/v1/current.json?key=b83edd2e98054a7fa91100224260704&q=${q}&aqi=yes`
        );

        if (!res.ok) {
          throw new Error("Lieu non trouvé ou erreur API");
        }

        const data = await res.json();

        if (!isMounted) return;

        // map weatherapi us-epa index (1-6) to a simulated 0-500 scale for aqi?
        // or just pass it directly if we assume aqi > 80 means AQI scale (0-500) 
        // Weatherapi us-epa-index: 1=Good, 2=Moderate, 3=Unhealthy for sensitive, 4=Unhealthy, 5=Very Unhealthy, 6=Hazardous
        // We can map 1 -> 25, 2 -> 75, 3 -> 125, 4 -> 175, 5 -> 250, 6 -> 350
        const epaIndex = data.current.air_quality?.["us-epa-index"] ?? 1;
        let mappedAqi = 0;
        if (epaIndex <= 1) mappedAqi = 25;
        else if (epaIndex === 2) mappedAqi = 75;
        else if (epaIndex === 3) mappedAqi = 125;
        else if (epaIndex === 4) mappedAqi = 175;
        else if (epaIndex >= 5) mappedAqi = 250;

        setWeather({
          temp: Math.round(data.current.temp_c),
          humidity: data.current.humidity,
          uv: data.current.uv,
          pollution: getAirQualityLabel(epaIndex),
          aqiScore: mappedAqi,
          locationName: data.location.name,
        });
      } catch (err) {
        console.error("Weather error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [queryLocation]);

  return { weather, loading };
};