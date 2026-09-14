import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import {
  LayoutDashboard,
  ShoppingBag,
  Store,
  Layers,
  Boxes,
  Users,
  Truck,
  Megaphone,
  MessageSquare,
  LifeBuoy,
  LogOut,
  ExternalLink,
  Shield,
  Menu,
  X
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

interface AdminLayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ activeTab, setActiveTab, children }) => {
  const { logoutAdmin, adminUser, setCurrentView, orders, reviews, supportTickets } = useStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Auto-logout when the 8-hour session token expires
  useEffect(() => {
    const check = () => {
      if (adminUser?.expiresAt && new Date(adminUser.expiresAt) < new Date()) {
        logoutAdmin();
      }
    };
    const interval = setInterval(check, 60_000); // check every minute
    return () => clearInterval(interval);
  }, [adminUser?.expiresAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const pendingOrdersCount = orders.filter(o => o.status === 'PENDING').length;
  const pendingReviewsCount = reviews.filter(r => r.moderationStatus === 'PENDING').length;
  const openTicketsCount = supportTickets.filter(t => t.status === 'OPEN').length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders & Payments', icon: ShoppingBag, badge: pendingOrdersCount },
    { id: 'products', label: 'Products & Variants', icon: Store },
    { id: 'categories', label: 'Categories', icon: Layers },
    { id: 'inventory', label: 'Inventory Stock', icon: Boxes },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'delivery', label: 'Delivery Zones', icon: Truck },
    { id: 'sales-marketing', label: 'Sales & Marketing', icon: Megaphone },
    { id: 'reviews', label: 'Reviews Moderation', icon: MessageSquare, badge: pendingReviewsCount },
    { id: 'support', label: 'Support Tickets', icon: LifeBuoy, badge: openTicketsCount },
    { id: 'settings', label: 'Settings & Homepage', icon: Shield }
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-4 space-y-6 flex-1">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <BrandLogo size="md" variant="icon" theme="dark-bg" />
            <div>
              <span className="font-serif-brand font-bold text-lg text-white">
                GoodZeed Admin
              </span>
              <span className="text-[10px] text-white/60 block -mt-1 font-mono">
                Super Admin Panel
              </span>
            </div>
          </div>
          {/* Close button — mobile only */}
          <button
            className="md:hidden p-1 text-white/60 hover:text-white rounded"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`admin-nav-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#D9A441] text-[#2A2A28] shadow-xs'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-[#2A2A28] text-white'
                        : 'bg-[#D9A441] text-[#2A2A28]'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-white/10 space-y-2 text-xs shrink-0">
        <Link
          id="admin-to-storefront-btn"
          to="/"
          onClick={() => setCurrentView('home')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 transition-colors"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Back to Storefront</span>
          </span>
          <span className="text-[10px] text-[#D9A441]">Live</span>
        </Link>

        <button
          id="admin-logout-btn"
          onClick={logoutAdmin}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/20 text-red-300 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4EFEA] text-[#2A2A28] flex overflow-x-hidden">

      {/* Mobile Overlay Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Desktop Sidebar — sticky, always visible on md+ */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-[#26442A] text-white sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar — fixed slide-in drawer */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 bg-[#26442A] text-white flex flex-col transition-transform duration-300 ease-in-out md:hidden ${
          isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Bar */}
        <div className="md:hidden bg-[#2F5233] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-md shrink-0">
          <div className="flex items-center gap-2.5">
            <BrandLogo size="sm" variant="icon" theme="dark-bg" />
            <span className="font-serif-brand font-bold text-base">GoodZeed Operator</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              onClick={() => setCurrentView('home')}
              className="text-xs bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded text-white flex items-center gap-1 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Storefront</span>
            </Link>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 text-white hover:bg-white/10 rounded"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
