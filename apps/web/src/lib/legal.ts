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
    updated: "Last updated: November 3, 2026",
    intro:
      "Imperatle is a free daily game made by one person, Ventura, a developer based in Brazil, who is responsible for the data described here. The game collects as little as it can: an account is optional, and nothing here is used for advertising or sold.",
    sections: [
      {
        heading: "What is collected",
        items: [
          "A random identifier stored in a cookie (imperatle_aid) the first time you guess. It isn't linked to your name, e-mail or device; it only lets the server count your attempts and keep your statistics.",
          "Your games: the date, the empires you guessed, how many attempts you used and whether you got it right (and, for supporters, past games and practice rounds), linked to that identifier.",
          "Only if you sign in with Google: your name, e-mail address and Google account identifier, plus a login cookie (imperatle_session). Your games are then linked to your account, so your statistics follow you on every device. The game never sees your Google password.",
          "Your progress of the day, saved in your own browser (local storage) so the board survives a page reload. It never leaves your device.",
          "Feedback you send: the message, its type, the site language and, only if you fill it in, your e-mail address.",
          "Your IP address, used for a few minutes to limit how many guesses and messages can be sent in a row. It isn't stored by the game, although the hosting providers below may keep it in their technical logs.",
          "Page views, counted by Vercel Web Analytics without cookies and without identifying you.",
          "If you buy Supporter: the payment is handled entirely by Paddle, so your card or other payment details never reach the game. The game only receives the transaction id and the fact that the purchase was completed or refunded, linked to your account.",
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
          "Google (sign-in, only if you use it), United States.",
          "Microsoft Azure (game server).",
          "Neon (database).",
          "Resend (forwards feedback messages by e-mail), United States.",
          "Paddle (payment processor and merchant of record for the Supporter purchase), United Kingdom. Paddle is the seller of that purchase and handles your payment and billing data as an independent controller, under its own privacy policy at paddle.com/legal.",
        ],
      },
      {
        heading: "How long it is kept",
        paragraphs: [
          "Game records are kept while the game exists, since they make up your statistics and the daily results. Feedback is kept for as long as it's needed to handle it. The cookie expires one year after it is created. An account is kept until you delete it.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "Under Brazil's LGPD and, where it applies, the European GDPR, you can ask to access, correct or delete your data, or object to its use. Send the request through the Feedback form in the menu. If you have an account, you can delete it and every game linked to it at any time from the menu. Deleting your browser's cookies and site data also cuts the link between you and your game history.",
        ],
      },
      {
        heading: "Children",
        paragraphs: ["The game isn't directed at children under 13 and doesn't knowingly collect their data."],
      },
      {
        heading: "Changes",
        paragraphs: [
          "This policy will change when new features arrive. The date at the top shows the latest version.",
        ],
      },
    ],
  },
  pt: {
    title: "Política de Privacidade",
    updated: "Atualizada em 3 de novembro de 2026",
    intro:
      "O Imperatle é um jogo diário e gratuito, feito por uma pessoa só: Ventura, desenvolvedor no Brasil, que é o responsável pelos dados descritos aqui. O jogo coleta o mínimo possível: a conta é opcional, e nada aqui é usado para publicidade ou vendido.",
    sections: [
      {
        heading: "O que é coletado",
        items: [
          "Um identificador aleatório guardado num cookie (imperatle_aid) no seu primeiro palpite. Ele não está ligado ao seu nome, e-mail ou aparelho; só serve para o servidor contar suas tentativas e guardar suas estatísticas.",
          "Seus jogos: a data, os impérios dos seus palpites, quantas tentativas você usou e se acertou (e, para apoiadores, os jogos passados e as rodadas de treino), ligados a esse identificador.",
          "Só se você entrar com o Google: seu nome, seu e-mail e o identificador da sua conta Google, mais um cookie de login (imperatle_session). Seus jogos passam a ficar ligados à sua conta, e suas estatísticas te acompanham em qualquer aparelho. O jogo nunca vê sua senha do Google.",
          "Seu progresso do dia, salvo no seu próprio navegador (armazenamento local) para o tabuleiro sobreviver a um recarregamento da página. Ele não sai do seu aparelho.",
          "O feedback que você envia: a mensagem, o tipo, o idioma do site e, só se você preencher, seu e-mail.",
          "Seu endereço IP, usado por alguns minutos para limitar quantos palpites e mensagens podem ser enviados seguidos. O jogo não o guarda, mas os provedores de hospedagem abaixo podem mantê-lo nos registros técnicos deles.",
          "Visitas às páginas, contadas pelo Vercel Web Analytics sem cookies e sem identificar você.",
          "Se você comprar o Apoio: o pagamento é feito todo pela Paddle, então os dados do seu cartão ou de outro meio de pagamento nunca chegam ao jogo. O jogo recebe só o identificador da transação e a informação de que a compra foi concluída ou reembolsada, ligados à sua conta.",
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
          "Google (login, só se você usar), Estados Unidos.",
          "Microsoft Azure (servidor do jogo).",
          "Neon (banco de dados).",
          "Resend (encaminha as mensagens de feedback por e-mail), Estados Unidos.",
          "Paddle (processadora de pagamentos e responsável pela venda, o merchant of record, do Apoio), Reino Unido. A Paddle é quem vende essa compra e trata seus dados de pagamento e cobrança como controladora independente, pela política de privacidade dela em paddle.com/legal.",
        ],
      },
      {
        heading: "Por quanto tempo",
        paragraphs: [
          "Os registros de jogo ficam guardados enquanto o jogo existir, porque formam suas estatísticas e os resultados de cada dia. O feedback fica guardado pelo tempo necessário para tratá-lo. O cookie expira um ano depois de ser criado. A conta fica guardada até você excluí-la.",
        ],
      },
      {
        heading: "Seus direitos",
        paragraphs: [
          "Pela LGPD e, quando se aplicar, pelo GDPR europeu, você pode pedir acesso, correção ou exclusão dos seus dados, ou se opor ao uso deles. Faça o pedido pelo formulário de Feedback no menu. Se você tem conta, pode excluí-la a qualquer momento pelo menu, junto com todos os jogos ligados a ela. Apagar os cookies e os dados do site no seu navegador também desfaz a ligação entre você e seu histórico de jogos.",
        ],
      },
      {
        heading: "Crianças",
        paragraphs: ["O jogo não é voltado para menores de 13 anos e não coleta dados deles de propósito."],
      },
      {
        heading: "Mudanças",
        paragraphs: [
          "Esta política vai mudar quando chegarem recursos novos. A data no topo mostra a versão mais recente.",
        ],
      },
    ],
  },
};

