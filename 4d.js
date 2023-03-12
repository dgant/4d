import global from './global.js';
import setup from './setup.js';
import updateDebugging from './debugging.js';
import updatePhysics from './physics.js';
import * as Make4d from './make4d.js';

function loop() {
  requestAnimationFrame(loop);
  updatePhysics();
  updateDebugging()
  Make4d.prepareToRender4d(global.camera);
  global.renderer.render(global.scene, global.camera);
}

setup();
loop();