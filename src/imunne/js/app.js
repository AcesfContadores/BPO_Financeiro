// Casca do painel: carrega os dados, desenha filtros e menu, roteia pelas telas e abre o painel "Destrinchar".
import { carregarPainel, definirDados } from "./api.js";
import { CONFIG } from "./config.js";
import { el, limpar, esconderTip } from "./util.js";
import { S, PAGINAS, lerHash, paraHash, ir, setHash, onRota } from "./state.js";
import { EMP, CENTROS, mesLongo, mesCurto, mesAberto } from "./model.js";
import { renderDrawer } from "./drawer.js";
import { renderResumo } from "./views/resumo.js";
import { renderReceitas } from "./views/receitas.js";
import { renderCustos } from "./views/custos.js";
import { renderMargem } from "./views/margem.js";
import { renderCaixa } from "./views/caixa.js";
import { renderDados } from "./views/dados.js";
import { renderComparativo } from "./views/comparativo.js";

const TELAS = {
  resumo: { nome: "Resumo", titulo: "Resumo do mês", fn: renderResumo, icone: "M3 12l9-8 9 8v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  receitas: { nome: "Receitas", titulo: "Receitas", fn: renderReceitas, icone: "M4 20V10m6 10V4m6 16v-7m6 7H2" },
  custos: { nome: "Custos e despesas", titulo: "Custos e despesas", fn: renderCustos, icone: "M3 5h18M3 12h12M3 19h7" },
  margem: { nome: "Margem e equilíbrio", titulo: "Margem e ponto de equilíbrio", fn: renderMargem, icone: "M4 19L20 5M7 8a2 2 0 1 0 0-.01M17 18a2 2 0 1 0 0-.01" },
  caixa: { nome: "Caixa", titulo: "Caixa", fn: renderCaixa, icone: "M3 7h18v12H3zM3 11h18M16 15h2" },
  dados: { nome: "Dados", titulo: "Dados e conferência", fn: renderDados, icone: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" },
  comparativo: { nome: "Comparativo", titulo: "Comparativo das unidades", fn: renderComparativo, icone: "M7 4v16M17 4v16M3 8h8M13 16h8" },
};

let app = null;
let opcoes = {};
let nav, filtros, titulo, subtitulo, main, gaveta, cortina, carimbo;
let paginaAnterior = null;

function svgIcone(d) {
  return el("svg", { viewBox: "0 0 24 24", width: 20, height: 20, "aria-hidden": "true", fill: "none", stroke: "currentColor", "stroke-width": 1.8, "stroke-linecap": "round", "stroke-linejoin": "round" }, el("path", { d }));
}

function montarCasca() {
  limpar(app);
  nav = el("nav", { class: "menu", "aria-label": "Telas do painel" });
  const marca = el("div", { class: "marca-app" }, el("span", { class: "marca-sel" }, "A"), el("div", {}, el("strong", { text: "Painel IMUNNE" }), el("small", { text: "ACESF · BPO financeiro" })));
  filtros = el("div", { class: "filtros", role: "group", "aria-label": "Filtros" });
  titulo = el("h1", { id: "titulo" });
  subtitulo = el("p", { class: "sub" });
  carimbo = el("p", { class: "carimbo dim" });
  main = el("main", { id: "conteudo", tabindex: -1 });
  cortina = el("div", { class: "cortina", onClick: () => ir({ d: null }) });
  gaveta = el("aside", { class: "gaveta", "aria-labelledby": "dw-titulo", "aria-hidden": "true" });
  app.append(
    el("div", { class: "casca embutida" },
      el("header", { class: "lateral" }, marca, nav, carimbo),
      el("div", { class: "centro" },
        el("div", { class: "barra" }, el("div", { class: "barra-t" }, titulo, subtitulo), filtros),
        main)),
    cortina, gaveta);
}

function select(rotulo, valor, opcoes, aoMudar) {
  const s = el("select", { "aria-label": rotulo, onChange: () => aoMudar(s.value) });
  for (const [v, t] of opcoes) s.append(el("option", { value: v, text: t, selected: String(v) === String(valor) }));
  return el("label", { class: "campo" }, el("span", { text: rotulo }), s);
}

function desenharFiltros() {
  limpar(filtros);
  const seg = el("div", { class: "seg", role: "radiogroup", "aria-label": "Unidade" });
  for (const id of ["grupo", ...CENTROS]) {
    seg.append(el("button", { type: "button", role: "radio", "aria-checked": String(S.emp === id), class: S.emp === id ? "on" : "", style: { "--c": `var(--emp-${id})` }, onClick: () => ir({ emp: id, page: S.page === "comparativo" && id !== "grupo" ? "resumo" : S.page, d: null }) }, el("i"), EMP[id].curto));
  }
  const meses = [...S.P.meses].reverse().map((m) => [m, mesLongo(m).replace(/^./, (c) => c.toUpperCase())]);
  filtros.append(
    seg,
    select("Mês", S.mes, meses, (v) => ir({ mes: v })),
    select("Comparar com", S.cmp, [["prev", "Mês anterior"], ["avg", "Média dos 3 meses anteriores"]], (v) => ir({ cmp: v })),
    select("Janela", S.n, [[3, "3 meses"], [4, "4 meses"], [6, "6 meses"], [12, "12 meses"]], (v) => ir({ n: Number(v) })),
    el("button", { type: "button", class: "btn icone", title: "Alternar tema claro e escuro", "aria-label": "Alternar tema claro e escuro", onClick: alternarTema, text: "◐" }),
    el("button", { type: "button", class: "btn", title: "Buscar os dados mais recentes do banco", onClick: recarregar, text: "Atualizar" }),
  );
}

function desenharMenu() {
  limpar(nav);
  const itens = PAGINAS.concat(S.emp === "grupo" ? ["comparativo"] : []);
  for (const id of itens) {
    const t = TELAS[id];
    nav.append(el("a", { href: paraHash({ ...S, page: id, d: null }), class: S.page === id ? "on" : "", "aria-current": S.page === id ? "page" : null }, svgIcone(t.icone), el("span", { text: t.nome })));
  }
}

function alternarTema() {
  const r = document.documentElement;
  const escuro = r.dataset.tema ? r.dataset.tema === "escuro" : matchMedia("(prefers-color-scheme: dark)").matches;
  r.dataset.tema = escuro ? "claro" : "escuro";
  try { localStorage.setItem("painel-tema", r.dataset.tema); } catch (_) { /* sem armazenamento: ignora */ }
  render();
}

async function recarregar() {
  main.setAttribute("aria-busy", "true");
  try { S.P = await carregarPainel(); render(); } catch (e) { mostrarErro(e); } finally { main.removeAttribute("aria-busy"); }
}

function aplicarHash() {
  Object.assign(S, lerHash());
  const P = S.P;
  if (!EMP[S.emp]) S.emp = "grupo";
  if (!S.mes || !P.meses.includes(S.mes)) S.mes = P.meses.includes(CONFIG.COMPETENCIA_PADRAO) ? CONFIG.COMPETENCIA_PADRAO : P.meses.at(-1);
  if (S.page === "comparativo" && S.emp !== "grupo") S.page = "resumo";
}

function render() {
  esconderTip();
  const P = S.P;
  app.dataset.empresa = S.emp;
  const tela = TELAS[S.page];
  titulo.textContent = tela.titulo;
  subtitulo.textContent = `${EMP[S.emp].nome} · ${mesLongo(S.mes)}`;
  carimbo.textContent = P.raw.gerado_em ? `Dados de ${new Date(P.raw.gerado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}` : "";
  desenharFiltros();
  desenharMenu();
  const y = window.scrollY;
  limpar(main);
  if (mesAberto(S.mes)) {
    main.append(el("div", { class: "faixa-aviso", role: "status" }, el("strong", { text: "Mês em andamento. " }),
      el("span", { text: "Os valores vêm do Nibo e ainda são parciais: o mês não terminou. Por isso as variações contra meses fechados não são equivalentes." })));
  }
  try { tela.fn(P, main); } catch (e) { console.error(e); main.append(el("p", { class: "vazio erro", text: `Não foi possível desenhar esta tela: ${e.message}` })); }
  if (paginaAnterior !== S.page) window.scrollTo(0, 0); else window.scrollTo(0, y);
  paginaAnterior = S.page;

  const aberta = !!S.d;
  limpar(gaveta);
  if (aberta) {
    try { gaveta.append(renderDrawer(P)); } catch (e) { console.error(e); gaveta.append(el("p", { class: "vazio erro", text: `Não foi possível abrir o detalhe: ${e.message}` })); }
  }
  gaveta.classList.toggle("aberta", aberta);
  cortina.classList.toggle("on", aberta);
  gaveta.setAttribute("aria-hidden", String(!aberta));
  document.body.classList.toggle("com-gaveta", aberta);
  if (aberta && !gaveta.dataset.foco) { gaveta.dataset.foco = "1"; gaveta.querySelector(".fechar")?.focus({ preventScroll: true }); }
  if (!aberta) delete gaveta.dataset.foco;
  try { opcoes.aoMudar?.({ page: S.page, emp: S.emp, mes: S.mes }); } catch (_) { /* ok */ }
}

function mostrarErro(e) {
  limpar(app);
  app.append(el("div", { class: "erro-geral", role: "alert" },
    el("h1", { text: "Não consegui carregar os dados" }),
    el("p", { text: String(e.message ?? e) }),
    el("p", { class: "dim", text: "Confira a conexão e tente de novo. Os números só aparecem com os dados do banco; nada é inventado." }),
    el("button", { type: "button", class: "btn primario", onClick: () => recarregar(), text: "Tentar de novo" })));
}

export async function mount(host, raw, opts = {}) {
  app = host; opcoes = opts;
  definirDados(raw);
  try { const t = localStorage.getItem("painel-tema"); if (t) document.documentElement.dataset.tema = t; } catch (_) { /* ok */ }
  try { S.P = await carregarPainel(); } catch (e) { mostrarErro(e); return null; }
  montarCasca();
  aplicarHash();
  render();
  onRota(() => { aplicarHash(); render(); });
  host.addEventListener("click", (ev) => {
    const a = ev.target.closest && ev.target.closest('a[href^="#/"]');
    if (a) { ev.preventDefault(); setHash(a.getAttribute("href")); }
  });
  window.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && S.d && host.offsetParent !== null) ir({ d: null }); });
  return {
    ir: (p) => ir(p),
    redesenhar: () => render(),
    estado: () => ({ page: S.page, emp: S.emp, mes: S.mes }),
    carimbo: () => S.P?.raw?.gerado_em ?? null,
    paginas: () => PAGINAS.concat(["comparativo"]),
    TELAS,
  };
}
