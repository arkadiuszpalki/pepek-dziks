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
    element.querySelector('[data-max-reps], [data-one-rep], [data-user-name], [data-user-sex], [data-user-weight], [data-elo], [data-one-rep="sum"]') ||
    element;

  valueSpan.textContent = "";
  valueSpan.classList.remove("text-muted");

  const existingInput = valueSpan.querySelector("input, select");
  if (existingInput) existingInput.remove();

  valueSpan.dataset.value = value;

  const formatted = formatFieldValue(key, value);
  valueSpan.textContent = formatted.text;

  if (formatted.muted) {
    valueSpan.classList.add("text-muted");
  } else {
    valueSpan.classList.remove("text-muted");
  }
};
