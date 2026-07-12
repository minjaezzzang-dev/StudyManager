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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { audioBase64, sourceLanguage, targetLanguage } = await req.json();

    if (!audioBase64 || !sourceLanguage || !targetLanguage) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (sourceLanguage === targetLanguage) {
      return new Response(JSON.stringify({ error: 'Source and target languages must be different' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 1: Speech-to-Text using Whisper
    const sttResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: (() => {
        const formData = new FormData();
        const audioBlob = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
        formData.append('file', new Blob([audioBlob], { type: 'audio/webm' }), 'audio.webm');
        formData.append('model', Deno.env.get('OPENAI_STT_MODEL') || 'whisper-1');
        formData.append('language', sourceLanguage);
        return formData;
      })(),
    });

    if (!sttResponse.ok) {
      const error = await sttResponse.json();
      throw new Error(`STT error: ${error.error?.message || 'Unknown error'}`);
    }

    const sttData = await sttResponse.json();
    const sourceText = sttData.text?.trim() || '';

    if (!sourceText) {
      return new Response(JSON.stringify({ error: 'No speech detected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Translate text
    const languageNames: Record<string, string> = {
      en: 'English',
      ko: 'Korean',
      zh: 'Chinese',
      vi: 'Vietnamese',
    };

    const translateResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_LLM_MODEL') || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Translate from ${languageNames[sourceLanguage]} to ${languageNames[targetLanguage]}. Return ONLY the translated text.`
          },
          { role: 'user', content: sourceText },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!translateResponse.ok) {
      const error = await translateResponse.json();
      throw new Error(`Translation error: ${error.error?.message || 'Unknown error'}`);
    }

    const translateData = await translateResponse.json();
    const targetText = translateData.choices[0]?.message?.content?.trim() || '';

    // Step 3: Text-to-Speech
    const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_TTS_MODEL') || 'tts-1',
        input: targetText,
        voice: 'nova',
        response_format: 'mp3',
      }),
    });

    if (!ttsResponse.ok) {
      const error = await ttsResponse.json();
      throw new Error(`TTS error: ${error.error?.message || 'Unknown error'}`);
    }

    const audioArrayBuffer = await ttsResponse.arrayBuffer();
    const audioBase64Result = btoa(String.fromCharCode(...new Uint8Array(audioArrayBuffer)));

    // Upload audio to Supabase Storage
    const fileName = `interpret/${user.id}/${Date.now()}.mp3`;
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('tts-audio')
      .upload(fileName, audioArrayBuffer, {
        contentType: 'audio/mpeg',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload error: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabaseClient.storage
      .from('tts-audio')
      .getPublicUrl(fileName);

    // Save interpretation record
    await supabaseClient.from('translations').insert({
      user_id: user.id,
      source_text: sourceText,
      target_text: targetText,
      source_language: sourceLanguage,
      target_language: targetLanguage,
      mode: 'voice',
    });

    return new Response(JSON.stringify({
      sourceText,
      targetText,
      audioUrl: publicUrl,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Interpretation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});