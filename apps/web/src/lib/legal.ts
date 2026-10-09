// Privacy policy and terms of use, in both languages. Kept as data (not in
// messages/*.json) because they're long-form documents with their own
// structure, rendered by LegalPage.

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  items?: string[];
}

export interface LegalDocument {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

type Locale = "en" | "pt";

const privacy: Record<Locale, LegalDocument> = {
  en: {
    title: "Privacy Policy",
    updated: "Last updated: October 7, 2026",
    intro:
      "Imperatle is a free daily game made by one person, Ventura, a developer based in Brazil, who is responsible for the data described here. The game collects as little as it can: you don't need an account, and nothing here is used for advertising or sold.",
    sections: [
      {
        heading: "What is collected",
        items: [
          "A random identifier stored in a cookie (imperatle_aid) the first time you guess. It isn't linked to your name, e-mail or device; it only lets the server count your attempts and keep your statistics.",
          "Your games: the date, how many attempts you used and whether you got it right, linked to that identifier.",
          "Your progress of the day, saved in your own browser (local storage) so the board survives a page reload. It never leaves your device.",
          "Feedback you send: the message, its type, the site language and, only if you fill it in, your e-mail address.",
          "Your IP address, used for a few minutes to limit how many guesses and messages can be sent in a row. It isn't stored by the game, although the hosting providers below may keep it in their technical logs.",
          "Page views, counted by Vercel Web Analytics without cookies and without identifying you.",
        ],
      },
      {
        heading: "Why",
        paragraphs: [
          "To run the game (count attempts fairly, show your statistics and everyone's results of the day), to protect it against abuse, to read and answer feedback, and to understand how many people play. The legal basis is the legitimate interest in providing and securing the game, and your consent for the optional e-mail in the feedback form.",
        ],
      },
      {
        heading: "Who else handles the data",
        paragraphs: ["The game relies on these providers, each under its own privacy terms:"],
        items: [
          "Vercel (website hosting and page analytics), United States.",
          "Microsoft Azure (game server).",
          "Neon (database).",
          "Resend (forwards feedback messages by e-mail), United States.",
        ],
      },
      {
        heading: "How long it is kept",
        paragraphs: [
          "Game records are kept while the game exists, since they make up your statistics and the daily results. Feedback is kept for as long as it's needed to handle it. The cookie expires one year after it is created.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "Under Brazil's LGPD and, where it applies, the European GDPR, you can ask to access, correct or delete your data, or object to its use. Send the request through the Feedback form in the menu. Deleting your browser's cookies and site data also cuts the link between you and your game history.",
        ],
      },
      {
        heading: "Children",
        paragraphs: ["The game isn't directed at children under 13 and doesn't knowingly collect their data."],
      },
      {
        heading: "Changes",
        paragraphs: [
          "This policy will change when new features arrive (accounts and support, for example). The date at the top shows the latest version.",
        ],
      },
    ],
  },
  pt: {
    title: "Política de Privacidade",
    updated: "Atualizada em 7 de outubro de 2026",
    intro:
      "O Imperatle é um jogo diário e gratuito, feito por uma pessoa só: Ventura, desenvolvedor no Brasil, que é o responsável pelos dados descritos aqui. O jogo coleta o mínimo possível: não precisa de conta, e nada aqui é usado para publicidade ou vendido.",
    sections: [
      {
        heading: "O que é coletado",
        items: [
          "Um identificador aleatório guardado num cookie (imperatle_aid) no seu primeiro palpite. Ele não está ligado ao seu nome, e-mail ou aparelho; só serve para o servidor contar suas tentativas e guardar suas estatísticas.",
          "Seus jogos: a data, quantas tentativas você usou e se acertou, ligados a esse identificador.",
          "Seu progresso do dia, salvo no seu próprio navegador (armazenamento local) para o tabuleiro sobreviver a um recarregamento da página. Ele não sai do seu aparelho.",
          "O feedback que você envia: a mensagem, o tipo, o idioma do site e, só se você preencher, seu e-mail.",
          "Seu endereço IP, usado por alguns minutos para limitar quantos palpites e mensagens podem ser enviados seguidos. O jogo não o guarda, mas os provedores de hospedagem abaixo podem mantê-lo nos registros técnicos deles.",
          "Visitas às páginas, contadas pelo Vercel Web Analytics sem cookies e sem identificar você.",
        ],
      },
      {
        heading: "Para quê",
        paragraphs: [
          "Para o jogo funcionar (contar as tentativas de forma justa, mostrar suas estatísticas e o resultado de todos no dia), para protegê-lo contra abuso, para ler e responder o feedback e para saber quantas pessoas jogam. A base legal é o legítimo interesse em oferecer e proteger o jogo, e o seu consentimento no caso do e-mail opcional do formulário de feedback.",
        ],
      },
      {
        heading: "Quem mais trata os dados",
        paragraphs: ["O jogo depende destes provedores, cada um com seus próprios termos de privacidade:"],
        items: [
          "Vercel (hospedagem do site e contagem de visitas), Estados Unidos.",
          "Microsoft Azure (servidor do jogo).",
          "Neon (banco de dados).",
          "Resend (encaminha as mensagens de feedback por e-mail), Estados Unidos.",
        ],
      },
      {
        heading: "Por quanto tempo",
        paragraphs: [
          "Os registros de jogo ficam guardados enquanto o jogo existir, porque formam suas estatísticas e os resultados de cada dia. O feedback fica guardado pelo tempo necessário para tratá-lo. O cookie expira um ano depois de ser criado.",
        ],
      },
      {
        heading: "Seus direitos",
        paragraphs: [
          "Pela LGPD e, quando se aplicar, pelo GDPR europeu, você pode pedir acesso, correção ou exclusão dos seus dados, ou se opor ao uso deles. Faça o pedido pelo formulário de Feedback no menu. Apagar os cookies e os dados do site no seu navegador também desfaz a ligação entre você e seu histórico de jogos.",
        ],
      },
      {
        heading: "Crianças",
        paragraphs: ["O jogo não é voltado para menores de 13 anos e não coleta dados deles de propósito."],
      },
      {
        heading: "Mudanças",
        paragraphs: [
          "Esta política vai mudar quando chegarem recursos novos (contas e apoio, por exemplo). A data no topo mostra a versão mais recente.",
        ],
      },
    ],
  },
};

const terms: Record<Locale, LegalDocument> = {
  en: {
    title: "Terms of Use",
    updated: "Last updated: October 7, 2026",
    intro:
      "These terms apply to anyone who plays Imperatle at imperatle.com. By playing, you agree to them. The game is made and run by Ventura, a developer based in Brazil.",
    sections: [
      {
        heading: "The game",
        paragraphs: [
          "Imperatle is free to play. It's offered as it is: it may change, be unavailable at times or have mistakes, and features may be added or removed.",
        ],
      },
      {
        heading: "Historical content",
        paragraphs: [
          "Dates, areas and borders of historical empires are often debated, and different sources disagree. The game uses widely cited figures and marks approximate ones, but it isn't a reference work. If you spot a mistake, the Feedback form is the best way to report it.",
        ],
      },
      {
        heading: "Fair play",
        items: [
          "Don't use scripts or automated requests against the game or its server.",
          "Don't try to get around the attempt limit or the protections of the site.",
          "Don't send abusive or illegal content through the feedback form.",
        ],
      },
      {
        heading: "Intellectual property",
        paragraphs: [
          "The game's code, design and texts belong to their author. Historical borders are adapted from Cliopatria (Bennett et al., Seshat Global History Databank, CC BY 4.0) and the world map comes from Natural Earth (public domain); the About screen credits them.",
        ],
      },
      {
        heading: "Paid features",
        paragraphs: [
          "Support for the project is planned as an optional subscription. When it's available, it will come with its own conditions (price, renewal, cancellation and refunds), shown before any payment.",
        ],
      },
      {
        heading: "Liability",
        paragraphs: [
          "To the extent the law allows, the author isn't liable for indirect damages from using the game or from it being unavailable.",
        ],
      },
      {
        heading: "Law and changes",
        paragraphs: [
          "These terms are governed by Brazilian law, without taking away the rights consumers have where they live. They may be updated; the date at the top shows the latest version. Questions go through the Feedback form.",
        ],
      },
    ],
  },
  pt: {
    title: "Termos de Uso",
    updated: "Atualizados em 7 de outubro de 2026",
    intro:
      "Estes termos valem para quem joga o Imperatle em imperatle.com. Ao jogar, você concorda com eles. O jogo é feito e mantido por Ventura, desenvolvedor no Brasil.",
    sections: [
      {
        heading: "O jogo",
        paragraphs: [
          "O Imperatle é gratuito. Ele é oferecido como está: pode mudar, ficar fora do ar às vezes ou ter erros, e recursos podem ser adicionados ou removidos.",
        ],
      },
      {
        heading: "Conteúdo histórico",
        paragraphs: [
          "Datas, áreas e fronteiras de impérios históricos costumam ser debatidas, e as fontes divergem. O jogo usa números amplamente citados e marca os aproximados, mas não é uma obra de referência. Se encontrar um erro, o formulário de Feedback é o melhor caminho para avisar.",
        ],
      },
      {
        heading: "Jogo limpo",
        items: [
          "Não use scripts ou requisições automáticas contra o jogo ou o servidor.",
          "Não tente contornar o limite de tentativas ou as proteções do site.",
          "Não envie conteúdo abusivo ou ilegal pelo formulário de feedback.",
        ],
      },
      {
        heading: "Propriedade intelectual",
        paragraphs: [
          "O código, o design e os textos do jogo pertencem ao autor. As fronteiras históricas são adaptadas do Cliopatria (Bennett et al., Seshat Global History Databank, CC BY 4.0) e o mapa do mundo vem do Natural Earth (domínio público); a tela Sobre traz os créditos.",
        ],
      },
      {
        heading: "Recursos pagos",
        paragraphs: [
          "O apoio ao projeto está planejado como uma assinatura opcional. Quando estiver disponível, terá condições próprias (preço, renovação, cancelamento e reembolso), mostradas antes de qualquer pagamento.",
        ],
      },
      {
        heading: "Responsabilidade",
        paragraphs: [
          "Na medida em que a lei permite, o autor não responde por danos indiretos causados pelo uso do jogo ou pela indisponibilidade dele.",
        ],
      },
      {
        heading: "Lei e mudanças",
        paragraphs: [
          "Estes termos seguem a lei brasileira, sem tirar os direitos que o consumidor tem onde mora. Eles podem ser atualizados; a data no topo mostra a versão mais recente. Dúvidas vão pelo formulário de Feedback.",
        ],
      },
    ],
  },
};

export const LEGAL = { privacy, terms };
export type LegalKind = keyof typeof LEGAL;

export function getLegalDocument(kind: LegalKind, locale: string): LegalDocument {
  return LEGAL[kind][locale === "pt" ? "pt" : "en"];
}
