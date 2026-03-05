import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { vistazos, teacher, school, grade, subject } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const vistazosList = vistazos.map((v: string, i: number) => `Vistazo ${i + 1}: ${v}`).join("\n");

    const systemPrompt = `Eres un experto en pedagogía y observación de aula en México. Analiza los registros de observación de clase y genera un análisis pedagógico profesional en español.

Debes evaluar los siguientes indicadores pedagógicos y clasificar cada uno como "Evidencia clara", "Evidencia parcial" o "No observable":

1. El proyecto atiende una problemática, interés o necesidad del grupo
2. El docente comunica el Propósito de Aprendizaje (PDA)
3. Considera saberes previos antes de iniciar el tema
4. Se identifica alguna metodología activa (STEAM, ABP, aprendizaje servicio, proyectos comunitarios)
5. Se observa alguna fase de la metodología activa
6. Uso de instrumentos de evaluación formativa
7. Verificación del proceso de aprendizaje
8. Promoción de metacognición
9. Modera su tono de voz
10. Trata a los alumnos con respeto
11. Favorece inclusión y no discriminación
12. Favorece respeto y comunicación
13. Aprendizaje cooperativo o colaborativo
14. Preguntas de reflexión o pensamiento crítico
15. Uso de libros de texto
16. Ajustes para alumnos con rezago
17. Uso efectivo del tiempo de aprendizaje
18. Disciplina que favorece el aprendizaje
19. Acompañamiento del proceso de aprendizaje

IMPORTANTE: Responde SOLO con un JSON válido con esta estructura exacta:
{
  "indicators": [{ "name": "string", "level": "Evidencia clara|Evidencia parcial|No observable", "detail": "string breve" }],
  "summary": "string con diagnóstico breve del estilo de enseñanza",
  "strengths": ["string con fortaleza 1", "string con fortaleza 2", ...],
  "improvements": ["string con área de mejora 1", ...],
  "recommendations": ["string con recomendación práctica 1", ...]
}`;

    const userPrompt = `Escuela: ${school}
Docente: ${teacher}
Grado: ${grade}
Asignatura: ${subject}

Registros de observación:
${vistazosList}

Analiza estos registros y genera el análisis pedagógico completo.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes, intenta en un momento." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error: " + response.status);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No valid JSON in AI response");

    const analysis = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
