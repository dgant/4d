const TAU = Math.PI * 2;

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

export {TAU, roughlyEqual, clampAngleTau};