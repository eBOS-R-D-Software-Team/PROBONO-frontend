// src/utils/colormaps.js
export function clamp(v, a = 0, b = 1) {
  return Math.max(a, Math.min(b, v));
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
}

export function makeGradient(stops) {
  // stops: [{ pos:0..1, color:"#rrggbb" }, ...] (sorted)
  const parsed = stops.map((s) => ({ pos: s.pos, rgb: hexToRgb(s.color) }));

  return function (t) {
    t = clamp(t, 0, 1);
    let i = 0;
    while (i < parsed.length - 1 && t > parsed[i + 1].pos) i++;
    const a = parsed[i], b = parsed[Math.min(i + 1, parsed.length - 1)];
    const span = (b.pos - a.pos) || 1e-9;
    
    // 1. Calculate linear progress
    let x = clamp((t - a.pos) / span, 0, 1);
    const u = x * x * x * (x * (x * 6 - 15) + 10);

    const r = Math.round(a.rgb[0] + (b.rgb[0] - a.rgb[0]) * u);
    const g = Math.round(a.rgb[1] + (b.rgb[1] - a.rgb[1]) * u);
    const bl = Math.round(a.rgb[2] + (b.rgb[2] - a.rgb[2]) * u);
    return [r, g, bl];
  };
}

// Blue → White → Red (coolwarm-ish)
export const blueRed = makeGradient([
  { pos: 0.0, color: "#2b83ba" },
  { pos: 0.5, color: "#ffffff" },
  { pos: 1.0, color: "#d7191c" },
]);

export const coolWarm = makeGradient([
  { pos: 0.00, color: "#3b4cc0" }, // Deep Blue (15°C)
  { pos: 0.25, color: "#7aa6fa" }, // CHANGED: Sky Blue (was #8c9bff which is purple-ish)
  { pos: 0.50, color: "#e8fafa" }, // CHANGED: Slight Off-White (smoother transition than pure #ffffff)
  { pos: 0.75, color: "#f47d5f" }, // Salmon/Orange
  { pos: 1.00, color: "#b40426" }, // Deep Red (25°C)
]);

// Simple approximations for convenience
export function viridis(t) {
  t = clamp(t, 0, 1);
  const r = 74.0 + 178.0 * t - 126.0 * t * t;
  const g = 1.0 + 158.0 * t + 94.0 * t * t;
  const b = 77.0 + 67.0 * t + 135.0 * t * t;
  return [clamp(Math.round(r), 0, 255), clamp(Math.round(g), 0, 255), clamp(Math.round(b), 0, 255)];
}

export function turbo(t) {
  const x = clamp(t, 0, 1);
  const r = Math.round(255 * (0.13572138 + 4.6153926 * x - 42.66032258 * x ** 2 + 132.13108234 * x ** 3 - 152.94239396 * x ** 4 + 59.28637943 * x ** 5));
  const g = Math.round(255 * (0.09140261 + 2.9431332 * x + 0.22717479 * x ** 2 - 13.75752474 * x ** 3 + 32.27630098 * x ** 4 - 22.93293611 * x ** 5));
  const b = Math.round(255 * (0.1066733 + 0.6751423 * x + 12.64194608 * x ** 2 - 27.14828336 * x ** 3 + 12.01915185 * x ** 4));
  return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
}
