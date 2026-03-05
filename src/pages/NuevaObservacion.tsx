import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function NuevaObservacion() {

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

    setLoading(true);

    try {

      const response = await supabase.functions.invoke("analyze-observation", {
        body: {
          vistazos: vistazos.filter((v) => v.trim()),
          school: info.school,
          teacher: info.teacher,
          grade: info.grade,
          group_name: info.group_name,
          project_name: info.project_name,
          problematica: info.problematica,
          producto_final: info.producto_final,
          observation_date: info.observation_date
        },
      });

      console.log(response);

      alert("Observación enviada correctamente");

    } catch (error) {

      console.error(error);
      alert("Error al enviar observación");

    }

    setLoading(false);
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