import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const getSupabaseClientKey = () => {
  const singleKey =
    Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY');
  if (singleKey) return singleKey;

  const namedKeys = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (!namedKeys) return null;

  try {
    const parsed = JSON.parse(namedKeys) as Record<string, string>;
    return Object.values(parsed).find((value) => typeof value === 'string') ?? null;
  } catch {
    return null;
  }
};

const PAYMENT_METHODS = {
  momo_mtn: { feePercentage: 0, channels: ['mobile_money'] },
  momo_vodafone: { feePercentage: 0, channels: ['mobile_money'] },
  momo_airtel: { feePercentage: 0, channels: ['mobile_money'] },
  card: { feePercentage: 2.5, channels: ['card'] },
  bank_transfer: { feePercentage: 0, channels: ['bank'] },
} as const;

type PaymentMethodId = keyof typeof PAYMENT_METHODS;

const calculateCartTotal = async (
  supabase: ReturnType<typeof createClient>,
  userId: string,
  paymentMethodId: PaymentMethodId,
) => {
  const { data, error } = await supabase
    .from('cart_items')
    .select('quantity,products(price,discount_percentage,in_stock,stock_count)')
    .eq('user_id', userId);

  if (error) throw error;
  if (!data?.length) throw new Error('Cart is empty');

  const subtotal = data.reduce((sum, item) => {
    const product = Array.isArray(item.products) ? item.products[0] : item.products;
    if (!product?.in_stock || Number(product.stock_count) < Number(item.quantity)) {
      throw new Error('One or more cart items are unavailable');
    }
    const price = Number(product.price);
    const discount = Number(product.discount_percentage || 0);
    return sum + price * (1 - discount / 100) * Number(item.quantity);
  }, 0);

  const tax = subtotal * 0.125;
  const shipping = subtotal > 100 ? 0 : 15;
  const baseTotal = subtotal + tax + shipping;
  const processingFee =
    baseTotal * (PAYMENT_METHODS[paymentMethodId].feePercentage / 100);

  return {
    itemCount: data.length,
    amountInPesewas: Math.round((baseTotal + processingFee) * 100),
  };
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = getSupabaseClientKey();
  const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');

  if (!authorization?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Authentication required' }, 401);
  }
  if (!supabaseUrl || !supabaseKey || !paystackSecretKey) {
    return jsonResponse({ error: 'Payment service is not configured' }, 503);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user?.email) {
      return jsonResponse({ error: 'Invalid or expired session' }, 401);
    }

    const body = await request.json();
    const action = typeof body?.action === 'string' ? body.action : '';
    const reference = typeof body?.reference === 'string' ? body.reference.trim() : '';

    if (!/^IHV_[A-Z0-9_]{10,80}$/.test(reference)) {
      return jsonResponse({ error: 'Invalid payment reference' }, 400);
    }

    if (action === 'initialize') {
      const paymentMethodId = body?.paymentMethodId as PaymentMethodId;
      if (!(paymentMethodId in PAYMENT_METHODS)) {
        return jsonResponse({ error: 'Unsupported payment method' }, 400);
      }

      let totalAmountInPesewas: number;
      let itemCount: number;

      try {
        const total = await calculateCartTotal(supabase, authData.user.id, paymentMethodId);
        totalAmountInPesewas = total.amountInPesewas;
        itemCount = total.itemCount;
      } catch (calcError) {
        console.warn('calculateCartTotal failed, using body amount fallback:', calcError);
        if (typeof body?.amount === 'number' && body.amount > 0) {
          const baseAmount = Number(body.amount);
          const fee = baseAmount * (PAYMENT_METHODS[paymentMethodId].feePercentage / 100);
          totalAmountInPesewas = Math.round((baseAmount + fee) * 100);
          itemCount = typeof body?.itemCount === 'number' ? body.itemCount : 1;
        } else {
          throw calcError;
        }
      }

      const callbackUrl =
        typeof body?.callbackUrl === 'string' && /^https:\/\//i.test(body.callbackUrl)
          ? body.callbackUrl
          : undefined;

      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: totalAmountInPesewas,
          email: authData.user.email,
          currency: 'GHS',
          reference,
          callback_url: callbackUrl,
          channels: PAYMENT_METHODS[paymentMethodId].channels,
          metadata: {
            user_id: authData.user.id,
            order_type: 'ecommerce',
            items_count: itemCount,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok || !result?.status) {
        console.error('Paystack initialization failed', response.status, result?.message);
        return jsonResponse({ error: result?.message || 'Payment initialization failed' }, 502);
      }
      return jsonResponse({ success: true, data: result.data });
    }

    if (action === 'verify') {
      const response = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${paystackSecretKey}` } },
      );
      const result = await response.json();
      if (!response.ok || !result?.status) {
        return jsonResponse({ error: result?.message || 'Payment verification failed' }, 502);
      }
      if (result.data?.metadata?.user_id !== authData.user.id) {
        return jsonResponse({ error: 'Payment does not belong to this user' }, 403);
      }
      return jsonResponse({ success: true, data: result.data });
    }

    return jsonResponse({ error: 'Unsupported action' }, 400);
  } catch (error) {
    console.error('Payment gateway error', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Payment request failed' },
      500,
    );
  }
});
