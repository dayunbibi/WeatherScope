// Create Modal
const modal = document.createElement("div");

modal.id = "proModal";

modal.className =
  "fixed inset-0 z-[9999] hidden items-center justify-center bg-black/50 backdrop-blur-sm";

modal.innerHTML = `
<div class="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">

    <h2 class="text-2xl font-extrabold text-on-surface">
        WeatherScope Pro
    </h2>

    <p class="mt-2 text-sm text-on-surface-variant">
        Unlock premium weather features designed for power users.
    </p>

    <div class="my-6 h-px bg-outline-variant/30"></div>

    <ul class="space-y-3 text-sm text-on-surface">
        <li>Unlimited Favorite Cities</li>
        <li>Cloud Sync</li>
        <li>Advanced Weather Maps</li>
        <li>Severe Weather Alerts</li>
        <li>Detailed Hourly Forecasts</li>
        <li>Historical Weather Data</li>
        <li>Priority Feature Access</li>
        <li>Custom Themes</li>
    </ul>

    <div class="my-6 h-px bg-outline-variant/30"></div>

    <p class="text-xs text-outline">
        WeatherScope Pro is currently under development.
    </p>

    <div class="mt-8 flex gap-3">

        <button
            id="upgradeNowBtn"
            class="flex-1 rounded-lg bg-primary py-3 font-bold text-white transition hover:opacity-90">
            Upgrade Now
        </button>

        <button
            id="closeProModal"
            class="flex-1 rounded-lg border border-outline-variant py-3 font-bold transition hover:bg-surface-container">
            Maybe Later
        </button>

    </div>

</div>
`;

document.body.appendChild(modal);

// Elements
const openBtn = document.getElementById("upgradeProBtn");
const closeBtn = document.getElementById("closeProModal");
const upgradeBtn = document.getElementById("upgradeNowBtn");

// Open
openBtn?.addEventListener("click", () => {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
});

// Close
function closeModal() {
    modal.classList.remove("flex");
    modal.classList.add("hidden");
}

closeBtn?.addEventListener("click", closeModal);

// Click outside
modal.addEventListener("click", (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// Upgrade
upgradeBtn?.addEventListener("click", () => {
    closeModal();

    alert(
`Coming Soon

WeatherScope Pro is currently under development.

Stay tuned!`
    );
});

// ESC
window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeModal();
    }
});