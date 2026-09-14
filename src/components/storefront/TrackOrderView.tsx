import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { Order, OrderStatus } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Search,
  Truck,
  CheckCircle2,
  Clock,
  Package,
  MapPin,
  Printer,
  ShieldCheck,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { InvoiceModal } from '../admin/InvoiceModal';

export const TrackOrderView: React.FC = () => {
  const { trackOrder, getOrGenerateInvoice, setCurrentView, activeConfirmedOrder, showToast } = useStore();

  const [phone, setPhone] = useState(activeConfirmedOrder?.customerPhoneSnapshot || '');
  const [orderNumber, setOrderNumber] = useState(activeConfirmedOrder?.orderNumber || '');
  const [searched, setSearched] = useState(!!activeConfirmedOrder);
  const [matchedOrder, setMatchedOrder] = useState<Order | null>(activeConfirmedOrder || null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  useEffect(() => {
    if (activeConfirmedOrder) {
      setPhone(activeConfirmedOrder.customerPhoneSnapshot);
      setOrderNumber(activeConfirmedOrder.orderNumber);
      setMatchedOrder(activeConfirmedOrder);
      setSearched(true);
    }
  }, [activeConfirmedOrder]);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone.trim() && !orderNumber.trim()) {
      showToast('Please enter either your Phone Number or Order ID', 'error');
      return;
    }

    setSearched(true);
    const result = trackOrder(phone.trim(), orderNumber.trim());
    setMatchedOrder(result);
    if (!result) {
      showToast('No matching order found. Please check your phone or order ID.', 'error');
    }
  };

  const steps: { key: OrderStatus; label: string; desc: string }[] = [
    { key: 'PENDING', label: 'Order Received', desc: 'We received your order request' },
    { key: 'CONFIRMED', label: 'Confirmed', desc: 'Order & payment verified' },
    { key: 'PROCESSING', label: 'Packaging', desc: 'Fresh jar sealed & destoned' },
    { key: 'SHIPPED', label: 'Dispatched', desc: 'Handed over to delivery rider' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Rider is arriving at your door' },
    { key: 'DELIVERED', label: 'Delivered', desc: 'Successfully received' }
  ];

  const getStepIndex = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
        return 0;
      case 'CONFIRMED':
        return 1;
      case 'PROCESSING':
        return 2;
      case 'SHIPPED':
        return 3;
      case 'OUT_FOR_DELIVERY':
        return 4;
      case 'DELIVERED':
        return 5;
      default:
        return 0;
    }
  };

  const currentStep = matchedOrder ? getStepIndex(matchedOrder.status) : 0;

  return (
    <div className="bg-[#FAF7F2] min-h-screen py-8 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2F5233]/10 text-[#2F5233] text-xs font-bold">
            <Truck className="w-3.5 h-3.5 text-[#D9A441]" />
            <span>Live Order Tracking</span>
          </div>
          <h1 className="font-serif-brand text-2xl sm:text-4xl font-extrabold text-[#2F5233]">
            Track Your Package
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 max-w-md mx-auto">
            Enter your mobile number or Order ID (e.g. GZ-2026-1041) to view real-time delivery status.
          </p>
        </div>

        {/* Tracking Search Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-8 border border-[#2F5233]/15 shadow-md">
          <form onSubmit={handleTrackSubmit} noValidate className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <label className="block text-xs font-bold text-[#2A2A28] mb-1">
                Phone Number
              </label>
              <input
                id="track-phone-input"
                type="tel"
                placeholder="017XXXXXXXX"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#2F5233]"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-bold text-[#2A2A28] mb-1">
                Order ID
              </label>
              <input
                id="track-order-id-input"
                type="text"
                placeholder="e.g. GZ-2026-1041"
                value={orderNumber}
                onChange={e => setOrderNumber(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#2F5233] uppercase font-mono"
              />
            </div>

            <div className="sm:col-span-2 flex items-end">
              <button
                id="track-search-submit-btn"
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-[#2F5233] hover:bg-[#3D6B45] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs transition-colors"
              >
                <Search className="w-4 h-4" />
                <span>Track</span>
              </button>
            </div>
          </form>

          {/* Quick Demo Test Buttons */}
          <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <span className="font-semibold text-[11px]">Quick test orders:</span>
            <button
              type="button"
              onClick={() => {
                setPhone('01712345678');
                setOrderNumber('GZ-2026-1041');
                setSearched(true);
                const res = trackOrder('01712345678', 'GZ-2026-1041');
                setMatchedOrder(res);
              }}
              className="px-2.5 py-1 rounded-lg bg-[#FAF7F2] hover:bg-[#2F5233]/10 text-[#2F5233] font-bold transition-colors border border-[#2F5233]/20 text-[11px]"
            >
              #GZ-2026-1041 (Shipped)
            </button>
            <button
              type="button"
              onClick={() => {
                setPhone('01819876543');
                setOrderNumber('GZ-2026-1042');
                setSearched(true);
                const res = trackOrder('01819876543', 'GZ-2026-1042');
                setMatchedOrder(res);
              }}
              className="px-2.5 py-1 rounded-lg bg-[#FAF7F2] hover:bg-[#2F5233]/10 text-[#2F5233] font-bold transition-colors border border-[#2F5233]/20 text-[11px]"
            >
              #GZ-2026-1042 (bKash Verify)
            </button>
          </div>
        </div>

        {/* Search Results */}
        {searched && (
          <div>
            {!matchedOrder ? (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-red-200 text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
                <h3 className="font-serif-brand font-bold text-lg text-red-900">
                  Order Not Found
                </h3>
                <p className="text-xs text-neutral-600 max-w-sm mx-auto">
                  We could not find an active order matching the provided details. Please check your phone or order ID, or contact our support team.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-5 sm:p-8 border border-[#2F5233]/15 shadow-xl space-y-6 sm:space-y-8">
                {/* Result Top Info */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
                  <div>
                    <span className="text-[11px] font-bold text-neutral-400 block uppercase tracking-wider">
                      Order Details
                    </span>
                    <div className="flex items-center gap-2">
                      <h2 className="font-mono font-bold text-xl text-[#2F5233]">
                        {matchedOrder.orderNumber}
                      </h2>
                      <span className="bg-[#2F5233]/10 text-[#2F5233] text-xs font-bold px-2 py-0.5 rounded-full">
                        {matchedOrder.status}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Placed on {formatDate(matchedOrder.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        getOrGenerateInvoice(matchedOrder.id);
                        setShowInvoiceModal(true);
                      }}
                      className="px-3.5 py-2 bg-[#FAF7F2] hover:bg-neutral-200 text-[#2F5233] border border-[#2F5233]/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>View Invoice</span>
                    </button>
                  </div>
                </div>

                {/* Visual Progress Stepper */}
                <div className="space-y-4">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-500">
                    Delivery Progress
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    {steps.map((st, idx) => {
                      const isCompleted = idx <= currentStep;
                      const isCurrent = idx === currentStep;

                      return (
                        <div
                          key={st.key}
                          className={`p-3 rounded-2xl border text-center transition-all ${
                            isCurrent
                              ? 'bg-[#2F5233] text-white border-[#2F5233] shadow-md ring-2 ring-[#D9A441]'
                              : isCompleted
                              ? 'bg-[#2F5233]/10 border-[#2F5233]/20 text-[#2F5233]'
                              : 'bg-neutral-50 border-neutral-100 text-neutral-400'
                          }`}
                        >
                          <div className="flex justify-center mb-1">
                            {isCompleted ? (
                              <CheckCircle2
                                className={`w-5 h-5 ${isCurrent ? 'text-[#D9A441]' : 'text-[#2F5233]'}`}
                              />
                            ) : (
                              <Clock className="w-5 h-5 opacity-40" />
                            )}
                          </div>
                          <span className="font-bold text-xs block leading-tight">{st.label}</span>
                          <span
                            className={`text-[10px] block mt-1 leading-tight ${
                              isCurrent ? 'text-neutral-200' : 'opacity-75'
                            }`}
                          >
                            {st.desc}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Customer Snapshot & Items */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-100 text-xs">
                  <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-neutral-100 space-y-1.5">
                    <span className="font-bold text-[11px] uppercase tracking-wider text-neutral-400 block">
                      Delivery Destination
                    </span>
                    <p className="font-bold text-[#2A2A28]">{matchedOrder.customerNameSnapshot}</p>
                    <p className="text-neutral-600">{matchedOrder.customerPhoneSnapshot}</p>
                    <p className="text-neutral-600">{matchedOrder.deliveryAddressSnapshot}</p>
                    <span className="inline-block mt-1 font-bold text-[#2F5233]">
                      Zone: {matchedOrder.deliveryDistrict} ({matchedOrder.delivery.estimatedDelivery})
                    </span>
                  </div>

                  <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-neutral-100 space-y-1.5">
                    <span className="font-bold text-[11px] uppercase tracking-wider text-neutral-400 block">
                      Payment & Total
                    </span>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-600">Payment Method:</span>
                      <strong className="text-[#2A2A28]">{matchedOrder.payment.method}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-600">Payment Status:</span>
                      <strong className="text-[#2F5233]">{matchedOrder.payment.status}</strong>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-neutral-200">
                      <span className="text-neutral-600">Total Payable:</span>
                      <strong className="font-bold text-sm text-[#2F5233]">
                        {formatCurrency(matchedOrder.total)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Ordered Items List */}
                <div className="space-y-2 pt-2 border-t border-neutral-100">
                  <span className="font-bold text-xs uppercase tracking-wider text-neutral-400 block">
                    Items in Package ({matchedOrder.items.length})
                  </span>
                  <div className="divide-y divide-neutral-100">
                    {matchedOrder.items.map(it => (
                      <div key={it.id} className="py-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={it.productImageSnapshot}
                            alt={it.productNameSnapshot}
                            className="w-10 h-10 rounded-lg object-cover bg-neutral-100 border border-neutral-200"
                          />
                          <div>
                            <span className="font-bold text-[#2A2A28] block">
                              {it.productNameSnapshot}
                            </span>
                            <span className="text-[11px] text-neutral-500">
                              {it.variantLabelSnapshot} × {it.quantity}
                            </span>
                          </div>
                        </div>
                        <span className="font-bold text-[#2F5233]">
                          {formatCurrency(it.lineSubtotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && matchedOrder && (
        <InvoiceModal order={matchedOrder} onClose={() => setShowInvoiceModal(false)} />
      )}
    </div>
  );
};
