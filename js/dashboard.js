/* ============================================================
   FITFORGE — DASHBOARD.JS
   · Rendu du planning hebdomadaire
   · Accordéon des jours
   · Hover exercice → activation muscles SVG
   · Persistance des séances complétées
   ============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     MAP : muscles JSON → IDs SVG
     Chaque muscle peut cibler plusieurs éléments SVG
  ---------------------------------------------------------- */
  const MUSCLE_SVG_MAP = {
    // Poitrine / épaules avant
    'pectoraux':       ['pectoraux'],
    'pectoraux_haut':  ['pectoraux'],
    'deltoides_ant':   ['deltoides_ant'],
    'deltoides_post':  ['deltoides_post'],

    // Dos
    'dorsaux':         ['dorsaux'],
    'trapèzes':        ['trapèzes'],
    'rhomboïdes':      ['rhomboïdes'],
    'lombaires':       ['lombaires'],

    // Bras
    'biceps':          ['biceps'],
    'triceps':         ['triceps'],
    'avant_bras':      ['avant_bras'],
    'brachial':        ['biceps'],

    // Core
    'core':            ['abdominaux', 'obliques', 'lombaires'],
    'transverse':      ['abdominaux'],
    'abdominaux':      ['abdominaux'],
    'droit_abdo':      ['abdominaux'],
    'obliques':        ['obliques'],
    'fléchisseurs_hanche': ['abdominaux'],

    // Jambes
    'quadriceps':      ['quadriceps'],
    'ischio_jambiers': ['ischio_jambiers'],
    'fessiers':        ['fessiers'],
    'mollets':         ['mollets'],
    'tibias':          ['tibias'],
  };

  /* Map muscles → label humain pour la légende */
  const MUSCLE_LABELS = {
    'pectoraux':       'Pectoraux',
    'deltoides_ant':   'Épaules',
    'deltoides_post':  'Épaules arr.',
    'dorsaux':         'Dorsaux',
    'trapèzes':        'Trapèzes',
    'rhomboïdes':      'Rhomboïdes',
    'lombaires':       'Lombaires',
    'biceps':          'Biceps',
    'triceps':         'Triceps',
    'avant_bras':      'Avant-bras',
    'abdominaux':      'Abdominaux',
    'obliques':        'Obliques',
    'quadriceps':      'Quadriceps',
    'ischio_jambiers': 'Ischio-jamb.',
    'fessiers':        'Fessiers',
    'mollets':         'Mollets',
    'tibias':          'Tibias',
  };

  /* Tous les IDs SVG uniques, dans l'ordre anatomique */
  const ALL_SVG_MUSCLE_IDS = [
    'pectoraux', 'deltoides_ant', 'deltoides_post',
    'dorsaux', 'trapèzes', 'rhomboïdes', 'lombaires',
    'biceps', 'triceps', 'avant_bras',
    'abdominaux', 'obliques',
    'quadriceps', 'ischio_jambiers', 'fessiers', 'mollets', 'tibias',
  ];

  /* ----------------------------------------------------------
     ÉTAT
  ---------------------------------------------------------- */
  let programme  = null;
  let profil     = null;
  let progress   = {};
  let svgLoaded  = false;

  /* ----------------------------------------------------------
     INIT
  ---------------------------------------------------------- */
  function init() {
    profil    = Storage.getProfile();
    programme = Storage.getProgramme();
    progress  = Storage.getProgress();

    // Rediriger si pas de profil/programme
    if (!profil || !programme) {
      window.location.href = 'index.html';
      return;
    }

    renderSidebar();
    renderMacroBar();
    renderWeekPlanning();
    loadBodySVG();
    renderLegend();
    bindReset();
  }

  /* ----------------------------------------------------------
     SIDEBAR — stats profil
  ---------------------------------------------------------- */
  function renderSidebar() {
    const kcal    = programme.profil_snapshot.calories_cibles;
    const macros  = programme.profil_snapshot.macros;
    const seances = programme.profil_snapshot.seances;

    const statsEl = document.getElementById('sidebar-stats');
    if (!statsEl) return;

    statsEl.innerHTML = `
      <div class="sidebar-stat">
        <span class="sidebar-stat-key">Kcal cible</span>
        <span class="sidebar-stat-val">${kcal.toLocaleString('fr-FR')}</span>
      </div>
      <div class="sidebar-stat">
        <span class="sidebar-stat-key">Protéines</span>
        <span class="sidebar-stat-val">${macros.proteines}g</span>
      </div>
      <div class="sidebar-stat">
        <span class="sidebar-stat-key">Glucides</span>
        <span class="sidebar-stat-val">${macros.glucides}g</span>
      </div>
      <div class="sidebar-stat">
        <span class="sidebar-stat-key">Lipides</span>
        <span class="sidebar-stat-val">${macros.lipides}g</span>
      </div>
      <div class="sidebar-stat">
        <span class="sidebar-stat-key">Séances</span>
        <span class="sidebar-stat-val">${seances}×/sem</span>
      </div>`;
  }

  /* ----------------------------------------------------------
     MACRO BAR — chips en haut du planning
  ---------------------------------------------------------- */
  function renderMacroBar() {
    const snap    = programme.profil_snapshot;
    const macros  = snap.macros;
    const barEl   = document.getElementById('macro-bar');
    if (!barEl) return;

    barEl.innerHTML = `
      <div class="macro-chip">
        <span class="dot dot-kcal"></span>
        <strong>${snap.calories_cibles.toLocaleString('fr-FR')}</strong> kcal
      </div>
      <div class="macro-chip">
        <span class="dot dot-p"></span>
        <strong>${macros.proteines}g</strong> protéines
      </div>
      <div class="macro-chip">
        <span class="dot dot-g"></span>
        <strong>${macros.glucides}g</strong> glucides
      </div>
      <div class="macro-chip">
        <span class="dot dot-l"></span>
        <strong>${macros.lipides}g</strong> lipides
      </div>`;
  }

  /* ----------------------------------------------------------
     PLANNING HEBDOMADAIRE
  ---------------------------------------------------------- */
  function renderWeekPlanning() {
    const container = document.getElementById('week-grid');
    if (!container || !programme.semaine) return;

    container.innerHTML = programme.semaine.map((jour, idx) =>
      renderDayCard(jour, idx)
    ).join('');

    // Bind events sur toutes les cartes
    programme.semaine.forEach((jour, idx) => {
      bindDayCard(jour, idx);
    });
  }

  function renderDayCard(jour, idx) {
    const jourKey   = `j${idx + 1}`;
    const weekKey   = _currentWeekKey();
    const isDone    = progress[weekKey]?.[jourKey]?.done || false;

    const headerBadge = jour.repos
      ? `<span class="day-type-badge repos">Repos</span>`
      : `<span class="day-type-badge">${jour.type}</span>`;

    const bodyContent = jour.repos
      ? `<p class="day-repos-msg">Repos actif recommandé — marche, étirements, mobilité.</p>`
      : renderExerciseList(jour.exercices, jourKey);

    const footer = jour.repos ? '' : `
      <div class="day-footer">
        <button class="btn-seance-done" data-jour="${jourKey}" data-week="${weekKey}">
          ${isDone ? '✓ Séance complétée' : 'Marquer complétée'}
        </button>
      </div>`;

    return `
      <article class="day-card ${isDone ? 'is-done' : ''}" id="day-card-${jourKey}"
               aria-label="Jour ${jour.jour} : ${jour.label}">
        <div class="day-header" id="day-header-${jourKey}" role="button"
             tabindex="0" aria-expanded="false" aria-controls="day-body-${jourKey}">
          <div class="day-header-left">
            <span class="day-num mono">J${jour.jour}</span>
            <span class="day-label">${jour.label}</span>
            ${headerBadge}
          </div>
          <div class="day-header-right">
            <span class="day-done-badge" aria-hidden="true">✓ Fait</span>
            <span class="day-chevron" aria-hidden="true">▼</span>
          </div>
        </div>
        <div class="day-body" id="day-body-${jourKey}" role="region">
          <div class="day-body-inner">
            ${bodyContent}
            ${footer}
          </div>
        </div>
      </article>`;
  }

  function renderExerciseList(exercices, jourKey) {
    if (!exercices || exercices.length === 0) {
      return `<p class="day-repos-msg">Aucun exercice disponible pour ce profil.</p>`;
    }

    const items = exercices.map((ex, i) => {
      const reps   = typeof ex.reps_cibles === 'number'
        ? `${ex.reps_cibles} reps`
        : ex.tempo === 'Tenir (secondes)' ? `${ex.reps_cibles}s` : `${ex.reps_cibles} reps`;
      const series = ex.series || 3;

      const primaryChips = (ex.muscles_primaires || [])
        .map(m => `<span class="muscle-chip">${_muscleLabel(m)}</span>`).join('');

      return `
        <li class="exercise-item"
            id="ex-${jourKey}-${i}"
            data-muscles-primary='${JSON.stringify(ex.muscles_primaires || [])}'
            data-muscles-secondary='${JSON.stringify(ex.muscles_secondaires || [])}'
            data-ex-name="${_escapeAttr(ex.nom)}"
            role="button" tabindex="0"
            aria-label="${ex.nom} — ${series} séries × ${reps}">
          <span class="ex-num mono">${String(i + 1).padStart(2, '0')}</span>
          <div class="ex-info">
            <div class="ex-name">${ex.nom}</div>
            <div class="ex-meta">
              ${series} séries &nbsp;×&nbsp; <span class="reps-target">${reps}</span>
              &nbsp;·&nbsp; <span style="color: var(--text-muted)">${ex.tempo || ''}</span>
            </div>
          </div>
          <div class="ex-muscles">${primaryChips}</div>
          <div class="ex-check" role="checkbox" aria-checked="false" tabindex="0" aria-label="Marquer comme fait">
            <svg viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M1 4l2.5 2.5L9 1" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </li>`;
    }).join('');

    return `<ul class="exercise-list" aria-label="Exercices de la séance">${items}</ul>`;
  }

  /* ----------------------------------------------------------
     BIND EVENTS — cartes jour
  ---------------------------------------------------------- */
  function bindDayCard(jour, idx) {
    const jourKey  = `j${idx + 1}`;
    const card     = document.getElementById(`day-card-${jourKey}`);
    const header   = document.getElementById(`day-header-${jourKey}`);
    if (!card || !header) return;

    // Accordéon
    const toggleAccordion = () => {
      const isOpen = card.classList.toggle('is-open');
      header.setAttribute('aria-expanded', isOpen);
    };

    header.addEventListener('click', toggleAccordion);
    header.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAccordion(); }
    });

    // Bouton "séance complétée"
    const btnDone = card.querySelector('.btn-seance-done');
    if (btnDone) {
      btnDone.addEventListener('click', e => {
        e.stopPropagation();
        const weekKey = btnDone.dataset.week;
        const jKey    = btnDone.dataset.jour;
        Storage.markSeanceDone(weekKey, jKey);
        progress = Storage.getProgress();
        card.classList.add('is-done');
        btnDone.textContent = '✓ Séance complétée';
      });
    }

    // Hover exercices → muscles SVG
    bindExerciseHovers(jourKey, jour.exercices || []);

    // Ouvrir automatiquement le premier jour non-repos non-fait
    if (!jour.repos && idx === _firstOpenDay()) {
      card.classList.add('is-open');
      header.setAttribute('aria-expanded', 'true');
    }
  }

  function _firstOpenDay() {
    const weekKey = _currentWeekKey();
    return programme.semaine.findIndex((j, i) =>
      !j.repos && !(progress[weekKey]?.[`j${i + 1}`]?.done)
    );
  }

  /* ----------------------------------------------------------
     HOVER EXERCICE → MUSCLES SVG
  ---------------------------------------------------------- */
  function bindExerciseHovers(jourKey, exercices) {
    exercices.forEach((_, i) => {
      const el = document.getElementById(`ex-${jourKey}-${i}`);
      if (!el) return;

      el.addEventListener('mouseenter', () => activateMuscles(el));
      el.addEventListener('mouseleave', () => clearMuscles());
      el.addEventListener('focus',      () => activateMuscles(el));
      el.addEventListener('blur',       () => clearMuscles());

      // Checkbox exercice individuel
      const check = el.querySelector('.ex-check');
      if (check) {
        const toggle = (e) => {
          e.stopPropagation();
          const checked = el.classList.toggle('is-checked');
          check.setAttribute('aria-checked', checked);
        };
        check.addEventListener('click', toggle);
        check.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e); }
        });
      }
    });
  }

  function activateMuscles(el) {
    clearMuscles();

    const primary   = JSON.parse(el.dataset.musclesPrimary   || '[]');
    const secondary = JSON.parse(el.dataset.musclesSecondary || '[]');
    const exName    = el.dataset.exName || '';

    // Résoudre les SVG IDs
    const svgPrimary   = new Set(primary.flatMap(m => MUSCLE_SVG_MAP[m] || []));
    const svgSecondary = new Set(secondary.flatMap(m => MUSCLE_SVG_MAP[m] || []));
    // Secondaires ne doivent pas écraser les primaires
    svgPrimary.forEach(id => svgSecondary.delete(id));

    // Appliquer les classes SVG
    svgPrimary.forEach(id => {
      document.querySelectorAll(`#${id}`).forEach(el => {
        el.classList.add('muscle-active-primary');
      });
    });
    svgSecondary.forEach(id => {
      document.querySelectorAll(`#${id}`).forEach(el => {
        el.classList.add('muscle-active-secondary');
      });
    });

    // Mettre à jour le tooltip
    updateTooltip(exName, primary, secondary);

    // Mettre à jour la légende
    updateLegend(svgPrimary, svgSecondary);
  }

  function clearMuscles() {
    ALL_SVG_MUSCLE_IDS.forEach(id => {
      document.querySelectorAll(`#${id}`).forEach(el => {
        el.classList.remove('muscle-active-primary', 'muscle-active-secondary');
      });
    });
    clearTooltip();
    clearLegend();
  }

  /* ----------------------------------------------------------
     TOOLTIP PANNEAU SVG
  ---------------------------------------------------------- */
  function updateTooltip(exName, primary, secondary) {
    const tooltip = document.getElementById('muscle-tooltip');
    if (!tooltip) return;

    const primaryTags = primary.map(m =>
      `<span class="tooltip-muscle-tag primary">${_muscleLabel(m)}</span>`
    ).join('');
    const secondaryTags = secondary.map(m =>
      `<span class="tooltip-muscle-tag">${_muscleLabel(m)}</span>`
    ).join('');

    tooltip.classList.add('has-content');
    tooltip.innerHTML = `
      <div class="tooltip-ex-name">${exName}</div>
      <div class="tooltip-muscles-list">
        ${primaryTags}${secondaryTags}
      </div>`;
  }

  function clearTooltip() {
    const tooltip = document.getElementById('muscle-tooltip');
    if (!tooltip) return;
    tooltip.classList.remove('has-content');
    tooltip.innerHTML = `<span class="tooltip-empty">Survolez un exercice pour voir les muscles ciblés</span>`;
  }

  /* ----------------------------------------------------------
     LÉGENDE SVG
  ---------------------------------------------------------- */
  function renderLegend() {
    const legendEl = document.getElementById('muscle-legend');
    if (!legendEl) return;

    legendEl.innerHTML = ALL_SVG_MUSCLE_IDS.map(id => `
      <div class="legend-item" id="legend-${id}">
        <div class="legend-dot"></div>
        <span>${MUSCLE_LABELS[id] || id}</span>
      </div>`
    ).join('');
  }

  function updateLegend(primary, secondary) {
    ALL_SVG_MUSCLE_IDS.forEach(id => {
      const item = document.getElementById(`legend-${id}`);
      if (!item) return;
      item.classList.toggle('is-active', primary.has(id) || secondary.has(id));
    });
  }

  function clearLegend() {
    ALL_SVG_MUSCLE_IDS.forEach(id => {
      document.getElementById(`legend-${id}`)?.classList.remove('is-active');
    });
  }

  /* ----------------------------------------------------------
     CHARGEMENT DU SVG BODY MAP
  ---------------------------------------------------------- */
  function loadBodySVG() {
    const wrap = document.getElementById('svg-body-wrap');
    if (!wrap) return;

    fetch('assets/body-map.svg')
      .then(r => r.text())
      .then(svgText => {
        wrap.innerHTML = svgText;
        svgLoaded = true;
      })
      .catch(() => {
        wrap.innerHTML = `<p style="color: var(--text-muted); font-size: 0.75rem; text-align: center; padding: 2rem;">
          Schéma non disponible
        </p>`;
      });
  }

  /* ----------------------------------------------------------
     BOUTON RESET
  ---------------------------------------------------------- */
  function bindReset() {
    const btn = document.getElementById('btn-reset');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (confirm('Réinitialiser votre profil et programme ?')) {
        Storage.resetAll();
        window.location.href = 'index.html';
      }
    });
  }

  /* ----------------------------------------------------------
     HELPERS
  ---------------------------------------------------------- */
  function _currentWeekKey() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const week  = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${week}`;
  }

  function _muscleLabel(muscleId) {
    const labels = {
      'pectoraux': 'Pec', 'pectoraux_haut': 'Pec haut',
      'deltoides_ant': 'Épaule', 'deltoides_post': 'Épaule arr.',
      'dorsaux': 'Dos', 'trapèzes': 'Trap.',
      'rhomboïdes': 'Rhomb.', 'lombaires': 'Lombo.',
      'biceps': 'Biceps', 'triceps': 'Triceps',
      'brachial': 'Brachial', 'avant_bras': 'Av.-bras',
      'core': 'Core', 'transverse': 'Transverse',
      'abdominaux': 'Abdos', 'droit_abdo': 'Droit abdo',
      'obliques': 'Obliques', 'fléchisseurs_hanche': 'Hanches',
      'quadriceps': 'Quad.', 'ischio_jambiers': 'Ischio.',
      'fessiers': 'Fessiers', 'mollets': 'Mollets', 'tibias': 'Tibias',
    };
    return labels[muscleId] || muscleId;
  }

  function _escapeAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ----------------------------------------------------------
     DÉMARRAGE
  ---------------------------------------------------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
