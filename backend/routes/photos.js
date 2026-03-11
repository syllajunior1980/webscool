const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const { Pool } = require('pg');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Upload une photo pour un élève (par matricule)
router.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    const { matricule } = req.body;
    if (!req.file || !matricule) {
      return res.status(400).json({ erreur: 'Photo et matricule requis' });
    }

    // Upload vers Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          public_id: `webscool/eleves/${matricule}`,
          overwrite: true,
          folder: 'webscool',
          transformation: [{ width: 300, height: 400, crop: 'fill', gravity: 'face' }]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    // Mettre à jour la colonne photo_url dans la base
    await pool.query(
      'UPDATE eleves SET photo_url = $1 WHERE UPPER(matricule) = UPPER($2)',
      [result.secure_url, matricule]
    );

    res.json({ success: true, photo_url: result.secure_url, matricule });
  } catch (err) {
    console.error('Erreur upload photo:', err);
    res.status(500).json({ erreur: err.message });
  }
});

// Upload groupé : plusieurs photos à la fois
router.post('/upload-multiple', upload.array('photos', 100), async (req, res) => {
  const resultats = [];
  const erreurs = [];

  for (const file of req.files) {
    try {
      // Nom du fichier = matricule (ex: 21421986V.JPG)
      const matricule = file.originalname.replace(/\.[^/.]+$/, '').toUpperCase();

      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            public_id: `webscool/eleves/${matricule}`,
            overwrite: true,
            transformation: [{ width: 300, height: 400, crop: 'fill', gravity: 'face' }]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(file.buffer);
      });

      await pool.query(
        'UPDATE eleves SET photo_url = $1 WHERE UPPER(matricule) = UPPER($2)',
        [result.secure_url, matricule]
      );

      resultats.push({ matricule, photo_url: result.secure_url });
    } catch (err) {
      erreurs.push({ fichier: file.originalname, erreur: err.message });
    }
  }

  res.json({
    success: true,
    uploaded: resultats.length,
    erreurs: erreurs.length,
    details_erreurs: erreurs
  });
});

module.exports = router;
