// Comparativo: as unidades lado a lado (Iguatu, Icó, Cajazeiras e CD) e o total, com a contribuição de cada uma.
import { el, responsivo, fN, fP, fMilAbs } from "../util.js";
import { colunas, linhas } from "../charts.js";
import { S, ir } from "../state.js";
import { metricas, mesesJanela, mesCurto, CENTROS, EMP } from "../model.js";
import { secao, chipEmpresa, blocoRosca } from "../ui.js";

const UNIDADES = ["iguatu", "ico", "cajazeiras"];

export function renderComparativo(P, raiz) {
  const mes = S.mes;
  const meses = mesesJanela(P, mes, Math.max(S.n, 4));
  const longa = mesesJanela(P, mes, 12);
  const M = (e, x) => metricas(P, e, x);
  const cols = CENTROS.map((e) => M(e, mes));
  const g = M("grupo", mes);
  if (!g || cols.some((c) => !c)) { raiz.append(el("p", { class: "vazio", text: "Faltam dados neste mês." })); return; }

  const linhasTab = [
    ["Receita", "receita"], ["Custos operacionais", "custos"], ["Margem de contribuição", "mc"], ["Despesas e outras receitas", "despesas"],
    ["Resultado operacional", "resultado"], ["Variação de caixa", "caixa"],
  ];
  const t = el("table", { class: "dre" }, el("thead", {}, el("tr", {}, el("th", { class: "c-nome", text: "Indicador" }), ...CENTROS.map((e) => el("th", { class: "num" }, chipEmpresa(e))), el("th", { class: "num", text: "Total" }))));
  const tb = el("tbody");
  for (const [nome, k] of linhasTab) tb.append(el("tr", { class: k === "resultado" || k === "caixa" ? "total" : "" }, el("td", { class: "c-nome", text: nome }), ...cols.map((c) => el("td", { class: "num", text: fN(c[k]) })), el("td", { class: "num", text: fN(g[k]) })));
  for (const [nome, k] of [["Margem de contribuição %", "mcPct"], ["Margem operacional %", "margemOp"]]) tb.append(el("tr", {}, el("td", { class: "c-nome", text: nome }), ...cols.map((c, i) => el("td", { class: "num", text: CENTROS[i] === "cd" ? "—" : fP(c[k]) })), el("td", { class: "num", text: fP(g[k]) })));
  t.append(tb);
  raiz.append(secao(`Lado a lado em ${mesCurto(mes)}`, "O CD concentra a compra de vacinas (custo) e não tem receita própria: por isso as margens por unidade não incluem o custo das vacinas que o CD comprou. O total inclui tudo, inclusive lançamentos sem centro de custo.", el("div", { class: "tabela-rolagem" }, t)));

  const mkCol = (titulo, desc, fn, lista) => {
    const gr = el("div", { class: "grafico" });
    responsivo(gr, (w) => colunas(w, { cats: meses.map(mesCurto), h: 270, nota: titulo, onClick: (id) => ir({ emp: id, page: "resumo", d: null }),
      series: lista.map((e) => ({ id: e, nome: EMP[e].curto, cor: `var(--emp-${e})`, vals: meses.map((x) => Math.max(0, fn(M(e, x)))) })) }));
    return secao(titulo, desc, el("div", { class: "legenda estatica" }, lista.map((e) => el("span", { class: "leg-item" }, el("span", { class: "leg-k", style: { background: `var(--emp-${e})` } }), el("span", { text: EMP[e].curto })))), gr);
  };
  raiz.append(el("div", { class: "duas igual" },
    mkCol("Receita por unidade", "Quanto cada unidade trouxe de receita.", (x) => x?.receita ?? 0, UNIDADES),
    mkCol("Custo das vacinas por centro", "Custos operacionais de cada centro, incluindo as compras centrais do CD.", (x) => Math.abs(x?.custos ?? 0), CENTROS)));

  const fatia = (fn, lista) => lista.map((e) => ({ id: e, nome: EMP[e].curto, cor: `var(--emp-${e})`, val: Math.max(0, fn(M(e, mes))) }));
  raiz.append(el("div", { class: "duas igual" },
    blocoRosca("Quem gera a receita", "Participação de cada unidade na receita do mês.", fatia((x) => x.receita, UNIDADES), { centro: { titulo: "receita total", valor: fMilAbs(g.receita) }, nota: "receita por unidade", onClick: (it) => ir({ emp: it.id, page: "resumo", d: null }) }),
    blocoRosca("Onde estão os custos", "Participação de cada centro nos custos operacionais do mês.", fatia((x) => Math.abs(x.custos), CENTROS), { centro: { titulo: "custos totais", valor: fMilAbs(Math.abs(g.custos)) }, nota: "custos por centro", onClick: (it) => ir({ emp: it.id, page: "resumo", d: null }) })));
  const gm = el("div", { class: "grafico" });
  responsivo(gm, (w) => linhas(w, { cats: longa.map(mesCurto), h: 250, fmt: fP, yFmt: (v) => `${Math.round(v)}%`, nota: "margem operacional por unidade",
    series: UNIDADES.map((e) => ({ id: e, nome: EMP[e].curto, cor: `var(--emp-${e})`, vals: longa.map((x) => M(e, x)?.margemOp ?? null) })) }));
  const gr = el("div", { class: "grafico" });
  responsivo(gr, (w) => linhas(w, { cats: longa.map(mesCurto), h: 250, nota: "resultado operacional por centro",
    series: CENTROS.map((e) => ({ id: e, nome: EMP[e].curto, cor: `var(--emp-${e})`, vals: longa.map((x) => M(e, x)?.resultado ?? null) })) }));
  raiz.append(el("div", { class: "duas igual" },
    secao("Margem operacional", "O que sobra da receita de cada unidade depois das despesas dela, sem as compras do CD.", gm),
    secao("Resultado operacional por centro", "Em R$. O CD aparece negativo porque carrega a compra de vacinas.", gr)));
}
