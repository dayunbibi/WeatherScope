const OPENWEATHER_BASE = "https://api.openweathermap.org/data/2.5";
const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";

function send(res, status, body) {
  res.status(status).json(body);
}

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.message || `Upstream request failed (${response.status}).`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return send(res, 405, { message: "Method not allowed." });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return send(res, 500, {
      message: "Server configuration is missing OPENWEATHER_API_KEY.",
    });
  }

  const city = typeof req.query.city === "string" ? req.query.city.trim() : "";
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lon);

  if (!city && !hasCoordinates) {
    return send(res, 400, { message: "Provide a city or valid coordinates." });
  }

  const locationParams = hasCoordinates
    ? new URLSearchParams({ lat: String(lat), lon: String(lon) })
    : new URLSearchParams({ q: city });

  locationParams.set("appid", apiKey);
  locationParams.set("units", "metric");

  try {
    const currentWeather = await fetchJson(
      `${OPENWEATHER_BASE}/weather?${locationParams.toString()}`
    );

    const resolvedLat = currentWeather.coord?.lat;
    const resolvedLon = currentWeather.coord?.lon;

    const coordinateParams = new URLSearchParams({
      lat: String(resolvedLat),
      lon: String(resolvedLon),
      appid: apiKey,
      units: "metric",
    });

    const uvParams = new URLSearchParams({
      latitude: String(resolvedLat),
      longitude: String(resolvedLon),
      current: "uv_index",
      timezone: "auto",
    });

    const [forecast, airPollution, uvData] = await Promise.all([
      fetchJson(`${OPENWEATHER_BASE}/forecast?${coordinateParams.toString()}`),
      fetchJson(`${OPENWEATHER_BASE}/air_pollution?${coordinateParams.toString()}`),
      fetchJson(`${OPEN_METEO_BASE}?${uvParams.toString()}`),
    ]);

    return send(res, 200, {
      currentWeather,
      forecast,
      airQuality: airPollution.list?.[0] || null,
      uvIndex: uvData.current?.uv_index ?? null,
    });
  } catch (error) {
    const status = error.status === 404 ? 404 : error.status === 401 ? 502 : 500;
    const message =
      status === 404
        ? "That location could not be found. Check the spelling."
        : status === 502
          ? "The weather service rejected the server API key."
          : error.message || "Unable to load weather data.";

    return send(res, status, { message });
  }
}
