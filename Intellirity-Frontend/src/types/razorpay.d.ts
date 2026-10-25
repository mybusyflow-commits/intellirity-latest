/* Minimal type surface for Razorpay's Checkout script, loaded on demand
   from https://checkout.razorpay.com/v1/checkout.js. Only the fields the
   pricing bundle uses are declared. */
export {};

declare global {
  interface RazorpaySuccessResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name?: string;
    description?: string;
    order_id: string;
    handler: (response: RazorpaySuccessResponse) => void;
    theme?: { color?: string };
  }

  interface RazorpayInstance {
    open: () => void;
    close: () => void;
  }

  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}
