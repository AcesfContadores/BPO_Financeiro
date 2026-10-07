// Comparativo do grupo: as duas empresas lado a lado, com a contribuição de cada uma.
import { el, responsivo, fN, fP, fMilAbs, fPP } from "../util.js";
import { colunas, linhas } from "../charts.js";
import { S, ir } from "../state.js";
import { metricas, mesesJanela, mesCurto, EMPRESAS_REAIS, EMP } from "../model.js";
import { secao, chipEmpresa, blocoRosca } from "../ui.js";

export function renderComparativo(P, raiz) {
  const mes = S.mes;
  const meses = mesesJanela(P, mes, Math.max(S.n, 4));
  const longa = mesesJanela(P, mes, 12);
  const M = (e, x) => metricas(P, e, x);
  const [a, b] = EMPRESAS_REAIS.map((e) => M(e, mes));
  const g = M("grupo", mes);
  if (!a || !b) { raiz.append(el("p", { class: "vazio", text: "Faltam dados de uma das empresas neste mês." })); return; }

  const linhasTab = [
    ["Receita", "receita", fN], ["Custos operacionais", "custos", fN], ["Margem de contribuição", "mc", fN], ["Despesas e outras receitas", "despesas", fN],
    ["Resultado operacional", "resultado", fN], ["Variação de caixa", "caixa", fN],
  ];
  const t = el("table", { class: "dre" }, el("thead", {}, el("tr", {}, el("th", { class: "c-nome", text: "Indicador" }), ...EMPRESAS_REAIS.map((e) => el("th", { class: "num" }, chipEmpresa(e))), el("th", { class: "num", text: "Grupo" }), el("th", { class: "num", text: "Peso da Prontomed" }))));
  const tb = el("tbody");
  for (const [nome, k, f] of linhasTab) tb.append(el("tr", { class: k === "resultado" || k === "caixa" ? "total" : "" }, el("td", { class: "c-nome", text: nome }), el("td", { class: "num", text: f(a[k]) }), el("td", { class: "num", text: f(b[k]) }), el("td", { class: "num", text: f(g[k]) }), el("td", { class: "num dim", text: g[k] ? fP((100 * a[k]) / g[k]) : "—" })));
  for (const [nome, k] of [["Margem de contribuição %", "mcPct"], ["Margem operacional %", "margemOp"], ["Folga sobre o equilíbrio %", "folga"]]) tb.append(el("tr", {}, el("td", { class: "c-nome", text: nome }), el("td", { class: "num", text: fP(a[k]) }), el("td", { class: "num", text: fP(b[k]) }), el("td", { class: "num", text: fP(g[k]) }), el("td")));
  t.append(tb);
  raiz.append(secao(`Lado a lado em ${mesCurto(mes)}`, "Clique em uma empresa no seletor do topo para destrinchar. O peso mostra quanto da Prontomed existe em cada total do grupo.", el("div", { class: "tabela-rolagem" }, t)));

  const mkCol = (titulo, desc, fn) => {
    const gr = el("div", { class: "grafico" });
    responsivo(gr, (w) => colunas(w, { cats: meses.map(mesCurto), h: 270, nota: titulo, onClick: (id) => ir({ emp: id, page: "resumo", d: null }),
      series: EMPRESAS_REAIS.map((e) => ({ id: e, nome: EMP[e].curto, cor: `var(--emp-${e})`, vals: meses.map((x) => Math.max(0, fn(M(e, x)))) })) }));
    return secao(titulo, desc, el("div", { class: "legenda estatica" }, EMPRESAS_REAIS.map((e) => el("span", { class: "leg-item" }, el("span", { class: "leg-k", style: { background: `var(--emp-${e})` } }), el("span", { text: EMP[e].curto })))), gr);
  };
  raiz.append(el("div", { class: "duas igual" },
    mkCol("Receita por empresa", "Quanto cada empresa trouxe de receita.", (x) => x?.receita ?? 0),
    mkCol("Resultado operacional por empresa", "Quanto cada empresa deixou de resultado (valores negativos não aparecem na coluna; veja a tabela).", (x) => x?.resultado ?? 0)));

  const fatia = (fn) => EMPRESAS_REAIS.map((e) => ({ id: e, nome: EMP[e].curto, cor: `var(--emp-${e})`, val: Math.max(0, fn(M(e, mes))) }));
  raiz.append(el("div", { class: "duas igual" },
    blocoRosca("Quem gera a receita do grupo", "Participação de cada empresa na receita do mês.", fatia((x) => x.receita), { centro: { titulo: "receita do grupo", valor: fMilAbs(g.receita) }, nota: "receita por empresa", onClick: (it) => ir({ emp: it.id, page: "resumo", d: null }) }),
    blocoRosca("Quem gera o resultado do grupo", "Participação de cada empresa no resultado operacional do mês.", fatia((x) => x.resultado), { centro: { titulo: "resultado do grupo", valor: fMilAbs(g.resultado) }, nota: "resultado por empresa", onClick: (it) => ir({ emp: it.id, page: "resumo", d: null }) })));
  const gm = el("div", { class: "grafico" });
  responsivo(gm, (w) => linhas(w, { cats: longa.map(mesCurto), h: 250, fmt: fP, yFmt: (v) => `${Math.round(v)}%`, nota: "margem de contribuição por empresa",
    series: EMPRESAS_REAIS.map((e) => ({ id: e, nome: EMP[e].curto, cor: `var(--emp-${e})`, vals: longa.map((x) => M(e, x)?.mcPct ?? null) })) }));
  const go = el("div", { class: "grafico" });
  responsivo(go, (w) => linhas(w, { cats: longa.map(mesCurto), h: 250, fmt: fP, yFmt: (v) => `${Math.round(v)}%`, nota: "margem operacional por empresa",
    series: EMPRESAS_REAIS.map((e) => ({ id: e, nome: EMP[e].curto, cor: `var(--emp-${e})`, vals: longa.map((x) => M(e, x)?.margemOp ?? null) })) }));
  raiz.append(el("div", { class: "duas igual" },
    secao("Margem de contribuição", "Eficiência dos custos diretos de cada empresa.", gm),
    secao("Margem operacional", "O que sobra da receita depois de todas as despesas.", go)));
}
