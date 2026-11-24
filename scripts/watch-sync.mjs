import path from "node:path";
import { execFileSync, execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLUGIN_UUID = "com.ryanhenning.sbcsd";

/**
 * Sends a streamdeck:// deep link to the Stream Deck app.
 *
 * The Elgato CLI's `streamdeck restart` does the same thing, but under WSL it shells out to the
 * Linux `open` command, which can't reach Windows. Handing the URL to Windows' `start` works from
 * both WSL and native Windows.
 */
function sendDeepLink(action) {
    const url = `streamdeck://plugins/${action}/${PLUGIN_UUID}`;
    // Run cmd.exe from a Windows path so it doesn't warn about a UNC working directory.
    const cwd = process.platform === "win32" ? undefined : "/mnt/c";
    execFileSync("cmd.exe", ["/c", "start", "", url], { stdio: "ignore", cwd });
}

function main() {
    try {
        // 1. Stop the plugin first so Windows releases its lock on bin/sbz-switch.exe and the copy can overwrite it.
        try {
            sendDeepLink("stop");
        } catch {
            // Stream Deck may not be running; the copy will still work for files that aren't locked.
        }

        // 2. Sync plugin assets & compiled JS to the Windows host
        console.log("[watch-sync] Syncing plugin files to Windows host...");
        execSync(`node "${path.join(__dirname, "copy-plugin.js")}"`, { stdio: "inherit" });

        // 3. Start it again with the new build
        sendDeepLink("restart");
        console.log(`[watch-sync] Restarted ${PLUGIN_UUID} in Stream Deck.`);
    } catch (err) {
        console.error("[watch-sync] Error during watch sync:", err.message);
    }
}

main();
