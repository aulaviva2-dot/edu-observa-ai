import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { observationId, vistazos, teacher, school, grade, project_name, problematica, producto_final } = await req.json();
    console.log(`Analyzing observation ${observationId} for teacher ${teacher}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is missing from environment variables");
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const vistazosList = vistazos.map((v: string, i: number) => `Vistazo ${i + 1}: ${v}`).join("\n");

    const systemPrompt = `Eres un experto en pedagogía y observación de aula en México, especializado en el modelo de la Nueva Escuela Mexicana (NEM). Analiza los registros de observación de clase y genera un análisis pedagógico PROFUNDO Y DETALLADO en español.

INSTRUCCIONES DE CALIDAD PARA LA RETROALIMENTACIÓN:
- Sé específico: No uses frases genéricas. Cita evidencias textuales de los vistazos para respaldar tus juicios.
- Resumen Pedagógico: Debe ser un diagnóstico profesional de al menos dos párrafos sobre el estilo de enseñanza y clima de aula.
- Sugerencias Didácticas: Cada sugerencia debe ser una acción técnica pedagógica concreta que el docente pueda aplicar mañana mismo.

Debes evaluar los 19 indicadores pedagógicos listados a continuación y clasificar cada uno como "Evidencia clara", "Evidencia parcial" o "No observable".

PLANEACIÓN Y PROPÓSITO PEDAGÓGICO:
1. El proyecto atiende una problemática, interés o necesidad del grupo
2. El docente comunica el Propósito de Aprendizaje (PDA)
3. Considera saberes previos antes de iniciar el tema

METODOLOGÍAS ACTIVAS:
4. Se identifica alguna metodología activa (STEAM, ABP, aprendizaje servicio, proyectos comunitarios)
5. Se observa alguna fase de la metodología activa

EVALUACIÓN FORMATIVA:
6. Uso de instrumentos de evaluación formativa
7. Verificación del proceso de aprendizaje
8. Promoción de metacognición

INTERACCIÓN DOCENTE:
9. Modera su tono de voz
10. Trata a los alumnos con respeto
11. Favorece inclusión y no discriminación
12. Favorece respeto y comunicación

ESTRATEGIAS DIDÁCTICAS:
13. Aprendizaje cooperativo o colaborativo
14. Preguntas de reflexión o pensamiento crítico
15. Uso de libros de texto

ATENCIÓN A LA DIVERSIDAD:
16. Ajustes para alumnos con rezago

GESTIÓN DEL AULA:
17. Uso efectivo del tiempo de aprendizaje
18. Disciplina que favorece el aprendizaje
19. Acompañamiento del proceso de aprendizaje

IMPORTANTE: Responde SOLO con un JSON válido con esta estructura exacta y COMPLETA:
{
  "indicators": [
    { 
      "name": "string", 
      "level": "Evidencia clara|Evidencia parcial|No observable", 
      "detail": "Explicación técnica y detallada de la evidencia encontrada o faltante",
      "suggestion": "Sugerencia específica para mejorar este indicador particular"
    }
  ],
  "summary": "Diagnóstico pedagógico extenso y profesional",
  "strengths": ["Fortaleza detallada 1", "Fortaleza detallada 2"],
  "improvements": ["Área de mejora crítica 1", "Área de mejora crítica 2"],
  "recommendations": ["Recomendación estratégica general 1", "Recomendación estratégica general 2"],
  "observed_evidences": ["Evidencia textual 1 de los vistazos", "Evidencia textual 2 de los vistazos"],
  "implementation_level": { 
    "status": "Inicial|En desarrollo|Consolidado", 
    "reason": "Justificación pedagógica exhaustiva del estatus" 
  }
}`;

    const contextoPedagogico = [
      problematica ? `Problemática del proyecto: ${problematica}` : "",
      producto_final ? `Producto final del proyecto: ${producto_final}` : "",
    ].filter(Boolean).join("\n");

    const userPrompt = `Escuela: ${school}
Docente: ${teacher}
Grado: ${grade}
Nombre del Proyecto: ${project_name}
${contextoPedagogico}

Registros de observación:
${vistazosList}

Analiza estos registros, evalúa los 19 indicadores uno por uno, y genera la retroalimentación detallada en el formato JSON solicitado. No omitas ningún indicador.`;

    console.log("Calling AI gateway...");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7, // Slightly higher for more creative/detailed feedback
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error response:", errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes, intenta en un momento." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    console.log("AI response received, length:", content.length);

    // Robust JSON extraction
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in AI response:", content);
      throw new Error("No valid JSON in AI response");
    }

    let analysis;
    try {
      analysis = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Raw content:", jsonMatch[0]);
      throw new Error("Failed to parse AI response as JSON");
    }

    // Persist to database if observationId is provided
    if (observationId) {
      console.log("Persisting analysis to database...");
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Clean existing suggestions for this observation
      const { error: deleteError } = await supabaseAdmin
        .from("pedagogical_suggestions")
        .delete()
        .eq("observation_id", observationId);
      
      if (deleteError) console.warn("Error deleting old suggestions:", deleteError);

      // Map indicators to the new table structure
      if (analysis.indicators && Array.isArray(analysis.indicators)) {
        const suggestionsToInsert = analysis.indicators.map((ind: any) => ({
          observation_id: observationId,
          indicator_name: ind.name,
          level: ind.level,
          detail: ind.detail,
          suggestion: ind.suggestion || analysis.recommendations?.[0] || ""
        }));

        if (suggestionsToInsert.length > 0) {
          const { error: insertError } = await supabaseAdmin
            .from("pedagogical_suggestions")
            .insert(suggestionsToInsert);
          
          if (insertError) {
            console.error("Error inserting suggestions:", insertError);
          } else {
            console.log(`Inserted ${suggestionsToInsert.length} suggestions successfully`);
          }
        }
      }

      // Update observation status and ai_analysis field for legacy support
      const { error: updateError } = await supabaseAdmin
        .from("observations")
        .update({ 
          ai_analysis: analysis, 
          status: "analyzed",
          updated_at: new Date().toISOString()
        })
        .eq("id", observationId);
      
      if (updateError) {
        console.error("Error updating observation status:", updateError);
      } else {
        console.log("Observation status updated to 'analyzed'");
      }
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Function exception:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
