export interface ResolvedLocation {
  name: string;
  region: string;
  country: string;
}

export async function resolveCityName(lat: number, lon: number): Promise<ResolvedLocation | null> {
  try {
    const res = await fetch(
      `https://api.weatherapi.com/v1/search.json?key=b83edd2e98054a7fa91100224260704&q=${lat},${lon}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const first = Array.isArray(data) ? data[0] : null;
    if (!first?.name) return null;
    return { name: first.name, region: first.region ?? "", country: first.country ?? "" };
  } catch {
    return null;
  }
}

export function formatResolvedLocation(location: ResolvedLocation): string {
  return [location.name, location.country].filter(Boolean).join(", ");
}
