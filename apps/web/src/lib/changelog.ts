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
    version: "1.3.0",
    date: "2026-10-22",
    empires: [
      { en: "Fatimid Caliphate", pt: "Califado Fatímida" },
      { en: "Qin Dynasty", pt: "Dinastia Qin" },
      { en: "Song Dynasty", pt: "Dinastia Song" },
      { en: "Sui Dynasty", pt: "Dinastia Sui" },
      { en: "Zhou Dynasty", pt: "Dinastia Zhou" },
      { en: "Ethiopian Empire", pt: "Império Etíope" },
      { en: "Neo-Assyrian Empire", pt: "Império Neoassírio" },
      { en: "Safavid Empire", pt: "Império Safávida" },
      { en: "Songhai Empire", pt: "Império Songai" },
      { en: "First Mexican Empire", pt: "Primeiro Império Mexicano" },
      { en: "Kingdom of Aksum", pt: "Reino de Axum" },
    ],
    features: [
      {
        en: "New logo: a bronze map pin with a ruby, now also on the browser tab and in link previews.",
        pt: "Logo nova: um alfinete de mapa de bronze com um rubi, agora também na aba do navegador e na prévia dos links.",
      },
      {
        en: "Maps now reach the coast: borders that stopped short of the sea are filled out to today's coastline.",
        pt: "Os mapas agora chegam até a costa: fronteiras que paravam antes do mar foram completadas até o litoral atual.",
      },
      {
        en: "An empire split about evenly between two continents shows both as main continents: the Ottoman, Russian and Macedonian empires, the Soviet Union and the Golden Horde are now in Europe and Asia.",
        pt: "Um império dividido quase por igual entre dois continentes mostra os dois como principais: os impérios Otomano, Russo e Macedônico, a União Soviética e a Horda Dourada agora ficam na Europa e na Ásia.",
      },
    ],
    fixes: [
      {
        en: "A Roman Empire clue now makes clear that Julius Caesar ruled the Republic before the empire.",
        pt: "Uma dica do Império Romano agora deixa claro que Júlio César governou a República, antes do império.",
      },
      {
        en: "Historical corrections in clues and texts of Denmark–Norway, the Second Portuguese Empire, the Holy Roman Empire and the Abbasid Caliphate.",
        pt: "Correções históricas em dicas e textos de Dinamarca-Noruega, Segundo Império Português, Sacro Império Romano-Germânico e Califado Abássida.",
      },
      {
        en: "New clues where an old one repeated what the empire's text already said: Third Portuguese Empire, Maratha Empire, First French Colonial Empire, Greco-Bactrian Kingdom, Spanish Empire, Austria-Hungary, Western Roman Empire and Parthian Empire.",
        pt: "Dicas novas onde a antiga repetia o que o texto do império já dizia: Terceiro Império Português, Império Marata, Primeiro Império Colonial Francês, Reino Greco-Bactriano, Império Espanhol, Império Austro-Húngaro, Império Romano do Ocidente e Império Parta.",
      },
    ],
  },
  {
    version: "1.2.1",
    date: "2026-10-19",
    empires: [],
    features: [],
    fixes: [
      {
        en: "Some names changed to the ones they are best known by: Byzantine Empire, Xiongnu, Carthage, Denmark–Norway, Austria-Hungary, Seljuk Empire and Belgian Colonial Empire. The old names still work in the guess list.",
        pt: "Alguns nomes mudaram para os mais conhecidos: Império Bizantino, Xiongnu, Cartago, Dinamarca-Noruega, Império Seljúcida, Império Holandês, República das Duas Nações e Império Colonial Belga. Os nomes antigos continuam funcionando na lista de palpites.",
      },
      {
        en: "Names of empires and dynasties always capitalized, including in the texts.",
        pt: "Nomes de impérios e dinastias sempre com maiúscula, inclusive nos textos.",
      },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-10-18",
    empires: [
      { en: "Carthage", pt: "Cartago" },
      { en: "Denmark–Norway", pt: "Dinamarca-Noruega" },
      { en: "Ming Dynasty", pt: "Dinastia Ming" },
      { en: "Tang Dynasty", pt: "Dinastia Tang" },
      { en: "Yuan Dynasty", pt: "Dinastia Yuan" },
      { en: "Golden Horde", pt: "Horda Dourada" },
      { en: "Ilkhanate", pt: "Ilcanato" },
      { en: "German Empire", pt: "Império Alemão" },
      { en: "Old Kingdom of Egypt", pt: "Império Antigo do Egito" },
      { en: "Austria-Hungary", pt: "Império Austro-Húngaro" },
      { en: "Carolingian Empire", pt: "Império Carolíngio" },
      { en: "Chola Empire", pt: "Império Chola" },
      { en: "Belgian Colonial Empire", pt: "Império Colonial Belga" },
      { en: "Kushan Empire", pt: "Império Cuchana" },
      { en: "Empire of Japan", pt: "Império do Japão" },
      { en: "Mali Empire", pt: "Império do Mali" },
      { en: "Gupta Empire", pt: "Império Gupta" },
      { en: "Dutch Empire", pt: "Império Holandês" },
      { en: "Hunnic Empire", pt: "Império Huno" },
      { en: "Italian Empire", pt: "Império Italiano" },
      { en: "Khmer Empire", pt: "Império Khmer" },
      { en: "Maratha Empire", pt: "Império Marata" },
      { en: "Maurya Empire", pt: "Império Máuria" },
      { en: "New Kingdom of Egypt", pt: "Império Novo do Egito" },
      { en: "Parthian Empire", pt: "Império Parta" },
      { en: "Western Roman Empire", pt: "Império Romano do Ocidente" },
      { en: "Sasanian Empire", pt: "Império Sassânida" },
      { en: "Seleucid Empire", pt: "Império Selêucida" },
      { en: "Seljuk Empire", pt: "Império Seljúcida" },
      { en: "Sikh Empire", pt: "Império Sikh" },
      { en: "Tibetan Empire", pt: "Império Tibetano" },
      { en: "Timurid Empire", pt: "Império Timúrida" },
      { en: "Vijayanagara Empire", pt: "Império Vijayanagara" },
      { en: "First Turkic Khaganate", pt: "Primeiro Canato Turco" },
      { en: "First Babylonian Empire", pt: "Primeiro Império Babilônico" },
      { en: "First French Colonial Empire", pt: "Primeiro Império Colonial Francês" },
      { en: "First French Empire", pt: "Primeiro Império Francês" },
      { en: "First Portuguese Empire", pt: "Primeiro Império Português" },
      { en: "Hawaiian Kingdom", pt: "Reino do Havaí" },
      { en: "Greco-Bactrian Kingdom", pt: "Reino Greco-Bactriano" },
      { en: "Ptolemaic Kingdom", pt: "Reino Ptolemaico" },
      { en: "Polish–Lithuanian Commonwealth", pt: "República das Duas Nações" },
      { en: "Holy Roman Empire", pt: "Sacro Império Romano-Germânico" },
      { en: "Second Portuguese Empire", pt: "Segundo Império Português" },
      { en: "Delhi Sultanate", pt: "Sultanato de Délhi" },
      { en: "Third Portuguese Empire", pt: "Terceiro Império Português" },
      { en: "Soviet Union", pt: "União Soviética" },
      { en: "Xiongnu", pt: "Xiongnu" },
    ],
    features: [
      {
        en: "First kingdoms and republics in the game, besides empires.",
        pt: "Primeiros reinos e repúblicas no jogo, além dos impérios.",
      },
      {
        en: "The guess list also finds other names, spellings and the name in the other language.",
        pt: "A lista de palpites também encontra outros nomes, grafias e o nome no outro idioma.",
      },
      {
        en: "At the end of each round, a short historical context and the curiosities explained.",
        pt: "No fim de cada rodada, um breve contexto histórico e as curiosidades explicadas.",
      },
    ],
    fixes: [],
  },
  {
    version: "1.1.0",
    date: "2026-10-10",
    empires: [
      { en: "Abbasid Caliphate", pt: "Califado Abássida" },
      { en: "Rashidun Caliphate", pt: "Califado Rashidun" },
      { en: "Han Dynasty", pt: "Dinastia Han" },
      { en: "Qing Dynasty", pt: "Dinastia Qing" },
      { en: "United States", pt: "Estados Unidos" },
      { en: "Byzantine Empire", pt: "Império Bizantino" },
      { en: "Empire of Brazil", pt: "Império do Brasil" },
      { en: "Spanish Empire", pt: "Império Espanhol" },
      { en: "Macedonian Empire", pt: "Império Macedônico" },
      { en: "Mughal Empire", pt: "Império Mogol" },
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
      { en: "Umayyad Caliphate", pt: "Califado Omíada" },
      { en: "Achaemenid Empire", pt: "Império Aquemênida" },
      { en: "Aztec Empire", pt: "Império Asteca" },
      { en: "British Empire", pt: "Império Britânico" },
      { en: "Inca Empire", pt: "Império Inca" },
      { en: "Mongol Empire", pt: "Império Mongol" },
      { en: "Ottoman Empire", pt: "Império Otomano" },
      { en: "Roman Empire", pt: "Império Romano" },
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
