import { supabaseClient } from "./supabase-client.js";

const loginLink = document.querySelector("#loginLink");
const userMenu = document.querySelector("#userMenu");
const userName = document.querySelector("#userName");
const userAvatar = document.querySelector("#userAvatar");
const logoutButton = document.querySelector("#logoutButton");

async function updateAuthUI() {
  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser();

  if (error) {
    console.error("Unable to get user:", error.message);
  }

  if (!loginLink || !userMenu) {
    return;
  }

  if (!user) {
    loginLink.classList.remove("hidden");

    userMenu.classList.add("hidden");
    userMenu.classList.remove("flex");

    return;
  }

  const displayName =
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "User";

  loginLink.classList.add("hidden");

  userMenu.classList.remove("hidden");
  userMenu.classList.add("flex");

  if (userName) {
    userName.textContent = displayName;
  }

  if (userAvatar) {
    userAvatar.textContent =
      displayName.charAt(0).toUpperCase();
  }
}

logoutButton?.addEventListener("click", async () => {
  logoutButton.disabled = true;
  logoutButton.textContent = "Logging out...";

  const { error } =
    await supabaseClient.auth.signOut();

  if (error) {
    console.error("Logout failed:", error.message);

    logoutButton.disabled = false;
    logoutButton.textContent = "Log Out";

    return;
  }

  window.location.href = "/index.html";
});

supabaseClient.auth.onAuthStateChange(() => {
  updateAuthUI();
});

updateAuthUI();