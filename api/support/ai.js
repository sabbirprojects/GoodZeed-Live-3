import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const isSbConfigured = Boolean(supabaseUrl && supabaseKey && !supabaseUrl.includes('YOUR_SUPABASE_URL'));
const supabase = isSbConfigured ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'AI Assistant is temporarily unavailable. Please contact WhatsApp support.'
    });
  }

  try {
    const { messages, storeContext } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array required' });
    }

    let orderContext = null;
    if (storeContext?.orderLookup?.phone && storeContext?.orderLookup?.orderNumber) {
      const { phone, orderNumber } = storeContext.orderLookup;
      const cleanNum = String(orderNumber).trim().toUpperCase();
      const normPhone = String(phone).replace(/[^0-9]/g, '').slice(-10);

      if (supabase) {
        try {
          const { data: sbOrders } = await supabase
            .from('orders_view')
            .select('*')
            .eq('orderNumber', cleanNum)
            .limit(1);

          if (sbOrders && sbOrders.length > 0) {
            const match = sbOrders[0];
            const oPhone = String(match.customerPhoneSnapshot || '').replace(/[^0-9]/g, '').slice(-10);
            if (oPhone === normPhone) {
              orderContext = {
                orderNumber: match.orderNumber,
                status: match.status,
                createdAt: match.createdAt,
                deliveryDistrict: match.deliveryDistrict,
                total: match.total
              };
            }
          }
        } catch (sbErr) {
          console.warn('[AI/Vercel] Supabase order query error:', sbErr);
        }
      }
    }

    const systemPrompt = `You are the GoodZeed AI Assistant — a friendly, helpful, and knowledgeable store assistant for GoodZeed, Bangladesh's trusted 100% pure natural food store (pure raw honey, cold-pressed oils, organic chia seeds, dry fruits).
Respond in the language the customer uses (Bengali or English).
Keep answers concise, courteous, and accurate.
Never invent policies or prices. If you do not know an answer or if the customer needs human help, advise contacting WhatsApp support.
${orderContext ? `Customer Order Context: Order #${orderContext.orderNumber}, Status: ${orderContext.status}, Total: ৳${orderContext.total}` : ''}
${storeContext?.currentProduct ? `Currently viewed product: ${storeContext.currentProduct.productName}` : ''}`;

    const ai = new GoogleGenAI({ apiKey });
    const contents = [];
    for (const m of messages.slice(0, -1)) {
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      });
    }
    const lastMessage = messages[messages.length - 1];
    contents.push({ role: 'user', parts: [{ text: lastMessage.content }] });

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 512,
        temperature: 0.7
      },
      contents
    });

    const aiText = response.text || '';
    return res.status(200).json({
      reply: aiText,
      orderFound: !!orderContext,
      orderNumber: orderContext?.orderNumber || null
    });
  } catch (err) {
    console.error('[AI/Vercel] Error:', err);
    return res.status(500).json({
      error: 'AI Assistant is temporarily unavailable. Please try WhatsApp support.'
    });
  }
}
