// BandanaFiles: keeps the shop on this computer and saves cut files.
//   readShop()                      -> contents of %LOCALAPPDATA%\BandanaPlanner\shop.json ("" when there isn't one yet)
//   writeShop(json)                 -> writes shop.json safely: to a temp file first, then swapped in, keeping shop.json.bak
//   saveCutFile(folder, name, text) -> Documents\Bandana Planner\<folder>\<name>, returns the full path
//   revealFile(path)                -> opens File Explorer with the file selected
//   openPath(path)                  -> opens a file in its usual app (a quote PDF in the PDF viewer)
//   pickPhotos()                    -> Open dialog for pictures (several at once); copies each into the photos folder
//                                      and returns [{"path","name","bytes"}] as JSON ("[]" if cancelled)
//   pickLogo()                      -> Open dialog for one picture; centre-cropped to a 256px square on white, saved as
//                                      logo.jpg beside shop.json; returns {"path","jpg"} (jpg is base64) or "" if cancelled
//   deleteFile(path)                -> removes a photo file for good (only inside the photos folder)
//   notify(title, body)             -> a Windows notification (reminders)
//   copyFiles(paths, folder)        -> copies files into Documents\Bandana Planner\<folder>, returns the folder
//   dataFolder()                    -> the folder shop.json lives in
//   openTextFile(title, kind, pattern) -> shows Windows' Open dialog; returns {"name","path","text"} as JSON, or "" if cancelled
#pragma once

#include "pch.h"
#include "NativeModules.h"

#include <winrt/Microsoft.Windows.AppNotifications.h>
#include <winrt/Microsoft.Windows.AppNotifications.Builder.h>

#include <ShlObj.h>
#include <shellapi.h>
#include <commdlg.h>
#include <wincodec.h>
#include <filesystem>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>

#pragma comment(lib, "shell32.lib")
#pragma comment(lib, "ole32.lib")
#pragma comment(lib, "comdlg32.lib")
#pragma comment(lib, "windowscodecs.lib")

namespace BandanaPlanner {

namespace fs = std::filesystem;

inline fs::path KnownFolder(REFKNOWNFOLDERID id) {
  PWSTR raw = nullptr;
  fs::path out;
  if (SUCCEEDED(SHGetKnownFolderPath(id, KF_FLAG_CREATE, nullptr, &raw))) {
    out = raw;
  }
  CoTaskMemFree(raw);
  return out;
}

inline fs::path DataFolder() {
  fs::path dir = KnownFolder(FOLDERID_LocalAppData) / L"BandanaPlanner";
  std::error_code ec;
  fs::create_directories(dir, ec);
  return dir;
}

inline std::wstring Widen(const std::string &s) {
  if (s.empty()) return {};
  int n = MultiByteToWideChar(CP_UTF8, 0, s.data(), static_cast<int>(s.size()), nullptr, 0);
  std::wstring w(n, L'\0');
  MultiByteToWideChar(CP_UTF8, 0, s.data(), static_cast<int>(s.size()), w.data(), n);
  return w;
}

inline std::string Narrow(const std::wstring &w) {
  if (w.empty()) return {};
  int n = WideCharToMultiByte(CP_UTF8, 0, w.data(), static_cast<int>(w.size()), nullptr, 0, nullptr, nullptr);
  std::string s(n, '\0');
  WideCharToMultiByte(CP_UTF8, 0, w.data(), static_cast<int>(w.size()), s.data(), n, nullptr, nullptr);
  return s;
}

// Folder and file names typed in the app can't contain characters Windows doesn't allow.
inline std::wstring SafeName(std::wstring name, const wchar_t *fallback) {
  for (auto &c : name) {
    if (c < 32 || wcschr(L"<>:\"/\\|?*", c)) c = L'-';
  }
  while (!name.empty() && (name.back() == L' ' || name.back() == L'.')) name.pop_back();
  return name.empty() ? std::wstring(fallback) : name;
}

inline bool WriteAll(const fs::path &file, const std::string &text) {
  std::ofstream out(file, std::ios::binary | std::ios::trunc);
  if (!out) return false;
  out.write(text.data(), static_cast<std::streamsize>(text.size()));
  out.flush();
  return static_cast<bool>(out);
}

inline std::string JsonEscape(const std::string &s) {
  std::string o;
  o.reserve(s.size() + 16);
  for (unsigned char c : s) {
    switch (c) {
      case '"': o += "\\\""; break;
      case '\\': o += "\\\\"; break;
      case '\n': o += "\\n"; break;
      case '\r': o += "\\r"; break;
      case '\t': o += "\\t"; break;
      default:
        if (c < 0x20) {
          char b[8];
          sprintf_s(b, "\\u%04x", c);
          o += b;
        } else {
          o += static_cast<char>(c);
        }
    }
  }
  return o;
}

REACT_MODULE(BandanaFiles)
struct BandanaFiles {
  REACT_METHOD(ReadShop, L"readShop")
  void ReadShop(winrt::Microsoft::ReactNative::ReactPromise<std::string> promise) noexcept {
    try {
      fs::path file = DataFolder() / L"shop.json";
      std::error_code ec;
      if (!fs::exists(file, ec)) {
        promise.Resolve(std::string());
        return;
      }
      std::ifstream in(file, std::ios::binary);
      if (!in) {
        promise.Reject(L"Couldn't open shop.json");
        return;
      }
      std::stringstream buf;
      buf << in.rdbuf();
      promise.Resolve(buf.str());
    } catch (...) {
      promise.Reject(L"Couldn't read shop.json");
    }
  }

