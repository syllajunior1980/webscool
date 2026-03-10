const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// GET tous les paiements
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('inscriptions')
      .select('*');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

// POST enregistrer un paiement
router.post('/', async (req, res) => {
  const { eleve_id, montant, date_paiement } = req.body;
  try {
    const { data, error } = await supabase
      .from('inscriptions')
      .insert([{ eleve_id, montant, date_paiement }])
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

// DELETE annuler un paiement
router.delete('/:eleve_id', async (req, res) => {
  const { eleve_id } = req.params;
  try {
    const { error } = await supabase
      .from('inscriptions')
      .delete()
      .eq('eleve_id', eleve_id);
    if (error) throw error;
    res.json({ message: 'Paiement supprimé' });
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

module.exports = router;
