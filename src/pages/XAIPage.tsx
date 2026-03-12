"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Search,
  Filter,
  Download,
  Copy,
  SlidersHorizontal,
} from "lucide-react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { sampleXAIFeatures } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* ========= Helpers (UI) ========= */

function GlassCard({ className = "", children }) {
  return (
    <div
      className={[
        "rounded-3xl border bg-white/60 dark:bg-zinc-950/35 backdrop-blur-xl",
        "shadow-[0_12px_40px_rgba(0,0,0,0.10)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/* ========= Mock: local explanation input =========
   في مشروعك الحقيقي، تنجم تجيب form الحالي من route state أو context.
*/
const mockUserContext = {
  age: 52,
  smoking: 12,
  pollution: 38,
  bmi: 29,
  exercise: 2,
  diet: 5,
};

function buildLocalXaiFromUser(globalFeatures, userCtx) {
  return globalFeatures.map((f) => {
    const k = (f.feature || "").toLowerCase();
    let boost = 1;

    if (k.includes("tabac") || k.includes("smok")) boost = 1 + clamp((userCtx.smoking || 0) / 40, 0, 1) * 0.8;
    if (k.includes("pollu")) boost = 1 + clamp((userCtx.pollution || 0) / 100, 0, 1) * 0.6;
    if (k.includes("imc") || k.includes("bmi")) boost = 1 + clamp(((userCtx.bmi || 0) - 20) / 15, 0, 1) * 0.7;
    if (k.includes("sport") || k.includes("exerc")) boost = 1 + clamp((5 - (userCtx.exercise || 0)) / 5, 0, 1) * 0.5;
    if (k.includes("diet") || k.includes("aliment")) boost = 1 + clamp((7 - (userCtx.diet || 0)) / 7, 0, 1) * 0.4;

    return {
      ...f,
      importance: clamp(f.importance * boost, 0, 1),
    };
  });
}

function counterfactualTips(userCtx) {
  const tips = [];
  if ((userCtx.smoking ?? 0) > 0) tips.push({ title: "Réduire tabagisme", change: "-5 cig/jour", effect: "-8 à -15 points (estim.)" });
  if ((userCtx.exercise ?? 0) < 4) tips.push({ title: "Augmenter activité", change: "+2h/sem", effect: "-5 à -10 points (estim.)" });
  if ((userCtx.diet ?? 0) < 7) tips.push({ title: "Améliorer alimentation", change: "+2/10", effect: "-3 à -7 points (estim.)" });
  if ((userCtx.bmi ?? 0) > 25) tips.push({ title: "Réduire IMC", change: "-2 kg/m²", effect: "-2 à -6 points (estim.)" });
  if ((userCtx.pollution ?? 0) > 30) tips.push({ title: "Limiter PM2.5", change: "Masque / indoor / filtre", effect: "-2 à -5 points (estim.)" });
  return tips.slice(0, 4);
}

/* ========= Main ========= */

export default function XAIPagePro() {
  const [mode, setMode] = useState("global"); // global | local
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | positive | negative
  const [sort, setSort] = useState("desc"); // desc | asc

  const baseFeatures = useMemo(() => {
    return sampleXAIFeatures.map((f) => ({
      feature: f.feature,
      direction: f.direction, // "positive" | "negative"
      importance: f.importance, // 0..1
    }));
  }, []);

  const localFeatures = useMemo(() => buildLocalXaiFromUser(baseFeatures, mockUserContext), [baseFeatures]);

  const activeFeatures = mode === "local" ? localFeatures : baseFeatures;

  const chartData = useMemo(() => {
    const q = query.trim().toLowerCase();

    let rows = activeFeatures
      .filter((f) => {
        if (!q) return true;
        return f.feature.toLowerCase().includes(q);
      })
      .filter((f) => {
        if (filter === "all") return true;
        if (filter === "positive") return f.direction === "positive";
        if (filter === "negative") return f.direction !== "positive";
        return true;
      })
      .map((f) => ({
        ...f,
        value: f.direction === "positive" ? f.importance : -f.importance,
        absValue: f.importance,
      }));

    rows.sort((a, b) => (sort === "desc" ? b.absValue - a.absValue : a.absValue - b.absValue));
    return rows.slice(0, 12);
  }, [activeFeatures, query, filter, sort]);

  const top3 = useMemo(() => chartData.slice(0, 3), [chartData]);
  const tips = useMemo(() => counterfactualTips(mockUserContext), []);

  const summaryText = useMemo(() => {
    const main = top3.map((t) => t.feature).join(", ");
    return mode === "local"
      ? `Local XAI: les facteurs les plus influents pour ce profil sont ${main}.`
      : `Global XAI: les facteurs les plus influents dans le dataset sont ${main}.`;
  }, [top3, mode]);

  const copySummary = async () => {
    const txt = `${summaryText}\nMode: ${mode}\nTop: ${top3.map((t) => `${t.feature} (${Math.round(t.absValue * 100)}%)`).join(", ")}.`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(txt);
    }
  };

  return (
    <div className="relative">
      {/* Background (CLEAN AI LAB) */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.12),transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:56px_56px]" />
      </div>

      <div className="container mx-auto px-4 py-10 lg:px-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <GlassCard className="relative overflow-hidden p-6">
            <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />

            <div className="relative">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                SHAP • LIME • Local vs Global • Counterfactual
              </div>

              <h1 className="font-heading text-3xl font-bold tracking-tight">
                <Brain className="mr-2 inline h-7 w-7 text-primary" />
                Explainable AI (XAI)
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Comprendre les prédictions: importance globale, explication locale (profil) et recommandations “counterfactual”.
              </p>
            </div>
          </GlassCard>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left: Chart */}
          <div className="lg:col-span-3 space-y-6">
            <GlassCard className="p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-heading text-lg font-semibold">Importance des facteurs</h3>
                  <p className="text-sm text-muted-foreground">
                    {mode === "local" ? "Explication locale (profil utilisateur)" : "Explication globale (dataset)"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Tabs value={mode} onValueChange={setMode} className="w-full sm:w-auto">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="global">Global</TabsTrigger>
                      <TabsTrigger value="local">Local</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <Button variant="outline" onClick={copySummary}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copier résumé
                  </Button>
                </div>
              </div>

              {/* Controls */}
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher (ex: pollution)"
                    className="bg-background/60 pl-9"
                  />
                </div>

                <Button
                  variant="outline"
                  className="justify-between"
                  onClick={() => setFilter((f) => (f === "all" ? "positive" : f === "positive" ? "negative" : "all"))}
                >
                  <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filtre
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {filter === "all" ? "All" : filter === "positive" ? "↑ Risk" : "↓ Protect"}
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="justify-between"
                  onClick={() => setSort((s) => (s === "desc" ? "asc" : "desc"))}
                >
                  <span className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Tri
                  </span>
                  <span className="text-xs text-muted-foreground">{sort === "desc" ? "Desc" : "Asc"}</span>
                </Button>
              </div>

              {/* Chart */}
              <div className="mt-6">
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 120, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="feature"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      width={110}
                    />
                    <RTooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                      }}
                      formatter={(value) => [`${(Math.abs(value) * 100).toFixed(1)}%`, "Importance"]}
                    />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.direction === "positive" ? "hsl(340,65%,60%)" : "hsl(170,60%,50%)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ArrowRight className="h-3 w-3" style={{ color: "hsl(340,65%,60%)" }} />
                    Augmente le risque
                  </span>
                  <span className="flex items-center gap-1">
                    <ArrowLeft className="h-3 w-3" style={{ color: "hsl(170,60%,50%)" }} />
                    Réduit le risque
                  </span>
                </div>
              </div>
            </GlassCard>

            {/* Methodology */}
            <GlassCard className="p-6">
              <h3 className="mb-2 font-heading text-sm font-semibold text-muted-foreground">MÉTHODOLOGIE</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Les valeurs SHAP quantifient la contribution de chaque facteur. Les valeurs positives augmentent le score
                de risque, tandis que les valeurs négatives le réduisent. LIME fournit une approximation locale. Cette page
                sépare l’explication globale (dataset) de l’explication locale (profil) pour une meilleure transparence.
              </p>
            </GlassCard>
          </div>

          {/* Right side */}
          <div className="lg:col-span-2 space-y-6">
            <GlassCard className="p-6">
              <h3 className="font-heading text-lg font-semibold">Résumé</h3>
              <p className="mt-2 text-sm text-muted-foreground">{summaryText}</p>

              <div className="mt-4 grid gap-2">
                {top3.map((t) => (
                  <div key={t.feature} className="rounded-2xl border bg-background/50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{t.feature}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: t.direction === "positive" ? "hsl(340,65%,60%,0.15)" : "hsl(170,60%,50%,0.15)",
                          color: t.direction === "positive" ? "hsl(340,65%,60%)" : "hsl(170,60%,50%)",
                        }}
                      >
                        {t.direction === "positive" ? "↑ Risk" : "↓ Protect"}
                      </span>
                    </div>

                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${clamp(t.absValue * 100, 0, 100)}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7 }}
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: t.direction === "positive" ? "hsl(340,65%,60%)" : "hsl(170,60%,50%)",
                        }}
                      />
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">Importance: {(t.absValue * 100).toFixed(1)}%</p>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="font-heading text-lg font-semibold">Counterfactual (What to change?)</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Actions proposées pour réduire le score (estimation).
              </p>

              <div className="mt-4 space-y-2">
                {tips.map((t) => (
                  <div key={t.title} className="rounded-2xl border bg-background/50 p-3">
                    <div className="text-sm font-semibold">{t.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Changement: <span className="font-medium text-foreground">{t.change}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Effet estimé: <span className="font-medium text-foreground">{t.effect}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="w-full" onClick={copySummary}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copier
                </Button>
                <Button className="w-full" onClick={() => alert("Export PDF v1: à brancher avec ton module report 😉")}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="mb-4 font-heading text-lg font-semibold">Interprétation des facteurs</h3>

              <div className="space-y-3">
                {chartData.map((f) => (
                  <div key={f.feature} className="rounded-2xl border bg-background/50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-heading text-sm font-semibold">{f.feature}</span>
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: f.direction === "positive" ? "hsl(340,65%,60%,0.15)" : "hsl(170,60%,50%,0.15)",
                          color: f.direction === "positive" ? "hsl(340,65%,60%)" : "hsl(170,60%,50%)",
                        }}
                      >
                        {f.direction === "positive" ? "↑ Risque" : "↓ Protection"}
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${clamp(f.absValue * 100, 0, 100)}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7 }}
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: f.direction === "positive" ? "hsl(340,65%,60%)" : "hsl(170,60%,50%)",
                        }}
                      />
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      Contribution: {(f.absValue * 100).toFixed(1)}% (mode {mode})
                    </p>
                  </div>
                ))}
              </div>
            </GlassCard>

            <p className="text-center text-xs text-muted-foreground">
              ⚠️ XAI = explication statistique. Ne remplace pas l’avis médical.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}