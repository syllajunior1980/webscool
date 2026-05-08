const express = require('express');
const router = express.Router();
const { pool } = require('../database');

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        classe, sexe,
        qualite,
        decision_fin_annee
      FROM eleves
      WHERE classe IS NOT NULL AND classe != ''
    `);

    const CLASSES_6 = ['6ème1','6ème2','6ème3','6ème4','6ème5','6ème6','6ème7','6ème8'];
    const CLASSES_5 = ['5ème1','5ème2','5ème3','5ème4','5ème5'];
    const CLASSES_4 = ['4ème1','4ème2','4ème3','4ème4','4ème5'];
    const CLASSES_3 = ['3ème1','3ème2','3ème3','3ème4','3ème5','3ème6','3ème7'];
    const TOUTES = [...CLASSES_6, ...CLASSES_5, ...CLASSES_4, ...CLASSES_3];

    const NIVEAUX = {
      '6ème': CLASSES_6,
      '5ème': CLASSES_5,
      '4ème': CLASSES_4,
      '3ème': CLASSES_3,
    };

    const vide = () => ({ g: 0, f: 0, t: 0 });
    const add = (obj, sexe) => {
      obj.t++;
      if (sexe === 'M' || sexe === 'Masculin' || sexe === 'G') obj.g++;
      else obj.f++;
    };

    // ── TABLEAU 1 : Qualité élève ──────────────────────────────────────────
    const t1Classes = {};
    TOUTES.forEach(cl => {
      t1Classes[cl] = {
        effectif: vide(),
        redoublants: vide(),
        non_redoublants: vide(),
      };
    });

    for (const e of rows) {
      const cl = e.classe;
      if (!t1Classes[cl]) continue;
      const d = t1Classes[cl];
      add(d.effectif, e.sexe);
      const estRedoublant = (e.qualite || '').toLowerCase().includes('redoublant');
      if (estRedoublant) add(d.redoublants, e.sexe);
      else add(d.non_redoublants, e.sexe);
    }

    const t1SousTotal = {};
    for (const [niv, classes] of Object.entries(NIVEAUX)) {
      const st = { effectif: vide(), redoublants: vide(), non_redoublants: vide() };
      for (const cl of classes) {
        const d = t1Classes[cl];
        if (!d) continue;
        ['effectif','redoublants','non_redoublants'].forEach(k => {
          st[k].g += d[k].g; st[k].f += d[k].f; st[k].t += d[k].t;
        });
      }
      t1SousTotal[niv] = st;
    }
    const t1Total = { effectif: vide(), redoublants: vide(), non_redoublants: vide() };
    for (const st of Object.values(t1SousTotal)) {
      ['effectif','redoublants','non_redoublants'].forEach(k => {
        t1Total[k].g += st[k].g; t1Total[k].f += st[k].f; t1Total[k].t += st[k].t;
      });
    }

    // ── TABLEAU 2 : Résultats scolaires (DFA) ─────────────────────────────
    const t2Classes = {};
    TOUTES.forEach(cl => {
      t2Classes[cl] = {
        effectif: vide(),
        admis: vide(),
        redoubles: vide(),
        exclus: vide(),
      };
    });

    for (const e of rows) {
      const cl = e.classe;
      if (!t2Classes[cl]) continue;
      const d = t2Classes[cl];
      add(d.effectif, e.sexe);
      const dfa = (e.decision_fin_annee || '').toLowerCase();
      if (dfa.includes('admis') || dfa === 'passage') add(d.admis, e.sexe);
      else if (dfa.includes('redoub')) add(d.redoubles, e.sexe);
      else if (dfa.includes('exclu') || dfa.includes('renvoy')) add(d.exclus, e.sexe);
    }

    const t2SousTotal = {};
    for (const [niv, classes] of Object.entries(NIVEAUX)) {
      const st = { effectif: vide(), admis: vide(), redoubles: vide(), exclus: vide() };
      for (const cl of classes) {
        const d = t2Classes[cl];
        if (!d) continue;
        ['effectif','admis','redoubles','exclus'].forEach(k => {
          st[k].g += d[k].g; st[k].f += d[k].f; st[k].t += d[k].t;
        });
      }
      t2SousTotal[niv] = st;
    }
    const t2Total = { effectif: vide(), admis: vide(), redoubles: vide(), exclus: vide() };
    for (const st of Object.values(t2SousTotal)) {
      ['effectif','admis','redoubles','exclus'].forEach(k => {
        t2Total[k].g += st[k].g; t2Total[k].f += st[k].f; t2Total[k].t += st[k].t;
      });
    }

    // ── TABLEAU 3 : BEPC (classes de 3ème uniquement) ─────────────────────
    const t3Classes = {};
    CLASSES_3.forEach(cl => {
      t3Classes[cl] = {
        inscrits: vide(),
        admis: vide(),
        orientes: vide(),
      };
    });

    for (const e of rows) {
      const cl = e.classe;
      if (!t3Classes[cl]) continue;
      const d = t3Classes[cl];
      add(d.inscrits, e.sexe);
      const dfa = (e.decision_fin_annee || '').toLowerCase();
      if (dfa.includes('admis bepc') || dfa.includes('bepc')) add(d.admis, e.sexe);
      if (dfa.includes('orient') || dfa.includes('2nde') || dfa.includes('seconde')) add(d.orientes, e.sexe);
    }

    const t3Total = { inscrits: vide(), admis: vide(), orientes: vide() };
    for (const d of Object.values(t3Classes)) {
      ['inscrits','admis','orientes'].forEach(k => {
        t3Total[k].g += d[k].g; t3Total[k].f += d[k].f; t3Total[k].t += d[k].t;
      });
    }

    res.json({
      tableau1: { classes: t1Classes, sousTotal: t1SousTotal, total: t1Total },
      tableau2: { classes: t2Classes, sousTotal: t2SousTotal, total: t2Total },
      tableau3: { classes: t3Classes, total: t3Total },
    });

  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

module.exports = router;
