import express from 'express';
import cors from 'cors';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { execSync } from 'child_process';

const app = express();
const port = 3001; // Using 3001 to avoid conflict with anything on 3000
const docsDir = join(process.cwd(), 'docs');

app.use(cors());
app.use(express.json());

// Helper to recursively get all md files
function getAllFiles(dirPath, arrayOfFiles) {
  const files = readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (file.startsWith('.') || file === 'node_modules' || file === 'templates') return;
    if (statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.md')) {
        arrayOfFiles.push(join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

async function queryGemini(userPrompt, systemInstruction) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return "Помилка конфігурації: відсутній GEMINI_API_KEY на сервері.";
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const payload = {
    system_instruction: {
      parts: { text: systemInstruction }
    },
    contents: [{
      parts: [{ text: userPrompt }]
    }],
    generationConfig: {
      temperature: 0.1
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini Error:', error);
    return "Вибачте, сталася помилка при зверненні до Gemini.";
  }
}

app.post('/api/ai-search', async (req, res) => {
  const { q } = req.body;
  if (!q) return res.status(400).json({ error: 'Query is required' });

  console.log(`Searching for: ${q}`);

  // 1. Simple keyword-based context retrieval
  // We search for the query string in all .md files (case-insensitive)
  const allFiles = getAllFiles(docsDir);
  let context = "";
  let foundFiles = [];

  // Sort files by relevance (number of keyword matches)
  const cleanedQuery = q.toLowerCase().replace(/[?!.,;:()'"]/g, '');
  const keywords = cleanedQuery.split(/\s+/).filter(k => k.length > 3);
  
  const scoredFiles = allFiles.map(filePath => {
    try {
      const content = readFileSync(filePath, 'utf-8').toLowerCase();
      let score = 0;
      keywords.forEach(kw => {
        // Find all occurrences of the keyword
        const matches = content.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
        if (matches) {
          // Weight the score by the length of the keyword (longer words are more specific)
          score += matches.length * (kw.length * kw.length); 
        }
      });
      return { path: filePath, score };
    } catch (e) {
      return { path: filePath, score: 0 };
    }
  }).filter(f => f.score > 0).sort((a,b) => b.score - a.score).slice(0, 3);

  scoredFiles.forEach(f => {
    let content = readFileSync(f.path, 'utf-8');
    
    // Extract a small snippet to avoid overloading the CPU
    let snippet = content;
    const firstMw = keywords.find(kw => content.toLowerCase().includes(kw));
    if (firstMw) {
       const idx = content.toLowerCase().indexOf(firstMw);
       const start = Math.max(0, idx - 200);
       const end = Math.min(content.length, idx + 400);
       snippet = "... " + content.substring(start, end) + " ...";
    } else {
       snippet = content.substring(0, 600) + "...";
    }

    const relPath = relative(docsDir, f.path);
    context += `\n--- FILE: ${relPath} ---\n${snippet}\n`;
    foundFiles.push(relPath);
  });

  if (!context) {
    // If no specific match, just use the index
    try {
        const idxContent = readFileSync(join(docsDir, 'index.md'), 'utf-8');
        context = idxContent.substring(0, 600) + "...";
    } catch(e) {}
  }

  // 2. Build the final prompt
  const systemPrompt = `
    Ти — AI-помічник корпоративної Wiki "SecretShop". 
    Твоє завдання — дати коротку (1-2 речення) і максимально конкретну відповідь "Що робити" на основі наданого контексту.
    Якщо в контексті немає відповіді, так і скажи: "На жаль, я не знайшов точної інструкції в базі".
    Відповідай українською мовою. Лаконічність — понад усе.
  `;

  const userPrompt = `
    КОНТЕКСТ З WIKI:
    ${context}

    ПИТАННЯ КОРИСТУВАЧА:
    ${q}

    ВІДПОВІДЬ (КОРОТКО):
  `;

  const answer = await queryGemini(userPrompt, systemPrompt);

  res.json({
    answer,
    sources: foundFiles
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`AI Search API listening at http://0.0.0.0:${port}`);
});
