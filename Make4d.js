import * as Math4d from './Math4d.js';
import constants from './Constants.js';

const uniforms4d = { w4dCamera: { value: 0.0 } };
const vertexShader4d = `void main() { gl_Position = gl_Position; }`;
const fragmentShader4d = `
  #define INVTAU 0.1591549431
  uniform float w4d;
  uniform float w4dCamera;
  void main() { gl_FragColor.a = gl_FragColor.a * (1 - 2 * INVPI * abs(w4d - w4dCamera)); }`;

function _bless4d(object, parent = undefined) {
  object.is4d = true;
  object.parent4d = parent;
  object.getW4d = function() { return object._w4d; }
  object.setW4d = function(value) { object._w4d = Math4d.clampAngleTau(value); return object; };
  object.addW4d = function(value) { object.setW4d(object.getW4d() + value); return object; };
  object.setW4d(0.0);
  return object;
}
const _topLevel4d = [];
function bless4d(me, parent = undefined) {
  _bless4d(me, parent)
  if (me.isObject3D) {
    if (parent === undefined || ! parent.is4d) {
      _topLevel4d.push(me);
    }
    if (me.material !== undefined) {
      (Array.isArray(me.material) ? me.material : [me.material]).forEach(material => {
        material.depthTest = false; // Might fix wrong-order rendering? Per https://stackoverflow.com/questions/61739339/threejs-is-render-order-dependent-on-object-creation-order
        material.depthWrite = false; // This prevents occlusion while transparent
        material.transparent = true;
      });
    }
    me.traverse((you) => { if (you !== me) bless4d(you, me) });
  }  
}

function is4d(object) {
  return object !== undefined && object.is4d;
}
function getLocalW(object) {
  return is4d(object) ? object.getW4d() : 0.0;
}
function getGlobalW(object) {
  return is4d(object) ? Math4d.clampAngleTau(getLocalW(object) + getGlobalW(object.parent4d)) : 0.0;
}
function getDistanceW01(from, to) {
  return Math4d.INVPI * Math4d.radianDistance(from, to);
}
function prepareToRender4d(camera) {
  if ( ! camera || ! camera.is4d) return;
  const cameraW = camera.getW4d()
  uniforms4d.w4dCamera.value = cameraW;
  for (const mesh of _topLevel4d) {    
    const dw = getDistanceW01(mesh.getW4d(), cameraW);
    const alpha = 1 - 0.25 * dw - (dw > constants.substanceThreshold ? 1.75 * dw : 0);
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => { if (m) m.opacity = alpha });
  }
}

export {
  uniforms4d,
  vertexShader4d,
  fragmentShader4d,
  bless4d,
  is4d,
  getGlobalW,
  getLocalW,
  getDistanceW01,
  prepareToRender4d
};