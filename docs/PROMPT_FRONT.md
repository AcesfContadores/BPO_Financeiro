# PROMPT · Front-end do Painel "Reunião de Resultados" · Grupo Prontomed (ACESF BPO Financeiro)

> Cole este arquivo inteiro na IA que vai gerar o front. Anexe também: (1) o PDF "Resultados Financeiros · Setembro/2026" (referência visual), (2) `docs/fonte-dos-numeros/Prompt_Prontomed_Set2026.md` e `Prompt_Multidisciplinar_Set2026.md` (textos e números de referência), (3) a pasta do projeto (ou ao menos `index.html`, `js/`, `css/`, `docs/CONTAS.md`).

---

## 1. Papel e objetivo

Você é desenvolvedor front-end sênior e designer de apresentações executivas. Construa um **site estático em forma de apresentação (slides 16:9)** com os resultados mensais do **Grupo Prontomed** (Clínica Prontomed + Clínica Multidisciplinar), no padrão visual da ACESF Contadores Associados. **Os números vêm do Supabase a cada abertura da página** (nada de dados fixos no HTML), então, quando o banco for atualizado, o site mostra os valores novos sozinho.

O site será publicado no **GitHub Pages** (repositório público, subcaminho `https://<usuario>.github.io/<repo>/`). Isso impõe regras técnicas (seção 2).

## 2. Restrições técnicas (OBRIGATÓRIAS)

1. **100% estático, sem etapa de build.** HTML + CSS + JavaScript em módulos ES (`<script type="module">`). Nada de Node/npm/bundler, nada de servidor. Bibliotecas só por CDN com versão fixa (ex.: `https://cdn.jsdelivr.net/npm/chart.js@4.4.4`); **prefira SVG feito à mão** para cascata, bullet do ponto de equilíbrio, sparklines e barras (leve, controlável e imprime bem). Se usar biblioteca de gráficos, que seja uma só.
2. **Caminhos relativos** em tudo (`./js/api.js`, `css/tokens.css`), nunca começando com `/`, porque o site roda em subcaminho.
3. **Roteamento por hash** (`#/empresa/prontomed/slide/7`), nunca por caminho (Pages não faz rewrite). Deve funcionar com F5 e com link direto.
4. **Sem cookies e sem localStorage obrigatório.** Preferência de tema/empresa pode usar `localStorage` dentro de try/catch.
5. **`<meta name="robots" content="noindex, nofollow">`** (link aberto, mas não indexável).
6. **Já existe no projeto** (use, não reescreva): `js/config.js` (URL e chave pública do Supabase), `js/api.js` (carrega os dados e oferece `v()`, `janela()`, `varPct()`, `fInt()`, `fMil()`, `fPct()`, `fPP()`), `css/tokens.css` (variáveis de cor/fonte). Você pode **estender** `api.js`, mas não troque a forma de buscar os dados.
7. Estrutura final de pastas: `index.html`, `css/` (`tokens.css`, `deck.css`, `print.css`), `js/` (`config.js`, `api.js`, `app.js`, `slides/*.js` um módulo por tipo de slide, `charts.js`), `data/` (textos editáveis, seção 7), `assets/` (imagens dos fluxos de caixa), `docs/`.
8. Acessibilidade mínima: contraste AA, `lang="pt-BR"`, textos alternativos, navegação por teclado, `prefers-reduced-motion`.
9. Desempenho: uma única chamada de dados por abertura (já feita por `carregarPainel()`), sem polling. Botão "Atualizar dados" refaz a chamada. Mostrar `Dados atualizados em dd/mm/aaaa hh:mm` usando `gerado_em` e, se existir, `ultima_sincronizacao`.
10. Estados obrigatórios: **carregando** (esqueleto), **erro** (mensagem amigável + botão tentar de novo), **mês/empresa sem dados** (aviso, nunca tela quebrada ou "NaN").

## 3. Fonte de dados (já pronta)

