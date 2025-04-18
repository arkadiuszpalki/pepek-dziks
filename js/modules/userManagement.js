// User management functions (add, edit, delete)
import { CONFIG } from "./config.js";
import * as api from "./api.js";
import * as auth from "./auth.js";
import { displayValue } from "../utils/formatters.js";

// Funkcja do blokowania przewijania strony, gdy dialog jest otwarty
function toggleBodyScroll(disable) {
  if (disable) {
    // Zapisz aktualną pozycję przewijania
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflowY = "scroll";

    // Upewnij się, że dialog może przewijać wewnętrznie, jeśli jego zawartość jest za duża
    const dialog = document.querySelector(".dialog");
    if (dialog) {
      dialog.style.maxHeight = "90vh";
      dialog.style.overflowY = "auto";
    }
  } else {
    // Przywróć pozycję przewijania
    const scrollY = document.body.style.top;
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    document.body.style.overflowY = "";
    window.scrollTo(0, parseInt(scrollY || "0") * -1);
  }
}

export function setupDialogInteractions(elements) {
  const dialog = elements.authElements.theDialog;
  if (!dialog) {
    return;
  }

  // Blokuj scroll strony, gdy dialog jest otwarty
  dialog.addEventListener("close", () => {
    toggleBodyScroll(false);
  });

  dialog.addEventListener("showModal", () => {
    toggleBodyScroll(true);
  });

  // Alternatywne nasłuchiwanie otwarcia dialogu
  const originalShowModal = dialog.showModal;
  dialog.showModal = function () {
    originalShowModal.apply(this, arguments);
    toggleBodyScroll(true);
  };

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
      delete dialog.dataset.editingUserId;
      auth.updateTableRowStyles(elements);
    }
  });

  const inputWrappers = dialog.querySelectorAll(
    "[data-action-input], [data-action-input-max-reps], [data-action-input-one-rep]"
  );

  inputWrappers.forEach((wrapper) => {
    if (wrapper.dataset.actionInput === "sex") return;

    const valueSpan = wrapper.querySelector("[data-action-input-value]");

    if (valueSpan) {
      valueSpan.setAttribute("contenteditable", "true");

      const originalPlaceholder = valueSpan.textContent.trim();
      valueSpan.dataset.originalPlaceholder = originalPlaceholder;

      if (originalPlaceholder !== "") {
        valueSpan.dataset.placeholderCleared = "false";
      } else {
        valueSpan.dataset.placeholderCleared = "true";
      }

      wrapper.addEventListener("click", (event) => {
        if (event.target !== valueSpan) {
          // valueSpan.focus(); // Autofocus wyłączony globalnie
        }
      });

      valueSpan.addEventListener("focus", () => {
        if (valueSpan.dataset.placeholderCleared === "false") {
          valueSpan.textContent = "";
          valueSpan.dataset.placeholderCleared = "true";
        } else {
          requestAnimationFrame(() => {
            try {
              const selection = window.getSelection();
              const range = document.createRange();

              if (valueSpan.firstChild) {
                range.setStart(valueSpan.firstChild, valueSpan.textContent.length);
                range.collapse(true);
              } else {
                range.selectNodeContents(valueSpan);
                range.collapse(false);
              }

              selection.removeAllRanges();
              selection.addRange(range);
            } catch (e) {
              console.error("Error setting cursor position on focus:", e);
            }
          });
        }
      });

      valueSpan.addEventListener("blur", () => {
        if (valueSpan.textContent.trim() === "") {
          valueSpan.textContent = valueSpan.dataset.originalPlaceholder;
          valueSpan.dataset.placeholderCleared = "false";
        }
      });

      valueSpan.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
        }
      });

      const isNumericInput =
        wrapper.hasAttribute("data-action-input-max-reps") ||
        wrapper.hasAttribute("data-action-input-one-rep") ||
        wrapper.dataset.actionInput === "weight";

      if (isNumericInput) {
        valueSpan.setAttribute("inputmode", "numeric");
        valueSpan.setAttribute("pattern", "[0-9]*");

        valueSpan.addEventListener("input", (event) => {
          const originalText = event.target.textContent;
          const digitsOnly = originalText.replace(/\D/g, "");

          if (originalText !== digitsOnly) {
            const selection = window.getSelection();
            const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
            const currentOffset = range ? range.startOffset : 0;
            const textNode =
              range && range.startContainer.nodeType === Node.TEXT_NODE
                ? range.startContainer
                : event.target.firstChild;

            let nonDigitsBeforeCursor = 0;
            if (textNode && currentOffset > 0) {
              const textBeforeCursor = textNode.textContent.substring(0, currentOffset);
              nonDigitsBeforeCursor = (textBeforeCursor.match(/\D/g) || []).length;
            }

            event.target.textContent = digitsOnly;

            try {
              const newTextNode = event.target.firstChild;
              if (newTextNode) {
                const newOffset = Math.max(
                  0,
                  Math.min(currentOffset - nonDigitsBeforeCursor, digitsOnly.length)
                );
                const newRange = document.createRange();
                newRange.setStart(newTextNode, newOffset);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
              }
            } catch (e) {
              console.error("Error restoring cursor position after filtering:", e);

              const rangeEnd = document.createRange();
              rangeEnd.selectNodeContents(event.target);
              rangeEnd.collapse(false);
              selection.removeAllRanges();
              selection.addRange(rangeEnd);
            }
          }
        });
      }
    }
  });

  const sexToggle = dialog.querySelector('[data-action-input="sex"]');
  if (sexToggle) {
    const switcher = sexToggle.querySelector("[data-action-input-switcher]");

    const updateSwitcher = (selectedValue) => {
      if (switcher) {
        switcher.style.transform = selectedValue === "K" ? "translateX(50%)" : "translateX(-50%)";
      }
      sexToggle.dataset.selectedValue = selectedValue;
    };

    sexToggle.addEventListener("click", () => {
      const currentValue = sexToggle.dataset.selectedValue || "M";
      const newValue = currentValue === "M" ? "K" : "M";
      updateSwitcher(newValue);
    });

    const initialSex = sexToggle.dataset.selectedValue || "M";
    updateSwitcher(initialSex);
  }

  const cancelButton = dialog.querySelector('[data-dialog-edit] [data-button-action="cancel"]');
  const confirmButton = dialog.querySelector('[data-dialog-edit] [data-button-action="confirm"]');

  if (cancelButton) {
    cancelButton.addEventListener("click", () => {
      dialog.close();
      delete dialog.dataset.editingUserId;
      auth.updateTableRowStyles(elements);
    });
  }

  if (confirmButton) {
    confirmButton.addEventListener("click", () => {
      gatherAndSubmitUserData(dialog, elements);
    });
  }
}

