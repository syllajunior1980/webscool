require('dotenv').config();
const pool = require('./database');

async function creerTables() {
  try {
    // ============================================================
    // 1. TABLE ELEVES (principale)
    // ============================================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS eleves (
        id SERIAL PRIMARY KEY,
        matricule VARCHAR(20) UNIQUE,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(150) NOT NULL,
        classe VARCHAR(50) NOT NULL,
        numero_extrait VARCHAR(50),
        sexe VARCHAR(10) DEFAULT '',
        statut VARCHAR(30) DEFAULT 'Non affecté',
        qualite VARCHAR(50) DEFAULT '',
        nom_parent VARCHAR(150),
        telephone1 VARCHAR(20),
        telephone2 VARCHAR(20),
        moyenne_t1 DECIMAL(5,2),
        moyenne_t2 DECIMAL(5,2),
        moyenne_t3 DECIMAL(5,2),
        moyenne_generale DECIMAL(5,2),
        decision_fin_annee VARCHAR(30),
        photo_url TEXT,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table eleves créée / vérifiée');

    // Ajouter colonnes manquantes si la table existait déjà
    const colonnesAjouts = [
      `ALTER TABLE eleves ADD COLUMN IF NOT EXISTS sexe VARCHAR(10) DEFAULT ''`,
      `ALTER TABLE eleves ADD COLUMN IF NOT EXISTS statut VARCHAR(30) DEFAULT 'Non affecté'`,
      `ALTER TABLE eleves ADD COLUMN IF NOT EXISTS qualite VARCHAR(50) DEFAULT ''`,
      `ALTER TABLE eleves ADD COLUMN IF NOT EXISTS nom_parent VARCHAR(150)`,
      `ALTER TABLE eleves ADD COLUMN IF NOT EXISTS telephone1 VARCHAR(20)`,
      `ALTER TABLE eleves ADD COLUMN IF NOT EXISTS telephone2 VARCHAR(20)`,
    ];
    for (const sql of colonnesAjouts) {
      try { await pool.query(sql); } catch(e) { /* colonne déjà existante */ }
    }
    console.log('✅ Colonnes sexe / statut / qualite ajoutées si manquantes');

    // ============================================================
    // 2. TABLE INSCRIPTIONS (économat)
    // ============================================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inscriptions (
        id SERIAL PRIMARY KEY,
        eleve_id INTEGER UNIQUE REFERENCES eleves(id) ON DELETE CASCADE,
        montant INTEGER DEFAULT 1000,
        date_paiement DATE DEFAULT CURRENT_DATE,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table inscriptions (économat) créée / vérifiée');

    // ============================================================
    // 3. TABLE INSCRIPTIONS EDUCATEURS
    // ============================================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inscriptions_educateurs (
        id SERIAL PRIMARY KEY,
        eleve_id INTEGER UNIQUE REFERENCES eleves(id) ON DELETE CASCADE,
        extrait BOOLEAN DEFAULT false,
        chemise_rabat BOOLEAN DEFAULT false,
        enveloppe_timbree BOOLEAN DEFAULT false,
        bulletin BOOLEAN DEFAULT false,
        photos_identite BOOLEAN DEFAULT false,
        fiche_renseignement BOOLEAN DEFAULT false,
        fiche_inscription_ligne BOOLEAN DEFAULT false,
        carnet_correspondance BOOLEAN DEFAULT false,
        livret_scolaire BOOLEAN DEFAULT false,
        diplome BOOLEAN DEFAULT false,
        observations TEXT DEFAULT '',
        date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table inscriptions_educateurs créée / vérifiée');

    // ============================================================
    // 4. TABLE CLASSES (liste des classes)
    // ============================================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(50) UNIQUE NOT NULL,
        niveau VARCHAR(30),
        effectif_max INTEGER DEFAULT 60,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table classes créée / vérifiée');

    console.log('\n🎉 Toutes les tables sont prêtes !');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
}

creerTables();
