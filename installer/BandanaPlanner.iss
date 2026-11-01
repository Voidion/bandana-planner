; Builds BandanaPlannerSetup.exe from the release build of the Windows app.
; Run by the GitHub workflow:  iscc /DAppVersion=0.1.0 /DSourceDir=<release folder> installer\BandanaPlanner.iss

#ifndef AppVersion
  #define AppVersion "0.1.0"
#endif
#ifndef SourceDir
  #define SourceDir "..\windows\x64\Release\BandanaPlanner"
#endif

[Setup]
AppId={{6E0C3B8A-4F55-4C1E-9B7B-0D6B5A2F9C11}
AppName=Bandana Planner
AppVersion={#AppVersion}
AppVerName=Bandana Planner {#AppVersion}
AppPublisher=Bandana Planner
DefaultDirName={autopf}\Bandana Planner
DefaultGroupName=Bandana Planner
DisableProgramGroupPage=yes
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0.17763
OutputDir=Output
OutputBaseFilename=BandanaPlannerSetup
SetupIconFile=..\windows\BandanaPlanner\BandanaPlanner.ico
UninstallDisplayIcon={app}\BandanaPlanner.exe
UninstallDisplayName=Bandana Planner
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
RestartApplications=no

[Tasks]
Name: "desktopicon"; Description: "Add a desktop shortcut"; GroupDescription: "Shortcuts:"

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "*.pdb,*.lib,*.exp,*.ilk"

[Icons]
Name: "{autoprograms}\Bandana Planner"; Filename: "{app}\BandanaPlanner.exe"
Name: "{autodesktop}\Bandana Planner"; Filename: "{app}\BandanaPlanner.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\BandanaPlanner.exe"; Description: "Open Bandana Planner"; Flags: nowait postinstall skipifsilent

; Your shop (%LOCALAPPDATA%\BandanaPlanner) and cut files (Documents\Bandana Planner) are never touched by install, update or uninstall.
