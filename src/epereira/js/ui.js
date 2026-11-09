// Componentes de interface reutilizados pelas telas.
import { el, fN, fP, fPsig, fRsig, fMilSig } from "./util.js";
import { sparkline, chipDelta, rosca } from "./charts.js";
import { responsivo } from "./util.js";
import { S, ir } from "./state.js";
import {
  arvore, valorNo, metricas, variacao, julgamento, baseNo, mesCurto, mesesJanela, mesAnterior, mesesBase, fontesNo, EMP,
} from "./model.js";
import { media } from "./api.js";

export function secao(titulo, descricao, ...filhos) {
  return el("section", { class: "secao" },
    el("header", { class: "secao-cab" }, el("h2", { text: titulo }), descricao ? el("p", { text: descricao }) : null),
    ...filhos);
}

export function area(...filhos) { return el("div", { class: "area" }, ...filhos); }

export function rotuloBase() { return S.cmp === "avg" ? "média dos 3 meses anteriores" : "mês anterior"; }
export function rotuloBaseCurto() { return S.cmp === "avg" ? "vs média 3m" : "vs mês ant."; }

// Texto + cor da variação de um valor assinado
export function deltaDe(P, emp, grupo, cur, base, { moeda = true } = {}) {
  const v = variacao(cur, base, grupo === "receita");
  const julg = julgamento(grupo, cur, base);
  if (v.abs == null) return { texto: "sem base", julg: "neutro", dir: 0, pct: null };
  const dir = Math.abs(v.abs) < 0.5 ? 0 : (Math.abs(cur) >= Math.abs(base) ? 1 : -1);
  const pct = v.novo ? "novo" : fPsig(v.pct);
  return { texto: moeda ? `${pct === "novo" ? "novo" : pct} · ${fMilSig(v.abs)}` : pct, julg, dir, pct: v.pct, abs: v.abs };
}

const CORES_TILE = ["var(--cat-1)", "var(--cat-3)", "var(--cat-2)", "var(--cat-4)", "var(--cat-6)"];
const corTile = (t) => CORES_TILE[[...String(t)].reduce((a, c) => a + c.charCodeAt(0), 0) % CORES_TILE.length];

export function tile({ rotulo, valor, sub, delta, spark, onClick, destaque = false, cor }) {
  const raiz = el(onClick ? "button" : "div", { class: "tile" + (destaque ? " tile-hero" : ""), type: onClick ? "button" : null, onClick });
  raiz.append(...[
    el("span", { class: "tile-r", text: rotulo }),
    el("span", { class: "tile-v", text: valor }),
    delta ? el("span", { class: "tile-d" }, chipDelta(delta.texto, delta.julg, delta.dir), el("span", { class: "tile-b", text: ` ${rotuloBaseCurto()}` })) : null,
    sub ? el("span", { class: "tile-s", text: sub }) : null,
    spark ? el("span", { class: "tile-sp" }, sparkline(spark.vals, { cor: cor ?? corTile(rotulo), w: 120, h: 34, titulo: spark.titulo })) : null,
  ].filter(Boolean));
  return raiz;
}

export function badgesFonte(fontes) {
  const nomes = { p: "planilha", n: "Nibo", m: "manual", planilha: "planilha", nibo: "Nibo", manual: "manual" };
  const box = el("span", { class: "fontes" });
  for (const f of fontes) box.append(el("span", { class: `fonte f-${nomes[f]}`, text: nomes[f] }));
  return box;
}

// cor de fundo proporcional à variação (mapa de calor), sempre com texto legível
export function bgCalor(julg, pct) {
  if (julg === "neutro" || pct == null) return null;
  const forca = Math.min(1, Math.abs(pct) / 40);
  const cor = julg === "bom" ? "var(--bom)" : "var(--ruim)";
  return `color-mix(in srgb, ${cor} ${Math.round(8 + forca * 30)}%, var(--painel))`;
}

