// Sorting related functions
// import { animateSort } from "./animations.js";

export function sortDataForRows(rowsToSort, exercise, type, direction) {
  if (!rowsToSort || rowsToSort.length === 0) return rowsToSort;

  rowsToSort.sort((a, b) => {
    let valueA, valueB;

    if (exercise === "name") {
      const nameA = a.querySelector("[data-user-name]")?.dataset.value?.toLowerCase() || "";
      const nameB = b.querySelector("[data-user-name]")?.dataset.value?.toLowerCase() || "";
      return direction === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    } else if (exercise === "elo") {
      if (type === "sum") {
        valueA = parseInt(a.dataset.oneRepSum || 0);
        valueB = parseInt(b.dataset.oneRepSum || 0);
      } else {
        valueA = parseInt(a.dataset.eloScore || 0);
        valueB = parseInt(b.dataset.eloScore || 0);
      }
    } else {
      const selector =
        type === "max-reps"
          ? `[data-user-max="${exercise}"] [data-max-reps]`
          : `[data-user-max="${exercise}"] [data-one-rep]`;
      const elementA = a.querySelector(selector);
      const elementB = b.querySelector(selector);
      valueA = parseInt(elementA?.dataset.value || 0);
      valueB = parseInt(elementB?.dataset.value || 0);
    }
    return direction === "asc" ? valueA - valueB : valueB - valueA;
  });
  return rowsToSort;
}

export function updateCellOpacity(state, elements) {
  const currentEx = state.currentSort.exercise;
  const currentType = state.currentSort.type;
  const isExerciseSort = currentEx in elements.config.exercises;
  const dimmedOpacity = "0.3";
  const mobileDimmedOpacity = "0.25";
  const fullOpacity = "1";
  const hiddenDisplay = "none";
  const defaultDisplay = "";
  const isMobile = window.innerWidth <= 991;

  const visibleRows = Array.from(elements.tableBody.querySelectorAll(".table_row")).filter(
    (row) => row.style.display !== "none"
  );

  if ((currentEx === "elo" && currentType === "score") || currentEx === "name") {
    visibleRows.forEach((row) => {
      row.querySelectorAll("div[data-user-max], .table_cell.is-data:last-child").forEach((cell) => {
        cell.style.opacity = fullOpacity;
        const maxWrap = cell.querySelector("[data-max-reps-wrap]");
        const oneWrap = cell.querySelector("[data-one-rep-wrap]");
        const eloWrap = cell.querySelector("[data-elo-wrap]");
        const sumWrap = cell.querySelector("[data-sum-wrap]");

        if (maxWrap) {
          maxWrap.style.opacity = fullOpacity;
          maxWrap.style.display = defaultDisplay;
        }
        if (oneWrap) {
          oneWrap.style.opacity = fullOpacity;
          oneWrap.style.display = defaultDisplay;
        }
        if (eloWrap) {
          eloWrap.style.opacity = fullOpacity;
          eloWrap.style.display = defaultDisplay;
        }
        if (sumWrap) {
          sumWrap.style.opacity = fullOpacity;
          sumWrap.style.display = defaultDisplay;
        }

        if (cell.dataset.userMax === "press" && maxWrap) {
          maxWrap.style.display = hiddenDisplay;
        }
      });
    });
  } else {
    visibleRows.forEach((row) => {
      row.querySelectorAll("div[data-user-max]").forEach((cell) => {
        const cellEx = cell.dataset.userMax;
        const maxWrap = cell.querySelector("[data-max-reps-wrap]");
        const oneWrap = cell.querySelector("[data-one-rep-wrap]");

        cell.style.opacity = fullOpacity;
        if (maxWrap) {
          maxWrap.style.opacity = fullOpacity;
          maxWrap.style.display = defaultDisplay;
        }
        if (oneWrap) {
          oneWrap.style.opacity = fullOpacity;
          oneWrap.style.display = defaultDisplay;
        }

        if (cellEx === "press" && maxWrap) {
          maxWrap.style.display = hiddenDisplay;
        }

        if (isExerciseSort) {
          if (currentType === "max-reps") {
            if (isMobile) {
              // Na mobile pokazujemy obie wartości, ale z różnym opacity
              if (oneWrap) {
                oneWrap.style.display = defaultDisplay;
                oneWrap.style.opacity = mobileDimmedOpacity;
              }
            } else {
              // Na desktopie ukrywamy one-rep przy sortowaniu max-reps
              if (oneWrap) oneWrap.style.display = hiddenDisplay;
            }

            if (cellEx !== currentEx && maxWrap) {
              maxWrap.style.opacity = dimmedOpacity;
            }
          } else if (currentType === "one-rep") {
            if (isMobile) {
              // Na mobile pokazujemy obie wartości, ale z różnym opacity
              if (maxWrap) {
                maxWrap.style.display = defaultDisplay;
                maxWrap.style.opacity = mobileDimmedOpacity;
              }
            } else {
              // Na desktopie ukrywamy max-reps przy sortowaniu one-rep
              if (maxWrap) maxWrap.style.display = hiddenDisplay;
            }

            if (cellEx !== currentEx && oneWrap) {
              oneWrap.style.opacity = dimmedOpacity;
            }
          }
        } else if (currentEx === "elo" && currentType === "sum") {
          if (maxWrap) maxWrap.style.display = hiddenDisplay;
          if (oneWrap) oneWrap.style.display = hiddenDisplay;
        }
      });

      const eloWrap = row.querySelector("[data-elo-wrap]");
      const sumWrap = row.querySelector("[data-sum-wrap]");

      if (currentEx === "elo" && currentType === "score") {
        if (eloWrap) eloWrap.style.display = defaultDisplay;
        if (sumWrap) sumWrap.style.display = defaultDisplay;
      } else {
        if (eloWrap) eloWrap.style.display = hiddenDisplay;
        if (sumWrap) sumWrap.style.display = hiddenDisplay;
      }
    });
  }
}

