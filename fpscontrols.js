import * as THREE from 'three';

// Based on THREE.PointerLockControls
export default class FPSControls extends THREE.EventDispatcher {
	constructor(camera, domElement) {
    const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
    const _changeEvent = { type: 'change' };
    const _lockEvent = { type: 'lock' };
    const _unlockEvent = { type: 'unlock' };
    const _HALF_PI = Math.PI / 2;
		super();    
		this.domElement = domElement;
		this.isLocked = false;
		this.minPolarAngle = 0; // radians
		this.maxPolarAngle = Math.PI; // radians
		this.pointerSpeed = 1.0;
		const scope = this;
		function onMouseMove(event) {
			if (scope.isLocked === false) return;
			const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
			const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
			_euler.setFromQuaternion(camera.quaternion);
			_euler.y -= movementX * 0.002 * scope.pointerSpeed;
			_euler.x -= movementY * 0.002 * scope.pointerSpeed;
			_euler.x = Math.max(_HALF_PI - scope.maxPolarAngle, Math.min(_HALF_PI - scope.minPolarAngle, _euler.x));
			camera.quaternion.setFromEuler(_euler);
			scope.dispatchEvent(_changeEvent);
		}
		function onPointerlockChange() {
      scope.isLocked = scope.domElement.ownerDocument.pointerLockElement === scope.domElement;
			scope.dispatchEvent(scope.isLocked ? _lockEvent : _unlockEvent);
		}
		function onPointerlockError() { console.error('FPSControls: Unable to use Pointer Lock API'); }
		this.connect = function () {
			scope.domElement.ownerDocument.addEventListener('mousemove', onMouseMove);
			scope.domElement.ownerDocument.addEventListener('pointerlockchange', onPointerlockChange);
			scope.domElement.ownerDocument.addEventListener('pointerlockerror', onPointerlockError);
		};
		this.disconnect = function() {
			scope.domElement.ownerDocument.removeEventListener('mousemove', onMouseMove);
			scope.domElement.ownerDocument.removeEventListener('pointerlockchange', onPointerlockChange);
			scope.domElement.ownerDocument.removeEventListener('pointerlockerror', onPointerlockError);
		};
		this.dispose = function() { this.disconnect(); };
		this.getDirection = function() {
			const direction = new THREE.Vector3(0, 0, - 1);
			return function(v) { return v.copy(direction).applyQuaternion(camera.quaternion); };
		}();
    this.getAzimuthalDirection = function(v) {
			const output = this.getDirection(v);
      output.y = 0;
      output.normalize();
      return output;
		}
		this.lock = function() {
      scope.domElement.requestPointerLock();
    }
		this.unlock = function() {
      scope.domElement.ownerDocument.exitPointerLock;
    }
		this.connect();
	}
}