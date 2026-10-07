// Receitas: de onde vem, como se distribui e o que mudou, com caminho até a conta mais detalhada.
import { el, responsivo, fMilAbs, fR, fP, fPP, compacto } from "../util.js";
import { colunas, linhas, barrasH, legenda } from "../charts.js";
import { S, ir } from "../state.js";
import { metricas, mesesJanela, mesCurto, arvore, valorNo, baseNo, variacao, julgamento, EMP } from "../model.js";
import { linhasReceita, valorLinha } from "../linhas-negocio.js";
import { secao, tile, deltaDe, rotuloBase, tabelaArvore, blocoRosca } from "../ui.js";
import { media } from "../api.js";

const ativosPorEmp = {};

export function renderReceitas(P, raiz) {
  const emp = S.emp, mes = S.mes;
  const m = metricas(P, emp, mes);
  if (!m) { raiz.append(el("p", { class: "vazio", text: "Sem dados para este mês." })); return; }
  const meses = mesesJanela(P, mes, Math.max(S.n, 4));
  const L = linhasReceita(emp);
  const base = (fn) => { const i = P.meses.indexOf(mes); const ms = S.cmp === "avg" ? P.meses.slice(Math.max(0, i - 3), i) : (i > 0 ? [P.meses[i - 1]] : []); return ms.length ? media(ms.map(fn)) : null; };
  const valL = (l, x) => valorLinha(P, emp, x, l);

  // destaques
  const ord = [...L].sort((a, b) => valL(b, mes) - valL(a, mes));
  const maior = ord[0];
  const conc = m.receita ? (100 * valL(maior, mes)) / m.receita : 0;
  const dRec = deltaDe(P, emp, "receita", m.receita, base((x) => metricas(P, emp, x)?.receita ?? 0));
  const dMaior = deltaDe(P, emp, "receita", valL(maior, mes), base((x) => valL(maior, x)));
  const crescimento = L.map((l) => ({ l, d: valL(l, mes) - (base((x) => valL(l, x)) ?? 0) })).sort((a, b) => b.d - a.d);
  raiz.append(el("div", { class: "tiles quatro" },
    tile({ rotulo: "Receita do mês", valor: fMilAbs(m.receita), delta: dRec, spark: { vals: meses.map((x) => metricas(P, emp, x)?.receita ?? 0), titulo: "receita" }, onClick: () => ir({ d: "__receita" }) }),
    tile({ rotulo: `Maior linha: ${maior.nome}`, valor: fMilAbs(valL(maior, mes)), sub: `${fP(conc)} da receita`, delta: dMaior, spark: { vals: meses.map((x) => valL(maior, x)), titulo: maior.nome, }, cor: maior.cor, onClick: emp === "grupo" ? () => ir({ emp: maior.id }) : () => ir({ d: maior.nos.join("~") }) }),
    tile({ rotulo: "Mais cresceu em R$", valor: crescimento[0].l.nome, sub: `${crescimento[0].d >= 0 ? "+" : "−"}R$ ${(Math.abs(crescimento[0].d) / 1000).toFixed(1).replace(".", ",")} mil ${S.cmp === "avg" ? "vs média" : "vs mês ant."}` }),
    tile({ rotulo: "Mais caiu em R$", valor: crescimento.at(-1).d < 0 ? crescimento.at(-1).l.nome : "Nenhuma", sub: crescimento.at(-1).d < 0 ? `−R$ ${(Math.abs(crescimento.at(-1).d) / 1000).toFixed(1).replace(".", ",")} mil ${S.cmp === "avg" ? "vs média" : "vs mês ant."}` : "todas as linhas estáveis ou em alta" }),
  ));

  // evolução por linha (empilhado) + participação %
  const ativos = (ativosPorEmp[emp] ??= new Set(L.map((l) => l.id)));
  const gCol = el("div", { class: "grafico" }), gPart = el("div", { class: "grafico" });
  const leg = el("div");
  const desenhar = () => {
    const ser = L.map((l) => ({ id: l.id, nome: l.nome, cor: l.cor, vals: meses.map((x) => (ativos.has(l.id) ? Math.max(0, valL(l, x)) : 0)) }));
    responsivo(gCol, (w) => colunas(w, { cats: meses.map(mesCurto), series: ser, h: 290, nota: "receita por linha", onClick: (id) => { const l = L.find((z) => z.id === id); emp === "grupo" ? ir({ emp: id }) : ir({ d: l.nos.join("~") }); } }));
    const linhasP = L.filter((l) => ativos.has(l.id)).map((l) => ({ id: l.id, nome: l.nome, cor: l.cor, vals: meses.map((x) => { const t = metricas(P, emp, x)?.receita || 0; return t ? (100 * valL(l, x)) / t : null; }) }));
    responsivo(gPart, (w) => linhas(w, { cats: meses.map(mesCurto), series: linhasP, h: 290, fmt: fP, yFmt: (v) => `${Math.round(v)}%`, linhaZero: false, yMin: 0, nota: "participação percentual" }));
  };
  const montarLeg = () => leg.replaceChildren(legenda(L, { ativos, onToggle: (id) => { if (ativos.has(id) && ativos.size === 1) return; ativos.has(id) ? ativos.delete(id) : ativos.add(id); montarLeg(); desenhar(); } }));
  montarLeg(); desenhar();
  raiz.append(el("div", { class: "duas igual" },
    secao("Receita por linha de negócio", "Clique em um trecho da coluna para destrinchar a linha. A legenda liga e desliga cada linha.", leg, gCol),
    secao("Participação de cada linha", "Peso de cada linha na receita do mês. Muda quando o mix muda, mesmo com receita total estável.", gPart)));

  // rosca do mix do mês + linhas em R$ por linha de negócio
  const gLin = el("div", { class: "grafico" });
  responsivo(gLin, (w) => linhas(w, { cats: meses.map(mesCurto), h: 270, nota: "receita por linha em R$",
    series: L.filter((l) => ativos.has(l.id)).map((l) => ({ id: l.id, nome: l.nome, cor: l.cor, vals: meses.map((x) => valL(l, x)) })) }));
  raiz.append(el("div", { class: "duas igual" },
    blocoRosca("Mix da receita no mês", "Peso de cada linha no total do mês. Clique em uma fatia para destrinchar.", L.map((l) => ({ id: l.id, nome: l.nome, cor: l.cor, val: Math.max(0, valL(l, mes)), nos: l.nos })),
      { centro: { titulo: "receita", valor: fMilAbs(m.receita) }, nota: "mix da receita", onClick: (it) => (emp === "grupo" ? ir({ emp: it.id }) : ir({ d: L.find((z) => z.id === it.id).nos.join("~") })) }),
    secao("Cada linha em R$, mês a mês", "As mesmas linhas da legenda acima, agora como evolução: mostra quem sobe e quem cai sem o empilhamento.", gLin)));

  // contas de receita do mês, ordenadas (barras) – folhas
  const { nos } = arvore(P, emp);
  const folhasR = [...nos.values()].filter((n) => !n.filhos.length && n.grupo === "receita" && n.incluirDre)
    .map((n) => ({ n, cur: valorNo(P, emp, mes, n), b: baseNo(P, emp, n, mes, S.cmp) }))
    .filter((x) => Math.abs(x.cur) >= 1 || Math.abs(x.b ?? 0) >= 1)
    .sort((a, b) => Math.abs(b.cur) - Math.abs(a.cur));
  const topo = folhasR.slice(0, 12);
  const gConta = el("div", { class: "grafico" });
  const itens = topo.map((x) => ({ id: x.n.codigo, nome: x.n.nome, val: x.cur, cor: x.cur < 0 ? "var(--ruim)" : "var(--navy-barra)", sub: x.b == null ? "" : `base: ${fR(x.b)}`, rot: `${fMilAbs(x.cur)} · ${m.receita ? fP((100 * x.cur) / m.receita) : ""}` }));
  responsivo(gConta, (w) => barrasH(w, { itens, fmt: fR, onClick: (it) => ir({ d: it.id }), linha: 28, rotuloLargura: Math.min(240, w * 0.4) }));
  const sub = [];
  if (folhasR.length > 12) sub.push(`Mostrando as 12 maiores de ${folhasR.length} contas.`);
  raiz.append(secao("Contas de receita no mês", `Cada barra é uma conta do plano de contas. ${sub.join(" ")} Clique para ver a série e a composição.`, gConta));

  // tabela em árvore
  raiz.append(secao("Receitas em detalhe", `Expanda as linhas para chegar às contas. Cores mostram a variação contra o ${rotuloBase()}: verde melhora, vermelho piora.`,
    tabelaArvore(P, emp, { meses, mes, grupos: ["receita"], rodape: false })));
}
