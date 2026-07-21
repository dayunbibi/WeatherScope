const SELECTED_LOCATION_KEY = "weatherscope:selected-location";
const THEME_KEY = "weatherscope:theme";

const elements = {
  form: document.getElementById("mapSearchForm"),
  input: document.getElementById("mapCityInput"),
  suggestions: document.getElementById("mapSuggestions"),
  locationButton: document.getElementById("mapLocationBtn"),
  themeButton: document.getElementById("themeBtn"),
  status: document.getElementById("statusToast"),
  selectedLocation: document.getElementById("selectedLocationText"),
  selectedLayer: document.getElementById("selectedLayerText"),
  legendTitle: document.getElementById("legendTitle"),
  legendGradient: document.getElementById("legendGradient"),
  legendLabels: document.getElementById("legendLabels"),
  slider: document.getElementById("forecastSlider"),
  timelineDescription: document.getElementById("timelineDescription"),
  mapTime: document.getElementById("currentMapTime"),
  playButton: document.getElementById("playBtn")
};

const layerMeta = {
  temp_new: { label: "Temperature", gradient: "from-blue-600 via-green-400 to-red-600", labels: ["-10°", "15°", "40°"] },
  precipitation_new: { label: "Precipitation", gradient: "from-transparent via-sky-400 to-blue-900", labels: ["Light", "Moderate", "Heavy"] },
  wind_new: { label: "Wind Speed", gradient: "from-emerald-300 via-yellow-300 to-fuchsia-700", labels: ["0", "15", "50 m/s"] },
  clouds_new: { label: "Cloud Cover", gradient: "from-white via-slate-300 to-slate-800", labels: ["0%", "50%", "100%"] },
  pressure_new: { label: "Pressure", gradient: "from-violet-700 via-cyan-300 to-yellow-300", labels: ["950", "1013", "1070 hPa"] }
};

let activeLayerName = "temp_new";
let weatherOverlay;
let marker;
let selectedLocation = null;
let suggestionTimer;
let playTimer;

const map = L.map("interactiveMap", {
  zoomControl: false,
  worldCopyJump: true,
  minZoom: 2,
  maxZoom: 18
}).setView([51.2, 10.4], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

L.control.zoom({ position: "bottomright" }).addTo(map);

function tileUrl(layer) {
  return `/api/map-tile?layer=${encodeURIComponent(layer)}&z={z}&x={x}&y={y}`;
}

function setWeatherLayer(layer) {
  activeLayerName = layer;
  if (weatherOverlay) map.removeLayer(weatherOverlay);

  weatherOverlay = L.tileLayer(tileUrl(layer), {
    opacity: layer === "clouds_new" ? 0.72 : 0.66,
    maxZoom: 18,
    tileSize: 256,
    crossOrigin: true
  }).addTo(map);

  document.querySelectorAll(".layer-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.layer === layer);
  });

  const meta = layerMeta[layer];
  elements.legendTitle.textContent = `Legend: ${meta.label}`;
  elements.selectedLayer.textContent = `${meta.label} layer`;
  elements.timelineDescription.textContent = `${meta.label} forecast view`;
  elements.legendGradient.className = `h-2 w-full rounded-full bg-gradient-to-r ${meta.gradient}`;
  elements.legendLabels.innerHTML = meta.labels.map((label) => `<span>${label}</span>`).join("");
}

function showStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.hidden = false;
  elements.status.classList.toggle("text-error", isError);
  window.clearTimeout(showStatus.timer);
  showStatus.timer = window.setTimeout(() => { elements.status.hidden = true; }, 3500);
}

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Unable to load map data.");
  return data;
}

function createPopup(weather) {
  const temp = Math.round(weather.main?.temp ?? 0);
  const humidity = weather.main?.humidity ?? "--";
  const wind = weather.wind?.speed ?? "--";
  const clouds = weather.clouds?.all ?? "--";
  const rain = weather.rain?.["1h"] ?? weather.rain?.["3h"] ?? 0;
  const country = weather.sys?.country ? `, ${weather.sys.country}` : "";

  return `
    <div style="min-width:220px;padding:16px;font-family:Inter,sans-serif">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div style="width:34px;height:34px;border-radius:10px;background:#dbe1ff;color:#3567e9;display:flex;align-items:center;justify-content:center">●</div>
        <div><strong style="font-size:14px">${weather.name || "Selected location"}${country}</strong><div style="font-size:9px;color:#737686;text-transform:uppercase;letter-spacing:.12em;margin-top:2px">Selected region</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><small style="color:#737686">TEMP</small><div style="font-size:20px;font-weight:800;color:#3567e9">${temp}°C</div></div>
        <div><small style="color:#737686">HUMIDITY</small><div style="font-size:20px;font-weight:800;color:#3567e9">${humidity}%</div></div>
        <div><small style="color:#737686">WIND</small><div style="font-size:14px;font-weight:700">${wind} m/s</div></div>
        <div><small style="color:#737686">CLOUDS</small><div style="font-size:14px;font-weight:700">${clouds}%</div></div>
      </div>
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid #e9edff;font-size:11px;color:#434654">Rain: ${rain} mm · ${weather.weather?.[0]?.description || "Current conditions"}</div>
    </div>`;
}

