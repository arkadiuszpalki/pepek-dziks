// Authentication related functions
import * as api from "./api.js";

let currentUserId = null;
let currentUserIsAdmin = false;
let currentUserCanEdit = false;

export function getCurrentUserId() {
  return currentUserId;
}

export function isCurrentUserAdmin() {
  return currentUserIsAdmin;
}

export function canCurrentUserEdit() {
  return currentUserCanEdit;
}

export function setupAuthListeners(elements) {
  if (!elements.authElements.loginFormOnPage) return;

  if (elements.authElements.initialLoginButton) {
    elements.authElements.initialLoginButton.addEventListener("click", () => {
      if (elements.authElements.theDialog && elements.authElements.loginWrapper && elements.authElements.editWrapper) {
        elements.authElements.loginWrapper.style.display = "";
        elements.authElements.editWrapper.style.display = "none";

        elements.authElements.emailInput.value = "";
        elements.authElements.passwordInput.value = "";

        elements.authElements.emailInput.classList.remove("is-invalid");
        elements.authElements.passwordInput.classList.remove("is-invalid");
        elements.authElements.theDialog.showModal();
      } else {
        console.error("Dialog or its wrappers not found!");
      }
    });
  }

  if (elements.authElements.confirmLoginButton) {
    elements.authElements.confirmLoginButton.addEventListener("click", async () => {
      if (!elements.authElements.emailInput || !elements.authElements.passwordInput) {
        console.error("Email or Password input not found in login dialog.");
        return;
      }

      const email = elements.authElements.emailInput.value;
      const password = elements.authElements.passwordInput.value;

      if (!email || !password) {
        console.error("Proszę podać email i hasło w dialogu.");
        return;
      }

      elements.authElements.confirmLoginButton.disabled = true;
      const originalButtonText = elements.authElements.confirmLoginButton.querySelector(".button_label")?.textContent || "Zaloguj";
      if (elements.authElements.confirmLoginButton.querySelector(".button_label")) {
        elements.authElements.confirmLoginButton.querySelector(".button_label").textContent = "Logowanie...";
      }

      try {
        const { data, error } = await api.signIn(email, password);
        if (error) {
          throw error;
        }

        await updateAuthStateUI(data.user, elements);

        if (elements.authElements.theDialog) {
          elements.authElements.theDialog.close();
        }

        elements.authElements.emailInput.value = "";
        elements.authElements.passwordInput.value = "";
      } catch (error) {
        console.error("Login error:", error);
      } finally {
        elements.authElements.confirmLoginButton.disabled = false;
        if (elements.authElements.confirmLoginButton.querySelector(".button_label")) {
          elements.authElements.confirmLoginButton.querySelector(".button_label").textContent = originalButtonText;
        }
      }
    });
  }

  if (elements.authElements.logoutButton) {
    elements.authElements.logoutButton.addEventListener("click", async () => {
      elements.authElements.logoutButton.disabled = true;

      try {
        const { error } = await api.signOut();
        if (error) {
          throw error;
        }

        await updateAuthStateUI(null, elements);
      } catch (error) {
        console.error("Logout error:", error);
      } finally {
        elements.authElements.logoutButton.disabled = false;
      }
    });
  }

  api
    .getCurrentSession()
    .then(async (session) => {
      await updateAuthStateUI(session?.user ?? null, elements);
    })
    .catch((error) => {
      console.error("Error getting initial session:", error);
      updateAuthStateUI(null, elements);
    });

  api.onAuthStateChange(async (user) => {
    await updateAuthStateUI(user, elements);
  });
}

export async function updateAuthStateUI(user, elements) {
  if (!elements.authElements.loginFormOnPage) return;

  const addUserButton = document.querySelector('[data-button-action="add-user"]');
  const tableRows = document.querySelectorAll(".table_row:not(.is-headline)");

  const dialog = elements.authElements.theDialog;

  if (user) {
    currentUserId = user.id;

    if (elements.authElements.initialLoginButton && elements.authElements.initialLoginButton.parentElement) {
      elements.authElements.initialLoginButton.parentElement.style.display = "none";
    }
    if (elements.authElements.logoutButton && elements.authElements.logoutButton.parentElement) {
      elements.authElements.logoutButton.parentElement.style.display = "";
    }

    if (elements.authElements.logoutButtonLabel) {
      try {
        const profile = await api.getUserProfile(user.id);

        currentUserIsAdmin = profile?.is_admin || false;
        currentUserCanEdit = profile?.can_edit || false;

        if (currentUserIsAdmin) {
          currentUserCanEdit = true;
        }

        elements.authElements.logoutButtonLabel.textContent = profile?.username || user.email.split("@")[0];
      } catch (error) {
        elements.authElements.logoutButtonLabel.textContent = user.email.split("@")[0];

        currentUserIsAdmin = false;
        currentUserCanEdit = false;
      }
    }

    if (addUserButton) addUserButton.style.display = "";

    updateTableRowStyles(elements);
  } else {
    currentUserId = null;
    currentUserIsAdmin = false;
    currentUserCanEdit = false;

    if (elements.authElements.initialLoginButton && elements.authElements.initialLoginButton.parentElement) {
      elements.authElements.initialLoginButton.parentElement.style.display = "";
    }
    if (elements.authElements.logoutButton && elements.authElements.logoutButton.parentElement) {
      elements.authElements.logoutButton.parentElement.style.display = "none";
    }

    if (addUserButton) addUserButton.style.display = "none";

    updateTableRowStyles(elements);

    if (dialog && dialog.open) {
      dialog.close();
    }
  }
}

export function updateTableRowStyles(elements, editingUserId = null) {
  const tableRows = document.querySelectorAll(".table_row:not(.is-headline)");

  tableRows.forEach((row) => {
    const rowUserId = row.dataset.userId;
    const createdBy = row.dataset.createdBy;
    let allowEdit = false;
    let isBeingEdited = editingUserId && rowUserId === editingUserId;

    if (!currentUserId) {
      allowEdit = false;
    } else {
      if (currentUserIsAdmin) {
        allowEdit = true;
      } else if (currentUserCanEdit && createdBy && createdBy === currentUserId) {
        allowEdit = true;
      } else {
        allowEdit = false;
      }
    }

    row.style.opacity = "1";
    row.style.cursor = "default";
    row.style.pointerEvents = "auto";
    row.classList.remove("is-editing");

    if (isBeingEdited) {
      row.style.opacity = "1"; // Ensure it's fully visible
      row.style.cursor = "pointer";
      row.classList.add("is-editing");
      row.style.pointerEvents = "auto"; // Make sure it's clickable
    } else if (!allowEdit && currentUserId) {
      row.style.opacity = "0.25";
      row.style.cursor = "default";
      row.style.pointerEvents = "none";
    } else if (!currentUserId) {
      row.style.opacity = "1";
      row.style.cursor = "default";
      row.style.pointerEvents = "none";
    } else {
      row.style.opacity = "1";
      row.style.cursor = "pointer";
      row.style.pointerEvents = "auto";
    }
  });
}
