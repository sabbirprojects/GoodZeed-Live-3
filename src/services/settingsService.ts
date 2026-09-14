import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { StoreSettings, DeliveryZone } from '../types';

export const fetchStoreSettings = async (): Promise<StoreSettings | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) return null;

    return {
      storeName: data.store_name,
      storeTagline: data.store_tagline,
      storeContactPhone: data.store_contact_phone,
      storeContactEmail: data.store_contact_email,
      storeAddress: data.store_address,
      bkashReceivingNumber: data.bkash_receiving_number,
      bkashInstructions: data.bkash_instructions,
      nagadReceivingNumber: data.nagad_receiving_number,
      nagadInstructions: data.nagad_instructions,
      defaultSeoTitle: data.default_seo_title,
      defaultSeoDescription: data.default_seo_description,
      currencySymbol: data.currency_symbol || '৳',
      faviconPath: data.favicon_path || undefined,
      whatsappSupportNumber: data.whatsapp_support_number || undefined,
      supportHours: data.support_hours || undefined,
      aiAssistantEnabled: data.ai_assistant_enabled !== false,
      aiWelcomeMessage: data.ai_welcome_message || undefined,
      returnPolicy: data.return_policy || undefined,
      cancellationPolicy: data.cancellation_policy || undefined,
      refundPolicy: data.refund_policy || undefined,
      supportFAQ: data.support_faq || undefined
    };
  } catch (err) {
    console.warn('[settingsService] fetchStoreSettings fallback:', err);
    return null;
  }
};

export const saveStoreSettings = async (settings: Partial<StoreSettings>): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  try {
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    if (settings.storeName !== undefined) updates.store_name = settings.storeName;
    if (settings.storeTagline !== undefined) updates.store_tagline = settings.storeTagline;
    if (settings.storeContactPhone !== undefined) updates.store_contact_phone = settings.storeContactPhone;
    if (settings.storeContactEmail !== undefined) updates.store_contact_email = settings.storeContactEmail;
    if (settings.storeAddress !== undefined) updates.store_address = settings.storeAddress;
    if (settings.bkashReceivingNumber !== undefined) updates.bkash_receiving_number = settings.bkashReceivingNumber;
    if (settings.bkashInstructions !== undefined) updates.bkash_instructions = settings.bkashInstructions;
    if (settings.nagadReceivingNumber !== undefined) updates.nagad_receiving_number = settings.nagadReceivingNumber;
    if (settings.nagadInstructions !== undefined) updates.nagad_instructions = settings.nagadInstructions;
    if (settings.defaultSeoTitle !== undefined) updates.default_seo_title = settings.defaultSeoTitle;
    if (settings.defaultSeoDescription !== undefined) updates.default_seo_description = settings.defaultSeoDescription;
    if (settings.currencySymbol !== undefined) updates.currency_symbol = settings.currencySymbol;
    if (settings.faviconPath !== undefined) updates.favicon_path = settings.faviconPath;
    if (settings.whatsappSupportNumber !== undefined) updates.whatsapp_support_number = settings.whatsappSupportNumber;
    if (settings.supportHours !== undefined) updates.support_hours = settings.supportHours;
    if (settings.aiAssistantEnabled !== undefined) updates.ai_assistant_enabled = settings.aiAssistantEnabled;
    if (settings.aiWelcomeMessage !== undefined) updates.ai_welcome_message = settings.aiWelcomeMessage;
    if (settings.returnPolicy !== undefined) updates.return_policy = settings.returnPolicy;
    if (settings.cancellationPolicy !== undefined) updates.cancellation_policy = settings.cancellationPolicy;
    if (settings.refundPolicy !== undefined) updates.refund_policy = settings.refundPolicy;
    if (settings.supportFAQ !== undefined) updates.support_faq = settings.supportFAQ;

    const { error } = await supabase
      .from('store_settings')
      .update(updates)
      .eq('id', 1);

    return !error;
  } catch {
    return false;
  }
};

export const fetchDeliveryZones = async (): Promise<DeliveryZone[] | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('delivery_zones')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return (data || []).map(z => ({
      id: z.id,
      name: z.name,
      charge: Number(z.charge),
      estimatedDeliveryTime: z.estimated_delivery_time,
      isEnabled: z.is_enabled,
      sortOrder: z.sort_order
    }));
  } catch (err) {
    console.warn('[settingsService] fetchDeliveryZones fallback:', err);
    return null;
  }
};

export const saveDeliveryZone = async (zone: DeliveryZone): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  try {
    const { error } = await supabase.from('delivery_zones').upsert({
      id: zone.id,
      name: zone.name,
      charge: zone.charge,
      estimated_delivery_time: zone.estimatedDeliveryTime,
      is_enabled: zone.isEnabled,
      sort_order: zone.sortOrder,
      updated_at: new Date().toISOString()
    });
    return !error;
  } catch {
    return false;
  }
};
