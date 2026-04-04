const https = require('https');

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

function callAnthropic(apiKey) {
  return new Promise((resolve, reject) => {
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
          resolve(text);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  try {
    const prompt = await callAnthropic(apiKey);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message }),
    };
  }
};
