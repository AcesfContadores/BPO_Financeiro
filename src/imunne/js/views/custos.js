// Custos e despesas: peso sobre a receita, para onde vai o dinheiro e o que mais mexeu.
import { el, responsivo, fMilAbs, fR, fP, fPP, fMilSig } from "../util.js";
import { colunas, linhas, barrasH, legenda } from "../charts.js";
import { S, ir } from "../state.js";
import { metricas, mesesJanela, mesCurto, valorNo, movimentos, julgamento, arvore } from "../model.js";
import { raizesPorGrupo } from "../linhas-negocio.js";
import { secao, tile, deltaDe, rotuloBase, tabelaArvore, blocoRosca } from "../ui.js";
import { media } from "../api.js";

const off = {};

function empilhado(P, emp, mes, meses, grupo, titulo, desc) {
  const R = raizesPorGrupo(P, emp, grupo, mes).filter((r) => !r.no.naoOperacional);
  const chave = `${emp}-${grupo}`;
  const ativos = (off[chave] ??= new Set(R.map((r) => r.id)));
  const g = el("div", { class: "grafico" }), leg = el("div");
  const desenhar = () => {
    const ser = R.map((r) => ({ id: r.id, nome: r.nome, cor: r.cor, vals: meses.map((x) => (ativos.has(r.id) ? Math.abs(valorNo(P, emp, x, r.no)) : 0)) }));
    responsivo(g, (w) => colunas(w, { cats: meses.map(mesCurto), series: ser, h: 280, nota: titulo, onClick: (id) => ir({ d: id }) }));
  };
  const montar = () => leg.replaceChildren(legenda(R, { ativos, onToggle: (id) => { if (ativos.has(id) && ativos.size === 1) return; ativos.has(id) ? ativos.delete(id) : ativos.add(id); montar(); desenhar(); } }));
  montar(); desenhar();
  return secao(titulo, desc, leg, g);
}

