// Camada de dados do painel (sem dependências). Busca tudo numa chamada e oferece helpers de leitura.
import { CONFIG } from "./config.js";

let RAW = null;
export function definirDados(r) { RAW = r; }
export async function carregarPainel() {
  return indexar(RAW);
}

// Cria índices: valor[empresa][competencia 'YYYY-MM'][conta] = número
function indexar(raw) {
  const contas = new Map(raw.contas.map((c) => [c.codigo, c]));
  const filhos = new Map();
  for (const c of raw.contas) if (c.pai) (filhos.get(c.pai) ?? filhos.set(c.pai, []).get(c.pai)).push(c.codigo);
  const valor = {};
  const fonte = {};
  const dre = {};
  for (const [emp, d] of Object.entries(raw.empresas)) {
    valor[emp] = {};
    fonte[emp] = {};
    for (const v of d.valores) {
      const mes = v.competencia.slice(0, 7);
      (valor[emp][mes] ??= {})[v.conta] = Number(v.valor);
      (fonte[emp][mes] ??= {})[v.conta] = v.fonte;
    }
    dre[emp] = {};
    for (const l of d.dre) dre[emp][l.competencia.slice(0, 7)] = l; // linhas já calculadas pelo banco
  }
  const meses = [...new Set(Object.values(raw.empresas).flatMap((d) => d.dre.map((l) => l.competencia.slice(0, 7))))].sort();
  return { raw, contas, filhos, valor, fonte, dre, meses, empresas: Object.keys(raw.empresas) };
}

// Valor de uma conta (folha ou subtotal) em um mês. Subtotal = soma dos filhos.
export function v(P, emp, mes, codigo) {
  const c = P.contas.get(codigo);
  if (c?.subtotal) return (P.filhos.get(codigo) ?? []).reduce((s, f) => s + v(P, emp, mes, f), 0);
  return P.valor[emp]?.[mes]?.[codigo] ?? 0;
}

// Série dos N últimos meses terminando em `mesAtual` (inclusive).
export function janela(P, mesAtual, n = CONFIG.MESES_JANELA) {
  const i = P.meses.indexOf(mesAtual);
  return P.meses.slice(Math.max(0, i - n + 1), i + 1);
}

export const soma = (a) => a.reduce((s, x) => s + x, 0);
export const media = (a) => (a.length ? soma(a) / a.length : 0);

// Variação percentual; null quando a base é zero (mostrar "—").
export const varPct = (atual, base) => (base ? ((atual - base) / Math.abs(base)) * 100 : null);

// Formatação pt-BR
const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const fInt = (n) => nf0.format(Math.round(n));
export const fMil = (n) => `R$ ${nf1.format(n / 1000)} mil`; // destaques: R$ 274,5 mil
export const fPct = (n) => (n == null ? "—" : `${n > 0 ? "+" : ""}${nf1.format(n)}%`);
export const fPct1 = (n) => `${nf1.format(n)}%`;
export const fPP = (n) => `${n > 0 ? "+" : ""}${nf1.format(n)} p.p.`;
