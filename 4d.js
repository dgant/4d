import global from './global.js';
import setup from './setup.js';
import updateDebugging from './debugging.js';
import updatePhysics from './physics.js';
import { preRender4d } from './give4d.js';

function loop() {
  requestAnimationFrame(loop);
  updatePhysics();
  updateDebugging()
  preRender4d();
  global.renderer.render(global.scene, global.camera);
}

setup();
loop();