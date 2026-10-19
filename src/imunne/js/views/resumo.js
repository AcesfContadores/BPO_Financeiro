import { el, responsivo, fMilAbs, fMilSig, fP, fPP, fRsig, fR } from "../util.js";
import { colunas, cascata, barrasH, legenda, chipDelta, sparkline, linhas } from "../charts.js";
import { S, ir } from "../state.js";
import { EMP, CENTROS, metricas, ponte, movimentos, alertas, mesCurto, mesAbrev, mesAnterior, mesesBase, mesesJanela, saldoOficial, fimDoMes, julgamento, variacao, arvore } from "../model.js";
import { linhasReceita, valorLinha } from "../linhas-negocio.js";
import { secao, tile, deltaDe, rotuloBase, blocoRosca } from "../ui.js";
import { media } from "../api.js";

const isoBase = (P, fn) => {
  const ms = mesesBase(P, S.mes, S.cmp);
  if (!ms.length) return null;
  return S.cmp === "avg" ? media(ms.map(fn)) : fn(ms[0]);
};

function frase(P, m, mp, pt) {
  if (!mp || !pt) return `Resultado operacional de ${fMilAbs(m.resultado)} em ${mesCurto(m.mes)}.`;
  const dif = m.resultado - mp.resultado;
  const deltas = pt.passos.filter((p) => p.tipo === "delta" && p.id !== "__demais");
  const pior = [...deltas].sort((a, b) => a.val - b.val)[0];
  const melhor = [...deltas].sort((a, b) => b.val - a.val)[0];
  let s = `Resultado operacional de ${fMilAbs(m.resultado)} em ${mesCurto(m.mes)}, ${dif >= 0 ? "alta" : "queda"} de ${fMilAbs(Math.abs(dif))} sobre ${mesAbrev(mp.mes)}.`;
  if (pior && pior.val < 0) s += ` O maior peso contra: ${pior.nome} (${fMilSig(pior.val)}).`;
  if (melhor && melhor.val > 0) s += ` A favor: ${melhor.nome} (${fMilSig(melhor.val)}).`;
  return s;
}

