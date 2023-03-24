import { UIPanel } from './libs/ui.js';
import { MenubarAdd } from './menus/Menubar.Add.js';
import { MenubarEdit } from './menus/Menubar.Edit.js';
import { MenubarFile } from './menus/Menubar.File.js';
import { MenubarView } from './menus/Menubar.View.js';
import { MenubarPlay } from './menus/Menubar.Play.js';
import { MenubarLevel } from './menus/Menubar.Level.js';
import { MenubarGrid } from './menus/Menubar.Grid.js';
import { MenubarStatus } from './menus/Menubar.Status.js';

function Menubar(editor) {
  const container = new UIPanel();
  container.setId('menubar');
  container.add(new MenubarFile(editor));
  container.add(new MenubarEdit(editor));
  container.add(new MenubarAdd(editor));  
  container.add(new MenubarView(editor));
  container.add(new MenubarPlay(editor));
  container.add(new MenubarLevel(editor));
  container.add(new MenubarGrid(editor));
  container.add(new MenubarStatus(editor));
  return container;
}
export { Menubar };
