# Project Structure & Frontend Guide

## Main Frontend (React/Vite)
- **Source code:** `src/`
  - Entry point: `src/main.tsx`
  - Main app component: `src/App.tsx`
  - Components, pages, contexts, etc. are all inside `src/`
- **Static assets:** `public/`
  - Favicons, manifest, images, etc.
  - `public/index.html` is not used as the main entry (for legacy/static hosting only)

## Main Entry Point
- **`index.html` in the project root** is the main entry for the frontend (used by Vite and for deployment).
  - It references the React app via `<script type="module" src="./src/main.tsx"></script>`
  - Contains all meta tags, icons, and the `div#root` for React.

## Other Folders
- **landing/**: Standalone landing page (not part of the React app)
- **electron-app/**, **electron-vite-react-app/**: Electron desktop app builds (not the main web frontend)

## Deployment Note
- When uploading or deploying, make sure the root `index.html` is present. This is the correct entry point for the web app.
- You can safely ignore or remove `src/index.html` (already done).

---

For any issues, ensure your deployment platform points to the root `index.html` and serves the `src/` and `public/` folders as needed. 