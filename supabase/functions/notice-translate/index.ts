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

    const { noticeId, title, content, targetLanguages } = await req.json();

    if (!noticeId || !title || !content || !targetLanguages) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const llmModel = Deno.env.get('OPENAI_LLM_MODEL') || 'gpt-5.6-luna';

    const languageNames = { en: 'English', ko: 'Korean', zh: 'Chinese', vi: 'Vietnamese' };
    const translations: Record<string, { title: string; content: string }> = {};

    // Translate to each target language
    for (const lang of targetLanguages) {
      const langName = languageNames[lang as keyof typeof languageNames] || lang;
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: llmModel,
          messages: [
            {
              role: 'system',
              content: `Translate the following notice title and content to ${langName}. 
Keep the tone formal and appropriate for school announcements.
Return ONLY a JSON object with "title" and "content" fields.`,
            },
            {
              role: 'user',
              content: `Title: ${title}\n\nContent: ${content}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        }),
      });

      const data = await response.json();
      const translated = JSON.parse(data.choices?.[0]?.message?.content || '{}');
      translations[lang] = {
        title: translated.title || title,
        content: translated.content || content,
      };
    }

    // Update notice with translations
    await supabaseClient
      .from('notices')
      .update({ translated_content: translations })
      .eq('id', noticeId);

    return new Response(JSON.stringify({ translations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Notice translate error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});