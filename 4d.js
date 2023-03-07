import global from './global.js';
import setup from './setup.js';
import updateDebugging from './debugging.js';
import updatePhysics from './physics.js';

function loop() {
  requestAnimationFrame(loop);
  updatePhysics();
  updateDebugging();
  global.renderer.render(global.scene, global.camera);
}

setup();
loop();