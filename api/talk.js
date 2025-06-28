export default function handler(req, res) {
  // CORS設定（重要！）
  res.setHeader('Access-Control-Allow-Origin', 'https://biyuminu.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // プリフライトリクエストの処理
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // POSTリクエストの処理
  if (req.method === 'POST') {
    const { message } = req.body;
    
    // とりあえずテスト用の返答
    res.status(200).json({ 
      response: `あなたが言った「${message}」を受け取りました！` 
    });
    return;
  }
  
  // その他のメソッドは許可しない
  res.status(405).json({ error: 'Method not allowed' });
}
