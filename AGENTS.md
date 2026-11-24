# AGENTS.md - SBC Output Switch Plugin Development Context

## Project Overview

`streamdeck-sbc-output-switch` (published as **SBC Output Switch**, plugin UUID `com.ryan-henning.sbcsd`) is a custom Elgato Stream Deck plugin for Sound Blaster Command users, built using Node.js (v24+), TypeScript, and the official Elgato SDK (`@elgato/streamdeck`). It provides a one-touch key action on Windows to instantly toggle audio output between **Headphones** and **Speakers** on a Creative Sound Blaster card (e.g. Sound BlasterX AE-5 Plus) without opening the Creative desktop app.

---

## Technical Stack & Environment

- **Runtime**: Node.js v24 (ESM: `"type": "module"`). Note: `__dirname` must be derived via `fileURLToPath(import.meta.url)`.
- **Stream Deck Software**: Stream Deck 7.1+ on Windows 10/11 host.
- **CLI Tooling**: Official Elgato CLI (`@elgato/cli`).
- **Development Environment**: WSL (Windows Subsystem for Linux) for development/compilation, with automated syncing to the Windows host AppData directory (`%APPDATA%\Elgato\StreamDeck\Plugins\com.ryan-henning.sbcsd.sdPlugin`).

---

## Architecture & Hardware Integration

- **Sound Card**: Creative Sound BlasterX AE-5 Plus (PCIe).
- **Interop Layer**: `sbz-switch.exe` (v4.1.0 by @mdonoughe). Bundled dynamically into `bin/sbz-switch.exe` on `npm run prebuild`; the download is verified against pinned SHA-256 digests in `scripts/download-sbz-switch.mjs` (update them deliberately when bumping the version). Its license notice ships in `com.ryan-henning.sbcsd.sdPlugin/THIRD_PARTY_NOTICES.txt`.
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

- `npm run watch`: Live watch-sync workflow. Rebuilds on file save with Rollup watcher, dynamically resolves Windows `%APPDATA%` (without hardcoded usernames or paths) to sync files, and reloads the plugin live by sending the `streamdeck://plugins/restart/com.ryan-henning.sbcsd` deep link through Windows `cmd.exe start` (the Elgato CLI's `streamdeck restart` can't open Windows URLs from WSL). Requires one `npm run build` first to fetch `sbz-switch.exe`. Manifest changes need a full Stream Deck app restart.
- `npm run build`: Prebuilds dependencies and compiles TypeScript with Rollup into `bin/plugin.js`.
- `npm run build:win`: Compiles TypeScript and deploys to Windows host `%APPDATA%\Elgato\StreamDeck\Plugins\`.
- `npm run deploy`: Fast sync of `.sdPlugin` directory to Windows host without rebuilding (for icons/manifest changes).
- `npm run validate`: Validates `manifest.json` and plugin structure against Elgato's official schemas.
- `npm run pack`: Packages the plugin into a distributable `.streamDeckPlugin` file.
- `npm run fetch-deps`: Downloads `sbz-switch.exe` from GitHub releases into `bin/`.
- `npm test` / `npm run test:watch`: Runs unit tests using Vitest.

---

## Important File Locations & Conventions

- `src/actions/toggle-output.ts`: Main action handling key presses, state sync, and title/image updates.
- `src/services/sbz-switch.ts`: Wrapper for `sbz-switch.exe` process execution and background event watching.
- `scripts/download-sbz-switch.mjs`: Automated dependency fetcher.
- `scripts/copy-plugin.js`: Deployment sync script targeting the Windows host AppData (dynamically resolved via `%APPDATA%`, `wslpath`, or mounted `/mnt/c/Users` discovery).
- `scripts/watch-sync.mjs`: Post-build hook triggered on file change during `npm run watch` to stop the plugin, sync changed files (pruning deleted ones, keeping `logs/`), and restart it via the `streamdeck://` deep link.
- `com.ryan-henning.sbcsd.sdPlugin/manifest.json`: Stream Deck plugin manifest.
- `com.ryan-henning.sbcsd.sdPlugin/bin/`: Build output folder containing `plugin.js` and `sbz-switch.exe` (ignored in `.gitignore`).

> **Note on Windows File Locks during Deployment**: If `npm run build:win` fails with `EACCES: Permission denied`, Windows is locking a running executable (usually because `sbz-switch.exe` changed; unchanged files are skipped). Close Elgato Stream Deck from the Windows system tray and re-run.
