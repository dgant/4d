import { AddObjectCommand } from './commands/AddObjectCommand.js';
import { SetSceneCommand } from './commands/SetSceneCommand.js';
import { ContentLoader } from '../../ContentLoader.js';

class Loader {
	constructor(editor) {
		this.texturePath = '';
		this.callbacks = {};
		this.callbacks.onAddObject = function (object) { editor.execute(new AddObjectCommand(editor, object)); };
		this.callbacks.onSetScene = function (scene) { editor.execute(new SetSceneCommand(editor, scene)); };
		this.callbacks.onLoadAppJson = function (appJson) { editor.fromJSON(appJson); };
		this.contentLoader = new ContentLoader(this.callbacks);
	}
	loadFiles (files, filesMap) {
		this.contentLoader.texturePath = this.texturePath;
		this.contentLoader.loadFiles(files, filesMap);
	};
	loadItemList = function (items) {
		this.contentLoader.loadItemList(items);
	};
}
export { Loader };
