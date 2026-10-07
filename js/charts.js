// Gráficos em SVG puro, sem dependências. Todos recebem a largura em pixels e devolvem um <svg>.
// Marcas finas, 2px de respiro entre segmentos, grade recessiva, tooltip por marca, foco por teclado.
import { el, ticks, compacto, comTip, fR, fMilAbs, fP } from "./util.js";

const EIXO = "var(--texto-3)";
const GRADE = "var(--grade)";
const TEXTO = "var(--texto-2)";
const FUNDO = "var(--painel)";

function vazio(w, h, msg = "Sem dados para este período") {
  const s = el("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": msg });
  s.append(el("text", { x: w / 2, y: h / 2, "text-anchor": "middle", fill: EIXO, "font-size": 13, text: msg }));
  return s;
}

// retângulo com cantos superiores arredondados (4px), base reta
function caminhoTopo(x, y, w, h, r = 4) {
  r = Math.min(r, w / 2, Math.max(h, 0));
  if (h <= 0) return "";
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}
function caminhoDireita(x, y, w, h, r = 4) {
  r = Math.min(r, h / 2, Math.max(w, 0));
  if (w <= 0) return "";
  return `M${x},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x} Z`;
}
function caminhoEsquerda(x, y, w, h, r = 4) {
  r = Math.min(r, h / 2, Math.max(w, 0));
  if (w <= 0) return "";
  return `M${x + w},${y} H${x + r} Q${x},${y} ${x},${y + r} V${y + h - r} Q${x},${y + h} ${x + r},${y + h} H${x + w} Z`;
}

