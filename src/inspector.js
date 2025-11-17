// Element inspection logic
import { state } from "./state.js";
import { getSelectorForElement, getCleanCSS, renderCssWithColorSwatches, renderTailwindWithColorSwatches } from "./cssExtractor.js";
import { getTailwindForElement } from "./tailwindGenerator.js";
import { getHtmlSnippet, htmlToJsx } from "./htmlJsxExporter.js";
import { convertColorsInString } from "./colorUtils.js";

export function updateOverlay(target) {
  if (!target || !state.highlightBox || !state.tooltip) return;

  const rect = target.getBoundingClientRect();
  state.highlightBox.style.display = "block";
  state.highlightBox.style.top = `${rect.top + window.scrollY}px`;
  state.highlightBox.style.left = `${rect.left + window.scrollX}px`;
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

  const rawCss = getCleanCSS(target);
  state.currentCssText = convertColorsInString(rawCss, state.colorMode);
  if (state.cssBlockEl) {
    state.cssBlockEl.innerHTML = renderCssWithColorSwatches(state.currentCssText);
  }

  state.currentTailwindText = getTailwindForElement(target, state.colorMode);
  if (state.tailwindBlockEl) {
    state.tailwindBlockEl.innerHTML =
      state.currentTailwindText.trim() === "" || state.currentTailwindText.startsWith("/*")
        ? state.currentTailwindText
        : renderTailwindWithColorSwatches(state.currentTailwindText);
  }

  state.currentHtmlText = getHtmlSnippet(target);
  if (state.htmlBlockEl) {
    state.htmlBlockEl.textContent = state.currentHtmlText || "<!-- No HTML snippet available -->";
  }

  state.currentJsxText = htmlToJsx(state.currentHtmlText);
  if (state.jsxBlockEl) {
    state.jsxBlockEl.textContent = state.currentJsxText || "/* No JSX snippet available */";
  }
}
