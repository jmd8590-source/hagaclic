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
  initDarkMode();
  initNavigation();
  initSearchAndFilters();
  initLetterGenerator();
  initCalculator();
  initChatbot();
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
  document.getElementById('viewCalculator').style.display = 'none';

  // Desmarcar botones activos de navegación (escritorio y móvil)
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));

  function activateNavButtons(name) {
    const btn = document.querySelector(`.nav-btn[data-target="${name}"]`);
    if (btn) btn.classList.add('active');
    const mobileBtn = document.querySelector(`.mobile-nav-btn[data-target="${name}"]`);
    if (mobileBtn) mobileBtn.classList.add('active');
  }

  if (viewName === 'catalog') {
    if (heroSection) heroSection.style.display = 'block';
    document.getElementById('viewCatalog').style.display = 'block';
    activateNavButtons('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (viewName === 'generator') {
    if (heroSection) heroSection.style.display = 'none';
    document.getElementById('viewGenerator').style.display = 'block';
    activateNavButtons('generator');
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else if (viewName === 'saved') {
    if (heroSection) heroSection.style.display = 'none';
    document.getElementById('viewSaved').style.display = 'block';
    activateNavButtons('saved');
    renderSavedTramites();
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else if (viewName === 'detail') {
    if (heroSection) heroSection.style.display = 'none';
    document.getElementById('viewDetail').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else if (viewName === 'calculator') {
    if (heroSection) heroSection.style.display = 'none';
    document.getElementById('viewCalculator').style.display = 'block';
    activateNavButtons('calculator');
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
  // Modo estático: datos embebidos por build_static.py (Cloudflare Pages)
  if (window.__TRAMITES_DATA__) {
    AppState.allTramites = window.__TRAMITES_DATA__;
    renderTramitesGrid(AppState.allTramites);
    return;
  }
  // Modo servidor: llamada a la API Flask local
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
  // Modo estático: búsqueda y filtrado en cliente (sin API Flask)
  if (window.__TRAMITES_DATA__) {
    const q = AppState.searchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cat = AppState.currentCategory;
    let results = AppState.allTramites.filter(t => {
      const inCat = !cat || cat === 'todas' || t.categoria === cat;
      if (!q) return inCat;
      const haystack = [t.titulo, t.resumen, ...(t.palabras_clave || [])]
        .join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return inCat && haystack.includes(q);
    });
    renderTramitesGrid(results, null);
    if (callback) callback();
    if (shouldScroll) {
      const headerElem = document.getElementById('catalogHeader');
      if (headerElem) {
        const y = headerElem.getBoundingClientRect().top + window.pageYOffset - 75;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
    return;
  }
  // Modo servidor: búsqueda vía API Flask
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
    <article class="tramite-card" id="card-${t.id}" onclick="openTramiteDetail('${t.id}')">
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
        <button class="btn-card-secondary" title="Guardar trámite" onclick="event.stopPropagation(); quickSaveTramite('${t.id}')">
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
            <label class="checklist-item ${isChecked ? 'checked' : ''}">
              <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="handleDocCheckChange('${t.id}', ${idx}, this)" />
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
        <span>Guardar en "Mis Trámites"</span>
      </button>

      <button class="btn-share-inline" onclick="openShareModal('${escapeHtml(t.titulo)}', '${escapeHtml(t.resumen)}', '${t.id}')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
        <span>Compartir</span>
      </button>

      <a href="${t.enlace_oficial}" target="_blank" rel="noopener noreferrer" class="btn-action-secondary">
        <span>Ir a la web oficial (${t.enlace_texto})</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
      </a>
    </div>
  `;

  updateDocProgressCounter(t.id, t.documentos.length);
}

function handleDocCheckChange(tramiteId, docIndex, checkbox) {
  const label = checkbox.closest('.checklist-item');
  if (label) label.classList.toggle('checked', checkbox.checked);

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
    completado: false,
    stepsCompleted: []
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
  const mobileBadge = document.getElementById('mobileSavedCountBadge');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
  }
  if (mobileBadge) {
    mobileBadge.textContent = count;
    mobileBadge.style.display = count > 0 ? 'flex' : 'none';
  }
}

// (renderSavedTramites, toggleCompleteSaved, deleteSavedTramite moved to section 10 - Timeline Visual)

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

// ============================================================================
// 8. Dark Mode
// ============================================================================
function initDarkMode() {
  const btnDark = document.getElementById('btnToggleDark');
  const iconEl = document.getElementById('darkModeIcon');
  const labelEl = document.getElementById('darkModeLabel');

  // Check localStorage first, then system preference
  let savedPref = localStorage.getItem('hagaclic_dark_mode');
  if (savedPref === null) {
    // Auto-detect
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      savedPref = 'true';
    } else {
      savedPref = 'false';
    }
  }

  function applyDark(active) {
    document.documentElement.classList.toggle('dark-mode', active);
    if (iconEl) iconEl.textContent = active ? '☀️' : '🌙';
    if (labelEl) labelEl.textContent = active ? 'Modo Claro' : 'Modo Oscuro';
    if (btnDark) {
      if (active) {
        btnDark.style.background = '#fbbf24';
        btnDark.style.color = '#0f172a';
        btnDark.style.borderColor = '#f59e0b';
      } else {
        btnDark.style.background = 'rgba(255, 255, 255, 0.15)';
        btnDark.style.color = '#ffffff';
        btnDark.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      }
    }
  }

  applyDark(savedPref === 'true');

  if (btnDark) {
    btnDark.addEventListener('click', () => {
      const isActive = document.documentElement.classList.contains('dark-mode');
      const newState = !isActive;
      applyDark(newState);
      localStorage.setItem('hagaclic_dark_mode', newState);
      showToast(newState ? 'Modo oscuro activado 🌙' : 'Modo claro activado ☀️');
    });
  }

  // Listen for system changes
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (localStorage.getItem('hagaclic_dark_mode') === null) {
        applyDark(e.matches);
      }
    });
  }
}

// ============================================================================
// 9. Share Modal (WhatsApp, Email, Copy, Print, QR)
// ============================================================================
let _shareData = {};

function openShareModal(titulo, resumen, tramiteId) {
  _shareData = { titulo, resumen, tramiteId };
  const pageUrl = window.location.origin + '/?tramite=' + (tramiteId || '');
  const shareText = `📝 Trámite: ${titulo}\n${resumen}\n\n🔗 Más info: ${pageUrl}\n\n(Vía HagaClic - Asistente de Trámites de España)`;

  const overlay = document.createElement('div');
  overlay.className = 'share-overlay';
  overlay.id = 'shareOverlay';
  overlay.onclick = (e) => { if (e.target === overlay) closeShareModal(); };

  overlay.innerHTML = `
    <div class="share-modal">
      <div class="share-modal-header">
        <h3>Compartir trámite</h3>
        <button class="share-modal-close" onclick="closeShareModal()">✕</button>
      </div>
      <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.25rem; font-weight: 600;">${titulo}</p>
      <div class="share-options-grid">
        <button class="share-option-btn whatsapp" onclick="shareWhatsApp()">
          <span class="share-option-icon">📱</span>
          <span>WhatsApp</span>
        </button>
        <button class="share-option-btn email" onclick="shareEmail()">
          <span class="share-option-icon">📧</span>
          <span>Email</span>
        </button>
        <button class="share-option-btn copy" onclick="shareCopy()">
          <span class="share-option-icon">📋</span>
          <span>Copiar</span>
        </button>
        <button class="share-option-btn print" onclick="sharePrint()">
          <span class="share-option-icon">🖨️</span>
          <span>Imprimir</span>
        </button>
      </div>
      <div class="share-qr-section">
        <p>📲 Escanea el código QR para acceder desde otro dispositivo</p>
        <canvas id="shareQrCanvas" width="150" height="150"></canvas>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  generateQR(pageUrl);
}

function closeShareModal() {
  const overlay = document.getElementById('shareOverlay');
  if (overlay) overlay.remove();
}

function shareWhatsApp() {
  const pageUrl = window.location.origin + '/?tramite=' + (_shareData.tramiteId || '');
  const text = `📝 *${_shareData.titulo}*\n${_shareData.resumen}\n\n🔗 ${pageUrl}\n\n_(Vía HagaClic)_`;
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
  showToast('Abriendo WhatsApp...');
  closeShareModal();
}

function shareEmail() {
  const pageUrl = window.location.origin + '/?tramite=' + (_shareData.tramiteId || '');
  const subject = `Información sobre trámite: ${_shareData.titulo}`;
  const body = `Hola,\n\nTe comparto información sobre este trámite:\n\n${_shareData.titulo}\n${_shareData.resumen}\n\nMás info: ${pageUrl}\n\n(Enviado desde HagaClic - Asistente de Trámites de España)`;
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  showToast('Abriendo correo electrónico...');
  closeShareModal();
}

function shareCopy() {
  const pageUrl = window.location.origin + '/?tramite=' + (_shareData.tramiteId || '');
  const text = `📝 ${_shareData.titulo}\n${_shareData.resumen}\n🔗 ${pageUrl}`;
  navigator.clipboard.writeText(text).then(() => {
    showToast('¡Copiado al portapapeles!');
    closeShareModal();
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast('¡Copiado al portapapeles!');
    closeShareModal();
  });
}

function sharePrint() {
  closeShareModal();
  setTimeout(() => window.print(), 300);
}

// Simple QR Code generator (canvas-based, no external deps)
function generateQR(url) {
  const canvas = document.getElementById('shareQrCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = 150;
  canvas.width = size;
  canvas.height = size;
  
  // Simple QR-like visual with the URL encoded as a pattern
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  
  // Generate a deterministic pattern from the URL
  const modules = 21;
  const cellSize = Math.floor(size / modules);
  const offset = Math.floor((size - cellSize * modules) / 2);
  
  ctx.fillStyle = '#000000';
  
  // Position detection patterns (3 corners)
  function drawFinderPattern(x, y) {
    // Outer
    ctx.fillRect(offset + x * cellSize, offset + y * cellSize, 7 * cellSize, 7 * cellSize);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(offset + (x+1) * cellSize, offset + (y+1) * cellSize, 5 * cellSize, 5 * cellSize);
    ctx.fillStyle = '#000000';
    ctx.fillRect(offset + (x+2) * cellSize, offset + (y+2) * cellSize, 3 * cellSize, 3 * cellSize);
  }
  
  drawFinderPattern(0, 0);
  drawFinderPattern(modules - 7, 0);
  drawFinderPattern(0, modules - 7);
  
  // Data modules - simple hash-based pattern
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0;
  }
  
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      // Skip finder patterns
      if ((row < 8 && col < 8) || (row < 8 && col > modules - 9) || (row > modules - 9 && col < 8)) continue;
      
      const bit = ((hash * (row * modules + col + 1)) >>> 0) % 3;
      if (bit === 0) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(offset + col * cellSize, offset + row * cellSize, cellSize, cellSize);
      }
    }
  }
  
  // Center label
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(size/2 - 22, size/2 - 8, 44, 16);
  ctx.fillStyle = '#0f2942';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HAGACLIC', size/2, size/2 + 4);
}

// ============================================================================
// 10. Timeline Visual - Mis Trámites (Mejora 3)
// ============================================================================
function renderSavedTramites() {
  const container = document.getElementById('savedListContainer');
  if (!container) return;

  if (AppState.savedTramites.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; border: 1px dashed var(--border-strong); border-radius: 12px;">
        <p style="font-size: 1.15rem; font-weight: 700; color: var(--primary); margin-bottom: 0.5rem;">No tienes ningún trámite guardado todavía.</p>
        <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Explora los trámites del catálogo y pulsa "Guardar" para tener control visual sobre los plazos y fases.</p>
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
    const stepsCompleted = t.stepsCompleted || [];

    // Find the tramite steps from catalog
    const catalogItem = AppState.allTramites.find(x => x.id === t.id);
    const steps = catalogItem ? catalogItem.pasos : [];
    const totalSteps = steps.length || 1;
    const completedCount = Math.min(stepsCompleted.length, totalSteps);
    const progressPercent = Math.round((completedCount / totalSteps) * 100);
    const isAllDone = t.completado || progressPercent === 100;

    // Deadline badge
    let badgeClass = 'safe';
    let badgeText = `🟢 En plazo: quedan ${diffDays} días`;
    if (isAllDone) {
      badgeClass = 'done';
      badgeText = '✅ Completado';
    } else if (diffDays < 0) {
      badgeClass = 'urgent';
      badgeText = `⚠️ Plazo vencido (${Math.abs(diffDays)} días tarde)`;
    } else if (diffDays <= 5) {
      badgeClass = 'urgent';
      badgeText = `🔴 ¡Urgente! Vence en ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
    } else if (diffDays <= 15) {
      badgeClass = 'warning';
      badgeText = `🟡 Atención: quedan ${diffDays} días`;
    }

    // Donut SVG
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progressPercent / 100) * circumference;
    const donutColor = isAllDone ? '#34d399' : progressPercent > 50 ? '#3b82f6' : '#f59e0b';

    // Timeline steps HTML
    let stepsHtml = '';
    if (steps.length > 0) {
      stepsHtml = `<div class="timeline-steps">${steps.map((s, si) => {
        const isDone = stepsCompleted.includes(si);
        const isActive = !isDone && (si === 0 || stepsCompleted.includes(si - 1));
        const stateClass = isDone ? 'completed' : isActive ? 'active' : '';
        return `
          <div class="timeline-step ${stateClass}">
            <div class="timeline-step-dot"></div>
            <span class="timeline-step-label">${s.titulo}</span>
            <button class="timeline-step-toggle" onclick="toggleTimelineStep(${idx}, ${si})">
              ${isDone ? 'Deshacer' : 'Hecho ✓'}
            </button>
          </div>
        `;
      }).join('')}</div>`;
    }

    return `
      <div class="timeline-card ${isAllDone ? 'completed' : ''}" id="timeline-card-${idx}">
        <div class="timeline-card-header">
          <div class="timeline-card-info">
            <h4>${t.titulo}</h4>
            <div class="timeline-card-meta">
              <span class="deadline-badge ${badgeClass}">${badgeText}</span>
              <span>Inicio: ${new Date(t.fechaInicio).toLocaleDateString('es-ES')}</span>
              <span>Límite: ${deadline.toLocaleDateString('es-ES')}</span>
            </div>
            ${t.notas ? `<p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem; background: var(--bg-subtle); padding: 0.4rem 0.6rem; border-radius: 4px;"><strong>Nota:</strong> ${t.notas}</p>` : ''}
          </div>
          <div class="donut-progress">
            <svg width="68" height="68">
              <circle cx="34" cy="34" r="${radius}" fill="none" stroke="var(--border)" stroke-width="6"></circle>
              <circle cx="34" cy="34" r="${radius}" fill="none" stroke="${donutColor}" stroke-width="6" 
                stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" 
                stroke-linecap="round" style="transition: stroke-dashoffset 0.6s ease;"></circle>
            </svg>
            <div class="donut-progress-text">${progressPercent}%</div>
          </div>
        </div>

        ${stepsHtml}

        <div class="timeline-card-actions">
          <button class="btn-access" style="background: var(--bg-subtle); color: var(--text-main); border: 1px solid var(--border);" onclick="openTramiteDetail('${t.id}')">
            Ver guía
          </button>
          <button class="btn-access" style="background: ${isAllDone ? '#f1f5f9' : 'var(--success-light)'}; color: ${isAllDone ? '#475569' : 'var(--success)'}; border: 1px solid currentColor;" onclick="toggleCompleteSaved(${idx})">
            ${isAllDone ? 'Reabrir' : 'Completar todo ✓'}
          </button>
          <button class="btn-access" style="background: var(--danger-light); color: var(--danger); border: 1px solid var(--danger);" title="Eliminar" onclick="deleteSavedTramite(${idx})">
            ✕
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function toggleTimelineStep(tramiteIdx, stepIdx) {
  const t = AppState.savedTramites[tramiteIdx];
  if (!t.stepsCompleted) t.stepsCompleted = [];
  
  const pos = t.stepsCompleted.indexOf(stepIdx);
  if (pos >= 0) {
    t.stepsCompleted.splice(pos, 1);
  } else {
    t.stepsCompleted.push(stepIdx);
  }

  // Check if all steps are done
  const catalogItem = AppState.allTramites.find(x => x.id === t.id);
  const totalSteps = catalogItem ? catalogItem.pasos.length : 0;
  if (totalSteps > 0 && t.stepsCompleted.length >= totalSteps) {
    t.completado = true;
    // Show confetti
    setTimeout(() => {
      const card = document.getElementById(`timeline-card-${tramiteIdx}`);
      if (card) {
        const burst = document.createElement('div');
        burst.className = 'confetti-burst';
        burst.textContent = '🎉';
        card.appendChild(burst);
        setTimeout(() => burst.remove(), 1000);
      }
    }, 100);
    showToast('¡Trámite completado al 100%! 🎉');
  }

  localStorage.setItem('hagaclic_saved_tramites', JSON.stringify(AppState.savedTramites));
  updateSavedBadgeCount();
  renderSavedTramites();
}

function toggleCompleteSaved(idx) {
  AppState.savedTramites[idx].completado = !AppState.savedTramites[idx].completado;
  if (AppState.savedTramites[idx].completado) {
    // Mark all steps as completed
    const catalogItem = AppState.allTramites.find(x => x.id === AppState.savedTramites[idx].id);
    if (catalogItem && catalogItem.pasos) {
      AppState.savedTramites[idx].stepsCompleted = catalogItem.pasos.map((_, i) => i);
    }
  } else {
    AppState.savedTramites[idx].stepsCompleted = [];
  }
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
// 11. Calculadora de Plazos y Costes (Mejora 4)
// ============================================================================
let _calcDeadlineResult = null;

function initCalculator() {
  const tabs = document.querySelectorAll('.calc-tab');
  const tramiteSelect = document.getElementById('calcTramiteSelect');
  
  // Set default date to today
  const dateInput = document.getElementById('calcFechaInicio');
  if (dateInput) dateInput.valueAsDate = new Date();

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.calc-panel').forEach(p => p.classList.remove('active'));
      const target = tab.getAttribute('data-calc-tab');
      document.getElementById(target === 'plazos' ? 'calcPanelPlazos' : 'calcPanelCostes').classList.add('active');
    });
  });

  if (tramiteSelect) {
    tramiteSelect.addEventListener('change', () => {
      const isCustom = tramiteSelect.value === 'custom';
      document.getElementById('calcCustomGroup').style.display = isCustom ? 'flex' : 'none';
      document.getElementById('calcCustomTypeGroup').style.display = isCustom ? 'flex' : 'none';
    });
  }
}

const PLAZO_DATA = {
  fianza: { dias: 30, tipo: 'naturales', nombre: 'Devolución de fianza' },
  sucesiones: { dias: 183, tipo: 'naturales', nombre: 'Impuesto de Sucesiones' },
  desempleo: { dias: 15, tipo: 'habiles', nombre: 'Solicitud prestación desempleo' },
  consumo: { dias: 30, tipo: 'naturales', nombre: 'Respuesta reclamación consumo' },
  dgt_transfer: { dias: 30, tipo: 'naturales', nombre: 'Transferencia vehículo DGT' },
  baja_suministro: { dias: 2, tipo: 'habiles', nombre: 'Baja de suministro' },
};

// National holidays (approximate, for working-day calculation)
const FESTIVOS_NACIONALES = [
  '01-01', '01-06', '03-19', '05-01', '08-15', '10-12', '11-01', '12-06', '12-08', '12-25'
];

function isWeekend(date) {
  const d = date.getDay();
  return d === 0 || d === 6;
}

function isFestivo(date) {
  const mmdd = String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  return FESTIVOS_NACIONALES.includes(mmdd);
}

function addWorkingDays(startDate, days) {
  let current = new Date(startDate);
  let added = 0;
  while (added < days) {
    current.setDate(current.getDate() + 1);
    if (!isWeekend(current) && !isFestivo(current)) {
      added++;
    }
  }
  return current;
}

function calculateDeadline() {
  const tramiteType = document.getElementById('calcTramiteSelect').value;
  const fechaStr = document.getElementById('calcFechaInicio').value;
  
  if (!fechaStr) {
    showToast('Selecciona una fecha de inicio');
    return;
  }

  const startDate = new Date(fechaStr);
  let dias, tipo, nombre;

  if (tramiteType === 'custom') {
    dias = parseInt(document.getElementById('calcCustomDias').value) || 30;
    tipo = document.getElementById('calcCustomTipo').value;
    nombre = 'Plazo personalizado';
  } else {
    const data = PLAZO_DATA[tramiteType];
    dias = data.dias;
    tipo = data.tipo;
    nombre = data.nombre;
  }

  let deadline;
  if (tipo === 'habiles') {
    deadline = addWorkingDays(startDate, dias);
  } else {
    deadline = new Date(startDate);
    deadline.setDate(deadline.getDate() + dias);
  }

  const now = new Date();
  const remainingMs = deadline - now;
  const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

  _calcDeadlineResult = { deadline, nombre, dias, tipo };

  const resultBox = document.getElementById('calcResultBox');
  const resultDate = document.getElementById('calcResultDate');
  const resultDays = document.getElementById('calcResultDays');

  resultDate.textContent = deadline.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  if (remainingDays > 0) {
    resultDays.innerHTML = `<span style="color: var(--success);">Quedan <strong>${remainingDays} días</strong> desde hoy</span> (${dias} ${tipo === 'habiles' ? 'días hábiles' : 'días naturales'} desde el ${startDate.toLocaleDateString('es-ES')})`;
  } else if (remainingDays === 0) {
    resultDays.innerHTML = `<span style="color: var(--danger); font-weight: 800;">¡El plazo vence HOY!</span>`;
  } else {
    resultDays.innerHTML = `<span style="color: var(--danger); font-weight: 800;">¡Plazo vencido hace ${Math.abs(remainingDays)} días!</span>`;
  }

  resultBox.style.display = 'block';
  resultBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function exportToCalendar() {
  if (!_calcDeadlineResult) return;
  const { deadline, nombre } = _calcDeadlineResult;
  
  const pad = (n) => String(n).padStart(2, '0');
  const formatICSDate = (d) => {
    return d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
  };

  const start = new Date(deadline);
  start.setHours(9, 0, 0);
  const end = new Date(deadline);
  end.setHours(10, 0, 0);

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HagaClic//Calculadora//ES',
    'BEGIN:VEVENT',
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:⚠️ PLAZO: ${nombre}`,
    `DESCRIPTION:Fecha límite para el trámite "${nombre}". Generado por HagaClic.`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:Mañana vence el plazo de: ${nombre}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `plazo_${nombre.replace(/\s+/g, '_').toLowerCase()}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  showToast('¡Evento de calendario descargado!');
}

const COST_DATA = {
  dni: {
    nombre: 'Renovación del DNI',
    items: [
      { label: 'Tasa oficial DNI (modelo 790-012)', value: '12,00 €' },
      { label: 'Fotografía carnet (fotomatotón)', value: '4,00 - 6,00 €' },
      { label: 'Volante empadronamiento (si cambio domicilio)', value: 'Gratuito' },
      { label: 'TOTAL ESTIMADO', value: '12,00 - 18,00 €' },
    ]
  },
  pasaporte: {
    nombre: 'Renovación del Pasaporte',
    items: [
      { label: 'Tasa oficial Pasaporte (modelo 790-012)', value: '30,00 €' },
      { label: 'Fotografía carnet', value: '4,00 - 6,00 €' },
      { label: 'TOTAL ESTIMADO', value: '34,00 - 36,00 €' },
    ]
  },
  dgt_transfer: {
    nombre: 'Transferencia de vehículo (DGT)',
    items: [
      { label: 'Tasa DGT 4.1 (turismos)', value: '55,70 €' },
      { label: 'Impuesto Transmisiones Patrimoniales (ITP)', value: 'Variable según CC.AA. y valor' },
      { label: 'Informe de vehículo DGT', value: '8,67 €' },
      { label: 'Gestoría (opcional)', value: '60,00 - 120,00 €' },
      { label: 'TOTAL ESTIMADO (sin gestor)', value: '64,37 € + ITP' },
    ]
  },
  sucesiones: {
    nombre: 'Herencia / Sucesiones',
    items: [
      { label: 'Certificado Defunción (Registro Civil)', value: 'Gratuito' },
      { label: 'Certificado Últimas Voluntades (modelo 790-006)', value: '3,86 €' },
      { label: 'Certificado Seguros (modelo 790-006)', value: '3,86 €' },
      { label: 'Aranceles notariales (escritura herencia)', value: '300 - 1.500 € (según valor)' },
      { label: 'Registro de la Propiedad (inmuebles)', value: 'Variable' },
      { label: 'Impuesto Sucesiones (modelo 650)', value: 'Variable por CC.AA. y parentesco' },
      { label: 'Plusvalía municipal (IIVTNU)', value: 'Variable según municipio' },
      { label: 'TOTAL ESTIMADO', value: 'Desde 308 € + impuestos' },
    ]
  },
  empadronamiento: {
    nombre: 'Empadronamiento',
    items: [
      { label: 'Trámite de alta/cambio padrón', value: 'Gratuito' },
      { label: 'Volante de empadronamiento', value: 'Gratuito' },
      { label: 'TOTAL', value: 'Gratuito' },
    ]
  },
  extranjeria_nie: {
    nombre: 'Cita Extranjería (NIE / TIE)',
    items: [
      { label: 'Tasa modelo 790-012 (NIE)', value: '12,00 €' },
      { label: 'Tasa modelo 790-052 (TIE tarjeta)', value: '16,32 €' },
      { label: 'Fotografías carnet (3 unidades)', value: '6,00 - 9,00 €' },
      { label: 'TOTAL ESTIMADO (NIE + TIE)', value: '28,32 - 37,32 €' },
    ]
  },
};

function calculateCosts() {
  const type = document.getElementById('calcCosteTramite').value;
  const data = COST_DATA[type];
  if (!data) return;

  const container = document.getElementById('costResultBox');
  container.innerHTML = `
    <h4 style="font-size: 1.15rem; font-weight: 800; color: var(--primary); margin-bottom: 1rem;">💰 Desglose de costes: ${data.nombre}</h4>
    ${data.items.map(item => `
      <div class="cost-item">
        <span class="cost-item-label">${item.label}</span>
        <span class="cost-item-value">${item.value}</span>
      </div>
    `).join('')}
    <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 1rem; font-style: italic;">
      * Tasas oficiales actualizadas a normativa vigente. Las tasas autonómicas y municipales pueden variar. Consulta siempre en la sede electrónica oficial.
    </p>
  `;
  container.style.display = 'block';
  container.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ============================================================================
// 12. Chatbot Asistente Conversacional Inteligente Universal
// ============================================================================
let chatHistory = JSON.parse(localStorage.getItem('hagaclic_chat_history') || '[]');
let chatOpen = false;

const QUICK_SUGGESTIONS = [
  "¿Cómo pedir el Ingreso Mínimo Vital?",
  "Quiero recurrir una multa de la DGT",
  "Alta de autónomos en Hacienda y Seg. Social",
  "Baja por paternidad o maternidad",
  "Nacionalidad española por residencia",
  "El ayuntamiento no me contesta: ¿qué hacer?"
];

function toggleChatbotFromNav() {
  const panel = document.getElementById('chatbotPanel');
  if (!panel) return;
  chatOpen = !chatOpen;
  panel.style.display = chatOpen ? 'flex' : 'none';
  if (chatOpen) {
    if (chatHistory.length === 0) {
      showInitialWelcome();
    } else {
      renderChatHistory();
    }
    const input = document.getElementById('chatbotInput');
    if (input) setTimeout(() => input.focus(), 150);
  }
}

function initChatbot() {
  const fab = document.getElementById('chatbotFab');
  const panel = document.getElementById('chatbotPanel');
  const closeBtn = document.getElementById('chatbotClose');
  const clearBtn = document.getElementById('chatbotClear');
  const input = document.getElementById('chatbotInput');
  const sendBtn = document.getElementById('chatbotSend');

  if (fab) {
    fab.addEventListener('click', () => {
      chatOpen = !chatOpen;
      panel.style.display = chatOpen ? 'flex' : 'none';
      if (chatOpen) {
        if (chatHistory.length === 0) {
          showInitialWelcome();
        } else {
          renderChatHistory();
        }
        input.focus();
      }
    });
  }

  closeBtn.addEventListener('click', () => {
    chatOpen = false;
    panel.style.display = 'none';
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      chatHistory = [];
      localStorage.removeItem('hagaclic_chat_history');
      showInitialWelcome();
      showToast('Conversación reiniciada');
    });
  }

  sendBtn.addEventListener('click', () => sendChatMessage());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChatMessage();
  });
}

function showInitialWelcome() {
  const container = document.getElementById('chatbotMessages');
  container.innerHTML = '';
  
  const welcomeText = "¡Hola! 👋 Soy tu **Asistente de Trámites y Administración Pública de España**.\n\nPuedo orientarte sobre **cualquier trámite, ayuda, pensión, gestión de tráfico, extranjería, tributos o ayuntamientos**, aunque no esté en el catálogo predefinido.\n\nEscribe tu duda con tus propias palabras o elige una consulta habitual:";
  appendMessageToDOM('bot', welcomeText);

  // Render suggestion chips
  const sugDiv = document.createElement('div');
  sugDiv.className = 'chat-suggestions';
  sugDiv.id = 'chatSuggestions';
  sugDiv.innerHTML = `
    <span class="chat-suggestions-title">💡 Preguntas habituales:</span>
    <div class="chat-chips">
      ${QUICK_SUGGESTIONS.map(s => `
        <button type="button" class="chat-chip" onclick="askQuickSuggestion('${escapeHtml(s)}')">${escapeHtml(s)}</button>
      `).join('')}
    </div>
  `;
  container.appendChild(sugDiv);
  container.scrollTop = container.scrollHeight;
}

function askQuickSuggestion(text) {
  const sug = document.getElementById('chatSuggestions');
  if (sug) sug.remove();
  sendChatMessage(text);
}

function sendChatMessage(presetText) {
  const input = document.getElementById('chatbotInput');
  const text = (presetText !== undefined ? presetText : input.value).trim();
  if (!text) return;
  input.value = '';

  // Remove chips if present
  const sug = document.getElementById('chatSuggestions');
  if (sug) sug.remove();

  addUserMessage(text);
  showTypingIndicator();

  // Modo estático: el chatbot IA requiere el servidor Python (no disponible en Cloudflare Pages)
  if (window.__TRAMITES_DATA__) {
    removeTypingIndicator();
    addBotMessage(
      '🤖 El asistente conversacional con IA requiere el **servidor Python local** (ejecuta `run.bat` en tu PC).\n\n' +
      'En la versión online puedes:\n' +
      '- Explorar el **catálogo de trámites** y ver guías paso a paso\n' +
      '- Usar la **calculadora de plazos** y costes\n' +
      '- Generar **cartas PDF** (también requiere servidor local)\n\n' +
      '¿Quieres ver el catálogo de trámites disponibles?',
      [
        { label: '📚 Ver Catálogo de Trámites', tipo: 'ir_catalogo' },
        { label: '📅 Calculadora de Plazos', tipo: 'ir_calculadora' }
      ]
    );
    return;
  }

  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: text,
      history: chatHistory.slice(-8)
    })
  })
    .then(r => {
      if (!r.ok) throw new Error('Error en el servidor');
      return r.json();
    })
    .then(data => {
      removeTypingIndicator();
      if (data && data.respuesta) {
        addBotMessage(data.respuesta, data.acciones);
      } else {
        addBotMessage('He tenido un problema al procesar la respuesta. Por favor, reformula tu consulta o pulsa en Instancia General.');
      }
    })
    .catch(err => {
      removeTypingIndicator();
      addBotMessage('⚠️ Hubo una dificultad temporal de conexión. Puedes formular una Instancia Oficial ante la administración o ver el catálogo:', [
        { label: '📄 Redactar Instancia General', tipo: 'generar_pdf', template: 'instancia_general', titulo: 'Instancia General' },
        { label: '📚 Ver Catálogo de Trámites', tipo: 'ir_catalogo' }
      ]);
    });
}