// ───────────────────────── sparkline ─────────────────────────
export function sparkline(vals, { w = 110, h = 34, cor = "var(--navy)", titulo = "" } = {}) {
  const s = el("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": titulo || "tendência" });
  const n = vals.length;
  if (n < 2) return s;
  const mn = Math.min(...vals), mx = Math.max(...vals);
  const pad = 5;
  const X = (i) => pad + (i * (w - 2 * pad)) / (n - 1);
  const Y = (v) => (mx === mn ? h / 2 : h - pad - ((v - mn) / (mx - mn)) * (h - 2 * pad));
  s.append(el("path", { d: vals.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(""), fill: "none", stroke: cor, "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }));
  s.append(el("circle", { cx: X(n - 1), cy: Y(vals[n - 1]), r: 4, fill: cor, stroke: FUNDO, "stroke-width": 2 }));
  return s;
}

// ───────────────────────── colunas (agrupadas ou empilhadas) ─────────────────────────
// series: [{id, nome, cor, vals:[...]}]  (valores positivos; use magnitude para custos)
export function colunas(w, { cats, series, empilhado = true, h = 250, fmt = fR, onClick, ultimoCheio = true, mostrarTotal = true, nota = "", yFmt = compacto }) {
  const ativos = series.filter((s) => s.vals.some((v) => v));
  if (!cats.length || !ativos.length) return vazio(w, h);
  const m = { t: 22, r: 8, b: 28, l: 46 };
  const iw = w - m.l - m.r, ih = h - m.t - m.b;
  const totais = cats.map((_, i) => ativos.reduce((s, x) => s + (x.vals[i] || 0), 0));
  const maxV = empilhado ? Math.max(...totais) : Math.max(...ativos.flatMap((s) => s.vals));
  const tk = ticks(0, maxV, 4);
  const topo = tk.at(-1) || 1;
  const Y = (v) => m.t + ih - (v / topo) * ih;
  const svg = el("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": nota || "gráfico de colunas" });
  for (const t of tk) {
    svg.append(el("line", { x1: m.l, x2: w - m.r, y1: Y(t), y2: Y(t), stroke: GRADE, "stroke-width": 1 }));
    svg.append(el("text", { x: m.l - 8, y: Y(t) + 4, "text-anchor": "end", fill: EIXO, "font-size": 11, text: yFmt(t) }));
  }
  const slot = iw / cats.length;
  const nSer = ativos.length;
  const barW = empilhado ? Math.min(40, slot * 0.5) : Math.min(22, (slot * 0.7) / nSer);
  cats.forEach((c, i) => {
    const cx = m.l + slot * i + slot / 2;
    const ultimo = i === cats.length - 1;
    const op = ultimoCheio && !ultimo ? 0.62 : 1;
    svg.append(el("text", { x: cx, y: h - 8, "text-anchor": "middle", fill: ultimo ? "var(--texto)" : EIXO, "font-size": 11.5, "font-weight": ultimo ? 700 : 500, text: c }));
    if (empilhado) {
      let acc = 0;
      const vis = ativos.filter((s) => (s.vals[i] || 0) > 0);
      vis.forEach((s, k) => {
        const v = s.vals[i];
        const y1 = Y(acc + v), y0 = Y(acc);
        const gap = k === 0 ? 0 : 2;
        const hh = Math.max(0, y0 - y1 - gap);
        const topoSeg = k === vis.length - 1;
        const x = cx - barW / 2;
        const p = el("path", { d: topoSeg ? caminhoTopo(x, y1, barW, hh) : `M${x},${y1 + hh} V${y1} H${x + barW} V${y1 + hh} Z`, fill: s.cor, "fill-opacity": op, tabindex: 0, class: "marca", "aria-label": `${s.nome}, ${c}: ${fmt(v)}` });
        comTip(p, () => ({ titulo: c, linhas: [{ cor: s.cor, valor: fmt(v), nome: `${s.nome} · ${fP((100 * v) / totais[i])} do total` }] }));
        if (onClick) { p.style.cursor = "pointer"; p.addEventListener("click", () => onClick(s.id, i)); p.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(s.id, i); } }); }
        svg.append(p);
        acc += v;
      });
      if (mostrarTotal) svg.append(el("text", { x: cx, y: Y(totais[i]) - 6, "text-anchor": "middle", fill: "var(--texto)", "font-size": 11.5, "font-weight": ultimo ? 700 : 500, text: yFmt(totais[i]) }));
    } else {
      const gw = barW * nSer;
      ativos.forEach((s, k) => {
        const v = s.vals[i] || 0;
        const x = cx - gw / 2 + k * barW;
        const y1 = Y(v);
        const p = el("path", { d: caminhoTopo(x + 1, y1, barW - 2, Y(0) - y1), fill: s.cor, "fill-opacity": op, tabindex: 0, class: "marca", "aria-label": `${s.nome}, ${c}: ${fmt(v)}` });
        comTip(p, () => ({ titulo: c, linhas: [{ cor: s.cor, valor: fmt(v), nome: s.nome }] }));
        if (onClick) { p.style.cursor = "pointer"; p.addEventListener("click", () => onClick(s.id, i)); }
        svg.append(p);
        if (ultimo) svg.append(el("text", { x: x + barW / 2, y: y1 - 5, "text-anchor": "middle", fill: "var(--texto)", "font-size": 11, "font-weight": 700, text: yFmt(v) }));
      });
    }
  });
  return svg;
}

