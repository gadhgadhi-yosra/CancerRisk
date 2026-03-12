

"use client";

import { useMemo, useState, useCallback, useEffect, useRef, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Sparkles,
  Info,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Share2,
  Wand2,
  TrendingDown,
  TrendingUp,
  Download,
  Save,
  Trash2,
  MapPin,
  User,
  Activity,
  Cloud,
  Cpu,
  ChevronDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

/* ===================== CONFIG ===================== */

const STORAGE_KEY = "risk_assessments_v2";

const defaultForm = {
  sexe: "F", // F | M
  ville: "Tunis",
  cancer_type: "Global", // Global | Poumon | Sein | Foie | Colorectal | Prostate
  age: 45,

  // environment
  pollution: 25, // PM2.5
  urbanization: 6, // /10

  // lifestyle
  smoking: 0, // cig/day
  diet: 6, // /10
  exercise: 3, // h/week
  alcohol: 5, // drinks/week

  // biology
  bmi: 24,
  family_history: false,
};

const presets = {
  faible: {
    sexe: "F",
    ville: "Tunis",
    cancer_type: "Global",
    age: 30,
    pollution: 15,
    smoking: 0,
    diet: 8,
    exercise: 6,
    alcohol: 2,
    urbanization: 5,
    bmi: 22,
    family_history: false,
  },
  moyen: {
    sexe: "F",
    ville: "Tunis",
    cancer_type: "Global",
    age: 45,
    pollution: 30,
    smoking: 5,
    diet: 6,
    exercise: 3,
    alcohol: 5,
    urbanization: 6,
    bmi: 25,
    family_history: false,
  },
  eleve: {
    sexe: "M",
    ville: "Sfax",
    cancer_type: "Poumon",
    age: 55,
    pollution: 45,
    smoking: 15,
    diet: 4,
    exercise: 1,
    alcohol: 10,
    urbanization: 8,
    bmi: 28,
    family_history: true,
  },
};

const cityExposure = {
  Tunis: { pollution: 28, urbanization: 8 },
  Sfax: { pollution: 35, urbanization: 7 },
  Sousse: { pollution: 26, urbanization: 7 },
  Bizerte: { pollution: 22, urbanization: 6 },
  Gabes: { pollution: 40, urbanization: 6 },
};

// Sliders grouped for better UX
const sliderGroups = [
  {
    id: "env",
    title: "Environnement",
    icon: MapPin,
    items: [
      { key: "pollution", label: "Pollution (PM2.5)", min: 0, max: 100, step: 1, unit: "µg/m³", hint: "Exposition moyenne aux particules fines." },
      { key: "urbanization", label: "Urbanisation", min: 1, max: 10, step: 1, unit: "/10", hint: "Environnement urbain vs rural." },
    ],
  },
  {
    id: "life",
    title: "Mode de vie",
    icon: Activity,
    items: [
      { key: "smoking", label: "Tabagisme", min: 0, max: 40, step: 1, unit: "cig/jour", hint: "Nombre de cigarettes par jour." },
      { key: "diet", label: "Qualité de l’alimentation", min: 1, max: 10, step: 1, unit: "/10", hint: "Plus c’est élevé, mieux c’est." },
      { key: "exercise", label: "Activité physique", min: 0, max: 15, step: 0.5, unit: "h/sem", hint: "Heures d’activité par semaine." },
      { key: "alcohol", label: "Alcool", min: 0, max: 30, step: 1, unit: "verres/sem", hint: "Nombre de verres par semaine." },
    ],
  },
  {
    id: "bio",
    title: "Biologie",
    icon: User,
    items: [
      { key: "age", label: "Âge", min: 18, max: 90, step: 1, unit: "ans", hint: "L’âge augmente le risque statistique." },
      { key: "bmi", label: "IMC", min: 15, max: 45, step: 0.5, unit: "kg/m²", hint: "Indice de masse corporelle (IMC)." },
    ],
  },
];

// Heuristic weights (mock explainability)
const factorWeights = {
  pollution: 0.7,
  smoking: 2,
  diet: -1.5,
  exercise: -2,
  alcohol: 0.8,
  urbanization: 0.6,
  bmi: 1.2,
  age: 0.4,
  family_history: 12,
};

/* ===================== LOGIC ===================== */

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const isNumber = (x) => typeof x === "number" && Number.isFinite(x);

function prettyKey(k) {
  return k.replaceAll("_", " ").replace("bmi", "IMC").replace("family history", "antécédents familiaux");
}

function validateForm(f) {
  const errors = [];

  if (!["F", "M"].includes(f.sexe)) errors.push("Sexe invalide.");
  if (!f.ville) errors.push("Ville manquante.");
  if (!f.cancer_type) errors.push("Type de cancer manquant.");

  const checks = [
    ["age", 18, 90],
    ["pollution", 0, 100],
    ["smoking", 0, 40],
    ["diet", 1, 10],
    ["exercise", 0, 15],
    ["alcohol", 0, 30],
    ["urbanization", 1, 10],
    ["bmi", 15, 45],
  ];

  for (const [k, min, max] of checks) {
    if (!isNumber(f[k])) errors.push(`${prettyKey(k)} invalide.`);
    else if (f[k] < min || f[k] > max) errors.push(`${prettyKey(k)} doit être entre ${min} et ${max}.`);
  }

  if (typeof f.family_history !== "boolean") errors.push("Antécédents familiaux invalides.");
  return errors;
}

function computeRiskScoreHeuristic(f) {
  // Heuristic v0 (offline)
  let score = 0;
  score += (f.age - 20) * 0.4;
  score += f.pollution * 0.5;
  score += f.smoking * 2;
  score += (10 - f.diet) * 1.5;
  score += Math.max(0, 5 - f.exercise) * 2;
  score += f.alcohol * 0.8;
  score += f.urbanization * 0.6;
  score += Math.max(0, f.bmi - 25) * 1.2;
  if (f.family_history) score += 12;

  // Small adjustments by cancer type (prototype)
  if (f.cancer_type === "Poumon") score += f.pollution * 0.08 + f.smoking * 0.6;
  if (f.cancer_type === "Sein") score += (f.bmi - 24) * 0.4;
  if (f.cancer_type === "Foie") score += f.alcohol * 0.25;
  if (f.cancer_type === "Colorectal") score += (10 - f.diet) * 0.5;
  if (f.cancer_type === "Prostate" && f.sexe === "M") score += (f.age - 40) * 0.15;

  return clamp(Math.round(score), 0, 100);
}

function getRiskLevel(score) {
  if (score < 25)
    return { label: "Faible", color: "text-emerald-600", ring: "ring-emerald-500/20", bar: "bg-gradient-to-r from-emerald-400 to-emerald-600", icon: CheckCircle };
  if (score < 50)
    return { label: "Modéré", color: "text-sky-600", ring: "ring-sky-500/20", bar: "bg-gradient-to-r from-sky-400 to-sky-600", icon: Info };
  if (score < 75)
    return { label: "Élevé", color: "text-amber-600", ring: "ring-amber-500/20", bar: "bg-gradient-to-r from-amber-400 to-amber-600", icon: AlertTriangle };
  return { label: "Critique", color: "text-rose-600", ring: "ring-rose-500/20", bar: "bg-gradient-to-r from-rose-400 to-rose-600", icon: AlertTriangle };
}

function formatDateTime(d = new Date()) {
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* Simple print in a new window (browser print -> PDF possible) */
function printReportHTML({ title, html }) {
  if (typeof window === "undefined") return;
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return;
  w.document.open();
  w.document.write(`
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body{font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Arial; padding:24px; color:#111}
          h1{font-size:20px;margin:0 0 8px}
          h2{font-size:14px;margin:18px 0 8px}
          .muted{color:#666;font-size:12px}
          .box{border:1px solid #ddd;border-radius:12px;padding:12px;margin:10px 0}
          .row{display:flex;gap:10px;flex-wrap:wrap}
          .pill{border:1px solid #ddd;border-radius:999px;padding:4px 10px;font-size:12px}
          table{width:100%;border-collapse:collapse}
          td,th{border-bottom:1px solid #eee;padding:8px;font-size:12px;text-align:left}
        </style>
      </head>
      <body>
        ${html}
        <script>
          setTimeout(()=>{ window.print(); }, 250);
        </script>
      </body>
    </html>
  `);
  w.document.close();
}

/* ===================== UI HELPERS ===================== */

type GlassCardProps = ComponentPropsWithoutRef<"div"> & {
  children: ReactNode;
};

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(({ className = "", children, ...props }, ref) => (
  <div
    ref={ref}
    className={[
      "rounded-3xl border bg-white/60 dark:bg-zinc-950/35 backdrop-blur-xl",
      "shadow-[0_12px_40px_rgba(0,0,0,0.10)]",
      className,
    ].join(" ")}
    {...props}
  >
    {children}
  </div>
));
GlassCard.displayName = "GlassCard";

type SectionProps = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  subtitle?: string;
};

function Section({
  title,
  icon: Icon,
  open,
  onToggle,
  children,
  subtitle,
}: SectionProps) {
  return (
    <div className="rounded-3xl border bg-background/45">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 p-4" aria-expanded={open}>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <div className="text-left">
            <div className="text-sm font-semibold">{title}</div>
            {subtitle ? <div className="text-xs text-muted-foreground">{subtitle}</div> : null}
          </div>
        </div>
        <ChevronDown className={["h-4 w-4 text-muted-foreground transition", open ? "rotate-180" : ""].join(" ")} />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 p-4 pt-0">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MiniBars({ items }) {
  const max = Math.max(1, ...items.map((x) => x.abs));
  return (
    <div className="space-y-3">
      {items.map((x) => (
        <div key={x.key} className="rounded-2xl border bg-background/50 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="capitalize">{x.label}</span>
            <span className="tabular-nums">
              {x.sign > 0 ? "+" : "-"}
              {x.abs.toFixed(1)}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={[
                "h-full rounded-full",
                x.sign > 0 ? "bg-gradient-to-r from-rose-400 to-rose-600" : "bg-gradient-to-r from-emerald-400 to-emerald-600",
              ].join(" ")}
              style={{ width: `${clamp((x.abs / max) * 100, 0, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RadialGauge({ value, className = "" }) {
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const dash = (clamp(value, 0, 100) / 100) * circumference;

  return (
    <div className={["mx-auto mt-4 flex w-full items-center justify-center", className].join(" ")}>
      <div className="relative h-32 w-32">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={r} stroke="hsl(var(--border))" strokeWidth="10" fill="none" />
          <motion.circle
            cx="50"
            cy="50"
            r={r}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            className="stroke-primary"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - dash }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        </svg>

        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-3xl font-bold tabular-nums">{value}</div>
            <div className="text-[11px] text-muted-foreground">sur 100</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== MAIN ===================== */

export default function RiskScoreStudioFR() {
  const [form, setForm] = useState(defaultForm);

  // prediction state
  const [lockedScore, setLockedScore] = useState(null);
  const [isCalc, setIsCalc] = useState(false);
  const [activePreset, setActivePreset] = useState(null);

  // Mode: offline heuristic vs API
  const [useApi, setUseApi] = useState(false);
  const [apiUrl, setApiUrl] = useState("/api/predict/full");
  const [apiMeta, setApiMeta] = useState(null);
  const [errors, setErrors] = useState([]);

  // Scenario compare
  const [baseline, setBaseline] = useState(null);
  const [improved, setImproved] = useState(null);

  // History
  const [history, setHistory] = useState([]);

  // UX: sections
  const [openSections, setOpenSections] = useState({ profil: true, env: true, life: false, bio: false });

  const detailsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {}
  }, [history]);

  const liveScoreHeuristic = useMemo(() => computeRiskScoreHeuristic(form), [form]);
  const displayedScore = lockedScore ?? liveScoreHeuristic;

  const risk = useMemo(() => getRiskLevel(displayedScore), [displayedScore]);
  const RiskIcon = risk.icon;

  // Heuristic contributions
  const contributions = useMemo(() => {
    const rows = Object.entries(factorWeights).map(([k, w]) => {
      const val = k === "family_history" ? (form.family_history ? 1 : 0) : form[k];
      const impact = val * w;
      return { key: k, label: prettyKey(k), impact, abs: Math.abs(impact), sign: Math.sign(impact) || 1 };
    });

    const topAbs = [...rows].sort((a, b) => b.abs - a.abs).slice(0, 6);
    const topPositive = [...rows].filter((x) => x.impact > 0).sort((a, b) => b.impact - a.impact)[0];
    const topProtective = [...rows].filter((x) => x.impact < 0).sort((a, b) => a.impact - b.impact)[0];

    return { rows, topAbs, topPositive, topProtective };
  }, [form]);

  const confidence = useMemo(() => {
    if (apiMeta?.confidence != null && isNumber(apiMeta.confidence)) return clamp(apiMeta.confidence, 0, 1);
    // fallback (prototype)
    let c = 0.62;
    if (form.ville) c += 0.08;
    if (form.cancer_type && form.cancer_type !== "Global") c += 0.06;
    if (form.age >= 18) c += 0.05;
    if (form.pollution != null && form.urbanization != null) c += 0.06;
    if (form.family_history != null) c += 0.03;
    return clamp(c, 0.4, 0.92);
  }, [form, apiMeta]);

  const handleSlider = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value[0] }));
    setLockedScore(null);
    setActivePreset(null);
    setErrors([]);
    setApiMeta(null);
  }, []);

  const applyPatch = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setLockedScore(null);
    setActivePreset(null);
    setErrors([]);
    setApiMeta(null);
  };

  const handlePreset = (name) => {
    setForm(presets[name]);
    setLockedScore(null);
    setActivePreset(name);
    setBaseline(null);
    setImproved(null);
    setErrors([]);
    setApiMeta(null);
  };

  const resetAll = () => {
    setForm(defaultForm);
    setLockedScore(null);
    setActivePreset(null);
    setBaseline(null);
    setImproved(null);
    setErrors([]);
    setApiMeta(null);
  };

  const fetchScoreFromApi = async () => {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Erreur API ${res.status}: ${txt?.slice(0, 160) || "Réponse vide"}`);
    }

    const data = await res.json();
    return data;
  };

  const handleCalculate = async () => {
    setErrors([]);
    const errs = validateForm(form);
    if (errs.length) {
      setErrors(errs);
      return;
    }

    setIsCalc(true);
    setTimeout(async () => {
      try {
        if (useApi) {
          const data = await fetchScoreFromApi();
          const score = isNumber(data?.score) ? clamp(Math.round(data.score), 0, 100) : null;
          if (score == null) throw new Error("La réponse API ne contient pas le champ 'score'.");

          setLockedScore(score);

          const meta = {
            confidence: isNumber(data?.confidence) ? data.confidence : null,
            top_features: Array.isArray(data?.top_features) ? data.top_features : null,
            model: typeof data?.model === "string" ? data.model : null,
          };
          setApiMeta(meta);
        } else {
          setLockedScore(computeRiskScoreHeuristic(form));
          setApiMeta(null);
        }
      } catch (e) {
        setErrors([`Erreur de calcul: ${e?.message || "Erreur inconnue"}`]);
        // fallback so the UI remains usable
        setLockedScore(computeRiskScoreHeuristic(form));
        setApiMeta(null);
      } finally {
        setIsCalc(false);
      }
    }, 280);
  };

  const whatIf = useMemo(() => {
    const base = liveScoreHeuristic;
    const actions = [
      { id: "smoke-5", label: "- 5 cig/jour", patch: { smoking: clamp(form.smoking - 5, 0, 40) } },
      { id: "sport+2", label: "+ 2h sport/sem", patch: { exercise: clamp(form.exercise + 2, 0, 15) } },
      { id: "diet+2", label: "+ 2 points alimentation", patch: { diet: clamp(form.diet + 2, 1, 10) } },
      { id: "alcool-3", label: "- 3 verres/sem", patch: { alcohol: clamp(form.alcohol - 3, 0, 30) } },
    ];

    return actions.map((a) => {
      const simulated = { ...form, ...a.patch };
      const simScore = computeRiskScoreHeuristic(simulated);
      const delta = simScore - base;
      return { ...a, simScore, delta };
    });
  }, [form, liveScoreHeuristic]);

  const useCityExposure = () => {
    const ex = cityExposure[form.ville];
    if (!ex) return;
    applyPatch({ pollution: ex.pollution, urbanization: ex.urbanization });
  };

  const setBaselineNow = () => {
    const s = computeRiskScoreHeuristic(form);
    setBaseline({ form: { ...form }, score: s, at: formatDateTime() });
    setImproved(null);
  };

  const setImprovedNow = () => {
    const s = computeRiskScoreHeuristic(form);
    setImproved({ form: { ...form }, score: s, at: formatDateTime() });
  };

  const scenarioDelta = useMemo(() => {
    if (!baseline || !improved) return null;
    return improved.score - baseline.score;
  }, [baseline, improved]);

  const saveAssessment = () => {
    const entry = {
      id: `${Date.now()}`,
      at: formatDateTime(),
      score: displayedScore,
      level: getRiskLevel(displayedScore).label,
      mode: useApi ? "API/ML" : "Heuristique",
      profile: { sexe: form.sexe, ville: form.ville, cancer_type: form.cancer_type, age: form.age },
      factors: {
        pollution: form.pollution,
        smoking: form.smoking,
        diet: form.diet,
        exercise: form.exercise,
        alcohol: form.alcohol,
        urbanization: form.urbanization,
        bmi: form.bmi,
        family_history: form.family_history,
      },
    };
    setHistory((prev) => [entry, ...prev].slice(0, 20));
  };

  const deleteHistoryItem = (id) => setHistory((prev) => prev.filter((x) => x.id !== id));
  const clearHistory = () => setHistory([]);

  const restoreFromHistory = (entry) => {
    setForm((prev) => ({
      ...prev,
      sexe: entry.profile.sexe,
      ville: entry.profile.ville,
      cancer_type: entry.profile.cancer_type,
      age: entry.profile.age,
      ...entry.factors,
    }));
    setLockedScore(entry.score);
    setBaseline(null);
    setImproved(null);
    setErrors([]);
    setApiMeta(null);
  };

  const exportReport = () => {
    const level = getRiskLevel(displayedScore).label;
    const html = `
      <h1>Rapport Risk Score Studio</h1>
      <div class="muted">Généré le: ${formatDateTime()}</div>

      <div class="box">
        <div class="row">
          <span class="pill">Score: <b>${displayedScore}/100</b></span>
          <span class="pill">Niveau: <b>${level}</b></span>
          <span class="pill">Mode: <b>${useApi ? "API/ML" : "Heuristique v0"}</b></span>
          <span class="pill">Confiance: <b>${Math.round(confidence * 100)}%</b></span>
        </div>
        <div class="muted" style="margin-top:8px">
          ⚠️ Estimation éducative — ne constitue pas un diagnostic médical.
        </div>
      </div>

      <h2>Profil</h2>
      <div class="box">
        <div class="row">
          <span class="pill">Sexe: <b>${form.sexe}</b></span>
          <span class="pill">Ville: <b>${form.ville}</b></span>
          <span class="pill">Type: <b>${form.cancer_type}</b></span>
          <span class="pill">Âge: <b>${form.age}</b></span>
        </div>
      </div>

      <h2>Facteurs</h2>
      <div class="box">
        <table>
          <tr><th>Feature</th><th>Valeur</th></tr>
          <tr><td>Pollution</td><td>${form.pollution}</td></tr>
          <tr><td>Tabagisme</td><td>${form.smoking}</td></tr>
          <tr><td>Alimentation</td><td>${form.diet}/10</td></tr>
          <tr><td>Sport</td><td>${form.exercise} h/sem</td></tr>
          <tr><td>Alcool</td><td>${form.alcohol}</td></tr>
          <tr><td>Urbanisation</td><td>${form.urbanization}/10</td></tr>
          <tr><td>IMC</td><td>${form.bmi}</td></tr>
          <tr><td>Antécédents familiaux</td><td>${form.family_history ? "Oui" : "Non"}</td></tr>
        </table>
      </div>

      <h2>Résumé</h2>
      <div class="box">
        <div class="muted">Facteur principal (heuristique): <b>${contributions.topPositive?.label ?? "—"}</b></div>
        <div class="muted">Facteur protecteur (heuristique): <b>${contributions.topProtective?.label ?? "—"}</b></div>
      </div>
    `;
    printReportHTML({ title: "Risk Score Studio Report", html });
  };

  const insights = useMemo(() => {
    const driver = contributions.topPositive?.label ?? "—";
    const protective = contributions.topProtective?.label ?? "—";

    const quickWin =
      form.smoking > 0
        ? "Réduire le tabagisme"
        : form.exercise < 4
          ? "Augmenter l’activité"
          : form.diet < 7
            ? "Améliorer l’alimentation"
            : form.pollution > 35
              ? "Réduire l’exposition PM2.5"
              : "Optimiser les habitudes";

    const nextStep = form.family_history ? "Suivi préventif recommandé" : displayedScore >= 50 ? "Plan de prévention & suivi" : "Maintenir les habitudes";

    return [
      { title: "Top driver", value: driver, desc: "Facteur le plus associé à une hausse (heuristique).", icon: TrendingUp },
      { title: "Bouclier", value: protective, desc: "Facteur protecteur principal (heuristique).", icon: TrendingDown },
      { title: "Next step", value: nextStep, desc: quickWin, icon: Wand2 },
    ];
  }, [contributions, form, displayedScore]);

  const plan14 = useMemo(() => {
    const plan = [];
    if (form.smoking > 0) plan.push("Semaine 1: réduire 2–3 cigarettes/jour.");
    if (form.exercise < 4) plan.push("Semaine 1: +30 min de marche, 4×/semaine.");
    if (form.diet < 7) plan.push("Semaine 1: ajouter 2 portions de fruits/légumes par jour.");
    if (form.pollution > 35) plan.push("Semaine 2: limiter les sorties pendant les pics de pollution.");
    plan.push("Semaine 2: routine sommeil + hydratation.");
    plan.push("Semaine 2: refaire une évaluation (score).");
    return plan.slice(0, 6);
  }, [form]);

  const screening = useMemo(() => {
    const items = [];
    if (form.age >= 50) items.push("Dépistage colorectal: à discuter (à partir de 50 ans).");
    if (form.cancer_type === "Poumon" && form.smoking >= 10 && form.age >= 50) items.push("Poumon: dépistage à discuter (profil fumeur).");
    if (form.family_history) items.push("Antécédents: suivi préventif plus régulier recommandé.");
    items.push("Consultez si symptômes persistants / inquiétants.");
    return items;
  }, [form]);

  return (
    <div className="relative">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.22),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(244,63,94,0.18),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.22] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:56px_56px]" />
      </div>

      <div className="container mx-auto px-4 py-10 lg:px-6">
        {/* HERO */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <GlassCard className="relative overflow-hidden p-6">
            <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-rose-500/15 blur-3xl" />

            <div className="relative">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Prototype BI • What-if • Historique • Rapport
              </div>

              <h1 className="font-heading text-3xl font-bold tracking-tight">
                <Shield className="mr-2 inline h-7 w-7 text-primary" />
                Risk Score Studio
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Score, simulation “what-if”, comparaison avant/après, historique et export (impression).
              </p>
            </div>
          </GlassCard>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* FORM */}
          <div className="lg:col-span-3">
            <GlassCard>
              <div className="flex flex-col gap-4 border-b p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-heading text-lg font-semibold">Profil + Facteurs</h3>
                  <p className="text-sm text-muted-foreground">Preset rapide ou réglage fin.</p>
                </div>

                <div className="inline-flex w-full rounded-2xl border bg-background/60 p-1 sm:w-auto">
                  {[
                    { k: "faible", t: "Faible" },
                    { k: "moyen", t: "Moyen" },
                    { k: "eleve", t: "Élevé" },
                  ].map((p) => (
                    <button
                      key={p.k}
                      type="button"
                      onClick={() => handlePreset(p.k)}
                      className="w-full rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground data-[active=true]:bg-card data-[active=true]:text-foreground data-[active=true]:shadow-sm sm:w-auto"
                      data-active={activePreset === p.k}
                    >
                      {p.t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-5 p-6">
                {/* MODE */}
                <div className="rounded-3xl border bg-background/45 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold">Mode de calcul</div>
                      <div className="text-xs text-muted-foreground">
                        Offline = heuristique • Online = API/ML (si backend disponible)
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-2 text-xs">
                        {useApi ? <Cloud className="h-4 w-4 text-primary" /> : <Cpu className="h-4 w-4 text-primary" />}
                        <span className="text-muted-foreground">{useApi ? "API/ML" : "Heuristique"}</span>
                      </div>
                      <Switch
                        checked={useApi}
                        onCheckedChange={(v) => {
                          setUseApi(v);
                          setErrors([]);
                          setApiMeta(null);
                        }}
                      />
                    </div>
                  </div>

                  {useApi ? (
                    <div className="mt-3">
                      <Label className="text-xs text-muted-foreground">URL API</Label>
                      <input
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                        className="mt-1 w-full rounded-xl border bg-background/50 px-3 py-2 text-sm outline-none"
                        placeholder="/api/predict/full"
                      />
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        JSON attendu: {"{ score: number, confidence?: 0..1, top_features?: [] }"}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* ERRORS */}
                {errors.length ? (
                  <div className="rounded-3xl border bg-rose-500/5 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
                      <AlertTriangle className="h-4 w-4" />
                      Problèmes détectés
                    </div>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {errors.slice(0, 6).map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* PROFIL */}
                <Section
                  title="Profil utilisateur"
                  subtitle="Sexe • Ville • Type de cancer • Antécédents"
                  icon={User}
                  open={openSections.profil}
                  onToggle={() => setOpenSections((s) => ({ ...s, profil: !s.profil }))}
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border bg-background/60 p-3">
                      <div className="mb-1 text-xs text-muted-foreground">Sexe</div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => applyPatch({ sexe: "F" })}
                          className={`w-full rounded-xl border px-3 py-2 text-sm ${
                            form.sexe === "F" ? "bg-card text-foreground shadow-sm" : "bg-background/50 text-muted-foreground"
                          }`}
                        >
                          F
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPatch({ sexe: "M" })}
                          className={`w-full rounded-xl border px-3 py-2 text-sm ${
                            form.sexe === "M" ? "bg-card text-foreground shadow-sm" : "bg-background/50 text-muted-foreground"
                          }`}
                        >
                          M
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border bg-background/60 p-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Ville</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Auto-exposition ville">
                              <MapPin className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Auto-remplissage pollution/urbanisation depuis la ville (données démo).</TooltipContent>
                        </Tooltip>
                      </div>

                      <select
                        value={form.ville}
                        onChange={(e) => applyPatch({ ville: e.target.value })}
                        className="w-full rounded-xl border bg-background/50 px-3 py-2 text-sm outline-none"
                      >
                        {Object.keys(cityExposure).map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>

                      <Button variant="outline" size="sm" className="mt-2 w-full" onClick={useCityExposure}>
                        Auto-exposition (démo)
                      </Button>
                    </div>

                    <div className="rounded-2xl border bg-background/60 p-3">
                      <div className="mb-1 text-xs text-muted-foreground">Type de cancer</div>
                      <select
                        value={form.cancer_type}
                        onChange={(e) => applyPatch({ cancer_type: e.target.value })}
                        className="w-full rounded-xl border bg-background/50 px-3 py-2 text-sm outline-none"
                      >
                        {["Global", "Poumon", "Sein", "Foie", "Colorectal", "Prostate"].map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <div className="mt-2 text-[11px] text-muted-foreground">(Prototype) Ajustement léger du score.</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-background/60 p-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Antécédents familiaux</Label>
                        <p className="text-xs text-muted-foreground">Activez si un proche au 1er degré a eu un cancer.</p>
                      </div>
                      <Switch checked={form.family_history} onCheckedChange={(v) => applyPatch({ family_history: v })} />
                    </div>
                  </div>
                </Section>

                {/* GROUPED SLIDERS */}
                {sliderGroups.map((g) => (
                  <Section
                    key={g.id}
                    title={g.title}
                    icon={g.icon}
                    open={openSections[g.id]}
                    onToggle={() => setOpenSections((s) => ({ ...s, [g.id]: !s[g.id] }))}
                  >
                    {g.items.map((field) => (
                      <div key={field.key} className="rounded-2xl border bg-background/55 p-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm text-muted-foreground">{field.label}</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" className="text-muted-foreground transition hover:text-foreground" aria-label={`Info ${field.label}`}>
                                  <Info className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{field.hint}</TooltipContent>
                            </Tooltip>
                          </div>

                          <span className="rounded-full border bg-background/70 px-2 py-1 text-xs font-medium tabular-nums">
                            {form[field.key]} {field.unit}
                          </span>
                        </div>

                        <Slider
                          aria-label={field.label}
                          value={[form[field.key]]}
                          onValueChange={(v) => handleSlider(field.key, v)}
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          className="w-full [&_[data-orientation=horizontal]]:h-2 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5"
                        />

                        <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                          <span>Min {field.min}</span>
                          <span>—</span>
                          <span>Max {field.max}</span>
                        </div>
                      </div>
                    ))}
                  </Section>
                ))}
              </div>

              <div className="flex flex-col gap-3 border-t p-6 sm:flex-row sm:items-center">
                <Button onClick={handleCalculate} size="lg" className="w-full sm:w-auto">
                  Calculer (verrouiller) le score
                </Button>

                <Button onClick={resetAll} variant="outline" size="lg" className="w-full sm:w-auto">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>

                <div className="ml-auto hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                  <Activity className="h-4 w-4" />
                  Live (heuristique): <span className="font-semibold tabular-nums">{liveScoreHeuristic}</span>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* RESULT */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {isCalc ? (
                <div className="space-y-3">
                  <Skeleton className="h-40 w-full rounded-3xl" />
                  <Skeleton className="h-40 w-full rounded-3xl" />
                  <Skeleton className="h-44 w-full rounded-3xl" />
                </div>
              ) : (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="sticky top-24 space-y-6"
                >
                  <GlassCard className={`p-6 text-center ring-1 ${risk.ring}`}>
                    <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
                      <span>Votre score</span>
                      <span className="rounded-full border bg-background/60 px-2 py-0.5 text-[11px]">
                        {lockedScore !== null ? "Verrouillé" : "Live"}
                      </span>
                      <span className="rounded-full border bg-background/60 px-2 py-0.5 text-[11px]">
                        Mode: {useApi ? "API/ML" : "Heuristique v0"}
                      </span>
                      <span className="rounded-full border bg-background/60 px-2 py-0.5 text-[11px]">
                        Confiance: {Math.round(confidence * 100)}%{apiMeta?.confidence == null ? " (prototype)" : ""}
                      </span>
                    </div>

                    <RadialGauge value={displayedScore} />

                    <div className="mt-2 flex items-center justify-center gap-2">
                      <RiskIcon className={`h-5 w-5 ${risk.color}`} />
                      <span className={`font-heading text-lg font-semibold ${risk.color}`}>Risque {risk.label}</span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          const txt = `Risk Score: ${displayedScore}/100 (${risk.label}) • Mode: ${useApi ? "API/ML" : "Heuristique v0"}`;
                          if (typeof navigator !== "undefined" && navigator.clipboard) navigator.clipboard.writeText(txt);
                        }}
                      >
                        <Share2 className="mr-2 h-4 w-4" />
                        Copier
                      </Button>

                      <Button
                        className="w-full"
                        onClick={() => {
                          detailsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
                        }}
                      >
                        Détails
                      </Button>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button variant="outline" className="w-full" onClick={saveAssessment}>
                        <Save className="mr-2 h-4 w-4" />
                        Sauvegarder
                      </Button>
                      <Button variant="outline" className="w-full" onClick={exportReport}>
                        <Download className="mr-2 h-4 w-4" />
                        Imprimer / PDF
                      </Button>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                      {insights.map((x) => {
                        const Ico = x.icon;
                        return (
                          <div key={x.title} className="rounded-2xl border bg-background/55 p-3 text-left">
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <Ico className="h-4 w-4 text-primary" />
                              {x.title}
                            </div>
                            <div className="mt-1 text-sm font-semibold">{x.value}</div>
                            <div className="mt-1 text-[11px] text-muted-foreground">{x.desc}</div>
                          </div>
                        );
                      })}
                    </div>

                    <p className="mt-4 text-center text-xs text-muted-foreground">
                       Estimation éducative — ne constitue pas un diagnostic médical.
                    </p>
                  </GlassCard>

                  <GlassCard className="p-6">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h4 className="font-heading text-sm font-semibold">Comparaison de scénario</h4>
                        <p className="text-xs text-muted-foreground">Avant / Après (définir baseline puis improved)</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={setBaselineNow}>
                          Définir baseline
                        </Button>
                        <Button size="sm" variant="outline" onClick={setImprovedNow} disabled={!baseline}>
                          Définir improved
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border bg-background/50 p-4">
                        <div className="text-xs text-muted-foreground">Baseline</div>
                        <div className="mt-2 text-2xl font-bold tabular-nums">{baseline?.score ?? "—"}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">{baseline?.at ?? "Choisir baseline"}</div>
                      </div>

                      <div className="rounded-2xl border bg-background/50 p-4">
                        <div className="text-xs text-muted-foreground">Improved</div>
                        <div className="mt-2 text-2xl font-bold tabular-nums">{improved?.score ?? "—"}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">{improved?.at ?? "Choisir improved"}</div>
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl border bg-background/50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">Delta</div>
                        <div
                          className={[
                            "rounded-full border px-2 py-0.5 text-xs tabular-nums",
                            scenarioDelta === null
                              ? "bg-muted text-muted-foreground"
                              : scenarioDelta < 0
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "bg-rose-500/10 text-rose-700 dark:text-rose-300",
                          ].join(" ")}
                        >
                          {scenarioDelta === null ? "—" : scenarioDelta > 0 ? `+${scenarioDelta}` : `${scenarioDelta}`}
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-muted-foreground">
                        Astuce: définissez baseline, appliquez un “what-if”, puis définissez improved.
                      </p>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h4 className="font-heading text-sm font-semibold">Simulation “what-if”</h4>
                        <p className="text-xs text-muted-foreground">Cliquez pour appliquer une amélioration rapide.</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Base: <span className="font-semibold tabular-nums">{liveScoreHeuristic}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {whatIf.map((a) => (
                        <Button key={a.id} variant="outline" className="justify-between" onClick={() => applyPatch(a.patch)}>
                          <span className="flex items-center gap-2">
                            <Wand2 className="h-4 w-4 text-primary" />
                            {a.label}
                          </span>

                          <span
                            className={[
                              "ml-2 rounded-full border px-2 py-0.5 text-xs tabular-nums",
                              a.delta < 0
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : a.delta > 0
                                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                                  : "bg-muted text-muted-foreground",
                            ].join(" ")}
                          >
                            {a.delta < 0 ? "" : a.delta > 0 ? "+" : ""}
                            {a.delta}
                          </span>
                        </Button>
                      ))}
                    </div>

                    <div className="mt-3 text-xs text-muted-foreground">
                      Astuce: appliquez un “what-if”, puis sauvegardez “improved” pour comparer.
                    </div>
                  </GlassCard>

                  <div id="details" ref={detailsRef}>
                    <GlassCard className="p-6">
                    <Tabs defaultValue="resume" className="w-full">
                      <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
                        <TabsTrigger value="resume">Résumé</TabsTrigger>
                        <TabsTrigger value="xai">XAI</TabsTrigger>
                        <TabsTrigger value="contrib">Contrib.</TabsTrigger>
                        <TabsTrigger value="plan">Plan</TabsTrigger>
                        <TabsTrigger value="depistage">Dépistage</TabsTrigger>
                        <TabsTrigger value="history">Historique</TabsTrigger>
                      </TabsList>

                      <TabsContent value="resume" className="mt-5">
                        <div className="rounded-2xl border bg-background/50 p-4">
                          <p className="text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">Lecture rapide:</span>{" "}
                            score <span className="font-semibold tabular-nums text-foreground">{displayedScore}</span>{" "}
                            (Risque {risk.label}). Facteur principal:{" "}
                            <span className="font-semibold text-foreground">{contributions.topPositive?.label ?? "—"}</span>{" "}
                            • Facteur protecteur:{" "}
                            <span className="font-semibold text-foreground">{contributions.topProtective?.label ?? "—"}</span>.
                          </p>

                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                            <div className={`h-full ${risk.bar}`} style={{ width: `${displayedScore}%` }} />
                          </div>

                          <p className="mt-3 text-xs text-muted-foreground">
                            ⚠️ Module éducatif/BI. Pour une décision médicale: consulter un professionnel.
                          </p>
                        </div>
                      </TabsContent>

                      <TabsContent value="xai" className="mt-5">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="font-heading text-sm font-semibold text-muted-foreground">Facteurs influents (top)</h4>
                          <span className="text-xs text-muted-foreground">{apiMeta?.top_features ? "API" : "prototype"}</span>
                        </div>

                        {apiMeta?.top_features ? (
                          <div className="space-y-2">
                            {apiMeta.top_features.slice(0, 8).map((t, idx) => (
                              <div key={idx} className="rounded-2xl border bg-background/50 p-3 text-sm">
                                {typeof t === "string" ? t : JSON.stringify(t)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <>
                            <MiniBars items={contributions.topAbs} />
                            <div className="mt-3 text-xs text-muted-foreground">
                              Pour un XAI réel: renvoyez SHAP / importances depuis le backend.
                            </div>
                          </>
                        )}
                      </TabsContent>

                      <TabsContent value="contrib" className="mt-5">
                        <h4 className="mb-3 font-heading text-sm font-semibold text-muted-foreground">Contributions (heuristiques)</h4>
                        <div className="space-y-2">
                          {[...contributions.rows]
                            .sort((a, b) => b.abs - a.abs)
                            .slice(0, 12)
                            .map((c) => (
                              <div key={c.key} className="flex items-center justify-between rounded-2xl border bg-background/50 p-3">
                                <span className="text-sm">{c.label}</span>
                                <span
                                  className={[
                                    "rounded-full border px-2 py-0.5 text-xs tabular-nums",
                                    c.impact >= 0
                                      ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                                  ].join(" ")}
                                >
                                  {c.impact >= 0 ? "+" : "-"}
                                  {Math.abs(c.impact).toFixed(1)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="plan" className="mt-5">
                        <h4 className="mb-3 font-heading text-sm font-semibold">Plan 14 jours (prototype)</h4>
                        <div className="space-y-2">
                          {plan14.map((p, idx) => (
                            <div key={idx} className="rounded-2xl border bg-background/50 p-3 text-sm">
                              {p}
                            </div>
                          ))}
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                          Exemple de recommandations personnalisées (prototype).
                        </p>
                      </TabsContent>

                      <TabsContent value="depistage" className="mt-5">
                        <h4 className="mb-3 font-heading text-sm font-semibold">Recommandations dépistage (prototype)</h4>
                        <div className="space-y-2">
                          {screening.map((s, idx) => (
                            <div key={idx} className="rounded-2xl border bg-background/50 p-3 text-sm">
                              {s}
                            </div>
                          ))}
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                          ⚠️ Recommandations générales. Pour une décision médicale: consulter un professionnel.
                        </p>
                      </TabsContent>

                      <TabsContent value="history" className="mt-5">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="font-heading text-sm font-semibold">Historique (local)</h4>
                          <Button variant="outline" size="sm" onClick={clearHistory} disabled={history.length === 0}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Vider
                          </Button>
                        </div>

                        {history.length === 0 ? (
                          <div className="rounded-2xl border bg-background/50 p-4 text-sm text-muted-foreground">
                            Aucun historique. Cliquez sur <b>Sauvegarder</b> après le calcul.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {history.map((h) => (
                              <div key={h.id} className="rounded-2xl border bg-background/50 p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="text-sm font-semibold">
                                      {h.score}/100 — {h.level}{" "}
                                      <span className="ml-2 rounded-full border bg-background/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                                        {h.mode}
                                      </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {h.at} • {h.profile.ville} • {h.profile.cancer_type} • {h.profile.sexe} • Âge {h.profile.age}
                                    </div>
                                  </div>

                                  <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => restoreFromHistory(h)}>
                                      Restaurer
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => deleteHistoryItem(h.id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                    </GlassCard>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
