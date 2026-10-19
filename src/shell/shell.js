// Casca única: tela de login, abertura dos dados (criptografados) e menu lateral por empresa.
// Os dados de cada empresa só existem em claro depois que a senha certa abre a chave dela.
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "style") for (const [a, b] of Object.entries(v)) e.style.setProperty(a, b);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
};
const svg = (d) => {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [k, v] of Object.entries({ viewBox: "0 0 24 24", width: 20, height: 20, fill: "none", stroke: "currentColor", "stroke-width": 1.8, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" })) s.setAttribute(k, v);
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("d", d); s.append(p); return s;
};
// Login validado no servidor (função acesf_dados do Supabase). A senha nunca fica no arquivo e os dados só chegam depois do login.
class ErroLogin extends Error { constructor(tipo) { super(tipo); this.tipo = tipo; } }
async function chamarBanco(usuario, senha) {
  let resp;
  try {
    resp = await fetch(`${ACESF_API.url}/rest/v1/rpc/acesf_dados`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ACESF_API.key, Authorization: `Bearer ${ACESF_API.key}` },
      body: JSON.stringify({ p_usuario: usuario.trim(), p_senha: senha }),
    });
  } catch (_) { throw new ErroLogin("rede"); }
  if (!resp.ok) throw new ErroLogin("rede");
  const j = await resp.json();
  if (j?.erro === "bloqueado") throw new ErroLogin("bloqueado");
  if (j?.erro || !j?.papel) throw new ErroLogin("credenciais");
  const dados = {};
  if (j.dados.prontomed) dados.prontomed = j.dados.prontomed;
  if (j.dados.imunne) dados.imunne = Imunne.montarRaw(j.dados.imunne);
  return { papel: j.papel, usuario: j.usuario, dados, admin: j.papel === "admin", buscadoEm: new Date(j.gerado_em ?? Date.now()) };
}
async function abrir(papel, usuario, senha) {
  const s = await chamarBanco(usuario, senha);
  if (s.papel !== papel) throw new ErroLogin("credenciais"); // senha de outra empresa não abre esta
  s.cred = { usuario, senha };
  return s;
}

const EMPRESAS = {
  prontomed: { id: "prontomed", nome: "Prontomed", completo: "Clínica Prontomed e Multidisciplinar", cor: "var(--emp-prontomed)", modulo: () => Prontomed },
  imunne: { id: "imunne", nome: "IMUNNE", completo: "Iguatu, Icó, Cajazeiras e CD de vacinas", cor: "var(--emp-iguatu)", modulo: () => Imunne },
};

const raiz = document.getElementById("acesf");

