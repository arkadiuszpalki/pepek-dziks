// Calculation related functions
import { CONFIG } from "./config.js";
import { formatNumber, displayValue } from "../utils/formatters.js";

export function calculateELO(elements) {
  const allRows = Array.from(elements.tableBody.querySelectorAll(".table_row"));
  if (allRows.length === 0) return;

  const weights = allRows.map((row) => {
    const weightEl = row.querySelector("[data-user-weight]");
    return parseFloat(weightEl?.dataset.value || CONFIG.defaults.weight);
  });

  const avgWeight = weights.length
    ? weights.reduce((a, b) => a + b, 0) / weights.length
    : CONFIG.defaults.weight;

  allRows.forEach((row) => {
    const weightEl = row.querySelector("[data-user-weight]");
    const weight = parseFloat(weightEl?.dataset.value || CONFIG.defaults.weight);
    const genderEl = row.querySelector("[data-user-sex]");
    const gender = genderEl?.dataset.value?.trim().toLowerCase() || "m";
    let totalScore = 0;
    let totalOneRepSumKg = 0;

    const exerciseScores = {};

    Object.entries(CONFIG.exercises).forEach(([key, { multiplier }]) => {
      const maxRepsEl = row.querySelector(`[data-user-max="${key}"] [data-max-reps]`);
      const oneRepEl = row.querySelector(`[data-user-max="${key}"] [data-one-rep]`);

      const reps = key !== "press" && maxRepsEl ? parseInt(maxRepsEl?.dataset.value || 0) : 0;
      const oneRepKg = oneRepEl ? parseInt(oneRepEl?.dataset.value || 0) : 0;

      totalOneRepSumKg += oneRepKg;

      const genderMultiplier =
        gender === "k" && ["muscle-up", "pull-up", "dip", "chin-up"].includes(key) ? 1.4 : 1.0;

      const weightFactor = weight > 0 ? Math.pow(weight / avgWeight, 0.33) : 1;
      const adjustedWeightFactor = weightFactor > 0 ? 1 / weightFactor : 1;

      const maxRepsScore =
        reps * CONFIG.weights.maxReps * multiplier * adjustedWeightFactor * genderMultiplier;
      const oneRepScore =
        oneRepKg * CONFIG.weights.oneRep * multiplier * adjustedWeightFactor * genderMultiplier;

      const score = maxRepsScore + oneRepScore;
      exerciseScores[key] = Math.round(score * 10);

      totalScore += score;
    });

    // Store final ELO and SUM on the row's dataset
    const finalElo = Math.round(totalScore * 10);
    row.dataset.eloScore = finalElo;
    row.dataset.oneRepSum = totalOneRepSumKg;

    const eloCell = row.querySelector("[data-elo]");
    if (eloCell) {
      displayValue(eloCell, "elo", formatNumber(finalElo));
    }

    const sumCell = row.querySelector('[data-one-rep="sum"]');
    if (sumCell) {
      displayValue(sumCell, "one-rep-sum", formatNumber(totalOneRepSumKg));
    }
  });
}

export function updateRankAndMedals(visibleRows) {
  if (visibleRows.length === 0) return;

  // Dodaj medal do rzędu, jeśli jest to użytkownik z medalem w głównym sortowaniu
  const addMedalIfNeeded = (row) => {
    // Sprawdź, czy użytkownik ma tag medalu
    const userId = row.dataset.userId;
    const originalRank = row.dataset.originalRank;

    if (originalRank === "1") {
      return CONFIG.medals.gold;
    } else if (originalRank === "2") {
      return CONFIG.medals.silver;
    } else if (originalRank === "3") {
      return CONFIG.medals.bronze;
    }

    return null;
  };

  // Posortuj rzędy według ELO, aby znaleźć bazowe rankingi
  const baseRows = [...visibleRows].sort((a, b) => {
    const eloA = parseInt(a.dataset.eloScore || 0);
    const eloB = parseInt(b.dataset.eloScore || 0);
    return eloB - eloA;
  });

  // Przypisz oryginalny ranking przy pierwszym uruchomieniu
  baseRows.forEach((row, index) => {
    if (!row.dataset.originalRank) {
      row.dataset.originalRank = (index + 1).toString();
    }
  });

  // Aktualizuj ranking na podstawie aktualnej kolejności w tabeli
  visibleRows.forEach((row, index) => {
    const currentRank = index + 1;
    const rankCell = row.querySelector("[data-user-rank]");

    if (rankCell) {
      rankCell.innerHTML = "";

      // Sprawdź czy ten rząd powinien mieć medal
      const medalColor = addMedalIfNeeded(row);

      if (medalColor) {
        const medalDiv = document.createElement("div");
        medalDiv.style.width = "1em";
        medalDiv.style.height = "1em";
        medalDiv.style.display = "inline-block";
        medalDiv.style.verticalAlign = "middle";
        medalDiv.style.marginRight = "0.25em";
        medalDiv.style.borderRadius = "50%";
        medalDiv.style.backgroundColor = medalColor;
        rankCell.appendChild(medalDiv);
      } else {
        rankCell.textContent = currentRank.toString();
      }
    }
  });
}
