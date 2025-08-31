export async function reverseGeocodeToAreaText(latitude: number, longitude: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      latitude,
    )}&lon=${encodeURIComponent(longitude)}&zoom=14&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'StimaSense/1.0 (reverse-geocoding)'
      }
    });
    if (!res.ok) return '';
    const data = await res.json();
    const addr = data?.address || {};
    const parts: string[] = [];
    // Prefer fine-grained area first
    if (addr.neighbourhood) parts.push(addr.neighbourhood);
    if (addr.suburb) parts.push(addr.suburb);
    if (addr.village) parts.push(addr.village);
    if (addr.town) parts.push(addr.town);
    if (addr.city) parts.push(addr.city);
    if (addr.county) parts.push(addr.county);
    const area = parts.filter(Boolean).join(', ');
    return area || (data?.name || data?.display_name || '');
  } catch (_) {
    return '';
  }
}