  REACT_METHOD(WriteShop, L"writeShop")
  void WriteShop(std::string json, winrt::Microsoft::ReactNative::ReactPromise<bool> promise) noexcept {
    try {
      fs::path dir = DataFolder();
      fs::path file = dir / L"shop.json";
      fs::path tmp = dir / L"shop.json.tmp";
      fs::path bak = dir / L"shop.json.bak";
      if (!WriteAll(tmp, json)) {
        promise.Reject(L"Couldn't write the shop file");
        return;
      }
      std::error_code ec;
      if (fs::exists(file, ec)) {
        CopyFileW(file.c_str(), bak.c_str(), FALSE);
      }
      if (!MoveFileExW(tmp.c_str(), file.c_str(), MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH)) {
        promise.Reject(L"Couldn't replace the shop file");
        return;
      }
      promise.Resolve(true);
    } catch (...) {
      promise.Reject(L"Couldn't save the shop");
    }
  }

  REACT_METHOD(SaveCutFile, L"saveCutFile")
  void SaveCutFile(std::string folder, std::string name, std::string contents,
                   winrt::Microsoft::ReactNative::ReactPromise<std::string> promise) noexcept {
    try {
      fs::path dir = KnownFolder(FOLDERID_Documents) / L"Bandana Planner" / SafeName(Widen(folder), L"Cut plan");
      std::error_code ec;
      fs::create_directories(dir, ec);
      fs::path file = dir / SafeName(Widen(name), L"cut-file.svg");
      if (!WriteAll(file, contents)) {
        promise.Reject(L"Couldn't save the cut file");
        return;
      }
      promise.Resolve(Narrow(file.wstring()));
    } catch (...) {
      promise.Reject(L"Couldn't save the cut file");
    }
  }

  REACT_METHOD(RevealFile, L"revealFile")
  void RevealFile(std::string path, winrt::Microsoft::ReactNative::ReactPromise<bool> promise) noexcept {
    std::wstring args = L"/select,\"" + Widen(path) + L"\"";
    auto r = reinterpret_cast<INT_PTR>(ShellExecuteW(nullptr, L"open", L"explorer.exe", args.c_str(), nullptr, SW_SHOWNORMAL));
    promise.Resolve(r > 32);
  }

  REACT_METHOD(OpenTextFile, L"openTextFile")
  void OpenTextFile(std::string title, std::string kind, std::string pattern,
                    winrt::Microsoft::ReactNative::ReactPromise<std::string> promise) noexcept {
    try {
      // Filter is "<kind> (<pattern>)\0<pattern>\0All files\0*.*\0\0"
      std::wstring k = Widen(kind), pat = Widen(pattern);
      std::wstring filter = k + L" (" + pat + L")";
      filter.push_back(L'\0');
      filter += pat;
      filter.push_back(L'\0');
      filter += L"All files";
      filter.push_back(L'\0');
      filter += L"*.*";
      filter.push_back(L'\0');
      filter.push_back(L'\0');
      std::wstring t = Widen(title);
      wchar_t file[4096] = L"";
      OPENFILENAMEW ofn{};
      ofn.lStructSize = sizeof(ofn);
      ofn.hwndOwner = GetForegroundWindow();
      ofn.lpstrFilter = filter.c_str();
      ofn.lpstrFile = file;
      ofn.nMaxFile = static_cast<DWORD>(std::size(file));
      ofn.lpstrTitle = t.empty() ? nullptr : t.c_str();
      ofn.Flags = OFN_FILEMUSTEXIST | OFN_PATHMUSTEXIST | OFN_NOCHANGEDIR | OFN_EXPLORER;
      if (!GetOpenFileNameW(&ofn)) {
        promise.Resolve(std::string());
        return;
      }
      fs::path path(file);
      std::error_code ec;
      auto size = fs::file_size(path, ec);
      if (ec || size > 2 * 1024 * 1024) {
        promise.Reject(L"That file is too big");
        return;
      }
      std::ifstream in(path, std::ios::binary);
      if (!in) {
        promise.Reject(L"Couldn't open that file");
        return;
      }
      std::stringstream buf;
      buf << in.rdbuf();
      std::string text = buf.str();
      if (text.size() >= 3 && static_cast<unsigned char>(text[0]) == 0xEF && static_cast<unsigned char>(text[1]) == 0xBB &&
          static_cast<unsigned char>(text[2]) == 0xBF) {
        text.erase(0, 3);
      }
      std::string out = "{\"name\":\"" + JsonEscape(Narrow(path.filename().wstring())) + "\",\"path\":\"" +
          JsonEscape(Narrow(path.wstring())) + "\",\"text\":\"" + JsonEscape(text) + "\"}";
      promise.Resolve(out);
    } catch (...) {
      promise.Reject(L"Couldn't open that file");
    }
  }

