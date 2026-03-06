const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const path = require('path');
app.use('/photos', express.static(path.join(__dirname, 'uploads/photos')));

const elevesRoutes = require('./routes/eleves');
const importRoutes = require('./routes/import');

app.use('/api/eleves', elevesRoutes);
app.use('/api/import', importRoutes);

app.get('/', (req, res) => {
  res.json({ message: '🎓 Bienvenue sur WebScool !', version: '1.0.0', status: 'Serveur en marche ✅' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur WebScool démarré sur http://localhost:${PORT}`);
});
