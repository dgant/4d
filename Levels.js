import { ContentLoader } from './ContentLoader.js';
import global from './Global.js';
import * as Make4d from './Make4d.js';

class Levels {
  constructor() {
    const scope = this;
    this.texturePath = '';
    this.callbacks = {};
    this.callbacks.onAddObject = object => {
      if (object.isMesh) {
        global.terrainGroup.attach(object);        
        Make4d.bless4d(object); // TODO: Check if it should be 4d first!
      }
    };
    this.callbacks.onSetScene = scene => {
      while(scene.children.length > 0) {
        this.callbacks.onAddObject(scene.children[0]); // This will pop them from the array
      };
    };
    this.callbacks.onLoadAppJson = appJson => { };
    this.contentLoader = new ContentLoader(scope.callbacks);
  }
  async loadAllLevels() {
    const levelIds = ['level1'];
    const levels = levelIds.map(id => {
      return {
        id: id,
        url: `levels/${id}.json`
      };
    });
    await Promise
      .all(levels.map(level => {
          return fetch(level.url)
            .then(response => { level.response  = response; return response.blob(); })
            .then(blob =>     { level.blob      = blob;     return level; })         
            .catch(error =>   { level.error     = error;    return level; });
        }));
    for (const level of levels) {
      if (level.error) {
        console.log(`Failed to load level ${level.id}: ${error}`);
      } else {
        await this.contentLoader.loadFile(new File([level.blob], level.url));
      }
    }
  }
}
export { Levels };
