import React from 'react';
import { motion } from 'motion/react';
import { useStore } from '../../context/StoreContext';
import { Home, Store, Truck, ShoppingBag } from 'lucide-react';

export const MobileTabBar: React.FC = () => {
  const { currentView, setCurrentView, cartItemCount, setIsCartOpen } = useStore();

  // Hide mobile bottom tab bar during checkout to maximize screen space for delivery & payment
  if (currentView === 'checkout') {
    return null;
  }

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#2F5233]/15 shadow-lg pb-safe">
      <div className="grid grid-cols-4 items-center h-14">
        {/* Home */}
        <button
          id="tab-home-btn"
          onClick={() => setCurrentView('home')}
          className={`relative flex flex-col items-center justify-center h-full transition-colors ${
            currentView === 'home' ? 'text-[#2F5233] font-bold' : 'text-neutral-500'
          }`}
        >
          {currentView === 'home' && (
            <motion.span
              layoutId="home-tab-indicator"
              transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              className="absolute top-0 h-0.5 w-10 rounded-full bg-[#2F5233]"
            />
          )}
          <Home className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">Home</span>
        </button>

        {/* Shop */}
        <button
          id="tab-shop-btn"
          onClick={() => setCurrentView('shop')}
          className={`relative flex flex-col items-center justify-center h-full transition-colors ${
            currentView === 'shop' || currentView === 'category'
              ? 'text-[#2F5233] font-bold'
              : 'text-neutral-500'
          }`}
        >
          {(currentView === 'shop' || currentView === 'category') && (
            <motion.span
              layoutId="shop-tab-indicator"
              transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              className="absolute top-0 h-0.5 w-10 rounded-full bg-[#2F5233]"
            />
          )}
          <Store className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">Shop</span>
        </button>

        {/* Cart Trigger */}
        <button
          id="tab-cart-btn"
          onClick={() => setIsCartOpen(true)}
          className="relative flex flex-col items-center justify-center h-full text-neutral-500 hover:text-[#2F5233]"
        >
          <div className="relative">
            <ShoppingBag className="w-4 h-4 mb-0.5" />
            {cartItemCount > 0 && (
              <motion.span
                key={cartItemCount}
                initial={{ scale: 0.4 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                className="absolute -top-1.5 -right-2 bg-[#D9A441] text-[#2A2A28] text-[9px] font-black rounded-full px-1 min-w-[15px] text-center"
              >
                {cartItemCount}
              </motion.span>
            )}
          </div>
          <span className="text-[10px]">Cart</span>
        </button>

        {/* Track Order */}
        <button
          id="tab-track-btn"
          onClick={() => setCurrentView('track-order')}
          className={`relative flex flex-col items-center justify-center h-full transition-colors ${
            currentView === 'track-order' ? 'text-[#2F5233] font-bold' : 'text-neutral-500'
          }`}
        >
          {currentView === 'track-order' && (
            <motion.span
              layoutId="track-tab-indicator"
              transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              className="absolute top-0 h-0.5 w-10 rounded-full bg-[#2F5233]"
            />
          )}
          <Truck className="w-4 h-4 mb-0.5 text-[#D9A441]" />
          <span className="text-[10px]">Track</span>
        </button>
      </div>
    </div>
  );
};
