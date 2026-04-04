const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const pool = require('../database');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// Import complet élèves
router.post('/', upload.single('fichier'), async (req, res) => {
  if (!req.file) return res.status(400).json({ erreur: 'Aucun fichier' });
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    let importes = 0, erreurs = [];
    for (const row of data) {
      try {
        const matricule = String(row['Matricule'] || row['matricule'] || row['MATRICULE'] || '').trim();
        const nom = String(row['Nom'] || row['nom'] || row['NOM'] || '').trim();
        const prenom = String(row['Prenom'] || row['prenom'] || row['PRENOM'] || row['Prénom'] || row['prénom'] || '').trim();
        const classe = String(row['Classe'] || row['classe'] || row['CLASSE'] || '').trim();
        const numero_extrait = String(row['N° Extrait'] || row['numero_extrait'] || row['Extrait'] || '').trim();

        // Conversion sexe : Masculin→M, Feminin/Féminin→F
        const sexeBrut = String(row['Sexe'] || row['sexe'] || row['SEXE'] || '').trim();
        const sexe = sexeBrut === 'Masculin' ? 'M'
                   : sexeBrut === 'Feminin'  ? 'F'
                   : sexeBrut === 'Féminin'  ? 'F'
                   : sexeBrut === 'masculin' ? 'M'
                   : sexeBrut === 'feminin'  ? 'F'
                   : sexeBrut === 'féminin'  ? 'F'
                   : sexeBrut;

        const statut = String(row['Statut'] || row['statut'] || row['STATUT'] || '').trim();
        const qualite = String(row['Qualite'] || row['qualite'] || row['QUALITE'] || row['Qualité'] || row['qualité'] || '').trim();
        const moyenne_t1 = parseFloat(row['Moy_T1'] || row['moyenne_t1'] || row['Moyenne_T1'] || row['moyennes trimestres 1'] || row['Moyenne T1'] || '') || null;
        const moyenne_t2 = parseFloat(row['Moy_T2'] || row['moyenne_t2'] || row['Moyenne_T2'] || row['moyennes trimestres 2'] || row['Moyenne T2'] || '') || null;
        const moyenne_t3 = parseFloat(row['Moy_T3'] || row['moyenne_t3'] || row['Moyenne_T3'] || row['moyennes trimestres 3'] || row['Moyenne T3'] || '') || null;
        const moyenne_generale = parseFloat(row['Moy_Gen'] || row['moyenne_generale'] || row['Moyenne_Generale'] || row['Moyenne Generale'] || '') || null;
        const decision_fin_annee = String(row['Decision'] || row['decision_fin_annee'] || row['Décision'] || row['decision'] || '').trim();
        const nom_parent = String(row['Nom_Parent'] || row['nom_parent'] || row['Parent'] || row['parent'] || '').trim();
        const telephone1 = String(row['Telephone1'] || row['telephone1'] || row['Téléphone1'] || row['Tel1'] || row['Contact'] || row['contact'] || '').trim();
        const telephone2 = String(row['Telephone2'] || row['telephone2'] || row['Téléphone2'] || row['Tel2'] || '').trim();

        // Date et lieu de naissance
        const dateNaissanceBrut = row['DateNaiss'] || row['date_naissance'] || row['Date_Naissance'] || row['DateNaissance'] || row['Date Naissance'] || row['datenaissance'] || '';
        let date_naissance = null;
        if (dateNaissanceBrut) {
          // Gérer le format Excel (numéro de série) et les formats texte
          if (typeof dateNaissanceBrut === 'number') {
            // Conversion numéro de série Excel en date
            const d = new Date((dateNaissanceBrut - 25569) * 86400 * 1000);
            date_naissance = d.toISOString().split('T')[0];
          } else {
            const str = String(dateNaissanceBrut).trim();
            // Format JJ/MM/AAAA → AAAA-MM-JJ
            if (str.includes('/')) {
              const parts = str.split('/');
              if (parts.length === 3) date_naissance = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
            } else if (str.includes('-')) {
              date_naissance = str;
            }
          }
        }
        const lieu_naissance = String(row['LieuNaiss'] || row['lieu_naissance'] || row['Lieu_Naissance'] || row['LieuNaissance'] || row['Lieu Naissance'] || row['lieunaissance'] || '').trim();

        if (!nom || !prenom) continue;

        await pool.query(
          `INSERT INTO eleves (matricule, nom, prenom, classe, numero_extrait, sexe, statut, qualite, date_naissance, lieu_naissance, moyenne_t1, moyenne_t2, moyenne_t3, moyenne_generale, decision_fin_annee, nom_parent, telephone1, telephone2)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
           ON CONFLICT (matricule) DO UPDATE SET
             nom=EXCLUDED.nom, prenom=EXCLUDED.prenom, classe=EXCLUDED.classe,
             numero_extrait=EXCLUDED.numero_extrait,
             sexe=EXCLUDED.sexe, statut=EXCLUDED.statut, qualite=EXCLUDED.qualite,
             date_naissance=EXCLUDED.date_naissance, lieu_naissance=EXCLUDED.lieu_naissance,
             moyenne_t1=EXCLUDED.moyenne_t1, moyenne_t2=EXCLUDED.moyenne_t2,
             moyenne_t3=EXCLUDED.moyenne_t3, moyenne_generale=EXCLUDED.moyenne_generale,
             decision_fin_annee=EXCLUDED.decision_fin_annee,
             nom_parent=EXCLUDED.nom_parent, telephone1=EXCLUDED.telephone1, telephone2=EXCLUDED.telephone2`,
          [matricule, nom, prenom, classe, numero_extrait, sexe, statut, qualite, date_naissance, lieu_naissance, moyenne_t1, moyenne_t2, moyenne_t3, moyenne_generale, decision_fin_annee, nom_parent, telephone1, telephone2]
        );
        importes++;
      } catch (e) { erreurs.push(e.message); }
    }
    res.json({ importes, erreurs });
  } catch (err) { res.status(500).json({ erreur: err.message }); }
});

