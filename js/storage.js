/* ============================================================
   FITFORGE — STORAGE.JS
   Wrapper localStorage : get / set / reset / helpers
   ============================================================ */

const Storage = (() => {
  const KEYS = {
    PROFILE:    'ff_profile',
    PROGRAMME:  'ff_programme',
    PROGRESS:   'ff_progress',
    VERSION:    'ff_version',
  };

  const CURRENT_VERSION = '1.0';

  /* --- Init : vérification de version --- */
  function init() {
    const storedVersion = localStorage.getItem(KEYS.VERSION);
    if (storedVersion !== CURRENT_VERSION) {
      // Migration future possible ici
      localStorage.setItem(KEYS.VERSION, CURRENT_VERSION);
    }
  }

  /* --- Getters / Setters génériques --- */
  function get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn(`[Storage] Erreur lecture "${key}"`, e);
      return null;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn(`[Storage] Erreur écriture "${key}"`, e);
      return false;
    }
  }

  function remove(key) {
    localStorage.removeItem(key);
  }

  /* --- API publique spécifique --- */
  function getProfile()           { return get(KEYS.PROFILE); }
  function setProfile(data)       { return set(KEYS.PROFILE, data); }

  function getProgramme()         { return get(KEYS.PROGRAMME); }
  function setProgramme(data)     { return set(KEYS.PROGRAMME, data); }

  function getProgress()          { return get(KEYS.PROGRESS) || {}; }
  function setProgress(data)      { return set(KEYS.PROGRESS, data); }

  /* Marquer une séance comme complétée */
  function markSeanceDone(weekKey, dayKey) {
    const progress = getProgress();
    if (!progress[weekKey]) progress[weekKey] = {};
    progress[weekKey][dayKey] = { done: true, date: new Date().toISOString() };
    return setProgress(progress);
  }

  /* --- Reset complet (re-onboarding) --- */
  function resetAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    localStorage.setItem(KEYS.VERSION, CURRENT_VERSION);
  }

  /* --- Vérification : profil complet ? --- */
  function hasValidProfile() {
    const p = getProfile();
    if (!p) return false;
    return !!(p.age && p.poids && p.taille && p.genre && p.activite
           && p.niveau && p.materiel && p.seances && p.objectif);
  }

  /* --- Vérification : programme généré ? --- */
  function hasProgramme() {
    return !!getProgramme();
  }

  init();

  return {
    KEYS,
    get,
    set,
    remove,
    getProfile,
    setProfile,
    getProgramme,
    setProgramme,
    getProgress,
    setProgress,
    markSeanceDone,
    resetAll,
    hasValidProfile,
    hasProgramme,
  };
})();