async function loadLocation(location, zoom = 8) {
  try {
    showStatus("Loading map weather…");
    const params = location.latitude != null && location.longitude != null
      ? `lat=${encodeURIComponent(location.latitude)}&lon=${encodeURIComponent(location.longitude)}`
      : `city=${encodeURIComponent(location.city)}`;
    const data = await fetchJson(`/api/weather?${params}`);
    const weather = data.currentWeather;
    const lat = weather.coord.lat;
    const lon = weather.coord.lon;

    selectedLocation = {
      city: weather.name,
      country: weather.sys?.country || "",
      latitude: lat,
      longitude: lon
    };
    localStorage.setItem(SELECTED_LOCATION_KEY, JSON.stringify(selectedLocation));

    map.setView([lat, lon], zoom);
    if (marker) marker.remove();
    marker = L.marker([lat, lon]).addTo(map).bindPopup(createPopup(weather), { closeButton: false, offset: [0, -8] }).openPopup();
    elements.selectedLocation.textContent = `${weather.name}${weather.sys?.country ? `, ${weather.sys.country}` : ""}`;
    elements.input.value = weather.name;
    showStatus(`Map loaded for ${weather.name}.`);
  } catch (error) {
    showStatus(error.message, true);
  }
}

async function searchSuggestions(query) {
  if (query.length < 2) {
    elements.suggestions.hidden = true;
    return;
  }

  try {
    const data = await fetchJson(`/api/locations?q=${encodeURIComponent(query)}`);
    const locations = Array.isArray(data) ? data : data.locations || [];
    elements.suggestions.innerHTML = "";

    locations.slice(0, 6).forEach((location) => {
      const button = document.createElement("button");
      const name = location.name || location.city || "Unknown";
      const country = location.country || "";
      const state = location.state ? `, ${location.state}` : "";
      button.type = "button";
      button.innerHTML = `<strong>${name}</strong><span style="display:block;font-size:11px;color:#737686;margin-top:2px">${state.replace(/^, /, "")}${state && country ? ", " : ""}${country}</span>`;
      button.addEventListener("click", () => {
        elements.suggestions.hidden = true;
        loadLocation({ city: name, latitude: location.lat ?? location.latitude, longitude: location.lon ?? location.longitude });
      });
      elements.suggestions.appendChild(button);
    });

    elements.suggestions.hidden = locations.length === 0;
  } catch {
    elements.suggestions.hidden = true;
  }
}

function setTheme(theme) {
  const dark = theme === "dark";
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.classList.toggle("light", !dark);
  localStorage.setItem(THEME_KEY, theme);
  elements.themeButton.querySelector(".material-symbols-outlined").textContent = dark ? "light_mode" : "dark_mode";
}

function updateClock() {
  elements.mapTime.textContent = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date());
}

document.querySelectorAll(".layer-btn").forEach((button) => {
  button.title = button.dataset.label;
  button.addEventListener("click", () => setWeatherLayer(button.dataset.layer));
});

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = elements.input.value.trim();
  if (query) loadLocation({ city: query });
  elements.suggestions.hidden = true;
});

elements.input.addEventListener("input", () => {
  window.clearTimeout(suggestionTimer);
  suggestionTimer = window.setTimeout(() => searchSuggestions(elements.input.value.trim()), 250);
});

document.addEventListener("click", (event) => {
  if (!elements.form.contains(event.target)) elements.suggestions.hidden = true;
});

elements.locationButton.addEventListener("click", () => {
  if (!navigator.geolocation) return showStatus("Location is not supported by this browser.", true);
  showStatus("Finding your location…");
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => loadLocation({ latitude: coords.latitude, longitude: coords.longitude }, 9),
    () => showStatus("Your location is unavailable. Search for your city instead.", true),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
  );
});

elements.themeButton.addEventListener("click", () => {
  setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark");
});

elements.slider.addEventListener("input", () => {
  const hour = Number(elements.slider.value);
  elements.timelineDescription.textContent = `${layerMeta[activeLayerName].label} · T+${hour} hours`;
});

elements.playButton.addEventListener("click", () => {
  const icon = elements.playButton.querySelector(".material-symbols-outlined");
  if (playTimer) {
    clearInterval(playTimer);
    playTimer = null;
    icon.textContent = "play_arrow";
    return;
  }
  icon.textContent = "pause";
  playTimer = setInterval(() => {
    const next = (Number(elements.slider.value) + 1) % 25;
    elements.slider.value = String(next);
    elements.timelineDescription.textContent = `${layerMeta[activeLayerName].label} · T+${next} hours`;
  }, 700);
});

setTheme(localStorage.getItem(THEME_KEY) || "light");
setWeatherLayer(activeLayerName);
updateClock();
setInterval(updateClock, 60000);

try {
  const saved = JSON.parse(localStorage.getItem(SELECTED_LOCATION_KEY) || "null");
  if (saved) loadLocation(saved, 8);
} catch {
  // Keep default map.
}
