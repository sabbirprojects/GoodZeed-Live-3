import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { LandingPage, LandingPageBlock } from '../../types';
import { Plus, Edit2, ExternalLink, Eye, EyeOff, Sparkles, Trash2 } from 'lucide-react';

export const AdminLandingPages: React.FC = () => {
  const navigate = useNavigate();
  const {
    landingPages,
    addLandingPage,
    updateLandingPage,
    togglePublishLandingPage,
    deleteLandingPage,
    setCurrentView,
    setSelectedLandingSlug
  } = useStore();

  const [selectedPage, setSelectedPage] = useState<LandingPage | null>(null);

  const handleOpenNew = () => {
    const timestamp = Date.now();
    const newLpId = `lp-${timestamp}`;
    const slug = `harvest-special-${timestamp.toString().slice(-4)}`;

    addLandingPage({
      slug,
      title: 'Sundarban Raw Honey Limited Promo',
      seoTitle: 'Fresh Moual Harvest Raw Honey Promo | GoodZeed',
      seoDescription: 'Limited-quantity harvest of wild floral mangrove honey directly from Sundarban Mouals.',
      isPublished: true,
      isNoIndex: false,
      blocks: [
        {
          id: `blk-${timestamp}-1`,
          landingPageId: newLpId,
          blockType: 'HERO',
          sortOrder: 1,
          content: {
            badge: 'Limited Seasonal Harvest',
            heading: 'Pure Raw Sundarban Honey — Straight From Mangrove Hives',
            subheading: 'Unheated, unfiltered, and rich in natural live pollens. Pay with Cash on Delivery.',
            ctaText: 'Order Now with Cash on Delivery'
          }
        },
        {
          id: `blk-${timestamp}-2`,
          landingPageId: newLpId,
          blockType: 'BENEFITS',
          sortOrder: 2,
          content: {
            heading: 'Why Bangladeshi Families Choose GoodZeed',
            items: [
              { title: 'Zero Corn Syrup', desc: 'Lab-tested 100% natural flower nectar without adulteration.' },
              { title: 'Ethical Moual Direct', desc: 'Fair compensation directly to traditional mangrove beekeepers.' },
              { title: 'Doorstep Check', desc: 'Inspect glass jars before handing cash to the courier.' }
            ]
          }
        }
      ]
    });
  };

  const handlePreview = (slug: string) => {
    setSelectedLandingSlug(slug);
    setCurrentView('landing');
    navigate('/');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-brand font-bold text-2xl sm:text-3xl text-[#2F5233]">
            Campaign Landing Page Builder
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Create high-converting single-offer campaign pages with custom modular blocks.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-4 py-2 bg-[#2F5233] hover:bg-[#3D6B45] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Campaign Page</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {landingPages.map(page => (
          <div
            key={page.id}
            className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">
                  /landing/{page.slug}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    page.isPublished
                      ? 'bg-[#2F5233]/10 text-[#2F5233]'
                      : 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  {page.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>

              <h3 className="font-serif-brand font-bold text-base text-[#2A2A28] mt-2">
                {page.title}
              </h3>
              <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{page.seoDescription}</p>

              <div className="mt-3 flex items-center gap-2 text-xs text-neutral-600">
                <Sparkles className="w-3.5 h-3.5 text-[#D9A441]" />
                <span>{page.blocks.length} Content Blocks</span>
              </div>
            </div>

            <div className="pt-3 border-t flex items-center justify-between">
              <button
                onClick={() => handlePreview(page.slug)}
                className="text-xs font-bold text-[#2F5233] hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Preview Page</span>
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => togglePublishLandingPage(page.id)}
                  className="p-1.5 rounded-lg border hover:bg-[#FAF7F2] text-neutral-600"
                  title={page.isPublished ? 'Unpublish' : 'Publish'}
                >
                  {page.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setSelectedPage(page)}
                  className="p-1.5 rounded-lg border hover:bg-[#FAF7F2] text-neutral-600"
                  title="Edit Settings"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete ${page.title}?`)) {
                      deleteLandingPage(page.id);
                    }
                  }}
                  className="p-1.5 rounded-lg border hover:bg-red-50 text-neutral-400 hover:text-red-600"
                  title="Delete Campaign"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Edit Modal */}
      {selectedPage && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-serif-brand font-bold text-lg text-[#2F5233]">
              Edit Campaign Details
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Campaign Title</label>
                <input
                  type="text"
                  value={selectedPage.title}
                  onChange={e => setSelectedPage({ ...selectedPage, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">URL Slug</label>
                <input
                  type="text"
                  value={selectedPage.slug}
                  onChange={e => setSelectedPage({ ...selectedPage, slug: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">SEO Description</label>
                <textarea
                  rows={2}
                  value={selectedPage.seoDescription || ''}
                  onChange={e =>
                    setSelectedPage({ ...selectedPage, seoDescription: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPage(null)}
                className="px-4 py-2 text-neutral-500 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  updateLandingPage(selectedPage.id, {
                    title: selectedPage.title,
                    slug: selectedPage.slug,
                    seoDescription: selectedPage.seoDescription
                  });
                  setSelectedPage(null);
                }}
                className="px-5 py-2 bg-[#2F5233] text-white rounded-xl font-bold text-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
