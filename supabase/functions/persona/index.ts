import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { personaId, question, language, context } = await req.json();

    if (!personaId || !question || !language) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get persona details
    const { data: persona, error: personaError } = await supabaseClient
      .from('personas')
      .select('*')
      .eq('id', personaId)
      .eq('is_active', true)
      .single();

    if (personaError || !persona) {
      return new Response(JSON.stringify({ error: 'Persona not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Search for relevant context if textbookId provided
    let relevantContext = context || '';
    if (context) {
      // Use provided context
    } else {
      // Search text_chunks for relevant content
      const { data: chunks } = await supabaseClient.rpc('search_text_chunks', {
        query_text: question,
        target_language: language,
        match_count: 3,
      });
      
      if (chunks && chunks.length > 0) {
        relevantContext = chunks.map((c: any) => c.content).join('\n\n');
      }
    }

    // Call OpenAI API
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const llmModel = Deno.env.get('OPENAI_LLM_MODEL') || 'gpt-5.6-luna';

    const systemPrompt = `${persona.system_prompt}

${relevantContext ? `Relevant context from textbook:\n${relevantContext}` : ''}

Respond in ${language === 'en' ? 'English' : language === 'ko' ? 'Korean' : language === 'zh' ? 'Chinese' : 'Vietnamese'}.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: llmModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || '죄송합니다. 답변을 생성할 수 없습니다.';

    // Save dialog
    const { data: userData } = await supabaseClient.auth.getUser();
    if (userData.user) {
      await supabaseClient.from('dialogs').insert({
        user_id: userData.user.id,
        persona_id: personaId,
        user_message: question,
        persona_response: answer,
        language,
      });
    }

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Persona error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});