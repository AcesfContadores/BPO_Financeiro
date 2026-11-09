// Agrupamentos de contas que formam as "linhas de negócio" de cada empresa (cores fixas em todo o painel).
import { arvore, valorNo } from "./model.js";

// Linhas de receita da empresa (cores fixas em todo o painel).
export function linhasReceita(_emp) {
  return [
    { id: "rec_ven", nome: "Vendas", cor: "var(--cat-1)", nos: ["REC_VEN"] },
    { id: "rec_ent", nome: "Taxa de entregas", cor: "var(--cat-2)", nos: ["REC_ENT"] },
    { id: "rec_eve", nome: "Eventos", cor: "var(--cat-3)", nos: ["REC_EVE"] },
    { id: "rec_out", nome: "Outras receitas", cor: "var(--cat-4)", nos: ["REC_OUT", "REC_DESC"] },
  ];
}

export function valorLinha(P, emp, mes, linha) {
  return linha.nos.reduce((s, c) => s + valorNo(P, emp, mes, c), 0);
}

// raízes de custo ou despesa com cor da rampa sequencial (maior = mais escuro), estáveis por tamanho no mês de referência
export function raizesPorGrupo(P, emp, grupo, mesRef) {
  const { raizes } = arvore(P, emp);
  const lista = raizes.filter((n) => n.grupo === grupo && n.incluirDre);
  // cor fixa por conta (ordem do plano), para não "repintar" quando o ranking muda de mês
  const cats = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)", "var(--cat-5)", "var(--cat-6)"];
  const porOrdem = [...lista].sort((a, b) => a.ordem - b.ordem);
  const cor = new Map(porOrdem.map((n, i) => [n.codigo, i < cats.length ? cats[i] : "var(--cat-outras)"]));
  const ord = [...lista].sort((a, b) => Math.abs(valorNo(P, emp, mesRef, b)) - Math.abs(valorNo(P, emp, mesRef, a)));
  return ord.map((n) => ({ id: n.codigo, nome: n.nome, no: n, cor: cor.get(n.codigo) }));
}

export const ESPECIALIDADES = [];
