// Filtering related functions

export function setupFiltering(state, elements) {
  const filterButton = document.querySelector('button[data-button-action="filter-sex"]');
  if (!filterButton) {
    return;
  }
  const filterLabel = filterButton.querySelector(".button_label");

  const updateFilterButtonLabel = () => {
    if (!filterLabel) return;
    const mutedSeparator = '<span class="text-muted"> / </span>';
    switch (state.currentSexFilter) {
      case "m":
        filterLabel.innerHTML = `<span class="is-active">M</span>${mutedSeparator}<span class="text-muted">K</span>`;
        break;
      case "k":
        filterLabel.innerHTML = `<span class="text-muted">M</span>${mutedSeparator}<span class="is-active">K</span>`;
        break;
      default:
        filterLabel.innerHTML = `M${mutedSeparator}K`;
        break;
    }
  };

  updateFilterButtonLabel();

  filterButton.addEventListener("click", () => {
    if (state.currentSexFilter === "all") {
      state.currentSexFilter = "m";
    } else if (state.currentSexFilter === "m") {
      state.currentSexFilter = "k";
    } else {
      state.currentSexFilter = "all";
    }

    updateFilterButtonLabel();
    applyFiltersAndRecalculate(state, elements, true);
  });
}

export function applyFiltersAndRecalculate(state, elements, isGenderFilterChange = false) {
  applySexFilter(state, elements);

  const visibleRows = Array.from(elements.tableBody.querySelectorAll(".table_row")).filter((row) => row.style.display !== "none");

  // Temporarily disable animations if gender filter change
  const originalAnimationState = state.animations?.sort?.enabled;
  if (isGenderFilterChange && state.animations?.sort) {
    state.animations.sort.enabled = false;
  }

  // Sort based on current sort settings
  elements.functions.sortRows(state, elements, state.currentSort.exercise, state.currentSort.type, state.currentSort.direction);

  // Restore animation state
  if (isGenderFilterChange && state.animations?.sort && originalAnimationState !== undefined) {
    state.animations.sort.enabled = originalAnimationState;
  }

  // Update ranks and medals based ONLY on the visible (filtered) rows' ELO scores
  elements.functions.updateRankAndMedals(visibleRows);
}

export function applySexFilter(state, elements) {
  const rows = elements.tableBody.querySelectorAll(".table_row");
  rows.forEach((row) => {
    const genderEl = row.querySelector("[data-user-sex]");
    const gender = genderEl?.dataset.value?.trim().toLowerCase() || "m";

    if (state.currentSexFilter === "all") {
      row.style.display = "";
    } else {
      if (gender === state.currentSexFilter) {
        row.style.display = "";
      } else {
        row.style.display = "none";
      }
    }
  });
}
