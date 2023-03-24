import { UICheckbox, UIInput, UIPanel, UIText } from '../libs/ui.js';

function MenubarGrid(editor) {

  const container = new UIPanel();
  container.setClass('menu');
  container.dom.style.marginLeft = '16px';
  
  // Translation Snap 
  const snap = new UICheckbox('Snap');
  const snapSizeTranslation = new UIInput(1).setWidth('16px');
  const snapSizeRotation = new UIInput(8).setWidth('16px');
  function updateSnap() {
    const snapEnabled = snap.getValue();
    editor.signals.translationSnapChanged.dispatch(
      (snapEnabled && parseInt(snapSizeTranslation.getValue()) || 0));
    editor.signals.rotationSnapChanged.dispatch(
      (snapEnabled && (2 * Math.PI / parseInt(snapSizeRotation.getValue())) || 0));
  };
  snap.onChange(function() { updateSnap(); })
  snapSizeTranslation.onChange(function() { updateSnap(); })
  snapSizeRotation.onChange(function() { updateSnap(); })
  container.add(new UIText('Snap').setClass('title')); // Ensures vertical alignment
  container.add(snap);
  container.add(new UIText('XYZ').setClass('title')); // Ensures vertical alignment
  container.add(snapSizeTranslation);
  container.add(new UIText('Angles').setClass('title')); // Ensures vertical alignment
  container.add(snapSizeRotation);  
  updateSnap();

  return container;
}
export { MenubarGrid };
