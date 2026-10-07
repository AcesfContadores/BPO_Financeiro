// Modelo analítico: transforma o JSON do banco em árvores de contas, métricas, variações, ponte e alertas.
// Convenção de sinais (igual ao banco): receita positiva; custo, despesa, investimento e financiamento negativos.
import { v as valorConta, janela, media, soma } from "./api.js";

export const EMP = {
  prontomed: { id: "prontomed", nome: "Clínica Prontomed", curto: "Prontomed", cor: "var(--emp-prontomed)" },
  multidisciplinar: { id: "multidisciplinar", nome: "Clínica Multidisciplinar", curto: "Multidisciplinar", cor: "var(--emp-multidisciplinar)" },
  grupo: { id: "grupo", nome: "Grupo Prontomed", curto: "Grupo", cor: "var(--emp-grupo)" },
};
export const EMPRESAS_REAIS = ["prontomed", "multidisciplinar"];

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGOS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const mesCurto = (m) => `${MESES[+m.slice(5, 7) - 1]}/${m.slice(2, 4)}`;
export const mesLongo = (m) => `${MESES_LONGOS[+m.slice(5, 7) - 1]} de ${m.slice(0, 4)}`;
export const mesNome = (m) => MESES_LONGOS[+m.slice(5, 7) - 1];
export const mesAbrev = (m) => MESES[+m.slice(5, 7) - 1];

// ───────────────────────── árvore de contas por empresa ─────────────────────────
const cacheArvore = new Map();
export function arvore(P, emp) {
  if (cacheArvore.has(P) === false) cacheArvore.set(P, {});
  const c = cacheArvore.get(P);
  if (c[emp]) return c[emp];
  const emps = emp === "grupo" ? EMPRESAS_REAIS : [emp];
  const comValor = new Set();
  for (const e of emps) for (const meses of Object.values(P.valor[e] ?? {})) for (const cod of Object.keys(meses)) comValor.add(cod);
  const nos = new Map();
  const mk = (cod) => {
    const k = P.contas.get(cod);
    return { codigo: cod, nome: k.nome, grupo: k.grupo, pai: k.pai, subtotal: k.subtotal, ordem: k.ordem, incluirDre: k.incluir_dre, naoOperacional: !!k.nao_operacional, filhos: [] };
  };
  for (const k of P.raw.contas) {
    if (!k.subtotal && comValor.has(k.codigo)) {
      let cur = k;
      while (cur) {
        if (!nos.has(cur.codigo)) nos.set(cur.codigo, mk(cur.codigo));
        cur = cur.pai ? P.contas.get(cur.pai) : null;
      }
    }
  }
  for (const n of nos.values()) if (n.pai && nos.has(n.pai)) nos.get(n.pai).filhos.push(n);
  for (const n of nos.values()) n.filhos.sort((a, b) => a.ordem - b.ordem);
  const raizes = [...nos.values()].filter((n) => !n.pai || !nos.has(n.pai)).sort((a, b) => a.ordem - b.ordem);
  const res = { nos, raizes };
  c[emp] = res;
  return res;
}

export function folhas(no) {
  return no.filhos.length ? no.filhos.flatMap(folhas) : [no];
}

// valor de um nó (folha ou subtotal) em um mês; `emp` pode ser 'grupo'
export function valorNo(P, emp, mes, no) {
  const cod = typeof no === "string" ? no : no.codigo;
  if (emp === "grupo") return EMPRESAS_REAIS.reduce((s, e) => s + valorNo(P, e, mes, cod), 0);
  return valorConta(P, emp, mes, cod);
}

export function fontesNo(P, emp, mes, no) {
  const emps = emp === "grupo" ? EMPRESAS_REAIS : [emp];
  const set = new Set();
  for (const f of folhas(no)) for (const e of emps) { const s = P.fonte[e]?.[mes]?.[f.codigo]; if (s) set.add(s); }
  return [...set];
}

