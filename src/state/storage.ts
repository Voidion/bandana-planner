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
  pickPhotos?(): Promise<string>;
  pickLogo?(): Promise<string>;
  notify?(title: string, body: string): Promise<boolean>;
  deleteFile?(path: string): Promise<boolean>;
  copyFiles?(paths: string[], folder: string): Promise<string>;
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

/** Windows' Open dialog for pictures; each is copied into the app's photos folder. Returns where they were saved. */
export async function pickPhotos(): Promise<{ src: string; name: string }[]> {
  if (files && files.pickPhotos) {
    const list = JSON.parse((await files.pickPhotos()) || '[]') as { path: string; name: string }[];
    return list.map(p => ({ src: 'file:///' + p.path.replace(/\\/g, '/'), name: p.name }));
  }
  if (!web.document) return [];
  return new Promise(resolve => {
    const input = web.document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async () => {
      const out: { src: string; name: string }[] = [];
      for (const f of Array.from(input.files || []) as any[]) {
        out.push(await new Promise(res => {
          const r = new web.FileReader();
          r.onload = () => res({ src: String(r.result), name: f.name });
          r.readAsDataURL(f);
        }));
      }
      resolve(out);
    };
    input.click();
  });
}
/** Your logo for quotes: one picture, centre-cropped to a 256px square JPEG on white. jpg is its base64, for the PDF. */
export async function pickLogo(): Promise<{ src: string; jpg: string } | null> {
  if (files && files.pickLogo) {
    const raw = await files.pickLogo();
    if (!raw) return null;
    const o = JSON.parse(raw) as { path: string; jpg: string };
    return { src: 'file:///' + o.path.replace(/\\/g, '/'), jpg: o.jpg };
  }
  if (!web.document) return null;
  return new Promise(resolve => {
    const input = web.document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const f = (input.files || [])[0];
      if (!f) return resolve(null);
      const r = new web.FileReader();
      r.onload = () => {
        const img = new web.Image();
        img.onload = () => {
          const N = 256;
          const c = web.document.createElement('canvas');
          c.width = c.height = N;
          const g = c.getContext('2d');
          g.fillStyle = '#FFFFFF';
          g.fillRect(0, 0, N, N);
          const sd = Math.min(img.width, img.height);
          g.drawImage(img, (img.width - sd) / 2, (img.height - sd) / 2, sd, sd, 0, 0, N, N);
          const url = c.toDataURL('image/jpeg', 0.88);
          resolve({ src: url, jpg: url.split(',')[1] });
        };
        img.onerror = () => resolve(null);
        img.src = String(r.result);
      };
      r.readAsDataURL(f);
    };
    input.click();
  });
}
const filePath = (src: string) => (src.startsWith('file:///') ? src.slice(8).replace(/\//g, '\\') : '');
export async function deletePhotoFile(src: string) {
  const p = filePath(src);
  if (p && files && files.deleteFile) await files.deleteFile(p);
}
export async function exportPhotos(srcs: string[], folder: string): Promise<string | null> {
  const ps = srcs.map(filePath).filter(Boolean);
  if (ps.length && files && files.copyFiles) return files.copyFiles(ps, folder);
  return null;
}

export async function dataFolderPath(): Promise<string | null> {
  return files ? files.dataFolder() : null;
}

/** A Windows notification. In the browser preview it does nothing. */
export async function notify(title: string, body: string): Promise<boolean> {
  if (files && files.notify) return files.notify(title, body);
  return false;
}
