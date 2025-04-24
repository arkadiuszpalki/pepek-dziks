// API communication with Supabase
import { SUPABASE_CONFIG } from "./config.js";

let supabaseClient = null;

export function initializeSupabase() {
  const { createClient } = supabase;

  // Sprawdź czy klucz API istnieje
  if (!SUPABASE_CONFIG.key) {
    return null;
  }

  supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
  return supabaseClient;
}

export async function fetchLeaderboardData() {
  // Sprawdź czy klucz API istnieje
  if (!SUPABASE_CONFIG.key) {
    return [];
  }

  const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/leaderboard?select=*`, {
    headers: {
      apikey: SUPABASE_CONFIG.key,
      Authorization: `Bearer ${SUPABASE_CONFIG.key}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch leaderboard data: ${res.statusText}`);
  }

  return await res.json();
}

export async function createUser(userData) {
  const { data, error } = await supabaseClient.from("leaderboard").insert([userData]).select();
  if (error) {
  }
  return { data, error };
}

export async function updateUser(userId, userData) {
  const { data, error } = await supabaseClient
    .from("leaderboard")
    .update(userData)
    .eq("id", userId)
    .select();
  if (error) {
  }
  return { data, error };
}

export async function deleteUser(userId) {
  const { error } = await supabaseClient.from("leaderboard").delete().eq("id", userId);
  return { error };
}

export async function getUserProfile(userId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("username, is_admin, can_edit")
    .eq("user_id", userId)
    .single();
  if (error) {
    return null;
  }
  return data;
}

export async function getCurrentSession() {
  try {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    return session;
  } catch (error) {
    return null;
  }
}

export async function signIn(email, password) {
  return await supabaseClient.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return await supabaseClient.auth.signOut();
}

export function onAuthStateChange(callback) {
  return supabaseClient.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}

export async function getSupabaseClient() {
  if (!supabaseClient) {
    initializeSupabase();
  }
  return supabaseClient;
}
