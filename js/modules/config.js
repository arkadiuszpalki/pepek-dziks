// Configuration for the application
export const CONFIG = {
  weights: { maxReps: 0.6, oneRep: 0.4 },
  medals: {
    gold: "#d6af36",
    silver: "#d7d7d7",
    bronze: "#a77044",
  },
  exercises: {
    "muscle-up": { name: "Muscle Up", multiplier: 3.0 },
    "pull-up": { name: "Pull Up", multiplier: 1.8 },
    "chin-up": { name: "Chin Up", multiplier: 1.5 },
    dip: { name: "Dip", multiplier: 1.4 },
    "push-up": { name: "Push Up", multiplier: 1.3 },
    press: { name: "Bench Press", multiplier: 1.2 },
  },
  defaults: { weight: 70 },
};

export const MIN_LOADING_TIME_MS = 400;

// Bezpieczniejsze ładowanie konfiguracji Supabase
export const SUPABASE_CONFIG = {
  url: "https://wucacawlvnmsjufprulv.supabase.co",
  key: getSupabaseKey(),
};

// Funkcja pobierająca klucz z Custom Attributes Webflow
function getSupabaseKey() {
  // Sprawdź, czy istnieje element z atrybutem data-supabase-key
  const keyElement = document.querySelector("[data-supabase-key]");
  if (keyElement && keyElement.dataset.supabaseKey) {
    return keyElement.dataset.supabaseKey;
  }

  // Alternatywnie pobierz z window.__env__ jeśli zostało skonfigurowane
  if (window.__env__ && window.__env__.SUPABASE_KEY) {
    return window.__env__.SUPABASE_KEY;
  }
  return null; // Aplikacja nie zadziała bez klucza
}
