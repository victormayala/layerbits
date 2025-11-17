// Tailwind CSS class generation
import { convertSingleColor } from "./colorUtils.js";

export function parsePx(value) {
  const match = value.match(/^([\d.]+)px$/);
  return match ? parseFloat(match[1]) : null;
}

export function pxToTwUnit(value) {
  const px = parsePx(value);
  if (px === null) return null;
  const rem = px / 16;
  const unit = rem * 4;
  if (Number.isInteger(unit)) return unit;
  return null;
}

export function mapFontWeight(weight) {
  const map = {
    "100": "font-thin",
    "200": "font-extralight",
    "300": "font-light",
    "400": "font-normal",
    "500": "font-medium",
    "600": "font-semibold",
    "700": "font-bold",
    "800": "font-extrabold",
    "900": "font-black"
  };
  return map[weight] || null;
}

export function mapFontSize(value) {
  const map = {
    "12px": "text-xs",
    "14px": "text-sm",
    "16px": "text-base",
    "18px": "text-lg",
    "20px": "text-xl",
    "24px": "text-2xl",
    "30px": "text-3xl",
    "36px": "text-4xl",
    "48px": "text-5xl",
    "60px": "text-6xl",
    "72px": "text-7xl",
    "96px": "text-8xl",
    "128px": "text-9xl"
  };
  return map[value] || `text-[${value}]`;
}

export function mapLineHeight(value) {
  const map = {
    "1": "leading-none",
    "1.25": "leading-tight",
    "1.375": "leading-snug",
    "1.5": "leading-normal",
    "1.625": "leading-relaxed",
    "2": "leading-loose"
  };
  const num = parseFloat(value);
  if (!isNaN(num)) {
    const closest = Object.keys(map)
      .map(parseFloat)
      .reduce((prev, curr) => (Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev));
    return map[closest.toString()];
  }
  return `leading-[${value}]`;
}

export function mapTextAlign(value) {
  const map = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
    justify: "text-justify",
    start: "text-start",
    end: "text-end"
  };
  return map[value] || null;
}

export function mapTextTransform(value) {
  const map = {
    uppercase: "uppercase",
    lowercase: "lowercase",
    capitalize: "capitalize",
    none: "normal-case"
  };
  return map[value] || null;
}

export function mapDisplay(value) {
  const map = {
    block: "block",
    "inline-block": "inline-block",
    inline: "inline",
    flex: "flex",
    "inline-flex": "inline-flex",
    grid: "grid",
    "inline-grid": "inline-grid",
    hidden: "hidden",
    none: "hidden"
  };
  return map[value] || null;
}

export function mapFlexDirection(value) {
  const map = {
    row: "flex-row",
    "row-reverse": "flex-row-reverse",
    column: "flex-col",
    "column-reverse": "flex-col-reverse"
  };
  return map[value] || null;
}

export function mapJustifyContent(value) {
  const map = {
    "flex-start": "justify-start",
    "flex-end": "justify-end",
    center: "justify-center",
    "space-between": "justify-between",
    "space-around": "justify-around",
    "space-evenly": "justify-evenly"
  };
  return map[value] || null;
}

export function mapAlignItems(value) {
  const map = {
    "flex-start": "items-start",
    "flex-end": "items-end",
    center: "items-center",
    baseline: "items-baseline",
    stretch: "items-stretch"
  };
  return map[value] || null;
}

export function mapGap(rowGap, colGap) {
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

export function mapSize(value, prefix) {
  if (!value || value === "auto") return null;
  const u = pxToTwUnit(value);
  return u !== null ? `${prefix}-${u}` : `${prefix}-[${value}]`;
}

export function mapGridTemplate(template, prefix) {
  if (!template || template === "none") return null;
  const parts = template.split(" ");
  if (parts.length === 1) return `${prefix}-1`;
  return `${prefix}-${parts.length}`;
}

export function mapColor(value, prefix) {
  if (!value || value === "rgba(0, 0, 0, 0)") return null;
  return `${prefix}-[${value}]`;
}

export function mapBoxShadow(value) {
  if (!value || value === "none") return null;
  return "shadow";
}

export function mapOpacity(value) {
  if (!value) return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  const percent = Math.round(num * 100);
  if (percent === 100) return null;
  return `opacity-${percent}`;
}

export function getTailwindForElement(target, colorMode = "hex") {
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

  const color = convertSingleColor(computed.color, colorMode);
  const colorCls = mapColor(color, "text");
  if (colorCls) classes.push(colorCls);

  const bg = convertSingleColor(computed.backgroundColor, colorMode);
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

  return classes.length > 0 ? classes.join(" ") : "/* No Tailwind classes generated */";
}
