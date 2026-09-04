import os
import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm

def build_pdf_buffer(template_type, data):
    """
    Genera una carta formal en PDF utilizando ReportLab según la plantilla seleccionada.
    
    data contiene:
      - solicitante_nombre: str
      - solicitante_nif: str
      - solicitante_direccion: str
      - solicitante_telefono: str
      - solicitante_email: str
      - destinatario_nombre: str
      - destinatario_cif: str (opcional)
      - destinatario_direccion: str
      - referencia_contrato: str (opcional / nro contrato, CUPS, ref inmueble)
      - fecha_hecho: str (opcional / fecha entrega llaves, fecha compra, etc.)
      - cuantia: str (opcional / importe fianza, precio pagado)
      - explicacion_hechos: str (breve relato o motivo)
      - ciudad_firma: str
      - fecha_carta: str
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2.2 * cm,
        rightMargin=2.2 * cm,
        topMargin=2.2 * cm,
        bottomMargin=2.2 * cm
    )

    styles = getSampleStyleSheet()
    
    # Estilos tipográficos personalizados
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=colors.HexColor('#0f2942'),
        alignment=0
    )
    
    asunto_style = ParagraphStyle(
        'DocAsunto',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#1e3a8a'),
        backColor=colors.HexColor('#f1f5f9'),
        borderPadding=6,
        spaceAfter=10
    )

    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14.5,
        textColor=colors.HexColor('#1f2937'),
        alignment=4, # Justificado
        spaceAfter=9
    )

    bold_body_style = ParagraphStyle(
        'DocBodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    party_style = ParagraphStyle(
        'PartyText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155')
    )

    party_header_style = ParagraphStyle(
        'PartyHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#0f2942')
    )

    legal_cite_style = ParagraphStyle(
        'LegalCite',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#475569'),
        leftIndent=12,
        spaceAfter=8
    )

    story = []

    # Encabezado formal con título y fecha
    fecha_hoy = data.get('fecha_carta') or datetime.now().strftime("%d/%m/%Y")
    ciudad = data.get('ciudad_firma') or "En España"

    # Títulos y Asuntos por plantilla
    if template_type == "baja_suministro":
        doc_title = "COMUNICACIÓN FORMAL DE RESOLUCIÓN CONTRACTUAL Y BAJA DE SERVICIO"
        asunto_text = f"ASUNTO: Solicitud fehaciente de baja definitiva de servicio / suministro y cese de facturación."
        if data.get('referencia_contrato'):
            asunto_text += f" Contrato/Ref: {data.get('referencia_contrato')}"
    elif template_type == "reclamar_fianza":
        doc_title = "REQUERIMIENTO FEHACIENTE DE DEVOLUCIÓN DE FIANZA DE ARRENDAMIENTO"
        asunto_text = f"ASUNTO: Reclamación extrajudicial previa de devolución de fianza legal (Art. 36.4 LAU)."
        if data.get('referencia_contrato'):
            asunto_text += f" Inmueble: {data.get('referencia_contrato')}"
    else: # reclamacion_empresa
        doc_title = "RECLAMACIÓN FORMAL PREVIA EN MATERIA DE CONSUMO"
        asunto_text = f"ASUNTO: Reclamación previa formal y solicitud de subsanación / resolución contractual."
        if data.get('referencia_contrato'):
            asunto_text += f" Ref./Pedido: {data.get('referencia_contrato')}"

    story.append(Paragraph(doc_title, title_style))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0f2942'), spaceBefore=2, spaceAfter=14))

    # Bloque de Remitente y Destinatario (Tabla a 2 columnas)
    remitente_text = [
        Paragraph("<b>DE (REMITENTE / PARTE INTERESADA):</b>", party_header_style),
        Paragraph(f"<b>Nombre:</b> {data.get('solicitante_nombre', 'N/D')}", party_style),
        Paragraph(f"<b>NIF/NIE:</b> {data.get('solicitante_nif', 'N/D')}", party_style),
        Paragraph(f"<b>Dirección:</b> {data.get('solicitante_direccion', 'N/D')}", party_style),
        Paragraph(f"<b>Teléfono:</b> {data.get('solicitante_telefono', 'N/D')}", party_style),
        Paragraph(f"<b>Email:</b> {data.get('solicitante_email', 'N/D')}", party_style),
    ]

    destinatario_text = [
        Paragraph("<b>A (DESTINATARIO / PARTE REQUERIDA):</b>", party_header_style),
        Paragraph(f"<b>Entidad/Persona:</b> {data.get('destinatario_nombre', 'N/D')}", party_style),
    ]
    if data.get('destinatario_cif'):
        destinatario_text.append(Paragraph(f"<b>CIF/NIF:</b> {data.get('destinatario_cif')}", party_style))
    destinatario_text.append(Paragraph(f"<b>Domicilio/Dpto:</b> {data.get('destinatario_direccion', 'Servicio de Atención al Cliente')}", party_style))
    destinatario_text.append(Paragraph(f"<b>Lugar y fecha de emisión:</b> {ciudad}, a {fecha_hoy}", party_style))

    table_data = [[remitente_text, destinatario_text]]
    parties_table = Table(table_data, colWidths=[8.0 * cm, 8.4 * cm])
    parties_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    
    story.append(parties_table)
    story.append(Spacer(1, 14))

    # Asunto destacado
    story.append(Paragraph(asunto_text, asunto_style))

    # Cuerpo del texto según plantilla
    ref_contrato = data.get('referencia_contrato', '').strip()
    fecha_hecho = data.get('fecha_hecho', '').strip()
    cuantia = data.get('cuantia', '').strip()
    explicacion = data.get('explicacion_hechos', '').strip()

    if template_type == "baja_suministro":
        story.append(Paragraph(
            f"Por medio del presente escrito, yo, <b>{data.get('solicitante_nombre')}</b>, en mi condición de titular "
            f"del contrato suscrito con su entidad" + (f" bajo la referencia/código identificador <b>{ref_contrato}</b>" if ref_contrato else "") +
            f", comparezco y formalmente comunico mi voluntad irrevocable de dar de <b>BAJA DEFINITIVA</b> el servicio contratado.",
            body_style
        ))
        
        story.append(Paragraph(
            "<b>FUNDAMENTOS JURÍDICOS Y NORMATIVA DE APLICACIÓN:</b>", bold_body_style
        ))
        story.append(Paragraph(
            "Esta solicitud se ampara en el artículo 68 y concordantes del Real Decreto Legislativo 1/2007, de 16 de noviembre, por el que se aprueba el "
            "Texto Refundido de la Ley General para la Defensa de los Consumidores y Usuarios (TRLGDCU), así como en el artículo 7 del Real Decreto 899/2009 "
            "(Carta de derechos del usuario de los servicios de comunicaciones electrónicas) y legislación sectorial energética.",
            legal_cite_style
        ))
        story.append(Paragraph(
            "La normativa vigente garantiza expresamente el derecho del consumidor a causar baja en el servicio por el mismo medio a través del cual formalizó "
            "la contratación, con un plazo máximo legal de efectividad de dos (2) días hábiles desde la recepción de la solicitud fehaciente.",
            legal_cite_style
        ))

        if explicacion:
            story.append(Paragraph("<b>MOTIVACIÓN / DETALLES DE LA SOLICITUD:</b>", bold_body_style))
            story.append(Paragraph(explicacion, body_style))

        story.append(Paragraph("<b>POR TODO ELLO, SOLICITO Y REQUIERO:</b>", bold_body_style))
        story.append(Paragraph(
            "1. Que se tramite de manera inmediata la baja definitiva del contrato referenciado en el plazo legalmente establecido.",
            body_style
        ))
        story.append(Paragraph(
            "2. El cese inmediato de cualquier facturación ordinaria o cuota periódica a partir del cumplimiento del plazo de preaviso legal.",
            body_style
        ))
        story.append(Paragraph(
            "3. En caso de existir equipos o dispositivos en régimen de depósito o alquiler (tales como routers o terminales), se me indiquen por escrito "
            "las instrucciones precisas y punto de entrega para proceder a su restitución sin cargo alguno.",
            body_style
        ))
        story.append(Paragraph(
            "4. La emisión y remisión a mi dirección de contacto del correspondiente justificante o número de referencia fehaciente que acredite la tramitación de la baja.",
            body_style
        ))
        story.append(Paragraph(
            "Advierto expresamente que cualquier intento de continuar emitiendo cargos bancarios o la inclusión indebida de mis datos en ficheros de solvencia "
            "patrimonial (ficheros de morosos) motivará la correspondiente denuncia ante la Agencia Española de Protección de Datos (AEPD) y la Oficina de Atención al Usuario de Telecomunicaciones / Consumo.",
            body_style
        ))

    elif template_type == "reclamar_fianza":
        story.append(Paragraph(
            f"Por medio del presente escrito, yo, <b>{data.get('solicitante_nombre')}</b>, en mi condición de anterior arrendatario "
            f"de la vivienda sita en " + (f"<b>{ref_contrato}</b>" if ref_contrato else "el inmueble arrendado") +
            f", comparezco y formalmente le <b>REQUIERO</b> la devolución íntegra de la cantidad depositada en concepto de fianza legal" +
            (f", ascendente a la cuantía de <b>{cuantia} €</b>" if cuantia else "") + ".",
            body_style
        ))

        story.append(Paragraph(
            "<b>HECHOS Y FUNDAMENTO JURÍDICO:</b>", bold_body_style
        ))
        hechos_fianza = (
            f"Con fecha {fecha_hecho}, se produjo la resolución formal de la relación arrendaticia y se procedió a la efectiva entrega de las llaves del inmueble, "
            if fecha_hecho else
            "Habiéndose producido la resolución del contrato de arrendamiento y la entrega efectiva de llaves del inmueble, "
        )
        hechos_fianza += (
            "quedando la vivienda desocupada y en debidas condiciones de conservación, encontrándose todos los suministros y rentas plenamente liquidados "
            "hasta la fecha de desalojo."
        )
        story.append(Paragraph(hechos_fianza, body_style))

        story.append(Paragraph(
            "El <b>artículo 36.4 de la Ley 29/1994, de 24 de noviembre, de Arrendamientos Urbanos (LAU)</b> dispone de manera imperativa que:<br/>"
            "<i>«El saldo de la fianza en metálico que deba ser restituido al arrendatario al final del arriendo, devengará el interés legal, transcurrido "
            "un mes desde la entrega de las llaves por el mismo sin que se hubiere hecho efectiva dicha restitución».</i>",
            legal_cite_style
        ))

        if explicacion:
            story.append(Paragraph("<b>OBSERVACIONES ADICIONALES:</b>", bold_body_style))
            story.append(Paragraph(explicacion, body_style))

        story.append(Paragraph("<b>POR TANTO, LE REQUIERO FORMALMENTE PARA QUE:</b>", bold_body_style))
        story.append(Paragraph(
            f"En el improrrogable plazo de <b>siete (7) días naturales</b> a contar desde la recepción de la presente comunicación, proceda al abono y "
            f"transferencia del importe íntegro de la fianza depositada" + (f" (<b>{cuantia} €</b>)" if cuantia else "") +
            " en la cuenta bancaria de mi titularidad facilitada al efecto.",
            body_style
        ))
        story.append(Paragraph(
            "Le advierto de que, transcurrido dicho plazo sin haber verificado el reembolso o sin haber justificado documentalmente retención alguna mediante "
            "facturas oficiales con desglose de IVA de reparaciones efectivamente realizadas (no siendo válidos meros presupuestos), interpondré de forma inmediata "
            "<b>demanda de Juicio Verbal por reclamación de cantidad</b> ante el Juzgado de Primera Instancia competente, reclamando el principal, los intereses "
            "legales devengados desde el cumplimiento del mes y las costas procesales a que hubiera lugar.",
            body_style
        ))

    else: # reclamacion_empresa
        story.append(Paragraph(
            f"Por medio del presente escrito, yo, <b>{data.get('solicitante_nombre')}</b>, en mi condición de consumidor y usuario, "
            f"comparezco ante el servicio de atención de su entidad a fin de formular <b>RECLAMACIÓN FORMAL EXTRAJUDICIAL</b> respecto a los hechos "
            f"que a continuación se exponen" + (f" en relación al contrato/pedido <b>{ref_contrato}</b>" if ref_contrato else "") + ".",
            body_style
        ))

        story.append(Paragraph("<b>EXPOSICIÓN DE LOS HECHOS Y MOTIVO DE LA RECLAMACIÓN:</b>", bold_body_style))
        hechos_consumo = explicacion if explicacion else (
            "El producto o servicio contratado ha presentado fallos de conformidad, averías o incumplimientos sustanciales de las condiciones pactadas, "
            "sin que hasta la fecha se haya otorgado una solución satisfactoria ni en plazo conforme a la legalidad vigente."
        )
        if fecha_hecho:
            hechos_consumo = f"Con fecha {fecha_hecho}, se produjo la contratación o detección de la anomalía. " + hechos_consumo
        story.append(Paragraph(hechos_consumo, body_style))

        story.append(Paragraph(
            "<b>NORMATIVA DE PROTECCIÓN AL CONSUMIDOR:</b>", bold_body_style
        ))
        story.append(Paragraph(
            "El Real Decreto Legislativo 1/2007, de 16 de noviembre (TRLGDCU), modificado por el Real Decreto-ley 7/2021, reconoce el derecho fundamental del "
            "consumidor a la conformidad de los bienes y servicios, estableciendo la obligación de la empresa de garantizar la reparación, sustitución, rebaja "
            "del precio o resolución del contrato sin coste alguno para el consumidor, debiendo responder por escrito en el plazo legal máximo de 30 días.",
            legal_cite_style
        ))

        story.append(Paragraph("<b>POR ELLO, SOLICITO Y REQUIERO FORMALMENTE:</b>", bold_body_style))
        story.append(Paragraph(
            "1. La inmediata subsanación del problema expuesto, procediendo a la correcta prestación del servicio, sustitución del producto defectuoso o, "
            f"en su defecto, el reembolso íntegro de la cantidad abonada" + (f" (<b>{cuantia} €</b>)" if cuantia else "") + ".",
            body_style
        ))
        story.append(Paragraph(
            "2. Respuesta motivada por escrito en un plazo no superior a <b>diez (10) días hábiles</b> a la recepción del presente escrito.",
            body_style
        ))
        story.append(Paragraph(
            "En caso de no obtener una respuesta satisfactoria en el plazo conferido, elevaré la presente reclamación ante la Oficina Municipal de Información "
            "al Consumidor (OMIC), los Servicios de Consumo de la Comunidad Autónoma y la Junta Arbitral de Consumo, sin perjuicio de las acciones judiciales que pudieran corresponder.",
            body_style
        ))

    # Cierre, fecha y firma
    story.append(Spacer(1, 14))
    cierre_elements = [
        Paragraph(f"En {ciudad}, a {fecha_hoy}.", body_style),
        Spacer(1, 25),
        Paragraph("Firma del solicitante:", bold_body_style),
        Spacer(1, 30),
        Paragraph(f"<b>Fdo.: {data.get('solicitante_nombre')}</b>", body_style),
        Paragraph(f"NIF/NIE: {data.get('solicitante_nif')}", party_style),
        Spacer(1, 12),
        HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#94a3b8'), spaceBefore=6, spaceAfter=6),
        Paragraph(
            "<i>Documento generado mediante la plataforma ciudadana HagaClic. Se aconseja conservar resguardo fehaciente de su envío (burofax, correo certificado con acuse o sello de entrada).</i>",
            ParagraphStyle('Footnote', parent=styles['Normal'], fontSize=7.5, textColor=colors.HexColor('#64748b'), alignment=1)
        )
    ]
    story.append(KeepTogether(cierre_elements))

    doc.build(story)
    buffer.seek(0)
    return buffer
