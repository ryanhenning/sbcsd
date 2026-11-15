import { describe, it, expect, vi, beforeEach } from "vitest";
import { AudioOutput, SbzSwitchService } from "../src/services/sbz-switch";

// Mock child_process
vi.mock("node:child_process", () => ({
    execFile: vi.fn(),
    spawn: vi.fn()
}));

// Mock @elgato/streamdeck
vi.mock("@elgato/streamdeck", () => ({
    default: {
        logger: {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn()
        }
    }
}));

describe("SbzSwitchService", () => {
    let service: SbzSwitchService;
    let execFileMock: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        const cp = await import("node:child_process");
        execFileMock = cp.execFile;
        service = new SbzSwitchService();
    });

    describe("getCurrentOutput", () => {
        it("should parse JSON dump with Headphones (0)", async () => {
            const mockDump = JSON.stringify({
                "Device Control": {
                    SelectOutput: 0
                }
            });

            execFileMock.mockImplementation((file: string, args: string[], opts: any, cb: any) => {
                cb(null, mockDump, "");
            });

            const output = await service.getCurrentOutput();
            expect(output).toBe(AudioOutput.Headphones);
        });

        it("should parse JSON dump with Speakers (1)", async () => {
            const mockDump = JSON.stringify({
                creative: {
                    "Device Control": {
                        SelectOutput: 1
                    }
                }
            });

            execFileMock.mockImplementation((file: string, args: string[], opts: any, cb: any) => {
                cb(null, mockDump, "");
            });

            const output = await service.getCurrentOutput();
            expect(output).toBe(AudioOutput.Speakers);
        });

        it("should fallback to regex on TOML dump", async () => {
            const mockTomlDump = `
[creative."Device Control"]
SelectOutput = 0
`;
            execFileMock.mockImplementation((file: string, args: string[], opts: any, cb: any) => {
                cb(null, mockTomlDump, "");
            });

            const output = await service.getCurrentOutput();
            expect(output).toBe(AudioOutput.Headphones);
        });

        it("should return null if output cannot be determined", async () => {
            execFileMock.mockImplementation((file: string, args: string[], opts: any, cb: any) => {
                cb(new Error("Device not found"), "", "Error");
            });

            const output = await service.getCurrentOutput();
            expect(output).toBeNull();
        });
    });

    describe("setOutput", () => {
        it("should pass -m false when switching to Headphones", async () => {
            execFileMock.mockImplementation((file: string, args: string[], opts: any, cb: any) => {
                cb(null, "", "");
            });

            await service.setOutput(AudioOutput.Headphones);

            expect(execFileMock).toHaveBeenCalledWith(
                expect.stringContaining("sbz-switch.exe"),
                ["set", "-m", "false", "-i", "Device Control", "SelectOutput", "0"],
                { windowsHide: true },
                expect.any(Function)
            );
        });

        it("should pass -m false when switching to Speakers", async () => {
            execFileMock.mockImplementation((file: string, args: string[], opts: any, cb: any) => {
                cb(null, "", "");
            });

            await service.setOutput(AudioOutput.Speakers);

            expect(execFileMock).toHaveBeenCalledWith(
                expect.stringContaining("sbz-switch.exe"),
                ["set", "-m", "false", "-i", "Device Control", "SelectOutput", "1"],
                { windowsHide: true },
                expect.any(Function)
            );
        });
    });
});
