import * as THREE from 'three';
import { TGALoader } from 'three/addons/loaders/TGALoader.js';
import { unzipSync, strFromU8 } from 'three/addons/libs/fflate.module.js';

function getFilesFromItemList(items, onDone) {
  let itemsCount = 0;
  let itemsTotal = 0;
  const files = [];
  const filesMap = {};
  function onEntryHandled() {
    ++itemsCount;
    if (itemsCount === itemsTotal) { onDone(files, filesMap); }
  }
  function handleEntry(entry) {
    if (entry.isDirectory) {
      const reader = entry.createReader();
      reader.readEntries(entries => {
        for (const entry of entries) { handleEntry(entry); }
        onEntryHandled();
      });
    } else if (entry.isFile) {
      entry.file(file => {
        files.push(file);
        filesMap[entry.fullPath.slice(1)] = file;
        onEntryHandled();
      });
    }
    ++itemsTotal;
  }
  for (const item of items) { if (item.kind === 'file') { handleEntry(item.webkitGetAsEntry()); }}
}

class ContentLoader {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.manager = new THREE.LoadingManager();
    this.manager.addHandler(/\.tga$/i, new TGALoader());
    this.manager.setURLModifier(url => { return url.replace(/^(\.?\/)/, '')}); // remove './'
    this.texturePath = '';
  }

  // Loads ITEMS. For example, from a drop event: 
  // > document.addEventListener('drop', event => { loadItemList(event.dataTransfer.items); });
  // See https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer
  loadItemList(items) {
    getFilesFromItemList(items, (files, filesMap) => { this.loadFiles(files, filesMap) });

  };
  // Loads FILES. For example, from a drop event:
  // > document.addEventListener('drop', event => { loadItemList(event.dataTransfer.files); });
  // See https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer
  async loadFiles(files) { 
    const self = this;
    return Promise.all(Array.from(files).map(file => self.loadFile(file)));
  };
  
  async loadFile(file) {
    return new Promise((resolve, reject) => {
      try {
        const extension = file.name.split('.').pop().toLowerCase();
        const reader = new FileReader();
        reader.addEventListener('abort', reject);
        reader.addEventListener('error', reject);
        reader.addEventListener('progress', event => {
          console.log(`Loading ${file.name} ${Math.floor(event.total / 1000)} KB @ ${Math.floor((event.loaded / event.total) * 100)}%`);
        });
        switch (extension) {        
          case '3dm':   return this.load3mf (file, reader, resolve, reject);        
          case '3ds':   return this.load3ds (file, reader, resolve, reject);
          case '3mf':   return this.load3mf (file, reader, resolve, reject);
          case 'amf':   return this.loadamf (file, reader, resolve, reject);
          case 'dae':   return this.loaddae (file, reader, resolve, reject);
          case 'drc':   return this.loaddrc (file, reader, resolve, reject);
          case 'fbx':   return this.loadfbx (file, reader, resolve, reject);
          case 'glb':   return this.loadglb (file, reader, resolve, reject);
          case 'gltf':  return this.loadgltf(file, reader, resolve, reject);
          case 'js':    // Pass through
          case 'json':  return this.loadjson(file, reader, resolve, reject);
          case 'ifc':   return this.loadifc (file, reader, resolve, reject);
          case 'kmz':   return this.loadkmz (file, reader, resolve, reject);
          case 'ldr':   // Pass through
          case 'mpd':   return this.loadldr (file, reader, resolve, reject);
          case 'md2':   return this.loadmd2 (file, reader, resolve, reject);
          case 'obj':   return this.loadobj (file, reader, resolve, reject);
          case 'pcd':   return this.loadpcd (file, reader, resolve, reject);
          case 'ply':   return this.loadply (file, reader, resolve, reject);
          case 'stl':   return this.loadstl (file, reader, resolve, reject);
          case 'svg':   return this.loadsvg (file, reader, resolve, reject);
          case 'usdz':  return this.loadusdz(file, reader, resolve, reject);
          case 'vox':   return this.loadvox (file, reader, resolve, reject);
          case 'vtk':   // Pass through
          case 'vtp':   return this.loadvtk (file, reader, resolve, reject);
          case 'wrl':   return this.loadwrl (file, reader, resolve, reject);
          case 'xyz':   return this.loadxyz (file, reader, resolve, reject);
          case 'zip':   return this.loadzip (file, reader, resolve, reject);
          default:      reject(`Unsupported file format (${extension}.`);
        }
      } catch(error) { reject(error); }
    });
  };
  async load3dm(file, reader, resolve, reject) {
    // A 3DM file is an open source file format which is used for 3D graphics software.
    reader.addEventListener('load', async event => {
      const { Rhino3dmLoader } = await import('three/addons/loaders/3DMLoader.js');
      const loader = new Rhino3dmLoader();
      loader.setLibraryPath('../node_modules/three/examples/jsm/libs/rhino3dm/');
      loader.parse(event.target.result, object => { resolve(this.callbacks.onAddObject(object)); });
    });
    reader.readAsArrayBuffer(file);
  }
  async load3ds(file, reader, resolve, reject) {
    // The 3DS (3D Studio) stores information on the makeup of 3D vector graphics.
    reader.addEventListener('load', async event => {
      const { TDSLoader } = await import('three/addons/loaders/TDSLoader.js');
      resolve(this.callbacks.onAddObject(new TDSLoader().parse(event.target.result)));
    });
    reader.readAsArrayBuffer(file);
  }
  async load3mf(file, reader, resolve, reject) {
    // The 3D Manufacturing Format is an industry-supported file format for full-fidelity 3D CAD models.
    reader.addEventListener('load', async event => {
      const { ThreeMFLoader } = await import('three/addons/loaders/3MFLoader.js');
      resolve(this.callbacks.onAddObject(new ThreeMFLoader().parse(event.target.result)));
    });
    reader.readAsArrayBuffer(file);
  }
  async loadamf(file, reader, resolve, reject) {
    // An Additive Manufacturing File is a CAD format for 3D printing.
    reader.addEventListener('load', async event => {
      const { AMFLoader } = await import('three/addons/loaders/AMFLoader.js');
      resolve(this.callbacks.onAddObject(new AMFLoader().parse(event.target.result)));
    });
    reader.readAsArrayBuffer(file);
  }
  async loaddae(file, reader, resolve, reject) {
    // A COLLADA Digital Asset Exchange file can store content including images, textures, and 3D models.
    reader.addEventListener('load', async event => {
      const { ColladaLoader } = await import('three/addons/loaders/ColladaLoader.js');
      const collada = new ColladaLoader(manager).parse(event.target.result);
      collada.scene.name = file.name;
      resolve(this.callbacks.onAddObject(collada.scene));
    });
    reader.readAsText(file);
  }
  async loaddrc(file, reader, resolve, reject) {
    // A compressed 3D file format created with Google Draco library.
    reader.addEventListener('load', async event => {
      const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js');
      const loader = new DRACOLoader();
      loader.setDecoderPath('../node_modules/three/examples/jsm/libs/draco/');
      loader.parse(event.target.result, geometry => {
        let material;
        if (geometry.index === null) {
          material = new THREE.PointsMaterial({ size: 0.01 });
          material.vertexColors = geometry.hasAttribute('color');              
        } else {
          material = new THREE.MeshStandardMaterial();
        }
        const object = new THREE.Mesh(geometry, material);
        object.name = file.name;
        loader.dispose();
        resolve(this.callbacks.onAddObject(object));
      });
    });
    reader.readAsArrayBuffer(file);
  }
  async loadfbx(file, reader, resolve, reject) {
    // FBX files transfer files between 3D animation software like as Maya, 3ds Max, MotionBuilder, Mudbox.
    reader.addEventListener('load', async event => {
      const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
      resolve(this.callbacks.onAddObject(new FBXLoader(manager).parse(event.target.result)));
    });
    reader.readAsArrayBuffer(file);
  }
  async loadglb(file, reader, resolve, reject) {
    // GLB standard specifies 3D scenes, models, lighting, materials, node hierarchy and animations.
    reader.addEventListener('load', async event => {
      const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js');
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('../node_modules/three/examples/jsm/libs/draco/gltf/');
      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);
      loader.parse(event.target.result, '', result => {
        const scene = result.scene;
        scene.name = file.name;
        scene.animations.push(...result.animations);
        dracoLoader.dispose();
        resolve(this.callbacks.onAddObject(scene));
      });
    });
    reader.readAsArrayBuffer(file);
  }
  async loadgltf(file, reader, resolve, reject) {
    // GL Transmission Format is a specification for 3D scenes and models.
    reader.addEventListener('load', async event => {
      const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js');
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('../node_modules/three/examples/jsm/libs/draco/gltf/');
      const loader = new GLTFLoader(manager);
      loader.setDRACOLoader(dracoLoader);
      loader.parse(event.target.result, '', result =>  {
        result.scene.name = file.name;
        result.scene.animations.push(...result.animations);
        dracoLoader.dispose();
        resolve(this.callbacks.onAddObject(result.scene));
      });
    });
    reader.readAsArrayBuffer(file);
  }
  async loadjson(file, reader, resolve, reject) {
    // Load files exported from the THREE.js Editor
    reader.addEventListener('load', event => {
      const data = JSON.parse(event.target.result);
      if (data.metadata               === undefined) { data.metadata          = { type: 'Geometry' }; } // 2.0
      if (data.metadata.type          === undefined) { data.metadata.type     = 'Geometry'; } // 3.0
      if (data.metadata.formatVersion !== undefined) { data.metadata.version  = data.metadata.formatVersion; }
      const type = data.metadata.type.toLowerCase()
      switch (type) {
        case 'geometry': console.error('Loader: "Geometry" is no longer supported.');
          break; case 'app': {
            resolve(this.callbacks.onLoadAppJson(data));
          } break; case 'buffergeometry': {
            const mesh = new THREE.Mesh(new THREE.BufferGeometryLoader().parse(data));
            resolve(this.callbacks.onAddObject(mesh));
          } break; case 'object': {
            const loader = new THREE.ObjectLoader();
            loader.setResourcePath(this.texturePath);
            loader.parse(data, result =>  {
              result.name = result.name || file.name;
              if (result.isScene) {
                resolve(this.callbacks.onSetScene(result));
              } else {
                resolve(this.callbacks.onAddObject(result));
              }
            });
          } break; default: {
            reject(`Did not recognize JSON type "${type}"`);
          }
      }
    });
    reader.readAsText(file);
  }
  async loadifc(file, reader, resolve, reject) {
    // Industry Foundation Classes is a CAD schema for architectural, building and construction data.
    reader.addEventListener('load', async event => {
      const { IFCLoader } = await import('three/addons/loaders/IFCLoader.js');
      var loader = new IFCLoader();
      loader.ifcManager.setWasmPath('three/addons/loaders/ifc/');
      const model = await loader.parse(event.target.result);
      model.mesh.name = file.name;
      resolve(this.callbacks.onAddObject(model.mesh));
    });
    reader.readAsArrayBuffer(file);
  }
  async loadkmz(file, reader, resolve, reject) {
    // Keyhole Markup Language (Google Earth) expresses geographic annotation and visualization
    // within two-dimensional maps and three-dimensional Earth browsers.
    reader.addEventListener('load', async event => {
      const { KMZLoader } = await import('three/addons/loaders/KMZLoader.js');
      const collada = new KMZLoader().parse(event.target.result);
      collada.scene.name = file.name;
      resolve(this.callbacks.onAddObject(collada.scene));
    });
    reader.readAsArrayBuffer(file);
  }
  async loadldr(file, reader, resolve, reject) {
    // An LDR file is a 3D LEGO model created with LDraw computer-aided design program
    // A MPD file consists out of blocks of LDraw code separated by 0 FILE or 0 !DATA statements.
    reader.addEventListener('load', async event => {
      const { LDrawLoader } = await import('three/addons/loaders/LDrawLoader.js');
      const loader = new LDrawLoader();
      loader.setPath('../../node_modules/three/examples/models/ldraw/officialLibrary/');
      loader.parse(event.target.result, undefined, group => {
        group.name = file.name;        
        group.rotation.x = Math.PI; // Convert from LDraw coordinates: rotate 180 degrees around OX
        resolve(this.callbacks.onAddObject(group));
      });
    });
    reader.readAsText(file);
  }
  async loadmd2(file, reader, resolve, reject) {
    // MD2 (Quake 2 model format) is a 3-D modeling format.
    reader.addEventListener('load', async event => {
      const { MD2Loader } = await import('three/addons/loaders/MD2Loader.js');
      const mesh = new THREE.Mesh(new MD2Loader().parse(event.target.result), new THREE.MeshStandardMaterial());
      mesh.mixer = new THREE.AnimationMixer(mesh);
      mesh.name = file.name;
      mesh.animations.push(...geometry.animations);
      resolve(this.callbacks.onAddObject(mesh));
    });
    reader.readAsArrayBuffer(file);
  }
  async loadobj(file, reader, resolve, reject) {
    // OBJ represents 3D geometry alone — vertex, UV position of each texture coordinate vertex,
    // vertex normals, the faces that make each polygon defined as a list of vertices, and texture vertices. 
    reader.addEventListener('load', async event => {
      const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js');
      const object = new OBJLoader().parse(event.target.result);
      object.name = file.name;
      resolve(this.callbacks.onAddObject(object));
    });
    reader.readAsText(file);
  }
  async loadpcd(file, reader, resolve, reject) {
    // The PCD (Point Cloud Data) is a file format for storing 3D point cloud data.
    reader.addEventListener('load', async event => {
      const { PCDLoader } = await import('../../node_modules/three/examples/jsm/loaders/PCDLoader.js');
      const points = new PCDLoader().parse(event.target.result);
      points.name = file.name;
      resolve(this.callbacks.onAddObject(points));
    });
    reader.readAsArrayBuffer(file);
  }
  async loadply(file, reader, resolve, reject) {
    // The Polygon File Format or Stanford Triangle Format stores three-dimensional data from 3D scanners.
    reader.addEventListener('load', async event => {
      const { PLYLoader } = await import('three/addons/loaders/PLYLoader.js');
      const geometry = new PLYLoader().parse(event.target.result);
      let object;
      if (geometry.index === null) {
        const material = new THREE.PointsMaterial({ size: 0.01 });
        material.vertexColors = geometry.hasAttribute('color');
        object = new THREE.Points(geometry, material);
      } else {
        object = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());            
      }
      object.name = file.name;
      resolve(this.callbacks.onAddObject(object));
    });
    reader.readAsArrayBuffer(file);
  }
  async loadstl(file, reader, resolve, reject) {
    // STL is a file format commonly used for 3D printing and computer-aided design (CAD).
    // The name STL is an acronym that stands for stereolithography — a popular 3D printing technology
    reader.addEventListener('load', async event => {
      const { STLLoader } = await import('three/addons/loaders/STLLoader.js');
      const mesh = new THREE.Mesh(new STLLoader().parse(event.target.result), new THREE.MeshStandardMaterial());
      mesh.name = file.name;
      resolve(this.callbacks.onAddObject(mesh));
    });
    if (reader.readAsBinaryString === undefined) {
      reader.readAsArrayBuffer(file);          
    } else {
      reader.readAsBinaryString(file);
    }
  }
  async loadsvg(file, reader, resolve, reject) {
    // Scalable Vector Graphics (SVG) is a web-friendly vector file format
    reader.addEventListener('load', async event => {
      const { SVGLoader } = await import('three/addons/loaders/SVGLoader.js');
      const paths = new SVGLoader().parse(event.target.result).paths;
      const group = new THREE.Group();
      group.scale.multiplyScalar(0.1);
      group.scale.y *= -1;
      for (const path of paths) {
        const material = new THREE.MeshBasicMaterial({ color: path.color, depthWrite: false });
        const shapes = SVGLoader.createShapes(path);
        for (const shape of shapes) {
          group.add(new THREE.Mesh(new THREE.ShapeGeometry(shape), material));
        }
      }
      resolve(this.callbacks.onAddObject(group));
    });
    reader.readAsText(file);
  }
  async loadusdz(file, reader, resolve, reject) {
    // USDZ is a 3D file format created by Pixar. It has been adopted by Apple as their format for AR applications.
    reader.addEventListener('load', async event => {
      const { USDZLoader } = await import('../../node_modules/three/examples/jsm/loaders/USDZLoader.js');
      const group = new USDZLoader().parse(event.target.result);
      group.name = file.name;
      resolve(this.callbacks.onAddObject(group));
    });
    reader.readAsArrayBuffer(file);
  }
  async loadvox(file, reader, resolve, reject) {
    // 3D model Voxel format ("VOX" for short), a blocky 3D format used by the Voxlap game engine.
    reader.addEventListener('load', async event => {
      const { VOXLoader, VOXMesh } = await import('three/addons/loaders/VOXLoader.js');
      const chunks = new VOXLoader().parse(event.target.result);
      const group = new THREE.Group();
      group.name = file.name;
      chunks.map(chunk => new VOXMesh(chunk)).forEach(group.add);
      resolve(this.callbacks.onAddObject(group));
    });
    reader.readAsArrayBuffer(file);
  }
  async loadvtk(file, reader, resolve, reject) {
    // VTK supports 1D, 2D, and 3D structured point datasets
    // VTP is a file format for storing VTK surface models (polydata)
    reader.addEventListener('load', async event => {
      const { VTKLoader } = await import('three/addons/loaders/VTKLoader.js');
      const mesh = new THREE.Mesh(new VTKLoader().parse(event.target.result), new THREE.MeshStandardMaterial());
      mesh.name = file.name;
      resolve(this.callbacks.onAddObject(mesh));
    });
    reader.readAsArrayBuffer(file);
  }
  async loadwrl(file, reader, resolve, reject) {
    // WRL files are an extension of the Virtual Reality Modeling Language (VRML) format.
    // VRML file types enable browser plugins to display virtual reality environments
    reader.addEventListener('load', async event => {
      const { VRMLLoader } = await import('three/addons/loaders/VRMLLoader.js');
      resolve(this.callbacks.onSetScene(new VRMLLoader().parse(event.target.result)));
    });
    reader.readAsText(file);
  }
  async loadxyz(file, reader, resolve, reject) {
    // XYZ (Point cloud data) is a file extension used for ASCII text files with point cloud data.
    reader.addEventListener('load', async event => {
      const { XYZLoader } = await import('three/addons/loaders/XYZLoader.js');
      const geometry = new XYZLoader().parse(event.target.result);
      const material = new THREE.PointsMaterial();
      material.vertexColors = geometry.hasAttribute('color');
      const points = new THREE.Points(geometry, material);
      points.name = file.name;
      resolve(this.callbacks.onAddObject(points));
    });
    reader.readAsText(file);
  }
  async loadzip(file, reader, resolve, reject) {
    // TODO: This function has not been fully converted to async
    // Supports zips containing: MTL, OBJ, FBX, GLB, or GLTF
    reader.addEventListener('load', async event => {
      const zip = unzipSync(new Uint8Array(event.target.result));
      if (zip['model.obj'] && zip['materials.mtl']) { // Poly[gons?]
        const { MTLLoader } = await import('three/addons/loaders/MTLLoader.js');
        const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js');
        resolve(this.callbacks.onAddObject(new OBJLoader()
          .setMaterials(new MTLLoader().parse(strFromU8(zip['materials.mtl'])))
          .parse(strFromU8(zip['model.obj']))));
      }
      for (const path of zip) { // TODO: Did I screw up the conversion here?
        const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js');
        const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
        const file = zip[path];
        const manager = new THREE.LoadingManager();
        manager.setURLModifier(url => {
          const file = zip[url];
          if (file) {
            console.log('Loading', url);
            const blob = new Blob([file.buffer], { type: 'application/octet-stream' });
            return URL.createObjectURL(blob);
          }
          return url;
        });
        const extension = path.split('.').pop().toLowerCase();
        switch (extension) {
          case 'fbx': {
            const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
            resolve(this.callbacks.onAddObject(new FBXLoader(manager).parse(file.buffer)));
          } break; case 'glb': {
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath('../node_modules/three/examples/jsm/libs/draco/gltf/');
            const loader = new GLTFLoader();
            loader.setDRACOLoader(dracoLoader);
            loader.parse(file.buffer, '', result =>  {
              const scene = result.scene;
              scene.animations.push(...result.animations);
              dracoLoader.dispose();
              this.callbacks.onAddObject(scene);
            });
          } break; case 'gltf': {
            const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js');
            const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath('../node_modules/three/examples/jsm/libs/draco/gltf/');
            const loader = new GLTFLoader(manager);
            loader.setDRACOLoader(dracoLoader);
            loader.parse(strFromU8(file), '', result =>  {
              const scene = result.scene;
              scene.animations.push(...result.animations);
              dracoLoader.dispose();
              this.callbacks.onAddObject(scene);
            });
          }
          break; default: reject(`Did not recognize ZIP content extension ${extension}`);
        }
      }
    });
    reader.readAsArrayBuffer(file);
  }
}
export { ContentLoader };