export function gatherAndSubmitUserData(dialog, elements) {
  const userData = {};
  let isValid = true;

  const nameSpan = dialog.querySelector('[data-action-input="name"] [data-action-input-value]');
  if (nameSpan && nameSpan.dataset.placeholderCleared === "true") {
    userData.name = nameSpan.textContent.trim();
  } else {
    userData.name = "";
  }
  if (!userData.name) {
    console.error("Name is required.");

    if (nameSpan && nameSpan.parentElement) nameSpan.parentElement.classList.add("is-invalid");
    isValid = false;
  } else {
    if (nameSpan && nameSpan.parentElement) nameSpan.parentElement.classList.remove("is-invalid");
  }

  const sexToggle = dialog.querySelector('[data-action-input="sex"]');
  userData.plec = sexToggle ? sexToggle.dataset.selectedValue : "M";

  const weightSpan = dialog.querySelector('[data-action-input="weight"] [data-action-input-value]');
  let weightValue = NaN;
  if (weightSpan && weightSpan.dataset.placeholderCleared === "true") {
    weightValue = parseInt(weightSpan.textContent.trim(), 10);
  }
  userData.waga = !isNaN(weightValue) && weightValue > 0 ? weightValue : null;

  Object.keys(CONFIG.exercises).forEach((key) => {
    const maxRepsSpan = dialog.querySelector(
      `[data-action-input-max-reps="${key}"] [data-action-input-value]`
    );
    const oneRepSpan = dialog.querySelector(
      `[data-action-input-one-rep="${key}"] [data-action-input-value]`
    );
    let maxRepsValue = 0;
    let oneRepValue = 0;

    if (maxRepsSpan && maxRepsSpan.dataset.placeholderCleared === "true") {
      const parsedMax = parseInt(maxRepsSpan.textContent.trim(), 10);
      if (!isNaN(parsedMax) && parsedMax >= 0) maxRepsValue = parsedMax;
    }
    if (oneRepSpan && oneRepSpan.dataset.placeholderCleared === "true") {
      const parsedOne = parseInt(oneRepSpan.textContent.trim(), 10);
      if (!isNaN(parsedOne) && parsedOne >= 0) oneRepValue = parsedOne;
    }

    if (maxRepsSpan) {
      userData[`${key.replace("-", "_")}_max_reps`] = maxRepsValue;
    }
    if (oneRepSpan) {
      userData[`${key.replace("-", "_")}_one_rep`] = oneRepValue;
    }

    if (key === "press") {
      delete userData.press_max_reps;
    }
  });

  if (!isValid) {
    console.error("Form validation failed.");
    return;
  }

  const userId = dialog.dataset.editingUserId;
  const currentUserId = auth.getCurrentUserId();

  if (!userId && currentUserId) {
    userData.created_by = currentUserId;
  } else if (!userId && !currentUserId) {
    console.error("Cannot create user: No user is logged in to assign created_by.");
    return;
  }

  if (userId) {
    submitToSupabase(userId, userData, dialog, elements);
  } else {
    submitToSupabase(null, userData, dialog, elements);
  }
}

