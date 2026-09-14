import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { SupportTicket, SupportStatus } from '../../types';
import { formatDate } from '../../utils/formatters';
import {
  LifeBuoy, ChevronDown, ChevronUp, Save, MessageSquare,
  Clock, CheckCircle2, AlertCircle, Loader2, Phone, Mail, Package, User
} from 'lucide-react';

const STATUS_CONFIG: Record<SupportStatus, { label: string; color: string; icon: React.ReactNode }> = {
  OPEN: { label: 'Open', color: 'bg-red-100 text-red-700 border-red-200', icon: <AlertCircle className="w-3 h-3" /> },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Loader2 className="w-3 h-3" /> },
  WAITING: { label: 'Waiting', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock className="w-3 h-3" /> },
  RESOLVED: { label: 'Resolved', color: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle2 className="w-3 h-3" /> }
};

const STATUS_TRANSITIONS: Record<SupportStatus, SupportStatus[]> = {
  OPEN: ['IN_PROGRESS', 'WAITING', 'RESOLVED'],
  IN_PROGRESS: ['WAITING', 'RESOLVED', 'OPEN'],
  WAITING: ['IN_PROGRESS', 'RESOLVED', 'OPEN'],
  RESOLVED: ['OPEN']
};

const ALL_FILTERS: (SupportStatus | 'ALL')[] = ['ALL', 'OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED'];

export const AdminSupport: React.FC = () => {
  const { supportTickets, updateSupportTicketStatus, updateSupportTicketNotes } = useStore();
  const [filter, setFilter] = useState<SupportStatus | 'ALL'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const filtered = supportTickets
    .filter(t => filter === 'ALL' || t.status === filter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
    if (!notes[id]) {
      const t = supportTickets.find(x => x.id === id);
      if (t) setNotes(prev => ({ ...prev, [id]: t.adminNotes || '' }));
    }
  };

  const handleSaveNotes = (id: string) => {
    updateSupportTicketNotes(id, notes[id] || '');
  };

  const counts = {
    ALL: supportTickets.length,
    OPEN: supportTickets.filter(t => t.status === 'OPEN').length,
    IN_PROGRESS: supportTickets.filter(t => t.status === 'IN_PROGRESS').length,
    WAITING: supportTickets.filter(t => t.status === 'WAITING').length,
    RESOLVED: supportTickets.filter(t => t.status === 'RESOLVED').length
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-brand font-bold text-2xl sm:text-3xl text-[#2F5233] flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-[#D9A441]" />
            Support Tickets
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Customer support requests from the contact form
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-[#2F5233]">{counts.OPEN}</span>
          <span className="text-xs text-neutral-500 block">open tickets</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {ALL_FILTERS.map(f => {
          const count = counts[f];
          const isActive = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#2F5233] text-white border-[#2F5233]'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-[#2F5233]/30'
              }`}
            >
              {f === 'ALL' ? 'All' : STATUS_CONFIG[f as SupportStatus].label}
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Ticket List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200">
          <MessageSquare className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500 text-sm font-medium">No support tickets found</p>
          <p className="text-neutral-400 text-xs mt-1">
            {filter === 'ALL' ? 'No support requests have been submitted yet.' : `No ${STATUS_CONFIG[filter as SupportStatus]?.label.toLowerCase()} tickets.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket: SupportTicket) => {
            const isExpanded = expandedId === ticket.id;
            const sc = STATUS_CONFIG[ticket.status];

            return (
              <div key={ticket.id} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
                {/* Ticket Header Row */}
                <button
                  onClick={() => toggleExpand(ticket.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-neutral-50 transition-colors"
                >
                  {/* Status Badge */}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold shrink-0 ${sc.color}`}>
                    {sc.icon}
                    {sc.label}
                  </span>

                  {/* Subject + Customer */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[#2A2A28] truncate">{ticket.subject}</p>
                    <p className="text-[11px] text-neutral-500 flex items-center gap-1.5 mt-0.5">
                      <User className="w-3 h-3 shrink-0" />
                      {ticket.customerName}
                      {ticket.orderNumber && (
                        <>
                          <span className="text-neutral-300">·</span>
                          <Package className="w-3 h-3 shrink-0" />
                          <span className="font-mono">{ticket.orderNumber}</span>
                        </>
                      )}
                      <span className="text-neutral-300">·</span>
                      {formatDate(ticket.createdAt)}
                    </p>
                  </div>

                  {/* Expand Chevron */}
                  <div className="text-neutral-400 shrink-0">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-neutral-100 p-4 space-y-4 text-xs">
                    {/* Contact Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-[#FAF7F2] rounded-xl p-3 space-y-1.5">
                        <span className="font-bold text-[10px] uppercase tracking-wider text-neutral-400 block">Customer</span>
                        <p className="font-bold text-[#2A2A28] flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#2F5233]" />
                          {ticket.customerName}
                        </p>
                        <p className="text-neutral-600 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-[#2F5233]" />
                          {ticket.customerPhone}
                        </p>
                        {ticket.customerEmail && (
                          <p className="text-neutral-600 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-[#2F5233]" />
                            {ticket.customerEmail}
                          </p>
                        )}
                        {ticket.orderNumber && (
                          <p className="text-neutral-600 flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-[#2F5233]" />
                            <span className="font-mono">{ticket.orderNumber}</span>
                          </p>
                        )}
                      </div>

                      {/* Ticket Metadata */}
                      <div className="bg-[#FAF7F2] rounded-xl p-3 space-y-1.5">
                        <span className="font-bold text-[10px] uppercase tracking-wider text-neutral-400 block">Ticket Info</span>
                        <p className="text-neutral-600">ID: <span className="font-mono text-[10px]">{ticket.id.slice(0, 20)}…</span></p>
                        <p className="text-neutral-600">Created: {formatDate(ticket.createdAt)}</p>
                        <p className="text-neutral-600">Updated: {formatDate(ticket.updatedAt)}</p>
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <span className="font-bold text-[10px] uppercase tracking-wider text-neutral-400 block mb-1.5">Message</span>
                      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-neutral-700 leading-relaxed whitespace-pre-wrap">
                        {ticket.message}
                      </div>
                    </div>

                    {/* Status Control */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[10px] uppercase tracking-wider text-neutral-400">Change Status:</span>
                      {STATUS_TRANSITIONS[ticket.status].map(next => (
                        <button
                          key={next}
                          onClick={() => updateSupportTicketStatus(ticket.id, next)}
                          className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-colors ${STATUS_CONFIG[next].color} hover:opacity-80`}
                        >
                          → {STATUS_CONFIG[next].label}
                        </button>
                      ))}
                    </div>

                    {/* Admin Notes */}
                    <div>
                      <span className="font-bold text-[10px] uppercase tracking-wider text-neutral-400 block mb-1.5">Admin Notes (private)</span>
                      <textarea
                        rows={3}
                        value={notes[ticket.id] ?? ''}
                        onChange={e => setNotes(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                        placeholder="Add internal notes about this ticket…"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs resize-none focus:outline-none focus:ring-2 focus:ring-[#2F5233]/30"
                      />
                      <button
                        onClick={() => handleSaveNotes(ticket.id)}
                        className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-[#2F5233] text-white rounded-lg text-[10px] font-bold hover:bg-[#3D6B45] transition-colors"
                      >
                        <Save className="w-3 h-3" />
                        Save Notes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