// ───────────────────────── métricas do DRE por mês ─────────────────────────
const CAMPOS = ["receita", "custos", "despesas_e_outras", "rendimentos_financeiros", "investimentos", "financiamentos", "margem_contribuicao", "resultado_operacional", "resultado_sem_rendimentos", "despesas_fixas", "variacao_caixa"];
export function metricas(P, emp, mes) {
  const base = (e) => P.dre[e]?.[mes];
  let r;
  if (emp === "grupo") {
    const rows = EMPRESAS_REAIS.map(base);
    if (rows.some((x) => !x)) return null;
    r = {};
    for (const c of CAMPOS) r[c] = soma(rows.map((x) => Number(x[c])));
  } else {
    const x = base(emp);
    if (!x) return null;
    r = {};
    for (const c of CAMPOS) r[c] = Number(x[c]);
  }
  const m = {
    mes,
    receita: r.receita,
    custos: r.custos,
    mc: r.margem_contribuicao,
    mcPct: r.receita ? (100 * r.margem_contribuicao) / r.receita : 0,
    despesas: r.despesas_e_outras,
    rend: r.rendimentos_financeiros,
    resultado: r.resultado_operacional,
    resultadoAj: r.resultado_sem_rendimentos,
    margemOp: r.receita ? (100 * r.resultado_operacional) / r.receita : 0,
    margemOpAj: r.receita ? (100 * r.resultado_sem_rendimentos) / r.receita : 0,
    invest: r.investimentos,
    financ: r.financiamentos,
    caixa: r.variacao_caixa,
    fixas: r.despesas_fixas,
  };
  m.pe = m.mcPct > 0 ? m.fixas / (m.mcPct / 100) : null;
  m.folga = m.pe != null && m.receita ? (100 * (m.receita - m.pe)) / m.receita : null;
  return m;
}

// Janela de meses até `mes` (inclusive), limitada pelos meses que existem
export function mesesJanela(P, mes, n) {
  return janela(P, mes, n);
}
export function mesAnterior(P, mes) {
  const i = P.meses.indexOf(mes);
  return i > 0 ? P.meses[i - 1] : null;
}
export function mesesBase(P, mes, modo) {
  const i = P.meses.indexOf(mes);
  if (modo === "avg") return P.meses.slice(Math.max(0, i - 3), i);
  return i > 0 ? [P.meses[i - 1]] : [];
}

// ───────────────────────── variação e semântica de cor ─────────────────────────
// "magnitude": para custos/despesas (negativos) a variação % é medida sobre o valor absoluto,
// como nas tabelas dos prompts (custo que cresce = +%).
export function variacao(cur, base, algebrico = false) {
  if (base == null || base === 0) return { abs: base == null ? null : cur - base, pct: null, novo: base === 0 && cur !== 0 };
  const pct = algebrico ? ((cur - base) / Math.abs(base)) * 100 : ((Math.abs(cur) - Math.abs(base)) / Math.abs(base)) * 100;
  return { abs: cur - base, pct, novo: false };
}
// Retorna 'bom' | 'ruim' | 'neutro' para uma variação.
export function julgamento(grupo, cur, base, limiar = 3) {
  const { abs, pct } = variacao(cur, base, grupo === "receita");
  if (abs == null) return "neutro";
  if (pct != null && Math.abs(pct) < limiar) return "neutro";
  if (abs === 0) return "neutro";
  if (grupo === "investimento" || grupo === "financiamento") return "neutro";
  // valores assinados: aumento algébrico é sempre melhor (receita sobe, custo "menos negativo")
  return abs > 0 ? "bom" : "ruim";
}
export function baseNo(P, emp, no, mes, modo) {
  const ms = mesesBase(P, mes, modo);
  if (!ms.length) return null;
  return media(ms.map((m) => valorNo(P, emp, m, no)));
}

