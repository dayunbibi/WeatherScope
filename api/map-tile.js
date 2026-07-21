const ALLOWED_LAYERS = new Set([
  "temp_new",
  "precipitation_new",
  "wind_new",
  "clouds_new",
  "pressure_new",
]);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed." });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: "Missing OPENWEATHER_API_KEY." });
  }

  const layer = String(req.query.layer || "");
  const z = Number(req.query.z);
  const x = Number(req.query.x);
  const y = Number(req.query.y);

  if (!ALLOWED_LAYERS.has(layer)) {
    return res.status(400).json({ message: "Unsupported map layer." });
  }

  if (![z, x, y].every(Number.isInteger)) {
    return res.status(400).json({ message: "Invalid tile coordinates." });
  }

  try {
    const url = `https://tile.openweathermap.org/map/${layer}/${z}/${x}/${y}.png?appid=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({ message: "Unable to load map tile." });
    }

    const tile = Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=900, s-maxage=900, stale-while-revalidate=3600");
    return res.status(200).send(tile);
  } catch {
    return res.status(500).json({ message: "Unable to load map tile." });
  }
}
