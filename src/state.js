// State management for Layerbits
export const state = {
  // DOM elements
  highlightBox: null,
  tooltip: null,
  panel: null,
  selectorTextEl: null,
  cssBlockEl: null,
  tailwindBlockEl: null,
  htmlBlockEl: null,
  jsxBlockEl: null,
  copyBtn: null,
  lockBtn: null,
  closeBtn: null,
  cssTabBtn: null,
  tailwindTabBtn: null,
  htmlTabBtn: null,
  jsxTabBtn: null,
  settingsBtn: null,
  settingsPanel: null,
  sizeRadioNodes: null,
  fontSizeRadioNodes: null,

  // Custom context menu
  contextMenuEl: null,
  lockCheckboxEl: null,
  colorModeRadioEls: null,

  // Element tracking
  lastElement: null,
  lastRightClickedElement: null,
  lockedElement: null,

  // Settings
  inspectorEnabled: true,
  isLocked: false,
  activeTab: "css",
  colorMode: "hex", // hex | rgb | rgba | hsl | hsla
  panelSize: "small", // small | medium | large
  fontSize: "small", // small | medium | large

  // Current output
  currentCssText: "{ /* hover an element */ }",
  currentTailwindText: "/* Hover an element to generate Tailwind */",
  currentHtmlText: "",
  currentJsxText: ""
};
