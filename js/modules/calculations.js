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

  const avgWeight = weights.length ? weights.reduce((a, b) => a + b, 0) / weights.length : CONFIG.defaults.weight;

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

      const genderMultiplier = gender === "k" && ["muscle-up", "pull-up", "dip", "chin-up"].includes(key) ? 1.4 : 1.0;

      const weightFactor = weight > 0 ? Math.pow(weight / avgWeight, 0.33) : 1;
      const adjustedWeightFactor = weightFactor > 0 ? 1 / weightFactor : 1;

      const maxRepsScore = reps * CONFIG.weights.maxReps * multiplier * adjustedWeightFactor * genderMultiplier;
      const oneRepScore = oneRepKg * CONFIG.weights.oneRep * multiplier * adjustedWeightFactor * genderMultiplier;

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

  visibleRows.sort((a, b) => {
    const eloA = parseInt(a.dataset.eloScore || 0);
    const eloB = parseInt(b.dataset.eloScore || 0);
    return eloB - eloA;
  });

  let currentRank = 0;
  let previousScore = -1;
  let tieCounter = 1;
  let bronzeAwarded = false;

  visibleRows.forEach((row, index) => {
    const currentScore = parseInt(row.dataset.eloScore || 0);

    if (currentScore !== previousScore) {
      currentRank = index + 1;
      tieCounter = 1;
    } else {
      tieCounter++;
    }

    const rankCell = row.querySelector("[data-user-rank]");
    if (rankCell) {
      rankCell.innerHTML = "";

      let medalColor = null;
      if (currentRank === 1) {
        medalColor = CONFIG.medals.gold;
      } else if (currentRank === 2) {
        medalColor = CONFIG.medals.silver;
      } else if (currentRank > 2 && !bronzeAwarded) {
        medalColor = CONFIG.medals.bronze;
        bronzeAwarded = true;
      }

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

    previousScore = currentScore;
  });
}
