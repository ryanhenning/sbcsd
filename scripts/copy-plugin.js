import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, "..");
const PLUGIN_NAME = "com.ryanhenning.sbcsd.sdPlugin";
const SOURCE_DIR = path.join(REPO_ROOT, PLUGIN_NAME);

function getWindowsAppData() {
    // 1. If running natively on Windows (or process.env.APPDATA is available)
    if (process.platform === "win32" && process.env.APPDATA) {
        return process.env.APPDATA;
    }

    if (process.env.APPDATA) {
        try {
            const wslPath = execSync(`wslpath -u "${process.env.APPDATA}"`, { encoding: "utf8" }).trim();
            if (fs.existsSync(wslPath)) return wslPath;
        } catch {
            // ignore wslpath error
        }
    }

    // 2. Resolve %APPDATA% via cmd.exe in standard WSL
    try {
        const raw = execSync('cmd.exe /c "echo %APPDATA%"', { encoding: "utf8" }).trim();
        if (raw && !raw.includes("%APPDATA%")) {
            const wslPath = execSync(`wslpath -u "${raw}"`, { encoding: "utf8" }).trim();
            if (fs.existsSync(wslPath)) return wslPath;
        }
    } catch {
        // cmd.exe may not be on PATH in all environments
    }

    // 3. Dynamic search across mounted Windows user profiles in /mnt/c/Users
    const usersDir = "/mnt/c/Users";
    if (fs.existsSync(usersDir)) {
        const systemUsers = new Set(["Public", "Default", "Default User", "All Users"]);
        const users = fs.readdirSync(usersDir).filter((u) => !systemUsers.has(u));
        for (const user of users) {
            const candidate = path.join(usersDir, user, "AppData", "Roaming");
            if (fs.existsSync(path.join(candidate, "Elgato", "StreamDeck"))) {
                return candidate;
            }
        }
    }

    throw new Error(
        "Unable to locate Windows AppData folder. Ensure Windows C: drive is mounted at /mnt/c or set APPDATA."
    );
}

function copyPlugin() {
    const appData = getWindowsAppData();
    const targetPluginsDir = path.join(appData, "Elgato", "StreamDeck", "Plugins");
    const targetDir = path.join(targetPluginsDir, PLUGIN_NAME);

    console.log(`[copy-plugin] Copying ${SOURCE_DIR} -> ${targetDir}...`);

    if (!fs.existsSync(targetPluginsDir)) {
        fs.mkdirSync(targetPluginsDir, { recursive: true });
    }

    try {
        fs.cpSync(SOURCE_DIR, targetDir, { recursive: true, force: true });
        console.log(`[copy-plugin] Successfully deployed to ${targetDir}`);
    } catch (err) {
        if (err.code === "EACCES" || err.code === "EBUSY") {
            console.error("\n[copy-plugin] ⚠️  Permission denied when copying to the plugin directory.");
            console.error("[copy-plugin] The plugin or sbz-switch is likely locked because Stream Deck is currently running.");
            console.error("[copy-plugin] Please close/exit Elgato Stream Deck from the Windows system tray and re-run this command.\n");
        }
        throw err;
    }
}

copyPlugin();
