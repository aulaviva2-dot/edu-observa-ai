import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
      // 1. Guardar la observación en la base de datos
      if (!user) throw new Error("No hay sesión activa");

      const { data: newObs, error: insertError } = await supabase
        .from("observations")
        .insert({
          user_id: user.id,
          school: info.school,
          teacher: info.teacher,
          grade: info.grade,
          group_name: info.group_name,
          project_name: info.project_name, // Replaced subject with project_name
          observation_date: info.observation_date,
          problematica: info.problematica, // Added problematica
          producto_final: info.producto_final, // Added producto_final
          vistazo_1: vistazos[0],
          vistazo_2: vistazos[1],
          vistazo_3: vistazos[2],
          vistazo_4: vistazos[3],
          vistazo_5: vistazos[4],
          vistazo_6: vistazos[5],
          vistazo_7: vistazos[6],
          vistazo_8: vistazos[7],
          vistazo_9: vistazos[8],
          vistazo_10: vistazos[9], // Corrected index from 10 to 9
          status: "draft"
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Llamar a la función de análisis
      const response = await supabase.functions.invoke("analyze-observation", {
        body: {
          vistazos: validVistazos,
          school: info.school,
          teacher: info.teacher,
          grade: info.grade,
          project_name: info.project_name,
        },
      });

      if (response.error) {
        console.error("Error en análisis:", response.error);
        toast.warning("Observación guardada, pero el análisis falló. Puedes intentarlo de nuevo desde el panel.");
        navigate("/dashboard");
        return;
      }

      // 3. Actualizar con el análisis
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

    <div className="max-w-3xl mx-auto p-6 space-y-6">

      <h1 className="text-2xl font-bold">
        Nueva Observación de Aula
      </h1>

      <div className="grid grid-cols-2 gap-4">

        <div>
          <Label>Escuela</Label>
          <Input
            value={info.school}
            onChange={(e) =>
              setInfo({ ...info, school: e.target.value })
            }
          />
        </div>

        <div>
          <Label>Docente</Label>
          <Input
            value={info.teacher}
            onChange={(e) =>
              setInfo({ ...info, teacher: e.target.value })
            }
          />
        </div>

        <div>
          <Label>Grado</Label>
          <Input
            value={info.grade}
            onChange={(e) =>
              setInfo({ ...info, grade: e.target.value })
            }
          />
        </div>

        <div>
          <Label>Grupo</Label>
          <Input
            value={info.group_name}
            onChange={(e) =>
              setInfo({ ...info, group_name: e.target.value })
            }
          />
        </div>

        <div className="col-span-2">
          <Label>Nombre del Proyecto</Label>
          <Input
            placeholder="Ej. Cuidemos el agua en nuestra comunidad"
            value={info.project_name}
            onChange={(e) =>
              setInfo({ ...info, project_name: e.target.value })
            }
          />
        </div>

        <div className="col-span-2">
          <Label>Problemática que atiende</Label>
          <Input
            placeholder="Ej. Uso excesivo de agua en la escuela"
            value={info.problematica}
            onChange={(e) =>
              setInfo({ ...info, problematica: e.target.value })
            }
          />
        </div>

        <div className="col-span-2">
          <Label>Producto final del proyecto</Label>
          <Input
            placeholder="Ej. Campaña escolar de cuidado del agua"
            value={info.producto_final}
            onChange={(e) =>
              setInfo({ ...info, producto_final: e.target.value })
            }
          />
        </div>

        <div>
          <Label>Fecha</Label>
          <Input
            type="date"
            value={info.observation_date}
            onChange={(e) =>
              setInfo({ ...info, observation_date: e.target.value })
            }
          />
        </div>

      </div>

      <div className="space-y-4">

        <h2 className="text-xl font-semibold">
          Registrar los 10 vistazos
        </h2>

        {vistazos.map((v, i) => (

          <div key={i}>

            <Label>Vistazo {i + 1}</Label>

            <Input
              placeholder="Describe brevemente lo observado en 5-10 segundos"
              value={v}
              onChange={(e) =>
                handleVistazoChange(i, e.target.value)
              }
            />

          </div>

        ))}

      </div>

      <Button
        onClick={enviarObservacion}
        disabled={loading}
        className="w-full"
      >
        {loading ? "Analizando..." : "Enviar observación"}
      </Button>

    </div>

  );
}