  REACT_METHOD(OpenPath, L"openPath")
  void OpenPath(std::string path, winrt::Microsoft::ReactNative::ReactPromise<bool> promise) noexcept {
    std::wstring p = Widen(path);
    auto r = reinterpret_cast<INT_PTR>(ShellExecuteW(nullptr, L"open", p.c_str(), nullptr, nullptr, SW_SHOWNORMAL));
    promise.Resolve(r > 32);
  }

  REACT_METHOD(PickPhotos, L"pickPhotos")
  void PickPhotos(winrt::Microsoft::ReactNative::ReactPromise<std::string> promise) noexcept {
    try {
      std::wstring filter = L"Pictures (*.jpg;*.jpeg;*.png;*.gif;*.bmp;*.webp)";
      filter.push_back(L'\0');
      filter += L"*.jpg;*.jpeg;*.png;*.gif;*.bmp;*.webp";
      filter.push_back(L'\0');
      filter.push_back(L'\0');
      std::vector<wchar_t> buf(65536, L'\0');
      OPENFILENAMEW ofn{};
      ofn.lStructSize = sizeof(ofn);
      ofn.hwndOwner = GetForegroundWindow();
      ofn.lpstrFilter = filter.c_str();
      ofn.lpstrFile = buf.data();
      ofn.nMaxFile = static_cast<DWORD>(buf.size());
      ofn.lpstrTitle = L"Add photos";
      ofn.Flags = OFN_FILEMUSTEXIST | OFN_PATHMUSTEXIST | OFN_NOCHANGEDIR | OFN_EXPLORER | OFN_ALLOWMULTISELECT;
      if (!GetOpenFileNameW(&ofn)) {
        promise.Resolve("[]");
        return;
      }
      // One file: the full path. Several: the folder, then each name, each ending in \0, then a final \0.
      std::vector<fs::path> picked;
      std::wstring first(buf.data());
      const wchar_t *p = buf.data() + first.size() + 1;
      if (!*p) {
        picked.push_back(fs::path(first));
      } else {
        while (*p) {
          std::wstring name(p);
          picked.push_back(fs::path(first) / name);
          p += name.size() + 1;
        }
      }
      fs::path dir = DataFolder() / L"photos";
      std::error_code ec;
      fs::create_directories(dir, ec);
      std::string out = "[";
      bool any = false;
      ULONGLONG stamp = GetTickCount64();
      int n = 0;
      for (auto &src : picked) {
        std::wstring ext = src.extension().wstring();
        for (auto &c : ext) c = static_cast<wchar_t>(towlower(c));
        fs::path dst = dir / (L"p" + std::to_wstring(stamp) + L"-" + std::to_wstring(n++) + ext);
        if (!CopyFileW(src.c_str(), dst.c_str(), TRUE)) continue;
        auto bytes = fs::file_size(dst, ec);
        if (any) out += ",";
        out += "{\"path\":\"" + JsonEscape(Narrow(dst.wstring())) + "\",\"name\":\"" + JsonEscape(Narrow(src.filename().wstring())) +
            "\",\"bytes\":" + std::to_string(ec ? 0 : bytes) + "}";
        any = true;
      }
      out += "]";
      promise.Resolve(out);
    } catch (...) {
      promise.Reject(L"Couldn't add those photos");
    }
  }

