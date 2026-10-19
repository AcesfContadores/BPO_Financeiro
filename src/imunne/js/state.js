// Estado do painel, sincronizado com o hash da URL (funciona no GitHub Pages e permite compartilhar a visão exata).
// Formato: #/pagina?e=empresa&m=AAAA-MM&c=prev|avg&n=4&d=cod1~cod2
export const PAGINAS = ["resumo", "receitas", "custos", "margem", "caixa", "dados"];
let HASHV = "";
const SUBS = new Set();
export function onRota(f) { SUBS.add(f); }
function avisar() { for (const f of SUBS) f(); }
export const S = { page: "resumo", emp: "grupo", mes: null, cmp: "prev", n: 4, d: null, P: null };

export function lerHash() {
  const h = HASHV.replace(/^#\/?/, "");
  const [rota, qs = ""] = h.split("?");
  const q = new URLSearchParams(qs);
  const page = PAGINAS.includes(rota) || rota === "comparativo" ? rota : "resumo";
  const patch = { page };
  if (q.get("e")) patch.emp = q.get("e");
  if (q.get("m")) patch.mes = q.get("m");
  if (q.get("c")) patch.cmp = q.get("c") === "avg" ? "avg" : "prev";
  if (q.get("n")) patch.n = Math.max(2, Math.min(12, parseInt(q.get("n"), 10) || 4));
  patch.d = q.get("d") || null;
  return patch;
}

export function paraHash(s = S) {
  const q = new URLSearchParams();
  q.set("e", s.emp);
  if (s.mes) q.set("m", s.mes);
  if (s.cmp !== "prev") q.set("c", s.cmp);
  if (s.n !== 4) q.set("n", String(s.n));
  if (s.d) q.set("d", s.d);
  return `#/${s.page}?${q}`;
}

export function ir(patch) {
  Object.assign(S, patch);
  HASHV = paraHash(S);
  avisar();
}
export function setHash(h) { HASHV = h; avisar(); }