Chamada: `POST {SUPABASE_URL}/rest/v1/rpc/painel_publico` com header `apikey`. Retorno (um JSON):

```json
{
  "gerado_em": "2026-10-06T19:50:00Z",
  "ultima_sincronizacao": "2026-10-06T19:46:28Z",
  "contas": [ { "codigo":"rec_lab", "nome":"Serviços laboratoriais", "grupo":"receita", "pai":null, "subtotal":true, "ordem":1, "incluir_dre":true, "nao_operacional":false } ],
  "empresas": {
    "prontomed":        { "nome":"CLINICA PRONTOMED LTDA", "dre":[…], "valores":[…], "caixa":[…], "saldos_contas":[…] },
    "multidisciplinar": { "nome":"CLINICA E TERAPIAS PRONTOMED LTDA", "dre":[…], "valores":[…], "caixa":[…], "saldos_contas":[…] }
  }
}
```

- `valores[]`: `{ "competencia":"2026-09-01", "conta":"rec_lab_particulares", "valor":42541.00, "fonte":"planilha|nibo|manual" }`. **Só folhas**; subtotais = soma dos filhos (`v(P, emp, mes, codigo)` já faz isso). Receita **positiva**; custo, despesa, investimento e financiamento **negativos**.
- `dre[]`: uma linha por mês já calculada pelo banco (`receita, custos, margem_contribuicao, margem_contribuicao_pct, despesas_e_outras, rendimentos_financeiros, resultado_operacional, margem_operacional_pct, resultado_sem_rendimentos, margem_operacional_ajustada_pct, investimentos, financiamentos, variacao_caixa, despesas_fixas, ponto_equilibrio, folga_pe_pct` + campos de laboratório/consultas só da Prontomed). **Use estes campos para os totais** (não recalcule outra versão). Lista completa e catálogo de contas em `docs/CONTAS.md`.
- `caixa[]`: `{ data, saldo, aproximado, fonte }` (saldos oficiais dos slides). `aproximado = true` → mostrar com "≈" e a pílula âmbar "⚑ a confirmar com o extrato".
- `saldos_contas[]`: saldo diário por conta bancária vindo do Nibo (informativo; **não** é o saldo de caixa oficial).
- O Grupo é **calculado no front**: soma das duas empresas, mês a mês (receita, margem de contribuição, resultado, variação de caixa); margem = soma ÷ receita.
- Regra de ouro dos números: **só os valores do banco.** Nunca recalcule diferente do que o banco entrega, nunca estime, nunca "complete" subgrupos. Valor ausente → omitir o elemento (não inventar). Diferenças de ±1 por arredondamento são esperadas (tabelas em inteiros).
- Variações: `Set x Ago` = (atual − anterior) ÷ |anterior|; `Set x Média` = média de Jun, Jul e Ago (os 3 meses anteriores da janela); base zero → "—". Para custo/despesa negativos, a variação percentual é calculada sobre o valor absoluto (custo que cresce = +%, vermelho).
- Cor semântica: receita/resultado subindo = verde; custo/despesa subindo = vermelho; custo caindo = verde; |var| < 3% = cinza.

## 4. Identidade visual (padrão oficial; resumo)

Fonte **Montserrat** (títulos Bold, números ExtraBold, texto Regular). Tokens em `css/tokens.css` (use as variáveis, não hex soltos). Pontos-chave:

