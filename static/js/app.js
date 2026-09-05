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

  const btnFont = document.getElementById('btnToggleFont');
  const btnContrast = document.getElementById('btnToggleContrast');

  function applyFontState(active) {
    document.documentElement.classList.toggle('font-large', active);
    document.body.classList.toggle('font-large', active);
    if (btnFont) {
      if (active) {
        btnFont.innerHTML = '<span style="font-size: 1rem; font-weight: 800;">A-</span> <span>Letra Normal</span>';
        btnFont.style.background = 'var(--accent)';
        btnFont.style.borderColor = '#ffffff';
      } else {
        btnFont.innerHTML = '<span style="font-size: 1rem; font-weight: 800;">A+</span> <span>Letra Grande</span>';
        btnFont.style.background = 'rgba(255, 255, 255, 0.15)';
        btnFont.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      }
    }
  }

  function applyContrastState(active) {
    document.documentElement.classList.toggle('high-contrast', active);
    document.body.classList.toggle('high-contrast', active);
    if (btnContrast) {
      if (active) {
        btnContrast.style.background = '#000000';
        btnContrast.style.color = '#ffffff';
        btnContrast.style.borderColor = '#ffffff';
      } else {
        btnContrast.style.background = 'rgba(255, 255, 255, 0.15)';
        btnContrast.style.color = '#ffffff';
        btnContrast.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      }
    }
  }

  if (isLargeFont) applyFontState(true);
  if (isHighContrast) applyContrastState(true);

  if (btnFont) {
    btnFont.addEventListener('click', () => {
      const currentlyActive = document.body.classList.contains('font-large');
      const newState = !currentlyActive;
      applyFontState(newState);
      localStorage.setItem('hagaclic_font_large', newState);
      showToast(newState ? 'Tamaño de texto grande activado (A+)' : 'Tamaño de texto estándar restablecido');
    });
  }

  if (btnContrast) {
    btnContrast.addEventListener('click', () => {
      const currentlyActive = document.body.classList.contains('high-contrast');
      const newState = !currentlyActive;
      applyContrastState(newState);
      localStorage.setItem('hagaclic_high_contrast', newState);
      showToast(newState ? 'Modo alto contraste activado' : 'Modo visual estándar restablecido');
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
  const heroSection = document.querySelector('.hero-section');
  
  // Ocultar todas las secciones
  document.getElementById('viewCatalog').style.display = 'none';
  document.getElementById('viewDetail').style.display = 'none';
  document.getElementById('viewGenerator').style.display = 'none';
  document.getElementById('viewSaved').style.display = 'none';

  // Desmarcar botones activos de navegación
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  if (viewName === 'catalog') {
    if (heroSection) heroSection.style.display = 'block';
    document.getElementById('viewCatalog').style.display = 'block';
    const btn = document.querySelector('.nav-btn[data-target="catalog"]');
    if (btn) btn.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (viewName === 'generator') {
    // Al entrar al generador ocultamos el buscador grande para que el formulario se vea de inmediato
    if (heroSection) heroSection.style.display = 'none';
    document.getElementById('viewGenerator').style.display = 'block';
    const btn = document.querySelector('.nav-btn[data-target="generator"]');
    if (btn) btn.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else if (viewName === 'saved') {
    if (heroSection) heroSection.style.display = 'none';
    document.getElementById('viewSaved').style.display = 'block';
    const btn = document.querySelector('.nav-btn[data-target="saved"]');
    if (btn) btn.classList.add('active');
    renderSavedTramites();
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else if (viewName === 'detail') {
    if (heroSection) heroSection.style.display = 'none';
    document.getElementById('viewDetail').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'instant' });
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
    executeSearchAndScroll();
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearchAndScroll();
    }
  });

  suggestionPills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.preventDefault();
      const query = pill.getAttribute('data-query');
      searchInput.value = query;
      AppState.searchQuery = query;
      switchView('catalog');
      performSearch(true);
    });
  });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.currentCategory = btn.getAttribute('data-cat');
      performSearch(false);
    });
  });
}

