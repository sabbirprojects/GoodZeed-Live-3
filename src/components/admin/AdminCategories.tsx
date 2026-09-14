import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Category } from '../../types';
import { Plus, Edit2, Trash2, Layers } from 'lucide-react';
import { MediaUploadInput } from './MediaUploadInput';

export const AdminCategories: React.FC = () => {
  const { categories, products, addCategory, updateCategory, deleteCategory, toggleCategoryEnabled } = useStore();
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  const handleOpenNew = () => {
    setEditingCategory({
      name: '',
      slug: '',
      description: '',
      image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=400&q=80',
      isEnabled: true,
      sortOrder: categories.length + 1
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name) return;

    const slug = editingCategory.slug || editingCategory.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    if (editingCategory.id) {
      updateCategory(editingCategory.id, {
        name: editingCategory.name,
        slug,
        description: editingCategory.description || '',
        image: editingCategory.image || '',
        isEnabled: editingCategory.isEnabled !== false
      });
    } else {
      addCategory({
        name: editingCategory.name,
        slug,
        description: editingCategory.description || '',
        image: editingCategory.image || '',
        isEnabled: editingCategory.isEnabled !== false,
        sortOrder: editingCategory.sortOrder || categories.length + 1
      });
    }

    setEditingCategory(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-brand font-bold text-2xl sm:text-3xl text-[#2F5233]">
            Categories
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Structure your natural food storefront navigation and category pages.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-4 py-2 bg-[#2F5233] hover:bg-[#3D6B45] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Category</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => {
          const prodCount = products.filter(p => p.categoryId === cat.id).length;

          return (
            <div
              key={cat.id}
              className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-12 h-12 rounded-xl object-cover bg-neutral-100 border shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[#FAF7F2] text-[#2F5233] flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif-brand font-bold text-sm text-[#2A2A28]">{cat.name}</h3>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        cat.isEnabled ? 'bg-[#2F5233]/10 text-[#2F5233]' : 'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {cat.isEnabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono">{cat.slug}</div>
                  <span className="text-[11px] text-[#2F5233] font-semibold">
                    {prodCount} products
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingCategory(cat)}
                  className="p-1.5 text-neutral-500 hover:text-[#2F5233] hover:bg-[#FAF7F2] rounded-lg"
                  title="Edit Category"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete ${cat.name}?`)) {
                      deleteCategory(cat.id);
                    }
                  }}
                  className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete Category"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-serif-brand font-bold text-lg text-[#2F5233]">
              {editingCategory.id ? 'Edit Category' : 'Create Category'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={editingCategory.name || ''}
                  onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  placeholder="e.g. Raw Honey"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Description</label>
                <input
                  type="text"
                  value={editingCategory.description || ''}
                  onChange={e => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  placeholder="100% Raw Forest and Flower Honey"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <MediaUploadInput
                  label="Category Image"
                  value={editingCategory.image || ''}
                  folder="categories"
                  onChange={(url) => setEditingCategory({ ...editingCategory, image: url })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 text-neutral-500 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#2F5233] text-white rounded-xl font-bold"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
