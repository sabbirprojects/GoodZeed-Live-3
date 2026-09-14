import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { Order, Customer, OrderStatus, PaymentStatus, DeliveryStatus, CheckoutPayload } from '../types';

export const fetchOrders = async (): Promise<Order[] | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('orders_view')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data as Order[];
  } catch (err) {
    console.warn('[orderService] fetchOrders fallback:', err);
    return null;
  }
};

export const fetchCustomers = async (): Promise<Customer[] | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(c => ({
      id: c.id,
      name: c.name,
      phoneNormalized: c.phone_normalized,
      phoneRaw: c.phone_raw,
      email: c.email || undefined,
      defaultAddress: c.default_address || undefined,
      totalOrders: c.total_orders,
      totalSpend: Number(c.total_spend),
      lastOrderAt: c.last_order_at || '',
      status: c.status,
      adminNote: c.admin_note || undefined,
      createdAt: c.created_at
    }));
  } catch (err) {
    console.warn('[orderService] fetchCustomers fallback:', err);
    return null;
  }
};

export const submitCheckoutRPC = async (
  payload: CheckoutPayload
): Promise<{ success: boolean; order?: Order; error?: string }> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase unconfigured, use local fallback' };
  }
  try {
    const { data, error } = await supabase.rpc('submit_checkout', { payload });
    if (error) {
      console.error('[orderService] submit_checkout RPC error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, order: data as Order };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Checkout failed' };
  }
};

export const lookupOrderRPC = async (
  phone: string,
  orderNumber: string
): Promise<Order | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.rpc('lookup_order', {
      p_phone: phone,
      p_order_number: orderNumber
    });
    if (error || !data) return null;
    return data as Order;
  } catch {
    return null;
  }
};

export const transitionOrderStatusRPC = async (
  orderId: string,
  newStatus: OrderStatus
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  try {
    const { error } = await supabase.rpc('transition_order_status', {
      p_order_id: orderId,
      p_new_status: newStatus
    });
    return !error;
  } catch {
    return false;
  }
};

export const updatePaymentRecord = async (
  orderId: string,
  status: PaymentStatus,
  decision?: string,
  notes?: string
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  try {
    const updates: Record<string, any> = {
      status,
      updated_at: new Date().toISOString()
    };
    if (decision) {
      updates.verified_at = new Date().toISOString();
      updates.notes = notes || null;
    }
    const { error } = await supabase
      .from('order_payments')
      .update(updates)
      .eq('order_id', orderId);

    return !error;
  } catch {
    return false;
  }
};

export const updateDeliveryRecord = async (
  orderId: string,
  status: DeliveryStatus,
  trackingNumber?: string
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  try {
    const updates: Record<string, any> = {
      status,
      updated_at: new Date().toISOString()
    };
    if (trackingNumber !== undefined) updates.tracking_number = trackingNumber;

    const { error } = await supabase
      .from('order_deliveries')
      .update(updates)
      .eq('order_id', orderId);

    return !error;
  } catch {
    return false;
  }
};

export const addInternalNote = async (
  orderId: string,
  note: string,
  createdBy: string = 'Admin'
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  try {
    const { error } = await supabase.from('order_internal_notes').insert({
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      order_id: orderId,
      note,
      created_by: createdBy
    });
    return !error;
  } catch {
    return false;
  }
};

export const incrementInvoiceReprintRPC = async (orderId: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  try {
    const { data: inv } = await supabase
      .from('order_invoices')
      .select('reprinted_count')
      .eq('order_id', orderId)
      .single();

    if (inv) {
      await supabase
        .from('order_invoices')
        .update({ reprinted_count: (inv.reprinted_count || 0) + 1 })
        .eq('order_id', orderId);
    }
    return true;
  } catch {
    return false;
  }
};

export const updateCustomerNote = async (
  customerId: string,
  note: string
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  try {
    const { error } = await supabase
      .from('customers')
      .update({ admin_note: note, updated_at: new Date().toISOString() })
      .eq('id', customerId);
    return !error;
  } catch {
    return false;
  }
};
