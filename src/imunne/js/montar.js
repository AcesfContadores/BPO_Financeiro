// Monta o JSON do painel IMUNNE a partir dos valores brutos do banco (imunne_base).
// O cálculo (DRE por centro de custo, caixa) é feito no navegador a cada atualização.
const CONTAS = [
  ["REC","Receitas operacionais","receita",null,true,false,10,true,null],
  ["REC_VAC","Venda de vacinas","receita","REC",true,false,11,true,"vacinas"],
  ["REC_VAC_PART","Vacinas (calendário e demais)","receita","REC_VAC",false,false,12,true,"vacinas"],
  ["REC_VAC_PAC","Pacote de vacinas","receita","REC_VAC",false,false,13,true,"vacinas"],
  ["REC_SERV","Serviços de aplicação","receita","REC",true,false,20,true,"servicos"],
  ["REC_SERV_DOM","Taxa de aplicação domiciliar","receita","REC_SERV",false,false,21,true,"servicos"],
  ["REC_SERV_SALA","Taxa de sala de vacinação","receita","REC_SERV",false,false,22,true,"servicos"],
  ["REC_SERV_CART","Cartões e cadernetas vacinais","receita","REC_SERV",false,false,23,true,"servicos"],
  ["REC_OUT","Outras receitas","receita","REC",false,false,30,true,"outras"],
  ["REC_DESC","Descontos concedidos","receita","REC",false,false,40,true,null],
  ["CUS","Custos operacionais","custo",null,true,false,100,true,null],
  ["CUS_VAC","Compra de vacinas","custo","CUS",false,false,101,true,"vacinas"],
  ["CUS_FRETE","Fretes sobre compras","custo","CUS",false,false,102,true,"vacinas"],
  ["CUS_PERDA","Perdas, vencimentos e avarias","custo","CUS",false,false,103,true,"vacinas"],
  ["CUS_MAT","Materiais de aplicação e cadeia fria","custo","CUS",false,false,104,true,"vacinas"],
  ["CUS_TAXA","Taxas de cartão, convênio e antecipação","custo","CUS",false,false,105,true,null],
  ["CUS_IMP","Impostos sobre a receita","custo","CUS",false,false,106,true,null],
  ["DESP","Despesas operacionais e outras receitas","despesa",null,true,false,200,true,null],
  ["DESP_PES","Pessoal","despesa","DESP",true,false,210,true,null],
  ["DESP_PES_PRO","Pró-labore","despesa","DESP_PES",false,false,211,true,null],
  ["DESP_PES_SAL","Salários, férias e 13º","despesa","DESP_PES",false,false,212,true,null],
  ["DESP_PES_ENC","Encargos (INSS e FGTS)","despesa","DESP_PES",false,false,213,true,null],
  ["DESP_PES_BEN","Benefícios, treinamentos e uniformes","despesa","DESP_PES",false,false,214,true,null],
  ["DESP_OCU","Ocupação e estrutura","despesa","DESP",true,false,220,true,null],
  ["DESP_OCU_ALU","Aluguel e IPTU","despesa","DESP_OCU",false,false,221,true,null],
  ["DESP_OCU_UTI","Energia, água e internet","despesa","DESP_OCU",false,false,222,true,null],
  ["DESP_OCU_MAN","Manutenção, limpeza e segurança","despesa","DESP_OCU",false,false,223,true,null],
  ["DESP_ADM","Administrativas","despesa","DESP",true,false,230,true,null],
  ["DESP_ADM_GER","Material, software, seguros e demais","despesa","DESP_ADM",false,false,231,true,null],
  ["DESP_ADM_PRO","Serviços profissionais (contábil, jurídico, SST)","despesa","DESP_ADM",false,false,232,true,null],
  ["DESP_ADM_LIC","Licenças, alvarás e taxas","despesa","DESP_ADM",false,false,233,true,null],
  ["DESP_MKT","Comercial e marketing","despesa","DESP",false,false,240,true,null],
  ["DESP_FIN","Financeiras (tarifas, juros, IOF)","despesa","DESP",false,false,250,true,null],
  ["DESP_RET","Impostos retidos pagos","despesa","DESP",false,false,260,true,null],
  ["DESP_REND","Rendimentos financeiros","despesa","DESP",false,true,270,true,null],
  ["INV","Investimentos","investimento",null,true,true,300,true,null],
  ["INV_EQP","Equipamentos, mobiliário e obras","investimento","INV",false,true,301,true,null],
  ["INV_VEN","Venda de ativo imobilizado","investimento","INV",false,true,302,true,null],
  ["FIN","Financiamentos e sócios","financiamento",null,true,true,400,true,null],
  ["FIN_EMP","Empréstimos e financiamentos","financiamento","FIN",false,true,401,true,null],
  ["FIN_SOC","Aportes e distribuição de lucros","financiamento","FIN",false,true,402,true,null],
];
const CENT = ["iguatu", "ico", "cajazeiras", "cd", "sem_centro"];
const ROOTS = new Set(["REC", "CUS", "DESP", "INV", "FIN"]); // cabeçalhos de grupo: a tela os desenha sozinha
const r2 = (x) => Math.round(x * 100) / 100;