// ───────────────────────── linhas ─────────────────────────
export function linhas(w, { cats, series, h = 230, fmt = fR, yFmt = compacto, yMin = null, yMax = null, rotuloFinal = true, linhaZero = true, nota = "" }) {
  const ativos = series.filter((s) => s.vals.some((v) => v != null));
  if (cats.length < 2 || !ativos.length) return vazio(w, h);
  const direita = rotuloFinal && ativos.length <= 4 && w > 520 ? 156 : 14;
  const m = { t: 16, r: direita, b: 28, l: 50 };
  const iw = w - m.l - m.r, ih = h - m.t - m.b;
  const todos = ativos.flatMap((s) => s.vals.filter((v) => v != null));
  let mn = yMin ?? Math.min(0, ...todos), mx = yMax ?? Math.max(...todos);
  if (mn === mx) mx = mn + 1;
  const tk = ticks(mn, mx, 4);
  mn = tk[0]; mx = tk.at(-1);
  const X = (i) => m.l + (iw * i) / (cats.length - 1);
  const Y = (v) => m.t + ih - ((v - mn) / (mx - mn)) * ih;
  const svg = el("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": nota || "gráfico de linhas" });
  for (const t of tk) {
    svg.append(el("line", { x1: m.l, x2: w - m.r, y1: Y(t), y2: Y(t), stroke: t === 0 && linhaZero && mn < 0 ? EIXO : GRADE, "stroke-width": 1 }));
    svg.append(el("text", { x: m.l - 8, y: Y(t) + 4, "text-anchor": "end", fill: EIXO, "font-size": 11, text: yFmt(t) }));
  }
  const passoRot = Math.ceil(cats.length / Math.max(2, Math.floor(iw / 62)));
  cats.forEach((c, i) => { if (i % passoRot === 0 || i === cats.length - 1) svg.append(el("text", { x: X(i), y: h - 8, "text-anchor": i === 0 ? "start" : i === cats.length - 1 ? "end" : "middle", fill: i === cats.length - 1 ? "var(--texto)" : EIXO, "font-size": 11.5, "font-weight": i === cats.length - 1 ? 700 : 500, text: c })); });
  const rotulosFim = [];
  for (const s of ativos) {
    const pts = s.vals.map((v, i) => (v == null ? null : [X(i), Y(v)]));
    let d = "", pen = false;
    for (const p of pts) { if (!p) { pen = false; continue; } d += `${pen ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`; pen = true; }
    svg.append(el("path", { d, fill: "none", stroke: s.cor, "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": s.tracejado ? "5 4" : null }));
    if (cats.length <= 12) pts.forEach((p) => { if (p) svg.append(el("circle", { cx: p[0], cy: p[1], r: 3.5, fill: s.cor, stroke: FUNDO, "stroke-width": 2 })); });
    const ult = pts.map((p, i) => [p, i]).filter(([p]) => p).at(-1);
    if (ult) {
      svg.append(el("circle", { cx: ult[0][0], cy: ult[0][1], r: 5, fill: s.cor, stroke: FUNDO, "stroke-width": 2 }));
      if (direita > 20) rotulosFim.push({ y: ult[0][1], nome: s.nome, v: yFmt(s.vals[ult[1]]), cor: s.cor });
    }
  }
  rotulosFim.sort((a, b) => a.y - b.y);
  for (let i = 1; i < rotulosFim.length; i++) if (rotulosFim[i].y - rotulosFim[i - 1].y < 16) rotulosFim[i].y = rotulosFim[i - 1].y + 16;
  for (const r of rotulosFim) svg.append(el("text", { x: w - m.r + 10, y: r.y + 4, fill: "var(--texto)", "font-size": 11.5, "font-weight": 600 }, el("tspan", { text: r.nome.length > 17 ? r.nome.slice(0, 16) + "…" : r.nome }), el("tspan", { fill: EIXO, "font-weight": 500, dx: 4, text: r.v })));
  // crosshair: acha o X mais próximo
  const guia = el("line", { y1: m.t, y2: m.t + ih, stroke: EIXO, "stroke-width": 1, opacity: 0 });
  svg.append(guia);
  const hit = el("rect", { x: m.l, y: m.t, width: iw, height: ih, fill: "transparent", tabindex: 0, "aria-label": "valores por mês" });
  const idx = (ev) => { const r = svg.getBoundingClientRect(); const x = ev.clientX - r.left; return Math.max(0, Math.min(cats.length - 1, Math.round(((x - m.l) / iw) * (cats.length - 1)))); };
  comTip(hit, (ev) => {
    const i = ev.type === "focus" ? cats.length - 1 : idx(ev);
    guia.setAttribute("x1", X(i)); guia.setAttribute("x2", X(i)); guia.setAttribute("opacity", 1);
    return { titulo: cats[i], linhas: ativos.filter((s) => s.vals[i] != null).map((s) => ({ cor: s.cor, valor: fmt(s.vals[i]), nome: s.nome })) };
  });
  hit.addEventListener("pointerleave", () => guia.setAttribute("opacity", 0));
  svg.append(hit);
  return svg;
}

