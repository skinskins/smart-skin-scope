import { useState, useEffect } from "react";

interface WeatherData {
  temp: number;
  humidity: number;
  uv: number;
  pollution: string;
}

// Montreuil, France coordinates
const LAT = 48.8638;
const LON = 2.4432;

const getAirQualityLabel = (aqi: number): string => {
  if (aqi <= 20) return "Excellent";
  if (aqi <= 40) return "Bon";
  if (aqi <= 60) return "Moyen";
  if (aqi <= 80) return "Médiocre";
  return "Mauvais";
};

export const useWeatherData = () => {
  const [weather, setWeather] = useState<WeatherData>({ temp: 0, humidity: 0, uv: 0, pollution: "..." });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Fetch weather + air quality in parallel
        const [weatherRes, airRes] = await Promise.all([
          fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m&daily=uv_index_max&timezone=Europe/Paris&forecast_days=1`
          ),
          fetch(
            `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${LAT}&longitude=${LON}&current=european_aqi`
          ),
        ]);

        const weatherData = await weatherRes.json();
        const airData = await airRes.json();

        setWeather({
          temp: Math.round(weatherData.current.temperature_2m),
          humidity: Math.round(weatherData.current.relative_humidity_2m),
          uv: Math.round(weatherData.daily.uv_index_max[0]),
          pollution: getAirQualityLabel(airData.current?.european_aqi ?? 0),
        });
      } catch (error) {
        console.error("Failed to fetch weather data:", error);
        setWeather({ temp: 0, humidity: 0, uv: 0, pollution: "N/A" });
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    // Refresh every 15 minutes
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { weather, loading };
};
