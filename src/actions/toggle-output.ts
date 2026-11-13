import {
    action,
    DialDownEvent,
    DialRotateEvent,
    KeyDownEvent,
    SingletonAction,
    TouchTapEvent,
    WillAppearEvent
} from "@elgato/streamdeck";
import streamDeck from "@elgato/streamdeck";
import { AudioOutput, sbzService } from "../services/sbz-switch";

type ToggleOutputSettings = {
    currentOutput?: AudioOutput;
};

@action({ UUID: "com.ryanhenning.sbcsd.toggle" })
export class ToggleOutputAction extends SingletonAction<ToggleOutputSettings> {
    override async onWillAppear(ev: WillAppearEvent<ToggleOutputSettings>): Promise<void> {
        // Try to query device state first, fallback to cached settings or default to Headphones
        const detected = await sbzService.getCurrentOutput();
        const activeOutput = detected ?? ev.payload.settings.currentOutput ?? AudioOutput.Headphones;

        if (activeOutput !== ev.payload.settings.currentOutput) {
            await ev.action.setSettings({ currentOutput: activeOutput });
        }

        await this.updateAppearance(ev.action, activeOutput);
    }

    override async onKeyDown(ev: KeyDownEvent<ToggleOutputSettings>): Promise<void> {
        await this.toggle(ev.action, ev.payload.settings);
    }

    override async onDialDown(ev: DialDownEvent<ToggleOutputSettings>): Promise<void> {
        await this.toggle(ev.action, ev.payload.settings);
    }

    override async onTouchTap(ev: TouchTapEvent<ToggleOutputSettings>): Promise<void> {
        await this.toggle(ev.action, ev.payload.settings);
    }

    override async onDialRotate(ev: DialRotateEvent<ToggleOutputSettings>): Promise<void> {
        // Dial rotation can also toggle if rotated
        await this.toggle(ev.action, ev.payload.settings);
    }

    private async toggle(actionItem: any, settings: ToggleOutputSettings): Promise<void> {
        try {
            // Determine target output
            const current = settings.currentOutput ?? AudioOutput.Headphones;
            const target = current === AudioOutput.Headphones ? AudioOutput.Speakers : AudioOutput.Headphones;

            streamDeck.logger.info(`Switching output from ${AudioOutput[current]} to ${AudioOutput[target]}...`);

            await sbzService.setOutput(target);

            // Save state
            await actionItem.setSettings({ currentOutput: target });

            // Update UI
            await this.updateAppearance(actionItem, target);
        } catch (error) {
            streamDeck.logger.error(`Failed to toggle audio output: ${error}`);
            if (actionItem.showAlert) {
                await actionItem.showAlert();
            }
        }
    }

    private async updateAppearance(actionItem: any, output: AudioOutput): Promise<void> {
        const isHeadphones = output === AudioOutput.Headphones;
        const title = isHeadphones ? "Headphones" : "Speakers";

        if (actionItem.isKey()) {
            await actionItem.setTitle(title);
            // Can switch between 0 and 1 if states are defined in manifest
            if (actionItem.setState) {
                await actionItem.setState(isHeadphones ? 0 : 1);
            }
        } else if (actionItem.isDial()) {
            // For Stream Deck+ touch strip / encoder feedback
            if (actionItem.setFeedback) {
                await actionItem.setFeedback({
                    title: "Output",
                    value: title,
                    indicator: isHeadphones ? 0 : 100
                });
            }
            if (actionItem.setTitle) {
                await actionItem.setTitle(title);
            }
        }
    }
}
