import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Send, Loader2, Eye, CheckCircle, AlertCircle, MinusCircle, BookOpen, TrendingUp, Target, Lightbulb, Download, ClipboardCheck, LayoutDashboard, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  observed_evidences?: string[];
  implementation_level?: {
    status: "Inicial" | "En desarrollo" | "Consolidado";
    reason: string;
  };
}

const ObservacionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [obs, setObs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!obs) return;
    setDeleting(true);
    const { error } = await supabase.from("observations").delete().eq("id", obs.id);
    if (error) {
      toast.error("No se pudo eliminar la observación.");
      setDeleting(false);
      return;
    }
    toast.success("Observación eliminada correctamente.");
    navigate("/dashboard");
  };

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
          project_name: obs.project_name || obs.subject,
          problematica: obs.problematica || "",
          producto_final: obs.producto_final || "",
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

  const handleDownloadPDF = () => {
    if (!obs || !obs.ai_analysis) return;
    const analysis: AnalysisData = obs.ai_analysis;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(20);
    doc.setTextColor(33, 150, 243);
    doc.text("Reporte de Observación Pedagógica", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Escuela: ${obs.school}`, 14, 35);
    doc.text(`Docente: ${obs.teacher}`, 14, 42);
    doc.text(`Fecha: ${format(new Date(obs.observation_date), "d 'de' MMMM yyyy", { locale: es })}`, 14, 49);
    doc.text(`Grado: ${obs.grade} ${obs.group_name || ""} · Proyecto: ${obs.project_name || obs.subject}`, 14, 56);

    let currentY = 70;

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Resumen Pedagógico", 14, currentY);
    currentY += 7;
    doc.setFontSize(10);
    const summaryLines = doc.splitTextToSize(analysis.summary, pageWidth - 28);
    doc.text(summaryLines, 14, currentY);
    currentY += (summaryLines.length * 5) + 10;

    doc.setFontSize(14);
    doc.text("Indicadores Evaluados", 14, currentY);
    currentY += 5;

    const tableData = analysis.indicators.map(ind => [ind.name, ind.level, ind.detail]);
    autoTable(doc, {
      startY: currentY,
      head: [["Indicador", "Nivel", "Detalle"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [33, 150, 243] },
      margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    const addSection = (title: string, items: string[] | undefined, color: [number, number, number]) => {
      if (!items || items.length === 0) return;
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      doc.setFontSize(14);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(title, 14, currentY);
      currentY += 7;
      doc.setFontSize(10);
      doc.setTextColor(0);
      items.forEach(item => {
        const lines = doc.splitTextToSize(`• ${item}`, pageWidth - 28);
        doc.text(lines, 14, currentY);
        currentY += (lines.length * 5) + 2;
        if (currentY > 280) { doc.addPage(); currentY = 20; }
      });
      currentY += 5;
    };

    addSection("Evidencias Observadas", analysis.observed_evidences, [33, 150, 243]);
    addSection("Fortalezas", analysis.strengths, [16, 185, 129]);
    addSection("Áreas de Mejora", analysis.improvements, [245, 158, 11]);
    addSection("Recomendaciones", analysis.recommendations, [33, 150, 243]);

    if (analysis.implementation_level) {
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      doc.setFontSize(14);
      doc.setTextColor(33, 150, 243);
      doc.text("Nivel de Implementación del Proyecto", 14, currentY);
      currentY += 7;
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text(`Estatus: ${analysis.implementation_level.status}`, 14, currentY);
      currentY += 6;
      const reasonLines = doc.splitTextToSize(`Justificación: ${analysis.implementation_level.reason}`, pageWidth - 28);
      doc.text(reasonLines, 14, currentY);
    }

    doc.save(`Reporte_Observacion_${obs.teacher.replace(/\s+/g, "_")}.pdf`);
    toast.success("Reporte descargado correctamente");
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
      case "Evidencia clara": return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case "Evidencia parcial": return <AlertCircle className="w-4 h-4 text-amber-600" />;
      default: return <MinusCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getLevelClass = (level: string) => {
    switch (level) {
      case "Evidencia clara": return "evidence-clear";
      case "Evidencia parcial": return "evidence-partial";
      default: return "evidence-none";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-display font-bold text-foreground truncate">{obs.school}</h1>
            <p className="text-xs md:text-sm text-muted-foreground truncate">
              {obs.teacher} · {obs.grade} {obs.group_name} · {obs.project_name || obs.subject}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {analysis && (
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="hidden md:flex">
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar observación?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente la observación de {obs.teacher} en {obs.school}, incluyendo el análisis generado.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {deleting ? "Eliminando..." : "Eliminar"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <span
              className={`text-[10px] md:text-xs px-2 md:px-3 py-1 rounded-full font-medium ${obs.status === "analyzed"
                ? "bg-accent text-accent-foreground"
                : "bg-secondary text-secondary-foreground"
                }`}
            >
              {obs.status === "analyzed" ? "Analizada" : "Borrador"}
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <p className="text-sm text-muted-foreground">
            Fecha: {format(new Date(obs.observation_date), "d 'de' MMMM yyyy", { locale: es })}
          </p>
          {analysis && (
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="md:hidden w-full">
              <Download className="w-4 h-4 mr-2" />
              Descargar Reporte PDF
            </Button>
          )}
        </div>

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
          <Button onClick={handleAnalyze} disabled={analyzing} className="w-full mb-6 py-6 text-base shadow-lg hover:shadow-xl transition-all">
            {analyzing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generando reporte de supervisor...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Generar Reporte de Supervisor
              </>
            )}
          </Button>
        )}

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-6 animate-fade-in pb-12">
            {analysis.implementation_level && (
              <Card className="p-6 border-l-4 border-l-primary bg-primary/5">
                <h2 className="text-lg font-display font-bold text-foreground mb-3 flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5 text-primary" />
                  Nivel de Implementación del Proyecto
                </h2>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${analysis.implementation_level.status === 'Consolidado' ? 'bg-emerald-500 text-white' :
                    analysis.implementation_level.status === 'En desarrollo' ? 'bg-amber-500 text-white' :
                      'bg-slate-500 text-white'
                    }`}>
                    {analysis.implementation_level.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground italic">
                  "{analysis.implementation_level.reason}"
                </p>
              </Card>
            )}

            <Card className="p-6">
              <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Indicadores Pedagógicos
              </h2>
              <div className="grid gap-2">
                {analysis.indicators?.map((ind, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${getLevelClass(ind.level)}`}>
                    <div className="mt-0.5">{getLevelIcon(ind.level)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{ind.name}</p>
                        <span className="text-[10px] uppercase font-bold tracking-wider shrink-0 opacity-70">{ind.level}</span>
                      </div>
                      <p className="text-xs mt-1 opacity-80 leading-relaxed">{ind.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {analysis.observed_evidences && analysis.observed_evidences.length > 0 && (
              <Card className="p-6 bg-slate-50 border-dashed border-slate-300">
                <h2 className="text-lg font-display font-bold text-foreground mb-3 flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                  Evidencias Observadas
                </h2>
                <ul className="grid gap-3">
                  {analysis.observed_evidences.map((e, i) => (
                    <li key={i} className="text-sm text-foreground flex items-start gap-3 bg-white p-3 rounded-md shadow-sm border border-slate-100">
                      <span className="text-primary font-bold text-xs mt-0.5">•</span>
                      {e}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card className="p-6">
              <h2 className="text-lg font-display font-bold text-foreground mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Diagnóstico del Estilo de Enseñanza
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed bg-accent/30 p-4 rounded-lg border border-accent">
                {analysis.summary}
              </p>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 bg-emerald-50/50 border-emerald-100">
                <h2 className="text-lg font-display font-bold text-emerald-700 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  Fortalezas
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

              <Card className="p-6 bg-amber-50/50 border-amber-100">
                <h2 className="text-lg font-display font-bold text-amber-700 mb-3 flex items-center gap-2">
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
            </div>

            <Card className="p-6 border-primary/20 bg-primary/5">
              <h2 className="text-lg font-display font-bold text-foreground mb-3 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                Sugerencias Didácticas Específicas
              </h2>
              <ul className="space-y-3">
                {analysis.recommendations?.map((s, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-3 p-3 bg-white rounded-lg border border-primary/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-2" />
                    {s}
                  </li>
                ))}
              </ul>
            </Card>

            <Button onClick={handleDownloadPDF} className="w-full py-6 text-base">
              <Download className="w-5 h-5 mr-2" />
              Descargar Reporte Completo (PDF)
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default ObservacionDetail;
