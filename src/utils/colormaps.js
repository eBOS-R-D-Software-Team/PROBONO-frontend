import { clamp } from "./math";

export function viridis(t) {
  t = clamp(t, 0, 1);
  const r = 74.0 + 178.0 * t - 126.0 * t * t;
  const g = 1.0 + 158.0 * t + 94.0 * t * t;
  const b = 77.0 + 67.0 * t + 135.0 * t * t;
  return [clamp(Math.round(r),0,255), clamp(Math.round(g),0,255), clamp(Math.round(b),0,255)];
}

export function turbo(t) {
  const x = clamp(t, 0, 1);
  const r = Math.round(255*(0.13572138+4.61539260*x-42.66032258*x**2+132.13108234*x**3-152.94239396*x**4+59.28637943*x**5));
  const g = Math.round(255*(0.09140261+2.94313320*x+0.22717479*x**2-13.75752474*x**3+32.27630098*x**4-22.93293611*x**5));
  const b = Math.round(255*(0.10667330+0.67514230*x+12.64194608*x**2-27.14828336*x**3+12.01915185*x**4));
  return [r,g,b];
}
