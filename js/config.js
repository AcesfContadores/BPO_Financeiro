// Configuração pública do painel. A chave abaixo é a chave "publishable" (anon) do Supabase:
// ela foi feita para ficar no navegador. O acesso é limitado à função painel_publico(),
// que só devolve dados das tabelas painel_* (somente leitura).
export const CONFIG = {
  SUPABASE_URL: "https://cnzsujluejjptxofxxsr.supabase.co",
  SUPABASE_KEY: "sb_publishable_dU1f80Y3yp3iGiZPfPRzLA_d0IAeXGM",
  RPC: "painel_publico",
  // Competência exibida por padrão (YYYY-MM). Se vazio, usa o último mês com dados de receita.
  COMPETENCIA_PADRAO: "2026-09",
  MESES_JANELA: 4, // Jun–Set: mês atual + 3 anteriores
  // Contas do Nibo/fórmulas usam sempre a MESMA convenção de sinais (ver docs/PROMPT_FRONT.md).
};
