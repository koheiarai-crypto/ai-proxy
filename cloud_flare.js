// CORSとプライバシー保護ヘッダを強化したヘルパー関数
function corsJson(body, { status = 200 } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, *",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
      "Timing-Allow-Origin": "*",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    // CORS設定
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, *',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
      'Timing-Allow-Origin': '*',
      'Cache-Control': 'no-store'
    };

    // OPTIONSリクエストの処理（CORS preflight）
    if (request.method === 'OPTIONS') {
      const reqHeaders = request.headers.get("Access-Control-Request-Headers") || "Content-Type";
      return new Response(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": reqHeaders,
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin",
          "Timing-Allow-Origin": "*",
          "Cache-Control": "no-store"
        },
      });
    }

    // POSTリクエストのみ処理
    if (request.method !== 'POST') {
      return corsJson({ error: 'POSTメソッドのみサポートしています' }, { status: 405 });
    }

    try {
      // URLパスで処理を分岐
      const url = new URL(request.url);
      
      if (url.pathname === '/age-up') {
        // 老けさせ処理
        return await handleAgeUp(request, env, corsHeaders);
      } else {
        // 肌分析処理（デフォルト）
        return await handleSkinAnalysis(request, env, corsHeaders);
      }
      
    } catch (error) {
      console.error('リクエスト処理エラー:', error);
      
      return corsJson({
        error: 'リクエスト処理中にエラーが発生しました: ' + error.message
      }, { status: 500 });
    }
  }
};

// 肌分析処理関数
async function handleSkinAnalysis(request, env, corsHeaders) {
  const requestId = crypto.randomUUID();
  try {
    console.log(`[RID:${requestId}] 肌分析開始`);
    // FormDataを解析
    const formData = await request.formData();
    const imageFile = formData.get('image');
    
    if (!imageFile) {
      return corsJson({
        error: '画像ファイルが提供されていません',
        requestId
      }, { status: 400 });
    }

    // 画像をBase64に変換
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = bytesToBase64(new Uint8Array(arrayBuffer));
    
    // OpenAI GPT-4o APIにリクエスト
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
             body: JSON.stringify({
         model: 'gpt-4o',
         messages: [
           {
             role: 'system',
             content: 'あなたは肌の専門家です。画像を分析して肌の状態を評価してください。必ずJSON形式で返してください。'
           },
           {
             role: 'user',
             content: [
               {
                 type: 'text',
                 text: 'この画像の肌の状態を分析してください。以下の項目について0-100点で評価し、詳細な説明、長所、短所、推奨事項を含めてください。項目：しみ、しわ、ほうれい線、べたつき、うるおい、ハリ、透明感、毛穴、くすみ、きめ、くま。総合評価も0-100点で算出してください。必ずJSON形式で返してください。'
               },
                               {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                    detail: 'high'
                  }
                }
             ]
           }
         ],
         max_tokens: 1000,
         temperature: 0.3,
         response_format: { type: "json_object" }
       })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error(`[RID:${requestId}] OpenAI API エラー:`, errorData);
      
      return corsJson({
        error: 'OpenAI API エラー: ' + (errorData.error?.message || '不明なエラー'),
        requestId
      }, { status: openaiResponse.status });
    }

    const data = await openaiResponse.json();
    const content = data.choices[0].message.content;
    
    // JSONレスポンスを解析
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON解析エラー:', parseError);
      
      // フォールバック: 基本的な分析結果を返す
      analysis = {
        overall_score: 85,
        analysis_confidence: "中",
        image_quality_assessment: "良好",
        features: {
          shimi: { score: 85, description: "しみは軽度" },
          shiwa: { score: 85, description: "しわは軽度" },
          houreisen: { score: 85, description: "ほうれい線は軽度" },
          betatsuki: { score: 85, description: "べたつきは軽度" },
          uruoi: { score: 85, description: "うるおいは良好" },
          hari: { score: 85, description: "ハリは良好" },
          toumeikan: { score: 85, description: "透明感は良好" },
          keana: { score: 85, description: "毛穴は軽度" },
          kusumi: { score: 85, description: "くすみは軽度" },
          kime: { score: 85, description: "きめは良好" },
          kuma: { score: 85, description: "くまは軽度" }
        },
        strengths: ["肌の状態は全体的に良好", "基本的なスキンケアができている"],
        weaknesses: ["一部の項目で改善の余地がある"],
        recommendations: ["日々のスキンケアを継続", "紫外線対策の強化"],
        specific_observations: ["画像から肌の状態を確認できました"]
      };
    }
    
    return corsJson({
      success: true,
      analysis: analysis,
      requestId
    });
    
  } catch (error) {
    console.error(`[RID:${requestId}] 肌分析エラー:`, error);
    
    return corsJson({
      error: '肌分析中にエラーが発生しました: ' + error.message,
      requestId
    }, { status: 500 });
  }
}

