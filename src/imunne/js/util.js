// Utilidades de DOM, formatação e tooltip. Textos vindos de dados sempre entram via textContent.
import { fInt } from "./api.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const SVG_TAGS = new Set(["svg", "g", "path", "line", "rect", "circle", "text", "tspan", "title", "defs", "clipPath", "linearGradient", "stop", "polyline"]);

export function el(tag, attrs = {}, ...filhos) {
  const n = SVG_TAGS.has(tag) ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k === "class") n.setAttribute("class", v);
    else if (k === "style" && typeof v === "object") Object.assign(n.style, v);
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "text") n.textContent = v;
    else if ((k === "fill" || k === "stroke" || k === "stop-color") && typeof v === "string" && v.startsWith("var(")) n.style.setProperty(k, v);
    else n.setAttribute(k, v === true ? "" : v);
  }
  for (const f of filhos.flat()) {
    if (f == null || f === false) continue;
    n.append(f.nodeType ? f : document.createTextNode(String(f)));
  }
  return n;
}

export const limpar = (n) => { while (n.firstChild) n.removeChild(n.firstChild); return n; };

// ───────── formatação pt-BR ─────────
const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
export const fR = (n) => `${n < 0 ? "−" : ""}R$ ${nf0.format(Math.abs(Math.round(n)))}`;
export const fRsig = (n) => (Math.round(n) === 0 ? "R$ 0" : `${n > 0 ? "+" : "−"}R$ ${nf0.format(Math.abs(Math.round(n)))}`);
export const fMilAbs = (n) => `${n < 0 ? "−" : ""}R$ ${nf1.format(Math.abs(n) / 1000)} mil`;
export const fMilSig = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}R$ ${nf1.format(Math.abs(n) / 1000)} mil`;
export const fN = (n) => (n < 0 ? "−" : "") + nf0.format(Math.abs(Math.round(n)));
export const fP = (n) => (n == null ? "—" : `${nf1.format(n)}%`);
export const fPsig = (n) => (n == null ? "—" : Math.abs(n) > 999 ? `${n > 0 ? "+" : "−"}999%+` : `${n > 0 ? "+" : n < 0 ? "−" : ""}${nf1.format(Math.abs(n))}%`);
export const fPP = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${nf1.format(Math.abs(n))} p.p.`;
export const compacto = (n) => {
  const a = Math.abs(n);
  if (a >= 1e6) return `${nf1.format(n / 1e6)} mi`;
  if (a >= 1e3) return `${nf0.format(n / 1e3)} mil`;
  return nf0.format(n);
};
export { fInt };

// Eixo "bonito": ticks redondos entre min e max
export function ticks(min, max, alvo = 4) {
  if (min === max) { max = min + 1; }
  const span = max - min;
  const bruto = span / alvo;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const f = bruto / mag;
  const passo = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
  const ini = Math.floor(min / passo) * passo;
  const fim = Math.ceil(max / passo) * passo;
  const t = [];
  for (let x = ini; x <= fim + passo / 2; x += passo) t.push(Math.round(x * 1e6) / 1e6);
  return t;
}

// ───────── desenho responsivo ─────────
export function responsivo(container, desenhar) {
  // um único observador por contêiner; chamar de novo troca a função de desenho e redesenha
  container.__desenhar = desenhar;
  container.__ultima = -1;
  const run = () => {
    const w = Math.floor(container.clientWidth);
    if (w < 40 || w === container.__ultima) return;
    container.__ultima = w;
    limpar(container);
    container.append(container.__desenhar(w));
  };
  if (!container.__ro) { container.__ro = new ResizeObserver(() => run()); container.__ro.observe(container); }
  run();
  return container;
}

// ───────── tooltip único ─────────
let tip;
function garantirTip() {
  if (!tip) {
    tip = el("div", { class: "tip", role: "tooltip", "aria-hidden": "true" });
    document.body.append(tip);
  }
  return tip;
}
export function mostrarTip(ev, linhas, titulo) {
  const t = garantirTip();
  limpar(t);
  if (titulo) t.append(el("div", { class: "tip-t", text: titulo }));
  for (const l of linhas) {
    t.append(el("div", { class: "tip-l" },
      l.cor ? el("span", { class: "tip-k", style: { background: l.cor } }) : null,
      el("span", { class: "tip-v", text: l.valor }),
      el("span", { class: "tip-n", text: l.nome ?? "" })));
  }
  t.style.opacity = "1";
  const x = ev.clientX ?? 0, y = ev.clientY ?? 0;
  const w = t.offsetWidth, h = t.offsetHeight;
  let left = x + 14, top = y - h - 12;
  if (left + w > window.innerWidth - 8) left = x - w - 14;
  if (top < 8) top = y + 18;
  t.style.left = `${Math.max(8, left)}px`;
  t.style.top = `${top}px`;
}
export function esconderTip() { if (tip) tip.style.opacity = "0"; }

// Liga tooltip a um elemento (mouse, toque e foco por teclado)
export function comTip(no, gerar) {
  const mostrar = (ev) => {
    const g = gerar(ev);
    if (!g) return;
    let e = ev;
    if (ev.type === "focus") {
      const r = no.getBoundingClientRect();
      e = { clientX: r.left + r.width / 2, clientY: r.top };
    }
    mostrarTip(e, g.linhas, g.titulo);
  };
  no.addEventListener("pointermove", mostrar);
  no.addEventListener("pointerenter", mostrar);
  no.addEventListener("pointerleave", esconderTip);
  no.addEventListener("focus", mostrar);
  no.addEventListener("blur", esconderTip);
  return no;
}

export function baixarCSV(nome, linhas) {
  const esc = (c) => { const s = String(c ?? ""); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = "﻿" + linhas.map((l) => l.map(esc).join(";")).join("\n");
  const a = el("a", { href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })), download: nome });
  document.body.append(a); a.click(); a.remove();
}
