let weatherMap = null;
let weatherMarker = null;

function isValidCoordinate(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function createPopupContent(weather) {
  const container = document.createElement("div");

  const cityName = document.createElement("strong");
  cityName.textContent = weather.locationName;

  const description = document.createElement("div");
  description.textContent = weather.description;

  container.append(cityName, description);

  return container;
}

export function renderWeatherMap({
  mapElement,
  mapSection,
  weather,
}) {
  if (!mapElement || !mapSection || !weather) {
    return;
  }

  const latitude = weather.latitude;
  const longitude = weather.longitude;

  if (
    !isValidCoordinate(latitude) ||
    !isValidCoordinate(longitude) ||
    typeof window.L === "undefined"
  ) {
    mapSection.hidden = true;
    return;
  }

  mapSection.hidden = false;

  const coordinates = [latitude, longitude];

  if (!weatherMap) {
    weatherMap = window.L.map(mapElement, {
      scrollWheelZoom: false,
      zoomControl: true,
    }).setView(coordinates, 10);

    window.L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      }
    ).addTo(weatherMap);
  } else {
    weatherMap.setView(coordinates, 10, {
      animate: true,
    });
  }

  if (weatherMarker) {
    weatherMarker.remove();
  }

  weatherMarker = window.L.marker(coordinates)
    .addTo(weatherMap)
    .bindPopup(createPopupContent(weather))
    .openPopup();

  window.setTimeout(() => {
    weatherMap.invalidateSize();
  }, 150);
}

export function hideWeatherMap(mapSection) {
  if (mapSection) {
    mapSection.hidden = true;
  }
}