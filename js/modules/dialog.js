let activeDialogs = new Set();

/**
 * Zamyka wszystkie aktualnie otwarte dialogi
 */
export function closeAllDialogs() {
  activeDialogs.forEach((dialog) => {
    if (dialog.close) {
      dialog.close();
    } else if (dialog.classList) {
      dialog.classList.remove("open");
    }
  });

  activeDialogs.clear();
}

/**
 * Otwiera dialog i dodaje go do listy aktywnych
 * @param {HTMLElement} dialog - Element dialogu do otwarcia
 */
export function openDialog(dialog) {
  closeAllDialogs();

  if (dialog.showModal) {
    dialog.showModal();
  } else if (dialog.classList) {
    dialog.classList.add("open");
  }

  activeDialogs.add(dialog);

  setupDialogClickOutside(dialog);
}

/**
 * Zamyka określony dialog i usuwa go z listy aktywnych
 * @param {HTMLElement} dialog - Element dialogu do zamknięcia
 */
export function closeDialog(dialog) {
  if (dialog.close) {
    dialog.close();
  } else if (dialog.classList) {
    dialog.classList.remove("open");
  }

  activeDialogs.delete(dialog);
}

/**
 * Dodaj obsługę kliknięcia poza zawartością dialogu aby go zamknąć
 * @param {HTMLElement} dialog - Element dialogu
 */
function setupDialogClickOutside(dialog) {
  const handleDialogClick = (e) => {
    if (e.target === dialog) {
      closeDialog(dialog);

      dialog.removeEventListener("click", handleDialogClick);
    }
  };

  dialog.removeEventListener("click", handleDialogClick);

  dialog.addEventListener("click", handleDialogClick);
}

/**
 * Inicjalizuje dialog ELO info
 * @param {Function} setupDialogSwipeGesture - Funkcja do konfiguracji gestów przesuwania
 */
export function setupEloInfoDialog(setupDialogSwipeGesture) {
  const eloInfoButton = document.querySelector('[data-button-action="elo-info"]');
  const eloInfoDialog = document.querySelector("[data-dialog-elo-info]");

  if (!eloInfoButton || !eloInfoDialog) {
    console.error("Nie znaleziono przycisku ELO info lub dialogu ELO info");
    return;
  }

  if (setupDialogSwipeGesture) {
    setupDialogSwipeGesture(eloInfoDialog);
  }

  eloInfoButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    openDialog(eloInfoDialog);
  });

  const closeButton =
    eloInfoDialog.querySelector('[data-button-action="close"]') ||
    eloInfoDialog.querySelector("#elo-info-close") ||
    eloInfoDialog.querySelector('[data-button-action="elo-info-close"]');

  if (closeButton) {
    closeButton.addEventListener("click", () => {
      closeDialog(eloInfoDialog);
    });
  } else {
    console.warn(
      "Brak przycisku zamknięcia w dialogu ELO info. Dodaj przycisk z atrybutem data-button-action='close', data-button-action='elo-info-close' lub id='elo-info-close'"
    );
  }

  const allCloseButtons = eloInfoDialog.querySelectorAll(
    '[data-button-action="elo-info-close"], [data-button-action="close"]'
  );
  allCloseButtons.forEach((button) => {
    button.addEventListener("click", () => {
      closeDialog(eloInfoDialog);
    });
  });
}

/**
 * Inicjalizuje wszystkie dialogi na stronie
 * @param {Object} elements - Obiekty elementów z głównego kodu
 * @param {Function} setupDialogSwipeGesture - Funkcja do konfiguracji gestów przesuwania
 */
export function initializeAllDialogs(elements, setupDialogSwipeGesture) {
  setupEloInfoDialog(setupDialogSwipeGesture);

  if (elements && elements.authElements) {
    elements.authElements.loginDialog = document.querySelector("[data-dialog-login]");

    elements.authElements.editDialog = document.querySelector("[data-dialog-edit]");

    if (elements.authElements.loginDialog) {
      elements.authElements.theDialog = elements.authElements.loginDialog;

      if (elements.authElements.loginDialog.showModal) {
        const originalShowModal = elements.authElements.loginDialog.showModal;
        elements.authElements.loginDialog.showModal = function () {
          closeAllDialogs();
          activeDialogs.add(elements.authElements.loginDialog);

          setupDialogClickOutside(elements.authElements.loginDialog);

          return originalShowModal.apply(this, arguments);
        };
      }

      elements.authElements.loginDialog.addEventListener("close", () => {
        activeDialogs.delete(elements.authElements.loginDialog);
      });
    }

    if (elements.authElements.editDialog) {
      if (elements.authElements.editDialog.showModal) {
        const originalShowModal = elements.authElements.editDialog.showModal;
        elements.authElements.editDialog.showModal = function () {
          closeAllDialogs();
          activeDialogs.add(elements.authElements.editDialog);

          setupDialogClickOutside(elements.authElements.editDialog);

          return originalShowModal.apply(this, arguments);
        };
      }

      elements.authElements.editDialog.addEventListener("close", () => {
        activeDialogs.delete(elements.authElements.editDialog);
      });
    }
  }

  if (setupDialogSwipeGesture) {
    const allDialogs = document.querySelectorAll("dialog.dialog");
    allDialogs.forEach((dialog) => {
      setupDialogSwipeGesture(dialog);

      dialog.addEventListener("click", (e) => {
        if (e.target === dialog) {
          closeDialog(dialog);
        }
      });
    });
  }
}
