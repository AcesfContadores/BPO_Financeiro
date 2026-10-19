# Painéis financeiros ACESF

Página única com login por empresa (Prontomed e IMUNNE) e acesso de administrador.
Os números de cada empresa ficam **criptografados dentro do `index.html`** (AES-GCM, chave derivada da senha com PBKDF2). Sem a senha, o conteúdo não abre.

## Publicar no GitHub Pages
1. Suba esta pasta (sem `data/*.json` e `credenciais.json`, já cobertos pelo `.gitignore`).
2. Em *Settings → Pages*, escolha a branch e a pasta raiz. A página é o `index.html`.

> Prefira repositório **privado**. Em repositório público qualquer pessoa pode baixar o `index.html` e tentar adivinhar as senhas sem limite. Use senhas longas.

## Atualizar os números ou trocar senhas
1. Coloque os dados em `data/prontomed.json` e `data/imunne.json`.
2. Copie `credenciais.exemplo.json` para `credenciais.json` e defina as senhas (se o arquivo não existir, o build gera senhas aleatórias e grava nele).
3. `pip install -r requirements.txt` e depois `python3 build.py` — gera um novo `index.html`.
4. Faça commit do `index.html`.

## Estrutura
- `src/prontomed/js`, `src/imunne/js`: os dois painéis (JS puro, módulos).
- `src/shell/shell.js`: login, criptografia e menu lateral por empresa.
- `css/`: tokens e estilos de cada painel e da casca.
- `assets/logo.png`: logo da ACESF (branco com fundo transparente).
- `build.py`: junta tudo em um `index.html` autocontido e criptografa os dados.

Os dados vêm do Supabase (tabelas `painel_*` e `imunne_*`, sincronizadas do Nibo). O `index.html` é uma foto dos dados na data de geração; o botão "Atualizar" não busca nada.