- Slide 16:9 (design em 1280×720, escalado para a janela com `transform: scale` mantendo proporção). Fundo branco; **faixa de título navy `#1F3A6E`** com 14% da altura; **fio inferior** da faixa de 5 px: gradiente `#5B9BD5 → #C9A96E` na abertura, e **na cor da empresa** nos blocos (Prontomed `#5B9BD5`, Multidisciplinar `#2BB39A`, Grupo `#C9A96E`).
- **Selo da empresa** no canto superior direito da faixa ("CLÍNICA PRONTOMED", "CLÍNICA MULTIDISCIPLINAR", "GRUPO PRONTOMED") na cor da empresa; marca "BPO FINANCEIRO · ACESF CONTADORES ASSOCIADOS" discreta.
- **Kicker** (rótulo em caixa-alta espaçada, azul) acima do **título-conclusão** (frase com a mensagem, até 2 linhas). Rodapé em todos os slides: fio cinza, à esquerda **"Fonte: Painel Realizado ACESF · regime de caixa · valores em R$"**, à direita nº da página com 2 dígitos.
- **Cor fixa por linha** (igual em todos os slides): Prontomed — Laboratório `#1F3A6E`, Consultas `#5B9BD5`, Imagem `#C9A96E`, Cardiologia `#8FA3BF`, Acessórias `#B8C2CC`; Multidisciplinar — Convênios `#1F3A6E`, Multiprofissionais particulares `#2BB39A`, Outras `#B8C2CC`; especialidades — Psicologia `#1F3A6E`, Psicopedagogia `#2BB39A`, TO `#5B9BD5`, Fisioterapia `#C9A96E`, Fonoaudiologia `#8FA3BF`, Nutrição `#E07A5F`, Outros `#B8C2CC`.
- Meses anteriores em tom mais claro; **mês atual em tom cheio**, com rótulo de valor em negrito só nele. Formatação BR: destaques "R$ 274,5 mil", tabelas em inteiros (274.491), % com 1 casa, diferença de margens em **p.p.**, "≈" para valores aproximados.
- Componentes: cards com borda `#E3E8F0`, canto 16 px, sombra leve, barra superior ou lateral colorida; painel de apoio `#F4F6FA`; **no máximo 1 painel escuro por slide**; painel de alerta rosado; chips de status (Concluído verde, Em andamento âmbar, Pendente vermelho; prazos: Nesta reunião, 30 dias, Mensal, Próximo fechamento); semáforo de 6 itens; tabelas com cabeçalho navy, subtotais em negrito sobre `#EAF0F8`, números à direita, **mapa de calor** nas colunas de variação (verde/vermelho proporcional, texto em negrito) e legenda.
- Menos texto, mais contraste. Um insight por bloco, máximo duas linhas.

## 5. Gráficos (todos em SVG, com rótulo direto nos elementos)

Sparkline de 4 pontos (último ponto preenchido e em negrito) · barras agrupadas de 4 meses com "Set x Ago ±x,x%" colorido abaixo · barras empilhadas com total em negrito · barra + linha (repasse %) · small multiples · **cascata (waterfall)** com totais navy, aumentos verdes, reduções vermelhas, conectores tracejados e "Variação total" · barras horizontais "receita vs margem" · **bullet do ponto de equilíbrio** (pista com zona vermelha-clara até o PE e verde-clara depois, barra navy = receita, marcadores PE do mês e PE médio) · barras de variação de caixa (positivas verdes, negativas vermelhas) · rosca só com até 4 fatias. Mantenha o mesmo número de casas decimais dentro de um gráfico.

**Cascata Ago → Set:** as pontes das seções 4.5 dos prompts são **textos de referência**. Calcule os degraus a partir de `valores` por grupos de contas (receita; custos lab; repasses; etc.) e confira que a soma dos degraus = variação do resultado; se algum agrupamento não fechar exatamente, junte a diferença em "Demais itens" (nunca esconda).

## 6. Navegação e modos

