const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const pool = require('../database');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

const uploadPhotos = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
    filename: (req, file, cb) => cb(null, file.originalname)
  })
});

router.post('/excel', upload.single('fichier'), async (req, res) => {
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    let importes = 0, erreurs = 0;
    for (const row of data) {
      try {
        const matricule = row['Matricule'] || row['matricule'] || '';
        const nom = row['Nom'] || row['nom'] || '';
        const prenom = row['Prenom'] || row['prenom'] || '';
        const classe = row['Classe'] || row['classe'] || '';
        const numero_extrait = row['N° Extrait'] || row['numero_extrait'] || '';
        const moyenne_t1 = row['Moy_T1'] || row['moyenne_t1'] || null;
        const moyenne_t2 = row['Moy_T2'] || row['moyenne_t2'] || null;
        const moyenne_t3 = row['Moy_T3'] || row['moyenne_t3'] || null;
        const moyenne_generale = row['Moy_Gen'] || row['moyenne_generale'] || null;
        const decision_fin_annee = row['Decision'] || row['decision_fin_annee'] || '';
        const nom_parent = row['Nom_Parent'] || row['nom_parent'] || '';
        const telephone1 = String(row['Telephone1'] || row['telephone1'] || '');
        const telephone2 = String(row['Telephone2'] || row['telephone2'] || '');
        const photo = matricule ? matricule + '.jpg' : '';

        await pool.query(
          `INSERT INTO eleves (matricule, nom, prenom, classe, numero_extrait, moyenne_t1, moyenne_t2, moyenne_t3, moyenne_generale, decision_fin_annee, photo, nom_parent, telephone1, telephone2)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
           ON CONFLICT (matricule) DO UPDATE SET
           nom=$2, prenom=$3, classe=$4, numero_extrait=$5, moyenne_t1=$6, moyenne_t2=$7,
           moyenne_t3=$8, moyenne_generale=$9, decision_fin_annee=$10, photo=$11,
           nom_parent=$12, telephone1=$13, telephone2=$14`,
          [matricule, nom, prenom, classe, numero_extrait, moyenne_t1, moyenne_t2, moyenne_t3, moyenne_generale, decision_fin_annee, photo, nom_parent, telephone1, telephone2]
        );
        importes++;
      } catch(e) { erreurs++; }
    }
    res.json({ success: true, importes, erreurs, total: data.length });
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

router.post('/photos', uploadPhotos.array('photos', 500), (req, res) => {
  res.json({ success: true, uploaded: req.files.length });
});

module.exports = router;
