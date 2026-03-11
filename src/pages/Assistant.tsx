import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const presetQuestions = [
  "Quels sont les principaux facteurs de risque du cancer ?",
  "Comment la pollution affecte-t-elle l'incidence du cancer ?",
  "Quelles recommandations pour un score de risque élevé ?",
  "Expliquer la tendance du cancer du poumon depuis 1975",
];

// Simulated AI responses
const mockResponses = {
  default: `Je suis l'Agent IA CancerRisk AI. Je peux vous aider à comprendre vos résultats de risk score, expliquer les facteurs de risque et proposer des recommandations de prévention personnalisées.`,
  facteurs: `## Principaux Facteurs de Risque du Cancer

Les facteurs les plus influents identifiés par notre modèle sont :

1. **Pollution atmosphérique (PM2.5)** — Contribution : 28%
   - L'exposition prolongée aux particules fines augmente significativement le risque de cancers pulmonaires.

2. **Tabagisme** — Contribution : 22%
   - Le facteur comportemental le plus documenté, avec un lien causal établi pour plus de 15 types de cancer.

3. **Âge** — Contribution : 15%
   - Le risque augmente naturellement avec l'âge en raison de l'accumulation de mutations cellulaires.

4. **Sédentarité** — Contribution : 12%
   - L'inactivité physique est associée à un risque accru de cancers colorectaux, du sein et de l'endomètre.

### Recommandations
- Réduire l'exposition à la pollution (filtres HEPA, éviter les zones à fort trafic)
- Arrêter le tabac (bénéfice significatif même après 50 ans)
- Pratiquer ≥150 min d'activité physique modérée par semaine`,
  pollution: `## Impact de la Pollution sur l'Incidence du Cancer

Notre analyse des données sur 50 ans montre une **corrélation de 0.82** entre les niveaux de PM2.5 et l'incidence du cancer.

### Mécanismes identifiés :
- **Stress oxydatif** : Les particules fines provoquent des dommages à l'ADN
- **Inflammation chronique** : Réponse immunitaire prolongée favorisant la carcinogenèse
- **Perturbateurs endocriniens** : Certains polluants atmosphériques mimiquent les hormones

### Données clés :
- Régions industrielles : +35% d'incidence par rapport à la moyenne
- Chaque augmentation de 10 µg/m³ de PM2.5 → +8% de risque de cancer pulmonaire
- Les émissions de NO₂ sont corrélées à 0.72 avec les leucémies infantiles`,
  recommandations: `## Recommandations pour Score de Risque Élevé

### 🔴 Actions Immédiates
1. **Consultation médicale** : Planifier un bilan de santé complet
2. **Dépistage** : Suivre les recommandations de dépistage adaptées à votre profil

### 🟡 Modifications Comportementales
1. **Alimentation** : Adopter un régime riche en fruits, légumes et fibres
2. **Activité physique** : Minimum 30 min/jour d'exercice modéré
3. **Tabac/Alcool** : Réduction progressive avec support médical

### 🟢 Prévention Environnementale
1. **Qualité de l'air intérieur** : Purificateur HEPA, plantes dépolluantes
2. **Eau** : Filtration si contamination locale détectée
3. **Exposition professionnelle** : Évaluation des risques au travail

⚠️ *Ces recommandations ne remplacent pas un avis médical professionnel.*`,
  tendance: `## Évolution du Cancer du Poumon (1975-2025)

### Tendances Observées :
- **1975-1990** : Augmentation forte (+45%), corrélée au pic de tabagisme
- **1990-2005** : Stabilisation chez les hommes, augmentation chez les femmes
- **2005-2025** : Baisse modérée (-15%) grâce aux politiques anti-tabac

### Facteurs Explicatifs :
1. Politiques anti-tabac (interdictions, taxes) → effet positif avec 15-20 ans de décalage
2. Augmentation de la pollution urbaine → effet compensatoire négatif
3. Amélioration du dépistage → détection plus précoce

### Prévisions du Modèle :
Le modèle prédit une **stabilisation** de l'incidence d'ici 2030, sous réserve du maintien des politiques actuelles.`,
};

function getResponse(input) {
  const lower = input.toLowerCase();
  if (lower.includes("facteur") || lower.includes("risque") && lower.includes("principal")) return mockResponses.facteurs;
  if (lower.includes("pollution")) return mockResponses.pollution;
  if (lower.includes("recommandation") || lower.includes("score") && lower.includes("élevé")) return mockResponses.recommandations;
  if (lower.includes("tendance") || lower.includes("poumon") || lower.includes("1975")) return mockResponses.tendance;
  return mockResponses.default;
}

const Assistant = () => {
  const [messages, setMessages] = useState([{ role: "assistant", content: mockResponses.default }]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;

    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setInput("");
    setIsTyping(true);

    // Simulate delay
    await new Promise((r) => setTimeout(r, 1200));

    setMessages((prev) => [...prev, { role: "assistant", content: getResponse(msg) }]);
    setIsTyping(false);
  };

  return (
    <div className="container mx-auto flex h-[calc(100vh-4rem)] flex-col px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
        <h1 className="mb-1 font-heading text-3xl font-bold">
          <MessageCircle className="mr-2 inline h-8 w-8 text-primary" />
          Agent IA Génératif
        </h1>
        <p className="text-sm text-muted-foreground">
          Posez vos questions sur les résultats, facteurs de risque et recommandations.
        </p>
      </motion.div>

      {/* Preset questions */}
      <div className="mb-4 flex flex-wrap gap-2">
        {presetQuestions.map((q) => (
          <button
            key={q}
            onClick={() => handleSend(q)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-border bg-card p-4">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                msg.role === "assistant" ? "gradient-primary" : "bg-secondary"
              }`}
            >
              {msg.role === "assistant" ? (
                <Bot className="h-4 w-4 text-primary-foreground" />
              ) : (
                <User className="h-4 w-4 text-secondary-foreground" />
              )}
            </div>
            <div
              className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "assistant"
                  ? "bg-secondary/50 text-foreground"
                  : "gradient-primary text-primary-foreground"
              }`}
            >
              <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{
                __html: msg.content
                  .replace(/## (.*)/g, '<h3 class="font-heading font-semibold text-base mb-2 mt-3">$1</h3>')
                  .replace(/### (.*)/g, '<h4 class="font-heading font-semibold text-sm mb-1 mt-2">$1</h4>')
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\n- /g, '\n• ')
                  .replace(/\n(\d+)\. /g, '\n$1. ')
              }} />
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex gap-1 rounded-xl bg-secondary/50 px-4 py-3">
              <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" style={{ animationDelay: "0.2s" }} />
              <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 flex gap-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Posez votre question..."
          className="min-h-[44px] max-h-32 resize-none bg-card"
          rows={1}
        />
        <Button onClick={() => handleSend()} size="icon" className="gradient-primary border-0 shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default Assistant;
