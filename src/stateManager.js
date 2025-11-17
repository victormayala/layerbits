// State management functions
import { state } from "./state.js";
import { updateOverlay } from "./inspector.js";

export function syncMenuState() {
  if (state.lockCheckboxEl) {
    state.lockCheckboxEl.checked = state.isLocked;
  }
  if (state.colorModeRadioEls && state.colorModeRadioEls.length) {
    state.colorModeRadioEls.forEach((radio) => {
      radio.checked = radio.value === state.colorMode;
    });
  }
}

export function setColorMode(newMode) {
  if (!["hex", "rgb", "rgba", "hsl", "hsla"].includes(newMode)) return;
  state.colorMode = newMode;
  if (chrome && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.set({ layerbitsColorMode: state.colorMode });
  }
  syncMenuState();
  rerenderCurrentTarget();
}

export function setLockedState(locked, targetFallback = null) {
  if (!locked) {
    state.isLocked = false;
    state.lockedElement = null;
    if (state.lockBtn) {
      state.lockBtn.classList.remove("locked");
      state.lockBtn.textContent = "Lock";
    }
    syncMenuState();
    return;
  }

  const target =
    state.lockedElement || targetFallback || state.lastElement || state.lastRightClickedElement;
  if (!target) {
    state.isLocked = false;
    state.lockedElement = null;
    if (state.lockBtn) {
      state.lockBtn.classList.remove("locked");
      state.lockBtn.textContent = "Lock";
    }
    syncMenuState();
    return;
  }

  state.lockedElement = target;
  state.isLocked = true;
  if (state.lockBtn) {
    state.lockBtn.classList.add("locked");
    state.lockBtn.textContent = "Locked";
  }
  syncMenuState();
  updateOverlay(state.lockedElement);
}

export function rerenderCurrentTarget() {
  const target = state.lockedElement || state.lastElement;
  if (target) {
    updateOverlay(target);
  }
}
