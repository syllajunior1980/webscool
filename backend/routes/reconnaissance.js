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

    const upload = await cloudinary.uploader.upload(photoBase64, {
      folder: "webscool/temp",
      resource_type: "image"
    });

    await cloudinary.uploader.destroy(upload.public_id);

    res.json({
      trouve: false,
      message: "Upload OK - cloud: " + process.env.CLOUDINARY_CLOUD_NAME
    });

  } catch (err) {
    console.error("Erreur:", err.message);
    res.status(500).json({ erreur: err.message });
  }
});

module.exports = router;