import { UIPanel, UIRow, UIInput, UICheckbox, UIText, UISpan } from '../libs/ui.js';
import { SidebarProjectRenderer } from './Sidebar.Project.Renderer.js';
import { SidebarProjectVideo } from './Sidebar.Project.Video.js';
function SidebarProject(editor) {
  const config = editor.config;
  const signals = editor.signals;
  const strings = editor.strings;
  const container = new UISpan();
  const settings = new UIPanel();
  settings.setBorderTop('0');
  settings.setPaddingTop('20px');
  container.add(settings);

  // Editable
  const editableRow = new UIRow();
  const editable = new UICheckbox(config.getKey('project/editable')).setLeft('100px').onChange(function() {
    config.setKey('project/editable', this.getValue());
  });
  editableRow.add(new UIText(strings.getKey('sidebar/project/editable')).setWidth('90px'));
  editableRow.add(editable);
  settings.add(editableRow);
  // WebVR
  const vrRow = new UIRow();
  const vr = new UICheckbox(config.getKey('project/vr')).setLeft('100px').onChange(function() {
    config.setKey('project/vr', this.getValue());
  });
  vrRow.add(new UIText(strings.getKey('sidebar/project/vr')).setWidth('90px'));
  vrRow.add(vr);
  settings.add(vrRow);
  //
  /* container.add(new SidebarProjectMaterials(editor)); */
  container.add(new SidebarProjectRenderer(editor));
  if ('SharedArrayBuffer' in window) {
    container.add(new SidebarProjectVideo(editor));
  }
  // Signals
  signals.editorCleared.add(function() {
    title.setValue('');
    config.setKey('project/title', '');
  });
  return container;
}
export { SidebarProject };
