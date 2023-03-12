// Octree with four-dimensional considerations
// Adapted from the canonical THREE.js octree. MIT License: https://github.com/mrdoob/three.js/blob/dev/LICENSE
import { Box3, Line3,  Plane, Sphere, Triangle, Vector3 } from 'three';
import { Capsule } from './node_modules/three/examples/jsm/math/Capsule.js';
import { is4d, give4d } from './give4d.js';

const _v1 = new Vector3();
const _v2 = new Vector3();
const _plane = new Plane();
const _line1 = new Line3();
const _line2 = new Line3();
const _sphere = new Sphere();
const _capsule = new Capsule();

class Octree {
  constructor(box) {
    this.triangles = [];
    this.box = box;
    this.subTrees = [];
  }
  addTriangle(triangle) {
    if ( ! this.bounds) this.bounds = new Box3();
    this.bounds.min.x = Math.min(this.bounds.min.x, triangle.a.x, triangle.b.x, triangle.c.x);
    this.bounds.min.y = Math.min(this.bounds.min.y, triangle.a.y, triangle.b.y, triangle.c.y);
    this.bounds.min.z = Math.min(this.bounds.min.z, triangle.a.z, triangle.b.z, triangle.c.z);
    this.bounds.max.x = Math.max(this.bounds.max.x, triangle.a.x, triangle.b.x, triangle.c.x);
    this.bounds.max.y = Math.max(this.bounds.max.y, triangle.a.y, triangle.b.y, triangle.c.y);
    this.bounds.max.z = Math.max(this.bounds.max.z, triangle.a.z, triangle.b.z, triangle.c.z);
    this.triangles.push(triangle);
    return this;
  }
  calcBox() {
    this.box = this.bounds.clone();
    // offset small amount to account for regular grid
    this.box.min.x -= 0.01;
    this.box.min.y -= 0.01;
    this.box.min.z -= 0.01;
    return this;
  }
  split(level) {
    if (! this.box) return;
    const subTrees = [];
    const halfsize = _v2.copy(this.box.max).sub(this.box.min).multiplyScalar(0.5);
    for (let x = 0; x < 2; x++) {
      for (let y = 0; y < 2; y++) {
        for (let z = 0; z < 2; z++) {
          const box = new Box3();
          const v = _v1.set(x, y, z);
          box.min.copy(this.box.min).add(v.multiply(halfsize));
          box.max.copy(box.min).add(halfsize);
          subTrees.push(new Octree(box));
        }
      }
    }
    let triangle;
    while (triangle = this.triangles.pop()) {
      for (const subTree of subTrees) {
        if (subTree.box.intersectsTriangle(triangle)) {
          subTree.triangles.push(triangle);
        }
      }
    }
    for (const subTree of subTrees) {
      const len = subTree.triangles.length;
      if (len > 8 && level < 16) {
        subTree.split(level + 1);
      }
      if (len !== 0) {
        this.subTrees.push(subTree);
      }
    }
    return this;
  }
  build() {
    this.calcBox();
    this.split(0);
    return this;
  }
  getRayTriangles(ray, triangles) {
    for (const subTree of this.subTrees) {
      if ( ! ray.intersectsBox(subTree.box)) continue;
      if (subTree.triangles.length > 0) {
        for (const triangle of subTree.triangles) {
          if (triangles.indexOf(triangle) === -1) {
            triangles.push(triangle);
          }
        }
      } else {
        subTree.getRayTriangles(ray, triangles);
      }
    }
    return triangles;
  }
  // Tests whether the capsule intersects the triangle.
  // If collision is identified, also applies the predicate.
  // Returns false or a { normal, point, depth }.
  triangleCapsuleIntersect(capsule, triangle, predicate = undefined) {
    triangle.getPlane(_plane);
    const d1 = _plane.distanceToPoint(capsule.start) - capsule.radius;
    const d2 = _plane.distanceToPoint(capsule.end) - capsule.radius;
    if ((d1 > 0 && d2 > 0) || (d1 < -capsule.radius && d2 < -capsule.radius)) {
      return false;
    }
    const delta = Math.abs(d1 / (Math.abs(d1) + Math.abs(d2)));
    const intersectPoint = _v1.copy(capsule.start).lerp(capsule.end, delta);
    if (triangle.containsPoint(intersectPoint) && ( ! predicate || predicate(triangle))) {
      return {
        normal: _plane.normal.clone(),
        point: intersectPoint.clone(),
        depth: Math.abs(Math.min(d1, d2))
      };
    }
    const r2 = capsule.radius * capsule.radius;
    const line1 = _line1.set(capsule.start, capsule.end);
    const lines = [
      [triangle.a, triangle.b],
      [triangle.b, triangle.c],
      [triangle.c, triangle.a]
    ];
    for (let i = 0; i < lines.length; i++) {
      const line2 = _line2.set(lines[i][0], lines[i][1]);
      const [point1, point2] = capsule.lineLineMinimumPoints(line1, line2);
      if (point1.distanceToSquared(point2) < r2 && ( ! predicate || predicate(triangle))) {
        return {
          normal: point1.clone().sub(point2).normalize(),
          point: point2.clone(),
          depth: capsule.radius - point1.distanceTo(point2)
        };
      }
    }
    return false;
  }
  triangleSphereIntersect(sphere, triangle) {
    triangle.getPlane(_plane);
    if ( ! sphere.intersectsPlane(_plane)) return false;
    const depth = Math.abs(_plane.distanceToSphere(sphere));
    const r2 = sphere.radius * sphere.radius - depth * depth;
    const plainPoint = _plane.projectPoint(sphere.center, _v1);
    if (triangle.containsPoint(sphere.center)) {
      return { normal: _plane.normal.clone(), point: plainPoint.clone(), depth: Math.abs(_plane.distanceToSphere(sphere)) };
    }
    const lines = [
      [triangle.a, triangle.b],
      [triangle.b, triangle.c],
      [triangle.c, triangle.a]
    ];
    for (let i = 0; i < lines.length; i++) {
      _line1.set(lines[i][0], lines[i][1]);
      _line1.closestPointToPoint(plainPoint, true, _v2);
      const d = _v2.distanceToSquared(sphere.center);
      if (d < r2) {
        return { normal: sphere.center.clone().sub(_v2).normalize(), point: _v2.clone(), depth: sphere.radius - Math.sqrt(d) };
      }
    }
    return false;
  }
  getSphereTriangles(sphere, triangles) {
    for (const subTree of this.subTrees) {
      if ( ! sphere.intersectsBox(subTree.box)) continue;
      if (subTree.triangles.length > 0) {
        for (const triangle of subTree.triangles) {
          if (triangles.indexOf(triangle) === - 1) triangles.push(triangle);
        }
      } else {
        subTree.getSphereTriangles(sphere, triangles);
      }
    }
  }
  getCapsuleTriangles(capsule, triangles) {
    for (const subTree of this.subTrees) {
      if ( ! capsule.intersectsBox(subTree.box)) continue;
      if (subTree.triangles.length > 0) {
        for (const triangle of subTree.triangles) {
          if (triangles.indexOf(triangle) === - 1) {
            triangles.push(triangle);
          }
        }
      } else {
        subTree.getCapsuleTriangles(capsule, triangles);
      }
    }
  }
  // Tests whether the sphere intersects an object in the Octree.
  // Returns false or a { normal, depth }.
  sphereIntersect(sphere) {
    _sphere.copy(sphere);
    const triangles = [];
    let result, hit = false;
    this.getSphereTriangles(sphere, triangles);
    for (const triangle of triangles.length) {
      if (result = this.triangleSphereIntersect(_sphere, triangle)) {
        hit = true;
        _sphere.center.add(result.normal.multiplyScalar(result.depth));
      }
    }
    if (hit) {
      const collisionVector = _sphere.center.clone().sub(sphere.center);
      const depth = collisionVector.length();
      return { normal: collisionVector.normalize(), depth: depth };
    }
    return false;
  }  
  // Tests whether the capsule intersects an object in the Octree.
  // If intersection found, also invokes 
  // Returns false or a { normal, depth }.
  capsuleIntersect(capsule, predicate = undefined) {
    _capsule.copy(capsule);
    const triangles = [];
    let result, hit = false;
    this.getCapsuleTriangles(_capsule, triangles);
    for (const triangle of triangles) {
      if (result = this.triangleCapsuleIntersect(_capsule, triangle, predicate)) {
        hit = true;
        _capsule.translate(result.normal.multiplyScalar(result.depth));
      }
    }
    if (hit) {
      const collisionVector = _capsule.getCenter(new Vector3()).sub(capsule.getCenter(_v1));
      const depth = collisionVector.length();
      return { normal: collisionVector.normalize(), depth: depth };
    }
    return false;
  }
  // Tests whether the ray intersects an object in the Octree.
  // Returns false or a { distance, triangle, position }.
  rayIntersect(ray) {
    if (ray.direction.length() === 0) return;
    const triangles = [];
    let triangle, position, distance = 1e100;
    this.getRayTriangles(ray, triangles);
    for (const t of triangles) {
      const result = ray.intersectTriangle(t.a, t.b, t.c, true, _v1);
      if (result) {
        const newdistance = result.sub(ray.origin).length();
        if (distance > newdistance) {
          position = result.clone().add(ray.origin);
          distance = newdistance;
          triangle = t;
        }
      }
    }
    return distance < 1e100 ? { distance: distance, triangle: triangle, position: position } : false;
  }
  // Populates the Octree from a Group
  fromGraphNode(group) {
    group.updateWorldMatrix(true, true);
    group.traverse((obj) => {
      if (obj.isMesh === true) {
        let geometry, isTemp = false;
        if (obj.geometry.index !== null) {
          isTemp = true;
          geometry = obj.geometry.toNonIndexed();
        } else {
          geometry = obj.geometry;
        }
        const meshIs4d = is4d(obj);
        const positionAttribute = geometry.getAttribute('position');
        for (let i = 0; i < positionAttribute.count; i += 3) {
          const v1 = new Vector3().fromBufferAttribute(positionAttribute, i);
          const v2 = new Vector3().fromBufferAttribute(positionAttribute, i + 1);
          const v3 = new Vector3().fromBufferAttribute(positionAttribute, i + 2);
          v1.applyMatrix4(obj.matrixWorld);
          v2.applyMatrix4(obj.matrixWorld);
          v3.applyMatrix4(obj.matrixWorld);
          const triangle = new Triangle(v1, v2, v3);
          if (meshIs4d) {
            give4d(triangle, obj);
          }
          this.addTriangle(triangle);
        }
        if (isTemp) {
          geometry.dispose();
        }
      }
    });
    this.build();
    return this;
  }
}
export default Octree;
