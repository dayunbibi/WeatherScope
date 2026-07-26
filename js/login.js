import { supabaseClient } from "./supabase-client.js";

const loginForm = document.querySelector("#loginForm");
const messageElement = document.querySelector("#message");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value;

  messageElement.textContent = "Logging in...";

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    messageElement.textContent = error.message;
    return;
  }

  if (!data.user) {
    messageElement.textContent = "Unable to log in.";
    return;
  }

  window.location.href = "index.html";
});