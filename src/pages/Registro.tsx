import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { UserPlus, Eye, EyeOff, Shield } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

const Registro = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const passwordStrength = (pwd: string) => {
    if (pwd.length < 6) return { label: "Muy corta", color: "bg-destructive" };
    if (pwd.length < 8) return { label: "Débil", color: "bg-warning" };
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    const score = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    if (score >= 2 && pwd.length >= 8) return { label: "Fuerte", color: "bg-success" };
    return { label: "Media", color: "bg-warning" };
  };

  const strength = passwordStrength(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privacyAccepted) {
      toast.error("Debes aceptar el Aviso de Privacidad para continuar.");
      return;
    }
    if (!email.endsWith("@jaliscoedu.mx")) {
      toast.error("Solo se permiten correos institucionales de la Secretaría de Educación Jalisco.");
      return;
    }
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      toast.error(error.message);
    } else {
      setRegistered(true);
    }
    setLoading(false);
  };

  if (registered) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="auth-card text-center">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-7 h-7 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-display font-bold text-foreground mb-2">¡Revisa tu correo!</h2>
          <p className="text-muted-foreground text-sm">
            Revisa tu correo institucional para activar tu cuenta.
          </p>
          <Link to="/login" className="text-primary hover:underline text-sm mt-4 block">
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mb-4">
            <UserPlus className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Crear cuenta</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Usa tu correo institucional <span className="font-medium">@jaliscoedu.mx</span>
          </p>
        </div>

        <form onSubmit={handleRegister} className="auth-card space-y-5">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input id="fullName" placeholder="Ej. Juan Pérez López" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo institucional</Label>
            <Input id="email" type="email" placeholder="usuario@jaliscoedu.mx" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password && (
              <div className="flex items-center gap-2 mt-1">
                <div className={`h-1 flex-1 rounded-full ${strength.color}`} />
                <span className="text-xs text-muted-foreground">{strength.label}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <div className="relative">
              <Input id="confirmPassword" type={showConfirm ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive">Las contraseñas no coinciden</p>
            )}
          </div>

          {/* Privacy Notice */}
          <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/30">
            <div className="flex items-start gap-3">
              <Checkbox
                id="privacy"
                checked={privacyAccepted}
                onCheckedChange={(checked) => setPrivacyAccepted(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor="privacy" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                He leído y acepto el{" "}
                <button
                  type="button"
                  onClick={() => setShowPrivacy(true)}
                  className="text-primary hover:underline font-medium"
                >
                  Aviso de Privacidad y Protección de Datos Personales
                </button>
                .
              </label>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="w-3 h-3" />
              Tus datos están protegidos conforme a la legislación vigente.
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !privacyAccepted}>
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Iniciar sesión
            </Link>
          </p>
        </form>
      </div>

      {/* Privacy Dialog */}
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Aviso de Privacidad y Protección de Datos Personales
            </DialogTitle>
            <DialogDescription>
              ObservaAula — Herramienta de Observación Pedagógica
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[55vh] pr-4">
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <section>
                <h3 className="font-semibold text-foreground mb-1">1. Responsable del tratamiento</h3>
                <p>ObservaAula es una herramienta digital de uso educativo diseñada para directores escolares de la Secretaría de Educación Jalisco. El responsable del tratamiento de datos personales es el titular de la cuenta institucional que utiliza la plataforma.</p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">2. Datos personales recabados</h3>
                <p>La plataforma recaba los siguientes datos:</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>Nombre completo del usuario (director escolar).</li>
                  <li>Correo electrónico institucional (@jaliscoedu.mx).</li>
                  <li>Nombre de la escuela, docente observado, grado y grupo.</li>
                  <li>Registros de observación pedagógica (vistazos).</li>
                  <li>Resultados del análisis pedagógico generado por inteligencia artificial.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">3. Finalidad del tratamiento</h3>
                <p>Los datos recabados se utilizan exclusivamente para:</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>Facilitar la observación y retroalimentación pedagógica en el aula.</li>
                  <li>Generar análisis pedagógicos mediante inteligencia artificial para uso formativo.</li>
                  <li>Apoyar la mejora continua de la práctica docente.</li>
                  <li>Generar reportes internos de acompañamiento pedagógico.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">4. Uso de inteligencia artificial</h3>
                <p>Los registros de observación se procesan mediante modelos de inteligencia artificial para generar análisis pedagógicos automatizados. Los resultados son orientativos y no constituyen evaluaciones oficiales del desempeño docente. El análisis generado es de carácter formativo y confidencial.</p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">5. Protección y almacenamiento</h3>
                <p>Los datos se almacenan en servidores seguros con cifrado en tránsito y en reposo. El acceso a la información está restringido únicamente al usuario que la generó, mediante autenticación con correo institucional verificado.</p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">6. Transferencia de datos</h3>
                <p>Los datos personales no se comparten, venden ni transfieren a terceros. Los registros de observación se envían de forma segura a servicios de inteligencia artificial únicamente para su procesamiento, sin almacenar información personal identificable en dichos servicios.</p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">7. Derechos ARCO</h3>
                <p>El usuario tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de sus datos personales. Puede ejercer estos derechos eliminando sus observaciones desde la plataforma o solicitando la eliminación de su cuenta.</p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">8. Consentimiento</h3>
                <p>Al crear una cuenta y aceptar este aviso, el usuario otorga su consentimiento informado para el tratamiento de sus datos personales conforme a lo descrito en este documento, en cumplimiento con la Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados.</p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">9. Modificaciones al aviso</h3>
                <p>ObservaAula se reserva el derecho de modificar el presente aviso de privacidad. Cualquier cambio será notificado a los usuarios a través de la plataforma.</p>
              </section>
            </div>
          </ScrollArea>
          <div className="flex justify-end pt-2">
            <Button onClick={() => { setPrivacyAccepted(true); setShowPrivacy(false); }}>
              Acepto el Aviso de Privacidad
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Registro;
