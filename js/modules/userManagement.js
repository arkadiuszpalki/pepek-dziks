// User management functions (add, edit, delete)
import { CONFIG } from "../modules/config.js";
import * as calculations from "../modules/calculations.js";
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
  // Znajdź wszystkie dialogi na stronie
  const loginDialog = document.querySelector("[data-dialog-login]");
  const editDialog = document.querySelector("[data-dialog-edit]");

  if (!loginDialog && !editDialog) {
    return;
  }

  // Dodaj style walidacji
  addValidationStyles();

  // Zapisz oryginalne placeholdery przy pierwszym ładowaniu dialogu edycji
  if (editDialog && !editDialog.dataset.placeholdersSaved) {
    const inputs = editDialog.querySelectorAll("input[placeholder]");
    inputs.forEach((input) => {
      input.dataset.originalPlaceholder = input.placeholder;
    });
    editDialog.dataset.placeholdersSaved = "true";
  }

  // Funkcja do obsługi konkretnego dialogu
  const setupDialogButtonsAndInteractions = (dialog) => {
    if (!dialog) return;

    // Oznaczamy dialog, że jest w trakcie inicjalizacji (zapobiegamy podwójnej inicjalizacji)
    dialog.setAttribute("data-initializing", "true");

    // Konfiguruj przyciski
    const buttons = dialog.querySelectorAll("[data-button-action]");

    // Przyciski anuluj i potwierdź
    const cancelButton = dialog.querySelector('[data-button-action="cancel"]');
    const confirmButton = dialog.querySelector('[data-button-action="confirm"]');

    // Usuwamy istniejące listenery przed dodaniem nowych
    if (cancelButton) {
      // Usuwamy poprzedni event listener
      cancelButton.removeEventListener("click", function () {
        dialog.close();
      });

      // Dodajemy nowy event listener bezpośrednio, bez klonowania
      cancelButton.addEventListener("click", function (e) {
        e.stopPropagation(); // Zatrzymujemy propagację, aby zapobiec podwójnemu wywołaniu
        dialog.close();
      });
    }

    if (confirmButton) {
      // Dla przycisku potwierdź, używamy setupHoldToSaveButton
      // Wyczyszczenie istniejących listenerów odbędzie się wewnątrz tej funkcji
      setupHoldToSaveButton(confirmButton, dialog, elements);
    }

    // Inne przyciski akcji (login, logout, elo-info, itp.)
    buttons.forEach((button) => {
      const action = button.getAttribute("data-button-action");

      // Pomijamy już skonfigurowane przyciski (cancel i confirm)
      if (action === "cancel" || action === "confirm") {
        return;
      }

      // Usuwamy istniejące listenery
      button.removeEventListener("click", function () {});

      // Dodajemy nowy listener
      button.addEventListener("click", function (e) {
        e.stopPropagation(); // Zatrzymujemy propagację

        if (action === "login") {
          const loginDialog = document.querySelector("[data-dialog-login]");
          if (loginDialog) loginDialog.showModal();
        } else if (action === "logout") {
          auth.signOut(elements);
        } else if (action === "elo-info") {
          const eloInfoDialog = document.querySelector("[data-dialog-elo-info]");
          if (eloInfoDialog) eloInfoDialog.showModal();
        } else if (action === "remove-user") {
          // Dla przycisku usuwania użytkownika mamy specjalną funkcję
          setupRemoveButton(button, dialog.dataset.editingUserId, dialog, elements);
        }
      });
    });

    // Ustawienie walidacji w czasie rzeczywistym
    setupLiveValidation(dialog);

    // Dodajemy obsługę auto-szerokości tylko dla dialogu edycji
    if (dialog === editDialog) {
      setupAutoWidthInputs(dialog);
    }

    // Oznaczamy dialog jako zainicjalizowany
    dialog.setAttribute("data-buttons-initialized", "true");
    dialog.removeAttribute("data-initializing");
  };

  // Konfiguruj oba dialogi
  if (loginDialog) setupDialogButtonsAndInteractions(loginDialog);
  if (editDialog) setupDialogButtonsAndInteractions(editDialog);
}

