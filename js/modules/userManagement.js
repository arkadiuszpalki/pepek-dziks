// User management functions (add, edit, delete)
import { CONFIG } from "./config.js";
import * as api from "./api.js";
import * as auth from "./auth.js";
import { displayValue } from "../utils/formatters.js";

// Funkcja dodająca style CSS dla walidacji
function addValidationStyles() {
  // Sprawdzamy czy style już istnieją
  if (document.getElementById("validation-styles")) {
    return;
  }

  // Tworzenie elementu style
  const styleElement = document.createElement("style");
  styleElement.id = "validation-styles";
  styleElement.textContent = `
    .is-invalid {
      border: 1px solid #ff000095  !important;
    }

    label.is-invalid,
    label.input.is-invalid {
      border: 1px solid #ff000095 !important;
    }

    label.is-invalid input,
    label.input.is-invalid input {
      border-color: transparent !important;
    }
  `;

  // Dodanie stylów do nagłówka strony
  document.head.appendChild(styleElement);
}

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

// Funkcja dostosowująca szerokość inputów do ich zawartości
function setupAutoWidthInputs(dialogElement) {
  if (!dialogElement) return;

  // Tworzenie ukrytego elementu do pomiaru tekstu
  let measureElement = document.querySelector(".js-measure-text");
  if (!measureElement) {
    measureElement = document.createElement("span");
    measureElement.className = "js-measure-text";
    measureElement.style.position = "absolute";
    measureElement.style.visibility = "hidden";
    measureElement.style.whiteSpace = "pre";
    measureElement.style.fontSize = "16px"; // Domyślny rozmiar fontu
    measureElement.style.fontFamily = "inherit";
    document.body.appendChild(measureElement);
  }

  // Funkcja do mierzenia i ustawiania szerokości
  const adjustInputWidth = (input) => {
    // Użyj wartości inputa lub placeholdera jeśli input jest pusty
    const textToMeasure = input.value || input.placeholder || "";

    // Uzyskaj styl fontu inputa
    const inputStyle = window.getComputedStyle(input);
    measureElement.style.fontSize = inputStyle.fontSize;
    measureElement.style.fontFamily = inputStyle.fontFamily;
    measureElement.style.fontWeight = inputStyle.fontWeight;

    // Zmierz tekst
    measureElement.textContent = textToMeasure;

    // Dodaj padding dla lepszego wyglądu
    const padding = 20; // Dodatkowe pixele dla wygody
    const minWidth = 30; // Minimalna szerokość w px
    const width = Math.max(measureElement.offsetWidth + padding, minWidth);

    // Ustaw szerokość inputa
    input.style.width = `${width}px`;
  };

  // Znajdź wszystkie inputy w dialogu
  const inputs = dialogElement.querySelectorAll("input");

  // Dla każdego inputa ustaw początkową szerokość i dodaj event listenery
  inputs.forEach((input) => {
    // Pomiń inputy, które nie powinny mieć dynamicznej szerokości
    if (input.parentElement.matches('[data-action-input="name"]')) {
      return; // Nie zmieniaj szerokości dla pola imienia
    }

    // Początkowe ustawienie szerokości
    adjustInputWidth(input);

    // Aktualizuj szerokość przy wpisywaniu
    input.addEventListener("input", () => {
      adjustInputWidth(input);
    });

    // Aktualizuj szerokość przy focusie
    input.addEventListener("focus", () => {
      adjustInputWidth(input);
    });

    // Aktualizuj szerokość przy utracie focusa
    input.addEventListener("blur", () => {
      adjustInputWidth(input);
    });

    // Obserwuj zmiany w placeholderze
    const observer = new MutationObserver(() => {
      adjustInputWidth(input);
    });

    observer.observe(input, { attributes: true, attributeFilter: ["placeholder"] });
  });
}

