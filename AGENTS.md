# AGENTS.md - sbcsd Plugin Development Context

## Project Overview

`sbcsd` is a custom Elgato Stream Deck plugin built using Node.js (v24+), TypeScript, and the official Elgato SDK (`@elgato/streamdeck`). It provides a one-touch key action on Windows to instantly toggle audio output between **Headphones** and **Speakers** on a Creative Sound Blaster card (e.g. Sound BlasterX AE-5 Plus) without opening the Creative desktop app.

---

## Technical Stack & Environment

- **Runtime**: Node.js v24 (ESM: `"type": "module"`). Note: `__dirname` must be derived via `fileURLToPath(import.meta.url)`.
- **Stream Deck Software**: Stream Deck 6.0+ on Windows 10/11 host.
- **CLI Tooling**: Official Elgato CLI (`@elgato/cli`).
- **Development Environment**: WSL (Windows Subsystem for Linux) for development/compilation, with automated syncing to the Windows host AppData directory (`%APPDATA%\Elgato\StreamDeck\Plugins\com.ryanhenning.sbcsd.sdPlugin`).

---

## Architecture & Hardware Integration

- **Sound Card**: Creative Sound BlasterX AE-5 Plus (PCIe).
- **Interop Layer**: `sbz-switch.exe` (v4.1.0 by @mdonoughe). Bundled dynamically into `bin/sbz-switch.exe` on `npm run prebuild`.
- **Output Switching**:
  - Sets output via: `sbz-switch.exe set -m false -i "Device Control" SelectOutput <0|1>`
  - `0` = Headphones, `1` = Speakers.
  - **Important**: Always pass `-m false` to avoid leaving the Windows audio endpoint intermittently muted.
- **Real-Time State Synchronization**:
  - Background process runs `sbz-switch.exe watch` to receive audio parameter change events.
  - When an event fires (e.g. user changes output inside the Creative Sound Blaster Command app), the Stream Deck key display updates immediately.
  - Watcher is lifecycle-managed: active on `onWillAppear`, terminated on `onWillDisappear` to ensure 0% CPU overhead while gaming.
- **Controllers**:
  - Target controller is **`Keypad`** only (configured in `manifest.json`).

---

## Common Development Commands

- `npm run build`: Prebuilds dependencies and compiles TypeScript with Rollup into `bin/plugin.js`.
- `npm run build:win`: Compiles TypeScript and deploys to Windows host `%APPDATA%\Elgato\StreamDeck\Plugins\`.
- `npm run deploy`: Fast sync of `.sdPlugin` directory to Windows host without rebuilding (for icons/manifest changes).
- `npm run validate`: Validates `manifest.json` and plugin structure against Elgato's official schemas.
- `npm run pack`: Packages the plugin into a distributable `.streamDeckPlugin` file.
- `npm run fetch-deps`: Downloads `sbz-switch.exe` from GitHub releases into `bin/`.

---

## Important File Locations & Conventions

- `src/actions/toggle-output.ts`: Main action handling key presses, state sync, and title/image updates.
- `src/services/sbz-switch.ts`: Wrapper for `sbz-switch.exe` process execution and background event watching.
- `scripts/download-sbz-switch.mjs`: Automated dependency fetcher.
- `scripts/copy-plugin.js`: Deployment sync script targeting the Windows host AppData.
- `com.ryanhenning.sbcsd.sdPlugin/manifest.json`: Stream Deck plugin manifest.
- `com.ryanhenning.sbcsd.sdPlugin/bin/`: Build output folder containing `plugin.js` and `sbz-switch.exe` (ignored in `.gitignore`).

> **Note on Windows File Locks during Deployment**: If `npm run build:win` fails with `EACCES: Permission denied`, ensure Elgato Stream Deck is closed from the Windows system tray before deploying, as Windows locks running executables.
