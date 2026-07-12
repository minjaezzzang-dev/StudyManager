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

    const { textbookId, imageBase64, pageNumber } = await req.json();

    if (!textbookId || !imageBase64) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify textbook exists
    const { data: textbook, error: textbookError } = await supabaseClient
      .from('textbooks')
      .select('*')
      .eq('id', textbookId)
      .single();

    if (textbookError || !textbook) {
      return new Response(JSON.stringify({ error: 'Textbook not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const googleVisionApiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
    if (!googleVisionApiKey) {
      return new Response(JSON.stringify({ error: 'Google Vision API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 1: OCR with Google Cloud Vision
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${googleVisionApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: imageBase64 },
              features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
            },
          ],
        }),
      }
    );

    if (!visionResponse.ok) {
      const error = await visionResponse.json();
      throw new Error(`Vision API error: ${error.error?.message || 'Unknown error'}`);
    }

    const visionData = await visionResponse.json();
    const fullText = visionData.responses[0]?.fullTextAnnotation?.text || '';

    if (!fullText.trim()) {
      return new Response(JSON.stringify({ error: 'No text detected in image' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Split text into chunks
    const chunkSize = 1000;
    const overlap = 200;
    const chunks: string[] = [];
    
    for (let i = 0; i < fullText.length; i += chunkSize - overlap) {
      const chunk = fullText.slice(i, i + chunkSize).trim();
      if (chunk.length > 50) {
        chunks.push(chunk);
      }
    }

    if (chunks.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid chunks created' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 3: Generate embeddings for each chunk
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const embeddingModel = Deno.env.get('OPENAI_EMBEDDING_MODEL') || 'text-embedding-3-small';
    const embeddings: number[][] = [];

    for (const chunk of chunks) {
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: embeddingModel,
          input: chunk,
        }),
      });

      if (!embeddingResponse.ok) {
        const error = await embeddingResponse.json();
        throw new Error(`Embedding error: ${error.error?.message || 'Unknown error'}`);
      }

      const embeddingData = await embeddingResponse.json();
      embeddings.push(embeddingData.data[0].embedding);
    }

    // Step 4: Store chunks in database
    const chunkRecords = chunks.map((content, index) => ({
      textbook_id: textbookId,
      content,
      embedding: embeddings[index],
      page_number: pageNumber,
      chunk_index: index,
    }));

    const { data: insertedChunks, error: insertError } = await supabaseClient
      .from('text_chunks')
      .insert(chunkRecords)
      .select();

    if (insertError) {
      throw new Error(`Database insert error: ${insertError.message}`);
    }

    return new Response(JSON.stringify({
      chunksCreated: insertedChunks?.length || 0,
      chunks: insertedChunks,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('RAG ingest error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});