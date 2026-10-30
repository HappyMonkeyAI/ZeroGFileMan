import { Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron';

export type MenuCommand =
  | 'file:new-folder'
  | 'file:rename'
  | 'file:delete'
  | 'file:copy-path'
  | 'file:open'
  | 'file:open-notepad'
  | 'file:open-terminal'
  | 'file:reveal'
  | 'file:refresh'
  | 'file:quit'
  | 'edit:copy'
  | 'edit:cut'
  | 'edit:paste'
  | 'view:toggle-hidden'
  | 'view:toggle-autonav'
  | 'view:theme-dark'
  | 'view:theme-light'
  | 'view:theme-nord'
  | 'view:theme-dracula'
  | 'window:focus-left'
  | 'window:focus-right'
  | 'voice:navigate'
  | 'voice:action'
  | 'help:about';

function send(win: BrowserWindow | undefined, command: MenuCommand): void {
  win?.webContents.send('menu:command', command);
}

export function installApplicationMenu(getWindow: () => BrowserWindow | undefined): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Folder',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => send(getWindow(), 'file:new-folder')
        },
        {
          label: 'Rename',
          accelerator: 'F2',
          click: () => send(getWindow(), 'file:rename')
        },
        {
          label: 'Delete',
          accelerator: 'Delete',
          click: () => send(getWindow(), 'file:delete')
        },
        { type: 'separator' },
        {
          label: 'Open',
          accelerator: 'Enter',
          click: () => send(getWindow(), 'file:open')
        },
        {
          label: 'Open with Notepad',
          click: () => send(getWindow(), 'file:open-notepad')
        },
        {
          label: 'Open Terminal Here',
          click: () => send(getWindow(), 'file:open-terminal')
        },
        {
          label: 'Reveal in Explorer',
          click: () => send(getWindow(), 'file:reveal')
        },
        { type: 'separator' },
        {
          label: 'Copy Path',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => send(getWindow(), 'file:copy-path')
        },
        {
          label: 'Refresh',
          accelerator: 'F5',
          click: () => send(getWindow(), 'file:refresh')
        },
        { type: 'separator' },
        { role: 'quit', label: 'Quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          click: () => send(getWindow(), 'edit:copy')
        },
        {
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          click: () => send(getWindow(), 'edit:cut')
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          click: () => send(getWindow(), 'edit:paste')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Show Hidden Files',
          accelerator: 'CmdOrCtrl+H',
          click: () => send(getWindow(), 'view:toggle-hidden')
        },
        {
          label: 'Auto-navigate on Voice Match',
          click: () => send(getWindow(), 'view:toggle-autonav')
        },
        { type: 'separator' },
        {
          label: 'Theme',
          submenu: [
            { label: 'Deck (Pro Commander)', click: () => send(getWindow(), 'view:theme-dark') },
            { label: 'Light', click: () => send(getWindow(), 'view:theme-light') },
            { label: 'Nord', click: () => send(getWindow(), 'view:theme-nord') },
            { label: 'Dracula', click: () => send(getWindow(), 'view:theme-dracula') }
          ]
        },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Voice',
      submenu: [
        {
          label: 'Navigate (active pane)',
          accelerator: 'CmdOrCtrl+Shift+V',
          click: () => send(getWindow(), 'voice:navigate')
        },
        {
          label: 'Action (active pane)',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => send(getWindow(), 'voice:action')
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        {
          label: 'Focus Left Pane',
          accelerator: 'CmdOrCtrl+1',
          click: () => send(getWindow(), 'window:focus-left')
        },
        {
          label: 'Focus Right Pane',
          accelerator: 'CmdOrCtrl+2',
          click: () => send(getWindow(), 'window:focus-right')
        },
        { type: 'separator' },
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About ZeroG FileMan',
          click: () => send(getWindow(), 'help:about')
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
