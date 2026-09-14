import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  X, Send, Loader2, Bot, User, MessageCircle, AlertCircle,
  Package, Truck, CreditCard, RotateCcw, ShoppingBag, ChevronRight
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isError?: boolean;
}

interface AIChatDrawerProps {
  onClose: () => void;
  onOpenWhatsApp: (context?: string) => void;
  productContext?: { productId: string; productName: string; categoryName?: string } | null;
}

const QUICK_ACTIONS = [
  { id: 'find-product', icon: ShoppingBag, label: '🛍️ Find a product', message: 'I want to find a product' },
  { id: 'track-order', icon: Package, label: '📦 Track my order', message: 'I want to track my order' },
  { id: 'delivery', icon: Truck, label: '🚚 Delivery info', message: 'What are your delivery charges and estimated delivery times?' },
  { id: 'payment', icon: CreditCard, label: '💳 Payment methods', message: 'What payment methods do you accept?' },
  { id: 'return', icon: RotateCcw, label: '↩️ Return / Refund', message: 'What is your return and refund policy?' },
];

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({
  onClose,
  onOpenWhatsApp,
  productContext
}) => {
  const { settings, orders, activeConfirmedOrder, setCurrentView, setActiveConfirmedOrder } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [aiTurns, setAiTurns] = useState(0);
  const [orderLookup, setOrderLookup] = useState<{ phone: string; orderNumber: string } | null>(null);
  const [awaitingOrderInput, setAwaitingOrderInput] = useState<'phone' | 'orderNumber' | null>(null);
  const [tempPhone, setTempPhone] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const welcomeMsg = settings.aiWelcomeMessage ||
    "Hi! 👋 I'm the GoodZeed Assistant.\n\nI can help you with products, orders, delivery, payments, returns, and more.\n\nHow can I help you today?";

  useEffect(() => {
    let welcome = welcomeMsg;
    if (productContext?.productName) {
      welcome = `Hi! 👋 I can see you're looking at **${productContext.productName}**.\n\nI can help with questions about this product, delivery, payment, or anything else. What would you like to know?`;
    }
    setMessages([{ id: 'welcome', role: 'assistant', content: welcome }]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const appendMessage = (msg: Omit<ChatMessage, 'id'>) => {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    setMessages(prev => [...prev, { ...msg, id }]);
  };

  const sendToAI = useCallback(async (userText: string, extraOrderLookup?: { phone: string; orderNumber: string }) => {
    setIsLoading(true);
    try {
      const chatHistory = messages
        .filter(m => m.role !== 'system' && m.id !== 'welcome')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      chatHistory.push({ role: 'user', content: userText });

      const lookup = extraOrderLookup || orderLookup;

      const resp = await fetch('/api/support/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatHistory,
          storeContext: {
            currentProduct: productContext || null,
            orderLookup: lookup || null
          }
        })
      });

      const data = await resp.json();

      if (!resp.ok) {
        appendMessage({ role: 'assistant', content: data.error || 'Sorry, something went wrong. Please try again.', isError: true });
        setShowWhatsApp(true);
      } else {
        appendMessage({ role: 'assistant', content: data.reply });
        setAiTurns(prev => prev + 1);
        if (data.orderFound && data.orderNumber) {
          const foundOrder = orders.find(o => o.orderNumber === data.orderNumber);
          if (foundOrder) {
            // Order found locally — set it and auto-navigate instantly
            setActiveConfirmedOrder(foundOrder);
            appendMessage({ role: 'assistant', content: `✅ Found your order **${data.orderNumber}**! Taking you to the tracking page now...` });
            setTimeout(() => {
              setCurrentView('track-order');
              onClose();
            }, 800);
          } else {
            // AI found it but not in local store — show redirect button as fallback
            setTimeout(() => {
              appendMessage({ role: 'system', content: `__TRACK_REDIRECT__${data.orderNumber}` });
            }, 600);
          }
        }
      }
    } catch {
      appendMessage({
        role: 'assistant',
        content: "😔 I'm having trouble connecting right now. You can reach us on WhatsApp for immediate help.",
        isError: true
      });
      setShowWhatsApp(true);
    } finally {
      setIsLoading(false);
    }
  }, [messages, orderLookup, productContext, orders, setActiveConfirmedOrder, setCurrentView, onClose]);

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;
    setInput('');
    appendMessage({ role: 'user', content: text });

    if (/track|order status|where is my|parcel/i.test(text) && !orderLookup) {
      if (activeConfirmedOrder) {
        const lookup = { phone: activeConfirmedOrder.customerPhoneSnapshot, orderNumber: activeConfirmedOrder.orderNumber };
        setOrderLookup(lookup);
        await sendToAI(text, lookup);
      } else {
        setAwaitingOrderInput('phone');
        appendMessage({ role: 'assistant', content: '📦 I\'d be happy to help you track your order!\n\nPlease enter your **phone number** used during checkout:' });
      }
      return;
    }

    if (awaitingOrderInput === 'phone') {
      setTempPhone(text);
      setAwaitingOrderInput('orderNumber');
      appendMessage({ role: 'assistant', content: 'Got it! Now please enter your **Order Number** (e.g. GZ-2026-1041):' });
      return;
    }

    if (awaitingOrderInput === 'orderNumber') {
      setAwaitingOrderInput(null);
      const lookup = { phone: tempPhone, orderNumber: text };
      setOrderLookup(lookup);
      await sendToAI(`Please check status for order number ${text} with phone ${tempPhone}`, lookup);
      return;
    }

    await sendToAI(text);
  };

  const handleQuickAction = (msg: string, actionId: string) => {
    if (actionId === 'track-order') {
      appendMessage({ role: 'user', content: msg });
      if (activeConfirmedOrder) {
        const lookup = { phone: activeConfirmedOrder.customerPhoneSnapshot, orderNumber: activeConfirmedOrder.orderNumber };
        setOrderLookup(lookup);
        sendToAI(msg, lookup);
      } else {
        setAwaitingOrderInput('phone');
        appendMessage({ role: 'assistant', content: '📦 I\'d be happy to help you track your order!\n\nPlease enter your **phone number** used during checkout:' });
      }
      return;
    }
    handleSend(msg);
  };

  const handleTrackRedirect = (orderNum: string) => {
    const found = orders.find(o => o.orderNumber === orderNum);
    if (found) {
      // Pre-set activeConfirmedOrder so TrackOrderView auto-fills and auto-searches
      setActiveConfirmedOrder(found);
      setCurrentView('track-order');
      onClose();
    } else {
      appendMessage({ role: 'assistant', content: `Please visit "Track My Order" and enter order number **${orderNum}**.` });
    }
  };

  const renderMessage = (msg: ChatMessage) => {
    if (msg.role === 'system' && msg.content.startsWith('__TRACK_REDIRECT__')) {
      const orderNum = msg.content.replace('__TRACK_REDIRECT__', '');
      return (
        <div key={msg.id} className="flex justify-center py-1">
          <button
            onClick={() => handleTrackRedirect(orderNum)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#2F5233] text-white rounded-xl text-xs font-bold hover:bg-[#3D6B45] transition-colors shadow-sm"
          >
            <Truck className="w-3.5 h-3.5" />
            View Order {orderNum} Tracking
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    if (msg.role === 'user') {
      return (
        <div key={msg.id} className="flex justify-end gap-2 items-end">
          <div className="max-w-[80%] bg-[#2F5233] text-white rounded-2xl rounded-br-sm px-3.5 py-2.5 text-xs leading-relaxed">
            {msg.content}
          </div>
          <div className="w-6 h-6 rounded-full bg-[#D9A441]/20 flex items-center justify-center shrink-0">
            <User className="w-3 h-3 text-[#D9A441]" />
          </div>
        </div>
      );
    }

    const renderedContent = msg.content.split('\n').map((line, i, arr) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <span key={i}>
          {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
          {i < arr.length - 1 && <br />}
        </span>
      );
    });

    return (
      <div key={msg.id} className="flex gap-2 items-end">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.isError ? 'bg-red-100' : 'bg-[#2F5233]/10'}`}>
          {msg.isError ? <AlertCircle className="w-3 h-3 text-red-500" /> : <Bot className="w-3 h-3 text-[#2F5233]" />}
        </div>
        <div className={`max-w-[80%] rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-xs leading-relaxed ${msg.isError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-white border border-neutral-200 text-[#2A2A28]'}`}>
          {renderedContent}
        </div>
      </div>
    );
  };

  const showQuickActions = messages.length <= 1;

  return (
    <div
      className="fixed inset-x-3 sm:inset-x-auto sm:right-4 sm:w-96 bottom-3 sm:bottom-6 z-[60] flex flex-col bg-white rounded-3xl shadow-2xl border border-neutral-200/80 overflow-hidden"
      style={{ maxHeight: 'min(580px, calc(100dvh - 100px))' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-[#2F5233] to-[#3D6B45] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-sm block leading-tight">GoodZeed Assistant</span>
            <span className="text-[10px] text-white/70">Powered by AI · Store-aware</span>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors" aria-label="Close AI chat">
          <X className="w-3.5 h-3.5 text-white" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#FAF7F2]">
        {messages.map(renderMessage)}

        {showQuickActions && (
          <div className="grid grid-cols-1 gap-1.5 pt-1">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.message, action.id)}
                className="flex items-center justify-between px-3 py-2 bg-white hover:bg-[#2F5233]/5 border border-neutral-200 rounded-xl text-xs font-medium text-[#2A2A28] transition-colors text-left"
              >
                <span>{action.label}</span>
                <ChevronRight className="w-3 h-3 text-neutral-400 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="flex gap-2 items-end">
            <div className="w-6 h-6 rounded-full bg-[#2F5233]/10 flex items-center justify-center shrink-0">
              <Bot className="w-3 h-3 text-[#2F5233]" />
            </div>
            <div className="bg-white border border-neutral-200 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
              <Loader2 className="w-3.5 h-3.5 text-[#2F5233] animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* WhatsApp Handoff */}
      {(showWhatsApp || aiTurns >= 4) && (
        <div className="px-3 py-2 bg-[#25D366]/10 border-t border-[#25D366]/20 shrink-0">
          <button
            onClick={() => onOpenWhatsApp()}
            className="w-full flex items-center justify-center gap-2 py-2 bg-[#25D366] text-white rounded-xl text-xs font-bold hover:bg-[#1ebe5d] transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Continue on WhatsApp
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-white border-t border-neutral-100 shrink-0">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={
            awaitingOrderInput === 'phone' ? 'Enter your phone number…' :
            awaitingOrderInput === 'orderNumber' ? 'Enter order number (e.g. GZ-2026-1041)…' :
            'Ask me anything…'
          }
          className="flex-1 px-3 py-2 text-xs bg-[#FAF7F2] rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#2F5233]/30 placeholder:text-neutral-400"
          disabled={isLoading}
          autoComplete="off"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          className="w-8 h-8 rounded-xl bg-[#2F5233] hover:bg-[#3D6B45] disabled:opacity-40 flex items-center justify-center transition-colors shrink-0"
          aria-label="Send message"
        >
          <Send className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
    </div>
  );
};
