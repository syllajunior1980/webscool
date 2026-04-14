const express = require("express");
const router = express.Router();
const pool = require("../database");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

router.post("/reconnaissance", async (req, res) => {
  try {
    const { photoBase64 } = req.body;
    if (!photoBase64) return res.status(400).json({ erreur: "Photo manquante" });

    // Upload photo temporaire
    const upload = await cloudinary.uploader.upload(photoBase64, {
      folder: "webscool/temp",
      resource_type: "image"
    });

    // Supprimer la photo temp
    await cloudinary.uploader.destroy(upload.public_id);

    // Retourner message OK pour test
    res.json({
      trouve: false,
      message: "Photo recue et uploadee OK sur Cloudinary",
      url: upload.secure_url
    });

  } catch (err) {
    console.error("Erreur reconnaissance:", err.message);
    res.status(500).json({ erreur: err.message });
  }
});

module.exports = router;