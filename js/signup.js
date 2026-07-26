import { supabaseClient } from "./supabase-client.js";

const signupForm = document.querySelector("#signupForm");
const messageElement = document.querySelector("#message");

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.querySelector("#name").value.trim();
  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value;

  messageElement.textContent = "Creating your account...";

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: name,
      },
      emailRedirectTo: `${window.location.origin}/login.html`,
    },
  });

  if (error) {
    messageElement.textContent = error.message;
    return;
  }

  if (data.session) {
    messageElement.textContent = "Account created successfully.";
    window.location.href = "index.html";
    return;
  }

  messageElement.textContent =
    "Account created. Check your email and confirm your account.";
});