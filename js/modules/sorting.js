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
        // Na urządzeniach mobilnych zawsze pokazujemy ELO
        if (isMobile) {
          if (eloWrap) eloWrap.style.display = defaultDisplay;
          if (sumWrap) sumWrap.style.display = defaultDisplay;
        } else {
          if (eloWrap) eloWrap.style.display = hiddenDisplay;
          if (sumWrap) sumWrap.style.display = hiddenDisplay;
        }
      }
    });
  }
}

export function sortRows(state, elements, exercise, type, direction = "desc") {
  state.currentSort = { exercise, type, direction };

  const rows = Array.from(elements.tableBody.querySelectorAll(".table_row.is-user"));
  if (!rows.length) return;

  // Upewnij się, że wszystkie wiersze mają ustawiony originalRank, jeśli nie był ustawiony wcześniej
  if (exercise === "elo" && type === "score") {
    rows
      .sort((a, b) => {
        const eloA = parseInt(a.dataset.eloScore || 0);
        const eloB = parseInt(b.dataset.eloScore || 0);
        return direction === "asc" ? eloA - eloB : eloB - eloA;
      })
      .forEach((row, index) => {
        if (!row.dataset.originalRank) {
          row.dataset.originalRank = (index + 1).toString();
        }
      });
  }

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

  // Obsługa przycisku toggle-view dla widoku mobilnego
  const toggleViewButton = document.querySelector("button[data-button-action='toggle-view']");
  if (toggleViewButton) {
    // Sprawdź, czy istnieje zapisana preferencja użytkownika
    const isExtraView = localStorage.getItem("dziks_view_mode") === "extra";

    // Ustaw początkowy atrybut data-toggle-view
    toggleViewButton.setAttribute("data-toggle-view", isExtraView ? "extra" : "main");

    // Ustaw początkowy stan widoczności extras
    document.querySelectorAll("[data-table-extras]").forEach((extrasElement) => {
      extrasElement.style.display = isExtraView ? "grid" : "none";
    });

    // Dodaj obsługę kliknięcia przycisku
    toggleViewButton.addEventListener("click", () => {
      // Odczytaj aktualny stan z atrybutu
      const currentView = toggleViewButton.getAttribute("data-toggle-view");
      const newView = currentView === "main" ? "extra" : "main";

      // Zapisz nowy stan
      localStorage.setItem("dziks_view_mode", newView);

      // Zmień atrybut przycisku
      toggleViewButton.setAttribute("data-toggle-view", newView);

      // Zmień widoczność extras
      document.querySelectorAll("[data-table-extras]").forEach((extrasElement) => {
        extrasElement.style.display = newView === "extra" ? "grid" : "none";
      });
    });
  }

  const sortButtonsContainer = document.querySelector(
    ".leaderboard_actions .actions-wrap:nth-child(2)"
  );

  if (!sortButtonsContainer) {
    return;
  }

  // Funkcja do pokazania tylko kolumny ELO
  const showOnlyEloColumn = () => {
    // Na mobile nie ukrywamy kolumn, tylko ustawiamy opacity
    if (window.innerWidth <= 991) {
      // Upewnij się, że elementy ELO są zawsze widoczne
      document.querySelectorAll(".table_cell.is-data:last-child").forEach((column) => {
        column.style.opacity = "1";
      });
      // Przy ładowaniu strony wszystkie elementy w extras powinny mieć pełne opacity
      document.querySelectorAll("[data-table-extras] [data-user-max]").forEach((column) => {
        column.style.opacity = "1";
      });
    } else {
      // Dla desktop zostawiamy stare zachowanie
      document.querySelectorAll('[data-mobile-solo="show"]').forEach((column) => {
        column.setAttribute("data-mobile-solo", "");
      });

      document.querySelectorAll('[data-table-header="elo"]').forEach((column) => {
        column.setAttribute("data-mobile-solo", "show");
      });

      document.querySelectorAll(".table_cell.is-data:last-child").forEach((column) => {
        column.setAttribute("data-mobile-solo", "show");
      });
    }
  };

  // Funkcja do pokazania tylko wybranej kolumny ćwiczenia
  const showOnlyExerciseColumn = (exerciseKey) => {
    if (window.innerWidth <= 991) {
      // Na mobile ustawiamy opacity dla elementów w tabeli extras
      // Upewnij się, że elementy ELO są zawsze widoczne
      document.querySelectorAll(".table_cell.is-data:last-child").forEach((column) => {
        column.style.opacity = "1";
      });
      document.querySelectorAll("[data-table-extras] [data-user-max]").forEach((column) => {
        if (column.dataset.userMax === exerciseKey) {
          column.style.opacity = "1";
        } else {
          column.style.opacity = "0.5";
        }
      });
    } else {
      // Dla desktop zostawiamy stare zachowanie
      document.querySelectorAll('[data-mobile-solo="show"]').forEach((column) => {
        column.setAttribute("data-mobile-solo", "");
      });

      document.querySelectorAll(`[data-table-header="${exerciseKey}"]`).forEach((column) => {
        column.setAttribute("data-mobile-solo", "show");
      });

      document.querySelectorAll(`[data-user-max="${exerciseKey}"]`).forEach((column) => {
        column.setAttribute("data-mobile-solo", "show");
      });
    }
  };

  // Zastosuj domyślny widok mobilny przy ładowaniu strony
  showOnlyEloColumn();

  // Zaktualizuj funkcję obsługi kliknięcia przycisku sortowania
  sortButtonsContainer.addEventListener("click", (e) => {
    const button = e.target.closest("button[data-button-action^='sort-']");
    if (!button || button.dataset.buttonAction === "sort-reset") return;

    const action = button.dataset.buttonAction;
    const sortKey = action.replace("sort-", "");

    if (!(sortKey in elements.config.exercises)) return;

    // Implementacja cyklu 3-klikowego dla każdego przycisku
    let sortExercise = sortKey;
    let sortType = "max-reps";
    let sortDirection = "desc";
    let resetView = false;

    // Jeśli obecnie jesteśmy na tym samym ćwiczeniu
    if (state.currentSort.exercise === sortExercise) {
      // Jeśli już jesteśmy na OR, to następny krok to reset
      if (state.currentSort.type === "one-rep") {
        resetView = true;
      }
      // Jeśli jesteśmy na MR, następny krok to OR
      else if (state.currentSort.type === "max-reps") {
        sortType = "one-rep";
      }
    }

    // Obsługa resetu lub normalnego sortowania
    if (resetView) {
      // Resetuj do widoku domyślnego (ELO)
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

      // Zresetuj style przycisków
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
    } else {
      // Obsługa specjalnego przypadku dla press, który ma tylko OR
      if (sortExercise === "press") {
        sortType = "one-rep";
      }

      sortRows(state, elements, sortExercise, sortType, sortDirection);

      // Zastosuj widok mobilny - pokaż tylko wybraną kolumnę ćwiczenia
      showOnlyExerciseColumn(sortKey);

      // Najpierw usuń aktywne style ze wszystkich przycisków
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
    }

    updateCellOpacity(state, elements);
    const visibleRows = Array.from(elements.tableBody.querySelectorAll(".table_row")).filter(
      (row) => row.style.display !== "none"
    );
    elements.functions.updateRankAndMedals(visibleRows);
  });
}