// ───────────────────────── cascata ─────────────────────────
export function cascata(w, { passos, h = 300, onClick, fmt = (n) => fMilAbs(n) }) {
  if (!passos?.length) return vazio(w, h);
  const compactoMobile = w < 560;
  const m = { t: 30, r: 8, b: compactoMobile ? 74 : 62, l: 8 };
  const iw = w - m.l - m.r, ih = h - m.t - m.b;
  let acc = 0;
  const geom = passos.map((p) => {
    if (p.tipo === "total") { acc = p.val; return { ...p, de: 0, ate: p.val }; }
    const de = acc; acc += p.val; return { ...p, de, ate: acc };
  });
  const todos = geom.flatMap((g) => [g.de, g.ate, 0]);
  let mn = Math.min(...todos), mx = Math.max(...todos);
  const pad = (mx - mn) * 0.1 || 1;
  mx += pad; if (mn < 0) mn -= pad;
  const Y = (v) => m.t + ih - ((v - mn) / (mx - mn)) * ih;
  const slot = iw / geom.length;
  const bw = Math.min(46, slot * 0.58);
  const svg = el("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": "ponte do resultado" });
  svg.append(el("line", { x1: m.l, x2: w - m.r, y1: Y(0), y2: Y(0), stroke: EIXO, "stroke-width": 1 }));
  geom.forEach((g, i) => {
    const cx = m.l + slot * i + slot / 2;
    const x = cx - bw / 2;
    const y1 = Y(Math.max(g.de, g.ate)), y2 = Y(Math.min(g.de, g.ate));
    const alt = Math.max(y2 - y1, 2);
    const cor = g.tipo === "total" ? "var(--navy-barra, var(--lin-lab))" : g.val >= 0 ? "var(--bom)" : "var(--ruim)";
    const sobe = g.tipo === "total" ? g.val >= 0 : g.val >= 0;
    const caminho = sobe ? caminhoTopo(x, y1, bw, alt) : caminhoTopo(x, y1, bw, alt); // dados no topo; base reta na linha
    const p = el("path", { d: g.tipo === "total" && g.val < 0 ? `M${x},${y1} H${x + bw} V${y1 + alt - 4} Q${x + bw},${y1 + alt} ${x + bw - 4},${y1 + alt} H${x + 4} Q${x},${y1 + alt} ${x},${y1 + alt - 4} Z` : caminho, fill: cor, tabindex: g.tipo === "delta" && onClick ? 0 : null, class: "marca", "aria-label": `${g.nome}: ${fmt(g.val)}` });
    comTip(p, () => ({ titulo: g.nome, linhas: [{ cor, valor: g.tipo === "total" ? fmt(g.val) : (g.val >= 0 ? "+" : "−") + fmt(Math.abs(g.val)).replace("−", ""), nome: g.tipo === "total" ? "resultado operacional" : g.val >= 0 ? "melhora o resultado" : "piora o resultado" }, ...(g.itens?.length ? g.itens.slice(0, 5).map((it) => ({ valor: (it.delta >= 0 ? "+" : "−") + fmt(Math.abs(it.delta)).replace("−", ""), nome: it.nome })) : [])] }));
    if (g.tipo === "delta" && onClick) { p.style.cursor = "pointer"; const abrir = () => onClick(g); p.addEventListener("click", abrir); p.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(); } }); }
    svg.append(p);
    // conector tracejado até o próximo
    if (i < geom.length - 1) svg.append(el("line", { x1: x + bw, x2: cx + slot - bw / 2, y1: Y(g.ate), y2: Y(g.ate), stroke: EIXO, "stroke-width": 1, "stroke-dasharray": "3 3" }));
    // valor
    const rotulo = g.tipo === "total" ? fmt(g.val) : (g.val >= 0 ? "+" : "−") + fmt(Math.abs(g.val)).replace("−", "");
    const vy = g.val >= 0 || g.tipo === "total" ? y1 - 7 : y1 + alt + 15;
    const topoRot = g.tipo === "total" && g.val < 0 ? y1 - 7 : vy;
    svg.append(el("text", { x: cx, y: topoRot, "text-anchor": "middle", fill: "var(--texto)", "font-size": 11.5, "font-weight": g.tipo === "total" ? 800 : 600, text: rotulo }));
    // nome (2 linhas)
    const palavras = g.nome.split(" ");
    const linhasNome = [];
    let cur = "";
    const maxc = Math.max(7, Math.floor(slot / 6.3));
    for (const pw of palavras) { if ((cur + " " + pw).trim().length > maxc && cur) { linhasNome.push(cur); cur = pw; } else cur = (cur + " " + pw).trim(); }
    if (cur) linhasNome.push(cur);
    const mostradas = linhasNome.slice(0, 3).map((t) => (t.length > maxc + 2 ? t.slice(0, maxc + 1) + "…" : t));
    if (linhasNome.length > 3) mostradas[2] = mostradas[2].slice(0, maxc - 1) + "…";
    mostradas.forEach((t, k) => svg.append(el("text", { x: cx, y: h - m.b + 18 + k * 13, "text-anchor": "middle", fill: g.tipo === "total" ? "var(--texto)" : TEXTO, "font-size": 11, "font-weight": g.tipo === "total" ? 700 : 500, text: t })));
  });
  return svg;
}

