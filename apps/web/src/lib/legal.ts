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
    updated: "Last updated: November 10, 2026",
    intro:
      "Imperatle is a free daily game made by one person, João Vitor Ventura, a developer based in Brazil, who is responsible for the data described here. The game collects as little as it can: an account is optional, and nothing here is used for advertising or sold.",
    sections: [
      {
        heading: "What is collected",
        items: [
          "A random identifier stored in a cookie (imperatle_aid) the first time you guess. It isn't linked to your name, e-mail or device; it only lets the server count your attempts and keep your statistics.",
          "Your games: the date, the empires you guessed, how many attempts you used and whether you got it right (and, for supporters, past games and practice rounds), linked to that identifier.",
          "Only if you sign in with Google: your name, e-mail address and Google account identifier, plus a login cookie (imperatle_session). Your games are then linked to your account, so your statistics follow you on every device. The game never sees your Google password.",
          "Your progress of the day, saved in your own browser (local storage) so the board survives a page reload. It never leaves your device.",
          "Feedback you send: the message, its type, the site language and, only if you fill it in, your e-mail address.",
          "E-mails you send to contato@imperatle.com: the message and your e-mail address, forwarded to the author's inbox.",
          "Your IP address, used for a few minutes to limit how many guesses and messages can be sent in a row. It isn't stored by the game, although the hosting providers below may keep it in their technical logs.",
          "Page views, counted by Cloudflare Web Analytics without cookies and without identifying you.",
          "If you buy Supporter: the payment is handled by Stripe, so your card or other payment details never reach the game. The game only receives the payment identifier and whether the purchase was completed, refunded or disputed, linked to your account. Stripe keeps the payment and billing data it needs for the purchase, the receipt and its anti-fraud and legal obligations.",
        ],
      },
      {
        heading: "Why",
        paragraphs: [
          "To run the game (count attempts fairly, show your statistics and everyone's results of the day), to protect it against abuse, to read and answer feedback and e-mails, and to understand how many people play.",
          "The legal bases are: performing what you asked for (Art. 7, V of the LGPD) for your account, your games linked to it and the Supporter purchase; the legitimate interest in providing and securing the game (Art. 7, IX) for the anonymous identifier, the limits by IP address and the page view counts; and your consent (Art. 7, I) for the optional e-mail in the feedback form, which you can withdraw at any time.",
        ],
      },
      {
        heading: "Who else handles the data",
        paragraphs: ["The game relies on these providers, each under its own privacy terms:"],
        items: [
          "Microsoft Azure (hosting of the website and the game server), United States.",
          "Cloudflare (page view counts, without cookies, and forwarding of e-mails sent to contato@imperatle.com), United States.",
          "Google (sign-in, only if you use it, and the inbox that receives e-mails sent to contato@imperatle.com), United States.",
          "Neon (database), United States.",
          "Resend (forwards feedback messages by e-mail), United States.",
          "Stripe (payment processing for the Supporter purchase), United States. Stripe handles your payment and billing data, partly as an independent controller (for example to prevent fraud and meet its legal obligations), under its own privacy policy at stripe.com/privacy.",
        ],
      },
      {
        heading: "Data stored outside Brazil",
        paragraphs: [
          "These providers store data in the United States. Sending it there is necessary to provide the game you chose to play and the services you ask for in it (Art. 33, IX of the LGPD), and each provider protects it under its own security and privacy terms.",
        ],
      },
      {
        heading: "How long it is kept",
        paragraphs: [
          "Records of daily games are kept while the game exists, since they make up your statistics and the daily results. Practice rounds are deleted automatically 30 days after they start. A login session is deleted once it expires, or 7 days after you sign out. Feedback and e-mails are kept for as long as it's needed to handle them. The cookie expires one year after it is created. An account is kept until you delete it.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "Under Brazil's LGPD and, where it applies, the European GDPR, you can ask to confirm whether your data is processed, to access, correct, delete or receive a copy of it to take to another service (portability), to know with whom it is shared, to withdraw your consent, or to object to its use. Send the request to contato@imperatle.com or through the Feedback form in the menu; it will be answered within 15 days.",
          "If you have an account, you can delete it and every game linked to it at any time from the menu. Deleting your browser's cookies and site data also cuts the link between you and your game history. You can also file a complaint with Brazil's data protection authority, the ANPD (gov.br/anpd).",
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
    updated: "Atualizada em 10 de novembro de 2026",
    intro:
      "O Imperatle é um jogo diário e gratuito, feito por uma pessoa só: João Vitor Ventura, desenvolvedor no Brasil, que é o responsável pelos dados descritos aqui. O jogo coleta o mínimo possível: a conta é opcional, e nada aqui é usado para publicidade ou vendido.",
    sections: [
      {
        heading: "O que é coletado",
        items: [
          "Um identificador aleatório guardado num cookie (imperatle_aid) no seu primeiro palpite. Ele não está ligado ao seu nome, e-mail ou aparelho; só serve para o servidor contar suas tentativas e guardar suas estatísticas.",
          "Seus jogos: a data, os impérios dos seus palpites, quantas tentativas você usou e se acertou (e, para apoiadores, os jogos passados e as rodadas de treino), ligados a esse identificador.",
          "Só se você entrar com o Google: seu nome, seu e-mail e o identificador da sua conta Google, mais um cookie de login (imperatle_session). Seus jogos passam a ficar ligados à sua conta, e suas estatísticas te acompanham em qualquer aparelho. O jogo nunca vê sua senha do Google.",
          "Seu progresso do dia, salvo no seu próprio navegador (armazenamento local) para o tabuleiro sobreviver a um recarregamento da página. Ele não sai do seu aparelho.",
          "O feedback que você envia: a mensagem, o tipo, o idioma do site e, só se você preencher, seu e-mail.",
          "Os e-mails que você manda para contato@imperatle.com: a mensagem e o seu endereço de e-mail, encaminhados para a caixa de entrada do autor.",
          "Seu endereço IP, usado por alguns minutos para limitar quantos palpites e mensagens podem ser enviados seguidos. O jogo não o guarda, mas os provedores de hospedagem abaixo podem mantê-lo nos registros técnicos deles.",
          "Visitas às páginas, contadas pelo Cloudflare Web Analytics sem cookies e sem identificar você.",
          "Se você comprar o Apoio: o pagamento é feito pela Stripe, então os dados do seu cartão ou de outro meio de pagamento nunca chegam ao jogo. O jogo recebe só o identificador do pagamento e a informação de que a compra foi concluída, reembolsada ou contestada, ligados à sua conta. A Stripe guarda os dados de pagamento e cobrança de que precisa para a compra, o recibo e as obrigações antifraude e legais dela.",
        ],
      },
      {
        heading: "Para quê",
        paragraphs: [
          "Para o jogo funcionar (contar as tentativas de forma justa, mostrar suas estatísticas e o resultado de todos no dia), para protegê-lo contra abuso, para ler e responder o feedback e os e-mails e para saber quantas pessoas jogam.",
          "As bases legais são: a execução do que você pediu (art. 7º, V da LGPD) para a sua conta, os jogos ligados a ela e a compra do Apoio; o legítimo interesse em oferecer e proteger o jogo (art. 7º, IX) para o identificador anônimo, os limites por endereço IP e a contagem de visitas; e o seu consentimento (art. 7º, I) para o e-mail opcional do formulário de feedback, que você pode retirar a qualquer momento.",
        ],
      },
      {
        heading: "Quem mais trata os dados",
        paragraphs: ["O jogo depende destes provedores, cada um com seus próprios termos de privacidade:"],
        items: [
          "Microsoft Azure (hospedagem do site e do servidor do jogo), Estados Unidos.",
          "Cloudflare (contagem de visitas, sem cookies, e encaminhamento dos e-mails enviados para contato@imperatle.com), Estados Unidos.",
          "Google (login, só se você usar, e a caixa de entrada que recebe os e-mails enviados para contato@imperatle.com), Estados Unidos.",
          "Neon (banco de dados), Estados Unidos.",
          "Resend (encaminha as mensagens de feedback por e-mail), Estados Unidos.",
          "Stripe (processamento do pagamento do Apoio), Estados Unidos. A Stripe trata seus dados de pagamento e cobrança, em parte como controladora independente (por exemplo para evitar fraudes e cumprir as obrigações legais dela), pela política de privacidade dela em stripe.com/privacy.",
        ],
      },
      {
        heading: "Dados guardados fora do Brasil",
        paragraphs: [
          "Esses provedores guardam os dados nos Estados Unidos. Esse envio é necessário para oferecer o jogo que você escolheu jogar e os serviços que você pede nele (art. 33, IX da LGPD), e cada provedor protege os dados pelos próprios termos de segurança e privacidade.",
        ],
      },
      {
        heading: "Por quanto tempo",
        paragraphs: [
          "Os registros dos jogos diários ficam guardados enquanto o jogo existir, porque formam suas estatísticas e os resultados de cada dia. As rodadas de treino são apagadas sozinhas 30 dias depois de começarem. Uma sessão de login é apagada quando expira, ou 7 dias depois que você sai da conta. O feedback e os e-mails ficam guardados pelo tempo necessário para tratá-los. O cookie expira um ano depois de ser criado. A conta fica guardada até você excluí-la.",
        ],
      },
      {
        heading: "Seus direitos",
        paragraphs: [
          "Pela LGPD e, quando se aplicar, pelo GDPR europeu, você pode pedir a confirmação de que seus dados são tratados, o acesso, a correção, a exclusão ou uma cópia deles para levar a outro serviço (portabilidade), saber com quem eles são compartilhados, retirar o seu consentimento ou se opor ao uso deles. Faça o pedido por e-mail para contato@imperatle.com ou pelo formulário de Feedback no menu; a resposta vem em até 15 dias.",
          "Se você tem conta, pode excluí-la a qualquer momento pelo menu, junto com todos os jogos ligados a ela. Apagar os cookies e os dados do site no seu navegador também desfaz a ligação entre você e seu histórico de jogos. Você também pode reclamar na autoridade de proteção de dados, a ANPD (gov.br/anpd).",
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
    updated: "Last updated: November 10, 2026",
    intro:
      "These terms apply to anyone who plays Imperatle at imperatle.com. By playing, you agree to them. The game is made and run by João Vitor Ventura, a developer based in Brazil.",
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
          "Supporter is an optional one-time purchase (not a subscription) that adds extra features, such as past games and practice mode, to the account it was bought with, for as long as the game runs. The final price and currency are shown before you pay.",
          "The purchase is sold by the author, João Vitor Ventura, and the payment is processed by Stripe. Questions about a purchase go to contato@imperatle.com.",
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
          "These terms are governed by Brazilian law, without taking away the rights consumers have where they live. They may be updated; the date at the top shows the latest version. Questions go to contato@imperatle.com or through the Feedback form.",
        ],
      },
    ],
  },
  pt: {
    title: "Termos de Uso",
    updated: "Atualizados em 10 de novembro de 2026",
    intro:
      "Estes termos valem para quem joga o Imperatle em imperatle.com. Ao jogar, você concorda com eles. O jogo é feito e mantido por João Vitor Ventura, desenvolvedor no Brasil.",
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
          "O Apoio é uma compra opcional e única (não é assinatura) que libera recursos extras, como jogos anteriores e modo treino, na conta usada na compra, enquanto o jogo existir. O preço final e a moeda aparecem antes do pagamento.",
          "A compra é vendida pelo autor, João Vitor Ventura, e o pagamento é processado pela Stripe. Dúvidas sobre uma compra vão para contato@imperatle.com.",
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
          "Estes termos seguem a lei brasileira, sem tirar os direitos que o consumidor tem onde mora. Eles podem ser atualizados; a data no topo mostra a versão mais recente. Dúvidas vão para contato@imperatle.com ou pelo formulário de Feedback.",
        ],
      },
    ],
  },
};

const refunds: Record<Locale, LegalDocument> = {
  en: {
    title: "Refund Policy",
    updated: "Last updated: November 10, 2026",
    intro:
      "This policy covers the Supporter purchase on Imperatle. The purchase is sold by the author, João Vitor Ventura, and the payment is processed by Stripe, which also sends the receipt. Refunds are made by the author through Stripe.",
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
          "Write to contato@imperatle.com with the e-mail you used to buy.",
          "Or use the Feedback form in the menu, with the e-mail you used to buy.",
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
    updated: "Atualizada em 10 de novembro de 2026",
    intro:
      "Esta política vale para a compra do Apoio no Imperatle. A compra é vendida pelo autor, João Vitor Ventura, e o pagamento é processado pela Stripe, que também envia o recibo. Os reembolsos são feitos pelo autor, pela Stripe.",
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
          "Escreva para contato@imperatle.com informando o e-mail usado na compra.",
          "Ou use o formulário de Feedback no menu, informando o e-mail usado na compra.",
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