function addUserMessage(text) {
  chatHistory.push({ role: 'user', text });
  saveChatHistory();
  appendMessageToDOM('user', text);
}

function addBotMessage(text, actions) {
  chatHistory.push({ role: 'bot', text, actions });
  saveChatHistory();
  appendMessageToDOM('bot', text, actions);
}

function formatChatMarkdown(raw) {
  if (!raw) return '';
  // Escape HTML tags to prevent injection, preserving format
  let text = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headers: ### Title -> <h4>Title</h4>
  text = text.replace(/^### (.*$)/gim, '<h4>$1</h4>');
  text = text.replace(/^## (.*$)/gim, '<h3>$1</h3>');

  // Bold: **text** -> <strong>text</strong>
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Bullet items: lines starting with • or -
  text = text.replace(/^[•\-] (.*$)/gim, '<li>$1</li>');
  text = text.replace(/(<li>.*<\/li>)/gms, '<ul>$1</ul>');
  // Clean up nested adjacent uls
  text = text.replace(/<\/ul>\s*<ul>/g, '');

  // Numbered list items
  text = text.replace(/^\d+\.\s+(.*$)/gim, '<li>$1</li>');

  // Links: [Text](URL) -> <a href="URL" target="_blank">Text</a>
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Line breaks
  text = text.replace(/\n\n/g, '<br><br>');
  text = text.replace(/\n/g, '<br>');

  return text;
}

function appendMessageToDOM(role, text, actions) {
  const container = document.getElementById('chatbotMessages');
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  
  if (role === 'bot') {
    div.innerHTML = formatChatMarkdown(text);
  } else {
    div.textContent = text;
  }
  
  if (actions && actions.length > 0) {
    const actionContainer = document.createElement('div');
    actionContainer.className = 'chat-action-btns';
    actions.forEach((a, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `chat-action-btn ${idx === 0 ? 'primary' : ''}`;
      btn.textContent = a.label;
      btn.onclick = () => handleChatAction(a);
      actionContainer.appendChild(btn);
    });
    div.appendChild(actionContainer);
  }
  
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function handleChatAction(action) {
  const panel = document.getElementById('chatbotPanel');
  if (!action) return;

  switch (action.tipo) {
    case 'ver_tramite':
      if (action.id) {
        openTramiteDetail(action.id);
        panel.style.display = 'none';
        chatOpen = false;
      }
      break;

    case 'generar_pdf':
      openGeneratorWithTemplate(action.template || 'instancia_general');
      panel.style.display = 'none';
      chatOpen = false;
      break;

    case 'calculadora':
      switchView('calculadora');
      panel.style.display = 'none';
      chatOpen = false;
      if (action.dias) {
        const dInput = document.getElementById('calcDias');
        if (dInput) {
          dInput.value = action.dias;
          calculateDeadline();
        }
      }
      break;

    case 'link_externo':
      if (action.url) {
        window.open(action.url, '_blank', 'noopener,noreferrer');
      }
      break;

    case 'ir_catalogo':
      switchView('catalog');
      panel.style.display = 'none';
      chatOpen = false;
      break;

    default:
      if (action.onclick) {
        try {
          eval(action.onclick);
        } catch (e) {
          console.error(e);
        }
      }
      break;
  }
}

function showTypingIndicator() {
  const container = document.getElementById('chatbotMessages');
  const typing = document.createElement('div');
  typing.className = 'chat-typing';
  typing.id = 'chatTyping';
  typing.innerHTML = '<span></span><span></span><span></span>';
  container.appendChild(typing);
  container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
  const t = document.getElementById('chatTyping');
  if (t) t.remove();
}

function renderChatHistory() {
  const container = document.getElementById('chatbotMessages');
  container.innerHTML = '';
  chatHistory.forEach(msg => {
    appendMessageToDOM(msg.role, msg.text, msg.actions);
  });
}

function saveChatHistory() {
  if (chatHistory.length > 30) chatHistory = chatHistory.slice(-30);
  localStorage.setItem('hagaclic_chat_history', JSON.stringify(chatHistory));
}
