import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Review } from '../../types';
import { formatDate } from '../../utils/formatters';
import { MessageSquare, Star, CheckCircle2, XCircle } from 'lucide-react';

export const AdminReviews: React.FC = () => {
  const { reviews, products, moderateReview } = useStore();
  const [filter, setFilter] = useState<string>('PENDING');

  const filteredReviews = reviews.filter(r => filter === 'ALL' || r.moderationStatus === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-brand font-bold text-2xl sm:text-3xl text-[#2F5233]">
            Customer Reviews Moderation
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Moderate customer feedback and verify genuine buyers before publishing to product pages.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 text-xs">
        {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(st => {
          const count = st === 'ALL' ? reviews.length : reviews.filter(r => r.moderationStatus === st).length;
          return (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${
                filter === st
                  ? 'bg-[#2F5233] text-white'
                  : 'bg-white text-neutral-600 hover:bg-neutral-100 border'
              }`}
            >
              {st} ({count})
            </button>
          );
        })}
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {filteredReviews.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl border text-center text-xs text-neutral-400">
            No reviews in this queue.
          </div>
        ) : (
          filteredReviews.map(rev => {
            const product = products.find(p => p.id === rev.productId);

            return (
              <div
                key={rev.id}
                className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs flex flex-col sm:flex-row items-start justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#2A2A28]">{rev.reviewerName}</span>
                    <span className="text-xs text-neutral-400 font-mono">({rev.reviewerPhone})</span>
                    {rev.isVerifiedPurchase && (
                      <span className="inline-flex items-center gap-1 bg-[#2F5233]/10 text-[#2F5233] text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-[#2F5233]" /> Verified Delivered Buyer
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex text-[#D9A441] text-xs">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <span key={i}>★</span>
                      ))}
                    </div>
                    <span className="text-xs text-neutral-500">
                      on <strong className="text-[#2F5233]">{product?.name || rev.productName || 'Product'}</strong>
                    </span>
                    <span className="text-[10px] text-neutral-400">• {formatDate(rev.createdAt)}</span>
                  </div>

                  <p className="text-xs text-neutral-700 leading-relaxed bg-[#FAF7F2] p-3 rounded-xl border">
                    "{rev.reviewText}"
                  </p>
                </div>

                <div className="flex sm:flex-col items-center gap-1.5 shrink-0 self-end sm:self-center">
                  {rev.moderationStatus !== 'APPROVED' && (
                    <button
                      onClick={() => moderateReview(rev.id, 'APPROVED')}
                      className="px-3 py-1.5 bg-[#2F5233] hover:bg-[#3D6B45] text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  )}

                  {rev.moderationStatus !== 'REJECTED' && (
                    <button
                      onClick={() => moderateReview(rev.id, 'REJECTED')}
                      className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
