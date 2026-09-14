import React, { useState, useEffect } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { useStore } from '../../context/StoreContext';
import { PaymentMethod, CartItem } from '../../types';
import { formatCurrency, isValidBdPhone, normalizePhoneNumber } from '../../utils/formatters';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Truck,
  ShieldCheck,
  Lock,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  Banknote,
  HelpCircle,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BrandLogo } from '../common/BrandLogo';

export type CheckoutStep = 1 | 2 | 3 | 4;

interface CheckoutViewProps {
  currentStep?: CheckoutStep;
  onStepClick?: (step: CheckoutStep) => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({ currentStep: controlledCurrentStep, onStepClick }) => {
  const [internalCurrentStep, setInternalCurrentStep] = useState<CheckoutStep>(1);
  const currentStep = controlledCurrentStep ?? internalCurrentStep;

  const {
    cart,
    buyNowItem,
    setBuyNowItem,
    checkoutPrefill,
    setCheckoutPrefill,
    deliveryZones,
    settings,
    submitCheckout,
    setCurrentView,
    showToast
  } = useStore();

  // Determine items being checked out (Buy Now vs Regular Cart)
  const isBuyNow = !!buyNowItem;
  const items: CartItem[] = isBuyNow && buyNowItem ? [buyNowItem] : cart;

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryZoneId, setDeliveryZoneId] = useState<string>(
    deliveryZones[0]?.id || 'zone-dhaka'
  );
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [transactionId, setTransactionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    phone?: string;
    address?: string;
    transactionId?: string;
  }>({});
  const [summaryOpen, setSummaryOpen] = useState(true);

  // Prefill from campaign Quick Order Form (name/phone/address typed on the
  // landing page) so checkout opens filled, not empty. Consumed once.
  useEffect(() => {
    if (checkoutPrefill) {
      if (checkoutPrefill.name) setCustomerName(checkoutPrefill.name);
      if (checkoutPrefill.phone) setCustomerPhone(checkoutPrefill.phone);
      if (checkoutPrefill.address) setDeliveryAddress(checkoutPrefill.address);
      setCheckoutPrefill(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Safe selected zone with fallback
  const selectedZone =
    deliveryZones.find(z => z.id === deliveryZoneId) ||
    deliveryZones[0] || {
      id: 'zone-dhaka',
      name: 'Dhaka City Metro',
      charge: 70,
      estimatedDeliveryTime: '24-48 Hours',
      isEnabled: true
    };

  const deliveryCharge = selectedZone.charge;
  const subtotal = items.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
  const total = subtotal + deliveryCharge;

  // Validate form in JavaScript (Prevents silent native browser submission aborts)
  const validateForm = () => {
    const newErrors: {
      name?: string;
      phone?: string;
      address?: string;
      transactionId?: string;
    } = {};

    if (!customerName.trim()) {
      newErrors.name = 'Please enter your full name';
    }

    if (!customerPhone.trim()) {
      newErrors.phone = 'Please enter your phone number';
    } else if (!isValidBdPhone(customerPhone)) {
      newErrors.phone = 'Please enter a valid 11-digit Bangladeshi mobile number (e.g. 017XXXXXXXX)';
    }

    if (!deliveryAddress.trim()) {
      newErrors.address = 'Please provide your full delivery address (House, Road, Area, District)';
    }

    if ((paymentMethod === 'BKASH' || paymentMethod === 'NAGAD') && !transactionId.trim()) {
      newErrors.transactionId = `Please enter your ${paymentMethod} TrxID or click "Pay After Call"`;
    }

    setErrors(newErrors);
    return newErrors;
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      showToast('Your order has no items.', 'error');
      return;
    }

    const validationErrors = validateForm();
    const errorKeys = Object.keys(validationErrors);

    if (errorKeys.length > 0) {
      // Scroll to the first invalid field and focus it
      const firstKey = errorKeys[0];
      const targetInputId =
        firstKey === 'name'
          ? 'checkout-name-input'
          : firstKey === 'phone'
          ? 'checkout-phone-input'
          : firstKey === 'address'
          ? 'checkout-address-input'
          : 'checkout-trxid-input';

      const el = document.getElementById(targetInputId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }

      showToast(validationErrors[firstKey as keyof typeof validationErrors] || 'Please complete required fields', 'error');
      return;
    }

    setIsSubmitting(true);

    // Call checkout atomic transaction
    setTimeout(() => {
      try {
        const result = submitCheckout({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || undefined,
          deliveryDistrict: selectedZone.name || 'Dhaka Metro',
          deliveryZoneId: selectedZone.id || 'zone-dhaka',
          deliveryAddress: deliveryAddress.trim(),
          deliveryNotes: deliveryNotes.trim() || undefined,
          paymentMethod,
          transactionId: transactionId.trim() || undefined,
          items,
          isBuyNow
        });

        setIsSubmitting(false);

        if (result.success && result.order) {
          // Trigger celebratory confetti
          try {
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.6 }
            });
          } catch {
            // ignore if canvas not supported
          }

          showToast('Order confirmed! Order ID: ' + result.order.orderNumber, 'success');
          setCurrentView('confirmation');
        } else {
          showToast(result.error || 'Failed to place order. Please try again.', 'error');
        }
      } catch (err: any) {
        setIsSubmitting(false);
        showToast('Error placing order: ' + (err?.message || 'Please try again'), 'error');
      }
    }, 400);
  };

