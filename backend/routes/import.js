const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const pool = require('../database');

const photosDir = path.join(__dirname, '../uploads/photos');
if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, 'import_' + Date.now() + '.xlsx')
});
const upload = multer({ storage });

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, photosDir),
  filename: (req, file, cb) => cb(null, file.originalname)
});
const uploadPhotos = multer({ storage: photoStorage });

router.post('/excel', upload.single('fichier'), async (req, res) => {
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    let importes = 0;
    let erreurs = 0;
    for (const row of data) {
      try {
        const matricule = String(row['Matricule'] || row['matricule'] || '').trim();
        const nom = String(row['Nom'] || row['nom'] || '').trim();
        const prenom = String(row['Prenom'] || row['Prénom'] || row['prenom'] || '').trim();
        const classe = String(row['Classe'] || row['classe'] || '').trim();
        const numero_extrait = String(row['N° Extrait'] || row['Numéro Extrait'] || row['Numero Extrait'] || '').trim();
        const moyenne_t1 = parseFloat(row['Moy_T1'] || 0);
        const moyenne_t2 = parseFloat(row['Moy_T2'] || 0);
        const moyenne_t3 = parseFloat(row['Moy_T3'] || 0);
        const moyenne_generale = parseFloat(row['Moy_Gen'] || row['Moy_Generale'] || 0);
        const decision = String(row['Decision'] || row['Décision'] || '').trim();
        if (!matricule || !nom) { erreurs++; continue; }
        const extensions = ['.jpg', '.jpeg', '.png'];
        let photoUrl = null;
        for (const ext of extensions) {
          if (fs.existsSync(path.join(photosDir, matricule + ext))) {
            photoUrl = `/photos/${matricule}${ext}`;
            break;
          }
          if (fs.existsSync(path.join(photosDir, matricule.toLowerCase() + ext))) {
            photoUrl = `/photos/${matricule.toLowerCase()}${ext}`;
            break;
          }
        }
        await pool.query(`
          INSERT INTO eleves (matricule, nom, prenom, classe, numero_extrait, moyenne_t1, moyenne_t2, moyenne_t3, moyenne_generale, decision_fin_annee, photo)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          ON CONFLICT (matricule) DO UPDATE SET
            nom=$2, prenom=$3, classe=$4, numero_extrait=$5,
            moyenne_t1=$6, moyenne_t2=$7, moyenne_t3=$8,
            moyenne_generale=$9, decision_fin_annee=$10, photo=$11
        `, [matricule, nom, prenom, classe, numero_extrait, moyenne_t1, moyenne_t2, moyenne_t3, moyenne_generale, decision, photoUrl]);
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