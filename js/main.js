import { CONFIG, MIN_LOADING_TIME_MS } from "./modules/config.js";

import * as formatters from "./utils/formatters.js";
import * as api from "./modules/api.js";
import * as auth from "./modules/auth.js";
import * as calculations from "./modules/calculations.js";
import * as sorting from "./modules/sorting.js";
import * as filtering from "./modules/filtering.js";
import * as userManagement from "./modules/userManagement.js";
import * as dialogManager from "./modules/dialog.js";

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.gsap || !window.Flip) {
  }

  const actionAddButton = document.querySelector(".action_add");
  const pageWrap = document.querySelector(".page_wrap");

  if (actionAddButton && pageWrap) {
    const moveButtonToPageWrap = () => {
      if (window.innerWidth <= 991) {
        pageWrap.appendChild(actionAddButton);
      } else {
        if (actionAddButton.parentElement === pageWrap) {
          const actionsWrap = document.querySelector(
            ".leaderboard_table-header .leaderboard_actions .actions-wrap"
          );
          if (actionsWrap) {
            actionsWrap.appendChild(actionAddButton);
          }
        }
      }
    };

    moveButtonToPageWrap();
    window.addEventListener("resize", moveButtonToPageWrap);
  }

  const supabaseClient = api.initializeSupabase();

  if (!supabaseClient) {
    const loadingScreen = document.querySelector("[data-loading-screen]");
    if (loadingScreen) {
      loadingScreen.innerHTML = `
        <div class="error-message" style="text-align: center; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2>Błąd konfiguracji</h2>
          <p>Nie można połączyć się z bazą danych. Skonfiguruj klucz API Supabase.</p>
          <p>Instrukcje konfiguracji znajdują się w pliku README.md.</p>
        </div>
      `;
      loadingScreen.dataset.loadingScreen = "loaded";
    } else {
      const errorDiv = document.createElement("div");
      errorDiv.className = "error-message";
      errorDiv.style.cssText =
        "text-align: center; padding: 20px; max-width: 600px; margin: 20px auto; background: rgba(255,0,0,0.1); border: 1px solid red; border-radius: 4px;";
      errorDiv.innerHTML = `
        <h2>Błąd konfiguracji</h2>
        <p>Nie można połączyć się z bazą danych. Skonfiguruj klucz API Supabase.</p>
        <p>Instrukcje konfiguracji znajdują się w pliku README.md.</p>
      `;
      document.body.prepend(errorDiv);
    }
    return;
  }

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

      const tableExtras = row.querySelector("[data-table-extras]");
      if (tableExtras) {
        Object.entries(CONFIG.exercises).forEach(([key]) => {
          const extraMaxRepsTarget = tableExtras.querySelector(
            `[data-user-max="${key}"] [data-max-reps="${key}"]`
          );
          const extraOneRepTarget = tableExtras.querySelector(
            `[data-user-max="${key}"] [data-one-rep="${key}"]`
          );

          if (key !== "press" && extraMaxRepsTarget) {
            formatters.displayValue(
              extraMaxRepsTarget,
              `${key}-max`,
              fields[`${key}-max`] !== null && fields[`${key}-max`] !== undefined
                ? fields[`${key}-max`]
                : 0
            );
          } else if (key === "press") {
            const pressMaxWrap = tableExtras.querySelector(
              `[data-user-max="${key}"] [data-max-reps-wrap]`
            );
            if (pressMaxWrap) {
              pressMaxWrap.style.display = "none";
            }
          }

          if (extraOneRepTarget) {
            formatters.displayValue(
              extraOneRepTarget,
              `${key}-one`,
              fields[`${key}-one`] !== null && fields[`${key}-one`] !== undefined
                ? fields[`${key}-one`]
                : 0
            );
          }
        });
      }

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
    auth.setupAuthListeners(elements);

    if (dialogManager) {
      dialogManager.initializeAllDialogs(elements, setupDialogSwipeGesture);
    }

    if (userManagement) {
      userManagement.setupDialogInteractions(elements);
    }

    const initializeAllDialogButtons = () => {
      const allDialogs = document.querySelectorAll("dialog.dialog");
      allDialogs.forEach((dialog) => {
        if (dialog.hasAttribute("data-buttons-initialized")) {
          return;
        }

        const buttons = dialog.querySelectorAll("[data-button-action]");
        buttons.forEach((button) => {
          const action = button.getAttribute("data-button-action");

          if (action === "confirm") {
            console.log(
              `Pomijam konfigurację przycisku ${action} - będzie obsłużony przez userManagement`
            );
            return;
          }

          const newButton = button.cloneNode(true);
          button.parentNode.replaceChild(newButton, button);

          newButton.addEventListener("click", (e) => {
            if (action === "cancel" || action === "close") {
              dialog.close();
            } else if (action === "login") {
              const loginDialog = document.querySelector("[data-dialog-login]");
              if (loginDialog) loginDialog.showModal();
            } else if (action === "logout") {
              auth.signOut(elements);
            } else if (action === "elo-info") {
              const eloInfoDialog = document.querySelector("[data-dialog-elo-info]");
              if (eloInfoDialog) eloInfoDialog.showModal();
            }
          });
        });

        dialog.setAttribute("data-buttons-initialized", "true");
      });
    };

    initializeAllDialogButtons();

    userManagement.setupAddUserButton(elements);

    function disableAutofocusOnMobile(dialogElement) {
      if (!dialogElement) return;

      const isMobile = window.innerWidth <= 991;

      if (isMobile) {
        const inputFields = dialogElement.querySelectorAll("input");

        inputFields.forEach((field) => {
          field.setAttribute("data-prevent-focus", "true");
          field.setAttribute("tabindex", "-1");

          setTimeout(() => {
            field.setAttribute("tabindex", "0");
          }, 500);
        });

        const preventFocus = () => {
          setTimeout(() => {
            if (document.activeElement && document.activeElement.tagName === "INPUT") {
              document.activeElement.blur();
            }
          }, 50);
        };

        dialogElement.addEventListener("showModal", preventFocus);
        dialogElement.addEventListener("open", preventFocus);
      }
    }

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
    elements.tableBody.innerHTML =
      '<tr><td colspan="9">Wystąpił błąd podczas ładowania danych. Spróbuj odświeżyć stronę.</td></tr>';

    const loadingScreen = document.querySelector("[data-loading-screen]");
    if (loadingScreen) loadingScreen.dataset.loadingScreen = "loaded";

    enableAnimationsAfterLoad();
  }
});

