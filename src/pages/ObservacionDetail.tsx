import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Send, Loader2, Eye, CheckCircle, AlertCircle, MinusCircle, BookOpen, TrendingUp, Target, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AnalysisIndicator {
  name: string;
  level: "Evidencia clara" | "Evidencia parcial" | "No observable";
  detail: string;
}

interface AnalysisData {
  indicators: AnalysisIndicator[];
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
}

const ObservacionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [obs, setObs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const fetchObs = async () => {
      const { data, error } = await supabase
        .from("observations")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        toast.error("Observación no encontrada");
        navigate("/dashboard");
        return;
      }
      setObs(data);
      setLoading(false);
    };
    fetchObs();
  }, [id, navigate]);

  const handleAnalyze = async () => {
    if (!obs) return;
    setAnalyzing(true);
    const vistazos: string[] = [];
    for (let i = 1; i <= 10; i++) {
      const v = obs[`vistazo_${i}`];
      if (v?.trim()) vistazos.push(v);
    }

    if (vistazos.length < 3) {
      toast.error("Se necesitan al menos 3 vistazos para analizar.");
      setAnalyzing(false);
      return;
    }

    try {
      const response = await supabase.functions.invoke("analyze-observation", {
        body: {
          vistazos,
          teacher: obs.teacher,
          school: obs.school,
          grade: obs.grade,
          subject: obs.subject,
        },
      });

      if (response.error) throw response.error;

      await supabase
        .from("observations")
        .update({ ai_analysis: response.data, status: "analyzed" })
        .eq("id", obs.id);

      setObs({ ...obs, ai_analysis: response.data, status: "analyzed" });
      toast.success("¡Análisis completado!");
    } catch (err: any) {
      toast.error("Error: " + (err.message || "Intenta de nuevo"));
    }
    setAnalyzing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!obs) return null;

  const analysis: AnalysisData | null = obs.ai_analysis;
  const vistazos: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const v = obs[`vistazo_${i}`];
    if (v?.trim()) vistazos.push(v);
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "Evidencia clara":
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case "Evidencia parcial":
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      default:
        return <MinusCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getLevelClass = (level: string) => {
    switch (level) {
      case "Evidencia clara":
        return "evidence-clear";
      case "Evidencia parcial":
        return "evidence-partial";
      default:
        return "evidence-none";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-display font-bold text-foreground">{obs.school}</h1>
            <p className="text-sm text-muted-foreground">
              {obs.teacher} · {obs.grade} {obs.group_name} · {obs.subject}
            </p>
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-full font-medium ${
              obs.status === "analyzed"
                ? "bg-accent text-accent-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            {obs.status === "analyzed" ? "Analizada" : "Borrador"}
          </span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <p className="text-sm text-muted-foreground mb-6">
          Fecha: {format(new Date(obs.observation_date), "d 'de' MMMM yyyy", { locale: es })}
        </p>

        {/* Vistazos */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Vistazos registrados ({vistazos.length}/10)
          </h2>
          <div className="space-y-3">
            {vistazos.map((v, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="text-xs font-medium text-primary bg-accent rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-foreground">{v}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Analyze button */}
        {!analysis && (
          <Button onClick={handleAnalyze} disabled={analyzing} className="w-full mb-6">
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analizando con IA...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Analizar observación
              </>
            )}
          </Button>
        )}

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-6 animate-fade-in">
            {/* Indicators Table */}
            <Card className="p-6">
              <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Indicadores Pedagógicos
              </h2>
              <div className="space-y-2">
                {analysis.indicators?.map((ind, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${getLevelClass(ind.level)}`}
                  >
                    <div className="mt-0.5">{getLevelIcon(ind.level)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{ind.name}</p>
                        <span className="text-xs font-medium shrink-0">{ind.level}</span>
                      </div>
                      <p className="text-xs mt-1 opacity-80">{ind.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Summary */}
            <Card className="p-6">
              <h2 className="text-lg font-display font-bold text-foreground mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Resumen Pedagógico
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{analysis.summary}</p>
            </Card>

            {/* Strengths */}
            <Card className="p-6">
              <h2 className="text-lg font-display font-bold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Fortalezas Detectadas
              </h2>
              <ul className="space-y-2">
                {analysis.strengths?.map((s, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Improvements */}
            <Card className="p-6">
              <h2 className="text-lg font-display font-bold text-foreground mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Áreas de Mejora
              </h2>
              <ul className="space-y-2">
                {analysis.improvements?.map((s, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Recommendations */}
            <Card className="p-6">
              <h2 className="text-lg font-display font-bold text-foreground mb-3 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                Recomendaciones Pedagógicas
              </h2>
              <ul className="space-y-2">
                {analysis.recommendations?.map((s, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default ObservacionDetail;
