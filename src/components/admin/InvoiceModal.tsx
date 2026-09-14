import React from 'react';
import { Order } from '../../types';
import { useStore } from '../../context/StoreContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { X, Printer, Download, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

interface InvoiceModalProps {
  order: Order;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, onClose }) => {
  const { settings, incrementInvoiceReprint } = useStore();

  const handlePrint = () => {
    incrementInvoiceReprint(order.id);
    window.print();
  };

  const invoiceNumber = order.invoice?.invoiceNumber || 'GZ-INV-DRAFT';
  const issuedDate = order.invoice?.issuedAt
    ? formatDate(order.invoice.issuedAt)
    : formatDate(order.createdAt);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white">
      <div className="relative bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-neutral-200 print:shadow-none print:border-none print:max-h-none print:w-full">
        {/* Modal Controls Header (Hidden during Print) */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-[#FAF7F2] print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-serif-brand font-bold text-base text-[#2F5233]">
              Official Tax Invoice
            </span>
            <span className="font-mono text-xs bg-[#2F5233]/10 text-[#2F5233] px-2 py-0.5 rounded font-bold">
              {invoiceNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="invoice-print-action-btn"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-[#2F5233] text-white rounded-xl text-xs font-bold hover:bg-[#3D6B45] flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div id="printable-invoice" className="p-6 sm:p-10 space-y-6 text-[#2A2A28] bg-white">
          {/* Brand & Invoice Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b-2 border-[#2F5233]">
            <div>
              <div className="mb-2">
                <BrandLogo size="md" theme="light-bg" showSubtitle={false} />
              </div>
              <p className="text-xs text-neutral-600 max-w-xs">{settings.storeAddress}</p>
              <p className="text-xs text-neutral-600">
                Phone: {settings.storeContactPhone} • Email: {settings.storeContactEmail}
              </p>
            </div>

            <div className="sm:text-right space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-[#D9A441] block">
                CUSTOMER INVOICE
              </span>
              <div className="font-mono font-bold text-lg text-[#2F5233]">{invoiceNumber}</div>
              <div className="text-xs text-neutral-500">Order ID: {order.orderNumber}</div>
              <div className="text-xs text-neutral-500">Issued: {issuedDate}</div>
            </div>
          </div>

          {/* Bill To & Delivery Summary */}
          <div className="grid grid-cols-2 gap-6 text-xs">
            <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-neutral-200">
              <span className="font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                Billed / Shipped To:
              </span>
              <div className="font-bold text-sm text-[#2A2A28]">{order.customerNameSnapshot}</div>
              <div className="text-neutral-600 font-mono mt-0.5">{order.customerPhoneSnapshot}</div>
              <div className="text-neutral-600 mt-1 leading-relaxed">
                {order.deliveryAddressSnapshot}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-neutral-200 space-y-1.5">
              <span className="font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                Payment & Fulfillment:
              </span>
              <div>
                <span className="text-neutral-500">Payment Method:</span>{' '}
                <strong className="text-[#2A2A28]">{order.payment.method}</strong>
              </div>
              <div>
                <span className="text-neutral-500">Payment Status:</span>{' '}
                <strong className="text-[#2F5233]">{order.payment.status}</strong>
                {order.payment.transactionId && (
                  <span className="block text-neutral-500 font-mono text-[10px]">
                    TrxID: {order.payment.transactionId}
                  </span>
                )}
              </div>
              <div>
                <span className="text-neutral-500">Delivery Zone:</span>{' '}
                <strong className="text-[#2A2A28]">{order.delivery.zoneNameSnapshot}</strong>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-y border-neutral-200 text-neutral-500 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-2">Item Description</th>
                  <th className="py-2.5 px-2 text-center">Size</th>
                  <th className="py-2.5 px-2 text-center">Unit Price</th>
                  <th className="py-2.5 px-2 text-center">Qty</th>
                  <th className="py-2.5 px-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {order.items.map((it, i) => (
                  <tr key={it.id}>
                    <td className="py-3 px-2 font-medium text-[#2A2A28]">
                      {it.productNameSnapshot}
                    </td>
                    <td className="py-3 px-2 text-center text-neutral-600">
                      {it.variantLabelSnapshot}
                    </td>
                    <td className="py-3 px-2 text-center text-neutral-600">
                      {formatCurrency(it.unitPriceSnapshot)}
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-[#2A2A28]">
                      {it.quantity}
                    </td>
                    <td className="py-3 px-2 text-right font-bold text-[#2F5233]">
                      {formatCurrency(it.lineSubtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Totals */}
          <div className="border-t border-neutral-200 pt-4 flex justify-end">
            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Items Subtotal:</span>
                <span className="font-semibold">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Delivery Charge:</span>
                <span className="font-semibold">{formatCurrency(order.deliveryCharge)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-[#2F5233] border-t border-neutral-300 pt-2">
                <span>Grand Total:</span>
                <span className="font-serif-brand font-black text-lg">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="border-t border-neutral-200 pt-6 text-[11px] text-neutral-500 text-center space-y-1">
            <p className="font-medium text-[#2F5233]">
              Thank you for choosing GoodZeed! 100% Pure, Natural Everyday Food.
            </p>
            <p>
              For any concerns or queries regarding your package, contact our care desk at{' '}
              {settings.storeContactPhone}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
