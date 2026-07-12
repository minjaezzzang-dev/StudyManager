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

    const { userId, message, topic, stance, language, conversationHistory } = await req.json();

    if (!userId || !message || !topic || !stance || !language) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const llmModel = Deno.env.get('OPENAI_LLM_MODEL') || 'gpt-5.6-luna';

    const stanceText = stance === 'pro' ? '찬성' : '반대';
    const languageNames = { en: 'English', ko: 'Korean', zh: 'Chinese', vi: 'Vietnamese' };
    const langName = languageNames[language as keyof typeof languageNames] || 'Korean';

    const systemPrompt = `당신은 ${langName}로 토론하는 AI 파트너입니다.
주제: "${topic}"
당신의 입장: ${stanceText}

토론 규칙:
1. 상대방의 의견을 존중하며 논리적으로 반박하세요.
2. 감정적이지 않고 사실 기반으로 논쟁하세요.
3. 한 번에 한 가지 핵심 포인트만 제시하세요.
4. ${langName}로 자연스럽게 대화하세요.
5. 토론이 끝나갈 때 피드백을 제공하세요.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: llmModel,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || '응답을 생성할 수 없습니다.';

    // Check if debate should conclude (simple heuristic: after 6 exchanges)
    const isComplete = conversationHistory.length >= 10;
    let feedback = '';
    
    if (isComplete) {
      feedback = `토론이 종료되었습니다. ${stance === 'pro' ? '찬성' : '반대'} 입장에서 잘 논증하셨습니다. 
핵심 포인트: 논리적 일관성, 증거 제시, 상대방 의견 존중 등이 잘 이루어졌습니다.`;
    }

    // Save record
    await supabaseClient.from('records').insert({
      user_id: userId,
      type: 'debate',
      data: {
        topic,
        stance,
        language,
        userMessage: message,
        aiResponse,
        isComplete,
      },
    });

    return new Response(JSON.stringify({ response: aiResponse, feedback, isComplete }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Chat debate error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});