export async function submitToSupabase(userId, userData, dialog, elements) {
  const confirmButton = dialog.querySelector('[data-dialog-edit] [data-button-action="confirm"]');
  if (confirmButton) confirmButton.disabled = true;

  let result;
  let updatedRecordId = null;
  let shouldCloseDialog = true;

  try {
    if (userId) {
      result = await api.updateUser(userId, userData);
      if (!result.error && result.data && result.data.length > 0) {
        updatedRecordId = result.data[0].id;
        updateTableRow(userId, result.data[0], elements);
      } else if (!result.error) {
        console.warn("User update successful but RLS might have prevented reading data back.");
        updatedRecordId = userId;
      }
    } else {
      result = await api.createUser(userData);
      if (!result.error && result.data && result.data.length > 0) {
        updatedRecordId = result.data[0].id;
        addTableRow(result.data[0], elements);
      } else if (!result.error) {
        console.warn("User creation successful but RLS might have prevented reading data back.");
      }
    }

    if (result.error) {
      console.error(`Błąd zapisu danych: ${result.error.message}`);
      shouldCloseDialog = false;
    } else {
      refreshTableCalculations(updatedRecordId, elements);
    }
  } catch (err) {
    console.error("Network or unexpected error during submission:", err);
    shouldCloseDialog = false;
  } finally {
    if (confirmButton) confirmButton.disabled = false;
    if (shouldCloseDialog && !result?.error) {
      dialog.close();
      delete dialog.dataset.editingUserId;
      auth.updateTableRowStyles(elements);
    }
  }
}

// Nowa funkcja do animacji wiersza w 3 etapach
export function animateEditedRow(highlightUserId, elements, callback) {
  if (!highlightUserId || !elements.state.animations?.edit?.enabled) {
    if (callback) callback();
    return;
  }

  const row = elements.tableBody.querySelector(`.table_row[data-user-id="${highlightUserId}"]`);
  if (!row) {
    if (callback) callback();
    return;
  }

  // Pobieramy konfigurację
  const config = elements.state.animations.edit;

  // Użyjmy GSAP do pełnego efektu
  if (window.gsap) {
    // Najpierw zatrzymaj wszystkie istniejące animacje dla tego wiersza
    gsap.killTweensOf(row);

    // Ważne: zapiszmy oryginalne wartości, żeby można je było przywrócić później
    const originalBgColor = getComputedStyle(row).backgroundColor;

    // ETAP 1: HIGHLIGHT
    // Tworzymy timeline tylko dla etapu highlight
    const highlightTl = gsap.timeline({
      onComplete: function () {
        // Po zakończeniu highlight, wywołujemy callback (sortowanie)
        if (callback) callback();

        // ETAP 3: RESET - dopiero po zakończeniu sortowania
        // Opóźniamy reset o czas potrzebny na sortowanie
        setTimeout(() => {
          // Tworzymy nowy timeline dla resetu
          gsap.to(row, {
            backgroundColor: config.reset.background,
            scale: config.reset.scale,
            zIndex: config.reset.zIndex,
            duration: config.reset.duration,
            ease: config.reset.ease,
            clearProps: "zIndex,scale,backgroundColor", // To gwarantuje całkowite wyczyszczenie stylów
          });
        }, (config.sort.duration + config.sort.delay + 0.15) * 1000); // Dodajemy bufor 0.15s
      },
    });

    // Dodajemy animację highlight do timeline
    highlightTl.to(row, {
      backgroundColor: config.highlight.background,
      scale: config.highlight.scale,
      zIndex: config.highlight.zIndex,
      duration: config.highlight.duration,
      ease: config.highlight.ease,
      delay: config.highlight.delay,
    });

    // Efekt pulsowania komórek - tylko jeśli skala jest większa niż 1
    if (config.highlight.scale > 1) {
      const cells = row.querySelectorAll(".table_cell");
      highlightTl.to(
        cells,
        {
          opacity: 0.85,
          stagger: Math.min(0.03, config.highlight.duration / 10), // Dynamiczna wartość stagger zależna od czasu trwania
          duration: config.highlight.duration / 2,
          ease: "power1.inOut",
          yoyo: true,
          repeat: 1,
        },
        `-=${config.highlight.duration / 2}`
      );
    }
  } else {
    // Fallback jeśli GSAP nie jest dostępny
    row.style.backgroundColor = config.highlight.background;
    if (config.highlight.scale !== 1) {
      row.style.transform = `scale(${config.highlight.scale})`;
      row.style.zIndex = config.highlight.zIndex;
    }

    // Po zakończeniu highlight - wywołaj callback
    setTimeout(() => {
      if (callback) callback();

      // Po zakończeniu sortowania - reset
      setTimeout(() => {
        row.style.backgroundColor = config.reset.background;
        row.style.transform = "none";
        row.style.zIndex = config.reset.zIndex;
      }, (config.sort.duration + config.sort.delay + 0.15) * 1000); // Dodajemy bufor 0.15s
    }, (config.highlight.duration + config.highlight.delay) * 1000);
  }
}

