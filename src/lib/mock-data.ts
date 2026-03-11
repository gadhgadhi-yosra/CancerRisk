// Historical cancer incidence data (simulated based on real trends)
export const cancerTrendData = Array.from({ length: 51 }, (_, i) => {
  const year = 1975 + i;
  const base = 400;
  const growth = i * 3.5;
  const noise = Math.sin(i * 0.5) * 15;
  return {
    year,
    incidence: Math.round(base + growth + noise),
    mortality: Math.round((base + growth + noise) * (0.55 - i * 0.004)),
    lung: Math.round(70 + i * 1.2 + Math.sin(i) * 5),
    breast: Math.round(100 + i * 2.5 + Math.cos(i) * 8),
    colorectal: Math.round(50 + i * 1.0 + Math.sin(i * 0.7) * 4),
    prostate: Math.round(80 + i * 2.8 + Math.cos(i * 0.3) * 6),
  };
});

export const pollutionData = Array.from({ length: 51 }, (_, i) => {
  const year = 1975 + i;
  return {
    year,
    pm25: +(15 + i * 0.6 + Math.sin(i * 0.3) * 3).toFixed(1),
    no2: +(25 + i * 0.4 + Math.cos(i * 0.4) * 5).toFixed(1),
    co2: +(340 + i * 2.2).toFixed(0),
  };
});

export const behaviorData = Array.from({ length: 51 }, (_, i) => {
  const year = 1975 + i;
  return {
    year,
    smoking: Math.round(42 - i * 0.5 + Math.sin(i) * 2),
    obesity: +(13 + i * 0.35 + Math.cos(i * 0.2) * 1.5).toFixed(1),
    alcohol: +(12 - i * 0.05 + Math.sin(i * 0.6) * 1).toFixed(1),
    physical_inactivity: +(25 + i * 0.3).toFixed(1),
  };
});

// Régions fictives pour heatmap
export const regionalData = [
  { region: "Nord", incidence: 480, pollution: 32 },
  { region: "Sud", incidence: 430, pollution: 22 },
  { region: "Est", incidence: 510, pollution: 30 },
  { region: "Ouest", incidence: 390, pollution: 18 },
  { region: "Centre", incidence: 450, pollution: 26 },
  { region: "Métropole", incidence: 520, pollution: 35 },
];

export const cancerTypes = [
  { key: "incidence", label: "Global" },
  { key: "lung", label: "Poumon" },
  { key: "breast", label: "Sein" },
  { key: "colorectal", label: "Colorectal" },
  { key: "prostate", label: "Prostate" },
];

export const correlationFactors = [
  { factor: "Pollution PM2.5", correlation: 0.82, category: "Environnemental" },
  { factor: "Tabagisme", correlation: 0.78, category: "Comportemental" },
  { factor: "Sédentarité", correlation: 0.65, category: "Comportemental" },
  { factor: "Urbanisation", correlation: 0.61, category: "Socio-économique" },
  { factor: "Émissions CO₂", correlation: 0.72, category: "Environnemental" },
  { factor: "Obésité", correlation: 0.69, category: "Comportemental" },
  { factor: "Pesticides", correlation: 0.58, category: "Environnemental" },
  { factor: "Accès aux soins", correlation: -0.54, category: "Socio-économique" },
];

export const riskFactorLabels = {
  pollution: "Exposition pollution (µg/m³)",
  smoking: "Tabagisme (cigarettes/jour)",
  diet: "Qualité alimentation (1-10)",
  exercise: "Activité physique (h/sem)",
  alcohol: "Consommation alcool (verres/sem)",
  urbanization: "Niveau urbanisation (1-10)",
  industrial: "Proximité industrielle (km)",
  age: "Âge",
  bmi: "IMC",
  family_history: "Antécédents familiaux",
};

export const sampleXAIFeatures = [
  { feature: "Pollution PM2.5", importance: 0.28, direction: "positive" },
  { feature: "Tabagisme", importance: 0.22, direction: "positive" },
  { feature: "Âge", importance: 0.15, direction: "positive" },
  { feature: "Activité physique", importance: 0.12, direction: "negative" },
  { feature: "IMC", importance: 0.09, direction: "positive" },
  { feature: "Alimentation", importance: 0.07, direction: "negative" },
  { feature: "Urbanisation", importance: 0.04, direction: "positive" },
  { feature: "Accès soins", importance: 0.03, direction: "negative" },
];
