# Painéis financeiros ACESF

Uma página de login para cada perfil,  **ligada ao banco em tempo real** (Supabase).

## Endereços
- `/prontomed/`: só a Prontomed (a página não contém nada da IMUNNE).
- `/imunne/`: só a IMUNNE (nada da Prontomed).
- `/administrador/`: vê as duas empresas, com menu lateral.
- `/` (raiz): só o logo, sem links.
Cada perfil só entra com a própria senha; a senha de outra empresa é recusada no banco.

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
where papel = 'prontomed'; -- ou 'imunne' / 'admin'
```
Use senhas longas. A senha nunca fica no repositório.

## Alterar o código
`python3 build.py` gera de novo as 4 páginas (só biblioteca padrão). `ACESF_API_URL` e `ACESF_API_KEY` podem ser passadas por variável de ambiente.

## Estrutura
- `src/prontomed/js`, `src/imunne/js`: os dois painéis (JS puro).
- `src/shell/shell.js`: login, busca ao banco, atualização automática e menu lateral.
- `css/`: tokens e estilos. `assets/logo.png`: logo ACESF.
- Banco: tabelas `acesf_usuario`, `acesf_acesso_log`; funções `acesf_dados`, `imunne_base`, `painel_publico`.
