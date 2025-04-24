console.log("userManagement.js loaded");

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
  console.log("addValidationStyles: Style walidacji dodane");
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
  console.log("setupDialogInteractions: START");
  console.log("setupDialogInteractions: elements:", elements);

  // Znajdź wszystkie dialogi na stronie
  const loginDialog = document.querySelector("[data-dialog-login]");
  const editDialog = document.querySelector("[data-dialog-edit]");

  console.log("setupDialogInteractions: login dialog:", loginDialog);
  console.log("setupDialogInteractions: edit dialog:", editDialog);

  if (!loginDialog && !editDialog) {
    console.error("setupDialogInteractions: BŁĄD - nie znaleziono żadnego dialogu!");
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
    console.log("Oryginalne placeholdery zapisane dla dialogu edycji.");
  }

  // Funkcja do obsługi konkretnego dialogu
  const setupDialogButtonsAndInteractions = (dialog) => {
    if (!dialog) return;

    console.log(`setupDialogButtonsAndInteractions: Konfiguracja dialogu:`, dialog);

    // Oznaczamy dialog, że jest w trakcie inicjalizacji (zapobiegamy podwójnej inicjalizacji)
    dialog.setAttribute("data-initializing", "true");

    // Konfiguruj przyciski
    const buttons = dialog.querySelectorAll("[data-button-action]");
    console.log(
      `Znaleziono ${buttons.length} przycisków w dialogu:`,
      Array.from(buttons).map((btn) => `[${btn.getAttribute("data-button-action")}]`)
    );

    // Przyciski anuluj i potwierdź
    const cancelButton = dialog.querySelector('[data-button-action="cancel"]');
    const confirmButton = dialog.querySelector('[data-button-action="confirm"]');

    console.log("cancelButton:", cancelButton);
    console.log("confirmButton:", confirmButton);

    // Usuwamy istniejące listenery przed dodaniem nowych
    if (cancelButton) {
      // Usuwamy poprzedni event listener
      cancelButton.removeEventListener("click", function () {
        dialog.close();
      });

      // Dodajemy nowy event listener bezpośrednio, bez klonowania
      cancelButton.addEventListener("click", function (e) {
        console.log("Przycisk anuluj: Kliknięty!");
        e.stopPropagation(); // Zatrzymujemy propagację, aby zapobiec podwójnemu wywołaniu
        dialog.close();
      });

      console.log("Dodano listener do przycisku anuluj");
    }

    if (confirmButton) {
      // Dla przycisku potwierdź, używamy setupHoldToSaveButton
      // Wyczyszczenie istniejących listenerów odbędzie się wewnątrz tej funkcji
      setupHoldToSaveButton(confirmButton, dialog, elements);
      console.log("Skonfigurowano przycisk potwierdź z hold-to-save");
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
        console.log(`Przycisk ${action} kliknięty!`);
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

      console.log(`Dodano listener do przycisku ${action}`);
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

    console.log(
      `Dialog ${
        dialog.hasAttribute("data-dialog-login") ? "logowania" : "edycji"
      } został w pełni skonfigurowany`
    );
  };

  // Konfiguruj oba dialogi
  if (loginDialog) setupDialogButtonsAndInteractions(loginDialog);
  if (editDialog) setupDialogButtonsAndInteractions(editDialog);

  console.log("setupDialogInteractions: KONIEC");
}