// ───────────────────────── barras horizontais ─────────────────────────
// itens: [{id, nome, val, cor, sub?, rot?}] ; divergente: valores +/- em torno do zero
export function barrasH(w, { itens, fmt = fR, divergente = false, onClick, linha = 30, max = null, rotuloLargura = null }) {
  if (!itens.length) return vazio(w, 90);
  const lw = rotuloLargura ?? Math.min(230, Math.max(110, w * 0.36));
  const m = { l: lw + (divergente ? 70 : 0), r: divergente ? 70 : Math.min(190, 20 + 6.6 * Math.max(...itens.map((i) => (i.rot ?? fmt(i.val)).length))), t: 4, b: 4 };
  const h = m.t + m.b + itens.length * linha;
  const iw = w - m.l - m.r;
  const mx = max ?? Math.max(...itens.map((i) => Math.abs(i.val)), 1);
  const mn = divergente ? -mx : 0;
  const X = (v) => m.l + ((v - mn) / (mx - mn)) * iw;
  const svg = el("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": "barras horizontais" });
  if (divergente) svg.append(el("line", { x1: X(0), x2: X(0), y1: 0, y2: h, stroke: EIXO, "stroke-width": 1 }));
  itens.forEach((it, i) => {
    const y = m.t + i * linha;
    const bh = 14;
    const by = y + (linha - bh) / 2;
    const nome = it.nome.length > Math.floor(lw / 6.4) ? it.nome.slice(0, Math.floor(lw / 6.4) - 1) + "…" : it.nome;
    svg.append(el("text", { x: (divergente ? lw : m.l) - 10, y: y + linha / 2 + 4, "text-anchor": "end", fill: "var(--texto)", "font-size": 12, "font-weight": 500, text: nome }));
    let d;
    const x0 = X(0);
    const x1 = X(it.val);
    if (it.val >= 0) d = caminhoDireita(x0, by, Math.max(x1 - x0, 0), bh);
    else d = caminhoEsquerda(x1, by, Math.max(x0 - x1, 0), bh);
    const p = el("path", { d: d || `M${x0},${by} h2 v${bh} h-2 Z`, fill: it.cor, tabindex: 0, class: "marca", "aria-label": `${it.nome}: ${fmt(it.val)}` });
    comTip(p, () => ({ titulo: it.nome, linhas: [{ cor: it.cor, valor: fmt(it.val), nome: it.sub ?? "" }] }));
    if (onClick) { p.style.cursor = "pointer"; p.addEventListener("click", () => onClick(it)); p.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(it); } }); }
    svg.append(p);
    const tx = it.val >= 0 ? x1 + 7 : x1 - 7;
    svg.append(el("text", { x: tx, y: y + linha / 2 + 4, "text-anchor": it.val >= 0 ? "start" : "end", fill: "var(--texto)", "font-size": 11.5, "font-weight": 600, text: it.rot ?? fmt(it.val) }));
  });
  return svg;
}

