const express = require('express');
const router = express.Router();
const pool = require('../database');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM eleves ORDER BY nom ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

router.get('/recherche', async (req, res) => {
  const { q } = req.query;
  try {
    const result = await pool.query(
      `SELECT * FROM eleves WHERE LOWER(nom) LIKE LOWER($1) OR LOWER(prenom) LIKE LOWER($1) OR LOWER(matricule) LIKE LOWER($1)`,
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

router.get('/classe/:classe', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM eleves WHERE classe = $1 ORDER BY nom ASC', [req.params.classe]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

router.get('/classes', async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT classe FROM eleves ORDER BY classe ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM eleves WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

router.post('/', async (req, res) => {
  const { matricule, nom, prenom, classe, numero_extrait, moyenne_t1, moyenne_t2, moyenne_t3, moyenne_generale, decision_fin_annee, photo, nom_parent, telephone1, telephone2 } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO eleves (matricule, nom, prenom, classe, numero_extrait, moyenne_t1, moyenne_t2, moyenne_t3, moyenne_generale, decision_fin_annee, photo, nom_parent, telephone1, telephone2) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [matricule, nom, prenom, classe, numero_extrait, moyenne_t1, moyenne_t2, moyenne_t3, moyenne_generale, decision_fin_annee, photo, nom_parent, telephone1, telephone2]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { matricule, nom, prenom, classe, numero_extrait, moyenne_t1, moyenne_t2, moyenne_t3, moyenne_generale, decision_fin_annee, photo, nom_parent, telephone1, telephone2 } = req.body;
  try {
    const result = await pool.query(
      `UPDATE eleves SET matricule=$1, nom=$2, prenom=$3, classe=$4, numero_extrait=$5, moyenne_t1=$6, moyenne_t2=$7, moyenne_t3=$8, moyenne_generale=$9, decision_fin_annee=$10, photo=$11, nom_parent=$12, telephone1=$13, telephone2=$14 WHERE id=$15 RETURNING *`,
      [matricule, nom, prenom, classe, numero_extrait, moyenne_t1, moyenne_t2, moyenne_t3, moyenne_generale, decision_fin_annee, photo, nom_parent, telephone1, telephone2, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM eleves WHERE id = $1', [req.params.id]);
    res.json({ message: 'Eleve supprime' });
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

module.exports = router;
