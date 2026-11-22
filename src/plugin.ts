import streamDeck from "@elgato/streamdeck";

import { ToggleOutputAction } from "./actions/toggle-output";

// Keep release logs concise. Switch to "trace" locally to record every message
// between Stream Deck and the plugin while debugging.
streamDeck.logger.setLevel("info");

// Register the toggle action.
streamDeck.actions.registerAction(new ToggleOutputAction());

// Finally, connect to the Stream Deck.
streamDeck.connect();
