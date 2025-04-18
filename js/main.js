import { CONFIG, MIN_LOADING_TIME_MS } from "./modules/config.js";

import * as formatters from "./utils/formatters.js";
import * as api from "./modules/api.js";
import * as auth from "./modules/auth.js";
import * as calculations from "./modules/calculations.js";
import * as sorting from "./modules/sorting.js";
import * as filtering from "./modules/filtering.js";
import * as userManagement from "./modules/userManagement.js";

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.gsap || !window.Flip) {
    console.warn("GSAP or Flip not loaded. Animations will be disabled.");
  }

  const supabaseClient = api.initializeSupabase();

  const state = {
    currentSort: { exercise: "elo", type: "score", direction: "desc" },
    currentSexFilter: "all",
    animations: {
      sort: {
        enabled: false,
        duration: 0.5,
        ease: "elastic.out(1,1.5)",
      },
      edit: {
        enabled: true,

        highlight: {
          duration: 0.3,
          ease: "circ.out",
          background: "rgba(20, 19, 22, 1)",
          scale: 1.025,
          zIndex: 2,
          delay: 0,
        },

        sort: {
          duration: 0.75,
          ease: "elastic.out(1,1.5)",
          delay: 0,
        },

        reset: {
          duration: 0.15,
          ease: "circ.out",
          background: "rgba(20, 19, 22, 0)",
          scale: 1,
          zIndex: "auto",
          delay: 0,
        },
      },
    },
  };

  const elements = {
    tableBody: document.querySelector(".table_dziks"),
    template: document.querySelector(".table_dziks .table_row"),
    config: CONFIG,
    state: state,
    functions: {
      calculateELO: calculations.calculateELO,
      updateRankAndMedals: calculations.updateRankAndMedals,
      sortDataForRows: sorting.sortDataForRows,
      updateCellOpacity: sorting.updateCellOpacity,
      sortRows: sorting.sortRows,
    },
    authElements: {
      theDialog: document.querySelector(".dialog"),
      loginWrapper: document.querySelector("[data-dialog-login]"),
      editWrapper: document.querySelector("[data-dialog-edit]"),
      loginFormOnPage: document.querySelector(".actions-wrap"),
      initialLoginButton: document.querySelector('[data-button-action="login"]'),

      emailInput: document.querySelector("[data-dialog-login] [data-action-email]"),
      passwordInput: document.querySelector("[data-dialog-login] [data-action-password]"),
      confirmLoginButton: document.querySelector(
        '[data-dialog-login] [data-button-action="confirm"]'
      ),
      logoutButton: document.querySelector('[data-button-action="logout"]'),
      logoutButtonLabel: document.querySelector('[data-button-action="logout"] .button_label'),
    },
  };

  if (!elements.tableBody || !elements.template) {
    console.error("Required DOM elements not found.");
    return;
  }

  const rowTemplateClone = elements.template.cloneNode(true);
  elements.template.remove();
  elements.rowTemplateClone = rowTemplateClone;

  const enableAnimationsAfterLoad = () => {
    state.animations.sort.enabled = true;
  };

  try {
    const startTime = performance.now();

    const data = await api.fetchLeaderboardData();

    if (!Array.isArray(data)) {
      console.error("Invalid data format received from API");
      return;
    }

    elements.tableBody.innerHTML = "";

    data.forEach((user) => {
      const row = rowTemplateClone.cloneNode(true);
      row.dataset.userId = user.id;
      row.classList.add("is-user");

      if (user.created_by) {
        row.dataset.createdBy = user.created_by;
      } else {
        row.dataset.createdBy = "unknown";
      }

      const fields = {
        name: user.name,
        sex: user.plec ? user.plec.toUpperCase() : "M",
        weight: user.waga !== null && user.waga !== undefined ? user.waga : CONFIG.defaults.weight,
        "muscle-up-max": user.muscle_up_max_reps,
        "muscle-up-one": user.muscle_up_one_rep,
        "pull-up-max": user.pull_up_max_reps,
        "pull-up-one": user.pull_up_one_rep,
        "chin-up-max": user.chin_up_max_reps,
        "chin-up-one": user.chin_up_one_rep,
        "dip-max": user.dip_max_reps,
        "dip-one": user.dip_one_rep,
        "push-up-max": user.push_up_max_reps,
        "push-up-one": user.push_up_one_rep,
        "press-one": user.press_one_rep,
      };

      formatters.displayValue(row.querySelector("[data-user-name]"), "name", fields.name);
      formatters.displayValue(row.querySelector("[data-user-sex]"), "sex", fields.sex);
      formatters.displayValue(row.querySelector("[data-user-weight]"), "weight", fields.weight);

      Object.entries(CONFIG.exercises).forEach(([key]) => {
        const maxRepsTarget = row.querySelector(`[data-user-max="${key}"] [data-max-reps]`);
        const oneRepTarget = row.querySelector(`[data-user-max="${key}"] [data-one-rep]`);

        if (key !== "press" && maxRepsTarget) {
          formatters.displayValue(
            maxRepsTarget,
            `${key}-max`,
            fields[`${key}-max`] !== null && fields[`${key}-max`] !== undefined
              ? fields[`${key}-max`]
              : 0
          );
        } else if (key === "press") {
          const pressMaxWrap = row.querySelector(`[data-user-max="${key}"] [data-max-reps-wrap]`);
          if (pressMaxWrap) {
            pressMaxWrap.style.display = "none";
          }
        }

        if (oneRepTarget) {
          formatters.displayValue(
            oneRepTarget,
            `${key}-one`,
            fields[`${key}-one`] !== null && fields[`${key}-one`] !== undefined
              ? fields[`${key}-one`]
              : 0
          );
        }
      });

      const eloElement = row.querySelector("[data-elo]");
      if (eloElement) {
        eloElement.textContent = "0";
        eloElement.dataset.value = "0";
      }

      const sumElement = row.querySelector('[data-one-rep="sum"]');
      if (sumElement) {
        sumElement.textContent = "0";
        sumElement.dataset.value = "0";
      }

      row.addEventListener("click", () => userManagement.openEditDialog(user.id, elements));

      elements.tableBody.appendChild(row);
    });

    calculations.calculateELO(elements);

    sorting.sortRows(
      state,
      elements,
      state.currentSort.exercise,
      state.currentSort.type,
      state.currentSort.direction
    );

    const visibleRows = Array.from(elements.tableBody.querySelectorAll(".table_row")).filter(
      (row) => row.style.display !== "none"
    );
    calculations.updateRankAndMedals(visibleRows);

    sorting.setupSorting(state, elements);
    filtering.setupFiltering(state, elements);
    userManagement.setupDialogInteractions(elements);
    auth.setupAuthListeners(elements);
    userManagement.setupAddUserButton(elements);

    // Setup dialog swipe to dismiss
    setupDialogSwipeGesture(elements.authElements.theDialog);

    window.PepekAnimations = {
      getSortingConfig: () => {
        return { ...state.animations.sort };
      },
      setSortingConfig: (config) => {
        if (config === null || config === undefined) return;

        if (typeof config.enabled === "boolean") {
          state.animations.sort.enabled = config.enabled;
        }

        if (typeof config.duration === "number") {
          state.animations.sort.duration = Math.max(0.1, Math.min(2, config.duration));
        }

        if (typeof config.ease === "string") {
          state.animations.sort.ease = config.ease;
        }

        console.log("Ustawienia animacji sortowania zaktualizowane:", state.animations.sort);
      },

      getEditConfig: () => {
        return JSON.parse(JSON.stringify(state.animations.edit));
      },

      setEditConfig: (config) => {
        if (config === null || config === undefined) return;

        if (typeof config.enabled === "boolean") {
          state.animations.edit.enabled = config.enabled;
        }

        if (config.highlight) {
          const h = config.highlight;
          const target = state.animations.edit.highlight;

          if (typeof h.duration === "number")
            target.duration = Math.max(0.1, Math.min(2, h.duration));
          if (typeof h.ease === "string") target.ease = h.ease;
          if (h.background) target.background = h.background;
          if (typeof h.scale === "number") target.scale = Math.max(0.5, Math.min(2, h.scale));
          if (h.zIndex !== undefined) target.zIndex = h.zIndex;
          if (typeof h.delay === "number") target.delay = Math.max(0, Math.min(5, h.delay));
        }

        if (config.sort) {
          const s = config.sort;
          const target = state.animations.edit.sort;

          if (typeof s.duration === "number")
            target.duration = Math.max(0.1, Math.min(2, s.duration));
          if (typeof s.ease === "string") target.ease = s.ease;
          if (typeof s.delay === "number") target.delay = Math.max(0, Math.min(5, s.delay));
        }

        if (config.reset) {
          const r = config.reset;
          const target = state.animations.edit.reset;

          if (typeof r.duration === "number")
            target.duration = Math.max(0.1, Math.min(2, r.duration));
          if (typeof r.ease === "string") target.ease = r.ease;
          if (r.background) target.background = r.background;
          if (typeof r.scale === "number") target.scale = Math.max(0.5, Math.min(1.5, r.scale));
          if (r.zIndex !== undefined) target.zIndex = r.zIndex;
          if (typeof r.delay === "number") target.delay = Math.max(0, Math.min(5, r.delay));
        }

        console.log("Ustawienia animacji edycji zaktualizowane:", state.animations.edit);
      },
    };

    const endTime = performance.now();
    const elapsedTime = endTime - startTime;
    const remainingTime = MIN_LOADING_TIME_MS - elapsedTime;

    const hideLoadingScreen = () => {
      const loadingScreen = document.querySelector("[data-loading-screen]");
      if (loadingScreen) loadingScreen.dataset.loadingScreen = "loaded";

      enableAnimationsAfterLoad();
    };

    if (remainingTime > 0) {
      setTimeout(hideLoadingScreen, remainingTime);
    } else {
      hideLoadingScreen();
    }
  } catch (err) {
    console.error("Error loading data:", err);
    elements.tableBody.innerHTML =
      '<tr><td colspan="9">Wystąpił błąd podczas ładowania danych. Spróbuj odświeżyć stronę.</td></tr>';

    const loadingScreen = document.querySelector("[data-loading-screen]");
    if (loadingScreen) loadingScreen.dataset.loadingScreen = "loaded";

    enableAnimationsAfterLoad();
  }
});

