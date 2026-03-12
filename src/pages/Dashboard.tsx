import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  cancerTrendData,
  pollutionData,
  behaviorData,
  correlationFactors,
  regionalData,
  cancerTypes,
} from "@/lib/mock-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

const chartColors = {
  incidence: "hsl(170, 60%, 50%)",
  mortality: "hsl(340, 65%, 60%)",
  lung: "hsl(200, 70%, 55%)",
  breast: "hsl(340, 65%, 60%)",
  colorectal: "hsl(45, 90%, 60%)",
  prostate: "hsl(280, 55%, 60%)",
  pm25: "hsl(170, 60%, 50%)",
  no2: "hsl(45, 90%, 55%)",
  smoking: "hsl(340, 65%, 60%)",
  obesity: "hsl(45, 90%, 55%)",
};

const Dashboard = () => {
  const minYear = cancerTrendData[0]?.year ?? 1975;
  const maxYear = cancerTrendData.at(-1)?.year ?? 2025;
  const [yearRange, setYearRange] = useState([maxYear - 35, maxYear]);
  const [cancerType, setCancerType] = useState("incidence");
  const [normalize, setNormalize] = useState(false);
  const [smooth, setSmooth] = useState(1); // 1 = no smoothing
  const [dataSource, setDataSource] = useState("mock");
  const [csvData, setCsvData] = useState([]);
  const [loadingCsv, setLoadingCsv] = useState(false);
  const [csvError, setCsvError] = useState(null);
  const exportCsv = (filename, rows, keys) => {
    if (!rows?.length) return;
    const header = keys.join(",");
    const lines = rows.map((r) => keys.map((k) => r[k]).join(","));
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredCancer = useMemo(
    () => cancerTrendData.filter((d) => d.year >= yearRange[0] && d.year <= yearRange[1]),
    [yearRange],
  );
  const filteredCancerCsv = useMemo(() => {
    const src = csvData.length ? csvData : cancerTrendData;
    return src.filter((d) => d.year >= yearRange[0] && d.year <= yearRange[1]);
  }, [csvData, yearRange]);
  const filteredPollution = useMemo(
    () => pollutionData.filter((d) => d.year >= yearRange[0] && d.year <= yearRange[1]),
    [yearRange],
  );
  const filteredBehavior = useMemo(
    () => behaviorData.filter((d) => d.year >= yearRange[0] && d.year <= yearRange[1]),
    [yearRange],
  );

  const smoothSeries = (arr, keys, window) => {
    if (window <= 1) return arr;
    return arr.map((row, idx) => {
      const start = Math.max(0, idx - Math.floor(window / 2));
      const end = Math.min(arr.length, idx + Math.ceil(window / 2));
      const span = arr.slice(start, end);
      const averaged = {};
      keys.forEach((k) => {
        averaged[k] = +(span.reduce((s, r) => s + r[k], 0) / span.length).toFixed(2);
      });
      return { ...row, ...averaged };
    });
  };

  const processedCancer = useMemo(() => {
    const keys = ["incidence", "mortality", "lung", "breast", "colorectal", "prostate"];
    const baseData = dataSource === "csv" ? filteredCancerCsv : filteredCancer;
    const base = baseData[0] || {};
    let data = baseData.map((d) => {
      const row = { ...d };
      if (normalize && base[cancerType]) {
        keys.forEach((k) => {
          row[k] = +((d[k] / base[k]) * 100).toFixed(2);
        });
      }
      return row;
    });
    data = smoothSeries(data, keys, smooth);
    return data;
  }, [filteredCancer, filteredCancerCsv, dataSource, normalize, cancerType, smooth]);

  const currentType = cancerTypes.find((c) => c.key === cancerType) || cancerTypes[0];

  const kpi = useMemo(() => {
    const years = filteredCancer.length;
    if (!years) return { avg: 0, delta10: 0, peakYear: "-" };
    const avg = Math.round(processedCancer.reduce((s, d) => s + d[cancerType], 0) / years);
    const recent = processedCancer.at(-1)?.[cancerType];
    const base10 = processedCancer.length > 10 ? processedCancer[processedCancer.length - 11][cancerType] : null;
    const delta10 = base10 ? Math.round(((recent - base10) / base10) * 100) : null;
    const peak = processedCancer.reduce(
      (acc, d) => (d[cancerType] > acc.value ? { year: d.year, value: d[cancerType] } : acc),
      { year: processedCancer[0].year, value: processedCancer[0][cancerType] },
    );
    return { avg, delta10, peakYear: `${peak.year} (${peak.value})` };
  }, [processedCancer, cancerType]);

  const correlationMatrix = useMemo(() => {
    const fields = [
      { key: "smoking", label: "Tabagisme" },
      { key: "obesity", label: "Obésité" },
      { key: "pm25", label: "PM2.5" },
      { key: cancerType, label: currentType.label },
    ];
    const rows = fields.map((f) =>
      fields.map((g) => {
        if (f.key === g.key) return 1;
        const seriesA = f.key === "pm25" ? filteredPollution.map((d) => d.pm25) : filteredBehavior.map((d) => d[f.key]);
        const seriesB = g.key === "pm25" ? filteredPollution.map((d) => d.pm25) : filteredBehavior.map((d) => d[g.key]);
        const meanA = seriesA.reduce((s, x) => s + Number(x), 0) / seriesA.length;
        const meanB = seriesB.reduce((s, x) => s + Number(x), 0) / seriesB.length;
        const num = seriesA.reduce((s, x, i) => s + (x - meanA) * (seriesB[i] - meanB), 0);
        const den =
          Math.sqrt(seriesA.reduce((s, x) => s + (x - meanA) ** 2, 0)) *
          Math.sqrt(seriesB.reduce((s, x) => s + (x - meanB) ** 2, 0));
        return den === 0 ? 0 : +(num / den).toFixed(2);
      }),
    );
    return { fields, rows };
  }, [filteredBehavior, filteredPollution, cancerType, currentType]);

  const [whatIf, setWhatIf] = useState({ pollution: 25, smoking: 5, activity: 4 });
  const whatIfScore = Math.min(100, Math.round(20 + whatIf.pollution * 0.7 + whatIf.smoking * 1.8 - whatIf.activity * 2));

  const loadCsv = async () => {
    setLoadingCsv(true);
    setCsvError(null);
    try {
      const res = await fetch("/datasets/global_cancer_50years_extended_patient_level.csv");
      const text = await res.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      const header = lines[0].split(",");
      const yearIdx = header.indexOf("Year");
      const severityIdx = header.indexOf("Target_Severity_Score");
      const typeIdx = header.indexOf("Cancer_Type");
      const agg = {};
      for (let i = 1; i < Math.min(lines.length, 5001); i++) {
        const cols = lines[i].split(",");
        const year = Number(cols[yearIdx]);
        if (!year || Number.isNaN(year)) continue;
        const severity = Number(cols[severityIdx] || 0);
        const type = cols[typeIdx] || "Other";
        agg[year] = agg[year] || { year, incidence: 0, mortality: 0, lung: 0, breast: 0, colorectal: 0, prostate: 0 };
        agg[year].incidence += 1;
        if (type.toLowerCase().includes("lung")) agg[year].lung += 1;
        if (type.toLowerCase().includes("breast")) agg[year].breast += 1;
        if (type.toLowerCase().includes("colorectal")) agg[year].colorectal += 1;
        if (type.toLowerCase().includes("prostate")) agg[year].prostate += 1;
        agg[year].mortality += severity > 0.7 ? 0.2 : 0.05; // mock severity to mortality proxy
      }
      const arr = Object.values(agg).sort((a, b) => a.year - b.year);
      setCsvData(arr);
      setDataSource("csv");
    } catch (e) {
      setCsvError("Impossible de charger le CSV");
    } finally {
      setLoadingCsv(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="mb-2 font-heading text-3xl font-bold">Dashboard Business Intelligence</h1>
        <p className="mb-8 text-muted-foreground">
          Analyse historique des tendances de cancer et des facteurs de risque (1975–2025)
        </p>
      </motion.div>

      {/* Filtres */}
      <div className="mb-6 grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Période</p>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{yearRange[0]}</span>
            <Slider value={yearRange} min={minYear} max={maxYear} step={1} onValueChange={(v) => setYearRange(v)} className="flex-1" />
            <span className="text-sm text-muted-foreground">{yearRange[1]}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setYearRange([maxYear - 4, maxYear])}
            >
              5 ans
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setYearRange([maxYear - 9, maxYear])}
            >
              10 ans
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setYearRange([minYear, maxYear])}
            >
              50 ans
            </Button>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Type de cancer</p>
          <Select value={cancerType} onValueChange={setCancerType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {cancerTypes.map((t) => (
                <SelectItem key={t.key} value={t.key}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Switch checked={normalize} onCheckedChange={setNormalize} id="normalize" />
              <label htmlFor="normalize" className="text-muted-foreground">Normaliser (% base année de début)</label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Lissage</span>
              {[1, 3, 5].map((w) => (
                <Button key={w} variant={smooth === w ? "default" : "outline"} size="sm" onClick={() => setSmooth(w)}>
                  {w === 1 ? "off" : `${w} ans`}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant={dataSource === "mock" ? "default" : "outline"} onClick={() => setDataSource("mock")}>
                Mock
              </Button>
              <Button size="sm" variant={dataSource === "csv" ? "default" : "outline"} disabled={loadingCsv} onClick={loadCsv}>
                {loadingCsv ? "Chargement..." : "Charger CSV"}
              </Button>
              {csvError && <span className="text-xs text-destructive">{csvError}</span>}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-sm">
            <p className="text-muted-foreground">Moyenne</p>
            <p className="text-xl font-heading font-semibold text-foreground">{kpi.avg}</p>
          </Card>
          <Card className="p-3 text-sm">
            <p className="text-muted-foreground">Δ 10 ans</p>
            <p className="text-xl font-heading font-semibold text-foreground">
              {kpi.delta10 !== null ? `${kpi.delta10}%` : "N/A"}
            </p>
          </Card>
          <Card className="p-3 text-sm">
            <p className="text-muted-foreground">Pic</p>
            <p className="text-sm font-heading text-foreground">{kpi.peakYear}</p>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="trends" className="space-y-6">
        <TabsList className="flex flex-wrap bg-card border border-border">
          <TabsTrigger value="trends">Tendances Cancer</TabsTrigger>
          <TabsTrigger value="types">Par Type</TabsTrigger>
          <TabsTrigger value="environment">Environnement</TabsTrigger>
          <TabsTrigger value="behavior">Comportement</TabsTrigger>
          <TabsTrigger value="correlations">Corrélations</TabsTrigger>
          <TabsTrigger value="regions">Heatmap Régions</TabsTrigger>
          <TabsTrigger value="whatif">What-if</TabsTrigger>
        </TabsList>

        <TabsContent value="trends">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 font-heading text-lg font-semibold">
              Incidence et Mortalité du Cancer (pour 100 000 hab.)
            </h3>
            <div className="mb-2 flex justify-end gap-2 text-xs text-muted-foreground">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportCsv("tendances", processedCancer, ["year", "incidence", "mortality"])}
                    aria-label="Exporter les tendances en CSV"
                  >
                    Exporter CSV
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export des points de la plage filtrée</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger className="cursor-help underline decoration-dashed">Normaliser/Lissage ?</TooltipTrigger>
                <TooltipContent>
                  Normaliser : valeurs en % de l&apos;année de départ. Lissage : moyenne glissante 3/5 ans.
                </TooltipContent>
              </Tooltip>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={processedCancer}>
                <defs>
                  <linearGradient id="gradInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.incidence} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartColors.incidence} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradMort" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.mortality} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartColors.mortality} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,18%,16%)" />
                <XAxis dataKey="year" stroke="hsl(220,10%,55%)" fontSize={12} />
                <YAxis stroke="hsl(220,10%,55%)" fontSize={12} />
                <RechartsTooltip contentStyle={{ background: "hsl(220,22%,9%)", border: "1px solid hsl(220,18%,16%)", borderRadius: 8 }} />
                <Legend />
                <Area type="monotone" dataKey="incidence" name="Incidence" stroke={chartColors.incidence} fill="url(#gradInc)" strokeWidth={2} />
                <Area type="monotone" dataKey="mortality" name="Mortalité" stroke={chartColors.mortality} fill="url(#gradMort)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="types">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 font-heading text-lg font-semibold">
              Incidence par Type de Cancer
            </h3>
            <div className="mb-2 flex justify-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportCsv("par-type", processedCancer, ["year", "lung", "breast", "colorectal", "prostate"])}
                    aria-label="Exporter les séries par type en CSV"
                  >
                    Exporter CSV
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export des séries par type</TooltipContent>
              </Tooltip>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={processedCancer}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,18%,16%)" />
                <XAxis dataKey="year" stroke="hsl(220,10%,55%)" fontSize={12} />
                <YAxis stroke="hsl(220,10%,55%)" fontSize={12} />
                <RechartsTooltip contentStyle={{ background: "hsl(220,22%,9%)", border: "1px solid hsl(220,18%,16%)", borderRadius: 8 }} />
                <Legend />
                <Line type="monotone" dataKey="lung" name="Poumon" stroke={chartColors.lung} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="breast" name="Sein" stroke={chartColors.breast} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="colorectal" name="Colorectal" stroke={chartColors.colorectal} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="prostate" name="Prostate" stroke={chartColors.prostate} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="environment">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 font-heading text-lg font-semibold">
              Indicateurs Environnementaux
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={filteredPollution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,18%,16%)" />
                <XAxis dataKey="year" stroke="hsl(220,10%,55%)" fontSize={12} />
                <YAxis stroke="hsl(220,10%,55%)" fontSize={12} />
                <RechartsTooltip contentStyle={{ background: "hsl(220,22%,9%)", border: "1px solid hsl(220,18%,16%)", borderRadius: 8 }} />
                <Legend />
                <Line type="monotone" dataKey="pm25" name="PM2.5 (µg/m³)" stroke={chartColors.pm25} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="no2" name="NO₂ (ppb)" stroke={chartColors.no2} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="behavior">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 font-heading text-lg font-semibold">
              Facteurs Comportementaux (%)
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={filteredBehavior}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,18%,16%)" />
                <XAxis dataKey="year" stroke="hsl(220,10%,55%)" fontSize={12} />
                <YAxis stroke="hsl(220,10%,55%)" fontSize={12} />
                <RechartsTooltip contentStyle={{ background: "hsl(220,22%,9%)", border: "1px solid hsl(220,18%,16%)", borderRadius: 8 }} />
                <Legend />
                <Line type="monotone" dataKey="smoking" name="Tabagisme" stroke={chartColors.smoking} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="obesity" name="Obésité" stroke={chartColors.obesity} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        <TabsContent value="correlations">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 font-heading text-lg font-semibold">
              Corrélation avec l'Incidence du Cancer
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-background p-3">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={correlationFactors} layout="vertical" margin={{ left: 120 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,18%,16%)" />
                    <XAxis type="number" domain={[-1, 1]} stroke="hsl(220,10%,55%)" fontSize={12} />
                    <YAxis type="category" dataKey="factor" stroke="hsl(220,10%,55%)" fontSize={12} width={110} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(220,22%,9%)",
                        border: "1px solid hsl(220,18%,16%)",
                        borderRadius: 8,
                      }}
                    />
                    <Bar dataKey="correlation" name="Corrélation" fill={chartColors.incidence} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="mb-3 text-sm font-medium text-foreground">Matrice de corrélation (mock)</p>
                <div className="grid" style={{ gridTemplateColumns: `repeat(${correlationMatrix.fields.length + 1}, 1fr)` }}>
                  <div />
                  {correlationMatrix.fields.map((f) => (
                    <div key={`h-${f.key}`} className="p-2 text-center text-xs font-medium text-muted-foreground">
                      {f.label}
                    </div>
                  ))}
                  {correlationMatrix.fields.map((row, i) => (
                    <React.Fragment key={`row-${row.key}`}>
                      <div className="p-2 text-xs font-medium text-muted-foreground border-t border-border">
                        {row.label}
                      </div>
                      {correlationMatrix.rows[i].map((v, j) => {
                        const color = `hsla(${v >= 0 ? 170 : 0}, 70%, 50%, ${Math.abs(v)})`;
                        return (
                          <div
                            key={`cell-${row.key}-${correlationMatrix.fields[j].key}`}
                            className="flex items-center justify-center border-t border-border text-xs"
                            style={{ background: `linear-gradient(135deg, ${color}, rgba(0,0,0,0))` }}
                          >
                            {v.toFixed(2)}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="regions">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 font-heading text-lg font-semibold">Heatmap Régions (mock)</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {regionalData.map((r) => {
                const value = r.incidence;
                const color = `hsla(170, 60%, 45%, ${Math.min(1, value / 550)})`;
                return (
                  <div key={r.region} className="rounded-lg border border-border bg-background p-4">
                    <p className="text-sm font-medium text-foreground">{r.region}</p>
                    <p className="text-2xl font-heading font-semibold text-foreground">{value}</p>
                    <div className="mt-2 h-2 w-full rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${(value / 600) * 100}%`, background: color }} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Pollution: {r.pollution} µg/m³</p>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="whatif">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 font-heading text-lg font-semibold">What-if (simulation rapide)</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                {[
                  { key: "pollution", label: "Pollution PM2.5", min: 5, max: 80, step: 1, unit: "µg/m³" },
                  { key: "smoking", label: "Tabagisme", min: 0, max: 40, step: 1, unit: "cig/j" },
                  { key: "activity", label: "Activité physique", min: 0, max: 15, step: 0.5, unit: "h/sem" },
                ].map((f) => (
                  <div key={f.key}>
                    <div className="flex items-center justify-between mb-1 text-sm text-muted-foreground">
                      <span>{f.label}</span>
                      <span className="text-foreground font-medium">
                        {whatIf[f.key]} {f.unit}
                      </span>
                    </div>
                    <Slider
                      value={[whatIf[f.key]]}
                      min={f.min}
                      max={f.max}
                      step={f.step}
                      onValueChange={(v) => setWhatIf((p) => ({ ...p, [f.key]: v[0] }))}
                    />
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-border bg-background p-4 flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">Score simulé (mock)</p>
                <div className="flex items-end gap-3">
                  <p className="text-5xl font-heading font-bold text-foreground">{whatIfScore}</p>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
                <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${whatIfScore}%`,
                      background:
                        whatIfScore > 70 ? "hsl(0,72%,51%)" : whatIfScore > 40 ? "hsl(45,90%,50%)" : "hsl(150,60%,45%)",
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Simulation illustrative liant pollution et tabagisme (+) et activité physique (-).
                </p>
                <Button variant="outline" size="sm" onClick={() => setWhatIf({ pollution: 25, smoking: 5, activity: 4 })}>
                  Réinitialiser
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
