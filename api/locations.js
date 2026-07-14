const OPENWEATHER_GEOCODING_URL =
  "https://api.openweathermap.org/geo/1.0/direct";

function send(res, status, body) {
  res.status(status).json(body);
}

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json().catch(() => []);

  if (!response.ok) {
    const error = new Error(
      data?.message || `Geocoding request failed (${response.status}).`
    );

    error.status = response.status;

    throw error;
  }

  return data;
}

function normalizeLocation(location) {
  return {
    name: location.name || "",
    state: location.state || "",
    country: location.country || "",
    latitude: location.lat,
    longitude: location.lon,
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");

    return send(res, 405, {
      message: "Method not allowed.",
    });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return send(res, 500, {
      message: "Server configuration is missing OPENWEATHER_API_KEY.",
    });
  }

  const query =
    typeof req.query.q === "string"
      ? req.query.q.trim()
      : "";

  if (query.length < 2) {
    return send(res, 200, {
      locations: [],
    });
  }

  const params = new URLSearchParams({
    q: query,
    limit: "5",
    appid: apiKey,
  });

  try {
    const locations = await fetchJson(
      `${OPENWEATHER_GEOCODING_URL}?${params.toString()}`
    );

    return send(res, 200, {
      locations: locations
        .map(normalizeLocation)
        .filter(
          (location) =>
            location.name &&
            Number.isFinite(location.latitude) &&
            Number.isFinite(location.longitude)
        ),
    });
  } catch (error) {
    const status =
      error.status === 401
        ? 502
        : 500;

    const message =
      status === 502
        ? "The location service rejected the server API key."
        : error.message || "Unable to search locations.";

    return send(res, status, {
      message,
    });
  }
}