// ───────────────────────── ponte do resultado (cascata) ─────────────────────────
// Degraus = nós raiz de receita/custo/despesa (incluídos no DRE). Os menores viram "Demais itens".
export function ponte(P, emp, mesA, mesB, maxPassos = 7) {
  const mA = metricas(P, emp, mesA), mB = metricas(P, emp, mesB);
  if (!mA || !mB) return null;
  const { raizes } = arvore(P, emp);
  const itens = raizes
    .filter((n) => ["receita", "custo", "despesa"].includes(n.grupo) && n.incluirDre)
    .map((n) => ({ id: n.codigo, nome: n.nome, grupo: n.grupo, delta: valorNo(P, emp, mesB, n) - valorNo(P, emp, mesA, n) }))
    .filter((i) => Math.abs(i.delta) >= 0.5);
  itens.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const top = itens.slice(0, maxPassos - 1);
  const resto = itens.slice(maxPassos - 1);
  const somaTop = soma(top.map((i) => i.delta));
  const demaisDelta = mB.resultado - mA.resultado - somaTop;
  const passos = [{ tipo: "total", nome: `Resultado ${mesAbrev(mesA)}`, val: mA.resultado }];
  // ordem estável: receitas, custos, despesas; dentro de cada grupo por tamanho
  const ordemGrupo = { receita: 0, custo: 1, despesa: 2 };
  top.sort((a, b) => ordemGrupo[a.grupo] - ordemGrupo[b.grupo] || Math.abs(b.delta) - Math.abs(a.delta));
  for (const i of top) passos.push({ tipo: "delta", id: i.id, nome: i.nome, val: i.delta, grupo: i.grupo });
  if (Math.abs(demaisDelta) >= 0.5 || resto.length) passos.push({ tipo: "delta", id: "__demais", nome: "Demais itens", val: demaisDelta, itens: resto });
  passos.push({ tipo: "total", nome: `Resultado ${mesAbrev(mesB)}`, val: mB.resultado });
  return { passos, variacaoTotal: mB.resultado - mA.resultado };
}

// ───────────────────────── maiores movimentos (folhas) ─────────────────────────
export function movimentos(P, emp, mes, modo) {
  const { nos } = arvore(P, emp);
  const out = [];
  for (const n of nos.values()) {
    if (n.filhos.length) continue;
    if (!n.incluirDre || !["receita", "custo", "despesa"].includes(n.grupo)) continue;
    const cur = valorNo(P, emp, mes, n);
    const base = baseNo(P, emp, n, mes, modo);
    if (base == null) continue;
    out.push({ no: n, cur, base, delta: cur - base, ...variacao(cur, base) });
  }
  return out;
}

