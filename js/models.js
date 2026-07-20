export const celsiusToFahrenheit = (
  value
) => (value * 9) / 5 + 32;

export const metersPerSecondToMph = (
  value
) => value * 2.23694;

export function formatTemperature(
  value,
  unit
) {
  const converted =
    unit === "imperial"
      ? celsiusToFahrenheit(
          value
        )
      : value;

  return `${Math.round(
    converted
  )}°${
    unit === "imperial"
      ? "F"
      : "C"
  }`;
}

export function formatWind(
  value,
  unit
) {
  return unit === "imperial"
    ? `${metersPerSecondToMph(
        value
      ).toFixed(1)} mph`
    : `${value.toFixed(
        1
      )} m/s`;
}

/* ================= WEATHER ICONS ================= */

export function getWeatherIconName(
  iconCode
) {
  const iconMap = {
    "01d": "sunny",
    "01n": "clear_night",

    "02d": "partly_cloudy_day",
    "02n": "partly_cloudy_night",

    "03d": "cloud",
    "03n": "cloud",

    "04d": "cloud",
    "04n": "cloud",

    "09d": "rainy",
    "09n": "rainy",

    "10d": "rainy",
    "10n": "rainy",

    "11d": "thunderstorm",
    "11n": "thunderstorm",

    "13d": "weather_snowy",
    "13n": "weather_snowy",

    "50d": "foggy",
    "50n": "foggy",
  };

  return (
    iconMap[iconCode] ||
    "cloud"
  );
}

/* ================= CURRENT WEATHER MODEL ================= */

export class WeatherData {
  constructor(
    apiData,
    airQuality,
    uvIndex
  ) {
    if (
      !apiData?.main ||
      !apiData?.weather?.[0]
    ) {
      throw new Error(
        "The weather service returned incomplete data."
      );
    }

    this.city =
      apiData.name ||
      "Unknown city";

    this.country =
      apiData.sys?.country ||
      "";

    this.latitude =
      apiData.coord?.lat ??
      null;

    this.longitude =
      apiData.coord?.lon ??
      null;

    this.temperature =
      apiData.main.temp;

    this.feelsLike =
      apiData.main.feels_like;

    this.minimumTemperature =
      apiData.main.temp_min;

    this.maximumTemperature =
      apiData.main.temp_max;

    this.humidity =
      apiData.main.humidity;

    this.pressure =
      apiData.main.pressure;

    this.windSpeed =
      apiData.wind?.speed ??
      0;
      
      this.visibility =
  apiData.visibility ??
  null;

    this.description =
      apiData.weather[0]
        .description ||
      "Not available";

    this.iconCode =
      apiData.weather[0]
        .icon || "";

    this.timezoneOffsetSeconds =
      apiData.timezone ?? 0;

    this.sunriseTimestamp =
      apiData.sys?.sunrise ??
      null;

    this.sunsetTimestamp =
      apiData.sys?.sunset ??
      null;

    this.aqi =
      airQuality?.main?.aqi ??
      null;

    this.pm25 =
      airQuality?.components
        ?.pm2_5 ?? null;

    this.uvIndex =
      Number.isFinite(
        uvIndex
      )
        ? uvIndex
        : null;
  }

  get locationName() {
    return this.country
      ? `${this.city}, ${this.country}`
      : this.city;
  }

  get iconName() {
    return getWeatherIconName(
      this.iconCode
    );
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

    return (
      labels[
        this.aqi || 0
      ] || "Unknown"
    );
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

    return (
      classes[
        this.aqi || 0
      ] || "unknown"
    );
  }

  get formattedPm25() {
    if (
      !Number.isFinite(
        this.pm25
      )
    ) {
      return "Unavailable";
    }

    return `${this.pm25.toFixed(
      1
    )} μg/m³`;
  }

