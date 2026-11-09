// Painel lateral "Destrinchar": abre qualquer conta, grupo ou indicador e mostra a composição, a série e as contas filhas.
import { el, fN, fP, fR, fRsig, compacto, responsivo } from "./util.js";
import { colunas, chipDelta, sparkline, rosca, linhas } from "./charts.js";
import { S, ir } from "./state.js";
import { arvore, valorNo, metricas, variacao, julgamento, baseNo, mesCurto, mesesJanela, mesLongo, fontesNo, folhas } from "./model.js";
import { deltaDe, badgesFonte, bgCalor, rotuloBase } from "./ui.js";
import { soma, media } from "./api.js";

const PSEUDO = {
  __receita: { nome: "Receitas operacionais", grupo: "receita" },
  __custos: { nome: "Custos operacionais", grupo: "custo" },
  __despesas: { nome: "Despesas operacionais e outras receitas", grupo: "despesa" },
};

function resolver(P, emp, d) {
  const { nos, raizes } = arvore(P, emp);
  const cods = d.split("~");
  if (PSEUDO[cods[0]]) {
    const p = PSEUDO[cods[0]];
    const rs = raizes.filter((n) => n.grupo === p.grupo && n.incluirDre);
    return { titulo: p.nome, grupo: p.grupo, nos: rs, linhas: rs, trilha: [], composto: true };
  }
  const lista = cods.map((c) => nos.get(c)).filter(Boolean);
  if (!lista.length) return null;
  const unico = lista.length === 1;
  const n0 = lista[0];
  const trilha = [];
  let p = n0.pai ? nos.get(n0.pai) : null;
  while (p) { trilha.unshift(p); p = p.pai ? nos.get(p.pai) : null; }
  return {
    titulo: unico ? n0.nome : lista.map((n) => n.nome).join(" + "),
    grupo: n0.grupo,
    nos: lista,
    linhas: unico ? (n0.filhos.length ? n0.filhos : [n0]) : lista,
    trilha,
    pai: n0.pai ? nos.get(n0.pai) : null,
    composto: !unico,
    folha: unico && !n0.filhos.length,
  };
}

const NOME_GRUPO = { receita: "Receita", custo: "Custo", despesa: "Despesa", investimento: "Investimento", financiamento: "Financiamento" };

