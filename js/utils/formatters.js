// Utility functions for formatting data
import { CONFIG } from "../modules/config.js";

export const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d)) /g, ",");

export const formatFieldValue = (key, value) => {
  const isRepValue = key.endsWith("-max") || key.endsWith("-one");
  const numericValue = parseFloat(value);

  if (isRepValue && numericValue === 0) {
    return { text: "–", muted: true };
  }

  if (key === "weight" && numericValue === 0) {
    return { text: CONFIG.defaults.weight, muted: false };
  }

  return { text: value, muted: false };
};

export const displayValue = (element, key, value) => {
  if (!element) return;

  const valueSpan =
    element.querySelector(
      '[data-max-reps], [data-one-rep], [data-user-name], [data-user-sex], [data-user-weight], [data-elo], [data-one-rep="sum"]'
    ) || element;

  // Zapisz oryginalną klasę przed zmianami
  const hadTextMutedClass =
    element.matches("[data-user-sex]") && valueSpan.classList.contains("text-muted");

  valueSpan.textContent = "";

  // Usuń klasę text-muted tylko jeśli to nie jest element data-user-sex
  if (!element.matches("[data-user-sex]")) {
    valueSpan.classList.remove("text-muted");
  }

  const existingInput = valueSpan.querySelector("input, select");
  if (existingInput) existingInput.remove();

  valueSpan.dataset.value = value;

  const formatted = formatFieldValue(key, value);
  valueSpan.textContent = formatted.text;

  // Jeśli to element data-user-sex, zachowaj oryginalną klasę
  if (element.matches("[data-user-sex]")) {
    if (hadTextMutedClass) {
      valueSpan.classList.add("text-muted");
    }
  } else {
    // Dla innych elementów stosuj normalne reguły
    if (formatted.muted) {
      valueSpan.classList.add("text-muted");
    } else {
      valueSpan.classList.remove("text-muted");
    }
  }
};
