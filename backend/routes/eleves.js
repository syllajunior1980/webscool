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
    const result = await pool.query(
      'SELECT * FROM eleves WHERE classe = $1 ORDER BY nom ASC',
      [req.params.classe]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

router.get('/:matricule', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM eleves WHERE matricule = $1',
      [req.params.matricule]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ erreur: 'Élève non trouvé' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

module.exports = router;
