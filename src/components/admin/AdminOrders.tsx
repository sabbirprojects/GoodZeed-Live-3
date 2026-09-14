import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { Order, OrderStatus, PaymentStatus } from '../../types';
import { formatCurrency, formatDate, formatShortDate } from '../../utils/formatters';
import {
  Search,
  Filter,
  Eye,
  Printer,
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
  AlertCircle,
  FileText
} from 'lucide-react';
import { InvoiceModal } from './InvoiceModal';

export const AdminOrders: React.FC = () => {
  const {
    orders,
    updateOrderStatus,
    verifyPayment,
    addOrderInternalNote,
    getOrGenerateInvoice,
    showToast
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [newNote, setNewNote] = useState('');

  // Keep selectedOrder in sync with live orders state
  useEffect(() => {
    if (selectedOrder) {
      const updated = orders.find(o => o.id === selectedOrder.id);
      setSelectedOrder(updated || null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  // Filtering — defensive: backend/legacy orders may miss nested fields
  const filteredOrders = orders.filter(o => {
    const orderNum = o.orderNumber || '';
    const custName = o.customerNameSnapshot || '';
    const custPhone = o.customerPhoneSnapshot || '';
    const trxId = o.payment?.transactionId || '';
    const matchesSearch =
      orderNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
      custName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      custPhone.includes(searchTerm) ||
      (trxId && trxId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchesPayment = paymentFilter === 'ALL' || o.payment?.status === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  const handleStatusChange = (orderId: string, nextStatus: OrderStatus) => {
    const result = updateOrderStatus(orderId, nextStatus);
    if (!result.success) {
      showToast(result.error || 'Cannot transition order to this status', 'error');
    } else {
      showToast(`Order status updated to ${nextStatus}`, 'success');
      // selectedOrder auto-refreshes via the orders useEffect above
    }
  };

  const handleVerify = (orderId: string) => {
    verifyPayment(orderId, true, 'Verified by admin against merchant statement');
    // selectedOrder auto-refreshes via the orders useEffect above
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !newNote.trim()) return;
    addOrderInternalNote(selectedOrder.id, newNote.trim());
    setNewNote('');
    // selectedOrder auto-refreshes via the orders useEffect above
  };

  const statuses: OrderStatus[] = [
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED'
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-brand font-bold text-2xl sm:text-3xl text-[#2F5233]">
            Orders & Payment Management
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Verify manual bKash/Nagad transactions, progress deliveries, and print tax invoices.
          </p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by Order ID, Customer Name, Phone, or TrxID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full text-xs sm:text-sm pl-9 pr-4 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#2F5233]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-neutral-300 bg-white focus:outline-none"
            >
              <option value="ALL">All Payments</option>
              <option value="PENDING">Payment: Pending</option>
              <option value="AWAITING_VERIFICATION">Awaiting Verification (bKash/Nagad)</option>
              <option value="PAID">Payment: Paid</option>
            </select>
          </div>
        </div>

        {/* Status Pill Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-[#2F5233] text-white'
                : 'bg-[#FAF7F2] text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            All ({orders.length})
          </button>
          {statuses.map(st => {
            const count = orders.filter(o => o.status === st).length;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-[#2F5233] text-white'
                    : 'bg-[#FAF7F2] text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FAF7F2] text-neutral-500 uppercase tracking-wider text-[10px] border-b border-neutral-200">
              <tr>
                <th className="py-3.5 px-4">Order ID & Date</th>
                <th className="py-3.5 px-4">Customer & Phone</th>
                <th className="py-3.5 px-4">Destination</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Total (BDT)</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-400">
                    No orders matching selected criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(o => (
                  <tr key={o.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-sm text-[#2F5233]">
                        {o.orderNumber}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        {formatShortDate(o.createdAt)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#2A2A28]">{o.customerNameSnapshot}</div>
                      <div className="text-neutral-500 font-mono text-[11px]">
                        {o.customerPhoneSnapshot}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-neutral-700">{o.delivery?.zoneNameSnapshot || o.deliveryDistrict || '—'}</div>
                      <div className="text-neutral-500 truncate text-[11px]">
                        {o.deliveryAddressSnapshot}
                      </div>
                      {o.deliveryNotes && (
                        <div
                          className="mt-1 flex items-center gap-1 text-[10px] text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded max-w-full truncate font-medium"
                          title={o.deliveryNotes}
                        >
                          <FileText className="w-2.5 h-2.5 shrink-0 text-amber-600" />
                          <span className="truncate">Note: {o.deliveryNotes}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#2A2A28]">{o.payment?.method || '—'}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            o.payment?.status === 'PAID'
                              ? 'bg-[#2F5233]/10 text-[#2F5233]'
                              : o.payment?.status === 'AWAITING_VERIFICATION'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {o.payment?.status || '—'}
                        </span>
                      </div>
                      {o.payment?.transactionId && (
                        <div className="text-[10px] font-mono text-neutral-600 mt-0.5">
                          TrxID: <strong>{o.payment.transactionId}</strong>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          o.status === 'DELIVERED'
                            ? 'bg-[#2F5233] text-white'
                            : o.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-700'
                            : o.status === 'SHIPPED' || o.status === 'OUT_FOR_DELIVERY'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-serif-brand font-black text-sm text-[#2F5233]">
                      {formatCurrency(o.total)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Quick Verify button for awaiting verification */}
                        {o.payment?.status === 'AWAITING_VERIFICATION' && (
                          <button
                            onClick={() => handleVerify(o.id)}
                            title="Verify Payment"
                            className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* View details */}
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="p-1.5 bg-[#FAF7F2] hover:bg-neutral-200 text-[#2F5233] rounded-lg transition-colors"
                          title="View Order Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Print Invoice */}
                        <button
                          onClick={() => {
                            const fresh = getOrGenerateInvoice(o.id);
                            setInvoiceOrder(fresh || o);
                          }}
                          className="p-1.5 bg-[#FAF7F2] hover:bg-neutral-200 text-[#2A2A28] rounded-lg transition-colors"
                          title="Generate / Print Invoice"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Order Full Drawer / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-200 p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-xs text-neutral-400">Order Management</span>
                <h3 className="font-mono font-bold text-xl text-[#2F5233]">
                  {selectedOrder.orderNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-bold"
              >
                Close ✕
              </button>
            </div>

            {/* Status Transition Control */}
            <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-neutral-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#2A2A28]">Update Order Status:</span>
                <span className="text-xs font-bold text-[#2F5233]">
                  Current: {selectedOrder.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {statuses.map(st => (
                  <button
                    key={st}
                    disabled={selectedOrder.status === st}
                    onClick={() => handleStatusChange(selectedOrder.id, st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedOrder.status === st
                        ? 'bg-[#2F5233] text-white shadow-xs'
                        : 'bg-white text-neutral-700 border hover:bg-neutral-100 disabled:opacity-40'
                    }`}
                  >
                    → {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Section */}
            <div className="p-4 bg-white rounded-2xl border border-neutral-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-neutral-500">Payment Information</div>
                <div className="font-bold text-sm text-[#2A2A28] mt-0.5">
                  Method: {selectedOrder.payment?.method || '—'} • Status: {selectedOrder.payment?.status || '—'}
                </div>
                {selectedOrder.payment?.transactionId && (
                  <div className="font-mono text-xs text-[#2F5233] mt-0.5">
                    TrxID: <strong>{selectedOrder.payment.transactionId}</strong>
                  </div>
                )}
              </div>

              {selectedOrder.payment?.status === 'AWAITING_VERIFICATION' && (
                <button
                  onClick={() => handleVerify(selectedOrder.id)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold"
                >
                  Confirm bKash/Nagad Received
                </button>
              )}
            </div>

            {/* Delivery & Customer Order Note Section */}
            <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-neutral-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-neutral-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#2F5233]" />
                  <span>Delivery &amp; Customer Instructions</span>
                </div>
                <span className="text-xs font-bold text-[#2F5233]">
                  Zone: {selectedOrder.delivery?.zoneNameSnapshot || selectedOrder.deliveryDistrict || '—'} (৳{selectedOrder.deliveryCharge})
                </span>
              </div>
              <div className="text-xs text-[#2A2A28]">
                <span className="font-bold text-neutral-700">Recipient Address:</span>{' '}
                {selectedOrder.deliveryAddressSnapshot}, {selectedOrder.deliveryDistrict}
              </div>
              <div className="mt-2 pt-2 border-t border-neutral-200">
                <span className="text-[11px] font-bold text-neutral-600 uppercase tracking-wide block mb-1">
                  Customer Checkout Note:
                </span>
                {selectedOrder.deliveryNotes ? (
                  <div className="text-xs p-2.5 bg-amber-50 border border-amber-200 text-amber-950 rounded-xl font-medium flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>{selectedOrder.deliveryNotes}</span>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 italic">No special instructions provided by customer.</p>
                )}
              </div>
            </div>

            {/* Ordered Items */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-500 mb-2">
                Order Items ({selectedOrder.items?.length || 0})
              </h4>
              <div className="divide-y divide-neutral-100 border rounded-xl p-3 bg-[#FAF7F2]/30 text-xs">
                {(selectedOrder.items || []).map(it => (
                  <div key={it.id} className="py-2 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <img
                        src={it.productImageSnapshot}
                        alt=""
                        className="w-10 h-10 rounded object-cover border"
                      />
                      <div>
                        <div className="font-bold">{it.productNameSnapshot}</div>
                        <div className="text-neutral-500">
                          {it.variantLabelSnapshot} × {it.quantity} @ {formatCurrency(it.unitPriceSnapshot)}
                        </div>
                      </div>
                    </div>
                    <span className="font-bold">{formatCurrency(it.lineSubtotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Internal Audit Notes & History */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-500">
                Internal Audit Notes
              </h4>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {(selectedOrder.internalNotes || []).length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">No notes logged.</p>
                ) : (
                  (selectedOrder.internalNotes || []).map((nt, i) => (
                    <div key={i} className="text-xs bg-[#FAF7F2] p-2.5 rounded-lg border">
                      <div className="flex justify-between text-[10px] text-neutral-400">
                        <span>{nt.createdBy}</span>
                        <span>{formatDate(nt.createdAt)}</span>
                      </div>
                      <p className="text-[#2A2A28] mt-1">{nt.note}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add internal note (e.g. Courier tracking code or customer call notes)..."
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2F5233]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2F5233] text-white text-xs font-bold rounded-xl hover:bg-[#3D6B45]"
                >
                  Add Note
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceOrder && (
        <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
      )}
    </div>
  );
};
