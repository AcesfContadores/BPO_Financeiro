// Dados: todas as contas, origem de cada número, exportação e conferência com os valores de referência.
import { el, baixarCSV, fN, fR, fP } from "../util.js";
import { S, ir } from "../state.js";
import { metricas, mesesJanela, mesCurto, arvore, valorNo, fontesNo, EMP, EMPRESAS_REAIS } from "../model.js";
import { secao, tabelaArvore, badgesFonte } from "../ui.js";
import { REFERENCIA } from "../referencia.js";

export function renderDados(P, raiz) {
  const emp = S.emp, mes = S.mes;
  const meses = mesesJanela(P, mes, Math.max(S.n, 4));

  // origem
  const cont = { planilha: 0, nibo: 0, manual: 0 };
  for (const e of emp === "grupo" ? EMPRESAS_REAIS : [emp]) for (const f of Object.values(P.fonte[e]?.[mes] ?? {})) cont[f] = (cont[f] ?? 0) + 1;
  const sync = P.raw.ultima_sincronizacao ? new Date(P.raw.ultima_sincronizacao).toLocaleString("pt-BR") : "ainda não houve";
  raiz.append(el("div", { class: "origem" },
    el("p", {}, el("strong", { text: "Origem dos valores em " }), el("strong", { text: mesCurto(mes) }), el("span", { text: `: ${cont.planilha} da planilha do painel, ${cont.nibo} do Nibo, ${cont.manual} ajustes manuais.` })),
    el("p", { class: "dim", text: `Banco atualizado em ${P.raw.gerado_em ? new Date(P.raw.gerado_em).toLocaleString("pt-BR") : "—"}. Última sincronização com o Nibo: ${sync}. Prioridade quando há mais de uma fonte: manual, depois Nibo, depois planilha.` })));

  // conferência com referência (apenas set/26)
  const ref = REFERENCIA[mes]?.[emp];
  if (ref) {
    const m = metricas(P, emp, mes);
    const linhas = [["Receita", m.receita, ref.receita], ["Margem de contribuição", m.mc, ref.mc], ["Resultado operacional", m.resultado, ref.resultado], ["Variação de caixa", m.caixa, ref.caixa]];
    const t = el("table", { class: "dre mini" }, el("thead", {}, el("tr", {}, el("th", { class: "c-nome", text: "Indicador" }), el("th", { class: "num", text: "No painel" }), el("th", { class: "num", text: "Referência (prompt)" }), el("th", { class: "num", text: "Diferença" }), el("th", { class: "c-nome", text: "Situação" }))));
    const b = el("tbody");
    for (const [n, a, r] of linhas) { const d = a - r; const ok = Math.abs(d) <= 1.5; b.append(el("tr", {}, el("td", { class: "c-nome", text: n }), el("td", { class: "num", text: fN(a) }), el("td", { class: "num", text: fN(r) }), el("td", { class: "num", text: fN(d) }), el("td", { class: "c-nome" }, el("span", { class: `delta ${ok ? "bom" : "ruim"}`, text: ok ? "✓ confere" : "▲ divergente" })))); }
    t.append(b);
    raiz.append(secao("Conferência com os números oficiais", "Compara o painel com os valores dos prompts de Set/26 (tolerância de R$ 1,50 por arredondamento).", el("div", { class: "tabela-rolagem" }, t)));
  }

  // árvore completa
  raiz.append(secao("Plano de contas completo", "Todas as contas com valor, em árvore. Clique no nome para destrinchar; a seta expande o grupo.", tabelaArvore(P, emp, { meses, mes })));

  // exportar
  const exportar = el("button", { type: "button", class: "btn primario", text: "Baixar CSV (todas as contas × meses)", onClick: () => {
    const { nos } = arvore(P, emp);
    const linhas = [["Conta", "Código", "Grupo", ...P.meses]];
    for (const n of nos.values()) linhas.push([n.nome, n.codigo, n.grupo, ...P.meses.map((x) => Math.round(valorNo(P, emp, x, n) * 100) / 100)]);
    baixarCSV(`painel-${emp}-${mes}.csv`, linhas);
  } });
  raiz.append(secao("Exportar", "Valores em R$ com o sinal do banco (receita positiva; custos e despesas negativos).", exportar));
}