- Barra superior fixa e discreta: abas **Prontomed · Multidisciplinar · Grupo** (cada aba mostra os slides do respectivo bloco, com divisor), seletor de **competência** (meses disponíveis em `P.meses`, padrão `CONFIG.COMPETENCIA_PADRAO`), botão **Apresentar** (tela cheia, esconde a barra), **Imprimir/PDF**, **Atualizar dados**, indicador "Dados atualizados em…".
- Setas ← → / espaço / PageUp-PageDown, clique nas bordas, índice lateral (miniaturas ou lista numerada), swipe no celular. No celular (< 768 px), o slide escala para a largura e rola na vertical; nunca scroll horizontal.
- **Impressão em PDF** (`print.css`): um slide por página A4 paisagem/16:9, `@page`, fundos e cores preservados (`print-color-adjust: exact`), sem a barra de navegação.
- Slides do apêndice (checagem de números) acessíveis por um menu "Apêndice", fora da sequência normal.
- A **competência selecionada** muda todos os números e títulos de dados. Os **textos de leitura** (seção 7) existem só para a competência para a qual foram escritos; em outros meses mostre apenas títulos gerados por regra (ex.: "Receita +0,9% vs mês anterior; margem de contribuição em 30,1%") e oculte os blocos de leitura com a nota "Leituras da gestão ainda não cadastradas para este mês".

## 7. Textos editáveis (fora do código)

Crie `data/leituras-2026-09.json` (e um modelo `data/leituras-modelo.json`) com os textos validados do mês: as **leituras validadas** (seção 6 de cada prompt), os **planos de ação** (O quê / Responsável / Prazo), os **acordos anteriores** com status, as **decisões**, a data da reunião e os campos "a confirmar". Os textos devem ser **copiados fielmente** dos prompts em `docs/fonte-dos-numeros/`; os números dentro dos textos que também existem no banco devem permanecer iguais aos do prompt. Um módulo `js/leituras.js` carrega o arquivo da competência escolhida (`data/leituras-AAAA-MM.json`), com tratamento de "arquivo inexistente". Assim, no próximo mês o analista só adiciona um JSON novo.

Campos ⟦ ⟧ dos prompts viram campos do JSON com `"a_confirmar": true` e aparecem no site como pílula âmbar "⚑ a confirmar".

## 8. Roteiro de slides (37 + apêndices) — siga a numeração e os layouts dos prompts

Siga **exatamente** o roteiro das seções 7 dos dois prompts anexos (slides 1–20 Prontomed/abertura, 21–37 Multidisciplinar e Grupo) e o catálogo de layouts do PDF de referência. Resumo do que mapear em dados:

| Slides | Conteúdo | Fonte dos números |
|---|---|---|
| 1–3 | Capa, mapa da reunião, acordos | `leituras-*.json` |
| 4 / 21 / 35 | Divisores A, B, C (letra gigante na cor da empresa, "como esta empresa ganha dinheiro", 3 números do mês) | `dre` do mês |
| 5 / 22 | Resumo executivo + semáforo | `dre` + leituras; semáforo por regra (ver abaixo) |
| 6 / 23 | KPIs com sparkline (Receita, Margem de contribuição %, Resultado, Variação de caixa) | `dre` Jun–Set |
| 7 / 24 | Cascata Ago→Set | `valores` por grupo |
| 25 | Resultado em 3 leituras (Multi) | `dre` + `mu_rec_outras` (ver prompt 4.1) |
| 8 / 26 | DRE comparativa com mapa de calor | `dre` |
| 9–12 | Receitas por linha, laboratório, consultas, imagem+cardio | `valores` das contas `rec_*` |
| 13–14 / 30–31 | Custos e despesas por subcategoria | `valores` (`cus_*`, `des_*`, `mu_*`) |
| 15 | ⭐ Margem por linha | `margem_lab`, `margem_consultas` |
| 16 / 31 | ⭐ Ponto de equilíbrio | `despesas_fixas`, `ponto_equilibrio`, `folga_pe_pct` |
| 27–29 | Convênios x particulares, particulares por especialidade, repasses por especialidade | `mu_rec_*`, `mu_cus_rep_*` |
| 17 / 33 | Caixa (barras de variação + saldos + print do fluxo em `assets/`) | `dre.variacao_caixa`, `caixa[]` |
| 18 / 32 | Pontos de atenção | leituras + regras |
| 19 | Acumulado Jun–Set | soma da janela |
| 20 / 34 | Plano de ação | `leituras-*.json` |
| 36 | Grupo consolidado | soma das duas empresas |
| 37 | Encerramento e próxima reunião | `leituras-*.json` |
| A1/B1/B2/B3 | Checagem de números e glossário | `dre`, e tabelas dos prompts para comparação |

