// Color parsing and conversion utilities

export function parseColor(str) {
  if (!str || str === "none" || str === "transparent") return null;

  // hex
  const hexMatch = str.match(/^#([0-9a-fA-F]{3,8})$/);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
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

  // rgb / rgba
  const rgbMatch = str.match(
    /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/
  );
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1;
    return { r, g, b, a };
  }

  // hsl / hsla
  const hslMatch = str.match(
    /hsla?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+))?\s*\)/
  );
  if (hslMatch) {
    let h = parseFloat(hslMatch[1]);
    let s = parseFloat(hslMatch[2]);
    let l = parseFloat(hslMatch[3]);
    const alpha = hslMatch[4] ? parseFloat(hslMatch[4]) : 1;

    h = h / 360;
    s = s / 100;
    l = l / 100;

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

export function rgbaToHex({ r, g, b, a }) {
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

export function rgbaToRgbString({ r, g, b }) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

export function rgbaToRgbaString({ r, g, b, a }) {
  const alpha = Math.round(a * 100) / 100;
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
}

export function rgbaToHsl({ r, g, b, a }) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

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

export function hslToString({ h, s, l }) {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

export function hslaToString({ h, s, l, a }) {
  const alpha = Math.round(a * 100) / 100;
  return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
}

export function convertSingleColor(value, mode) {
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

export function convertColorsInString(str, mode) {
  return str.replace(
    /#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)/gi,
    (match) => convertSingleColor(match, mode)
  );
}