  get uvLabel() {
    if (
      this.uvIndex === null
    ) {
      return "Unavailable";
    }

    if (
      this.uvIndex < 3
    ) {
      return "Low";
    }

    if (
      this.uvIndex < 6
    ) {
      return "Moderate";
    }

    if (
      this.uvIndex < 8
    ) {
      return "High";
    }

    if (
      this.uvIndex < 11
    ) {
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
      !Number.isFinite(
        this.sunriseTimestamp
      ) ||
      !Number.isFinite(
        this.sunsetTimestamp
      )
    ) {
      return this.iconCode.endsWith(
        "n"
      );
    }

    const currentUtcSeconds =
      Math.floor(
        Date.now() / 1000
      );

    return (
      currentUtcSeconds <
        this.sunriseTimestamp ||
      currentUtcSeconds >
        this.sunsetTimestamp
    );
  }

  formatLocalDateTime() {
    const utcNow =
      Date.now() +
      new Date()
        .getTimezoneOffset() *
        60_000;

    const cityDate =
      new Date(
        utcNow +
          this
            .timezoneOffsetSeconds *
            1000
      );

    return new Intl.DateTimeFormat(
      "en-CA",
      {
        weekday: "long",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC",
      }
    ).format(cityDate);
  }

  formatCityTime(
    timestamp
  ) {
    if (
      !Number.isFinite(
        timestamp
      )
    ) {
      return "Unavailable";
    }

    const cityDate =
      new Date(
        (timestamp +
          this
            .timezoneOffsetSeconds) *
          1000
      );

    return new Intl.DateTimeFormat(
      "en-CA",
      {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC",
      }
    ).format(cityDate);
  }
}

/* ================= HOURLY FORECAST ================= */

export function createHourlyForecast(
  apiData
) {
  const offset =
    apiData.city?.timezone ??
    0;

  return (
    apiData.list || []
  )
    .slice(0, 8)
    .map((entry) => ({
      timestamp: entry.dt,

      temperature:
        entry.main.temp,

      description:
        entry.weather?.[0]
          ?.description ||
        "Not available",

      iconName:
        getWeatherIconName(
          entry.weather?.[0]
            ?.icon || ""
        ),

      time:
        new Intl.DateTimeFormat(
          "en-CA",
          {
            hour: "numeric",
            hour12: true,
            timeZone: "UTC",
          }
        ).format(
          new Date(
            (entry.dt +
              offset) *
              1000
          )
        ),
    }));
}

/* ================= FIVE-DAY FORECAST ================= */

export function createFiveDayForecast(
  apiData
) {
  const offset =
    apiData.city?.timezone ??
    0;

  const today =
    new Date(
      (Date.now() / 1000 +
        offset) *
        1000
    )
      .toISOString()
      .slice(0, 10);

  const groups =
    new Map();

  for (
    const entry of
    apiData.list || []
  ) {
    const key =
      new Date(
        (entry.dt +
          offset) *
          1000
      )
        .toISOString()
        .slice(0, 10);

    if (key === today) {
      continue;
    }

    if (
      !groups.has(key)
    ) {
      groups.set(
        key,
        []
      );
    }

    groups
      .get(key)
      .push(entry);
  }

  return [
    ...groups.entries(),
  ]
    .slice(0, 5)
    .map(
      ([
        dateKey,
        entries,
      ]) => {
        const representative =
          entries.reduce(
            (
              best,
              entry
            ) => {
              const hour =
                new Date(
                  (entry.dt +
                    offset) *
                    1000
                ).getUTCHours();

              const bestHour =
                new Date(
                  (best.dt +
                    offset) *
                    1000
                ).getUTCHours();

              return Math.abs(
                hour - 12
              ) <
                Math.abs(
                  bestHour -
                    12
                )
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
                  entry.main
                    .temp_min
              )
            ),

          maximumTemperature:
            Math.max(
              ...entries.map(
                (entry) =>
                  entry.main
                    .temp_max
              )
            ),

          description:
            representative
              .weather?.[0]
              ?.description ||
            "Not available",

          iconName:
            getWeatherIconName(
              representative
                .weather?.[0]
                ?.icon || ""
            ),

          day:
            new Intl.DateTimeFormat(
              "en-CA",
              {
                weekday:
                  "short",
                timeZone:
                  "UTC",
              }
            ).format(
              new Date(
                `${dateKey}T12:00:00Z`
              )
            ),

          date:
            new Intl.DateTimeFormat(
              "en-CA",
              {
                month:
                  "short",
                day:
                  "numeric",
                timeZone:
                  "UTC",
              }
            ).format(
              new Date(
                `${dateKey}T12:00:00Z`
              )
            ),
        };
      }
    );
}