// ───────────────────────── bullet (ponto de equilíbrio) ─────────────────────────
export function bullet(w, { receita, pe, peMedio, h = 86 }) {
  const m = { l: 10, r: 10, t: 28, b: 26 };
  const iw = w - m.l - m.r;
  const mx = Math.max(receita, pe ?? 0, peMedio ?? 0) * 1.12 || 1;
  const X = (v) => m.l + (v / mx) * iw;
  const svg = el("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": "receita contra ponto de equilíbrio" });
  const ty = m.t + 12, th = 22;
  const px = pe != null ? X(pe) : 0;
  svg.append(el("path", { d: `M${m.l + 11},${ty} H${px} V${ty + th} H${m.l + 11} Q${m.l},${ty + th} ${m.l},${ty + th - 11} V${ty + 11} Q${m.l},${ty} ${m.l + 11},${ty} Z`, fill: "var(--ruim-fundo)" }));
  svg.append(el("path", { d: `M${px},${ty} H${w - m.r - 11} Q${w - m.r},${ty} ${w - m.r},${ty + 11} V${ty + th - 11} Q${w - m.r},${ty + th} ${w - m.r - 11},${ty + th} H${px} Z`, fill: "var(--bom-fundo)" }));
  const barra = el("path", { d: caminhoDireita(m.l, ty + 5, X(receita) - m.l, th - 10, 4), fill: "var(--navy-barra, var(--lin-lab))", tabindex: 0, class: "marca", "aria-label": `receita ${fR(receita)}` });
  comTip(barra, () => ({ titulo: "Receita realizada", linhas: [{ valor: fR(receita), nome: pe != null ? `${fP((100 * (receita - pe)) / receita)} acima do ponto de equilíbrio` : "" }] }));
  svg.append(barra);
  const marca = (v, texto, cor, y, alinhar = "middle") => {
    svg.append(el("line", { x1: X(v), x2: X(v), y1: ty - 5, y2: ty + th + 5, stroke: cor, "stroke-width": 2 }));
    svg.append(el("text", { x: X(v), y, "text-anchor": alinhar, fill: "var(--texto)", "font-size": 11.5, "font-weight": 600, text: texto }));
  };
  if (peMedio != null) marca(peMedio, `PE médio ${fMilAbs(peMedio)}`, "var(--neutro)", ty + th + 20);
  if (pe != null) marca(pe, `PE do mês ${fMilAbs(pe)}`, "var(--ruim)", ty - 10);
  svg.append(el("text", { x: Math.min(X(receita) - 6, w - 12), y: ty + th / 2 + 4, "text-anchor": "end", fill: "#fff", "font-size": 11.5, "font-weight": 700, text: fMilAbs(receita) }));
  return svg;
}

// ───────────────────────── legenda com isolamento de série ─────────────────────────
export function legenda(itens, { ativos, onToggle }) {
  const box = el("div", { class: "legenda", role: "group", "aria-label": "séries" });
  for (const it of itens) {
    const off = ativos && !ativos.has(it.id);
    const b = el("button", { type: "button", class: "leg-item" + (off ? " off" : ""), "aria-pressed": String(!off), onClick: () => onToggle?.(it.id) },
      el("span", { class: "leg-k", style: { background: it.cor } }), el("span", { text: it.nome }));
    box.append(b);
  }
  return box;
}

// delta com semântica de cor
export function chipDelta(txt, julg, dir = 0) {
  const sinal = dir > 0 ? "▲" : dir < 0 ? "▼" : "■";
  return el("span", { class: `delta ${julg}`, "aria-label": `${julg === "bom" ? "melhora" : julg === "ruim" ? "piora" : "estável"}: ${txt}` }, el("span", { class: "delta-i", "aria-hidden": "true", text: sinal }), txt);
}

