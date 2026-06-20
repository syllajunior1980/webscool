const express = require('express');
const router = express.Router();
const { pool } = require('../database');

// ───────────────────────────────────────────────
// POST /api/moyenne-orientation/importer
// Importe en masse les MGA depuis le fichier Excel
// (matricule, nom, prenoms, classe, math_mga, phch_mga, ang_mga, cf_mga)
// Si l'élève existe déjà, met à jour SEULEMENT les MGA (préserve les notes BEPC déjà saisies)
// ───────────────────────────────────────────────
router.post('/importer', async (req, res) => {
  const { eleves } = req.body;

  if (!Array.isArray(eleves) || eleves.length === 0) {
    return res.status(400).json({ error: 'Aucune donnée à importer' });
  }

  let importes = 0;
  const erreurs = [];

  for (const e of eleves) {
    try {
      const matricule = String(e.matricule || '').trim();
      const nom = String(e.nom || '').trim();
      const prenoms = String(e.prenoms || '').trim();
      const classe = String(e.classe || '').trim();
      const math_mga = parseFloat(e.math_mga);
      const phch_mga = parseFloat(e.phch_mga);
      const ang_mga = parseFloat(e.ang_mga);
      const cf_mga = parseFloat(e.cf_mga);

      if (!matricule || !nom || isNaN(math_mga) || isNaN(phch_mga) || isNaN(ang_mga) || isNaN(cf_mga)) {
        erreurs.push({ matricule: e.matricule, raison: 'Champs manquants ou invalides' });
        continue;
      }

      await pool.query(
        `INSERT INTO moyenne_orientation
           (matricule, nom, prenoms, classe, math_mga, phch_mga, ang_mga, cf_mga, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (matricule)
         DO UPDATE SET
           nom = EXCLUDED.nom,
           prenoms = EXCLUDED.prenoms,
           classe = EXCLUDED.classe,
           math_mga = EXCLUDED.math_mga,
           phch_mga = EXCLUDED.phch_mga,
           ang_mga = EXCLUDED.ang_mga,
           cf_mga = EXCLUDED.cf_mga,
           updated_at = NOW()`,
        [matricule, nom, prenoms, classe, math_mga, phch_mga, ang_mga, cf_mga]
      );
      importes++;
    } catch (err) {
      erreurs.push({ matricule: e.matricule, raison: err.message });
    }
  }

  res.json({ importes, erreurs: erreurs.length, details: erreurs });
});

// ───────────────────────────────────────────────
// Fonction utilitaire : calcule la moyenne d'orientation
// ───────────────────────────────────────────────
function calculerMoyenne(row) {
  const {
    math_mga, phch_mga, ang_mga, cf_mga,
    math_bepc, cf_bepc, phch_bepc, ang_oral_bepc, ang_ecrit_bepc
  } = row;

  const toutesNotesPresentes =
    math_bepc !== null && cf_bepc !== null && phch_bepc !== null &&
    ang_oral_bepc !== null && ang_ecrit_bepc !== null;

  if (!toutesNotesPresentes) {
    return { complet: false, moyenne_orientation: null, detail: null };
  }

  const noteMath = (parseFloat(math_mga) + parseFloat(math_bepc)) * 2;
  const noteCF = (parseFloat(cf_mga) + parseFloat(cf_bepc)) * 2;
  const notePhCh = (parseFloat(phch_mga) + parseFloat(phch_bepc)) * 1;
  const noteAngBepc = (parseFloat(ang_oral_bepc) + parseFloat(ang_ecrit_bepc)) / 2;
  const noteAng = (parseFloat(ang_mga) + noteAngBepc) * 1;

  const somme = noteMath + noteCF + notePhCh + noteAng;
  const moyenne = somme / 12;

  return {
    complet: true,
    moyenne_orientation: Math.round(moyenne * 100) / 100,
    detail: {
      math: Math.round(noteMath * 100) / 100,
      composition_francaise: Math.round(noteCF * 100) / 100,
      sciences_physiques: Math.round(notePhCh * 100) / 100,
      anglais: Math.round(noteAng * 100) / 100,
      note_anglais_bepc_moyenne: Math.round(noteAngBepc * 100) / 100
    }
  };
}

