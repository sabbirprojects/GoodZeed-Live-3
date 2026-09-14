import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { StoreSettings } from '../../types';
import { Save, CheckCircle2, Bot, MessageCircle } from 'lucide-react';
import { AdminHomepageCMS } from './AdminHomepageCMS';

export const AdminSettings: React.FC = () => {
  const { settings, updateSettings, showToast } = useStore();
  const [formSettings, setFormSettings] = useState<StoreSettings>({ ...settings });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setFormSettings({ ...settings });
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formSettings);
    setIsSaved(true);
    showToast('Store settings updated successfully', 'success');
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <AdminHomepageCMS />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-brand font-bold text-2xl sm:text-3xl text-[#2F5233]">
            Store & Payment Configuration
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Manage bKash/Nagad merchant instructions, customer care hotlines, and store identity.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Basic Brand Identity */}
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-4">
          <h3 className="font-serif-brand font-bold text-base text-[#2F5233] border-b pb-2">
            Store Identity & Contact Hotlines
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold mb-1 text-neutral-700">Store Name</label>
              <input
                type="text"
                required
                value={formSettings.storeName}
                onChange={e => setFormSettings({ ...formSettings, storeName: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-neutral-700">Tagline / Mission</label>
              <input
                type="text"
                required
                value={formSettings.storeTagline}
                onChange={e => setFormSettings({ ...formSettings, storeTagline: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-neutral-700">Customer Care Phone</label>
              <input
                type="text"
                required
                value={formSettings.storeContactPhone}
                onChange={e =>
                  setFormSettings({ ...formSettings, storeContactPhone: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-neutral-700">Support Email</label>
              <input
                type="email"
                required
                value={formSettings.storeContactEmail}
                onChange={e =>
                  setFormSettings({ ...formSettings, storeContactEmail: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-xl"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold mb-1 text-neutral-700">
                Official Business & Packing Warehouse Address
              </label>
              <input
                type="text"
                required
                value={formSettings.storeAddress}
                onChange={e => setFormSettings({ ...formSettings, storeAddress: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Support & AI Configuration */}
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-4">
          <h3 className="font-serif-brand font-bold text-base text-[#2F5233] border-b pb-2 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#25D366]" />
            Customer Support & AI Assistant
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold mb-1 text-neutral-700">WhatsApp Support Number</label>
              <input
                type="text"
                value={formSettings.whatsappSupportNumber || ''}
                onChange={e => setFormSettings({ ...formSettings, whatsappSupportNumber: e.target.value })}
                placeholder="+880 1711-223344"
                className="w-full px-3 py-2 border rounded-xl font-mono"
              />
              <p className="text-[10px] text-neutral-400 mt-1">Used for the support widget WhatsApp button. Include +880 prefix.</p>
            </div>

            <div>
              <label className="block font-bold mb-1 text-neutral-700">Support Hours</label>
              <input
                type="text"
                value={formSettings.supportHours || ''}
                onChange={e => setFormSettings({ ...formSettings, supportHours: e.target.value })}
                placeholder="Sat–Thu, 9 AM – 9 PM"
                className="w-full px-3 py-2 border rounded-xl"
              />
            </div>

            <div className="sm:col-span-2 flex items-center justify-between p-3 bg-[#FAF7F2] rounded-xl border border-neutral-200">
              <div>
                <span className="font-bold text-xs text-[#2A2A28] flex items-center gap-1.5"><Bot className="w-3.5 h-3.5 text-[#2F5233]" />AI Assistant</span>
                <p className="text-[10px] text-neutral-500 mt-0.5">Show/hide the AI chat option in the support widget</p>
              </div>
              <button
                type="button"
                onClick={() => setFormSettings({ ...formSettings, aiAssistantEnabled: !(formSettings.aiAssistantEnabled !== false) })}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${formSettings.aiAssistantEnabled !== false ? 'bg-[#2F5233]' : 'bg-neutral-300'}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${formSettings.aiAssistantEnabled !== false ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold mb-1 text-neutral-700">AI Welcome Message</label>
              <textarea
                rows={3}
                value={formSettings.aiWelcomeMessage || ''}
                onChange={e => setFormSettings({ ...formSettings, aiWelcomeMessage: e.target.value })}
                placeholder="Hi! 👋 I'm the GoodZeed Assistant. I can help you with…"
                className="w-full px-3 py-2 border rounded-xl font-mono text-[11px] resize-y"
              />
              <p className="text-[10px] text-neutral-400 mt-1">First message shown when AI chat opens. Supports line breaks.</p>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold mb-1 text-neutral-700">Support FAQ / Extra AI Knowledge</label>
              <textarea
                rows={5}
                value={formSettings.supportFAQ || ''}
                onChange={e => setFormSettings({ ...formSettings, supportFAQ: e.target.value })}
                placeholder="Q: How long does delivery take?&#10;A: Dhaka 24–48h, outside Dhaka 2–4 business days."
                className="w-full px-3 py-2 border rounded-xl font-mono text-[11px] resize-y"
              />
              <p className="text-[10px] text-neutral-400 mt-1">Free-form FAQ or extra info fed to the AI. Q&A format works best.</p>
            </div>

            <div>
              <label className="block font-bold mb-1 text-neutral-700">Return Policy</label>
              <textarea
                rows={3}
                value={formSettings.returnPolicy || ''}
                onChange={e => setFormSettings({ ...formSettings, returnPolicy: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl text-[11px] resize-y"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-neutral-700">Cancellation Policy</label>
              <textarea
                rows={3}
                value={formSettings.cancellationPolicy || ''}
                onChange={e => setFormSettings({ ...formSettings, cancellationPolicy: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl text-[11px] resize-y"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold mb-1 text-neutral-700">Refund Policy</label>
              <textarea
                rows={3}
                value={formSettings.refundPolicy || ''}
                onChange={e => setFormSettings({ ...formSettings, refundPolicy: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl text-[11px] resize-y"
              />
            </div>
          </div>
        </div>

        {/* bKash & Nagad Instructions */}
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-4">
          <h3 className="font-serif-brand font-bold text-base text-[#2F5233] border-b pb-2">
            Mobile Financial Services (bKash & Nagad)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold mb-1 text-[#e2136e]">bKash Receiving Number</label>
              <input
                type="text"
                required
                value={formSettings.bkashReceivingNumber}
                onChange={e =>
                  setFormSettings({ ...formSettings, bkashReceivingNumber: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-[#f7941d]">Nagad Receiving Number</label>
              <input
                type="text"
                required
                value={formSettings.nagadReceivingNumber}
                onChange={e =>
                  setFormSettings({ ...formSettings, nagadReceivingNumber: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-xl font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold mb-1 text-neutral-700">
                bKash Checkout Instructional Text
              </label>
              <textarea
                rows={3}
                required
                value={formSettings.bkashInstructions}
                onChange={e =>
                  setFormSettings({ ...formSettings, bkashInstructions: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-xl font-mono text-[11px]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold mb-1 text-neutral-700">
                Nagad Checkout Instructional Text
              </label>
              <textarea
                rows={3}
                required
                value={formSettings.nagadInstructions}
                onChange={e =>
                  setFormSettings({ ...formSettings, nagadInstructions: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-xl font-mono text-[11px]"
              />
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {isSaved && (
            <span className="text-xs font-bold text-[#2F5233] flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Settings updated successfully!
            </span>
          )}
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#2F5233] hover:bg-[#3D6B45] text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Store Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
