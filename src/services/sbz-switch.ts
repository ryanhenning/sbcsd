import { ChildProcess, execFile, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import streamDeck from "@elgato/streamdeck";

export enum AudioOutput {
    Headphones = 0,
    Speakers = 1
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type OutputChangeCallback = (output: AudioOutput) => void;

export class SbzSwitchService {
    private readonly exePath: string;
    private watchProcess: ChildProcess | null = null;
    private listeners = new Set<OutputChangeCallback>();
    private restartTimer: NodeJS.Timeout | null = null;

    constructor() {
        // In the Stream Deck runtime, plugin.js runs inside com.ryanhenning.sbcsd.sdPlugin/bin
        // sbz-switch.exe is stored right beside it in bin/sbz-switch.exe
        this.exePath = path.join(__dirname, "sbz-switch.exe");
    }

    /**
     * Subscribes to real-time output change events.
     * Starts the background sbz-switch watch process on first listener.
     */
    addChangeListener(callback: OutputChangeCallback): () => void {
        this.listeners.add(callback);
        if (!this.watchProcess) {
            this.startWatcher();
        }
        return () => {
            this.listeners.delete(callback);
            if (this.listeners.size === 0) {
                this.stopWatcher();
            }
        };
    }

    private startWatcher(): void {
        if (this.watchProcess) return;

        try {
            streamDeck.logger.info("Starting sbz-switch watch process...");
            this.watchProcess = spawn(this.exePath, ["watch"], {
                windowsHide: true,
                stdio: ["ignore", "pipe", "pipe"]
            });

            this.watchProcess.stdout?.on("data", async (chunk: Buffer) => {
                const text = chunk.toString("utf8");
                streamDeck.logger.debug(`sbz-switch watch event: ${text}`);

                // Check if the event text indicates a SelectOutput change directly
                const match = text.match(/SelectOutput\s*[:=]\s*(\d+)/i);
                if (match) {
                    const output = parseInt(match[1], 10) === 0 ? AudioOutput.Headphones : AudioOutput.Speakers;
                    this.notifyListeners(output);
                } else {
                    // Any device configuration event triggered -> query the latest output state
                    const current = await this.getCurrentOutput();
                    if (current !== null) {
                        this.notifyListeners(current);
                    }
                }
            });

            this.watchProcess.stderr?.on("data", (chunk: Buffer) => {
                streamDeck.logger.warn(`sbz-switch watch stderr: ${chunk.toString("utf8").trim()}`);
            });

            this.watchProcess.on("exit", (code, signal) => {
                streamDeck.logger.info(`sbz-switch watch exited (code ${code}, signal ${signal})`);
                this.watchProcess = null;

                // Auto-restart watch process if listeners are still registered
                if (this.listeners.size > 0 && !this.restartTimer) {
                    this.restartTimer = setTimeout(() => {
                        this.restartTimer = null;
                        this.startWatcher();
                    }, 3000);
                }
            });
        } catch (err) {
            streamDeck.logger.error(`Failed to start sbz-switch watch: ${err}`);
        }
    }

    private stopWatcher(): void {
        if (this.restartTimer) {
            clearTimeout(this.restartTimer);
            this.restartTimer = null;
        }
        if (this.watchProcess) {
            streamDeck.logger.info("Stopping sbz-switch watch process...");
            try {
                this.watchProcess.kill();
            } catch {
                // Ignore kill errors
            }
            this.watchProcess = null;
        }
    }

    private notifyListeners(output: AudioOutput): void {
        for (const listener of this.listeners) {
            try {
                listener(output);
            } catch (err) {
                streamDeck.logger.error(`Error in output change listener: ${err}`);
            }
        }
    }

    /**
     * Attempts to query the current output destination.
     * Uses TOML or JSON dump and parses SelectOutput.
     * Returns null if unable to determine.
     */
    async getCurrentOutput(): Promise<AudioOutput | null> {
        try {
            // First try JSON dump
            const jsonOutput = await this.run(["dump", "-f", "json"]);
            try {
                const data = JSON.parse(jsonOutput);
                const devCtrl = data?.creative?.["Device Control"] ?? data?.["Device Control"] ?? data?.creative?.device_control;
                if (devCtrl && typeof devCtrl.SelectOutput === "number") {
                    return devCtrl.SelectOutput === 0 ? AudioOutput.Headphones : AudioOutput.Speakers;
                }
            } catch {
                // Ignore JSON parse error and fallback to regex
            }

            // Fallback: check regex in stdout
            const match = jsonOutput.match(/SelectOutput\s*[:=]\s*(\d+)/i);
            if (match) {
                const val = parseInt(match[1], 10);
                return val === 0 ? AudioOutput.Headphones : AudioOutput.Speakers;
            }
        } catch (err) {
            // If dump -f json fails, try standard dump
            try {
                const dumpOutput = await this.run(["dump"]);
                const match = dumpOutput.match(/SelectOutput\s*[:=]\s*(\d+)/i);
                if (match) {
                    const val = parseInt(match[1], 10);
                    return val === 0 ? AudioOutput.Headphones : AudioOutput.Speakers;
                }
            } catch (innerErr) {
                streamDeck.logger.warn(`Could not query output via dump: ${innerErr}`);
            }
        }
        return null;
    }

    /**
     * Sets the audio output to either Headphones (0) or Speakers (1).
     */
    async setOutput(output: AudioOutput): Promise<void> {
        const outputValue = output === AudioOutput.Headphones ? "0" : "1";
        await this.run(["set", "-i", "Device Control", "SelectOutput", outputValue]);
    }

    private run(args: string[]): Promise<string> {
        return new Promise((resolve, reject) => {
            execFile(this.exePath, args, { windowsHide: true }, (error, stdout, stderr) => {
                if (error) {
                    const message = stderr?.trim() || error.message;
                    streamDeck.logger.error(`sbz-switch error (${args.join(" ")}): ${message}`);
                    return reject(new Error(message));
                }
                resolve(stdout);
            });
        });
    }
}

export const sbzService = new SbzSwitchService();

