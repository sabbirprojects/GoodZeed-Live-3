import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { DeliveryZone } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Truck, Plus, Edit2, CheckCircle2 } from 'lucide-react';

export const AdminDeliveryZones: React.FC = () => {
  const { deliveryZones, addZone, updateZone, toggleZoneEnabled } = useStore();
  const [editingZone, setEditingZone] = useState<Partial<DeliveryZone> | null>(null);

  const handleOpenNew = () => {
    setEditingZone({
      name: '',
      charge: 100,
      estimatedDeliveryTime: '2-3 Business Days',
      isEnabled: true,
      sortOrder: deliveryZones.length + 1
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingZone || !editingZone.name) return;

    if (editingZone.id) {
      updateZone(editingZone.id, {
        name: editingZone.name,
        charge: Number(editingZone.charge) || 0,
        estimatedDeliveryTime: editingZone.estimatedDeliveryTime || '2-3 Business Days',
        isEnabled: editingZone.isEnabled !== false
      });
    } else {
      addZone({
        name: editingZone.name,
        charge: Number(editingZone.charge) || 0,
        estimatedDeliveryTime: editingZone.estimatedDeliveryTime || '2-3 Business Days',
        isEnabled: editingZone.isEnabled !== false,
        sortOrder: editingZone.sortOrder || deliveryZones.length + 1
      });
    }

    setEditingZone(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-brand font-bold text-2xl sm:text-3xl text-[#2F5233]">
            Delivery Zones & Courier Charges
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Configure automated delivery fee calculation for Dhaka and nationwide districts.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-4 py-2 bg-[#2F5233] hover:bg-[#3D6B45] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add New Zone</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {deliveryZones.map(zone => (
          <div
            key={zone.id}
            className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#FAF7F2] text-[#2F5233] flex items-center justify-center shrink-0 border">
                <Truck className="w-5 h-5 text-[#D9A441]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[#2A2A28]">{zone.name}</h3>
                  <button
                    onClick={() => toggleZoneEnabled(zone.id)}
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer ${
                      zone.isEnabled
                        ? 'bg-[#2F5233]/10 text-[#2F5233]'
                        : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    {zone.isEnabled ? 'Active' : 'Disabled'}
                  </button>
                </div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  Transit: {zone.estimatedDeliveryTime}
                </div>
                <div className="font-serif-brand font-bold text-sm text-[#2F5233] mt-1">
                  Delivery Fee: {formatCurrency(zone.charge)}
                </div>
              </div>
            </div>

            <button
              onClick={() => setEditingZone(zone)}
              className="p-2 text-neutral-500 hover:text-[#2F5233] hover:bg-[#FAF7F2] rounded-xl transition-colors"
              title="Edit Delivery Zone"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {editingZone && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-serif-brand font-bold text-lg text-[#2F5233]">
              {editingZone.id ? 'Edit Delivery Zone' : 'New Delivery Zone'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Zone Name *</label>
                <input
                  type="text"
                  required
                  value={editingZone.name || ''}
                  onChange={e => setEditingZone({ ...editingZone, name: e.target.value })}
                  placeholder="e.g. Inside Dhaka Metropolitan"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Delivery Charge (BDT) *</label>
                <input
                  type="number"
                  required
                  value={editingZone.charge ?? ''}
                  onChange={e => setEditingZone({ ...editingZone, charge: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Estimated Delivery Time *</label>
                <input
                  type="text"
                  required
                  value={editingZone.estimatedDeliveryTime || ''}
                  onChange={e =>
                    setEditingZone({ ...editingZone, estimatedDeliveryTime: e.target.value })
                  }
                  placeholder="e.g. 24-48 Hours"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="py-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={editingZone.isEnabled !== false}
                    onChange={e => setEditingZone({ ...editingZone, isEnabled: e.target.checked })}
                  />
                  <span>Active at Checkout</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingZone(null)}
                  className="px-4 py-2 text-neutral-500 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#2F5233] text-white rounded-xl font-bold"
                >
                  Save Zone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
