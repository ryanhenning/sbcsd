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
    try {
        // Resolve %APPDATA% via cmd.exe in WSL
        const raw = execSync('cmd.exe /c "echo %APPDATA%"', { encoding: "utf8" }).trim();
        // Convert Windows path (e.g. C:\Users\name\AppData\Roaming) to WSL path (/mnt/c/Users/name/AppData/Roaming)
        const wslPath = execSync(`wslpath -u "${raw}"`, { encoding: "utf8" }).trim();
        return wslPath;
    } catch (e) {
        // Fallback: check /mnt/c/Users
        const usersDir = "/mnt/c/Users";
        if (fs.existsSync(usersDir)) {
            const users = fs.readdirSync(usersDir).filter((u) => u !== "Public" && u !== "Default" && u !== "All Users");
            for (const user of users) {
                const candidate = path.join(usersDir, user, "AppData", "Roaming");
                if (fs.existsSync(path.join(candidate, "Elgato", "StreamDeck"))) {
                    return candidate;
                }
            }
        }
        throw new Error("Unable to locate Windows AppData folder.");
    }
}

function copyPlugin() {
    const appData = getWindowsAppData();
    const targetPluginsDir = path.join(appData, "Elgato", "StreamDeck", "Plugins");
    const targetDir = path.join(targetPluginsDir, PLUGIN_NAME);

    console.log(`[copy-plugin] Copying ${SOURCE_DIR} -> ${targetDir}...`);

    if (!fs.existsSync(targetPluginsDir)) {
        fs.mkdirSync(targetPluginsDir, { recursive: true });
    }

    fs.cpSync(SOURCE_DIR, targetDir, { recursive: true });
    console.log(`[copy-plugin] Successfully deployed to ${targetDir}`);
}

copyPlugin();
