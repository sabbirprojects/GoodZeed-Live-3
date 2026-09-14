import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { formatCurrency, formatDate, normalizePhoneNumber } from '../../utils/formatters';
import { Search, Eye, MapPin, Phone, Mail, User } from 'lucide-react';

export const AdminCustomers: React.FC = () => {
  const { customers, orders, updateCustomerAdminNote } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const selectedCustomer = selectedCustomerId
    ? customers.find(c => c.id === selectedCustomerId) ?? null
    : null;

  useEffect(() => {
    setNoteDraft(selectedCustomer?.adminNote ?? '');
  }, [selectedCustomer?.id, selectedCustomer?.adminNote]);

  const filteredCustomers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return customers;
    const normQ = normalizePhoneNumber(searchTerm);
    return customers.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.phoneNormalized.includes(normQ || q) ||
        c.phoneRaw.includes(searchTerm) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [customers, searchTerm]);

  // Phone number is the primary identifier: all orders (including guest
  // orders) with the same normalized phone belong to the same history.
  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    const normPhone = normalizePhoneNumber(selectedCustomer.phoneNormalized);
    return orders
      .filter(
        o =>
          o.customerId === selectedCustomer.id ||
          normalizePhoneNumber(o.customerPhoneSnapshot || '') === normPhone
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, selectedCustomer]);

  const totalOrders = customerOrders.length;
  const totalSpent = customerOrders.reduce((acc, o) => acc + (o.total || 0), 0);
  const completedOrders = customerOrders.filter(o => o.status === 'DELIVERED').length;
  const cancelledOrders = customerOrders.filter(o => o.status === 'CANCELLED').length;

  // Current address: latest profile address, falling back to the most
  // recent order's delivery snapshot.
  const currentAddress =
    selectedCustomer?.defaultAddress ||
    customerOrders[0]?.deliveryAddressSnapshot ||
    '—';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-brand font-bold text-2xl sm:text-3xl text-[#2F5233]">
            Customer Management
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Deduplicated customer profiles based on 11-digit Bangladeshi mobile numbers.
            Phone number is the primary identifier — guest orders sharing a phone are grouped together.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
        <input
          type="text"
          placeholder="Search by customer name, phone number, or email..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full text-xs sm:text-sm pl-9 pr-4 py-2 rounded-xl border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2F5233]"
        />
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FAF7F2] text-neutral-500 uppercase tracking-wider text-[10px] border-b border-neutral-200">
              <tr>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Phone Number</th>
                <th className="py-3.5 px-4">Primary Address</th>
                <th className="py-3.5 px-4 text-center">Orders Placed</th>
                <th className="py-3.5 px-4 text-right">Lifetime Spend</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    No customers found.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(c => (
                  <tr key={c.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-sm text-[#2A2A28]">{c.name}</div>
                      {c.email && <div className="text-[11px] text-neutral-400">{c.email}</div>}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-[#2F5233]">
                      {c.phoneNormalized}
                    </td>

                    <td className="py-3.5 px-4 text-neutral-600 max-w-xs truncate">
                      {c.defaultAddress || 'Dhaka, Bangladesh'}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-[#2A2A28] bg-neutral-100 px-2 py-0.5 rounded-full">
                        {c.totalOrders}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-serif-brand font-black text-sm text-[#2F5233]">
                      {formatCurrency(c.totalSpend)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedCustomerId(c.id)}
                        className="p-1.5 bg-[#FAF7F2] hover:bg-neutral-200 text-[#2F5233] rounded-lg transition-colors inline-flex items-center gap-1 font-bold text-[11px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>History</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer History Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-serif-brand font-bold text-lg text-[#2F5233]">
                  Customer History
                </h3>
                <div className="text-[11px] text-neutral-400">
                  Grouped by phone number — includes guest orders from the same phone.
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="text-neutral-400 hover:text-neutral-700 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Profile: name, phone, email, current address */}
            <div className="bg-[#FAF7F2] p-4 rounded-xl border text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-[#2A2A28]">
                <User className="w-3.5 h-3.5 text-[#2F5233]" />
                {selectedCustomer.name}
              </div>
              <div className="flex items-center gap-2 text-neutral-600">
                <Phone className="w-3.5 h-3.5 text-neutral-400" />
                <span className="font-mono font-bold text-[#2F5233]">
                  {selectedCustomer.phoneNormalized}
                </span>
              </div>
              <div className="flex items-center gap-2 text-neutral-600">
                <Mail className="w-3.5 h-3.5 text-neutral-400" />
                {selectedCustomer.email || '—'}
              </div>
              <div className="flex items-start gap-2 text-neutral-600">
                <MapPin className="w-3.5 h-3.5 text-neutral-400 mt-0.5" />
                <span>
                  <span className="text-neutral-400 block text-[11px]">Current address</span>
                  {currentAddress}
                </span>
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border text-center">
                <span className="text-neutral-400 block">Total Orders</span>
                <span className="font-bold text-base text-[#2A2A28]">{totalOrders}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border text-center">
                <span className="text-neutral-400 block">Total Spent</span>
                <span className="font-serif-brand font-bold text-base text-[#2F5233]">
                  {formatCurrency(totalSpent)}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border text-center">
                <span className="text-neutral-400 block">Completed</span>
                <span className="font-bold text-base text-green-700">{completedOrders}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border text-center">
                <span className="text-neutral-400 block">Cancelled</span>
                <span className="font-bold text-base text-red-600">{cancelledOrders}</span>
              </div>
            </div>

            {/* Full order history — cancelled/returned orders stay visible */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-500 mb-2">
                Previous Orders ({customerOrders.length})
              </h4>
              <div className="space-y-2">
                {customerOrders.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">No past orders found.</p>
                ) : (
                  customerOrders.map(o => (
                    <div
                      key={o.id}
                      className="p-3 bg-white rounded-xl border border-neutral-200 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-mono font-bold text-[#2F5233]">{o.orderNumber}</div>
                        <div className="text-neutral-500 text-[11px]">{formatDate(o.createdAt)}</div>
                      </div>
                      <div className="text-neutral-600">
                        {(o.items || [])
                          .map(
                            it =>
                              `${it.productNameSnapshot}${
                                it.variantLabelSnapshot ? ` (${it.variantLabelSnapshot})` : ''
                              } × ${it.quantity}`
                          )
                          .join(', ') || '—'}
                      </div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="font-bold text-sm text-[#2A2A28]">
                          {formatCurrency(o.total)}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                            {o.payment?.method} • {o.payment?.status}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                            {o.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Private admin note */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-500 mb-2">
                Private Admin Note
              </h4>
              <textarea
                value={noteDraft}
                onChange={e => setNoteDraft(e.target.value)}
                placeholder="Internal note about this customer (delivery preference, issues, etc.). Only visible to admins."
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2F5233]"
              />
              <button
                onClick={() => updateCustomerAdminNote(selectedCustomer.id, noteDraft.trim())}
                className="mt-2 px-4 py-2 rounded-xl bg-[#2F5233] text-white text-xs font-bold hover:bg-[#244026] transition-colors"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
