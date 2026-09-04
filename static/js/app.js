/**
 * HagaClic - Asistente de Trámites Administrativos para España
 * Lógica de cliente accesible, buscador en tiempo real, gestión local y generador de cartas
 */

// Estado global de la aplicación
const AppState = {
  allTramites: [],
  currentCategory: 'todas',
  searchQuery: '',
  activeTramite: null,
  savedTramites: JSON.parse(localStorage.getItem('hagaclic_saved_tramites') || '[]'),
  checkedDocs: JSON.parse(localStorage.getItem('hagaclic_checked_docs') || '{}')
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  initAccessibility();
  initNavigation();
  initSearchAndFilters();
  initLetterGenerator();
  loadInitialTramites();
  updateSavedBadgeCount();
  renderSavedTramites();
});

// ============================================================================
// 1. Accesibilidad: Tamaño de fuente y Alto Contraste
// ============================================================================
function initAccessibility() {
  const isLargeFont = localStorage.getItem('hagaclic_font_large') === 'true';
  const isHighContrast = localStorage.getItem('hagaclic_high_contrast') === 'true';

  if (isLargeFont) document.body.classList.add('font-large');
  if (isHighContrast) document.body.classList.add('high-contrast');

  const btnFont = document.getElementById('btnToggleFont');
  const btnContrast = document.getElementById('btnToggleContrast');

  if (btnFont) {
    btnFont.addEventListener('click', () => {
      const active = document.body.classList.toggle('font-large');
      localStorage.setItem('hagaclic_font_large', active);
      showToast(active ? 'Tamaño de texto grande activado' : 'Tamaño de texto estándar');
    });
  }

  if (btnContrast) {
    btnContrast.addEventListener('click', () => {
      const active = document.body.classList.toggle('high-contrast');
      localStorage.setItem('hagaclic_high_contrast', active);
      showToast(active ? 'Modo alto contraste activado' : 'Modo visual estándar');
    });
  }
}

// ============================================================================
// 2. Navegación entre pestañas / vistas principales
// ============================================================================
function initNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn[data-target]');
  navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.getAttribute('data-target');
      switchView(target);
    });
  });
}

function switchView(viewName) {
  // Ocultar todas las secciones
  document.getElementById('viewCatalog').style.display = 'none';
  document.getElementById('viewDetail').style.display = 'none';
  document.getElementById('viewGenerator').style.display = 'none';
  document.getElementById('viewSaved').style.display = 'none';

  // Desmarcar botones activos de navegación
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  if (viewName === 'catalog') {
    document.getElementById('viewCatalog').style.display = 'block';
    const btn = document.querySelector('.nav-btn[data-target="catalog"]');
    if (btn) btn.classList.add('active');
  } else if (viewName === 'generator') {
    document.getElementById('viewGenerator').style.display = 'block';
    const btn = document.querySelector('.nav-btn[data-target="generator"]');
    if (btn) btn.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (viewName === 'saved') {
    document.getElementById('viewSaved').style.display = 'block';
    const btn = document.querySelector('.nav-btn[data-target="saved"]');
    if (btn) btn.classList.add('active');
    renderSavedTramites();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (viewName === 'detail') {
    document.getElementById('viewDetail').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ============================================================================
// 3. Buscador y Filtros
// ============================================================================
function initSearchAndFilters() {
  const searchInput = document.getElementById('searchInput');
  const btnSearch = document.getElementById('btnSearch');
  const suggestionPills = document.querySelectorAll('.suggestion-pill');
  const filterBtns = document.querySelectorAll('.filter-btn');

  let debounceTimer = null;

  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      AppState.searchQuery = e.target.value.trim();
      performSearch();
    }, 280);
  });

  btnSearch.addEventListener('click', (e) => {
    e.preventDefault();
    AppState.searchQuery = searchInput.value.trim();
    performSearch();
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      AppState.searchQuery = searchInput.value.trim();
      performSearch();
    }
  });

  suggestionPills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.preventDefault();
      const query = pill.getAttribute('data-query');
      searchInput.value = query;
      AppState.searchQuery = query;
      switchView('catalog');
      performSearch();
      window.scrollTo({ top: document.getElementById('catalogHeader').offsetTop - 80, behavior: 'smooth' });
    });
  });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.currentCategory = btn.getAttribute('data-cat');
      performSearch();
    });
  });
}

function loadInitialTramites() {
  fetch('/api/tramites')
    .then(res => res.json())
    .then(data => {
      AppState.allTramites = data.tramites || [];
      renderTramitesGrid(AppState.allTramites);
    })
    .catch(err => {
      console.error('Error cargando catálogo:', err);
      showToast('Error al conectar con el catálogo de trámites');
    });
}

