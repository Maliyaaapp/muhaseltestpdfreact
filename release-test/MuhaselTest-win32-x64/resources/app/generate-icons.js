// Script to generate all required icons for Electron app
const icongen = require('electron-icon-maker');
const path = require('path');

const options = {
  source: path.join(__dirname, 'public', 'images', 'logo.png'),
  platforms: ['win32'],
  dest: path.join(__dirname, 'public'),
  ico: { name: 'icon' }
};

icongen(options)
  .then(() => {
    console.log('Successfully generated icon.ico in public/icons/win directory');
    console.log('Use this icon for your Electron app');
  })
  .catch((error) => {
    console.error('Error generating icons:', error);
  }); 