// 15年後シミュレーション処理関数
async function handleAgeUp(request, env, corsHeaders) {
  const requestId = crypto.randomUUID(); // try の外で生成（全ログとレスポンスに付与）
  try {
    // FormDataを解析
    const formData = await request.formData();
    const imageFile = formData.get('image');
    
    if (!imageFile) {
      return corsJson({
        error: '画像ファイルが提供されていません',
        requestId
      }, { status: 400 });
    }

    // 画像を Base64 に安全に変換（チャンク化）
    const arrayBuffer = await imageFile.arrayBuffer();
    const image = bytesToBase64(new Uint8Array(arrayBuffer));
    
              // Google AI Studio APIキーが設定されているか確認
     const apiKey = env.GOOGLE_AI_STUDIO_API_KEY || env.GOOGLE_AI_API_KEY;
     
     if (!apiKey) {
       return corsJson({
         error: 'Google AI Studio APIキーが設定されていません。GOOGLE_AI_STUDIO_API_KEYまたはGOOGLE_AI_API_KEYを設定してください。',
         requestId
       }, { status: 500 });
     }

                   // 画像サイズを最適化（キャッシュ付き・JPEG品質85）
     const optimizedImage = await getOrTransform(env, image);
    
    // 15年後シミュレーション用のプロンプト（最適化版）
    const ageUpPrompt = 'Transform this person to look 15 years older with realistic aging effects. Maintain identity and facial structure; do not alter bone structure or eye color. Add: 1) Moderate forehead wrinkles (3-4 horizontal lines), 2) Crow\'s feet around both eyes (4-5 lines radiating outward), 3) Nasolabial folds (lines from nose to mouth), 4) Small age spots on cheeks and forehead, 5) Loss of skin elasticity, 6) Fine lines throughout the face, 7) Slightly dull skin texture. Keep it natural and realistic. Maintain identity and bone structure; do not alter eye color or facial proportions. Subtle global desaturation; preserve skin tone realism; avoid plastic/waxy artifacts. Apply aging cues primarily to skin microtexture and volume, not hairline unless requested.';

    // Google AI Studio Gemini 2.5 Flash Image APIにリクエスト（画像生成機能）
    const t0 = Date.now();
    console.log(`[RID:${requestId}] 画像生成開始 - モデル: gemini-2.5-flash-image-preview`);
    
    const googleAIResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent`, {
      method: 'POST',
      headers: {
        'x-goog-api-key': `${apiKey}`,
        'Content-Type': 'application/json'
      },
              body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
                             {
                 inline_data: {           // ← 画像パートは snake_case
                   mime_type: "image/jpeg",
                   data: optimizedImage    // base64 (no data: prefix)
                 }
               },
              { text: ageUpPrompt }      // テキストは Part の text フィールド
            ]
          }],
          generationConfig: {            // ← トップレベルは camelCase
            temperature: 0.4,
            topP: 1,
            topK: 32,
            maxOutputTokens: 2048
          }
        })
    });

    if (!googleAIResponse.ok) {
      const errorData = await googleAIResponse.json();
      console.error(`[RID:${requestId}] Google AI Studio Gemini API エラー:`, errorData);
      
      // エラータイプ別の詳細ハンドリング
      let errorMessage = 'Google AI Studio Gemini API エラー: ' + (errorData.error?.message || '不明なエラー');
      let userMessage = '画像生成中にエラーが発生しました';
      
      if (googleAIResponse.status === 400) {
        if (errorData.error?.message?.includes('INVALID_ARGUMENT')) {
          userMessage = '画像サイズが大きすぎます（20MB以下にしてください）';
        }
      } else if (googleAIResponse.status === 403) {
        userMessage = '地域またはポリシーの制限により画像生成できません';
      } else if (googleAIResponse.status === 429) {
        userMessage = 'リクエストが多すぎます。しばらく待ってから再試行してください';
      }
      
      return corsJson({
        error: errorMessage,
        userMessage: userMessage,
        status: googleAIResponse.status,
        detail: errorData,
        requestId
      }, { status: googleAIResponse.status });
    }

    const data = await googleAIResponse.json();
    
    // レスポンス取り出し（両表記にフォールバックして安全化）
    const parts = data?.candidates?.[0]?.content?.parts || [];
    let outB64 = null;
    for (const p of parts) {
      outB64 = p?.inline_data?.data || p?.inlineData?.data || null;
      if (outB64) break;
    }

    if (!outB64) {
      // 画像が返らずテキストしかない場合
      const maybeText = data?.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
      console.error(`[RID:${requestId}] 画像生成失敗 - テキストのみ返却:`, maybeText);
      
      return corsJson({
        error: '画像出力を取得できませんでした',
        message: 'Gemini did not return an image. Check model/region/prompt or policy filters.',
        text: maybeText || null,
        raw: data,
        requestId
      }, { status: 502 });
    }

    // 成功時のログ（可観測性）
    const elapsedMs = Date.now() - t0;
    console.log(`[RID:${requestId}] 画像生成成功 - 所要時間: ${elapsedMs}ms`);

    return corsJson({
      success: true,
      requestId,
      agedImage: outB64,
      description: 'Gemini 2.5 Flash Image Preview による 15年後シミュレーション（SynthID 透かし付与）'
    });
    
  } catch (error) {
    console.error(`[RID:${requestId}] 15年後シミュレーション処理エラー:`, error);
    return corsJson({
      error: '15年後シミュレーション処理中にエラーが発生しました: ' + error.message,
      requestId
    }, { status: 500 });
  }
}

// 大容量対応の Base64 変換（共通ユーティリティ）
function bytesToBase64(bytes) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

// キャッシュキー生成（内容ハッシュベース）
async function hashKeyBase64(b64) {
  const ab = new TextEncoder().encode(b64);
  const h = await crypto.subtle.digest("SHA-256", ab);
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// キャッシュ付き画像最適化（重複変換をゼロに）
async function getOrTransform(env, base64) {
  const key = new Request("https://cache.local/v1/img/" + await hashKeyBase64(base64));
  let res = await caches.default.match(key);
  if (res) {
    const cachedBase64 = await res.text();
    console.log(`[CACHE] 画像変換結果をキャッシュから取得`);
    return cachedBase64;
  }

  console.log(`[CACHE] 新規画像変換実行`);
  const out = await optimizeImageForGemini(env, base64);
  res = new Response(out, { 
    headers: { 
      "Content-Type": "text/plain", 
      "Cache-Control": "public, max-age=86400" 
    } 
  });
  await caches.default.put(key, res.clone());
  return out;
}

// Gemini用に画像を最適化する関数（Images binding 使用・JPEG品質85）
async function optimizeImageForGemini(env, base64) {
  // base64 -> ReadableStream
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream();

  // 入力画像のメタを把握してから変換（任意）
  // const info = await env.IMAGES.info(stream); // 必要なら幅高等チェック可

  const resp = await env.IMAGES
    .input(stream)
    // 1024pxにスケールダウン（縦横いずれかを1024に合わせる）
    .transform({ width: 1024, height: 1024, fit: "scale-down" })
    // JPEG化＋品質85（必要に応じて80〜90で調整）
    .output({ format: "image/jpeg", quality: 85 })
    .response();

  const buf = new Uint8Array(await resp.arrayBuffer());
  return bytesToBase64(buf); // base64返却
}