// ───────────────────────── login ─────────────────────────
function telaLogin() {
  raiz.replaceChildren();
  let escolha = null;
  const aviso = h("p", { class: "lg-erro", role: "alert", "aria-live": "assertive" });
  const usuario = h("input", { id: "lg-usuario", type: "text", autocomplete: "username", autocapitalize: "none", spellcheck: "false", required: true });
  const senha = h("input", { id: "lg-senha", type: "password", autocomplete: "current-password", required: true });
  const ver = h("button", { type: "button", class: "lg-ver", "aria-label": "Mostrar senha", text: "Mostrar", onClick: () => { const m = senha.type === "password"; senha.type = m ? "text" : "password"; ver.textContent = m ? "Ocultar" : "Mostrar"; ver.setAttribute("aria-label", m ? "Ocultar senha" : "Mostrar senha"); } });
  const entrar = h("button", { type: "submit", class: "lg-entrar", text: "Entrar" });
  const cab = h("p", { class: "lg-quem", "aria-live": "polite" });
  const cartoes = h("div", { class: "lg-cartoes", role: "radiogroup", "aria-label": "Empresa" });
  const campos = h("div", { class: "lg-campos", hidden: true },
    cab,
    h("label", { class: "lg-campo", for: "lg-usuario" }, h("span", { text: "Usuário" }), usuario),
    h("label", { class: "lg-campo", for: "lg-senha" }, h("span", { text: "Senha" }), h("span", { class: "lg-senha" }, senha, ver)),
    aviso, entrar);
  const admin = h("button", { type: "button", class: "lg-admin", text: "Entrar como administrador ACESF", onClick: () => escolher("admin") });

  const escolher = (id) => {
    escolha = id; aviso.textContent = ""; campos.hidden = false;
    for (const b of cartoes.children) { const on = b.dataset.id === id; b.setAttribute("aria-checked", String(on)); b.classList.toggle("on", on); }
    admin.classList.toggle("on", id === "admin");
    cab.textContent = id === "admin" ? "Acesso do administrador" : `Acesso ${EMPRESAS[id].nome}`;
    usuario.focus();
  };
  for (const e of Object.values(EMPRESAS))
    cartoes.append(h("button", { type: "button", role: "radio", "aria-checked": "false", class: "lg-cartao", "data-id": e.id, style: { "--c": e.cor }, onClick: () => escolher(e.id) },
      h("i"), h("span", {}, h("strong", { text: e.nome }), h("small", { text: e.completo }))));

  const form = h("form", { class: "lg-form", novalidate: true, onSubmit: async (ev) => {
    ev.preventDefault();
    if (!escolha) { aviso.textContent = "Escolha a empresa para entrar."; return; }
    if (!usuario.value.trim() || !senha.value) { aviso.textContent = "Informe usuário e senha."; return; }
    entrar.disabled = true; entrar.textContent = "Abrindo…"; aviso.textContent = "";
    try {
      const sessao = await abrir(escolha, usuario.value, senha.value);
      senha.value = "";
      await abrirPainel(sessao);
    } catch (e) {
      aviso.textContent = e.tipo === "bloqueado" ? "Muitas tentativas erradas. Aguarde 5 minutos e tente de novo." : e.tipo === "rede" ? "Não consegui falar com o banco. Verifique a internet e tente de novo." : "Usuário ou senha incorretos.";
      if (e.tipo !== "rede") { senha.value = ""; senha.focus(); }
    } finally { entrar.disabled = false; entrar.textContent = "Entrar"; }
  } }, h("fieldset", { class: "lg-escolha" }, h("legend", { text: "Qual empresa você quer acessar?" }), cartoes), campos, h("div", { class: "lg-rodape" }, admin));

  raiz.append(h("main", { class: "lg" },
    h("section", { class: "lg-marca" },
      h("img", { class: "lg-logo", src: LOGO, alt: "ACESF Contadores Associados" }),
      h("h1", { text: "Painéis financeiros" }),
      h("p", { class: "lg-nota", text: "Acesso restrito. Cada empresa vê apenas o próprio painel." })),
    h("section", { class: "lg-painel", "aria-labelledby": "lg-titulo" }, h("h2", { id: "lg-titulo", text: "Entrar" }), form)));
}

// ───────────────────────── painel logado ─────────────────────────
const montados = {}; // id -> { host, api, pagina, carimbo }
let sessao = null, ativa = null, timerAtu = null;
const aberto = new Set();