export function montarRaw(base) {
  const todas = CONTAS.map((c) => ({ codigo: c[0], nome: c[1], grupo: c[2], pai: c[3], subtotal: c[4], nao_operacional: c[5], ordem: c[6], incluir_dre: c[7], linha_negocio: c[8] }));
  const contas = todas.filter((c) => !ROOTS.has(c.codigo)).map((c) => ({ ...c, pai: ROOTS.has(c.pai) ? null : c.pai }));
  const grupo = Object.fromEntries(contas.map((c) => [c.codigo, c.grupo]));
  const emp = Object.fromEntries(CENT.map((c) => [c, { valores: [], dre: [], caixa: [], saldos_contas: [] }]));
  const meses = [...new Set(base.valores.map((v) => v[0]))].sort();
  for (const [mes, conta, centro, val] of base.valores) {
    if (!emp[centro] || !grupo[conta]) continue;
    emp[centro].valores.push({ competencia: mes + "-01", conta, fonte: "nibo", valor: Number(val) });
  }
  for (const c of CENT) {
    for (const mes of meses) {
      const vs = emp[c].valores.filter((v) => v.competencia === mes + "-01");
      const s = (g) => r2(vs.filter((v) => grupo[v.conta] === g).reduce((a, v) => a + v.valor, 0));
      const rec = s("receita"), cus = s("custo"), des = s("despesa"), inv = s("investimento"), fin = s("financiamento");
      const rend = r2(vs.filter((v) => v.conta === "DESP_REND").reduce((a, v) => a + v.valor, 0));
      const mc = r2(rec + cus), res = r2(mc + des);
      emp[c].dre.push({ competencia: mes + "-01", receita: rec, custos: cus, despesas_e_outras: des, rendimentos_financeiros: rend,
        investimentos: inv, financiamentos: fin, margem_contribuicao: mc, resultado_operacional: res, resultado_sem_rendimentos: r2(res - rend),
        despesas_fixas: r2(Math.abs(des - rend)), variacao_caixa: r2(res + inv + fin) });
    }
  }
  // saldos: o Nibo não divide saldo por centro de custo, então todas as contas ficam em sem_centro
  const porData = {};
  for (const [d, nome, saldo] of base.saldos) {
    emp.sem_centro.saldos_contas.push({ data: d, conta: nome, saldo: Number(saldo) });
    porData[d] = (porData[d] ?? 0) + Number(saldo);
  }
  for (const d of Object.keys(porData).sort()) emp.sem_centro.caixa.push({ data: d, fonte: "nibo", saldo: r2(porData[d]), aproximado: false });
  return { contas, empresas: emp, gerado_em: base.sync, ultima_sincronizacao: base.sync };
}