function performSearch() {
  const url = `/api/tramites?q=${encodeURIComponent(AppState.searchQuery)}&categoria=${encodeURIComponent(AppState.currentCategory)}`;
  
  fetch(url)
    .then(res => res.json())
    .then(data => {
      renderTramitesGrid(data.tramites);
    })
    .catch(err => {
      console.error('Error en búsqueda:', err);
    });
}

function renderTramitesGrid(tramites) {
  const grid = document.getElementById('tramitesGrid');
  const countLabel = document.getElementById('catalogCount');

  if (!tramites || tramites.length === 0) {
    countLabel.textContent = '0 trámites encontrados';
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; background: #ffffff; border-radius: 12px; border: 1px dashed var(--border-strong);">
        <p style="font-size: 1.25rem; font-weight: 700; color: var(--primary); margin-bottom: 0.5rem;">No hemos encontrado ningún trámite con esa descripción.</p>
        <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Prueba con palabras más sencillas como "luz", "dni", "casero", "fianza", "paro" o "compra".</p>
        <button class="btn-card-primary" onclick="resetSearch()" style="display: inline-flex; width: auto; margin: 0 auto;">Ver todos los trámites</button>
      </div>
    `;
    return;
  }

  countLabel.textContent = `${tramites.length} trámite${tramites.length !== 1 ? 's' : ''} disponible${tramites.length !== 1 ? 's' : ''}`;

  grid.innerHTML = tramites.map(t => `
    <article class="tramite-card" id="card-${t.id}">
      <div class="tramite-card-top">
        <span class="card-category-badge">${t.categoria}</span>
        <h3 class="tramite-card-title">${t.titulo}</h3>
        <p class="tramite-card-desc">${t.resumen}</p>

        <div class="tramite-meta-tags">
          <div class="meta-item">
            <span class="meta-label">Coste:</span>
            <span class="meta-value">${t.coste}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Plazo:</span>
            <span class="meta-value">${t.plazo}</span>
          </div>
        </div>

        <div class="stamp-verified">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>Verificado: ${t.fecha_verificacion.split('(')[0].trim()}</span>
        </div>
      </div>

      <div class="card-actions">
        <button class="btn-card-primary" onclick="openTramiteDetail('${t.id}')">
          <span>Ver guía paso a paso</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </button>
        <button class="btn-card-secondary" title="Guardar trámite" onclick="quickSaveTramite('${t.id}')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
        </button>
      </div>
    </article>
  `).join('');
}

function resetSearch() {
  document.getElementById('searchInput').value = '';
  AppState.searchQuery = '';
  AppState.currentCategory = 'todas';
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-cat') === 'todas');
  });
  performSearch();
}

// ============================================================================
// 4. Vista de Detalle (Ficha Completa del Trámite)
// ============================================================================
function openTramiteDetail(tramiteId) {
  fetch(`/api/tramite/${tramiteId}`)
    .then(res => res.json())
    .then(t => {
      AppState.activeTramite = t;
      renderTramiteDetail(t);
      switchView('detail');
    })
    .catch(err => {
      console.error('Error abriendo trámite:', err);
      showToast('Error al cargar la información del trámite');
    });
}

function renderTramiteDetail(t) {
  const container = document.getElementById('viewDetail');
  const checkedForThis = AppState.checkedDocs[t.id] || [];

  container.innerHTML = `
    <div class="detail-top-nav">
      <button class="btn-back" onclick="switchView('catalog')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        <span>Volver al buscador de trámites</span>
      </button>
      <span class="card-category-badge" style="margin: 0;">${t.categoria}</span>
    </div>

    <div class="detail-header-block">
      <h2 class="detail-title">${t.titulo}</h2>
      <p class="detail-summary">${t.resumen}</p>
      
      <div class="stamp-verified" style="display: inline-flex; background: var(--success-light); padding: 0.4rem 0.8rem; border-radius: 6px; border: 1px solid rgba(5,150,105,0.2);">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span><b>Datos contrastados con fuentes oficiales:</b> ${t.fecha_verificacion}</span>
      </div>
    </div>

    <!-- Cajas informativas destacadas -->
    <div class="detail-summary-pills">
      <div class="summary-box">
        <div class="summary-box-title">¿Cuánto cuesta?</div>
        <div class="summary-box-content">${t.coste}</div>
      </div>
      <div class="summary-box accent-box">
        <div class="summary-box-title">¿Cuál es el plazo legal?</div>
        <div class="summary-box-content">${t.plazo}</div>
      </div>
      <div class="summary-box success-box">
        <div class="summary-box-title">¿Dónde se hace?</div>
        <div class="summary-box-content">${t.donde}</div>
      </div>
    </div>

    <!-- Pasos numerados -->
    <h3 class="detail-section-title">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
      <span>Pasos a seguir paso a paso</span>
    </h3>
    <div class="steps-container">
      ${t.pasos.map(step => `
        <div class="step-card">
          <div class="step-number-circle">${step.numero}</div>
          <div class="step-body">
            <h4>${step.titulo}</h4>
            <p>${step.descripcion}</p>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Checklist interactivo de documentos -->
    <h3 class="detail-section-title">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
      <span>Documentos que necesitas preparar</span>
    </h3>
    <div class="docs-checklist-container">
      <div class="docs-counter" id="docsCounter">
        <span>Marca los papeles que ya tengas listos para llevar el control:</span>
        <span id="docsProgressText" style="color: var(--accent); font-weight: 800;"></span>
      </div>
      <div class="checklist-items">
        ${t.documentos.map((doc, idx) => {
          const isChecked = checkedForThis.includes(idx);
          return `
            <label class="checklist-item ${isChecked ? 'checked' : ''}" onclick="toggleDocCheck('${t.id}', ${idx}, this, event)">
              <input type="checkbox" ${isChecked ? 'checked' : ''} />
              <span class="checklist-text">${doc}</span>
            </label>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Consejos útiles -->
    <div class="tips-container">
      <div class="tips-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <span>Consejos para evitar que te rechacen el trámite</span>
      </div>
      <ul class="tips-list">
        ${t.consejos.map(c => `<li>${c}</li>`).join('')}
      </ul>
    </div>

    <!-- Barra inferior de acciones -->
    <div class="detail-action-bar">
      ${t.plantilla_carta ? `
        <button class="btn-action-primary" onclick="openGeneratorWithTemplate('${t.plantilla_carta}')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
          <span>Generar Carta Oficial en PDF</span>
        </button>
      ` : ''}

      <button class="btn-action-secondary" onclick="promptSaveCurrentTramite()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
        <span>Guardar en "Mis Trámites" con aviso de plazo</span>
      </button>

      <a href="${t.enlace_oficial}" target="_blank" rel="noopener noreferrer" class="btn-action-secondary" style="margin-left: auto;">
        <span>Ir a la web oficial (${t.enlace_texto})</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
      </a>
    </div>
  `;

  updateDocProgressCounter(t.id, t.documentos.length);
}

function toggleDocCheck(tramiteId, docIndex, labelElement, event) {
  // Evitar doble trigger si el clic fue directamente en el input
  if (event.target.tagName !== 'INPUT') {
    const cb = labelElement.querySelector('input[type="checkbox"]');
    cb.checked = !cb.checked;
  }

  const checkbox = labelElement.querySelector('input[type="checkbox"]');
  labelElement.classList.toggle('checked', checkbox.checked);

  let checkedArr = AppState.checkedDocs[tramiteId] || [];
  if (checkbox.checked) {
    if (!checkedArr.includes(docIndex)) checkedArr.push(docIndex);
  } else {
    checkedArr = checkedArr.filter(i => i !== docIndex);
  }

  AppState.checkedDocs[tramiteId] = checkedArr;
  localStorage.setItem('hagaclic_checked_docs', JSON.stringify(AppState.checkedDocs));

  if (AppState.activeTramite && AppState.activeTramite.documentos) {
    updateDocProgressCounter(tramiteId, AppState.activeTramite.documentos.length);
  }
}

function updateDocProgressCounter(tramiteId, totalDocs) {
  const checked = (AppState.checkedDocs[tramiteId] || []).length;
  const label = document.getElementById('docsProgressText');
  if (label) {
    label.textContent = `${checked} de ${totalDocs} preparados`;
  }
}

// ============================================================================
// 5. Generador de Cartas en PDF
// ============================================================================
function initLetterGenerator() {
  const form = document.getElementById('letterForm');
  const templateSelect = document.getElementById('templateType');

  templateSelect.addEventListener('change', () => {
    updateGeneratorFields(templateSelect.value);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    generateAndDownloadPdf();
  });
}

function openGeneratorWithTemplate(templateType) {
  switchView('generator');
  const select = document.getElementById('templateType');
  if (select) {
    select.value = templateType;
    updateGeneratorFields(templateType);
  }
}

function updateGeneratorFields(templateType) {
  const refLabel = document.getElementById('lblRefContrato');
  const refHint = document.getElementById('hintRefContrato');
  const fechaLabel = document.getElementById('lblFechaHecho');
  const cuantiaLabel = document.getElementById('lblCuantia');
  const cuantiaGroup = document.getElementById('groupCuantia');

  if (templateType === 'baja_suministro') {
    refLabel.textContent = 'Nº de Contrato, Teléfono o CUPS:';
    refHint.textContent = 'Aparece en la parte superior de tu factura.';
    fechaLabel.textContent = 'Fecha prevista para la baja (opcional):';
    cuantiaGroup.style.display = 'none';
  } else if (templateType === 'reclamar_fianza') {
    refLabel.textContent = 'Dirección exacta del piso alquilado:';
    refHint.textContent = 'Ejemplo: Calle Gran Vía 12, 3º B, 28013 Madrid.';
    fechaLabel.textContent = 'Fecha de entrega efectiva de llaves:';
    cuantiaLabel.textContent = 'Importe de la fianza a devolver (€):';
    cuantiaGroup.style.display = 'flex';
  } else { // reclamacion_empresa
    refLabel.textContent = 'Nº de Pedido, Ticket o Contrato:';
    refHint.textContent = 'Código identificador de la compra o servicio.';
    fechaLabel.textContent = 'Fecha de compra o contratación:';
    cuantiaLabel.textContent = 'Importe reclamado o precio (€, opcional):';
    cuantiaGroup.style.display = 'flex';
  }
}

function generateAndDownloadPdf() {
  const btnSubmit = document.getElementById('btnSubmitPdf');
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = `<span>Generando documento oficial...</span>`;

  const payload = {
    template_type: document.getElementById('templateType').value,
    solicitante_nombre: document.getElementById('solicitanteNombre').value.trim(),
    solicitante_nif: document.getElementById('solicitanteNif').value.trim(),
    solicitante_direccion: document.getElementById('solicitanteDireccion').value.trim(),
    solicitante_telefono: document.getElementById('solicitanteTelefono').value.trim(),
    solicitante_email: document.getElementById('solicitanteEmail').value.trim(),
    destinatario_nombre: document.getElementById('destinatarioNombre').value.trim(),
    destinatario_cif: document.getElementById('destinatarioCif').value.trim(),
    destinatario_direccion: document.getElementById('destinatarioDireccion').value.trim(),
    referencia_contrato: document.getElementById('referenciaContrato').value.trim(),
    fecha_hecho: document.getElementById('fechaHecho').value.trim(),
    cuantia: document.getElementById('cuantia').value.trim(),
    explicacion_hechos: document.getElementById('explicacionHechos').value.trim(),
    ciudad_firma: document.getElementById('ciudadFirma').value.trim(),
    fecha_carta: new Date().toLocaleDateString('es-ES')
  };

  fetch('/api/generar-carta-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(response => {
      if (!response.ok) {
        return response.json().then(json => { throw new Error(json.error || 'Error generando PDF'); });
      }
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `carta_oficial_${payload.template_type}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      showToast('¡Carta oficial descargada con éxito!');
    })
    .catch(err => {
      alert('Error: ' + err.message);
    })
    .finally(() => {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        <span>Descargar Carta Formal en PDF</span>
      `;
    });
}

// ============================================================================
// 6. Sección "Mis Trámites" (Persistencia Local en el Navegador)
// ============================================================================
function quickSaveTramite(tramiteId) {
  const item = AppState.allTramites.find(t => t.id === tramiteId);
  if (!item) return;

  saveTramiteToStorage(item.id, item.titulo, 30, 'Iniciado desde el catálogo.');
}

function promptSaveCurrentTramite() {
  if (!AppState.activeTramite) return;
  const t = AppState.activeTramite;

  const daysStr = prompt('¿En cuántos días vence el plazo legal de este trámite? (ejemplo: 15, 30)', '30');
  if (daysStr === null) return;
  const days = parseInt(daysStr) || 30;

  const notes = prompt('Añade una nota o recordatorio personal (opcional):', 'Comprobar documentación y pedir cita previa.') || '';

  saveTramiteToStorage(t.id, t.titulo, days, notes);
}

function saveTramiteToStorage(id, titulo, daysDeadline, notes) {
  const now = new Date();
  const deadline = new Date();
  deadline.setDate(now.getDate() + daysDeadline);

  const existingIndex = AppState.savedTramites.findIndex(x => x.id === id);
  const entry = {
    id: id,
    titulo: titulo,
    fechaInicio: now.toISOString(),
    fechaLimite: deadline.toISOString(),
    notas: notes,
    completado: false
  };

  if (existingIndex >= 0) {
    AppState.savedTramites[existingIndex] = entry;
    showToast('Trámite actualizado en "Mis Trámites"');
  } else {
    AppState.savedTramites.unshift(entry);
    showToast('¡Trámite guardado en "Mis Trámites"!');
  }

  localStorage.setItem('hagaclic_saved_tramites', JSON.stringify(AppState.savedTramites));
  updateSavedBadgeCount();
  renderSavedTramites();
}

function updateSavedBadgeCount() {
  const count = AppState.savedTramites.filter(x => !x.completado).length;
  const badge = document.getElementById('savedCountBadge');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
  }
}

function renderSavedTramites() {
  const container = document.getElementById('savedListContainer');
  if (!container) return;

  if (AppState.savedTramites.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; border: 1px dashed var(--border-strong); border-radius: 12px;">
        <p style="font-size: 1.15rem; font-weight: 700; color: var(--primary); margin-bottom: 0.5rem;">No tienes ningún trámite guardado todavía.</p>
        <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Explora los trámites del catálogo y pulsa "Guardar" para tener control sobre los plazos y fechas límite.</p>
        <button class="btn-card-primary" onclick="switchView('catalog')" style="display: inline-flex; width: auto; margin: 0 auto;">Buscar un trámite</button>
      </div>
    `;
    return;
  }

  const now = new Date();

  container.innerHTML = AppState.savedTramites.map((t, idx) => {
    const deadline = new Date(t.fechaLimite);
    const diffTime = deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let statusBadge = '';
    if (t.completado) {
      statusBadge = `<span class="saved-status-badge status-done">Completado</span>`;
    } else if (diffDays < 0) {
      statusBadge = `<span class="saved-status-badge status-urgent">Plazo vencido (${Math.abs(diffDays)} días tarde)</span>`;
    } else if (diffDays <= 3) {
      statusBadge = `<span class="saved-status-badge status-urgent">¡Urgente! Vence en ${diffDays} día${diffDays !== 1 ? 's' : ''}</span>`;
    } else {
      statusBadge = `<span class="saved-status-badge status-active">En plazo: quedan ${diffDays} días</span>`;
    }

    return `
      <div class="saved-card ${t.completado ? 'completed' : ''}">
        <div style="flex: 1; min-width: 250px;">
          <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.4rem;">
            ${statusBadge}
            <span style="font-size: 0.8rem; color: var(--text-muted);">Iniciado el ${new Date(t.fechaInicio).toLocaleDateString('es-ES')}</span>
          </div>
          <h4 style="font-size: 1.15rem; color: var(--primary); font-weight: 800; margin-bottom: 0.35rem;">${t.titulo}</h4>
          <p style="font-size: 0.9rem; color: var(--text-main); margin-bottom: 0.5rem;"><b>Plazo límite legal:</b> ${deadline.toLocaleDateString('es-ES')}</p>
          ${t.notas ? `<p style="font-size: 0.85rem; color: var(--text-muted); background: var(--bg-subtle); padding: 0.4rem 0.6rem; border-radius: 4px; display: inline-block;">Nota: ${t.notas}</p>` : ''}
        </div>

        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <button class="btn-access" style="background: var(--bg-subtle); color: var(--text-main); border: 1px solid var(--border);" onclick="openTramiteDetail('${t.id}')">
            Ver guía
          </button>
          <button class="btn-access" style="background: ${t.completado ? '#f1f5f9' : 'var(--success-light)'}; color: ${t.completado ? '#475569' : 'var(--success)'}; border: 1px solid currentColor;" onclick="toggleCompleteSaved(${idx})">
            ${t.completado ? 'Reabrir' : 'Completado ✓'}
          </button>
          <button class="btn-access" style="background: var(--danger-light); color: var(--danger); border: 1px solid var(--danger);" title="Eliminar trámite" onclick="deleteSavedTramite(${idx})">
            ✕
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function toggleCompleteSaved(idx) {
  AppState.savedTramites[idx].completado = !AppState.savedTramites[idx].completado;
  localStorage.setItem('hagaclic_saved_tramites', JSON.stringify(AppState.savedTramites));
  updateSavedBadgeCount();
  renderSavedTramites();
}

function deleteSavedTramite(idx) {
  if (confirm('¿Deseas eliminar este trámite de tu lista guardada?')) {
    AppState.savedTramites.splice(idx, 1);
    localStorage.setItem('hagaclic_saved_tramites', JSON.stringify(AppState.savedTramites));
    updateSavedBadgeCount();
    renderSavedTramites();
    showToast('Trámite eliminado de Mis Trámites');
  }
}

// ============================================================================
// 7. Utilidad: Notificaciones Toast
// ============================================================================
function showToast(message) {
  const existing = document.querySelector('.toast-msg');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
