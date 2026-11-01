/* Where the shop lives on this computer.
   On Windows: the BandanaFiles native module (windows/BandanaPlanner/BandanaFiles.h) keeps one JSON file at
   %LOCALAPPDATA%\BandanaPlanner\shop.json, written safely (temp file, then swapped in), plus a .bak of the last good copy.
   In the browser preview it falls back to localStorage. */
import { NativeModules, TurboModuleRegistry } from 'react-native';

type FilesModule = {
  readShop(): Promise<string>;
  writeShop(json: string): Promise<boolean>;
  saveCutFile(folder: string, fileName: string, contents: string): Promise<string>;
  revealFile(path: string): Promise<boolean>;
  dataFolder(): Promise<string>;
};

function nativeFiles(): FilesModule | null {
  try {
    const m = TurboModuleRegistry.get<any>('BandanaFiles');
    if (m) return m as FilesModule;
  } catch (e) {
    /* not registered as a TurboModule */
  }
  return (NativeModules as any).BandanaFiles || null;
}

const KEY = 'bandana-planner-shop';
const web = globalThis as any;

export const files = nativeFiles();
export const onDevice = !!files;

export async function readShop(): Promise<string | null> {
  if (files) {
    const s = await files.readShop();
    return s && s.length ? s : null;
  }
  try {
    return web.localStorage ? web.localStorage.getItem(KEY) : null;
  } catch (e) {
    return null;
  }
}

export async function writeShop(json: string): Promise<void> {
  if (files) {
    await files.writeShop(json);
    return;
  }
  try {
    web.localStorage && web.localStorage.setItem(KEY, json);
  } catch (e) {
    /* storage full or blocked; the in-memory shop still works */
  }
}

/** Saves a cut file (SVG) for Cricut Design Space. Returns the full path it was saved to. */
export async function saveCutFile(folder: string, fileName: string, svg: string): Promise<string> {
  if (files) return files.saveCutFile(folder, fileName, svg);
  /* browser preview: download it */
  if (web.document) {
    const a = web.document.createElement('a');
    a.href = web.URL.createObjectURL(new web.Blob([svg], { type: 'image/svg+xml' }));
    a.download = fileName;
    a.click();
  }
  return fileName;
}

export async function revealFile(path: string): Promise<void> {
  if (files) await files.revealFile(path);
}
