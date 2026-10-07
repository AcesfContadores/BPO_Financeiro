// Caixa: o que o resultado virou em dinheiro, saldos conhecidos e um simulador de projeção (premissas editáveis).
import { el, responsivo, fMilAbs, fMilSig, fR, fP, fN } from "../util.js";
import { linhas, cascata, colunas } from "../charts.js";
import { S, ir } from "../state.js";
import { metricas, mesesJanela, mesCurto, mesAbrev, saldoOficial, fimDoMes, EMPRESAS_REAIS, EMP } from "../model.js";
import { secao, tile, deltaDe, rotuloBase, blocoRosca } from "../ui.js";
import { media, soma } from "../api.js";

const dataBR = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(2, 4)}`;
const premissas = { cresc: 0, spread: 2, horizonte: 6, manual: {} };

export function renderCaixa(P, raiz) {
  const emp = S.emp, mes = S.mes;
  const m = metricas(P, emp, mes);
  if (!m) { raiz.append(el("p", { class: "vazio", text: "Sem dados para este mês." })); return; }
  const meses = mesesJanela(P, mes, Math.max(S.n, 4));
  const M = (x) => metricas(P, emp, x);
  const i = P.meses.indexOf(mes);
  const ms = S.cmp === "avg" ? P.meses.slice(Math.max(0, i - 3), i) : (i > 0 ? [P.meses[i - 1]] : []);
  const base = (fn) => (ms.length ? media(ms.map(fn)) : null);
  const saldo = saldoOficial(P, emp, fimDoMes(mes));
  const conv = m.resultado ? (100 * m.caixa) / m.resultado : null;

  raiz.append(el("div", { class: "tiles quatro" },
    tile({ rotulo: "Variação de caixa", valor: fMilAbs(m.caixa), delta: deltaDe(P, emp, "receita", m.caixa, base((x) => M(x)?.caixa ?? 0)), spark: { vals: meses.map((x) => M(x)?.caixa ?? 0), titulo: "variação de caixa" } }),
    tile({ rotulo: "Resultado virou caixa", valor: conv == null ? "—" : fP(conv), sub: `${fMilAbs(m.caixa)} de caixa para ${fMilAbs(m.resultado)} de resultado` }),
    tile({ rotulo: "Investimentos no mês", valor: fMilAbs(Math.abs(m.invest)), sub: m.financ ? `e ${fMilAbs(Math.abs(m.financ))} de financiamentos` : "ativo fixo e equipamentos", spark: { vals: meses.map((x) => Math.abs(M(x)?.invest ?? 0)), titulo: "investimentos" }, onClick: () => ir({ page: "custos", d: "inv_ativo_fixo" }) }),
    tile({ rotulo: saldo ? `Saldo em caixa (${dataBR(saldo.data)})` : "Saldo em caixa", valor: saldo ? fMilAbs(saldo.saldo) : "—", sub: saldo ? (saldo.aproximado ? "valor aproximado, a confirmar" : "saldo informado") : "sem saldo informado até este mês" }),
  ));

  // resultado x caixa + ponte
  const gSerie = el("div", { class: "grafico" });
  const longa = mesesJanela(P, mes, 12);
  responsivo(gSerie, (w) => linhas(w, { cats: longa.map(mesCurto), h: 260, nota: "resultado e variação de caixa",
    series: [{ id: "r", nome: "Resultado", cor: "var(--navy-barra)", vals: longa.map((x) => M(x)?.resultado ?? null) }, { id: "c", nome: "Variação de caixa", cor: "var(--dourado)", vals: longa.map((x) => M(x)?.caixa ?? null) }] }));
  // caixa acumulado na janela de 12 meses (soma das variações)
  let acc = 0; const acumulado = longa.map((x) => (acc += M(x)?.caixa ?? 0));
  const gAc = el("div", { class: "grafico" });
  responsivo(gAc, (w) => linhas(w, { cats: longa.map(mesCurto), h: 240, nota: "variação de caixa acumulada", series: [{ id: "a", nome: "Acumulado", cor: "var(--emp)", vals: acumulado }] }));
  const outros = m.caixa - m.resultado - m.invest - m.financ;
  const passos = [{ tipo: "total", nome: "Resultado operacional", val: m.resultado }, { tipo: "delta", id: "inv", nome: "Investimentos", val: m.invest }];
  if (Math.abs(m.financ) >= 0.5) passos.push({ tipo: "delta", id: "fin", nome: "Financiamentos", val: m.financ });
  passos.push({ tipo: "delta", id: "out", nome: "Outros movimentos", val: outros }, { tipo: "total", nome: "Variação de caixa", val: m.caixa });
  const gPonte = el("div", { class: "grafico" });
  responsivo(gPonte, (w) => cascata(w, { passos, h: 300 }));
  raiz.append(el("div", { class: "duas igual" },
    secao("Resultado e caixa mês a mês", "Quando as linhas se afastam, parte do resultado ficou em investimento, aportes, distribuição ou em prazo de recebimento.", gSerie),
    secao(`Do resultado ao caixa em ${mesAbrev(mes)}`, "Outros movimentos agrupam o que não está no resultado: aportes e retiradas de sócios, distribuição de lucros e diferenças de prazo.", gPonte)));

  raiz.append(secao("Caixa gerado no acumulado", `Soma das variações de caixa de ${mesCurto(longa[0])} até ${mesCurto(mes)}. Mostra a tendência de longo prazo sem o ruído de cada mês.`, gAc));

  // saldos informados
  const emps = emp === "grupo" ? EMPRESAS_REAIS : [emp];
  const todas = [...new Set(emps.flatMap((e) => P.raw.empresas[e].caixa.map((c) => c.data)))].sort();
  const serieSaldo = emps.map((e) => ({ id: e, nome: EMP[e].curto, cor: `var(--emp-${e})`, vals: todas.map((d) => { const p = P.raw.empresas[e].caixa.find((c) => c.data === d); return p ? Number(p.saldo) : null; }) }));
  const gSaldo = el("div", { class: "grafico" });
  if (todas.length >= 2) responsivo(gSaldo, (w) => linhas(w, { cats: todas.map(dataBR), series: serieSaldo, h: 240, nota: "saldo de caixa informado" }));
  const tab = el("table", { class: "dre mini" }, el("thead", {}, el("tr", {}, el("th", { class: "c-nome", text: "Data" }), ...(emps.length > 1 ? [] : []), el("th", { class: "c-nome", text: "Empresa" }), el("th", { class: "num", text: "Saldo" }), el("th", { class: "c-nome", text: "Situação" }))));
  const tb = el("tbody");
  for (const e of emps) for (const c of P.raw.empresas[e].caixa.slice().sort((a, b) => b.data.localeCompare(a.data)).slice(0, 8))
    tb.append(el("tr", {}, el("td", { class: "c-nome", text: dataBR(c.data) }), el("td", { class: "c-nome", text: EMP[e].curto }), el("td", { class: "num", text: fN(Number(c.saldo)) }), el("td", { class: "c-nome", text: c.aproximado ? "aproximado, a confirmar" : "informado" })));
  tab.append(tb);
  raiz.append(secao("Saldos de caixa informados", "Saldos vêm dos fechamentos informados, não do extrato do Nibo (a composição das contas ainda será conciliada).", gSaldo, el("div", { class: "tabela-rolagem" }, tab)));

  // saldos nas contas do Nibo
  const linhasNibo = [];
  for (const e of emps) {
    const porConta = new Map();
    for (const s of P.raw.empresas[e].saldos_contas ?? []) { const a = porConta.get(s.conta); if (!a || s.data > a.data) porConta.set(s.conta, s); }
    for (const s of porConta.values()) linhasNibo.push({ e, ...s });
  }
  if (linhasNibo.length) {
    const t = el("table", { class: "dre mini" }, el("thead", {}, el("tr", {}, el("th", { class: "c-nome", text: "Conta" }), el("th", { class: "c-nome", text: "Empresa" }), el("th", { class: "c-nome", text: "Data" }), el("th", { class: "num", text: "Saldo" }))));
    const b = el("tbody");
    for (const l of linhasNibo.sort((x, y) => Number(y.saldo) - Number(x.saldo))) b.append(el("tr", {}, el("td", { class: "c-nome", text: l.conta }), el("td", { class: "c-nome", text: EMP[l.e].curto }), el("td", { class: "c-nome", text: dataBR(l.data) }), el("td", { class: "num", text: fN(Number(l.saldo)) })));
    b.append(el("tr", { class: "total" }, el("td", { class: "c-nome", text: "Total nas contas" }), el("td"), el("td"), el("td", { class: "num", text: fN(soma(linhasNibo.map((l) => Number(l.saldo)))) })));
    t.append(b);
    const pos = linhasNibo.filter((l) => Number(l.saldo) > 0);
    const cores = ["var(--navy-barra)", "var(--azul)", "var(--dourado)", "var(--emp-multidisciplinar)", "var(--lin-cardio)", "var(--neutro)"];
    raiz.append(blocoRosca("Onde está o dinheiro (contas com saldo positivo)", "Distribuição dos saldos das contas lidos do Nibo. Contas negativas ficam na tabela abaixo.", pos.map((l, i) => ({ id: `${l.e}-${l.conta}`, nome: emp === "grupo" ? `${l.conta} (${EMP[l.e].curto})` : l.conta, val: Number(l.saldo), cor: cores[Math.min(i, 5)] })).sort((a, b) => b.val - a.val).map((x, i) => ({ ...x, cor: cores[Math.min(i, 5)] })), { centro: { titulo: "em contas positivas", valor: fMilAbs(soma(pos.map((l) => Number(l.saldo)))) }, nota: "saldos por conta" }));
    raiz.append(secao("Saldos nas contas bancárias (Nibo)", "Último saldo lido de cada conta. Pode diferir do saldo informado acima; a diferença está em conciliação.", el("div", { class: "tabela-rolagem" }, t)));
  }

  // simulador de projeção
  raiz.append(secao("Simulador de caixa", "Projeção simples a partir da média dos meses recentes. É um cenário seu, com premissas editáveis, e não uma previsão da ACESF.", projecao(P, emp, mes, meses, saldo)));
}

function projecao(P, emp, mes, meses, saldo) {
  const M = (x) => metricas(P, emp, x);
  const ms = meses.map(M).filter(Boolean);
  const recBase = media(ms.map((x) => x.receita));
  const mcPct = recBase ? (100 * media(ms.map((x) => x.mc))) / recBase : 0;
  const desp = media(ms.map((x) => x.mc - x.resultadoAj));
  const inv = media(ms.map((x) => Math.abs(x.invest)));
  const d0 = { saldo: Math.round(saldo?.saldo ?? 0), rec: Math.round(recBase), mc: Math.round(mcPct * 10) / 10, desp: Math.round(desp), inv: Math.round(inv) };
  const st = (premissas.manual[emp] ??= { ...d0 });
  const caixa = el("div", { class: "sim" });
  const grafico = el("div", { class: "grafico" });
  const resumo = el("div", { class: "sim-res", "aria-live": "polite" });
  const campo = (rot, chave, passo, dica, sufixo = "") => {
    const inp = el("input", { type: "number", step: passo, value: st[chave] ?? premissas[chave], inputmode: "decimal", "aria-label": rot });
    inp.addEventListener("input", () => { const v = Number(String(inp.value).replace(",", ".")); if (Number.isFinite(v)) { if (chave in st) st[chave] = v; else premissas[chave] = v; desenhar(); } });
    return el("label", { class: "sim-n" }, el("span", { class: "sim-r", text: rot }), el("span", { class: "sim-in" }, inp, sufixo ? el("em", { text: sufixo }) : null), el("small", { class: "dim", text: dica }));
  };
  const rotulos = [mes];
  const cenario = (g) => {
    let s = st.saldo, rec = st.rec; const out = [s];
    for (let k = 0; k < premissas.horizonte; k++) { rec *= 1 + g / 100; s += rec * (st.mc / 100) - st.desp - st.inv; out.push(s); }
    return out;
  };
  const prox = (k) => { const [a, mm] = mes.split("-").map(Number); const d = new Date(Date.UTC(a, mm - 1 + k, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };
  const desenhar = () => {
    premissas.horizonte = Math.min(12, Math.max(3, Math.round(premissas.horizonte) || 6));
    const cats = Array.from({ length: premissas.horizonte + 1 }, (_, k) => (k === 0 ? `${mesCurto(mes)} (hoje)` : mesCurto(prox(k))));
    const cen = [["Conservador", premissas.cresc - premissas.spread, "var(--neutro)"], ["Base", premissas.cresc, "var(--navy-barra)"], ["Otimista", premissas.cresc + premissas.spread, "var(--bom)"]];
    const series = cen.map(([nome, g, cor], i) => ({ id: nome, nome, cor, vals: cenario(g), tracejado: i !== 1 }));
    responsivo(grafico, (w) => linhas(w, { cats, series, h: 260, nota: "saldo projetado", linhaZero: true }));
    const fim = series[1].vals.at(-1);
    const mensal = st.rec * (st.mc / 100) - st.desp - st.inv;
    resumo.replaceChildren(
      el("div", { class: "sim-b" }, el("span", { class: "tile-r", text: "Geração mensal de caixa (base)" }), el("span", { class: "tile-v", text: fMilSig(mensal) })),
      el("div", { class: "sim-b" }, el("span", { class: "tile-r", text: `Saldo em ${mesCurto(prox(premissas.horizonte))} (base)` }), el("span", { class: "tile-v", text: fMilAbs(fim) })),
      el("div", { class: "sim-b" }, el("span", { class: "tile-r", text: "Faixa dos cenários" }), el("span", { class: "tile-v", text: `${fMilAbs(series[0].vals.at(-1))} a ${fMilAbs(series[2].vals.at(-1))}` })));
  };
  const rest = el("button", { type: "button", class: "btn", text: "Voltar às médias reais", onClick: () => { premissas.manual[emp] = { ...d0 }; premissas.cresc = 0; premissas.spread = 2; premissas.horizonte = 6; ir({}); } });
  const grade = el("div", { class: "sim-grade" },
    campo("Saldo inicial (R$)", "saldo", 1000, saldo ? `saldo informado em ${dataBR(saldo.data)}${saldo.aproximado ? ", aproximado" : ""}` : "sem saldo informado, ajuste"),
    campo("Receita mensal (R$)", "rec", 1000, `média de ${ms.length} meses`),
    campo("Margem de contribuição", "mc", 0.5, "média do mesmo período", "%"),
    campo("Despesas operacionais (R$/mês)", "desp", 500, "sem rendimentos financeiros"),
    campo("Investimento (R$/mês)", "inv", 500, "média da janela"),
    campo("Crescimento mensal da receita", "cresc", 0.5, "cenário base", "%"),
    campo("Distância entre cenários", "spread", 0.5, "conservador −, otimista +", "p.p."),
    campo("Meses projetados", "horizonte", 1, "de 3 a 12"));
  caixa.append(grade, rest, resumo, grafico);
  desenhar();
  return caixa;
}
