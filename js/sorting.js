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
      const selector = type === "max-reps" ? `[data-user-max="${exercise}"] [data-max-reps]` : `[data-user-max="${exercise}"] [data-one-rep]`;
      const elementA = a.querySelector(selector);
      const elementB = b.querySelector(selector);
      valueA = parseInt(elementA?.dataset.value || 0);
      valueB = parseInt(elementB?.dataset.value || 0);
    }
    return direction === "asc" ? valueA - valueB : valueB - valueA;
  });
  return rowsToSort;
}

// ... existing code ...

export function sortRows(state, elements, exercise, type, direction = "desc") {
  state.currentSort = { exercise, type, direction };

  const rows = Array.from(elements.tableBody.querySelectorAll(".table_row.is-user"));
  if (!rows.length) return;

  const sortedRows = sortDataForRows(rows, exercise, type, direction);

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
        // Aktualizacja po zakończeniu animacji
        updateCellOpacity(state, elements);
        const visibleRows = Array.from(elements.tableBody.querySelectorAll(".table_row")).filter((row) => row.style.display !== "none");
        elements.functions.updateRankAndMedals(visibleRows);
      },
    });
  } else {
    // Bez animacji - bezpośrednie dodanie wierszy do kontenera
    sortedRows.forEach((row) => elements.tableBody.appendChild(row));

    // Wywołanie funkcji aktualizujących po sortowaniu
    updateCellOpacity(state, elements);
    const visibleRows = Array.from(elements.tableBody.querySelectorAll(".table_row")).filter((row) => row.style.display !== "none");
    elements.functions.updateRankAndMedals(visibleRows);
  }
}

// ... existing code ...