export function renderResumo(P, raiz) {
  const emp = S.emp, mes = S.mes;
  const m = metricas(P, emp, mes);
  if (!m) { raiz.append(el("p", { class: "vazio", text: "Sem dados de DRE para este mês e empresa." })); return; }
  const ant = mesAnterior(P, mes);
  const mp = ant ? metricas(P, emp, ant) : null;
  const meses = mesesJanela(P, mes, S.n);
  const serie = (fn) => meses.map((x) => { const mm = metricas(P, emp, x); return mm ? fn(mm) : 0; });
  const pt = ant ? (emp === "grupo" ? ponteGrupo(P, mes, ant) : ponte(P, emp, ant, mes)) : null;

  // ── destaque: resultado + indicadores
  const baseRes = isoBase(P, (x) => metricas(P, emp, x)?.resultado ?? 0);
  const dRes = deltaDe(P, emp, "receita", m.resultado, baseRes);
  const hero = el("div", { class: "hero" },
    el("p", { class: "hero-r", text: `Resultado operacional · ${mesCurto(mes)}` }),
    el("p", { class: "hero-v", text: fMilAbs(m.resultado) }),
    el("p", { class: "hero-d" }, chipDelta(dRes.texto, dRes.julg, dRes.dir), el("span", { class: "dim", text: ` em relação ao ${rotuloBase()}` })),
    el("p", { class: "hero-t", text: frase(P, m, mp, pt) }),
    el("div", { class: "hero-sp" }, sparkline(serie((x) => x.resultado), { w: 220, h: 46, cor: "var(--navy-barra)", titulo: "resultado por mês" }),
      el("span", { class: "dim", text: `${mesCurto(meses[0])} a ${mesCurto(mes)}` })),
    Math.abs(m.rend) > 0.02 * Math.abs(m.resultado) && Math.abs(m.rend) >= 100 ? el("p", { class: "hero-aj" }, el("strong", { text: `Sem rendimentos financeiros: ${fMilAbs(m.resultadoAj)} (${fP(m.margemOpAj)})` }), el("span", { class: "dim", text: ` · com eles a margem é ${fP(m.margemOp)}` })) : el("p", { class: "hero-aj" }, el("span", { class: "dim", text: `Margem operacional ${fP(m.margemOp)}` })),
  );

  const tl = (rotulo, valor, fn, grupo, extra) => {
    const cur = fn(m); const base = isoBase(P, (x) => { const mm = metricas(P, emp, x); return mm ? fn(mm) : 0; });
    return tile({ rotulo, valor, delta: deltaDe(P, emp, grupo, cur, base), spark: { vals: serie(fn), titulo: rotulo }, ...extra });
  };
  const tiles = el("div", { class: "tiles" },
    tl("Receita", fMilAbs(m.receita), (x) => x.receita, "receita", { onClick: () => ir({ d: "__receita" }) }),
    (() => { const base = isoBase(P, (x) => metricas(P, emp, x)?.mcPct ?? 0); const dd = base == null ? null : m.mcPct - base; const j = dd == null || Math.abs(dd) < 0.5 ? "neutro" : dd > 0 ? "bom" : "ruim";
      return tile({ rotulo: "Margem de contribuição", valor: fP(m.mcPct), sub: fMilAbs(m.mc), delta: dd == null ? null : { texto: fPP(dd), julg: j, dir: dd > 0 ? 1 : dd < 0 ? -1 : 0 }, spark: { vals: serie((x) => x.mcPct), titulo: "margem de contribuição" }, onClick: () => ir({ d: "__custos" }) }); })(),
    tl("Variação de caixa", fMilAbs(m.caixa), (x) => x.caixa, "receita", { sub: m.invest ? `após ${fMilAbs(Math.abs(m.invest))} de investimento` : "", onClick: () => ir({ page: "caixa", d: null }) }),
    (() => { const sd = saldoOficial(P, emp, fimDoMes(S.mes)); const dBR = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(2, 4)}`;
      return tile({ rotulo: sd ? `Saldo em caixa (${dBR(sd.data)})` : "Saldo em caixa", valor: sd ? fMilAbs(sd.saldo) : "—", sub: sd ? (sd.aproximado ? "valor aproximado, a confirmar" : "saldo informado") : "sem saldo informado até este mês", onClick: () => ir({ page: "caixa", d: null }) }); })(),
  );
  raiz.append(el("div", { class: "faixa-hero" }, hero, tiles));

  // ── evolução (linhas) + destino da receita (rosca)
  const longa = mesesJanela(P, mes, 12);
  const Mx = (x) => metricas(P, emp, x);
  const gEvo = el("div", { class: "grafico" });
  responsivo(gEvo, (w) => linhas(w, { cats: longa.map(mesCurto), h: 270, nota: "receita, custos, despesas e resultado",
    series: [
      { id: "r", nome: "Receita", cor: "var(--emp)", vals: longa.map((x) => Mx(x)?.receita ?? null) },
      { id: "c", nome: "Custos", cor: "var(--cat-4)", vals: longa.map((x) => (Mx(x) ? Math.abs(Mx(x).custos) : null)) },
      { id: "d", nome: "Despesas", cor: "var(--dourado)", vals: longa.map((x) => (Mx(x) ? Math.abs(Mx(x).despesas - Mx(x).rend) : null)) },
      { id: "o", nome: "Resultado", cor: "var(--bom)", vals: longa.map((x) => Mx(x)?.resultado ?? null) },
    ] }));
  const despOp = m.mc - m.resultadoAj;
  const destino = [
    { id: "__custos", nome: "Custos diretos", val: Math.abs(m.custos), cor: "var(--cat-4)" },
    { id: "__despesas", nome: "Despesas operacionais", val: despOp, cor: "var(--dourado)" },
    { id: "__sobra", nome: "Sobra (resultado sem rendimentos)", val: m.resultadoAj, cor: "var(--bom)" },
  ];
  raiz.append(el("div", { class: "duas" },
    secao("Evolução do mês a mês", `Receita, custos, despesas (sem rendimentos) e resultado nos últimos ${longa.length} meses. Passe o mouse sobre as linhas para ver os valores.`, gEvo),
    blocoRosca("Para onde vai a receita do mês", m.resultadoAj < 0 ? "O resultado sem rendimentos foi negativo: custos e despesas superaram a receita." : "Cada fatia é a parte da receita consumida por custos, despesas ou que sobrou. Clique para destrinchar.", destino,
      { centro: { titulo: "receita do mês", valor: fMilAbs(m.receita) }, nota: "destino da receita", onClick: (it) => it.id.startsWith("__c") || it.id === "__despesas" ? ir({ d: it.id }) : ir({ page: "margem", d: null }) })));

  // ── ponte + o que mudou
  const gPonte = el("div", { class: "grafico" });
  if (pt) responsivo(gPonte, (w) => cascata(w, { passos: pt.passos, h: 310, onClick: (g) => {
    if (emp === "grupo") ir({ emp: g.id });
    else if (g.id === "__demais") ir({ d: g.itens.map((i) => i.id).join("~") });
    else ir({ d: g.id });
  } }));
  else gPonte.append(el("p", { class: "vazio", text: "É preciso um mês anterior para montar a ponte." }));
  const blocoPonte = el("div", { class: "col-ponte" },
    secao(`Ponte do resultado: ${ant ? mesAbrev(ant) : "—"} → ${mesAbrev(mes)}`, pt ? `O resultado ${pt.variacaoTotal >= 0 ? "subiu" : "caiu"} ${fMilAbs(Math.abs(pt.variacaoTotal))}. Clique em um degrau para ver as contas.` : "", gPonte));

  const mov = movimentos(P, emp, mes, S.cmp).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 8);
  const gMov = el("div", { class: "grafico" });
  const itens = mov.map((x) => ({ id: x.no.codigo, nome: x.no.nome, val: x.delta, cor: `var(--${julgamento(x.no.grupo, x.cur, x.base, 0) === "bom" ? "bom" : "ruim"})`, sub: `${fR(x.base)} → ${fR(x.cur)}`, rot: fMilSig(x.delta) }));
  if (itens.length) responsivo(gMov, (w) => barrasH(w, { itens, divergente: true, fmt: fMilSig, onClick: (it) => ir({ d: it.id }), linha: 30, rotuloLargura: Math.min(190, w * 0.42) }));
  const blocoMov = el("div", { class: "col-mov" },
    secao("Onde mais mudou", `Maiores variações em R$ por conta, contra o ${rotuloBase()}. Verde melhora o resultado, vermelho piora.`, gMov));
  raiz.append(el("div", { class: "duas" }, blocoPonte, blocoMov));

  // ── mix de receita + atenção
  const linhasR = linhasReceita(emp);
  const ativos = new Set(linhasR.map((l) => l.id));
  const gMix = el("div", { class: "grafico" });
  const leg = el("div", {});
  const desenharMix = () => {
    const series = linhasR.map((l) => ({ id: l.id, nome: l.nome, cor: l.cor, vals: meses.map((x) => (ativos.has(l.id) ? Math.max(0, valorLinha(P, emp, x, l)) : 0)) }));
    responsivo(gMix, (w) => colunas(w, { cats: meses.map(mesCurto), series, h: 270, onClick: (id) => { const l = linhasR.find((z) => z.id === id); if (emp === "grupo") ir({ emp: id }); else ir({ d: l.nos.join("~") }); }, nota: "receita por linha" }));
    gMix.dispatchEvent(new Event("redesenhar"));
  };
  const montarLeg = () => { leg.replaceChildren(legenda(linhasR, { ativos, onToggle: (id) => { if (ativos.has(id) && ativos.size === 1) return; ativos.has(id) ? ativos.delete(id) : ativos.add(id); montarLeg(); gMix.replaceChildren(); desenharMix(); } })); };
  montarLeg(); desenharMix();
  const blocoMix = el("div", { class: "col-mix" }, secao("De onde vem a receita", "Receita por linha de negócio. Clique em uma linha da legenda para ocultá-la e em um trecho da coluna para destrinchar.", leg, gMix));

    const atencao = el("div", { class: "atencao" });
  const blocosAlerta = (e, nomeEmp) => {
    const ls = alertas(P, e, mes);
    return ls.map((a) => el("article", { class: `alerta ${a.nivel}` },
      el("span", { class: "alerta-i", "aria-hidden": "true", text: a.nivel === "ruim" ? "▼" : a.nivel === "atencao" ? "!" : "i" }),
      el("div", {}, el("h3", { text: (nomeEmp ? `${nomeEmp}: ` : "") + a.titulo }), el("p", { text: a.texto }),
        a.no ? el("button", { type: "button", class: "lnk-acao", onClick: () => ir({ emp: e, d: a.no }), text: "Destrinchar" }) : null)));
  };
  if (emp === "grupo") { atencao.append(...blocosAlerta("grupo", "")); }
  else atencao.append(...blocosAlerta(emp, ""));
  if (!atencao.children.length) atencao.append(el("p", { class: "vazio", text: "Nenhum ponto automático de atenção neste mês." }));
  const blocoAt = el("div", { class: "col-at" }, secao("Pontos de atenção", "Regras automáticas sobre os números. Causas continuam a confirmar com a gestão.", atencao));
  raiz.append(el("div", { class: "duas inv" }, blocoMix, blocoAt));
}

function ponteGrupo(P, mes, ant) {
  const ga = metricas(P, "grupo", ant), gb = metricas(P, "grupo", mes);
  if (!ga || !gb) return null;
  const passos = [{ tipo: "total", nome: `Resultado ${mesAbrev(ant)}`, val: ga.resultado }];
  let soma = 0;
  for (const c of CENTROS) {
    const a = metricas(P, c, ant), b = metricas(P, c, mes);
    if (!a || !b) continue;
    const v = b.resultado - a.resultado; soma += v;
    passos.push({ tipo: "delta", id: c, nome: EMP[c].curto, val: v });
  }
  const resto = gb.resultado - ga.resultado - soma;
  if (Math.abs(resto) >= 0.5) passos.push({ tipo: "delta", id: "sem_centro", nome: "Sem centro", val: resto });
  passos.push({ tipo: "total", nome: `Resultado ${mesAbrev(mes)}`, val: gb.resultado });
  return { variacaoTotal: gb.resultado - ga.resultado, passos };
}