// Function to handle swipe down to close dialog on mobile
function setupDialogSwipeGesture(dialogElement) {
  if (!dialogElement) return;

  let startY = 0;
  let currentY = 0;
  let isDragging = false;
  const DISMISS_THRESHOLD = 150; // Pixels needed to swipe down to dismiss
  const MOBILE_BREAKPOINT = 991; // Mobile breakpoint

  function handleTouchStart(e) {
    if (window.innerWidth > MOBILE_BREAKPOINT) return;

    const touch = e.touches[0];
    startY = touch.clientY;
    currentY = startY;
    isDragging = true;

    dialogElement.style.transition = "none";
    dialogElement.style.userSelect = "none";
  }

  function handleTouchMove(e) {
    if (!isDragging || window.innerWidth > MOBILE_BREAKPOINT) return;

    const touch = e.touches[0];
    currentY = touch.clientY;
    const deltaY = currentY - startY;

    // Only allow dragging down, not up
    if (deltaY < 0) return;

    // Apply transform with translateY and scale reduction as dialog is pulled down
    const translateY = Math.min(deltaY, DISMISS_THRESHOLD * 1.5);
    const scale = Math.max(0.9, 1 - translateY / (DISMISS_THRESHOLD * 5));

    dialogElement.style.transform = `translateY(${translateY}px) scale(${scale})`;

    // If they're dragging down significantly, prevent default to avoid page scroll
    if (deltaY > 10) {
      e.preventDefault();
    }
  }

  function handleTouchEnd() {
    if (!isDragging || window.innerWidth > MOBILE_BREAKPOINT) return;

    const deltaY = currentY - startY;

    // Reset transition for smooth animation
    dialogElement.style.transition = "transform 0.3s ease-out";

    if (deltaY >= DISMISS_THRESHOLD) {
      // Swipe threshold reached, dismiss the dialog
      dialogElement.style.transform = `translateY(${window.innerHeight}px) scale(0.9)`;

      // After animation completes, hide the dialog properly
      setTimeout(() => {
        // Close the dialog properly using the native close method
        if (dialogElement.close) {
          dialogElement.close();
        } else if (dialogElement.classList.contains("open")) {
          dialogElement.classList.remove("open");
        }

        // Reset all styles
        dialogElement.style.transform = "";
        dialogElement.style.transition = "";
        dialogElement.style.userSelect = "";

        // Clear any editing user ID that might be set
        if (dialogElement.dataset && dialogElement.dataset.editingUserId) {
          delete dialogElement.dataset.editingUserId;
        }
      }, 300);
    } else {
      // Not enough to dismiss, snap back
      dialogElement.style.transform = "";

      // Reset styles after animation
      setTimeout(() => {
        dialogElement.style.transition = "";
        dialogElement.style.userSelect = "";
      }, 300);
    }

    isDragging = false;
  }

  // Add event listeners
  dialogElement.addEventListener("touchstart", handleTouchStart, { passive: false });
  dialogElement.addEventListener("touchmove", handleTouchMove, { passive: false });
  dialogElement.addEventListener("touchend", handleTouchEnd);
  dialogElement.addEventListener("touchcancel", handleTouchEnd);
}