export function gatherAndSubmitUserData(dialog, elements) {
  if (!dialog) {
    return;
  }

  // Sprawdź czy mamy dialog logowania czy edycji
  const isLoginDialog = dialog.hasAttribute("data-dialog-login");

  if (isLoginDialog) {
    // Obsługa logowania
    const emailInput = dialog.querySelector("[data-action-email]");
    const passwordInput = dialog.querySelector("[data-action-password]");

    if (!emailInput || !passwordInput) {
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      if (!email) emailInput.classList.add("is-invalid");
      if (!password) passwordInput.classList.add("is-invalid");

      return;
    }

    // Wykonaj logowanie

    try {
      auth.signIn(email, password, elements);
      // Po udanym logowaniu zamknij dialog
      setTimeout(() => {
        dialog.close();
      }, 500);
    } catch (error) {}
    return;
  }

  // Poniżej kod dla dialogu edycji użytkownika
  const userId = dialog.dataset.editingUserId;

  // Pobierz logikę walidacji dla tego dialogu
  const validation = setupValidationLogic(dialog);
  if (!validation) {
    return;
  }

  // Walidacja po kliknięciu
  const { isValid, errors } = validation.validateAll();

  // Aktualizuj klasy CSS na podstawie błędów
  const nameLabel = validation.nameInput?.closest("label");
  if (nameLabel) {
    nameLabel.classList.toggle("is-invalid", !!errors.name);
  }
  const weightLabel = validation.weightInput?.closest("label");
  if (weightLabel) {
    weightLabel.classList.toggle("is-invalid", !!errors.weight);
  }

  if (!isValid) {
    return; // Zatrzymaj, jeśli są błędy
  }

  // Jeśli walidacja przeszła, zbierz dane
  const name = validation.nameInput.value.trim();
  const weight = parseInt(validation.weightInput.value, 10);

  // Pobierz wartość płci z atrybutu data-selected-value
  const sexToggleElement = dialog.querySelector('[data-action-input="sex"]');
  const sex = sexToggleElement?.dataset.selectedValue || "M";

  // Przygotuj dane użytkownika
  const userData = {
    name: name,
    waga: weight,
    plec: sex,
  };

  // Dodaj identyfikator bieżącego użytkownika do pola created_by
  const currentUserId = auth.getCurrentUserId();
  if (!userId && currentUserId) {
    // Dodajemy created_by tylko dla nowych rekordów (gdy userId jest null)
    userData.created_by = currentUserId;
  }

  // Zbierz dane dla wszystkich ćwiczeń
  Object.entries(CONFIG.exercises).forEach(([key]) => {
    const maxRepsInput = dialog.querySelector(`[data-action-input-max-reps="${key}"] input`);
    const oneRepInput = dialog.querySelector(`[data-action-input-one-rep="${key}"] input`);

    // Dla wszystkich ćwiczeń z wyjątkiem press
    if (key !== "press" && maxRepsInput) {
      const maxReps = maxRepsInput.value.trim() ? parseInt(maxRepsInput.value, 10) : 0;
      userData[`${key.replace(/-/g, "_")}_max_reps`] = maxReps;
    }

    if (oneRepInput) {
      const oneRep = oneRepInput.value.trim() ? parseInt(oneRepInput.value, 10) : 0;
      userData[`${key.replace(/-/g, "_")}_one_rep`] = oneRep;
    }
  });

  // Wyślij dane do bazy
  submitToSupabase(userId, userData, dialog, elements);
}

