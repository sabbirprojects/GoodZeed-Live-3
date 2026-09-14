import React from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { formatCurrency, formatShortDate } from '../../utils/formatters';
import {
  ShoppingBag,
  TrendingUp,
  Boxes,
  Users,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Plus,
  ExternalLink
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { orders, products, customers, reviews, setCurrentView } = useStore();

  const todayIso = new Date().toISOString().slice(0, 10);
  const todaysOrders = orders.filter(o => (o.createdAt || '').slice(0, 10) === todayIso);
  const todaysRevenue = orders
    .filter(o => o.payment?.status === 'PAID' || o.payment?.method === 'COD')
    .reduce((acc, o) => acc + (o.total || 0), 0);

  const pendingOrders = orders.filter(o => o.status === 'PENDING');
  const awaitingPayment = orders.filter(o => o.payment?.status === 'AWAITING_VERIFICATION');

  // Low stock calculation across all variants
  const lowStockVariants: {
    productId: string;
    productName: string;
    variantLabel: string;
    stock: number;
    threshold: number;
  }[] = [];

  products.forEach(p => {
    p.variants.forEach(v => {
      if (v.isEnabled && v.stock <= v.lowStockThreshold) {
        lowStockVariants.push({
          productId: p.id,
          productName: p.name,
          variantLabel: v.label,
          stock: v.stock,
          threshold: v.lowStockThreshold
        });
      }
    });
  });

  return (
    <div className="space-y-6">
      {/* Top Welcome Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-brand font-bold text-2xl sm:text-3xl text-[#2F5233]">
            Store Operations Overview
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Real-time fulfillment, inventory, and payment verification queue.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            id="dashboard-to-storefront-btn"
            to="/"
            onClick={() => setCurrentView('home')}
            className="px-3.5 py-2 bg-white text-[#2F5233] border border-[#2F5233]/20 rounded-xl text-xs font-bold hover:bg-[#FAF7F2] flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Return to Storefront</span>
          </Link>
          <button
            onClick={() => onNavigate('products')}
            className="px-3.5 py-2 bg-[#2F5233] text-white rounded-xl text-xs font-bold hover:bg-[#3D6B45] flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Orders */}
        <button
          onClick={() => onNavigate('orders')}
          className="text-left bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs hover:border-[#2F5233] transition-all group"
        >
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Today's Orders</span>
            <ShoppingBag className="w-4 h-4 text-[#2F5233]" />
          </div>
          <div className="font-serif-brand font-black text-2xl sm:text-3xl text-[#2A2A28]">
            {todaysOrders.length}
          </div>
          <span className="text-[11px] text-neutral-500 mt-1 block">
            {orders.length} lifetime orders
          </span>
        </button>

        {/* Realized Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Realized Revenue</span>
            <TrendingUp className="w-4 h-4 text-[#D9A441]" />
          </div>
          <div className="font-serif-brand font-black text-2xl sm:text-3xl text-[#2F5233]">
            {formatCurrency(todaysRevenue)}
          </div>
          <span className="text-[11px] text-neutral-500 mt-1 block">
            COD & verified transactions
          </span>
        </div>

        {/* Pending Orders Action */}
        <button
          onClick={() => onNavigate('orders')}
          className="text-left bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs hover:border-[#2F5233] transition-all"
        >
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Action Required</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-serif-brand font-black text-2xl sm:text-3xl text-amber-600">
            {pendingOrders.length}
          </div>
          <span className="text-[11px] text-neutral-500 mt-1 block">
            {awaitingPayment.length} awaiting bKash/Nagad
          </span>
        </button>

        {/* Total Customers */}
        <button
          onClick={() => onNavigate('customers')}
          className="text-left bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs hover:border-[#2F5233] transition-all"
        >
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Buyers</span>
            <Users className="w-4 h-4 text-[#2F5233]" />
          </div>
          <div className="font-serif-brand font-black text-2xl sm:text-3xl text-[#2A2A28]">
            {customers.length}
          </div>
          <span className="text-[11px] text-neutral-500 mt-1 block">
            Phone normalized deduplication
          </span>
        </button>
      </div>

      {/* Two Column Layout: Action Queue & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Pending Orders & bKash/Nagad Queue */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="font-serif-brand font-bold text-base text-[#2F5233] flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Pending Orders & Verification Queue</span>
            </h3>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-bold text-[#2F5233] hover:underline"
            >
              View All ({orders.length}) →
            </button>
          </div>

          {pendingOrders.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              <ShieldCheck className="w-8 h-8 text-[#2F5233] mx-auto mb-1.5 opacity-60" />
              All current orders are confirmed or dispatched.
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {pendingOrders.slice(0, 5).map(o => (
                <div key={o.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#2A2A28]">{o.orderNumber}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          o.payment?.method === 'COD'
                            ? 'bg-neutral-100 text-neutral-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {o.payment?.method} ({o.payment?.status})
                      </span>
                    </div>
                    <p className="text-neutral-500 mt-0.5">
                      {o.customerNameSnapshot} • {o.customerPhoneSnapshot}
                    </p>
                    {o.payment?.transactionId && (
                      <span className="text-[10px] font-mono text-neutral-600">
                        TrxID: {o.payment.transactionId}
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-[#2F5233]">{formatCurrency(o.total)}</div>
                    <button
                      onClick={() => onNavigate('orders')}
                      className="text-[11px] font-bold text-[#2F5233] hover:underline mt-1 block"
                    >
                      Process →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Low Stock Alerts */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="font-serif-brand font-bold text-base text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span>Low-Stock Inventory Alerts</span>
            </h3>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs font-bold text-[#2F5233] hover:underline"
            >
              Inventory Manager →
            </button>
          </div>

          {lowStockVariants.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              <Boxes className="w-8 h-8 text-[#2F5233] mx-auto mb-1.5 opacity-60" />
              All variants are above their configured threshold.
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {lowStockVariants.slice(0, 5).map((lv, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-[#2A2A28] truncate max-w-[180px]">
                      {lv.productName}
                    </div>
                    <span className="text-neutral-500 text-[11px]">{lv.variantLabel}</span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        lv.stock === 0
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {lv.stock === 0 ? 'Out of Stock' : `${lv.stock} units left`}
                    </span>
                    <span className="text-[10px] text-neutral-400 block mt-0.5">
                      Threshold: {lv.threshold}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
