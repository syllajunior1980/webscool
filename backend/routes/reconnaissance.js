const express = require('express');
const router = express.Router();
const pool = require('../database');
const faceapi = require('@vladmandic/face-api');
const canvas = require('canvas');
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
const path = require('path');
const https = require('https');

let modelsLoaded = false;
async function chargerModeles() {
  if (modelsLoaded) return;
  const modelsPath = path.join(__dirname, '../models');
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);
  modelsLoaded = true;
  console.log('Modeles face-api charges');
}
chargerModeles();

async function getDescripteurDepuisUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', async () => {
        try {
          const buf = Buffer.concat(chunks);
          const img = await canvas.loadImage(buf);
          const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
          resolve(detection ? detection.descriptor : null);
        } catch(e) { resolve(null); }
      });
      res.on('error', () => resolve(null));
    }).on('error', () => resolve(null));
  });
}

router.post('/reconnaitre', async (req, res) => {
  try {
    await chargerModeles();
    const { photoBase64 } = req.body;
    if (!photoBase64) return res.status(400).json({ erreur: 'Photo manquante' });

    const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '');
    const buf = Buffer.from(base64Data, 'base64');
    const imgQuery = await canvas.loadImage(buf);
    const detectionQuery = await faceapi.detectSingleFace(imgQuery).withFaceLandmarks().withFaceDescriptor();
    if (!detectionQuery) return res.json({ trouve: false, message: 'Aucun visage detecte dans la photo' });

    const result = await pool.query(
      'SELECT id, nom, prenom, matricule, classe, photo_url FROM eleves WHERE photo_url IS NOT NULL ORDER BY nom'
    );
    const eleves = result.rows;
    if (eleves.length === 0) return res.json({ trouve: false, message: 'Aucune photo dans la base' });

    let meilleur = null;
    let meilleurScore = Infinity;

    for (const eleve of eleves) {
      const desc = await getDescripteurDepuisUrl(eleve.photo_url);
      if (!desc) continue;
      const distance = faceapi.euclideanDistance(detectionQuery.descriptor, desc);
      if (distance < meilleurScore) {
        meilleurScore = distance;
        meilleur = eleve;
      }
    }

    if (meilleur && meilleurScore < 0.6) {
      res.json({
        trouve: true,
        score: Math.round((1 - meilleurScore) * 100),
        eleve: {
          nom: meilleur.nom,
          prenom: meilleur.prenom,
          matricule: meilleur.matricule,
          classe: meilleur.classe,
          photo_url: meilleur.photo_url
        }
      });
    } else {
      res.json({ trouve: false, message: 'Eleve non identifie', score: Math.round((1 - meilleurScore) * 100) });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: err.message });
  }
});

module.exports = router;