  // Quick 1-Click Test Data Autofill (Helps user/tester test order flow in 1 second)
  const handleAutofillDemo = () => {
    setCustomerName('Sabbir Ahmed');
    setCustomerPhone('01712345678');
    setDeliveryAddress('House 14, Road 5, Block B, Dhanmondi, Dhaka');
    setDeliveryZoneId(deliveryZones[0]?.id || 'zone-dhaka');
    setPaymentMethod('COD');
    setErrors({});
    showToast('Demo details filled! Click "Confirm & Place Order"', 'info');
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif-brand text-2xl font-bold text-[#2F5233]">
          No items to checkout
        </h2>
        <p className="text-sm text-neutral-500">
          Your cart is currently empty. Please select natural food products to continue.
        </p>
        <button
          onClick={() => setCurrentView('shop')}
          className="px-6 py-2.5 bg-[#2F5233] text-white text-xs font-bold rounded-xl hover:bg-[#3D6B45]"
        >
          Return to Shop
        </button>
      </div>
    );
  }

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="bg-[#FAF7F2] min-h-screen py-6 sm:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb & Quick Test Action */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            id="checkout-back-btn"
            type="button"
            onClick={() => {
              if (isBuyNow) {
                setBuyNowItem(null);
                setCurrentView('shop');
              } else {
                setCurrentView('cart');
              }
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-[#2F5233] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isBuyNow ? 'Cancel & Return to Shop' : 'Back to Cart'}</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              id="checkout-quick-fill-btn"
              onClick={handleAutofillDemo}
              className="px-3 py-1 bg-[#D9A441]/15 hover:bg-[#D9A441]/25 text-[#2A2A28] border border-[#D9A441]/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Autofill valid test name and address"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D9A441]" />
              <span>⚡ 1-Click Test Fill</span>
            </button>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#2F5233] font-semibold">
              <Lock className="w-3.5 h-3.5 text-[#D9A441]" />
              <span>Secure Guest Checkout</span>
            </div>
          </div>
        </div>

        {/* Branded Checkout Header */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#2F5233]/15 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" theme="light-bg" showSubtitle={true} />
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-600">
            <div className="flex items-center gap-1.5 font-medium text-[#2F5233] bg-[#2F5233]/10 px-3 py-1.5 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-[#2F5233]" />
              <span>Guaranteed Pure &amp; Lab-Tested</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-neutral-500">
              <Truck className="w-4 h-4 text-[#D9A441]" />
              <span>Nationwide 64 Districts</span>
            </div>
          </div>
        </div>

        {/* Checkout Form - noValidate to avoid silent browser suppression */}
        <form onSubmit={handlePlaceOrder} noValidate className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Guest Delivery & Payment Form */}
          <div className="lg:col-span-7 space-y-6">
            {/* Contact & Delivery Section */}
            <div id="checkout-contact-section" className="bg-white rounded-2xl p-5 sm:p-7 border border-[#2F5233]/15 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="font-serif-brand font-bold text-lg text-[#2F5233] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#2F5233] text-white text-xs flex items-center justify-center font-sans">
                    1
                  </span>
                  <span>Contact & Delivery Address</span>
                </h3>
                <span className="text-[11px] font-bold text-[#D9A441] bg-[#D9A441]/10 px-2.5 py-0.5 rounded-full">
                  No Account Needed
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#2A2A28] mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="checkout-name-input"
                    type="text"
                    placeholder="e.g. Rima Sultana / ফারহান আহমেদ"
                    value={customerName}
                    onChange={e => {
                      setCustomerName(e.target.value);
                      if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                    }}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-2 bg-[#FAF7F2]/30 transition-colors ${
                      errors.name
                        ? 'border-red-500 focus:ring-red-400 bg-red-50/30'
                        : 'border-neutral-300 focus:ring-[#2F5233]'
                    }`}
                  />
                  {errors.name && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.name}</span>
                    </p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-bold text-[#2A2A28] mb-1">
                    Phone Number (11 digits) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="checkout-phone-input"
                    type="tel"
                    placeholder="017XXXXXXXX"
                    value={customerPhone}
                    onChange={e => {
                      setCustomerPhone(e.target.value);
                      if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }));
                    }}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-2 bg-[#FAF7F2]/30 transition-colors ${
                      errors.phone
                        ? 'border-red-500 focus:ring-red-400 bg-red-50/30'
                        : 'border-neutral-300 focus:ring-[#2F5233]'
                    }`}
                  />
                  {errors.phone ? (
                    <p className="text-[11px] text-red-600 mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.phone}</span>
                    </p>
                  ) : (
                    <span className="text-[10px] text-neutral-400 block mt-0.5">
                      For delivery coordination and courier call
                    </span>
                  )}
                </div>

                {/* Email (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-[#2A2A28] mb-1">
                    Email Address <span className="text-neutral-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="checkout-email-input"
                    type="email"
                    placeholder="name@gmail.com"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#2F5233] bg-[#FAF7F2]/30"
                  />
                  <span className="text-[10px] text-neutral-400 block mt-0.5">
                    For digital invoice and status copies
                  </span>
                </div>

                {/* Delivery Zone Selection */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#2A2A28] mb-1">
                    Delivery Zone & Charge <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {deliveryZones
                      .filter(z => z.isEnabled)
                      .map(zone => (
                        <button
                          key={zone.id}
                          type="button"
                          id={`zone-select-${zone.id}`}
                          onClick={() => setDeliveryZoneId(zone.id)}
                          className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2 ${
                            deliveryZoneId === zone.id
                              ? 'border-[#2F5233] bg-[#2F5233]/5 ring-1 ring-[#2F5233]'
                              : 'border-neutral-200 hover:bg-[#FAF7F2]'
                          }`}
                        >
                          <div>
                            <span className="font-bold text-xs sm:text-sm text-[#2A2A28] block">
                              {zone.name}
                            </span>
                            <span className="text-[11px] text-neutral-500 block mt-0.5">
                              Est: {zone.estimatedDeliveryTime}
                            </span>
                          </div>
                          <span className="font-bold text-xs sm:text-sm text-[#2F5233] shrink-0">
                            {formatCurrency(zone.charge)}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Full Delivery Address */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#2A2A28] mb-1">
                    Detailed Delivery Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="checkout-address-input"
                    rows={2}
                    placeholder="House / Flat No, Road / Sector, Area, Thana / District"
                    value={deliveryAddress}
                    onChange={e => {
                      setDeliveryAddress(e.target.value);
                      if (errors.address) setErrors(prev => ({ ...prev, address: undefined }));
                    }}
                    className={`w-full text-sm px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-2 bg-[#FAF7F2]/30 transition-colors ${
                      errors.address
                        ? 'border-red-500 focus:ring-red-400 bg-red-50/30'
                        : 'border-neutral-300 focus:ring-[#2F5233]'
                    }`}
                  />
                  {errors.address && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.address}</span>
                    </p>
                  )}
                </div>

                {/* Delivery Notes (Optional) */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#2A2A28] mb-1">
                    Special Delivery Instructions <span className="text-neutral-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="checkout-notes-input"
                    type="text"
                    placeholder="e.g. Call before delivery, Leave with security"
                    value={deliveryNotes}
                    onChange={e => setDeliveryNotes(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#2F5233] bg-[#FAF7F2]/30"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Payment Method */}
            <div id="checkout-payment-section" className="bg-white rounded-2xl p-5 sm:p-7 border border-[#2F5233]/15 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="font-serif-brand font-bold text-lg text-[#2F5233] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#2F5233] text-white text-xs flex items-center justify-center font-sans">
                    2
                  </span>
                  <span>Select Payment Method</span>
                </h3>
                <span className="text-[11px] font-bold text-[#2F5233] bg-[#2F5233]/10 px-2.5 py-0.5 rounded-full">
                  COD Available
                </span>
              </div>

              {/* Payment Method Cards */}
              <div className="space-y-3">
                {/* Cash on Delivery (COD) */}
                <label
                  id="pay-method-cod-label"
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    paymentMethod === 'COD'
                      ? 'border-[#2F5233] bg-[#2F5233]/5 ring-1 ring-[#2F5233]'
                      : 'border-neutral-200 hover:bg-[#FAF7F2]'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    checked={paymentMethod === 'COD'}
                    onChange={() => {
                      setPaymentMethod('COD');
                      setErrors(prev => ({ ...prev, transactionId: undefined }));
                    }}
                    className="mt-1 accent-[#2F5233]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs sm:text-sm text-[#2A2A28] flex items-center gap-1.5">
                        <Banknote className="w-4 h-4 text-[#2F5233]" /> Cash on Delivery (COD)
                      </span>
                      <span className="text-[10px] font-bold text-[#2F5233] bg-[#2F5233]/10 px-2 py-0.5 rounded">
                        Most Popular
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Pay in cash when your order arrives at your door. You can inspect the package before paying.
                    </p>
                  </div>
                </label>

                {/* bKash Manual Payment */}
                <label
                  id="pay-method-bkash-label"
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    paymentMethod === 'BKASH'
                      ? 'border-[#e2136e] bg-[#e2136e]/5 ring-1 ring-[#e2136e]'
                      : 'border-neutral-200 hover:bg-[#FAF7F2]'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="BKASH"
                    checked={paymentMethod === 'BKASH'}
                    onChange={() => setPaymentMethod('BKASH')}
                    className="mt-1 accent-[#e2136e]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs sm:text-sm text-[#2A2A28] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#e2136e]" /> bKash Send Money / Payment
                      </span>
                      <span className="text-[10px] font-bold text-[#e2136e] bg-[#e2136e]/10 px-2 py-0.5 rounded">
                        bKash
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Send payment to our verified bKash number and provide your Transaction ID (or pay upon call).
                    </p>
                  </div>
                </label>

                {/* Nagad Manual Payment */}
                <label
                  id="pay-method-nagad-label"
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    paymentMethod === 'NAGAD'
                      ? 'border-[#f7941d] bg-[#f7941d]/5 ring-1 ring-[#f7941d]'
                      : 'border-neutral-200 hover:bg-[#FAF7F2]'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="NAGAD"
                    checked={paymentMethod === 'NAGAD'}
                    onChange={() => setPaymentMethod('NAGAD')}
                    className="mt-1 accent-[#f7941d]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs sm:text-sm text-[#2A2A28] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#f7941d]" /> Nagad Manual Payment
                      </span>
                      <span className="text-[10px] font-bold text-[#f7941d] bg-[#f7941d]/10 px-2 py-0.5 rounded">
                        Nagad
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Send order total to our Nagad number and enter your Transaction ID.
                    </p>
                  </div>
                </label>
              </div>

              {/* bKash / Nagad Transaction ID & Instruction Box */}
              {(paymentMethod === 'BKASH' || paymentMethod === 'NAGAD') && (
                <div className="bg-[#FAF7F2] p-4 rounded-xl border border-neutral-200 space-y-3">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-[#D9A441] shrink-0 mt-0.5" />
                    <div className="text-xs text-neutral-700 leading-relaxed">
                      <strong className="block text-[#2F5233]">
                        {paymentMethod === 'BKASH' ? 'bKash Payment Guide:' : 'Nagad Payment Guide:'}
                      </strong>
                      <pre className="font-sans whitespace-pre-wrap text-[11px] text-neutral-600 mt-1">
                        {paymentMethod === 'BKASH'
                          ? settings.bkashInstructions
                          : settings.nagadInstructions}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-[#2A2A28]">
                        {paymentMethod} Transaction ID (TrxID) <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setTransactionId('PENDING-VERIFICATION');
                          setErrors(prev => ({ ...prev, transactionId: undefined }));
                          showToast('TrxID set to pending verification upon phone confirmation', 'info');
                        }}
                        className="text-[11px] text-[#2F5233] font-bold hover:underline"
                      >
                        ⚡ Pay After Call (Set Pending)
                      </button>
                    </div>

                    <input
                      id="checkout-trxid-input"
                      type="text"
                      placeholder="e.g. 9J8B7G6F / PENDING"
                      value={transactionId}
                      onChange={e => {
                        setTransactionId(e.target.value.toUpperCase());
                        if (errors.transactionId) {
                          setErrors(prev => ({ ...prev, transactionId: undefined }));
                        }
                      }}
                      className={`w-full text-sm font-mono tracking-wider uppercase px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-2 bg-white ${
                        errors.transactionId
                          ? 'border-red-500 focus:ring-red-400 bg-red-50/20'
                          : 'border-neutral-300 focus:ring-[#2F5233]'
                      }`}
                    />
                    {errors.transactionId && (
                      <p className="text-[11px] text-red-600 mt-1 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{errors.transactionId}</span>
                      </p>
                    )}
                    <span className="text-[10px] text-neutral-400 block mt-1">
                      Our operator will cross-verify this before dispatching.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Order Summary & Place Order CTA */}
          <div className="lg:col-span-5 space-y-4">
            <div id="checkout-order-summary" className="bg-white rounded-2xl p-5 sm:p-6 border border-[#2F5233]/15 shadow-md space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="font-serif-brand font-bold text-base text-[#2F5233]">
                  Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
                </h3>
                {isBuyNow && (
                  <span className="text-[10px] font-bold uppercase bg-[#D9A441]/20 text-[#2A2A28] px-2 py-0.5 rounded">
                    Express Buy Now
                  </span>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {items.map(it => (
                  <div key={it.variantId} className="flex gap-3 text-xs items-center">
                    <img
                      src={it.image}
                      alt={it.productName}
                      className="w-12 h-12 rounded-lg object-cover bg-neutral-100 shrink-0 border border-neutral-200"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[#2A2A28] truncate">{it.productName}</h4>
                      <p className="text-[11px] text-neutral-500">
                        {it.variantLabel} × {it.quantity}
                      </p>
                      {isBuyNow && buyNowItem && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <button
                            type="button"
                            onClick={() => setBuyNowItem({ ...buyNowItem, quantity: Math.max(1, buyNowItem.quantity - 1) })}
                            disabled={buyNowItem.quantity <= 1}
                            className="w-6 h-6 rounded-md border border-neutral-300 flex items-center justify-center disabled:opacity-40 text-sm font-bold"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="font-bold text-[#2F5233] min-w-5 text-center">{it.quantity}</span>
                          <button
                            type="button"
                            onClick={() => setBuyNowItem({ ...buyNowItem, quantity: Math.min(buyNowItem.stock || 99, buyNowItem.quantity + 1) })}
                            disabled={buyNowItem.quantity >= (buyNowItem.stock || 99)}
                            className="w-6 h-6 rounded-md border border-neutral-300 flex items-center justify-center disabled:opacity-40 text-sm font-bold"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                    <span className="font-bold text-[#2F5233] shrink-0">
                      {formatCurrency(it.unitPrice * it.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-neutral-100 pt-4 space-y-2.5 text-xs text-neutral-600">
                <div className="flex justify-between">
                  <span>Items Subtotal:</span>
                  <span className="font-semibold text-[#2A2A28]">{formatCurrency(subtotal)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Delivery ({selectedZone.name}):</span>
                  <span className="font-semibold text-[#2F5233]">
                    {formatCurrency(deliveryCharge)}
                  </span>
                </div>

                <div className="border-t border-neutral-200 pt-3 flex justify-between items-baseline">
                  <span className="font-bold text-sm text-[#2A2A28]">Total Payable:</span>
                  <span className="font-serif-brand font-black text-2xl text-[#2F5233]">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              {/* Trust Badge */}
              <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#2F5233]/15 flex items-start gap-2.5 text-[11px] text-neutral-600">
                <ShieldCheck className="w-4 h-4 text-[#2F5233] shrink-0 mt-0.5" />
                <span>
                  100% Purity Guarantee. You can check your sealed package before paying the courier.
                </span>
              </div>

              {/* Real-time Form Validation Feedback (Prominently alerts user right above the button) */}
              {hasErrors && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 space-y-1 animate-fadeIn">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Please complete the required fields above:</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] pl-1 space-y-0.5">
                    {errors.name && <li>{errors.name}</li>}
                    {errors.phone && <li>{errors.phone}</li>}
                    {errors.address && <li>{errors.address}</li>}
                    {errors.transactionId && <li>{errors.transactionId}</li>}
                  </ul>
                </div>
              )}

              {/* Primary Place Order CTA Button */}
              <button
                id="checkout-place-order-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 rounded-xl bg-[#2F5233] hover:bg-[#3D6B45] text-white font-bold text-base flex flex-col items-center justify-center shadow-lg hover:shadow-xl transition-all disabled:opacity-50 active:scale-[0.99] cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Placing Your Order...
                  </span>
                ) : (
                  <>
                    <span className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#D9A441]" />
                      <span>Confirm & Place Order ({formatCurrency(total)})</span>
                    </span>
                    <span className="text-[11px] font-normal text-white/80 mt-0.5">
                      {paymentMethod === 'COD'
                        ? 'Cash on Delivery • Pay When Received'
                        : 'Manual Payment • Awaiting Verification'}
                    </span>
                  </>
                )}
              </button>

              <div className="text-center">
                <span className="text-[11px] text-neutral-500 block">
                  Questions? Helpline:{' '}
                  <a href={`tel:${settings.storeContactPhone}`} className="font-bold text-[#2F5233]">
                    {settings.storeContactPhone}
                  </a>
                </span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
