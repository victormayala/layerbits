// Main entry point for Layerbits content script
import { state } from "./state.js";
import { createOverlayElements } from "./domCreator.js";
import { initEvents, initMessaging } from "./eventHandlers.js";
import { applyInspectorState, applyPanelSizeClass, applyFontSizeClass } from "./ui.js";
import { syncMenuState } from "./stateManager.js";

function init() {
  createOverlayElements();
  initEvents();
  initMessaging();

  if (chrome && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(
      ["layerbitsEnabled", "layerbitsColorMode", "layerbitsPanelSize", "layerbitsFontSize"],
      (result) => {
        const enabled = result.layerbitsEnabled;
        state.inspectorEnabled = enabled === undefined ? true : !!enabled;

        const storedMode = result.layerbitsColorMode;
        if (storedMode && ["hex", "rgb", "rgba", "hsl", "hsla"].includes(storedMode)) {
          state.colorMode = storedMode;
        }

        const storedSize = result.layerbitsPanelSize;
        if (storedSize && ["small", "medium", "large"].includes(storedSize)) {
          state.panelSize = storedSize;
        }

        const storedFontSize = result.layerbitsFontSize;
        if (storedFontSize && ["small", "medium", "large"].includes(storedFontSize)) {
          state.fontSize = storedFontSize;
        }

        applyInspectorState();
        applyPanelSizeClass();
        applyFontSizeClass();
        syncMenuState();
      }
    );
  } else {
    state.inspectorEnabled = true;
    applyInspectorState();
    applyPanelSizeClass();
    applyFontSizeClass();
    syncMenuState();
  }
}

if (!window.__layerbits_initialized__) {
  window.__layerbits_initialized__ = true;
  init();
}
