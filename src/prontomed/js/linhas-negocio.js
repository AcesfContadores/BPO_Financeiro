// Agrupamentos de contas que formam as "linhas de negócio" de cada empresa (cores fixas em todo o painel).
import { arvore, valorNo, metricas, EMPRESAS_REAIS } from "./model.js";

export function linhasReceita(emp) {
  if (emp === "prontomed")
    return [
      { id: "rec_lab", nome: "Laboratório", cor: "var(--lin-lab)", nos: ["rec_lab"] },
      { id: "rec_cons", nome: "Consultas médicas e multiprofissionais", cor: "var(--lin-cons)", nos: ["rec_cons"] },
      { id: "rec_img", nome: "Imagem", cor: "var(--lin-img)", nos: ["rec_img"] },
      { id: "rec_cardio", nome: "Cardiologia", cor: "var(--lin-cardio)", nos: ["rec_cardio"] },
      { id: "rec_outras_pm", nome: "Procedimentos e acessórias", cor: "var(--lin-acess)", nos: ["rec_procedimentos", "rec_acessorias", "rec_descontos_concedidos", "rec_residual"] },
    ];
  if (emp === "multidisciplinar")
    return [
      { id: "mu_rec_conv", nome: "Convênios", cor: "var(--mu-conv)", nos: ["mu_rec_conv"] },
      { id: "mu_rec_multi", nome: "Multiprofissionais particulares", cor: "var(--mu-multi)", nos: ["mu_rec_multi"] },
      { id: "mu_rec_part", nome: "Consultas particulares e pacotes", cor: "var(--mu-atend-part)", nos: ["mu_rec_part", "mu_rec_pacotes"] },
      { id: "mu_rec_outras", nome: "Outras receitas operacionais", cor: "var(--mu-outras)", nos: ["mu_rec_outras", "mu_rec_residual"] },
    ];
  return EMPRESAS_REAIS.map((e) => ({ id: e, nome: e === "prontomed" ? "Prontomed" : "Multidisciplinar", cor: `var(--emp-${e})`, nos: [] }));
}

export function valorLinha(P, emp, mes, linha) {
  if (emp === "grupo") return metricas(P, linha.id, mes)?.receita ?? 0;
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

export const ESPECIALIDADES = [
  { id: "mu_cus_rep_psico", nome: "Psicologia", cor: "var(--esp-psico)" },
  { id: "mu_cus_rep_psicoped", nome: "Psicopedagogia", cor: "var(--esp-psicoped)" },
  { id: "mu_cus_rep_to", nome: "Terapia ocupacional", cor: "var(--esp-to)" },
  { id: "mu_cus_rep_fisio", nome: "Fisioterapia", cor: "var(--esp-fisio)" },
  { id: "mu_cus_rep_fono", nome: "Fonoaudiologia", cor: "var(--esp-fono)" },
  { id: "mu_cus_rep_nutri", nome: "Nutrição", cor: "var(--esp-nutri)" },
  { id: "mu_cus_rep_outros", nome: "Outros profissionais", cor: "var(--esp-outros)" },
];
