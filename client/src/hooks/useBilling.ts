import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { plansApi } from '@/api/plans';
import { subscriptionsApi, type CheckoutPayload } from '@/api/subscriptions';
import { invoicesApi } from '@/api/invoices';
import { openRazorpayCheckout } from '@/lib/razorpay';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessage } from '@/lib/errors';
import type { Subscription } from '@/types';

export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: plansApi.list,
  });
}

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionsApi.getMine,
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: invoicesApi.list,
  });
}

export function useCheckout() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (payload: CheckoutPayload) => subscriptionsApi.checkout(payload),

    onSuccess: (data) => {
      // Free plan, or a paid->paid/paid->free switch — the backend already
      // applied it, nothing further for the client to do.
      if (!data.razorpay) {
        if (data.subscription) {
          queryClient.setQueryData<{ subscription: Subscription }>(['subscription'], {
            subscription: data.subscription,
          });
        }
        toast.success(`Switched to ${data.subscription?.plan?.name ?? 'new plan'}`);
        return;
      }

      // Paid plan — hand off to Razorpay's Checkout widget. `data.subscription`
      // here is still the org's CURRENT plan; the backend deliberately
      // doesn't grant `data.plan` (the one being purchased) until the
      // razorpay webhook confirms the card was actually authorized. So we
      // don't touch the subscription cache at all here — only refetch it
      // once the widget closes, and let the server tell us what's true.
      openRazorpayCheckout({
        keyId: data.razorpay.keyId,
        subscriptionId: data.razorpay.subscriptionId,
        planName: data.plan?.name ?? 'FirmFlow plan',
        prefillName: user?.name,
        prefillEmail: user?.email,
        onSuccess: () => {
          toast.success('Payment authorized — activating your plan…');
          queryClient.invalidateQueries({ queryKey: ['subscription'] });
        },
        onDismiss: () => {
          // They may have actually completed payment and just closed the
          // modal a beat late — refetch rather than assume it was aborted.
          queryClient.invalidateQueries({ queryKey: ['subscription'] });
        },
      }).catch((error) => {
        toast.error(getErrorMessage(error, 'Could not open the payment window'));
      });
    },

    onError: (error) => {
      toast.error(getErrorMessage(error, 'Could not start checkout'));
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => subscriptionsApi.cancel(),
    onSuccess: (data) => {
      queryClient.setQueryData(['subscription'], data);
      toast.success('Your plan will end after the current billing period');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Could not cancel subscription'));
    },
  });
}
