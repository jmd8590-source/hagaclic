import os
import json
import re
import unicodedata
from flask import Flask, render_template, request, jsonify, send_file
from pdf_generator import build_pdf_buffer
import orientacion_service

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

# Cargar catálogo de trámites
TRAMITES_FILE = os.path.join(os.path.dirname(__file__), 'data', 'tramites.json')

def load_tramites():
    with open(TRAMITES_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

# Función de normalización de cadenas (sin acentos, minúsculas, sin puntuación)
def normalize_text(text):
    if not text:
        return ""
    text = text.lower()
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    return ' '.join(text.split())

# Stopwords habituales en español
STOPWORDS = {
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'en', 'por', 'para',
    'con', 'a', 'y', 'o', 'u', 'que', 'como', 'donde', 'cuando', 'mi', 'mis', 'tu', 'tus', 'su',
    'sus', 'me', 'te', 'se', 'nos', 'os', 'le', 'les', 'tengo', 'quiero', 'necesito', 'hacer',
    'como', 'puedo', 'debo', 'darme', 'dar', 'pedir', 'solicitar', 'tramitar', 'sacar'
}

# Diccionario de intenciones y sinónimos para el lenguaje natural de la ciudadanía
INTENTS_MAP = {
    'fianza': ['reclamar-fianza-casero'],
    'casero': ['reclamar-fianza-casero'],
    'arrendador': ['reclamar-fianza-casero'],
    'alquiler': ['reclamar-fianza-casero'],
    'inquilino': ['reclamar-fianza-casero'],
    'llaves': ['reclamar-fianza-casero'],
    'dueno': ['reclamar-fianza-casero'],
    'luz': ['baja-suministro'],
    'gas': ['baja-suministro'],
    'telefono': ['baja-suministro'],
    'telefonica': ['baja-suministro'],
    'fibra': ['baja-suministro'],
    'router': ['baja-suministro'],
    'movistar': ['baja-suministro'],
    'vodafone': ['baja-suministro'],
    'orange': ['baja-suministro'],
    'masmovil': ['baja-suministro'],
    'digi': ['baja-suministro'],
    'iberdrola': ['baja-suministro'],
    'endesa': ['baja-suministro'],
    'naturgy': ['baja-suministro'],
    'suministro': ['baja-suministro'],
    'suministros': ['baja-suministro'],
    'dni': ['renovar-dni'],
    'carnet': ['renovar-dni'],
    'identidad': ['renovar-dni'],
    'caducado': ['renovar-dni'],
    'policia': ['renovar-dni', 'cita-previa-extranjeria'],
    'comisaria': ['renovar-dni'],
    'consumo': ['reclamar-compra-consumo'],
    'defectuoso': ['reclamar-compra-consumo'],
    'averiado': ['reclamar-compra-consumo'],
    'roto': ['reclamar-compra-consumo'],
    'garantia': ['reclamar-compra-consumo'],
    'devolucion': ['reclamar-compra-consumo', 'reclamar-fianza-casero'],
    'reembolso': ['reclamar-compra-consumo'],
    'omic': ['reclamar-compra-consumo'],
    'tienda': ['reclamar-compra-consumo'],
    'padron': ['empadronarse'],
    'empadronar': ['empadronarse'],
    'empadronarme': ['empadronarse'],
    'empadronarse': ['empadronarse'],
    'empadronamiento': ['empadronarse'],
    'volante': ['empadronarse'],
    'ayuntamiento': ['empadronarse'],
    'mudanza': ['empadronarse'],
    'nie': ['cita-previa-extranjeria'],
    'tie': ['cita-previa-extranjeria'],
    'huellas': ['cita-previa-extranjeria'],
    'extranjeria': ['cita-previa-extranjeria'],
    'residencia': ['cita-previa-extranjeria'],
    'papeles': ['cita-previa-extranjeria'],
    'paro': ['prestacion-desempleo-sepe'],
    'desempleo': ['prestacion-desempleo-sepe'],
    'sepe': ['prestacion-desempleo-sepe'],
    'inem': ['prestacion-desempleo-sepe'],
    'despido': ['prestacion-desempleo-sepe'],
    'subsidio': ['prestacion-desempleo-sepe'],
    'darde': ['prestacion-desempleo-sepe'],
    'gimnasio': ['cancelar-gimnasio'],
    'gym': ['cancelar-gimnasio'],
    'fitness': ['cancelar-gimnasio'],
    'cuota': ['cancelar-gimnasio']
}

STEM_MAPPINGS = [
    ('empadron', 'empadronarse', 60),
    ('padron', 'empadronarse', 50),
    ('fianz', 'reclamar-fianza-casero', 60),
    ('caser', 'reclamar-fianza-casero', 50),
    ('arrend', 'reclamar-fianza-casero', 40),
    ('desemple', 'prestacion-desempleo-sepe', 60),
    ('sepe', 'prestacion-desempleo-sepe', 50),
    ('gimnas', 'cancelar-gimnasio', 60),
    ('extranjer', 'cita-previa-extranjeria', 60),
    ('garant', 'reclamar-compra-consumo', 50),
    ('defect', 'reclamar-compra-consumo', 50),
    ('averi', 'reclamar-compra-consumo', 50),
    ('suministr', 'baja-suministro', 50),
    ('telefon', 'baja-suministro', 40),
]

def search_tramites(query="", categoria=None):
    all_tramites = load_tramites()
    if not query and not categoria:
        return all_tramites
    
    clean_query = normalize_text(query)
    tokens = [t for t in clean_query.split() if t not in STOPWORDS and len(t) > 1]
    
    scored_results = []
    
    for item in all_tramites:
        # Filtrar por categoría si se especificó
        if categoria and categoria.lower() != 'todas' and item['categoria'].lower() != categoria.lower():
            continue
            
        score = 0
        norm_title = normalize_text(item['titulo'])
        norm_resumen = normalize_text(item['resumen'])
        norm_keywords = [normalize_text(kw) for kw in item.get('palabras_clave', [])]
        
        # Coincidencia exacta o frase completa en título o resumen
        if clean_query:
            if clean_query in norm_title:
                score += 50
            if clean_query in norm_resumen:
                score += 25
                
            # Comprobación de raíces (stemming)
            for stem, target_id, weight in STEM_MAPPINGS:
                if item['id'] == target_id:
                    if stem in clean_query:
                        score += weight
                
            # Comprobación de tokens individuales
            for token in tokens:
                if token in norm_title:
                    score += 20
                if token in norm_resumen:
                    score += 8
                for kw in norm_keywords:
                    if token == kw:
                        score += 25
                    elif token in kw or kw in token:
                        score += 15
                
                # Sinónimos e intenciones directas
                if token in INTENTS_MAP:
                    target_ids = INTENTS_MAP[token]
                    if item['id'] in target_ids:
                        score += 45
        else:
            # Si no hay texto pero hay categoría
            score = 10

        if score > 0 or not clean_query:
            scored_results.append((score, item))
            
    # Ordenar por mayor puntuación
    scored_results.sort(key=lambda x: x[0], reverse=True)
    return [item for score, item in scored_results]

@app.route('/')
def index():
    tramites = load_tramites()
    categorias = sorted(list(set(t['categoria'] for t in tramites)))
    return render_template('index.html', tramites=tramites, categorias=categorias)

@app.route('/api/tramites')
def api_tramites():
    q = request.args.get('q', '').strip()
    categoria = request.args.get('categoria', '').strip()
    results = search_tramites(q, categoria)
    
    # Si no hay resultados con la categoría activa pero sí hay consulta,
    # buscar en todas las categorías para no frustrar al usuario
    if not results and categoria and categoria.lower() != 'todas':
        results = search_tramites(q, 'todas')
    
    # Si la consulta no coincide plenamente con los 8 trámites o para dar asistencia ampliada
    orientacion = orientacion_service.find_guidance_for_query(q) if q else None
    
    return jsonify({
        'total': len(results),
        'query': q,
        'categoria': categoria,
        'tramites': results,
        'orientacion_asistida': orientacion
    })

@app.route('/api/orientacion')
def api_orientacion():
    q = request.args.get('q', '').strip()
    orientacion = orientacion_service.find_guidance_for_query(q)
    if orientacion:
        return jsonify(orientacion)
    return jsonify({'error': 'No se especificó consulta'}), 400

@app.route('/api/tramite/<tramite_id>')
def api_tramite_detail(tramite_id):
    all_tramites = load_tramites()
    for item in all_tramites:
        if item['id'] == tramite_id:
            return jsonify(item)
    return jsonify({'error': 'Trámite no encontrado'}), 404

@app.route('/api/generar-carta-pdf', methods=['POST'])
def api_generar_pdf():
    payload = request.get_json(force=True)
    if not payload:
        return jsonify({'error': 'Datos insuficientes'}), 400
    
    template_type = payload.get('template_type', 'reclamacion_empresa')
    
    # Validaciones mínimas de datos requeridos
    solicitante_nombre = payload.get('solicitante_nombre', '').strip()
    solicitante_nif = payload.get('solicitante_nif', '').strip()
    destinatario_nombre = payload.get('destinatario_nombre', '').strip()
    
    if not solicitante_nombre or not solicitante_nif or not destinatario_nombre:
        return jsonify({'error': 'Faltan datos obligatorios (Nombre y NIF del solicitante, y Nombre del destinatario)'}), 400
    
    try:
        pdf_buffer = build_pdf_buffer(template_type, payload)
        clean_name = re.sub(r'[^a-zA-Z0-9_-]', '_', solicitante_nombre.split()[0].lower())
        filename = f"carta_hagaclic_{template_type}_{clean_name}.pdf"
        
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        app.logger.error(f"Error generando PDF: {e}")
        return jsonify({'error': f'Error en el servidor al generar el PDF: {str(e)}'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"HagaClic iniciado en http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
