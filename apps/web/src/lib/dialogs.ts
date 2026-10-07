// Dialogs are mounted once in the layout; anything (icons, the menu, the end
// of a game) opens them through these window events instead of sharing state.
export const HOW_TO_PLAY_EVENT = "imperatle:how-to-play";
export const STATS_EVENT = "imperatle:stats";
export const SUPPORT_EVENT = "imperatle:support";
export const FEEDBACK_EVENT = "imperatle:feedback";
export const ABOUT_EVENT = "imperatle:about";

const open = (event: string) => () => window.dispatchEvent(new Event(event));

export const openHowToPlay = open(HOW_TO_PLAY_EVENT);
export const openStats = open(STATS_EVENT);
export const openSupport = open(SUPPORT_EVENT);
export const openFeedback = open(FEEDBACK_EVENT);
export const openAbout = open(ABOUT_EVENT);
