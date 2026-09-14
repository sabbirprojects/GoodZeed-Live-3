import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { formatDate } from '../../utils/formatters';
import { Boxes, AlertTriangle, CheckCircle2, History, Plus, Minus } from 'lucide-react';

export const AdminInventory: React.FC = () => {
  const { products, adjustStock, inventoryAdjustments, showToast } = useStore();
  const [selectedVariant, setSelectedVariant] = useState<{
    productId: string;
    productName: string;
    variantId: string;
    variantLabel: string;
    currentStock: number;
  } | null>(null);

  const [adjustmentQuantity, setAdjustmentQuantity] = useState<number>(10);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('Fresh harvest restock batch');

  // Build flattened variant list
  const variantList: {
    productId: string;
    productName: string;
    productImage: string;
    variantId: string;
    label: string;
    sku: string;
    stock: number;
    threshold: number;
    isEnabled: boolean;
  }[] = [];

  products.forEach(p => {
    p.variants.forEach(v => {
      variantList.push({
        productId: p.id,
        productName: p.name,
        productImage: p.images[0] || '',
        variantId: v.id,
        label: v.label,
        sku: v.sku,
        stock: v.stock,
        threshold: v.lowStockThreshold,
        isEnabled: v.isEnabled
      });
    });
  });

  const handleApplyAdjustment = (isPositive: boolean) => {
    if (!selectedVariant || !adjustmentReason.trim()) {
      showToast('Please provide a valid adjustment reason', 'error');
      return;
    }

    const delta = isPositive ? Math.abs(adjustmentQuantity) : -Math.abs(adjustmentQuantity);
    adjustStock(selectedVariant.variantId, delta, adjustmentReason.trim());
    setSelectedVariant(null);
    setAdjustmentReason('Fresh harvest restock batch');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-brand font-bold text-2xl sm:text-3xl text-[#2F5233]">
            Inventory & Stock Manager
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Real-time stock audit and immutable reason-logged inventory movements.
          </p>
        </div>
      </div>

      {/* Variant Inventory Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FAF7F2] text-neutral-500 uppercase tracking-wider text-[10px] border-b border-neutral-200">
              <tr>
                <th className="py-3.5 px-4">Item & Size</th>
                <th className="py-3.5 px-4">SKU</th>
                <th className="py-3.5 px-4 text-center">Threshold</th>
                <th className="py-3.5 px-4 text-center">Current Stock</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Quick Stock Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {variantList.map(item => (
                <tr key={item.variantId} className="hover:bg-neutral-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.productImage}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover border"
                      />
                      <div>
                        <div className="font-bold text-[#2A2A28]">{item.productName}</div>
                        <div className="text-[11px] font-semibold text-[#2F5233]">
                          Size: {item.label}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-500">
                    {item.sku}
                  </td>

                  <td className="py-3.5 px-4 text-center font-mono text-neutral-500">
                    {item.threshold} units
                  </td>

                  <td className="py-3.5 px-4 text-center font-mono font-bold text-sm text-[#2A2A28]">
                    {item.stock}
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.stock <= 0
                          ? 'bg-red-100 text-red-700'
                          : item.stock <= item.threshold
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-[#2F5233]/10 text-[#2F5233]'
                      }`}
                    >
                      {item.stock <= 0
                        ? 'Out of Stock'
                        : item.stock <= item.threshold
                        ? 'Low Stock Warning'
                        : 'Well Stocked'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() =>
                        setSelectedVariant({
                          productId: item.productId,
                          productName: item.productName,
                          variantId: item.variantId,
                          variantLabel: item.label,
                          currentStock: item.stock
                        })
                      }
                      className="px-3 py-1.5 bg-[#FAF7F2] hover:bg-neutral-200 text-[#2F5233] border border-[#2F5233]/20 rounded-xl text-xs font-bold transition-colors"
                    >
                      Adjust Stock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {selectedVariant && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-serif-brand font-bold text-lg text-[#2F5233]">
              Stock Adjustment
            </h3>
            <p className="text-xs text-neutral-500">
              {selectedVariant.productName} ({selectedVariant.variantLabel})
            </p>
            <p className="text-xs font-bold text-[#2A2A28]">
              Current stock: {selectedVariant.currentStock} units
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Adjustment Quantity (units)</label>
                <input
                  type="number"
                  min="1"
                  value={adjustmentQuantity}
                  onChange={e => setAdjustmentQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Mandatory Reason / Note *</label>
                <input
                  type="text"
                  required
                  value={adjustmentReason}
                  onChange={e => setAdjustmentReason(e.target.value)}
                  placeholder="e.g. Received new honey jars from Sundarban Moual cooperative"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setSelectedVariant(null)}
                className="px-3 py-2 text-neutral-500 text-xs font-bold"
              >
                Cancel
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyAdjustment(false)}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Deduct (-{adjustmentQuantity})</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyAdjustment(true)}
                  className="px-4 py-2 bg-[#2F5233] hover:bg-[#3D6B45] text-white rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add (+{adjustmentQuantity})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Audit Logs Stream */}
      <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
          <History className="w-4 h-4 text-[#2F5233]" />
          <h3 className="font-serif-brand font-bold text-base text-[#2F5233]">
            Recent Stock Movement Audit Logs
          </h3>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {inventoryAdjustments.length === 0 ? (
            <p className="text-xs text-neutral-400 italic">No manual adjustments recorded yet.</p>
          ) : (
            inventoryAdjustments.map(log => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7F2] border border-neutral-200 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 font-bold text-[#2A2A28]">
                    <span>{log.productName}</span>
                    <span className="text-[11px] text-neutral-500 font-normal">
                      ({log.variantLabel})
                    </span>
                    <span
                      className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                        log.changeAmount > 0
                          ? 'bg-[#2F5233]/10 text-[#2F5233]'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {log.changeAmount > 0 ? `+${log.changeAmount}` : log.changeAmount} units
                    </span>
                  </div>
                  <p className="text-neutral-500 text-[11px] mt-0.5">{log.reason}</p>
                </div>

                <div className="text-right text-[10px] text-neutral-400 font-mono">
                  <div>Stock after: {log.stockAfter}</div>
                  <div>{formatDate(log.createdAt)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