async function abrirPainel(s) {
  sessao = s;
  const ids = s.admin ? ["prontomed", "imunne"] : [s.papel];
  raiz.replaceChildren();
  const menu = h("nav", { class: "menu", "aria-label": "Empresas e telas" });
  const carimbo = h("p", { class: "carimbo dim", "aria-live": "polite" });
  const botaoAtu = h("button", { type: "button", class: "ac-atu", text: "Atualizar agora", onClick: () => atualizar(false) });
  let ultimo = s.buscadoEm, falhou = false, emAndamento = false;
  const conteudo = h("div", { class: "centro acesf-centro" });
  const sair = h("button", { type: "button", class: "ac-sair", text: "Sair", onClick: encerrar });
  const eu = h("p", { class: "ac-eu" }, h("small", { text: s.admin ? "Administrador" : "Acesso" }), h("strong", { text: s.admin ? "ACESF" : EMPRESAS[s.papel].nome }));
  raiz.append(h("div", { class: "casca ac-casca" },
    h("header", { class: "lateral" }, h("div", { class: "marca-app" }, h("img", { class: "ac-logo", src: LOGO, alt: "ACESF Contadores Associados" })), menu, h("div", { class: "ac-pe" }, carimbo, botaoAtu, eu, sair)),
    conteudo));
  for (const id of ids) {
    const host = h("div", { class: "host", "data-id": id, hidden: true });
    conteudo.append(host);
    montados[id] = { host, api: null, pagina: "resumo", pendente: null };
  }
  const desenharMenu = () => {
    menu.replaceChildren();
    for (const id of ids) {
      const e = EMPRESAS[id], m = montados[id];
      const abertoAgora = s.admin ? aberto.has(id) : true;
      const sub = h("div", { class: "sub", id: `sub-${id}`, hidden: !abertoAgora });
      if (m.api) for (const p of m.api.paginas()) {
        const t = m.api.TELAS[p];
        const on = ativa === id && m.pagina === p;
        sub.append(h("a", { href: "#", class: on ? "on" : "", "aria-current": on ? "page" : null, style: { "--emp": e.cor }, onClick: (ev) => { ev.preventDefault(); irPara(id, p); } }, svg(t.icone), h("span", { text: t.nome })));
      }
      const cab = s.admin
        ? h("button", { type: "button", class: "emp-btn" + (ativa === id ? " on" : ""), "aria-expanded": String(abertoAgora), "aria-controls": `sub-${id}`, style: { "--c": e.cor }, onClick: () => { if (ativa === id) { aberto.has(id) ? aberto.delete(id) : aberto.add(id); desenharMenu(); } else irPara(id, null); } },
            h("i"), h("span", { text: e.nome }), h("b", { class: "chev", "aria-hidden": "true", text: "▸" }))
        : h("p", { class: "emp-fixo", style: { "--c": e.cor } }, h("i"), h("span", { text: e.nome }));
      menu.append(h("div", { class: "emp-bloco" + (abertoAgora ? " aberto" : "") }, cab, sub));
    }
  };
  async function irPara(id, pagina) {
    const m = montados[id];
    if (!m.api) {
      m.host.hidden = false; m.host.replaceChildren(h("p", { class: "carregando", text: "Carregando os números…" }));
      m.api = await EMPRESAS[id].modulo().mount(m.host, s.dados[id], { aoMudar: (st) => { m.pagina = st.page; if (ativa === id) { desenharMenu(); } } });
      if (!m.api) return;
    }
    if (m.pendente) { const novo = m.pendente; m.pendente = null; await m.api.atualizar(novo); }
    ativa = id; aberto.clear(); aberto.add(id);
    for (const [k, v] of Object.entries(montados)) v.host.hidden = k !== id;
    if (pagina) m.api.ir(pagina === "comparativo" ? { page: pagina, emp: "grupo", d: null } : { page: pagina, d: null });
    else m.api.redesenhar();
    pintarCarimbo();
    window.scrollTo(0, 0);
    desenharMenu();
  }
  const hhmm = (d) => new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const diaHora = (iso) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  function pintarCarimbo() {
    const sync = s.dados[ativa]?.ultima_sincronizacao;
    carimbo.replaceChildren(
      h("span", {}, `${falhou ? "Sem conexão. Último dado: " : "Atualizado às "}${hhmm(ultimo)}`),
      sync ? h("span", {}, `Nibo sincronizado em ${diaHora(sync)}`) : null);
  }
  async function atualizar(auto) {
    if (emAndamento) return;
    emAndamento = true; botaoAtu.disabled = true; if (!auto) botaoAtu.textContent = "Atualizando…";
    try {
      const novo = await chamarBanco(s.cred.usuario, s.cred.senha);
      for (const id of ids) {
        s.dados[id] = novo.dados[id];
        const m = montados[id];
        if (!m.api) continue;
        if (id === ativa) await m.api.atualizar(novo.dados[id]); else m.pendente = novo.dados[id];
      }
      ultimo = novo.buscadoEm; falhou = false;
      if (ativa) desenharMenu();
    } catch (e) {
      if (e.tipo === "credenciais") { encerrar(); return; } // senha trocada no banco: volta ao login
      falhou = true;
    } finally {
      emAndamento = false; botaoAtu.disabled = false; botaoAtu.textContent = "Atualizar agora"; pintarCarimbo();
    }
  }
  const ATUALIZA_A_CADA = 5 * 60 * 1000;
  timerAtu = setInterval(() => { if (!document.hidden) atualizar(true); }, ATUALIZA_A_CADA);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && sessao && Date.now() - ultimo.getTime() > 2 * 60 * 1000) atualizar(true); });
  desenharMenu();
  await irPara(ids[0], null);
}

function encerrar() {
  sessao = null; ativa = null; clearInterval(timerAtu);
  for (const k of Object.keys(montados)) delete montados[k];
  try { location.reload(); return; } catch (_) { /* sem recarregar: volta para o login */ }
  telaLogin();
}

telaLogin();
