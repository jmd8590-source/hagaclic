"""
HagaClic — Motor de Inteligencia y Orientación Ciudadana Universal (asistente_service.py)

Proporciona orientación legal, procedimental y práctica sobre CUALQUIER trámite
administrativo en España (estatal, autonómico o local), apoyado en:
1. Una extensa base de conocimiento de derecho administrativo y trámites comunes en España.
2. Motor de inferencia y síntesis para estructurar requisitos, pasos, plazos, costes y organismos.
3. Conector opcional a LLMs (Google Gemini / OpenAI) si existe API key en el entorno.
4. Generación de botones de acción directa en la interfaz de HagaClic (PDFs, sedes, calculadora).
"""

import os
import re
import json
import unicodedata
import urllib.request
import urllib.error

# Normalizador de texto para emparejamiento semántico y lingüístico
def normalize(text):
    if not text:
        return ""
    text = text.lower()
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    return ' '.join(text.split())

# ============================================================================
# BASE DE CONOCIMIENTO EXTENDIDA DE LA ADMINISTRACIÓN PÚBLICA DE ESPAÑA
# ============================================================================
TRAMITES_EXPERTO = [
    {
        "id": "ingreso-minimo-vital",
        "keywords": [
            "ingreso minimo vital", "imv", "renta minima", "ayuda sin ingresos", "vulnerable",
            "pobreza", "prestacion no contributiva", "subsidio vital", "ayuda para comer",
            "no tengo ingresos", "simulador imv", "seguridad social imv"
        ],
        "titulo": "Ingreso Mínimo Vital (IMV)",
        "organismo": "Instituto Nacional de la Seguridad Social (INSS)",
        "ambito": "Estatal",
        "requisitos": [
            "Tener entre 23 y 65 años (o a partir de 18 años si tienes menores o incapacidad a cargo).",
            "Al menos 1 año de residencia legal y efectiva ininterrumpida en España.",
            "Estar en situación de vulnerabilidad económica (ingresos inferiores al umbral garantizado según unidad de convivencia).",
            "Haber solicitado previamente las pensiones y prestaciones a las que se pudiera tener derecho (salvo rentas mínimas autonómicas)."
        ],
        "documentos": [
            "DNI/NIE de todos los miembros del hogar.",
            "Certificado de empadronamiento colectivo e histórico (demostrar al menos 6 meses viviendo juntos).",
            "Libro de familia o certificados de nacimiento para acreditar la unidad de convivencia.",
            "Declaración de la renta del ejercicio anterior o autorización para cruce de datos fiscales."
        ],
        "pasos": [
            "Acceder a la Sede Electrónica de la Seguridad Social (se puede solicitar sin certificado digital en la plataforma de solicitud sin Cl@ve).",
            "Completar el formulario online y adjuntar fotografía del DNI por ambas caras y una selfie sosteniendo el documento.",
            "Subir el certificado de empadronamiento histórico y colectivo.",
            "Guardar el código de seguimiento de la solicitud para consultar el estado."
        ],
        "plazo": "El INSS tiene un plazo legal máximo de 6 meses para resolver. Si transcurre sin respuesta, el silencio administrativo opera en sentido negativo.",
        "coste": "100% Gratuito.",
        "enlace_oficial": "https://sede.seg-social.gob.es/wps/portal/sede/fecha/Ciudadanos/familia",
        "enlace_texto": "Sede del INSS — Solicitud IMV",
        "plantilla_pdf": "instancia_general",
        "consejo": "Aunque vivas en un piso compartido sin lazos familiares, puedes solicitarlo si acreditas que constituyes una unidad independiente o no tienes vínculos de parentesco."
    },
    {
        "id": "jubilacion-inss",
        "keywords": [
            "jubilarme", "jubilacion", "pension de jubilacion", "edad de jubilacion", "jubilacion anticipada",
            "jubilacion activa", "anos cotizados jubilacion", "calcular jubilacion", "cuanto me queda para jubilarme"
        ],
        "titulo": "Pensión de Jubilación Ordinaria y Anticipada",
        "organismo": "Instituto Nacional de la Seguridad Social (INSS)",
        "ambito": "Estatal",
        "requisitos": [
            "Haber cumplido la edad legal ordinaria (65 años con 38+ años cotizados, o 66 años y medio con menos años cotizados).",
            "Periodo mínimo de cotización: al menos 15 años cotizados, de los cuales al menos 2 deben estar comprendidos dentro de los 15 años inmediatamente anteriores al cese.",
            "Estar en situación de alta o asimilada al alta en la Seguridad Social."
        ],
        "documentos": [
            "DNI / NIE en vigor.",
            "Formulario oficial de solicitud de jubilación del INSS.",
            "Certificado de la última empresa si estás en activo.",
            "Número de cuenta bancaria (IBAN) del que seas titular exclusivo o cotitular."
        ],
        "pasos": [
            "Entrar en el portal 'Tu Seguridad Social' con Cl@ve o certificado digital y ejecutar el simulador de jubilación oficial.",
            "Presentar la solicitud dentro de los 3 meses anteriores o posteriores a la fecha de jubilación.",
            "El INSS emitirá resolución indicando la base reguladora y el importe bruto mensual de tu pensión."
        ],
        "plazo": "El plazo máximo de resolución del INSS es de 90 días naturales (habitualmente resuelven en menos de 20 días).",
        "coste": "Gratuito.",
        "enlace_oficial": "https://sede.seg-social.gob.es/",
        "enlace_texto": "Tu Seguridad Social — Portal Jubilación",
        "plantilla_pdf": "instancia_general",
        "consejo": "Si tienes cotizaciones en varios regímenes (Régimen General y Autónomos RETA), se aplicará el régimen en el que hayas cotizado más tiempo o el último si reunes los requisitos."
    },
    {
        "id": "nacimiento-maternidad-paternidad",
        "keywords": [
            "maternidad", "paternidad", "nacimiento de hijo", "cuidado de menor", "baja maternal",
            "baja paternal", "permiso de paternidad", "prestacion por nacimiento", "bebe", "adopcion"
        ],
        "titulo": "Prestación por Nacimiento y Cuidado del Menor (Baja Maternidad/Paternidad)",
        "organismo": "Instituto Nacional de la Seguridad Social (INSS)",
        "ambito": "Estatal",
        "requisitos": [
            "16 semanas de prestación retribuida al 100% de la base reguladora para cada progenitor.",
            "Las 6 primeras semanas tras el parto son obligatorias e ininterrumpidas a jornada completa.",
            "Estar en alta o asimilada y haber cotizado el periodo mínimo exigido según la edad (menores de 21 sin mínimo; de 21 a 26 años: 90 días en los últimos 7 años; mayores de 26: 180 días en los últimos 7 años o 360 en toda la vida laboral)."
        ],
        "documentos": [
            "Certificado de la empresa con las bases de cotización.",
            "Libro de Familia o Certificado de Nacimiento del Registro Civil.",
            "Informe de maternidad/paternidad emitido por el Servicio Público de Salud.",
            "DNI/NIE y cuenta bancaria."
        ],
        "pasos": [
            "Inscribir al recién nacido en el Registro Civil (habitualmente desde el propio hospital).",
            "Entrar en el portal 'Tu Seguridad Social' telemáticamente y solicitar la prestación por nacimiento.",
            "Indicar las semanas que se disfrutarán de forma consecutiva o fraccionada."
        ],
        "plazo": "Presentar tras el nacimiento. El INSS resuelve y abona habitualmente a mes vencido en la primera nómina de pensiones.",
        "coste": "Gratuito y exento de tributar en el IRPF.",
        "enlace_oficial": "https://sede.seg-social.gob.es/",
        "enlace_texto": "Sede Electrónica INSS — Cuidado del Menor",
        "plantilla_pdf": "instancia_general",
        "consejo": "Las semanas restantes (hasta 10) pueden disfrutarse a jornada completa o parcial en periodos semanales hasta que el menor cumpla 12 meses, siempre con acuerdo previo con la empresa."
    },
    {
        "id": "incapacidad-temporal-permanente",
        "keywords": [
            "incapacidad", "incapacidad permanente", "invalidez", "pension de invalidez",
            "baja laboral larga", "tribunal medico", "icams", "evaluacion medica inss",
            "incapacidad total", "incapacidad absoluta", "gran invalidez"
        ],
        "titulo": "Incapacidad Permanente (Total, Absoluta o Gran Invalidez)",
        "organismo": "Instituto Nacional de la Seguridad Social (INSS) / EVI (Equipo de Valoración de Incapacidades)",
        "ambito": "Estatal",
        "requisitos": [
            "Padecer reducciones anatómicas o funcionales graves y definitivas que disminuyan o anulen la capacidad laboral.",
            "Estar en alta o asimilada (salvo Incapacidad Absoluta o Gran Invalidez en no alta con requisitos especiales de cotización).",
            "Haber cubierto un periodo mínimo de cotización según la edad si deriva de enfermedad común (no se exige para accidente de trabajo o enfermedad profesional)."
        ],
        "documentos": [
            "Informes médicos periciales actualizados del Servicio Público de Salud (historial clínico completo).",
            "DNI/NIE del solicitante.",
            "Historial laboral y profesiograma de la empresa detallando las tareas y esfuerzos del puesto.",
            "Solicitud oficial de reconocimiento de Incapacidad Permanente."
        ],
        "pasos": [
            "Presentar la solicitud ante el INSS telemáticamente o tras agotar los 545 días de Incapacidad Temporal.",
            "Acudir a la citación ante el Tribunal Médico (EVI / ICAMS) para la exploración clínica.",
            "Dictamen propuesta del tribunal y resolución motivada del Director Provincial del INSS fijando el grado (Parcial, Total para la profesión habitual, Absoluta para todo trabajo, o Gran Invalidez).",
        ],
        "plazo": "El INSS dispone de un plazo máximo de 135 días hábiles para resolver. Transcurrido sin respuesta expresa, se entiende desestimada por silencio negativo (quedando expedita la vía judicial).",
        "coste": "Gratuito en vía administrativa.",
        "enlace_oficial": "https://sede.seg-social.gob.es/",
        "enlace_texto": "Sede del INSS — Incapacidad Laboral",
        "plantilla_pdf": "instancia_general",
        "consejo": "Si el INSS deniega la incapacidad o concede un grado inferior, dispones de 30 días hábiles para interponer Reclamación Previa por escrito ante el propio INSS antes de acudir a los Juzgados de lo Social."
    },
    {
        "id": "vida-laboral",
        "keywords": [
            "vida laboral", "informe vida laboral", "descargar vida laboral", "cuanto tiempo he trabajado",
            "anos cotizados", "importass", "dias cotizados", "informe cotizacion", "vida laboral al instante"
        ],
        "titulo": "Informe de Vida Laboral y Situación de Cotización",
        "organismo": "Tesorería General de la Seguridad Social (TGSS) / Portal Import@ss",
        "ambito": "Estatal",
        "requisitos": [
            "Tener número de afiliación a la Seguridad Social (NAF).",
            "Tener tu teléfono móvil registrado en la Seguridad Social (para recibir SMS) o disponer de Cl@ve o Certificado Digital."
        ],
        "documentos": [
            "DNI o NIE.",
            "Teléfono móvil registrado en las bases de datos de la Seguridad Social."
        ],
        "pasos": [
            "Entrar en el portal oficial Import@ss de la Seguridad Social.",
            "Seleccionar acceso 'Vía SMS' o 'Cl@ve'.",
            "Introducir DNI, fecha de nacimiento y número de teléfono. Introducir el código recibido por SMS.",
            "Descargar al instante el PDF oficial con Código Seguro de Verificación (CSV)."
        ],
        "plazo": "Inmediato (descarga en tiempo real las 24 horas del día).",
        "coste": "100% Gratuito.",
        "enlace_oficial": "https://portal.seg-social.gob.es/wps/portal/importass",
        "enlace_texto": "Portal Import@ss — Descargar Vida Laboral",
        "plantilla_pdf": "instancia_general",
        "consejo": "No pagues jamás en páginas intermediarias: el informe oficial emitido por la TGSS es completamente gratis e instantáneo."
    },
    {
        "id": "subsidio-desempleo-52",
        "keywords": [
            "subsidio mayores de 52", "subsidio 52 anos", "subsidio desempleo", "ayuda sepe mayores",
            "subsidio despues del paro", "sepe subsidio", "ayuda 480 euros", "subsidio cotiza para jubilacion"
        ],
        "titulo": "Subsidio de Desempleo para Mayores de 52 Años",
        "organismo": "Servicio Público de Empleo Estatal (SEPE)",
        "ambito": "Estatal",
        "requisitos": [
            "Tener 52 años o más en la fecha en que se cumplan los requisitos de acceso.",
            "Estar inscrito como demandante de empleo ininterrumpidamente y suscribir el acuerdo de actividad.",
            "Carecer de rentas propias de cualquier naturaleza superiores al 75% del SMI (excluidas pagas extraordinarias).",
            "Reunir todos los requisitos para acceder a una pensión contributiva de jubilación, salvo la edad (haber cotizado al menos 15 años, 2 dentro de los últimos 15, y al menos 6 años al desempleo en el Régimen General)."
        ],
        "documentos": [
            "DNI/NIE del solicitante.",
            "Certificado bancario con IBAN.",
            "Declaración de rentas anual (DAR) acreditando no superar el umbral de ingresos.",
            "Justificante de demandante de empleo (DARDE)."
        ],
        "pasos": [
            "Mantener la inscripción como demandante de empleo en el servicio autonómico de empleo.",
            "Solicitar cita previa en la Sede del SEPE o tramitar online a través de la Sede Electrónica con Cl@ve.",
            "Adjuntar la documentación y formulario oficial de subsidio para mayores de 52.",
            "Presentar la Declaración Anual de Rentas cada 12 meses para mantener el subsidio."
        ],
        "plazo": "15 días hábiles desde que se genera el derecho o se agota la prestación previa.",
        "coste": "Gratuito. Cuantía: 80% del IPREM mensual (aprox. 480 €/mes).",
        "enlace_oficial": "https://sede.sepe.gob.es/",
        "enlace_texto": "Sede Electrónica del SEPE — Subsidios",
        "plantilla_pdf": "instancia_general",
        "consejo": "Es el único subsidio del SEPE que sigue cotizando para la jubilación (la base de cotización equivale al 125% de la base mínima vigente de cada año)."
    },
    {
        "id": "sellar-paro-darde",
        "keywords": [
            "sellar el paro", "renovar demanda de empleo", "darde", "renovar el paro", "fecha sellar paro",
            "sepe sellar", "servicio autonomico de empleo", "me he olvidado de sellar el paro"
        ],
        "titulo": "Renovación de la Demanda de Empleo (Sellar el Paro / DARDE)",
        "organismo": "Servicios Autonómicos de Empleo (LABORA, SOC, SAE, Lanbide, INAEM, Emplea Madrid, etc.)",
        "ambito": "Autonómico",
        "requisitos": [
            "Estar inscrito como demandante de empleo.",
            "Renovar exactamente en la fecha indicada en tu documento DARDE (o en los días previos/posteriores que permita excepcionalmente tu CCAA)."
        ],
        "documentos": [
            "DNI / NIE.",
            "Clave de acceso de los servicios telemáticos de empleo autonómicos, Cl@ve o certificado digital."
        ],
        "pasos": [
            "Entrar en el portal de empleo de tu comunidad autónoma (por ejemplo, Punt Labora en CV, SOC en Cataluña, Oficina Virtual de Empleo en Madrid, SAE en Andalucía).",
            "Identificarte y pulsar 'Renovación de Demanda de Empleo'.",
            "Descargar el nuevo DARDE en PDF y verificar la nueva fecha asignada para la siguiente renovación (generalmente cada 90 días)."
        ],
        "plazo": "Obligatorio renovar en el día exacto fijado en el documento DARDE.",
        "coste": "Gratuito.",
        "enlace_oficial": "https://www.sepe.es/HomeSepe/Personas/distribucion-competencias.html",
        "enlace_texto": "SEPE — Directorio de Servicios de Empleo por CC.AA.",
        "plantilla_pdf": "instancia_general",
        "consejo": "¡Cuidado! Si olvidas renovar el DARDE y estás cobrando paro o subsidio, el SEPE te abrirá un procedimiento sancionador: 1ª falta = pérdida de 1 mes de prestación; 2ª falta = 3 meses; 3ª falta = 6 meses; 4ª falta = extinción definitiva."
    },
    {
        "id": "alta-autonomos-hacienda-ss",
        "keywords": [
            "darse de alta autonomo", "alta autonomos", "hacienda y seguridad social autonomo",
            "modelo 036", "modelo 037", "reta", "tarifa plana autonomos", "cuota autonomo",
            "empezar negocio", "facturar como freelance", "alta censal", "epigrafe iae"
        ],
        "titulo": "Alta de Autónomos en Hacienda (AEAT) y Seguridad Social (RETA)",
        "organismo": "Agencia Tributaria (AEAT) y Tesorería General de la Seguridad Social (TGSS)",
        "ambito": "Estatal",
        "requisitos": [
            "DNI o NIE con autorización de trabajo en vigor.",
            "El alta en la Seguridad Social (RETA) debe realizarse con carácter previo o el mismo día del inicio de la actividad económica.",
            "Elegir el epígrafe del Impuesto de Actividades Económicas (IAE) acorde a tus servicios."
        ],
        "documentos": [
            "DNI/NIE y certificado digital de persona física.",
            "Formulario censal Modelo 036 o Modelo 037 simplificado.",
            "Número de cuenta bancaria (IBAN) para domiciliar las cuotas mensuales del RETA.",
            "Previsión estimada de rendimientos netos mensuales para encuadrar en el tramo de cotización."
        ],
        "pasos": [
            "Paso 1 (Hacienda): Presentar el Modelo 036 o 037 en la Sede Electrónica de la AEAT para el alta censal e IAE.",
            "Paso 2 (Seguridad Social): Entrar en el portal Import@ss de la TGSS y tramitar el alta en el RETA solicitando la 'Tarifa Plana' reducida (aprox. 80 €/mes durante los primeros 12 meses).",
            "Paso 3 (Libros y Facturación): Habilitar libros registro de ingresos, gastos y bienes de inversión conforme a la normativa tributaria."
        ],
        "plazo": "El alta en la Seguridad Social debe ser previa al inicio efectivo de la actividad. Hacienda debe notificarse antes o en la fecha de comienzo.",
        "coste": "El trámite es gratuito. Cuota mensual reducida (Tarifa Plana) de ~80 €/mes el primer año para nuevos autónomos.",
        "enlace_oficial": "https://portal.seg-social.gob.es/wps/portal/importass/importass/Categorias/Altas,+bajas+y+modificaciones/Altas+y+bajas+de+trabajadores/Trabajadores+autonomos",
        "enlace_texto": "Import@ss — Alta en el RETA (Autónomos)",
        "plantilla_pdf": "instancia_general",
        "consejo": "Nunca empieces a emitir facturas ni a prestar servicios sin haber cursado primero el alta en Hacienda y la Seguridad Social; tramitarlo con posterioridad anula el derecho a la Tarifa Plana bonificada."
    },
    {
        "id": "declaracion-renta-irpf",
        "keywords": [
            "declaracion de la renta", "renta", "borrador renta", "irpf", "aeat renta", "hacienda devolver",
            "plazo de la renta", "obligado a declarar", "deduccion alquiler renta", "renta web"
        ],
        "titulo": "Declaración de la Renta (IRPF / Renta Web)",
        "organismo": "Agencia Estatal de Administración Tributaria (AEAT)",
        "ambito": "Estatal",
        "requisitos": [
            "Contribuyentes residentes fiscales en España que superen los límites de ingresos (con 1 pagador general: 22.000 € brutos anuales; con 2 o más pagadores si el segundo supera 1.500 €: límite de 15.876 €).",
            "Todos los perceptores del Ingreso Mínimo Vital (IMV) y los trabajadores autónomos están obligados por ley a presentar la declaración independientemente de sus ingresos."
        ],
        "documentos": [
            "Número de referencia fiscal, Cl@ve Móvil/PIN o Certificado Digital.",
            "Datos fiscales precargados por la AEAT.",
            "Justificantes de donaciones, planes de pensiones, alquiler de vivienda habitual (referencia catastral y NIF del arrendador) y deducciones autonómicas."
        ],
        "pasos": [
            "Acceder al servicio oficial Renta WEB en la Sede de la AEAT.",
            "Revisar exhaustivamente los datos personales, domicilio habitual y deducciones autonómicas.",
            "Comprobar el resultado (negativo = Hacienda te devuelve; positivo = debes ingresar).",
            "Presentar telemáticamente y conservar el justificante con Código Seguro de Verificación (CSV)."
        ],
        "plazo": "Campaña de la Renta anual: habitualmente entre los primeros días de abril y el 30 de junio de cada año.",
        "coste": "Gratuito.",
        "enlace_oficial": "https://sede.agenciatributaria.gob.es/Sede/Renta.html",
        "enlace_texto": "Sede AEAT — Campaña de Renta Web",
        "plantilla_pdf": "instancia_general",
        "consejo": "No confirmes el borrador a ciegas: las deducciones autonómicas por alquiler, gastos escolares o guardería casi nunca vienen aplicadas automáticamente y puedes estar perdiendo cientos de euros."
    },
    {
        "id": "cita-previa-nie-tie-extranjeria",
        "keywords": [
            "cita nie", "cita tie", "toma de huellas", "recoger tie", "tarjeta de residencia",
            "cita previa extranjeria", "conseguir cita policia huellas", "expedicion tarjeta identidad extranjero",
            "renovar tie", "lote tie"
        ],
        "titulo": "Toma de Huellas y Expedición de la Tarjeta TIE / NIE",
        "organismo": "Cuerpo Nacional de Policía / Oficina de Extranjería / Ministerio del Interior",
        "ambito": "Estatal",
        "requisitos": [
            "Tener concedida la resolución favorable de autorización de residencia o estancia en España.",
            "Solicitar la cita dentro del mes siguiente a la notificación de la resolución o entrada legal en España."
        ],
        "documentos": [
            "Pasaporte original en vigor.",
            "Resolución favorable de extranjería impresa.",
            "Fotografía reciente tamaño carnet en color sobre fondo blanco.",
            "Justificante de abono de la tasa Modelo 790 código 012 pagada en banco.",
            "Volante de empadronamiento actualizado si has cambiado de domicilio."
        ],
        "pasos": [
            "Pedir cita en la Sede de Administraciones Públicas: Trámites Cuerpo Nacional de Policía -> 'POLICIA - TOMA DE HUELLAS (EXPEDICIÓN DE TARJETA)'.",
            "Descargar y pagar en cualquier banco la Tasa 790-012 (aprox. 16,32 € para TIE inicial).",
            "Acudir a la comisaría asignada con toda la documentación original. Te tomarán las huellas dactilares y te entregarán el resguardo de solicitud de tarjeta.",
            "Transcurridos 30-45 días, comprobar el lote y acudir a recoger la tarjeta TIE física."
        ],
        "plazo": "30 días naturales desde la resolución favorable para acudir a la toma de huellas.",
        "coste": "Tasa Modelo 790-012: entre 12,00 € y 21,87 € según el tipo de tarjeta.",
        "enlace_oficial": "https://icp.administracionelectronica.gob.es/icpplus/index.html",
        "enlace_texto": "Cita Previa Extranjería — Sede Administraciones",
        "plantilla_pdf": "instancia_general",
        "consejo": "Las citas para toma de huellas en las grandes provincias (Madrid, Barcelona, Valencia) se liberan habitualmente los viernes o los lunes a primera hora de la mañana; entra con puntualidad para conseguir hueco."
    },
    {
        "id": "arraigo-social-laboral-formativo",
        "keywords": [
            "arraigo social", "arraigo laboral", "arraigo para la formacion", "arraigo familiar",
            "regularizar papeles", "conseguir residencia sin papeles", "oferta de trabajo arraigo",
            "informe de arraigo", "informe de insercion social", "3 anos sin papeles"
        ],
        "titulo": "Autorización de Residencia Temporal por Razones de Arraigo",
        "organismo": "Oficinas de Extranjería (Ministerio de Inclusión, Seguridad Social y Migraciones)",
        "ambito": "Estatal",
        "requisitos": [
            "Arraigo Social: 3 años de permanencia continuada demostrable en España + contrato de trabajo + informe de integración social autonómico/municipal (o tener vínculos familiares directos).",
            "Arraigo Laboral: 2 años de permanencia continuada demostrable + acreditar relación laboral de al menos 6 meses.",
            "Arraigo para la Formación: 2 años de permanencia continuada demostrable + compromiso de matricularse en una formación reglada u ocupacional habilitada.",
            "Carecer de antecedentes penales en España y en los países donde haya residido los últimos 5 años."
        ],
        "documentos": [
            "Pasaporte completo en vigor.",
            "Certificado de antecedentes penales del país de origen debidamente apostillado/legalizado y traducido por intérprete jurado.",
            "Pruebas de permanencia continuada (empadronamiento histórico, informes médicos, abonos transporte, envíos de dinero).",
            "Contrato laboral firmado o matrícula del curso formativo o informe de inserción social.",
            "Tasa Modelo 790 código 052 abonada."
        ],
        "pasos": [
            "Reunir todas las pruebas documentales que demuestren la estancia ininterrumpida sin ausencias superiores a los límites legales.",
            "Solicitar el informe de inserción social en los servicios sociales de tu ayuntamiento o comunidad autónoma.",
            "Presentar la solicitud telemáticamente a través de la plataforma MERCURIO (con certificado digital propio o de un gestor/abogado habilitado) o con cita previa.",
            "Una vez recibida la resolución favorable, tramitar la toma de huellas (TIE) en la Policía."
        ],
        "plazo": "La Oficina de Extranjería tiene 3 meses legales para resolver la solicitud.",
        "coste": "Tasa Modelo 790-052: 38,28 €.",
        "enlace_oficial": "https://sede.administracionespublicas.gob.es/mercurio2/",
        "enlace_texto": "Plataforma MERCURIO — Extranjería Online",
        "plantilla_pdf": "instancia_general",
        "consejo": "Para acreditar la permanencia, el empadronamiento continuo es la prueba reina. Si tuviste huecos sin empadronar, recopila recetas del médico de cabecera, extractos de cuentas bancarias y facturas a tu nombre."
    },
    {
        "id": "nacionalidad-espanola-residencia",
        "keywords": [
            "nacionalidad espanola", "pedir nacionalidad", "nacionalidad por residencia", "examen ccse",
            "examen dele", "juramento nacionalidad", "pasaporte espanol extranjeros", "10 anos residencia",
            "2 anos iberoamericanos nacionalidad"
        ],
        "titulo": "Nacionalidad Española por Residencia",
        "organismo": "Ministerio de la Presidencia, Justicia y Relaciones con las Cortes",
        "ambito": "Estatal",
        "requisitos": [
            "Residencia legal, continuada e inmediatamente anterior a la solicitud:",
            "• 10 años para la regla general.",
            "• 5 años para quienes hayan obtenido la condición de refugiado.",
            "• 2 años para nacionales de países iberoamericanos, Andorra, Filipinas, Guinea Ecuatorial, Portugal o sefardíes.",
            "• 1 año para casados con español/a, nacidos en territorio español o tutelados.",
            "Superar las pruebas del Instituto Cervantes: CCSE (conocimientos constitucionales y socioculturales) y DELE A2 (de idioma, si no eres de país hispanohablante)."
        ],
        "documentos": [
            "Tarjeta de Residencia TIE en vigor.",
            "Pasaporte completo en vigor.",
            "Certificado literal de nacimiento expedido por el país de origen, apostillado/legalizado y traducido.",
            "Certificado de antecedentes penales de origen legalizado.",
            "Certificados de aptitud de los exámenes CCSE y DELE del Instituto Cervantes.",
            "Justificante de pago de la tasa 790 código 026."
        ],
        "pasos": [
            "Aprobar el examen CCSE del Instituto Cervantes.",
            "Acceder a la Sede Electrónica del Ministerio de Justicia y presentar la solicitud telemática.",
            "Adjuntar toda la documentación digitalizada y pagar la tasa oficial.",
            "Hacer seguimiento del expediente telemático con el número 'R' asignado.",
            "Tras la concesión favorable, realizar el acto solemne de Jura o Promesa ante el Registro Civil o Notario y tramitar DNI y Pasaporte en Comisaría."
        ],
        "plazo": "El Ministerio de Justicia tiene 1 año legal para resolver. Pasado 1 año opera el silencio negativo, pudiendo interponer Recurso Contencioso-Administrativo ante la Audiencia Nacional para acelerar la resolución.",
        "coste": "Tasa Modelo 790-026: 104,05 € + Examen CCSE (~85 €).",
        "enlace_oficial": "https://sede.mjusticia.gob.es/es/tramites/nacionalidad-residencia",
        "enlace_texto": "Sede Ministerio de Justicia — Nacionalidad",
        "plantilla_pdf": "instancia_general",
        "consejo": "Asegúrate de no haber salido de España más de los límites permitidos: para el plazo de 2 años de iberoamericanos, no se aconseja acumular más de 3 meses de ausencia fuera de España durante ese periodo."
    },
    {
        "id": "recurso-multas-dgt",
        "keywords": [
            "multa de trafico", "recurrir multa", "multa radar", "alegaciones multa", "dgt multas",
            "descuento 50 multa", "quitar puntos multa", "identificar conductor multa", "plazo pagar multa"
        ],
        "titulo": "Recurso y Pago con Reducción de Multas de Tráfico (DGT)",
        "organismo": "Dirección General de Tráfico (DGT) / Ayuntamientos",
        "ambito": "Estatal / Local",
        "requisitos": [
            "Plazo de 20 días naturales desde la notificación de la infracción para elegir entre:",
            "a) Pagar con un 50% de descuento (renunciando a presentar alegaciones).",
            "b) Presentar alegaciones y proposición de prueba (se pierde el descuento del 50%)."
        ],
        "documentos": [
            "Número de expediente sancionador que figura en la denuncia (12 dígitos).",
            "DNI o NIE del titular.",
            "Escrito de alegaciones fundamentado y pruebas documentales (fotografías, margen de error del cinemómetro/radar, certificado de calibración del radar o señalización deficiente)."
        ],
        "pasos": [
            "Si hubo otro conductor al volante: OBLIGATORIO identificar al conductor infractor en un plazo de 20 días naturales (no hacerlo es una infracción muy grave con multa del doble o triple del importe original).",
            "Para pagar con descuento del 50%: pagar online en sede.dgt.gob.es, llamando al 060 o en oficinas de Correos y CaixaBank.",
            "Para recurrir: presentar escrito de alegaciones a través de la Sede Electrónica de la DGT o por el Registro Electrónico General (REC)."
        ],
        "plazo": "20 días naturales para pago reducido o para presentar escrito de alegaciones.",
        "coste": "Gratuito para recurrir. Pago voluntario bonificado con 50% de reducción.",
        "enlace_oficial": "https://sede.dgt.gob.es/es/multas/",
        "enlace_texto": "Sede DGT — Pago y Alegaciones de Multas",
        "plantilla_pdf": "instancia_general",
        "consejo": "Recurrir multas de radar solo es aconsejable si en la foto no se distingue la matrícula claramente, si no consta el certificado del radar en vigor o si no se ha aplicado el margen de error técnico legal (entre el 3% y el 7% según sea fijo o móvil)."
    },
    {
        "id": "matrimonio-civil-pareja-hecho",
        "keywords": [
            "casarse", "casarme", "casarnos", "matrimonio", "matrimonio civil", "boda", "boda civil", 
            "expediente matrimonial", "boda ante notario", "pareja de hecho", "inscribir pareja de hecho", 
            "papeles para casarse", "requisitos boda civil", "juzgado casarse"
        ],
        "titulo": "Matrimonio Civil y Registro de Parejas de Hecho",
        "organismo": "Registro Civil / Notarías / Registros de Parejas de Hecho Autonómicos",
        "ambito": "Justicia / Autonómico",
        "requisitos": [
            "Ser mayores de edad o menores emancipados.",
            "No estar ligados por vínculo matrimonial subsistente.",
            "Para boda civil: tramitar con carácter obligatorio previo el 'Expediente Matrimonial' (se puede realizar en el Registro Civil o ante cualquier Notario de tu domicilio).",
            "Para parejas de hecho: demostrar convivencia ininterrumpida (generalmente de 1 a 2 años según la comunidad autónoma) y empadronamiento conjunto."
        ],
        "documentos": [
            "Certificado literal de nacimiento de ambos contrayentes expedido hace menos de 3 o 6 meses.",
            "Certificado de empadronamiento histórico de los últimos 2 años.",
            "Declaración jurada de estado civil (soltería, divorcio o viudedad).",
            "DNI / NIE o Pasaportes en vigor.",
            "Si hubo matrimonio previo: certificado con nota marginal de divorcio o certificado de defunción del cónyuge anterior."
        ],
        "pasos": [
            "Elegir si tramitar el expediente en el Registro Civil (gratuito pero con lista de espera de meses) o ante Notario (más ágil, arancel aprox. 150-250 €).",
            "Comparecer ambos contrayentes acompañados de 1 o 2 testigos mayores de edad para la audiencia reservada.",
            "Dictada la resolución favorable de capacidad matrimonial, celebrar la boda en el Juzgado, Ayuntamiento o Notaría.",
            "El celebrante remite el acta al Registro Civil para la inscripción y expedición del Libro de Familia o Certificado de Matrimonio."
        ],
        "plazo": "El expediente matrimonial suele demorarse entre 1 y 4 meses en Registro Civil y de 15 a 30 días ante Notario.",
        "coste": "En el Registro Civil es 100% gratuito. Ante Notario tiene aranceles notariales regulados (~150 € - 300 €).",
        "enlace_oficial": "https://sede.mjusticia.gob.es/es/tramites/certificado-matrimonio",
        "enlace_texto": "Sede Ministerio de Justicia — Matrimonios",
        "plantilla_pdf": "instancia_general",
        "consejo": "Desde la reforma de la Ley de Jurisdicción Voluntaria, puedes acudir directamente al notario que elijas para que instruya el expediente completo y celebre la boda en pocos días, ahorrando largos meses de espera en el juzgado."
    },
    {
        "id": "ley-dependencia-grados",
        "keywords": [
            "ley de dependencia", "dependencia ancianos", "ayuda a la dependencia", "grado de dependencia",
            "cuidador familiar paga", "residencia ancianos ayuda", "teleasistencia", "valoracion dependencia"
        ],
        "titulo": "Reconocimiento del Grado de Dependencia y Ayudas (SAAD)",
        "organismo": "Consejerías de Asuntos Sociales de las Comunidades Autónomas y Servicios Sociales Municipales",
        "ambito": "Autonómico / Local",
        "requisitos": [
            "Encontrarse en situación de dependencia (Grado I Moderada, Grado II Severa o Grado III Gran Dependencia) que requiera ayuda de otra persona para actos básicos de la vida diaria.",
            "Residir en territorio español y haberlo hecho durante 5 años, de los cuales 2 deben ser inmediatamente anteriores a la fecha de solicitud."
        ],
        "documentos": [
            "DNI/NIE del solicitante y de su representante legal o guardador de hecho.",
            "Informe médico de salud actualizado de las patologías y grado de autonomía.",
            "Certificado de empadronamiento histórico.",
            "Declaración del IRPF o autorización para comprobar la capacidad económica."
        ],
        "pasos": [
            "Pedir cita con el Trabajador Social del Centro de Servicios Sociales de tu Ayuntamiento para abrir el expediente.",
            "Presentar la solicitud oficial de Dependencia en el registro autonómico.",
            "Un técnico valorador oficial acudirá al domicilio del solicitante para evaluar su entorno y capacidades motoras y cognitivas.",
            "Emisión de la resolución de Grado de Dependencia y elaboración del PIA (Programa Individual de Atención), donde se asigna la prestación (cuidador no profesional, centro de día, teleasistencia o plaza residencial)."
        ],
        "plazo": "El plazo legal máximo es de 6 meses desde la solicitud hasta la resolución del PIA (aunque en varias CC.AA. los tiempos reales son mayores, devengando derecho a atrasos retroactivos).",
        "coste": "Gratuito.",
        "enlace_oficial": "https://imserso.es/el-imserso/dependencia",
        "enlace_texto": "Portal Oficial IMSERSO — Sistema de Dependencia",
        "plantilla_pdf": "instancia_general",
        "consejo": "Si transcurren más de 6 meses sin resolución, la ley garantiza el cobro de atrasos retroactivos desde el día siguiente al cumplimiento de ese plazo para la prestación económica de cuidados en el entorno familiar."
    },
    {
        "id": "grado-discapacidad",
        "keywords": [
            "discapacidad", "certificado de discapacidad", "reconocimiento discapacidad", "tarjeta discapacidad",
            "33 por ciento discapacidad", "beneficios 33 discapacidad", "puntos discapacidad", "evaluacion discapacidad"
        ],
        "titulo": "Reconocimiento del Grado de Discapacidad (33% o superior)",
        "organismo": "Centros Base de Atención a Personas con Discapacidad (Comunidades Autónomas)",
        "ambito": "Autonómico",
        "requisitos": [
            "Padecer limitaciones físicas, psíquicas, sensoriales o intelectuales evaluables según el baremo oficial vigente (Real Decreto 888/2022).",
            "Estar empadronado en el municipio y comunidad autónoma donde se formula la solicitud."
        ],
        "documentos": [
            "DNI / NIE en vigor.",
            "Informes médicos y psicológicos originales y actualizados del Servicio Público de Salud.",
            "Certificado de empadronamiento."
        ],
        "pasos": [
            "Presentar la solicitud de reconocimiento de discapacidad ante la Consejería de Servicios Sociales de tu Comunidad.",
            "Recibir citación para acudir al Centro Base para ser valorado por el equipo multidisciplinar (médico, psicólogo y trabajador social).",
            "Recibir por carta certificada el Dictamen Propuesta y la Resolución con el porcentaje concedido y si tiene carácter definitivo o revisable.",
            "Con un 33% o superior, solicitar la Tarjeta Acreditativa de Discapacidad para disfrutar de exenciones fiscales (IRPF, impuesto de matriculación, IVTM municipal) y cuotas de empleo protegido."
        ],
        "plazo": "Legalmente 6 meses para resolver.",
        "coste": "100% Gratuito.",
        "enlace_oficial": "https://www.mdsocialesa2030.gob.es/",
        "enlace_texto": "Ministerio de Derechos Sociales — Discapacidad",
        "plantilla_pdf": "instancia_general",
        "consejo": "Alcanzar el 33% de discapacidad otorga automáticamente exención total del Impuesto de Tracción Mecánica (IVTM) de tu coche en el ayuntamiento, deducciones de hasta 3.000€ en el IRPF y acceso a plazas reservadas en oposiciones."
    },
    {
        "id": "bono-social-electrico-termico",
        "keywords": [
            "bono social", "bono social electrico", "bono social luz", "descuento factura luz",
            "bono termico", "ayuda calefaccion luz", "consumidor vulnerable", "tarifa regulada pvpc"
        ],
        "titulo": "Bono Social Eléctrico y Bono Térmico para el Hogar",
        "organismo": "Ministerio para la Transición Ecológica y el Reto Demográfico / Comercializadoras de Referencia",
        "ambito": "Estatal",
        "requisitos": [
            "Tener contratada la tarifa regulada PVPC de electricidad en la vivienda habitual con una potencia igual o inferior a 10 kW.",
            "Cumplir condiciones de renta: Consumidor Vulnerable (descuento del 40% al 65% en la factura eléctrica) o Vulnerable Severo (descuento de hasta el 80%).",
            "Son considerados vulnerables directos: familias numerosas, perceptores del IMV y pensionistas de pensión mínima."
        ],
        "documentos": [
            "Formulario oficial de bono social cumplimentado y firmado por todos los miembros de la unidad de convivencia mayores de 14 años.",
            "Fotocopia del DNI/NIE de todos los miembros del hogar.",
            "Certificado de empadronamiento colectivo expedido hace menos de 3 meses.",
            "Libro de familia o certificados de nacimiento.",
            "Título de familia numerosa o certificado de pensionista si aplica."
        ],
        "pasos": [
            "Contactar con tu Comercializadora de Referencia (Curenergía, Energía XXI, Comercializadora Regulada Gas&Power, Baser, Régsiti, etc.).",
            "Enviar el formulario y la documentación por correo electrónico, web o correo postal.",
            "La comercializadora cruzará datos con la aplicación telemática del Ministerio y aplicará el descuento directamente en las facturas.",
            "La concesión del bono eléctrico da derecho automático a cobrar una vez al año el Bono Social Térmico de ayuda a la calefacción sin tener que pedirlo aparte."
        ],
        "plazo": "La comercializadora debe contestar y activar el bono en un plazo máximo de 15 días hábiles desde la solicitud completa.",
        "coste": "Gratuito.",
        "enlace_oficial": "https://www.bonosocial.gob.es/",
        "enlace_texto": "Portal Oficial Bono Social — Ministerio de Transición Ecológica",
        "plantilla_pdf": "instancia_general",
        "consejo": "Tiene una vigencia general de 2 años con renovación automática si se autoriza el cruce de datos fiscales, salvo para familias numerosas cuya vigencia dura hasta la caducidad del título."
    },
    {
        "id": "bono-alquiler-joven",
        "keywords": [
            "bono alquiler joven", "ayuda 250 alquiler", "ayuda alquiler jovenes", "bono joven vivienda",
            "subvencion alquiler comunidad", "ayuda pagar piso joven"
        ],
        "titulo": "Bono Alquiler Joven (250 €/mes)",
        "organismo": "Comunidades Autónomas / Ministerio de Vivienda y Agenda Urbana",
        "ambito": "Autonómico",
        "requisitos": [
            "Tener entre 18 y 35 años en el momento de la solicitud.",
            "Poseer la nacionalidad española o residencia legal.",
            "Ser titular de un contrato de arrendamiento o cesión de uso de vivienda habitual (o habitación).",
            "Ingresos de la unidad de convivencia inferiores a 3 veces el IPREM (aprox. 25.200 € anuales, ampliable en algunas CC.AA.).",
            "Límite de precio máximo de renta: vivienda hasta 600 €/mes (ampliable a 900 €/mes en zonas tensionadas) o habitación hasta 300 €/mes (ampliable a 450 €/mes)."
        ],
        "documentos": [
            "DNI/NIE del solicitante.",
            "Copia completa del contrato de alquiler de la vivienda firmado.",
            "Certificado de empadronamiento colectivo en la vivienda.",
            "Justificantes bancarios del pago de las rentas mensuales al arrendador.",
            "Declaración del IRPF o contrato de trabajo que acredite fuente regular de ingresos."
        ],
        "pasos": [
            "Estar atento a la publicación de la convocatoria anual en el Boletín Oficial de tu Comunidad Autónoma.",
            "Presentar la solicitud telemática con certificado digital en la sede de vivienda de tu comunidad.",
            "Aportar periódicamente los justificantes de transferencias bancarias de pago de la renta para recibir el abono mensual."
        ],
        "plazo": "Ayuda concedida durante un periodo máximo de 24 meses (hasta 6.000 € en total).",
        "coste": "Gratuito.",
        "enlace_oficial": "https://www.mivau.gob.es/arquitectura-vivienda-y-suelo/programas-de-ayudas-la-vivienda/bono-alquiler-joven",
        "enlace_texto": "Ministerio de Vivienda — Bono Alquiler Joven",
        "plantilla_pdf": "instancia_general",
        "consejo": "Las convocatorias en comunidades autónomas se tramitan habitualmente por estricto orden de presentación de solicitud hasta agotar presupuesto: ten preparados todos los documentos en PDF para el día de apertura."
    },
    {
        "id": "becas-mec-educacion",
        "keywords": [
            "beca mec", "becas mec", "beca estudios", "beca universidad", "beca bachillerato",
            "beca fp", "solicitar beca educacion", "cuantia beca mec", "plazo beca mec", "modificar beca mec"
        ],
        "titulo": "Becas Generales del Ministerio de Educación (MEC)",
        "organismo": "Ministerio de Educación, Formación Profesional y Deportes",
        "ambito": "Estatal",
        "requisitos": [
            "Destinadas a estudios de Bachillerato, FP (Básica, Media y Superior), Universidad (Grado y Máster oficial) y Enseñanzas Artísticas.",
            "Requisitos de renta y patrimonio familiar (dentro de los umbrales 1, 2 o 3 fijados anualmente).",
            "Requisitos académicos: matricularse de un número mínimo de créditos (60 en matrícula completa universitaria) y superar un porcentaje determinado de asignaturas del curso previo."
        ],
        "documentos": [
            "DNI o NIE de todos los miembros del hogar mayores de 14 años.",
            "Número de cuenta bancaria donde el estudiante figure obligatoriamente como titular o cotitular.",
            "Título de familia numerosa o certificado de discapacidad si corresponde."
        ],
        "pasos": [
            "Registrarse en la Sede Electrónica del Ministerio de Educación.",
            "Presentar la solicitud en el plazo de la convocatoria anticipada (marzo - mayo del año anterior al curso académico).",
            "El Ministerio comprueba los requisitos económicos en verano. En septiembre/octubre se abre el plazo para confirmar o modificar los datos académicos de matrícula.",
            "Resolución y abono de la cuantía fija ligada a la renta, cuantía ligada a la residencia y cuantía variable."
        ],
        "plazo": "Plazo estricto de convocatoria (habitualmente cierra en mayo). No se admiten solicitudes fuera de plazo.",
        "coste": "Gratuito.",
        "enlace_oficial": "https://www.becaseducacion.gob.es/",
        "enlace_texto": "Portal Oficial de Becas de Educación — MEC",
        "plantilla_pdf": "instancia_general",
        "consejo": "Presenta la beca siempre en el plazo de primavera aunque aún no sepas qué nota sacarás en la EBAU o si cambiarás de carrera: podrás actualizar tu centro y titulación en la segunda fase de septiembre sin perder la ayuda."
    },
    {
        "id": "licencia-obras-ayuntamiento",
        "keywords": [
            "licencia de obra", "obra menor", "comunicacion previa obra", "reformar bano", "reformar cocina",
            "tirar tabique", "permiso obras ayuntamiento", "declaracion responsable obras", "tasa obra menor"
        ],
        "titulo": "Licencia de Obras y Declaración Responsable de Obras Menores",
        "organismo": "Ayuntamiento de tu municipio (Área de Urbanismo)",
        "ambito": "Local",
        "requisitos": [
            "Obra menor (reforma de cocina, baño, cambio de suelos, fontanería, carpintería): basta en la inmensa mayoría de ayuntamientos con una 'Declaración Responsable' o 'Comunicación Previa', que habilita a iniciar los trabajos desde el mismo día de la presentación y pago de tasas.",
            "Obra mayor (que afecte a la estructura del edificio, fachadas, elementos comunes o aumento de volumen): requiere Proyecto Técnico visado por arquitecto colegiado y concesión expresa de Licencia Urbanística."
        ],
        "documentos": [
            "Impreso normalizado de declaración responsable o solicitud municipal.",
            "Presupuesto detallado por partidas emitido por la empresa de reformas.",
            "Plano o croquis del estado actual y reformado (si se modifican distribuciones).",
            "Justificante de pago de la Tasa Urbanística y del ICIO (Impuesto sobre Construcciones, Instalaciones y Obras, normalmente entre el 2% y el 4% del coste de obra)."
        ],
        "pasos": [
            "Entrar en la sede electrónica de tu ayuntamiento (Urbanismo -> Obras).",
            "Presentar la declaración responsable adjuntando el presupuesto y pagar el ICIO telemáticamente.",
            "Colocar el cartel o justificante del registro visible en la puerta de la vivienda durante las obras."
        ],
        "plazo": "Para obras menores con declaración responsable: inicio inmediato tras la presentación telemática.",
        "coste": "Tasa municipal de tramitación (~30-80 €) + ICIO (~2% al 4% del presupuesto de ejecución material).",
        "enlace_oficial": "https://rec.redsara.es",
        "enlace_texto": "Registro Electrónico General (redsara.es)",
        "plantilla_pdf": "instancia_general",
        "consejo": "No empieces reformas sin tramitar la declaración responsable: si los vecinos llaman a la Policía Local por ruidos o escombros y no presentas el justificante de registro, te precintarán la obra y te impondrán una sanción con recargo."
    },
    {
        "id": "silencio-administrativo-ley39",
        "keywords": [
            "silencio administrativo", "la administracion no me contesta", "plazo para contestar administracion",
            "recurso de alzada", "recurso potestativo de reposicion", "que pasa si no contestan",
            "silencio negativo", "silencio positivo", "ley 39 2015", "escrito queja administracion"
        ],
        "titulo": "Silencio Administrativo y Recursos ante la Falta de Respuesta (Ley 39/2015)",
        "organismo": "Cualquier Administración Pública (Estatal, Autonómica o Local)",
        "ambito": "Procedimiento Administrativo Común",
        "requisitos": [
            "El artículo 21 de la Ley 39/2015 obliga a toda la Administración Pública a dictar resolución expresa y notificarla en todos los procedimientos.",
            "Plazo legal supletorio: si la norma reguladora no fija plazo, el plazo máximo legal es de 3 MESES.",
            "Regla general: Silencio Positivo (se entiende estimado), EXCEPTO cuando una ley establezca expresamente lo contrario, en procedimientos de ejercicio del derecho de petición, solicitudes de facultades sobre dominio público, o cuando se reclamen indemnizaciones por responsabilidad patrimonial de la Administración (donde el silencio es NEGATIVO)."
        ],
        "documentos": [
            "Copia sellada o justificante con Código Seguro de Verificación (CSV) de la solicitud original donde conste la fecha y hora de registro de entrada.",
            "Escrito de Recurso de Alzada o Recurso Potestativo de Reposición."
        ],
        "pasos": [
            "Calcular la fecha de vencimiento sumando los meses hábiles/naturales del trámite desde la fecha de entrada en el registro oficial.",
            "Si transcurre el plazo sin respuesta expresa y el silencio es negativo: tienes expedita la vía del Recurso de Alzada (ante el superior jerárquico) o Recurso Potestativo de Reposición (ante el mismo órgano) en cualquier momento a partir del día siguiente al que se produzcan los efectos del silencio.",
            "Generar en HagaClic una Instancia Oficial / Escrito de Reclamación citando el incumplimiento del plazo del art. 21 de la Ley 39/2015 y exigiendo la resolución inmediata."
        ],
        "plazo": "3 meses supletorio si la ley especial no fija plazo específico (en ningún caso puede superar 6 meses salvo norma con rango de ley europea).",
        "coste": "Gratuito en vía administrativa.",
        "enlace_oficial": "https://rec.redsara.es",
        "enlace_texto": "Registro Electrónico General del Estado",
        "plantilla_pdf": "instancia_general",
        "consejo": "A efectos legales, la Administración sigue obligada a resolver aunque haya vencido el plazo; además, si el silencio inicial fue positivo por ley, cualquier resolución tardía de la Administración solo puede ser confirmatoria de la estimación."
    }
]

