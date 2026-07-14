const REQUEST_TIMEOUT_MS = 12000;

async function fetchJson(url) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "The weather request failed.");
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The request timed out. Check your connection and retry.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function fetchWeatherDashboardByCity(city) {
  const normalizedCity = city.trim();
  if (!normalizedCity) throw new Error("Enter a city name.");

  return fetchJson(`/api/weather?city=${encodeURIComponent(normalizedCity)}`);
}

export function fetchWeatherDashboardByCoords(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Location coordinates are invalid.");
  }

  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
  });

  return fetchJson(`/api/weather?${params.toString()}`);
}
export function fetchLocationSuggestions(query) {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    return Promise.resolve([]);
  }

  return fetchJson(
    `/api/locations?q=${encodeURIComponent(normalizedQuery)}`
  ).then((data) => data.locations || []);
}