export function setupDialogInteractions(elements) {
  const dialog = elements.authElements.theDialog;
  if (!dialog) {
    return;
  }

  // Dodaj style walidacji
  addValidationStyles();

  // Ustawienie walidacji w czasie rzeczywistym
  setupLiveValidation(dialog);

  // Zapisz oryginalne placeholdery wszystkich inputów
  const allInputs = dialog.querySelectorAll('input[type="text"], input:not([type])');
  allInputs.forEach((input) => {
    if (input.placeholder) {
      input.setAttribute("data-original-placeholder", input.placeholder);
    }
  });

  // Funkcja do resetowania i ponownej inicjalizacji przycisków w dialogu
  const resetDialogButtons = () => {
    const cancelButton = dialog.querySelector('[data-dialog-edit] [data-button-action="cancel"]');
    const confirmButton = dialog.querySelector('[data-dialog-edit] [data-button-action="confirm"]');

    // Usuń istniejące listenery z przycisków
    if (cancelButton) {
      const newCancelButton = cancelButton.cloneNode(true);
      cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);

      // Dodaj nowy listener do przycisku anulowania
      newCancelButton.addEventListener("click", () => {
        dialog.close();
        delete dialog.dataset.editingUserId;
        auth.updateTableRowStyles(elements);
      });
    }

    if (confirmButton) {
      setupHoldToSaveButton(confirmButton, dialog, elements);
    }
  };

  // Blokuj scroll strony, gdy dialog jest otwarty
  dialog.addEventListener("close", () => {
    toggleBodyScroll(false);

    // Po zamknięciu dialogu, resetuj wszystkie inputy
    setTimeout(() => {
      // Resetuj pola wejściowe
      const allInputs = dialog.querySelectorAll('input[type="text"], input:not([type])');
      allInputs.forEach((input) => {
        input.value = "";
        // Przywróć oryginalny placeholder, jeśli został zapisany
        if (input.hasAttribute("data-original-placeholder")) {
          input.placeholder = input.getAttribute("data-original-placeholder");
        }
      });
    }, 100);
  });

  dialog.addEventListener("showModal", () => {
    toggleBodyScroll(true);
    // Przy każdym otwarciu dialogu resetuj i ponownie inicjalizuj przyciski
    resetDialogButtons();
  });

  // Alternatywne nasłuchiwanie otwarcia dialogu
  const originalShowModal = dialog.showModal;
  dialog.showModal = function () {
    originalShowModal.apply(this, arguments);
    toggleBodyScroll(true);
    // Przy każdym otwarciu dialogu resetuj i ponownie inicjalizuj przyciski
    resetDialogButtons();
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

    const input = wrapper.querySelector("input");

    if (input) {
      // Dla inputów typu number na urządzeniach mobilnych
      const isNumericInput =
        wrapper.hasAttribute("data-action-input-max-reps") ||
        wrapper.hasAttribute("data-action-input-one-rep") ||
        wrapper.dataset.actionInput === "weight";

      if (isNumericInput) {
        input.setAttribute("inputmode", "numeric");
        input.setAttribute("pattern", "[0-9]*");

        // Sprawdź, czy jest na urządzeniu mobilnym - wyłącz autofocus
        if (window.innerWidth <= 991) {
          // Zapobiegaj autofocusowi
          input.addEventListener(
            "focus",
            function (e) {
              setTimeout(() => {
                if (input.hasAttribute("data-prevent-focus")) {
                  input.blur();
                }
              }, 10);
            },
            { once: true }
          );
        }

        // Filtruj znaki niebędące cyframi
        input.addEventListener("input", (event) => {
          const value = event.target.value;
          const digitsOnly = value.replace(/\D/g, "");

          if (value !== digitsOnly) {
            event.target.value = digitsOnly;
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

  // Na końcu funkcji resetujemy przyciski, aby były gotowe do pierwszego użycia
  resetDialogButtons();
}

export function gatherAndSubmitUserData(dialog, elements) {
  const userData = {};

  // Sprawdź, czy możemy użyć naszego mechanizmu walidacji
  if (dialog.validateAllFields) {
    const isValid = dialog.validateAllFields();
    if (!isValid) {
      console.error("Form validation failed.");
      return;
    }
  }

  // Walidacja pola imienia (name)
  const nameInput = dialog.querySelector('[data-dialog-edit] [data-action-input="name"] input');
  if (nameInput) {
    userData.name = nameInput.value.trim();
  } else {
    // Próbujemy alternatywnego selektora (działający w oryginalnym kodzie)
    const nameSpan = dialog.querySelector('[data-action-input="name"] [data-action-input-value]');
    if (nameSpan) {
      userData.name = nameSpan.value ? nameSpan.value.trim() : nameSpan.textContent.trim() || "";
    } else {
      userData.name = "";
    }
  }

  if (!userData.name) {
    console.error("Name is required.");
    return;
  }

  const sexToggle = dialog.querySelector('[data-action-input="sex"]');
  userData.plec = sexToggle ? sexToggle.dataset.selectedValue : "M";

  // Walidacja pola wagi (weight)
  const weightInput = dialog.querySelector('[data-dialog-edit] [data-action-input="weight"] input');
  let weightValue = NaN;

  if (weightInput) {
    weightValue = parseInt(weightInput.value.trim(), 10);
  } else {
    const weightSpan = dialog.querySelector(
      '[data-action-input="weight"] [data-action-input-value]'
    );
    if (weightSpan) {
      weightValue = parseInt(weightSpan.value || weightSpan.textContent.trim(), 10);
    }
  }

  // Sprawdzamy czy waga jest poprawna (nie jest NaN i jest większa od 0)
  if (isNaN(weightValue) || weightValue <= 0) {
    console.error("Weight is required and must be greater than 0.");
    return;
  }

  userData.waga = weightValue;

  Object.keys(CONFIG.exercises).forEach((key) => {
    // Poprawa: najpierw próbujemy selektora z input
    const maxRepsInput = dialog.querySelector(
      `[data-dialog-edit] [data-action-input-max-reps="${key}"] input`
    );
    const oneRepInput = dialog.querySelector(
      `[data-dialog-edit] [data-action-input-one-rep="${key}"] input`
    );

    let maxRepsValue = 0;
    let oneRepValue = 0;

    // Pobieramy wartość dla max-reps
    if (maxRepsInput) {
      const parsedMax = parseInt(maxRepsInput.value.trim(), 10);
      if (!isNaN(parsedMax) && parsedMax >= 0) maxRepsValue = parsedMax;
    } else {
      const maxRepsSpan = dialog.querySelector(
        `[data-action-input-max-reps="${key}"] [data-action-input-value]`
      );
      if (maxRepsSpan) {
        const spanValue = maxRepsSpan.value || maxRepsSpan.textContent.trim();
        const parsedMax = parseInt(spanValue, 10);
        if (!isNaN(parsedMax) && parsedMax >= 0) maxRepsValue = parsedMax;
      }
    }

    // Pobieramy wartość dla one-rep
    if (oneRepInput) {
      const parsedOne = parseInt(oneRepInput.value.trim(), 10);
      if (!isNaN(parsedOne) && parsedOne >= 0) oneRepValue = parsedOne;
    } else {
      const oneRepSpan = dialog.querySelector(
        `[data-action-input-one-rep="${key}"] [data-action-input-value]`
      );
      if (oneRepSpan) {
        const spanValue = oneRepSpan.value || oneRepSpan.textContent.trim();
        const parsedOne = parseInt(spanValue, 10);
        if (!isNaN(parsedOne) && parsedOne >= 0) oneRepValue = parsedOne;
      }
    }

    userData[`${key.replace("-", "_")}_max_reps`] = maxRepsValue;
    userData[`${key.replace("-", "_")}_one_rep`] = oneRepValue;

    if (key === "press") {
      delete userData.press_max_reps;
    }
  });

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
  const editDialog = elements.authElements.editDialog || elements.authElements.theDialog;
  if (!editDialog) {
    console.error("Nie znaleziono dialogu edycji");
    return;
  }

  // Dodaj style walidacji
  addValidationStyles();

  // Ustawienie walidacji w czasie rzeczywistym
  const validator = setupLiveValidation(editDialog);

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

  // Resetuj stan dialogu przed otwarciem
  editDialog.querySelectorAll(".is-invalid").forEach((el) => {
    el.classList.remove("is-invalid");
  });

  const removeButton = editDialog.querySelector('[data-button-action="remove-user"]');
  if (removeButton) {
    if (userId) {
      removeButton.style.display = "";
      setupRemoveButton(removeButton, userId, editDialog, elements);
    } else {
      removeButton.style.display = "none";
    }
  }

  // Ustaw ID edytowanego użytkownika
  if (userId) {
    editDialog.dataset.editingUserId = userId;
  } else {
    delete editDialog.dataset.editingUserId;
  }

  // Wypełnij formularz danymi użytkownika
  const populateInput = (selector, value, isPlaceholder = false) => {
    const inputElement = editDialog.querySelector(selector);
    if (inputElement) {
      // Tryb dodawania nowego użytkownika - użyj oryginalnego placeholdera
      if (userId === null) {
        // Przywróć oryginalny placeholder z HTML
        // Ustaw pustą wartość
        inputElement.value = "";
      } else {
        // Tryb edycji - ustaw placeholder na aktualną wartość
        inputElement.placeholder = value || inputElement.getAttribute("placeholder") || "";

        // Sprawdź czy to placeholder
        if (isPlaceholder || value === "" || (typeof value === "string" && value === "0")) {
          // Ustaw pustą wartość, ale zachowaj placeholder z aktualną wartością
          inputElement.value = "";
        } else {
          inputElement.value = value;
        }
      }
    }
  };

  // Zaktualizuj wartości w formularzu tylko jeśli edytujemy istniejącego użytkownika
  if (userId) {
    const row = elements.tableBody.querySelector(`.table_row[data-user-id="${userId}"]`);
    if (!row) {
      return;
    }

    const nameValue = row.querySelector("[data-user-name]")?.dataset.value || "";
    populateInput('[data-dialog-edit] [data-action-input="name"] input', nameValue);

    const sexValue = row.querySelector("[data-user-sex]")?.dataset.value?.toUpperCase() || "M";
    const sexToggle = editDialog.querySelector('[data-dialog-edit] [data-action-input="sex"]');
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
      '[data-dialog-edit] [data-action-input="weight"] input',
      weightValue,
      weightValue === "" || weightValue === (CONFIG.defaults.weight || 70).toString()
    );

    Object.keys(CONFIG.exercises).forEach((key) => {
      const maxRepsElement = row.querySelector(`[data-user-max="${key}"] [data-max-reps]`);
      const oneRepElement = row.querySelector(`[data-user-max="${key}"] [data-one-rep]`);

      const maxRepsValue = maxRepsElement?.dataset.value || "0";
      const oneRepValue = oneRepElement?.dataset.value || "0";

      const maxRepsInputSelector = `[data-dialog-edit] [data-action-input-max-reps="${key}"] input`;
      if (editDialog.querySelector(maxRepsInputSelector)) {
        populateInput(maxRepsInputSelector, maxRepsValue);
      }

      const oneRepInputSelector = `[data-dialog-edit] [data-action-input-one-rep="${key}"] input`;
      if (editDialog.querySelector(oneRepInputSelector)) {
        populateInput(oneRepInputSelector, oneRepValue);
      }
    });
  } else {
    // Resetuj dialog do domyślnego stanu dla dodawania nowego użytkownika

    // Najpierw resetuj wszystkie inputy do stanu domyślnego z HTML
    const allInputs = editDialog.querySelectorAll('input[type="text"], input:not([type])');
    allInputs.forEach((input) => {
      input.value = "";
      // Upewnij się, że używamy oryginalnego placeholdera z HTML
      if (input.hasAttribute("data-original-placeholder")) {
        input.placeholder = input.getAttribute("data-original-placeholder");
      }
    });

    // Teraz wypełnij formularz pustymi wartościami
    populateInput('[data-dialog-edit] [data-action-input="name"] input', "", true);
    populateInput('[data-dialog-edit] [data-action-input="weight"] input', "", true);

    Object.keys(CONFIG.exercises).forEach((key) => {
      const maxRepsInputSelector = `[data-dialog-edit] [data-action-input-max-reps="${key}"] input`;
      if (editDialog.querySelector(maxRepsInputSelector)) {
        populateInput(maxRepsInputSelector, "", true);
      }
      const oneRepInputSelector = `[data-dialog-edit] [data-action-input-one-rep="${key}"] input`;
      if (editDialog.querySelector(oneRepInputSelector)) {
        populateInput(oneRepInputSelector, "", true);
      }
    });

    const sexToggle = editDialog.querySelector('[data-dialog-edit] [data-action-input="sex"]');
    if (sexToggle) {
      const switcher = sexToggle.querySelector("[data-action-input-switcher]");

      const updateSwitcher = (selectedValue) => {
        if (switcher) {
          switcher.style.transform = selectedValue === "K" ? "translateX(50%)" : "translateX(-50%)";
        }
        sexToggle.dataset.selectedValue = selectedValue;
      };

      // Usuń istniejące listenery przed dodaniem nowego
      const newSexToggle = sexToggle.cloneNode(true);
      if (sexToggle.parentNode) {
        sexToggle.parentNode.replaceChild(newSexToggle, sexToggle);
      }

      newSexToggle.addEventListener("click", () => {
        const currentValue = newSexToggle.dataset.selectedValue || "M";
        const newValue = currentValue === "M" ? "K" : "M";
        updateSwitcher(newValue);
      });

      const initialSex = newSexToggle.dataset.selectedValue || "M";
      updateSwitcher(initialSex);
    }
  }

  // Zamknij dialog przed ponownym otwarciem, aby uniknąć problemów z zablokowanym scrollem
  if (editDialog.open) {
    editDialog.close();
    // Mały timeout, aby upewnić się, że dialog zdąży się zamknąć przed ponownym otwarciem
    setTimeout(() => {
      editDialog.showModal();
      setupAutoWidthInputs(editDialog);

      // Wykonaj walidację po wypełnieniu
      if (validator) {
        setTimeout(() => validator.validateAll(), 100);
      }
    }, 50); // Zwiększamy timeout dla większej pewności
  } else {
    editDialog.showModal();
    setupAutoWidthInputs(editDialog);

    // Wykonaj walidację po wypełnieniu
    if (validator) {
      setTimeout(() => validator.validateAll(), 100);
    }
  }

  // Wyłącz autofocus na urządzeniach mobilnych
  const isMobile = window.innerWidth <= 991;
  if (isMobile) {
    // Opóźnij wykonanie, aby dać czas na otwarcie dialogu
    setTimeout(() => {
      // Znajdź wszystkie inputy w dialogu
      const inputs = editDialog.querySelectorAll("input");

      // Usuń focus z aktywnego elementu
      if (document.activeElement && document.activeElement.tagName === "INPUT") {
        document.activeElement.blur();
      }

      // Dodaj atrybut do inputów, aby zapobiec autofocusowi
      inputs.forEach((input) => {
        // Ustaw attribut tabindex na -1, aby zapobiec automatycznemu focusowi
        input.setAttribute("tabindex", "-1");

        // Po pewnym czasie przywróć normalny tabindex
        setTimeout(() => {
          input.setAttribute("tabindex", "0");
        }, 500);
      });
    }, 50);
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

          // Dodatkowe wywołanie setupAutoWidthInputs po krótkim opóźnieniu, aby upewnić się
          // że wszystkie inputy są już poprawnie załadowane z placeholderami
          setTimeout(() => {
            const editDialog = elements.authElements.editDialog || elements.authElements.theDialog;
            if (editDialog) {
              setupAutoWidthInputs(editDialog);
            }
          }, 50);
        }
      } catch (error) {
        console.error("Błąd podczas sprawdzania sesji przy dodawaniu:", error);
      }
    });
  }
}

