"""
HagaClic - Servicio de Orientación Inteligente para cualquier trámite administrativo en España.
Cuando un usuario escribe una consulta que no está en el catálogo de fichas cerradas,
este motor analiza el lenguaje natural, identifica la competencia administrativa oficial,
y genera una guía completa en tiempo real con pasos, plazos, enlaces oficiales directos,
requisitos y opción de generar la Instancia Oficial en PDF.
"""

import unicodedata
import re

def normalize(text):
    if not text:
        return ""
    text = text.lower()
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    return ' '.join(text.split())

# Base de conocimiento de competencias y procedimientos administrativos en España
KNOWLEDGE_DOMAINS = [
    {
        "id": "fallecimiento-herencia",
        "keywords": [
            "fallecid", "fallecimient", "muert", "defuncion", "herenci", "testament", 
            "ultimas voluntades", "sucesi", "tio", "tia", "padre", "madre", "abuelo", "abuela",
            "familiar fallecido", "entierro", "papeleo muerte", "hereder"
        ],
        "titulo": "Gestión de trámites tras un fallecimiento y herencia",
        "organismo": "Registro Civil, Ministerio de Justicia, Notaría y Agencia Tributaria Autonómica",
        "resumen": "Guía oficial para tramitar los documentos tras el fallecimiento de un familiar (tío, progenitor u otro causante) y gestionar la herencia legalmente.",
        "coste": "Certificado de defunción gratuito. Tasa de Últimas Voluntades: 3,86 € (modelo 790-006). Aranceles notariales e Impuesto de Sucesiones según valor de la herencia y parentesco.",
        "plazo": "6 meses naturales desde el fallecimiento para liquidar el Impuesto de Sucesiones (se puede pedir prórroga de 6 meses más en los primeros 5 meses).",
        "donde": "Registro Civil (defunción), Sede del Ministerio de Justicia (últimas voluntades), Notaría elegida y Consejería de Hacienda autonómica.",
        "enlace_oficial": "https://sede.mjusticia.gob.es/es/tramites/certificado-actos-ultima",
        "enlace_texto": "Sede Ministerio de Justicia (Últimas Voluntades)",
        "pasos": [
            {
                "numero": 1,
                "titulo": "Inscripción y Certificado Literal de Defunción",
                "descripcion": "El médico emite el certificado de defunción. La empresa funeraria o los familiares lo inscriben en el Registro Civil de la localidad. Pide varios certificados literales gratuitos, los necesitarás en todas partes."
            },
            {
                "numero": 2,
                "titulo": "Certificado de Últimas Voluntades y Seguros de Vida",
                "descripcion": "Transcurridos obligatoriamente 15 días hábiles desde el fallecimiento, solicita en el Ministerio de Justicia el Certificado de Actos de Última Voluntad (para saber si otorgó testamento y ante qué notario) y el de Seguros de cobertura de fallecimiento (tasa modelo 790 código 006 de 3,86 €)."
            },
            {
                "numero": 3,
                "titulo": "Acudir a la Notaría (Copia del Testamento o Declaración de Herederos)",
                "descripcion": "Si hay testamento: acudir al notario que lo custodia para pedir copia autorizada. Si no dejó testamento: tramitar ante cualquier notario competente del lugar del fallecimiento o domicilio un Acta de Notoriedad de Declaración de Herederos 'Abintestato'."
            },
            {
                "numero": 4,
                "titulo": "Inventario de bienes y Aceptación de Herencia",
                "descripcion": "Reunir saldos bancarios (pedir a los bancos certificado de posiciones a fecha de fallecimiento), escrituras de inmuebles (notas simples) y documentación de vehículos, y otorgar la escritura de aceptación y adjudicación de herencia."
            },
            {
                "numero": 5,
                "titulo": "Liquidación del Impuesto de Sucesiones y Plusvalía municipal",
                "descripcion": "Dispones de 6 meses desde el fallecimiento para autoliquidar el Impuesto de Sucesiones (modelo 650) en la Comunidad Autónoma y la plusvalía municipal (IIVTNU) si hay bienes inmuebles urbanos."
            }
        ],
        "documentos": [
            "Certificado Literal de Defunción expedido por el Registro Civil.",
            "Certificado de Actos de Última Voluntad (con justificante de la tasa modelo 790-006).",
            "Certificado de Contratos de Seguros con cobertura de fallecimiento.",
            "Copia autorizada del último testamento o Acta Notarial de Declaración de Herederos.",
            "DNI/NIE del fallecido y de todos los herederos llamados a la herencia.",
            "Certificados bancarios de saldos y cuentas a fecha de defunción.",
            "Títulos de propiedad de inmuebles (escrituras o notas simples del Registro de la Propiedad)."
        ],
        "consejos": [
            "¡Atención al plazo de 6 meses! Si prevés retrasos en recopilar los documentos bancarios o localizar herederos, solicita una prórroga por escrito dentro de los primeros 5 meses para evitar recargos fiscales.",
            "Las cuentas del fallecido quedan bloqueadas por el banco hasta que se aporte la escritura de adjudicación y la liquidación del impuesto de sucesiones, pero el banco está obligado a permitir el pago de gastos de entierro y suministros básicos domiciliados."
        ]
    },
    {
        "id": "dgt-vehiculos",
        "keywords": [
            "coche", "moto", "vehiculo", "conducir", "carnet conducir", "matricular", "transferir", 
            "transferencia coche", "multa", "multas", "puntos dgt", "itv", "baja coche", "permiso circulacion",
            "comprar coche usado", "vender coche", "duplicado carnet"
        ],
        "titulo": "Trámites de Vehículos y Conductores en la DGT",
        "organismo": "Dirección General de Tráfico (DGT) / Ministerio del Interior",
        "resumen": "Guía para cambio de titularidad de vehículos, renovación o duplicado del permiso de conducir, pago de multas y gestiones de tráfico.",
        "coste": "Cambio de titularidad coche: tasa DGT 4.1 de 55,70 € (ciclomotores 27,85 €). Duplicado de carnet: 20,80 €.",
        "plazo": "El comprador dispone de 30 días desde la firma del contrato para solicitar la transferencia en la DGT.",
        "donde": "Sede Electrónica de la DGT (con Cl@ve/Certificado) o en Jefaturas Provinciales de Tráfico con cita previa.",
        "enlace_oficial": "https://sede.dgt.gob.es/",
        "enlace_texto": "Sede Electrónica de la DGT",
        "pasos": [
            {
                "numero": 1,
                "titulo": "Contrato de compraventa y pago de transmisiones (ITP)",
                "descripcion": "Firmar el contrato de compraventa por duplicado. Antes de ir a la DGT, pagar el Impuesto de Transmisiones Patrimoniales (modelo 620 o 621) en la hacienda de tu comunidad autónoma."
            },
            {
                "numero": 2,
                "titulo": "Comprobar cargas del vehículo",
                "descripcion": "Solicita un informe de vehículo en la DGT (8,67 €) para verificar que no tenga reserva de dominio, embargos, precintos o multas pendientes."
            },
            {
                "numero": 3,
                "titulo": "Tramitar la transferencia en la DGT",
                "descripcion": "Accede a la sede electrónica de la DGT o pide cita en tu Jefatura. Paga la tasa 4.1 y aporta el contrato, el ITP pagado y los DNI de ambas partes."
            }
        ],
        "documentos": [
            "Contrato de compraventa firmado por comprador y vendedor.",
            "Permiso de circulación original del vehículo y ficha técnica con ITV al día.",
            "Justificante de pago del Impuesto de Transmisiones Patrimoniales (código CET).",
            "DNI o NIE en vigor de ambas partes."
        ],
        "consejos": [
            "Si vendes un coche, asegúrate de que el comprador hace la transferencia en 30 días. Si no lo hace, notifica tú mismo la venta en la DGT para no responder de futuras multas."
        ]
    },
    {
        "id": "hacienda-tributos",
        "keywords": [
            "hacienda", "aeat", "renta", "declaracion renta", "irpf", "borrador renta", "modelo 036", 
            "modelo 037", "autonomo", "alta censal", "devolver hacienda", "certificado corriente hacienda",
            "multa hacienda", "requerimiento hacienda"
        ],
        "titulo": "Trámites y Gestiones en la Agencia Tributaria (Hacienda)",
        "organismo": "Agencia Estatal de Administración Tributaria (AEAT)",
        "resumen": "Cómo tramitar la Declaración de la Renta, pedir borrador, certificados de estar al corriente o contestar requerimientos fiscales.",
        "coste": "Gratuito.",
        "plazo": "Campaña de Renta: generalmente de abril a junio de cada año. Requerimientos: 10 días hábiles para contestar.",
        "donde": "Sede Electrónica de la AEAT (con Cl@ve, DNIe o certificado) o cita previa telefónica / presencial.",
        "enlace_oficial": "https://sede.agenciatributaria.gob.es/",
        "enlace_texto": "Sede Electrónica de la Agencia Tributaria",
        "pasos": [
            {
                "numero": 1,
                "titulo": "Identificarse en la Sede Electrónica",
                "descripcion": "Accede al portal Renta Web o a la sede de la AEAT mediante Cl@ve PIN, Cl@ve Permanente o Certificado Digital."
            },
            {
                "numero": 2,
                "titulo": "Revisar datos fiscales y deducciones autonómicas",
                "descripcion": "Comprueba los datos precargados por Hacienda y añade deducciones por alquiler de vivienda habitual, hijos o donaciones que no suelen venir automáticas."
            },
            {
                "numero": 3,
                "titulo": "Presentación telemática y descarga de justificante",
                "descripcion": "Presenta la declaración y guarda el justificante oficial con el Código Seguro de Verificación (CSV)."
            }
        ],
        "documentos": [
            "DNI / NIE y número de referencia fiscal o Cl@ve.",
            "Número de cuenta bancaria (IBAN) para ingreso o devolución.",
            "Certificados de retenciones del trabajo, datos de hipotecas o contratos de alquiler."
        ],
        "consejos": [
            "Nunca dejes de contestar un requerimiento de Hacienda: el silencio puede conllevar pérdida de deducciones y sanciones automáticas."
        ]
    },
    {
        "id": "seguridad-social-pensiones",
        "keywords": [
            "seguridad social", "inss", "jubilacion", "pension", "ingreso minimo vital", "imv", 
            "baja medica", "incapacidad", "maternidad", "paternidad", "tarjeta sanitaria europea", 
            "vida laboral", "pension no contributiva", "orfandad", "viudedad"
        ],
        "titulo": "Pensiones, Prestaciones y Vida Laboral en la Seguridad Social",
        "organismo": "Instituto Nacional de la Seguridad Social (INSS) / Tesorería General (TGSS)",
        "resumen": "Cómo solicitar pensiones de jubilación, viudedad, Ingreso Mínimo Vital (IMV), bajas o informe de vida laboral.",
        "coste": "100% Gratuito.",
        "plazo": "Jubilación: hasta 3 meses antes o después del cese. Vida laboral: inmediata online.",
        "donde": "Portal 'Tu Seguridad Social', Sede Electrónica del INSS o presencialmente con cita previa.",
        "enlace_oficial": "https://sede.seg-social.gob.es/",
        "enlace_texto": "Sede Electrónica de la Seguridad Social",
        "pasos": [
            {
                "numero": 1,
                "titulo": "Simular o consultar cotizaciones",
                "descripcion": "Entra en el portal 'Tu Seguridad Social' para consultar tus años cotizados y fecha estimada de jubilación o derecho a prestación."
            },
            {
                "numero": 2,
                "titulo": "Solicitar la prestación correspondiente",
                "descripcion": "Rellena el formulario de solicitud online con Cl@ve o a través de la plataforma de envío de escritos del INSS sin certificado."
            },
            {
                "numero": 3,
                "titulo": "Resolución y cobro",
                "descripcion": "El INSS suele resolver en un plazo de 30 a 90 días según la prestación. Los abonos de pensiones se realizan mensualmente."
            }
        ],
        "documentos": [
            "Documento identificativo (DNI/NIE).",
            "Certificado de empresa o justificación de cese (si procede).",
            "Libro de Familia o certificado de defunción (en pensiones de viudedad/orfandad).",
            "Cuenta bancaria titularidad del solicitante (IBAN)."
        ],
        "consejos": [
            "El informe de vida laboral se puede descargar al instante por SMS a través del portal Import@ss sin necesidad de certificado."
        ]
    },
    {
        "id": "registro-civil-justicia",
        "keywords": [
            "registro civil", "justicia", "partida de nacimiento", "certificado nacimiento", 
            "certificado matrimonio", "casarse", "boda civil", "pareja de hecho", "divorcio", 
            "antecedentes penales", "apostilla", "nacionalidad", "fe de vida"
        ],
        "titulo": "Trámites en el Registro Civil y Ministerio de Justicia",
        "organismo": "Ministerio de la Presidencia, Justicia y Relaciones con las Cortes / Registros Civiles",
        "resumen": "Solicitud de certificados de nacimiento, matrimonio, antecedentes penales o trámites matrimoniales.",
        "coste": "Los certificados del Registro Civil son gratuitos. Antecedentes penales: tasa 3,86 €.",
        "plazo": "Online con certificado digital se emite en el acto. Por correo o petición manual: 5 a 15 días.",
        "donde": "Sede Electrónica del Ministerio de Justicia o Registro Civil de tu municipio.",
        "enlace_oficial": "https://sede.mjusticia.gob.es/",
        "enlace_texto": "Sede Electrónica del Ministerio de Justicia",
        "pasos": [
            {
                "numero": 1,
                "titulo": "Elegir el canal (Electrónico o Presencial)",
                "descripcion": "Si dispones de Cl@ve o certificado, muchos certificados se expiden al instante firmados digitalmente con validez oficial."
            },
            {
                "numero": 2,
                "titulo": "Indicar datos registrales",
                "descripcion": "Aporta tomo, folio, municipio y fecha del hecho (nacimiento, matrimonio) para agilizar la búsqueda."
            }
        ],
        "documentos": [
            "DNI/NIE del solicitante.",
            "Datos identificativos completos de la persona inscrita y fecha aproximada del hecho."
        ],
        "consejos": [
            "Los certificados del Registro Civil español tienen generalmente una validez legal de 3 meses para la mayoría de trámites administrativos."
        ]
    },
    {
        "id": "educacion-becas",
        "keywords": [
            "beca", "becas mec", "beca estudios", "universidad", "homologacion titulo", "convalidacion", 
            "matricula", "colegio", "instituto", "fp", "formacion profesional", "titulo bachiller"
        ],
        "titulo": "Becas y Trámites Educativos",
        "organismo": "Ministerio de Educación, Formación Profesional y Deportes",
        "resumen": "Convocatorias de becas generales del Estado (MEC) para estudios postobligatorios, universitarios y homologación de títulos.",
        "coste": "Gratuito para solicitud de becas.",
        "plazo": "El plazo de solicitud de becas MEC suele abrirse con gran antelación (marzo-mayo del curso anterior).",
        "donde": "Sede Electrónica del Ministerio de Educación.",
        "enlace_oficial": "https://www.educacionfpydeportes.gob.es/",
        "enlace_texto": "Sede del Ministerio de Educación",
        "pasos": [
            {
                "numero": 1,
                "titulo": "Crear usuario o entrar con Cl@ve",
                "descripcion": "Accede a la sede electrónica del Ministerio dentro del plazo de la convocatoria anual."
            },
            {
                "numero": 2,
                "titulo": "Rellenar datos académicos y familiares",
                "descripcion": "Indica los estudios previstos y autoriza al Ministerio a cruzar datos de renta con la Agencia Tributaria."
            }
        ],
        "documentos": [
            "DNI/NIE de todos los miembros computables de la unidad familiar.",
            "Número de cuenta bancaria donde el estudiante figure como titular o cotitular."
        ],
        "consejos": [
            "Pide la beca dentro del plazo aunque aún no sepas qué carrera o ciclo vas a cursar exactamente; podrás modificar los datos académicos más adelante."
        ]
    },
    {
        "id": "ayuntamiento-local",
        "keywords": [
            "ayuntamiento", "vado", "basura", "basuras", "ibi", "plusvalia municipal", "licencia obras", 
            "obra menor", "ruido", "animales", "censo animales", "ocupacion via", "terraza"
        ],
        "titulo": "Gestiones y Licencias en tu Ayuntamiento",
        "organismo": "Ayuntamiento de tu municipio / Administración Local",
        "resumen": "Trámites municipales: solicitud de vados, licencias de obras menores, quejas por ruidos, pago de tasas o bonificaciones del IBI.",
        "coste": "Depende de las ordenanzas fiscales de cada ayuntamiento.",
        "plazo": "Plazos variables según la ordenanza municipal.",
        "donde": "Oficina de Atención Ciudadana (OAC) de tu municipio o sede electrónica del Ayuntamiento.",
        "enlace_oficial": "https://rec.redsara.es",
        "enlace_texto": "Registro Electrónico Común del Estado (redsara.es)",
        "pasos": [
            {
                "numero": 1,
                "titulo": "Localizar la sede electrónica de tu ayuntamiento",
                "descripcion": "Entra en la web de tu ayuntamiento (ej. madrid.es, barcelona.cat, valencia.es) o usa el Registro Electrónico General (REC)."
            },
            {
                "numero": 2,
                "titulo": "Presentar una Instancia General o solicitud específica",
                "descripcion": "Rellena el formulario municipal o genera la Instancia General oficial en HagaClic con tus datos y petición."
            }
        ],
        "documentos": [
            "DNI/NIE en vigor.",
            "Instancia o formulario de solicitud firmado.",
            "Plano o memoria descriptiva (si es licencia de obra o vado)."
        ],
        "consejos": [
            "Cualquier escrito presentado por el Registro Electrónico General (REC) tiene fecha y hora fehaciente con validez legal ante cualquier ayuntamiento de España."
        ]
    }
]

