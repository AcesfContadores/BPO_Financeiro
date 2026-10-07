# Painel Prontomed · ACESF (dashboard)

Dashboard estático (HTML + JS puro, sem build) que lê **uma única função pública do banco** (`painel_publico`) e mostra
resultado, receitas, custos, margens, caixa e detalhe por conta, com navegação até a conta mais detalhada.

## Publicar no GitHub Pages
1. Suba a pasta inteira para um repositório.
2. Settings → Pages → Deploy from branch → `main` / root.
3. Abra `https://<usuario>.github.io/<repo>/`. Caminhos são relativos; `.nojekyll` já está incluso.

## Telas
Resumo · Receitas · Custos e despesas · Margem e equilíbrio (simulador) · Caixa (projeção editável) · Dados (conferência, árvore completa, CSV) · Comparativo (só no Grupo).

## Como destrinchar
Clique em qualquer barra, degrau da ponte, indicador ou nome de conta: abre o painel lateral com valor, variação, composição por mês e contas filhas.
Os filtros (empresa, mês, comparação, janela) e o item aberto ficam no endereço (`#/pagina?e=&m=&c=&n=&d=`): copie o link para compartilhar a mesma visão.

## Arquivos
- `js/config.js` URL e chave pública do Supabase, mês padrão.
- `js/api.js` leitura do banco · `js/model.js` métricas, ponte, alertas · `js/charts.js` gráficos SVG · `js/views/*` telas.
- `js/referencia.js` valores oficiais de Set/26 usados só na conferência (tela Dados).
- `docs/` padrão visual, contas e prompts de origem.

## Regras
- Nenhuma escrita no banco. Todos os números vêm de `painel_publico()`; nada é calculado a partir de valores inventados.
- Detalhe por lançamento (fornecedor/data) ainda não é publicado no banco; o nível mais fundo é a conta do plano.
- Simuladores (Margem e Caixa) são cenários do usuário, rotulados como tal.
