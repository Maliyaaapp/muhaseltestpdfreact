# Muhasel Landing Page

This is the landing page for the Muhasel School Finance Management System. It provides information about the application and download links for the desktop app.

## Deploying to Netlify

### Option 1: Deploy via Netlify CLI

1. Install the Netlify CLI if you haven't already:
   ```bash
   npm install -g netlify-cli
   ```

2. Login to your Netlify account:
   ```bash
   netlify login
   ```

3. Initialize your site (if not already done):
   ```bash
   netlify init
   ```

4. Deploy to Netlify:
   ```bash
   netlify deploy --prod
   ```

### Option 2: Deploy via Netlify Dashboard

1. Log in to your [Netlify account](https://app.netlify.com/)
2. Click "Add new site" > "Import an existing project"
3. Connect to your Git provider (GitHub, GitLab, etc.)
4. Select your repository
5. Configure build settings:
   - Base directory: `landing`
   - Publish directory: `landing`
   - No build command needed

### Option 3: Manual Upload

1. Log in to your [Netlify account](https://app.netlify.com/)
2. Click "Add new site" > "Deploy manually"
3. Drag and drop the entire `landing` directory to the upload area

## Important Notes

1. **Downloads**: Make sure the `downloads` directory contains the latest versions of:
   - Muhasel-Setup-1.0.0.exe (Windows)
   - Muhasel-1.0.0.dmg (macOS)
   - Muhasel-1.0.0.AppImage (Linux)

2. **Domain Setup**: After deployment, you can set up a custom domain in the Netlify dashboard:
   - Go to Site settings > Domain management > Add custom domain

3. **Updating**: When you update the app:
   - Replace the installer files in the `downloads` directory
   - Update version numbers in `index.html`
   - Redeploy to Netlify

## Testing Downloads

After deployment, verify that all download links work correctly by:
1. Visiting your deployed site
2. Clicking each download button
3. Confirming the installer file downloads properly

## Directory Structure

```
landing/
├── index.html          # Main HTML file
├── styles.css          # CSS styles
├── script.js           # JavaScript functionality
├── images/             # Images directory
│   ├── logo.png        # App logo
│   ├── app-preview.png # Hero section screenshot
│   └── screenshot-*.png # App screenshots for slider
└── downloads/          # Electron app installers
    ├── Muhasel-Setup-1.0.0.exe  # Windows installer
    ├── Muhasel-1.0.0.dmg        # macOS disk image
    └── Muhasel-1.0.0.AppImage   # Linux AppImage
```

## Deployment Instructions

1. **Prepare Your App Files**:
   - Build your Electron app for each platform (Windows, macOS, Linux)
   - Place the installers in the `downloads` directory
   - Update version numbers in `index.html` if needed

2. **Add Images**:
   - Add your app logo to `images/logo.png`
   - Add a main app preview screenshot to `images/app-preview.png`
   - Add 4 screenshots for the slider: `images/screenshot-1.png` through `images/screenshot-4.png`

3. **Customize Content**:
   - Update contact information in the HTML
   - Modify feature descriptions if needed
   - Update social media links

4. **Deploy**:
   - Upload the entire `landing` directory to your web server
   - Ensure the server is configured to serve static files
   - For GitHub Pages: rename `landing` to `docs` and enable GitHub Pages in repository settings

## Browser Compatibility

This landing page is designed to work with:
- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Customization

You can customize the colors by modifying the CSS variables in `styles.css`:

```css
:root {
    --primary-color: #1A365D;
    --primary-light: #2C5282;
    --primary-dark: #0F2942;
    --secondary-color: #3182CE;
    --accent-color: #4FD1C5;
    /* ... other variables ... */
}
```

## Language Support

The landing page includes a language toggle for English and Arabic. To fully implement this:

1. Create a translations file (e.g., `translations.js`)
2. Modify the `setLanguage()` function in `script.js` to load translations
3. Add data attributes to HTML elements for translation

## Contact

For any questions or support, please contact support@muhasel.com 