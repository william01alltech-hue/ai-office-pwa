import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import http from 'http'

const app = new Hono()

// Helper for HTTP requests without Hono/Undici timeout limits
const callOllama = (body: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 11434,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 600000 // 10 minutes timeout
    }, (res) => {
      let responseBody = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseBody));
        } catch (err) {
          reject(new Error(`Failed to parse Ollama JSON response: ${responseBody}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Ollama request timed out after 10 minutes'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
};

// Enable CORS for Vite frontend
app.use('/*', cors({
  origin: 'http://localhost:5173',
  allowMethods: ['POST', 'GET', 'OPTIONS'],
}))

app.get('/', (c) => {
  return c.text('NeoSheet Backend is running!')
})

// Mock AI Vision API
app.post('/api/ai/extract-table', async (c) => {
  console.log('[API] Received request for image extraction...');
  
  try {
    const body = await c.req.parseBody();
    const image = body['image'];
    
    if (!image || !(image instanceof File)) {
      return c.json({ error: 'No image provided' }, 400);
    }
    
    // Convert File to Base64
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    
    console.log(`[API] Sending image to MiniCPM-V for Markdown extraction...`);
    const promptText = `你是一個專業的表格 OCR 提取專家。請精準提取圖片中的表格，並嚴格輸出為「Markdown 表格」格式。
請嚴格遵守以下規則：
1. 請用 Markdown 表格格式輸出 (使用 | 分隔欄位，使用 - 分隔標題與內容)。
2. 【最重要】如果同一個儲存格內有多行文字（例如同時有中文與英文，如「員工姓名」與「Name of Employee」），請把它們合併放在同一個格子內，並使用 \`<br>\` 標籤來換行，**絕對不可以**把同一個儲存格拆成兩列。
3. 表格上方的總標題（如「員工基本資料」）若跨欄，請放在第一列的第一個格子，後面的格子保留空白即可。
4. 仔細辨識繁體中文，不要看錯字（例如看清楚人名「殷偉銘」，地名「高雄」不可辨識為「高山」）。
5. 只輸出 Markdown 表格，不要加入任何解釋文字。`;

    const data1 = await callOllama({
      model: 'qwen2.5vl:72b',
      prompt: promptText,
      images: [base64Image],
      stream: false,
      options: { temperature: 0.1, num_ctx: 2048 }
    });
    let responseText = data1.response;
    console.log('[API] Raw Markdown from Ollama:\n', responseText);

    // Parse Markdown Table to 2D Array
    const lines = responseText.split('\n');
    const rawArray: string[][] = [];
    
    for (let line of lines) {
      line = line.trim();
      if (!line.startsWith('|')) continue;
      // Skip markdown separator line like |---|---|
      if (line.replace(/[\s|:-]/g, '').length === 0) continue;
      
      // Split by pipe
      const cells = line.split('|').map(c => c.trim());
      if (cells.length > 2) {
        // Remove first and last element if they are just empty strings from the edges
        if (cells[0] === '') cells.shift();
        if (cells[cells.length - 1] === '') cells.pop();
        
        // Replace <br> with real newlines
        const cleanCells = cells.map(c => c.replace(/<br\s*\/?>/gi, '\n'));
        rawArray.push(cleanCells);
      }
    }

    // Map to FortuneSheet format
    const extractedData: any[] = [];
    rawArray.forEach((row: any[], r: number) => {
      row.forEach((cellText: string, c: number) => {
        if (cellText !== null && cellText !== undefined && cellText !== "") {
          extractedData.push({ r, c, v: { m: String(cellText), v: String(cellText) } });
        }
      });
    });

    console.log('[API] Sending parsed Markdown data back to frontend.');

    return c.json({
      success: true,
      message: 'Image parsed successfully',
      data: extractedData
    });

  } catch (error) {
    console.error('[API Error]', error);
    return c.json({ error: 'Failed to process image' }, 500);
  }
})

// Route for Natural Language to Spreadsheet Formula Translation
  app.post('/api/ai/translate-formula', async (c) => {
    console.log('[API] Received request for formula translation...');
    try {
      const { text, currentCell, contextData } = await c.req.json() as { text: string; currentCell?: string; contextData?: string };
      
      if (!text) {
        return c.json({ error: 'No description provided' }, 400);
      }
  
      const promptText = `你是一個試算表公式專家。請將使用者的自然語言描述，精準轉換為 Excel / 試算表公式，並提供中英雙語的邏輯說明。
當前選取的儲存格為: ${currentCell || 'A1'}。
${contextData ? `\n當前試算表的上下文資料如下（JSON格式的二維陣列）：\n${contextData}\n請參考這些資料的標題來產生更精確的公式。\n` : ''}
【重要指示】：如果使用者的指令中明確指定了儲存格座標或範圍（例如 A1、B2:B5），請務必在公式中「完全照抄」該座標，絕對不可自行偏移列號或行號！

請嚴格輸出為 JSON 格式，結構如下，不要有額外的包裹或 markdown 標記：
{
  "formula": "=SUM(B2:B5)",
  "explanation_zh": "計算儲存格 B2 到 B5 的數值總和。",
  "explanation_en": "Calculates the sum of cells from B2 to B5.",
  "intent": "SUM (加總)"
}

請遵循以下規則：
1. 公式的英文名稱必須大寫（例如 SUM, IF, AVERAGE, VLOOKUP）。
2. 只返回 JSON，不要包含任何 markdown 標籤（如 \`\`\`json）或解釋文字。
3. 如果使用者的要求無法轉換為公式，請返回 {"error": "無法將此要求轉換為公式。"}。

使用者要求："${text}"`;

    console.log(`[API] Sending prompt to qwen2.5:latest for formula translation...`);
    const data = await callOllama({
      model: 'qwen2.5:latest',
      prompt: promptText,
      format: 'json',
      stream: false,
      options: { temperature: 0.1 }
    });

    console.log('[API] Raw response from Ollama:', data.response);
    
    const parsedData = JSON.parse(data.response.trim());
    return c.json({
      success: true,
      data: parsedData
    });

  } catch (error) {
    console.error('[API Error]', error);
    return c.json({ error: 'Failed to translate formula' }, 500);
  }
})

const port = 3000
console.log(`Server is running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port
})
