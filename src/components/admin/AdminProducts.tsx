import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Product, ProductMediaItem, ProductVariant } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { normalizeProductMedia } from '../../utils/mediaUtils';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  Star,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { ProductMediaManager } from './ProductMediaManager';

export const AdminProducts: React.FC = () => {
  const { products, categories, addProduct, updateProduct, deleteProduct, toggleProductEnabled, showToast } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenNew = () => {
    const tempId = `prod-${Date.now()}`;
    setEditingProduct({
      name: '',
      slug: '',
      categoryId: categories[0]?.id || '',
      shortDescription: '',
      fullDescription: '',
      images: ['https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80'],
      media: [],
      purityInfo: '100% natural, lab tested pure. No added sugar or chemical preservatives.',
      originInfo: 'Ethically sourced from trusted harvesters across Bangladesh.',
      ingredients: '100% Pure Natural Food.',
      nutritionInfo: 'Rich in active micronutrients and minerals.',
      storageInstructions: 'Store in a cool, dry place away from direct sunlight.',
      usageInstructions: 'Consume directly or add to your daily diet.',
      isFeatured: false,
      isBestSeller: false,
      isNew: true,
      isEnabled: true,
      variants: [
        {
          id: `var-${Date.now()}`,
          productId: tempId,
          label: '500g Jar',
          sku: 'GZ-PROD-500G',
          sizeValue: 500,
          sizeUnit: 'g',
          price: 650,
          salePrice: undefined,
          stock: 30,
          lowStockThreshold: 5,
          isEnabled: true
        }
      ]
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name) return;

    const slug = editingProduct.slug || editingProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const targetProductId = editingProduct.id || `prod-${Date.now()}`;

    const sanitizedVariants: ProductVariant[] = (editingProduct.variants && editingProduct.variants.length > 0
      ? editingProduct.variants
      : [
          {
            id: `var-${Date.now()}`,
            productId: targetProductId,
            label: 'Standard Pack',
            sku: 'GZ-STD',
            sizeValue: 500,
            sizeUnit: 'g',
            price: 500,
            stock: 20,
            lowStockThreshold: 5,
            isEnabled: true
          }
        ]
    ).map(v => ({
      ...v,
      productId: targetProductId,
      sizeValue: v.sizeValue || 500,
      sizeUnit: v.sizeUnit || 'g'
    }));

    if (editingProduct.id) {
      updateProduct(editingProduct.id, {
        name: editingProduct.name,
        slug,
        categoryId: editingProduct.categoryId || categories[0]?.id || '',
        shortDescription: editingProduct.shortDescription || '',
        fullDescription: editingProduct.fullDescription || '',
        images: editingProduct.media !== undefined
          ? editingProduct.media.filter(m => m.type === 'image').map(m => m.url)
          : (editingProduct.images || []),
        media: editingProduct.media || [],
        purityInfo: editingProduct.purityInfo || '',
        originInfo: editingProduct.originInfo || '',
        ingredients: editingProduct.ingredients || '',
        nutritionInfo: editingProduct.nutritionInfo || '',
        storageInstructions: editingProduct.storageInstructions || '',
        usageInstructions: editingProduct.usageInstructions || '',
        isFeatured: !!editingProduct.isFeatured,
        isBestSeller: !!editingProduct.isBestSeller,
        isNew: !!editingProduct.isNew,
        isEnabled: editingProduct.isEnabled !== false,
        variants: sanitizedVariants,
        trustLabel: editingProduct.trustLabel?.trim() || undefined,
        customBadge: editingProduct.customBadge?.trim() || undefined
      });
    } else {
      addProduct({
        name: editingProduct.name,
        slug,
        categoryId: editingProduct.categoryId || categories[0]?.id || '',
        shortDescription: editingProduct.shortDescription || '',
        fullDescription: editingProduct.fullDescription || '',
        images: editingProduct.media !== undefined
          ? editingProduct.media.filter(m => m.type === 'image').map(m => m.url)
          : (editingProduct.images || []),
        media: editingProduct.media || [],
        purityInfo: editingProduct.purityInfo || '',
        originInfo: editingProduct.originInfo || '',
        ingredients: editingProduct.ingredients || '',
        nutritionInfo: editingProduct.nutritionInfo || '',
        storageInstructions: editingProduct.storageInstructions || '',
        usageInstructions: editingProduct.usageInstructions || '',
        isFeatured: !!editingProduct.isFeatured,
        isBestSeller: !!editingProduct.isBestSeller,
        isNew: !!editingProduct.isNew,
        isEnabled: editingProduct.isEnabled !== false,
        variants: sanitizedVariants,
        trustLabel: editingProduct.trustLabel?.trim() || undefined,
        customBadge: editingProduct.customBadge?.trim() || undefined
      });
    }

    setEditingProduct(null);
  };

  const handleAddVariant = () => {
    if (!editingProduct) return;
    const parentId = editingProduct.id || 'temp';
    const newVariant: ProductVariant = {
      id: `var-${Date.now()}`,
      productId: parentId,
      label: 'New Size',
      sku: `GZ-${Date.now().toString().slice(-4)}`,
      sizeValue: 250,
      sizeUnit: 'g',
      price: 500,
      stock: 20,
      lowStockThreshold: 5,
      isEnabled: true
    };
    setEditingProduct({
      ...editingProduct,
      variants: [...(editingProduct.variants || []), newVariant]
    });
  };

  const handleUpdateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    if (!editingProduct || !editingProduct.variants) return;
    const updated = [...editingProduct.variants];
    updated[index] = { ...updated[index], [field]: value };
    setEditingProduct({ ...editingProduct, variants: updated });
  };

  const handleRemoveVariant = (index: number) => {
    if (!editingProduct || !editingProduct.variants) return;
    if (editingProduct.variants.length <= 1) {
      showToast('A product must have at least one variant', 'error');
      return;
    }
    const updated = editingProduct.variants.filter((_, i) => i !== index);
    setEditingProduct({ ...editingProduct, variants: updated });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-brand font-bold text-2xl sm:text-3xl text-[#2F5233]">
            Products & Variants
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Manage natural food catalog, pack sizes, stock counts, and prices.
          </p>
        </div>

        <button
          id="admin-create-product-btn"
          onClick={handleOpenNew}
          className="px-4 py-2 bg-[#2F5233] hover:bg-[#3D6B45] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Product</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
        <input
          type="text"
          placeholder="Search products by title or slug..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full text-xs sm:text-sm pl-9 pr-4 py-2 rounded-xl border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2F5233]"
        />
      </div>

      {/* Product List Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FAF7F2] text-neutral-500 uppercase tracking-wider text-[10px] border-b border-neutral-200">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Variants & Stock</th>
                <th className="py-3 px-4">Badges</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredProducts.map(p => {
                const cat = categories.find(c => c.id === p.categoryId);

                return (
                  <tr key={p.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.images?.[0] || p.media?.[0]?.url || 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=200&q=60'}
                          alt={p.name}
                          className="w-11 h-11 rounded-lg object-cover border bg-neutral-100 shrink-0"
                          onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=200&q=60'; }}
                        />
                        <div>
                          <div className="font-bold text-sm text-[#2A2A28]">{p.name}</div>
                          <div className="text-neutral-400 text-[11px] font-mono">{p.slug}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-semibold text-neutral-600">
                      {cat?.name || 'Uncategorized'}
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        {p.variants.map(v => (
                          <div key={v.id} className="flex items-center gap-1.5 text-[11px]">
                            <span className="font-semibold text-neutral-700">{v.label}:</span>
                            <span className="font-bold text-[#2F5233]">
                              {formatCurrency(v.salePrice || v.price)}
                            </span>
                            <span
                              className={`text-[10px] px-1 rounded font-mono ${
                                v.stock <= 0
                                    ? 'bg-red-100 text-red-700'
                                  : v.stock <= v.lowStockThreshold
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'text-neutral-500'
                              }`}
                            >
                              ({v.stock} in stock)
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {p.isBestSeller && (
                          <span className="text-[10px] font-bold bg-[#D9A441] text-[#2A2A28] px-1.5 py-0.5 rounded">
                            Best Seller
                          </span>
                        )}
                        {p.isNew && (
                          <span className="text-[10px] font-bold bg-[#2F5233]/15 text-[#2F5233] px-1.5 py-0.5 rounded">
                            New Harvest
                          </span>
                        )}
                        {p.isFeatured && (
                          <span className="text-[10px] font-bold bg-neutral-200 text-neutral-800 px-1.5 py-0.5 rounded">
                            Featured
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleProductEnabled(p.id)}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full cursor-pointer ${
                          p.isEnabled
                            ? 'bg-[#2F5233]/10 text-[#2F5233]'
                            : 'bg-neutral-200 text-neutral-600'
                        }`}
                      >
                        {p.isEnabled ? 'Published' : 'Draft'}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingProduct(p)}
                          className="p-1.5 text-neutral-600 hover:text-[#2F5233] hover:bg-[#FAF7F2] rounded-lg transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete ${p.name}?`)) {
                              deleteProduct(p.id);
                            }
                          }}
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-200 p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-serif-brand font-bold text-xl text-[#2F5233]">
                {editingProduct.id ? 'Edit Natural Food Product' : 'Add New Natural Food Product'}
              </h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-neutral-400 hover:text-neutral-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    placeholder="e.g. Pure Sundarban Wild Flower Honey"
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Category *</label>
                  <select
                    value={editingProduct.categoryId || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Short Description *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.shortDescription || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, shortDescription: e.target.value })}
                  placeholder="Single-sentence summary for cards and search"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              {/* Card Trust Label & Badge Override */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1">
                    Trust / Verification Label
                    <span className="font-normal text-neutral-400 ml-1">(optional, shown on card)</span>
                  </label>
                  <input
                    type="text"
                    value={editingProduct.trustLabel || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, trustLabel: e.target.value })}
                    placeholder="e.g. 100% Pure & Lab Verified"
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">Displayed below the product title on the card. Leave blank to hide.</p>
                </div>

                <div>
                  <label className="block font-bold mb-1">
                    Custom Badge Text
                    <span className="font-normal text-neutral-400 ml-1">(optional, overrides auto badge)</span>
                  </label>
                  <input
                    type="text"
                    value={editingProduct.customBadge || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, customBadge: e.target.value })}
                    placeholder="e.g. ORGANIC, LIMITED, SALE"
                    className="w-full px-3 py-2 border rounded-xl"
                    maxLength={20}
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">Overrides Best Seller / New / Featured auto-badge. Keep short (≤20 chars).</p>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Full Detailed Story & Description</label>
                <textarea
                  rows={3}
                  value={editingProduct.fullDescription || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, fullDescription: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              {/* Product Media Manager */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-2">Product Images &amp; Video</label>
                <ProductMediaManager
                  media={
                    editingProduct.media !== undefined
                      ? editingProduct.media
                      : normalizeProductMedia(editingProduct as Product)
                  }
                  onMediaChange={(newMedia: ProductMediaItem[], legacyImages: string[]) => {
                    setEditingProduct({
                      ...editingProduct,
                      media: newMedia,
                      images: legacyImages
                    });
                  }}
                />
              </div>

              {/* Variants Section */}
              <div className="border border-neutral-200 rounded-2xl p-4 bg-[#FAF7F2] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#2F5233]">
                    Pack Sizes & Variants ({editingProduct.variants?.length || 0})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="px-3 py-1 bg-[#2F5233] text-white rounded-lg text-xs font-bold"
                  >
                    + Add Size
                  </button>
                </div>

                <div className="space-y-2">
                  {editingProduct.variants?.map((v, idx) => (
                    <div
                      key={v.id || idx}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white p-3 rounded-xl border items-center"
                    >
                      <div className="sm:col-span-3">
                        <label className="block sm:hidden text-[10px] font-bold text-neutral-500 mb-1">Size/Label</label>
                        <input
                          type="text"
                          placeholder="Size (e.g. 500g)"
                          value={v.label}
                          onChange={e => handleUpdateVariant(idx, 'label', e.target.value)}
                          className="w-full px-2 py-1.5 border rounded"
                        />
                      </div>
                      <div className="sm:col-span-2">
                         <label className="block sm:hidden text-[10px] font-bold text-neutral-500 mb-1">Price</label>
                        <input
                          type="number"
                          placeholder="Price"
                          value={v.price}
                          onChange={e => handleUpdateVariant(idx, 'price', Number(e.target.value))}
                          className="w-full px-2 py-1.5 border rounded"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block sm:hidden text-[10px] font-bold text-neutral-500 mb-1">Sale Price</label>
                        <input
                          type="number"
                          placeholder="Sale Price"
                          value={v.salePrice || ''}
                          onChange={e =>
                            handleUpdateVariant(
                              idx,
                              'salePrice',
                              e.target.value ? Number(e.target.value) : undefined
                            )
                          }
                          className="w-full px-2 py-1.5 border rounded"
                        />
                      </div>
                      <div className="sm:col-span-2">
                         <label className="block sm:hidden text-[10px] font-bold text-neutral-500 mb-1">Stock</label>
                        <input
                          type="number"
                          placeholder="Stock"
                          value={v.stock}
                          onChange={e => handleUpdateVariant(idx, 'stock', Number(e.target.value))}
                          className="w-full px-2 py-1.5 border rounded"
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={v.isEnabled !== false}
                          onChange={e => handleUpdateVariant(idx, 'isEnabled', e.target.checked)}
                          className="w-3.5 h-3.5"
                          id={`var-en-${idx}`}
                        />
                        <label htmlFor={`var-en-${idx}`} className="text-xs font-semibold cursor-pointer">
                          Enabled
                        </label>
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(idx)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded font-bold transition-colors"
                          title="Remove Variant"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Badges & Publication */}
              <div className="flex flex-wrap gap-4 py-2 border-y">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isEnabled !== false}
                    onChange={e => setEditingProduct({ ...editingProduct, isEnabled: e.target.checked })}
                  />
                  <span>Published on Storefront</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editingProduct.isBestSeller}
                    onChange={e => setEditingProduct({ ...editingProduct, isBestSeller: e.target.checked })}
                  />
                  <span>Best Seller Badge</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editingProduct.isNew}
                    onChange={e => setEditingProduct({ ...editingProduct, isNew: e.target.checked })}
                  />
                  <span>New Harvest Badge</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editingProduct.isFeatured}
                    onChange={e => setEditingProduct({ ...editingProduct, isFeatured: e.target.checked })}
                  />
                  <span>Featured Product</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 text-neutral-500 hover:text-neutral-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#2F5233] text-white rounded-xl font-bold hover:bg-[#3D6B45]"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