export async function submitToSupabase(userId, userData, dialog, elements) {
  const confirmButton = dialog.querySelector('[data-button-action="confirm"]');
  if (confirmButton) confirmButton.disabled = true;

  // Upewnijmy się, że wszystkie klucze używają podkreślników zamiast myślników
  const sanitizedUserData = {};
  for (const [key, value] of Object.entries(userData)) {
    sanitizedUserData[key.replace(/-/g, "_")] = value;
  }

  let result;
  let updatedRecordId = null;
  let shouldCloseDialog = true;

  try {
    if (userId) {
      result = await api.updateUser(userId, sanitizedUserData);
      if (!result.error && result.data && result.data.length > 0) {
        updatedRecordId = result.data[0].id;
        updateTableRow(userId, result.data[0], elements);
      } else if (!result.error) {
        updatedRecordId = userId;
      }
    } else {
      result = await api.createUser(sanitizedUserData);
      if (!result.error && result.data && result.data.length > 0) {
        updatedRecordId = result.data[0].id;
        addTableRow(result.data[0], elements);
      } else if (!result.error) {
      }
    }

    if (result.error) {
      if (result.error.details) {
      }
      if (result.error.hint) {
      }
      shouldCloseDialog = false;
    } else {
      refreshTableCalculations(updatedRecordId, elements);
    }
  } catch (err) {
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

  // Check mobile view mode and hide extras if needed
  const isMobile = window.innerWidth <= 991;
  const currentMode = localStorage.getItem("dziks_view_mode") || "default";

  if (isMobile && currentMode === "default") {
    const tableExtras = row.querySelector("[data-table-extras]");
    if (tableExtras) {
      tableExtras.style.display = "none";
    }
  }

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
      // Zawsze ustawiaj wartość na pustą lub przekazaną
      inputElement.value =
        isPlaceholder || value === "" || (typeof value === "string" && value === "0") ? "" : value;

      // Ustaw placeholder
      if (userId === null) {
        // Tryb dodawania: Przywróć oryginalny placeholder z atrybutu data-
        inputElement.placeholder = inputElement.dataset.originalPlaceholder || "";
      } else {
        // Tryb edycji: Ustaw placeholder na aktualną wartość (lub oryginalny, jeśli brak wartości)
        inputElement.placeholder = value || inputElement.dataset.originalPlaceholder || "";
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
    const sexToggleElement = editDialog.querySelector(
      '[data-dialog-edit] [data-action-input="sex"]'
    );
    if (sexToggleElement) {
      const switcher = sexToggleElement.querySelector("[data-action-input-switcher]");

      // Funkcja aktualizująca tylko pozycję switchera i zapisująca wartość
      const updateSwitcherState = (selectedValue) => {
        if (switcher) {
          switcher.style.transform = selectedValue === "K" ? "translateX(50%)" : "translateX(-50%)";
        }
        sexToggleElement.dataset.selectedValue = selectedValue;
      };

      // Usuń stary listener, jeśli istniał
      const existingClickListener = sexToggleElement.__clickListener;
      if (existingClickListener) {
        sexToggleElement.removeEventListener("click", existingClickListener);
      }

      // Dodaj nowy listener do całego kontenera
      const newClickListener = () => {
        const currentValue = sexToggleElement.dataset.selectedValue || "M";
        const newValue = currentValue === "M" ? "K" : "M";
        updateSwitcherState(newValue);
      };
      sexToggleElement.addEventListener("click", newClickListener);
      sexToggleElement.__clickListener = newClickListener;

      // Ustaw stan początkowy na podstawie danych z wiersza tabeli
      const initialSex = sexValue;
      updateSwitcherState(initialSex);
    } else {
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

    const sexToggleElement = editDialog.querySelector(
      '[data-dialog-edit] [data-action-input="sex"]'
    );
    if (sexToggleElement) {
      const switcher = sexToggleElement.querySelector("[data-action-input-switcher]");

      // Funkcja aktualizująca tylko pozycję switchera i zapisująca wartość
      const updateSwitcherState = (selectedValue) => {
        if (switcher) {
          switcher.style.transform = selectedValue === "K" ? "translateX(50%)" : "translateX(-50%)";
        }
        sexToggleElement.dataset.selectedValue = selectedValue;
      };

      // Usuń stary listener, jeśli istniał
      const existingClickListener = sexToggleElement.__clickListener;
      if (existingClickListener) {
        sexToggleElement.removeEventListener("click", existingClickListener);
      }

      // Dodaj nowy listener do całego kontenera
      const newClickListener = () => {
        const currentValue = sexToggleElement.dataset.selectedValue || "M";
        const newValue = currentValue === "M" ? "K" : "M";
        updateSwitcherState(newValue);
      };
      sexToggleElement.addEventListener("click", newClickListener);
      sexToggleElement.__clickListener = newClickListener;

      // Ustaw stan początkowy
      const initialSex = "M";
      updateSwitcherState(initialSex);
    } else {
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
  const holdDuration = 1500;
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
    } catch (err) {}
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
      } catch (error) {}
    });
  }
}

