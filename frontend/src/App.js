import React, { useState, useEffect } from 'react';
import axios from 'axios';
const API = 'https://webscool.onrender.com/api';
const MOT_DE_PASSE = 'dsps2024';
export default function App() {
  const [connecte, setConnecte] = useState(false);
  return connecte ? <div>OK</div> : <div><input onChange={e=>setConnecte(e.target.value==='dsps2024')} placeholder="mot de passe"/></div>;
}
