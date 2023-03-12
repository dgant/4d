const INVPI = 1 / Math.PI;
const TAU = Math.PI * 2;
const INVTAU = 1 / TAU;

function roughlyEqual(a, b, maxDelta = 1e-6) {
  return Math.abs(a - b) <= maxDelta;
}

function clampAngleTau(value) {
  if (value >= TAU) {
    value -= TAU * Math.floor(value / TAU);
  } else if (value < 0) {
    value += TAU * Math.ceil(-value / TAU);
  }
  return value;
}

function radianDistance(a, b) {
  const aa = clampAngleTau(a);
  const bb = clampAngleTau(b);
  const delta = Math.abs(aa - bb);
  return Math.min(delta, TAU - delta);
}

// Lazy unit testing
console.assert(roughlyEqual(1, 1));
console.assert(roughlyEqual(1, 1.000000001));
console.assert(roughlyEqual(1.000000001, 1));
console.assert( ! roughlyEqual(1, 1.1));
console.assert(roughlyEqual(0, clampAngleTau(0)));
console.assert(roughlyEqual(0, clampAngleTau(   TAU)));
console.assert(roughlyEqual(0, clampAngleTau( - TAU)));
console.assert(roughlyEqual(0, clampAngleTau(   5 * TAU)));
console.assert(roughlyEqual(0, clampAngleTau( - 5 * TAU)));
console.assert(roughlyEqual(1, clampAngleTau(1)));
console.assert(roughlyEqual(6, clampAngleTau(6 + TAU)));
console.assert(roughlyEqual(6, clampAngleTau(6 - TAU)));
console.assert(roughlyEqual(6, clampAngleTau(6 + 5 * TAU)));
console.assert(roughlyEqual(6, clampAngleTau(6 - 5 * TAU)));

export {INVPI, TAU, INVTAU, roughlyEqual, clampAngleTau, radianDistance};