export function sortRows(state, elements, exercise, type, direction = "desc") {
  state.currentSort = { exercise, type, direction };

  const rows = Array.from(elements.tableBody.querySelectorAll(".table_row.is-user"));
  if (!rows.length) return;

  const sortedRows = sortDataForRows(rows, exercise, type, direction);

  // Najpierw aktualizujemy opacity dla wszystkich elementów
  updateCellOpacity(state, elements);

  // Sprawdzenie czy animacje są włączone i czy GSAP/Flip są dostępne
  if (state.animations?.sort?.enabled && window.Flip) {
    // Zapisanie stanu przed sortowaniem
    const flipState = Flip.getState(rows);

    // Dodanie wierszy w nowej kolejności do tabeli
    sortedRows.forEach((row) => elements.tableBody.appendChild(row));

    // Animacja przejścia z poprzedniego stanu do nowego
    Flip.from(flipState, {
      duration: state.animations.sort.duration || 0.5,
      ease: state.animations.sort.ease || "power1.inOut",
      absolute: true,
      onComplete: () => {
        // Po zakończeniu animacji aktualizujemy tylko rangi i medale
        const visibleRows = Array.from(elements.tableBody.querySelectorAll(".table_row")).filter(
          (row) => row.style.display !== "none"
        );
        elements.functions.updateRankAndMedals(visibleRows);
      },
    });
  } else {
    // Bez animacji - bezpośrednie dodanie wierszy do kontenera
    sortedRows.forEach((row) => elements.tableBody.appendChild(row));

    // Aktualizacja rang i medali
    const visibleRows = Array.from(elements.tableBody.querySelectorAll(".table_row")).filter(
      (row) => row.style.display !== "none"
    );
    elements.functions.updateRankAndMedals(visibleRows);
  }
}

