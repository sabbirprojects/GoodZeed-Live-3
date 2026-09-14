import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { Review, SupportTicket, SupportStatus } from '../types';

export const fetchReviews = async (): Promise<Review[] | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(r => ({
      id: r.id,
      productId: r.product_id,
      productName: r.product_name || undefined,
      reviewerName: r.reviewer_name,
      reviewerPhone: r.reviewer_phone,
      rating: r.rating,
      reviewText: r.review_text,
      isVerifiedPurchase: r.is_verified_purchase,
      moderationStatus: r.moderation_status,
      createdAt: r.created_at
    }));
  } catch (err) {
    console.warn('[supportService] fetchReviews fallback:', err);
    return null;
  }
};

export const submitReview = async (review: Review): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  try {
    const { error } = await supabase.from('reviews').insert({
      id: review.id,
      product_id: review.productId,
      product_name: review.productName || null,
      reviewer_name: review.reviewerName,
      reviewer_phone: review.reviewerPhone,
      rating: review.rating,
      review_text: review.reviewText,
      is_verified_purchase: review.isVerifiedPurchase,
      moderation_status: 'PENDING',
      created_at: review.createdAt
    });
    return !error;
  } catch {
    return false;
  }
};

export const moderateReview = async (
  reviewId: string,
  decision: 'APPROVED' | 'REJECTED'
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  try {
    const { error } = await supabase
      .from('reviews')
      .update({ moderation_status: decision })
      .eq('id', reviewId);
    return !error;
  } catch {
    return false;
  }
};

export const fetchSupportTickets = async (): Promise<SupportTicket[] | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(t => ({
      id: t.id,
      customerName: t.customer_name,
      customerPhone: t.customer_phone,
      customerEmail: t.customer_email || undefined,
      orderNumber: t.order_number || undefined,
      subject: t.subject,
      message: t.message,
      status: t.status as SupportStatus,
      adminNotes: t.admin_notes || undefined,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));
  } catch (err) {
    console.warn('[supportService] fetchSupportTickets fallback:', err);
    return null;
  }
};

export const submitSupportTicket = async (ticket: SupportTicket): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  try {
    const { error } = await supabase.from('support_tickets').insert({
      id: ticket.id,
      customer_name: ticket.customerName,
      customer_phone: ticket.customerPhone,
      customer_email: ticket.customerEmail || null,
      order_number: ticket.orderNumber || null,
      subject: ticket.subject,
      message: ticket.message,
      status: 'OPEN',
      admin_notes: ticket.adminNotes || null,
      created_at: ticket.createdAt,
      updated_at: ticket.updatedAt
    });
    return !error;
  } catch {
    return false;
  }
};

export const updateSupportTicketStatus = async (
  id: string,
  status: SupportStatus
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  try {
    const { error } = await supabase
      .from('support_tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    return !error;
  } catch {
    return false;
  }
};

export const updateSupportTicketNotes = async (
  id: string,
  notes: string
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  try {
    const { error } = await supabase
      .from('support_tickets')
      .update({ admin_notes: notes, updated_at: new Date().toISOString() })
      .eq('id', id);
    return !error;
  } catch {
    return false;
  }
};
