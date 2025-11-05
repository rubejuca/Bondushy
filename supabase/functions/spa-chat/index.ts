import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY no configurada');
    }

    const systemPrompt = `Eres un asistente virtual profesional de BondusySpa, un spa de lujo que ofrece tratamientos de bienestar y belleza.

Procedimientos disponibles:
1. Masaje Relajante - $80 (60 min): Masaje corporal completo para aliviar tensiones y estrés
2. Facial Hidratante - $65 (45 min): Tratamiento facial profundo con hidratación intensiva
3. Masaje con Piedras Calientes - $120 (90 min): Terapia de relajación con piedras volcánicas
4. Tratamiento Corporal Detox - $95 (75 min): Envoltura corporal para eliminar toxinas
5. Manicura y Pedicura Spa - $55 (60 min): Cuidado completo de manos y pies

Tu tarea es:
- Proporcionar información detallada sobre los procedimientos
- Ayudar a los clientes a elegir el tratamiento adecuado según sus necesidades
- Responder preguntas sobre beneficios, duración y precios
- Ser amable, profesional y cercano
- Si te preguntan algo que no sabes, recomienda contactar directamente al spa

Responde de manera concisa y útil.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`Error del AI Gateway: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error en spa-chat:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});