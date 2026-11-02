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
  openTextFile(title: string, kind: string, pattern: string): Promise<string>;
  openPath?(path: string): Promise<boolean>;
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

/** Windows' Open dialog for a text file (SVG cut files, spreadsheets). Null if cancelled. */
export async function openTextFile(title: string, kind: string, pattern: string): Promise<{ name: string; text: string } | null> {
  if (files && files.openTextFile) {
    const json = await files.openTextFile(title, kind, pattern);
    if (!json) return null;
    const o = JSON.parse(json);
    return { name: o.name, text: o.text };
  }
  /* browser preview: a file input */
  if (!web.document) return null;
  return new Promise(resolve => {
    const input = web.document.createElement('input');
    input.type = 'file';
    input.accept = pattern.split(';').map((p: string) => p.replace('*', '')).join(',');
    input.onchange = async () => {
      const f = input.files && input.files[0];
      resolve(f ? { name: f.name, text: await f.text() } : null);
    };
    input.click();
  });
}

/** Opens a saved file in its usual app (the PDF viewer for a quote). */
export async function openPath(path: string): Promise<void> {
  if (files && files.openPath) await files.openPath(path);
}

/** Saves a file into Documents › Bandana Planner › <folder>. In the browser preview it downloads instead. */
export async function saveDocument(folder: string, name: string, text: string, type = 'application/pdf'): Promise<string> {
  if (files) return files.saveCutFile(folder, name, text);
  if (web.document) {
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 255;
    const a = web.document.createElement('a');
    a.href = web.URL.createObjectURL(new web.Blob([bytes], { type }));
    a.download = name;
    a.click();
  }
  return name;
}
