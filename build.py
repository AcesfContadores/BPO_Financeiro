"""Gera o index.html do painel ao vivo (uma página só, sem dados dentro).
Uso: python3 build.py
Os dados e o login vêm do Supabase (função acesf_dados) quando a pessoa entra na página.
"""
import re, os, base64, pathlib
root = str(pathlib.Path(__file__).resolve().parent)

# Chave pública (anon) do projeto Supabase: pode ficar no arquivo. Quem protege os dados é o login no banco.
API_URL = os.environ.get("ACESF_API_URL", "https://cnzsujluejjptxofxxsr.supabase.co")
API_KEY = os.environ.get("ACESF_API_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuenN1amx1ZWpqcHR4b2Z4eHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NTI4MzQsImV4cCI6MjEwNTAyODgzNH0.vmVkztn8rb25UxjEReM7wyUkIg3NVQ1ZfQCqZ55V-vo")

def bundle(dirname, entry_export_name):
    mods = {}
    base = f"{root}/{dirname}"
    for d, _, fs in os.walk(base):
        for f in fs:
            if f.endswith(".js"):
                p = os.path.join(d, f); mods[os.path.relpath(p, base)] = open(p, encoding="utf8").read()
    out = []
    for name, src in mods.items():
        exports = []
        def imp(m):
            parts = []
            for n in [x.strip() for x in m.group(1).split(",") if x.strip()]:
                if " as " in n:
                    a, b = [t.strip() for t in n.split(" as ")]; parts.append(f"{a}: {b}")
                else: parts.append(n)
            spec = os.path.normpath(os.path.join(os.path.dirname(name), m.group(2)))
            return "const { " + ", ".join(parts) + f' }} = __r("{spec}");'
        src = re.sub(r'import\s*\{([^}]*)\}\s*from\s*"([^"]+)";', imp, src)
        src = re.sub(r'^export\s+((?:async\s+)?function\s+|const\s+|let\s+|class\s+)(\w+)', lambda m: (exports.append(m.group(2)), m.group(1) + m.group(2))[1], src, flags=re.M)
        def exl(m):
            for n in m.group(1).split(","): exports.append(n.strip())
            return ""
        src = re.sub(r'^export\s*\{([^}]*)\};?', exl, src, flags=re.M)
        assert not re.search(r'^\s*(export|import)\s', src, flags=re.M), name
        out.append(f'__d["{name}"] = function () {{\n{src}\nreturn {{ {", ".join(dict.fromkeys(exports))} }};\n}};')
    return "const %s = (function () {\nconst __d = {}, __c = {};\nfunction __r(n) { return __c[n] ??= __d[n](); }\n%s\nreturn __r(\"app.js\");\n})();\n" % (entry_export_name, "\n".join(out))

pjs = bundle("src/prontomed/js", "Prontomed"); ijs = bundle("src/imunne/js", "Imunne")
logo = base64.b64encode(open(root + "/assets/logo.png", "rb").read()).decode()
shell = f'const ACESF_API = {{ url: "{API_URL}", key: "{API_KEY}" }};\nconst LOGO = "data:image/png;base64,{logo}";\n' + open(f"{root}/src/shell/shell.js", encoding="utf8").read()

# ── CSS combinado
pt = open(root + "/css/tokens-prontomed.css", encoding="utf8").read()
it = open(root + "/css/tokens-imunne.css", encoding="utf8").read()
pd = open(root + "/css/dashboard-prontomed.css", encoding="utf8").read()
idd = open(root + "/css/dashboard-imunne.css", encoding="utf8").read()
# tokens: parte do Prontomed + variáveis de empresa do IMUNNE
emp_i = "  --emp-iguatu: #3F6FC4;\n  --emp-ico: #E07A5F;\n  --emp-cajazeiras: #2BB39A;\n  --emp-cd: #8E7CC3;\n  --emp-sem_centro: #98A4B3;\n"
pt = pt.replace("  --emp-grupo: #C9A96E;\n", "  --emp-grupo: #C9A96E;\n" + emp_i, 1)
sel_i = "".join(f'[data-empresa="{e}"] {{ --emp: var(--emp-{e}); }}\n' for e in ["iguatu", "ico", "cajazeiras", "cd", "sem_centro"])
tok = pt.replace('body[data-empresa=', '[data-empresa=') + "\n" + sel_i
dash = pd.replace('body[data-empresa=', '[data-empresa=') + '\n[data-empresa="iguatu"] .hero, [data-empresa="ico"] .hero, [data-empresa="cajazeiras"] .hero, [data-empresa="cd"] .hero { background: linear-gradient(135deg, var(--navy), #2F5C93); }\n'
dash = re.sub(r'^body\s*\{[^}]*\}\n', 'body { font-size: 14px; line-height: 1.45; font-variant-numeric: tabular-nums; }\n', dash, count=1, flags=re.M)
# paleta categórica: teal à frente (navy deixa de ser a primeira cor de tudo)
tok = tok.replace("--cat-1: #1F3A6E; --cat-2: #C9A96E; --cat-3: #E07A5F; --cat-4: #8E7CC3; --cat-5: #5B9BD5; --cat-6: #2BB39A;", "--cat-1: #3F7FD0; --cat-2: #C9A96E; --cat-3: #4FA84A; --cat-4: #F08A24; --cat-5: #D9473F; --cat-6: #8E7CC3;")
tok = tok.replace("--cat-1: #7FA2E8; --cat-2: #D9B97C; --cat-3: #F0907A; --cat-4: #A99BDB; --cat-5: #5FC7E8; --cat-6: #3CC3A8;", "--cat-1: #7FA2E8; --cat-2: #D9B97C; --cat-3: #7CCB72; --cat-4: #F5A25A; --cat-5: #F0767A; --cat-6: #A99BDB;")
css = tok + "\n" + dash + "\n" + open(f"{root}/css/shell.css", encoding="utf8").read()

