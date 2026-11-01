// BandanaFiles: keeps the shop on this computer and saves cut files.
//   readShop()                      -> contents of %LOCALAPPDATA%\BandanaPlanner\shop.json ("" when there isn't one yet)
//   writeShop(json)                 -> writes shop.json safely: to a temp file first, then swapped in, keeping shop.json.bak
//   saveCutFile(folder, name, text) -> Documents\Bandana Planner\<folder>\<name>, returns the full path
//   revealFile(path)                -> opens File Explorer with the file selected
//   dataFolder()                    -> the folder shop.json lives in
#pragma once

#include "pch.h"
#include "NativeModules.h"

#include <ShlObj.h>
#include <shellapi.h>
#include <filesystem>
#include <fstream>
#include <sstream>
#include <string>

#pragma comment(lib, "shell32.lib")
#pragma comment(lib, "ole32.lib")

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

  REACT_METHOD(GetDataFolder, L"dataFolder")
  void GetDataFolder(winrt::Microsoft::ReactNative::ReactPromise<std::string> promise) noexcept {
    promise.Resolve(Narrow(DataFolder().wstring()));
  }
};

} // namespace BandanaPlanner