const terms: Record<Locale, LegalDocument> = {
  en: {
    title: "Terms of Use",
    updated: "Last updated: November 3, 2026",
    intro:
      "These terms apply to anyone who plays Imperatle at imperatle.com. By playing, you agree to them. The game is made and run by Ventura, a developer based in Brazil.",
    sections: [
      {
        heading: "The game",
        paragraphs: [
          "Imperatle is free to play. It's offered as it is: it may change, be unavailable at times or have mistakes, and features may be added or removed. The daily game stays free.",
        ],
      },
      {
        heading: "Historical content",
        paragraphs: [
          "Dates, areas and borders of empires and other historical powers are often debated, and different sources disagree. The game uses widely cited figures and marks approximate ones, but it isn't a reference work. If you spot a mistake, the Feedback form is the best way to report it.",
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
        heading: "Supporter purchase",
        paragraphs: [
          "Supporter is an optional one-time purchase (not a subscription) that adds extra features, such as past games and practice mode, to the account it was bought with, for as long as the game runs. The price is shown in your currency before you pay.",
          "Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer service inquiries and handles returns. Paddle's Buyer Terms (paddle.com/legal/checkout-buyer-terms) also apply to the purchase.",
          "Refunds follow the Refund Policy, linked at the bottom of every page. A refunded or charged-back purchase removes the Supporter features from the account.",
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
    updated: "Atualizados em 3 de novembro de 2026",
    intro:
      "Estes termos valem para quem joga o Imperatle em imperatle.com. Ao jogar, você concorda com eles. O jogo é feito e mantido por Ventura, desenvolvedor no Brasil.",
    sections: [
      {
        heading: "O jogo",
        paragraphs: [
          "O Imperatle é gratuito. Ele é oferecido como está: pode mudar, ficar fora do ar às vezes ou ter erros, e recursos podem ser adicionados ou removidos. O jogo diário continua gratuito.",
        ],
      },
      {
        heading: "Conteúdo histórico",
        paragraphs: [
          "Datas, áreas e fronteiras de impérios e outras potências históricas costumam ser debatidas, e as fontes divergem. O jogo usa números amplamente citados e marca os aproximados, mas não é uma obra de referência. Se encontrar um erro, o formulário de Feedback é o melhor caminho para avisar.",
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
        heading: "Compra do Apoio",
        paragraphs: [
          "O Apoio é uma compra opcional e única (não é assinatura) que libera recursos extras, como jogos anteriores e modo treino, na conta usada na compra, enquanto o jogo existir. O preço aparece na sua moeda antes do pagamento.",
          "A venda é feita pela nossa revendedora online Paddle.com. A Paddle.com é a responsável pela venda (Merchant of Record) de todos os nossos pedidos: ela atende as dúvidas sobre a compra e cuida das devoluções. Os Termos do Comprador da Paddle (paddle.com/legal/checkout-buyer-terms) também valem para a compra.",
          "Os reembolsos seguem a Política de Reembolso, com link no rodapé de todas as páginas. Uma compra reembolsada ou contestada (chargeback) tira os recursos do Apoio da conta.",
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

const refunds: Record<Locale, LegalDocument> = {
  en: {
    title: "Refund Policy",
    updated: "Last updated: November 3, 2026",
    intro:
      "This policy covers the Supporter purchase on Imperatle. The purchase is sold by Paddle.com, our online reseller and Merchant of Record: Paddle is the seller you pay, it processes the payment, issues the receipt and handles refunds.",
    sections: [
      {
        heading: "What you buy",
        paragraphs: [
          "Supporter is a one-time payment, not a subscription: nothing renews and nothing is charged again. It unlocks the Supporter features on the account you were signed in with, for as long as the game runs.",
        ],
      },
      {
        heading: "Refunds within 14 days",
        paragraphs: [
          "You can ask for a full refund within 14 days of the purchase, for any reason. This includes the legal right of withdrawal you may have where you live, such as the 7 days of Brazil's Consumer Defense Code (art. 49).",
        ],
      },
      {
        heading: "After 14 days",
        paragraphs: [
          "Later requests are looked at case by case, for example a duplicate charge or a Supporter feature that stopped working and couldn't be fixed. Your statutory consumer rights are never affected.",
        ],
      },
      {
        heading: "How to ask",
        items: [
          "Look up your order at paddle.net with the e-mail you used to buy, or reply to the receipt e-mail Paddle sent you.",
          "Or write through the Feedback form in the menu, with the e-mail you used to buy.",
        ],
      },
      {
        heading: "After a refund",
        paragraphs: [
          "The money goes back to the original payment method; how long it takes to show up depends on your bank or card issuer. The Supporter features are removed from the account. A chargeback (a payment disputed with your bank) has the same effect. Your game history and statistics stay as they are.",
        ],
      },
    ],
  },
  pt: {
    title: "Política de Reembolso",
    updated: "Atualizada em 3 de novembro de 2026",
    intro:
      "Esta política vale para a compra do Apoio no Imperatle. A compra é vendida pela Paddle.com, nossa revendedora online e responsável pela venda (Merchant of Record): a Paddle é quem recebe o pagamento, emite o recibo e cuida dos reembolsos.",
    sections: [
      {
        heading: "O que você compra",
        paragraphs: [
          "O Apoio é um pagamento único, não uma assinatura: nada renova e nada é cobrado de novo. Ele libera os recursos de apoiador na conta em que você estava conectado, enquanto o jogo existir.",
        ],
      },
      {
        heading: "Reembolso em até 14 dias",
        paragraphs: [
          "Você pode pedir o reembolso integral em até 14 dias depois da compra, por qualquer motivo. Isso inclui o direito de arrependimento que você tenha onde mora, como os 7 dias do Código de Defesa do Consumidor (art. 49).",
        ],
      },
      {
        heading: "Depois de 14 dias",
        paragraphs: [
          "Pedidos depois disso são avaliados caso a caso, por exemplo uma cobrança duplicada ou um recurso do Apoio que parou de funcionar e não teve conserto. Seus direitos de consumidor previstos em lei nunca são afetados.",
        ],
      },
      {
        heading: "Como pedir",
        items: [
          "Encontre seu pedido em paddle.net com o e-mail usado na compra, ou responda o e-mail de recibo que a Paddle enviou.",
          "Ou escreva pelo formulário de Feedback no menu, informando o e-mail usado na compra.",
        ],
      },
      {
        heading: "Depois do reembolso",
        paragraphs: [
          "O dinheiro volta para o mesmo meio de pagamento; o prazo para aparecer depende do seu banco ou da operadora do cartão. Os recursos do Apoio saem da conta. Um chargeback (pagamento contestado no banco) tem o mesmo efeito. Seu histórico de jogos e suas estatísticas continuam como estão.",
        ],
      },
    ],
  },
};

export const LEGAL = { privacy, terms, refunds };
export type LegalKind = keyof typeof LEGAL;

export function getLegalDocument(kind: LegalKind, locale: string): LegalDocument {
  return LEGAL[kind][locale === "pt" ? "pt" : "en"];
}
