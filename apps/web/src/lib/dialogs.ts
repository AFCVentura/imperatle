// Dialogs are mounted once in the layout; anything (icons, the menu, the end
// of a game) opens them through these window events instead of sharing state.
export const HOW_TO_PLAY_EVENT = "imperatle:how-to-play";
export const STATS_EVENT = "imperatle:stats";
export const SUPPORT_EVENT = "imperatle:support";
export const FEEDBACK_EVENT = "imperatle:feedback";
export const ABOUT_EVENT = "imperatle:about";
export const CHANGELOG_EVENT = "imperatle:changelog";
export const ACCOUNT_EVENT = "imperatle:account";

const open = (event: string) => () => window.dispatchEvent(new Event(event));

export const openHowToPlay = open(HOW_TO_PLAY_EVENT);
export const openStats = open(STATS_EVENT);
export const openFeedback = open(FEEDBACK_EVENT);
export const openAbout = open(ABOUT_EVENT);
export const openChangelog = open(CHANGELOG_EVENT);
// Sign in with Google when signed out; name, sign out and delete when signed in.
export const openAccount = open(ACCOUNT_EVENT);
// The Supporter (lifetime) purchase.
export const openSupport = open(SUPPORT_EVENT);