function executeSearchAndScroll() {
  const searchInput = document.getElementById('searchInput');
  const btnSearch = document.getElementById('btnSearch');
  
  AppState.searchQuery = searchInput.value.trim();
  switchView('catalog');

  // Feedback visual inmediato en el botón
  const originalBtnContent = btnSearch.innerHTML;
  btnSearch.innerHTML = `
    <svg class="spin-animation" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="0.9"></path></svg>
    <span>Buscando...</span>
  `;
  btnSearch.disabled = true;

  performSearch(true, () => {
    btnSearch.innerHTML = originalBtnContent;
    btnSearch.disabled = false;
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

function performSearch(shouldScroll = false, callback = null) {
  const url = `/api/tramites?q=${encodeURIComponent(AppState.searchQuery)}&categoria=${encodeURIComponent(AppState.currentCategory)}`;
  
  fetch(url)
    .then(res => res.json())
    .then(data => {
      // Si la búsqueda devolvió resultados o asistencia, renderizar
      renderTramitesGrid(data.tramites, data.orientacion_asistida);

      // Si el usuario pulsó buscar o una sugerencia, desplazarse suavemente a los resultados
      if (shouldScroll) {
        const headerElem = document.getElementById('catalogHeader');
        if (headerElem) {
          const yOffset = -75;
          const y = headerElem.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }
    })
    .catch(err => {
      console.error('Error en búsqueda:', err);
      showToast('Error al realizar la búsqueda');
    })
    .finally(() => {
      if (callback) callback();
    });
}

function renderTramitesGrid(tramites, orientacionAsistida) {
  const grid = document.getElementById('tramitesGrid');
  const countLabel = document.getElementById('catalogCount');

  // Si tenemos orientación oficial asistida (por ejemplo: fallecimiento/herencia, DGT, Hacienda, becas, etc.)
  // o si no hay trámites del catálogo, mostramos DIRECTAMENTE la guía oficial completa en pantalla:
  if (orientacionAsistida && AppState.searchQuery && AppState.searchQuery.trim().length >= 3) {
    if (orientacionAsistida.tipo !== 'instancia-general-ciudadana' || !tramites || tramites.length === 0) {
      countLabel.textContent = 'Orientación oficial asistida para tu gestión';
      renderAssistedGuidance(orientacionAsistida, grid);
      return;
    }
  }

  // Si no hay absolutamente nada
  if (!tramites || tramites.length === 0) {
    countLabel.textContent = '0 trámites encontrados';
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: #ffffff; border-radius: 12px; border: 1px dashed var(--border-strong);">
        <p style="font-size: 1.25rem; font-weight: 700; color: var(--primary); margin-bottom: 0.5rem;">
          ¿No encuentras el trámite exacto? Podemos ayudarte a redactar tu escrito oficial.
        </p>
        <p style="color: var(--text-muted); margin-bottom: 1.5rem; max-width: 600px; margin-left: auto; margin-right: auto;">
          Con HagaClic puedes redactar una <b>Instancia General Administrativa (Ley 39/2015)</b> válida legalmente para presentar ante cualquier organismo o ayuntamiento.
        </p>
        <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
          <button class="btn-card-primary" onclick="openGeneratorWithTemplate('instancia_general')" style="display: inline-flex; width: auto;">
            Generar Instancia Oficial en PDF
          </button>
          <button class="btn-card-secondary" onclick="resetSearch()" style="display: inline-flex; width: auto;">
            Ver catálogo completo
          </button>
        </div>
      </div>
    `;
    return;
  }

  countLabel.textContent = `${tramites.length} trámite${tramites.length !== 1 ? 's' : ''} disponible${tramites.length !== 1 ? 's' : ''}`;

  let assistedHtml = '';
  if (orientacionAsistida && AppState.searchQuery && AppState.searchQuery.length > 3) {
    assistedHtml = `
      <div style="grid-column: 1 / -1; background: #eff6ff; border: 2px solid #93c5fd; border-radius: 12px; padding: 1.25rem 1.5rem; margin-bottom: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem; color: #1e40af; font-weight: 800; font-size: 0.9rem; text-transform: uppercase; margin-bottom: 0.4rem;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <span>Orientación adicional para tu consulta: "${AppState.searchQuery}"</span>
        </div>
        <h4 style="font-size: 1.15rem; color: var(--primary); font-weight: 800; margin-bottom: 0.4rem;">${orientacionAsistida.titulo}</h4>
        <p style="font-size: 0.95rem; color: var(--text-main); margin-bottom: 0.75rem;">${orientacionAsistida.resumen}</p>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn-access" style="background: var(--primary); color: #fff;" onclick='showAssistedModal(${JSON.stringify(orientacionAsistida).replace(/'/g, "&apos;")})'>
            Ver guía paso a paso completa
          </button>
          <a href="${orientacionAsistida.enlace_oficial}" target="_blank" rel="noopener noreferrer" class="btn-access" style="background: #fff; color: var(--primary); border: 1px solid var(--border-strong);">
            Web oficial (${orientacionAsistida.enlace_texto})
          </a>
        </div>
      </div>
    `;
  }

  grid.innerHTML = assistedHtml + tramites.map(t => `
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
          <span>Verificado: ${t.fecha_verificacion ? t.fecha_verificacion.split('(')[0].trim() : 'Normativa vigente'}</span>
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

function renderAssistedGuidance(o, grid) {
  grid.innerHTML = `
    <div style="grid-column: 1 / -1; background: #ffffff; border: 2px solid var(--primary); border-radius: 16px; padding: 2rem; box-shadow: var(--shadow-md);">
      
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border); padding-bottom: 1rem;">
        <span style="background: #dbeafe; color: #1e40af; font-weight: 800; font-size: 0.82rem; padding: 0.35rem 0.8rem; border-radius: 9999px; text-transform: uppercase;">
          🏛️ Orientación Oficial Asistida en Tiempo Real
        </span>
        <button class="btn-back" onclick="resetSearch()">✕ Limpiar búsqueda y ver catálogo</button>
      </div>

      <h2 style="font-size: 1.85rem; font-weight: 800; color: var(--primary); line-height: 1.25; margin-bottom: 0.5rem;">
        ${o.titulo}
      </h2>
      <p style="font-size: 1.1rem; color: var(--text-muted); margin-bottom: 1.25rem;">
        ${o.resumen}
      </p>

      <!-- Resumen de metadatos -->
      <div class="detail-summary-pills">
        <div class="summary-box">
          <div class="summary-box-title">Organismo competente</div>
          <div class="summary-box-content">${o.organismo}</div>
        </div>
        <div class="summary-box accent-box">
          <div class="summary-box-title">Plazo oficial</div>
          <div class="summary-box-content">${o.plazo}</div>
        </div>
        <div class="summary-box success-box">
          <div class="summary-box-title">Coste / Tasas</div>
          <div class="summary-box-content">${o.coste}</div>
        </div>
      </div>

      <!-- Pasos a seguir -->
      <h3 class="detail-section-title" style="margin-top: 1.5rem;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        <span>Pasos oficiales que debes seguir paso a paso</span>
      </h3>
      <div class="steps-container">
        ${o.pasos.map(p => `
          <div class="step-card">
            <div class="step-number-circle">${p.numero}</div>
            <div class="step-body">
              <h4>${p.titulo}</h4>
              <p>${p.descripcion}</p>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Documentación -->
      <h3 class="detail-section-title">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
        <span>Documentación que necesitarás preparar</span>
      </h3>
      <div class="docs-checklist-container" style="margin-bottom: 1.75rem;">
        <div class="checklist-items">
          ${o.documentos.map((d, i) => `
            <label class="checklist-item">
              <input type="checkbox" />
              <span class="checklist-text">${d}</span>
            </label>
          `).join('')}
        </div>
      </div>

      <!-- Consejos -->
      ${o.consejos && o.consejos.length > 0 ? `
        <div class="tips-container" style="margin-bottom: 2rem;">
          <div class="tips-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span>Consejos y claves para esta gestión</span>
          </div>
          <ul class="tips-list">
            ${o.consejos.map(c => `<li>${c}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <!-- Acciones directas -->
      <div class="detail-action-bar" style="background: var(--bg-subtle); padding: 1.5rem; border-radius: 12px;">
        <button class="btn-action-primary" onclick="openGeneratorForAssisted('${o.tipo}', '${escapeHtml(o.titulo)}', '${escapeHtml(o.organismo)}')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
          <span>Generar Instancia / Escrito Oficial en PDF</span>
        </button>

        <button class="btn-action-secondary" onclick="saveAssistedTramite('${escapeHtml(o.titulo)}')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
          <span>Guardar en "Mis Trámites" con aviso de plazo</span>
        </button>

        <a href="${o.enlace_oficial}" target="_blank" rel="noopener noreferrer" class="btn-action-secondary" style="margin-left: auto;">
          <span>Ir a la web oficial (${o.enlace_texto})</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </a>
      </div>

    </div>
  `;
}

function showAssistedModal(o) {
  const grid = document.getElementById('tramitesGrid');
  renderAssistedGuidance(o, grid);
  window.scrollTo({ top: document.getElementById('catalogHeader').offsetTop - 80, behavior: 'smooth' });
}

function openGeneratorForAssisted(tipo, titulo, organismo) {
  switchView('generator');
  const select = document.getElementById('templateType');
  select.value = 'instancia_general';
  updateGeneratorFields('instancia_general');

  // Pre-rellenar campos con la información del trámite asistido
  document.getElementById('destinatarioNombre').value = organismo || 'Organismo Competente de la Administración Pública';
  document.getElementById('referenciaContrato').value = titulo || 'Solicitud administrativa';
  document.getElementById('explicacionHechos').value = `EXPONE: Que en relación al trámite '${titulo}', vengo a presentar la documentación acreditativa y a solicitar formalmente la tramitación y resolución expresa del expediente.`;
  showToast('Formulario configurado con los datos del trámite');
}

function saveAssistedTramite(titulo) {
  const daysStr = prompt(`¿En cuántos días vence el plazo de '${titulo}'? (ej: 30, 60, 180 días)`, '60');
  if (daysStr === null) return;
  const days = parseInt(daysStr) || 60;
  const notes = prompt('Añade una nota o recordatorio personal (opcional):', 'Comprobar documentación requerida.') || '';

  const id = 'asistido-' + Date.now();
  saveTramiteToStorage(id, titulo, days, notes);
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
  const btnSubmit = document.getElementById('btnSubmitPdf');

  templateSelect.addEventListener('change', () => {
    updateGeneratorFields(templateSelect.value);
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      generateAndDownloadPdf();
    });
  }

  if (btnSubmit) {
    btnSubmit.addEventListener('click', (e) => {
      e.preventDefault();
      generateAndDownloadPdf();
    });
  }
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
  } else if (templateType === 'instancia_general') {
    refLabel.textContent = 'Petición concreta o asunto a solicitar:';
    refHint.textContent = 'Ej: Solicitud de licencia de obras, devolución de ingresos, certificado...';
    fechaLabel.textContent = 'Fecha de los hechos o ref. anterior (opcional):';
    cuantiaGroup.style.display = 'none';
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

  const solicitanteNombre = document.getElementById('solicitanteNombre').value.trim();
  const solicitanteNif = document.getElementById('solicitanteNif').value.trim();
  const destinatarioNombre = document.getElementById('destinatarioNombre').value.trim();

  if (!solicitanteNombre) {
    alert('Por favor, indica tu nombre y apellidos en "Tus datos".');
    document.getElementById('solicitanteNombre').focus();
    return;
  }
  if (!solicitanteNif) {
    alert('Por favor, indica tu DNI / NIE / Pasaporte en "Tus datos".');
    document.getElementById('solicitanteNif').focus();
    return;
  }
  if (!destinatarioNombre) {
    alert('Por favor, indica el nombre de la empresa, casero o entidad destinataria.');
    document.getElementById('destinatarioNombre').focus();
    return;
  }

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
      
      // Retrasar revocación para que los navegadores modernos no aborten la descarga del archivo
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        a.remove();
      }, 2500);

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

function fillSampleData() {
  const currentTemplate = document.getElementById('templateType').value;
  document.getElementById('solicitanteNombre').value = 'María García López';
  document.getElementById('solicitanteNif').value = '12345678X';
  document.getElementById('solicitanteDireccion').value = 'Calle Gran Vía 24, 3º B, 28013 Madrid';
  document.getElementById('solicitanteTelefono').value = '612 345 678';
  document.getElementById('solicitanteEmail').value = 'maria.garcia@ejemplo.com';
  document.getElementById('ciudadFirma').value = 'Madrid';

  if (currentTemplate === 'baja_suministro') {
    document.getElementById('destinatarioNombre').value = 'Telefónica de España S.A.';
    document.getElementById('destinatarioCif').value = 'A-28015865';
    document.getElementById('destinatarioDireccion').value = 'Servicio de Bajas y Atención al Cliente';
    document.getElementById('referenciaContrato').value = 'Línea fija 912345678 / Contrato TEL-889900';
    document.getElementById('fechaHecho').value = new Date().toLocaleDateString('es-ES');
    document.getElementById('explicacionHechos').value = 'Habiendo cumplido el periodo de permanencia pactado, solicito la baja definitiva e inmediata del servicio de fibra y línea fija en el plazo legal de 2 días hábiles, rogando me indiquen el punto de entrega para devolver el router.';
  } else if (currentTemplate === 'reclamar_fianza') {
    document.getElementById('destinatarioNombre').value = 'Juan Propietario Arrendador';
    document.getElementById('destinatarioCif').value = '';
    document.getElementById('destinatarioDireccion').value = 'Calle Alcalá 50, 1º A, Madrid';
    document.getElementById('referenciaContrato').value = 'Vivienda sita en Calle Princesa 10, 4º B, Madrid';
    document.getElementById('fechaHecho').value = '15 de enero de 2025';
    document.getElementById('cuantia').value = '850';
    document.getElementById('explicacionHechos').value = 'Habiendo transcurrido más de 30 días naturales desde la entrega efectiva de llaves sin haberse acreditado desperfectos mediante facturas con IVA, requiero la devolución íntegra de la fianza legal depositada con sus intereses legales.';
  } else if (currentTemplate === 'instancia_general') {
    document.getElementById('destinatarioNombre').value = 'Ayuntamiento de Madrid - Distrito Centro';
    document.getElementById('destinatarioCif').value = 'P-2807900B';
    document.getElementById('destinatarioDireccion').value = 'Oficina de Atención a la Ciudadanía';
    document.getElementById('referenciaContrato').value = 'Solicitud de vado permanente / licencia de obra';
    document.getElementById('fechaHecho').value = new Date().toLocaleDateString('es-ES');
    document.getElementById('explicacionHechos').value = 'EXPONE: Que habiendo realizado las adecuaciones técnicas requeridas en el local, SOLICITA se tenga por presentado este escrito y se sirva autorizar la concesión de la licencia municipal solicitada.';
  } else { // reclamacion_empresa
    document.getElementById('destinatarioNombre').value = 'Comercial Electrodomésticos S.L.';
    document.getElementById('destinatarioCif').value = 'B-12345678';
    document.getElementById('destinatarioDireccion').value = 'Departamento de Calidad y Postventa';
    document.getElementById('referenciaContrato').value = 'Factura FAC-2025-0045';
    document.getElementById('fechaHecho').value = '10 de diciembre de 2024';
    document.getElementById('cuantia').value = '349';
    document.getElementById('explicacionHechos').value = 'El televisor adquirido presentó un fallo en la pantalla dentro de los 3 años de garantía legal. Solicito formalmente la reparación o sustitución por una unidad idéntica sin coste alguno en el plazo de 10 días hábiles.';
  }

  showToast('Datos de ejemplo cargados en el formulario');
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
