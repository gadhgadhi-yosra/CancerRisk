import { Link, NavLink } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  BarChart3,
  Brain,
  MessageCircle,
  Shield,
  ArrowRight,
  Activity,
  TrendingUp,
  Database,
  Target,
  Sparkles,
  LineChart,
  Map,
  BadgeCheck,
  Lock,
  FileDown,
  ChevronDown,
  Zap,
  Globe2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

/* =========================
   DATA
========================= */

const features = [
  {
    icon: BarChart3,
    title: "Analyse décisionnelle (BI)",
    desc: "Analyse des tendances épidémiologiques sur 50 ans avec filtres avancés.",
    link: "/dashboard",
    bullets: ["Filtres temporels et géographiques", "Comparaison multi-pays", "Export PNG/CSV"],
  },
  {
    icon: Shield,
    title: "Estimation du risque (ML)",
    desc: "Estimation personnalisée basée sur des facteurs comportementaux et environnementaux.",
    link: "/risk-score",
    bullets: ["Saisie guidée", "Simulation de scénarios", "Recommandations préventives"],
  },
  {
    icon: Brain,
    title: "Explainable AI",
    desc: "Interprétation transparente des prédictions (SHAP/LIME).",
    link: "/xai",
    bullets: ["Facteurs dominants", "Contributions positives/négatives", "Lecture simplifiée"],
  },
  {
    icon: MessageCircle,
    title: "Assistant analytique",
    desc: "Synthèse en langage naturel des résultats et recommandations.",
    link: "/assistant",
    bullets: ["Questions guidées", "Réponses contextualisées", "Résumé exportable"],
  },
];

const stats = [
  { value: "19.3M", label: "Cas/an dans le monde", icon: TrendingUp },
  { value: "50+", label: "Années de données", icon: Database },
  { value: "12+", label: "Facteurs étudiés", icon: Activity },
  { value: "4", label: "Modules intégrés", icon: Target },
];

const marqueeItems = [
  { icon: LineChart, text: "Tendances 50 ans" },
  { icon: Map, text: "Cartographie régionale" },
  { icon: Zap, text: "Simulation de scénarios" },
  { icon: Sparkles, text: "Assistant analytique" },
  { icon: Brain, text: "SHAP / LIME" },
  { icon: Shield, text: "Score de risque" },
  { icon: Database, text: "Données consolidées" },
];

const trustBadges = [
  { icon: BadgeCheck, title: "Explicabilité", desc: "Résultats interprétables et traçables" },
  { icon: Lock, title: "Confidentialité", desc: "Données minimisées et protégées" },
  { icon: Globe2, title: "Couverture", desc: "Analyse multi-pays et multi-régions" },
  { icon: FileDown, title: "Restitution", desc: "Figures et résultats exportables" },
];

/* =========================
   HELPERS
========================= */

function useAutoscroll(ref: RefObject<HTMLDivElement | null>, enabled: boolean, speedPxPerSec = 26) {
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    const step = (t: number) => {
      if (!lastRef.current) lastRef.current = t;
      const dt = (t - lastRef.current) / 1000;
      lastRef.current = t;

      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll > 0) {
        el.scrollTop += speedPxPerSec * dt;
        if (el.scrollTop >= maxScroll - 2) el.scrollTop = 0;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = 0;
    };
  }, [ref, enabled, speedPxPerSec]);
}

/* =========================
   UI BLOCKS
========================= */

type AppNavbarProps = {
  onGoDemo: () => void;
};