  REACT_METHOD(PickLogo, L"pickLogo")
  void PickLogo(winrt::Microsoft::ReactNative::ReactPromise<std::string> promise) noexcept {
    try {
      std::wstring filter = L"Pictures (*.jpg;*.jpeg;*.png;*.gif;*.bmp)";
      filter.push_back(L'\0');
      filter += L"*.jpg;*.jpeg;*.png;*.gif;*.bmp";
      filter.push_back(L'\0');
      filter.push_back(L'\0');
      std::vector<wchar_t> buf(4096, L'\0');
      OPENFILENAMEW ofn{};
      ofn.lStructSize = sizeof(ofn);
      ofn.hwndOwner = GetForegroundWindow();
      ofn.lpstrFilter = filter.c_str();
      ofn.lpstrFile = buf.data();
      ofn.nMaxFile = static_cast<DWORD>(buf.size());
      ofn.lpstrTitle = L"Choose your logo";
      ofn.Flags = OFN_FILEMUSTEXIST | OFN_PATHMUSTEXIST | OFN_NOCHANGEDIR | OFN_EXPLORER;
      if (!GetOpenFileNameW(&ofn)) {
        promise.Resolve("");
        return;
      }
      HRESULT ci = CoInitializeEx(nullptr, COINIT_MULTITHREADED);
      std::string out;
      {
        winrt::com_ptr<IWICImagingFactory> wic;
        winrt::check_hresult(CoCreateInstance(CLSID_WICImagingFactory, nullptr, CLSCTX_INPROC_SERVER, IID_PPV_ARGS(wic.put())));
        winrt::com_ptr<IWICBitmapDecoder> dec;
        winrt::check_hresult(wic->CreateDecoderFromFilename(buf.data(), nullptr, GENERIC_READ, WICDecodeMetadataCacheOnLoad, dec.put()));
        winrt::com_ptr<IWICBitmapFrameDecode> frame;
        winrt::check_hresult(dec->GetFrame(0, frame.put()));
        winrt::com_ptr<IWICFormatConverter> conv;
        winrt::check_hresult(wic->CreateFormatConverter(conv.put()));
        winrt::check_hresult(conv->Initialize(frame.get(), GUID_WICPixelFormat32bppPBGRA, WICBitmapDitherTypeNone, nullptr, 0.0, WICBitmapPaletteTypeCustom));
        UINT w = 0, h = 0;
        winrt::check_hresult(conv->GetSize(&w, &h));
        UINT side = (std::min)(w, h);
        WICRect rc{static_cast<INT>((w - side) / 2), static_cast<INT>((h - side) / 2), static_cast<INT>(side), static_cast<INT>(side)};
        winrt::com_ptr<IWICBitmapClipper> clip;
        winrt::check_hresult(wic->CreateBitmapClipper(clip.put()));
        winrt::check_hresult(clip->Initialize(conv.get(), &rc));
        const UINT N = 256;
        winrt::com_ptr<IWICBitmapScaler> sc;
        winrt::check_hresult(wic->CreateBitmapScaler(sc.put()));
        winrt::check_hresult(sc->Initialize(clip.get(), N, N, WICBitmapInterpolationModeFant));
        std::vector<BYTE> px(N * N * 4);
        winrt::check_hresult(sc->CopyPixels(nullptr, N * 4, static_cast<UINT>(px.size()), px.data()));
        // Flatten onto white (the pixels are premultiplied)
        std::vector<BYTE> rgb(N * N * 3);
        for (UINT i = 0; i < N * N; i++) {
          BYTE a = px[i * 4 + 3];
          for (int c = 0; c < 3; c++) rgb[i * 3 + c] = static_cast<BYTE>((std::min)(255, px[i * 4 + c] + (255 - a)));
        }
        winrt::com_ptr<IWICBitmap> flat;
        winrt::check_hresult(wic->CreateBitmapFromMemory(N, N, GUID_WICPixelFormat24bppBGR, N * 3, static_cast<UINT>(rgb.size()), rgb.data(), flat.put()));
        winrt::com_ptr<IStream> mem;
        winrt::check_hresult(CreateStreamOnHGlobal(nullptr, TRUE, mem.put()));
        winrt::com_ptr<IWICBitmapEncoder> enc;
        winrt::check_hresult(wic->CreateEncoder(GUID_ContainerFormatJpeg, nullptr, enc.put()));
        winrt::check_hresult(enc->Initialize(mem.get(), WICBitmapEncoderNoCache));
        winrt::com_ptr<IWICBitmapFrameEncode> fe;
        winrt::com_ptr<IPropertyBag2> props;
        winrt::check_hresult(enc->CreateNewFrame(fe.put(), props.put()));
        winrt::check_hresult(fe->Initialize(props.get()));
        winrt::check_hresult(fe->SetSize(N, N));
        WICPixelFormatGUID fmt = GUID_WICPixelFormat24bppBGR;
        winrt::check_hresult(fe->SetPixelFormat(&fmt));
        winrt::check_hresult(fe->WriteSource(flat.get(), nullptr));
        winrt::check_hresult(fe->Commit());
        winrt::check_hresult(enc->Commit());
        HGLOBAL hg = nullptr;
        winrt::check_hresult(GetHGlobalFromStream(mem.get(), &hg));
        STATSTG st{};
        winrt::check_hresult(mem->Stat(&st, STATFLAG_NONAME));
        size_t len = static_cast<size_t>(st.cbSize.QuadPart);
        const BYTE *data = static_cast<const BYTE *>(GlobalLock(hg));
        std::string bytes(reinterpret_cast<const char *>(data), len);
        GlobalUnlock(hg);
        fs::path dst = DataFolder() / (L"logo-" + std::to_wstring(GetTickCount64()) + L".jpg");
        {
          std::ofstream f(dst, std::ios::binary | std::ios::trunc);
          f.write(bytes.data(), static_cast<std::streamsize>(bytes.size()));
        }
        static const char *B = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        std::string b64;
        b64.reserve((len + 2) / 3 * 4);
        for (size_t i = 0; i < len; i += 3) {
          unsigned v = static_cast<unsigned char>(bytes[i]) << 16;
          if (i + 1 < len) v |= static_cast<unsigned char>(bytes[i + 1]) << 8;
          if (i + 2 < len) v |= static_cast<unsigned char>(bytes[i + 2]);
          b64 += B[(v >> 18) & 63];
          b64 += B[(v >> 12) & 63];
          b64 += i + 1 < len ? B[(v >> 6) & 63] : '=';
          b64 += i + 2 < len ? B[v & 63] : '=';
        }
        out = "{\"path\":\"" + JsonEscape(Narrow(dst.wstring())) + "\",\"jpg\":\"" + b64 + "\"}";
      }
      if (SUCCEEDED(ci)) CoUninitialize();
      promise.Resolve(out);
    } catch (...) {
      promise.Reject(L"That picture couldn't be read");
    }
  }

