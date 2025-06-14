const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { OpenAIClient, AzureKeyCredential } = require('@azure/openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 環境変数のバリデーション
const requiredEnvVars = [
  'AZURE_OPENAI_ENDPOINT',
  'AZURE_OPENAI_API_KEY',
  'AZURE_OPENAI_DEPLOYMENT_NAME'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: ${envVar} is not set in environment variables`);
    process.exit(1);
  }
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Azure OpenAI クライアントの初期化
const client = new OpenAIClient(
  process.env.AZURE_OPENAI_ENDPOINT,
  new AzureKeyCredential(process.env.AZURE_OPENAI_API_KEY)
);

// エラーハンドラーミドルウェア
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

// Chat endpoint
app.post('/api/chat', async (req, res, next) => {
  try {
    const { messages } = req.body;

    // リクエストのバリデーション
    if (!messages) {
      return res.status(400).json({ error: 'メッセージが提供されていません' });
    }

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'メッセージは配列形式である必要があります' });
    }

    if (messages.length === 0) {
      return res.status(400).json({ error: 'メッセージが空です' });
    }

    // メッセージの形式チェック
    for (const message of messages) {
      if (!message.role || !message.content) {
        return res.status(400).json({ 
          error: '各メッセージにはroleとcontentが必要です',
          invalidMessage: message
        });
      }
    }

    const response = await client.getChatCompletions(
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      messages,
      {
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.95,
        frequencyPenalty: 0,
        presencePenalty: 0
      }
    );

    if (!response.choices || response.choices.length === 0) {
      throw new Error('AIからの応答が空です');
    }

    const aiMessage = response.choices[0].message;
    res.json({ 
      message: aiMessage,
      usage: response.usage // トークン使用量を追加
    });

  } catch (error) {
    if (error.status === 429) {
      return res.status(429).json({ 
        error: 'レート制限に達しました。しばらくお待ちください。',
        retryAfter: error.retryAfter
      });
    }
    next(error);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// エラーハンドラーの適用
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});