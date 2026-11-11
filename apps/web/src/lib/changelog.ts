// The game's versions, newest first. Every deploy that players can notice
// gets a new entry at the top (and bumps CURRENT_VERSION, shown in the
// footer): the empires it adds, what's new and what was adjusted.
// Versions: major.minor.patch; minor for new empires or features, patch for
// fixes only.

export type Localized = { en: string; pt: string; es: string };

export type Release = {
  version: string;
  date: string; // YYYY-MM-DD, in Brasília
  empires: Localized[];
  features: Localized[];
  fixes: Localized[];
};

export const RELEASES: Release[] = [
  {
    version: "1.6.0",
    date: "2026-11-12",
    empires: [],
    features: [
      {
        en: "Imperatle in Spanish: the whole game, every empire's curiosities and fact sheet, and the guess list, which takes Spanish names with or without accents and articles.",
        pt: "Imperatle em espanhol: o jogo inteiro, as curiosidades e a ficha de cada império, e a lista de palpites, que aceita os nomes em espanhol com ou sem acento e artigo.",
        es: "Imperatle en español: todo el juego, las curiosidades y la ficha de cada imperio, y la lista de intentos, que acepta los nombres en español con o sin tildes y artículos.",
      },
      {
        en: "Country names on the map in Spanish too.",
        pt: "Os nomes dos países no mapa também em espanhol.",
        es: "Los nombres de los países en el mapa, también en español.",
      },
    ],
    fixes: [],
  },
  {
    version: "1.5.0",
    date: "2026-11-12",
    empires: [],
    features: [
      {
        en: "Clues, redone: each miss unlocks one clue, in this order: the era, the map with the continents, three curiosities and the map with the countries. Capital, language, religion, dates and area move to the fact sheet at the end.",
        pt: "Dicas repaginadas: cada erro libera uma dica, nesta ordem: a era, o mapa com os continentes, três curiosidades e o mapa com os países. Capital, idioma, religião, datas e área vão para a ficha completa no fim.",
        es: "Pistas renovadas: cada fallo desbloquea una pista, en este orden: la era, el mapa con los continentes, tres curiosidades y el mapa con los países. La capital, el idioma, la religión, las fechas y el área pasan a la ficha completa del final.",
      },
      {
        en: "Each wrong guess now compares area, era (older, more recent or same era) and distance: the direction and kilometres to the answer, or how much the two territories share.",
        pt: "Cada palpite errado agora compara área, época (mais antiga, mais recente ou da mesma época) e distância: a direção e os quilômetros até a resposta, ou quanto os dois territórios têm em comum.",
        es: "Cada intento fallido ahora compara área, época (más antigua, más reciente o de la misma época) y distancia: la dirección y los kilómetros hasta la respuesta, o cuánto comparten los dos territorios.",
      },
      {
        en: "Click a guess's name to see its outline over the map. The latest guess shows up on its own.",
        pt: "Clique no nome de um palpite para ver o contorno dele sobre o mapa. O palpite mais recente aparece sozinho.",
        es: "Haz clic en el nombre de un intento para ver su contorno sobre el mapa. El intento más reciente se muestra automáticamente.",
      },
      {
        en: "The end of a round opens on the answer's fact sheet, with the guesses and the curiosities explained right below.",
        pt: "O fim da rodada abre na ficha completa da resposta, com os palpites e as curiosidades explicadas logo abaixo.",
        es: "El final de la ronda se abre en la ficha completa de la respuesta, con los intentos y las curiosidades explicadas justo debajo.",
      },
      {
        en: "Practice: pick several eras and continents at once, and the number of attempts on a slider. The menu's Practice entry opens the options.",
        pt: "Treino: dá para marcar várias épocas e continentes ao mesmo tempo, e escolher as tentativas num controle deslizante. O Treino no menu abre as opções.",
        es: "Práctica: puedes marcar varias épocas y continentes a la vez, y elegir los intentos con un control deslizante. La Práctica del menú abre las opciones.",
      },
      {
        en: "Practice: smart pacing spreads the six clues over the attempts you pick, so they all show up before the last one. On by default; the info icon next to Clues turns it off.",
        pt: "Treino: a adaptação inteligente espalha as seis dicas pelas tentativas escolhidas, para que todas apareçam antes da última. Vem ligada; o ícone de informação ao lado de Dicas desliga.",
      },
      {
        en: "Pages that don't exist now show a page of their own, with the way back to the game.",
        pt: "Páginas que não existem agora mostram uma página própria, com o caminho de volta ao jogo.",
      },
      {
        en: "Every empire has its own page, with the fact sheet and the curiosities: \"Empires\" in the footer, or \"About this empire\" at the end of a round.",
        pt: "Cada império ganhou uma página própria, com a ficha completa e as curiosidades: \"Impérios\" no rodapé, ou \"Sobre este império\" no fim da rodada.",
      },
    ],
    fixes: [
      {
        en: "Support payments now go through Stripe, in 25 currencies. Supporters see a thank-you in the footer instead of the support button.",
        pt: "Os pagamentos do Apoio agora passam pela Stripe, em 25 moedas. Quem apoia vê um agradecimento no rodapé no lugar do botão de apoiar.",
        es: "Los pagos del Apoyo ahora pasan por Stripe, en 25 monedas. Quien apoya ve un agradecimiento en el pie de página en lugar del botón de apoyar.",
      },
      {
        en: "The outline of a country picked on the map no longer disappears in dark mode.",
        pt: "O contorno do país escolhido no mapa não some mais no modo escuro.",
        es: "El contorno del país elegido en el mapa ya no desaparece en el modo oscuro.",
      },
      {
        en: "Five history slips fixed: the Ethiopian, First French, Ilkhanate, Safavid and Inca texts.",
        pt: "Cinco deslizes históricos corrigidos: nos textos do Império Etíope, do Primeiro Império Francês, do Ilcanato, do Safávida e do Inca.",
      },
    ],
  },
  {
    version: "1.4.3",
    date: "2026-11-06",
    empires: [],
    features: [],
    fixes: [
      {
        en: "The Privacy Policy is clearer: where each provider stores data, the legal basis for each use, how long practice rounds and login sessions are kept, and every right you have, including complaining to the ANPD.",
        pt: "A Política de Privacidade ficou mais clara: onde cada provedor guarda os dados, a base legal de cada uso, por quanto tempo ficam os treinos e as sessões de login e todos os seus direitos, inclusive reclamar na ANPD.",
        es: "La Política de Privacidad es más clara: dónde guarda los datos cada proveedor, la base legal de cada uso, cuánto tiempo se guardan las rondas de práctica y las sesiones iniciadas, y todos tus derechos, incluido el de reclamar ante la ANPD.",
      },
    ],
  },
  {
    version: "1.4.2",
    date: "2026-11-04",
    empires: [],
    features: [],
    fixes: [
      {
        en: "The site moved to a new home, and visits are now counted without any cookies. The Privacy page lists the new providers.",
        pt: "O site mudou de hospedagem e as visitas agora são contadas sem nenhum cookie. A página de Privacidade lista os novos fornecedores.",
        es: "El sitio cambió de alojamiento y las visitas ahora se cuentan sin ninguna cookie. La página de Privacidad enumera los nuevos proveedores.",
      },
      {
        en: "The Terms, Privacy and Refund pages now have a contact email: contato@imperatle.com.",
        pt: "As páginas de Termos, Privacidade e Reembolso agora têm um e-mail de contato: contato@imperatle.com.",
        es: "Las páginas de Términos, Privacidad y Reembolsos ahora tienen un correo de contacto: contato@imperatle.com.",
      },
    ],
  },
  {
    version: "1.4.1",
    date: "2026-11-03",
    empires: [],
    features: [],
    fixes: [
      {
        en: "If signing in with Google fails, you now come back to the game with a message instead of an error page. Cancelling on Google's screen just takes you back.",
        pt: "Se a entrada com o Google falhar, você agora volta para o jogo com um aviso, em vez de uma página de erro. Cancelar na tela do Google só te traz de volta.",
        es: "Si falla el inicio de sesión con Google, ahora vuelves al juego con un aviso en lugar de una página de error. Cancelar en la pantalla de Google simplemente te devuelve al juego.",
      },
    ],
  },
  {
    version: "1.4.0",
    date: "2026-11-03",
    empires: [],
    features: [
      {
        en: "Optional Google account: your statistics and today's game follow you on any device. Playing without an account works as before.",
        pt: "Conta opcional com o Google: suas estatísticas e o jogo do dia te acompanham em qualquer aparelho. Jogar sem conta continua igual.",
        es: "Cuenta opcional con Google: tus estadísticas y la partida del día te acompañan en cualquier dispositivo. Jugar sin cuenta sigue igual.",
      },
      {
        en: "When you sign in, the games you already played in this browser move to your account.",
        pt: "Ao entrar, os jogos que você já fez neste navegador passam para a sua conta.",
        es: "Al iniciar sesión, las partidas que ya jugaste en este navegador pasan a tu cuenta.",
      },
      {
        en: 'In "My account" you can sign out, sign out of all devices, or delete your account and all its data.',
        pt: 'Em "Minha conta" dá pra sair, sair de todos os aparelhos ou apagar a conta e todos os dados.',
        es: 'En "Mi cuenta" puedes cerrar sesión, cerrar sesión en todos los dispositivos o eliminar la cuenta y todos sus datos.',
      },
    ],
    fixes: [
      {
        en: "Starting the game on one device and continuing on another now shows the guesses already made.",
        pt: "Começar o jogo em um aparelho e continuar em outro agora mostra os palpites já feitos.",
        es: "Empezar la partida en un dispositivo y seguir en otro ahora muestra los intentos ya hechos.",
      },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-10-22",
    empires: [
      { en: "Fatimid Caliphate", pt: "Califado Fatímida", es: "Califato fatimí" },
      { en: "Qin Dynasty", pt: "Dinastia Qin", es: "Dinastía Qin" },
      { en: "Song Dynasty", pt: "Dinastia Song", es: "Dinastía Song" },
      { en: "Sui Dynasty", pt: "Dinastia Sui", es: "Dinastía Sui" },
      { en: "Zhou Dynasty", pt: "Dinastia Zhou", es: "Dinastía Zhou" },
      { en: "Ethiopian Empire", pt: "Império Etíope", es: "Imperio etíope" },
      { en: "Neo-Assyrian Empire", pt: "Império Neoassírio", es: "Imperio neoasirio" },
      { en: "Safavid Empire", pt: "Império Safávida", es: "Imperio safávida" },
      { en: "Songhai Empire", pt: "Império Songai", es: "Imperio songhai" },
      { en: "First Mexican Empire", pt: "Primeiro Império Mexicano", es: "Primer Imperio mexicano" },
      { en: "Kingdom of Aksum", pt: "Reino de Axum", es: "Reino de Axum" },
    ],
    features: [
      {
        en: "New logo: a bronze map pin with a ruby, now also on the browser tab and in link previews.",
        pt: "Logo nova: um alfinete de mapa de bronze com um rubi, agora também na aba do navegador e na prévia dos links.",
        es: "Logotipo nuevo: un alfiler de mapa de bronce con un rubí, ahora también en la pestaña del navegador y en la vista previa de los enlaces.",
      },
      {
        en: "Maps now reach the coast: borders that stopped short of the sea are filled out to today's coastline.",
        pt: "Os mapas agora chegam até a costa: fronteiras que paravam antes do mar foram completadas até o litoral atual.",
        es: "Los mapas ahora llegan hasta la costa: las fronteras que se quedaban antes del mar se completaron hasta la línea de costa actual.",
      },
      {
        en: "An empire split about evenly between two continents shows both as main continents: the Ottoman, Russian and Macedonian empires, the Soviet Union and the Golden Horde are now in Europe and Asia.",
        pt: "Um império dividido quase por igual entre dois continentes mostra os dois como principais: os impérios Otomano, Russo e Macedônico, a União Soviética e a Horda Dourada agora ficam na Europa e na Ásia.",
        es: "Un imperio repartido casi a partes iguales entre dos continentes muestra los dos como principales: los imperios otomano, ruso y macedonio, la Unión Soviética y la Horda de Oro ahora están en Europa y Asia.",
      },
    ],
    fixes: [
      {
        en: "A Roman Empire clue now makes clear that Julius Caesar ruled the Republic before the empire.",
        pt: "Uma dica do Império Romano agora deixa claro que Júlio César governou a República, antes do império.",
        es: "Una pista del Imperio romano ahora deja claro que Julio César gobernó la República, antes del imperio.",
      },
      {
        en: "Historical corrections in clues and texts of Denmark–Norway, the Second Portuguese Empire, the Holy Roman Empire and the Abbasid Caliphate.",
        pt: "Correções históricas em dicas e textos de Dinamarca-Noruega, Segundo Império Português, Sacro Império Romano-Germânico e Califado Abássida.",
        es: "Correcciones históricas en pistas y textos de Dinamarca-Noruega, el Segundo Imperio portugués, el Sacro Imperio Romano Germánico y el Califato abasí.",
      },
      {
        en: "New clues where an old one repeated what the empire's text already said: Third Portuguese Empire, Maratha Empire, First French Colonial Empire, Greco-Bactrian Kingdom, Spanish Empire, Austria-Hungary, Western Roman Empire and Parthian Empire.",
        pt: "Dicas novas onde a antiga repetia o que o texto do império já dizia: Terceiro Império Português, Império Marata, Primeiro Império Colonial Francês, Reino Greco-Bactriano, Império Espanhol, Império Austro-Húngaro, Império Romano do Ocidente e Império Parta.",
        es: "Pistas nuevas donde la anterior repetía lo que ya decía el texto del imperio: Tercer Imperio portugués, Imperio maratha, Primer Imperio colonial francés, Reino grecobactriano, Imperio español, Imperio austrohúngaro, Imperio romano de Occidente e Imperio parto.",
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
        es: "Algunos nombres cambiaron por los más conocidos: Imperio bizantino, Xiongnu, Cartago, Dinamarca-Noruega, Imperio selyúcida, Imperio neerlandés, República de las Dos Naciones e Imperio colonial belga. Los nombres antiguos siguen funcionando en la lista de intentos.",
      },
      {
        en: "Names of empires and dynasties always capitalized, including in the texts.",
        pt: "Nomes de impérios e dinastias sempre com maiúscula, inclusive nos textos.",
        es: "En inglés y en portugués, los nombres de imperios y dinastías van siempre con mayúscula, también en los textos.",
      },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-10-18",
    empires: [
      { en: "Carthage", pt: "Cartago", es: "Cartago" },
      { en: "Denmark–Norway", pt: "Dinamarca-Noruega", es: "Dinamarca-Noruega" },
      { en: "Ming Dynasty", pt: "Dinastia Ming", es: "Dinastía Ming" },
      { en: "Tang Dynasty", pt: "Dinastia Tang", es: "Dinastía Tang" },
      { en: "Yuan Dynasty", pt: "Dinastia Yuan", es: "Dinastía Yuan" },
      { en: "Golden Horde", pt: "Horda Dourada", es: "Horda de Oro" },
      { en: "Ilkhanate", pt: "Ilcanato", es: "Ilkanato" },
      { en: "German Empire", pt: "Império Alemão", es: "Imperio alemán" },
      { en: "Old Kingdom of Egypt", pt: "Império Antigo do Egito", es: "Imperio Antiguo de Egipto" },
      { en: "Austria-Hungary", pt: "Império Austro-Húngaro", es: "Imperio austrohúngaro" },
      { en: "Carolingian Empire", pt: "Império Carolíngio", es: "Imperio carolingio" },
      { en: "Chola Empire", pt: "Império Chola", es: "Imperio chola" },
      { en: "Belgian Colonial Empire", pt: "Império Colonial Belga", es: "Imperio colonial belga" },
      { en: "Kushan Empire", pt: "Império Cuchana", es: "Imperio kushán" },
      { en: "Empire of Japan", pt: "Império do Japão", es: "Imperio del Japón" },
      { en: "Mali Empire", pt: "Império do Mali", es: "Imperio de Malí" },
      { en: "Gupta Empire", pt: "Império Gupta", es: "Imperio Gupta" },
      { en: "Dutch Empire", pt: "Império Holandês", es: "Imperio holandés" },
      { en: "Hunnic Empire", pt: "Império Huno", es: "Imperio huno" },
      { en: "Italian Empire", pt: "Império Italiano", es: "Imperio colonial italiano" },
      { en: "Khmer Empire", pt: "Império Khmer", es: "Imperio jemer" },
      { en: "Maratha Empire", pt: "Império Marata", es: "Imperio maratha" },
      { en: "Maurya Empire", pt: "Império Máuria", es: "Imperio Maurya" },
      { en: "New Kingdom of Egypt", pt: "Império Novo do Egito", es: "Imperio Nuevo de Egipto" },
      { en: "Parthian Empire", pt: "Império Parta", es: "Imperio parto" },
      { en: "Western Roman Empire", pt: "Império Romano do Ocidente", es: "Imperio romano de Occidente" },
      { en: "Sasanian Empire", pt: "Império Sassânida", es: "Imperio sasánida" },
      { en: "Seleucid Empire", pt: "Império Selêucida", es: "Imperio seléucida" },
      { en: "Seljuk Empire", pt: "Império Seljúcida", es: "Imperio selyúcida" },
      { en: "Sikh Empire", pt: "Império Sikh", es: "Imperio sij" },
      { en: "Tibetan Empire", pt: "Império Tibetano", es: "Imperio tibetano" },
      { en: "Timurid Empire", pt: "Império Timúrida", es: "Imperio timúrida" },
      { en: "Vijayanagara Empire", pt: "Império Vijayanagara", es: "Imperio Vijayanagara" },
      { en: "First Turkic Khaganate", pt: "Primeiro Canato Turco", es: "Primer Kanato túrquico" },
      { en: "First Babylonian Empire", pt: "Primeiro Império Babilônico", es: "Primer Imperio babilónico" },
      { en: "First French Colonial Empire", pt: "Primeiro Império Colonial Francês", es: "Primer Imperio colonial francés" },
      { en: "First French Empire", pt: "Primeiro Império Francês", es: "Primer Imperio francés" },
      { en: "First Portuguese Empire", pt: "Primeiro Império Português", es: "Primer Imperio portugués" },
      { en: "Hawaiian Kingdom", pt: "Reino do Havaí", es: "Reino de Hawái" },
      { en: "Greco-Bactrian Kingdom", pt: "Reino Greco-Bactriano", es: "Reino grecobactriano" },
      { en: "Ptolemaic Kingdom", pt: "Reino Ptolemaico", es: "Reino ptolemaico" },
      { en: "Polish–Lithuanian Commonwealth", pt: "República das Duas Nações", es: "República de las Dos Naciones" },
      { en: "Holy Roman Empire", pt: "Sacro Império Romano-Germânico", es: "Sacro Imperio Romano Germánico" },
      { en: "Second Portuguese Empire", pt: "Segundo Império Português", es: "Segundo Imperio portugués" },
      { en: "Delhi Sultanate", pt: "Sultanato de Délhi", es: "Sultanato de Delhi" },
      { en: "Third Portuguese Empire", pt: "Terceiro Império Português", es: "Tercer Imperio portugués" },
      { en: "Soviet Union", pt: "União Soviética", es: "Unión Soviética" },
      { en: "Xiongnu", pt: "Xiongnu", es: "Xiongnu" },
    ],
    features: [
      {
        en: "First kingdoms and republics in the game, besides empires.",
        pt: "Primeiros reinos e repúblicas no jogo, além dos impérios.",
        es: "Primeros reinos y repúblicas en el juego, además de los imperios.",
      },
      {
        en: "The guess list also finds other names, spellings and the name in the other language.",
        pt: "A lista de palpites também encontra outros nomes, grafias e o nome no outro idioma.",
        es: "La lista de intentos también encuentra otros nombres, otras grafías y el nombre en otros idiomas.",
      },
      {
        en: "At the end of each round, a short historical context and the curiosities explained.",
        pt: "No fim de cada rodada, um breve contexto histórico e as curiosidades explicadas.",
        es: "Al final de cada ronda, un breve contexto histórico y las curiosidades explicadas.",
      },
    ],
    fixes: [],
  },
  {
    version: "1.1.0",
    date: "2026-10-10",
    empires: [
      { en: "Abbasid Caliphate", pt: "Califado Abássida", es: "Califato abasí" },
      { en: "Rashidun Caliphate", pt: "Califado Rashidun", es: "Califato ortodoxo" },
      { en: "Han Dynasty", pt: "Dinastia Han", es: "Dinastía Han" },
      { en: "Qing Dynasty", pt: "Dinastia Qing", es: "Dinastía Qing" },
      { en: "United States", pt: "Estados Unidos", es: "Estados Unidos" },
      { en: "Byzantine Empire", pt: "Império Bizantino", es: "Imperio bizantino" },
      { en: "Empire of Brazil", pt: "Império do Brasil", es: "Imperio del Brasil" },
      { en: "Spanish Empire", pt: "Império Espanhol", es: "Imperio español" },
      { en: "Macedonian Empire", pt: "Império Macedônico", es: "Imperio macedonio" },
      { en: "Mughal Empire", pt: "Império Mogol", es: "Imperio mogol" },
      { en: "Russian Empire", pt: "Império Russo", es: "Imperio ruso" },
      { en: "Second French Colonial Empire", pt: "Segundo Império Colonial Francês", es: "Segundo Imperio colonial francés" },
    ],
    features: [
      {
        en: "The day's empire now changes at midnight in Brasília, instead of 9 p.m.",
        pt: "O império do dia agora muda à meia-noite de Brasília, e não mais às 21h.",
        es: "El imperio del día ahora cambia a medianoche, hora de Brasilia, y ya no a las 21:00.",
      },
      {
        en: "A \"Read on Wikipedia\" link at the end of each round.",
        pt: "Link \"Ler na Wikipedia\" no fim de cada rodada.",
        es: 'Enlace "Leer en Wikipedia" al final de cada ronda.',
      },
      {
        en: "Empires that still exist show their period up to \"present\".",
        pt: "Impérios que ainda existem mostram o período até \"hoje\".",
        es: 'Los imperios que todavía existen muestran su período hasta la "actualidad".',
      },
      {
        en: "The game's version in the footer, with this list of changes.",
        pt: "Versão do jogo no rodapé, com esta lista de mudanças.",
        es: "La versión del juego en el pie de página, con esta lista de cambios.",
      },
    ],
    fixes: [
      {
        en: "Bigger interface on tablets.",
        pt: "Interface maior em tablets.",
        es: "Interfaz más grande en tabletas.",
      },
      {
        en: "\"Imperatle\" at the top goes back to the game from any page.",
        pt: "\"Imperatle\" no topo volta para o jogo de qualquer página.",
        es: '"Imperatle" en la parte superior vuelve al juego desde cualquier página.',
      },
      {
        en: "The Ottoman Empire's map now shows its peak under Suleiman the Magnificent (1566).",
        pt: "O mapa do Império Otomano agora mostra o auge sob Solimão, o Magnífico (1566).",
        es: "El mapa del Imperio otomano ahora muestra su apogeo bajo Solimán el Magnífico (1566).",
      },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-10-09",
    empires: [
      { en: "Umayyad Caliphate", pt: "Califado Omíada", es: "Califato omeya" },
      { en: "Achaemenid Empire", pt: "Império Aquemênida", es: "Imperio aqueménida" },
      { en: "Aztec Empire", pt: "Império Asteca", es: "Imperio azteca" },
      { en: "British Empire", pt: "Império Britânico", es: "Imperio británico" },
      { en: "Inca Empire", pt: "Império Inca", es: "Imperio incaico" },
      { en: "Mongol Empire", pt: "Império Mongol", es: "Imperio mongol" },
      { en: "Ottoman Empire", pt: "Império Otomano", es: "Imperio otomano" },
      { en: "Roman Empire", pt: "Império Romano", es: "Imperio romano" },
    ],
    features: [
      {
        en: "Launch: guess the empire of the day from its map, in up to seven attempts.",
        pt: "Lançamento: descubra o império do dia pelo mapa, em até sete tentativas.",
        es: "Lanzamiento: descubre el imperio del día por su mapa, en un máximo de siete intentos.",
      },
      {
        en: "Map revealed in stages (outline, continents, countries), as a flat map or a globe.",
        pt: "Mapa revelado em etapas (contorno, continentes, países), plano ou em globo.",
        es: "Mapa revelado por etapas (contorno, continentes, países), plano o como globo.",
      },
    ],
    fixes: [],
  },
];

export const CURRENT_VERSION = RELEASES[0].version;
