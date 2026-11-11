# Tradução para espanhol: método e convenções

Válido para todos os agentes que trabalham na tradução. Leia inteiro antes de começar.

## Método (definido pelo dono do projeto)

Não use API nem ferramenta de tradução automática: você traduz, seguindo este método.

1. **Variante:** espanhol neutro (tú, sem vosotros e sem voseo), entendível na Espanha e na América Latina. Se um termo divergir muito entre Espanha e América Latina, anote na lista de revisão em vez de escolher sozinho.
2. **Glossário primeiro (o mais importante):** antes de traduzir textos, monte o glossário de todo nome próprio e termo histórico (impérios, capitais, governantes, povos, línguas, títulos como sultão/czar/califa). Para cada um, use a forma consagrada em espanhol, com fonte: es.wikipedia.org (título do artigo) e Fundéu/RAE para grafia e maiúsculas. Em espanhol o adjetivo vai em minúscula: "Imperio otomano", "Imperio romano", "dinastía Han". Marque a confiança: **alta** = forma consagrada com fonte; **média/baixa** = pendente de revisão nativa. Nunca invente exônimo: se não houver forma em espanhol, use a forma da es.wikipedia.
3. **Regras de conteúdo do jogo valem na tradução:** precisão histórica; capital e língua não podem entregar o nome do império (cuidado com traduções em que o adjetivo pátrio fica igual ao nome); as três curiosidades continuam da menos para a mais óbvia; nenhuma curiosidade pode citar o nome do império da resposta.
4. **Busca do palpite:** o espanhol precisa aceitar a forma consagrada e variações (com e sem acento, com e sem artigo) e continuar aceitando os nomes em inglês e português.
5. **Testes:** um teste falha se faltar chave em espanhol em relação ao inglês, ou se aparecer travessão longo (—) em texto visível.
6. **Lista de revisão no fim:** termos de confiança média/baixa e frases em que você ficou em dúvida, para um falante nativo conferir.

## Regras da casa

- **Nunca travessão longo (—)** em texto visível. Use vírgula, dois-pontos, ponto ou parênteses. "--" também não.
- O jogo fala de **"imperios y otras potencias"**: a mecânica diz "la respuesta" e "tu intento"/"tu respuesta", nunca "el imperio del mapa".
- Tom neutro, sem juízo de valor positivo ou negativo sobre impérios (inclusive coloniais e estados comunistas): fatos e extensão territorial.
- **Não faça commit, push nem deploy.** O orquestrador revisa e faz os commits com caminhos explícitos.
- Trabalhe **somente** nos arquivos atribuídos a você. Outros agentes estão mexendo nos outros arquivos ao mesmo tempo.

## Formato do conteúdo (Content/empires/*.json)

Todo texto bilíngue `{ "en": ..., "pt": ... }` ganha `"es"` logo depois de `"pt"`:

```json
"name": { "en": "Ottoman Empire", "pt": "Império Otomano", "es": "Imperio otomano" },
"curiosities": [
  { "en": "...", "pt": "...", "es": "...", "details": { "en": "...", "pt": "...", "es": "..." } }
],
"wikipedia": { "en": "https://en.wikipedia.org/wiki/...", "pt": "https://pt.wikipedia.org/wiki/...", "es": "https://es.wikipedia.org/wiki/..." }
```

Campos com texto: `name`, `durationNotes`, `capital`, `language`, `religion`, `religionNotes`, `curiosities[].{texto, details}`, `wikipedia`, `summary`. Os que não existem num império continuam sem existir. `aliases` é uma lista única para todos os idiomas: acrescente as variações em espanhol que um jogador digitaria (sem repetir o que já está lá e sem nome de capital).

**Edite os JSON no lugar** (inserindo as linhas/chaves `"es"`), mantendo a indentação de 2 espaços e a ordem das chaves. Não reserialize o arquivo inteiro (os anéis desenhados em `map.parts` ficam numa linha só e não podem ser expandidos). Não mexa em `map`, `peak`, `start`, `end`, `area` nem nas outras chaves.

Arquivos de glossário e revisão: `docs/i18n/es/`, em Markdown, tabela com colunas: Termo (pt) | en | es | Fonte (URL) | Confiança | Nota.
