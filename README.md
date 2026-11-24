# SBC Output Switch

**SBC Output Switch** (repository: `sbcsd`) is an Elgato Stream Deck plugin for users of **Creative Sound Blaster Command (SBC)**. It switches Sound Blaster Command's output between **Headphones** and **Speakers** with one key press, the same setting as the output toggle in the Sound Blaster Command app, without opening it. It is built with Node.js, TypeScript, and the official Elgato SDK.

> This plugin controls Sound Blaster Command's output setting. It works only with Sound Blaster cards managed by Sound Blaster Command (such as the Sound BlasterX AE-5 / AE-5 Plus), not every Sound Blaster device.

---

## Features

- **One-Touch Audio Output Toggling**: Switch between Headphones (`SelectOutput 0`) and Speakers (`SelectOutput 1`) with a single keypress on your Stream Deck.
- **Real-Time State Synchronization**: Uses an event listener (`sbz-switch watch`) to detect output changes made externally (e.g., inside the Creative Sound Blaster Command app or Windows audio settings) and immediately updates the Stream Deck key display.
- **Zero Polling Overhead**: Runs event-driven in the background with 0% CPU impact so gaming performance is never compromised. The watcher stops automatically when navigating away from the profile/page.
- **Automated Dependency Bundling**: Automatically fetches the required `sbz-switch.exe` utility on build without checking third-party binaries into source control.

---

## Requirements

- **Windows 10 or 11.**
- **Elgato Stream Deck software 7.1 or later.**
- **Creative Sound Blaster Command installed**, managing a supported Sound Blaster card (e.g. AE-5 / AE-5 Plus / Z-Series), with Creative's drivers installed.

---

## Using the Plugin

1. Install the plugin from the Elgato Marketplace, or double-click a `.streamDeckPlugin` file from the releases page.
2. In the Stream Deck app, find the **SBC Output Switch** category in the action list and drag **Toggle Output** onto a key.
3. Press the key to switch between Headphones and Speakers. The key shows the current output, and it also updates when you change the output in Sound Blaster Command.

### Troubleshooting

- **The key shows a warning triangle when pressed:** the switch failed. Check that Sound Blaster Command is installed and that the card shows up in Windows Sound settings. Plugin logs are in `%APPDATA%\Elgato\StreamDeck\Plugins\com.ryan-henning.sbcsd.sdPlugin\logs`.
- **The key shows the wrong output:** press it once more, or switch output in Sound Blaster Command; the key resyncs on the next change event.
- **Antivirus flags `sbz-switch.exe`:** it is the unsigned open-source helper described under Acknowledgments below. It is downloaded from the upstream GitHub release and checked against a pinned SHA-256 digest at build time.

Found a bug? [Open an issue](https://github.com/ryanhenning/sbcsd/issues).

---

## Development Prerequisites

- Node.js v24 or higher.
- WSL or Linux for the build scripts (they use `python3` to extract the helper download).

---

## Installation & Deployment

### Development & Live Reload Workflow

For active development, run the live watch-sync command:
```bash
npm run watch
```
On every source file save, this command:
1. Recompiles TypeScript with Rollup.
2. Dynamically locates your Windows `%APPDATA%` directory (auto-detected via environment variables, `wslpath`, or user profile discovery without any hardcoded paths or usernames).
3. Copies plugin assets and bundles to `%APPDATA%\Elgato\StreamDeck\Plugins\com.ryan-henning.sbcsd.sdPlugin`.
4. Hot-reloads the plugin live inside the running Elgato Stream Deck app via `streamdeck restart com.ryan-henning.sbcsd`.

> **Note**: For CLI hot-reloading to connect to Stream Deck, ensure developer mode is enabled in the Stream Deck software or run `streamdeck dev` once.

### Manual Build & Sync (WSL / Local)

1. Clone or open this repository in WSL/Linux.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build and deploy directly to your Windows Stream Deck installation:
   ```bash
   npm run build:win
   ```
   *(Note: Quit Elgato Stream Deck from your Windows system tray before running if updating existing binaries)*
4. Relaunch Elgato Stream Deck on Windows.
5. Drag the **Toggle Output** key action from the **SBC Output Switch** category in the action sidebar onto any key slot.

---

## Available NPM Scripts

| Command | Purpose | When to Use |
| :--- | :--- | :--- |
| `npm run watch` | **Live Watch & Sync** | Watches TypeScript files, auto-rebuilds with Rollup on save, dynamically syncs to Windows AppData without hardcoded paths, and reloads the plugin live via the Stream Deck CLI. |
| `npm run build:win` | **Build & Deploy** | Compiles TypeScript source (`src/`), bundles assets, and copies the entire `.sdPlugin` bundle to `%APPDATA%\Elgato\StreamDeck\Plugins\`. Use this for one-off manual builds. |
| `npm run deploy` | **Fast Sync (No Build)** | Copies the plugin directory straight to Windows AppData without triggering a Rollup build. Ideal for quick updates to icons (`imgs/`), `manifest.json`, or UI files. |
| `npm run build` | **Build Only** | Runs the `prebuild` dependency fetcher and compiles `src/plugin.ts` into `bin/plugin.js` without copying to the host. |
| `npm run fetch-deps` | **Fetch Helper CLI** | Downloads the upstream `sbz-switch.exe` v4.1.0 release binary from GitHub into `bin/` if not already present (runs automatically before builds). |
| `npm run validate` | **Validate Schema** | Runs official Elgato CLI validation against `manifest.json` and directory structure. |
| `npm run pack` | **Create Distribution Bundle** | Packages the plugin into a distributable `.streamDeckPlugin` installer file for sharing or release. |
| `npm test` | **Run Unit Tests** | Executes Vitest test suite once. |
| `npm run test:watch` | **Test Watcher** | Runs Vitest in interactive watch mode. |

---

## Acknowledgments & Credits

This plugin relies on the open-source CLI utility **`sbz-switch`** created by **Matthew Donoughe ([@mdonoughe](https://github.com/mdonoughe))**:

- **Repository**: [mdonoughe/sbz-switch](https://github.com/mdonoughe/sbz-switch)
- **Version bundled**: v4.1.0, unmodified, verified by SHA-256 at build time.
- **License**: dual-licensed MIT or Apache-2.0; redistributed here under MIT. The notice ships with the plugin in [`THIRD_PARTY_NOTICES.txt`](com.ryan-henning.sbcsd.sdPlugin/THIRD_PARTY_NOTICES.txt).

`sbz-switch` interfaces with Creative's local interop architecture (`Interop.CtSndCr.dll`) to allow programmatic control and event listening over Sound Blaster hardware parameters. Special thanks to Matthew Donoughe for creating and maintaining this tool.

---

## Trademarks

Creative, Sound Blaster and Sound BlasterX are trademarks of Creative Technology Ltd. This plugin is an independent project and is not affiliated with, sponsored by, or endorsed by Creative Technology Ltd. or Elgato.

---

## License

MIT. See [LICENSE](LICENSE). Bundled third-party software is covered by [`THIRD_PARTY_NOTICES.txt`](com.ryan-henning.sbcsd.sdPlugin/THIRD_PARTY_NOTICES.txt).
