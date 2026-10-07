// Margem e ponto de equilíbrio: onde a operação ganha dinheiro, quanto falta para empatar e o que muda se algo variar.
import { el, responsivo, fMilAbs, fMilSig, fR, fP, fPP } from "../util.js";
import { colunas, linhas, barrasH, bullet, legenda } from "../charts.js";
import { S, ir } from "../state.js";
import { metricas, mesesJanela, mesCurto, arvore, valorNo, EMP } from "../model.js";
import { ESPECIALIDADES, raizesPorGrupo } from "../linhas-negocio.js";
import { secao, tile, rotuloBase, blocoRosca } from "../ui.js";
import { media } from "../api.js";

const sim = { dr: 0, dc: 0, dd: 0 };

export function renderMargem(P, raiz) {
  const emp = S.emp, mes = S.mes;
  const m = metricas(P, emp, mes);
  if (!m) { raiz.append(el("p", { class: "vazio", text: "Sem dados para este mês." })); return; }
  const meses = mesesJanela(P, mes, Math.max(S.n, 4));
  const longa = mesesJanela(P, mes, 12);
  const M = (x) => metricas(P, emp, x);
  const peMedio = media(meses.map((x) => M(x)?.pe).filter((x) => x != null));

  // tiles
  const i = P.meses.indexOf(mes);
  const ant = i > 0 ? M(P.meses[i - 1]) : null;
  const dd = (a, b) => (b == null ? null : a - b);
  const dpp = (d) => (d == null ? null : { texto: fPP(d), julg: Math.abs(d) < 0.5 ? "neutro" : d > 0 ? "bom" : "ruim", dir: d > 0 ? 1 : d < 0 ? -1 : 0 });
  raiz.append(el("div", { class: "tiles quatro" },
    tile({ rotulo: "Margem de contribuição", valor: fP(m.mcPct), sub: fMilAbs(m.mc), delta: dpp(dd(m.mcPct, ant?.mcPct)), spark: { vals: meses.map((x) => M(x)?.mcPct ?? 0), titulo: "margem de contribuição" }, onClick: () => ir({ page: "custos" }) }),
    tile({ rotulo: "Margem operacional", valor: fP(m.margemOp), sub: m.rend ? `${fP(m.margemOpAj)} sem rendimentos` : "", delta: dpp(dd(m.margemOp, ant?.margemOp)), spark: { vals: meses.map((x) => M(x)?.margemOp ?? 0), titulo: "margem operacional" } }),
    tile({ rotulo: "Despesas fixas", valor: fMilAbs(Math.abs(m.fixas)), sub: `${fP(m.receita ? (100 * Math.abs(m.fixas)) / m.receita : 0)} da receita`, spark: { vals: meses.map((x) => Math.abs(M(x)?.fixas ?? 0)), titulo: "despesas fixas" } }),
    tile({ rotulo: "Folga sobre o ponto de equilíbrio", valor: m.folga == null ? "—" : fP(m.folga), sub: m.pe ? `equilíbrio em ${fMilAbs(m.pe)}` : "", delta: dpp(dd(m.folga ?? 0, ant?.folga ?? null)), spark: { vals: meses.map((x) => M(x)?.folga ?? 0), titulo: "folga" } }),
  ));

  // bullet + série de margens
  const gB = el("div", { class: "grafico" });
  if (m.pe != null) responsivo(gB, (w) => bullet(w, { receita: m.receita, pe: m.pe, peMedio: Number.isFinite(peMedio) ? peMedio : null }));
  else gB.append(el("p", { class: "vazio", text: "Sem margem de contribuição positiva para calcular o ponto de equilíbrio." }));
  if (m.pe != null) gB.after = null;
  const gM = el("div", { class: "grafico" });
  responsivo(gM, (w) => linhas(w, { cats: longa.map(mesCurto), h: 250, fmt: fP, yFmt: (v) => `${Math.round(v)}%`, linhaZero: true, nota: "margens",
    series: [{ id: "mc", nome: "Contribuição", cor: "var(--navy-barra)", vals: longa.map((x) => M(x)?.mcPct ?? null) }, { id: "mo", nome: "Operacional", cor: "var(--emp)", vals: longa.map((x) => M(x)?.margemOp ?? null) }] }));
  raiz.append(el("div", { class: "duas igual" },
    secao("Receita contra o ponto de equilíbrio", "Ponto de equilíbrio = despesas fixas ÷ margem de contribuição. Abaixo dele, a empresa perde dinheiro; acima, sobra resultado.", gB,
      m.pe != null ? el("ul", { class: "fatos" },
        el("li", { text: `A receita está ${fMilAbs(m.receita - m.pe)} acima do equilíbrio do mês (${fP(m.folga)} de folga).` }),
        el("li", { text: `Cada R$ 1 de receita deixa ${(m.mcPct / 100).toFixed(2).replace(".", ",")} para cobrir despesas fixas de ${fMilAbs(Math.abs(m.fixas))}.` }),
        Number.isFinite(peMedio) ? el("li", { text: `O equilíbrio médio da janela é ${fMilAbs(peMedio)}; ele varia porque a margem de contribuição varia mês a mês.` }) : null) : null),
    secao("Margens ao longo do tempo", "Contribuição é o que sobra após custos diretos; operacional é o que sobra depois das despesas.", gM)));

  // receita contra equilíbrio e resultado, em R$
  const gPE = el("div", { class: "grafico" });
  responsivo(gPE, (w) => linhas(w, { cats: longa.map(mesCurto), h: 250, nota: "receita e ponto de equilíbrio",
    series: [{ id: "r", nome: "Receita", cor: "var(--emp)", vals: longa.map((x) => M(x)?.receita ?? null) }, { id: "p", nome: "Equilíbrio", cor: "var(--ruim)", tracejado: true, vals: longa.map((x) => M(x)?.pe ?? null) }, { id: "f", nome: "Despesas fixas", cor: "var(--dourado)", vals: longa.map((x) => (M(x) ? Math.abs(M(x).fixas) : null)) }] }));
  raiz.append(secao("Receita contra o equilíbrio, mês a mês", "Enquanto a linha da receita estiver acima da tracejada, a operação cobre as despesas fixas.", gPE));

  // simulador
  raiz.append(secao("Simulador: e se…?", "Simulação com premissas suas, a partir dos números do mês. Não é projeção nem meta oficial.", simulador(P, m)));

  // custo por real de receita
  const R = raizesPorGrupo(P, emp, "custo", mes);
  const gC = el("div", { class: "grafico" });
  const fat = [...R.map((r) => ({ id: r.id, nome: r.nome, cor: r.cor, val: Math.abs(valorNo(P, emp, mes, r.no)) })), { id: "__mc", nome: "Margem de contribuição", cor: "var(--bom)", val: Math.max(0, m.mc) }];
  raiz.append(blocoRosca("Receita dividida entre custos diretos e margem", "A fatia verde é o que sobra de cada real de receita depois dos custos diretos.", fat, { centro: { titulo: "receita", valor: fMilAbs(m.receita) }, nota: "receita entre custos e margem", onClick: (it) => (it.id === "__mc" ? null : ir({ page: "custos", d: it.id })) }));
  const itens = R.map((r) => ({ id: r.id, nome: r.nome, val: m.receita ? (100 * Math.abs(valorNo(P, emp, mes, r.no))) / m.receita : 0, cor: r.cor, rot: "" })).filter((x) => x.val > 0.05);
  itens.forEach((x) => (x.rot = fP(x.val)));
  responsivo(gC, (w) => barrasH(w, { itens, fmt: fP, onClick: (it) => ir({ page: "custos", d: it.id }), linha: 28, rotuloLargura: Math.min(240, w * 0.4) }));
  raiz.append(secao("Para onde vai cada R$ 100 de receita", `Custos diretos por grupo como % da receita. Sobram ${fP(m.mcPct)} de margem de contribuição.`, gC));

  // repasse por especialidade (Multidisciplinar)
  const emps = emp === "grupo" ? ["multidisciplinar"] : [emp];
  if (emps.includes("multidisciplinar")) {
    const nos = arvore(P, "multidisciplinar").nos;
    const esp = ESPECIALIDADES.filter((e) => nos.has(e.id));
    if (esp.length) {
      const g = el("div", { class: "grafico" }), leg = el("div");
      const ativos = new Set(esp.map((e) => e.id));
      const des = () => responsivo(g, (w) => colunas(w, { cats: meses.map(mesCurto), h: 270, nota: "repasse por especialidade", onClick: (id) => ir({ emp: "multidisciplinar", d: id }),
        series: esp.map((e) => ({ id: e.id, nome: e.nome, cor: e.cor, vals: meses.map((x) => (ativos.has(e.id) ? Math.abs(valorNo(P, "multidisciplinar", x, e.id)) : 0)) })) }));
      const mont = () => leg.replaceChildren(legenda(esp, { ativos, onToggle: (id) => { if (ativos.has(id) && ativos.size === 1) return; ativos.has(id) ? ativos.delete(id) : ativos.add(id); mont(); des(); } }));
      mont(); des();
      const recMu = metricas(P, "multidisciplinar", mes)?.receita || 0;
      const totRep = esp.reduce((s, e) => s + Math.abs(valorNo(P, "multidisciplinar", mes, e.id)), 0);
      raiz.append(secao("Repasse por especialidade (Multidisciplinar)", `No mês o repasse soma ${fMilAbs(totRep)}, ${fP(recMu ? (100 * totRep) / recMu : 0)} da receita da empresa.`, leg, g));
    }
  }
}

