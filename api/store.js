export default function handler(req, res) {
  // GoodZeed uses Supabase as primary persistent database in production.
  // This endpoint provides a safe JSON response for legacy fallback checks.
  if (req.method === 'GET') {
    return res.status(200).json({});
  }
  if (req.method === 'POST' || req.method === 'PUT') {
    return res.status(200).json({ success: true, lastUpdated: new Date().toISOString() });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