# paleta dos gráficos: azul, dourado, verde, laranja e vermelho (cinza para "outras")
PAL_L = "--cat-1: #3F6FC4; --cat-2: #C9A96E; --cat-3: #2FA36B; --cat-4: #F08A3C; --cat-5: #D64545; --cat-6: #1F3A6E; --cat-outras: #B8C2CC;\n  --lin-lab: #3F6FC4; --lin-cons: #2FA36B; --lin-img: #C9A96E; --lin-cardio: #F08A3C; --lin-acess: #B8C2CC;\n  --lab-part: #3F6FC4; --lab-conv: #F08A3C; --lab-emp: #2FA36B;\n  --mu-conv: #3F6FC4; --mu-multi: #2FA36B; --mu-atend-part: #C9A96E; --mu-outras: #B8C2CC;\n  --esp-psico: #3F6FC4; --esp-psicoped: #2FA36B; --esp-to: #C9A96E; --esp-fisio: #F08A3C; --esp-fono: #D64545; --esp-nutri: #1F3A6E; --esp-outros: #B8C2CC;\n  --emp-multidisciplinar: #2FA36B; --emp-ico: #F08A3C; --emp-cajazeiras: #2FA36B; --emp-cd: #C9A96E;"
PAL_D = "--cat-1: #7FA2E8; --cat-2: #D9B97C; --cat-3: #4CC38A; --cat-4: #F6A15E; --cat-5: #EF7B7B; --cat-6: #A9C3F2; --cat-outras: #7E8AA3;\n  --lin-lab: #7FA2E8; --lin-cons: #4CC38A; --lin-img: #D9B97C; --lin-cardio: #F6A15E; --lin-acess: #7E8AA3;\n  --lab-part: #7FA2E8; --lab-conv: #F6A15E; --lab-emp: #4CC38A;\n  --mu-conv: #7FA2E8; --mu-multi: #4CC38A; --mu-atend-part: #D9B97C; --mu-outras: #7E8AA3;\n  --esp-psico: #7FA2E8; --esp-psicoped: #4CC38A; --esp-to: #D9B97C; --esp-fisio: #F6A15E; --esp-fono: #EF7B7B; --esp-nutri: #A9C3F2; --esp-outros: #7E8AA3;\n  --emp-multidisciplinar: #4CC38A; --emp-ico: #F6A15E; --emp-cajazeiras: #4CC38A; --emp-cd: #D9B97C;"
css += f"\n:root {{ {PAL_L} }}\n@media (prefers-color-scheme: dark) {{ :root:not([data-tema=\"claro\"]) {{ {PAL_D} }} }}\n:root[data-tema=\"escuro\"] {{ {PAL_D} }}\n"
css += "\n.embutida .btn[title^=\"Buscar\"] { display: none; }\n"
css = css.replace('@import url("https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap");\n', '')
fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Jost:wght@500;600&display=swap">'

html = f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>Painéis ACESF</title>
{fonts}
<style>
{css}
html, body {{ background: var(--pagina); }}
body {{ margin: 0; }}
</style></head><body>
<div id="acesf"></div>
<script>
(function () {{
  function sync() {{
    var t = document.documentElement.getAttribute("data-theme");
    if (t) document.documentElement.dataset.tema = t === "dark" ? "escuro" : "claro";
  }}
  sync(); new MutationObserver(sync).observe(document.documentElement, {{ attributes: true, attributeFilter: ["data-theme"] }});
}})();
</script>
<script>
{pjs}
{ijs}
{shell}
</script>
</body></html>
"""
open(root + "/index.html", "w", encoding="utf8").write(html)
print("index.html gerado:", len(html), "bytes")
