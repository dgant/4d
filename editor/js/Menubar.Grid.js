import { UICheckbox, UIInput, UIPanel, UIText } from './libs/ui.js';

function MenubarGrid(editor) {

  const container = new UIPanel();
  container.setClass('menu');
  container.dom.style.marginLeft = '64px';

  // Title
  container.add(new UIText('Level').setClass('title'));
  container.add(new UIInput(editor.config.getKey('project/title'))
    .onChange(function() { editor.config.setKey('project/title', this.getValue()); }));

  // Snap
  const snap = new UICheckbox('Snap');
  const snapSize = new UIInput(1).setWidth('16px');
  function updateGrid() {
    editor.signals.snapChanged.dispatch(snap.getValue() ? snapSize.getValue() : 0);
  };
  snap.onChange(function() { updateGrid(); })
  snapSize.onChange(function() { updateGrid(); })
  container.add(new UIText('Snap').setClass('title')); // Ensures vertical alignment
  container.add(snap);
  container.add(snapSize);  
  updateGrid();

  return container;
}
export { MenubarGrid };
