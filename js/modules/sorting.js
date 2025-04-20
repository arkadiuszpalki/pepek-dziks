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

  // W przypadku, gdy jest domyślne sortowanie (elo, score) lub sortowanie po nazwie,
  // przywracamy pełną widoczność dla wszystkich elementów
  if ((currentEx === "elo" && currentType === "score") || currentEx === "name") {
    visibleRows.forEach((row) => {
      // Przywróć pełną widoczność dla wszystkich komórek danych
      row.querySelectorAll(".table_cell.is-data").forEach((cell) => {
        cell.style.opacity = fullOpacity;
      });

      // Przywróć pełną widoczność dla wszystkich elementów w komórkach
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
              // Na mobile pokazujemy TYLKO max-reps, a ukrywamy one-rep
              if (oneWrap) {
                oneWrap.style.display = hiddenDisplay;
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
              // Na mobile pokazujemy TYLKO one-rep, a ukrywamy max-reps
              if (maxWrap) {
                maxWrap.style.display = hiddenDisplay;
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

  // Funkcja do pokazania tylko kolumny ELO
  const showOnlyEloColumn = () => {
    // Na mobile nie ukrywamy kolumn, tylko ustawiamy opacity
    if (window.innerWidth <= 991) {
      // Sprawdź, czy jesteśmy w trybie "main" czy "extra"
      const isExtraView = localStorage.getItem("dziks_view_mode") === "extra";

      if (isExtraView) {
        // Tryb "extra" - wszystkie elementy mają pełną widoczność
        document.querySelectorAll(".table_cell.is-data:last-child").forEach((column) => {
          column.style.opacity = "1";
          column.setAttribute("data-mobile-solo", "show"); // Użyj atrybutu zamiast style.display

          // Upewnij się, że wewnętrzne elementy również mają pełną widoczność
          const eloWrap = column.querySelector("[data-elo-wrap]");
          const sumWrap = column.querySelector("[data-sum-wrap]");
          if (eloWrap) eloWrap.style.opacity = "1";
          if (sumWrap) sumWrap.style.opacity = "1";
        });

        // Wszystkie elementy w extras powinny mieć pełne opacity
        document.querySelectorAll("[data-table-extras] [data-user-max]").forEach((column) => {
          column.style.opacity = "1";

          // Upewnij się, że wewnętrzne elementy również mają pełną widoczność
          const maxWrap = column.querySelector("[data-max-reps-wrap]");
          const oneWrap = column.querySelector("[data-one-rep-wrap]");

          if (maxWrap) {
            maxWrap.style.opacity = "1";
            maxWrap.style.display = "";
          }
          if (oneWrap) {
            oneWrap.style.opacity = "1";
            oneWrap.style.display = "";
          }

          // Wyjątek dla press - tylko "one-rep"
          if (column.dataset.userMax === "press" && maxWrap) {
            maxWrap.style.display = "none";
          }
        });
      } else {
        // Tryb "main" - pokaż tylko ELO/SUM, usuń wszystkie substytuty
        document.querySelectorAll(".table_row").forEach((row) => {
          const eloCell = row.querySelector("[data-user-elo]");
          if (eloCell) {
            eloCell.setAttribute("data-mobile-solo", "show"); // Użyj atrybutu zamiast style.display
            eloCell.style.opacity = "1";

            // Upewnij się, że wewnętrzne elementy również mają pełną widoczność
            const eloWrap = eloCell.querySelector("[data-elo-wrap]");
            const sumWrap = eloCell.querySelector("[data-sum-wrap]");
            if (eloWrap) eloWrap.style.opacity = "1";
            if (sumWrap) sumWrap.style.opacity = "1";
          }

          // Usuń wszystkie komórki zastępcze
          const substitutes = row.querySelectorAll(".is-mobile-substitute");
          substitutes.forEach((sub) => row.removeChild(sub));
        });
      }
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
      // Sprawdź, czy jesteśmy w trybie "main" czy "extra"
      const isExtraView = localStorage.getItem("dziks_view_mode") === "extra";
      // Sprawdź aktualny typ sortowania
      const currentType = state.currentSort.type;

      if (isExtraView) {
        // Tryb "extra" - ELO/SUM zawsze widoczne, tylko odpowiednie ćwiczenie ma opacity 1
        document.querySelectorAll(".table_cell.is-data:last-child").forEach((column) => {
          column.style.opacity = "1";
          column.setAttribute("data-mobile-solo", "show"); // Użyj atrybutu zamiast style.display
          const eloWrap = column.querySelector("[data-elo-wrap]");
          const sumWrap = column.querySelector("[data-sum-wrap]");
          if (eloWrap) eloWrap.style.opacity = "1";
          if (sumWrap) sumWrap.style.opacity = "1";
        });

        // W trybie "extra" ustawiamy opacity dla elementów w tabeli extras
        document.querySelectorAll("[data-table-extras] [data-user-max]").forEach((column) => {
          const maxWrap = column.querySelector("[data-max-reps-wrap]");
          const oneWrap = column.querySelector("[data-one-rep-wrap]");

          if (column.dataset.userMax === exerciseKey) {
            column.style.opacity = "1";

            // Pokaż tylko aktualnie sortowany typ
            if (currentType === "max-reps") {
              if (maxWrap) maxWrap.style.display = "";
              if (oneWrap) oneWrap.style.display = "none";
              if (maxWrap) maxWrap.style.opacity = "1";
            } else if (currentType === "one-rep" || exerciseKey === "press") {
              if (maxWrap) maxWrap.style.display = "none";
              if (oneWrap) oneWrap.style.display = "";
              if (oneWrap) oneWrap.style.opacity = "1";
            }
          } else {
            column.style.opacity = "0.5";

            // Pokaż tylko aktualnie sortowany typ
            if (currentType === "max-reps") {
              if (maxWrap) maxWrap.style.display = "";
              if (oneWrap) oneWrap.style.display = "none";
              if (maxWrap) maxWrap.style.opacity = "0.5";
            } else if (currentType === "one-rep" || column.dataset.userMax === "press") {
              if (maxWrap) maxWrap.style.display = "none";
              if (oneWrap) oneWrap.style.display = "";
              if (oneWrap) oneWrap.style.opacity = "0.5";
            }
          }
        });
      } else {
        // Tryb "main" - zamiana ELO/SUM na odpowiednie ćwiczenie
        document.querySelectorAll(".table_row").forEach((row) => {
          const eloCell = row.querySelector("[data-user-elo]");
          const exerciseCell = row.querySelector(`[data-user-max="${exerciseKey}"]`);

          if (eloCell && exerciseCell) {
            // Ukryj komórkę ELO/SUM
            eloCell.setAttribute("data-mobile-solo", ""); // Użyj atrybutu zamiast style.display

            // Stwórz klon komórki z ćwiczeniem i dodaj jako ostatnią komórkę
            const exerciseClone = exerciseCell.cloneNode(true);
            exerciseClone.classList.add("is-mobile-substitute");
            exerciseClone.setAttribute("data-mobile-solo", "show"); // Pokaż klona
            exerciseClone.style.opacity = "1";

            // Pokaż tylko aktualnie sortowany typ w klonie
            const maxWrap = exerciseClone.querySelector("[data-max-reps-wrap]");
            const oneWrap = exerciseClone.querySelector("[data-one-rep-wrap]");

            if (currentType === "max-reps") {
              if (maxWrap) maxWrap.style.display = "";
              if (oneWrap) oneWrap.style.display = "none";
            } else if (currentType === "one-rep" || exerciseKey === "press") {
              if (maxWrap) maxWrap.style.display = "none";
              if (oneWrap) oneWrap.style.display = "";
            }

            // Jeśli już istnieje komórka zastępcza, usuń ją
            const existingSubstitute = row.querySelector(".is-mobile-substitute");
            if (existingSubstitute) {
              row.removeChild(existingSubstitute);
            }

            // Dodaj nową komórkę zastępczą
            row.appendChild(exerciseClone);
          }
        });
      }
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

    // Funkcja do aktualizacji widoku po zmianie trybu
    const updateViewBasedOnSorting = (newView) => {
      // Sprawdź aktualny stan sortowania
      const currentEx = state.currentSort.exercise;
      const currentType = state.currentSort.type;
      const dimmedOpacity = "0.3";

      if (newView === "main") {
        // W widoku "main" pokazujemy elementy zgodnie z aktualnym sortowaniem
        if (currentEx === "elo" && currentType === "score") {
          // Jeśli sortujemy według ELO, wywołaj showOnlyEloColumn
          showOnlyEloColumn();
        } else if (currentEx in elements.config.exercises) {
          // Jeśli sortujemy według ćwiczenia, wywołaj showOnlyExerciseColumn
          showOnlyExerciseColumn(currentEx);
        }
      } else {
        // W widoku "extra" zawsze pokazujemy ELO/SUM, niezależnie od sortowania
        // Ukryj wszystkie ćwiczenia w widoku głównym
        document.querySelectorAll(".table_row").forEach((row) => {
          // Usuń wszystkie komórki zastępcze
          const substitutes = row.querySelectorAll(".is-mobile-substitute");
          substitutes.forEach((sub) => row.removeChild(sub));

          // Pokaż komórkę ELO/SUM
          const eloCell = row.querySelector("[data-user-elo]");
          if (eloCell) {
            eloCell.setAttribute("data-mobile-solo", "show");
            eloCell.style.opacity = "1";

            // Ustaw odpowiednie opacity dla elementów ELO i SUM w zależności od sortowania
            const eloWrap = eloCell.querySelector("[data-elo-wrap]");
            const sumWrap = eloCell.querySelector("[data-sum-wrap]");

            if (currentEx === "elo") {
              // Sortowanie po ELO/SUM
              if (currentType === "score") {
                // Sortowanie po ELO - podświetl ELO, przyciemnij SUM
                if (eloWrap) eloWrap.style.opacity = "1";
                if (sumWrap) sumWrap.style.opacity = dimmedOpacity;
              } else if (currentType === "sum") {
                // Sortowanie po SUM - podświetl SUM, przyciemnij ELO
                if (eloWrap) eloWrap.style.opacity = dimmedOpacity;
                if (sumWrap) sumWrap.style.opacity = "1";
              }
            } else {
              // Sortowanie po ćwiczeniu - przyciemnij oba elementy ELO i SUM
              if (eloWrap) eloWrap.style.opacity = dimmedOpacity;
              if (sumWrap) sumWrap.style.opacity = dimmedOpacity;
            }
          }
        });

        // W trybie "extra" podświetl aktualnie sortowane ćwiczenie w extras
        if (currentEx in elements.config.exercises) {
          document.querySelectorAll("[data-table-extras] [data-user-max]").forEach((column) => {
            const maxWrap = column.querySelector("[data-max-reps-wrap]");
            const oneWrap = column.querySelector("[data-one-rep-wrap]");

            // W trybie "extra" zawsze pokazujemy wszystkie elementy MR i OR
            if (maxWrap) {
              maxWrap.style.display = "";
              // Wyjątek dla press - tylko "one-rep"
              if (column.dataset.userMax === "press") {
                maxWrap.style.display = "none";
              }
            }
            if (oneWrap) {
              oneWrap.style.display = "";
            }

            if (column.dataset.userMax === currentEx) {
              column.style.opacity = "1";

              // Ustaw pełne opacity tylko dla aktualnie sortowanego typu
              if (currentType === "max-reps") {
                if (maxWrap) maxWrap.style.opacity = "1";
                if (oneWrap) oneWrap.style.opacity = dimmedOpacity;
              } else if (currentType === "one-rep") {
                if (maxWrap && column.dataset.userMax !== "press")
                  maxWrap.style.opacity = dimmedOpacity;
                if (oneWrap) oneWrap.style.opacity = "1";
              }
            } else {
              column.style.opacity = "0.5";

              // Wszystkie elementy niepodświetlonej kolumny mają obniżone opacity
              if (maxWrap) maxWrap.style.opacity = "0.5";
              if (oneWrap) oneWrap.style.opacity = "0.5";
            }
          });
        } else {
          // Jeśli sortujemy według ELO/SUM, wszystkie ćwiczenia w extras mają równe opacity
          document.querySelectorAll("[data-table-extras] [data-user-max]").forEach((column) => {
            column.style.opacity = "1";

            // Pokaż wszystkie elementy
            const maxWrap = column.querySelector("[data-max-reps-wrap]");
            const oneWrap = column.querySelector("[data-one-rep-wrap]");

            if (maxWrap) {
              maxWrap.style.opacity = "1";
              maxWrap.style.display = "";
            }
            if (oneWrap) {
              oneWrap.style.opacity = "1";
              oneWrap.style.display = "";
            }

            // Wyjątek dla press - tylko "one-rep"
            if (column.dataset.userMax === "press" && maxWrap) {
              maxWrap.style.display = "none";
            }
          });
        }
      }
    };

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

      // Zaktualizuj widok na podstawie aktualnego sortowania
      updateViewBasedOnSorting(newView);
    });

    // Wywołaj na początku, aby dostosować widok do początkowego stanu sortowania
    updateViewBasedOnSorting(isExtraView ? "extra" : "main");
  }

  const sortButtonsContainer = document.querySelector(
    ".leaderboard_actions .actions-wrap:nth-child(2)"
  );

  if (!sortButtonsContainer) {
    return;
  }

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
