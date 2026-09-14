import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { useStore } from '../../context/StoreContext';
import { MessageCircle, Bot, X, FileText } from 'lucide-react';
import { ContactFormModal } from './ContactFormModal';

// Lazy-load AI chat to avoid loading it on every page
const AIChatDrawer = lazy(() =>
  import('./AIChatDrawer').then(m => ({ default: m.AIChatDrawer }))
);

export interface SupportProductContext {
  productId: string;
  productName: string;
  categoryName?: string;
}

interface SupportWidgetProps {
  productContext?: SupportProductContext | null;
  /** Pass 'checkout' to customise the WhatsApp pre-fill message */
  pageContext?: 'checkout' | 'product' | 'order' | 'general';
  orderNumber?: string;
}

/**
 * Generates a safe, contextual WhatsApp pre-filled message.
 * Never exposes sensitive/internal data.
 */
function buildWhatsAppUrl(phone: string, pageContext: string, productContext?: SupportProductContext | null, orderNumber?: string): string {
  // Strip non-numeric, ensure international format for Bangladesh numbers
  const cleaned = phone.replace(/[^0-9]/g, '');
  const intl = cleaned.startsWith('880') ? cleaned : cleaned.startsWith('0') ? `880${cleaned.slice(1)}` : `880${cleaned}`;

  let message = 'Hi GoodZeed, I need help.';
  if (pageContext === 'product' && productContext?.productName) {
    message = `Hi GoodZeed, I'm interested in "${productContext.productName}". I would like to know more about this product.`;
  } else if (pageContext === 'order' && orderNumber) {
    message = `Hi GoodZeed Support, I need help with order #${orderNumber}.`;
  } else if (pageContext === 'checkout') {
    message = 'Hi GoodZeed, I need help completing my order.';
  } else {
    message = 'Hi GoodZeed, I need help with my order/store.';
  }

  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

export const SupportWidget: React.FC<SupportWidgetProps> = ({
  productContext,
  pageContext = 'general',
  orderNumber
}) => {
  const { settings, currentView } = useStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Don't render on admin panel (never mounted there anyway, but safety check)
  const aiEnabled = settings.aiAssistantEnabled !== false;

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isMenuOpen]);

  // Close menu on view change
  useEffect(() => {
    setIsMenuOpen(false);
    setShowAI(false);
  }, [currentView]);

  const whatsappPhone = settings.whatsappSupportNumber || settings.storeContactPhone || '';

  const openWhatsApp = (extraContext?: string) => {
    const ctx = extraContext ? 'order' : pageContext;
    const url = buildWhatsAppUrl(whatsappPhone, ctx, productContext, orderNumber || extraContext);
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsMenuOpen(false);
  };

  const handleOpenAI = () => {
    setIsMenuOpen(false);
    setShowAI(true);
  };

  const handleOpenForm = () => {
    setIsMenuOpen(false);
    setShowContactForm(true);
  };

  // Mobile tab bar is h-14 (56px), so place widget at bottom-20 (80px) on mobile
  // On desktop, place at bottom-6 (24px)
  // During checkout on mobile, MobileTabBar is hidden so use bottom-6
  const isCheckout = currentView === 'checkout';
  const bottomClass = isCheckout
    ? 'bottom-6 right-4'
    : 'bottom-20 right-4 lg:bottom-6 lg:right-6';

  return (
    <>
      {/* Floating Support Widget */}
      <div ref={menuRef} className={`fixed ${bottomClass} z-50 flex flex-col items-end gap-2`}>
        {/* Popup Menu */}
        {isMenuOpen && !showAI && (
          <div className="mb-1 w-52 bg-white rounded-2xl shadow-2xl border border-neutral-200/80 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Menu Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-[#2F5233] to-[#3D6B45]">
              <span className="text-white font-bold text-sm block">Contact Support</span>
              <span className="text-white/70 text-[10px]">How can we help you?</span>
            </div>

            <div className="p-2 space-y-1">
              {/* AI Assistant */}
              {aiEnabled && (
                <button
                  id="support-ai-btn"
                  onClick={handleOpenAI}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#2F5233]/8 transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#2F5233]/10 group-hover:bg-[#2F5233]/20 flex items-center justify-center shrink-0 transition-colors">
                    <Bot className="w-4 h-4 text-[#2F5233]" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-[#2A2A28] block">AI Assistant</span>
                    <span className="text-[10px] text-neutral-500">Products, orders & more</span>
                  </div>
                </button>
              )}

              {/* WhatsApp */}
              <button
                id="support-whatsapp-btn"
                onClick={() => openWhatsApp()}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#25D366]/10 transition-colors text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#25D366]/15 group-hover:bg-[#25D366]/25 flex items-center justify-center shrink-0 transition-colors">
                  {/* WhatsApp SVG icon */}
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#25D366]">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <div>
                  <span className="font-bold text-xs text-[#2A2A28] block">WhatsApp</span>
                  <span className="text-[10px] text-neutral-500">Chat with our team</span>
                </div>
              </button>

              {/* Contact Form */}
              <button
                id="support-form-btn"
                onClick={handleOpenForm}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 transition-colors text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-neutral-100 group-hover:bg-neutral-200 flex items-center justify-center shrink-0 transition-colors">
                  <FileText className="w-4 h-4 text-neutral-600" />
                </div>
                <div>
                  <span className="font-bold text-xs text-[#2A2A28] block">Contact Form</span>
                  <span className="text-[10px] text-neutral-500">Leave a message</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Floating Button */}
        <button
          id="support-widget-fab"
          onClick={() => {
            if (showAI) { setShowAI(false); return; }
            setIsMenuOpen(prev => !prev);
          }}
          className={`w-13 h-13 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 ${
            isMenuOpen || showAI
              ? 'bg-neutral-700 rotate-0'
              : 'bg-[#2F5233]'
          }`}
          style={{ width: '52px', height: '52px' }}
          aria-label={isMenuOpen || showAI ? 'Close support' : 'Open support'}
        >
          {isMenuOpen || showAI ? (
            <X className="w-5 h-5 text-white" />
          ) : (
            <MessageCircle className="w-5 h-5 text-white" />
          )}
        </button>
      </div>

      {/* AI Chat Drawer — lazy loaded */}
      {showAI && (
        <Suspense fallback={null}>
          <AIChatDrawer
            onClose={() => setShowAI(false)}
            onOpenWhatsApp={openWhatsApp}
            productContext={productContext}
          />
        </Suspense>
      )}

      {/* Contact Form Modal */}
      {showContactForm && (
        <ContactFormModal
          onClose={() => setShowContactForm(false)}
          prefillOrderNumber={orderNumber}
        />
      )}
    </>
  );
};