const AppNavbar = ({ onGoDemo }: AppNavbarProps) => {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition ${
      isActive
        ? "bg-primary/15 text-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
    }`;

  return (
    <div className="sticky top-0 z-50 border-b border-border/70 bg-background/70 backdrop-blur-xl">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-2xl bg-primary/15" />
            <motion.div
              className="absolute inset-0 rounded-2xl"
              animate={{
                boxShadow: [
                  "0 0 0px rgba(99,102,241,0.0)",
                  "0 0 24px rgba(99,102,241,0.28)",
                  "0 0 0px rgba(99,102,241,0.0)",
                ],
              }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <Activity className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-primary" />
          </div>

          <div className="leading-tight">
            <div className="font-heading text-sm font-semibold">CancerRisk AI</div>
            <div className="text-xs text-muted-foreground">BI • ML • XAI • Agent</div>
          </div>
        </Link>

        <div className="hidden items-center gap-2 lg:flex">
          <NavLink to="/" className={navClass}>
            Accueil
          </NavLink>
          <NavLink to="/dashboard" className={navClass}>
            <BarChart3 className="h-4 w-4" /> Dashboard BI
          </NavLink>
          <NavLink to="/risk-score" className={navClass}>
            <Shield className="h-4 w-4" /> Risk Score
          </NavLink>
          <NavLink to="/xai" className={navClass}>
            <Brain className="h-4 w-4" /> XAI
          </NavLink>
          <NavLink to="/assistant" className={navClass}>
            <MessageCircle className="h-4 w-4" /> Agent IA
          </NavLink>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="hidden md:inline-flex" onClick={onGoDemo}>
            Démo rapide
          </Button>
          <Button asChild className="gradient-primary border-0 font-heading font-semibold">
            <Link to="/risk-score">
              Calculer mon Score <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

type MarqueeProps = {
  reduced: boolean;
};

const Marquee = ({ reduced }: MarqueeProps) => {
  return (
    <div className="relative overflow-hidden border-y border-border bg-card/40">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Fonctionnalités clés</span>
        </div>
      </div>

      <div className="pb-5">
        <motion.div
          className="flex w-max"
          animate={reduced ? undefined : { x: ["0%", "-50%"] }}
          transition={reduced ? undefined : { duration: 22, repeat: Infinity, ease: "linear" }}
        >
          <div className="flex shrink-0 items-center gap-6 pr-6 text-sm text-muted-foreground">
            {marqueeItems.concat(marqueeItems).map((m, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-full border border-border/70 bg-background/50 px-4 py-2"
              >
                <m.icon className="h-4 w-4 text-primary" />
                <span className="whitespace-nowrap">{m.text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
};

/* =========================
   PAGE
========================= */

const Index = () => {
  const reduced = useReducedMotion();

  const demoRef = useRef<HTMLDivElement | null>(null);
  const onGoDemo = () => demoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "16%"]);
  const titleY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const titleOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.65]);

  const blobAnim = reduced
    ? undefined
    : { y: [0, -18, 0], x: [0, 12, 0], rotate: [0, 6, 0] };

  const [activeStat, setActiveStat] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setActiveStat((p) => (p + 1) % stats.length), 2400);
    return () => clearInterval(id);
  }, [reduced]);

  // auto scroll panel
  const panelRef = useRef<HTMLDivElement | null>(null);
  useAutoscroll(panelRef, !reduced, 26);

  const showcaseCards = useMemo(
    () => [
      { icon: LineChart, title: "Tendances temporelles", desc: "Incidence, mortalité et variations annuelles." },
      { icon: Globe2, title: "Comparaison multi-pays", desc: "Comparaison entre pays et régions." },
      { icon: Map, title: "Cartographie des zones", desc: "Visualisation des zones critiques et facteurs associés." },
      { icon: Zap, title: "Simulation de scénarios", desc: "Évolution du score selon les paramètres saisis." },
      { icon: Brain, title: "Interprétation XAI", desc: "Facteurs explicatifs et contributions au score." },
      { icon: MessageCircle, title: "Assistant analytique", desc: "Synthèse des résultats en langage naturel." },
      { icon: FileDown, title: "Export des résultats", desc: "Figures et indicateurs pour rapport académique." },
    ],
    []
  );

  return (
    <div className="min-h-screen">
      <AppNavbar onGoDemo={onGoDemo} />

      {/* HERO */}
      <section ref={heroRef} className="relative flex min-h-[78vh] items-center overflow-hidden">
        <motion.div className="absolute inset-0" style={{ y: bgY }}>
          <img src={heroBg} alt="" className="h-full w-full object-cover opacity-35" />
          <div className="absolute inset-0 gradient-hero opacity-85" />
        </motion.div>

        {!reduced && (
          <>
            <motion.div
              className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
              animate={blobAnim}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute right-[-120px] top-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
              animate={blobAnim}
              transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            />
          </>
        )}

        <div className="container relative z-10 mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: "easeOut" }}
            className="max-w-3xl"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-4 py-2 text-sm text-muted-foreground backdrop-blur">
              <Activity className="h-4 w-4 text-primary" />
              Projet académique • 2026 • BI / ML / XAI
            </div>

            <motion.div style={{ y: titleY, opacity: titleOpacity }}>
              <h1 className="mb-5 font-heading text-5xl font-bold leading-tight md:text-7xl">
                <span className="text-gradient">CancerRisk</span> AI
              </h1>

              <p className="mb-4 font-heading text-xl text-muted-foreground md:text-2xl">
                Plateforme d’analyse et d’estimation du risque de cancer
              </p>

              <p className="mb-8 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Cette plateforme combine visualisation des tendances, modélisation prédictive
                et explicabilité afin d’aider à l’interprétation des facteurs de risque.
              </p>
            </motion.div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="gradient-primary border-0 font-heading font-semibold">
                <Link to="/risk-score">
                  Estimer mon score <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="font-heading">
                <Link to="/dashboard">Explorer les données</Link>
              </Button>
              <Button variant="outline" size="lg" className="font-heading" onClick={onGoDemo}>
                Voir la démonstration <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Auto marquee */}
      <Marquee reduced={reduced} />

      {/* STATS */}
      <section className="border-y border-border bg-card/50 py-10">
        <div className="container mx-auto px-6">
          <div className="grid gap-6 md:grid-cols-4">
            {stats.map((s, idx) => (
              <motion.div
                key={s.label}
                className="flex items-center gap-4"
                animate={
                  reduced
                    ? undefined
                    : idx === activeStat
                    ? { y: [0, -4, 0] }
                    : undefined
                }
                transition={{ duration: 1.1, ease: "easeInOut" }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
                  <s.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-heading text-3xl font-bold">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="mb-10">
            <h2 className="font-heading text-3xl font-bold">Modules du système</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Une architecture modulaire orientée analyse, prédiction et interprétation.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <Link
                  to={f.link}
                  className="group flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:glow-primary"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>

                  <h3 className="font-heading text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>

                  <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                    {f.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 inline-flex items-center text-sm font-medium text-primary">
                    Explorer <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO AUTO-SCROLL */}
      <div ref={demoRef} />
      <section className="py-16">
        <div className="container mx-auto grid gap-6 px-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-heading text-xl font-semibold">Aperçu (auto-scroll)</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Présentation synthétique des fonctionnalités principales du projet.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {trustBadges.map((b) => (
                <div key={b.title} className="rounded-xl border border-border bg-background/40 p-4">
                  <div className="flex items-center gap-2">
                    <b.icon className="h-4 w-4 text-primary" />
                    <p className="font-medium">{b.title}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Points clés</p>
              </div>
              <p className="text-xs text-muted-foreground">Défilement automatique</p>
            </div>

            <div ref={panelRef} className="max-h-[360px] overflow-y-auto px-4 py-4">
              <div className="space-y-3">
                {showcaseCards.concat(showcaseCards).map((c, idx) => (
                  <div key={idx} className="flex gap-3 rounded-xl border border-border bg-background/40 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                      <c.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-heading text-sm font-semibold">{c.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-card to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 top-12 h-10 bg-gradient-to-b from-card to-transparent" />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <section className="border-t border-border py-10">
        <div className="container mx-auto px-6 text-center">
          <p className="text-xs text-muted-foreground">
            © 2026 CancerRisk AI — Projet académique. Cette application ne remplace pas un avis médical.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Index;