function simulador(P, m) {
  const caixa = el("div", { class: "sim" });
  const linhaSlider = (rot, chave, min, max, passo, dica) => {
    const saida = el("output", { class: "sim-v" });
    const inp = el("input", { type: "range", min, max, step: passo, value: sim[chave], "aria-label": rot });
    inp.addEventListener("input", () => { sim[chave] = Number(inp.value); atualizar(); });
    const f = el("label", { class: "sim-c" }, el("span", { class: "sim-r", text: rot }), inp, saida, el("small", { class: "dim", text: dica }));
    f.__saida = saida; f.__chave = chave;
    return f;
  };
  const cs = [
    linhaSlider("Receita", "dr", -30, 30, 1, "variação sobre o mês; custos diretos acompanham"),
    linhaSlider("Eficiência nos custos diretos", "dc", -15, 15, 1, "mais = custo cai em % da receita"),
    linhaSlider("Despesas operacionais", "dd", -30, 30, 1, "variação em R$ das despesas fixas"),
  ];
  const res = el("div", { class: "sim-res", "aria-live": "polite" });
  const calc = () => {
    const rec = m.receita * (1 + sim.dr / 100);
    const custos = m.custos * (1 + sim.dr / 100) * (1 - sim.dc / 100);
    const mc = rec + custos;
    const despOp = (m.mc - m.resultadoAj); // despesas sem rendimentos (positivo)
    const desp = despOp * (1 + sim.dd / 100);
    const fixas = Math.abs(m.fixas) * (1 + sim.dd / 100);
    const resultado = mc - desp + m.rend;
    const mcPct = rec ? (100 * mc) / rec : 0;
    const pe = mcPct > 0 ? fixas / (mcPct / 100) : null;
    return { rec, mc, mcPct, resultado, margem: rec ? (100 * resultado) / rec : 0, pe, folga: pe != null && rec ? (100 * (rec - pe)) / rec : null };
  };
  const bloco = (rot, val, atual, fmt, bomSeSobe = true) => {
    const d = atual == null || val == null ? null : val - atual;
    const julg = d == null || Math.abs(d) < 1e-6 ? "neutro" : (d > 0) === bomSeSobe ? "bom" : "ruim";
    return el("div", { class: "sim-b" }, el("span", { class: "tile-r", text: rot }), el("span", { class: "tile-v", text: val == null ? "—" : fmt(val) }),
      el("span", { class: `delta ${julg}` }, d == null ? "—" : `${d > 0 ? "▲" : d < 0 ? "▼" : "■"} ${fmt === fP ? fPP(d) : fMilSig(d)} vs mês`));
  };
  const atualizar = () => {
    for (const c of cs) c.__saida.textContent = `${sim[c.__chave] > 0 ? "+" : sim[c.__chave] < 0 ? "−" : ""}${Math.abs(sim[c.__chave])}%`;
    const s = calc();
    res.replaceChildren(
      bloco("Resultado operacional", s.resultado, m.resultado, fMilAbs),
      bloco("Margem operacional", s.margem, m.margemOp, fP),
      bloco("Ponto de equilíbrio", s.pe, m.pe, fMilAbs, false),
      bloco("Folga sobre o equilíbrio", s.folga, m.folga, fP));
  };
  const zerar = el("button", { type: "button", class: "btn", text: "Voltar ao mês real", onClick: () => { sim.dr = sim.dc = sim.dd = 0; cs.forEach((c) => (c.querySelector("input").value = 0)); atualizar(); } });
  caixa.append(el("div", { class: "sim-ctrl" }, ...cs, zerar), res);
  atualizar();
  return caixa;
}
