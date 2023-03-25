import { UIInput, UIPanel, UIText } from '../libs/ui.js';

function MenubarLevel(editor) {

  const container = new UIPanel();
  container.setClass('menu');
  container.dom.style.marginLeft = '16px';
  
  container.add(new UIText('Level').setClass('title'));
  container.add(new UIInput(editor.config.getKey('project/title'))
    .onChange(function() { editor.config.setKey('project/title', this.getValue()); }));

  return container;
}
export { MenubarLevel };
