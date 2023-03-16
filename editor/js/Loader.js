import { AddObjectCommand } from './commands/AddObjectCommand.js';
import { SetSceneCommand } from './commands/SetSceneCommand.js';
import { LoaderUtils } from './LoaderUtils.js';
import { ContentLoader } from '../../contentloader.js';

function Loader(editor) {
  const scope = this;
  this.texturePath = '';
	this.callbacks = {};
	this.callbacks.onAddObject = function(object) {
		editor.execute(new AddObjectCommand(editor, object));
	};
	this.callbacks.onSetScene = function(scene) {
		editor.execute(new SetSceneCommand(editor, scene));
	};
	this.callbacks.onLoadAppJson = function(appJson) {
		editor.fromJSON(appJson);
	}
	this.contentLoader = new ContentLoader(scope.callbacks);
	this.loadFiles = function (files, filesMap) {
		scope.contentLoader.texturePath = scope.texturePath;
		scope.contentLoader.loadFiles(files, filesMap);
  };
	this.loadItemList = function (items) {
    LoaderUtils.getFilesFromItemList(items, function (files, filesMap) {
      scope.loadFiles(files, filesMap);
    });
  };
}
export { Loader };
