import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Send, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";

export default function NuevaObservacion() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [info, setInfo] = useState({
    school: "",
    teacher: "",
    grade: "",
    group_name: "",
    project_name: "",
    problematica: "",
    producto_final: "",
    observation_date: new Date().toISOString().split("T")[0],
  });

  const [vistazos, setVistazos] = useState(Array(10).fill(""));

  const handleVistazoChange = (index: number, value: string) => {
    const nuevos = [...vistazos];
    nuevos[index] = value;
    setVistazos(nuevos);
  };

  const enviarObservacion = async () => {
    if (!info.school || !info.teacher) {
      toast.error("Por favor completa al menos la escuela y el docente.");
      return;
    }

    setLoading(true);
    const validVistazos = vistazos.filter((v) => v.trim());

    if (validVistazos.length < 3) {
      toast.error("Se necesitan al menos 3 vistazos para analizar.");
      setLoading(false);
      return;
    }

    try {
      if (!user) throw new Error("No hay sesión activa");

      const insertData: any = {
        user_id: user.id,
        school: info.school,
        teacher: info.teacher,
        grade: info.grade,
        group_name: info.group_name,
        subject: info.project_name,
        project_name: info.project_name,
        problematica: info.problematica,
        producto_final: info.producto_final,
        observation_date: info.observation_date,
        vistazo_1: vistazos[0] || null,
        vistazo_2: vistazos[1] || null,
        vistazo_3: vistazos[2] || null,
        vistazo_4: vistazos[3] || null,
        vistazo_5: vistazos[4] || null,
        vistazo_6: vistazos[5] || null,
        vistazo_7: vistazos[6] || null,
        vistazo_8: vistazos[7] || null,
        vistazo_9: vistazos[8] || null,
        vistazo_10: vistazos[9] || null,
        status: "draft",
      };

      const { data: newObs, error: insertError } = await supabase
        .from("observations")
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      const response = await supabase.functions.invoke("analyze-observation", {
        body: {
          vistazos: validVistazos,
          school: info.school,
          teacher: info.teacher,
          grade: info.grade,
          project_name: info.project_name,
          problematica: info.problematica,
          producto_final: info.producto_final,
        },
      });

      if (response.error) {
        console.error("Error en análisis:", response.error);
        toast.warning("Observación guardada, pero el análisis falló. Puedes intentarlo desde el detalle.");
        navigate("/dashboard");
        return;
      }

      await supabase
        .from("observations")
        .update({ ai_analysis: response.data, status: "analyzed" })
        .eq("id", newObs.id);

      toast.success("¡Observación analizada correctamente!");
      navigate(`/observacion/${newObs.id}`);
    } catch (error: any) {
      console.error(error);
      toast.error("Error: " + (error.message || "No se pudo procesar la observación"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-display font-bold text-foreground">Nueva Observación de Aula</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-display font-bold text-foreground mb-4">Datos generales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Escuela *</Label>
              <Input value={info.school} onChange={(e) => setInfo({ ...info, school: e.target.value })} placeholder="Nombre de la escuela" />
            </div>
            <div>
              <Label>Docente *</Label>
              <Input value={info.teacher} onChange={(e) => setInfo({ ...info, teacher: e.target.value })} placeholder="Nombre del docente" />
            </div>
            <div>
              <Label>Grado</Label>
              <Input value={info.grade} onChange={(e) => setInfo({ ...info, grade: e.target.value })} placeholder="Ej. 3°" />
            </div>
            <div>
              <Label>Grupo</Label>
              <Input value={info.group_name} onChange={(e) => setInfo({ ...info, group_name: e.target.value })} placeholder="Ej. A" />
            </div>
            <div className="md:col-span-2">
              <Label>Nombre del Proyecto</Label>
              <Input value={info.project_name} onChange={(e) => setInfo({ ...info, project_name: e.target.value })} placeholder="Ej. Cuidemos el agua en nuestra comunidad" />
            </div>
            <div className="md:col-span-2">
              <Label>Problemática que atiende</Label>
              <Input value={info.problematica} onChange={(e) => setInfo({ ...info, problematica: e.target.value })} placeholder="Ej. Uso excesivo de agua en la escuela" />
            </div>
            <div className="md:col-span-2">
              <Label>Producto final del proyecto</Label>
              <Input value={info.producto_final} onChange={(e) => setInfo({ ...info, producto_final: e.target.value })} placeholder="Ej. Campaña escolar de cuidado del agua" />
            </div>
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={info.observation_date} onChange={(e) => setInfo({ ...info, observation_date: e.target.value })} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Registrar los 10 vistazos
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Registra brevemente lo que observas en cada vistazo de 5-10 segundos durante la clase.
          </p>
          <div className="space-y-3">
            {vistazos.map((v, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="text-xs font-medium text-primary bg-accent rounded-full w-7 h-7 flex items-center justify-center shrink-0 mt-2">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <Input
                    placeholder={`Vistazo ${i + 1}: Describe brevemente lo observado`}
                    value={v}
                    onChange={(e) => handleVistazoChange(i, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Button onClick={enviarObservacion} disabled={loading} className="w-full py-6 text-base shadow-lg">
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Analizando observación...
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Enviar y Analizar Observación
            </>
          )}
        </Button>
      </main>
    </div>
  );
}
