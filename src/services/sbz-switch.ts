import { execFile } from "node:child_process";
import path from "node:path";
import streamDeck from "@elgato/streamdeck";

export enum AudioOutput {
    Headphones = 0,
    Speakers = 1
}

export class SbzSwitchService {
    private readonly exePath: string;

    constructor() {
        // In the Stream Deck runtime, plugin.js runs inside com.ryanhenning.sbcsd.sdPlugin/bin
        // sbz-switch.exe is stored right beside it in bin/sbz-switch.exe
        this.exePath = path.join(__dirname, "sbz-switch.exe");
    }

    /**
     * Attempts to query the current output destination by dumping the config in JSON.
     * If query fails or Device Control is not found, returns null.
     */
    async getCurrentOutput(): Promise<AudioOutput | null> {
        try {
            const stdout = await this.run(["dump", "-f", "json"]);
            const data = JSON.parse(stdout);
            
            // Check in dump JSON: typically in "Device Control" section or deviceControl
            // Let's inspect possible property shapes
            const deviceControl = data?.["Device Control"] ?? data?.device_control ?? data?.deviceControl;
            if (deviceControl && typeof deviceControl.SelectOutput === "number") {
                return deviceControl.SelectOutput === 0 ? AudioOutput.Headphones : AudioOutput.Speakers;
            }
        } catch (err) {
            streamDeck.logger.warn(`Could not query current output via sbz-switch: ${err}`);
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
