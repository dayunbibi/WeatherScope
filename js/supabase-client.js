const SUPABASE_URL = "https://khgybcziukymjzxwevaa.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_BnZDErLakuqLZD1J0lHjzg_5fMniiy2";

export const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);