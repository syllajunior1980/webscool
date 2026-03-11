const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inscriptions');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

router.post('/', async (req, res) => {
  const { eleve_id, montant, date_paiement } = req.body;
  try {
    const result = await pool.query('INSERT INTO inscriptions (eleve_id, montant, date_paiement) VALUES ($1, $2, $3) RETURNING *', [eleve_id, montant, date_paiement]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

router.delete('/:eleve_id', async (req, res) => {
  try {
    await pool.query('DELETE FROM inscriptions WHERE eleve_id = $1', [req.params.eleve_id]);
    res.json({ message: 'Paiement supprime' });
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

module.exports = router;