**Slide de checagem (apêndice):** além da tabela 4.1, mostrar ao lado, em cinza, a coluna "valor do prompt" (digitada em `leituras-2026-09.json` > `checagem`) e a diferença; destacar em âmbar diferenças > 1. Isso protege contra dado errado no banco.

**Semáforo (regra):** Receita: verde se Set x Ago > +3%, vermelho se < −3%, senão amarelo; Margem de contribuição e Resultado: vermelho se cairam mais de 3 p.p./3%, verde se subiram, senão amarelo; Caixa: verde se variação > 0; itens de qualidade ("Despesas a identificar", "Impostos a provisionar") por regra do JSON de leituras. Na competência de setembro, o resultado final deve coincidir com os semáforos escritos nos prompts (slides 5 e 22).

## 9. Indicadores de qualidade dos dados no site

- Em cada slide com números, mostrar discretamente (canto do rodapé) a **origem** predominante: "Fonte dos números: planilha / Nibo / manual" (campo `fonte` de `valores`; se houver mistura, "mista").
- Se algum valor do mês atual vier de `fonte = nibo`, mostrar a pílula "dados automáticos do Nibo" no kicker do slide.
- Nunca esconder inconsistências: se `dre.receita` ≠ soma das folhas de receita (> R$ 1), mostrar aviso âmbar no slide DRE.

## 10. Segurança e privacidade (importante)

- A chave em `config.js` é pública por design. **Não** peça nem use nenhuma outra chave (service role, tokens do Nibo, senhas) no front, em nenhum arquivo.
- Não registre dados em console além de erros. Sem analytics de terceiros.
- Os dados financeiros ficam visíveis a quem tiver o link (decisão do cliente: "link aberto"). Inclua um aviso no rodapé do README e um texto "Documento confidencial · uso interno" no slide de capa.

## 11. Entregáveis

1. Todos os arquivos do projeto, prontos para subir em um repositório (sem build).
2. `README.md` atualizado com: como publicar no GitHub Pages (Settings → Pages → Deploy from branch → `main` / `/ (root)`), como rodar local (`python3 -m http.server 8000`), como adicionar um mês novo (JSON de leituras) e como trocar o saldo/print do fluxo de caixa.
3. Lista curta de **testes manuais** feitos: abrir em Chrome e Safari, celular, impressão em PDF, erro de rede (desligar Wi-Fi), competência sem dados.
4. Um quadro "conferência" com os números de setembro/2026 que o site mostra versus os do prompt (receita, margem, resultado e variação de caixa das duas empresas e do grupo). Se algo divergir, **diga e explique**, não ajuste o número no código.

## 12. Números de conferência (setembro/2026)

| | Prontomed | Multidisciplinar | Grupo |
|---|---|---|---|
| Receita | 274.491 | 143.618 | 418.108 |
| Margem de contribuição | 82.728 (30,1%) | 75.178 (52,3%) | 157.906 |
| Resultado operacional | 29.090 (10,6%) | 62.923 (43,8%) | 92.013 (22,0%) |
| Resultado sem rendimentos | 14.085 (5,1%) | — | — |
| Variação de caixa | 21.517 | 54.923 | 76.440 |
| Ponto de equilíbrio do mês | R$ 227,8 mil | médio R$ 47,9 mil | — |

(Tolerância de ±1 por arredondamento. Saldos de caixa: Prontomed 77.121 → 98.638 estimado; Multidisciplinar ≈ 170 mil em 30/09, aproximado, a confirmar.)
