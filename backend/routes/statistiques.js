const express = require('express');
const router = express.Router();
const { pool } = require('../database');

// GET /api/statistiques
router.get('/', async (req, res) => {
  try {
    // ── Toutes les classes connues ──
    const CLASSES_6 = ['6ème1','6ème2','6ème3','6ème4','6ème5','6ème6','6ème7','6ème8'];
    const CLASSES_5 = ['5ème1','5ème2','5ème3','5ème4','5ème5'];
    const CLASSES_4 = ['4ème1','4ème2','4ème3','4ème4','4ème5'];
    const CLASSES_3 = ['3ème1','3ème2','3ème3','3ème4','3ème5','3ème6','3ème7'];
    const TOUTES = [...CLASSES_6,...CLASSES_5,...CLASSES_4,...CLASSES_3];

    // ── Requête principale ──
    const { rows } = await pool.query(`
      SELECT
        classe,
        sexe,
        qualite,
        decision_fin_annee,
        resultat_bepc,
        orientation_seconde
      FROM eleves
      WHERE classe IS NOT NULL
    `);

    // ── Helpers ──
    const cnt = (list, pred) => list.filter(pred).length;
    const row3 = (list) => ({
      g: cnt(list, e=>e.sexe==='M'),
      f: cnt(list, e=>e.sexe==='F'),
      t: list.length
    });

    // ════════════════════════════════════
    // TABLEAU 1 — QUALITE ELEVE
    // ════════════════════════════════════
    const qualite1 = {};
    for (const cl of TOUTES) {
      const ens = rows.filter(e=>e.classe===cl);
      const redb = ens.filter(e=>e.qualite==='Redoublant');
      const nredb = ens.filter(e=>e.qualite!=='Redoublant');
      qualite1[cl] = {
        effectif: row3(ens),
        redoublants: row3(redb),
        non_redoublants: row3(nredb),
      };
    }

    // Sous-totaux
    const stQ1 = (classes) => {
      const ens = rows.filter(e=>classes.includes(e.classe));
      const redb = ens.filter(e=>e.qualite==='Redoublant');
      const nredb = ens.filter(e=>e.qualite!=='Redoublant');
      return { effectif: row3(ens), redoublants: row3(redb), non_redoublants: row3(nredb) };
    };

    const sousTotal1 = {
      '6ème': stQ1(CLASSES_6),
      '5ème': stQ1(CLASSES_5),
      '4ème': stQ1(CLASSES_4),
      '3ème': stQ1(CLASSES_3),
    };
    const total1 = stQ1(TOUTES);

    // ════════════════════════════════════
    // TABLEAU 2 — RESULTATS SCOLAIRES DFA
    // ════════════════════════════════════
    const dfa2 = {};
    for (const cl of TOUTES) {
      const ens = rows.filter(e=>e.classe===cl);
      dfa2[cl] = {
        effectif:    row3(ens),
        admis:       row3(ens.filter(e=>e.decision_fin_annee==='Admis')),
        redoubles:   row3(ens.filter(e=>e.decision_fin_annee==='Redoublant')),
        exclus:      row3(ens.filter(e=>e.decision_fin_annee==='Exclu')),
      };
    }

    const stD2 = (classes) => {
      const ens = rows.filter(e=>classes.includes(e.classe));
      return {
        effectif:  row3(ens),
        admis:     row3(ens.filter(e=>e.decision_fin_annee==='Admis')),
        redoubles: row3(ens.filter(e=>e.decision_fin_annee==='Redoublant')),
        exclus:    row3(ens.filter(e=>e.decision_fin_annee==='Exclu')),
      };
    };

    const sousTotal2 = {
      '6ème': stD2(CLASSES_6),
      '5ème': stD2(CLASSES_5),
      '4ème': stD2(CLASSES_4),
      '3ème': stD2(CLASSES_3),
    };
    const total2 = stD2(TOUTES);

    // ════════════════════════════════════
    // TABLEAU 3 — BEPC
    // ════════════════════════════════════
    const bepc3 = {};
    for (const cl of CLASSES_3) {
      const ens = rows.filter(e=>e.classe===cl);
      bepc3[cl] = {
        inscrits:  row3(ens),
        admis:     row3(ens.filter(e=>e.resultat_bepc==='Admis')),
        orientes:  row3(ens.filter(e=>e.orientation_seconde==='Orienté')),
      };
    }

    const ens3 = rows.filter(e=>CLASSES_3.includes(e.classe));
    const total3 = {
      inscrits: row3(ens3),
      admis:    row3(ens3.filter(e=>e.resultat_bepc==='Admis')),
      orientes: row3(ens3.filter(e=>e.orientation_seconde==='Orienté')),
    };

    res.json({
      tableau1: { classes: qualite1, sousTotal: sousTotal1, total: total1 },
      tableau2: { classes: dfa2, sousTotal: sousTotal2, total: total2 },
      tableau3: { classes: bepc3, total: total3 },
    });

  } catch (err) {
    console.error('Stats erreur:', err);
    res.status(500).json({ erreur: err.message });
  }
});

module.exports = router;
