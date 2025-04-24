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

  // Przywróć normalną skalę dla elementu [data-table] po zamknięciu wszystkich dialogów
  const tableElement = document.querySelector("[data-table]");
  if (tableElement) {
    tableElement.style.transform = "scale(1)";
  }
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

  // Zastosuj skalę 0.95 do elementu [data-table] gdy dialog jest otwarty
  const tableElement = document.querySelector("[data-table]");
  if (tableElement) {
    tableElement.style.transform = "scale(0.95)";
    tableElement.style.transition = "transform 0.3s ease";
  }

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

  // Jeśli nie ma już aktywnych dialogów, przywróć normalną skalę dla elementu [data-table]
  if (activeDialogs.size === 0) {
    const tableElement = document.querySelector("[data-table]");
    if (tableElement) {
      tableElement.style.transform = "scale(1)";
    }
  }
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
    return;
  }

  if (setupDialogSwipeGesture) {
    if (!eloInfoDialog.querySelector("[data-dialog-drag]")) {
      const dialogHeader =
        eloInfoDialog.querySelector(".dialog-header") ||
        eloInfoDialog.querySelector("header") ||
        eloInfoDialog.firstElementChild;

      if (dialogHeader) {
        dialogHeader.setAttribute("data-dialog-drag", "");
      }
    }

    setupDialogSwipeGesture(eloInfoDialog);
  }

  eloInfoButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    openDialog(eloInfoDialog);
  });

  // Obsługa zamykania dialogu przez przyciski (jeśli istnieją)
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

          // Zastosuj skalę 0.95 do elementu [data-table] gdy dialog logowania jest otwarty
          const tableElement = document.querySelector("[data-table]");
          if (tableElement) {
            tableElement.style.transform = "scale(0.95)";
            tableElement.style.transition = "transform 0.3s ease";
          }

          setupDialogClickOutside(elements.authElements.loginDialog);

          return originalShowModal.apply(this, arguments);
        };
      }

      elements.authElements.loginDialog.addEventListener("close", () => {
        activeDialogs.delete(elements.authElements.loginDialog);

        // Jeśli nie ma już aktywnych dialogów, przywróć normalną skalę dla elementu [data-table]
        if (activeDialogs.size === 0) {
          const tableElement = document.querySelector("[data-table]");
          if (tableElement) {
            tableElement.style.transform = "scale(1)";
          }
        }
      });
    }

    if (elements.authElements.editDialog) {
      if (elements.authElements.editDialog.showModal) {
        const originalShowModal = elements.authElements.editDialog.showModal;
        elements.authElements.editDialog.showModal = function () {
          closeAllDialogs();
          activeDialogs.add(elements.authElements.editDialog);

          // Zastosuj skalę 0.95 do elementu [data-table] gdy dialog edycji jest otwarty
          const tableElement = document.querySelector("[data-table]");
          if (tableElement) {
            tableElement.style.transform = "scale(0.95)";
            tableElement.style.transition = "transform 0.3s ease";
          }

          setupDialogClickOutside(elements.authElements.editDialog);

          return originalShowModal.apply(this, arguments);
        };
      }

      elements.authElements.editDialog.addEventListener("close", () => {
        activeDialogs.delete(elements.authElements.editDialog);

        // Jeśli nie ma już aktywnych dialogów, przywróć normalną skalę dla elementu [data-table]
        if (activeDialogs.size === 0) {
          const tableElement = document.querySelector("[data-table]");
          if (tableElement) {
            tableElement.style.transform = "scale(1)";
          }
        }
      });
    }
  }

  if (setupDialogSwipeGesture) {
    const allDialogs = document.querySelectorAll("dialog.dialog");
    allDialogs.forEach((dialog) => {
      if (!dialog.querySelector("[data-dialog-drag]")) {
        const dialogHeader =
          dialog.querySelector(".dialog-header") ||
          dialog.querySelector("header") ||
          dialog.firstElementChild;

        if (dialogHeader) {
          dialogHeader.setAttribute("data-dialog-drag", "");
        }
      }

      setupDialogSwipeGesture(dialog);

      dialog.addEventListener("click", (e) => {
        if (e.target === dialog) {
          closeDialog(dialog);
        }
      });

      // Dodaj event listener dla zdarzenia close, aby przywrócić skalę tabeli
      dialog.addEventListener("close", () => {
        // Jeśli nie ma już aktywnych dialogów, przywróć normalną skalę dla elementu [data-table]
        if (activeDialogs.size === 0) {
          const tableElement = document.querySelector("[data-table]");
          if (tableElement) {
            tableElement.style.transform = "scale(1)";
            tableElement.style.transition = "transform 0.3s ease";
          }
        }
      });
    });
  }
}
