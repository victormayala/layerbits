// Layerbits Content Script - Bundled version
// This bundles all modules since Chrome extensions don't support ES6 modules in content scripts

(() => {
  // ==================== STATE ====================
  const state = {
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
    contextMenuEl: null,
    lockCheckboxEl: null,
    colorModeRadioEls: null,
    sizeModeRadioEls: null,
    flexOverlayEl: null,
    gridOverlayEl: null,
    lastElement: null,
    lastRightClickedElement: null,
    lockedElement: null,
    inspectorEnabled: false,
    isLocked: false,
    activeTab: "css",
    colorMode: "hex",
    sizeMode: "px",
    panelSize: "small",
    fontSize: "small",
    currentCssText: "{ /* hover an element */ }",
    currentTailwindText: "/* Hover an element to generate Tailwind */",
    currentHtmlText: "",
    currentJsxText: "",
    contextMenuOpen: false,
    showFlexboxGridActive: false,
    showCssGridActive: false,
    measureActive: false,
    measureBtn: null,
    measureOverlay: null,
    measurePointA: null,
    measurePointB: null,
    eyedropperActive: false,
    eyedropperBtn: null,
    eyedropperCanvas: null,
    eyedropperCtx: null,
    eyedropperTooltip: null,
    eyedropperScrollHandler: null,
    measureLine: null,
    measureLabel: null,
    panelDragOffset: { x: 0, y: 0 },
    isDragging: false,
    activeState: "",
    stateSelector: null,
    editedElement: null,
    originalStyles: new Map(),
    accessibilityTabBtn: null,
    accessibilityBlockEl: null,
    accessibilityIssues: []
  };

  // ==================== COLOR UTILS ====================
  function parseColor(str) {
    if (!str || str === "none" || str === "transparent") return null;

    const hexMatch = str.match(/^#([0-9a-fA-F]{3,8})$/);
    if (hexMatch) {
      let hex = hexMatch[1];
      if (hex.length === 3) {
        hex = hex.split("").map((c) => c + c).join("");
      }
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return { r, g, b, a: 1 };
      }
      if (hex.length === 8) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        const a = parseInt(hex.slice(6, 8), 16) / 255;
        return { r, g, b, a };
      }
    }

    const rgbMatch = str.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1], 10);
      const g = parseInt(rgbMatch[2], 10);
      const b = parseInt(rgbMatch[3], 10);
      const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1;
      return { r, g, b, a };
    }

    const hslMatch = str.match(/hsla?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+))?\s*\)/);
    if (hslMatch) {
      let h = parseFloat(hslMatch[1]) / 360;
      let s = parseFloat(hslMatch[2]) / 100;
      let l = parseFloat(hslMatch[3]) / 100;
      const alpha = hslMatch[4] ? parseFloat(hslMatch[4]) : 1;

      let r, g, b;
      if (s === 0) {
        r = g = b = l;
      } else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
      }
      return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
        a: alpha
      };
    }

    return null;
  }

  function rgbaToHex({ r, g, b, a }) {
    const toHex = (n) => {
      const hex = Math.round(n).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    const hexColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    if (a < 1) {
      return hexColor + toHex(a * 255);
    }
    return hexColor;
  }

  function rgbaToRgbString({ r, g, b }) {
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  }

  function rgbaToRgbaString({ r, g, b, a }) {
    const alpha = Math.round(a * 100) / 100;
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
  }

  function rgbaToHsl({ r, g, b, a }) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return { h, s, l, a };
  }

  function hslToString({ h, s, l }) {
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  function hslaToString({ h, s, l, a }) {
    const alpha = Math.round(a * 100) / 100;
    return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
  }

  function convertSingleColor(value, mode) {
    const rgba = parseColor(value);
    if (!rgba) return value;

    if (mode === "hex") return rgbaToHex(rgba);
    if (mode === "rgb") return rgbaToRgbString(rgba);
    if (mode === "rgba") return rgbaToRgbaString(rgba);
    const hsl = rgbaToHsl(rgba);
    if (mode === "hsl") return hslToString(hsl);
    if (mode === "hsla") return hslaToString(hsl);
    return value;
  }

  function convertColorsInString(str, mode) {
    return str.replace(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)/gi, (match) => convertSingleColor(match, mode));
  }

  // ==================== SIZE CONVERSION UTILS ====================
  function pxToUnit(px, mode, target) {
    const n = typeof px === "number" ? px : parseFloat(px);
    if (!isFinite(n)) return null;
    if (mode === "px") return `${n}px`;
    if (mode === "pt") return `${+(n * 72 / 96).toFixed(3)}pt`;
    if (mode === "pc") return `${+(n / 16).toFixed(3)}pc`;
    if (mode === "rem") {
      const root = getComputedStyle(document.documentElement).fontSize;
      const rootPx = parseFloat(root) || 16;
      return `${+(n / rootPx).toFixed(4)}rem`;
    }
    if (mode === "em") {
      let basePx = 16;
      try {
        const fs = (target ? getComputedStyle(target) : getComputedStyle(document.documentElement)).fontSize;
        basePx = parseFloat(fs) || 16;
      } catch (_) {}
      return `${+(n / basePx).toFixed(4)}em`;
    }
    return `${n}px`;
  }

  function convertSizesInString(str, mode, target) {
    if (!str || mode === "px") return str;
    return str.replace(/(-?\d*\.?\d+)px\b/g, (_m, num) => pxToUnit(parseFloat(num), mode, target));
  }

  // ==================== CSS EXTRACTOR ====================
  function getSelectorForElement(target) {
    if (!target) return "";
    if (target.id) return `#${target.id}`;
    if (target.className && typeof target.className === "string") {
      return `.${target.className.split(" ")[0]}`;
    }
    return target.tagName ? target.tagName.toLowerCase() : "";
  }

  function elementMatchesSelector(element, selector) {
    // Remove the pseudo-class from the selector to check base matching
    const baseSelector = selector.replace(/:(hover|active|focus|focus-visible|focus-within)/g, '').trim();
    if (!baseSelector) return false;
    
    try {
      // Try using matches if the selector is simple enough
      if (element.matches && baseSelector.length < 100) {
        return element.matches(baseSelector);
      }
      
      // Fallback: try querySelector on parent
      if (element.parentElement) {
        const matches = element.parentElement.querySelector(baseSelector);
        return matches === element;
      }
      
      // Last resort: simple string matching
      const tagName = element.tagName.toLowerCase();
      if (baseSelector === tagName || baseSelector === '*') return true;
      if (element.id && baseSelector === `#${element.id}`) return true;
      if (element.className) {
        const classes = element.className.split(' ').filter(Boolean);
        const selectorClasses = baseSelector.split('.').filter(Boolean);
        if (selectorClasses.length > 0 && selectorClasses.every(cls => classes.includes(cls))) {
          return true;
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  function getStylesForPseudoState(target, pseudoState) {
    // Get base computed styles
    const baseComputed = window.getComputedStyle(target);
    const pseudoStyles = new Map();
    
    // Optimize: Try using getComputedStyle with pseudo-class directly first (much faster)
    // This works for pseudo-classes that the browser can compute
    try {
      const pseudoComputed = window.getComputedStyle(target, pseudoState);
      const props = [
        "display", "position", "flex-direction", "justify-content", "align-items", "gap",
        "grid-template-columns", "grid-template-rows", "width", "height", "max-width", "max-height",
        "padding", "margin", "color", "background-color", "font-family", "font-size", "font-weight",
        "line-height", "text-align", "text-transform", "border", "border-radius", "box-shadow", "opacity"
      ];
      
      // Compare base vs pseudo to find differences (indicates pseudo-class has styles)
      for (const prop of props) {
        const baseValue = baseComputed.getPropertyValue(prop);
        const pseudoValue = pseudoComputed.getPropertyValue(prop);
        // If values differ, the pseudo-class has a style for this property
        if (pseudoValue && pseudoValue !== baseValue && pseudoValue !== "none" && pseudoValue !== "normal" && pseudoValue !== "0px") {
          pseudoStyles.set(prop, pseudoValue);
        }
      }
      
      // If we found differences, use them (fast path)
      if (pseudoStyles.size > 0) {
        // Continue to merge logic below
      } else {
        // Fallback to stylesheet parsing if getComputedStyle didn't work
        const stylesheets = Array.from(document.styleSheets);
        for (const sheet of stylesheets) {
          try {
            const rules = sheet.cssRules || sheet.rules;
            if (!rules) continue;
            
            for (const rule of rules) {
              if (rule.type !== CSSRule.STYLE_RULE) continue;
              
              const selectorText = rule.selectorText;
              if (!selectorText) continue;
              
              const selectors = selectorText.split(',').map(s => s.trim());
              for (const selector of selectors) {
                if (selector.includes(pseudoState)) {
                  if (elementMatchesSelector(target, selector)) {
                    for (let i = 0; i < rule.style.length; i++) {
                      const prop = rule.style[i];
                      let value = rule.style.getPropertyValue(prop);
                      if (value && value.includes('var(')) {
                        value = resolveCSSVariable(target, value, prop);
                      }
                      if (value) {
                        pseudoStyles.set(prop, value);
                      }
                    }
                  }
                }
              }
            }
          } catch (e) {
            continue;
          }
        }
      }
    } catch (e) {
      // Fallback: parse stylesheets if getComputedStyle with pseudo-class fails
      const stylesheets = Array.from(document.styleSheets);
      for (const sheet of stylesheets) {
        try {
          const rules = sheet.cssRules || sheet.rules;
          if (!rules) continue;
          
          for (const rule of rules) {
            if (rule.type !== CSSRule.STYLE_RULE) continue;
            
            const selectorText = rule.selectorText;
            if (!selectorText) continue;
            
            const selectors = selectorText.split(',').map(s => s.trim());
            for (const selector of selectors) {
              if (selector.includes(pseudoState)) {
                if (elementMatchesSelector(target, selector)) {
                  for (let i = 0; i < rule.style.length; i++) {
                    const prop = rule.style[i];
                    let value = rule.style.getPropertyValue(prop);
                    if (value && value.includes('var(')) {
                      value = resolveCSSVariable(target, value, prop);
                    }
                    if (value) {
                      pseudoStyles.set(prop, value);
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    // Merge pseudo-class styles with base styles
    // Show all properties, using pseudo-class value if available, otherwise base value
    const mergedStyles = new Map();
    const props = [
      "display", "position", "flex-direction", "justify-content", "align-items", "gap",
      "grid-template-columns", "grid-template-rows", "width", "height", "max-width", "max-height",
      "padding", "margin", "color", "background-color", "font-family", "font-size", "font-weight",
      "line-height", "text-align", "text-transform", "border", "border-radius", "box-shadow", "opacity"
    ];
    
    for (const prop of props) {
      // Use pseudo-class style if available, otherwise use base style
      let value = pseudoStyles.has(prop) ? pseudoStyles.get(prop) : baseComputed.getPropertyValue(prop);
      // Resolve CSS variables (getComputedStyle should already resolve, but check for edge cases)
      if (value && value.includes('var(')) {
        value = resolveCSSVariable(target, value, prop);
      }
      if (value && value !== "none" && value !== "normal" && value !== "0px") {
        mergedStyles.set(prop, value);
      }
    }
    
    return mergedStyles;
  }

  function resolveCSSVariable(element, value, propertyName = null) {
    // Check if the value is a CSS variable
    if (!value || !value.includes('var(')) {
      return value;
    }
    
    // If we have a property name, get the computed value directly (which already resolves variables)
    if (propertyName) {
      const computed = window.getComputedStyle(element);
      const computedValue = computed.getPropertyValue(propertyName).trim();
      // If the computed value is different and doesn't contain var(), use it
      if (computedValue && computedValue !== value && !computedValue.includes('var(')) {
        return computedValue;
      }
    }
    
    // Extract variable name and resolve it
    const varMatch = value.match(/var\(([^,)]+)(?:,\s*([^)]+))?\)/);
    if (!varMatch) return value;
    
    const varName = varMatch[1].trim();
    const fallback = varMatch[2] ? varMatch[2].trim() : null;
    
    // Get computed style to resolve the variable
    const computed = window.getComputedStyle(element);
    const resolved = computed.getPropertyValue(varName).trim();
    
    // If variable is resolved, use it; otherwise use fallback or original value
    if (resolved) {
      // Recursively resolve nested variables
      if (resolved.includes('var(')) {
        return resolveCSSVariable(element, resolved, propertyName);
      }
      return resolved;
    }
    
    return fallback || value;
  }

  function getCleanCSS(target, pseudoState = null) {
    if (!target) return "{ /* no element selected */ }";
    
    // Normalize empty string to null
    if (pseudoState === "") {
      pseudoState = null;
    }
    
    let styles;
    if (pseudoState) {
      // Get styles for pseudo-class state
      styles = getStylesForPseudoState(target, pseudoState);
    } else {
      // Get normal computed styles
      const computed = window.getComputedStyle(target);
      styles = new Map();
    const props = [
      "display", "position", "flex-direction", "justify-content", "align-items", "gap",
      "grid-template-columns", "grid-template-rows", "width", "height", "max-width", "max-height",
      "padding", "margin", "color", "background-color", "font-family", "font-size", "font-weight",
      "line-height", "text-align", "text-transform", "border", "border-radius", "box-shadow", "opacity"
    ];

    for (const prop of props) {
        let val = computed.getPropertyValue(prop);
        // getComputedStyle already resolves CSS variables, but check if we got a var() string
        // (this can happen if the variable is invalid or not defined)
        if (val && val.includes('var(')) {
          val = resolveCSSVariable(target, val, prop);
        }
        if (val && val !== "none" && val !== "normal" && val !== "0px") {
          styles.set(prop, val);
        }
      }
    }

    const lines = [];
    for (const [prop, val] of styles) {
      // Resolve CSS variables in the value (though getComputedStyle should have already done this)
      let resolvedVal = val;
      if (val && val.includes('var(')) {
        resolvedVal = resolveCSSVariable(target, val, prop);
      }
      lines.push(`  ${prop}: ${resolvedVal};`);
    }

    const cssText = `{\n${lines.join("\n")}\n}`;
    
    // If pseudo-state is active, wrap it in a selector with that state
    if (pseudoState && lines.length > 0) {
      const selector = getSelectorForElement(target);
      return `${selector}${pseudoState} ${cssText}`;
    }
    
    return cssText;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderCssWithColorSwatches(text) {
    if (!text || text.trim() === '') return escapeHtml(text);
    
    let result = escapeHtml(text);
    
    // First, mark color swatches with a placeholder to avoid double-processing
    const colorPlaceholders = [];
    const colorRegex = /#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)/gi;
    result = result.replace(colorRegex, (color, offset) => {
      const placeholder = `__COLOR_${colorPlaceholders.length}__`;
      colorPlaceholders.push({
        placeholder,
        color: `<span class="layerbits-code-color"><span class="layerbits-color-swatch" style="background:${color}"></span><span class="layerbits-color-text">${escapeHtml(color)}</span></span>`
      });
      return placeholder;
    });
    
    // Highlight CSS selectors (if present)
    result = result.replace(/([^{}\s]+)(\s*\{)/g, (match, selector, brace) => {
      if (selector.includes('__COLOR_')) return match;
      return `<span class="layerbits-css-selector">${selector}</span>${brace}`;
    });
    
    // Highlight CSS properties (attributes) and values
    // Match: property-name: value;
    result = result.replace(/(\s+)([a-z-]+)(\s*:\s*)([^;]+)(;)/gi, (match, indent, prop, colon, value, semicolon) => {
      // Don't highlight if the property name itself is a placeholder (shouldn't happen, but safety check)
      if (prop.includes('__COLOR_')) return match;
      // Keep the placeholder in the value - we'll replace it later while preserving the wrapper
      const cleanValue = value.trim();
      return `${indent}<span class="layerbits-css-attr">${prop}</span>${colon} <span class="layerbits-css-value">${cleanValue}</span>${semicolon}`;
    });
    
    // Highlight braces
    result = result.replace(/(\{|\})/g, '<span class="layerbits-css-brace">$1</span>');
    
    // Restore color placeholders - but preserve the layerbits-css-value wrapper
    colorPlaceholders.forEach(({ placeholder, color }) => {
      // First, try to replace placeholders that are inside layerbits-css-value spans
      // This handles cases where the placeholder is the entire value or part of it
      const valueSpanRegex = new RegExp(`(<span class="layerbits-css-value">[^<]*?)${placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^<]*?</span>)`, 'g');
      result = result.replace(valueSpanRegex, `$1${color}$2`);
      
      // Then replace any remaining standalone placeholders (not in value spans)
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), color);
    });
    
    return result;
  }

  function renderTailwindWithColorSwatches(text) {
    const regex = /\[([^\]]+)\]/g;
    let result = escapeHtml(text);
    result = result.replace(regex, (match, color) => {
      if (color.startsWith("#") || color.startsWith("rgb") || color.startsWith("hsl")) {
        return `[<span class="layerbits-code-color"><span class="layerbits-color-swatch" style="background:${color}"></span><span class="layerbits-color-text">${escapeHtml(color)}</span></span>]`;
      }
      return escapeHtml(match);
    });
    
    // Highlight Tailwind classes (attributes) and values in brackets
    result = result.replace(/([a-z-]+)(\[)([^\]]+)(\])/gi, (match, className, openBracket, value, closeBracket) => {
      if (match.includes('layerbits-code-color')) return match;
      return `<span class="layerbits-css-attr">${className}</span>${openBracket}<span class="layerbits-css-value">${value}</span>${closeBracket}`;
    });
    
    return result;
  }
  
  function renderHtmlWithSyntaxHighlight(html) {
    if (!html || html.trim() === '' || html.startsWith('<!--')) {
      return escapeHtml(html);
    }
    
    // Limit processing to prevent browser crashes (100KB max for syntax highlighting)
    const MAX_HIGHLIGHT_SIZE = 100 * 1024; // 100KB
    const shouldTruncate = html.length > MAX_HIGHLIGHT_SIZE;
    const htmlToProcess = shouldTruncate ? html.substring(0, MAX_HIGHLIGHT_SIZE) : html;
    
    // Use requestIdleCallback or setTimeout to avoid blocking the main thread for large HTML
    let result = escapeHtml(htmlToProcess);
    
    // For very large HTML, use simpler highlighting to avoid performance issues
    if (shouldTruncate) {
      // Simple highlighting for truncated content
      result = result.replace(/(&lt;)(\/?)([a-z][a-z0-9]*)/gi, (match, open, slash, tagName) => {
        return `${open}${slash}<span class="layerbits-html-tag">${tagName}</span>`;
      });
      result = result.replace(/(&lt;|&gt;)/g, '<span class="layerbits-html-bracket">$1</span>');
      result += `\n<!-- Syntax highlighting simplified due to large HTML size (${(html.length / 1024).toFixed(1)}KB) -->`;
      return result;
    }
    
    // Full syntax highlighting for smaller HTML
    // First highlight tag names (before attributes to avoid conflicts)
    result = result.replace(/(&lt;)(\/?)([a-z][a-z0-9]*)/gi, (match, open, slash, tagName) => {
      return `${open}${slash}<span class="layerbits-html-tag">${tagName}</span>`;
    });
    
    // Highlight closing tag brackets
    result = result.replace(/(&lt;\/)([a-z][a-z0-9]*)(&gt;)/gi, (match, open, tagName, close) => {
      return `${open}<span class="layerbits-html-tag">${tagName}</span>${close}`;
    });
    
    // Highlight HTML attributes and values
    // Match: attribute="value" or attribute='value' or attribute=value (more robust)
    result = result.replace(/(\s+)([a-z-]+)(=)(["'])([^"']*)(["'])/gi, (match, space, attr, equals, quote1, value, quote2) => {
      return `${space}<span class="layerbits-html-attr">${attr}</span>${equals}${quote1}<span class="layerbits-html-value">${value}</span>${quote2}`;
    });
    
    // Handle unquoted attributes
    result = result.replace(/(\s+)([a-z-]+)(=)([^\s>]+)/gi, (match, space, attr, equals, value) => {
      // Skip if already processed or if it's part of a tag
      if (attr.includes('&lt;') || attr.includes('&gt;') || attr.includes('span')) return match;
      return `${space}<span class="layerbits-html-attr">${attr}</span>${equals}<span class="layerbits-html-value">${value}</span>`;
    });
    
    // Highlight brackets
    result = result.replace(/(&lt;|&gt;)/g, '<span class="layerbits-html-bracket">$1</span>');
    
    return result;
  }
  
  function renderJsxWithSyntaxHighlight(jsx) {
    if (!jsx || jsx.trim() === '' || jsx.startsWith('/*')) {
      return escapeHtml(jsx);
    }
    
    let result = escapeHtml(jsx);
    
    // First highlight JSX expressions {value} to avoid conflicts
    result = result.replace(/(\{)([^}]+)(\})/g, (match, open, value, close) => {
      return `${open}<span class="layerbits-jsx-expr">${value}</span>${close}`;
    });
    
    // Highlight tag names (both uppercase and lowercase for JSX)
    result = result.replace(/(&lt;)(\/?)([A-Z][a-zA-Z0-9]*)/gi, (match, open, slash, tagName) => {
      return `${open}${slash}<span class="layerbits-html-tag">${tagName}</span>`;
    });
    
    // Also handle lowercase tags
    result = result.replace(/(&lt;)(\/?)([a-z][a-z0-9]*)/gi, (match, open, slash, tagName) => {
      // Skip if already processed
      if (tagName.includes('span') || tagName.includes('&lt;')) return match;
      return `${open}${slash}<span class="layerbits-html-tag">${tagName}</span>`;
    });
    
    // Highlight JSX attributes and string values
    result = result.replace(/(\s+)([a-z][a-zA-Z]*)(=)(["'])([^"']*)(["'])/gi, (match, space, attr, equals, quote1, value, quote2) => {
      // Skip if already processed
      if (attr.includes('&lt;') || attr.includes('&gt;') || attr.includes('span')) return match;
      return `${space}<span class="layerbits-html-attr">${attr}</span>${equals}${quote1}<span class="layerbits-html-value">${value}</span>${quote2}`;
    });
    
    // Highlight JSX attribute with expression value: attr={...}
    result = result.replace(/(\s+)([a-z][a-zA-Z]*)(=)(\{)/gi, (match, space, attr, equals, openBrace) => {
      if (attr.includes('&lt;') || attr.includes('&gt;') || attr.includes('span')) return match;
      return `${space}<span class="layerbits-html-attr">${attr}</span>${equals}${openBrace}`;
    });
    
    // Highlight brackets
    result = result.replace(/(&lt;|&gt;)/g, '<span class="layerbits-html-bracket">$1</span>');
    
    // Highlight keywords (function, return, etc.)
    result = result.replace(/\b(function|return|const|let|var|if|else|for|while|class|extends|import|export)\b/g, '<span class="layerbits-jsx-keyword">$1</span>');
    
    return result;
  }

  // ==================== TAILWIND GENERATOR ====================
  function parsePx(value) {
    const match = value.match(/^([\d.]+)px$/);
    return match ? parseFloat(match[1]) : null;
  }

  function pxToTwUnit(value) {
    const px = parsePx(value);
    if (px === null) return null;
    const rem = px / 16;
    const unit = rem * 4;
    if (Number.isInteger(unit)) return unit;
    return null;
  }

  function mapFontWeight(weight) {
    const map = {
      "100": "font-thin", "200": "font-extralight", "300": "font-light", "400": "font-normal",
      "500": "font-medium", "600": "font-semibold", "700": "font-bold", "800": "font-extrabold", "900": "font-black"
    };
    return map[weight] || null;
  }

  function mapFontSize(value) {
    const map = {
      "12px": "text-xs", "14px": "text-sm", "16px": "text-base", "18px": "text-lg",
      "20px": "text-xl", "24px": "text-2xl", "30px": "text-3xl", "36px": "text-4xl",
      "48px": "text-5xl", "60px": "text-6xl", "72px": "text-7xl", "96px": "text-8xl", "128px": "text-9xl"
    };
    return map[value] || `text-[${value}]`;
  }

  function mapLineHeight(value) {
    const map = {
      "1": "leading-none", "1.25": "leading-tight", "1.375": "leading-snug",
      "1.5": "leading-normal", "1.625": "leading-relaxed", "2": "leading-loose"
    };
    const num = parseFloat(value);
    if (!isNaN(num)) {
      const closest = Object.keys(map).map(parseFloat)
        .reduce((prev, curr) => (Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev));
      return map[closest.toString()];
    }
    return `leading-[${value}]`;
  }

  function mapTextAlign(value) {
    const map = { left: "text-left", center: "text-center", right: "text-right", justify: "text-justify", start: "text-start", end: "text-end" };
    return map[value] || null;
  }

  function mapTextTransform(value) {
    const map = { uppercase: "uppercase", lowercase: "lowercase", capitalize: "capitalize", none: "normal-case" };
    return map[value] || null;
  }

  function mapDisplay(value) {
    const map = { block: "block", "inline-block": "inline-block", inline: "inline", flex: "flex", "inline-flex": "inline-flex", grid: "grid", "inline-grid": "inline-grid", hidden: "hidden", none: "hidden" };
    return map[value] || null;
  }

  function mapFlexDirection(value) {
    const map = { row: "flex-row", "row-reverse": "flex-row-reverse", column: "flex-col", "column-reverse": "flex-col-reverse" };
    return map[value] || null;
  }

  function mapJustifyContent(value) {
    const map = { "flex-start": "justify-start", "flex-end": "justify-end", center: "justify-center", "space-between": "justify-between", "space-around": "justify-around", "space-evenly": "justify-evenly" };
    return map[value] || null;
  }

  function mapAlignItems(value) {
    const map = { "flex-start": "items-start", "flex-end": "items-end", center: "items-center", baseline: "items-baseline", stretch: "items-stretch" };
    return map[value] || null;
  }

  function mapGap(rowGap, colGap) {
    const classes = [];
    if (rowGap && rowGap !== "0px") {
      const u = pxToTwUnit(rowGap);
      classes.push(u !== null ? `gap-y-${u}` : `gap-y-[${rowGap}]`);
    }
    if (colGap && colGap !== "0px") {
      const u = pxToTwUnit(colGap);
      classes.push(u !== null ? `gap-x-${u}` : `gap-x-[${colGap}]`);
    }
    return classes;
  }

  function mapSize(value, prefix) {
    if (!value || value === "auto") return null;
    const u = pxToTwUnit(value);
    return u !== null ? `${prefix}-${u}` : `${prefix}-[${value}]`;
  }

  function mapGridTemplate(template, prefix) {
    if (!template || template === "none") return null;
    const parts = template.split(" ");
    if (parts.length === 1) return `${prefix}-1`;
    return `${prefix}-${parts.length}`;
  }

  function mapColor(value, prefix) {
    if (!value || value === "rgba(0, 0, 0, 0)") return null;
    return `${prefix}-[${value}]`;
  }

  function mapBoxShadow(value) {
    if (!value || value === "none") return null;
    return "shadow";
  }

  function mapOpacity(value) {
    if (!value) return null;
    const num = parseFloat(value);
    if (isNaN(num)) return null;
    const percent = Math.round(num * 100);
    if (percent === 100) return null;
    return `opacity-${percent}`;
  }

  function getTailwindForElement(target) {
    if (!target) return "/* No element selected */";
    const computed = window.getComputedStyle(target);
    const classes = [];

    const display = computed.display;
    const mapped = mapDisplay(display);
    if (mapped) classes.push(mapped);

    if (display === "flex" || display === "inline-flex") {
      const fd = mapFlexDirection(computed.flexDirection);
      if (fd) classes.push(fd);
      const jc = mapJustifyContent(computed.justifyContent);
      if (jc) classes.push(jc);
      const ai = mapAlignItems(computed.alignItems);
      if (ai) classes.push(ai);
      const gaps = mapGap(computed.rowGap, computed.columnGap);
      classes.push(...gaps);
    }

    if (display === "grid" || display === "inline-grid") {
      const cols = mapGridTemplate(computed.gridTemplateColumns, "grid-cols");
      if (cols) classes.push(cols);
      const rows = mapGridTemplate(computed.gridTemplateRows, "grid-rows");
      if (rows) classes.push(rows);
      const gaps = mapGap(computed.rowGap, computed.columnGap);
      classes.push(...gaps);
    }

    const w = mapSize(computed.width, "w");
    if (w) classes.push(w);
    const h = mapSize(computed.height, "h");
    if (h) classes.push(h);
    const maxW = mapSize(computed.maxWidth, "max-w");
    if (maxW) classes.push(maxW);

    const p = computed.padding;
    if (p && p !== "0px") {
      const u = pxToTwUnit(p);
      classes.push(u !== null ? `p-${u}` : `p-[${p}]`);
    }

    const m = computed.margin;
    if (m && m !== "0px") {
      const u = pxToTwUnit(m);
      classes.push(u !== null ? `m-${u}` : `m-[${m}]`);
    }

    const color = convertSingleColor(computed.color, state.colorMode);
    const colorCls = mapColor(color, "text");
    if (colorCls) classes.push(colorCls);

    const bg = convertSingleColor(computed.backgroundColor, state.colorMode);
    const bgCls = mapColor(bg, "bg");
    if (bgCls) classes.push(bgCls);

    const fontSize = mapFontSize(computed.fontSize);
    if (fontSize) classes.push(fontSize);

    const fontWeight = mapFontWeight(computed.fontWeight);
    if (fontWeight) classes.push(fontWeight);

    const lineHeight = mapLineHeight(computed.lineHeight);
    if (lineHeight) classes.push(lineHeight);

    const textAlign = mapTextAlign(computed.textAlign);
    if (textAlign) classes.push(textAlign);

    const textTransform = mapTextTransform(computed.textTransform);
    if (textTransform) classes.push(textTransform);

    const br = computed.borderRadius;
    if (br && br !== "0px") {
      const u = pxToTwUnit(br);
      classes.push(u !== null ? `rounded-${u}` : `rounded-[${br}]`);
    }

    const shadow = mapBoxShadow(computed.boxShadow);
    if (shadow) classes.push(shadow);

    const opacity = mapOpacity(computed.opacity);
    if (opacity) classes.push(opacity);

    const out = classes.length > 0 ? classes.join(" ") : "/* No Tailwind classes generated */";
    // Apply size unit conversion to any bracketed px values (e.g., w-[123px])
    return convertSizesInString(out, state.sizeMode, target);
  }

  // ==================== HTML/JSX EXPORTER ====================
  function getHtmlSnippet(target) {
    if (!target) return "";
    try {
      // Quick check: if element has document or body as ancestor, it's likely too large
      // Skip this check for performance - we'll limit the HTML size instead
      
      const html = target.outerHTML;
      // Limit HTML size to prevent browser crashes (500KB max)
      const MAX_HTML_SIZE = 500 * 1024; // 500KB
      if (html.length > MAX_HTML_SIZE) {
        // Truncate and add a note
        const truncated = html.substring(0, MAX_HTML_SIZE);
        return truncated + `\n<!-- HTML truncated: original size was ${(html.length / 1024).toFixed(1)}KB. Please select a smaller element for full HTML. -->`;
      }
      return html;
    } catch (e) {
      console.warn("Error getting HTML snippet:", e);
      return "<!-- Error getting HTML -->";
    }
  }

  function htmlToJsx(html) {
    if (!html || !html.trim()) return "";

    let jsx = html;
    jsx = jsx.replace(/\sclass=/gi, " className=");
    jsx = jsx.replace(/\sfor=/gi, " htmlFor=");

    const voidElements = ["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"];
    voidElements.forEach((tag) => {
      const regex = new RegExp(`<${tag}([^>]*)(?<!/)>`, "gi");
      jsx = jsx.replace(regex, `<${tag}$1 />`);
    });

    return `function Component() {\n  return (\n    <>${jsx}</>\n  );\n}`;
  }

  // ==================== UI FUNCTIONS ====================
  function applyPanelSizeClass() {
    if (!state.panel) return;
    state.panel.classList.remove("size-small", "size-medium", "size-large");
    const cls = state.panelSize === "medium" ? "size-medium" : state.panelSize === "large" ? "size-large" : "size-small";
    state.panel.classList.add(cls);
  }

  function updatePanelSize(newSize) {
    if (!["small", "medium", "large"].includes(newSize)) return;
    state.panelSize = newSize;
    applyPanelSizeClass();
    if (chrome && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ layerbitsPanelSize: state.panelSize });
    }
  }

  function applyFontSizeClass() {
    if (!state.panel) return;
    state.panel.classList.remove("font-small", "font-medium", "font-large");
    const cls = state.fontSize === "medium" ? "font-medium" : state.fontSize === "large" ? "font-large" : "font-small";
    state.panel.classList.add(cls);
  }

  function updateFontSize(newSize) {
    if (!["small", "medium", "large"].includes(newSize)) return;
    state.fontSize = newSize;
    applyFontSizeClass();
    if (chrome && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ layerbitsFontSize: state.fontSize });
    }
  }

  function setActiveTab(tab) {
    if (!["css", "tailwind", "html", "jsx", "accessibility"].includes(tab)) return;
    state.activeTab = tab;

    [state.cssTabBtn, state.tailwindTabBtn, state.htmlTabBtn, state.jsxTabBtn, state.accessibilityTabBtn].forEach((btn) => {
      if (btn) btn.classList.remove("active");
    });
    [state.cssBlockEl, state.tailwindBlockEl, state.htmlBlockEl, state.jsxBlockEl, state.accessibilityBlockEl].forEach((block) => {
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
    } else if (tab === "accessibility") {
      state.accessibilityTabBtn?.classList.add("active");
      if (state.accessibilityBlockEl) state.accessibilityBlockEl.style.display = "block";
      // Run accessibility check when tab is opened
      runAccessibilityCheck();
    }
  }

  function isOurElement(el) {
    if (!el) return false;
    if (el.id && el.id.startsWith("layerbits-")) return true;
    if (el.closest && el.closest("#layerbits-panel, #layerbits-highlight-box, #layerbits-tooltip, #layerbits-context-menu, #layerbits-flex-overlay, #layerbits-grid-overlay")) {
      return true;
    }
    return false;
  }

  // ==================== EYEDROPPER ====================
  function getEffectiveColor(el) {
    if (!el) return null;
    const computed = getComputedStyle(el);
    const isTransparent = (val) => !val || val === 'transparent' || val === 'rgba(0, 0, 0, 0)' || /rgba?\(0,\s*0,\s*0,\s*0\)/.test(val);
    
    // Try to get the actual rendered color by creating a canvas and sampling
    // This is more accurate than just CSS computed styles
    try {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // Create a canvas to sample the actual rendered pixel
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        // Try to use html2canvas-like approach, but simpler:
        // We'll use the screenshot if available, otherwise fall back to CSS
        // For now, let's try to get colors from the element's visual properties
      }
    } catch (err) {
      // Fall through to CSS-based approach
    }
    
    // Try multiple color properties in order of preference
    const colorSources = [
      computed.backgroundColor,
      computed.borderTopColor,
      computed.borderLeftColor,
      computed.borderRightColor,
      computed.borderBottomColor,
      computed.color, // text color
      computed.outlineColor,
    ];
    
    for (const color of colorSources) {
      if (color && !isTransparent(color) && color !== 'rgb(255, 255, 255)') {
        return color;
      }
    }
    
    // Ascend parent chain to find background
    let cur = el.parentElement;
    let hops = 0;
    while (cur && hops < 15) {
      const parentComputed = getComputedStyle(cur);
      const parentBg = parentComputed.backgroundColor;
      if (parentBg && !isTransparent(parentBg) && parentBg !== 'rgb(255, 255, 255)') {
        return parentBg;
      }
      cur = cur.parentElement;
      hops++;
    }
    
    // Final fallback: body or document background
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    if (bodyBg && !isTransparent(bodyBg) && bodyBg !== 'rgb(255, 255, 255)') return bodyBg;
    
    const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
    if (htmlBg && !isTransparent(htmlBg) && htmlBg !== 'rgb(255, 255, 255)') return htmlBg;
    
    // Ultimate fallback: return null (don't return white)
    return null;
  }

  // ==================== BASIC EYEDROPPER ====================
  function activateEyedropper() {
    console.log("activateEyedropper called");
    
    if (state.measureActive) {
      deactivateMeasure();
    }
    
    state.eyedropperActive = true;
    if (state.eyedropperBtn) {
      state.eyedropperBtn.classList.add('active');
      console.log("Eyedropper button activated");
    } else {
      console.warn("Eyedropper button not found in activateEyedropper");
    }
    
    // Hide normal inspector elements
    if (state.highlightBox) state.highlightBox.style.display = 'none';
    if (state.tooltip) state.tooltip.style.display = 'none';
    
    // Create tooltip with color preview
    if (!state.eyedropperTooltip) {
      state.eyedropperTooltip = document.createElement("div");
      state.eyedropperTooltip.id = "layerbits-eyedropper-tooltip";
      state.eyedropperTooltip.style.cssText = `
        position: fixed;
        display: none;
        padding: 12px;
        background: rgba(15, 23, 42, 0.98);
        color: #e5e7eb;
        font-size: 12px;
        font-family: ui-monospace, monospace;
        border-radius: 8px;
        border: 2px solid rgba(1, 255, 219, 0.4);
        z-index: 10000000002;
        pointer-events: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        min-width: 180px;
        transition: opacity 0.15s ease, transform 0.1s ease-out;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      `;
      document.documentElement.appendChild(state.eyedropperTooltip);
    }
    state.eyedropperTooltip.style.display = 'block';
    
    // Show initial loading state in tooltip
    if (state.eyedropperTooltip) {
      state.eyedropperTooltip.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="width: 100%; height: 60px; background: #1f2937; border: 2px solid rgba(255,255,255,0.2); border-radius: 8px; flex-shrink: 0;"></div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 10px; color: #6b7280; min-width: 35px;">HEX</span>
              <span style="font-size: 12px; color: #9ca3af; font-family: ui-monospace, monospace;">--</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 10px; color: #6b7280; min-width: 35px;">RGB</span>
              <span style="font-size: 12px; color: #9ca3af; font-family: ui-monospace, monospace;">--</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 10px; color: #6b7280; min-width: 35px;">HSL</span>
              <span style="font-size: 12px; color: #9ca3af; font-family: ui-monospace, monospace;">--</span>
            </div>
          </div>
        </div>
      `;
      // Position tooltip initially (will be updated on mousemove)
      state.eyedropperTooltip.style.left = '20px';
      state.eyedropperTooltip.style.top = '20px';
    }
    
    // Capture screenshot and create canvas
    captureScreenshot();
    
    // Add event listeners (will be attached to document and canvas once it's created)
    state.eyedropperMoveHandler = handleEyedropperMove;
    state.eyedropperClickHandler = handleEyedropperClick;
    state.eyedropperKeydownHandler = handleEyedropperKeydown;
    
    // Handle scroll and resize to re-capture screenshot
    let scrollTimeout = null;
    state.eyedropperScrollHandler = () => {
      // Debounce scroll to avoid too many re-captures
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (state.eyedropperActive) {
          // Remove old canvas
          if (state.eyedropperCanvas) {
            state.eyedropperCanvas.remove();
            state.eyedropperCanvas = null;
            state.eyedropperCtx = null;
          }
          // Re-capture screenshot
          captureScreenshot();
        }
      }, 150);
    };
    
    // Listen to document mousemove for hover color detection
    document.addEventListener('mousemove', state.eyedropperMoveHandler, true);
    document.addEventListener('keydown', state.eyedropperKeydownHandler, true);
    window.addEventListener('scroll', state.eyedropperScrollHandler, true);
    window.addEventListener('resize', state.eyedropperScrollHandler, true);
    // Also listen to scroll on document and documentElement for better coverage
    document.addEventListener('scroll', state.eyedropperScrollHandler, true);
    document.documentElement.addEventListener('scroll', state.eyedropperScrollHandler, true);
    
    // Inject custom eyedropper cursor
    injectEyedropperCursor();
  }

  function deactivateEyedropper() {
    state.eyedropperActive = false;
    if (state.eyedropperBtn) state.eyedropperBtn.classList.remove('active');
    
    // Remove canvas
    if (state.eyedropperCanvas) {
      state.eyedropperCanvas.remove();
      state.eyedropperCanvas = null;
      state.eyedropperCtx = null;
    }
    
    // Hide tooltip
    if (state.eyedropperTooltip) {
      state.eyedropperTooltip.style.display = 'none';
    }
    
    // Remove event listeners
    if (state.eyedropperMoveHandler) {
      document.removeEventListener('mousemove', state.eyedropperMoveHandler, true);
      if (state.eyedropperCanvas) {
        state.eyedropperCanvas.removeEventListener('mousemove', state.eyedropperMoveHandler);
      }
    }
    if (state.eyedropperClickHandler) {
      if (state.eyedropperCanvas) {
        state.eyedropperCanvas.removeEventListener('click', state.eyedropperClickHandler);
      }
    }
    if (state.eyedropperKeydownHandler) {
      document.removeEventListener('keydown', state.eyedropperKeydownHandler, true);
    }
    if (state.eyedropperScrollHandler) {
      window.removeEventListener('scroll', state.eyedropperScrollHandler, true);
      window.removeEventListener('resize', state.eyedropperScrollHandler, true);
      document.removeEventListener('scroll', state.eyedropperScrollHandler, true);
      document.documentElement.removeEventListener('scroll', state.eyedropperScrollHandler, true);
    }
    
    state.eyedropperMoveHandler = null;
    state.eyedropperClickHandler = null;
    state.eyedropperKeydownHandler = null;
    state.eyedropperScrollHandler = null;
    
    // Restore normal cursor
    document.documentElement.style.cursor = '';
    document.documentElement.classList.remove('layerbits-eyedropper-active');
    // Remove custom cursor style
    const cursorStyle = document.getElementById('layerbits-eyedropper-cursor-style');
    if (cursorStyle) {
      cursorStyle.remove();
    }
    
    // Restore highlight if we had a last element
    if (state.lastElement) {
      updateOverlay(state.lastElement);
    }
  }

  function injectEyedropperCursor() {
    // Remove existing cursor style if any
    const existing = document.getElementById('layerbits-eyedropper-cursor-style');
    if (existing) {
      existing.remove();
    }
    
    // Create a 10x10px eyedropper cursor SVG
    const style = document.createElement('style');
    style.id = 'layerbits-eyedropper-cursor-style';
    
    // Create eyedropper SVG cursor (10x10px)
    const svg = `<svg width="10" height="10" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.71 5.63l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-3.12 3.12-1.23-1.21c-.39-.39-1.02-.38-1.41 0-.39.39-.39 1.02 0 1.41l.72.72-8.77 8.77c-.1.1-.15.22-.15.36v4.04c0 .28.22.5.5.5h4.04c.13 0 .26-.05.35-.15l8.77-8.77.72.72c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41l-1.22-1.22 3.12-3.12c.4-.4.4-1.03.01-1.42z" fill="white" stroke="black" stroke-width="0.5"/>
    </svg>`;
    
    const svgEncoded = encodeURIComponent(svg);
    const svgCursor = `data:image/svg+xml,${svgEncoded}`;
    
    style.textContent = `
      .layerbits-eyedropper-active,
      .layerbits-eyedropper-active *,
      #layerbits-eyedropper-canvas {
        cursor: url("${svgCursor}") 5 5, crosshair !important;
      }
    `;
    
    document.head.appendChild(style);
    document.documentElement.classList.add('layerbits-eyedropper-active');
  }
  
  function captureScreenshot() {
    console.log("captureScreenshot called");
    
    if (!chrome?.runtime?.sendMessage) {
      console.warn("Eyedropper: Chrome runtime not available");
      return;
    }
    
    console.log("Sending LAYERBITS_CAPTURE message...");
    chrome.runtime.sendMessage({ type: "LAYERBITS_CAPTURE" }, (resp) => {
      // Check for runtime errors
      if (chrome.runtime.lastError) {
        console.warn("Eyedropper: Failed to capture screenshot", chrome.runtime.lastError.message);
        return;
      }
      
      if (!resp) {
        console.error("Eyedropper: No response from background script");
        return;
      }
      
      if (!resp.ok || !resp.dataUrl) {
        console.error("Eyedropper: Screenshot failed", { ok: resp.ok, hasDataUrl: !!resp.dataUrl, error: resp.error });
        return;
      }
      
      console.log("Screenshot received, creating image...");
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        console.log("Image loaded, creating canvas...");
        // Create fullscreen canvas
        const canvas = document.createElement("canvas");
        canvas.id = "layerbits-eyedropper-canvas";
        const dpr = window.devicePixelRatio || 1;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        
        // Set canvas size to device pixels
        canvas.width = Math.round(vw * dpr);
        canvas.height = Math.round(vh * dpr);
        
        // Set CSS size to viewport pixels
        // Make canvas transparent to pointer events except for clicks
        canvas.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: ${vw}px;
          height: ${vh}px;
          z-index: 10000000001;
          pointer-events: auto;
          opacity: 0;
        `;
        
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        
        // Draw screenshot to canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        state.eyedropperCanvas = canvas;
        state.eyedropperCtx = ctx;
        
        document.documentElement.appendChild(canvas);
        
        // Attach event listeners to canvas now that it exists
        if (state.eyedropperMoveHandler) {
          canvas.addEventListener('mousemove', state.eyedropperMoveHandler);
        }
        if (state.eyedropperClickHandler) {
          canvas.addEventListener('click', state.eyedropperClickHandler);
        }
        
        console.log("Canvas created and appended", { width: canvas.width, height: canvas.height, dpr });
      };
      
      img.onerror = (err) => {
        console.error("Eyedropper: Failed to load screenshot", err);
      };
      
      img.src = resp.dataUrl;
    });
  }

  function handleEyedropperMove(e) {
    if (!state.eyedropperActive) return;
    
    let r, g, b, a = 255;
    let colorFound = false;
    
    // Try to sample from canvas first (most accurate)
    if (state.eyedropperCanvas && state.eyedropperCtx) {
      try {
        const dpr = window.devicePixelRatio || 1;
        const x = Math.floor(e.clientX * dpr);
        const y = Math.floor(e.clientY * dpr);
        
        if (x >= 0 && y >= 0 && x < state.eyedropperCanvas.width && y < state.eyedropperCanvas.height) {
          const imageData = state.eyedropperCtx.getImageData(x, y, 1, 1);
          [r, g, b, a] = imageData.data;
          colorFound = true;
        }
    } catch (err) {
        console.warn("Eyedropper: Error sampling from canvas", err);
      }
    }
    
    // Fallback: sample from element at cursor position
    if (!colorFound) {
      try {
        const element = document.elementFromPoint(e.clientX, e.clientY);
        if (element && !isOurElement(element)) {
          const computed = window.getComputedStyle(element);
          
          // Try to get color from various sources
          const colorSources = [
            computed.backgroundColor,
            computed.borderTopColor,
            computed.color,
            computed.outlineColor,
          ];
          
          for (const colorStr of colorSources) {
            if (colorStr && colorStr !== 'transparent' && colorStr !== 'rgba(0, 0, 0, 0)') {
              const rgba = parseColor(colorStr);
              if (rgba) {
                r = rgba.r;
                g = rgba.g;
                b = rgba.b;
                a = rgba.a !== undefined ? Math.round(rgba.a * 255) : 255;
                colorFound = true;
                break;
              }
            }
          }
          
          // If still no color, try to sample from a small area around the cursor
          if (!colorFound && state.eyedropperCanvas && state.eyedropperCtx) {
            try {
              const dpr = window.devicePixelRatio || 1;
              const x = Math.floor(e.clientX * dpr);
              const y = Math.floor(e.clientY * dpr);
              
              // Sample a 3x3 area and average
              let totalR = 0, totalG = 0, totalB = 0, count = 0;
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  const sx = x + dx;
                  const sy = y + dy;
                  if (sx >= 0 && sy >= 0 && sx < state.eyedropperCanvas.width && sy < state.eyedropperCanvas.height) {
                    const imageData = state.eyedropperCtx.getImageData(sx, sy, 1, 1);
                    const [sr, sg, sb, sa] = imageData.data;
                    if (sa > 0) {
                      totalR += sr;
                      totalG += sg;
                      totalB += sb;
                      count++;
                    }
                  }
                }
              }
              
              if (count > 0) {
                r = Math.round(totalR / count);
                g = Math.round(totalG / count);
                b = Math.round(totalB / count);
                a = 255;
                colorFound = true;
              }
            } catch (err) {
              // Ignore
            }
          }
        }
      } catch (err) {
        console.warn("Eyedropper: Error sampling from element", err);
      }
    }
    
    // Update tooltip if we found a color
    if (colorFound && state.eyedropperTooltip) {
      // Convert to hex
      const hex = `#${[r, g, b].map(v => {
        const h = v.toString(16);
        return h.length === 1 ? '0' + h : h;
      }).join('')}`;
      
      // Convert to RGB string
      const rgb = a < 255 ? `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})` : `rgb(${r}, ${g}, ${b})`;
      
      // Convert to HSL
      const hslObj = rgbaToHsl({ r, g, b, a: a / 255 });
      const hsl = a < 255 ? hslaToString(hslObj) : hslToString(hslObj);
      
      // Position tooltip near cursor (offset to avoid covering the color)
      const tooltipX = e.clientX + 20;
      const tooltipY = e.clientY + 20;
      
      // Adjust if tooltip would go off screen
      const tooltipWidth = 180;
      const tooltipHeight = 140;
      const finalX = tooltipX + tooltipWidth > window.innerWidth 
        ? e.clientX - tooltipWidth - 20 
        : tooltipX;
      const finalY = tooltipY + tooltipHeight > window.innerHeight 
        ? e.clientY - tooltipHeight - 20 
        : tooltipY;
      
      state.eyedropperTooltip.style.left = `${finalX}px`;
      state.eyedropperTooltip.style.top = `${finalY}px`;
      
      state.eyedropperTooltip.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="width: 100%; height: 60px; background: ${hex}; border: 2px solid rgba(255,255,255,0.2); border-radius: 8px; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.2); flex-shrink: 0;"></div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 10px; color: #6b7280; min-width: 35px;">HEX</span>
              <span style="font-weight: 600; font-size: 13px; color: #01ffdb; font-family: ui-monospace, monospace;">${hex.toUpperCase()}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 10px; color: #6b7280; min-width: 35px;">RGB</span>
              <span style="font-size: 12px; color: #e5e7eb; font-family: ui-monospace, monospace;">${rgb}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 10px; color: #6b7280; min-width: 35px;">HSL</span>
              <span style="font-size: 12px; color: #e5e7eb; font-family: ui-monospace, monospace;">${hsl}</span>
            </div>
          </div>
        </div>
      `;
    }
  }
  
  function handleEyedropperClick(e) {
    if (!state.eyedropperActive) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Sample the current pixel to get the color
    if (!state.eyedropperCanvas || !state.eyedropperCtx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const x = Math.floor(e.clientX * dpr);
    const y = Math.floor(e.clientY * dpr);
    
    if (x >= 0 && y >= 0 && x < state.eyedropperCanvas.width && y < state.eyedropperCanvas.height) {
      try {
        const imageData = state.eyedropperCtx.getImageData(x, y, 1, 1);
        const [r, g, b] = imageData.data;
        
        // Convert to hex
        const hex = `#${[r, g, b].map(v => {
          const h = v.toString(16);
          return h.length === 1 ? '0' + h : h;
        }).join('')}`;
        
        navigator.clipboard.writeText(hex).then(() => {
          if (state.eyedropperTooltip) {
            const original = state.eyedropperTooltip.innerHTML;
            state.eyedropperTooltip.innerHTML = `
              <div style="text-align: center; padding: 8px;">
                <div style="color: #01ffdb; font-weight: 600; font-size: 13px;">Copied!</div>
                <div style="color: #e5e7eb; font-size: 12px; margin-top: 4px;">${hex}</div>
              </div>
            `;
            setTimeout(() => {
              state.eyedropperTooltip.innerHTML = original;
              deactivateEyedropper();
            }, 1000);
          }
        }).catch(err => {
          console.error("Eyedropper: Failed to copy", err);
        });
      } catch (err) {
        console.warn("Eyedropper: Error sampling pixel on click", err);
      }
    }
  }
  
  function handleEyedropperKeydown(e) {
    if (!state.eyedropperActive) return;
    if (e.key === 'Escape') {
      deactivateEyedropper();
    }
  }

  // ==================== MEASURE TOOL ====================
  function activateMeasure() {
    if (state.eyedropperActive) {
      deactivateEyedropper();
    }
    state.measureActive = true;
    if (state.measureBtn) state.measureBtn.classList.add('active');
    if (state.measureOverlay) state.measureOverlay.style.display = 'block';
    state.measurePointA = null;
    state.measurePointB = null;
    clearMeasure();
    // Change cursor to crosshair
    document.documentElement.style.cursor = 'crosshair';
    // Hide highlight/tooltip while active
    if (state.highlightBox) state.highlightBox.style.display = 'none';
    if (state.tooltip) state.tooltip.style.display = 'none';
    // Add mousemove listener for preview
    document.addEventListener('mousemove', updateMeasurePreview, true);
  }

  function deactivateMeasure() {
    state.measureActive = false;
    if (state.measureBtn) state.measureBtn.classList.remove('active');
    if (state.measureOverlay) state.measureOverlay.style.display = 'none';
    state.measurePointA = null;
    state.measurePointB = null;
    document.documentElement.style.cursor = '';
    clearMeasure();
    // Remove mousemove listener
    document.removeEventListener('mousemove', updateMeasurePreview, true);
    // restore highlight overlay if we had a last element
    if (state.lastElement) {
      updateOverlay(state.lastElement);
    }
  }

  function handleMeasureClick(e) {
    e.stopPropagation();
    e.preventDefault();
    
    let x = e.clientX;
    let y = e.clientY;
    
    // If Shift is held and we have point A, snap to horizontal or vertical line
    if (e.shiftKey && state.measurePointA) {
      const dx = Math.abs(x - state.measurePointA.x);
      const dy = Math.abs(y - state.measurePointA.y);
      // Snap to whichever axis is closer
      if (dx > dy) {
        // Snap to horizontal line
        y = state.measurePointA.y;
      } else {
        // Snap to vertical line
        x = state.measurePointA.x;
      }
    }
    
    if (!state.measurePointA) {
      // Set point A
      state.measurePointA = { x, y };
      updateMeasurePoint(state.measurePointA, 'A');
    } else if (!state.measurePointB) {
      // Set point B
      state.measurePointB = { x, y };
      updateMeasurePoint(state.measurePointB, 'B');
      updateMeasureLine();
    } else {
      // Reset and start new measurement
      state.measurePointA = { x, y };
      state.measurePointB = null;
      clearMeasure();
      updateMeasurePoint(state.measurePointA, 'A');
    }
  }

  function updateMeasurePoint(point, label) {
    if (!point || !state.measureOverlay) return;
    
    const pointEl = label === 'A' ? 
      state.measureOverlay.querySelector('#layerbits-measure-point-a') :
      state.measureOverlay.querySelector('#layerbits-measure-point-b');
    
    if (pointEl) {
      pointEl.style.display = 'block';
      pointEl.style.left = `${point.x}px`;
      pointEl.style.top = `${point.y}px`;
      pointEl.textContent = label;
    } else {
      // Elements might not be created yet, try to find them
      const allPoints = state.measureOverlay.querySelectorAll('.layerbits-measure-point');
      if (allPoints.length >= (label === 'A' ? 1 : 2)) {
        const el = allPoints[label === 'A' ? 0 : 1];
        if (el) {
          el.style.display = 'block';
          el.style.left = `${point.x}px`;
          el.style.top = `${point.y}px`;
          el.textContent = label;
        }
      }
    }
  }

  function updateMeasurePreview(e) {
    if (!state.measureOverlay) return;
    if (!state.measurePointA) {
      // Show preview point at cursor
      const previewPoint = state.measureOverlay.querySelector('#layerbits-measure-point-a');
      if (previewPoint) {
        previewPoint.style.display = 'block';
        previewPoint.style.left = `${e.clientX}px`;
        previewPoint.style.top = `${e.clientY}px`;
        previewPoint.textContent = 'A';
      }
    } else if (!state.measurePointB) {
      // Show preview line from point A to cursor
      let x = e.clientX;
      let y = e.clientY;
      
      // If Shift is held, snap to horizontal or vertical line
      if (e.shiftKey) {
        const dx = Math.abs(x - state.measurePointA.x);
        const dy = Math.abs(y - state.measurePointA.y);
        // Snap to whichever axis is closer
        if (dx > dy) {
          // Snap to horizontal line
          y = state.measurePointA.y;
        } else {
          // Snap to vertical line
          x = state.measurePointA.x;
        }
      }
      
      updateMeasureLinePreview(state.measurePointA, { x, y });
    }
  }

  function updateMeasureLinePreview(pointA, pointB) {
    if (!state.measureLine || !pointA || !pointB) return;
    
    const dx = pointB.x - pointA.x;
    const dy = pointB.y - pointA.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    const length = distance;
    
    // Position line at point A
    state.measureLine.style.display = 'block';
    state.measureLine.style.left = `${pointA.x}px`;
    state.measureLine.style.top = `${pointA.y}px`;
    state.measureLine.style.width = `${length}px`;
    state.measureLine.style.height = '2px';
    state.measureLine.style.transform = `rotate(${angle}deg)`;
    state.measureLine.style.transformOrigin = '0 50%';
    
    // Update label
    if (state.measureLabel) {
      const midX = (pointA.x + pointB.x) / 2;
      const midY = (pointA.y + pointB.y) / 2;
      state.measureLabel.style.display = 'block';
      state.measureLabel.style.left = `${midX}px`;
      state.measureLabel.style.top = `${midY - 20}px`;
      state.measureLabel.textContent = formatDistance(distance);
    }
  }
  
  function updateMeasureLine() {
    if (!state.measurePointA || !state.measurePointB) {
      clearMeasure();
      return;
    }
    
    updateMeasureLinePreview(state.measurePointA, state.measurePointB);
    updateMeasurePoint(state.measurePointB, 'B');
  }

  function clearMeasure() {
    if (state.measureLine) state.measureLine.style.display = 'none';
    if (state.measureLabel) state.measureLabel.style.display = 'none';
    const pointA = state.measureOverlay?.querySelector('#layerbits-measure-point-a');
    const pointB = state.measureOverlay?.querySelector('#layerbits-measure-point-b');
    if (pointA && !state.measurePointA) pointA.style.display = 'none';
    if (pointB && !state.measurePointB) pointB.style.display = 'none';
  }

  function formatDistance(pixels) {
    const px = Math.round(pixels);
    if (state.sizeMode === 'px') {
      return `${px}px`;
    }
    // Convert to other units if needed
    const root = getComputedStyle(document.documentElement).fontSize;
    const rootPx = parseFloat(root) || 16;
    if (state.sizeMode === 'rem') {
      return `${px}px (${(px / rootPx).toFixed(2)}rem)`;
    }
    if (state.sizeMode === 'em') {
      return `${px}px (${(px / rootPx).toFixed(2)}em)`;
    }
    return `${px}px`;
  }


  function applyInspectorState() {
    if (!state.panel) {
      // Panel might not be created yet, try again after a short delay
      setTimeout(() => {
        if (state.panel) {
          state.panel.style.display = state.inspectorEnabled ? "flex" : "none";
          if (!state.inspectorEnabled) clearOverlay();
        }
      }, 50);
      return;
    }
    state.panel.style.display = state.inspectorEnabled ? "flex" : "none";
    if (!state.inspectorEnabled) clearOverlay();
  }

  function clearOverlay() {
    if (state.highlightBox) state.highlightBox.style.display = "none";
    if (state.tooltip) state.tooltip.style.display = "none";
  }

  function showContextMenu(x, y) {
    if (!state.contextMenuEl) return;
    state.contextMenuEl.style.display = "block";
    state.contextMenuOpen = true;
    
    // Adjust position to avoid covering the panel (top-right)
    const menuWidth = 200; // Approximate menu width
    const menuHeight = 250; // Approximate menu height
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = x;
    let top = y;
    
    // If menu would overlap with panel (which is at top-right), adjust position
    if (state.panel) {
      const panelRect = state.panel.getBoundingClientRect();
      // If click is near the panel, position menu to the left of cursor
      if (x + menuWidth > panelRect.left && y < panelRect.bottom) {
        left = Math.max(10, x - menuWidth - 10);
      }
    }
    
    // Keep menu within viewport bounds
    if (left + menuWidth > viewportWidth) {
      left = viewportWidth - menuWidth - 10;
    }
    if (top + menuHeight > viewportHeight) {
      top = viewportHeight - menuHeight - 10;
    }
    
    state.contextMenuEl.style.left = `${left}px`;
    state.contextMenuEl.style.top = `${top}px`;
  }

  function hideContextMenu() {
    if (!state.contextMenuEl) return;
    state.contextMenuEl.style.display = "none";
    state.contextMenuOpen = false;
  }

  // ==================== STATE MANAGER ====================
  function syncMenuState() {
    if (state.lockCheckboxEl) {
      state.lockCheckboxEl.checked = state.isLocked;
    }
    if (state.colorModeRadioEls && state.colorModeRadioEls.length) {
      state.colorModeRadioEls.forEach((radio) => {
        radio.checked = radio.value === state.colorMode;
      });
    }
    if (state.sizeModeRadioEls && state.sizeModeRadioEls.length) {
      state.sizeModeRadioEls.forEach((radio) => {
        radio.checked = radio.value === state.sizeMode;
      });
    }
    // Toggle indicators for overlay items
    const flexItem = state.contextMenuEl?.querySelector('#layerbits-menu-show-flex');
    const gridItem = state.contextMenuEl?.querySelector('#layerbits-menu-show-cssgrid');
    if (flexItem) {
      if (state.showFlexboxGridActive) flexItem.classList.add('active');
      else flexItem.classList.remove('active');
    }
    if (gridItem) {
      if (state.showCssGridActive) gridItem.classList.add('active');
      else gridItem.classList.remove('active');
    }
  }

  function setColorMode(newMode) {
    if (!["hex", "rgb", "rgba", "hsl", "hsla"].includes(newMode)) return;
    state.colorMode = newMode;
    if (chrome && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ layerbitsColorMode: state.colorMode });
    }
    syncMenuState();
    rerenderCurrentTarget();
  }

  function setSizeMode(newMode) {
    if (!["px", "em", "rem", "pt", "pc"].includes(newMode)) return;
    state.sizeMode = newMode;
    if (chrome && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ layerbitsSizeMode: state.sizeMode });
    }
    syncMenuState();
    rerenderCurrentTarget();
  }

  function setLockedState(locked, targetFallback = null) {
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

    const target = state.lockedElement || targetFallback || state.lastElement || state.lastRightClickedElement;
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

  function rerenderCurrentTarget() {
    const target = state.lockedElement || state.lastElement;
    if (target) {
      updateOverlay(target);
    }
  }

  // ==================== LAYOUT GRID OVERLAYS ====================
  function ensureFlexOverlay() {
    if (!state.flexOverlayEl) {
      const el = document.createElement("div");
      el.id = "layerbits-flex-overlay";
      el.style.position = "absolute";
      el.style.pointerEvents = "none";
      el.style.zIndex = 10000000001;
      document.documentElement.appendChild(el);
      state.flexOverlayEl = el;
    }
  }

  function ensureGridOverlay() {
    if (!state.gridOverlayEl) {
      const el = document.createElement("div");
      el.id = "layerbits-grid-overlay";
      el.style.position = "absolute";
      el.style.pointerEvents = "none";
      el.style.zIndex = 10000000001;
      document.documentElement.appendChild(el);
      state.gridOverlayEl = el;
    }
  }

  function clearOverlayChildren(container) {
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);
  }

  function setOverlayBounds(container, targetRect){
    container.style.top = `${targetRect.top + window.scrollY}px`;
    container.style.left = `${targetRect.left + window.scrollX}px`;
    container.style.width = `${targetRect.width}px`;
    container.style.height = `${targetRect.height}px`;
  }

  function findClosestContainer(el, matcher){
    let cur = el;
    let hops = 0;
    while(cur && hops < 10){
      try{
        const disp = getComputedStyle(cur).display;
        if(matcher(disp)) return cur;
      }catch(_){}
      cur = cur.parentElement; hops++;
    }
    return null;
  }

  function drawLine(container, x1, y1, x2, y2, color){
    const line = document.createElement("div");
    line.style.position = "absolute";
    line.style.left = `${Math.min(x1,x2)}px`;
    line.style.top = `${Math.min(y1,y2)}px`;
    line.style.width = `${Math.max(1, Math.abs(x2 - x1))}px`;
    line.style.height = `${Math.max(1, Math.abs(y2 - y1))}px`;
    line.style.background = color;
    line.style.opacity = "0.8";
    container.appendChild(line);
  }

  function uniquePositions(values, tol=1){
    const sorted = Array.from(new Set(values)).sort((a,b)=>a-b);
    const out = [];
    sorted.forEach(v=>{ if(out.length===0 || Math.abs(out[out.length-1]-v) > tol) out.push(v); });
    return out;
  }

  function updateFlexOverlay(target) {
    ensureFlexOverlay(); if (!state.flexOverlayEl) return;
    // find flex container (self or ancestor)
    const containerEl = findClosestContainer(target, d => d === 'flex' || d === 'inline-flex') || target;
    const tRect = containerEl.getBoundingClientRect();
    clearOverlayChildren(state.flexOverlayEl);
    setOverlayBounds(state.flexOverlayEl, tRect);
    state.flexOverlayEl.style.outline = '1px solid #01ffdb';

    // Determine main axis and draw separators between items
    const cs = getComputedStyle(containerEl);
    const dir = cs.flexDirection || 'row';
    const children = Array.from(containerEl.children);
    if(children.length === 0) return;
    const color = '#01ffdb';
    // Tinted boxes for each child
    children.forEach((ch)=>{
      const r = ch.getBoundingClientRect();
      const box = document.createElement('div');
      box.style.position = 'absolute';
      box.style.left = `${r.left - tRect.left}px`;
      box.style.top = `${r.top - tRect.top}px`;
      box.style.width = `${r.width}px`;
      box.style.height = `${r.height}px`;
      box.style.background = 'rgba(1, 255, 219, 0.08)';
      box.style.border = '1px dashed rgba(1, 255, 219, 0.7)';
      box.style.boxSizing = 'border-box';
      state.flexOverlayEl.appendChild(box);
    });
    if(dir.startsWith('row')){
      const edges = children.map(ch => ch.getBoundingClientRect()).map(r => r.right);
      const lefts = children.map(ch => ch.getBoundingClientRect()).map(r => r.left);
      const sorted = lefts.map((l, i)=>({l, r: edges[i]})).sort((a,b)=>a.l-b.l);
      for(let i=0;i<sorted.length-1;i++){
        const x = sorted[i].r - tRect.left;
        drawLine(state.flexOverlayEl, x, 0, x, tRect.height, color);
      }
    } else { // column
      const bottoms = children.map(ch => ch.getBoundingClientRect()).map(r => r.bottom);
      const tops = children.map(ch => ch.getBoundingClientRect()).map(r => r.top);
      const sorted = tops.map((t, i)=>({t, b: bottoms[i]})).sort((a,b)=>a.t-b.t);
      for(let i=0;i<sorted.length-1;i++){
        const y = sorted[i].b - tRect.top;
        drawLine(state.flexOverlayEl, 0, y, tRect.width, y, color);
      }
    }
  }

  function updateGridOverlay(target) {
    ensureGridOverlay(); if (!state.gridOverlayEl) return;
    // find grid container (self or ancestor)
    const containerEl = findClosestContainer(target, d => d === 'grid' || d === 'inline-grid') || target;
    const tRect = containerEl.getBoundingClientRect();
    clearOverlayChildren(state.gridOverlayEl);
    setOverlayBounds(state.gridOverlayEl, tRect);
    state.gridOverlayEl.style.outline = '1px solid #a78bfa';

    const children = Array.from(containerEl.children);
    const color = '#a78bfa';
    if(children.length === 0) return;
    const rects = children.map(ch => ch.getBoundingClientRect());
    const xs = uniquePositions([tRect.left, ...rects.map(r=>r.left), ...rects.map(r=>r.right), tRect.right].map(v=>v - tRect.left));
    const ys = uniquePositions([tRect.top, ...rects.map(r=>r.top), ...rects.map(r=>r.bottom), tRect.bottom].map(v=>v - tRect.top));
    // draw shaded cells for a clearer grid
    for(let i=0;i<xs.length-1;i++){
      for(let j=0;j<ys.length-1;j++){
        const cell = document.createElement('div');
        cell.style.position = 'absolute';
        cell.style.left = `${xs[i]}px`;
        cell.style.top = `${ys[j]}px`;
        cell.style.width = `${xs[i+1]-xs[i]}px`;
        cell.style.height = `${ys[j+1]-ys[j]}px`;
        const shade = ((i+j)%2===0) ? 'rgba(167, 139, 250, 0.08)' : 'rgba(167, 139, 250, 0.12)';
        cell.style.background = shade;
        state.gridOverlayEl.appendChild(cell);
      }
    }
    // draw vertical and horizontal lines
    xs.forEach(x => drawLine(state.gridOverlayEl, x, 0, x, tRect.height, color));
    ys.forEach(y => drawLine(state.gridOverlayEl, 0, y, tRect.width, y, color));
  }

  function hideFlexOverlay() {
    if (state.flexOverlayEl) {
      clearOverlayChildren(state.flexOverlayEl);
      state.flexOverlayEl.style.width = "0px";
      state.flexOverlayEl.style.height = "0px";
    }
  }

  function hideGridOverlay() {
    if (state.gridOverlayEl) {
      clearOverlayChildren(state.gridOverlayEl);
      state.gridOverlayEl.style.width = "0px";
      state.gridOverlayEl.style.height = "0px";
    }
  }

  function toggleFlexOverlay() {
    const target = state.lockedElement || state.lastElement || state.lastRightClickedElement;
    if (!target) return;
    state.showFlexboxGridActive = !state.showFlexboxGridActive;
    if (state.showFlexboxGridActive) updateFlexOverlay(target);
    else hideFlexOverlay();
  }

  function toggleCssGridOverlay() {
    const target = state.lockedElement || state.lastElement || state.lastRightClickedElement;
    if (!target) return;
    state.showCssGridActive = !state.showCssGridActive;
    if (state.showCssGridActive) updateGridOverlay(target);
    else hideGridOverlay();
  }

  function updateGridOverlays(target) {
    if (state.showFlexboxGridActive) updateFlexOverlay(target);
    if (state.showCssGridActive) updateGridOverlay(target);
  }

  // ==================== PANEL DRAGGING ====================
  function handlePanelDrag(e) {
    if (!state.isDragging || !state.panel) return;
    e.preventDefault();
    const x = e.clientX - state.panelDragOffset.x;
    const y = e.clientY - state.panelDragOffset.y;
    state.panel.style.left = `${x}px`;
    state.panel.style.top = `${y}px`;
    state.panel.style.right = 'auto';
    state.panel.style.bottom = 'auto';
  }

  function stopPanelDrag() {
    state.isDragging = false;
    document.removeEventListener('mousemove', handlePanelDrag);
    document.removeEventListener('mouseup', stopPanelDrag);
  }

  // ==================== INSPECTOR ====================
  function updateOverlay(target) {
    if (!target || !state.highlightBox || !state.tooltip) return;

    // Update visual elements immediately (synchronous)
    const rect = target.getBoundingClientRect();
    state.highlightBox.style.display = "block";
    state.highlightBox.style.top = `${rect.top}px`;
    state.highlightBox.style.left = `${rect.left}px`;
    state.highlightBox.style.width = `${rect.width}px`;
    state.highlightBox.style.height = `${rect.height}px`;

    const selector = getSelectorForElement(target);
    state.tooltip.textContent = selector;
    if (state.selectorTextEl) {
      state.selectorTextEl.textContent = selector;
    }

    document.addEventListener(
      "mousemove",
      (e) => {
        if (state.tooltip) {
          state.tooltip.style.top = `${e.clientY + 8}px`;
          state.tooltip.style.left = `${e.clientX + 8}px`;
        }
      },
      { once: true }
    );
    state.tooltip.style.display = "block";


    // Defer heavy CSS extraction to not block UI updates
    requestAnimationFrame(() => {
      // Check if target is still the current element (user might have moved on)
      if (target !== state.lastElement && target !== state.lockedElement) return;

      // Get CSS with active state (empty string means default/no state)
      const rawCss = getCleanCSS(target, state.activeState || null);
    let processedCss = convertColorsInString(rawCss, state.colorMode);
    processedCss = convertSizesInString(processedCss, state.sizeMode, target);
    state.currentCssText = processedCss;
    if (state.cssBlockEl) {
      state.cssBlockEl.innerHTML = renderCssWithColorSwatches(state.currentCssText);
    }
      
      // Clean up temporary style if it was added
      const tempStyle = document.getElementById('layerbits-temp-state-style');
      if (tempStyle) {
        tempStyle.remove();
      }

    state.currentTailwindText = getTailwindForElement(target);
    if (state.tailwindBlockEl) {
      state.tailwindBlockEl.innerHTML =
        state.currentTailwindText.trim() === "" || state.currentTailwindText.startsWith("/*")
          ? state.currentTailwindText
          : renderTailwindWithColorSwatches(state.currentTailwindText);
    }

    state.currentHtmlText = getHtmlSnippet(target);
    if (state.htmlBlockEl) {
        const htmlText = state.currentHtmlText || "<!-- No HTML snippet available -->";
        // Use setTimeout to defer rendering and avoid blocking the UI thread
        setTimeout(() => {
          // Check if target is still the current element (user might have moved on)
          if (state.htmlBlockEl && state.currentHtmlText === htmlText) {
            try {
              state.htmlBlockEl.textContent = htmlText;
            } catch (e) {
              console.error("Error rendering HTML:", e);
              // Fallback: show plain text for very large HTML
              const safeHtml = htmlText.length > 50000 
                ? htmlText.substring(0, 50000) + "\n<!-- HTML truncated due to size -->"
                : htmlText;
              state.htmlBlockEl.innerHTML = escapeHtml(safeHtml);
            }
          }
        }, 0);
    }

    state.currentJsxText = htmlToJsx(state.currentHtmlText);
    if (state.jsxBlockEl) {
        const jsxText = state.currentJsxText || "/* No JSX snippet available */";
        state.jsxBlockEl.innerHTML = renderJsxWithSyntaxHighlight(jsxText);
    }

    // update overlays if active
    updateGridOverlays(target);
    });
  }

  // ==================== VISUAL EDITOR ====================
  function updateEditorControls(target) {
    if (!target || !state.editorBlockEl) return;
    
    const controlsEl = state.editorBlockEl.querySelector("#layerbits-editor-controls");
    if (!controlsEl) return;
    
    // Store original styles if not already stored
    if (state.editedElement !== target) {
      state.originalStyles.clear();
      state.editedElement = target;
      const computed = window.getComputedStyle(target);
      const props = ['width', 'height', 'padding', 'margin', 'background-color', 'color', 
                     'font-size', 'font-weight', 'border', 'border-radius', 'opacity', 
                     'display', 'position', 'text-align'];
      props.forEach(prop => {
        state.originalStyles.set(prop, computed.getPropertyValue(prop));
      });
    }
    
    const computed = window.getComputedStyle(target);
    
    // Helper to parse value and unit
    const parseValue = (val) => {
      if (!val || val === 'auto' || val === 'none') return { value: '', unit: 'px' };
      const match = val.match(/^([\d.]+)(px|em|rem|%|vh|vw)?$/);
      if (match) {
        return { value: match[1], unit: match[2] || 'px' };
      }
      return { value: val, unit: '' };
    };
    
    // Helper to convert color to hex for color input
    const colorToHex = (color) => {
      if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return '#000000';
      if (color.startsWith('#')) return color.length === 7 ? color : color.slice(0, 7);
      const rgba = parseColor(color);
      if (rgba) return rgbaToHex(rgba);
      return '#000000';
    };
    
    const width = parseValue(computed.width);
    const height = parseValue(computed.height);
    const padding = parseValue(computed.paddingTop);
    const margin = parseValue(computed.marginTop);
    const fontSize = parseValue(computed.fontSize);
    const borderRadius = parseValue(computed.borderRadius);
    const opacity = computed.opacity || '1';
    
    controlsEl.innerHTML = `
      <div class="layerbits-editor-group">
        <div class="layerbits-editor-label">Layout</div>
        <div class="layerbits-editor-row">
          <div class="layerbits-editor-field">
            <label>Width</label>
            <div class="layerbits-editor-input-group">
              <input type="number" class="layerbits-editor-input" data-prop="width" value="${width.value}" step="1" />
              <select class="layerbits-editor-unit" data-prop="width">
                <option value="px" ${width.unit === 'px' ? 'selected' : ''}>px</option>
                <option value="%" ${width.unit === '%' ? 'selected' : ''}>%</option>
                <option value="em" ${width.unit === 'em' ? 'selected' : ''}>em</option>
                <option value="rem" ${width.unit === 'rem' ? 'selected' : ''}>rem</option>
                <option value="auto" ${width.unit === '' && width.value === 'auto' ? 'selected' : ''}>auto</option>
              </select>
            </div>
          </div>
          <div class="layerbits-editor-field">
            <label>Height</label>
            <div class="layerbits-editor-input-group">
              <input type="number" class="layerbits-editor-input" data-prop="height" value="${height.value}" step="1" />
              <select class="layerbits-editor-unit" data-prop="height">
                <option value="px" ${height.unit === 'px' ? 'selected' : ''}>px</option>
                <option value="%" ${height.unit === '%' ? 'selected' : ''}>%</option>
                <option value="em" ${height.unit === 'em' ? 'selected' : ''}>em</option>
                <option value="rem" ${height.unit === 'rem' ? 'selected' : ''}>rem</option>
                <option value="auto" ${height.unit === '' && height.value === 'auto' ? 'selected' : ''}>auto</option>
              </select>
            </div>
          </div>
        </div>
        <div class="layerbits-editor-row">
          <div class="layerbits-editor-field">
            <label>Padding</label>
            <div class="layerbits-editor-input-group">
              <input type="number" class="layerbits-editor-input" data-prop="padding" value="${padding.value}" step="1" />
              <select class="layerbits-editor-unit" data-prop="padding">
                <option value="px" ${padding.unit === 'px' ? 'selected' : ''}>px</option>
                <option value="em" ${padding.unit === 'em' ? 'selected' : ''}>em</option>
                <option value="rem" ${padding.unit === 'rem' ? 'selected' : ''}>rem</option>
              </select>
            </div>
          </div>
          <div class="layerbits-editor-field">
            <label>Margin</label>
            <div class="layerbits-editor-input-group">
              <input type="number" class="layerbits-editor-input" data-prop="margin" value="${margin.value}" step="1" />
              <select class="layerbits-editor-unit" data-prop="margin">
                <option value="px" ${margin.unit === 'px' ? 'selected' : ''}>px</option>
                <option value="em" ${margin.unit === 'em' ? 'selected' : ''}>em</option>
                <option value="rem" ${margin.unit === 'rem' ? 'selected' : ''}>rem</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div class="layerbits-editor-group">
        <div class="layerbits-editor-label">Colors</div>
        <div class="layerbits-editor-row">
          <div class="layerbits-editor-field">
            <label>Background</label>
            <div class="layerbits-editor-color-group">
              <input type="color" class="layerbits-editor-color" data-prop="background-color" value="${colorToHex(computed.backgroundColor)}" />
              <input type="text" class="layerbits-editor-color-text" data-prop="background-color" value="${computed.backgroundColor || '#000000'}" placeholder="#000000" />
            </div>
          </div>
          <div class="layerbits-editor-field">
            <label>Text Color</label>
            <div class="layerbits-editor-color-group">
              <input type="color" class="layerbits-editor-color" data-prop="color" value="${colorToHex(computed.color)}" />
              <input type="text" class="layerbits-editor-color-text" data-prop="color" value="${computed.color || '#000000'}" placeholder="#000000" />
            </div>
          </div>
        </div>
      </div>
      
      <div class="layerbits-editor-group">
        <div class="layerbits-editor-label">Typography</div>
        <div class="layerbits-editor-row">
          <div class="layerbits-editor-field">
            <label>Font Size</label>
            <div class="layerbits-editor-input-group">
              <input type="number" class="layerbits-editor-input" data-prop="font-size" value="${fontSize.value}" step="0.1" />
              <select class="layerbits-editor-unit" data-prop="font-size">
                <option value="px" ${fontSize.unit === 'px' ? 'selected' : ''}>px</option>
                <option value="em" ${fontSize.unit === 'em' ? 'selected' : ''}>em</option>
                <option value="rem" ${fontSize.unit === 'rem' ? 'selected' : ''}>rem</option>
              </select>
            </div>
          </div>
          <div class="layerbits-editor-field">
            <label>Font Weight</label>
            <select class="layerbits-editor-select" data-prop="font-weight">
              <option value="normal" ${computed.fontWeight === '400' || computed.fontWeight === 'normal' ? 'selected' : ''}>Normal</option>
              <option value="bold" ${computed.fontWeight === '700' || computed.fontWeight === 'bold' ? 'selected' : ''}>Bold</option>
              <option value="100" ${computed.fontWeight === '100' ? 'selected' : ''}>100</option>
              <option value="200" ${computed.fontWeight === '200' ? 'selected' : ''}>200</option>
              <option value="300" ${computed.fontWeight === '300' ? 'selected' : ''}>300</option>
              <option value="400" ${computed.fontWeight === '400' ? 'selected' : ''}>400</option>
              <option value="500" ${computed.fontWeight === '500' ? 'selected' : ''}>500</option>
              <option value="600" ${computed.fontWeight === '600' ? 'selected' : ''}>600</option>
              <option value="700" ${computed.fontWeight === '700' ? 'selected' : ''}>700</option>
              <option value="800" ${computed.fontWeight === '800' ? 'selected' : ''}>800</option>
              <option value="900" ${computed.fontWeight === '900' ? 'selected' : ''}>900</option>
            </select>
          </div>
        </div>
        <div class="layerbits-editor-row">
          <div class="layerbits-editor-field">
            <label>Text Align</label>
            <select class="layerbits-editor-select" data-prop="text-align">
              <option value="left" ${computed.textAlign === 'left' ? 'selected' : ''}>Left</option>
              <option value="center" ${computed.textAlign === 'center' ? 'selected' : ''}>Center</option>
              <option value="right" ${computed.textAlign === 'right' ? 'selected' : ''}>Right</option>
              <option value="justify" ${computed.textAlign === 'justify' ? 'selected' : ''}>Justify</option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="layerbits-editor-group">
        <div class="layerbits-editor-label">Border & Effects</div>
        <div class="layerbits-editor-row">
          <div class="layerbits-editor-field">
            <label>Border Radius</label>
            <div class="layerbits-editor-input-group">
              <input type="number" class="layerbits-editor-input" data-prop="border-radius" value="${borderRadius.value}" step="1" />
              <select class="layerbits-editor-unit" data-prop="border-radius">
                <option value="px" ${borderRadius.unit === 'px' ? 'selected' : ''}>px</option>
                <option value="%" ${borderRadius.unit === '%' ? 'selected' : ''}>%</option>
              </select>
            </div>
          </div>
          <div class="layerbits-editor-field">
            <label>Opacity</label>
            <div class="layerbits-editor-slider-group">
              <input type="range" class="layerbits-editor-slider" data-prop="opacity" min="0" max="1" step="0.01" value="${opacity}" />
              <span class="layerbits-editor-slider-value">${Math.round(parseFloat(opacity) * 100)}%</span>
            </div>
          </div>
        </div>
        <div class="layerbits-editor-row">
          <div class="layerbits-editor-field">
            <label>Display</label>
            <select class="layerbits-editor-select" data-prop="display">
              <option value="block" ${computed.display === 'block' ? 'selected' : ''}>Block</option>
              <option value="inline" ${computed.display === 'inline' ? 'selected' : ''}>Inline</option>
              <option value="inline-block" ${computed.display === 'inline-block' ? 'selected' : ''}>Inline-Block</option>
              <option value="flex" ${computed.display === 'flex' ? 'selected' : ''}>Flex</option>
              <option value="grid" ${computed.display === 'grid' ? 'selected' : ''}>Grid</option>
              <option value="none" ${computed.display === 'none' ? 'selected' : ''}>None</option>
            </select>
          </div>
          <div class="layerbits-editor-field">
            <label>Position</label>
            <select class="layerbits-editor-select" data-prop="position">
              <option value="static" ${computed.position === 'static' ? 'selected' : ''}>Static</option>
              <option value="relative" ${computed.position === 'relative' ? 'selected' : ''}>Relative</option>
              <option value="absolute" ${computed.position === 'absolute' ? 'selected' : ''}>Absolute</option>
              <option value="fixed" ${computed.position === 'fixed' ? 'selected' : ''}>Fixed</option>
              <option value="sticky" ${computed.position === 'sticky' ? 'selected' : ''}>Sticky</option>
            </select>
          </div>
        </div>
      </div>
    `;
    
    // Attach event listeners
    attachEditorListeners(target);
  }
  
  function attachEditorListeners(target) {
    if (!target || !state.editorBlockEl) return;
    
    const controlsEl = state.editorBlockEl.querySelector("#layerbits-editor-controls");
    if (!controlsEl) return;
    
    // Number inputs with units
    controlsEl.querySelectorAll('.layerbits-editor-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const prop = e.target.getAttribute('data-prop');
        const unitSelect = controlsEl.querySelector(`.layerbits-editor-unit[data-prop="${prop}"]`);
        const unit = unitSelect ? unitSelect.value : 'px';
        const value = e.target.value;
        
        if (value === '' || value === 'auto') {
          if (prop === 'width' || prop === 'height') {
            applyStyle(target, prop, 'auto');
          }
        } else {
          applyStyle(target, prop, `${value}${unit}`);
        }
      });
    });
    
    // Unit selects
    controlsEl.querySelectorAll('.layerbits-editor-unit').forEach(select => {
      select.addEventListener('change', (e) => {
        const prop = e.target.getAttribute('data-prop');
        const input = controlsEl.querySelector(`.layerbits-editor-input[data-prop="${prop}"]`);
        if (input && input.value) {
          applyStyle(target, prop, `${input.value}${e.target.value}`);
        }
      });
    });
    
    // Color inputs
    controlsEl.querySelectorAll('.layerbits-editor-color').forEach(input => {
      input.addEventListener('input', (e) => {
        const prop = e.target.getAttribute('data-prop');
        const textInput = controlsEl.querySelector(`.layerbits-editor-color-text[data-prop="${prop}"]`);
        applyStyle(target, prop, e.target.value);
        if (textInput) textInput.value = e.target.value;
      });
    });
    
    // Color text inputs
    controlsEl.querySelectorAll('.layerbits-editor-color-text').forEach(input => {
      input.addEventListener('input', (e) => {
        const prop = e.target.getAttribute('data-prop');
        const colorInput = controlsEl.querySelector(`.layerbits-editor-color[data-prop="${prop}"]`);
        const value = e.target.value;
        if (value && /^#?[0-9A-Fa-f]{6}$/.test(value.replace('#', ''))) {
          const hexValue = value.startsWith('#') ? value : `#${value}`;
          applyStyle(target, prop, hexValue);
          if (colorInput) colorInput.value = hexValue;
        }
      });
    });
    
    // Selects
    controlsEl.querySelectorAll('.layerbits-editor-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const prop = e.target.getAttribute('data-prop');
        applyStyle(target, prop, e.target.value);
      });
    });
    
    // Sliders
    controlsEl.querySelectorAll('.layerbits-editor-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const prop = e.target.getAttribute('data-prop');
        const value = e.target.value;
        applyStyle(target, prop, value);
        const valueDisplay = e.target.parentElement.querySelector('.layerbits-editor-slider-value');
        if (valueDisplay) valueDisplay.textContent = `${Math.round(parseFloat(value) * 100)}%`;
      });
    });
  }
  
  function setupInlineEditing() {
    // Debounce timer for live updates
    let debounceTimers = {
      css: null,
      tailwind: null,
      html: null,
      jsx: null
    };
    
    // Helper to get plain text from contenteditable (removes HTML tags)
    const getPlainText = (el) => {
      return el.innerText || el.textContent || '';
    };
    
    // Helper to apply changes with debouncing for performance
    const applyChanges = (type, immediate = false) => {
      const target = state.lockedElement || state.lastElement;
      if (!target) return;
      
      // Clear existing timer
      if (debounceTimers[type]) {
        clearTimeout(debounceTimers[type]);
        debounceTimers[type] = null;
      }
      
      const apply = () => {
        let content = '';
        switch(type) {
          case 'css':
            content = getPlainText(state.cssBlockEl);
            if (content && content.trim()) {
              parseAndApplyCSS(content);
            }
            break;
          case 'tailwind':
            content = getPlainText(state.tailwindBlockEl);
            if (content && content.trim()) {
              parseAndApplyTailwind(content);
            }
            break;
          case 'html':
            content = getPlainText(state.htmlBlockEl);
            if (content && content.trim()) {
              parseAndApplyHTML(content);
            }
            break;
          case 'jsx':
            content = getPlainText(state.jsxBlockEl);
            if (content && content.trim()) {
              parseAndApplyJSX(content);
            }
            break;
        }
      };
      
      // Apply immediately or with debounce (300ms delay)
      if (immediate) {
        apply();
      } else {
        debounceTimers[type] = setTimeout(apply, 300);
      }
    };
    
    // CSS editing - live updates
    if (state.cssBlockEl) {
      state.cssBlockEl.addEventListener('input', () => {
        applyChanges('css');
      });
      
      // Apply on blur for final update
      state.cssBlockEl.addEventListener('blur', () => {
        if (debounceTimers.css) {
          clearTimeout(debounceTimers.css);
          debounceTimers.css = null;
        }
        applyChanges('css', true);
      });
    }
    
    // Tailwind editing - live updates
    if (state.tailwindBlockEl) {
      state.tailwindBlockEl.addEventListener('input', () => {
        applyChanges('tailwind');
      });
      
      state.tailwindBlockEl.addEventListener('blur', () => {
        if (debounceTimers.tailwind) {
          clearTimeout(debounceTimers.tailwind);
          debounceTimers.tailwind = null;
        }
        applyChanges('tailwind', true);
      });
    }
    
    // HTML editing - live updates
    if (state.htmlBlockEl) {
      state.htmlBlockEl.addEventListener('input', () => {
        applyChanges('html');
      });
      
      state.htmlBlockEl.addEventListener('blur', () => {
        if (debounceTimers.html) {
          clearTimeout(debounceTimers.html);
          debounceTimers.html = null;
        }
        applyChanges('html', true);
      });
    }
    
    // JSX editing - live updates
    if (state.jsxBlockEl) {
      state.jsxBlockEl.addEventListener('input', () => {
        applyChanges('jsx');
      });
      
      state.jsxBlockEl.addEventListener('blur', () => {
        if (debounceTimers.jsx) {
          clearTimeout(debounceTimers.jsx);
          debounceTimers.jsx = null;
        }
        applyChanges('jsx', true);
      });
    }
  }
  
  function parseAndApplyCSS(cssText) {
    const target = state.lockedElement || state.lastElement;
    if (!target) return;
    
    // Store original styles if not already stored
    if (state.editedElement !== target) {
      state.originalStyles.clear();
      state.editedElement = target;
      const computed = window.getComputedStyle(target);
      const props = ['width', 'height', 'padding', 'margin', 'background-color', 'color', 
                     'font-size', 'font-weight', 'border', 'border-radius', 'opacity', 
                     'display', 'position', 'text-align', 'justify-content', 'align-items',
                     'flex-direction', 'gap', 'grid-template-columns', 'grid-template-rows'];
      props.forEach(prop => {
        state.originalStyles.set(prop, computed.getPropertyValue(prop));
      });
    }
    
    // Parse CSS text - extract property: value pairs
    // Handle both { property: value; } format and just property: value; format
    let cleanText = cssText.trim();
    
    // Remove outer braces if present
    if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
      cleanText = cleanText.slice(1, -1).trim();
    }
    
    // Split by semicolons and parse each declaration
    const declarations = cleanText.split(';').filter(d => d.trim());
    
    declarations.forEach(decl => {
      const colonIndex = decl.indexOf(':');
      if (colonIndex === -1) return;
      
      const property = decl.substring(0, colonIndex).trim();
      let value = decl.substring(colonIndex + 1).trim();
      
      // Remove comments
      value = value.replace(/\/\*.*?\*\//g, '').trim();
      
      // Apply the style
      if (property && value) {
        console.log('Applying CSS:', property, '=', value);
        applyStyle(target, property, value);
      }
    });
  }
  
  function parseAndApplyTailwind(tailwindText) {
    const target = state.lockedElement || state.lastElement;
    if (!target) return;
    
    // Store original styles if not already stored
    if (state.editedElement !== target) {
      state.originalStyles.clear();
      state.editedElement = target;
      const computed = window.getComputedStyle(target);
      const props = ['width', 'height', 'padding', 'margin', 'background-color', 'color', 
                     'font-size', 'font-weight', 'border', 'border-radius', 'opacity', 
                     'display', 'position', 'text-align', 'justify-content', 'align-items',
                     'flex-direction', 'gap', 'grid-template-columns', 'grid-template-rows'];
      props.forEach(prop => {
        state.originalStyles.set(prop, computed.getPropertyValue(prop));
      });
    }
    
    // Parse Tailwind classes and convert to CSS
    // This is a simplified parser - you can enhance it
    const classes = tailwindText.trim().split(/\s+/);
    
    classes.forEach(cls => {
      if (cls.startsWith('w-') || cls.startsWith('h-')) {
        // Width/Height
        const prop = cls.startsWith('w-') ? 'width' : 'height';
        const value = cls.substring(2);
        if (value === 'auto') {
          applyStyle(target, prop, 'auto');
        } else if (value.match(/^\d+$/)) {
          applyStyle(target, prop, `${parseInt(value) * 0.25}rem`);
        } else if (value.startsWith('[') && value.endsWith(']')) {
          applyStyle(target, prop, value.slice(1, -1));
        }
      } else if (cls.startsWith('p-') || cls.startsWith('m-')) {
        // Padding/Margin
        const prop = cls.startsWith('p-') ? 'padding' : 'margin';
        const value = cls.substring(2);
        if (value.match(/^\d+$/)) {
          applyStyle(target, prop, `${parseInt(value) * 0.25}rem`);
        } else if (value.startsWith('[') && value.endsWith(']')) {
          applyStyle(target, prop, value.slice(1, -1));
        }
      } else if (cls.startsWith('bg-[') || cls.startsWith('text-[')) {
        // Colors
        const prop = cls.startsWith('bg-[') ? 'background-color' : 'color';
        const match = cls.match(/\[([^\]]+)\]/);
        if (match) {
          applyStyle(target, prop, match[1]);
        }
      } else if (cls.startsWith('text-')) {
        // Font size
        const value = cls.substring(5);
        if (value.match(/^(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)$/)) {
          const sizes = { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', 
                         xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem',
                         '5xl': '3rem', '6xl': '3.75rem' };
          applyStyle(target, 'font-size', sizes[value] || '1rem');
        }
      } else if (cls === 'flex') {
        applyStyle(target, 'display', 'flex');
      } else if (cls === 'grid') {
        applyStyle(target, 'display', 'grid');
      } else if (cls.startsWith('rounded')) {
        const value = cls.substring(6);
        if (!value) {
          applyStyle(target, 'border-radius', '0.25rem');
        } else if (value.match(/^\d+$/)) {
          applyStyle(target, 'border-radius', `${parseInt(value) * 0.25}rem`);
        }
      }
      // Add more Tailwind class mappings as needed
    });
  }
  
  function parseAndApplyHTML(htmlText) {
    const target = state.lockedElement || state.lastElement;
    if (!target) return;
    
    try {
      // Create a temporary container to parse the HTML
      const temp = document.createElement('div');
      temp.innerHTML = htmlText.trim();
      
      if (temp.firstElementChild) {
        const newElement = temp.firstElementChild;
        
        // Copy attributes
        Array.from(newElement.attributes).forEach(attr => {
          target.setAttribute(attr.name, attr.value);
        });
        
        // Copy styles from style attribute if present
        if (newElement.hasAttribute('style')) {
          const styleText = newElement.getAttribute('style');
          styleText.split(';').forEach(decl => {
            const [prop, value] = decl.split(':').map(s => s.trim());
            if (prop && value) {
              applyStyle(target, prop, value);
            }
          });
        }
      }
    } catch (e) {
      console.warn('Error parsing HTML:', e);
    }
  }
  
  function parseAndApplyJSX(jsxText) {
    // JSX is similar to HTML, but we need to handle className instead of class
    // For now, treat it like HTML
    parseAndApplyHTML(jsxText.replace(/className=/g, 'class='));
  }
  
  function applyStyle(target, property, value) {
    if (!target) return;
    target.style.setProperty(property, value);
    
    // Regenerate all tabs after style change
    requestAnimationFrame(() => {
      if (target === state.lastElement || target === state.lockedElement) {
        const rawCss = getCleanCSS(target, state.activeState || null);
        let processedCss = convertColorsInString(rawCss, state.colorMode);
        processedCss = convertSizesInString(processedCss, state.sizeMode, target);
        state.currentCssText = processedCss;
        if (state.cssBlockEl && !state.cssBlockEl.matches(':focus')) {
          state.cssBlockEl.innerHTML = renderCssWithColorSwatches(state.currentCssText);
        }
        
        state.currentTailwindText = getTailwindForElement(target);
        if (state.tailwindBlockEl && !state.tailwindBlockEl.matches(':focus')) {
          state.tailwindBlockEl.innerHTML =
            state.currentTailwindText.trim() === "" || state.currentTailwindText.startsWith("/*")
              ? state.currentTailwindText
              : renderTailwindWithColorSwatches(state.currentTailwindText);
        }
        
        state.currentHtmlText = getHtmlSnippet(target);
        if (state.htmlBlockEl && !state.htmlBlockEl.matches(':focus')) {
          const htmlText = state.currentHtmlText || "<!-- No HTML snippet available -->";
          setTimeout(() => {
            if (state.htmlBlockEl && !state.htmlBlockEl.matches(':focus')) {
              try {
                state.htmlBlockEl.innerHTML = renderHtmlWithSyntaxHighlight(htmlText);
              } catch (e) {
                state.htmlBlockEl.innerHTML = escapeHtml(htmlText.substring(0, 10000));
              }
            }
          }, 0);
        }
        
        state.currentJsxText = htmlToJsx(state.currentHtmlText);
        if (state.jsxBlockEl && !state.jsxBlockEl.matches(':focus')) {
          const jsxText = state.currentJsxText || "/* No JSX snippet available */";
          state.jsxBlockEl.innerHTML = renderJsxWithSyntaxHighlight(jsxText);
        }
      }
    });
  }
  
  function resetEditedStyles() {
    if (!state.editedElement || state.originalStyles.size === 0) return;
    
    state.originalStyles.forEach((value, prop) => {
      if (value && value !== 'none' && value !== 'auto') {
        state.editedElement.style.setProperty(prop, value);
      } else {
        state.editedElement.style.removeProperty(prop);
      }
    });
    
    // Update CSS display
    if (state.activeTab === "css") {
      const rawCss = getCleanCSS(state.editedElement, state.activeState || null);
      let processedCss = convertColorsInString(rawCss, state.colorMode);
      processedCss = convertSizesInString(processedCss, state.sizeMode, state.editedElement);
      state.currentCssText = processedCss;
      if (state.cssBlockEl) {
        state.cssBlockEl.innerHTML = renderCssWithColorSwatches(state.currentCssText);
      }
    }
  }
  
  function copyEditedCSS() {
    if (!state.editedElement) return;
    
    const computed = window.getComputedStyle(state.editedElement);
    const props = ['width', 'height', 'padding', 'margin', 'background-color', 'color', 
                   'font-size', 'font-weight', 'border', 'border-radius', 'opacity', 
                   'display', 'position', 'text-align'];
    const lines = [];
    
    props.forEach(prop => {
      const value = computed.getPropertyValue(prop);
      if (value && value !== 'none' && value !== 'auto' && value !== '0px') {
        lines.push(`  ${prop}: ${value};`);
      }
    });
    
    const cssText = `{\n${lines.join('\n')}\n}`;
    navigator.clipboard.writeText(cssText).then(() => {
      const btn = state.panel.querySelector("#layerbits-editor-copy");
      if (btn) {
        const original = btn.textContent;
        btn.textContent = "Copied!";
        btn.style.background = "rgba(1, 255, 219, 0.2)";
        setTimeout(() => {
          btn.textContent = original;
          btn.style.background = "";
        }, 1000);
      }
    });
  }

  // ==================== DOM CREATOR ====================
  function createOverlayElements() {
    if (!state.highlightBox) {
      state.highlightBox = document.createElement("div");
      state.highlightBox.id = "layerbits-highlight-box";
      document.documentElement.appendChild(state.highlightBox);
    }

    if (!state.tooltip) {
      state.tooltip = document.createElement("div");
      state.tooltip.id = "layerbits-tooltip";
      state.tooltip.textContent = "";
      document.documentElement.appendChild(state.tooltip);
    }


    if (!state.measureOverlay) {
      state.measureOverlay = document.createElement("div");
      state.measureOverlay.id = "layerbits-measure-overlay";
      state.measureOverlay.style.position = "fixed";
      state.measureOverlay.style.top = "0";
      state.measureOverlay.style.left = "0";
      state.measureOverlay.style.width = "100%";
      state.measureOverlay.style.height = "100%";
      state.measureOverlay.style.pointerEvents = "none";
      state.measureOverlay.style.zIndex = "9999999998";
      state.measureOverlay.style.display = "none";
      document.documentElement.appendChild(state.measureOverlay);

      // Point A marker (DOM element, not the coordinate)
      const pointAEl = document.createElement("div");
      pointAEl.className = "layerbits-measure-point";
      pointAEl.id = "layerbits-measure-point-a";
      state.measureOverlay.appendChild(pointAEl);

      // Point B marker (DOM element, not the coordinate)
      const pointBEl = document.createElement("div");
      pointBEl.className = "layerbits-measure-point";
      pointBEl.id = "layerbits-measure-point-b";
      state.measureOverlay.appendChild(pointBEl);

      // Line between points
      state.measureLine = document.createElement("div");
      state.measureLine.id = "layerbits-measure-line";
      state.measureOverlay.appendChild(state.measureLine);

      // Distance label
      state.measureLabel = document.createElement("div");
      state.measureLabel.id = "layerbits-measure-label";
      state.measureOverlay.appendChild(state.measureLabel);
    }

    if (!state.panel) {
      state.panel = document.createElement("div");
      state.panel.id = "layerbits-panel";
      state.panel.innerHTML = `
        <div id="layerbits-panel-header" style="cursor: move; user-select: none;">
          <div style="flex: 1; min-width: 0;">
            <div id="layerbits-panel-title">Layerbits</div>
            <div id="layerbits-selector-text"></div>
          </div>
            <button id="layerbits-close-btn" type="button">✕</button>
          </div>
        <div id="layerbits-toolbar">
          <button id="layerbits-toolbar-copy" type="button" class="layerbits-toolbar-btn" title="Copy CSS">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button id="layerbits-toolbar-lock" type="button" class="layerbits-toolbar-btn" title="Lock element">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </button>
          <button id="layerbits-toolbar-eyedropper" type="button" class="layerbits-toolbar-btn" title="Eyedropper tool">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.71 5.63l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-3.12 3.12-1.23-1.21c-.39-.39-1.02-.38-1.41 0-.39.39-.39 1.02 0 1.41l.72.72-8.77 8.77c-.1.1-.15.22-.15.36v4.04c0 .28.22.5.5.5h4.04c.13 0 .26-.05.35-.15l8.77-8.77.72.72c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41l-1.22-1.22 3.12-3.12c.4-.4.4-1.03.01-1.42z"></path>
            </svg>
          </button>
          <button id="layerbits-toolbar-measure" type="button" class="layerbits-toolbar-btn" title="Measure tool (Hold Shift for straight lines)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 3v18M3 21h18"></path>
              <path d="M3 3h18"></path>
              <path d="M5 3v4M8 3v4M11 3v4M14 3v4M17 3v4"></path>
              <path d="M5 15v4M8 15v4M11 15v4M14 15v4M17 15v4"></path>
            </svg>
          </button>
        </div>
        <div id="layerbits-panel-body">
          <div id="layerbits-tabs-row">
            <div id="layerbits-tabs">
              <button id="layerbits-tab-css" class="layerbits-tab-btn active" type="button">CSS</button>
              <button id="layerbits-tab-tailwind" class="layerbits-tab-btn" type="button">Tailwind</button>
              <button id="layerbits-tab-html" class="layerbits-tab-btn" type="button">HTML</button>
              <button id="layerbits-tab-jsx" class="layerbits-tab-btn" type="button">JSX</button>
              <button id="layerbits-tab-accessibility" class="layerbits-tab-btn" type="button">A11y</button>
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
          <div id="layerbits-state-selector" style="padding: 6px 10px; border-bottom: 1px solid rgba(55, 65, 81, 0.9); display: flex; gap: 4px; flex-wrap: wrap;">
            <button type="button" class="layerbits-state-btn active" data-state="" title="Default state">Default</button>
            <button type="button" class="layerbits-state-btn" data-state=":hover" title="Hover state">:hover</button>
            <button type="button" class="layerbits-state-btn" data-state=":active" title="Active state">:active</button>
            <button type="button" class="layerbits-state-btn" data-state=":focus" title="Focus state">:focus</button>
            <button type="button" class="layerbits-state-btn" data-state=":focus-visible" title="Focus-visible state">:focus-visible</button>
            <button type="button" class="layerbits-state-btn" data-state=":focus-within" title="Focus-within state">:focus-within</button>
          </div>
          <pre id="layerbits-css-block" contenteditable="true" spellcheck="false">{ /* hover an element */ }</pre>
          <pre id="layerbits-tailwind-block" contenteditable="true" spellcheck="false" style="display:none;">/* Hover an element to generate Tailwind */</pre>
          <pre id="layerbits-html-block" contenteditable="true" spellcheck="false" style="display:none;">&lt;!-- HTML snippet will appear here --&gt;</pre>
          <pre id="layerbits-jsx-block" contenteditable="true" spellcheck="false" style="display:none;">{/* JSX snippet will appear here */}</pre>
          <div id="layerbits-accessibility-block" style="display:none;">
            <div id="layerbits-a11y-content"></div>
          </div>
        </div>
      `;
      document.documentElement.appendChild(state.panel);
      // Initially hide the panel until we know the enabled state
      state.panel.style.display = "none";

      state.selectorTextEl = state.panel.querySelector("#layerbits-selector-text");
      state.cssBlockEl = state.panel.querySelector("#layerbits-css-block");
      state.tailwindBlockEl = state.panel.querySelector("#layerbits-tailwind-block");
      state.htmlBlockEl = state.panel.querySelector("#layerbits-html-block");
      state.jsxBlockEl = state.panel.querySelector("#layerbits-jsx-block");
      state.copyBtn = state.panel.querySelector("#layerbits-toolbar-copy");
      state.lockBtn = state.panel.querySelector("#layerbits-toolbar-lock");
      state.eyedropperBtn = state.panel.querySelector("#layerbits-toolbar-eyedropper");
      state.measureBtn = state.panel.querySelector("#layerbits-toolbar-measure");
      state.closeBtn = state.panel.querySelector("#layerbits-close-btn");
      state.cssTabBtn = state.panel.querySelector("#layerbits-tab-css");
      state.tailwindTabBtn = state.panel.querySelector("#layerbits-tab-tailwind");
      state.htmlTabBtn = state.panel.querySelector("#layerbits-tab-html");
      state.jsxTabBtn = state.panel.querySelector("#layerbits-tab-jsx");
      state.accessibilityTabBtn = state.panel.querySelector("#layerbits-tab-accessibility");
      state.accessibilityBlockEl = state.panel.querySelector("#layerbits-accessibility-block");
      state.settingsBtn = state.panel.querySelector("#layerbits-settings-btn");
      state.settingsPanel = state.panel.querySelector("#layerbits-settings-panel");
      state.sizeRadioNodes = state.panel.querySelectorAll('input[name="layerbits-panel-size"]');
      state.fontSizeRadioNodes = state.panel.querySelectorAll('input[name="layerbits-font-size"]');
      state.stateSelector = state.panel.querySelector("#layerbits-state-selector");
      
      // Initialize draggable panel
      const panelHeader = state.panel.querySelector("#layerbits-panel-header");
      if (panelHeader) {
        panelHeader.addEventListener('mousedown', (e) => {
          if (e.target.id === 'layerbits-close-btn') return;
          state.isDragging = true;
          const rect = state.panel.getBoundingClientRect();
          state.panelDragOffset.x = e.clientX - rect.left;
          state.panelDragOffset.y = e.clientY - rect.top;
          document.addEventListener('mousemove', handlePanelDrag);
          document.addEventListener('mouseup', stopPanelDrag);
        });
      }
      
      // Initialize state selector buttons
      if (state.stateSelector) {
        const stateButtons = state.stateSelector.querySelectorAll('.layerbits-state-btn');
        stateButtons.forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const stateValue = btn.getAttribute('data-state') || "";
            if (state.activeState === stateValue) {
              // Don't toggle off, just keep it selected
              return;
            } else {
              // Toggle on
              state.activeState = stateValue;
              stateButtons.forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
            }
            // Update the overlay with the new state
            if (state.lastElement || state.lockedElement) {
              const target = state.lockedElement || state.lastElement;
              updateOverlay(target);
            }
          });
        });
      }

      applyPanelSizeClass();
      applyFontSizeClass();
      state.sizeRadioNodes.forEach((node) => {
        node.checked = node.value === state.panelSize;
      });
      state.fontSizeRadioNodes.forEach((node) => {
        node.checked = node.value === state.fontSize;
      });

      state.copyBtn.addEventListener("click", () => {
        let text = "";
        if (state.activeTab === "css") text = state.currentCssText;
        else if (state.activeTab === "tailwind") text = state.currentTailwindText;
        else if (state.activeTab === "html") text = state.currentHtmlText;
        else if (state.activeTab === "jsx") text = state.currentJsxText;

        if (!text || !text.trim()) return;

        navigator.clipboard.writeText(text).then(() => {
          const originalTitle = state.copyBtn.getAttribute('title');
          state.copyBtn.setAttribute('title', 'Copied!');
          state.copyBtn.classList.add('copied');
          setTimeout(() => {
            state.copyBtn.setAttribute('title', originalTitle);
            state.copyBtn.classList.remove('copied');
          }, 800);
        }).catch(() => {
          const originalTitle = state.copyBtn.getAttribute('title');
          state.copyBtn.setAttribute('title', 'Error');
          state.copyBtn.classList.add('error');
          setTimeout(() => {
            state.copyBtn.setAttribute('title', originalTitle);
            state.copyBtn.classList.remove('error');
          }, 800);
        });
      });

      state.lockBtn.addEventListener("click", () => {
        if (!state.isLocked) {
          setLockedState(true, state.lastElement);
        } else {
          setLockedState(false);
        }
      });

      if (state.eyedropperBtn) {
        state.eyedropperBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          console.log("Eyedropper button clicked", { active: state.eyedropperActive });
          if (!state.eyedropperActive) {
            activateEyedropper();
          } else {
            deactivateEyedropper();
          }
        });
      } else {
        console.warn("Eyedropper button not found!");
      }

      if (state.measureBtn) {
        state.measureBtn.addEventListener("click", () => {
          if (!state.measureActive) {
            activateMeasure();
          } else {
            deactivateMeasure();
          }
        });
      }

      state.closeBtn.addEventListener("click", () => {
        state.inspectorEnabled = false;
        applyInspectorState();
      });

      state.cssTabBtn.addEventListener("click", () => setActiveTab("css"));
      state.tailwindTabBtn.addEventListener("click", () => setActiveTab("tailwind"));
      state.htmlTabBtn.addEventListener("click", () => setActiveTab("html"));
      state.jsxTabBtn.addEventListener("click", () => setActiveTab("jsx"));
      if (state.accessibilityTabBtn) {
        state.accessibilityTabBtn.addEventListener("click", () => setActiveTab("accessibility"));
      }
      
      // Add inline editing handlers
      setupInlineEditing();

      state.settingsBtn.addEventListener("click", () => {
        const isVisible = state.settingsPanel.style.display === "block";
        state.settingsPanel.style.display = isVisible ? "none" : "block";
      });

      state.sizeRadioNodes.forEach((node) => {
        node.addEventListener("change", (e) => {
          if (e.target.checked) {
            updatePanelSize(e.target.value);
          }
        });
      });

      state.fontSizeRadioNodes.forEach((node) => {
        node.addEventListener("change", (e) => {
          if (e.target.checked) {
            updateFontSize(e.target.value);
          }
        });
      });
    }

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
        <div class="layerbits-menu-section">
          <div class="layerbits-menu-item has-submenu" id="layerbits-menu-color-sub">
            <span>Color Type Output</span>
            <span class="layerbits-menu-arrow">›</span>
            <div class="layerbits-submenu">
              <label class="layerbits-menu-item"><input type="radio" name="layerbits-color-mode" value="hex" /><span>HEX</span></label>
              <label class="layerbits-menu-item"><input type="radio" name="layerbits-color-mode" value="rgb" /><span>RGB</span></label>
              <label class="layerbits-menu-item"><input type="radio" name="layerbits-color-mode" value="rgba" /><span>RGBA</span></label>
              <label class="layerbits-menu-item"><input type="radio" name="layerbits-color-mode" value="hsl" /><span>HSL</span></label>
              <label class="layerbits-menu-item"><input type="radio" name="layerbits-color-mode" value="hsla" /><span>HSLA</span></label>
            </div>
          </div>
          <div class="layerbits-menu-item has-submenu" id="layerbits-menu-size-sub">
            <span>Size Type Output</span>
            <span class="layerbits-menu-arrow">›</span>
            <div class="layerbits-submenu">
              <label class="layerbits-menu-item"><input type="radio" name="layerbits-size-mode" value="px" /><span>PX</span></label>
              <label class="layerbits-menu-item"><input type="radio" name="layerbits-size-mode" value="em" /><span>EM</span></label>
              <label class="layerbits-menu-item"><input type="radio" name="layerbits-size-mode" value="rem" /><span>REM</span></label>
              <label class="layerbits-menu-item"><input type="radio" name="layerbits-size-mode" value="pt" /><span>PT</span></label>
              <label class="layerbits-menu-item"><input type="radio" name="layerbits-size-mode" value="pc" /><span>PC</span></label>
            </div>
          </div>
          <div class="layerbits-menu-item has-submenu" id="layerbits-menu-layout-sub">
            <span>Layout grids</span>
            <span class="layerbits-menu-arrow">›</span>
            <div class="layerbits-submenu">
              <div class="layerbits-menu-item toggleable" id="layerbits-menu-show-flex">Show Flexbox Grid</div>
              <div class="layerbits-menu-item toggleable" id="layerbits-menu-show-cssgrid">Show CSS Grid</div>
            </div>
          </div>
        </div>
      `;
      document.documentElement.appendChild(state.contextMenuEl);

      state.lockCheckboxEl = state.contextMenuEl.querySelector("#layerbits-menu-lock-checkbox");
      state.colorModeRadioEls = state.contextMenuEl.querySelectorAll('input[name="layerbits-color-mode"]');
      state.sizeModeRadioEls = state.contextMenuEl.querySelectorAll('input[name="layerbits-size-mode"]');

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
          // Also listen for click to ensure it works
          radio.addEventListener("click", (e) => {
            setColorMode(e.target.value);
          });
        });
      }

      if (state.sizeModeRadioEls && state.sizeModeRadioEls.length) {
        state.sizeModeRadioEls.forEach((radio) => {
          radio.addEventListener("change", (e) => {
            if (e.target.checked) {
              setSizeMode(e.target.value);
            }
          });
          radio.addEventListener("click", (e) => {
            setSizeMode(e.target.value);
          });
        });
      }

      const flexItem = state.contextMenuEl.querySelector('#layerbits-menu-show-flex');
      const gridItem = state.contextMenuEl.querySelector('#layerbits-menu-show-cssgrid');
      if (flexItem) {
        flexItem.addEventListener('click', () => {
          toggleFlexOverlay();
          syncMenuState();
        });
      }
      if (gridItem) {
        gridItem.addEventListener('click', () => {
          toggleCssGridOverlay();
          syncMenuState();
        });
      }
    }
  }

  // ==================== EVENT HANDLERS ====================
  function initEvents() {
    document.addEventListener("mouseover", (event) => {
      if (!state.inspectorEnabled || state.isLocked) return;
      if (state.eyedropperActive) return; // suppress normal inspection while eyedropper active
      if (state.measureActive) return; // suppress normal inspection while measure active
      const target = event.target;
      if (isOurElement(target)) return;
      if (target === state.lastElement) return;
      state.lastElement = target;
      updateOverlay(target);
    }, true);

    document.addEventListener("mouseout", (event) => {
      if (!state.inspectorEnabled || state.isLocked) return;
      if (state.contextMenuOpen) return;
      if (event.target === state.lastElement) {
        state.lastElement = null;
        clearOverlay();
      }
    }, true);

    document.addEventListener("click", (event) => {
      if (!state.inspectorEnabled) return;
      if (isOurElement(event.target)) return;
      if (state.measureActive) {
        handleMeasureClick(event);
        return;
      }
      if (state.isLocked) return;
      event.stopPropagation();
      event.preventDefault();
      const target = event.target;
      state.lastElement = target;
      updateOverlay(target);
    }, true);

    document.addEventListener("contextmenu", (event) => {
      if (!state.inspectorEnabled) return;
      if (isOurElement(event.target)) return;
      event.preventDefault();
      state.lastRightClickedElement = event.target;
      state.lastElement = event.target;
      updateOverlay(event.target);
      syncMenuState();
      showContextMenu(event.clientX, event.clientY);
    }, true);

    document.addEventListener("mousemove", (e) => {
      if (!state.inspectorEnabled) return;
    }, true);

    document.addEventListener("mousedown", (e) => {
      if (state.contextMenuEl && state.contextMenuEl.style.display === "block") {
        if (!state.contextMenuEl.contains(e.target)) {
          hideContextMenu();
        }
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        hideContextMenu();
        if (state.eyedropperActive) {
          deactivateEyedropper();
        }
        if (state.measureActive) {
          deactivateMeasure();
        }
      }
    });

    const updateLockedHighlight = () => {
      if (state.isLocked && state.lockedElement) {
        const rect = state.lockedElement.getBoundingClientRect();
        if (state.highlightBox) {
          state.highlightBox.style.top = `${rect.top}px`;
          state.highlightBox.style.left = `${rect.left}px`;
          state.highlightBox.style.width = `${rect.width}px`;
          state.highlightBox.style.height = `${rect.height}px`;
        }
        updateGridOverlays(state.lockedElement);
      }
    };

    window.addEventListener("scroll", updateLockedHighlight, true);
    window.addEventListener("resize", updateLockedHighlight);
  }

  function initMessaging() {
    if (!chrome || !chrome.runtime || !chrome.runtime.onMessage) return;

    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "LAYERBITS_TOGGLE") {
        state.inspectorEnabled = !!message.enabled;
        applyInspectorState();
        if (!state.inspectorEnabled) {
          hideContextMenu();
        }
      }
    });
  }

  // ==================== INITIALIZATION ====================
  function init() {
    createOverlayElements();
    initEvents();
    initMessaging();

    // Fetch color/size preferences only (no global enable)
    if (chrome?.storage?.sync) {
      chrome.storage.sync.get(["layerbitsColorMode", "layerbitsPanelSize", "layerbitsFontSize", "layerbitsSizeMode"], (result) => {
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
        const storedSizeMode = result.layerbitsSizeMode;
        if (storedSizeMode && ["px", "em", "rem", "pt", "pc"].includes(storedSizeMode)) {
          state.sizeMode = storedSizeMode;
        }
        applyPanelSizeClass();
        applyFontSizeClass();
        syncMenuState();
      });
    }

    // Query background for per-tab enabled state
    let inspectorStateReceived = false;
    const enableTimeout = setTimeout(() => {
      // If we haven't received a response after 500ms, enable by default
      if (!inspectorStateReceived) {
        state.inspectorEnabled = true;
        applyInspectorState();
      }
    }, 500);
    
    if (chrome?.runtime?.sendMessage) {
      try {
        chrome.runtime.sendMessage({ type: 'LAYERBITS_GET_ENABLED' }, (resp) => {
          inspectorStateReceived = true;
          clearTimeout(enableTimeout);
          
          // Check for runtime errors
          if (chrome.runtime.lastError) {
            // Connection error - enable by default
            state.inspectorEnabled = true;
            applyInspectorState();
            return;
          }
          
          // Default to true if no response or if enabled is undefined
          state.inspectorEnabled = resp?.enabled !== undefined ? !!resp.enabled : true;
      applyInspectorState();
    });
      } catch (err) {
        // If sendMessage throws, enable by default
        inspectorStateReceived = true;
        clearTimeout(enableTimeout);
        state.inspectorEnabled = true;
        applyInspectorState();
      }
    } else {
      // Fallback: if chrome.runtime is not available, enable by default
      clearTimeout(enableTimeout);
      inspectorStateReceived = true;
      state.inspectorEnabled = true;
      applyInspectorState();
    }
  }

  // ==================== ACCESSIBILITY CHECKER ====================
  function runAccessibilityCheck() {
    state.accessibilityIssues = [];
    
    // Run all checks
    checkAltText();
    checkAriaRoles();
    checkHeadingStructure();
    checkColorContrast();
    checkLinkButtonAccessibility();
    checkFormAccessibility();
    checkKeyboardNavigation();
    checkSemanticHTML();
    
    // Render the results
    renderAccessibilityResults();
  }
  
  function checkAltText() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (isOurElement(img)) return;
      const alt = img.getAttribute('alt');
      const selector = getSelectorForElement(img);
      
      if (!alt || alt.trim() === '') {
        state.accessibilityIssues.push({
          category: 'Alt Text Coverage',
          severity: 'error',
          element: img,
          selector: selector,
          message: 'Image missing alt text',
          recommendation: 'Add descriptive alt text to all images for screen reader users.',
          codeSnippet: `<img src="${img.src}" alt="Description of image content" />`
        });
      } else if (alt.length < 3) {
        state.accessibilityIssues.push({
          category: 'Alt Text Coverage',
          severity: 'warning',
          element: img,
          selector: selector,
          message: 'Alt text is too short or may be placeholder text',
          recommendation: 'Ensure alt text is descriptive and meaningful, not just placeholder text.',
          codeSnippet: `<img src="${img.src}" alt="Detailed description of image content" />`
        });
      }
    });
  }
  
  function checkAriaRoles() {
    // Check for missing ARIA labels on interactive elements
    const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="link"]');
    interactiveElements.forEach(el => {
      if (isOurElement(el)) return;
      const hasLabel = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || 
                       (el.tagName === 'BUTTON' && el.textContent.trim()) ||
                       (el.tagName === 'A' && (el.textContent.trim() || el.getAttribute('title'))) ||
                       (el.tagName === 'INPUT' && (el.getAttribute('placeholder') || document.querySelector(`label[for="${el.id}"]`)));
      
      if (!hasLabel) {
        const selector = getSelectorForElement(el);
        state.accessibilityIssues.push({
          category: 'ARIA Roles & Landmarks',
          severity: 'warning',
          element: el,
          selector: selector,
          message: `${el.tagName.toLowerCase()} element missing accessible label`,
          recommendation: 'Add aria-label, aria-labelledby, or ensure element has visible text content.',
          codeSnippet: `<${el.tagName.toLowerCase()} aria-label="Descriptive label">${el.textContent || ''}</${el.tagName.toLowerCase()}>`
        });
      }
    });
    
    // Check for landmarks
    const landmarks = document.querySelectorAll('[role="banner"], [role="navigation"], [role="main"], [role="contentinfo"], header, nav, main, footer');
    if (landmarks.length === 0) {
      state.accessibilityIssues.push({
        category: 'ARIA Roles & Landmarks',
        severity: 'info',
        element: document.body,
        selector: 'body',
        message: 'No ARIA landmarks or semantic HTML5 landmarks found',
        recommendation: 'Add ARIA landmarks (role="main", role="navigation", etc.) or use semantic HTML5 elements (header, nav, main, footer).',
        codeSnippet: '<main role="main">...</main>'
      });
    }
  }
  
  function checkHeadingStructure() {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).filter(h => !isOurElement(h));
    if (headings.length === 0) {
      state.accessibilityIssues.push({
        category: 'Heading Structure',
        severity: 'warning',
        element: document.body,
        selector: 'body',
        message: 'No heading elements found on the page',
        recommendation: 'Add heading elements (h1-h6) to create a logical document structure.',
        codeSnippet: '<h1>Main Page Title</h1>'
      });
      return;
    }
    
    let previousLevel = 0;
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      const selector = getSelectorForElement(heading);
      
      if (index === 0 && level !== 1) {
        state.accessibilityIssues.push({
          category: 'Heading Structure',
          severity: 'warning',
          element: heading,
          selector: selector,
          message: 'First heading should be h1',
          recommendation: 'The first heading on the page should be an h1 element.',
          codeSnippet: `<h1>${heading.textContent}</h1>`
        });
      }
      
      if (level > previousLevel + 1 && previousLevel > 0) {
        state.accessibilityIssues.push({
          category: 'Heading Structure',
          severity: 'warning',
          element: heading,
          selector: selector,
          message: `Heading level skipped from h${previousLevel} to h${level}`,
          recommendation: 'Headings should be nested in order (h1, h2, h3, etc.) without skipping levels.',
          codeSnippet: `<h${previousLevel + 1}>${heading.textContent}</h${previousLevel + 1}>`
        });
      }
      
      previousLevel = level;
    });
  }
  
  function checkColorContrast() {
    const textElements = Array.from(document.querySelectorAll('p, span, div, a, button, label, li, td, th')).filter(el => {
      if (isOurElement(el)) return false;
      const text = el.textContent.trim();
      const style = window.getComputedStyle(el);
      return text.length > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });
    
    textElements.slice(0, 100).forEach(el => { // Limit to first 100 to avoid performance issues
      const style = window.getComputedStyle(el);
      const color = style.color;
      let bgColor = style.backgroundColor;
      
      // Get actual background color by checking parent
      if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
        let parent = el.parentElement;
        while (parent && (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent')) {
          const parentStyle = window.getComputedStyle(parent);
          bgColor = parentStyle.backgroundColor;
          parent = parent.parentElement;
        }
      }
      
      if (color && bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
        const contrast = getContrastRatio(color, bgColor);
        if (contrast < 4.5) {
          const selector = getSelectorForElement(el);
          state.accessibilityIssues.push({
            category: 'Color Contrast',
            severity: contrast < 3 ? 'error' : 'warning',
            element: el,
            selector: selector,
            message: `Low color contrast ratio: ${contrast.toFixed(2)}:1 (minimum 4.5:1 required)`,
            recommendation: 'Increase the contrast between text and background colors to meet WCAG AA standards.',
            codeSnippet: `color: ${getContrastColor(bgColor)}; background-color: ${bgColor};`
          });
        }
      }
    });
  }
  
  function checkLinkButtonAccessibility() {
    // Check links without href
    const links = document.querySelectorAll('a');
    links.forEach(link => {
      if (isOurElement(link)) return;
      if (!link.href && !link.getAttribute('role') && link.getAttribute('href') !== '#') {
        const selector = getSelectorForElement(link);
        state.accessibilityIssues.push({
          category: 'Link & Button Accessibility',
          severity: 'error',
          element: link,
          selector: selector,
          message: 'Link element missing href attribute',
          recommendation: 'Add href attribute or use button element for non-navigation actions.',
          codeSnippet: link.textContent ? `<a href="#target">${link.textContent}</a>` : '<button>Action</button>'
        });
      }
    });
    
    // Check buttons without accessible names
    const buttons = document.querySelectorAll('button, [role="button"]');
    buttons.forEach(btn => {
      if (isOurElement(btn)) return;
      const hasName = btn.textContent.trim() || btn.getAttribute('aria-label') || btn.getAttribute('aria-labelledby');
      if (!hasName) {
        const selector = getSelectorForElement(btn);
        state.accessibilityIssues.push({
          category: 'Link & Button Accessibility',
          severity: 'error',
          element: btn,
          selector: selector,
          message: 'Button missing accessible name',
          recommendation: 'Add text content, aria-label, or aria-labelledby to button.',
          codeSnippet: '<button aria-label="Close dialog">×</button>'
        });
      }
    });
  }
  
  function checkFormAccessibility() {
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (isOurElement(input)) return;
      
      const id = input.id;
      const name = input.name;
      const type = input.type;
      const hasLabel = id && document.querySelector(`label[for="${id}"]`) || 
                       input.closest('label') ||
                       input.getAttribute('aria-label') ||
                       input.getAttribute('aria-labelledby');
      
      if (!hasLabel && type !== 'hidden' && type !== 'submit' && type !== 'button' && type !== 'reset') {
        const selector = getSelectorForElement(input);
        state.accessibilityIssues.push({
          category: 'Form Accessibility',
          severity: 'error',
          element: input,
          selector: selector,
          message: `Form ${input.tagName.toLowerCase()} missing label`,
          recommendation: 'Associate form controls with labels using for/id attributes or aria-label.',
          codeSnippet: `<label for="${id || 'input-id'}">Label text</label>\n<input type="${type}" id="${id || 'input-id'}" name="${name || ''}" />`
        });
      }
      
      // Check required fields
      if (input.hasAttribute('required') && !input.getAttribute('aria-required')) {
        const selector = getSelectorForElement(input);
        state.accessibilityIssues.push({
          category: 'Form Accessibility',
          severity: 'warning',
          element: input,
          selector: selector,
          message: 'Required field missing aria-required attribute',
          recommendation: 'Add aria-required="true" for better screen reader support.',
          codeSnippet: `<input type="${type}" required aria-required="true" />`
        });
      }
    });
  }
  
  function checkKeyboardNavigation() {
    const focusableElements = document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]');
    focusableElements.forEach(el => {
      if (isOurElement(el)) return;
      
      const tabindex = el.getAttribute('tabindex');
      const style = window.getComputedStyle(el);
      
      if (tabindex === '-1' && el.offsetParent !== null) {
        const selector = getSelectorForElement(el);
        state.accessibilityIssues.push({
          category: 'Keyboard Navigation',
          severity: 'warning',
          element: el,
          selector: selector,
          message: 'Element with tabindex="-1" is visible but not keyboard accessible',
          recommendation: 'Remove tabindex="-1" or ensure element is properly hidden if it should not be focusable.',
          codeSnippet: el.outerHTML.replace(' tabindex="-1"', '')
        });
      }
      
      if (tabindex && parseInt(tabindex) > 0) {
        const selector = getSelectorForElement(el);
        state.accessibilityIssues.push({
          category: 'Keyboard Navigation',
          severity: 'warning',
          element: el,
          selector: selector,
          message: 'Positive tabindex value can disrupt natural tab order',
          recommendation: 'Avoid positive tabindex values. Use natural DOM order or tabindex="0" for custom elements.',
          codeSnippet: el.outerHTML.replace(/ tabindex="\d+"/, '')
        });
      }
    });
  }
  
  function checkSemanticHTML() {
    // Check for div/span used instead of semantic elements
    const divs = document.querySelectorAll('div[role], div.button, div.link');
    divs.forEach(div => {
      if (isOurElement(div)) return;
      const role = div.getAttribute('role');
      const hasClick = div.onclick || div.getAttribute('onclick') || div.querySelector('[onclick]');
      const selector = getSelectorForElement(div);
      
      if (role === 'button' && hasClick) {
        state.accessibilityIssues.push({
          category: 'Semantic HTML Issues',
          severity: 'warning',
          element: div,
          selector: selector,
          message: 'div with role="button" should use button element',
          recommendation: 'Use semantic button element instead of div with role="button".',
          codeSnippet: `<button>${div.textContent}</button>`
        });
      }
    });
    
    // Check for table without proper structure
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
      if (isOurElement(table)) return;
      const hasHeader = table.querySelector('thead, th');
      if (!hasHeader) {
        const selector = getSelectorForElement(table);
        state.accessibilityIssues.push({
          category: 'Semantic HTML Issues',
          severity: 'warning',
          element: table,
          selector: selector,
          message: 'Table missing header row',
          recommendation: 'Add thead or th elements to provide table headers.',
          codeSnippet: '<table><thead><tr><th>Header</th></tr></thead><tbody>...</tbody></table>'
        });
      }
    });
  }
  
  function getContrastRatio(color1, color2) {
    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (lighter + 0.05) / (darker + 0.05);
  }
  
  function getLuminance(color) {
    const rgb = parseColorToRgb(color);
    if (!rgb) return 0;
    const [r, g, b] = rgb.map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  
  function parseColorToRgb(color) {
    if (!color) return null;
    if (color.startsWith('rgb')) {
      const match = color.match(/(\d+),\s*(\d+),\s*(\d+)/);
      return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : null;
    }
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      if (hex.length === 3) {
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        return [r, g, b];
      }
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return [r, g, b];
      }
    }
    return null;
  }
  
  function getContrastColor(bgColor) {
    const rgb = parseColorToRgb(bgColor);
    if (!rgb) return '#000000';
    const luminance = getLuminance(bgColor);
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
  
  function renderAccessibilityResults() {
    if (!state.accessibilityBlockEl) return;
    
    const contentEl = state.accessibilityBlockEl.querySelector("#layerbits-a11y-content");
    if (!contentEl) return;
    
    // Group issues by category
    const issuesByCategory = {};
    state.accessibilityIssues.forEach(issue => {
      if (!issuesByCategory[issue.category]) {
        issuesByCategory[issue.category] = [];
      }
      issuesByCategory[issue.category].push(issue);
    });
    
    const categories = [
      'Alt Text Coverage',
      'ARIA Roles & Landmarks',
      'Heading Structure',
      'Color Contrast',
      'Link & Button Accessibility',
      'Form Accessibility',
      'Keyboard Navigation',
      'Semantic HTML Issues'
    ];
    
    let html = '';
    
    categories.forEach(category => {
      const issues = issuesByCategory[category] || [];
      const count = issues.length;
      const errorCount = issues.filter(i => i.severity === 'error').length;
      const warningCount = issues.filter(i => i.severity === 'warning').length;
      const infoCount = issues.filter(i => i.severity === 'info').length;
      
      html += `
        <div class="layerbits-a11y-category" data-category="${category}">
          <div class="layerbits-a11y-category-header">
            <h3>${category}</h3>
            <span class="layerbits-a11y-count">${count} issue${count !== 1 ? 's' : ''}</span>
          </div>
          ${count > 0 ? `
            <div class="layerbits-a11y-severity-badges">
              ${errorCount > 0 ? `<span class="layerbits-a11y-badge error">${errorCount} Error${errorCount !== 1 ? 's' : ''}</span>` : ''}
              ${warningCount > 0 ? `<span class="layerbits-a11y-badge warning">${warningCount} Warning${warningCount !== 1 ? 's' : ''}</span>` : ''}
              ${infoCount > 0 ? `<span class="layerbits-a11y-badge info">${infoCount} Info</span>` : ''}
            </div>
            <div class="layerbits-a11y-issues">
              ${issues.map((issue, idx) => `
                <div class="layerbits-a11y-issue ${issue.severity}" data-issue-index="${idx}" data-category="${category}">
                  <div class="layerbits-a11y-issue-header">
                    <span class="layerbits-a11y-severity-indicator ${issue.severity}"></span>
                    <span class="layerbits-a11y-issue-message">${escapeHtml(issue.message)}</span>
                    <button class="layerbits-a11y-copy-selector" data-selector="${escapeHtml(issue.selector)}" title="Copy selector">📋</button>
                  </div>
                  <div class="layerbits-a11y-issue-details" style="display: none;">
                    <div class="layerbits-a11y-recommendation">
                      <strong>Recommendation:</strong> ${escapeHtml(issue.recommendation)}
                    </div>
                    <div class="layerbits-a11y-code">
                      <strong>Fix:</strong>
                      <pre><code>${escapeHtml(issue.codeSnippet)}</code></pre>
                      <button class="layerbits-a11y-copy-code" data-code="${escapeHtml(issue.codeSnippet)}">Copy Code</button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="layerbits-a11y-success">✓ No issues found</div>
          `}
        </div>
      `;
    });
    
    contentEl.innerHTML = html;
    
    // Attach event listeners
    contentEl.querySelectorAll('.layerbits-a11y-issue').forEach(issueEl => {
      issueEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('layerbits-a11y-copy-selector') || 
            e.target.classList.contains('layerbits-a11y-copy-code')) {
          return;
        }
        
        const idx = parseInt(issueEl.dataset.issueIndex);
        const category = issueEl.dataset.category;
        const issue = issuesByCategory[category][idx];
        
        if (issue && issue.element) {
          highlightAccessibilityIssue(issue.element);
          const detailsEl = issueEl.querySelector('.layerbits-a11y-issue-details');
          if (detailsEl) {
            detailsEl.style.display = detailsEl.style.display === 'none' ? 'block' : 'none';
          }
        }
      });
    });
    
    contentEl.querySelectorAll('.layerbits-a11y-copy-selector').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const selector = btn.dataset.selector;
        navigator.clipboard.writeText(selector).then(() => {
          btn.textContent = '✓';
          setTimeout(() => btn.textContent = '📋', 2000);
        });
      });
    });
    
    contentEl.querySelectorAll('.layerbits-a11y-copy-code').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const code = btn.dataset.code;
        navigator.clipboard.writeText(code).then(() => {
          btn.textContent = 'Copied!';
          setTimeout(() => btn.textContent = 'Copy Code', 2000);
        });
      });
    });
  }
  
  function highlightAccessibilityIssue(element) {
    if (!element || !state.highlightBox) return;
    
    const rect = element.getBoundingClientRect();
    state.highlightBox.style.display = "block";
    state.highlightBox.style.top = `${rect.top}px`;
    state.highlightBox.style.left = `${rect.left}px`;
    state.highlightBox.style.width = `${rect.width}px`;
    state.highlightBox.style.height = `${rect.height}px`;
    
    // Scroll element into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (!window.__layerbits_initialized__) {
    window.__layerbits_initialized__ = true;
    init();
  }
})();
