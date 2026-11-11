// Privacy policy, terms of use and refund policy, in every site language. Kept as data (not in
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

type Locale = "en" | "pt" | "es";

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
  es: {
    title: "Política de Privacidad",
    updated: "Última actualización: 10 de noviembre de 2026",
    intro:
      "Imperatle es un juego diario y gratuito, hecho por una sola persona: João Vitor Ventura, desarrollador en Brasil, que es el responsable de los datos descritos aquí. El juego recoge lo mínimo posible: la cuenta es opcional, y nada de esto se usa para publicidad ni se vende. Este texto es una traducción: en caso de duda, prevalece la versión en portugués.",
    sections: [
      {
        heading: "Qué se recoge",
        items: [
          "Un identificador aleatorio guardado en una cookie (imperatle_aid) en tu primer intento. No está vinculado a tu nombre, correo electrónico ni dispositivo; solo sirve para que el servidor cuente tus intentos y guarde tus estadísticas.",
          "Tus partidas: la fecha, los imperios de tus intentos, cuántos intentos usaste y si acertaste (y, para quien apoya, las partidas anteriores y las rondas de práctica), vinculados a ese identificador.",
          "Solo si inicias sesión con Google: tu nombre, tu correo electrónico y el identificador de tu cuenta de Google, además de una cookie de inicio de sesión (imperatle_session). Tus partidas pasan a estar vinculadas a tu cuenta, y tus estadísticas te acompañan en cualquier dispositivo. El juego nunca ve tu contraseña de Google.",
          "Tu progreso del día, guardado en tu propio navegador (almacenamiento local) para que el tablero sobreviva a una recarga de la página. No sale de tu dispositivo.",
          "Los comentarios que envías: el mensaje, el tipo, el idioma del sitio y, solo si lo rellenas, tu correo electrónico.",
          "Los correos que envías a contato@imperatle.com: el mensaje y tu dirección de correo electrónico, reenviados a la bandeja de entrada del autor.",
          "Tu dirección IP, usada durante unos minutos para limitar cuántos intentos y mensajes se pueden enviar seguidos. El juego no la guarda, aunque los proveedores de alojamiento indicados abajo pueden conservarla en sus registros técnicos.",
          "Las visitas a las páginas, contadas por Cloudflare Web Analytics sin cookies y sin identificarte.",
          "Si compras el Apoyo: el pago lo gestiona Stripe, así que los datos de tu tarjeta o de otro medio de pago nunca llegan al juego. El juego solo recibe el identificador del pago y la información de si la compra se completó, se reembolsó o se impugnó, vinculados a tu cuenta. Stripe guarda los datos de pago y facturación que necesita para la compra, el recibo y sus obligaciones antifraude y legales.",
        ],
      },
      {
        heading: "Para qué",
        paragraphs: [
          "Para que el juego funcione (contar los intentos de forma justa, mostrar tus estadísticas y los resultados de todos en el día), para protegerlo contra abusos, para leer y responder los comentarios y los correos, y para saber cuántas personas juegan.",
          "Las bases legales son: la ejecución de lo que pediste (art. 7, V de la LGPD) para tu cuenta, las partidas vinculadas a ella y la compra del Apoyo; el interés legítimo en ofrecer y proteger el juego (art. 7, IX) para el identificador anónimo, los límites por dirección IP y el recuento de visitas; y tu consentimiento (art. 7, I) para el correo electrónico opcional del formulario de comentarios, que puedes retirar en cualquier momento.",
        ],
      },
      {
        heading: "Quién más trata los datos",
        paragraphs: ["El juego depende de estos proveedores, cada uno con sus propias condiciones de privacidad:"],
        items: [
          "Microsoft Azure (alojamiento del sitio y del servidor del juego), Estados Unidos.",
          "Cloudflare (recuento de visitas, sin cookies, y reenvío de los correos enviados a contato@imperatle.com), Estados Unidos.",
          "Google (inicio de sesión, solo si lo usas, y la bandeja de entrada que recibe los correos enviados a contato@imperatle.com), Estados Unidos.",
          "Neon (base de datos), Estados Unidos.",
          "Resend (reenvía por correo electrónico los mensajes de comentarios), Estados Unidos.",
          "Stripe (procesamiento del pago del Apoyo), Estados Unidos. Stripe trata tus datos de pago y facturación, en parte como responsable independiente del tratamiento (por ejemplo, para evitar fraudes y cumplir sus obligaciones legales), según su propia política de privacidad en stripe.com/privacy.",
        ],
      },
      {
        heading: "Datos guardados fuera de Brasil",
        paragraphs: [
          "Estos proveedores guardan los datos en Estados Unidos. Ese envío es necesario para ofrecer el juego que elegiste jugar y los servicios que pides en él (art. 33, IX de la LGPD), y cada proveedor protege los datos según sus propias condiciones de seguridad y privacidad.",
        ],
      },
      {
        heading: "Durante cuánto tiempo",
        paragraphs: [
          "Los registros de las partidas diarias se guardan mientras exista el juego, porque forman tus estadísticas y los resultados de cada día. Las rondas de práctica se borran automáticamente 30 días después de empezar. Una sesión de inicio de sesión se borra cuando caduca, o 7 días después de que cierres la sesión. Los comentarios y los correos se guardan durante el tiempo necesario para tramitarlos. La cookie caduca un año después de crearse. La cuenta se guarda hasta que la elimines.",
        ],
      },
      {
        heading: "Tus derechos",
        paragraphs: [
          "Según la LGPD de Brasil y, cuando corresponda, el RGPD europeo, puedes pedir la confirmación de que tus datos se tratan, el acceso, la corrección, la eliminación o una copia de ellos para llevarla a otro servicio (portabilidad), saber con quién se comparten, retirar tu consentimiento u oponerte a su uso. Haz la solicitud por correo electrónico a contato@imperatle.com o con el formulario de Comentarios del menú; la respuesta llega en un plazo máximo de 15 días.",
          "Si tienes cuenta, puedes eliminarla en cualquier momento desde el menú, junto con todas las partidas vinculadas a ella. Borrar las cookies y los datos del sitio en tu navegador también deshace el vínculo entre tú y tu historial de partidas. También puedes presentar una reclamación ante la autoridad brasileña de protección de datos, la ANPD (gov.br/anpd).",
        ],
      },
      {
        heading: "Menores",
        paragraphs: ["El juego no está dirigido a menores de 13 años y no recoge sus datos a sabiendas."],
      },
      {
        heading: "Cambios",
        paragraphs: [
          "Esta política cambiará cuando lleguen funciones nuevas. La fecha de arriba indica la versión más reciente.",
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
  es: {
    title: "Términos de Uso",
    updated: "Última actualización: 10 de noviembre de 2026",
    intro:
      "Estos términos se aplican a quien juega a Imperatle en imperatle.com. Al jugar, los aceptas. El juego lo hace y lo mantiene João Vitor Ventura, desarrollador en Brasil. Este texto es una traducción: en caso de duda, prevalece la versión en portugués.",
    sections: [
      {
        heading: "El juego",
        paragraphs: [
          "Imperatle es gratuito. Se ofrece tal como está: puede cambiar, no estar disponible en algunos momentos o tener errores, y se pueden añadir o quitar funciones. El juego diario sigue siendo gratuito.",
        ],
      },
      {
        heading: "Contenido histórico",
        paragraphs: [
          "Las fechas, áreas y fronteras de imperios y otras potencias históricas suelen ser objeto de debate, y las fuentes discrepan. El juego usa cifras ampliamente citadas y marca las aproximadas, pero no es una obra de referencia. Si encuentras un error, el formulario de Comentarios es la mejor forma de avisar.",
        ],
      },
      {
        heading: "Juego limpio",
        items: [
          "No uses scripts ni solicitudes automáticas contra el juego o su servidor.",
          "No intentes eludir el límite de intentos ni las protecciones del sitio.",
          "No envíes contenido abusivo o ilegal por el formulario de comentarios.",
        ],
      },
      {
        heading: "Propiedad intelectual",
        paragraphs: [
          "El código, el diseño y los textos del juego pertenecen a su autor. Las fronteras históricas están adaptadas de Cliopatria (Bennett et al., Seshat Global History Databank, CC BY 4.0) y el mapa del mundo procede de Natural Earth (dominio público); la pantalla Acerca de incluye los créditos.",
        ],
      },
      {
        heading: "Compra del Apoyo",
        paragraphs: [
          "El Apoyo es una compra opcional y única (no es una suscripción) que activa funciones adicionales, como las partidas anteriores y el modo práctica, en la cuenta usada en la compra, mientras exista el juego. El precio final y la moneda aparecen antes del pago.",
          "La compra la vende el autor, João Vitor Ventura, y el pago lo procesa Stripe. Las dudas sobre una compra se envían a contato@imperatle.com.",
          "Los reembolsos siguen la Política de Reembolsos, enlazada al pie de todas las páginas. Una compra reembolsada o impugnada (contracargo) quita de la cuenta las funciones del Apoyo.",
        ],
      },
      {
        heading: "Responsabilidad",
        paragraphs: [
          "En la medida en que la ley lo permita, el autor no responde por daños indirectos causados por el uso del juego o por su falta de disponibilidad.",
        ],
      },
      {
        heading: "Ley aplicable y cambios",
        paragraphs: [
          "Estos términos se rigen por la ley brasileña, sin quitar los derechos que el consumidor tiene donde vive. Pueden actualizarse; la fecha de arriba indica la versión más reciente. Las dudas se envían a contato@imperatle.com o por el formulario de Comentarios.",
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
  es: {
    title: "Política de Reembolsos",
    updated: "Última actualización: 10 de noviembre de 2026",
    intro:
      "Esta política se aplica a la compra del Apoyo en Imperatle. La compra la vende el autor, João Vitor Ventura, y el pago lo procesa Stripe, que también envía el recibo. Los reembolsos los hace el autor, a través de Stripe. Este texto es una traducción: en caso de duda, prevalece la versión en portugués.",
    sections: [
      {
        heading: "Qué compras",
        paragraphs: [
          "El Apoyo es un pago único, no una suscripción: nada se renueva y nada se vuelve a cobrar. Activa las funciones de mecenas en la cuenta con la que habías iniciado sesión, mientras exista el juego.",
        ],
      },
      {
        heading: "Reembolso en un plazo de 14 días",
        paragraphs: [
          "Puedes pedir el reembolso íntegro en un plazo de 14 días desde la compra, por cualquier motivo. Esto incluye el derecho de desistimiento que tengas donde vives, como los 7 días del Código de Defensa del Consumidor de Brasil (art. 49).",
        ],
      },
      {
        heading: "Después de 14 días",
        paragraphs: [
          "Las solicitudes posteriores se valoran caso por caso, por ejemplo un cobro duplicado o una función del Apoyo que dejó de funcionar y no se pudo arreglar. Tus derechos como consumidor previstos por la ley nunca se ven afectados.",
        ],
      },
      {
        heading: "Cómo pedirlo",
        items: [
          "Escribe a contato@imperatle.com indicando el correo electrónico que usaste en la compra.",
          "O usa el formulario de Comentarios del menú, indicando el correo electrónico que usaste en la compra.",
        ],
      },
      {
        heading: "Después del reembolso",
        paragraphs: [
          "El dinero vuelve al mismo medio de pago; el plazo para que aparezca depende de tu banco o del emisor de la tarjeta. Las funciones del Apoyo se quitan de la cuenta. Un contracargo (un pago impugnado ante tu banco) tiene el mismo efecto. Tu historial de partidas y tus estadísticas se quedan como están.",
        ],
      },
    ],
  },
};

export const LEGAL = { privacy, terms, refunds };
export type LegalKind = keyof typeof LEGAL;

export function getLegalDocument(kind: LegalKind, locale: string): LegalDocument {
  return LEGAL[kind][locale === "pt" || locale === "es" ? locale : "en"];
}
