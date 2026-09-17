import { apiClient } from '@/api/axios';
import type { Subscription, Plan } from '@/types';

export interface CheckoutPayload {
  planId: string;
}

// `razorpay` is only present when the checkout opened a real gateway
// subscription (i.e. the target plan isn't Free). Its absence means the
// switch already happened locally — nothing further for the client to do.
//
// When `razorpay` IS present, `subscription` is the org's CURRENT (still
// unchanged) entitlement, not the plan being purchased — the backend
// deliberately doesn't grant the new plan until the webhook confirms the
// card was authorized. `plan` is the target plan, for labeling the
// checkout widget.
export interface CheckoutResponse {
  subscription: Subscription | null;
  plan?: Plan;
  razorpay?: {
    subscriptionId: string;
    keyId: string;
  };
}

export const subscriptionsApi = {
  getMine: async () => {
    const { data } = await apiClient.get<{ subscription: Subscription }>('/subscriptions/me');
    return data;
  },
  checkout: async (payload: CheckoutPayload) => {
    const { data } = await apiClient.post<CheckoutResponse>('/subscriptions/checkout', payload);
    return data;
  },
  // Cancels at the end of the current billing period — access continues
  // until then. The Free plan can't be cancelled this way (backend 400s);
  // switching to Free via checkout is the equivalent action for it.
  cancel: async () => {
    const { data } = await apiClient.post<{ subscription: Subscription }>('/subscriptions/cancel');
    return data;
  },
};
