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
  const fullOpacity = "1";
  const hiddenDisplay = "none";
  const defaultDisplay = "";
  const isMobile = window.innerWidth <= 991;

  const visibleRows = Array.from(elements.tableBody.querySelectorAll(".table_row")).filter(
    (row) => row.style.display !== "none"
  );

  // W przypadku, gdy jest domyślne sortowanie (elo, score) lub sortowanie po nazwie,
  // przywracamy pełną widoczność dla wszystkich elementów
  if ((currentEx === "elo" && currentType === "score") || currentEx === "name") {
    visibleRows.forEach((row) => {
      // Przywróć pełną widoczność dla wszystkich komórek danych
      row
        .querySelectorAll(".table_cell.is-data:not([data-table-extras] .table_cell)")
        .forEach((cell) => {
          cell.style.opacity = fullOpacity;
        });

      // Przywróć pełną widoczność dla wszystkich elementów w komórkach
      row
        .querySelectorAll(
          "div[data-user-max]:not([data-table-extras] div[data-user-max]), .table_cell.is-data:last-child"
        )
        .forEach((cell) => {
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

      // Dodatkowo upewnij się, że kolumna ELO/SUM ma pełną widoczność
      const eloCell = row.querySelector("[data-user-elo]");
      if (eloCell) {
        eloCell.style.opacity = fullOpacity;
        const eloWrap = eloCell.querySelector("[data-elo-wrap]");
        const sumWrap = eloCell.querySelector("[data-sum-wrap]");

        if (eloWrap) eloWrap.style.opacity = fullOpacity;
        if (sumWrap) sumWrap.style.opacity = fullOpacity;
      }
    });
  } else {
    visibleRows.forEach((row) => {
      // Obsługujemy standardowe komórki tabeli - wykluczamy elementy w data-table-extras
      row
        .querySelectorAll("div[data-user-max]:not([data-table-extras] div[data-user-max])")
        .forEach((cell) => {
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
                // Na mobile pokazujemy OBA elementy, ale z różnym opacity
                if (maxWrap) maxWrap.style.opacity = fullOpacity;
                if (oneWrap) oneWrap.style.opacity = dimmedOpacity;

                // Ale zawsze display: block (lub defaultDisplay)
                if (oneWrap) oneWrap.style.display = defaultDisplay;
              } else {
                // Na desktopie ukrywamy one-rep przy sortowaniu max-reps
                if (oneWrap) oneWrap.style.display = hiddenDisplay;
              }

              if (cellEx !== currentEx && maxWrap) {
                maxWrap.style.opacity = dimmedOpacity;
              }
            } else if (currentType === "one-rep") {
              if (isMobile) {
                // Na mobile pokazujemy OBA elementy, ale z różnym opacity
                if (oneWrap) oneWrap.style.opacity = fullOpacity;
                if (maxWrap && cellEx !== "press") maxWrap.style.opacity = dimmedOpacity;

                // Ale zawsze display: block (lub defaultDisplay)
                if (maxWrap && cellEx !== "press") maxWrap.style.display = defaultDisplay;
              } else {
                // Na desktopie ukrywamy max-reps przy sortowaniu one-rep
                if (maxWrap) maxWrap.style.display = hiddenDisplay;
              }

              if (cellEx !== currentEx && oneWrap) {
                oneWrap.style.opacity = dimmedOpacity;
              }
            }
          } else if (currentEx === "elo" && currentType === "sum") {
            if (isMobile) {
              // Na mobile pokazujemy OBA elementy, z normalnym opacity
              if (maxWrap && cellEx !== "press") maxWrap.style.display = defaultDisplay;
              if (oneWrap) oneWrap.style.display = defaultDisplay;
            } else {
              // Na desktop ukrywamy oba elementy
              if (maxWrap) maxWrap.style.display = hiddenDisplay;
              if (oneWrap) oneWrap.style.display = hiddenDisplay;
            }
          }
        });

      // Zawsze wyświetlamy kolumny ELO i SUM, ale zmieniamy ich widoczność
      const eloWrap = row.querySelector("[data-elo-wrap]");
      const sumWrap = row.querySelector("[data-sum-wrap]");

      // Zawsze pokazujemy ELO i SUM, niezależnie od sortowania
      if (eloWrap) eloWrap.style.display = defaultDisplay;
      if (sumWrap) sumWrap.style.display = defaultDisplay;

      // Dostosuj opacity w zależności od typu sortowania
      if (currentEx === "elo") {
        if (currentType === "score" && eloWrap) {
          eloWrap.style.opacity = fullOpacity;
          if (sumWrap) sumWrap.style.opacity = dimmedOpacity;
        } else if (currentType === "sum" && sumWrap) {
          sumWrap.style.opacity = fullOpacity;
          if (eloWrap) eloWrap.style.opacity = dimmedOpacity;
        }
      } else {
        // Dla innych typów sortowania, przyciemniamy oba elementy
        if (eloWrap) eloWrap.style.opacity = dimmedOpacity;
        if (sumWrap) sumWrap.style.opacity = dimmedOpacity;
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

  // Ustaw atrybuty data-mobile-sort dla elementów na urządzeniach mobilnych
  // 1. Najpierw dla nagłówków tabeli
  const tableHeaders = document.querySelectorAll(".table_row.is-headline .table_header");
  tableHeaders.forEach((header) => {
    const headerType = header.dataset.tableHeader;

    if (exercise in elements.config.exercises) {
      // Sortowanie po ćwiczeniu - ukryj wszystkie nagłówki, pokaż tylko sortowany ćwiczenie i podstawowe
      if (headerType === exercise) {
        // Pokaż nagłówek aktualnie sortowanego ćwiczenia
        header.setAttribute("data-mobile-sort", "show");
      } else if (headerType === "rank" || headerType === "name") {
        // Zawsze pokazuj rank i name
        header.setAttribute("data-mobile-sort", "show");
      } else {
        // Ukryj pozostałe nagłówki, w tym "WYNIK" (elo)
        header.setAttribute("data-mobile-sort", "hide");
      }
    } else {
      // Sortowanie po ELO/SUM lub nazwie
      if (headerType === "rank" || headerType === "name") {
        // Zawsze pokazuj rank i name
        header.setAttribute("data-mobile-sort", "show");
      } else if (headerType === "elo" && exercise === "elo" && type === "score") {
        // Pokaż "WYNIK" tylko przy domyślnym sortowaniu (elo/score)
        header.setAttribute("data-mobile-sort", "show");
      } else {
        // Ukryj pozostałe nagłówki
        header.setAttribute("data-mobile-sort", "hide");
      }
    }
  });

  // 2. Następnie dla wierszy danych
  rows.forEach((row) => {
    // Pobierz elementy ELO/SUM i wszystkie komórki ćwiczeń
    const eloCell = row.querySelector("[data-user-elo]");
    const exerciseCells = row.querySelectorAll(
      "div[data-user-max]:not([data-table-extras] div[data-user-max])"
    );

    if (exercise in elements.config.exercises) {
      // Sortowanie po ćwiczeniu - ukryj ELO/SUM, pokaż sortowane ćwiczenie
      if (eloCell) {
        eloCell.setAttribute("data-mobile-sort", "hide");
      }

      // Ukryj wszystkie ćwiczenia, a potem pokaż tylko to, po którym sortujemy
      exerciseCells.forEach((cell) => {
        const cellExercise = cell.dataset.userMax;
        if (cellExercise === exercise) {
          cell.setAttribute("data-mobile-sort", "show");
        } else {
          cell.setAttribute("data-mobile-sort", "hide");
        }
      });
    } else {
      // Sortowanie po ELO/SUM lub nazwie - pokaż ELO/SUM, ukryj wszystkie ćwiczenia
      if (eloCell) {
        eloCell.setAttribute("data-mobile-sort", "show");
      }

      exerciseCells.forEach((cell) => {
        cell.setAttribute("data-mobile-sort", "hide");
      });
    }
  });

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

  // Obsługa przycisku toggle-view
  const toggleViewButton = document.querySelector("button[data-button-action='toggle-view']");
  if (toggleViewButton) {
    // Sprawdź, czy istnieje zapisana preferencja użytkownika w localStorage
    const isExtraMode = localStorage.getItem("dziks_view_mode") === "extra";

    // Funkcja do sprawdzania czy urządzenie jest mobilne
    const isMobile = () => window.innerWidth <= 991;

    // Funkcja do ustawiania widoczności elementów zgodnie z trybem
    const setViewMode = (isExtra) => {
      // Zapisz preferencję użytkownika
      localStorage.setItem("dziks_view_mode", isExtra ? "extra" : "default");

      // Ustawiamy widoczność elementów data-table-extras - TYLKO na urządzeniach mobilnych
      document.querySelectorAll("[data-table-extras]").forEach((extrasElement) => {
        // Na desktopie zawsze ukrywamy extras, niezależnie od preferencji
        if (!isMobile()) {
          extrasElement.style.display = "none";
        } else {
          // Na mobile pokazujemy/ukrywamy zgodnie z preferencją
          extrasElement.style.display = isExtra ? "grid" : "none";
        }
      });

      // Ustawiamy widoczność dzieci przycisku toggle-view
      const toggleChildren = toggleViewButton.children;
      if (toggleChildren.length >= 2) {
        // W trybie domyślnym - ukryj pierwsze dziecko, pokaż pozostałe
        if (!isExtra) {
          toggleChildren[0].style.display = "none";
          for (let i = 1; i < toggleChildren.length; i++) {
            toggleChildren[i].style.display = "";
          }
        }
        // W trybie extra - ukryj ostatnie dziecko, pokaż pozostałe
        else {
          const lastIndex = toggleChildren.length - 1;
          toggleChildren[lastIndex].style.display = "none";
          for (let i = 0; i < lastIndex; i++) {
            toggleChildren[i].style.display = "";
          }
        }
      }
    };

    // Ustaw początkowy stan widoku
    setViewMode(isExtraMode);

    // Dodaj obsługę kliknięcia przycisku
    toggleViewButton.addEventListener("click", () => {
      // Sprawdź aktualny tryb
      const currentMode = localStorage.getItem("dziks_view_mode");
      const newMode = currentMode === "extra" ? "default" : "extra";

      // Zaktualizuj widok - ale tylko jeśli jesteśmy na urządzeniu mobilnym
      if (isMobile()) {
        setViewMode(newMode === "extra");
      }
    });

    // Dodaj obsługę zmian szerokości okna, aby odpowiednio ukrywać extras
    window.addEventListener("resize", () => {
      // Pobierz aktualny tryb
      const currentMode = localStorage.getItem("dziks_view_mode");

      // Jeśli zmieniła się szerokość okna, zastosuj odpowiednie style
      document.querySelectorAll("[data-table-extras]").forEach((extrasElement) => {
        // Na desktopie zawsze ukrywamy extras
        if (!isMobile()) {
          extrasElement.style.display = "none";
        } else {
          // Na mobile stosujemy preferencję
          extrasElement.style.display = currentMode === "extra" ? "grid" : "none";
        }
      });
    });
  }

  const sortButtonsContainer = document.querySelector(
    ".leaderboard_actions .actions-wrap:nth-child(2)"
  );

  if (!sortButtonsContainer) {
    return;
  }

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
