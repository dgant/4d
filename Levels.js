import { ContentLoader } from './ContentLoader.js';
import global from './Global.js';
import * as Make4d from './Make4d.js';

function Levels() {
  const scope = this;
  this.texturePath = '';
  this.callbacks = {};
  this.callbacks.onAddObject = function(object) {
    if (object.isMesh) {
      Make4d.bless4d(object); // TODO: Check if it should be 4d first!
      global.terrainGroup.attach(object);      
    }
  };
  this.callbacks.onSetScene = function(scene) {};
  this.callbacks.onLoadAppJson = function(appJson) {}
  this.contentLoader = new ContentLoader(scope.callbacks);

  this.loadAllLevels = function() {
    const levelIds = ['level1'];
    const levelURLs = levelIds.map(levelId => { return { id: levelId, url: `levels/${levelId}.json` }});
    const levelPromises = levelURLs.map(level => {
      return fetch(level.url)
      .then(  response  => { return { id: level.id, url: level.url, response: response }})
      .catch( error     => { return { id: level.id, url: level.url, error: error }})
      .then(  level     => { return {};});
    });
    Promises.all(levelPromises)
    .then(levelFile => )

    const levelFiles = [];
    for (const i in levels) {
      fetch('levels/' + levels[i])
      .then(response => levelFiles[i] = )
    }
    scope.contentLoader.loadFiles(levels);
  };
}
export { Levels };
