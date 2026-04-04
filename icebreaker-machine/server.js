const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3457;
const DIR = __dirname;

const mimeTypes = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
};

const EXAMPLE_PROMPTS = [
  "Fun fact no one knows about you?",
  "What do you collect?",
  "Person — living or dead — you'd have a drink with?",
  "What's on your tombstone?",
  "Silly childhood fear?",
  "What's your most useless skill?",
  "What movie have you seen the most times?",
  "What's a hill you'll die on?",
  "What was your first job?",
  "If you could live in any decade, which would it be?",
  "What's the last thing you Googled?",
  "What's something you're irrationally good at?",
  "What's your go-to karaoke song?",
  "What's a weird food combination you love?",
  "What's the most embarrassing thing in your search history?",
];

function callAnthropicAPI(callback) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    callback(new Error('ANTHROPIC_API_KEY not set'), null);
    return;
  }

  const body = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 60,
    messages: [{
      role: 'user',
      content: `You generate icebreaker questions for groups. Here are some examples of the style and tone:\n\n${EXAMPLE_PROMPTS.map(p => `- ${p}`).join('\n')}\n\nGenerate ONE new icebreaker question in the same style: short, conversational, a little quirky. Respond with only the question, nothing else.`
    }]
  });

  const options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Length': Buffer.byteLength(body),
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        const text = parsed.content?.[0]?.text?.trim();
        if (!text) throw new Error('No text in response');
        callback(null, text);
      } catch (e) {
        callback(e, null);
      }
    });
  });

  req.on('error', callback);
  req.write(body);
  req.end();
}

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/generate-prompt') {
    callAnthropicAPI((err, prompt) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ prompt }));
    });
    return;
  }

  let filePath = path.join(DIR, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'text/plain';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
