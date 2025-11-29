// Windows installer script
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

console.log('Creating Windows installer for Muhasel...');

// Check if icon.ico exists in public folder
const icoPath = path.resolve(__dirname, 'public', 'icon.ico');

if (!fs.existsSync(icoPath)) {
  console.error('Error: Icon file not found at', icoPath);
  process.exit(1);
}

// Path to the packaged app
const appDirectory = path.resolve(__dirname, 'release/Muhasel-win32-x64');
    
// Output directory for the installer
const outputDirectory = path.resolve(__dirname, 'release/installer');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDirectory)) {
  fs.mkdirSync(outputDirectory, { recursive: true });
}

console.log('Creating installer from:', appDirectory);
console.log('Saving installer to:', outputDirectory);
console.log('Using icon from:', icoPath);

try {
  // Use NSIS directly instead of electron-winstaller (which uses Squirrel)
  // Install NSIS first if needed
  console.log('Checking if NSIS is installed...');
  
  try {
    // Try to use makensis directly
    const nsisCommand = `makensis /DAPP_NAME="Muhasel" /DAPP_VERSION="1.0.0" /DAPP_OUTFILE="${path.join(outputDirectory, 'Muhasel-Setup.exe')}" /DAPP_ICON="${icoPath}" /DAPP_DIR="${appDirectory}" /DINSTALL_DIR="$PROGRAMFILES\\Muhasel" /NOCD /V4 "${path.join(__dirname, 'installer.nsi')}"`;
    
    // Create a basic NSIS script if it doesn't exist
    const nsisScriptPath = path.join(__dirname, 'installer.nsi');
    
    if (!fs.existsSync(nsisScriptPath)) {
      console.log('Creating NSIS script...');
      
      const nsisScript = `
; NSIS script for Muhasel installer
!include "MUI2.nsh"
!include "FileFunc.nsh"

; Define variables
!define APP_NAME "$%APP_NAME%"
!define APP_VERSION "$%APP_VERSION%"
!define APP_OUTFILE "$%APP_OUTFILE%"
!define APP_ICON "$%APP_ICON%"
!define APP_DIR "$%APP_DIR%"
!define INSTALL_DIR "$%INSTALL_DIR%"

; General settings
Name "\${APP_NAME}"
OutFile "\${APP_OUTFILE}"
InstallDir "\${INSTALL_DIR}"
RequestExecutionLevel admin

; Interface settings
!define MUI_ABORTWARNING
!define MUI_ICON "\${APP_ICON}"
!define MUI_UNICON "\${APP_ICON}"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Languages
!insertmacro MUI_LANGUAGE "English"

; Installer sections
Section "Install"
  SetOutPath "$INSTDIR"
  
  ; Copy all files from the app directory
  File /r "\${APP_DIR}\\*.*"
  
  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\\Muhasel"
  CreateShortcut "$SMPROGRAMS\\Muhasel\\Muhasel.lnk" "$INSTDIR\\Muhasel.exe" "" "$INSTDIR\\Muhasel.exe" 0
  CreateShortcut "$DESKTOP\\Muhasel.lnk" "$INSTDIR\\Muhasel.exe" "" "$INSTDIR\\Muhasel.exe" 0
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\\uninstall.exe"
  
  ; Add uninstall information to Add/Remove Programs
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Muhasel" "DisplayName" "Muhasel"
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Muhasel" "UninstallString" "$INSTDIR\\uninstall.exe"
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Muhasel" "DisplayIcon" "$INSTDIR\\Muhasel.exe"
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Muhasel" "Publisher" "Muhasel Team"
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Muhasel" "DisplayVersion" "\${APP_VERSION}"
  
  ; Get installation size
  \${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Muhasel" "EstimatedSize" "$0"
SectionEnd

; Uninstaller section
Section "Uninstall"
  ; Remove files and directories
  RMDir /r "$INSTDIR"
  
  ; Remove shortcuts
  Delete "$SMPROGRAMS\\Muhasel\\Muhasel.lnk"
  RMDir "$SMPROGRAMS\\Muhasel"
  Delete "$DESKTOP\\Muhasel.lnk"
  
  ; Remove registry keys
  DeleteRegKey HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Muhasel"
SectionEnd
`;
      
      fs.writeFileSync(nsisScriptPath, nsisScript);
      console.log('NSIS script created successfully!');
    }
    
    console.log('Running NSIS command:', nsisCommand);
    execSync(nsisCommand, { stdio: 'inherit' });
    console.log('Installer created successfully!');
  } catch (error) {
    console.error('Failed to create installer with NSIS:', error);
    console.log('Falling back to electron-packager with custom installer...');
    
    // Create a simple batch file installer as a fallback
    const batchInstallerPath = path.join(outputDirectory, 'Muhasel-Setup.bat');
    const batchInstaller = `
@echo off
echo Installing Muhasel...
set INSTALL_DIR=%ProgramFiles%\\Muhasel
mkdir "%INSTALL_DIR%"
xcopy /E /I /Y "${appDirectory.replace(/\\/g, '\\\\')}" "%INSTALL_DIR%"
echo Creating shortcuts...
powershell "$s=(New-Object -COM WScript.Shell).CreateShortcut('%userprofile%\\Desktop\\Muhasel.lnk');$s.TargetPath='%INSTALL_DIR%\\Muhasel.exe';$s.IconLocation='%INSTALL_DIR%\\Muhasel.exe';$s.Save()"
powershell "$s=(New-Object -COM WScript.Shell).CreateShortcut('%ProgramData%\\Microsoft\\Windows\\Start Menu\\Programs\\Muhasel.lnk');$s.TargetPath='%INSTALL_DIR%\\Muhasel.exe';$s.IconLocation='%INSTALL_DIR%\\Muhasel.exe';$s.Save()"
echo Installation completed!
start "" "%INSTALL_DIR%\\Muhasel.exe"
`;
    
    fs.writeFileSync(batchInstallerPath, batchInstaller);
    console.log('Created batch installer at:', batchInstallerPath);
  }
} catch (error) {
  console.error('Error creating installer:', error);
  process.exit(1);
} 