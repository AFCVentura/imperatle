// Dialogs are mounted once in the layout; anything (icons, the menu, the end
// of a game) opens them through these window events instead of sharing state.
export const HOW_TO_PLAY_EVENT = "imperatle:how-to-play";
export const STATS_EVENT = "imperatle:stats";
export const COMING_SOON_EVENT = "imperatle:coming-soon";
export const FEEDBACK_EVENT = "imperatle:feedback";
export const ABOUT_EVENT = "imperatle:about";

const open = (event: string) => () => window.dispatchEvent(new Event(event));

export const openHowToPlay = open(HOW_TO_PLAY_EVENT);
export const openStats = open(STATS_EVENT);
export const openFeedback = open(FEEDBACK_EVENT);
export const openAbout = open(ABOUT_EVENT);

// Features already in the menu but not built yet. They share one "coming
// soon" dialog, which reads the feature from the event.
export type ComingSoonFeature = "support" | "account";

const openComingSoon = (feature: ComingSoonFeature) => () =>
  window.dispatchEvent(new CustomEvent<ComingSoonFeature>(COMING_SOON_EVENT, { detail: feature }));

export const openSupport = openComingSoon("support");
export const openAccount = openComingSoon("account");