// ───────────────────────── rosca (parte do todo) ─────────────────────────
// itens: [{id, nome, val, cor}] valores positivos. Até `max` fatias; o resto vira "Outras".
// A legenda ao lado (nome, valor, %) é o canal secundário: nenhuma informação depende só da cor.
export function rosca(w, { itens, centro, fmt = fR, onClick, max = 6, corOutras = "var(--neutro)", nota = "" }) {
  let lista = itens.filter((i) => i.val > 0).sort((a, b) => b.val - a.val);
  if (!lista.length) return vazio(w, 160);
  if (lista.length > max) {
    const resto = lista.slice(max - 1);
    lista = [...lista.slice(0, max - 1), { id: "__outras", nome: `Outras (${resto.length})`, val: resto.reduce((s, x) => s + x.val, 0), cor: corOutras, itens: resto }];
  }
  const total = lista.reduce((s, x) => s + x.val, 0);
  const lado = w >= 470;
  const D = lado ? Math.min(210, w * 0.4) : Math.min(210, w - 20);
  const linhaH = 26;
  const legH = lista.length * linhaH;
  const h = lado ? Math.max(D, legH) + 8 : D + 16 + legH;
  const cx = lado ? D / 2 + 4 : w / 2, cy = D / 2 + 4;
  const R = D / 2, r = R * 0.62;
  const svg = el("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": nota || "gráfico de rosca" });
  let a0 = -Math.PI / 2;
  const P = (ang, rad) => [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)];
  const abrir = (it) => onClick?.(it);
  lista.forEach((it) => {
    const frac = it.val / total;
    const a1 = a0 + frac * Math.PI * 2 - (lista.length > 1 ? 0.0001 : 0);
    const grande = a1 - a0 > Math.PI ? 1 : 0;
    let d;
    if (lista.length === 1) d = `M${cx},${cy - R} A${R},${R} 0 1 1 ${cx - 0.01},${cy - R} L${cx - 0.01},${cy - r} A${r},${r} 0 1 0 ${cx},${cy - r} Z`;
    else { const [x0, y0] = P(a0, R), [x1, y1] = P(a1, R), [x2, y2] = P(a1, r), [x3, y3] = P(a0, r); d = `M${x0},${y0} A${R},${R} 0 ${grande} 1 ${x1},${y1} L${x2},${y2} A${r},${r} 0 ${grande} 0 ${x3},${y3} Z`; }
    const p = el("path", { d, fill: it.cor, stroke: FUNDO, "stroke-width": 2, tabindex: 0, class: "marca", "aria-label": `${it.nome}: ${fmt(it.val)}, ${fP(frac * 100)}` });
    comTip(p, () => ({ titulo: it.nome, linhas: [{ cor: it.cor, valor: fmt(it.val), nome: `${fP(frac * 100)} do total` }, ...(it.itens ? it.itens.slice(0, 5).map((x) => ({ valor: fmt(x.val), nome: x.nome })) : [])] }));
    if (onClick && it.id !== "__outras") { p.style.cursor = "pointer"; p.addEventListener("click", () => abrir(it)); p.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(it); } }); }
    svg.append(p);
    a0 = a1;
  });
  if (centro) {
    svg.append(el("text", { x: cx, y: cy - 2, "text-anchor": "middle", fill: "var(--texto)", "font-size": 17, "font-weight": 800, text: centro.valor }));
    svg.append(el("text", { x: cx, y: cy + 15, "text-anchor": "middle", fill: EIXO, "font-size": 11, text: centro.titulo }));
  }
  const lx = lado ? D + 28 : 8;
  const ly = lado ? Math.max(0, (h - legH) / 2) : D + 20;
  const larg = w - lx - 6;
  lista.forEach((it, i) => {
    const y = ly + i * linhaH;
    const g = el("g", { class: onClick && it.id !== "__outras" ? "leg-svg clic" : "leg-svg" });
    g.append(el("rect", { x: lx, y: y + 6, width: 11, height: 11, rx: 3, fill: it.cor }));
    const maxc = Math.max(8, Math.floor((larg - 150) / 6.4));
    g.append(el("text", { x: lx + 19, y: y + 16, fill: "var(--texto)", "font-size": 12.5, "font-weight": 500, text: it.nome.length > maxc ? it.nome.slice(0, maxc - 1) + "…" : it.nome }));
    g.append(el("text", { x: lx + larg, y: y + 16, "text-anchor": "end", fill: "var(--texto)", "font-size": 12.5, "font-weight": 700 }, el("tspan", { text: fmt(it.val) }), el("tspan", { fill: EIXO, "font-weight": 500, dx: 6, text: fP((100 * it.val) / total) })));
    if (onClick && it.id !== "__outras") { g.style.cursor = "pointer"; g.addEventListener("click", () => abrir(it)); }
    svg.append(g);
  });
  return svg;
}
