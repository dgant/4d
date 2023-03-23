import global from './Global.js';
import setup from './Setup.js';
import updateDebugging from './Debugging.js';
import updatePhysics from './Physics.js';
import * as Make4d from './Make4d.js';

function loop() {
  requestAnimationFrame(loop);
  updatePhysics();
  updateDebugging()
  Make4d.prepareToRender4d(global.camera);
  global.renderer.render(global.scene, global.camera);
}

await setup();
loop();