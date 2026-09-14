import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useStore } from '../../context/StoreContext';
import { formatCurrency } from '../../utils/formatters';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck, Truck } from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    updateCartQuantity,
    removeFromCart,
    cartSubtotal,
    setCurrentView,
    setBuyNowItem
  } = useStore();
  const shouldReduceMotion = useReducedMotion();

  const handleProceedToCheckout = () => {
    setBuyNowItem(null); // Ensure full cart checkout mode
    setIsCartOpen(false);
    setCurrentView('checkout');
  };

  const freeDeliveryThreshold = 1500;
  const progressPercent = Math.min(100, Math.round((cartSubtotal / freeDeliveryThreshold) * 100));
  const remainingForFreeDelivery = Math.max(0, freeDeliveryThreshold - cartSubtotal);

  return (
    <AnimatePresence>
      {isCartOpen && (
    /* Backdrop with click-outside dismissal */
    <motion.div
      id="cart-drawer-backdrop"
      onClick={() => setIsCartOpen(false)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end"
    >
      {/* Sleek, compact cart container */}
      <motion.div
        id="cart-drawer-container"
        onClick={e => e.stopPropagation()}
        initial={shouldReduceMotion ? { opacity: 0 } : { x: '100%' }}
        animate={shouldReduceMotion ? { opacity: 1 } : { x: 0 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="w-full max-w-[350px] sm:max-w-[380px] bg-white shadow-2xl flex flex-col justify-between h-full border-l border-neutral-200"
      >
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-neutral-100 flex items-center justify-between bg-[#FAF7F2]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#2F5233]" />
            <h2 className="font-serif-brand font-bold text-base text-[#2F5233]">
              Your Cart ({cart.length})
            </h2>
          </div>
          <button
            id="close-cart-drawer-btn"
            onClick={() => setIsCartOpen(false)}
            aria-label="Close cart"
            className="w-7 h-7 rounded-full text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Free Delivery Incentive Bar */}
        {cart.length > 0 && (
          <div className="px-4 py-2.5 bg-[#FAF7F2]/80 border-b border-neutral-100 text-[11px]">
            <div className="flex items-center justify-between font-semibold text-[#2F5233] mb-1">
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-[#D9A441]" />
                {remainingForFreeDelivery === 0
                  ? '🎉 Free Dhaka Delivery Unlocked!'
                  : `Add ${formatCurrency(remainingForFreeDelivery)} more for Free Dhaka Delivery`}
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#2F5233] h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {cart.length === 0 ? (
            <div className="text-center py-14 space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#FAF7F2] text-[#2F5233] flex items-center justify-center mx-auto border border-[#2F5233]/15">
                <ShoppingBag className="w-6 h-6 stroke-1" />
              </div>
              <div>
                <h3 className="font-serif-brand font-bold text-sm text-[#2A2A28]">
                  Your cart is empty
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5 max-w-[220px] mx-auto">
                  Discover pure Sundarban honey, chia seeds & cold-pressed oils.
                </p>
              </div>
              <button
                id="empty-cart-shop-now-btn"
                onClick={() => {
                  setIsCartOpen(false);
                  setCurrentView('shop');
                }}
                className="px-4 py-2 rounded-xl bg-[#2F5233] text-white text-xs font-bold hover:bg-[#3D6B45] transition-colors inline-flex items-center gap-1.5 shadow-xs"
              >
                <span>Shop Pure Staples</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {cart.map(item => (
                <motion.div
                  key={item.variantId}
                  layout
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? undefined : { opacity: 0, x: 48 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="flex gap-2.5 p-2.5 rounded-xl border border-neutral-100 bg-[#FAF7F2]/40 hover:bg-[#FAF7F2] transition-colors"
                >
                {/* Item Thumbnail */}
                <img
                  src={item.image}
                  alt={item.productName}
                  className="w-13 h-13 sm:w-14 sm:h-14 rounded-lg object-cover bg-neutral-100 shrink-0 border border-neutral-200"
                />

                {/* Item Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-bold text-xs text-[#2A2A28] truncate">
                        {item.productName}
                      </h4>
                      <button
                        onClick={() => removeFromCart(item.variantId)}
                        className="text-neutral-400 hover:text-red-600 p-0.5"
                        title="Remove item"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="inline-block text-[10px] font-semibold text-neutral-500">
                      {item.variantLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1.5">
                    {/* Compact Quantity Stepper */}
                    <div className="flex items-center border border-neutral-300 rounded-md bg-white">
                      <button
                        onClick={() => updateCartQuantity(item.variantId, item.quantity - 1)}
                        className="p-1 text-neutral-600 hover:bg-neutral-100 rounded-l-md"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="w-6 text-center text-[11px] font-bold text-[#2A2A28]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateCartQuantity(item.variantId, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        className="p-1 text-neutral-600 hover:bg-neutral-100 rounded-r-md disabled:opacity-30"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    {/* Price */}
                    <span className="font-serif-brand font-bold text-xs sm:text-sm text-[#2F5233]">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer Summary & Checkout Button */}
        {cart.length > 0 && (
          <div className="p-3.5 sm:p-4 border-t border-neutral-200 bg-[#FAF7F2] space-y-2.5">
            <div className="flex items-center justify-between text-xs text-neutral-600">
              <span>Subtotal:</span>
              <span className="font-bold text-sm text-[#2A2A28]">
                {formatCurrency(cartSubtotal)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-neutral-500">
              <span>Delivery:</span>
              <span>Dhaka ৳70 / Outside ৳130</span>
            </div>

            <div className="flex items-center gap-1 text-[10px] text-[#2F5233] font-semibold">
              <ShieldCheck className="w-3 h-3 text-[#D9A441]" />
              <span>Cash on Delivery (COD) & bKash Accepted</span>
            </div>

            <motion.button
              id="cart-drawer-checkout-btn"
              onClick={handleProceedToCheckout}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              className="w-full py-2.5 px-4 rounded-xl bg-[#2F5233] hover:bg-[#3D6B45] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-colors"
            >
              <span>Proceed to Guest Checkout</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>

            <button
              onClick={() => setIsCartOpen(false)}
              className="w-full text-center text-[11px] text-neutral-500 hover:text-[#2F5233] font-medium"
            >
              ← Continue Shopping
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
};