// ───────────────────────── tabela em árvore (DRE) ─────────────────────────
// Colunas: conta | meses da janela | Δ vs base | Δ% | % da receita | tendência
export const ABERTO = new Set();
export function tabelaArvore(P, emp, { meses, mes, aberto = ABERTO, onToggle = (c) => { aberto.has(c) ? aberto.delete(c) : aberto.add(c); ir({}); }, grupos = ["receita", "custo", "despesa"], destacar = null, rodape = true }) {
  const modo = S.cmp;
  const t = el("table", { class: "dre" });
  const thead = el("thead", {}, el("tr", {},
    el("th", { class: "c-nome", text: "Conta" }),
    ...meses.map((m) => el("th", { class: "num" + (m === mes ? " atual" : ""), text: mesCurto(m) })),
    el("th", { class: "num", text: "Δ R$" }), el("th", { class: "num", text: "Δ %" }),
    el("th", { class: "num", text: "% rec." }), el("th", { class: "c-tend", text: "Tendência" })));
  t.append(thead);
  const tb = el("tbody");
  t.append(tb);
  const { raizes } = arvore(P, emp);
  const rec = metricas(P, emp, mes)?.receita || 1;

  const linhaValores = (valFn, grupo, opcoes) => {
    const cur = valFn(mes);
    const base = modo === "avg" ? (() => { const ms = mesesBase(P, mes, "avg"); return ms.length ? media(ms.map(valFn)) : null; })() : (() => { const a = mesAnterior(P, mes); return a ? valFn(a) : null; })();
    const d = deltaDe(P, emp, grupo, cur, base, { moeda: false });
    const v = variacao(cur, base, grupo === "receita");
    const cels = meses.map((m) => el("td", { class: "num" + (m === mes ? " atual" : ""), text: fN(valFn(m)) }));
    const dAbs = el("td", { class: "num", text: v.abs == null ? "—" : fRsig(v.abs).replace("R$ ", "") });
    const dPct = el("td", { class: "num calor", text: v.novo ? "novo" : fPsig(v.pct), style: { background: bgCalor(d.julg, v.pct) } });
    if (d.julg !== "neutro") dPct.append(el("span", { class: "vh", text: d.julg === "bom" ? " (melhora)" : " (piora)" }));
    const pr = el("td", { class: "num dim", text: fP((100 * Math.abs(cur)) / Math.abs(rec)) });
    const sp = el("td", { class: "c-tend" }, sparkline(meses.map(valFn), { w: 84, h: 24, cor: "var(--navy-barra)" }));
    return [...cels, dAbs, dPct, pr, sp];
  };

  const addTotal = (nome, grupo, valFn, classe = "total") => {
    const tr = el("tr", { class: classe }, el("td", { class: "c-nome" }, el("span", { text: nome })), ...linhaValores(valFn, grupo));
    tb.append(tr);
  };

  const addNo = (no, nivel, visivel) => {
    const abre = aberto.has(no.codigo);
    const tr = el("tr", { class: `no nivel-${nivel}` + (no.filhos.length ? " pai" : "") + (destacar === no.codigo ? " destacada" : ""), "data-cod": no.codigo });
    const nome = el("td", { class: "c-nome", style: { paddingLeft: `${10 + nivel * 18}px` } });
    if (no.filhos.length) nome.append(el("button", { type: "button", class: "chev" + (abre ? " aberto" : ""), "aria-label": `${abre ? "recolher" : "expandir"} ${no.nome}`, "aria-expanded": String(abre), onClick: () => onToggle(no.codigo) }, "▸"));
    else nome.append(el("span", { class: "chev vazio" }));
    nome.append(el("button", { type: "button", class: "lnk", title: "Destrinchar esta conta", onClick: () => ir({ d: no.codigo }), text: no.nome }));
    tr.append(nome, ...linhaValores((m) => valorNo(P, emp, m, no), no.grupo));
    tb.append(tr);
    if (no.filhos.length && abre) for (const f of no.filhos) addNo(f, nivel + 1);
  };

  const bloco = (grupo, titulo, totalFn) => {
    const rs = raizes.filter((n) => n.grupo === grupo && n.incluirDre);
    if (!rs.length) return;
    addTotal(titulo, grupo, totalFn, "grupo");
    rs.forEach((n) => addNo(n, 1));
  };

  const M = (m) => metricas(P, emp, m);
  if (grupos.includes("receita")) bloco("receita", "Receitas operacionais", (m) => M(m)?.receita ?? 0);
  if (grupos.includes("custo")) bloco("custo", "Custos operacionais", (m) => M(m)?.custos ?? 0);
  if (grupos.includes("custo")) addTotal("Margem de contribuição", "receita", (m) => M(m)?.mc ?? 0);
  if (grupos.includes("despesa")) bloco("despesa", "Despesas operacionais e outras receitas", (m) => M(m)?.despesas ?? 0);
  if (!rodape) return el("div", { class: "tabela-rolagem" }, t);
  addTotal("Resultado operacional", "receita", (m) => M(m)?.resultado ?? 0, "total forte");
  const inv = raizes.filter((n) => n.grupo === "investimento");
  if (inv.length) addTotal("Investimentos (ativo fixo)", "investimento", (m) => M(m)?.invest ?? 0);
  if (raizes.some((n) => n.grupo === "financiamento" && n.incluirDre)) addTotal("Financiamentos", "financiamento", (m) => M(m)?.financ ?? 0);
  addTotal("Variação de caixa", "receita", (m) => M(m)?.caixa ?? 0, "total forte");
  return el("div", { class: "tabela-rolagem" }, t);
}

export function chipEmpresa(id) {
  const e = EMP[id];
  return el("span", { class: "chip-emp", style: { "--c": e.cor } }, el("i"), e.curto);
}

export function janelaMeses(P) {
  return mesesJanela(P, S.mes, S.n);
}

// Seção com rosca: itens [{id,nome,val,cor}], centro {titulo,valor}
export function blocoRosca(titulo, descricao, itens, opcoes = {}) {
  const g = el("div", { class: "grafico" });
  responsivo(g, (w) => rosca(w, { itens, ...opcoes }));
  return secao(titulo, descricao, g);
}
