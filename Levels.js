import { ContentLoader } from './ContentLoader.js';
import global from './Global.js';
import * as Make4d from './Make4d.js';

class Levels {
  constructor() {
    const scope = this;
    this.texturePath = '';
    this.callbacks = {};
    this.callbacks.onAddObject = function (object) {
      if (object.isMesh) {
        Make4d.bless4d(object); // TODO: Check if it should be 4d first!
        global.terrainGroup.attach(object);
      }
    };
    this.callbacks.onSetScene = function (scene) { };
    this.callbacks.onLoadAppJson = function (appJson) { };
    this.contentLoader = new ContentLoader(scope.callbacks);
  }
  loadAllLevels() {
    const levelIds = ['level1'];
    const levels = levelIds.map(id => {
      return {
        id: id,
        url: `levels/${id}.json`
      };
    });
    Promise
    .all(levels.map(level => {
        return fetch(level.url)
          .then(response => {
            level.response = response;
            return response.blob();
          })
          .then(blob => {
            level.blob = blob;
            return level;
          })
          .catch(error => {
            level.error = error;
          });
      }))
    .then(levels => {
      levels.forEach(level => {
        this.contentLoader.loadFile(new File([level.blob], level.url));
      });
    });
  }
}
export { Levels };