export function renderDrawer(P) {
  const { emp, mes, d, n } = S;
  const r = resolver(P, emp, d);
  const caixa = el("div", { class: "drawer-corpo" });
  if (!r) { caixa.append(el("p", { class: "dim", text: "Esta conta não existe para a empresa selecionada." })); return caixa; }
  const meses = mesesJanela(P, mes, Math.max(n, 4));
  const soma$ = (m) => soma(r.nos.map((x) => valorNo(P, emp, m, x)));
  const cur = soma$(mes);
  const base = (() => {
    if (S.cmp === "avg") { const i = P.meses.indexOf(mes); const ms = P.meses.slice(Math.max(0, i - 3), i); return ms.length ? media(ms.map(soma$)) : null; }
    const i = P.meses.indexOf(mes); return i > 0 ? soma$(P.meses[i - 1]) : null;
  })();
  const dl = deltaDe(P, emp, r.grupo, cur, base);
  const rec = metricas(P, emp, mes)?.receita || 0;

  // cabeçalho
  const trilha = [NOME_GRUPO[r.grupo], ...r.trilha.map((t) => t.nome)].filter(Boolean).join("  ›  ");
  caixa.append(
    el("div", { class: "dw-topo" },
      el("div", {}, el("p", { class: "dw-trilha", text: trilha }), el("h2", { id: "dw-titulo", text: r.titulo })),
      el("button", { type: "button", class: "fechar", "aria-label": "Fechar detalhamento", onClick: () => ir({ d: null }), text: "×" })),
    el("div", { class: "dw-hero" },
      el("span", { class: "dw-valor", text: fR(cur) }),
      el("span", { class: "dw-sub" }, chipDelta(dl.texto, dl.julg, dl.dir), el("span", { class: "dim", text: ` em relação ao ${rotuloBase()}` }))),
    el("dl", { class: "dw-metas" },
      el("div", {}, el("dt", { text: "% da receita" }), el("dd", { text: rec ? fP((100 * Math.abs(cur)) / rec) : "—" })),
      r.pai ? el("div", {}, el("dt", { text: `% de ${r.pai.nome}` }), el("dd", { text: valorNo(P, emp, mes, r.pai) ? fP((100 * cur) / valorNo(P, emp, mes, r.pai)) : "—" })) : null,
      el("div", {}, el("dt", { text: "Acumulado na janela" }), el("dd", { text: fR(soma(meses.map(soma$))) })),
      el("div", {}, el("dt", { text: "Origem do valor" }), el("dd", {}, badgesFonte([...new Set(r.nos.flatMap((x) => fontesNo(P, emp, mes, x)))])))),
  );

  // gráfico: série da conta, ou empilhado pelas filhas
  const linhasMostradas = r.linhas;
  const ord = [...linhasMostradas].sort((a, b) => Math.abs(valorNo(P, emp, mes, b)) - Math.abs(valorNo(P, emp, mes, a)));
  const top = ord.slice(0, 5);
  const resto = ord.slice(5);
  const seq = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)", "var(--cat-5)", "var(--cat-outras)"];
  const series = top.map((no, i) => ({ id: no.codigo, nome: no.nome, cor: seq[i], vals: meses.map((m) => Math.abs(valorNo(P, emp, m, no))) }));
  if (resto.length) series.push({ id: "__outros", nome: `Outras (${resto.length})`, cor: seq[5], vals: meses.map((m) => Math.abs(soma(resto.map((no) => valorNo(P, emp, m, no))))) });
  const unica = series.length === 1;
  caixa.append(el("h3", { text: unica ? `${r.titulo} por mês` : "Composição por mês" }));
  const cx = el("div", { class: "grafico" });
  responsivo(cx, (w) => colunas(w, { cats: meses.map(mesCurto), series: unica ? [{ ...series[0], cor: "var(--cat-1)" }] : series, empilhado: true, h: 200, nota: `composição de ${r.titulo}` }));
  caixa.append(cx);
  if (!unica) caixa.append(el("div", { class: "legenda estatica" }, series.map((s) => el("span", { class: "leg-item" }, el("span", { class: "leg-k", style: { background: s.cor } }), el("span", { text: s.nome })))));

  // rosca do mês e, para uma conta única, a linha de evolução
  if (!unica) {
    const gr = el("div", { class: "grafico" });
    responsivo(gr, (w) => rosca(w, { itens: series.map((s) => ({ id: s.id, nome: s.nome, cor: s.cor, val: s.vals.at(-1) })), max: 6, nota: `peso de cada conta em ${r.titulo}`, centro: { titulo: "no mês", valor: fR(Math.abs(cur)).replace("R$ ", "") },
      onClick: (it) => ir({ d: it.id }) }));
    caixa.append(el("h3", { text: "Peso de cada conta no mês" }), gr);
  } else {
    const gl = el("div", { class: "grafico" });
    const todos = mesesJanela(P, mes, 12);
    responsivo(gl, (w) => linhas(w, { cats: todos.map(mesCurto), h: 190, nota: `${r.titulo} em 12 meses`, series: [{ id: "u", nome: r.titulo, cor: "var(--cat-1)", vals: todos.map((m) => Math.abs(soma$(m))) }] }));
    caixa.append(el("h3", { text: "Evolução em até 12 meses" }), gl);
  }

  // tabela das linhas
  const tabela = el("table", { class: "dre mini" });
  tabela.append(el("thead", {}, el("tr", {}, el("th", { class: "c-nome", text: r.folha ? "Conta" : "Contas" }), ...meses.map((m) => el("th", { class: "num" + (m === mes ? " atual" : ""), text: mesCurto(m) })), el("th", { class: "num", text: "Δ %" }))));
  const tb = el("tbody");
  const linhasTabela = ord;
  for (const no of linhasTabela) {
    const f = (m) => valorNo(P, emp, m, no);
    const curN = f(mes);
    const baseN = baseNo(P, emp, no, mes, S.cmp);
    const dd = deltaDe(P, emp, no.grupo, curN, baseN, { moeda: false });
    const v = variacao(curN, baseN);
    tb.append(el("tr", {},
      el("td", { class: "c-nome" }, no.filhos.length || no.codigo !== r.nos[0]?.codigo ? el("button", { type: "button", class: "lnk", onClick: () => ir({ d: no.codigo }), text: no.nome }) : el("span", { text: no.nome })),
      ...meses.map((m) => el("td", { class: "num" + (m === mes ? " atual" : ""), text: fN(f(m)) })),
      el("td", { class: "num calor", style: { background: bgCalor(dd.julg, v.pct) }, text: v.novo ? "novo" : v.pct == null ? "—" : `${v.pct > 0 ? "+" : v.pct < 0 ? "−" : ""}${Math.abs(v.pct).toFixed(1).replace(".", ",")}%` })));
  }
  if (linhasTabela.length > 1) tb.append(el("tr", { class: "total" }, el("td", { class: "c-nome", text: "Total" }), ...meses.map((m) => el("td", { class: "num" + (m === mes ? " atual" : ""), text: fN(soma$(m)) })), el("td", { class: "num", text: "" })));
  tabela.append(tb);
  caixa.append(el("h3", { text: r.folha ? "Valores por mês" : "Contas que compõem" }), el("div", { class: "tabela-rolagem" }, tabela));

  // fatos para leitura
  const fatos = [];
  const serieAbs = meses.map((m) => Math.abs(soma$(m)));
  const mx = Math.max(...serieAbs), mn = Math.min(...serieAbs);
  if (serieAbs.some((x) => x > 0)) {
    fatos.push(`Maior valor da janela: ${mesCurto(meses[serieAbs.indexOf(mx)])} (${fR(mx)}). Menor: ${mesCurto(meses[serieAbs.indexOf(mn)])} (${fR(mn)}).`);
    const zeros = meses.filter((m) => soma$(m) === 0);
    if (zeros.length && zeros.length < meses.length) fatos.push(`Sem lançamento em ${zeros.map(mesCurto).join(", ")}.`);
  }
  if (fatos.length) caixa.append(el("h3", { text: "O que os números mostram" }), el("ul", { class: "fatos" }, fatos.map((f) => el("li", { text: f }))));
  if (r.folha) caixa.append(el("p", { class: "nota", text: "Esta é a conta mais detalhada do painel. O detalhe por lançamento (fornecedor, data, valor) fica no Nibo; para vê-lo aqui, os lançamentos precisariam ser publicados no banco, o que ainda não foi feito." }));
  return caixa;
}
