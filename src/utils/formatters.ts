/**
 * Utility formatters for GoodZeed
 */

export function formatCurrency(amount: number): string {
  return `৳${Math.round(amount).toLocaleString('en-BD')}`;
}

export function normalizePhoneNumber(phone: string): string {
  // Strip all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If starts with 880 (e.g. 8801712345678), convert to standard 01712345678
  if (digits.startsWith('880') && digits.length === 13) {
    return '0' + digits.slice(3);
  }
  
  // If already 11 digits starting with 01
  if (digits.startsWith('01') && digits.length === 11) {
    return digits;
  }

  // If 10 digits starting with 1
  if (digits.startsWith('1') && digits.length === 10) {
    return '0' + digits;
  }

  return digits;
}

export function isValidBdPhone(phone: string): boolean {
  const norm = normalizePhoneNumber(phone);
  // Bangladeshi phone numbers: 01 followed by 3-9 and 8 more digits (total 11 digits)
  return /^01[3-9]\d{8}$/.test(norm);
}

export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

export function formatShortDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return isoString;
  }
}

export function generateOrderNumber(): string {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `GZ-${new Date().getFullYear()}-${random}`;
}

export function generateInvoiceNumber(sequence: number): string {
  const padded = String(sequence).padStart(6, '0');
  return `GZ-INV-${padded}`;
}
