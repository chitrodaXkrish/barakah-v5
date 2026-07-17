import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    name: string;
    image_url: string | null;
  };
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  items: OrderItem[];
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
    case 'paid': return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
    case 'shipped': return 'bg-purple-500/20 text-purple-700 border-purple-500/30';
    case 'delivered': return 'bg-amber-500/20 text-amber-700 border-amber-500/30';
    case 'cancelled': return 'bg-red-500/20 text-red-700 border-red-500/30';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const SellerOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      // Get seller's products first
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('seller_id', user?.uid);

      if (productsError) throw productsError;

      const productIds = products?.map(p => p.id) || [];
      if (productIds.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      // Get order items for seller's products
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          id,
          quantity,
          price,
          order_id,
          product_id,
          products (name, image_url)
        `)
        .in('product_id', productIds);

      if (itemsError) throw itemsError;

      // Get unique order IDs
      const orderIds = [...new Set(orderItems?.map(item => item.order_id) || [])];
      if (orderIds.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      // Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .in('id', orderIds)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Group order items by order
      const ordersWithItems: Order[] = (ordersData || []).map(order => ({
        ...order,
        items: (orderItems || [])
          .filter(item => item.order_id === order.id)
          .map(item => ({
            id: item.id,
            quantity: item.quantity,
            price: item.price,
            product: {
              name: (item as any).products?.name || 'Unknown Product',
              image_url: (item as any).products?.image_url
            }
          }))
      }));

      setOrders(ordersWithItems);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No orders yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Orders ({orders.length})</h2>
      {orders.map((order) => (
        <Card key={order.id} className="p-4 bg-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Order #{order.id.slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
            </div>
            <Badge className={getStatusColor(order.status)}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>

          <div className="space-y-2 mb-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary rounded-lg overflow-hidden flex items-center justify-center">
                  {item.product.image_url ? (
                    <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">Qty: {item.quantity} × ${item.price.toFixed(2)}</p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  ${(item.quantity * item.price).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Your earnings</span>
              <span className="font-bold text-primary">
                ${order.items.reduce((sum, item) => sum + (item.quantity * item.price), 0).toFixed(2)}
              </span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
