import constants from './constants.js';
import global from './global.js';
import setup from './setup.js';
import updateDebugging from './debugging.js';
import updatePhysics from './physics.js';

let prevMs = performance.now();

function loop() {
  requestAnimationFrame(loop);
  const nowMs = performance.now();
  // Cap the amount of time that can elapse between update
  // For example, alt-tabbing out of the window should not result in a ton of updates
  const deltaS = Math.min(constants.physicsMaxStep * 10, (nowMs - prevMs) * 0.001);
  let deltaRemainingS = deltaS;
  while (deltaRemainingS > 0) {
    const deltaStepS = Math.min(deltaRemainingS, constants.physicsMaxStep);
    deltaRemainingS -= deltaStepS;
    updatePhysics(deltaStepS);
  }
  updateDebugging();
  prevMs = nowMs;
  global.renderer.render(global.scene, global.camera);
}

setup();
loop();