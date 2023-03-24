import { UICheckbox, UIInput, UIPanel, UIText } from './libs/ui.js';
import { UIBoolean } from './libs/ui.three.js';
function MenubarGrid(editor) {
  const config = editor.config;
  const signals = editor.signals;
  const strings = editor.strings;

  const container = new UIPanel();
  container.setClass('menu');
  container.dom.style.marginLeft = '64px';

  // Title
  const title = new UIInput(config.getKey('project/title'))
    .onChange(function() {
      config.setKey('project/title', this.getValue());
    });
  container.add(new UIText('Level').setClass('title'));
  container.add(title);

  const useGrid = new UIBoolean(editor.config.getKey('grid'), 'Grid');
  const gridX = new UIInput(1).setWidth('16px');
  const gridY = new UIInput(1).setWidth('16px');

  container.add(useGrid);
  container.add(new UIText('X').setClass('title')); // Ensures vertical alignment
  container.add(gridX);
  container.add(new UIText('Y').setClass('title'));
  container.add(gridY);

  return container;
}
export { MenubarGrid };