def find_guidance_for_query(raw_query):
    """
    Busca si la consulta del usuario encaja con alguno de los dominios
    administrativos del Estado español. Si encaja, devuelve una ficha estructurada.
    Si no encaja con ningún dominio específico, genera una Orientación General Oficial
    amparada en la Ley 39/2015 para que el usuario NUNCA se quede sin respuesta ni acción.
    """
    if not raw_query or len(raw_query.strip()) < 3:
        return None
        
    norm_q = normalize(raw_query)
    
    # Buscar en dominios específicos
    best_domain = None
    best_score = 0
    
    for domain in KNOWLEDGE_DOMAINS:
        score = 0
        for kw in domain["keywords"]:
            norm_kw = normalize(kw)
            if norm_kw in norm_q:
                score += 30
            elif any(part in norm_q for part in norm_kw.split() if len(part) > 3):
                score += 15
                
        if score > best_score:
            best_score = score
            best_domain = domain
            
    if best_domain and best_score >= 15:
        return {
            "encontrado_en_catalogo": False,
            "es_orientacion_oficial": True,
            "tipo": best_domain["id"],
            "titulo": best_domain["titulo"],
            "organismo": best_domain["organismo"],
            "resumen": best_domain["resumen"],
            "coste": best_domain["coste"],
            "plazo": best_domain["plazo"],
            "donde": best_domain["donde"],
            "enlace_oficial": best_domain["enlace_oficial"],
            "enlace_texto": best_domain["enlace_texto"],
            "pasos": best_domain["pasos"],
            "documentos": best_domain["documentos"],
            "consejos": best_domain["consejos"],
            "consulta_original": raw_query
        }
        
    # Si no encaja en dominios concretos, generamos Orientación General Administrativa
    # (Derecho de petición y trámite general conforme a la Ley 39/2015)
    return {
        "encontrado_en_catalogo": False,
        "es_orientacion_oficial": True,
        "tipo": "instancia-general-ciudadana",
        "titulo": f"Orientación y Gestión Oficial para: {raw_query.strip().capitalize()}",
        "organismo": "Registro Electrónico General de la Administración Pública (redsara.es) / Punto de Acceso General",
        "resumen": f"Asistente para canalizar tu solicitud sobre '{raw_query}' ante el organismo competente del Estado, Comunidad Autónoma o Ayuntamiento.",
        "coste": "La presentación de solicitudes e instancias generales ante la administración es 100% gratuita.",
        "plazo": "La Administración Pública tiene un plazo legal máximo de 3 meses para resolver y notificar los procedimientos generales (Ley 39/2015).",
        "donde": "A través del Registro Electrónico General (REC) con certificado digital/Cl@ve, o presencialmente en cualquier oficina de registro de tu localidad.",
        "enlace_oficial": "https://rec.redsara.es",
        "enlace_texto": "Registro Electrónico General (redsara.es)",
        "pasos": [
            {
                "numero": 1,
                "titulo": "Identificar el organismo o ayuntamiento competente",
                "descripcion": "Determina si tu gestión compete a tu Ayuntamiento, a tu Comunidad Autónoma o al Gobierno de España (Punto de Acceso General: administracion.gob.es)."
            },
            {
                "numero": 2,
                "titulo": "Generar tu Instancia Oficial en PDF con HagaClic",
                "descripcion": "Pulsa el botón 'Generar Instancia en PDF' abajo para redactar tu escrito formal estructurado (EXPONE / SOLICITA) con fundamentación legal del artículo 66 de la Ley 39/2015."
            },
            {
                "numero": 3,
                "titulo": "Presentación telemática o presencial con acuse de recibo",
                "descripcion": "Presenta el escrito a través del Registro Electrónico Común (rec.redsara.es) o llévalo por duplicado a la oficina de atención para que te sellen tu copia con la fecha y hora oficial."
            },
            {
                "numero": 4,
                "titulo": "Controlar el plazo de respuesta en 'Mis Trámites'",
                "descripcion": "Guarda este trámite en la sección 'Mis Trámites' para que HagaClic lleve la cuenta de los días transcurridos hasta el plazo máximo legal de respuesta."
            }
        ],
        "documentos": [
            "Documento oficial de identidad en vigor (DNI, NIE o pasaporte).",
            "Escrito de Instancia General oficial generado en HagaClic con fecha y firma.",
            "Documentación acreditativa o justificantes que respalden tu petición (fotocopias o archivos adjuntos)."
        ],
        "consejos": [
            "Por el principio de 'Ventanilla Única' (art. 16 de la Ley 39/2015), puedes presentar tu solicitud en el registro de tu ayuntamiento o por internet en rec.redsara.es aunque vaya dirigida a un ministerio o a otra comunidad autónoma.",
            "Exige siempre que te sellen tu copia de la solicitud con el número de registro de entrada y la fecha oficial."
        ],
        "consulta_original": raw_query
    }
