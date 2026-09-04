# HagaClic 🏛️ - Asistente de Trámites Administrativos para España

**HagaClic** es una aplicación web local orientada al ciudadano español (diseñada con especial atención a la sencillez y accesibilidad para personas mayores) que traduce los problemas cotidianos de la ciudadanía en lenguaje natural (*"tengo que renovar el DNI"*, *"quiero darme de baja de la luz"*, *"el casero no me devuelve la fianza"*) en guías claras paso a paso, checklist interactivo de documentos, plazos oficiales, costes contrastados y un generador de cartas formales en PDF listas para descargar, firmar y presentar.

---

## 🌟 Funcionalidades Principales

1. **Buscador en Lenguaje Natural y Sinónimos Cotidianos**:
   - Entiende expresiones de la vida real (*"quitar movistar"*, *"papeles nie"*, *"cobrar el paro"*, *"compra rota"*, *"despido"*, *"empadronarme piso"*).
   - Sugerencias rápidas clicables en portada para las gestiones más frecuentes.
   - Filtros por categorías ciudadanas (*Vivienda*, *Consumo y Suministros*, *Documentación*, *Trabajo*, *Extranjería*).

2. **Catálogo Inicial de 8 Trámites Oficiales (Contrastados con fuentes oficiales 2025)**:
   - **Renovar el DNI** (Tasas exactas de 12,00 €, fotografías, exenciones, citapreviadnie.es / Policía Nacional).
   - **Darse de baja de una compañía de luz, gas o teléfono** (Plazo legal máximo de 2 días hábiles según RD 899/2009 y art. 68 TRLGDCU).
   - **Reclamar la fianza al casero** (Plazo legal de 1 mes según el artículo 36.4 de la LAU, intereses legales y juicio verbal sin abogado).
   - **Reclamar una compra defectuosa ante Consumo** (Garantía de 3 años, presunción de 2 años según RDL 1/2007 reformado por RDL 7/2021, OMIC y arbitraje).
   - **Empadronarse en el municipio** (Ley 7/1985 de Bases de Régimen Local, trámite 100% gratuito).
   - **Solicitar cita previa en Extranjería** (Portal oficial icpplus de la Sede Administraciones Públicas, aviso contra fraudes de reventa).
   - **Solicitar prestación por desempleo (SEPE)** (Plazo perentorio de 15 días hábiles, DARDE autonómico previo).
   - **Cancelar un contrato de gimnasio** (TRLGDCU arts. 62 y 86 sobre cláusulas abusivas de prórroga automática).

3. **Fichas Detalladas Paso a Paso**:
   - Pasos numerados explicados en lenguaje llano sin tecnicismos innecesarios.
   - **Checklist interactivo de documentos** que permite marcar los papeles ya preparados con contador en vivo (*"X de Y preparados"*).
   - Cajas informativas destacadas: ¿Cuánto cuesta?, ¿Dónde se hace?, ¿Cuál es el plazo legal?
   - Consejos prácticos para evitar que te rechacen el trámite.
   - Enlace directo verificado a la sede electrónica oficial correspondiente.
   - Sello oficial con fecha de verificación normativa.

4. **Generador de Cartas Oficiales en PDF (ReportLab)**:
   - Formulario sencillo e intuitivo en 3 pasos (datos del solicitante, del destinatario y del caso).
   - Generación instantánea en el servidor de documentos formales con fundamentación legal española, apercibimiento y espacio para firma.
   - 3 plantillas jurídicas iniciales:
     - *Baja de suministro o servicios (telecomunicaciones / electricidad / gas)*.
     - *Requerimiento de devolución de fianza al casero (art. 36.4 LAU)*.
     - *Reclamación formal previa a empresa en materia de consumo / producto defectuoso / servicios / gimnasio*.

5. **Sección "Mis Trámites" (Gestión Privada en el Navegador)**:
   - Permite guardar cualquier trámite iniciado directamente en el navegador (`localStorage`).
   - Sin registro de usuario, sin cuentas y sin contraseñas.
   - Semáforo y cálculo automático de días restantes hasta el vencimiento del plazo (*"En plazo"*, *"¡Urgente!"*, *"Plazo vencido"*).
   - Permite añadir notas personales y marcar trámites como completados.

6. **Diseño y Accesibilidad Integral**:
   - Estilo banca confiable con contraste óptimo y textos grandes.
   - Botón de **"Letra Grande (A+)"** para escalar la tipografía con un clic.
   - Botón de **"Alto Contraste"** para facilitar la lectura a personas mayores o con dificultades de visión.
   - 100% adaptable a pantallas de ordenador, tablets y teléfonos móviles.

---

## 💻 Requisitos Técnicos

- **Python 3.10 o superior**.
- Librerías necesarias (incluidas en `requirements.txt`):
  - `Flask>=3.0.0`
  - `reportlab>=4.0.0`

---

## 🚀 Cómo Arrancar la Aplicación

### Método 1: Con 1 solo clic (Para Windows)
1. Haz doble clic en el archivo **`run.bat`**.
2. Se iniciará el servidor y se abrirá automáticamente tu navegador en **`http://localhost:5000`**.

### Método 2: Desde la terminal o consola
1. Clona o descarga este repositorio:
   ```bash
   git clone https://github.com/jmd8590-source/hagaclic.git
   cd hagaclic
   ```
2. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```
3. Inicia el servidor Flask:
   ```bash
   python app.py
   ```
4. Abre tu navegador web y entra en:
   **`http://localhost:5000`**

---

## 📂 Estructura del Proyecto

```
hagaclic/
├── app.py                  # Servidor web Flask y API de búsqueda semántica
├── pdf_generator.py        # Motor de generación de cartas legales en PDF (ReportLab)
├── requirements.txt        # Dependencias de Python
├── run.bat                 # Lanzador directo de 1 clic para Windows
├── test_search.py          # Script de pruebas de búsqueda en lenguaje natural
├── data/
│   └── tramites.json       # Base de datos estructurada de trámites oficiales verificados
├── templates/
│   └── index.html          # Interfaz web accesible y responsiva (HTML5)
└── static/
    ├── css/
    │   └── style.css       # Estilos accesibles con modos Letra Grande y Alto Contraste
    └── js/
        └── app.js          # Lógica interactiva cliente (buscador, checklist, storage)
```

---

## ⚖️ Aviso Legal

> **Información ciudadana no vinculante:** HagaClic es una herramienta de orientación para facilitar la comprensión ciudadana de las gestiones en España. No constituye asesoramiento profesional o jurídico formal ni tiene vinculación oficial con las administraciones públicas. Las tasas, normativas y requisitos deben confirmarse siempre en las sedes electrónicas y boletines oficiales del Estado (sede.gob.es, boe.es).