export function renderCustos(P, raiz) {
  const emp = S.emp, mes = S.mes;
  const m = metricas(P, emp, mes);
  if (!m) { raiz.append(el("p", { class: "vazio", text: "Sem dados para este mês." })); return; }
  const meses = mesesJanela(P, mes, Math.max(S.n, 4));
  const longa = mesesJanela(P, mes, 12);
  const i = P.meses.indexOf(mes);
  const ms = S.cmp === "avg" ? P.meses.slice(Math.max(0, i - 3), i) : (i > 0 ? [P.meses[i - 1]] : []);
  const base = (fn) => (ms.length ? media(ms.map(fn)) : null);
  const M = (x) => metricas(P, emp, x);
  const pctC = (x) => (M(x)?.receita ? (100 * Math.abs(M(x).custos)) / M(x).receita : 0);
  const pctD = (x) => (M(x)?.receita ? (100 * Math.abs(M(x).despesas - M(x).rend)) / M(x).receita : 0);
  const dp = (cur, b) => { if (b == null) return null; const d = cur - b; return { texto: fPP(d), julg: Math.abs(d) < 0.5 ? "neutro" : d < 0 ? "bom" : "ruim", dir: d > 0 ? 1 : d < 0 ? -1 : 0 }; };

  raiz.append(el("div", { class: "tiles quatro" },
    tile({ rotulo: "Custos operacionais", valor: fMilAbs(Math.abs(m.custos)), delta: deltaDe(P, emp, "custo", m.custos, base((x) => M(x)?.custos ?? 0)), spark: { vals: meses.map((x) => Math.abs(M(x)?.custos ?? 0)), titulo: "custos" }, onClick: () => ir({ d: "__custos" }) }),
    tile({ rotulo: "Custos sobre a receita", valor: fP(pctC(mes)), delta: dp(pctC(mes), base(pctC)), spark: { vals: meses.map(pctC), titulo: "custos % receita" } }),
    tile({ rotulo: "Despesas operacionais", valor: fMilAbs(Math.abs(m.despesas - m.rend)), sub: m.rend ? `sem ${fMilAbs(m.rend)} de rendimentos financeiros` : "", delta: deltaDe(P, emp, "despesa", m.despesas - m.rend, base((x) => (M(x) ? M(x).despesas - M(x).rend : 0))), spark: { vals: meses.map((x) => Math.abs(M(x) ? M(x).despesas - M(x).rend : 0)), titulo: "despesas" }, onClick: () => ir({ d: "__despesas" }) }),
    tile({ rotulo: "Despesas sobre a receita", valor: fP(pctD(mes)), delta: dp(pctD(mes), base(pctD)), spark: { vals: meses.map(pctD), titulo: "despesas % receita" } }),
  ));

  // peso sobre a receita ao longo do tempo (mesma unidade, duas séries)
  const gPeso = el("div", { class: "grafico" });
  responsivo(gPeso, (w) => linhas(w, { cats: longa.map(mesCurto), h: 250, fmt: fP, yFmt: (v) => `${Math.round(v)}%`, linhaZero: false, yMin: 0, nota: "custos e despesas sobre a receita",
    series: [{ id: "c", nome: "Custos", cor: "var(--cat-4)", vals: longa.map(pctC) }, { id: "d", nome: "Despesas", cor: "var(--dourado)", vals: longa.map(pctD) }] }));
  raiz.append(secao("Quanto cada real de receita consome", `Custos e despesas operacionais como % da receita, ${longa.length} meses. Despesas sem rendimentos financeiros.`, gPeso));

  raiz.append(el("div", { class: "duas igual" },
    empilhado(P, emp, mes, meses, "custo", "Custos por grupo", "Magnitude em R$. Quanto mais escuro, maior o grupo no mês. Clique em um trecho para destrinchar."),
    empilhado(P, emp, mes, meses, "despesa", "Despesas por grupo", "Magnitude em R$, sem sinal. Clique em um trecho para destrinchar.")));

  // roscas do mês + evolução em R$ de cada grupo de custo
  const rosc = (grupo) => raizesPorGrupo(P, emp, grupo, mes).filter((r) => !r.no.naoOperacional).map((r) => ({ id: r.id, nome: r.nome, cor: r.cor, val: Math.abs(valorNo(P, emp, mes, r.no)) }));
  raiz.append(el("div", { class: "duas igual" },
    blocoRosca("Composição dos custos no mês", "Quanto cada grupo pesa no custo total. Clique em uma fatia para destrinchar.", rosc("custo"), { centro: { titulo: "custos", valor: fMilAbs(Math.abs(m.custos)) }, nota: "composição dos custos", onClick: (it) => ir({ d: it.id }) }),
    blocoRosca("Composição das despesas no mês", "Despesas operacionais por grupo, sem rendimentos financeiros.", rosc("despesa"), { centro: { titulo: "despesas", valor: fMilAbs(Math.abs(m.despesas - m.rend)) }, nota: "composição das despesas", onClick: (it) => ir({ d: it.id }) })));
  const gGr = el("div", { class: "grafico" });
  const topo = [...raizesPorGrupo(P, emp, "custo", mes), ...raizesPorGrupo(P, emp, "despesa", mes).filter((r) => !r.no.naoOperacional)].sort((a, b) => Math.abs(valorNo(P, emp, mes, b.no)) - Math.abs(valorNo(P, emp, mes, a.no))).slice(0, 4);
  const corL = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)", "var(--cat-6)"];
  responsivo(gGr, (w) => linhas(w, { cats: longa.map(mesCurto), h: 250, nota: "maiores grupos de gasto", series: topo.map((r, i) => ({ id: r.id, nome: r.nome, cor: corL[i], vals: longa.map((x) => Math.abs(valorNo(P, emp, x, r.no))) })) }));
  raiz.append(secao("Os quatro maiores grupos de gasto, mês a mês", "Evolução em R$ dos grupos que mais pesam no mês (custos e despesas juntos).", gGr));

  // maiores variações em custos e despesas (R$)
  const mov = movimentos(P, emp, mes, S.cmp).filter((x) => x.no.grupo !== "receita" && Math.abs(x.delta) >= 1)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 10);
  const gMov = el("div", { class: "grafico" });
  const itens = mov.map((x) => ({ id: x.no.codigo, nome: x.no.nome, val: x.delta, cor: x.delta < 0 ? "var(--ruim)" : "var(--bom)", sub: `${fR(x.base)} → ${fR(x.cur)}`, rot: fMilSig(x.delta) }));
  responsivo(gMov, (w) => barrasH(w, { itens, divergente: true, fmt: fMilSig, onClick: (it) => ir({ d: it.id }), linha: 28, rotuloLargura: Math.min(240, w * 0.4) }));
  raiz.append(secao("O que mais mexeu em custos e despesas", `Variação em R$ de cada conta contra o ${rotuloBase()}. Barra para a direita = gasto menor (melhora); para a esquerda = gasto maior (piora).`, gMov));

  raiz.append(secao("Custos e despesas em detalhe", "Expanda os grupos para chegar às contas; o mapa de cor mostra a variação percentual.",
    tabelaArvore(P, emp, { meses, mes, grupos: ["custo", "despesa"], rodape: false })));
}