// Import trimestre
router.post('/trimestre', upload.single('fichier'), async (req, res) => {
  if (!req.file) return res.status(400).json({ erreur: 'Aucun fichier' });
  const trimestre = req.body.trimestre || 'T1';
  const colonneMap = { T1: 'moyenne_t1', T2: 'moyenne_t2', T3: 'moyenne_t3' };
  const colonne = colonneMap[trimestre];
  if (!colonne) return res.status(400).json({ erreur: 'Trimestre invalide' });
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    let mis_a_jour = 0, erreurs = [];
    for (const row of data) {
      try {
        const matricule = String(
          row['Matricule'] || row['matricule'] || row['MATRICULE'] || ''
        ).trim();

        let moyenne = null;
        if (trimestre === 'T1') {
          moyenne = parseFloat(
            row['moy_trim1'] || row['Moy_trim1'] || row['MOY_TRIM1'] ||
            row['Moyenne_T1'] || row['moyenne_t1'] || row['Moy_T1'] ||
            row['moyennes trimestres 1'] || row['Moyenne T1'] ||
            row['moyenne t1'] || row['Moyenne'] || row['moyenne'] || ''
          ) || null;
        } else if (trimestre === 'T2') {
          moyenne = parseFloat(
            row['moy_trim2'] || row['Moy_trim2'] || row['MOY_TRIM2'] ||
            row['Moyenne_T2'] || row['moyenne_t2'] || row['Moy_T2'] ||
            row['moyennes trimestres 2'] || row['Moyenne T2'] ||
            row['moyenne t2'] || row['Moyenne'] || row['moyenne'] || ''
          ) || null;
        } else if (trimestre === 'T3') {
          moyenne = parseFloat(
            row['moy_trim3'] || row['Moy_trim3'] || row['MOY_TRIM3'] ||
            row['Moyenne_T3'] || row['moyenne_t3'] || row['Moy_T3'] ||
            row['moyennes trimestres 3'] || row['Moyenne T3'] ||
            row['moyenne t3'] || row['Moyenne'] || row['moyenne'] || ''
          ) || null;
        }

        if (!matricule || moyenne === null) continue;
        const result = await pool.query(
          `UPDATE eleves SET ${colonne} = $1 WHERE matricule = $2`,
          [moyenne, matricule]
        );
        if (result.rowCount > 0) mis_a_jour++;
      } catch (e) { erreurs.push(e.message); }
    }
    res.json({ mis_a_jour, erreurs });
  } catch (err) { res.status(500).json({ erreur: err.message }); }
});

module.exports = router;
