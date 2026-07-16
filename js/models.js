export const celsiusToFahrenheit = (value) =>
  (value * 9) / 5 + 32;

export const metersPerSecondToMph = (value) =>
  value * 2.23694;

export function formatTemperature(value, unit) {
  const converted =
    unit === "imperial"
      ? celsiusToFahrenheit(value)
      : value;

  return `${Math.round(converted)}°${
    unit === "imperial" ? "F" : "C"
  }`;
}

export function formatWind(value, unit) {
  return unit === "imperial"
    ? `${metersPerSecondToMph(value).toFixed(1)} mph`
    : `${value.toFixed(1)} m/s`;
}

export class WeatherData {
  constructor(apiData, airQuality, uvIndex) {
    if (!apiData?.main || !apiData?.weather?.[0]) {
      throw new Error(
        "The weather service returned incomplete data."
      );
    }

    this.city = apiData.name || "Unknown city";
    this.country = apiData.sys?.country || "";

    this.latitude = apiData.coord?.lat ?? null;
    this.longitude = apiData.coord?.lon ?? null;

    this.temperature = apiData.main.temp;
    this.feelsLike = apiData.main.feels_like;
    this.minimumTemperature = apiData.main.temp_min;
    this.maximumTemperature = apiData.main.temp_max;

    this.humidity = apiData.main.humidity;
    this.pressure = apiData.main.pressure;

    this.windSpeed = apiData.wind?.speed ?? 0;

    this.description =
      apiData.weather[0].description ||
      "Not available";

    this.iconCode =
      apiData.weather[0].icon || "";

    this.timezoneOffsetSeconds =
      apiData.timezone ?? 0;

    this.sunriseTimestamp =
      apiData.sys?.sunrise ?? null;

    this.sunsetTimestamp =
      apiData.sys?.sunset ?? null;

    this.aqi =
      airQuality?.main?.aqi ?? null;

    this.pm25 =
      airQuality?.components?.pm2_5 ?? null;

    this.uvIndex =
      Number.isFinite(uvIndex)
        ? uvIndex
        : null;
  }

  get locationName() {
    return this.country
      ? `${this.city}, ${this.country}`
      : this.city;
  }

  get iconUrl() {
    return this.iconCode
      ? `https://openweathermap.org/img/wn/${this.iconCode}@2x.png`
      : "";
  }

  get aqiLabel() {
  const labels = [
    "Unknown",
    "Good",
    "Fair",
    "Moderate",
    "Poor",
    "Very Poor",
  ];

  return labels[this.aqi || 0] || "Unknown";
}

get aqiClass() {
  const classes = [
    "unknown",
    "good",
    "fair",
    "moderate",
    "poor",
    "very-poor",
  ];

  return classes[this.aqi || 0] || "unknown";
}

get formattedPm25() {
  if (!Number.isFinite(this.pm25)) {
    return "Unavailable";
  }

  return `${this.pm25.toFixed(1)} μg/m³`;
}

  get uvLabel() {
    if (this.uvIndex === null) {
      return "Unavailable";
    }

    if (this.uvIndex < 3) {
      return "Low";
    }

    if (this.uvIndex < 6) {
      return "Moderate";
    }

    if (this.uvIndex < 8) {
      return "High";
    }

    if (this.uvIndex < 11) {
      return "Very high";
    }

    return "Extreme";
  }

  get sunriseTime() {
    return this.formatCityTime(
      this.sunriseTimestamp
    );
  }

  get sunsetTime() {
    return this.formatCityTime(
      this.sunsetTimestamp
    );
  }

  get isNight() {
    if (
      !Number.isFinite(this.sunriseTimestamp) ||
      !Number.isFinite(this.sunsetTimestamp)
    ) {
      return this.iconCode.endsWith("n");
    }

    const currentUtcSeconds =
      Math.floor(Date.now() / 1000);

    return (
      currentUtcSeconds < this.sunriseTimestamp ||
      currentUtcSeconds > this.sunsetTimestamp
    );
  }

  formatLocalDateTime() {
    const utcNow =
      Date.now() +
      new Date().getTimezoneOffset() * 60_000;

    const cityDate = new Date(
      utcNow +
        this.timezoneOffsetSeconds * 1000
    );

    return new Intl.DateTimeFormat("en-CA", {
      weekday: "long",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    }).format(cityDate);
  }

