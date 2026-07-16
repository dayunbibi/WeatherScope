let weatherMap = null;
let weatherMarker = null;

const DEFAULT_ZOOM = 10;
const MAP_RESIZE_DELAY = 180;

function isValidCoordinate(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function createPopupContent(weather) {
  const container =
    document.createElement("div");

  const cityName =
    document.createElement("strong");

  cityName.textContent =
    weather.locationName;

  const description =
    document.createElement("div");

  description.textContent =
    weather.description;

  container.append(
    cityName,
    description
  );

  return container;
}

function centerMap(
  coordinates,
  animate = false
) {
  if (!weatherMap) {
    return;
  }

  weatherMap.invalidateSize({
    animate: false,
    pan: false,
  });

  weatherMap.setView(
    coordinates,
    DEFAULT_ZOOM,
    {
      animate,
    }
  );
}

function refreshMapLayout(
  coordinates
) {
  requestAnimationFrame(() => {
    centerMap(
      coordinates,
      false
    );

    window.setTimeout(() => {
      centerMap(
        coordinates,
        false
      );
    }, MAP_RESIZE_DELAY);
  });
}

export function renderWeatherMap({
  mapElement,
  mapSection,
  weather,
}) {
  if (
    !mapElement ||
    !mapSection ||
    !weather
  ) {
    return;
  }

  const latitude =
    weather.latitude;

  const longitude =
    weather.longitude;

  if (
    !isValidCoordinate(latitude) ||
    !isValidCoordinate(longitude) ||
    typeof window.L === "undefined"
  ) {
    mapSection.hidden = true;
    return;
  }

  const coordinates = [
    latitude,
    longitude,
  ];

  mapSection.hidden = false;

  if (!weatherMap) {
    weatherMap = window.L.map(
      mapElement,
      {
        scrollWheelZoom: false,
        zoomControl: true,
      }
    ).setView(
      coordinates,
      DEFAULT_ZOOM
    );

    window.L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      }
    ).addTo(weatherMap);
  } else {
    weatherMap.setView(
      coordinates,
      DEFAULT_ZOOM,
      {
        animate: false,
      }
    );
  }

  if (weatherMarker) {
    weatherMarker.remove();
  }

  weatherMarker = window.L
    .marker(coordinates)
    .addTo(weatherMap)
    .bindPopup(
      createPopupContent(weather)
    )
    .openPopup();

  refreshMapLayout(
    coordinates
  );
}

export function hideWeatherMap(
  mapSection
) {
  if (mapSection) {
    mapSection.hidden = true;
  }
}