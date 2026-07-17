import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Package } from 'lucide-react';
import { Product } from '@/types/product';

interface ProductListProps {
  products: Product[];
  loading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
}

export const ProductList = ({ products, loading, onEdit, onDelete }: ProductListProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage"></div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="p-12 rounded-2xl text-center">
        <Package className="h-16 w-16 mx-auto mb-4 text-sage/50" />
        <h3 className="text-xl font-semibold text-sage mb-2">No Products Yet</h3>
        <p className="text-muted-foreground">
          Start by adding your first product to sell on the platform
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-sage">My Products ({products.length})</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <Card key={product.id} className="overflow-hidden rounded-2xl">
            {/* Product Image */}
            <div className="relative aspect-square bg-sage-light/20">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-16 w-16 text-sage/30" />
                </div>
              )}
              {!product.is_active && (
                <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground px-2 py-1 rounded-full text-xs font-medium">
                  Inactive
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-foreground line-clamp-1">
                  {product.name}
                </h3>
                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {product.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold text-sage">
                    ${parseFloat(product.price.toString()).toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Stock: {product.inventory_quantity}
                  </p>
                </div>
                {product.category && (
                  <span className="text-xs bg-sage-light text-sage px-2 py-1 rounded-full">
                    {product.category}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => onEdit(product)}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  onClick={() => onDelete(product.id)}
                  variant="outline"
                  className="border-destructive/20 text-destructive hover:bg-destructive/10"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};