  formatCityTime(timestamp) {
    if (!Number.isFinite(timestamp)) {
      return "Unavailable";
    }

    const cityDate = new Date(
      (timestamp +
        this.timezoneOffsetSeconds) *
        1000
    );

    return new Intl.DateTimeFormat("en-CA", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    }).format(cityDate);
  }
}

export function createHourlyForecast(apiData) {
  const offset =
    apiData.city?.timezone ?? 0;

  return (apiData.list || [])
    .slice(0, 8)
    .map((entry) => ({
      timestamp: entry.dt,

      temperature:
        entry.main.temp,

      description:
        entry.weather?.[0]?.description ||
        "Not available",

      iconUrl:
        entry.weather?.[0]?.icon
          ? `https://openweathermap.org/img/wn/${entry.weather[0].icon}@2x.png`
          : "",

      time: new Intl.DateTimeFormat(
        "en-CA",
        {
          hour: "numeric",
          hour12: true,
          timeZone: "UTC",
        }
      ).format(
        new Date(
          (entry.dt + offset) * 1000
        )
      ),
    }));
}

export function createFiveDayForecast(apiData) {
  const offset =
    apiData.city?.timezone ?? 0;

  const today = new Date(
    (Date.now() / 1000 + offset) * 1000
  )
    .toISOString()
    .slice(0, 10);

  const groups = new Map();

  for (const entry of apiData.list || []) {
    const key = new Date(
      (entry.dt + offset) * 1000
    )
      .toISOString()
      .slice(0, 10);

    if (key === today) {
      continue;
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(entry);
  }

  return [...groups.entries()]
    .slice(0, 5)
    .map(([dateKey, entries]) => {
      const representative =
        entries.reduce(
          (best, entry) => {
            const hour = new Date(
              (entry.dt + offset) * 1000
            ).getUTCHours();

            const bestHour = new Date(
              (best.dt + offset) * 1000
            ).getUTCHours();

            return Math.abs(hour - 12) <
              Math.abs(bestHour - 12)
              ? entry
              : best;
          }
        );

      return {
        dateKey,

        minimumTemperature:
          Math.min(
            ...entries.map(
              (entry) =>
                entry.main.temp_min
            )
          ),

        maximumTemperature:
          Math.max(
            ...entries.map(
              (entry) =>
                entry.main.temp_max
            )
          ),

        description:
          representative.weather?.[0]
            ?.description ||
          "Not available",

        iconUrl:
          representative.weather?.[0]
            ?.icon
            ? `https://openweathermap.org/img/wn/${representative.weather[0].icon}@2x.png`
            : "",

        day: new Intl.DateTimeFormat(
          "en-CA",
          {
            weekday: "short",
            timeZone: "UTC",
          }
        ).format(
          new Date(
            `${dateKey}T12:00:00Z`
          )
        ),

        date: new Intl.DateTimeFormat(
          "en-CA",
          {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          }
        ).format(
          new Date(
            `${dateKey}T12:00:00Z`
          )
        ),
      };
    });
}

export function createWeatherRecommendations(weather) {
  const recommendations = [];

  const description = String(
    weather.description || ""
  )
    .trim()
    .toLowerCase();

  const temperature = Number(
    weather.temperature
  );

  const feelsLike = Number(
    weather.feelsLike
  );

  const windSpeed = Number(
    weather.windSpeed
  );

  const humidity = Number(
    weather.humidity
  );

  const uvIndex = Number.isFinite(
    weather.uvIndex
  )
    ? weather.uvIndex
    : null;

  const aqi = Number.isFinite(weather.aqi)
    ? weather.aqi
    : null;

  const isRainy =
    description.includes("rain") ||
    description.includes("drizzle");

  const isStormy =
    description.includes("storm") ||
    description.includes("thunder");

  const isSnowy =
    description.includes("snow");

  const isFoggy =
    description.includes("fog") ||
    description.includes("mist") ||
    description.includes("haze") ||
    description.includes("smoke");

  const isCloudy =
    description.includes("cloud");

  const isVeryCold = feelsLike <= 0;
  const isCold =
    feelsLike > 0 && feelsLike <= 10;
  const isCool =
    feelsLike > 10 && feelsLike <= 17;
  const isMild =
    feelsLike > 17 && feelsLike <= 23;
  const isWarm =
    feelsLike > 23 && feelsLike <= 29;
  const isHot = feelsLike > 29;

  /* ================= CLOTHING ================= */

  if (isVeryCold) {
    recommendations.push({
      icon: "🧥",
      title: "Clothing",
      text:
        "Wear a heavy coat, warm layers, gloves, and a scarf.",
    });
  } else if (isCold) {
    recommendations.push({
      icon: "🧥",
      title: "Clothing",
      text:
        "A warm jacket with long sleeves is recommended.",
    });
  } else if (isCool) {
    recommendations.push({
      icon: "🧶",
      title: "Clothing",
      text:
        "Wear a light jacket, sweater, or layered outfit.",
    });
  } else if (isMild) {
    recommendations.push({
      icon: "👕",
      title: "Clothing",
      text:
        "A T-shirt with a light outer layer should be comfortable.",
    });
  } else if (isWarm) {
    recommendations.push({
      icon: "👕",
      title: "Clothing",
      text:
        "Light, breathable clothing is recommended.",
    });
  } else if (isHot) {
    recommendations.push({
      icon: "🩳",
      title: "Clothing",
      text:
        "Choose loose, lightweight clothing and avoid heavy layers.",
    });
  }

  /* ================= UMBRELLA ================= */

  if (isStormy) {
    recommendations.push({
      icon: "⛈️",
      title: "Rain Safety",
      text:
        "Thunderstorms are possible. Carry an umbrella and avoid exposed outdoor areas.",
    });
  } else if (isRainy) {
    recommendations.push({
      icon: "☂️",
      title: "Umbrella",
      text:
        "Take an umbrella or waterproof jacket before heading out.",
    });
  } else if (isSnowy) {
    recommendations.push({
      icon: "🥾",
      title: "Snow",
      text:
        "Wear waterproof footwear and watch for slippery surfaces.",
    });
  } else {
    recommendations.push({
      icon: "🌤️",
      title: "Umbrella",
      text:
        "No umbrella appears necessary based on the current conditions.",
    });
  }

  /* ================= UV ================= */

  if (uvIndex === null) {
    recommendations.push({
      icon: "☀️",
      title: "UV Protection",
      text:
        "UV data is unavailable. Use basic sun protection during daylight hours.",
    });
  } else if (uvIndex < 3) {
    recommendations.push({
      icon: "🙂",
      title: "UV Protection",
      text:
        "UV exposure is low. Basic protection is usually sufficient.",
    });
  } else if (uvIndex < 6) {
    recommendations.push({
      icon: "🕶️",
      title: "UV Protection",
      text:
        "Use sunglasses and consider sunscreen during longer outdoor activities.",
    });
  } else if (uvIndex < 8) {
    recommendations.push({
      icon: "🧴",
      title: "UV Protection",
      text:
        "High UV levels. Apply sunscreen and wear sunglasses or a hat.",
    });
  } else if (uvIndex < 11) {
    recommendations.push({
      icon: "🧴",
      title: "UV Protection",
      text:
        "Very high UV. Use SPF 30+ sunscreen and limit prolonged midday exposure.",
    });
  } else {
    recommendations.push({
      icon: "⚠️",
      title: "UV Protection",
      text:
        "Extreme UV. Minimize direct sun exposure and use strong protection.",
    });
  }

  /* ================= WIND ================= */

  if (windSpeed >= 15) {
    recommendations.push({
      icon: "🌬️",
      title: "Wind",
      text:
        "Very strong winds are present. Avoid unsecured outdoor objects and exposed areas.",
    });
  } else if (windSpeed >= 10) {
    recommendations.push({
      icon: "💨",
      title: "Wind",
      text:
        "Strong winds may make outdoor conditions uncomfortable.",
    });
  } else if (windSpeed >= 6) {
    recommendations.push({
      icon: "🍃",
      title: "Wind",
      text:
        "Moderate wind is expected. A light wind-resistant layer may help.",
    });
  } else {
    recommendations.push({
      icon: "🍃",
      title: "Wind",
      text:
        "Wind conditions are relatively calm.",
    });
  }

  /* ================= HYDRATION ================= */

  if (isHot || humidity >= 75) {
    recommendations.push({
      icon: "💧",
      title: "Hydration",
      text:
        "Drink extra water, especially during outdoor activity.",
    });
  } else if (isWarm) {
    recommendations.push({
      icon: "🥤",
      title: "Hydration",
      text:
        "Keep water nearby if you plan to stay outside for an extended period.",
    });
  }

  /* ================= AIR QUALITY ================= */

  if (aqi === null) {
    recommendations.push({
      icon: "🌿",
      title: "Air Quality",
      text:
        "Air-quality data is unavailable for this location.",
    });
  } else if (aqi <= 2) {
    recommendations.push({
      icon: "🌿",
      title: "Air Quality",
      text:
        "Air quality is generally suitable for normal outdoor activities.",
    });
  } else if (aqi === 3) {
    recommendations.push({
      icon: "😐",
      title: "Air Quality",
      text:
        "Sensitive individuals may prefer shorter or lighter outdoor activity.",
    });
  } else if (aqi === 4) {
    recommendations.push({
      icon: "😷",
      title: "Air Quality",
      text:
        "Poor air quality. Reduce prolonged or intense outdoor activity.",
    });
  } else {
    recommendations.push({
      icon: "⚠️",
      title: "Air Quality",
      text:
        "Very poor air quality. Consider staying indoors when possible.",
    });
  }

  /* ================= OUTDOOR ACTIVITY ================= */

  let outdoorScore = 10;

  if (isStormy) {
    outdoorScore -= 6;
  } else if (isRainy || isSnowy) {
    outdoorScore -= 3;
  }

  if (isFoggy) {
    outdoorScore -= 2;
  }

  if (feelsLike < 5 || feelsLike > 32) {
    outdoorScore -= 3;
  } else if (
    feelsLike < 12 ||
    feelsLike > 28
  ) {
    outdoorScore -= 1;
  }

  if (windSpeed >= 15) {
    outdoorScore -= 3;
  } else if (windSpeed >= 10) {
    outdoorScore -= 2;
  }

  if (uvIndex !== null && uvIndex >= 8) {
    outdoorScore -= 2;
  }

  if (aqi !== null && aqi >= 4) {
    outdoorScore -= 3;
  } else if (aqi === 3) {
    outdoorScore -= 1;
  }

  outdoorScore = Math.max(
    0,
    Math.min(10, outdoorScore)
  );

  let outdoorText =
    "Outdoor conditions are mixed today.";

  let outdoorIcon = "🚶";

  if (outdoorScore >= 8) {
    outdoorText =
      "Excellent conditions for walking, cycling, or light outdoor exercise.";
    outdoorIcon = "🚴";
  } else if (outdoorScore >= 6) {
    outdoorText =
      "Generally good outdoor conditions, with a few minor precautions.";
    outdoorIcon = "🚶";
  } else if (outdoorScore >= 4) {
    outdoorText =
      "Outdoor activity is possible, but conditions may be less comfortable.";
    outdoorIcon = "🧢";
  } else if (outdoorScore >= 2) {
    outdoorText =
      "Limit prolonged outdoor activity and check conditions before leaving.";
    outdoorIcon = "🏠";
  } else {
    outdoorText =
      "Indoor activities are recommended until conditions improve.";
    outdoorIcon = "⚠️";
  }

  recommendations.push({
    icon: outdoorIcon,
    title: `Outdoor Score: ${outdoorScore}/10`,
    text: outdoorText,
  });

  /* ================= VISIBILITY ================= */

  if (isFoggy) {
    recommendations.push({
      icon: "🌫️",
      title: "Visibility",
      text:
        "Reduced visibility is possible. Use extra caution while driving or cycling.",
    });
  }

  /* ================= PET WALK ================= */

  if (
    isStormy ||
    feelsLike <= -5 ||
    feelsLike >= 32 ||
    aqi >= 4
  ) {
    recommendations.push({
      icon: "🐾",
      title: "Pet Walk",
      text:
        "Keep pet walks short and avoid the most uncomfortable conditions.",
    });
  } else if (
    feelsLike >= 10 &&
    feelsLike <= 27 &&
    !isRainy
  ) {
    recommendations.push({
      icon: "🐕",
      title: "Pet Walk",
      text:
        "Conditions appear suitable for a normal pet walk.",
    });
  }

  return recommendations;
}