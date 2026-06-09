/* ============================================================
   FITFORGE — ENGINE.JS
   Moteur de calcul pur (zéro DOM)
   · Mifflin-St Jeor
   · Filtrage des exercices par niveau & matériel
   · Génération de la structure du programme hebdomadaire
   ============================================================ */

const Engine = (() => {

  /* ----------------------------------------------------------
     1. CALCUL CALORIQUE — Mifflin-St Jeor
     ----------------------------------------------------------
     BMR (homme) = 10×poids + 6.25×taille − 5×âge + 5
     BMR (femme) = 10×poids + 6.25×taille − 5×âge − 161
     TDEE = BMR × facteur d'activité
  ---------------------------------------------------------- */
  function calculerTDEE(profil) {
    const { age, poids, taille, genre, activite } = profil;
    const bmr = genre === 'homme'
      ? (10 * poids) + (6.25 * taille) - (5 * age) + 5
      : (10 * poids) + (6.25 * taille) - (5 * age) - 161;
    return Math.round(bmr * parseFloat(activite));
  }

  /* ----------------------------------------------------------
     2. OBJECTIF → ajustement calorique
  ---------------------------------------------------------- */
  function ajusterCalories(tdee, objectif) {
    const ajustements = {
      muscle:    +300,
      force:     +200,
      endurance:    0,
      seche:    -400,
      mobilite:     0,
    };
    return tdee + (ajustements[objectif] ?? 0);
  }

  /* ----------------------------------------------------------
     3. RÉPARTITION MACRO (g/jour) selon objectif
  ---------------------------------------------------------- */
  function calculerMacros(calories, objectif) {
    const ratios = {
      muscle:    { p: 0.30, l: 0.25, g: 0.45 },
      force:     { p: 0.30, l: 0.30, g: 0.40 },
      endurance: { p: 0.20, l: 0.25, g: 0.55 },
      seche:     { p: 0.40, l: 0.30, g: 0.30 },
      mobilite:  { p: 0.25, l: 0.30, g: 0.45 },
    };
    const r = ratios[objectif] || ratios.mobilite;
    return {
      proteines:  Math.round((calories * r.p) / 4),  // 4 kcal/g
      lipides:    Math.round((calories * r.l) / 9),  // 9 kcal/g
      glucides:   Math.round((calories * r.g) / 4),  // 4 kcal/g
    };
  }

  /* ----------------------------------------------------------
     4. FILTRAGE DES EXERCICES
     Retourne les exercices compatibles avec :
     · le matériel disponible (tableau)
     · le niveau (max_reps pour exercices poids de corps)
  ---------------------------------------------------------- */
  function filtrerExercices(exercices, profil) {
    const { materiel, niveau } = profil;
    const materielDispo = new Set(materiel);

    return exercices.filter(ex => {
      // Vérifier que le matériel requis est disponible
      const materielOK = ex.materiel_requis.every(m => materielDispo.has(m));
      if (!materielOK) return false;

      // Vérifier le niveau (prérequis de répétitions)
      const niv = ex.niveau;
      const exerciceKey = _getExerciceKey(ex.id);
      const maxUser = exerciceKey ? (niveau[exerciceKey] ?? 999) : 999;

      return maxUser >= niv.min_reps_prerequis && maxUser <= niv.max_reps_prerequis;
    });
  }

  /* Correspondance id → clé de niveau dans le profil */
  function _getExerciceKey(exId) {
    const map = {
      'pompes': 'pompes',
      'tractions': 'tractions',
      'squats': 'squats',
      'abdos': 'abdos',
    };
    for (const [keyword, key] of Object.entries(map)) {
      if (exId.toLowerCase().includes(keyword)) return key;
    }
    return null;
  }

  /* ----------------------------------------------------------
     5. CALCUL DES REPS CIBLES pour un exercice
  ---------------------------------------------------------- */
  function calculerRepsCibles(exercice, profil) {
    const niv = exercice.niveau;
    if (niv.ratio_max !== null) {
      const exerciceKey = _getExerciceKey(exercice.id);
      const maxUser = exerciceKey ? (profil.niveau[exerciceKey] ?? 10) : 10;
      return Math.max(1, Math.floor(maxUser * niv.ratio_max));
    }
    return niv.reps_cibles;
  }

  /* ----------------------------------------------------------
     6. GÉNÉRATION DU PROGRAMME HEBDOMADAIRE
     Structure selon nombre de séances & objectif
  ---------------------------------------------------------- */
  function genererProgramme(exercicesFiltres, profil) {
    const { seances, objectif } = profil;
    const nbSeances = parseInt(seances);

    // Schémas de split selon le nombre de séances
    const splits = _getSplit(nbSeances, objectif);

    const semaine = splits.map((jour, idx) => {
      const exDuJour = exercicesFiltres.filter(ex =>
        jour.categories.includes(ex.categorie)
      );

      const seanceEx = exDuJour.slice(0, jour.maxExercices).map(ex => ({
        ...ex,
        reps_cibles: calculerRepsCibles(ex, profil),
        series: ex.niveau.series_recommandees,
      }));

      return {
        jour: idx + 1,
        label: jour.label,
        type: jour.type,
        repos: jour.repos || false,
        exercices: seanceEx,
      };
    });

    return {
      genere_le: new Date().toISOString(),
      profil_snapshot: {
        objectif,
        seances: nbSeances,
        tdee: calculerTDEE(profil),
        calories_cibles: ajusterCalories(calculerTDEE(profil), objectif),
        macros: calculerMacros(
          ajusterCalories(calculerTDEE(profil), objectif),
          objectif
        ),
      },
      semaine,
    };
  }

  /* ----------------------------------------------------------
     7. DÉFINITION DES SPLITS
  ---------------------------------------------------------- */
  function _getSplit(nbSeances, objectif) {
    const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    // Splits prédéfinis par nombre de séances
    const templates = {
      2: [
        { label: 'Full Body A', type: 'fullbody', categories: ['poussée_haute','tirage_haut','jambes','core'], maxExercices: 5 },
        { label: 'Full Body B', type: 'fullbody', categories: ['poussée_haute','tirage_haut','jambes','core'], maxExercices: 5 },
      ],
      3: [
        { label: 'Push',  type: 'push',  categories: ['poussée_haute','poussée_basse'], maxExercices: 5 },
        { label: 'Pull',  type: 'pull',  categories: ['tirage_haut','tirage_bras'], maxExercices: 5 },
        { label: 'Legs',  type: 'legs',  categories: ['jambes','core'], maxExercices: 5 },
      ],
      4: [
        { label: 'Upper A', type: 'upper', categories: ['poussée_haute','tirage_haut','tirage_bras'], maxExercices: 6 },
        { label: 'Lower A', type: 'lower', categories: ['jambes','core'], maxExercices: 5 },
        { label: 'Upper B', type: 'upper', categories: ['poussée_haute','tirage_haut','poussée_basse'], maxExercices: 6 },
        { label: 'Lower B', type: 'lower', categories: ['jambes','core','tirage_bras'], maxExercices: 5 },
      ],
      5: [
        { label: 'Chest/Tri',  type: 'push',      categories: ['poussée_haute'], maxExercices: 5 },
        { label: 'Back/Bi',   type: 'pull',      categories: ['tirage_haut','tirage_bras'], maxExercices: 5 },
        { label: 'Legs',      type: 'legs',      categories: ['jambes'], maxExercices: 5 },
        { label: 'Shoulders', type: 'shoulders', categories: ['poussée_haute','deltoides'], maxExercices: 5 },
        { label: 'Core/Cond', type: 'core',      categories: ['core','poussée_basse'], maxExercices: 5 },
      ],
      6: [
        { label: 'Push A',   type: 'push',  categories: ['poussée_haute','poussée_basse'], maxExercices: 5 },
        { label: 'Pull A',   type: 'pull',  categories: ['tirage_haut','tirage_bras'], maxExercices: 5 },
        { label: 'Legs A',   type: 'legs',  categories: ['jambes'], maxExercices: 5 },
        { label: 'Push B',   type: 'push',  categories: ['poussée_haute','deltoides'], maxExercices: 5 },
        { label: 'Pull B',   type: 'pull',  categories: ['tirage_haut','core'], maxExercices: 5 },
        { label: 'Legs B',   type: 'legs',  categories: ['jambes','core'], maxExercices: 5 },
      ],
    };

    return templates[nbSeances] || templates[3];
  }

  /* --- API publique --- */
  return {
    calculerTDEE,
    ajusterCalories,
    calculerMacros,
    filtrerExercices,
    calculerRepsCibles,
    genererProgramme,
  };

})();