  REACT_METHOD(RemovePhotoFile, L"deleteFile")
  void RemovePhotoFile(std::string path, winrt::Microsoft::ReactNative::ReactPromise<bool> promise) noexcept {
    try {
      fs::path file(Widen(path));
      fs::path dir = DataFolder() / L"photos";
      std::error_code ec;
      auto rel = fs::relative(file, dir, ec);
      if (ec || rel.empty() || rel.native().rfind(L"..", 0) == 0) {
        promise.Resolve(false);
        return;
      }
      promise.Resolve(fs::remove(file, ec));
    } catch (...) {
      promise.Resolve(false);
    }
  }

  REACT_METHOD(CopyFiles, L"copyFiles")
  void CopyFiles(std::vector<std::string> paths, std::string folder, winrt::Microsoft::ReactNative::ReactPromise<std::string> promise) noexcept {
    try {
      fs::path dir = KnownFolder(FOLDERID_Documents) / L"Bandana Planner" / SafeName(Widen(folder), L"Photos");
      std::error_code ec;
      fs::create_directories(dir, ec);
      int n = 1;
      for (auto &p : paths) {
        fs::path src(Widen(p));
        fs::path dst = dir / (std::to_wstring(n++) + src.extension().wstring());
        CopyFileW(src.c_str(), dst.c_str(), FALSE);
      }
      promise.Resolve(Narrow(dir.wstring()));
    } catch (...) {
      promise.Reject(L"Couldn't copy the photos");
    }
  }

  REACT_METHOD(Notify, L"notify")
  void Notify(std::string title, std::string body, winrt::Microsoft::ReactNative::ReactPromise<bool> promise) noexcept {
    try {
      namespace AN = winrt::Microsoft::Windows::AppNotifications;
      static bool registered = false;
      if (!registered) {
        AN::AppNotificationManager::Default().Register();
        registered = true;
      }
      auto note = AN::Builder::AppNotificationBuilder().AddText(winrt::hstring(Widen(title))).AddText(winrt::hstring(Widen(body))).BuildNotification();
      AN::AppNotificationManager::Default().Show(note);
      promise.Resolve(true);
    } catch (...) {
      promise.Resolve(false);
    }
  }

  REACT_METHOD(GetDataFolder, L"dataFolder")
  void GetDataFolder(winrt::Microsoft::ReactNative::ReactPromise<std::string> promise) noexcept {
    promise.Resolve(Narrow(DataFolder().wstring()));
  }
};

} // namespace BandanaPlanner