export function setupSorting(state, elements) {
  document
    .querySelectorAll(".leaderboard_actions button[data-button-action^='sort-']")
    .forEach((button) => {
      const label = button.querySelector(".button_label");
      if (label) {
        button.dataset.originalText = label.textContent.trim();
      }
    });

  const sortButtonsContainer = document.querySelector(".leaderboard_actions .actions-wrap");
  const resetButtonContainer = document.querySelector("[data-sort-button]");
  const resetButton = resetButtonContainer
    ? resetButtonContainer.querySelector('[data-button-action="clear-sort"]')
    : null;

  if (!sortButtonsContainer || !resetButtonContainer || !resetButton) {
    return;
  }

  resetButtonContainer.style.display = "none";

  // Sprawdź czy jesteśmy na urządzeniu mobilnym
  const isMobile = () => window.innerWidth <= 991;

  // Ustaw pozycjonowanie przycisku reset w zależności od urządzenia
  const positionResetButton = () => {
    if (isMobile()) {
      // Na mobile dodaj klasę do kontenera przycisku reset
      resetButtonContainer.classList.add("mobile-reset-button");
      // Dodaj styl dla przycisku, jeśli jeszcze nie istnieje
      if (!document.getElementById("mobile-reset-button-style")) {
        const style = document.createElement("style");
        style.id = "mobile-reset-button-style";
        style.textContent = `
          .mobile-reset-button {
            position: absolute !important;
            right: 0 !important;
            top: 0 !important;
            display: none;
          }
        `;
        document.head.appendChild(style);
      }
    } else {
      // Na desktopie usuń klasę
      resetButtonContainer.classList.remove("mobile-reset-button");
    }
  };

  // Wywołaj funkcję przy starcie
  positionResetButton();

  // Nasłuchuj zmian rozmiaru okna
  window.addEventListener("resize", positionResetButton);

  // Funkcja do pokazania tylko kolumny ELO
  const showOnlyEloColumn = () => {
    // Ukryj wszystkie kolumny danych
    document.querySelectorAll('[data-mobile-solo="show"]').forEach((column) => {
      column.setAttribute("data-mobile-solo", "");
    });

    // Pokaż tylko kolumnę ELO
    document.querySelectorAll('[data-table-header="elo"]').forEach((column) => {
      column.setAttribute("data-mobile-solo", "show");
    });

    document.querySelectorAll(".table_cell.is-data:last-child").forEach((column) => {
      column.setAttribute("data-mobile-solo", "show");
    });

    // Dla mobilnych urządzeń - ukryj przycisk reset jeśli nie ma aktywnego sortowania
    if (isMobile() && state.currentSort.exercise === "elo" && state.currentSort.type === "score") {
      resetButtonContainer.style.display = "none";
    }
  };

  // Funkcja do pokazania tylko wybranej kolumny ćwiczenia
  const showOnlyExerciseColumn = (exerciseKey) => {
    // Ukryj wszystkie kolumny danych
    document.querySelectorAll('[data-mobile-solo="show"]').forEach((column) => {
      column.setAttribute("data-mobile-solo", "");
    });

    // Pokaż tylko wybraną kolumnę ćwiczenia
    document.querySelectorAll(`[data-table-header="${exerciseKey}"]`).forEach((column) => {
      column.setAttribute("data-mobile-solo", "show");
    });

    document.querySelectorAll(`[data-user-max="${exerciseKey}"]`).forEach((column) => {
      column.setAttribute("data-mobile-solo", "show");
    });

    // Na mobilnych urządzeniach zawsze pokazuj przycisk reset gdy jest aktywne sortowanie
    if (isMobile() && resetButtonContainer) {
      resetButtonContainer.style.display = "";
    }
  };

  // Zastosuj domyślny widok mobilny przy ładowaniu strony
  showOnlyEloColumn();

  sortButtonsContainer.addEventListener("click", (e) => {
    const button = e.target.closest("button[data-button-action^='sort-']");
    if (!button || button.dataset.buttonAction === "sort-reset") return;

    const action = button.dataset.buttonAction;
    const sortKey = action.replace("sort-", "");

    if (!(sortKey in elements.config.exercises)) return;

    let sortExercise = sortKey;
    let sortType = "max-reps";
    let sortDirection = "desc";

    if (sortExercise === "press") {
      sortType = "one-rep";
    } else {
      if (state.currentSort.exercise === sortExercise) {
        sortType = state.currentSort.type === "max-reps" ? "one-rep" : "max-reps";
      }
    }

    sortRows(state, elements, sortExercise, sortType, sortDirection);

    // Zastosuj widok mobilny - pokaż tylko wybraną kolumnę ćwiczenia
    showOnlyExerciseColumn(sortKey);

    sortButtonsContainer
      .querySelectorAll("button[data-button-action^='sort-'].is-sort-active")
      .forEach((btn) => {
        btn.classList.remove("is-sort-active");
        const label = btn.querySelector(".button_label");
        const originalText = btn.dataset.originalText;
        if (label && originalText) {
          label.textContent = originalText;
        }
        const existingPrefix = btn.querySelector("span.is-active");
        if (existingPrefix) existingPrefix.remove();
      });

    button.classList.add("is-sort-active");

    let prefix = "";
    if (state.currentSort.exercise === "press") {
      prefix = "OR";
    } else if (elements.config.exercises[state.currentSort.exercise]) {
      prefix = state.currentSort.type === "one-rep" ? "OR" : "MR";
    }

    const label = button.querySelector(".button_label");

    const originalText = button.dataset.originalText;
    if (label && originalText) {
      label.textContent = originalText;
    }

    if (label && prefix) {
      const prefixSpan = document.createElement("span");
      prefixSpan.className = "is-active";
      prefixSpan.textContent = prefix;
      label.parentNode.insertBefore(prefixSpan, label);
    }

    if (resetButtonContainer) {
      if (isMobile()) {
        // Na mobile przycisk reset zawsze będzie po prawej stronie
        sortButtonsContainer.appendChild(resetButtonContainer);
        resetButtonContainer.style.display = "";
      } else {
        // Na desktopie zachowujemy oryginalne zachowanie
        const activeButtonWrap = button.closest(".button_wrap");
        if (activeButtonWrap && activeButtonWrap.parentNode === sortButtonsContainer) {
          sortButtonsContainer.insertBefore(resetButtonContainer, activeButtonWrap);
          resetButtonContainer.style.display = "";
        } else {
          sortButtonsContainer.prepend(resetButtonContainer);
          resetButtonContainer.style.display = "";
        }
      }
    }
  });

  resetButton.addEventListener("click", () => {
    state.currentSort = { exercise: "elo", type: "score", direction: "desc" };
    sortRows(
      state,
      elements,
      state.currentSort.exercise,
      state.currentSort.type,
      state.currentSort.direction
    );

    // Zastosuj widok mobilny - przywróć tylko kolumnę ELO
    showOnlyEloColumn();

    // Na urządzeniu mobilnym zachowujemy widoczność przycisku reset
    if (!isMobile()) {
      resetButtonContainer.style.display = "none";
    }

    sortButtonsContainer
      .querySelectorAll("button[data-button-action^='sort-'].is-sort-active")
      .forEach((btn) => {
        btn.classList.remove("is-sort-active");
        const label = btn.querySelector(".button_label");
        const originalText = btn.dataset.originalText;
        if (label && originalText) {
          label.textContent = originalText;
        }
        const existingPrefix = btn.querySelector("span.is-active");
        if (existingPrefix) existingPrefix.remove();
      });

    updateCellOpacity(state, elements);
    const visibleRows = Array.from(elements.tableBody.querySelectorAll(".table_row")).filter(
      (row) => row.style.display !== "none"
    );
    elements.functions.updateRankAndMedals(visibleRows);
  });
}
