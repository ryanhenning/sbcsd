import {
    action,
    DialDownEvent,
    DialRotateEvent,
    KeyDownEvent,
    SingletonAction,
    TouchTapEvent,
    WillAppearEvent,
    WillDisappearEvent
} from "@elgato/streamdeck";
import streamDeck from "@elgato/streamdeck";
import { AudioOutput, sbzService } from "../services/sbz-switch";

type ToggleOutputSettings = {
    currentOutput?: AudioOutput;
};

@action({ UUID: "com.ryanhenning.sbcsd.toggle" })
export class ToggleOutputAction extends SingletonAction<ToggleOutputSettings> {
    private activeActions = new Set<any>();
    private unsubscribeWatcher: (() => void) | null = null;

    override async onWillAppear(ev: WillAppearEvent<ToggleOutputSettings>): Promise<void> {
        this.activeActions.add(ev.action);
        
        // Ensure event watcher is listening
        if (!this.unsubscribeWatcher) {
            this.unsubscribeWatcher = sbzService.addChangeListener(async (output) => {
                await this.onOutputChanged(output);
            });
        }

        // Initial sync on display
        const detected = await sbzService.getCurrentOutput();
        const activeOutput = detected ?? ev.payload.settings.currentOutput ?? AudioOutput.Headphones;

        if (activeOutput !== ev.payload.settings.currentOutput) {
            await ev.action.setSettings({ currentOutput: activeOutput });
        }

        await this.updateAppearance(ev.action, activeOutput);
    }

    override async onWillDisappear(ev: WillDisappearEvent<ToggleOutputSettings>): Promise<void> {
        this.activeActions.delete(ev.action);
        if (this.activeActions.size === 0 && this.unsubscribeWatcher) {
            this.unsubscribeWatcher();
            this.unsubscribeWatcher = null;
        }
    }

    private async onOutputChanged(newOutput: AudioOutput): Promise<void> {
        for (const act of this.activeActions) {
            try {
                const settings = (await act.getSettings()) as ToggleOutputSettings;
                if (settings.currentOutput !== newOutput) {
                    await act.setSettings({ currentOutput: newOutput });
                    await this.updateAppearance(act, newOutput);
                }
            } catch (err) {
                streamDeck.logger.warn(`Failed to update action appearance from event: ${err}`);
            }
        }
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
        await this.toggle(ev.action, ev.payload.settings);
    }

    private async toggle(actionItem: any, settings: ToggleOutputSettings): Promise<void> {
        try {
            // Determine target output
            const current = settings.currentOutput ?? AudioOutput.Headphones;
            const target = current === AudioOutput.Headphones ? AudioOutput.Speakers : AudioOutput.Headphones;

            streamDeck.logger.info(`Switching output from ${AudioOutput[current]} to ${AudioOutput[target]}...`);

            await sbzService.setOutput(target);

            // Update all active instances immediately
            for (const act of this.activeActions) {
                await act.setSettings({ currentOutput: target });
                await this.updateAppearance(act, target);
            }
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
            if (actionItem.setState) {
                await actionItem.setState(isHeadphones ? 0 : 1);
            }
        } else if (actionItem.isDial()) {
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

