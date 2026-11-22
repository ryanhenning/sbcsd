import crypto from "node:crypto";
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

// Pinned SHA-256 digests for the v4.1.0 release. If the upstream release asset is ever
// replaced, the build fails instead of silently bundling an unverified executable.
// Update both values deliberately when bumping SBZ_VERSION.
const EXPECTED_ZIP_SHA256 = "83cf49aa754fe0d0062e3525721729783aa6b1f178b063723a2bd30731b33eca";
const EXPECTED_EXE_SHA256 = "24e6a0675abb5459d0f3b5cbbd42a7e7cd4dd273bd42c56e0c0d40e2175d5ae4";

function sha256(buffer) {
    return crypto.createHash("sha256").update(buffer).digest("hex");
}

function verifyExe() {
    const actual = sha256(fs.readFileSync(TARGET_EXE));
    if (actual !== EXPECTED_EXE_SHA256) {
        fs.unlinkSync(TARGET_EXE);
        throw new Error(
            `sbz-switch.exe SHA-256 mismatch (expected ${EXPECTED_EXE_SHA256}, got ${actual}). The file was removed.`
        );
    }
}

async function downloadAndExtract() {
    if (fs.existsSync(TARGET_EXE)) {
        verifyExe();
        console.log(`[fetch-deps] sbz-switch.exe already exists at ${TARGET_EXE} (SHA-256 verified)`);
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
    const zipBuffer = Buffer.from(arrayBuffer);
    const zipHash = sha256(zipBuffer);
    if (zipHash !== EXPECTED_ZIP_SHA256) {
        throw new Error(`sbz-switch zip SHA-256 mismatch (expected ${EXPECTED_ZIP_SHA256}, got ${zipHash}). Refusing to extract.`);
    }
    fs.writeFileSync(tempZipPath, zipBuffer);
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
    verifyExe();

    console.log(`[fetch-deps] sbz-switch.exe ready at ${TARGET_EXE}`);
}

downloadAndExtract().catch((err) => {
    console.error(`[fetch-deps] Error:`, err);
    process.exit(1);
});
