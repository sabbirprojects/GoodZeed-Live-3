import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CheckCircle2, Clock, Printer, Truck, ArrowRight, ShieldCheck, Phone } from 'lucide-react';
import { InvoiceModal } from '../admin/InvoiceModal';

export const OrderConfirmationView: React.FC = () => {
  const { activeConfirmedOrder, setCurrentView, getOrGenerateInvoice, settings } = useStore();
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  if (!activeConfirmedOrder) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <h2 className="font-serif-brand text-2xl font-bold text-[#2F5233]">
          No active order found
        </h2>
        <p className="text-xs text-neutral-500">
          You have not placed an order in this session. Track an existing order using your phone number.
        </p>
        <button
          onClick={() => setCurrentView('track-order')}
          className="px-5 py-2.5 bg-[#2F5233] text-white text-xs font-bold rounded-xl"
        >
          Track My Order
        </button>
      </div>
    );
  }

  const order = activeConfirmedOrder;
  const isAwaitingVerification = order.payment.status === 'AWAITING_VERIFICATION';

  const handleOpenInvoice = () => {
    getOrGenerateInvoice(order.id);
    setShowInvoiceModal(true);
  };

  return (
    <div className="bg-[#FAF7F2] min-h-screen py-10 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 print:hidden">
        {/* Success Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#2F5233]/15 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#2F5233]/10 text-[#2F5233] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-[#2F5233]" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#D9A441]">
              Thank You for Trusting Pure Food!
            </span>
            <h1 className="font-serif-brand text-2xl sm:text-3xl font-extrabold text-[#2F5233] mt-1">
              Your Order is Confirmed
            </h1>
          </div>

          {/* Order ID Pill */}
          <div className="inline-block bg-[#FAF7F2] border border-[#2F5233]/20 rounded-2xl px-6 py-3">
            <span className="text-xs text-neutral-500 block">Your Order ID:</span>
            <span className="font-mono font-black text-2xl text-[#2F5233]">
              {order.orderNumber}
            </span>
          </div>

          {/* Payment Status Explanatory Alert */}
          {isAwaitingVerification ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left flex items-start gap-3 text-xs text-amber-900">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block text-amber-800">
                  bKash / Nagad Payment Verification in Progress
                </strong>
                <span>
                  We have received your Transaction ID ({order.payment.transactionId || 'Recorded'}).
                  Our admin will verify it with our merchant statement shortly and dispatch your package.
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-[#2F5233]/5 border border-[#2F5233]/15 rounded-2xl p-4 text-left flex items-start gap-3 text-xs text-[#2F5233]">
              <CheckCircle2 className="w-5 h-5 text-[#2F5233] shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block">Cash on Delivery (COD) Selected</strong>
                <span className="text-neutral-600">
                  Please prepare <strong className="text-[#2F5233]">{formatCurrency(order.total)}</strong> in cash.
                  You can inspect the sealed package before handing payment to the rider.
                </span>
              </div>
            </div>
          )}

          {/* Order Items Table */}
          <div className="border border-neutral-100 rounded-2xl p-4 bg-[#FAF7F2]/40 text-left space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-500 pb-2 border-b border-neutral-200">
              Order Details
            </h3>

            <div className="space-y-2 text-xs">
              {order.items.map(it => (
                <div key={it.id} className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-2">
                    <img
                      src={it.productImageSnapshot}
                      alt={it.productNameSnapshot}
                      className="w-10 h-10 rounded-lg object-cover border"
                    />
                    <div>
                      <div className="font-bold text-[#2A2A28]">{it.productNameSnapshot}</div>
                      <div className="text-[11px] text-neutral-500">
                        {it.variantLabelSnapshot} × {it.quantity}
                      </div>
                    </div>
                  </div>
                  <span className="font-bold text-[#2F5233]">
                    {formatCurrency(it.lineSubtotal)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-200 pt-3 space-y-1.5 text-xs text-neutral-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery ({order.delivery.zoneNameSnapshot}):</span>
                <span>{formatCurrency(order.deliveryCharge)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-[#2F5233] pt-1 border-t">
                <span>Total Amount:</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Customer & Delivery Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left text-xs bg-[#FAF7F2] p-4 rounded-2xl border border-neutral-200">
            <div>
              <strong className="text-neutral-500 block mb-1">Delivering To:</strong>
              <p className="font-bold text-[#2A2A28]">{order.customerNameSnapshot}</p>
              <p className="text-neutral-600">{order.customerPhoneSnapshot}</p>
              <p className="text-neutral-600 mt-1">{order.deliveryAddressSnapshot}</p>
            </div>
            <div>
              <strong className="text-neutral-500 block mb-1">Delivery Estimate:</strong>
              <p className="font-bold text-[#2F5233]">{order.delivery.estimatedDelivery || '24-48 Hours'}</p>
              <p className="text-neutral-500 mt-1">Payment Method: {order.payment.method}</p>
              <p className="text-neutral-500">Placed: {formatDate(order.createdAt)}</p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              id="confirmation-print-invoice-btn"
              onClick={handleOpenInvoice}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white border border-[#2F5233]/25 text-[#2F5233] hover:bg-[#FAF7F2] font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Invoice</span>
            </button>

            <button
              id="confirmation-track-order-btn"
              onClick={() => setCurrentView('track-order')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#2F5233] hover:bg-[#3D6B45] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              <Truck className="w-4 h-4 text-[#D9A441]" />
              <span>Track Order Live</span>
            </button>

            <button
              id="confirmation-continue-shopping-btn"
              onClick={() => setCurrentView('shop')}
              className="w-full sm:w-auto px-5 py-3 text-neutral-600 hover:text-neutral-900 text-xs font-bold transition-colors"
            >
              Continue Shopping →
            </button>
          </div>
        </div>

        {/* Customer Help Note */}
        <div className="text-center text-xs text-neutral-500 flex items-center justify-center gap-2">
          <Phone className="w-3.5 h-3.5 text-[#2F5233]" />
          <span>Need help or want to change your delivery address? Call our care line: </span>
          <a href={`tel:${settings.storeContactPhone}`} className="font-bold text-[#2F5233] hover:underline">
            {settings.storeContactPhone}
          </a>
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <InvoiceModal
          order={order}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}
    </div>
  );
};
