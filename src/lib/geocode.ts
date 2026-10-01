export interface ResolvedLocation {
  name: string;
  country: string;
}

export async function resolveCityName(lat: number, lon: number): Promise<ResolvedLocation | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const address = data?.address;
    if (!address) return null;
    // zoom=10 targets city-level granularity so we don't surface a neighborhood/district name
    const city = address.city ?? address.town ?? address.village ?? address.municipality ?? address.county;
    if (!city) return null;
    return { name: city, country: address.country ?? "" };
  } catch {
    return null;
  }
}

export function formatResolvedLocation(location: ResolvedLocation): string {
  return [location.name, location.country].filter(Boolean).join(", ");
}
