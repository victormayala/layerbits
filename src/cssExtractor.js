// CSS extraction and processing
import { convertColorsInString } from "./colorUtils.js";

export function getSelectorForElement(target) {
  if (!target) return "";
  if (target.id) return `#${target.id}`;
  if (target.className && typeof target.className === "string") {
    return `.${target.className.split(" ")[0]}`;
  }
  return target.tagName ? target.tagName.toLowerCase() : "";
}

export function getCleanCSS(target) {
  if (!target) return "{ /* no element selected */ }";
  const computed = window.getComputedStyle(target);

  const props = [
    "display",
    "position",
    "flex-direction",
    "justify-content",
    "align-items",
    "gap",
    "grid-template-columns",
    "grid-template-rows",
    "width",
    "height",
    "max-width",
    "max-height",
    "padding",
    "margin",
    "color",
    "background-color",
    "font-family",
    "font-size",
    "font-weight",
    "line-height",
    "text-align",
    "text-transform",
    "border",
    "border-radius",
    "box-shadow",
    "opacity"
  ];

  const lines = [];
  for (const prop of props) {
    const val = computed.getPropertyValue(prop);
    if (!val || val === "none" || val === "normal" || val === "0px") continue;
    lines.push(`  ${prop}: ${val};`);
  }

  return `{\n${lines.join("\n")}\n}`;
}

export function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderCssWithColorSwatches(text) {
  const colorRegex = /#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)/gi;
  return escapeHtml(text).replace(colorRegex, (color) => {
    return `<span class="color-swatch" style="background:${color}"></span>${escapeHtml(
      color
    )}`;
  });
}

export function renderTailwindWithColorSwatches(text) {
  const regex = /\[([^\]]+)\]/g;
  return escapeHtml(text).replace(regex, (match, color) => {
    if (
      color.startsWith("#") ||
      color.startsWith("rgb") ||
      color.startsWith("hsl")
    ) {
      return `[<span class="color-swatch" style="background:${color}"></span>${escapeHtml(
        color
      )}]`;
    }
    return escapeHtml(match);
  });
}
