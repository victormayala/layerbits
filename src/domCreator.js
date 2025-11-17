// Event handlers for DOM creation and initialization
import { state } from "./state.js";
import { setActiveTab, applyPanelSizeClass, applyFontSizeClass, updatePanelSize, updateFontSize, hideContextMenu, showContextMenu, isOurElement, applyInspectorState } from "./ui.js";
import { setLockedState, setColorMode, syncMenuState } from "./stateManager.js";

export function createOverlayElements() {
  // Highlight box
  if (!state.highlightBox) {
    state.highlightBox = document.createElement("div");
    state.highlightBox.id = "layerbits-highlight-box";
    document.documentElement.appendChild(state.highlightBox);
  }

  // Tooltip
  if (!state.tooltip) {
    state.tooltip = document.createElement("div");
    state.tooltip.id = "layerbits-tooltip";
    state.tooltip.textContent = "";
    document.documentElement.appendChild(state.tooltip);
  }

  // Panel
  if (!state.panel) {
    state.panel = document.createElement("div");
    state.panel.id = "layerbits-panel";
    state.panel.innerHTML = `
      <div id="layerbits-panel-header">
        <div style="flex: 1; min-width: 0;">
          <div id="layerbits-panel-title">Layerbits</div>
          <div id="layerbits-selector-text"></div>
        </div>
        <div id="layerbits-panel-actions">
          <button id="layerbits-copy-btn" type="button">Copy CSS</button>
          <button id="layerbits-lock-btn" type="button" title="Tip: right-click an element to lock it">Lock</button>
          <button id="layerbits-close-btn" type="button">✕</button>
        </div>
      </div>
      <div id="layerbits-panel-body">
        <div id="layerbits-tabs-row">
          <div id="layerbits-tabs">
            <button id="layerbits-tab-css" class="layerbits-tab-btn active" type="button">CSS</button>
            <button id="layerbits-tab-tailwind" class="layerbits-tab-btn" type="button">Tailwind</button>
            <button id="layerbits-tab-html" class="layerbits-tab-btn" type="button">HTML</button>
            <button id="layerbits-tab-jsx" class="layerbits-tab-btn" type="button">JSX</button>
          </div>
          <button id="layerbits-settings-btn" type="button" title="Panel settings">⚙</button>
        </div>
        <div id="layerbits-settings-panel">
          <div class="layerbits-settings-group">
            <div class="layerbits-settings-label">Panel size</div>
            <div class="layerbits-settings-options">
              <label><input type="radio" name="layerbits-panel-size" value="small" /> Small</label>
              <label><input type="radio" name="layerbits-panel-size" value="medium" /> Medium</label>
              <label><input type="radio" name="layerbits-panel-size" value="large" /> Large</label>
            </div>
          </div>
          <div class="layerbits-settings-group">
            <div class="layerbits-settings-label">Font size</div>
            <div class="layerbits-settings-options">
              <label><input type="radio" name="layerbits-font-size" value="small" /> Small</label>
              <label><input type="radio" name="layerbits-font-size" value="medium" /> Medium</label>
              <label><input type="radio" name="layerbits-font-size" value="large" /> Large</label>
            </div>
          </div>
        </div>
        <pre id="layerbits-css-block">{ /* hover an element */ }</pre>
        <pre id="layerbits-tailwind-block" style="display:none;">/* Hover an element to generate Tailwind */</pre>
        <pre id="layerbits-html-block" style="display:none;">&lt;!-- HTML snippet will appear here --&gt;</pre>
        <pre id="layerbits-jsx-block" style="display:none;">{/* JSX snippet will appear here */}</pre>
      </div>
    `;
    document.documentElement.appendChild(state.panel);

    // Query DOM elements
    state.selectorTextEl = state.panel.querySelector("#layerbits-selector-text");
    state.cssBlockEl = state.panel.querySelector("#layerbits-css-block");
    state.tailwindBlockEl = state.panel.querySelector("#layerbits-tailwind-block");
    state.htmlBlockEl = state.panel.querySelector("#layerbits-html-block");
    state.jsxBlockEl = state.panel.querySelector("#layerbits-jsx-block");
    state.copyBtn = state.panel.querySelector("#layerbits-copy-btn");
    state.lockBtn = state.panel.querySelector("#layerbits-lock-btn");
    state.closeBtn = state.panel.querySelector("#layerbits-close-btn");
    state.cssTabBtn = state.panel.querySelector("#layerbits-tab-css");
    state.tailwindTabBtn = state.panel.querySelector("#layerbits-tab-tailwind");
    state.htmlTabBtn = state.panel.querySelector("#layerbits-tab-html");
    state.jsxTabBtn = state.panel.querySelector("#layerbits-tab-jsx");
    state.settingsBtn = state.panel.querySelector("#layerbits-settings-btn");
    state.settingsPanel = state.panel.querySelector("#layerbits-settings-panel");
    state.sizeRadioNodes = state.panel.querySelectorAll('input[name="layerbits-panel-size"]');
    state.fontSizeRadioNodes = state.panel.querySelectorAll('input[name="layerbits-font-size"]');

    applyPanelSizeClass();
    applyFontSizeClass();
    state.sizeRadioNodes.forEach((node) => {
      node.checked = node.value === state.panelSize;
    });
    state.fontSizeRadioNodes.forEach((node) => {
      node.checked = node.value === state.fontSize;
    });

    // Copy button
    state.copyBtn.addEventListener("click", () => {
      let text = "";
      if (state.activeTab === "css") text = state.currentCssText;
      else if (state.activeTab === "tailwind") text = state.currentTailwindText;
      else if (state.activeTab === "html") text = state.currentHtmlText;
      else if (state.activeTab === "jsx") text = state.currentJsxText;

      if (!text || !text.trim()) return;

      navigator.clipboard
        .writeText(text)
        .then(() => {
          state.copyBtn.textContent = "Copied!";
          setTimeout(() => {
            state.copyBtn.textContent =
              state.activeTab === "css"
                ? "Copy CSS"
                : state.activeTab === "tailwind"
                ? "Copy Tailwind"
                : state.activeTab === "html"
                ? "Copy HTML"
                : "Copy JSX";
          }, 800);
        })
        .catch(() => {
          state.copyBtn.textContent = "Error";
          setTimeout(() => {
            state.copyBtn.textContent =
              state.activeTab === "css"
                ? "Copy CSS"
                : state.activeTab === "tailwind"
                ? "Copy Tailwind"
                : state.activeTab === "html"
                ? "Copy HTML"
                : state.activeTab === "jsx"
                ? "Copy JSX"
                : "Copy";
          }, 800);
        });
    });

    // Lock button
    state.lockBtn.addEventListener("click", () => {
      if (!state.isLocked) {
        setLockedState(true, state.lastElement);
      } else {
        setLockedState(false);
      }
    });

    // Close button
    state.closeBtn.addEventListener("click", () => {
      state.inspectorEnabled = false;
      applyInspectorState();
    });

    // Tabs
    state.cssTabBtn.addEventListener("click", () => setActiveTab("css"));
    state.tailwindTabBtn.addEventListener("click", () => setActiveTab("tailwind"));
    state.htmlTabBtn.addEventListener("click", () => setActiveTab("html"));
    state.jsxTabBtn.addEventListener("click", () => setActiveTab("jsx"));

    // Settings button
    state.settingsBtn.addEventListener("click", () => {
      const isVisible = state.settingsPanel.style.display === "block";
      state.settingsPanel.style.display = isVisible ? "none" : "block";
    });

    // Size radios
    state.sizeRadioNodes.forEach((node) => {
      node.addEventListener("change", (e) => {
        if (e.target.checked) {
          updatePanelSize(e.target.value);
        }
      });
    });

    // Font size radios
    state.fontSizeRadioNodes.forEach((node) => {
      node.addEventListener("change", (e) => {
        if (e.target.checked) {
          updateFontSize(e.target.value);
        }
      });
    });
  }

  // Context menu
  if (!state.contextMenuEl) {
    state.contextMenuEl = document.createElement("div");
    state.contextMenuEl.id = "layerbits-context-menu";
    state.contextMenuEl.innerHTML = `
      <div class="layerbits-menu-section">
        <label class="layerbits-menu-item" id="layerbits-menu-lock-item">
          <input type="checkbox" id="layerbits-menu-lock-checkbox" />
          <span>Lock element</span>
        </label>
      </div>
      <div class="layerbits-menu-separator"></div>
      <div class="layerbits-menu-label">Color values</div>
      <div class="layerbits-menu-section layerbits-menu-color-group">
        <label class="layerbits-menu-item">
          <input type="radio" name="layerbits-color-mode" value="hex" />
          <span>HEX</span>
        </label>
        <label class="layerbits-menu-item">
          <input type="radio" name="layerbits-color-mode" value="rgb" />
          <span>RGB</span>
        </label>
        <label class="layerbits-menu-item">
          <input type="radio" name="layerbits-color-mode" value="rgba" />
          <span>RGBA</span>
        </label>
        <label class="layerbits-menu-item">
          <input type="radio" name="layerbits-color-mode" value="hsl" />
          <span>HSL</span>
        </label>
        <label class="layerbits-menu-item">
          <input type="radio" name="layerbits-color-mode" value="hsla" />
          <span>HSLA</span>
        </label>
      </div>
    `;
    document.documentElement.appendChild(state.contextMenuEl);

    state.lockCheckboxEl = state.contextMenuEl.querySelector("#layerbits-menu-lock-checkbox");
    state.colorModeRadioEls = state.contextMenuEl.querySelectorAll('input[name="layerbits-color-mode"]');

    // Keep clicks inside from closing the menu
    state.contextMenuEl.addEventListener("mousedown", (e) => e.stopPropagation());
    state.contextMenuEl.addEventListener("click", (e) => e.stopPropagation());
    state.contextMenuEl.addEventListener("contextmenu", (e) => e.stopPropagation());

    if (state.lockCheckboxEl) {
      state.lockCheckboxEl.addEventListener("change", (e) => {
        const checked = e.target.checked;
        if (checked) {
          setLockedState(true, state.lastRightClickedElement || state.lastElement);
        } else {
          setLockedState(false);
        }
      });
    }

    if (state.colorModeRadioEls && state.colorModeRadioEls.length) {
      state.colorModeRadioEls.forEach((radio) => {
        radio.addEventListener("change", (e) => {
          if (e.target.checked) {
            setColorMode(e.target.value);
          }
        });
      });
    }
  }
}
