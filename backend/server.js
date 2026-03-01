 const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = require('./database');

const elevesRoutes = require('./routes/eleves');
app.use('/api/eleves', elevesRoutes);
const importRoutes = require('./routes/import');
app.use('/api/import', importRoutes);

const path = require('path');
app.use('/photos', express.static(path.join(__dirname, 'uploads/photos')));app.get('/', (req, res) => {
  res.json({ message: '🎓 Bienvenue sur WebScool !', version: '1.0.0', status: 'Serveur en marche ✅' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur WebScool démarré sur http://localhost:${PORT}`);
});