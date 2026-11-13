import streamDeck from "@elgato/streamdeck";

import { ToggleOutputAction } from "./actions/toggle-output";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded.
streamDeck.logger.setLevel("trace");

// Register the toggle action.
streamDeck.actions.registerAction(new ToggleOutputAction());

// Finally, connect to the Stream Deck.
streamDeck.connect();
