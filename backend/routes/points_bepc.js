// routes/points_bepc.js
// Routes pour gérer les points BEPC (admis + refusés) avec tri alphabétique

const express = require('express');
const router = express.Router();
const { pool } = require('../database');

// GET /api/points-bepc/admis
// Liste des admis avec points, triée alphabétique (nom, prénom)
router.get('/admis', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT matricule, nom, prenom, points, classe, annee_session
       FROM points_bepc
       WHERE decision = 'Admis'
       ORDER BY UPPER(TRIM(nom)), UPPER(TRIM(prenom))`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur GET /admis :', err.message);
    res.status(500).json({ erreur: 'Erreur serveur lors de la récupération des admis' });
  }
});

// GET /api/points-bepc/refuses
// Liste des refusés avec points, triée alphabétique (nom, prénom)
router.get('/refuses', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT matricule, nom, prenom, points, classe, annee_session
       FROM points_bepc
       WHERE decision = 'Refusé'
       ORDER BY UPPER(TRIM(nom)), UPPER(TRIM(prenom))`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur GET /refuses :', err.message);
    res.status(500).json({ erreur: 'Erreur serveur lors de la récupération des refusés' });
  }
});

// GET /api/points-bepc/tout
// Liste complète (admis + refusés), triée alphabétique
router.get('/tout', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT matricule, nom, prenom, points, decision, classe, annee_session
       FROM points_bepc
       ORDER BY UPPER(TRIM(nom)), UPPER(TRIM(prenom))`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur GET /tout :', err.message);
    res.status(500).json({ erreur: 'Erreur serveur lors de la récupération de la liste' });
  }
});

// POST /api/points-bepc/importer
// Import en masse depuis le fichier Excel du ministère
// Body attendu : { candidats: [ { matricule, nom, prenom, points, decision, classe }, ... ] }
router.post('/importer', async (req, res) => {
  const { candidats } = req.body;

  if (!Array.isArray(candidats) || candidats.length === 0) {
    return res.status(400).json({ erreur: 'Aucun candidat à importer' });
  }

  const client = await pool.connect();
  let inseres = 0;
  let misAJour = 0;
  let erreurs = [];

  try {
    await client.query('BEGIN');

    for (const c of candidats) {
      const matricule = (c.matricule || '').toString().trim();
      const nom = (c.nom || '').toString().trim();
      const prenom = (c.prenom || '').toString().trim();
      const points = parseFloat(c.points);
      const decision = (c.decision || '').toString().trim();
      const classe = (c.classe || '').toString().trim() || null;
      const anneeSession = (c.annee_session || '2026').toString().trim();

      if (!matricule || !nom || isNaN(points) || !['Admis', 'Refusé'].includes(decision)) {
        erreurs.push({ matricule, raison: 'Données invalides ou incomplètes' });
        continue;
      }

      const result = await client.query(
        `INSERT INTO points_bepc (matricule, nom, prenom, points, decision, classe, annee_session)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (matricule, annee_session)
         DO UPDATE SET nom = $2, prenom = $3, points = $4, decision = $5, classe = $6
         RETURNING (xmax = 0) AS inserted`,
        [matricule, nom, prenom, points, decision, classe, anneeSession]
      );

      if (result.rows[0].inserted) {
        inseres++;
      } else {
        misAJour++;
      }
    }

    await client.query('COMMIT');

    res.json({
      succes: true,
      total: candidats.length,
      inseres,
      misAJour,
      erreurs: erreurs.length,
      detailErreurs: erreurs
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur POST /importer :', err.message);
    res.status(500).json({ erreur: 'Erreur serveur lors de l\'import' });
  } finally {
    client.release();
  }
});

module.exports = router;
