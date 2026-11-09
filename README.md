# Painéis financeiros ACESF

Uma página de login para cada perfil,  **ligada ao banco em tempo real** (Supabase, projeto **Acesf-dev**).

## Endereços
- `/` (raiz): **uma única tela de login para todos**. O usuário digitado define o painel que abre (Prontomed, IMUNNE, E. Pereira ou administrador, que vê as três).
- `/teste/`: Empresa Modelo, sem login, com dados fictícios embutidos. Não consulta o banco.
- `/prontomed/`, `/imunne/`, `/epereira/`, `/administrador/`: apenas redirecionam para a raiz.

## Como funciona
- O `index.html` não contém nenhum dado financeiro nem senha. Ele só tem a URL e a chave pública (`anon`) do Supabase.
- No login, a página chama a função `acesf_dados(usuario, senha)` no banco. O banco confere a senha (bcrypt) e devolve só os dados a que aquele perfil tem direito.
- A página se atualiza sozinha a cada 5 minutos (e ao voltar para a aba, se passou de 2 min). O botão "Atualizar" força na hora.
- No banco, o sync com o Nibo roda de hora em hora, das 06h às 19h (Brasília). Alterou no banco → aparece no painel na próxima atualização.
- 5 senhas erradas seguidas bloqueiam o usuário por 5 minutos.

## Publicar no GitHub Pages
1. Suba esta pasta para um repositório.
2. *Settings → Pages* → branch e pasta raiz. As páginas são `prontomed/index.html`, `imunne/index.html` e `administrador/index.html`.

## Trocar senhas (SQL Editor do Supabase)
```sql
update acesf_usuario
set senha_hash = extensions.crypt('NOVA_SENHA', extensions.gen_salt('bf',10))
where papel = 'prontomed'; -- ou 'imunne' / 'epereira' / 'admin'
```
Use senhas longas. A senha nunca fica no repositório.

## Alterar o código
`python3 build.py` gera de novo as 6 páginas (só biblioteca padrão). `ACESF_API_URL` e `ACESF_API_KEY` podem ser passadas por variável de ambiente.

## Estrutura
- `src/prontomed/js`, `src/imunne/js`, `src/epereira/js`: os três painéis (JS puro). O da E. Pereira não tem centros de custo: tudo aparece como Total.
- `src/shell/shell.js`: login, busca ao banco, atualização automática e menu lateral.
- `css/`: tokens e estilos. `assets/logo.png`: logo ACESF.
- Banco: tabelas `acesf_usuario`, `acesf_acesso_log`; funções `acesf_dados`, `imunne_base`, `epereira_base`, `painel_publico`. E. Pereira: tabelas `epereira_*`, função de sincronização `epereira-sync-nibo` (secret `E_PEREIRA_TOKEN`).
