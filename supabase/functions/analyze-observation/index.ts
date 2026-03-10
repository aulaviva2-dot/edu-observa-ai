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

    const systemPrompt = `Eres un asesor técnico pedagógico (ATP) experto en la Nueva Escuela Mexicana (NEM) y el Plan de Estudio 2022. Tu función es analizar registros de observación de aula (10 vistazos) para proporcionar una retroalimentación de ALTO NIVEL PROFESIONAL, técnica y propositiva.

MARCO PEDAGÓGICO (NEM):
- Debes basar tu análisis en el enfoque sociocrítico, la autonomía profesional docente y el codiseño.
- Considera los 7 Ejes Articuladores (Inclusión, Pensamiento Crítico, Interculturalidad Crítica, Igualdad de Género, Vida Saludable, Apropiación de las Culturas, Artes y Experiencias Estéticas).
- Enfócate en los Campos Formativos y el trabajo por Proyectos (ABP, STEAM, Aprendizaje Servicio, Proyectos Comunitarios).

INSTRUCCIONES DE CALIDAD:
1. ANÁLISIS TÉCNICO: No uses lenguaje coloquial. Emplea términos como "andamiaje", "zona de desarrollo próximo", "codiseño", "transversalidad", "metacognición", "evaluación procesual".
2. EVIDENCIA TEXTUAL: Cita fragmentos directos de los vistazos para sustentar tus hallazgos. Ejemplo: "Como se observa en el Vistazo 3...".
3. DIAGNÓSTICO PROFUNDO: El resumen debe ser un ensayo pedagógico de 3 paráfrasis que analice la congruencia entre el PDA, la problemática y la praxis observada.
4. INDICADORES: Evalúa los 19 indicadores técnicos listados abajo como "Evidencia clara", "Evidencia parcial" o "No observable".

LISTA DE INDICADORES TÉCNICOS:
I. CONTEXTUALIZACIÓN Y VINCULACIÓN (NEM):
1. Vinculación del proyecto con una problemática o interés real de la comunidad.
2. Comunicación clara del Proceso de Desarrollo de Aprendizaje (PDA) o Propósito.
3. Recuperación de saberes previos y diálogo con la realidad de los estudiantes.

II. METODOLOGÍAS SOCIOCRÍTICAS Y ACTIVAS:
4. Implementación de metodologías activas (ABP, STEAM, Aprendizaje Servicio, etc.).
5. Secuencia didáctica: Identificación de fases o momentos de la metodología.
6. Integración de Ejes Articuladores (Pensamiento Crítico, Inclusión, etc.).

III. EVALUACIÓN PROCESUAL Y FORMATIVA:
7. Uso de estrategias e instrumentos de evaluación formativa durante el proceso.
8. Verificación y acompañamiento del aprendizaje (Retroalimentación constante).
9. Promoción de la metacognición (Reflexión del alumno sobre su propio proceso).

IV. ESTRATEGIAS Y RECURSOS DIDÁCTICOS:
10. Promoción de preguntas de alta demanda cognitiva y pensamiento crítico.
11. Fomento del aprendizaje cooperativo, colaborativo y el trabajo comunitario.
12. Uso pertinente de los Libros de Texto Gratuitos (LTG) y recursos del entorno.
13. Estrategias de equidad: Ajustes razonables para alumnos con rezago o barreras (BAP).

V. INTERACCIÓN Y CONVIVENCIA HUMANA:
14. Relación pedagógica basada en el respeto, la empatía y la dignidad humana.
15. Fomento de un ambiente inclusivo, sin discriminación y con equidad de género.
16. Gestión del aula: Disciplina positiva que favorece el bienestar y el aprendizaje.

VI. GESTIÓN DEL TIEMPO Y ROL DOCENTE:
17. Optimización del tiempo pedagógico hacia actividades de aprendizaje relevante.
18. Rol del docente como mediador, guía y facilitador del conocimiento.
19. Inferencia de impacto comunitario: El aprendizaje trasciende el aula.

ESTRUCTURA DE RESPUESTA (JSON ÚNICAMENTE):
{
  "indicators": [
    { 
      "name": "Nombre exacto del indicador", 
      "level": "Evidencia clara|Evidencia parcial|No observable", 
      "detail": "Análisis técnico exhaustivo con citas de los vistazos",
      "suggestion": "Acción pedagógica concreta y técnica para mejorar este punto"
    }
  ],
  "summary": "Ensayo pedagógico extenso (mínimo 250 palabras) sobre la práctica observada",
  "strengths": ["Fortaleza técnica 1 (con fundamento pedagógico)", "Fortaleza técnica 2"],
  "improvements": ["Área de mejora crítica 1 (vinculada al Plan 2022)", "Área de mejora 2"],
  "recommendations": ["Sugerencia estratégica para el codiseño", "Recomendación para el Programa Analítico"],
  "observed_evidences": ["Evidencia textual 1", "Evidencia textual 2"],
  "implementation_level": { 
    "status": "Inicial|En desarrollo|Consolidado", 
    "reason": "Justificación basada en la profundidad de la aplicación de la NEM" 
  }
}`;

    const contextoPedagogico = [
      problematica ? `Problemática del proyecto: ${problematica}` : "",
      producto_final ? `Producto final del proyecto: ${producto_final}` : "",
    ].filter(Boolean).join("\n");

    const userPrompt = `ANÁLISIS DE OBSERVACIÓN - DATOS DE CONTEXTO:
Escuela: ${school}
Docente: ${teacher}
Grado: ${grade}
Nombre del Proyecto: ${project_name}
${contextoPedagogico}

REGISTROS DE OBSERVACIÓN (LOS 10 VISTAZOS):
${vistazosList}

TAREA: Realiza el análisis técnico-pedagógico exhaustivo siguiendo el formato JSON y el marco de la Nueva Escuela Mexicana.`;

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