export function setupHoldToSaveButton(button, dialog, elements) {
  if (!button) {
    return;
  }

  const saveButton = button; // Zmieniono nazwę dla jasności
  const originalText = saveButton.querySelector(".button_label")?.textContent || "Zapisz";

  // Funkcja do resetowania stanu przycisku (głównie tekstu)
  const resetButtonState = () => {
    const buttonLabel = saveButton.querySelector(".button_label");
    if (buttonLabel) {
      buttonLabel.textContent = originalText;
    }
    // Można tu dodać usuwanie klas, jeśli jakieś były dodawane w procesie zapisu
    saveButton.classList.remove("is-saving", "is-success", "is-error");
  };

  // Funkcja wywoływana przy kliknięciu
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Bezpośrednio próbujemy zapisać dane
    if (!dialog || !elements) {
      return;
    }
    try {
      // Oznacz przycisk jako "zapisywanie" (opcjonalnie)
      saveButton.classList.add("is-saving");
      const buttonLabel = saveButton.querySelector(".button_label");
      if (buttonLabel) buttonLabel.textContent = "Zapisywanie...";

      // Wywołaj funkcję zapisu
      gatherAndSubmitUserData(dialog, elements);

      // Reset stanu nastąpi wewnątrz gatherAndSubmitUserData lub po jego zakończeniu
      // Tutaj możemy tylko zresetować po krótkim czasie na wszelki wypadek, jeśli gatherAndSubmitUserData nie zamknie dialogu
      setTimeout(() => {
        // Sprawdź, czy dialog jest nadal otwarty, zanim zresetujesz
        if (dialog.open) {
          resetButtonState();
        }
      }, 1000); // Krótki czas oczekiwania
    } catch (error) {
      // W razie błędu również resetuj stan
      resetButtonState();
    }
  };

  // Usuwamy stary listener 'click', jeśli istniał
  // Trudno jest usunąć anonimowe listenery, więc polegamy na tym, że nie dublujemy
  // Lub upewniamy się, że ta funkcja setup jest wołana tylko raz dla przycisku
  // Ewentualnie, przed dodaniem, można sklonować przycisk bez listenerów
  // const clonedButton = saveButton.cloneNode(true);
  // saveButton.parentNode.replaceChild(clonedButton, saveButton);
  // saveButton = clonedButton; // Używaj klona dalej

  // Dodajemy nowy, prosty listener click
  saveButton.removeEventListener("click", handleClick); // Spróbuj usunąć, jeśli był już dodany
  saveButton.addEventListener("click", handleClick);

  // Resetuj stan przycisku przy zamknięciu dialogu
  const closeListener = () => {
    resetButtonState();
  };

  dialog.removeEventListener("close", closeListener);
  dialog.addEventListener("close", closeListener);

  return saveButton;
}

// Funkcja do walidacji pól (bez modyfikacji DOM)
function setupValidationLogic(dialog) {
  if (!dialog) return null;

  const nameInput = dialog.querySelector('[data-action-input="name"] input');
  const weightInput = dialog.querySelector('[data-action-input="weight"] input');

  // Funkcja sprawdzająca pole tekstowe (zwraca true/false)
  const isNameValid = () => {
    return nameInput && nameInput.value.trim() !== "";
  };

  // Funkcja sprawdzająca pole wagi (zwraca true/false)
  const isWeightValid = () => {
    if (!weightInput) return true; // Jeśli nie ma pola wagi, uznajemy za poprawne
    const value = parseInt(weightInput.value.trim(), 10);
    return !isNaN(value) && value > 0;
  };

  // Funkcja sprawdzająca wszystkie pola i zwracająca status oraz listę błędów
  const validateAll = () => {
    const errors = {};
    if (!isNameValid()) {
      errors.name = true;
    }
    if (!isWeightValid()) {
      errors.weight = true;
    }
    const isValid = Object.keys(errors).length === 0;
    return { isValid, errors };
  };

  // Zwracamy obiekt z funkcjami walidującymi
  return {
    isNameValid,
    isWeightValid,
    validateAll,
    nameInput, // Zwracamy też referencje do inputów dla łatwiejszego dostępu
    weightInput,
  };
}

// Ta funkcja jest wywoływana podczas inicjalizacji dialogu, ale nie dodaje już listenerów live
function setupLiveValidation(dialog) {
  // Można tu zostawić ewentualne inne konfiguracje walidacji, jeśli będą potrzebne,
  // ale usuwamy logikę live validation (event listenery input/change/blur)
  // i bezpośrednie dodawanie/usuwanie klas is-invalid.
  // Wcześniejszy kod listenerów i modyfikacji DOM został usunięty.
}