export function refreshTableCalculations(highlightUserId, elements) {
  elements.functions.calculateELO(elements);

  // Jeśli mamy ID wiersza do podświetlenia i animacje są włączone
  if (highlightUserId && elements.state.animations?.edit?.enabled) {
    // Etap 1: Podświetlenie wiersza z GSAP
    animateEditedRow(highlightUserId, elements, () => {
      // Po podświetleniu wykonaj sortowanie (Etap 2)
      const currentRows = Array.from(elements.tableBody.querySelectorAll(".table_row")).filter(
        (row) => row.style.display !== "none"
      );

      const sortedRows = elements.functions.sortDataForRows(
        currentRows,
        elements.state.currentSort.exercise,
        elements.state.currentSort.type,
        elements.state.currentSort.direction
      );

      // Aktualizujemy opacity dla wszystkich elementów
      elements.functions.updateCellOpacity(elements.state, elements);

      // Sprawdzenie czy mamy FLIP
      if (elements.state.animations?.sort?.enabled && window.Flip) {
        try {
          // Używamy konfiguracji sort
          const sortConfig = elements.state.animations.edit.sort;

          // Znajdź konkretny wiersz, który był edytowany
          const editedRow = elements.tableBody.querySelector(
            `.table_row[data-user-id="${highlightUserId}"]`
          );

          // Zapisz stan przed sortowaniem
          const flipState = Flip.getState(currentRows, {
            props: "position",
            simple: true,
          });

          // Dodanie wierszy w nowej kolejności do tabeli
          sortedRows.forEach((row) => elements.tableBody.appendChild(row));

          // Wywołaj FLIP animację z parametrami z konfiguracji
          Flip.from(flipState, {
            duration: sortConfig.duration,
            ease: sortConfig.ease,
            delay: sortConfig.delay,
            spin: false,
            absolute: false,
            onComplete: () => {
              // Po zakończeniu FLIP animacji
              elements.functions.updateRankAndMedals(sortedRows);
            },
          });
        } catch (error) {
          console.error("Błąd animacji FLIP:", error);
          // Fallback
          sortedRows.forEach((row) => elements.tableBody.appendChild(row));
          elements.functions.updateRankAndMedals(sortedRows);
        }
      } else {
        // Bez animacji - bezpośrednio dodaj wiersze
        sortedRows.forEach((row) => elements.tableBody.appendChild(row));
        elements.functions.updateRankAndMedals(sortedRows);
      }
    });
  } else {
    // Standardowe sortowanie bez highlightingu
    const currentRows = Array.from(elements.tableBody.querySelectorAll(".table_row")).filter(
      (row) => row.style.display !== "none"
    );

    const sortedRows = elements.functions.sortDataForRows(
      currentRows,
      elements.state.currentSort.exercise,
      elements.state.currentSort.type,
      elements.state.currentSort.direction
    );

    // Aktualizujemy opacity dla wszystkich elementów
    elements.functions.updateCellOpacity(elements.state, elements);

    // Standardowa animacja sortowania
    if (elements.state.animations?.sort?.enabled && window.Flip) {
      const flipState = Flip.getState(currentRows);
      sortedRows.forEach((row) => elements.tableBody.appendChild(row));

      Flip.from(flipState, {
        duration: elements.state.animations.sort.duration || 0.5,
        ease: elements.state.animations.sort.ease || "power1.inOut",
        onComplete: () => {
          elements.functions.updateRankAndMedals(sortedRows);
        },
      });
    } else {
      sortedRows.forEach((row) => elements.tableBody.appendChild(row));
      elements.functions.updateRankAndMedals(sortedRows);
    }
  }
}

