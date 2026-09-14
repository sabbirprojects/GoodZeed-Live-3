import React from 'react';
import { useStore, ADMIN_PORTAL_PATH } from '../../context/StoreContext';
import { ShieldCheck, Truck, Phone, Mail, MapPin, Heart, CheckCircle2 } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

export const Footer: React.FC = () => {
  const { settings, categories, setCurrentView, setSelectedCategorySlug, setSelectedLandingSlug, adminUser } = useStore();

  return (
    <footer className="bg-[#26442A] text-white/90 pt-16 pb-24 md:pb-12 border-t border-[#1E3621]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Trust Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-12 border-b border-white/10">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#D9A441]/20 flex items-center justify-center text-[#D9A441] shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">100% Pure & Lab Tested</h4>
              <p className="text-xs text-white/70 mt-1">
                Zero sugar syrup adulteration, unheated raw honey, authentic wooden ghani oils.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#D9A441]/20 flex items-center justify-center text-[#D9A441] shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Nationwide Express Delivery</h4>
              <p className="text-xs text-white/70 mt-1">
                Inside Dhaka 24-48 hours. Outside Dhaka 2-4 business days across all 64 districts.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#D9A441]/20 flex items-center justify-center text-[#D9A441] shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Cash on Delivery (COD)</h4>
              <p className="text-xs text-white/70 mt-1">
                Pay after receiving and checking the package. Also accepts bKash and Nagad.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#D9A441]/20 flex items-center justify-center text-[#D9A441] shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Dedicated Customer Care</h4>
              <p className="text-xs text-white/70 mt-1">
                Direct phone & WhatsApp support for queries, re-orders, and pure food advice.
              </p>
            </div>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 py-12 border-b border-white/10 text-sm">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <BrandLogo size="lg" theme="dark-bg" showSubtitle={false} />
            <p className="text-white/75 text-xs sm:text-sm leading-relaxed max-w-sm">
              GoodZeed is Bangladesh’s dedicated D2C platform for natural, unadulterated everyday
              foods. We work directly with Sundarban honey collectors, organic seed farmers, and
              traditional cold-press artisans to make pure food accessible at honest prices.
            </p>
            <div className="pt-2 text-xs text-[#D9A441] flex items-center gap-1.5 font-medium">
              <Heart className="w-3.5 h-3.5 fill-[#D9A441]" /> Proudly pure & made for Bangladesh
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-4 text-[#D9A441]">
              Natural Catalog
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-white/75">
              {categories
                .filter(c => c.isEnabled)
                .map(cat => (
                  <li key={cat.id}>
                    <button
                      onClick={() => {
                        setSelectedCategorySlug(cat.slug);
                        setCurrentView('category');
                      }}
                      className="hover:text-white transition-colors text-left"
                    >
                      {cat.name}
                    </button>
                  </li>
                ))}
              <li>
                <button
                  onClick={() => {
                    setSelectedCategorySlug(null);
                    setCurrentView('shop');
                  }}
                  className="text-[#D9A441] hover:underline"
                >
                  View All Products →
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Service & Navigation */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-4 text-[#D9A441]">
              Customer Service
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-white/75">
              <li>
                <button
                  onClick={() => setCurrentView('track-order')}
                  className="hover:text-white transition-colors"
                >
                  Track My Order
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setSelectedLandingSlug('energy-nut-mix-40tk');
                    setCurrentView('landing');
                  }}
                  className="hover:text-white transition-colors"
                >
                  Energy Nut Mix ৳40 Campaign
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setSelectedLandingSlug('pure-sundarban-honey');
                    setCurrentView('landing');
                  }}
                  className="hover:text-white transition-colors"
                >
                  Sundarban Honey Campaign
                </button>
              </li>
              {adminUser && (
                <li>
                  <a
                    href={ADMIN_PORTAL_PATH}
                    className="hover:text-white transition-colors text-white/60 hover:text-white"
                  >
                    Admin Portal
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-4 text-[#D9A441]">
              Direct Contact
            </h4>
            <ul className="space-y-3 text-xs text-white/75">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#D9A441] shrink-0 mt-0.5" />
                <span>{settings.storeAddress}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#D9A441] shrink-0" />
                <a href={`tel:${settings.storeContactPhone}`} className="hover:text-white">
                  {settings.storeContactPhone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#D9A441] shrink-0" />
                <a href={`mailto:${settings.storeContactEmail}`} className="hover:text-white">
                  {settings.storeContactEmail}
                </a>
              </li>
            </ul>

            <div className="mt-4 pt-3 border-t border-white/10">
              <span className="text-[11px] text-white/60 block mb-1.5 font-medium">
                Payments Accepted:
              </span>
              <div className="flex items-center gap-2 text-[10px] font-bold">
                <span className="bg-white/10 px-2 py-1 rounded text-white">Cash on Delivery</span>
                <span className="bg-[#e2136e]/80 px-2 py-1 rounded text-white">bKash</span>
                <span className="bg-[#f7941d]/80 px-2 py-1 rounded text-white">Nagad</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/60">
          <p>© {new Date().getFullYear()} GoodZeed Bangladesh. All rights reserved. 100% Pure & Natural Food.</p>
          <div className="flex items-center gap-6">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Returns & Refund Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