/* ================= RECOMMENDATIONS ================= */

export function createWeatherRecommendations(
  weather
) {
  const recommendations =
    [];

  const description =
    String(
      weather.description ||
        ""
    )
      .trim()
      .toLowerCase();

  const feelsLike =
    Number(
      weather.feelsLike
    );

  const windSpeed =
    Number(
      weather.windSpeed
    );

  const humidity =
    Number(
      weather.humidity
    );

  const uvIndex =
    Number.isFinite(
      weather.uvIndex
    )
      ? weather.uvIndex
      : null;

  const aqi =
    Number.isFinite(
      weather.aqi
    )
      ? weather.aqi
      : null;

  const isRainy =
    description.includes(
      "rain"
    ) ||
    description.includes(
      "drizzle"
    );

  const isStormy =
    description.includes(
      "storm"
    ) ||
    description.includes(
      "thunder"
    );

  const isSnowy =
    description.includes(
      "snow"
    );

  const isFoggy =
    description.includes(
      "fog"
    ) ||
    description.includes(
      "mist"
    ) ||
    description.includes(
      "haze"
    ) ||
    description.includes(
      "smoke"
    );

  /* ================= CLOTHING ================= */

  let clothingText =
    "Light Layers";

  if (
    feelsLike <= 0
  ) {
    clothingText =
      "Heavy Coat";
  } else if (
    feelsLike <= 10
  ) {
    clothingText =
      "Warm Jacket";
  } else if (
    feelsLike <= 17
  ) {
    clothingText =
      "Light Jacket";
  } else if (
    feelsLike <= 23
  ) {
    clothingText =
      "Light Layers";
  } else if (
    feelsLike <= 29
  ) {
    clothingText =
      "Breathable Clothes";
  } else {
    clothingText =
      "Light Clothing";
  }

  recommendations.push({
    key: "clothing",
    icon: "fa-solid fa-shirt",
    title: "Clothing",
    text: clothingText,
  });

  /* ================= UMBRELLA ================= */

  let umbrellaText =
    "Not needed";

  if (isStormy) {
    umbrellaText =
      "Storm expected";
  } else if (isRainy) {
    umbrellaText =
      "Bring one";
  } else if (isSnowy) {
    umbrellaText =
      "Snow protection";
  }

  recommendations.push({
    key: "umbrella",
    icon: "fa-solid fa-umbrella",
    title: "Umbrella",
    text: umbrellaText,
  });

  /* ================= PET WALK ================= */

  const petWalkUnsafe =
    isStormy ||
    isSnowy ||
    feelsLike <= -5 ||
    feelsLike >= 32 ||
    windSpeed >= 15 ||
    (
      aqi !== null &&
      aqi >= 4
    );

  const petWalkIdeal =
    feelsLike >= 10 &&
    feelsLike <= 27 &&
    !isRainy &&
    !isSnowy &&
    !isStormy &&
    windSpeed < 10 &&
    (
      aqi === null ||
      aqi <= 2
    );

  let petWalkText =
    "Short walk";

  if (petWalkUnsafe) {
    petWalkText =
      "Stay indoors";
  } else if (
    petWalkIdeal
  ) {
    petWalkText =
      "Great time";
  } else if (isRainy) {
    petWalkText =
      "Keep it short";
  }

  recommendations.push({
    key: "petWalk",
    icon: "fa-solid fa-dog",
    title: "Pet Walk",
    text: petWalkText,
  });

  /* ================= ACTIVITY ================= */

  let outdoorScore = 10;

  if (isStormy) {
    outdoorScore -= 6;
  } else if (
    isRainy ||
    isSnowy
  ) {
    outdoorScore -= 3;
  }

  if (isFoggy) {
    outdoorScore -= 2;
  }

  if (
    feelsLike < 5 ||
    feelsLike > 32
  ) {
    outdoorScore -= 3;
  } else if (
    feelsLike < 12 ||
    feelsLike > 28
  ) {
    outdoorScore -= 1;
  }

  if (
    windSpeed >= 15
  ) {
    outdoorScore -= 3;
  } else if (
    windSpeed >= 10
  ) {
    outdoorScore -= 2;
  }

  if (
    uvIndex !== null &&
    uvIndex >= 8
  ) {
    outdoorScore -= 2;
  }

  if (
    aqi !== null &&
    aqi >= 4
  ) {
    outdoorScore -= 3;
  } else if (
    aqi === 3
  ) {
    outdoorScore -= 1;
  }

  outdoorScore =
    Math.max(
      0,
      Math.min(
        10,
        outdoorScore
      )
    );

  let activityText =
    "Use caution";

  if (
    outdoorScore >= 8
  ) {
    activityText =
      "Highly Recommended";
  } else if (
    outdoorScore >= 6
  ) {
    activityText =
      "Good conditions";
  } else if (
    outdoorScore >= 4
  ) {
    activityText =
      "Moderate conditions";
  } else if (
    outdoorScore >= 2
  ) {
    activityText =
      "Limit activity";
  } else {
    activityText =
      "Stay indoors";
  }

  recommendations.push({
    key: "activity",
    icon:
      "fa-solid fa-person-walking",
    title: "Activity",
    text: activityText,
  });

  /* ================= UV INDEX ================= */

  let uvText =
    "Data unavailable";

  if (
    uvIndex !== null
  ) {
    if (
      uvIndex < 3
    ) {
      uvText =
        "Low";
    } else if (
      uvIndex < 6
    ) {
      uvText =
        "Use Sunscreen";
    } else if (
      uvIndex < 8
    ) {
      uvText =
        "High - Use Sunscreen";
    } else if (
      uvIndex < 11
    ) {
      uvText =
        "Very High";
    } else {
      uvText =
        "Extreme";
    }
  }

  recommendations.push({
    key: "uvIndex",
    icon: "fa-solid fa-glasses",
    title: "UV Index",
    text: uvText,
  });

  /* ================= HYDRATION ================= */

  let hydrationText =
    "Stay hydrated";

  if (
    feelsLike >= 29 ||
    humidity >= 75
  ) {
    hydrationText =
      "Drink more water";
  } else if (
    feelsLike >= 23
  ) {
    hydrationText =
      "Keep water nearby";
  }

  recommendations.push({
    key: "hydration",
    icon:
      "fa-solid fa-glass-water",
    title: "Hydration",
    text: hydrationText,
  });

  /* ================= CAR WASH ================= */

  let carWashText =
    "Good day for it";

  if (isStormy) {
    carWashText =
      "Avoid today";
  } else if (isRainy) {
    carWashText =
      "Rain expected";
  } else if (isSnowy) {
    carWashText =
      "Wait for dry weather";
  } else if (isFoggy) {
    carWashText =
      "Better later";
  }

  recommendations.push({
    key: "carWash",
    icon: "fa-solid fa-car",
    title: "Car Wash",
    text: carWashText,
  });

  /* ================= VENTILATION ================= */

  let ventilationText =
    "Open windows";

  if (
    aqi !== null &&
    aqi >= 4
  ) {
    ventilationText =
      "Keep windows closed";
  } else if (
    isStormy ||
    isRainy ||
    isSnowy
  ) {
    ventilationText =
      "Keep windows closed";
  } else if (
    windSpeed >= 12
  ) {
    ventilationText =
      "Limit ventilation";
  } else if (isFoggy) {
    ventilationText =
      "Ventilate briefly";
  }

  recommendations.push({
    key: "ventilation",
    icon: "fa-solid fa-fan",
    title: "Ventilation",
    text: ventilationText,
  });

  return recommendations;
}