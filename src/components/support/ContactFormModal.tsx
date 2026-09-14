import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { X, Send, CheckCircle2, Loader2 } from 'lucide-react';

interface ContactFormModalProps {
  onClose: () => void;
  prefillOrderNumber?: string;
}

const SUBJECTS = [
  'Product Inquiry',
  'Order Issue',
  'Delivery Problem',
  'Return / Refund Request',
  'Payment Issue',
  'General Question',
  'Other'
];

export const ContactFormModal: React.FC<ContactFormModalProps> = ({ onClose, prefillOrderNumber }) => {
  const { submitSupportTicket } = useStore();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    orderNumber: prefillOrderNumber || '',
    subject: SUBJECTS[0],
    message: ''
  });

  const handleChange = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim() || !form.customerPhone.trim() || !form.message.trim()) return;
    setIsSubmitting(true);
    try {
      submitSupportTicket({
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        customerEmail: form.customerEmail.trim() || undefined,
        orderNumber: form.orderNumber.trim() || undefined,
        subject: form.subject,
        message: form.message.trim()
      });
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full sm:max-w-lg bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 shrink-0">
          <div>
            <h2 className="font-serif-brand font-bold text-lg text-[#2F5233]">Contact Support</h2>
            <p className="text-xs text-neutral-500">We'll get back to you as soon as possible</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-neutral-600" />
          </button>
        </div>

        {/* Success State */}
        {submitted ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#2F5233]/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-[#2F5233]" />
            </div>
            <div>
              <h3 className="font-bold text-[#2F5233] text-xl font-serif-brand">Request Submitted!</h3>
              <p className="text-sm text-neutral-600 mt-2">
                Our team will review your message and respond as soon as possible during support hours.
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2.5 bg-[#2F5233] text-white rounded-xl font-bold text-sm hover:bg-[#3D6B45] transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
            <div className="p-5 space-y-4">
              {/* Name + Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.customerName}
                    onChange={e => handleChange('customerName', e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3 py-2.5 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F5233]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.customerPhone}
                    onChange={e => handleChange('customerPhone', e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3 py-2.5 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F5233]/30"
                  />
                </div>
              </div>

              {/* Email + Order Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Email (optional)</label>
                  <input
                    type="email"
                    value={form.customerEmail}
                    onChange={e => handleChange('customerEmail', e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2.5 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F5233]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Order Number (optional)</label>
                  <input
                    type="text"
                    value={form.orderNumber}
                    onChange={e => handleChange('orderNumber', e.target.value)}
                    placeholder="GZ-2026-XXXX"
                    className="w-full px-3 py-2.5 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F5233]/30 font-mono uppercase"
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.subject}
                  onChange={e => handleChange('subject', e.target.value)}
                  className="w-full px-3 py-2.5 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F5233]/30 bg-white"
                >
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={e => handleChange('message', e.target.value)}
                  placeholder="Describe your issue or question in detail…"
                  className="w-full px-3 py-2.5 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2F5233]/30 resize-none"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="px-5 pb-5 shrink-0">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#2F5233] hover:bg-[#3D6B45] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                ) : (
                  <><Send className="w-4 h-4" /> Submit Support Request</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
