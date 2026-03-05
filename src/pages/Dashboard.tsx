import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Eye, LogOut, ClipboardList, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Observation {
  id: string;
  school: string;
  teacher: string;
  grade: string;
  group_name: string;
  subject: string;
  observation_date: string;
  status: string;
  created_at: string;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user?.id)
        .single();

      if (profile) setProfileName(profile.full_name);

      const { data: obs } = await supabase
        .from("observations")
        .select("id, school, teacher, grade, group_name, subject, observation_date, status, created_at")
        .order("created_at", { ascending: false });

      if (obs) setObservations(obs);
      setLoading(false);
    };

    if (user) fetchData();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">ObservaAula</h1>
            <p className="text-sm text-muted-foreground">Hola, {profileName || "Director"}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">Mis Observaciones</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {observations.length} observación{observations.length !== 1 ? "es" : ""} registrada{observations.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={() => navigate("/nueva-observacion")}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva observación
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </Card>
            ))}
          </div>
        ) : observations.length === 0 ? (
          <Card className="p-12 text-center">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Sin observaciones aún</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Comienza creando tu primera observación de aula
            </p>
            <Button onClick={() => navigate("/nueva-observacion")}>
              <Plus className="w-4 h-4 mr-2" />
              Crear primera observación
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {observations.map((obs, index) => (
              <Card
                key={obs.id}
                className="p-5 cursor-pointer hover:shadow-md transition-shadow"
                style={{ animationDelay: `${index * 80}ms` }}
                onClick={() => navigate(`/observacion/${obs.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-medium text-foreground text-sm line-clamp-1">{obs.school}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      obs.status === "analyzed"
                        ? "bg-accent text-accent-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {obs.status === "analyzed" ? "Analizada" : "Borrador"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  Docente: {obs.teacher}
                </p>
                <p className="text-sm text-muted-foreground mb-1">
                  {obs.grade} · {obs.group_name} · {obs.subject}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(obs.observation_date), "d 'de' MMMM yyyy", { locale: es })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