export function gatherAndSubmitUserData(dialog, elements) {
  console.log("gatherAndSubmitUserData: START");

  if (!dialog) {
    console.error("gatherAndSubmitUserData: Brak dialogu!");
    return;
  }

  console.log("gatherAndSubmitUserData: Dialog:", dialog);

  // Sprawdź czy mamy dialog logowania czy edycji
  const isLoginDialog = dialog.hasAttribute("data-dialog-login");
  console.log("gatherAndSubmitUserData: Czy to dialog logowania?", isLoginDialog);

  if (isLoginDialog) {
    // Obsługa logowania
    const emailInput = dialog.querySelector("[data-action-email]");
    const passwordInput = dialog.querySelector("[data-action-password]");

    if (!emailInput || !passwordInput) {
      console.error("gatherAndSubmitUserData: Brak wymaganych pól w formularzu logowania!");
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      console.error("gatherAndSubmitUserData: Brak email lub hasła!");

      if (!email) emailInput.classList.add("is-invalid");
      if (!password) passwordInput.classList.add("is-invalid");

      return;
    }

    // Wykonaj logowanie
    console.log("gatherAndSubmitUserData: Próba logowania dla email:", email);
    try {
      auth.signIn(email, password, elements);
      // Po udanym logowaniu zamknij dialog
      setTimeout(() => {
        dialog.close();
      }, 500);
    } catch (error) {
      console.error("Błąd podczas logowania:", error);
    }
    return;
  }

  // Poniżej kod dla dialogu edycji użytkownika
  const userId = dialog.dataset.editingUserId;
  console.log("gatherAndSubmitUserData: ID edytowanego użytkownika:", userId);

  // Pobierz logikę walidacji dla tego dialogu
  const validation = setupValidationLogic(dialog);
  if (!validation) {
    console.error("gatherAndSubmitUserData: Nie udało się zainicjować logiki walidacji.");
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
    console.error("gatherAndSubmitUserData: Formularz zawiera błędy!", errors);
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

  console.log("gatherAndSubmitUserData: Zebrane dane:", userData);
  console.log("gatherAndSubmitUserData: Klucze obiektu userData:", Object.keys(userData));

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

  console.log("submitToSupabase: Dane po czyszczeniu:", sanitizedUserData);
  console.log("submitToSupabase: Klucze po czyszczeniu:", Object.keys(sanitizedUserData));

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
        console.warn("User update successful but RLS might have prevented reading data back.");
        updatedRecordId = userId;
      }
    } else {
      result = await api.createUser(sanitizedUserData);
      if (!result.error && result.data && result.data.length > 0) {
        updatedRecordId = result.data[0].id;
        addTableRow(result.data[0], elements);
      } else if (!result.error) {
        console.warn("User creation successful but RLS might have prevented reading data back.");
      }
    }

    if (result.error) {
      console.error(`Błąd zapisu danych: ${result.error.message}`);
      if (result.error.details) {
        console.error("Szczegóły błędu:", result.error.details);
      }
      if (result.error.hint) {
        console.error("Wskazówka:", result.error.hint);
      }
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
  console.log("openEditDialog: START, userId =", userId);
  console.log("openEditDialog: elements =", elements);

  const editDialog = elements.authElements.editDialog || elements.authElements.theDialog;
  console.log("openEditDialog: dialog =", editDialog);

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
      sexToggleElement.removeEventListener("click", () => {});

      // Dodaj nowy listener do całego kontenera
      sexToggleElement.addEventListener("click", () => {
        const currentValue = sexToggleElement.dataset.selectedValue || "M";
        const newValue = currentValue === "M" ? "K" : "M";
        updateSwitcherState(newValue);
      });

      // Ustaw stan początkowy na podstawie danych z wiersza tabeli
      const initialSex = sexValue; // Używamy sexValue pobranego wcześniej
      updateSwitcherState(initialSex);
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
      sexToggleElement.removeEventListener("click", () => {});

      // Dodaj nowy listener do całego kontenera
      sexToggleElement.addEventListener("click", () => {
        const currentValue = sexToggleElement.dataset.selectedValue || "M";
        const newValue = currentValue === "M" ? "K" : "M";
        updateSwitcherState(newValue);
      });

      // Ustaw stan początkowy
      const initialSex = "M";
      updateSwitcherState(initialSex);
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
  console.log("setupHoldToSaveButton: START dla przycisku:", button);

  if (!button) {
    console.error("setupHoldToSaveButton: Nieprawidłowy przycisk", button);
    return;
  }

  // Usuwamy klonowanie przycisku, które powodowało utratę listenerów zdarzeń
  // Zamiast klonowania, korzystamy z oryginalnego elementu
  const holdButton = button;

  console.log("setupHoldToSaveButton: Używamy oryginalnego przycisku");

  const originalText = holdButton.querySelector(".button_label")?.textContent || "";
  console.log("setupHoldToSaveButton: Oryginalny tekst przycisku:", originalText);

  // Sprawdzamy, czy jesteśmy na urządzeniu mobilnym
  const isMobile = window.innerWidth <= 768;

  // Tworzymy pasek postępu tylko dla urządzeń mobilnych
  let progressBar = holdButton.querySelector(".hold-progress");
  if (isMobile) {
    if (!progressBar) {
      progressBar = document.createElement("div");
      progressBar.className = "hold-progress";
      progressBar.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        width: 0%;
        background-color: var(--_colors---brand, #FFCB16);
        transition: width 0.1s linear;
        z-index: 2;
      `;
      holdButton.appendChild(progressBar);
      console.log("setupHoldToSaveButton: Dodano pasek postępu");
    }
  } else if (progressBar) {
    // Usuwamy pasek postępu na desktopie jeśli istnieje
    progressBar.remove();
  }

  // Używamy zmiennych do przechowywania stanu
  let progressInterval;
  let isHolding = false;
  let holdStartTime;
  let touchStartX, touchStartY;
  let moveThreshold = 10; // px
  let hasMoved = false;
  let holdDuration = 1000; // 1000ms tylko dla mobile

  const resetButton = () => {
    console.log("resetButton: Resetowanie stanu przycisku");
    isHolding = false;
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }

    if (progressBar) {
      progressBar.style.width = "0%";
    }

    // Przywracamy oryginalny tekst
    const buttonLabel = holdButton.querySelector(".button_label");
    if (buttonLabel) {
      buttonLabel.textContent = originalText;
    }

    // Usuwamy dodatkowe klasy
    holdButton.classList.remove("is-saving", "is-success", "is-error");
  };

  const startProgress = (startTime) => {
    if (!isMobile) return; // Nie uruchamiamy na desktopie

    const animate = () => {
      if (!isHolding) return;

      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / holdDuration) * 100, 100);

      if (progressBar) {
        progressBar.style.width = `${progress}%`;
      }

      if (progress >= 100) {
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
        saveUser();
      }
    };

    progressInterval = setInterval(animate, 10);
  };

  const saveUser = () => {
    // Zamiast gromadzić dane bezpośrednio tutaj, wywołujemy funkcję, która to zrobi
    console.log("saveUser: Rozpoczynam procedurę zapisu danych");

    // Upewnijmy się, że dialog i elements są dostępne
    if (!dialog) {
      console.error("saveUser: Brak referencji do dialogu!");
      return;
    }

    if (!elements) {
      console.error("saveUser: Brak referencji do elements!");
      return;
    }

    // Bezpośrednie wywołanie funkcji - blokujemy event propagation
    try {
      gatherAndSubmitUserData(dialog, elements);
      console.log("saveUser: Wywołano gatherAndSubmitUserData");
    } catch (error) {
      console.error("saveUser: Błąd podczas przetwarzania danych:", error);
    }
  };

  const handleStart = (e) => {
    // Obsługa tylko dla urządzeń mobilnych
    if (!isMobile) return;

    // Obsługa zarówno dotyku, jak i myszy
    if (e.type === "touchstart") {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }

    holdStartTime = Date.now();
    isHolding = true;
    hasMoved = false;

    startProgress(holdStartTime);
  };

  const handleMove = (e) => {
    if (!isHolding || !isMobile) return;

    // Sprawdzamy tylko dla zdarzeń dotykowych
    if (e.type === "touchmove") {
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;

      // Sprawdzamy, czy użytkownik przesunął palec wystarczająco daleko
      const deltaX = Math.abs(touchX - touchStartX);
      const deltaY = Math.abs(touchY - touchStartY);

      if (deltaX > moveThreshold || deltaY > moveThreshold) {
        hasMoved = true;
        resetButton();
      }
    }
  };

  const handleEnd = () => {
    // Tylko dla urządzeń mobilnych
    if (!isMobile) return;

    // Sprawdzamy, czy użytkownik nie przesunął palca/kursora zbyt daleko
    if (isHolding && !hasMoved) {
      // Obliczamy, ile czasu minęło od rozpoczęcia przytrzymania
      const elapsed = Date.now() - holdStartTime;

      // Jeśli minęło wystarczająco dużo czasu, zapisujemy
      if (elapsed >= holdDuration) {
        saveUser();
      }
    }

    resetButton();
  };

  // Dodajemy delegowany handler dla kliknięcia, który nie usuwa innych listenerów
  const handleClick = (e) => {
    console.log("Przycisk potwierdź: Kliknięty!", e.type);

    // Sprawdźmy, czy to przycisk logowania
    const isLoginButton =
      dialog.hasAttribute("data-dialog-login") && holdButton.closest("[data-dialog-login]");

    // Na desktopie natychmiast zapisujemy
    if (!isMobile || isLoginButton) {
      console.log("Natychmiastowa akcja - desktop lub przycisk logowania");
      saveUser();
      return;
    }

    // Dla kliknięć na urządzeniach mobilnych (krótszych niż 250ms) wykonujemy akcję natychmiast
    if (isMobile && Date.now() - holdStartTime < 250) {
      saveUser();
      resetButton();
    }
  };

  // Usuwamy istniejące nasłuchiwacze przed dodaniem nowych, aby uniknąć duplikacji
  holdButton.removeEventListener("mousedown", handleStart);
  holdButton.removeEventListener("touchstart", handleStart);
  holdButton.removeEventListener("mousemove", handleMove);
  holdButton.removeEventListener("touchmove", handleMove);
  holdButton.removeEventListener("mouseup", handleEnd);
  holdButton.removeEventListener("touchend", handleEnd);
  holdButton.removeEventListener("mouseleave", handleEnd);
  holdButton.removeEventListener("click", handleClick);

  // Dodajemy nowe nasłuchiwacze - dla mobilnej wersji
  if (isMobile) {
    holdButton.addEventListener("mousedown", handleStart);
    holdButton.addEventListener("touchstart", handleStart, { passive: true });
    holdButton.addEventListener("mousemove", handleMove);
    holdButton.addEventListener("touchmove", handleMove, { passive: true });
    holdButton.addEventListener("mouseup", handleEnd);
    holdButton.addEventListener("touchend", handleEnd);
    holdButton.addEventListener("mouseleave", handleEnd);
  }

  // Zawsze dodajemy listener click dla desktopa i mobilnych
  holdButton.addEventListener("click", handleClick);

  console.log("setupHoldToSaveButton: Dodano listener click");

  // Funkcja aktualizacji oparta na rozmiarze ekranu
  const updateBasedOnScreenSize = () => {
    const wasDesktop = !isMobile;
    const newIsMobile = window.innerWidth <= 768;

    // Jeśli zmienił się tryb (desktop <-> mobile)
    if (wasDesktop !== !newIsMobile) {
      // Odświeżamy setup przycisku
      resetButton();
      setupHoldToSaveButton(button, dialog, elements);
    }
  };

  // Nasłuchiwacz zmiany rozmiaru ekranu
  window.removeEventListener("resize", updateBasedOnScreenSize);
  window.addEventListener("resize", updateBasedOnScreenSize);

  // Resetuj przycisk przy zamknięciu dialogu
  const closeListener = () => {
    resetButton();
  };

  // Usuń stary listener i dodaj nowy
  dialog.removeEventListener("close", closeListener);
  dialog.addEventListener("close", closeListener);

  console.log("setupHoldToSaveButton: KONIEC, tryb:", isMobile ? "mobilny" : "desktop");
  return holdButton;
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
  console.log("SetupLiveValidation: Konfiguracja walidacji (bez live).");
  // Wcześniejszy kod listenerów i modyfikacji DOM został usunięty.
}
