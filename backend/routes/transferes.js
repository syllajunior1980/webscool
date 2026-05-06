const express = require('express');
const router = express.Router();
const { pool } = require('../database');

// Migration auto de la table transferes
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transferes (
        id SERIAL PRIMARY KEY,
        matricule VARCHAR(20),
        nom VARCHAR(100) NOT NULL,
        prenoms VARCHAR(150) NOT NULL,
        niveau VARCHAR(10) NOT NULL,
        lv2 VARCHAR(10),
        etaborigine VARCHAR(200),
        etabfin VARCHAR(200),
        sexe VARCHAR(10),
        date_naissance DATE,
        lieu_naissance VARCHAR(150),
        nom_parent VARCHAR(150),
        telephone1 VARCHAR(20),
        dfa VARCHAR(20),
        classe_attribuee VARCHAR(50),
        valide BOOLEAN DEFAULT FALSE,
        date_import TIMESTAMP DEFAULT NOW(),
        date_validation TIMESTAMP
      )
    `);
  } catch (err) {
    console.error('⚠️ Migration transferes:', err.message);
  }
})();

// GET tous les transférés non encore validés
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM transferes WHERE valide = FALSE ORDER BY niveau, nom, prenoms`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

// GET effectifs par classe (élèves existants + transférés validés)
router.get('/effectifs', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT classe, COUNT(*) as nb
       FROM eleves
       WHERE classe IS NOT NULL AND classe != ''
       GROUP BY classe
       ORDER BY classe`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

// POST importer une liste de transférés depuis Excel (JSON rows)
router.post('/importer', async (req, res) => {
  const { rows } = req.body;
  if (!rows || !Array.isArray(rows)) {
    return res.status(400).json({ erreur: 'Données invalides' });
  }

  let importes = 0;
  let doublons = 0;
  let erreurs = [];

  for (const row of rows) {
    const nom = (row.nom || row.NOM || row.Nom || '').toString().trim().toUpperCase();
    const prenoms = (row.prenoms || row.PRENOMS || row.Prenoms || row.prenom || row.PRENOM || '').toString().trim();
    const niveau = (row.niveau || row.NIVEAU || row.Niveau || '').toString().trim().toUpperCase();
    const matricule = (row.matricule || row.MATRICULE || '').toString().trim();
    const lv2 = (row.lv2 || row.LV2 || '').toString().trim() || null;
    const etaborigine = (row.etaborigine || row.ETABORIGINE || row.etablissement_origine || '').toString().trim();
    const etabfin = (row.etabfin || row.ETABFIN || '').toString().trim();

    if (!nom || !prenoms || !niveau) continue;

    try {
      // Vérifier doublon dans transferes (même nom+prénoms non validé)
      const existeTransfere = await pool.query(
        `SELECT id FROM transferes WHERE UPPER(nom)=$1 AND UPPER(prenoms)=$2 AND valide=FALSE`,
        [nom, prenoms.toUpperCase()]
      );
      if (existeTransfere.rows.length > 0) {
        doublons++;
        continue;
      }

      await pool.query(
        `INSERT INTO transferes (matricule, nom, prenoms, niveau, lv2, etaborigine, etabfin)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [matricule || null, nom, prenoms, niveau, lv2, etaborigine, etabfin]
      );
      importes++;
    } catch (err) {
      erreurs.push(`${nom} ${prenoms}: ${err.message}`);
    }
  }

  res.json({ importes, doublons, erreurs });
});

// PUT mettre à jour DFA et/ou LV2 d'un transféré
router.put('/:id', async (req, res) => {
  const { dfa, lv2, sexe, nom_parent, telephone1, date_naissance, lieu_naissance } = req.body;
  try {
    await pool.query(
      `UPDATE transferes SET dfa=$1, lv2=$2, sexe=$3, nom_parent=$4, telephone1=$5,
       date_naissance=$6, lieu_naissance=$7 WHERE id=$8`,
      [dfa || null, lv2 || null, sexe || null, nom_parent || null,
       telephone1 || null, date_naissance || null, lieu_naissance || null, req.params.id]
    );
    const result = await pool.query(`SELECT * FROM transferes WHERE id=$1`, [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

// POST valider un transféré → l'ajouter dans la liste générale des élèves
router.post('/:id/valider', async (req, res) => {
  const { classe } = req.body;
  if (!classe) return res.status(400).json({ erreur: 'Classe obligatoire' });

  try {
    // Récupérer le transféré
    const t = await pool.query(`SELECT * FROM transferes WHERE id=$1`, [req.params.id]);
    if (t.rows.length === 0) return res.status(404).json({ erreur: 'Transféré introuvable' });
    const tr = t.rows[0];

    // Vérifier doublon dans la classe de destination (même nom+prénom)
    const doublon = await pool.query(
      `SELECT id FROM eleves
       WHERE UPPER(nom)=$1 AND UPPER(prenom)=$2 AND classe=$3`,
      [tr.nom.toUpperCase(), tr.prenoms.toUpperCase(), classe]
    );
    if (doublon.rows.length > 0) {
      return res.status(409).json({
        erreur: `⚠️ DOUBLON : ${tr.nom} ${tr.prenoms} existe déjà dans la classe ${classe} !`,
        doublon: true
      });
    }

    // Déterminer la nouvelle classe selon niveau + DFA
    const dfa = tr.dfa || 'Admis';

    // Insérer dans la table eleves
    const insertion = await pool.query(
      `INSERT INTO eleves
        (matricule, nom, prenom, classe, sexe, statut, qualite, lv2,
         decision_fin_annee, nom_parent, telephone1, date_naissance, lieu_naissance)
       VALUES ($1,$2,$3,$4,$5,'Affecté','Transféré entrant',$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        tr.matricule || null,
        tr.nom,
        tr.prenoms,
        classe,
        tr.sexe || null,
        tr.lv2 || null,
        dfa,
        tr.nom_parent || null,
        tr.telephone1 || null,
        tr.date_naissance || null,
        tr.lieu_naissance || null,
      ]
    );

    // Marquer comme validé
    await pool.query(
      `UPDATE transferes SET valide=TRUE, classe_attribuee=$1, date_validation=NOW() WHERE id=$2`,
      [classe, req.params.id]
    );

    res.json({ succes: true, eleve: insertion.rows[0] });
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

// DELETE supprimer un transféré de la liste d'attente
router.delete('/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM transferes WHERE id=$1`, [req.params.id]);
    res.json({ succes: true });
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

module.exports = router;
