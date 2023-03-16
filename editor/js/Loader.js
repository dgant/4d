import * as THREE from 'three';
import { TGALoader } from 'three/addons/loaders/TGALoader.js';
import { AddObjectCommand } from './commands/AddObjectCommand.js';
import { SetSceneCommand } from './commands/SetSceneCommand.js';
import { LoaderUtils } from './LoaderUtils.js';
import { unzipSync, strFromU8 } from 'three/addons/libs/fflate.module.js';

function Loader(editor) {
  const scope = this;
  this.texturePath = '';
  this.loadItemList = function (items) {
    LoaderUtils.getFilesFromItemList(items, function (files, filesMap) {
      scope.loadFiles(files, filesMap);
    });
  };
  this.loadFiles = function (files, filesMap) {
    if (files.length > 0) {
      filesMap = filesMap || LoaderUtils.createFilesMap(files);
      const manager = new THREE.LoadingManager();
      manager.setURLModifier(function (url) {
        url = url.replace(/^(\.?\/)/, ''); // remove './'
        const file = filesMap[ url ];
        if (file) {
          console.log('Loading', url);
          return URL.createObjectURL(file);
        }
        return url;
      });
      manager.addHandler(/\.tga$/i, new TGALoader());
      for (let i = 0; i < files.length; ++i) {
        scope.loadFile(files[ i ], manager);
      }
    }
  };
  this.loadFile = function (file, manager) {
    const filename = file.name;
    const extension = filename.split('.').pop().toLowerCase();
    const reader = new FileReader();
    reader.addEventListener('progress', function (event) {
      const size = '(' + Math.floor(event.total / 1000).format() + ' KB)';
      const progress = Math.floor((event.loaded / event.total) * 100) + '%';
      console.log('Loading', filename, size, progress);
    });
    switch (extension) {
			// A 3DM file is an open source file format which is used for 3D graphics software.
      case '3dm': 
      {
        reader.addEventListener('load', async function (event) {
          const contents = event.target.result;
          const { Rhino3dmLoader } = await import('three/addons/loaders/3DMLoader.js');
          const loader = new Rhino3dmLoader();
          loader.setLibraryPath('../node_modules/three/examples/jsm/libs/rhino3dm/');
          loader.parse(contents, function (object) {
            editor.execute(new AddObjectCommand(editor, object));
          });
        }, false);
        reader.readAsArrayBuffer(file);
      }
			// The 3DS (3D Studio) stores information on the makeup of 3D vector graphics.
      break; case '3ds':
      {
        reader.addEventListener('load', async function (event) {
          const { TDSLoader } = await import('three/addons/loaders/TDSLoader.js');
          const object = new TDSLoader().parse(event.target.result);
          editor.execute(new AddObjectCommand(editor, object));
        }, false);
        reader.readAsArrayBuffer(file);
      }
			// The 3D Manufacturing Format is an industry-supported file format for full-fidelity 3D CAD models.
      break; case '3mf':
      {
        reader.addEventListener('load', async function (event) {
          const { ThreeMFLoader } = await import('three/addons/loaders/3MFLoader.js');
          const object = new ThreeMFLoader().parse(event.target.result);
          editor.execute(new AddObjectCommand(editor, object));
        }, false);
        reader.readAsArrayBuffer(file);
      }
			// An Additive Manufacturing File is a CAD format for 3D printing.
      break; case 'amf':
      {
        reader.addEventListener('load', async function (event) {
          const { AMFLoader } = await import('three/addons/loaders/AMFLoader.js');
          const amfobject = new AMFLoader().parse(event.target.result);
          editor.execute(new AddObjectCommand(editor, amfobject));
        }, false);
        reader.readAsArrayBuffer(file);
      }
			// A COLLADA Digital Asset Exchange file can store content including images, textures, and 3D models.
      break; case 'dae':
      {
        reader.addEventListener('load', async function (event) {
          const contents = event.target.result;
          const { ColladaLoader } = await import('three/addons/loaders/ColladaLoader.js');
          const collada = new ColladaLoader(manager).parse(contents);
          collada.scene.name = filename;
          editor.execute(new AddObjectCommand(editor, collada.scene));
        }, false);
        reader.readAsText(file);
      }
			// A file with .drc extension is a compressed 3D file format created with Google Draco library.
      break; case 'drc':
      {
        reader.addEventListener('load', async function (event) {
          const contents = event.target.result;
          const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js');
          const loader = new DRACOLoader();
          loader.setDecoderPath('../node_modules/three/examples/jsm/libs/draco/');
          loader.parse(contents, function (geometry) {
            let material;
            if (geometry.index !== null) {
              material = new THREE.MeshStandardMaterial();
            } else {
              material = new THREE.PointsMaterial({ size: 0.01 });
              material.vertexColors = geometry.hasAttribute('color');
            }
						const object = new THREE.Mesh(geometry, material);
						object.name = filename;
            loader.dispose();
            editor.execute(new AddObjectCommand(editor, object));
          });
        }, false);
        reader.readAsArrayBuffer(file);
      }
			// FBX files transfer files between 3D animation software like as Maya, 3ds Max, MotionBuilder, Mudbox.
      break; case 'fbx':
      {
        reader.addEventListener('load', async function (event) {
          const contents = event.target.result;
          const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
          const object = new FBXLoader(manager).parse(contents);
          editor.execute(new AddObjectCommand(editor, object));
        }, false);
        reader.readAsArrayBuffer(file);
      }
			// GLB standard specifies 3D scenes, models, lighting, materials, node hierarchy and animations.
      break; case 'glb':
      {
        reader.addEventListener('load', async function (event) {
          const contents = event.target.result;
          const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js');
          const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
          const dracoLoader = new DRACOLoader();
          dracoLoader.setDecoderPath('../node_modules/three/examples/jsm/libs/draco/gltf/');
          const loader = new GLTFLoader();
          loader.setDRACOLoader(dracoLoader);
          loader.parse(contents, '', function (result) {
            const scene = result.scene;
            scene.name = filename;
            scene.animations.push(...result.animations);
            editor.execute(new AddObjectCommand(editor, scene));
            dracoLoader.dispose();
          });
        }, false);
        reader.readAsArrayBuffer(file);
      }
			// GL Transmission Format is a specification for 3D scenes and models.
      break; case 'gltf':
      {
        reader.addEventListener('load', async function (event) {
          const contents = event.target.result;
          const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js');
          const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
          const dracoLoader = new DRACOLoader();
          dracoLoader.setDecoderPath('../node_modules/three/examples/jsm/libs/draco/gltf/');
          const loader = new GLTFLoader(manager);
          loader.setDRACOLoader(dracoLoader);
          loader.parse(contents, '', function (result) {
            const scene = result.scene;
            scene.name = filename;
            scene.animations.push(...result.animations);
            editor.execute(new AddObjectCommand(editor, scene));
            dracoLoader.dispose();
          });
        }, false);
        reader.readAsArrayBuffer(file);
      }
			// Load files exported from the editor itself
      break; case 'js': case 'json':
      {
        reader.addEventListener('load', function (event) {
          const contents = event.target.result;
          // 2.0
          if (contents.indexOf('postMessage') !== - 1) {
            const blob = new Blob([ contents ], { type: 'text/javascript' });
            const worker = new Worker(URL.createObjectURL(blob));
            worker.onmessage = function (event) {
              event.data.metadata = { version: 2 };
              handleJSON(event.data);
            };
            worker.postMessage(Date.now());
            return;
          }
          // >= 3.0
          let data;
          try { data = JSON.parse(contents); } catch (error) { alert(error); return; }
          handleJSON(data);
        }, false);
        reader.readAsText(file);
      }
			// Industry Foundation Classes is a CAD schema for architectural, building and construction data.
      break; case 'ifc':
      {
        reader.addEventListener('load', async function (event) {
          const { IFCLoader } = await import('three/addons/loaders/IFCLoader.js');
          var loader = new IFCLoader();
          loader.ifcManager.setWasmPath('three/addons/loaders/ifc/');
          const model = await loader.parse(event.target.result);
          model.mesh.name = filename;
          editor.execute(new AddObjectCommand(editor, model.mesh));
        }, false);
        reader.readAsArrayBuffer(file);
      }
			// Keyhole Markup Language (Google Earth) expresses geographic annotation and visualization
			// within two-dimensional maps and three-dimensional Earth browsers.
      break; case 'kmz':
      {
        reader.addEventListener('load', async function (event) {
          const { KMZLoader } = await import('three/addons/loaders/KMZLoader.js');
          const collada = new KMZLoader().parse(event.target.result);
          collada.scene.name = filename;
          editor.execute(new AddObjectCommand(editor, collada.scene));
        }, false);
        reader.readAsArrayBuffer(file);
      }
			// An LDR file is a 3D LEGO model created with LDraw computer-aided design program
			// A MPD file consists out of blocks of LDraw code separated by 0 FILE or 0 !DATA statements.
      break; case 'ldr': case 'mpd':
      {
        reader.addEventListener('load', async function (event) {
          const { LDrawLoader } = await import('three/addons/loaders/LDrawLoader.js');
          const loader = new LDrawLoader();
          loader.setPath('../../node_modules/three/examples/models/ldraw/officialLibrary/');
          loader.parse(event.target.result, undefined, function (group) {
            group.name = filename;
            // Convert from LDraw coordinates: rotate 180 degrees around OX
            group.rotation.x = Math.PI;
            editor.execute(new AddObjectCommand(editor, group));
          });
        }, false);
        reader.readAsText(file);
      }
			// MD2 (Quake 2 model format) is a 3-D modeling format.
      break; case 'md2':
      {
        reader.addEventListener('load', async function (event) {
          const contents = event.target.result;
          const { MD2Loader } = await import('three/addons/loaders/MD2Loader.js');
          const mesh = new THREE.Mesh(new MD2Loader().parse(contents), new THREE.MeshStandardMaterial());
          mesh.mixer = new THREE.AnimationMixer(mesh);
          mesh.name = filename;
          mesh.animations.push(...geometry.animations);
          editor.execute(new AddObjectCommand(editor, mesh));
        }, false);
        reader.readAsArrayBuffer(file);
      }
			// OBJ represents 3D geometry alone — vertex, UV position of each texture coordinate vertex,
			// vertex normals, the faces that make each polygon defined as a list of vertices, and texture vertices. 
      break; case 'obj':
      {
        reader.addEventListener('load', async function (event) {
          const contents = event.target.result;
          const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js');
          const object = new OBJLoader().parse(contents);
          object.name = filename;
          editor.execute(new AddObjectCommand(editor, object));
        }, false);
        reader.readAsText(file);
      }
			// The PCD (Point Cloud Data) is a file format for storing 3D point cloud data.
      break; case 'pcd':
      {
        reader.addEventListener('load', async function (event) {
          const contents = event.target.result;
          const { PCDLoader } = await import('../../node_modules/three/examples/jsm/loaders/PCDLoader.js');
          const points = new PCDLoader().parse(contents);
          points.name = filename;
          editor.execute(new AddObjectCommand(editor, points));
        }, false);
        reader.readAsArrayBuffer(file);
      }
			// The Polygon File Format or Stanford Triangle Format stores three-dimensional data from 3D scanners.
      break; case 'ply':
      {
        reader.addEventListener('load', async function (event) {
          const contents = event.target.result;
          const { PLYLoader } = await import('three/addons/loaders/PLYLoader.js');
          const geometry = new PLYLoader().parse(contents);
          let object;
          if (geometry.index !== null) {
            object = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
          } else {
            const material = new THREE.PointsMaterial({ size: 0.01 });
            material.vertexColors = geometry.hasAttribute('color');
            object = new THREE.Points(geometry, material);            
          }
					object.name = filename;
          editor.execute(new AddObjectCommand(editor, object));
        }, false);
        reader.readAsArrayBuffer(file);
      }
			// STL is a file format commonly used for 3D printing and computer-aided design (CAD).
			// The name STL is an acronym that stands for stereolithography — a popular 3D printing technology
      break; case 'stl':
      {
        reader.addEventListener('load', async function (event) {
          const contents = event.target.result;
          const { STLLoader } = await import('three/addons/loaders/STLLoader.js');
          const mesh = new THREE.Mesh(new STLLoader().parse(contents), new THREE.MeshStandardMaterial());
          mesh.name = filename;
          editor.execute(new AddObjectCommand(editor, mesh));
        }, false);
        if (reader.readAsBinaryString !== undefined) {
          reader.readAsBinaryString(file);
        } else {
          reader.readAsArrayBuffer(file);
        }
      }
			// Scalable Vector Graphics (SVG) is a web-friendly vector file format
      break; case 'svg':
      {
        reader.addEventListener('load', async function (event) {
          const contents = event.target.result;
          const { SVGLoader } = await import('three/addons/loaders/SVGLoader.js');
          const paths = new SVGLoader().parse(contents).paths;
          const group = new THREE.Group();
          group.scale.multiplyScalar(0.1);
          group.scale.y *= - 1;
          for (let i = 0; i < paths.length; ++i) {
            const path = paths[ i ];
            const material = new THREE.MeshBasicMaterial({ color: path.color, depthWrite: false });
            const shapes = SVGLoader.createShapes(path);
            for (let j = 0; j < shapes.length; j ++) {
              const shape = shapes[ j ];
              const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
              group.add(mesh);
            }
          }
          editor.execute(new AddObjectCommand(editor, group));
        }, false);
        reader.readAsText(file);
      }
			// USDZ is a 3D file format created by Pixar. It has been adopted by Apple as their format for AR applications.
      break; case 'usdz':
      {
        reader.addEventListener('load', async function (event) {
          const contents = event.target.result;
          const { USDZLoader } = await import('../../node_modules/three/examples/jsm/loaders/USDZLoader.js');
          const group = new USDZLoader().parse(contents);
          group.name = filename;
          editor.execute(new AddObjectCommand(editor, group));
        }, false);
        reader.readAsArrayBuffer(file);
      }
			// 3D model Voxel format ("VOX" for short), a blocky 3D format used by the Voxlap game engine.
      break; case 'vox':
      {
        reader.addEventListener('load', async function (event) {
          const contents = event.target.result;
          const { VOXLoader, VOXMesh } = await import('three/addons/loaders/VOXLoader.js');
          const chunks = new VOXLoader().parse(contents);
          const group = new THREE.Group();
          group.name = filename;
          for (let i = 0; i < chunks.length; ++i) {
            const chunk = chunks[ i ];
            const mesh = new VOXMesh(chunk);
            group.add(mesh);
          }
          editor.execute(new AddObjectCommand(editor, group));
        }, false);
        reader.readAsArrayBuffer(file);
      }
			// VTK supports 1D, 2D, and 3D structured point datasets
			// VTP is a file format for storing VTK surface models (polydata)
      break; case 'vtk': case 'vtp':
      {
        reader.addEventListener('load', async function (event) {
          const contents = event.target.result;
          const { VTKLoader } = await import('three/addons/loaders/VTKLoader.js');
          const mesh = new THREE.Mesh(new VTKLoader().parse(contents), new THREE.MeshStandardMaterial());
          mesh.name = filename;
          editor.execute(new AddObjectCommand(editor, mesh));
        }, false);
        reader.readAsArrayBuffer(file);
      }
			// WRL files are an extension of the Virtual Reality Modeling Language (VRML) format.
			// VRML file types enable browser plugins to display virtual reality environments
      break; case 'wrl':
      {
        reader.addEventListener('load', async function (event) {
          const contents = event.target.result;
          const { VRMLLoader } = await import('three/addons/loaders/VRMLLoader.js');
          const result = new VRMLLoader().parse(contents);
          editor.execute(new SetSceneCommand(editor, result));
        }, false);
        reader.readAsText(file);
      }
			// XYZ (Point cloud data) is a file extension used for ASCII text files with point cloud data.
      break; case 'xyz':
      {
        reader.addEventListener('load', async function (event) {
          const contents = event.target.result;
          const { XYZLoader } = await import('three/addons/loaders/XYZLoader.js');
          const geometry = new XYZLoader().parse(contents);
          const material = new THREE.PointsMaterial();
          material.vertexColors = geometry.hasAttribute('color');
          const points = new THREE.Points(geometry, material);
          points.name = filename;
          editor.execute(new AddObjectCommand(editor, points));
        }, false);
        reader.readAsText(file);
      }
			// Supports zips containing: MTL, OBJ, FBX, GLB, or GLTF
      break; case 'zip':
      {
        reader.addEventListener('load', function (event) { handleZIP(event.target.result); }, false);
        reader.readAsArrayBuffer(file);
      }
      break; default:
        console.error('Unsupported file format (' + extension + ').');
        break;
    }
  };
  function handleJSON(data) {
    if (data.metadata 							=== undefined) { data.metadata 					= { type: 'Geometry' }; } // 2.0
    if (data.metadata.type 					=== undefined) { data.metadata.type 		= 'Geometry'; } // 3.0
    if (data.metadata.formatVersion !== undefined) { data.metadata.version 	= data.metadata.formatVersion; }
    switch (data.metadata.type.toLowerCase()) {
			case 'geometry': console.error('Loader: "Geometry" is no longer supported.'); break;
			case 'app': editor.fromJSON(data); break;
      case 'buffergeometry':
      {
        const mesh = new THREE.Mesh(new THREE.BufferGeometryLoader().parse(data));
        editor.execute(new AddObjectCommand(editor, mesh));
        break;
      }      
      case 'object':
      {
        const loader = new THREE.ObjectLoader();
        loader.setResourcePath(scope.texturePath);
        loader.parse(data, function (result) {
					editor.execute(result.isScene
						? new SetSceneCommand(editor, result)
          	: new AddObjectCommand(editor, result));
        });
        break;
      }      
    }
  }
  async function handleZIP(contents) {
    const zip = unzipSync(new Uint8Array(contents));
    // Poly
    if (zip[ 'model.obj' ] && zip[ 'materials.mtl' ]) {
      const { MTLLoader } = await import('three/addons/loaders/MTLLoader.js');
      const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js');
      const materials = new MTLLoader().parse(strFromU8(zip[ 'materials.mtl' ]));
      const object = new OBJLoader().setMaterials(materials).parse(strFromU8(zip[ 'model.obj' ]));
      editor.execute(new AddObjectCommand(editor, object));
    }
    for (const path in zip) {
      const file = zip[ path ];
      const manager = new THREE.LoadingManager();
      manager.setURLModifier(function (url) {
        const file = zip[ url ];
        if (file) {
          console.log('Loading', url);
          const blob = new Blob([ file.buffer ], { type: 'application/octet-stream' });
          return URL.createObjectURL(blob);
        }
        return url;
      });
      const extension = path.split('.').pop().toLowerCase();
      switch (extension) {
        case 'fbx':
        {
          const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
          const object = new FBXLoader(manager).parse(file.buffer);
          editor.execute(new AddObjectCommand(editor, object));
        }
        break; case 'glb':
        {
          const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js');
          const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
          const dracoLoader = new DRACOLoader();
          dracoLoader.setDecoderPath('../node_modules/three/examples/jsm/libs/draco/gltf/');
          const loader = new GLTFLoader();
          loader.setDRACOLoader(dracoLoader);
          loader.parse(file.buffer, '', function (result) {
            const scene = result.scene;
            scene.animations.push(...result.animations);
            editor.execute(new AddObjectCommand(editor, scene));
            dracoLoader.dispose();
          });
        }        
				break; case 'gltf':
        {
          const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js');
          const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
          const dracoLoader = new DRACOLoader();
          dracoLoader.setDecoderPath('../node_modules/three/examples/jsm/libs/draco/gltf/');
          const loader = new GLTFLoader(manager);
          loader.setDRACOLoader(dracoLoader);
          loader.parse(strFromU8(file), '', function (result) {
            const scene = result.scene;
            scene.animations.push(...result.animations);
            editor.execute(new AddObjectCommand(editor, scene));
            dracoLoader.dispose();
          });
        }				
				break;
      }
    }
  }
}
export { Loader };