function setupDialogSwipeGesture(dialogElement, options = {}) {
  if (!dialogElement) return;

  const config = {
    offset: 20,
    ...options,
  };

  let startY = 0;
  let currentY = 0;
  let isDragging = false;
  const DISMISS_THRESHOLD = 150;
  const MOBILE_BREAKPOINT = 991;

  const dragHandle = dialogElement.querySelector("[data-dialog-drag]");

  if (!dragHandle) {
    return;
  }

  function handleTouchStart(e) {
    if (window.innerWidth > MOBILE_BREAKPOINT) return;

    const touch = e.touches[0];
    const handleRect = dragHandle.getBoundingClientRect();

    const extendedArea = {
      top: handleRect.top - config.offset,
      bottom: handleRect.bottom + config.offset,
      left: handleRect.left - config.offset,
      right: handleRect.right + config.offset,
    };

    if (
      touch.clientX >= extendedArea.left &&
      touch.clientX <= extendedArea.right &&
      touch.clientY >= extendedArea.top &&
      touch.clientY <= extendedArea.bottom
    ) {
      startY = touch.clientY;
      currentY = startY;
      isDragging = true;

      dialogElement.style.transition = "none";
      dialogElement.style.userSelect = "none";
    }
  }

  function handleTouchMove(e) {
    if (!isDragging || window.innerWidth > MOBILE_BREAKPOINT) return;

    const touch = e.touches[0];
    currentY = touch.clientY;
    const deltaY = currentY - startY;

    if (deltaY < 0) return;

    const translateY = Math.min(deltaY, DISMISS_THRESHOLD * 1.5);

    dialogElement.style.transform = `translateY(${translateY}px)`;

    const tableElement = document.querySelector("[data-table]");
    if (tableElement) {
      const progress = Math.min(1, deltaY / DISMISS_THRESHOLD);
      const newScale = 0.95 + 0.05 * progress;
      tableElement.style.transform = `scale(${newScale})`;
      tableElement.style.transition = "none";
    }

    // If they're dragging down significantly, prevent default to avoid page scroll
    if (deltaY > 10) {
      e.preventDefault();
    }
  }

  function handleTouchEnd() {
    if (!isDragging || window.innerWidth > MOBILE_BREAKPOINT) return;

    const deltaY = currentY - startY;

    dialogElement.style.transition = "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1.25)";

    if (deltaY >= DISMISS_THRESHOLD) {
      dialogElement.style.transform = `translateY(${window.innerHeight}px)`;

      const tableElement = document.querySelector("[data-table]");
      if (tableElement) {
        tableElement.style.transition = "transform 0.3s ease";
        tableElement.style.transform = "scale(1)";
      }

      setTimeout(() => {
        if (dialogElement.close) {
          dialogElement.close();
        } else if (dialogElement.classList.contains("open")) {
          dialogElement.classList.remove("open");
        }

        dialogElement.style.transform = "";
        dialogElement.style.transition = "";
        dialogElement.style.userSelect = "";

        if (dialogElement.dataset && dialogElement.dataset.editingUserId) {
          delete dialogElement.dataset.editingUserId;
        }
      }, 400);
    } else {
      dialogElement.style.transform = "";

      const tableElement = document.querySelector("[data-table]");
      if (tableElement) {
        tableElement.style.transition = "transform 0.3s ease";
        tableElement.style.transform = "scale(0.95)";
      }

      setTimeout(() => {
        dialogElement.style.transition = "";
        dialogElement.style.userSelect = "";
      }, 400);
    }

    isDragging = false;
  }

  dialogElement.addEventListener("touchstart", handleTouchStart, { passive: false });
  dialogElement.addEventListener("touchmove", handleTouchMove, { passive: false });
  dialogElement.addEventListener("touchend", handleTouchEnd);
  dialogElement.addEventListener("touchcancel", handleTouchEnd);
}
