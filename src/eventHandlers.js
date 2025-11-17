// Event handlers for mouse and keyboard interactions
import { state } from "./state.js";
import { updateOverlay } from "./inspector.js";
import { isOurElement, showContextMenu, hideContextMenu, clearOverlay } from "./ui.js";
import { syncMenuState } from "./stateManager.js";

export function initEvents() {
  // Mouseover
  document.addEventListener(
    "mouseover",
    (event) => {
      if (!state.inspectorEnabled || state.isLocked) return;
      const target = event.target;
      if (isOurElement(target)) return;
      if (target === state.lastElement) return;
      state.lastElement = target;
      updateOverlay(target);
    },
    true
  );

  // Mouseout
  document.addEventListener(
    "mouseout",
    (event) => {
      if (!state.inspectorEnabled || state.isLocked) return;
      if (event.target === state.lastElement) {
        state.lastElement = null;
        clearOverlay();
      }
    },
    true
  );

  // Click
  document.addEventListener(
    "click",
    (event) => {
      if (!state.inspectorEnabled || state.isLocked) return;
      if (isOurElement(event.target)) return;
      event.stopPropagation();
      event.preventDefault();
      const target = event.target;
      state.lastElement = target;
      updateOverlay(target);
    },
    true
  );

  // Right-click (contextmenu)
  document.addEventListener(
    "contextmenu",
    (event) => {
      if (!state.inspectorEnabled) return;
      if (isOurElement(event.target)) return;

      event.preventDefault();
      state.lastRightClickedElement = event.target;
      state.lastElement = event.target;
      updateOverlay(event.target);
      syncMenuState();
      showContextMenu(event.clientX, event.clientY);
    },
    true
  );

  // Mousedown to close context menu
  document.addEventListener("mousedown", (e) => {
    if (state.contextMenuEl && state.contextMenuEl.style.display === "block") {
      if (!state.contextMenuEl.contains(e.target)) {
        hideContextMenu();
      }
    }
  });

  // ESC key to close context menu
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideContextMenu();
    }
  });

  // Scroll and resize - update highlight if locked
  const updateLockedHighlight = () => {
    if (state.isLocked && state.lockedElement) {
      const rect = state.lockedElement.getBoundingClientRect();
      if (state.highlightBox) {
        state.highlightBox.style.top = `${rect.top + window.scrollY}px`;
        state.highlightBox.style.left = `${rect.left + window.scrollX}px`;
        state.highlightBox.style.width = `${rect.width}px`;
        state.highlightBox.style.height = `${rect.height}px`;
      }
    }
  };

  window.addEventListener("scroll", updateLockedHighlight, true);
  window.addEventListener("resize", updateLockedHighlight);
}

export function initMessaging() {
  if (!chrome || !chrome.runtime || !chrome.runtime.onMessage) return;

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "LAYERBITS_TOGGLE") {
      state.inspectorEnabled = !!message.enabled;
      if (state.panel) {
        state.panel.style.display = state.inspectorEnabled ? "flex" : "none";
      }
      if (!state.inspectorEnabled) {
        clearOverlay();
        hideContextMenu();
      }
    }
  });
}