// ───────────────────────────────────────────────
// GET /api/moyenne-orientation/:matricule
// Renvoie les MGA + notes BEPC + photo + moyenne calculée si complète
// ───────────────────────────────────────────────
router.get('/:matricule', async (req, res) => {
  try {
    const matricule = req.params.matricule.trim();

    const result = await pool.query(
      `SELECT mo.*, e.photo_url
       FROM moyenne_orientation mo
       LEFT JOIN eleves e ON e.matricule = mo.matricule
       WHERE mo.matricule = $1`,
      [matricule]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Élève introuvable. Vérifiez le matricule.' });
    }

    const row = result.rows[0];
    const calcul = calculerMoyenne(row);

    res.json({
      matricule: row.matricule,
      nom: row.nom,
      prenoms: row.prenoms,
      classe: row.classe,
      photo_url: row.photo_url || null,
      mga: {
        math: row.math_mga,
        composition_francaise: row.cf_mga,
        sciences_physiques: row.phch_mga,
        anglais: row.ang_mga
      },
      notes_bepc: {
        math: row.math_bepc,
        composition_francaise: row.cf_bepc,
        sciences_physiques: row.phch_bepc,
        anglais_oral: row.ang_oral_bepc,
        anglais_ecrit: row.ang_ecrit_bepc
      },
      ...calcul
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───────────────────────────────────────────────
// PUT /api/moyenne-orientation/:matricule/notes
// Enregistre / modifie les notes BEPC (toujours modifiable)
// ───────────────────────────────────────────────
router.put('/:matricule/notes', async (req, res) => {
  try {
    const matricule = req.params.matricule.trim();
    const { math_bepc, cf_bepc, phch_bepc, ang_oral_bepc, ang_ecrit_bepc } = req.body;

    const existe = await pool.query(
      'SELECT id FROM moyenne_orientation WHERE matricule = $1',
      [matricule]
    );

    if (existe.rows.length === 0) {
      return res.status(404).json({ error: 'Élève introuvable. Importez d\'abord les MGA pour ce matricule.' });
    }

    const result = await pool.query(
      `UPDATE moyenne_orientation
       SET math_bepc = $1, cf_bepc = $2, phch_bepc = $3,
           ang_oral_bepc = $4, ang_ecrit_bepc = $5, updated_at = NOW()
       WHERE matricule = $6
       RETURNING *`,
      [math_bepc, cf_bepc, phch_bepc, ang_oral_bepc, ang_ecrit_bepc, matricule]
    );

    const row = result.rows[0];
    const calcul = calculerMoyenne(row);

    // ===== LIEN AVEC LA LISTE OFFICIELLE DES ORIENTÉS 2NDE =====
    // Dès que les 5 notes sont complètes, on met à jour automatiquement
    // la colonne orientation_seconde de l'élève dans la table eleves :
    // moyenne >= 10 → "Orienté", sinon → "Non orienté"
    if (calcul.complet) {
      const decisionOrientation = calcul.moyenne_orientation >= 10 ? 'Orienté' : 'Non orienté';
      try {
        await pool.query(
          'UPDATE eleves SET orientation_seconde = $1, moyenne_orientation_finale = $2 WHERE matricule = $3',
          [decisionOrientation, calcul.moyenne_orientation, matricule]
        );
      } catch (errLien) {
        console.error('⚠️ Erreur mise à jour orientation_seconde :', errLien.message);
      }
    }

    res.json({ message: 'Notes enregistrées', ...calcul });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───────────────────────────────────────────────
// POST /api/moyenne-orientation/importer-officiel
// Import en masse depuis le fichier du ministère (DECO) : Matricule + Moyenne déjà calculée
// Met à jour directement orientation_seconde (>=10 → Orienté) et moyenne_orientation_finale
// sur la table eleves — sans passer par les MGA / notes BEPC individuelles
// ───────────────────────────────────────────────
router.post('/importer-officiel', async (req, res) => {
  const { eleves } = req.body;

  if (!Array.isArray(eleves) || eleves.length === 0) {
    return res.status(400).json({ error: 'Aucune donnée à importer' });
  }

  let misAJour = 0;
  const erreurs = [];

  for (const e of eleves) {
    try {
      const matricule = String(e.matricule || '').trim();
      const moyenne = parseFloat(e.moyenne);

      if (!matricule || isNaN(moyenne)) {
        erreurs.push({ matricule: e.matricule, raison: 'Matricule ou moyenne invalide' });
        continue;
      }

      const decision = moyenne >= 10 ? 'Orienté' : 'Non orienté';
      const result = await pool.query(
        `UPDATE eleves SET orientation_seconde = $1, moyenne_orientation_finale = $2 WHERE matricule = $3`,
        [decision, moyenne, matricule]
      );

      if (result.rowCount === 0) {
        erreurs.push({ matricule, raison: 'Matricule introuvable dans la base élèves' });
        continue;
      }
      misAJour++;
    } catch (err) {
      erreurs.push({ matricule: e.matricule, raison: err.message });
    }
  }

  res.json({ misAJour, erreurs: erreurs.length, details: erreurs.slice(0, 20) });
});

module.exports = router;
