"""
build_static.py — HagaClic
Genera un index.html completamente autocontenido para despliegue en
Cloudflare Pages u otros hostings de archivos estáticos.

Uso:  python build_static.py
Salida: index.html en la raíz del proyecto (listo para desplegar)
"""

import os
import json
import re

BASE_DIR = os.path.dirname(__file__)

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def build():
    print("Generando index.html estático para Cloudflare Pages...")

    # 1. Leer recursos
    css = read_file(os.path.join(BASE_DIR, 'static', 'css', 'style.css'))
    js  = read_file(os.path.join(BASE_DIR, 'static', 'js', 'app.js'))
    with open(os.path.join(BASE_DIR, 'data', 'tramites.json'), 'r', encoding='utf-8') as f:
        tramites_data = json.load(f)

    # 2. Leer plantilla HTML base
    html = read_file(os.path.join(BASE_DIR, 'templates', 'index.html'))

    # 3. Eliminar bloques Jinja2 de inline_css/inline_js (del fix anterior)
    #    Sustituir el bloque {% if inline_css %}...{% endif %} por <style>...</style>
    style_block = f'<style>\n{css}\n</style>'
    html = re.sub(
        r'\{%\s*if inline_css\s*%\}.*?\{%\s*endif\s*%\}',
        lambda m: style_block,
        html, flags=re.DOTALL
    )
    #    Sustituir el bloque {% if inline_js %}...{% endif %} por <script>...</script>
    #    IMPORTANTE: el JS se emite ANTES de cerrar, con los datos de trámites embebidos
    tramites_json_str = json.dumps(tramites_data, ensure_ascii=False)
    embedded_data_js = f"""
// ============================================================
// DATOS EMBEBIDOS — generados por build_static.py
// Permite funcionar sin servidor Python (Cloudflare Pages)
// ============================================================
window.__TRAMITES_DATA__ = {tramites_json_str};
"""
    js_with_data = embedded_data_js + js
    script_block = f'<script>\n{js_with_data}\n</script>'
    html = re.sub(
        r'\{%\s*if inline_js\s*%\}.*?\{%\s*endif\s*%\}',
        lambda m: script_block,
        html, flags=re.DOTALL
    )

    # 4. Si quedan referencias a url_for para CSS/JS (fallback del else), eliminarlas
    html = re.sub(
        r'<link[^>]+url_for[^>]+css[^>]+>',
        '', html
    )
    html = re.sub(
        r'<script[^>]+url_for[^>]+js[^>]+></script>',
        '', html
    )

    # 5. Eliminar cualquier sintaxis Jinja2 restante (variables no resueltas)
    html = re.sub(r'\{\{[^}]+\}\}', '', html)
    html = re.sub(r'\{%[^%]+%\}', '', html)

    # 6. Escribir index.html en la raíz
    output_path = os.path.join(BASE_DIR, 'index.html')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)

    size_kb = len(html.encode('utf-8')) / 1024
    print(f"[OK] index.html generado: {size_kb:.1f} KB")
    print(f"   CSS: {len(css)/1024:.1f} KB incrustado")
    print(f"   JS:  {len(js)/1024:.1f} KB incrustado")
    print(f"   Tramites: {len(tramites_data)} entradas embebidas")
    print(f"   Salida: {output_path}")

if __name__ == '__main__':
    build()