export function setupHoldToSaveButton(button, dialog, elements) {
  // Najpierw usuńmy wszystkie istniejące event listenery z przycisku
  const newButton = button.cloneNode(true);
  if (button.parentNode) {
    button.parentNode.replaceChild(newButton, button);
  }
  button = newButton;

  // Inicjalizacja zmiennych i elementów niezależnie od rozmiaru ekranu
  let pressTimer;
  let progressAnimation;
  const holdDuration = 1000; // 1 sekunda dla hold-to-save
  const progressBar = document.createElement("div");
  const originalLabel = button.querySelector(".button_label")?.textContent || "Zapisz";

  progressBar.style.position = "absolute";
  progressBar.style.bottom = "0";
  progressBar.style.left = "0";
  progressBar.style.height = "3px";
  progressBar.style.backgroundColor = "#FFFFFF"; // Biały pasek postępu
  progressBar.style.width = "0";
  progressBar.style.transition = "width 0.05s linear";
  button.style.position = "relative";
  button.appendChild(progressBar);

  const resetButton = () => {
    if (pressTimer) clearTimeout(pressTimer);
    if (progressAnimation) cancelAnimationFrame(progressAnimation);
    progressBar.style.width = "0";
    const label = button.querySelector(".button_label");
    if (label) label.textContent = originalLabel;
    button.classList.remove("is-saving");
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

  const saveUser = () => {
    gatherAndSubmitUserData(dialog, elements);
  };

  const handleStart = (e) => {
    // Zapobiegaj domyślnej akcji przycisku
    e.preventDefault();

    const label = button.querySelector(".button_label");
    if (label) label.textContent = "Trzymaj...";
    button.classList.add("is-saving");

    const startTime = Date.now();
    startProgress(startTime);

    pressTimer = setTimeout(() => {
      saveUser();
    }, holdDuration);
  };

  const handleEnd = () => {
    resetButton();
  };

  // Dodajemy obsługę zdarzeń dotykowych tylko dla urządzeń mobilnych
  if (window.innerWidth <= 991) {
    button.addEventListener("mousedown", handleStart);
    button.addEventListener("touchstart", handleStart, { passive: false });
    button.addEventListener("mouseup", handleEnd);
    button.addEventListener("mouseleave", handleEnd);
    button.addEventListener("touchend", handleEnd);
    button.addEventListener("touchcancel", handleEnd);
  }

  // Dodaj obsługę kliknięcia na desktopie (dla szerokości ekranu > 991px)
  const handleClick = (e) => {
    if (window.innerWidth > 991) {
      e.preventDefault();
      saveUser();
    }
  };

  button.addEventListener("click", handleClick);

  // Aktualizacja przy zmianie rozmiaru ekranu
  const updateBasedOnScreenSize = () => {
    resetButton();
    if (window.innerWidth > 991) {
      // Desktopowy tryb - ukryj pasek postępu
      progressBar.style.display = "none";

      // Usunięcie obsługi zdarzeń dotykowych
      button.removeEventListener("mousedown", handleStart);
      button.removeEventListener("touchstart", handleStart);
      button.removeEventListener("mouseup", handleEnd);
      button.removeEventListener("mouseleave", handleEnd);
      button.removeEventListener("touchend", handleEnd);
      button.removeEventListener("touchcancel", handleEnd);
    } else {
      // Mobilny tryb - pokaż pasek postępu
      progressBar.style.display = "block";

      // Dodanie obsługi zdarzeń dotykowych
      button.addEventListener("mousedown", handleStart);
      button.addEventListener("touchstart", handleStart, { passive: false });
      button.addEventListener("mouseup", handleEnd);
      button.addEventListener("mouseleave", handleEnd);
      button.addEventListener("touchend", handleEnd);
      button.addEventListener("touchcancel", handleEnd);
    }
  };

  window.addEventListener("resize", updateBasedOnScreenSize);
  updateBasedOnScreenSize(); // Wywołaj przy inicjalizacji

  // Czyszczenie przy zamknięciu dialogu
  const closeListener = () => {
    button.removeEventListener("mousedown", handleStart);
    button.removeEventListener("touchstart", handleStart);
    button.removeEventListener("mouseup", handleEnd);
    button.removeEventListener("mouseleave", handleEnd);
    button.removeEventListener("touchend", handleEnd);
    button.removeEventListener("touchcancel", handleEnd);
    button.removeEventListener("click", handleClick);
    window.removeEventListener("resize", updateBasedOnScreenSize);
    dialog.removeEventListener("close", closeListener);
    resetButton();

    // Usuwamy pasek postępu tylko jeśli istnieje i ma rodzica
    if (progressBar && progressBar.parentNode) {
      progressBar.parentNode.removeChild(progressBar);
    }
  };

  dialog.addEventListener("close", closeListener);
}

// Funkcja do walidacji pól w czasie rzeczywistym
function setupLiveValidation(dialog) {
  if (!dialog) return;

  // Funkcja walidująca pole tekstowe
  const validateNameField = (input) => {
    const value = input.value.trim();
    const label = input.closest("label");

    if (!value || value === "") {
      if (label) label.classList.add("is-invalid");
      return false;
    } else {
      if (label) label.classList.remove("is-invalid");
      return true;
    }
  };

  // Funkcja walidująca pole wagi
  const validateWeightField = (input) => {
    const value = parseInt(input.value.trim(), 10);
    const label = input.closest("label");

    if (isNaN(value) || value <= 0) {
      if (label) label.classList.add("is-invalid");
      return false;
    } else {
      if (label) label.classList.remove("is-invalid");
      return true;
    }
  };

  // Dodaj listenery do pola imienia
  const nameInput = dialog.querySelector('[data-action-input="name"] input');
  if (nameInput) {
    nameInput.addEventListener("input", () => validateNameField(nameInput));
    nameInput.addEventListener("change", () => validateNameField(nameInput));
    nameInput.addEventListener("blur", () => validateNameField(nameInput));

    // Dodajemy funkcję walidacji do inputa, aby można było ją wywołać z zewnątrz
    nameInput.validate = () => validateNameField(nameInput);
  }

  // Dodaj listenery do pola wagi
  const weightInput = dialog.querySelector('[data-action-input="weight"] input');
  if (weightInput) {
    weightInput.addEventListener("input", () => validateWeightField(weightInput));
    weightInput.addEventListener("change", () => validateWeightField(weightInput));
    weightInput.addEventListener("blur", () => validateWeightField(weightInput));

    // Dodajemy funkcję walidacji do inputa, aby można było ją wywołać z zewnątrz
    weightInput.validate = () => validateWeightField(weightInput);
  }

  // Dodajemy metodę do walidacji wszystkich pól
  dialog.validateAllFields = () => {
    let isValid = true;
    if (nameInput && nameInput.validate) {
      isValid = nameInput.validate() && isValid;
    }
    if (weightInput && weightInput.validate) {
      isValid = weightInput.validate() && isValid;
    }
    return isValid;
  };

  // Zwracamy obiekt z metodami walidacji
  return {
    validateName: nameInput ? () => validateNameField(nameInput) : () => true,
    validateWeight: weightInput ? () => validateWeightField(weightInput) : () => true,
    validateAll: () => dialog.validateAllFields(),
  };
}
