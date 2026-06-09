/* ============================================================
   FITFORGE — ONBOARDING.JS
   Gestion du formulaire multi-étapes
   · Navigation entre étapes avec animations
   · Validation de chaque champ
   · Sauvegarde progressive dans localStorage
   · Redirection vers app.html si profil déjà complet
   ============================================================ */

(function () {
  'use strict';

  /* --- Config des étapes --- */
  const STEPS = [
    { id: 1, label: 'Profil',    tpl: 'tpl-step-1' },
    { id: 2, label: 'Niveau',   tpl: 'tpl-step-2' },
    { id: 3, label: 'Setup',    tpl: 'tpl-step-3' },
    { id: 4, label: 'Résumé',   tpl: 'tpl-step-4' },
  ];

  let currentStep = 1;

  /* --- Données du profil en cours de construction --- */
  let profileData = {
    age: null, poids: null, taille: null, genre: null, activite: null,
    niveau: { pompes: 10, tractions: 3, squats: 20, abdos: 15 },
    materiel: ['corps'],
    seances: null,
    objectif: null,
  };

  /* --------------------------------------------------------
     INIT
  -------------------------------------------------------- */
  function init() {
    // Si profil déjà complet, on saute l'onboarding
    if (Storage.hasValidProfile() && Storage.hasProgramme()) {
      window.location.href = 'app.html';
      return;
    }

    // Pré-remplir si données partielles existantes
    const saved = Storage.getProfile();
    if (saved) Object.assign(profileData, saved);

    renderProgressBar();
    renderStep(currentStep);
  }

  /* --------------------------------------------------------
     BARRE DE PROGRESSION
  -------------------------------------------------------- */
  function renderProgressBar() {
    const container = document.querySelector('.progress-steps');
    if (!container) return;

    container.innerHTML = STEPS.map(step => {
      let state = '';
      if (step.id < currentStep) state = 'done';
      else if (step.id === currentStep) state = 'active';

      const checkSvg = `<svg viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

      return `
        <div class="progress-step ${state}" role="listitem"
             aria-label="Étape ${step.id}: ${step.label}${state === 'done' ? ' (complète)' : state === 'active' ? ' (en cours)' : ''}">
          <div class="step-dot">${state === 'done' ? checkSvg : step.id}</div>
          <span class="step-label">${step.label}</span>
        </div>`;
    }).join('');
  }

  /* --------------------------------------------------------
     RENDU D'UNE ÉTAPE
  -------------------------------------------------------- */
  function renderStep(stepNum, direction = 'forward') {
    const container = document.getElementById('ob-step-container');
    const tplId = STEPS[stepNum - 1].tpl;
    const tpl = document.getElementById(tplId);
    if (!tpl || !container) return;

    // Cloner le template
    const clone = tpl.content.cloneNode(true);

    // Animation de sortie sur l'élément actuel
    const existing = container.querySelector('.ob-card');
    if (existing) {
      existing.classList.add('exiting');
      setTimeout(() => {
        container.innerHTML = '';
        container.appendChild(clone);
        afterRender(stepNum);
      }, 200);
    } else {
      container.appendChild(clone);
      afterRender(stepNum);
    }
  }

  /* --------------------------------------------------------
     APRÈS RENDU — Bind des events + pré-remplissage
  -------------------------------------------------------- */
  function afterRender(stepNum) {
    renderProgressBar();

    if (stepNum === 1) setupStep1();
    if (stepNum === 2) setupStep2();
    if (stepNum === 3) setupStep3();
    if (stepNum === 4) setupStep4();
  }

  /* --------------------------------------------------------
     ÉTAPE 1 — Biométrie
  -------------------------------------------------------- */
  function setupStep1() {
    // Pré-remplissage
    _setInputVal('age',      profileData.age);
    _setInputVal('poids',    profileData.poids);
    _setInputVal('taille',   profileData.taille);
    _setInputVal('activite', profileData.activite);
    if (profileData.genre) {
      const radio = document.getElementById(`genre-${profileData.genre[0]}`);
      if (radio) radio.checked = true;
    }

    document.getElementById('btn-next-1')
      .addEventListener('click', () => validateAndNext1());
  }

  function validateAndNext1() {
    const age      = parseInt(document.getElementById('age').value);
    const poids    = parseFloat(document.getElementById('poids').value);
    const taille   = parseInt(document.getElementById('taille').value);
    const genre    = document.querySelector('input[name="genre"]:checked')?.value;
    const activite = document.getElementById('activite').value;

    let valid = true;

    valid = _validateField('field-age',     !isNaN(age)    && age >= 14    && age <= 90)    && valid;
    valid = _validateField('field-poids',   !isNaN(poids)  && poids >= 30  && poids <= 250) && valid;
    valid = _validateField('field-taille',  !isNaN(taille) && taille >= 120 && taille <= 230) && valid;
    valid = _validateField('field-activite', !!activite)   && valid;

    if (!genre) {
      valid = false;
      // Feedback visuel sur le groupe radio
      const genreGroup = document.getElementById('field-genre');
      if (genreGroup) genreGroup.classList.add('has-error');
    }

    if (!valid) return;

    Object.assign(profileData, { age, poids, taille, genre, activite });
    Storage.setProfile(profileData);
    goToStep(2);
  }

  /* --------------------------------------------------------
     ÉTAPE 2 — Niveau
  -------------------------------------------------------- */
  function setupStep2() {
    const sliders = [
      { slider: 'slider-pompes',    val: 'val-pompes',    key: 'pompes' },
      { slider: 'slider-tractions', val: 'val-tractions', key: 'tractions' },
      { slider: 'slider-squats',    val: 'val-squats',    key: 'squats' },
      { slider: 'slider-abdos',     val: 'val-abdos',     key: 'abdos' },
    ];

    sliders.forEach(({ slider, val, key }) => {
      const sliderEl = document.getElementById(slider);
      const valEl    = document.getElementById(val);
      if (!sliderEl || !valEl) return;

      // Pré-remplir depuis profileData
      sliderEl.value = profileData.niveau[key] ?? sliderEl.value;
      valEl.textContent = sliderEl.value;

      // Mise à jour live
      sliderEl.addEventListener('input', () => {
        valEl.textContent = sliderEl.value;
        profileData.niveau[key] = parseInt(sliderEl.value);
        _updateSliderFill(sliderEl);
      });

      _updateSliderFill(sliderEl);
    });

    document.getElementById('btn-prev-2')?.addEventListener('click', () => goToStep(1));
    document.getElementById('btn-next-2')?.addEventListener('click', () => {
      Storage.setProfile(profileData);
      goToStep(3);
    });
  }

  /* Colorie la partie gauche du slider en orange */
  function _updateSliderFill(slider) {
    const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.background = `linear-gradient(to right, var(--accent) ${pct}%, var(--border-mid) ${pct}%)`;
  }

  /* --------------------------------------------------------
     ÉTAPE 3 — Matériel & disponibilité
  -------------------------------------------------------- */
  function setupStep3() {
    // Pré-remplir matériel
    profileData.materiel.forEach(m => {
      const cb = document.getElementById(`mat-${m}`);
      if (cb) cb.checked = true;
    });

    // Pré-remplir séances
    if (profileData.seances) {
      const radio = document.getElementById(`s${profileData.seances}`);
      if (radio) radio.checked = true;
    }

    // Pré-remplir objectif
    _setInputVal('objectif', profileData.objectif);

    document.getElementById('btn-prev-3')?.addEventListener('click', () => goToStep(2));
    document.getElementById('btn-next-3')?.addEventListener('click', () => validateAndNext3());
  }

  function validateAndNext3() {
    const checkboxes  = document.querySelectorAll('input[name="materiel"]:checked');
    const seanceRadio = document.querySelector('input[name="seances"]:checked');
    const objectif    = document.getElementById('objectif').value;

    const materiel = Array.from(checkboxes).map(cb => cb.value);
    if (!materiel.includes('corps')) materiel.push('corps');

    let valid = true;
    valid = _validateField('field-seances',  !!seanceRadio) && valid;
    valid = _validateField('field-objectif', !!objectif)    && valid;

    if (!valid) return;

    Object.assign(profileData, {
      materiel,
      seances:  parseInt(seanceRadio.value),
      objectif,
    });

    Storage.setProfile(profileData);
    goToStep(4);
  }

  /* --------------------------------------------------------
     ÉTAPE 4 — Résumé & génération
  -------------------------------------------------------- */
  function setupStep4() {
    // Résumé
    const summaryEl = document.getElementById('summary-content');
    if (summaryEl) {
      summaryEl.innerHTML = _buildSummaryHTML(profileData);
    }

    // Calories
    const tdee       = Engine.calculerTDEE(profileData);
    const cibles     = Engine.ajusterCalories(tdee, profileData.objectif);
    const calEl      = document.getElementById('calories-result');
    if (calEl) calEl.textContent = cibles.toLocaleString('fr-FR');

    document.getElementById('btn-prev-4')?.addEventListener('click', () => goToStep(3));
    document.getElementById('btn-generate')?.addEventListener('click', () => lancerGeneration());
  }

  function _buildSummaryHTML(p) {
    const genreLabel = p.genre === 'homme' ? 'Homme' : 'Femme';
    const materielLabels = {
      corps: 'Corps seul', halteres: 'Haltères',
      barre: 'Barre traction', elastiques: 'Élastiques',
    };
    const objetifLabels = {
      force: 'Gagner en force', muscle: 'Prise de masse',
      endurance: 'Endurance', seche: 'Sèche',  mobilite: 'Mobilité',
    };

    const items = [
      { k: 'Âge',       v: `${p.age} ans` },
      { k: 'Poids',     v: `${p.poids} kg` },
      { k: 'Taille',    v: `${p.taille} cm` },
      { k: 'Genre',     v: genreLabel },
      { k: 'Séances',   v: `${p.seances}×/sem` },
      { k: 'Objectif',  v: objetifLabels[p.objectif] || p.objectif },
      { k: 'Matériel',  v: p.materiel.map(m => materielLabels[m] || m).join(', ') },
      { k: 'Max pompes',    v: `${p.niveau.pompes} reps` },
      { k: 'Max tractions', v: `${p.niveau.tractions} reps` },
    ];

    return `<div class="summary-grid">
      ${items.map(item => `
        <div class="summary-item">
          <div class="summary-key">${item.k}</div>
          <div class="summary-val">${item.v}</div>
        </div>`).join('')}
    </div>`;
  }

  function lancerGeneration() {
    const btn = document.getElementById('btn-generate');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⚙️ Génération…';
    }

    // Charger exercices.json puis générer le programme
    fetch('data/exercices.json')
      .then(r => r.json())
      .then(data => {
        const exercicesFiltres = Engine.filtrerExercices(data.exercices, profileData);
        const programme = Engine.genererProgramme(exercicesFiltres, profileData);
        Storage.setProgramme(programme);
        Storage.setProfile(profileData);

        // Transition vers le dashboard
        document.getElementById('onboarding').style.opacity = '0';
        document.getElementById('onboarding').style.transition = 'opacity 0.4s ease';
        setTimeout(() => window.location.href = 'app.html', 400);
      })
      .catch(err => {
        console.error('[FitForge] Erreur chargement exercices.json', err);
        if (btn) {
          btn.disabled = false;
          btn.textContent = '⚠️ Erreur — Réessayer';
        }
      });
  }

  /* --------------------------------------------------------
     NAVIGATION
  -------------------------------------------------------- */
  function goToStep(num) {
    currentStep = num;
    renderStep(num);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* --------------------------------------------------------
     HELPERS
  -------------------------------------------------------- */
  function _setInputVal(id, val) {
    const el = document.getElementById(id);
    if (el && val !== null && val !== undefined) el.value = val;
  }

  function _validateField(fieldId, isValid) {
    const el = document.getElementById(fieldId);
    if (!el) return isValid;
    el.classList.toggle('has-error', !isValid);
    return isValid;
  }

  /* --------------------------------------------------------
     DÉMARRAGE
  -------------------------------------------------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
