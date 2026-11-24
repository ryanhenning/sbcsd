# SBC Output Switch

**SBC Output Switch** (repository: `streamdeck-sbc-output-switch`) is an Elgato Stream Deck plugin for users of **Creative Sound Blaster Command (SBC)**. It switches Sound Blaster Command's output between **Headphones** and **Speakers** with one key press, the same setting as the output toggle in the Sound Blaster Command app, without opening it. It is built with Node.js, TypeScript, and the official Elgato SDK.

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

Found a bug? [Open an issue](https://github.com/ryanhenning/streamdeck-sbc-output-switch/issues).

---

## Development

### Prerequisites

- **Windows 10/11 with WSL** (or Linux with the Windows `C:` drive mounted at `/mnt/c`). The scripts build in WSL and deploy to the Windows Stream Deck install.
- **Node.js v24 or higher** in WSL.
- **`python3`** in WSL. The dependency fetcher uses it to unzip `sbz-switch.exe`.
- The Elgato Stream Deck app (7.1+) installed on Windows.

### First-time setup

```bash
npm install
npm run build
```

`npm run build` also downloads `sbz-switch.exe` into `com.ryan-henning.sbcsd.sdPlugin/bin/` and checks it against a pinned SHA-256 digest. Run it once before `npm run watch`, because the watcher doesn't fetch the helper.

### Build and deploy once

```bash
npm run build:win
```

This builds the plugin and copies the `.sdPlugin` folder to `%APPDATA%\Elgato\StreamDeck\Plugins\com.ryan-henning.sbcsd.sdPlugin`. The deploy script finds `%APPDATA%` on its own (from `$APPDATA`, `cmd.exe`, or `/mnt/c/Users`), so no paths are hardcoded. Then restart the Stream Deck app and drag **Toggle Output** from the **SBC Output Switch** category onto a key.

If you only changed icons or `manifest.json`, `npm run deploy` copies the files without rebuilding.

### Hot reload

```bash
npm run watch
```

Each time you save a source file, this:

1. Rebuilds `bin/plugin.js` with Rollup.
2. Stops the plugin in Stream Deck, so Windows releases its lock on `sbz-switch.exe`.
3. Syncs to the Windows plugin folder. Only changed files are copied, and files you deleted from the repo are removed from the deployed copy. The plugin's `logs/` folder is kept.
4. Restarts the plugin by sending `streamdeck://plugins/restart/com.ryan-henning.sbcsd` to Windows. (The Elgato CLI's `streamdeck restart` can't open Windows URLs from WSL, so the script doesn't use it.)

### What a plugin restart doesn't reload

The hot reload restarts the plugin's code only. Stream Deck reads `manifest.json` when the app starts, so after changing the plugin name, category, icons, state images or title settings:

- **Quit and reopen the Stream Deck app** (from the system tray).
- **Remove the key and drag it back on** for per-key defaults like title font size or alignment. Keys already on your deck keep the settings they were saved with.

### Deploy troubleshooting

- **`EACCES` / `EBUSY` while copying:** Windows is locking a file the running plugin holds open. This usually means `sbz-switch.exe` changed (for example, after bumping its version). Quit Stream Deck from the system tray and run the command again.
- **Two "Toggle Output" actions show up:** an old copy of the plugin, such as one installed under a previous UUID, is still in `%APPDATA%\Elgato\StreamDeck\Plugins\`. Quit Stream Deck, delete the old folder and restart.
- **Plugin logs:** `%APPDATA%\Elgato\StreamDeck\Plugins\com.ryan-henning.sbcsd.sdPlugin\logs\`.

### Before a release

```bash
npm test
npm run validate
npm audit
npm run pack
```

`npm audit` matters because Rollup bundles dependencies into `bin/plugin.js`, so a vulnerable dependency ships inside the plugin. `npm run pack` writes a `com.ryan-henning.sbcsd.streamDeckPlugin` installer for the Marketplace or for sharing.

### NPM scripts

| Command | What it does |
| :--- | :--- |
| `npm run build` | Fetches and verifies `sbz-switch.exe` if it's missing, then builds `bin/plugin.js`. |
| `npm run build:win` | `build`, then deploys to the Windows Stream Deck plugins folder. |
| `npm run deploy` | Deploys without rebuilding (icons, manifest). |
| `npm run watch` | Rebuilds on save, syncs, and restarts the plugin in Stream Deck. |
| `npm run fetch-deps` | Downloads and verifies `sbz-switch.exe` only. |
| `npm test` / `npm run test:watch` | Runs the Vitest unit tests once, or in watch mode. |
| `npm run validate` | Validates the manifest and plugin folder against Elgato's schemas. |
| `npm run pack` | Builds the `.streamDeckPlugin` installer. |

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
