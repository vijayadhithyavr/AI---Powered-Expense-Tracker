const { GoogleGenAI } = require('@google/genai');
const readline = require('readline');

const ai = new GoogleGenAI({ apiKey: 'Gemini Api Key' });
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function extractSQL(rawContent) {
  if (!rawContent) return '';

  if (rawContent.parts && Array.isArray(rawContent.parts)) {
    rawContent = rawContent.parts.map(p => p.text || '').join(' ');
  }

  if (Array.isArray(rawContent)) {
    rawContent = rawContent.map(c => c.text || '').join(' ');
  }

  rawContent = String(rawContent);

  rawContent = rawContent.replace(/```(sql)?/gi, '');
  rawContent = rawContent.replace(/--.*$/gm, '');
  rawContent = rawContent.replace(/\/\*[\s\S]*?\*\//g, '');

  let match = rawContent.match(/SELECT[\s\S]*?;/i);
  if (match) return match[0].trim();

  if (/^SELECT/i.test(rawContent.trim())) {
    let sql = rawContent.trim();
    if (!sql.endsWith(';')) sql += ';';
    return sql;
  }

  return '';
}

function isValidSQL(sql) {
  if (!sql) return false;

  const forbiddenKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER'];
  const upperSQL = sql.toUpperCase();

  for (const keyword of forbiddenKeywords) {
    if (upperSQL.includes(keyword)) return false;
  }

  const allowedTables = ['USERS', 'BUDGETS', 'TRANSACTIONS'];
  const tableRegex = /\bFROM\s+(\w+)/gi;
  let match;
  while ((match = tableRegex.exec(upperSQL)) !== null) {
    if (!allowedTables.includes(match[1].toUpperCase())) return false;
  }

  return true;
}

async function askPrompt() {
  rl.question('Enter your query request (or type "exit" to quit): ', async (prompt) => {
    if (prompt.toLowerCase() === 'exit') {
      console.log('Goodbye!');
      rl.close();
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `
You are a SQL assistant. Only generate valid SQL SELECT queries for MySQL on these tables:
Users(user_id, username, password),
Budgets(budget_id, user_id, monthly_budget, remaining_budget),
Transactions(transaction_id, user_id, amount, category, transaction_date).

Do NOT generate any explanations, comments, or code blocks. Return ONLY a single SQL SELECT query.

User request: "${prompt}"
`
      });

      const rawContent = response.candidates?.[0]?.content;

      
      const sqlQuery = extractSQL(rawContent);

      

      if (!sqlQuery || !isValidSQL(sqlQuery)) {
        console.log('\nInvalid input. Please provide a valid query request.');
      } else {
        console.log(sqlQuery);
      }
    } catch (err) {
      console.error('Error:', err.message || err);
    } finally {
      askPrompt(); 
    }
  });
}
askPrompt();