export function addTableRow(user, elements) {
  const row = elements.template.cloneNode(true);
  row.dataset.userId = user.id;

  const currentUserId = auth.getCurrentUserId();
  if (currentUserId) {
    row.dataset.createdBy = currentUserId;
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

  displayValue(row.querySelector("[data-user-name]"), "name", fields.name);
  displayValue(row.querySelector("[data-user-sex]"), "sex", fields.sex);
  displayValue(row.querySelector("[data-user-weight]"), "weight", fields.weight);

  Object.entries(CONFIG.exercises).forEach(([key]) => {
    const maxRepsTarget = row.querySelector(`[data-user-max="${key}"] [data-max-reps]`);
    const oneRepTarget = row.querySelector(`[data-user-max="${key}"] [data-one-rep]`);

    if (key !== "press" && maxRepsTarget) {
      displayValue(maxRepsTarget, `${key}-max`, fields[`${key}-max`] ?? 0);
    } else if (key === "press") {
      const pressMaxWrap = row.querySelector(`[data-user-max="${key}"] [data-max-reps-wrap]`);
      if (pressMaxWrap) pressMaxWrap.style.display = "none";
    }

    if (oneRepTarget) {
      displayValue(oneRepTarget, `${key}-one`, fields[`${key}-one`] ?? 0);
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

  const rankElement = row.querySelector("[data-user-rank]");
  if (rankElement) {
    rankElement.textContent = "-";
  }

  row.addEventListener("click", () => openEditDialog(user.id, elements));

  elements.tableBody.appendChild(row);
}

export function updateTableRow(userId, user, elements) {
  const row = elements.tableBody.querySelector(`.table_row[data-user-id="${userId}"]`);
  if (!row) {
    return;
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

  displayValue(row.querySelector("[data-user-name]"), "name", fields.name);
  displayValue(row.querySelector("[data-user-sex]"), "sex", fields.sex);
  displayValue(row.querySelector("[data-user-weight]"), "weight", fields.weight);

  Object.entries(CONFIG.exercises).forEach(([key]) => {
    const maxRepsTarget = row.querySelector(`[data-user-max="${key}"] [data-max-reps]`);
    const oneRepTarget = row.querySelector(`[data-user-max="${key}"] [data-one-rep]`);

    if (key !== "press" && maxRepsTarget) {
      displayValue(maxRepsTarget, `${key}-max`, fields[`${key}-max`] ?? 0);
    } else if (key === "press") {
      const pressMaxWrap = row.querySelector(`[data-user-max="${key}"] [data-max-reps-wrap]`);
      if (pressMaxWrap) pressMaxWrap.style.display = "none";
    }

    if (oneRepTarget) {
      displayValue(oneRepTarget, `${key}-one`, fields[`${key}-one`] ?? 0);
    }
  });
}

export function openEditDialog(userId = null, elements) {
  const dialog = elements.authElements.theDialog;
  if (!dialog || !elements.authElements.editWrapper || !elements.authElements.loginWrapper) {
    return;
  }

  elements.authElements.editWrapper.style.display = "";
  elements.authElements.loginWrapper.style.display = "none";

  if (userId) {
    const row = elements.tableBody.querySelector(`.table_row[data-user-id="${userId}"]`);
    if (!row) {
      return;
    }
    const createdBy = row.dataset.createdBy;
    let canOpenDialog = false;

    const currentUserIsAdmin = auth.isCurrentUserAdmin();
    const currentUserCanEdit = auth.canCurrentUserEdit();
    const currentUserId = auth.getCurrentUserId();

    if (currentUserIsAdmin) {
      canOpenDialog = true;
    } else if (currentUserCanEdit && createdBy === currentUserId) {
      canOpenDialog = true;
    }

    if (!canOpenDialog) {
      return;
    }
  }

  const removeButton = dialog.querySelector('[data-button-action="remove-user"]');
  if (removeButton) {
    if (userId) {
      removeButton.style.display = "";
      setupRemoveButton(removeButton, userId, dialog, elements);
    } else {
      removeButton.style.display = "none";
    }
  }

  const populateInput = (selector, value, isPlaceholder = false) => {
    const span = dialog.querySelector(selector);
    if (span) {
      span.textContent = value;

      const originalPlaceholder = span.dataset.originalPlaceholder || "";

      if (isPlaceholder || value === "" || (typeof value === "string" && value === "0")) {
        span.dataset.placeholderCleared = "false";

        if (value === "" || (typeof value === "string" && value === "0")) {
          span.textContent = originalPlaceholder;
        } else {
          span.textContent = value;
        }
      } else {
        span.dataset.placeholderCleared = "true";
        span.textContent = value;
      }
    }
  };

  if (userId) {
    const row = elements.tableBody.querySelector(`.table_row[data-user-id="${userId}"]`);
    if (!row) {
      return;
    }

    dialog.dataset.editingUserId = userId;

    const nameValue = row.querySelector("[data-user-name]")?.dataset.value || "";
    populateInput(
      '[data-dialog-edit] [data-action-input="name"] [data-action-input-value]',
      nameValue
    );

    const sexValue = row.querySelector("[data-user-sex]")?.dataset.value?.toUpperCase() || "M";
    const sexToggle = dialog.querySelector('[data-dialog-edit] [data-action-input="sex"]');
    if (sexToggle) {
      const switcher = sexToggle.querySelector("[data-action-input-switcher]");
      const updateSwitcher = (val) => {
        if (switcher) {
          switcher.style.transform = val === "K" ? "translateX(50%)" : "translateX(-50%)";
        }
        sexToggle.dataset.selectedValue = val;
      };
      updateSwitcher(sexValue);
    }

    const weightValue = row.querySelector("[data-user-weight]")?.dataset.value || "";
    populateInput(
      '[data-dialog-edit] [data-action-input="weight"] [data-action-input-value]',
      weightValue,
      weightValue === "" || weightValue === (CONFIG.defaults.weight || 70).toString()
    );

    Object.keys(CONFIG.exercises).forEach((key) => {
      const maxRepsElement = row.querySelector(`[data-user-max="${key}"] [data-max-reps]`);
      const oneRepElement = row.querySelector(`[data-user-max="${key}"] [data-one-rep]`);

      const maxRepsValue = maxRepsElement?.dataset.value || "0";
      const oneRepValue = oneRepElement?.dataset.value || "0";

      const maxRepsInputSelector = `[data-dialog-edit] [data-action-input-max-reps="${key}"] [data-action-input-value]`;
      if (dialog.querySelector(maxRepsInputSelector)) {
        populateInput(maxRepsInputSelector, maxRepsValue);
      }

      const oneRepInputSelector = `[data-dialog-edit] [data-action-input-one-rep="${key}"] [data-action-input-value]`;
      if (dialog.querySelector(oneRepInputSelector)) {
        populateInput(oneRepInputSelector, oneRepValue);
      }
    });
  } else {
    delete dialog.dataset.editingUserId;

    populateInput(
      '[data-dialog-edit] [data-action-input="name"] [data-action-input-value]',
      "",
      true
    );
    populateInput(
      '[data-dialog-edit] [data-action-input="weight"] [data-action-input-value]',
      "",
      true
    );

    Object.keys(CONFIG.exercises).forEach((key) => {
      const maxRepsInputSelector = `[data-dialog-edit] [data-action-input-max-reps="${key}"] [data-action-input-value]`;
      if (dialog.querySelector(maxRepsInputSelector)) {
        populateInput(maxRepsInputSelector, "", true);
      }
      const oneRepInputSelector = `[data-dialog-edit] [data-action-input-one-rep="${key}"] [data-action-input-value]`;
      if (dialog.querySelector(oneRepInputSelector)) {
        populateInput(oneRepInputSelector, "", true);
      }
    });

    const sexToggle = dialog.querySelector('[data-dialog-edit] [data-action-input="sex"]');
    if (sexToggle) {
      const switcher = sexToggle.querySelector("[data-action-input-switcher]");

      const updateSwitcher = (selectedValue) => {
        if (switcher) {
          switcher.style.transform = selectedValue === "K" ? "translateX(50%)" : "translateX(-50%)";
        }
        sexToggle.dataset.selectedValue = selectedValue;
      };

      sexToggle.addEventListener("click", () => {
        const currentValue = sexToggle.dataset.selectedValue || "M";
        const newValue = currentValue === "M" ? "K" : "M";
        updateSwitcher(newValue);
      });

      const initialSex = sexToggle.dataset.selectedValue || "M";
      updateSwitcher(initialSex);
    }
  }

  dialog
    .querySelectorAll("[data-dialog-edit] .is-invalid")
    .forEach((el) => el.classList.remove("is-invalid"));

  // Zamknij dialog przed ponownym otwarciem, aby uniknąć problemów z zablokowanym scrollem
  if (dialog.open) {
    dialog.close();
    // Mały timeout, aby upewnić się, że dialog zdąży się zamknąć przed ponownym otwarciem
    setTimeout(() => {
      dialog.showModal();
    }, 10);
  } else {
    dialog.showModal();
  }

  auth.updateTableRowStyles(elements, userId);
}

export function setupRemoveButton(button, userId, dialog, elements) {
  let pressTimer;
  let progressAnimation;
  const holdDuration = 3000;
  const progressBar = document.createElement("div");

  progressBar.style.position = "absolute";
  progressBar.style.bottom = "0";
  progressBar.style.left = "0";
  progressBar.style.height = "3px";
  progressBar.style.backgroundColor = "#FF0000";
  progressBar.style.width = "0";
  progressBar.style.transition = "width 0.1s linear";
  button.style.position = "relative";
  button.appendChild(progressBar);

  const resetButton = () => {
    if (pressTimer) clearTimeout(pressTimer);
    if (progressAnimation) cancelAnimationFrame(progressAnimation);
    progressBar.style.width = "0";
    button.querySelector(".button_label").textContent = "Przytrzymaj żeby usunąć...";
  };

  const startProgress = (startTime) => {
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / holdDuration) * 100, 100);
      progressBar.style.width = `${progress}%`;

      if (elapsed < holdDuration) {
        progressAnimation = requestAnimationFrame(animate);
      }
    };
    progressAnimation = requestAnimationFrame(animate);
  };

  const removeUser = async () => {
    try {
      const { error } = await api.deleteUser(userId);

      if (error) throw error;

      const row = elements.tableBody.querySelector(`[data-user-id="${userId}"]`);
      if (row) row.remove();

      dialog.close();
      auth.updateTableRowStyles(elements);

      refreshTableCalculations(null, elements);
    } catch (err) {
      console.error("Błąd podczas usuwania użytkownika:", err);
    }
  };

  const handleStart = () => {
    button.querySelector(".button_label").textContent = "Trzymaj...";
    const startTime = Date.now();
    startProgress(startTime);
    pressTimer = setTimeout(() => {
      removeUser();
    }, holdDuration);
  };

  const handleEnd = () => {
    resetButton();
  };

  button.addEventListener("mousedown", handleStart);
  button.addEventListener("touchstart", handleStart, { passive: true });
  button.addEventListener("mouseup", handleEnd);
  button.addEventListener("mouseleave", handleEnd);
  button.addEventListener("touchend", handleEnd);
  button.addEventListener("touchcancel", handleEnd);

  dialog.addEventListener("close", () => {
    button.removeEventListener("mousedown", handleStart);
    button.removeEventListener("touchstart", handleStart);
    button.removeEventListener("mouseup", handleEnd);
    button.removeEventListener("mouseleave", handleEnd);
    button.removeEventListener("touchend", handleEnd);
    button.removeEventListener("touchcancel", handleEnd);
    resetButton();
    progressBar.remove();
  });
}

export function setupAddUserButton(elements) {
  const addUserButton = document.querySelector('[data-button-action="add-user"]');
  if (addUserButton) {
    addUserButton.addEventListener("click", async () => {
      try {
        const session = await api.getCurrentSession();
        if (session?.user) {
          openEditDialog(null, elements);
        }
      } catch (error) {
        console.error("Błąd podczas sprawdzania sesji przy dodawaniu:", error);
      }
    });
  }
}
