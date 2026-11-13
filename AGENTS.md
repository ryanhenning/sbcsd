# AGENTS.md - sbcsd Plugin Development Context

## Project Overview

`sbcsd` is a custom Stream Deck+ plugin built using Node.js/TypeScript and the official Elgato SDK. Its primary purpose is to act as a local bridge on Windows, allowing you to instantly toggle audio output between your headphones and speakers on a Creative Sound Blaster AE-5 Plus sound card directly from your Stream Deck+ hardware.

---

## Technical Stack & Environment

- **Runtime**: Node.js v24 or higher.
- **Stream Deck Software**: Version 6.0 or higher (targeting Windows 10/11 host).
- **CLI Tooling**: Official Elgato CLI (`@elgato/cli@latest`).
- **Development Environment**: WSL (Windows Subsystem for Linux) for source code management, compilation, and git operations, with automated deployment syncing to the Windows host AppData directory.

---

## Hardware & Audio Integration (`sbz-switch`)

- **Sound Card**: Creative Sound BlasterX AE-5 Plus.
- **Interop Layer**: Communicates with Sound Blaster Command's local interop architecture (`Interop.CtSndCr.dll`) via the `sbz-switch` command-line utility.
- **Output Toggling Command**:
  - Headphones (`SelectOutput 0`): `sbz-switch.exe set -i "Device Control" SelectOutput 0`
  - Speakers (`SelectOutput 1`): `sbz-switch.exe set -i "Device Control" SelectOutput 1`

---

## Stream Deck+ Hardware & Controllers

- **Supported Controllers**: Actions are configured with both `Keypad` and `Encoder` controllers in `manifest.json`.
- **Touch Strip Canvas**: The bottom LCD strip is divided into independent **200 × 100 px** zones (one per rotary dial).
- **Core Event Lifecycle**:
  - `willAppear`: Initializes the action instance and sets up initial display states.
  - `dialRotate`: Listens to tick events (`payload.ticks`) for volume or mode adjustments.
  - `dialPress`: Detects physical pushes (`payload.pressed`) to trigger output toggling.
  - `touchTap`: Handles direct LCD touch interactions.

---

## Deployment Workflow

- **Build & Sync**: Run `npm run build:win` inside WSL. This compiles the TypeScript code via Rollup and executes `scripts/copy-plugin.js`, which dynamically resolves the Windows username and deploys the compiled bundle straight to `%APPDATA%\Elgato\StreamDeck\Plugins\com.yourname.sbcsd.sdPlugin`.
