
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
Name "${APP_NAME}"
OutFile "${APP_OUTFILE}"
InstallDir "${INSTALL_DIR}"
RequestExecutionLevel admin

; Interface settings
!define MUI_ABORTWARNING
!define MUI_ICON "${APP_ICON}"
!define MUI_UNICON "${APP_ICON}"

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
  File /r "${APP_DIR}\*.*"
  
  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\Muhasel"
  CreateShortcut "$SMPROGRAMS\Muhasel\Muhasel.lnk" "$INSTDIR\Muhasel.exe" "" "$INSTDIR\Muhasel.exe" 0
  CreateShortcut "$DESKTOP\Muhasel.lnk" "$INSTDIR\Muhasel.exe" "" "$INSTDIR\Muhasel.exe" 0
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"
  
  ; Add uninstall information to Add/Remove Programs
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Muhasel" "DisplayName" "Muhasel"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Muhasel" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Muhasel" "DisplayIcon" "$INSTDIR\Muhasel.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Muhasel" "Publisher" "Muhasel Team"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Muhasel" "DisplayVersion" "${APP_VERSION}"
  
  ; Get installation size
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Muhasel" "EstimatedSize" "$0"
SectionEnd

; Uninstaller section
Section "Uninstall"
  ; Remove files and directories
  RMDir /r "$INSTDIR"
  
  ; Remove shortcuts
  Delete "$SMPROGRAMS\Muhasel\Muhasel.lnk"
  RMDir "$SMPROGRAMS\Muhasel"
  Delete "$DESKTOP\Muhasel.lnk"
  
  ; Remove registry keys
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Muhasel"
SectionEnd
