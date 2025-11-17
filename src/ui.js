// UI creation and management
import { state } from "./state.js";

export function applyPanelSizeClass() {
  if (!state.panel) return;
  state.panel.classList.remove("size-small", "size-medium", "size-large");
  const cls =
    state.panelSize === "medium"
      ? "size-medium"
      : state.panelSize === "large"
      ? "size-large"
      : "size-small";
  state.panel.classList.add(cls);
}

export function updatePanelSize(newSize) {
  if (!["small", "medium", "large"].includes(newSize)) return;
  state.panelSize = newSize;
  applyPanelSizeClass();
  if (chrome && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.set({ layerbitsPanelSize: state.panelSize });
  }
}

export function applyFontSizeClass() {
  if (!state.panel) return;
  state.panel.classList.remove("font-small", "font-medium", "font-large");
  const cls =
    state.fontSize === "medium"
      ? "font-medium"
      : state.fontSize === "large"
      ? "font-large"
      : "font-small";
  state.panel.classList.add(cls);
}

export function updateFontSize(newSize) {
  if (!["small", "medium", "large"].includes(newSize)) return;
  state.fontSize = newSize;
  applyFontSizeClass();
  if (chrome && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.set({ layerbitsFontSize: state.fontSize });
  }
}

export function setActiveTab(tab) {
  if (!["css", "tailwind", "html", "jsx"].includes(tab)) return;
  state.activeTab = tab;

  [state.cssTabBtn, state.tailwindTabBtn, state.htmlTabBtn, state.jsxTabBtn].forEach((btn) => {
    if (btn) btn.classList.remove("active");
  });
  [state.cssBlockEl, state.tailwindBlockEl, state.htmlBlockEl, state.jsxBlockEl].forEach((block) => {
    if (block) block.style.display = "none";
  });

  if (tab === "css") {
    state.cssTabBtn?.classList.add("active");
    if (state.cssBlockEl) state.cssBlockEl.style.display = "block";
  } else if (tab === "tailwind") {
    state.tailwindTabBtn?.classList.add("active");
    if (state.tailwindBlockEl) state.tailwindBlockEl.style.display = "block";
  } else if (tab === "html") {
    state.htmlTabBtn?.classList.add("active");
    if (state.htmlBlockEl) state.htmlBlockEl.style.display = "block";
  } else if (tab === "jsx") {
    state.jsxTabBtn?.classList.add("active");
    if (state.jsxBlockEl) state.jsxBlockEl.style.display = "block";
  }
}

export function isOurElement(el) {
  if (!el) return false;
  if (el.id && el.id.startsWith("layerbits-")) return true;
  if (el.closest && el.closest("#layerbits-panel, #layerbits-highlight-box, #layerbits-tooltip, #layerbits-context-menu")) {
    return true;
  }
  return false;
}

export function applyInspectorState() {
  if (!state.panel) return;
  state.panel.style.display = state.inspectorEnabled ? "flex" : "none";
  if (!state.inspectorEnabled) clearOverlay();
}

export function clearOverlay() {
  if (state.highlightBox) state.highlightBox.style.display = "none";
  if (state.tooltip) state.tooltip.style.display = "none";
}

export function showContextMenu(x, y) {
  if (!state.contextMenuEl) return;
  state.contextMenuEl.style.display = "block";
  state.contextMenuEl.style.left = `${x}px`;
  state.contextMenuEl.style.top = `${y}px`;
}

export function hideContextMenu() {
  if (!state.contextMenuEl) return;
  state.contextMenuEl.style.display = "none";
}
