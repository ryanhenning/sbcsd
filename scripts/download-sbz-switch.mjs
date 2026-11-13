import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, "..");
const TARGET_DIR = path.join(REPO_ROOT, "com.ryanhenning.sbcsd.sdPlugin", "bin");
const TARGET_EXE = path.join(TARGET_DIR, "sbz-switch.exe");

const SBZ_VERSION = "v4.1.0";
const DOWNLOAD_URL = `https://github.com/mdonoughe/sbz-switch/releases/download/${SBZ_VERSION}/sbz-switch-${SBZ_VERSION}.zip`;

async function downloadAndExtract() {
    if (fs.existsSync(TARGET_EXE)) {
        console.log(`[fetch-deps] sbz-switch.exe already exists at ${TARGET_EXE}`);
        return;
    }

    if (!fs.existsSync(TARGET_DIR)) {
        fs.mkdirSync(TARGET_DIR, { recursive: true });
    }

    const tempZipPath = path.join(TARGET_DIR, "sbz-switch.zip");
    console.log(`[fetch-deps] Downloading sbz-switch ${SBZ_VERSION} from ${DOWNLOAD_URL}...`);

    const response = await fetch(DOWNLOAD_URL, {
        headers: {
            "User-Agent": "sbcsd-streamdeck-plugin-fetcher"
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to download sbz-switch: HTTP ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(tempZipPath, Buffer.from(arrayBuffer));
    console.log(`[fetch-deps] Downloaded zip archive (${(arrayBuffer.byteLength / 1024).toFixed(1)} KB). Extracting...`);

    // Extract using python's built-in zipfile module to avoid extra npm dependencies
    const pythonScript = `
import zipfile, sys, os
zip_path = sys.argv[1]
dest_dir = sys.argv[2]
with zipfile.ZipFile(zip_path, 'r') as zf:
    for member in zf.namelist():
        if os.path.basename(member).lower() == 'sbz-switch.exe':
            with zf.open(member) as source, open(os.path.join(dest_dir, 'sbz-switch.exe'), 'wb') as target:
                target.write(source.read())
            print("Extracted sbz-switch.exe successfully.")
            sys.exit(0)
print("sbz-switch.exe not found in zip archive!", file=sys.stderr)
sys.exit(1)
`;

    try {
        execFileSync("python3", ["-c", pythonScript, tempZipPath, TARGET_DIR], { stdio: "inherit" });
    } finally {
        if (fs.existsSync(tempZipPath)) {
            fs.unlinkSync(tempZipPath);
        }
    }

    if (!fs.existsSync(TARGET_EXE)) {
        throw new Error(`Failed to extract sbz-switch.exe into ${TARGET_DIR}`);
    }

    console.log(`[fetch-deps] sbz-switch.exe ready at ${TARGET_EXE}`);
}

downloadAndExtract().catch((err) => {
    console.error(`[fetch-deps] Error:`, err);
    process.exit(1);
});
