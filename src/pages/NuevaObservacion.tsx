import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Eye as EyeIcon, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

const NuevaObservacion = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"info" | "vistazos">("info");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [info, setInfo] = useState({
    school: "",
    teacher: "",
    grade: "",
    group_name: "",
    subject: "",
    observation_date: new Date().toISOString().split("T")[0],
  });

  const [vistazos, setVistazos] = useState<string[]>(Array(10).fill(""));

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("vistazos");
  };

  const updateVistazo = (index: number, value: string) => {
    const updated = [...vistazos];
    updated[index] = value;
    setVistazos(updated);
  };

  const filledCount = vistazos.filter((v) => v.trim().length > 0).length;

  const handleSaveDraft = async () => {
    if (!user) return;
    setLoading(true);
    const vistazoData: Record<string, string> = {};
    vistazos.forEach((v, i) => {
      vistazoData[`vistazo_${i + 1}`] = v;
    });

    const { data, error } = await supabase
      .from("observations")
      .insert({
        user_id: user.id,
        ...info,
        ...vistazoData,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      toast.error("Error al guardar: " + error.message);
    } else {
      toast.success("Borrador guardado");
      navigate(`/observacion/${data.id}`);
    }
    setLoading(false);
  };

  const handleAnalyze = async () => {
    if (!user) return;
    if (filledCount < 3) {
      toast.error("Registra al menos 3 vistazos para analizar.");
      return;
    }
    setAnalyzing(true);

    const vistazoData: Record<string, string> = {};
    vistazos.forEach((v, i) => {
      vistazoData[`vistazo_${i + 1}`] = v;
    });

    // First save the observation
    const { data: obs, error: saveError } = await supabase
      .from("observations")
      .insert({
        user_id: user.id,
        ...info,
        ...vistazoData,
        status: "draft",
      })
      .select()
      .single();

    if (saveError || !obs) {
      toast.error("Error al guardar: " + (saveError?.message || ""));
      setAnalyzing(false);
      return;
    }

    // Call AI analysis
    try {
      const response = await supabase.functions.invoke("analyze-observation", {
        body: {
          vistazos: vistazos.filter((v) => v.trim()),
          teacher: info.teacher,
          school: info.school,
          grade: info.grade,
          subject: info.subject,
        },
      });

      if (response.error) throw response.error;

      const analysis = response.data;

      // Update observation with analysis
      await supabase
        .from("observations")
        .update({ ai_analysis: analysis, status: "analyzed" })
        .eq("id", obs.id);

      toast.success("¡Análisis completado!");
      navigate(`/observacion/${obs.id}`);
    } catch (err: any) {
      toast.error("Error en el análisis: " + (err.message || "Intenta de nuevo"));
      navigate(`/observacion/${obs.id}`);
    }
    setAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => step === "vistazos" ? setStep("info") : navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-lg font-display font-bold text-foreground">Nueva observación</h1>
            <p className="text-sm text-muted-foreground">
              {step === "info" ? "Paso 1: Información básica" : "Paso 2: Registra los 10 vistazos"}
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {step === "info" ? (
          <form onSubmit={handleInfoSubmit} className="space-y-5">
            <Card className="p-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="school">Escuela</Label>
                <Input id="school" placeholder="Nombre de la escuela" value={info.school} onChange={(e) => setInfo({ ...info, school: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacher">Docente</Label>
                <Input id="teacher" placeholder="Nombre del docente" value={info.teacher} onChange={(e) => setInfo({ ...info, teacher: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grade">Grado</Label>
                  <Input id="grade" placeholder="Ej. 3°" value={info.grade} onChange={(e) => setInfo({ ...info, grade: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="group">Grupo</Label>
                  <Input id="group" placeholder="Ej. A" value={info.group_name} onChange={(e) => setInfo({ ...info, group_name: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Asignatura</Label>
                <Input id="subject" placeholder="Ej. Matemáticas" value={info.subject} onChange={(e) => setInfo({ ...info, subject: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input id="date" type="date" value={info.observation_date} onChange={(e) => setInfo({ ...info, observation_date: e.target.value })} required />
              </div>
            </Card>
            <Button type="submit" className="w-full">
              Continuar a los vistazos
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{filledCount}/10</span> vistazos registrados
              </p>
              <div className="flex gap-1">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      vistazos[i]?.trim() ? "bg-primary" : "bg-border"
                    }`}
                  />
                ))}
              </div>
            </div>

            {vistazos.map((v, i) => (
              <div key={i} className="vistazo-card animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center gap-2 mb-2">
                  <EyeIcon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Vistazo {i + 1}</span>
                </div>
                <Textarea
                  placeholder="Describe brevemente lo que observas en este momento del aula..."
                  value={v}
                  onChange={(e) => updateVistazo(i, e.target.value)}
                  className="min-h-[80px] resize-none"
                />
              </div>
            ))}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleSaveDraft} disabled={loading} className="flex-1">
                {loading ? "Guardando..." : "Guardar borrador"}
              </Button>
              <Button onClick={handleAnalyze} disabled={analyzing || filledCount < 3} className="flex-1">
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Analizar observación
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default NuevaObservacion;
