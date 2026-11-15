import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const PLUGIN_UUID = "com.ryanhenning.sbcsd";

async function main() {
    try {
        // 1. Sync plugin assets & compiled JS to Windows host
        console.log("[watch-sync] Syncing plugin files to Windows host...");
        execSync(`node "${path.join(__dirname, "copy-plugin.js")}"`, { stdio: "inherit" });

        // 2. Restart plugin via Stream Deck CLI if available
        console.log(`[watch-sync] Triggering Stream Deck reload for ${PLUGIN_UUID}...`);
        try {
            // First try streamdeck CLI directly
            execSync(`streamdeck restart "${PLUGIN_UUID}"`, { stdio: "ignore" });
            console.log("[watch-sync] Successfully reloaded plugin via Stream Deck CLI.");
        } catch {
            // If streamdeck CLI is not in WSL PATH, try calling it on Windows host via cmd.exe
            try {
                execSync(`cmd.exe /c "streamdeck restart ${PLUGIN_UUID}"`, { stdio: "ignore" });
                console.log("[watch-sync] Successfully reloaded plugin via Windows cmd.exe streamdeck CLI.");
            } catch {
                console.log("[watch-sync] Stream Deck CLI restart skipped (enable developer mode with 'streamdeck dev' if you haven't yet).");
            }
        }
    } catch (err) {
        console.error("[watch-sync] Error during watch sync:", err.message);
    }
}

main();
