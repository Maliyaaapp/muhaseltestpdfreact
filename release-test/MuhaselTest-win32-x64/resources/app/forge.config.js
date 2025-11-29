module.exports = {
  packagerConfig: {
    name: "Muhasel",
    executableName: "muhasel",
    asar: true,
    extraResource: [
      "dist",
      "dist-electron"
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: "Muhasel",
        setupExe: "Muhasel-Setup.exe"
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
}; 