// ───────────────────────── alertas automáticos (só fatos dos números) ─────────────────────────
export function alertas(P, emp, mes) {
  const out = [];
  const m = metricas(P, emp, mes);
  const ant = mesAnterior(P, mes);
  const mp = ant ? metricas(P, emp, ant) : null;
  if (!m) return out;
  const R = (x) => `R$ ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Math.round(Math.abs(x)))}`;
  const pp = (x) => `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(x)}`;

  if (Math.abs(m.rend) > 0.2 * Math.abs(m.resultado) && Math.abs(m.rend) > 1000) {
    out.push({ nivel: "atencao", titulo: "Resultado inclui rendimentos financeiros", texto: `${R(m.rend)} do resultado vêm de rendimentos (fora da operação). Sem eles: ${R(m.resultadoAj)} (${pp(m.margemOpAj)}% da receita).`, no: "des_rendimentos_fin" });
  }
  if (mp && m.mcPct - mp.mcPct <= -3) {
    out.push({ nivel: "ruim", titulo: "Margem de contribuição em queda", texto: `Caiu ${pp(Math.abs(m.mcPct - mp.mcPct))} p.p. em relação a ${mesAbrev(ant)} (de ${pp(mp.mcPct)}% para ${pp(m.mcPct)}%).`, no: "__custos" });
  }
  // contas recorrentes que zeraram
  const { nos } = arvore(P, emp);
  const jan = mesesJanela(P, mes, 6);
  const anteriores = jan.slice(0, -1);
  const zeradas = [];
  for (const n of nos.values()) {
    if (n.filhos.length || !n.incluirDre || !["receita", "custo", "despesa"].includes(n.grupo)) continue;
    const cur = valorNo(P, emp, mes, n);
    const nz = anteriores.filter((x) => Math.abs(valorNo(P, emp, x, n)) > 0).length;
    if (cur === 0 && nz >= 2) {
      const ultimo = soma(anteriores.map((x) => Math.abs(valorNo(P, emp, x, n)))) / nz;
      zeradas.push({ n, ultimo });
    }
  }
  zeradas.sort((a, b) => b.ultimo - a.ultimo);
  for (const z of zeradas.slice(0, 3)) {
    out.push({ nivel: "atencao", titulo: `${z.n.nome} sem lançamento no mês`, texto: `Média anterior de ${R(z.ultimo)}. Confirmar com a gestão se foi encerrado ou lançado em outra conta.`, no: z.n.codigo });
  }
  // grandes variações
  const mov = movimentos(P, emp, mes, "prev").filter((x) => x.pct != null && Math.abs(x.pct) > 30 && Math.abs(x.delta) >= 2000 && Math.abs(x.base) >= 1000);
  mov.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  for (const x of mov.slice(0, 3)) {
    const bom = julgamento(x.no.grupo, x.cur, x.base);
    out.push({ nivel: bom === "bom" ? "info" : "ruim", titulo: `${x.no.nome}: ${x.pct > 0 ? "+" : ""}${pp(x.pct)}% vs mês anterior`, texto: `${R(x.base)} → ${R(x.cur)}. Causa a confirmar com a gestão.`, no: x.no.codigo });
  }
  // despesas a identificar
  const ident = nos.get("des_a_identificar");
  if (ident) {
    const vi = valorNo(P, emp, mes, ident);
    if (vi !== 0) out.push({ nivel: "atencao", titulo: "Despesas a identificar", texto: `${R(vi)} no mês (${pp((100 * Math.abs(vi)) / m.receita)}% da receita) sem classificação.`, no: "des_a_identificar" });
  }
  // receita não recorrente
  const outras = nos.get("mu_rec_outras");
  if (outras) {
    const vo = valorNo(P, emp, mes, outras);
    if (vo > 0.1 * m.receita) out.push({ nivel: "atencao", titulo: "Outras receitas operacionais relevantes", texto: `${R(vo)} (${pp((100 * vo) / m.receita)}% da receita). Origem a confirmar. Sem elas, resultado de ${R(m.resultado - vo)}.`, no: "mu_rec_outras" });
  }
  // fonte dos números
  const fontes = new Set();
  for (const e of emp === "grupo" ? EMPRESAS_REAIS : [emp]) for (const f of Object.values(P.fonte[e]?.[mes] ?? {})) fontes.add(f);
  if (fontes.has("nibo") || fontes.has("manual")) out.push({ nivel: "info", titulo: "Parte dos valores vem do Nibo ou de ajuste manual", texto: "Os demais seguem a planilha do painel realizado.", no: null });
  return out;
}

// ───────────────────────── caixa ─────────────────────────
export function saldoOficial(P, emp, ateData) {
  const emps = emp === "grupo" ? EMPRESAS_REAIS : [emp];
  const pts = emps.map((e) => P.raw.empresas[e].caixa.filter((c) => c.data <= ateData).at(-1) ?? null);
  if (pts.some((p) => !p)) return null;
  return { saldo: soma(pts.map((p) => Number(p.saldo))), aproximado: pts.some((p) => p.aproximado), data: pts.map((p) => p.data).sort().at(-1), pontos: pts };
}
export function fimDoMes(mes) {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
}
