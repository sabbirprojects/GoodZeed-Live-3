import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Optional Supabase client for server-side operations
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const isSbConfigured = Boolean(supabaseUrl && supabaseKey && !supabaseUrl.includes('YOUR_SUPABASE_URL'));
const supabase = isSbConfigured ? createClient(supabaseUrl, supabaseKey) : null;

// Ensure public/uploads directory exists
const publicDir = path.resolve(process.cwd(), 'public');
const uploadsDir = path.join(publicDir, 'uploads');
const dataDir = path.resolve(process.cwd(), 'data');
const storeFilePath = path.join(dataDir, 'store.json');

const srcAssetsDir = path.resolve(process.cwd(), 'src', 'assets');
const srcUploadsDir = path.join(srcAssetsDir, 'uploads');
const srcDataDir = path.resolve(process.cwd(), 'src', 'data');
const srcStoreFilePath = path.join(srcDataDir, 'storeData.json');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(srcUploadsDir)) {
  fs.mkdirSync(srcUploadsDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${timestamp}-${randomSuffix}-${safeOriginalName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Health check
router.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// File upload endpoint
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const relUrl = `/uploads/${req.file.filename}`;
    // Also mirror to src/assets/uploads/ so files are bundled by Vite and tracked by Git
    try {
      fs.copyFileSync(req.file.path, path.join(srcUploadsDir, req.file.filename));
    } catch (copyErr) {
      console.warn('[API] Could not mirror upload to src/assets/uploads:', copyErr);
    }
    return res.json({
      success: true,
      url: relUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (err) {
    console.error('[API] Upload error:', err);
    return res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Read persistent store
router.get('/store', async (req, res) => {
  try {
    // First-boot: store.json doesn't exist yet — return empty object so the
    // frontend falls through gracefully to seed data without a 404 warning.
    if (!fs.existsSync(storeFilePath)) {
      return res.json({});
    }
    const data = await fs.promises.readFile(storeFilePath, 'utf8');
    res.setHeader('Content-Type', 'application/json');
    return res.send(data);
  } catch (err) {
    console.error('[API] Error reading store.json:', err);
    return res.status(500).json({ error: 'Failed to read store data' });
  }
});

// Write / update persistent store
const handleSaveStore = async (req, res) => {
  try {
    let existingData = {};
    const primaryPath = fs.existsSync(storeFilePath) ? storeFilePath : (fs.existsSync(srcStoreFilePath) ? srcStoreFilePath : null);
    if (primaryPath) {
      try {
        const raw = await fs.promises.readFile(primaryPath, 'utf8');
        existingData = JSON.parse(raw);
      } catch (readErr) {
        console.warn('[API] Could not parse existing store file, creating anew:', readErr);
      }
    }

    const incomingData = req.body;
    if (!incomingData || typeof incomingData !== 'object') {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Merge or replace top-level keys
    const mergedData = {
      ...existingData,
      ...incomingData,
      lastUpdated: new Date().toISOString()
    };

    // Deep merge settings if both exist
    if (existingData.settings && incomingData.settings) {
      mergedData.settings = {
        ...existingData.settings,
        ...incomingData.settings
      };
    }

    // Atomic write to avoid corrupted JSON on crash
    const tmpFilePath = `${storeFilePath}.tmp-${Date.now()}`;
    await fs.promises.writeFile(tmpFilePath, JSON.stringify(mergedData, null, 2), 'utf8');
    await fs.promises.rename(tmpFilePath, storeFilePath);

    // Also persist to src/data/storeData.json so static builds and seed data always have latest updates
    try {
      if (fs.existsSync(srcDataDir)) {
        const tmpSrcPath = `${srcStoreFilePath}.tmp-${Date.now()}`;
        await fs.promises.writeFile(tmpSrcPath, JSON.stringify(mergedData, null, 2), 'utf8');
        await fs.promises.rename(tmpSrcPath, srcStoreFilePath);
      }
    } catch (srcWriteErr) {
      console.warn('[API] Could not sync to src/data/storeData.json:', srcWriteErr);
    }

    return res.json({
      success: true,
      lastUpdated: mergedData.lastUpdated
    });
  } catch (err) {
    console.error('[API] Error saving store.json:', err);
    return res.status(500).json({ error: 'Failed to save store data' });
  }
};

router.post('/store', handleSaveStore);
router.put('/store', handleSaveStore);

// ──────────────────────────────────────────────────────────────────────────────
// AI Support  —  POST /api/support/ai
// Proxies the chat to Gemini, keeping the API key server-side.
// Builds a dynamic system prompt from live store data so the AI is store-aware.
// ──────────────────────────────────────────────────────────────────────────────

// Simple in-memory rate limiter (20 requests / minute per IP)
const aiRateLimitMap = new Map();
const AI_RATE_LIMIT = 20;
const AI_RATE_WINDOW_MS = 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = aiRateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > AI_RATE_WINDOW_MS) {
    aiRateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= AI_RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

// Clean up rate limit map every 5 minutes to prevent memory leaks (unref so it does not block Node event loop)
const rateLimitCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of aiRateLimitMap.entries()) {
    if (now - entry.windowStart > AI_RATE_WINDOW_MS * 2) aiRateLimitMap.delete(ip);
  }
}, 5 * 60 * 1000);
if (rateLimitCleanupTimer.unref) {
  rateLimitCleanupTimer.unref();
}

/**
 * Safely reads store.json and returns parsed object (or {} on error).
 */
function readStoreData() {
  try {
    if (!fs.existsSync(storeFilePath)) return {};
    return JSON.parse(fs.readFileSync(storeFilePath, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Builds the AI system prompt using live store data.
 * Only whitelisted, non-sensitive data is included.
 */
function buildSystemPrompt(storeData, productContext, orderContext) {
  const s = storeData.settings || {};
  const products = (storeData.products || []).filter(p => p.isEnabled && p.isPublished !== false);
  const categories = (storeData.categories || []).filter(c => c.isEnabled);
  const zones = (storeData.deliveryZones || []).filter(z => z.isEnabled);

  // Product catalog summary (only public-safe fields)
  const productSummary = products.slice(0, 40).map(p => {
    const variants = (p.variants || []).filter(v => v.isEnabled);
    const priceRange = variants.length > 0
      ? variants.map(v => v.salePrice ? `${v.label}: ৳${v.salePrice} (was ৳${v.price})` : `${v.label}: ৳${v.price}`).join(', ')
      : 'Price on request';
    const inStock = variants.some(v => v.stock > 0);
    return `- ${p.name}: ${p.shortDescription || ''}. Sizes/prices: ${priceRange}. ${inStock ? 'In stock.' : 'Currently out of stock.'}`;
  }).join('\n');

  // Delivery zones
  const deliverySummary = zones.map(z =>
    `- ${z.name}: ৳${z.charge} delivery charge, estimated ${z.estimatedDeliveryTime}`
  ).join('\n');

  // Category list
  const categorySummary = categories.map(c => `- ${c.name}`).join('\n');

  // Order context (only if order was found server-side)
  let orderSection = '';
  if (orderContext) {
    orderSection = `
## Customer's Current Order
Order Number: ${orderContext.orderNumber}
Status: ${orderContext.status}
Placed on: ${orderContext.createdAt ? new Date(orderContext.createdAt).toLocaleDateString('en-BD') : 'Unknown'}
Delivery zone: ${orderContext.deliveryDistrict || 'N/A'}
Delivery status: ${orderContext.delivery?.status || 'N/A'}
Estimated delivery: ${orderContext.delivery?.estimatedDelivery || 'N/A'}
Payment method: ${orderContext.payment?.method || 'N/A'}
Payment status: ${orderContext.payment?.status || 'N/A'}
Items: ${(orderContext.items || []).map(i => `${i.productNameSnapshot} (${i.variantLabelSnapshot}) x${i.quantity}`).join(', ')}
Total: ৳${orderContext.total}
`;
  }

  // Product context (if customer is viewing a specific product)
  let productContextSection = '';
  if (productContext && productContext.productName) {
    productContextSection = `
## Customer's Currently Viewed Product
Name: ${productContext.productName}
Category: ${productContext.categoryName || 'N/A'}
You can proactively reference this product if relevant.
`;
  }

  return `You are the GoodZeed AI Assistant — a friendly, helpful, and knowledgeable store assistant for GoodZeed, Bangladesh's trusted natural food store.

## Your Personality
- Warm, helpful, and professional
- Always respond in the same language the customer uses (Bengali or English)
- Keep responses concise and clear
- Never make up prices, stock, or policies — only use the information provided below
- If you don't know something, say so honestly and offer WhatsApp support

## Store Information
Store Name: ${s.storeName || 'GoodZeed'}
Tagline: ${s.storeTagline || '100% Pure, Natural Everyday Food for Bangladesh'}
Contact Phone: ${s.storeContactPhone || ''}
Contact Email: ${s.storeContactEmail || ''}
Address: ${s.storeAddress || ''}
Support Hours: ${s.supportHours || 'Saturday – Thursday, 9 AM – 9 PM'}
WhatsApp: ${s.whatsappSupportNumber || s.storeContactPhone || ''}

## Payment Methods
- Cash on Delivery (COD): Pay after receiving and checking the package
- bKash: Send money to ${s.bkashReceivingNumber || 'our bKash number'}. ${s.bkashInstructions || ''}
- Nagad: Send money to ${s.nagadReceivingNumber || 'our Nagad number'}. ${s.nagadInstructions || ''}

## Product Categories
${categorySummary}

## Available Products
${productSummary}

## Delivery Information
${deliverySummary}

## Policies
### Return Policy
${s.returnPolicy || 'Contact support within 3 days of delivery for damaged or incorrect products.'}

### Cancellation Policy
${s.cancellationPolicy || 'Cancel before order is Confirmed. Contact WhatsApp after that.'}

### Refund Policy
${s.refundPolicy || 'Refunds within 3-5 business days after return approval.'}

${s.supportFAQ ? `## FAQ\n${s.supportFAQ}` : ''}
${productContextSection}
${orderSection}
## Order Tracking
Customers can track orders at the "Track My Order" page using their phone number and order number.
Order Number format example: GZ-2026-1041

## Important Rules
- NEVER expose other customers' data
- NEVER invent order statuses, prices, or stock
- NEVER share internal database IDs
- If asked to cancel/modify an order, direct to WhatsApp support
- If the AI cannot solve the issue, offer "Continue on WhatsApp" option
- Always be helpful, never dismissive`;
}

router.post('/support/ai', async (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment before trying again.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[AI Support] GEMINI_API_KEY not configured');
    return res.status(503).json({ error: 'AI Assistant is temporarily unavailable.' });
  }

  try {
    const { messages, storeContext } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid request: messages array required.' });
    }

    const storeData = readStoreData();

    // Order lookup — only if phone + orderNumber both provided
    let orderContext = null;
    if (storeContext?.orderLookup?.phone && storeContext?.orderLookup?.orderNumber) {
      const { phone, orderNumber } = storeContext.orderLookup;
      const cleanNum = String(orderNumber).trim().toUpperCase();
      const normPhone = String(phone).replace(/[^0-9]/g, '').slice(-10);

      // 1. Try querying Supabase orders_view if available
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
                delivery: match.delivery ? {
                  status: match.delivery.status,
                  estimatedDelivery: match.delivery.estimatedDelivery
                } : null,
                payment: match.payment ? {
                  method: match.payment.method,
                  status: match.payment.status
                } : null,
                items: (match.items || []).map(i => ({
                  productNameSnapshot: i.productNameSnapshot,
                  variantLabelSnapshot: i.variantLabelSnapshot,
                  quantity: i.quantity
                })),
                total: match.total
              };
            }
          }
        } catch (sbErr) {
          console.warn('[API/AI] Supabase order lookup error, falling back to local:', sbErr);
        }
      }

      // 2. Fallback to local storeData if not found in Supabase
      if (!orderContext) {
        const orders = storeData.orders || [];
        const match = orders.find(o => {
          const oNum = String(o.orderNumber || '').toUpperCase();
          const oPhone = String(o.customerPhoneSnapshot || '').replace(/[^0-9]/g, '').slice(-10);
          return (oNum === cleanNum || oNum.endsWith(cleanNum)) && oPhone === normPhone;
        });
        if (match) {
          // Only expose safe, non-sensitive order fields
          orderContext = {
            orderNumber: match.orderNumber,
            status: match.status,
            createdAt: match.createdAt,
            deliveryDistrict: match.deliveryDistrict,
            delivery: match.delivery ? {
              status: match.delivery.status,
              estimatedDelivery: match.delivery.estimatedDelivery
            } : null,
            payment: match.payment ? {
              method: match.payment.method,
              status: match.payment.status
            } : null,
            items: (match.items || []).map(i => ({
              productNameSnapshot: i.productNameSnapshot,
              variantLabelSnapshot: i.variantLabelSnapshot,
              quantity: i.quantity
            })),
            total: match.total
          };
        }
      }
    }

    const productContext = storeContext?.currentProduct || null;
    const systemPrompt = buildSystemPrompt(storeData, productContext, orderContext);

    const ai = new GoogleGenAI({ apiKey });

    // Build conversation as contents array for generateContent (SDK v2 / gemini-3.6-flash)
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

    if (!aiText.trim()) {
      return res.status(500).json({ error: 'Empty AI response. Please try again.' });
    }

    return res.json({
      reply: aiText,
      orderFound: !!orderContext,
      orderNumber: orderContext?.orderNumber || null
    });
  } catch (err) {
    console.error('[AI Support] Error:', err?.message || err);
    return res.status(500).json({
      error: 'AI Assistant is temporarily unavailable. Please try WhatsApp support.'
    });
  }
});

export default router;
