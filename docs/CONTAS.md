# Catálogo de contas (`contas` no JSON de `painel_publico`)

Formato: `código | grupo | pai | tipo | nome`. **Subtotal = soma dos filhos** (não vem preenchido em `valores`; só as folhas vêm). Valores: receita **positiva**, custo/despesa/investimento/financiamento **negativos**.

Contas da **Prontomed** (sem prefixo `mu_`) e da **Multidisciplinar** (prefixo `mu_`). Contas sem prefixo que aparecem nas duas empresas: `des_rendimentos_fin`, `des_impostos_retidos`, `des_reembolsos_recuperacoes`, `fin_*`.

## Prontomed
```
rec_lab | receita | - | subtotal | Serviços laboratoriais
  rec_lab_particulares / rec_lab_convenios / rec_lab_empresas
rec_cons | receita | - | subtotal | Multiprofissionais (consultas)
  rec_cons_medicas_part / rec_cons_medicas_conv / rec_cons_outros_prof
rec_cardio | subtotal → rec_cardio_multi, rec_cardio_clinica
rec_img | subtotal → rec_img_raiox, rec_img_densitometria, rec_img_mamografia
rec_procedimentos | folha | Procedimentos e pequenos exames
rec_acessorias | folha | Receitas acessórias
rec_descontos_concedidos | folha (redução de receita)
rec_residual | folha | Ajuste / não detalhado (receitas)

cus_lab | subtotal → cus_lab_reagentes, cus_lab_apoio, cus_lab_residuos
cus_tec | subtotal → cus_tec_repasse_medicos, cus_tec_repasse_outros, cus_tec_salarios, cus_tec_materiais, cus_tec_13_manut, cus_comissoes_producao
cus_impostos_receita | folha | Impostos sobre receita
cus_taxas_cartao | folha | Taxas de cartão/maquininha
cus_residual | folha | Ajuste / não detalhado (custos)

des_pessoal | subtotal → des_pessoal_salarios, des_pessoal_inss_fgts, des_pessoal_prolabore, des_pessoal_outros
des_ocupacao | subtotal → des_ocup_energia, des_ocup_aluguel, des_ocup_outros
des_manutencao | subtotal → des_manut_predial, des_manut_locacao_equip, des_manut_outros
des_adm | subtotal → des_adm_sistemas, des_adm_manut_equip, des_adm_bens_pequeno_valor, des_adm_outros
des_comercial_marketing | folha
des_financeiras | folha | Financeiras (tarifas/juros)
des_rendimentos_fin | folha | NÃO OPERACIONAL (rendimentos financeiros, positivo)
des_impostos_retidos | folha | Impostos retidos pagos
des_a_identificar | folha | Despesas a identificar
des_reembolsos_recuperacoes | folha
des_residual | folha | Outras (não detalhadas)

inv_ativo_fixo | investimento | folha
fin_emprestimos | financiamento | folha
fin_aportes_socios, fin_distribuicao_lucros | financiamento | FORA DO DRE (incluir_dre = false)
```

## Multidisciplinar (`mu_`)
```
mu_rec_atend | subtotal → mu_rec_conv (convênios), mu_rec_part (particulares), mu_rec_pacotes
mu_rec_multi | subtotal → mu_rec_psico, mu_rec_fisio, mu_rec_nutri, mu_rec_outros_prof, mu_rec_medicos
mu_rec_outras | folha | Outras receitas operacionais
mu_rec_residual | folha | ajuste de arredondamento

mu_cus_repasses | subtotal → mu_cus_rep_psico, mu_cus_rep_psicoped, mu_cus_rep_to, mu_cus_rep_fisio, mu_cus_rep_fono, mu_cus_rep_nutri, mu_cus_rep_outros, mu_cus_rep_medicos
mu_cus_assistenciais | folha
mu_cus_impostos | subtotal → mu_cus_simples, mu_cus_pis_cofins
mu_cus_taxas_cartao | folha
mu_cus_residual | folha

mu_des_pessoal | subtotal → mu_des_pes_salarios, mu_des_pes_inss, mu_des_pes_13
mu_des_ocupacao | subtotal → mu_des_ocup_energia, mu_des_ocup_agua, mu_des_ocup_jardinagem, mu_des_ocup_outros
mu_des_manutencao, mu_des_adm, mu_des_comercial, mu_des_financeiras, mu_des_nao_recorrentes | folha
mu_des_residual | folha | diferença entre grupos e total da planilha (jun/26)
mu_inv_ativo_fixo | investimento | folha
```

## Linhas já calculadas pelo banco (`empresas.<emp>.dre[]`, 1 por mês)
`receita, custos, despesas_e_outras, rendimentos_financeiros, investimentos, financiamentos, margem_contribuicao, resultado_operacional, resultado_sem_rendimentos, despesas_fixas, variacao_caixa, margem_contribuicao_pct, margem_operacional_pct, margem_operacional_ajustada_pct, ponto_equilibrio, folga_pe_pct` e, só para a Prontomed, `receita_lab, custo_lab, margem_lab, margem_lab_pct, custo_lab_pct_receita_lab, consultas_medicas, repasse_medicos, margem_consultas, margem_consultas_pct, repasse_pct_consultas`.

Atenção (Multidisciplinar): os campos `*_lab`, `consultas_medicas` e `repasse_medicos` vêm zerados — não se aplicam. Repasse ÷ receita de atendimentos = −`mu_cus_repasses` ÷ (`mu_rec_atend` + `mu_rec_multi`).
