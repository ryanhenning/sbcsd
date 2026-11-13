# sbcsd (Sound Blaster Command Stream Deck Plugin)

`sbcsd` is a custom Elgato Stream Deck plugin built with Node.js, TypeScript, and the official Elgato SDK. It allows you to toggle audio output between **Headphones** and **Speakers** on Creative Sound Blaster audio cards (such as the Sound BlasterX AE-5 Plus) directly from your Stream Deck hardware.

---

## Features

- **One-Touch Audio Output Toggling**: Switch between Headphones (`SelectOutput 0`) and Speakers (`SelectOutput 1`) with a single keypress on your Stream Deck.
- **Real-Time State Synchronization**: Uses an event listener (`sbz-switch watch`) to detect output changes made externally (e.g., inside the Creative Sound Blaster Command app or Windows audio settings) and immediately updates the Stream Deck key display.
- **Zero Polling Overhead**: Runs event-driven in the background with 0% CPU impact so gaming performance is never compromised. The watcher stops automatically when navigating away from the profile/page.
- **Automated Dependency Bundling**: Automatically fetches the required `sbz-switch.exe` utility on build without checking third-party binaries into source control.

---

## Prerequisites

- **Sound Card**: Creative Sound Blaster card supported by Sound Blaster Command (e.g. AE-5 / AE-5 Plus / Z-Series).
- **Software**: 
  - Sound Blaster Command (or Sound Blaster Control Panel) installed on Windows.
  - Elgato Stream Deck software v6.0 or higher.
- **Development**:
  - Node.js v24 or higher.

---

## Installation & Deployment

### Quick Build & Sync (WSL / Local)

1. Clone or open this repository in WSL/Linux.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the plugin (this automatically fetches `sbz-switch.exe` v4.1.0 on prebuild):
   ```bash
   npm run build
   ```
4. Copy the compiled plugin folder to your Windows Stream Deck plugins directory:
   ```bash
   cp -r com.ryanhenning.sbcsd.sdPlugin /mnt/c/Users/<YourUsername>/AppData/Roaming/Elgato/StreamDeck/Plugins/
   ```
5. Restart the Elgato Stream Deck software on Windows.
6. Drag the **Toggle Output** key action from the **sbcsd** category in the action sidebar onto any key slot.

---

## Acknowledgments & Credits

This plugin relies on the open-source CLI utility **`sbz-switch`** created by **Matthew Donoughe ([@mdonoughe](https://github.com/mdonoughe))**:

- **Repository**: [mdonoughe/sbz-switch](https://github.com/mdonoughe/sbz-switch)
- **License**: Refer to the upstream repository for license information.

`sbz-switch` interfaces with Creative's local interop architecture (`Interop.CtSndCr.dll`) to allow programmatic control and event listening over Sound Blaster hardware parameters. Special thanks to Matthew Donoughe for creating and maintaining this tool.

---

## License

MIT
