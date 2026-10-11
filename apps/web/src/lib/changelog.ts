// The game's versions, newest first. Every deploy that players can notice
// gets a new entry at the top (and bumps CURRENT_VERSION, shown in the
// footer): the empires it adds, what's new and what was adjusted.
// Versions: major.minor.patch; minor for new empires or features, patch for
// fixes only.

export type Localized = { en: string; pt: string };

export type Release = {
  version: string;
  date: string; // YYYY-MM-DD, in Brasília
  empires: Localized[];
  features: Localized[];
  fixes: Localized[];
};

export const RELEASES: Release[] = [
  {
    version: "1.1.0",
    date: "2026-10-10",
    empires: [
      { en: "Abbasid Caliphate", pt: "Califado Abássida" },
      { en: "Rashidun Caliphate", pt: "Califado Ortodoxo (Rashidun)" },
      { en: "Han Dynasty", pt: "Dinastia Han" },
      { en: "Qing Dynasty", pt: "Dinastia Qing" },
      { en: "United States", pt: "Estados Unidos" },
      { en: "Empire of Brazil", pt: "Império do Brasil" },
      { en: "Spanish Empire", pt: "Império Espanhol" },
      { en: "Macedonian Empire", pt: "Império Macedônico" },
      { en: "Mughal Empire", pt: "Império Mogol" },
      { en: "Eastern Roman Empire (Byzantine Empire)", pt: "Império Romano Oriental (Império Bizantino)" },
      { en: "Russian Empire", pt: "Império Russo" },
      { en: "Second French Colonial Empire", pt: "Segundo Império Colonial Francês" },
    ],
    features: [
      {
        en: "The day's empire now changes at midnight in Brasília, instead of 9 p.m.",
        pt: "O império do dia agora muda à meia-noite de Brasília, e não mais às 21h.",
      },
      {
        en: "A \"Read on Wikipedia\" link at the end of each round.",
        pt: "Link \"Ler na Wikipedia\" no fim de cada rodada.",
      },
      {
        en: "Empires that still exist show their period up to \"present\".",
        pt: "Impérios que ainda existem mostram o período até \"hoje\".",
      },
      {
        en: "The game's version in the footer, with this list of changes.",
        pt: "Versão do jogo no rodapé, com esta lista de mudanças.",
      },
    ],
    fixes: [
      {
        en: "Bigger interface on tablets.",
        pt: "Interface maior em tablets.",
      },
      {
        en: "\"Imperatle\" at the top goes back to the game from any page.",
        pt: "\"Imperatle\" no topo volta para o jogo de qualquer página.",
      },
      {
        en: "The Ottoman Empire's map now shows its peak under Suleiman the Magnificent (1566).",
        pt: "O mapa do Império Otomano agora mostra o auge sob Solimão, o Magnífico (1566).",
      },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-10-09",
    empires: [
      { en: "Achaemenid (Persian) Empire", pt: "Império Aquemênida (Persa)" },
      { en: "Aztec Empire", pt: "Império Asteca" },
      { en: "British Empire", pt: "Império Britânico" },
      { en: "Inca Empire", pt: "Império Inca" },
      { en: "Mongol Empire", pt: "Império Mongol" },
      { en: "Ottoman Empire", pt: "Império Otomano" },
      { en: "Roman Empire", pt: "Império Romano" },
      { en: "Umayyad Caliphate", pt: "Califado Omíada" },
    ],
    features: [
      {
        en: "Launch: guess the empire of the day from its map, in up to seven attempts.",
        pt: "Lançamento: descubra o império do dia pelo mapa, em até sete tentativas.",
      },
      {
        en: "Map revealed in stages (outline, continents, countries), as a flat map or a globe.",
        pt: "Mapa revelado em etapas (contorno, continentes, países), plano ou em globo.",
      },
    ],
    fixes: [],
  },
];

export const CURRENT_VERSION = RELEASES[0].version;