# ============================================================================
# CONECTOR OPCIONAL A MODELOS FUNDACIONALES (GEMINI / OPENAI)
# ============================================================================
def consultar_llm_externo(mensaje, historial):
    """
    Si existe GEMINI_API_KEY en el entorno, consulta al modelo de Gemini
    mediante llamada REST directa sin dependencias externas.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        return None

    system_prompt = (
        "Eres el Asistente Experto en la Administración Pública de España de HagaClic. "
        "Tu misión es orientar al ciudadano con rigor legal, máxima claridad, sencillez y empatía "
        "sobre CUALQUIER trámite, ayuda, pensión, tributo, gestión de tráfico, extranjería, justicia o ayuntamientos. "
        "Estructura siempre tu respuesta con: "
        "1. 🏛️ Organismo competente y fundamento básico (mencionando normativas como Ley 39/2015, LGSS, Ley de Tráfico o Extranjería si procede). "
        "2. 📋 Requisitos clave que debe cumplir. "
        "3. 📄 Documentación indispensable a reunir. "
        "4. 🚀 Pasos claros para tramitarlo (sede electrónica con Cl@ve/Certificado o presencial con cita). "
        "5. ⏰ Plazos legales de solicitud y resolución. "
        "6. 💡 Consejo práctico fundamental para evitar denegaciones o demoras. "
        "Mantén un tono cercano, profesional y accesible, sin jerga incomprensible. Usa negritas y viñetas ordenadas."
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    contents = [
        {"role": "user", "parts": [{"text": f"Instrucción del sistema: {system_prompt}\n\nPregunta del ciudadano: {mensaje}"}]}
    ]

    payload = json.dumps({"contents": contents}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            candidates = res_data.get("candidates", [])
            if candidates:
                part_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                if part_text:
                    return part_text.strip()
    except Exception as e:
        # Fallback silencioso al motor experto local si la API falla o agota tiempo
        return None

    return None

# ============================================================================
# MOTOR EXPERTO LOCAL DE INTELIGENCIA ADMINISTRATIVA ESPAÑOLA
# ============================================================================
def generar_respuesta_experto_local(mensaje, catalogo_tramites):
    """
    Analiza la consulta en lenguaje natural, la empareja con la base de
    conocimiento extendida o genera una respuesta administrativa personalizada
    conforme al procedimiento administrativo común español.
    """
    norm_q = normalize(mensaje)
    tokens = set(t for t in norm_q.split() if len(t) > 2)

    best_match_catalog = None
    best_catalog_score = 0

    # 1. Puntuación en catálogo cerrado de HagaClic
    for tramite in catalogo_tramites:
        score = 0
        norm_titulo = normalize(tramite.get("titulo", ""))
        titulo_tokens = set(norm_titulo.split())
        score += len(tokens & titulo_tokens) * 15

        if norm_titulo in norm_q:
            score += 40

        for kw in tramite.get("palabras_clave", []):
            norm_kw = normalize(kw)
            if norm_kw in norm_q:
                score += 30
            elif set(norm_kw.split()).issubset(tokens):
                score += 20

        if score > best_catalog_score:
            best_catalog_score = score
            best_match_catalog = tramite

    # 2. Puntuación en base de conocimiento extendida
    best_item = None
    best_expert_score = 0

    for item in TRAMITES_EXPERTO:
        score = 0
        norm_item_titulo = normalize(item.get("titulo", ""))
        titulo_tokens = set(norm_item_titulo.split())
        score += len(tokens & titulo_tokens) * 15

        if norm_item_titulo in norm_q:
            score += 40

        for kw in item["keywords"]:
            norm_kw = normalize(kw)
            if norm_kw in norm_q:
                score += 30
            elif set(norm_kw.split()).issubset(tokens):
                score += 20

        if score > best_expert_score:
            best_expert_score = score
            best_item = item

    # Si el catálogo interno tiene una coincidencia superior y supera el umbral
    if best_match_catalog and best_catalog_score >= 30 and best_catalog_score >= best_expert_score:
        tramite = best_match_catalog
        texto = (
            f"📌 **He localizado este trámite en nuestro catálogo guiado paso a paso:**\n\n"
            f"### {tramite['titulo']}\n"
            f"{tramite.get('resumen', '')}\n\n"
            f"🏢 **Organismo Competente:** {tramite.get('organismo', 'Administración Pública')}\n"
            f"💰 **Coste:** {tramite.get('coste', 'Gratuito')}\n"
            f"⏰ **Plazo:** {tramite.get('plazo', 'Plazo legal aplicable')}\n"
            f"📍 **Dónde acudir:** {tramite.get('donde', 'Sede electrónica o presencial con cita previa')}\n\n"
            f"💡 **Recomendación:** Pulsa abajo en **'Ver guía completa'** para consultar los documentos exactos "
            f"y la explicación interactiva paso a paso."
        )
        acciones = [
            {"label": "📖 Ver guía completa en HagaClic", "tipo": "ver_tramite", "id": tramite['id']},
            {"label": "🔗 Sede Electrónica Oficial", "tipo": "link_externo", "url": tramite.get('enlace_oficial', 'https://administracion.gob.es')}
        ]
        if tramite.get('plantilla_carta'):
            acciones.append({
                "label": "📄 Generar PDF Oficial",
                "tipo": "generar_pdf",
                "template": tramite['plantilla_carta'],
                "titulo": tramite['titulo']
            })
        acciones.append({"label": "⏱️ Calcular Plazo Legal", "tipo": "calculadora", "dias": 20})
        
        return {
            "respuesta": texto,
            "acciones": acciones,
            "organismo": tramite.get("organismo", "Administración"),
            "fuente": "catalogo_hagaclic"
        }

    # Si la base de conocimiento extendida tiene la mejor coincidencia
    if best_item and best_expert_score >= 30:
        # Ficha experta encontrada
        req_list = "\n".join([f"• {r}" for r in best_item["requisitos"]])
        doc_list = "\n".join([f"• {d}" for d in best_item["documentos"]])
        paso_list = "\n".join([f"{idx+1}. {p}" for idx, p in enumerate(best_item["pasos"])])

        texto = (
            f"🏛️ **Orientación Oficial: {best_item['titulo']}**\n\n"
            f"🏢 **Organismo Responsable:** {best_item['organismo']} ({best_item.get('ambito', 'Estatal')})\n\n"
            f"📋 **Requisitos Clave:**\n{req_list}\n\n"
            f"📄 **Documentación que debes preparar:**\n{doc_list}\n\n"
            f"🚀 **Cómo tramitarlo paso a paso:**\n{paso_list}\n\n"
            f"⏰ **Plazos y Tiempos:** {best_item['plazo']}\n"
            f"💰 **Coste:** {best_item['coste']}\n\n"
            f"💡 **Consejo Práctico:** {best_item['consejo']}"
        )

        acciones = [
            {"label": f"🔗 {best_item['enlace_texto']}", "tipo": "link_externo", "url": best_item['enlace_oficial']},
            {
                "label": "📄 Redactar Instancia en PDF (Ley 39/2015)",
                "tipo": "generar_pdf",
                "template": best_item.get('plantilla_pdf', 'instancia_general'),
                "titulo": best_item['titulo']
            },
            {"label": "⏱️ Calcular Plazo en HagaClic", "tipo": "calculadora", "dias": 30}
        ]

        return {
            "respuesta": texto,
            "acciones": acciones,
            "organismo": best_item["organismo"],
            "fuente": "conocimiento_experto_administracion"
        }

    # 3. Orientación universal general fundamentada en la Ley 39/2015
    # (El ciudadano pregunta por algo totalmente nuevo o particular)
    clean_prompt = mensaje.strip()
    texto_universal = (
        f"🏛️ **Orientación Ciudadana para: \"{clean_prompt}\"**\n\n"
        f"Aunque este trámite específico no corresponde a una plantilla estándar prefijada, según la **Ley 39/2015 del Procedimiento Administrativo Común de las Administraciones Públicas**, todo ciudadano tiene el derecho fundamental a presentar peticiones, solicitudes o reclamaciones formalizadas.\n\n"
        f"🏢 **Competencia y Órgano:**\n"
        f"• **Si es un asunto local (vivienda, vía pública, tributos locales, basuras):** Corresponde a tu **Ayuntamiento**.\n"
        f"• **Si es sanidad, educación, dependencia o vivienda protegida:** Corresponde a tu **Comunidad Autónoma**.\n"
        f"• **Si es empleo, pensiones, extranjería o tráfico:** Corresponde a la **Administración General del Estado** (SEPE, INSS, DGT, etc.).\n\n"
        f"🚀 **Procedimiento para formular tu trámite con validez jurídica:**\n"
        f"1. Redacta una **Instancia General formal** con tu identificación completa, los hechos explicados con claridad y tu petición concreta (EXPONE / SOLICITA).\n"
        f"2. Aporta copia de tu documento de identidad (DNI/NIE/Pasaporte) y los documentos que justifiquen tu petición.\n"
        f"3. Preséntala a través del **Registro Electrónico General del Estado (REC - redsara.es)** con Cl@ve o certificado digital, o de forma presencial por ventanilla única en cualquier oficina de registro.\n"
        f"4. Exige siempre tu **justificante con fecha, hora y número de registro de entrada**.\n\n"
        f"⏰ **Plazo Legal de Respuesta:** Por norma supletoria (art. 21 Ley 39/2015), la Administración tiene un plazo máximo de **3 meses** para notificarte la resolución expresa.\n\n"
        f"💡 **Consejo HagaClic:** Puedes generar ahora mismo tu Instancia Oficial en formato PDF lista para firmar e imprimir o subir a la sede electrónica con el botón que tienes abajo."
    )

    acciones_universales = [
        {
            "label": "📄 Redactar Instancia Oficial en PDF",
            "tipo": "generar_pdf",
            "template": "instancia_general",
            "titulo": f"Solicitud sobre {clean_prompt[:40]}"
        },
        {"label": "🔗 Registro Electrónico General (redsara.es)", "tipo": "link_externo", "url": "https://rec.redsara.es"},
        {"label": "⏱️ Calcular Plazo de 3 Meses", "tipo": "calculadora", "dias": 90},
        {"label": "📚 Explorar Catálogo HagaClic", "tipo": "ir_catalogo"}
    ]

    return {
        "respuesta": texto_universal,
        "acciones": acciones_universales,
        "organismo": "Registro Electrónico General / Administración Pública",
        "fuente": "orientacion_general_ley39"
    }

# ============================================================================
# FUNCIÓN PRINCIPAL DE ENTRADA AL ASISTENTE
# ============================================================================
def generar_respuesta_asistente(mensaje, historial=None, catalogo_tramites=None):
    """
    Punto de entrada principal para el Asistente Conversacional.
    Evalúa si se puede usar el conector LLM en vivo; si no, ejecuta
    el motor experto local de máxima precisión.
    """
    if not mensaje or not mensaje.strip():
        return {
            "respuesta": "¡Hola! Cuéntame qué trámite, ayuda o papeleo necesitas resolver en la administración y te orientaré con todos los pasos, plazos y requisitos.",
            "acciones": [
                {"label": "📚 Ver catálogo de trámites", "tipo": "ir_catalogo"},
                {"label": "📄 Redactar Instancia General", "tipo": "generar_pdf", "template": "instancia_general", "titulo": "Instancia General"}
            ],
            "fuente": "bienvenida"
        }

    catalogo = catalogo_tramites or []

    # Intentar primero con LLM externo si hay clave configurada
    respuesta_llm = consultar_llm_externo(mensaje, historial)
    if respuesta_llm:
        # Si el LLM respondió, le añadimos acciones universales inteligentes de HagaClic
        acciones = [
            {"label": "📄 Redactar Instancia Oficial en PDF", "tipo": "generar_pdf", "template": "instancia_general", "titulo": f"Trámite: {mensaje[:30]}"},
            {"label": "🔗 Punto de Acceso General (administracion.gob.es)", "tipo": "link_externo", "url": "https://administracion.gob.es"},
            {"label": "⏱️ Calculadora de Plazos", "tipo": "calculadora", "dias": 30}
        ]
        return {
            "respuesta": respuesta_llm,
            "acciones": acciones,
            "organismo": "Administración Pública de España",
            "fuente": "llm_generativo"
        }

    # Motor experto local de máxima exhaustividad
    return generar_respuesta_experto_local(mensaje, catalogo)
