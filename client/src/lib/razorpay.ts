// Thin wrapper around Razorpay's Checkout.js widget. We load it lazily
// (only when someone actually starts a paid checkout) rather than putting
// a <script> tag in index.html, so it never costs anything on pages that
// don't need it.

interface RazorpayCheckoutOptions {
  key: string;
  subscription_id: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler: (response: unknown) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayCheckoutInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let loadPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null; // allow a retry on the next attempt
      reject(new Error('Could not load the Razorpay checkout script'));
    };
    document.body.appendChild(script);
  });

  return loadPromise;
}

export interface OpenRazorpayCheckoutArgs {
  keyId: string;
  subscriptionId: string;
  planName: string;
  prefillName?: string;
  prefillEmail?: string;
  onSuccess: () => void;
  onDismiss: () => void;
}

// NOTE: `onSuccess` firing means the card was authorized in the widget —
// it does NOT mean the subscription is active. Only the `razorpay`
// webhook flips local status to 'active'/'trialing'. Callers should show
// a "processing" state, not a final success state, and rely on refetching
// GET /subscriptions/me for the real status.
export async function openRazorpayCheckout(args: OpenRazorpayCheckoutArgs): Promise<void> {
  await loadRazorpayScript();

  if (!window.Razorpay) {
    throw new Error('Razorpay checkout script failed to initialize');
  }

  const rzp = new window.Razorpay({
    key: args.keyId,
    subscription_id: args.subscriptionId,
    name: 'FirmFlow',
    description: args.planName,
    prefill: {
      name: args.prefillName,
      email: args.prefillEmail,
    },
    theme: { color: '#6366f1' },
    handler: () => args.onSuccess(),
    modal: {
      ondismiss: () => args.onDismiss(),
    },
  });

  rzp.open();
}
