export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AdminRole = 'SUPER_ADMIN' | 'STORE_MANAGER' | 'ORDER_DISPATCHER' | 'SUPPORT_AGENT';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURN_APPROVED'
  | 'RETURN_REJECTED';

export type PaymentMethod = 'COD' | 'BKASH' | 'NAGAD';

export type PaymentStatus =
  | 'PENDING'
  | 'AWAITING_VERIFICATION'
  | 'PAID'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export type DeliveryMethod = 'OWN_DELIVERY' | 'COURIER';

export type DeliveryStatus =
  | 'NOT_DISPATCHED'
  | 'DISPATCHED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DELIVERY_FAILED';

export type SupportStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED';

export type SizeUnit = 'g' | 'kg' | 'ml' | 'l' | 'pcs';
