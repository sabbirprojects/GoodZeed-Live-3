import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { HomepageSection, SectionType } from '../../types';
import { ArrowDown, ArrowUp, Edit2, Eye, EyeOff, Plus, Save, Trash2, X } from 'lucide-react';
import { MediaUploadInput } from './MediaUploadInput';

const sectionTypes: SectionType[] = [
  'HERO', 'TRUST_STRIP', 'SHOP_BY_CATEGORY', 'FEATURED_PRODUCTS', 'BEST_SELLERS',
  'PROMO_BANNER', 'WHY_GOODZEED', 'SOURCE_STORY', 'FEATURED_COLLECTION', 'REVIEWS',
  'BRAND_STORY', 'FINAL_CTA'
];

const blankSection = (sortOrder: number): HomepageSection => ({
  id: '', sectionType: 'PROMO_BANNER', title: 'New Homepage Section', sortOrder,
  isEnabled: true, heading: '', subtitle: '', bodyText: '', ctaLabel: '', ctaLink: '',
  mediaUrl: '', badge: '', customHtml: ''
});

export const AdminHomepageCMS: React.FC = () => {
  const { homepageSections, addHomepageSection, updateHomepageSection, toggleHomepageSection, deleteHomepageSection, reorderHomepageSections } = useStore();
  const [editingSection, setEditingSection] = useState<HomepageSection | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const sorted = [...homepageSections].sort((a, b) => a.sortOrder - b.sortOrder);

  const move = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= sorted.length) return;
    const next = [...sorted];
    [next[index], next[target]] = [next[target], next[index]];
    reorderHomepageSections(next.map((section, order) => ({ ...section, sortOrder: order + 1 })));
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingSection?.title.trim()) return;
    const { id, ...section } = editingSection;
    if (isCreating) addHomepageSection(section);
    else updateHomepageSection(id, section);
    setEditingSection(null);
    setIsCreating(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h2 className="font-serif-brand font-bold text-xl text-[#2F5233]">Homepage Sections</h2><p className="text-xs text-neutral-500">Add, edit, reorder, publish, or remove live storefront sections.</p></div>
        <button onClick={() => { setIsCreating(true); setEditingSection(blankSection(sorted.length + 1)); }} className="px-4 py-2 bg-[#2F5233] text-white rounded-xl text-xs font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> Add Section</button>
      </div>
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden divide-y divide-neutral-100">
        {sorted.map((section, index) => (
          <div key={section.id} className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0"><span className="w-7 h-7 rounded-lg bg-[#FAF7F2] text-[#2F5233] font-bold text-xs flex items-center justify-center border">{index + 1}</span><div className="min-w-0"><h3 className="font-bold text-sm truncate">{section.title}</h3><p className="text-[10px] text-neutral-500 uppercase font-mono">{section.sectionType} · {section.isEnabled ? 'Active' : 'Hidden'}</p></div></div>
            <div className="flex items-center gap-1 shrink-0">
              <button disabled={index === 0} onClick={() => move(index, 'up')} className="p-1.5 rounded-lg border disabled:opacity-20" title="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
              <button disabled={index === sorted.length - 1} onClick={() => move(index, 'down')} className="p-1.5 rounded-lg border disabled:opacity-20" title="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
              <button onClick={() => toggleHomepageSection(section.id)} className="p-1.5 rounded-lg border" title={section.isEnabled ? 'Hide section' : 'Show section'}>{section.isEnabled ? <Eye className="w-3.5 h-3.5 text-[#2F5233]" /> : <EyeOff className="w-3.5 h-3.5 text-neutral-400" />}</button>
              <button onClick={() => { setIsCreating(false); setEditingSection({ ...section }); }} className="p-1.5 rounded-lg border" title="Edit section"><Edit2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => window.confirm(`Delete ${section.title}?`) && deleteHomepageSection(section.id)} className="p-1.5 rounded-lg border text-red-600" title="Delete section"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
      {editingSection && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={save} className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between"><h3 className="font-serif-brand font-bold text-lg text-[#2F5233]">{isCreating ? 'Add Homepage Section' : `Edit ${editingSection.title}`}</h3><button type="button" onClick={() => setEditingSection(null)} title="Close"><X className="w-5 h-5" /></button></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="sm:col-span-2">Display title<input required value={editingSection.title} onChange={e => setEditingSection({ ...editingSection, title: e.target.value })} className="w-full px-3 py-2 border rounded-xl mt-1" /></label>
              <label>Section type<select value={editingSection.sectionType} onChange={e => setEditingSection({ ...editingSection, sectionType: e.target.value as SectionType })} className="w-full px-3 py-2 border rounded-xl mt-1">{sectionTypes.map(type => <option key={type}>{type}</option>)}</select></label>
              <label>Sort order<input type="number" min="1" value={editingSection.sortOrder} onChange={e => setEditingSection({ ...editingSection, sortOrder: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-xl mt-1" /></label>
              <label className="sm:col-span-2">Heading<input value={editingSection.heading || ''} onChange={e => setEditingSection({ ...editingSection, heading: e.target.value })} className="w-full px-3 py-2 border rounded-xl mt-1" /></label>
              <label>Subtitle<input value={editingSection.subtitle || ''} onChange={e => setEditingSection({ ...editingSection, subtitle: e.target.value })} className="w-full px-3 py-2 border rounded-xl mt-1" /></label>
              <label>Badge<input value={editingSection.badge || ''} onChange={e => setEditingSection({ ...editingSection, badge: e.target.value })} className="w-full px-3 py-2 border rounded-xl mt-1" /></label>
              <label className="sm:col-span-2">Body text / rich text HTML<textarea rows={4} value={editingSection.bodyText || ''} onChange={e => setEditingSection({ ...editingSection, bodyText: e.target.value })} className="w-full px-3 py-2 border rounded-xl mt-1" /></label>
              <label>CTA label<input value={editingSection.ctaLabel || ''} onChange={e => setEditingSection({ ...editingSection, ctaLabel: e.target.value })} className="w-full px-3 py-2 border rounded-xl mt-1" /></label>
              <label>CTA link<input value={editingSection.ctaLink || ''} onChange={e => setEditingSection({ ...editingSection, ctaLink: e.target.value })} className="w-full px-3 py-2 border rounded-xl mt-1" /></label>
            </div>
            <MediaUploadInput folder="cms" label="Section image or media URL" value={editingSection.mediaUrl || ''} onChange={mediaUrl => setEditingSection({ ...editingSection, mediaUrl })} />
            <label className="block">Custom HTML (sanitized before storage/rendering)<textarea rows={5} value={editingSection.customHtml || ''} onChange={e => setEditingSection({ ...editingSection, customHtml: e.target.value })} className="w-full px-3 py-2 border rounded-xl mt-1 font-mono" /></label>
            <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={editingSection.isEnabled} onChange={e => setEditingSection({ ...editingSection, isEnabled: e.target.checked })} /> Visible on storefront</label>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingSection(null)} className="px-4 py-2 font-bold text-neutral-500">Cancel</button><button type="submit" className="px-5 py-2 bg-[#2F5233] text-white rounded-xl font-bold flex items-center gap-2"><Save className="w-4 h-4" /> Save Section</button></div>
          </form>
        </div>
      )}
    </div>
  );
};
