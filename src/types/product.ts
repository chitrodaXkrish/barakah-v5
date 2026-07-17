export interface Product {
  id: string;
  seller_id: string;
  name: string;
  description: string | null;
  price: number;
  inventory_quantity: number;
  category: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sku?: string | null;
  tags?: string[] | null;
  weight?: number | null;
  weight_unit?: string | null;
  free_shipping?: boolean | null;
  shipping_price?: number | null;
  islamic_compliance?: boolean | null;
  status?: string | null;
}