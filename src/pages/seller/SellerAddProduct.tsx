import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const SellerAddProduct = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    inventory_quantity: 0,
    sku: '',
    category: '',
    tags: '',
    islamic_compliance: true,
    weight: '',
    weight_unit: 'KG',
    free_shipping: false,
    shipping_price: '',
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const path = `${user?.uid}/products/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file);
      if (error) { toast.error('Upload failed'); continue; }
      const { data: pub } = supabase.storage.from('product-images').getPublicUrl(path);
      setImages((arr) => [...arr, pub.publicUrl]);
    }
  };

  const publish = async () => {
    if (!form.name || !form.price) { toast.error('Name and price are required'); return; }
    setSaving(true);
    const { error } = await supabase.from('products').insert({
      seller_id: user!.uid,
      name: form.name,
      description: form.description,
      price: Number(form.price),
      inventory_quantity: Number(form.inventory_quantity),
      sku: form.sku || null,
      category: form.category || null,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()) : null,
      islamic_compliance: form.islamic_compliance,
      weight: form.weight ? Number(form.weight) : null,
      weight_unit: form.weight_unit,
      free_shipping: form.free_shipping,
      shipping_price: form.shipping_price ? Number(form.shipping_price) : null,
      image_url: images[0] || null,
      status: 'active',
      is_active: true,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Product published');
    navigate('/seller/products');
  };

  const inputCls = 'w-full bg-white rounded-xl px-4 py-3 border border-[#E8DCC0] outline-none text-[#1a1a1a]';
  const sectionCls = 'text-xs font-bold tracking-wider mb-1';

  return (
    <div className="min-h-screen w-full max-w-md mx-auto pb-32" style={{ background: '#FFF1DD' }}>
      <div className="bg-white px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold mx-auto pr-5">Add Product</h1>
      </div>

      <div className="px-4 py-4 space-y-6">
        <section>
          <div className={sectionCls} style={{ color: '#A35233' }}>MEDIA UPLOAD</div>
          <div className="flex gap-3 overflow-x-auto pt-2">
            <label className="w-28 h-28 rounded-2xl flex flex-col items-center justify-center gap-1 text-sm flex-shrink-0 cursor-pointer" style={{ background: '#FFE3BD', border: '2px dashed #C9A87C' }}>
              <Plus className="h-5 w-5" />
              Add photos
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
            </label>
            {images.map((u, i) => (
              <div key={i} className="relative w-28 h-28 rounded-2xl overflow-hidden flex-shrink-0">
                <img src={u} className="w-full h-full object-cover" />
                {i === 0 && <span className="absolute top-2 left-2 text-[10px] font-bold text-white px-2 py-1 rounded-full" style={{ background: '#A35233' }}>COVER</span>}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className={sectionCls}>PRODUCT DETAILS</div>
          <hr className="border-[#E8DCC0]" />
          <label className="block text-sm text-[#1a1a1a]/70">Product Name *</label>
          <input className={inputCls} placeholder="Enter product title" value={form.name} onChange={(e) => set('name', e.target.value)} />
          <label className="block text-sm text-[#1a1a1a]/70">Description</label>
          <textarea className={inputCls} rows={4} placeholder="Describe your product in detail..." value={form.description} onChange={(e) => set('description', e.target.value)} />
        </section>

        <section className="space-y-3">
          <div className={sectionCls}>PRICING & INVENTORY</div>
          <hr className="border-[#E8DCC0]" />
          <label className="block text-sm text-[#1a1a1a]/70">Price</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1a1a1a]/60">$</span>
            <input type="number" className={inputCls + ' pl-8'} placeholder="0.00" value={form.price} onChange={(e) => set('price', e.target.value)} />
          </div>
          <p className="text-xs"><span className="italic">Info-</span> Barakah Charges <span style={{ color: '#B07A00' }}>3-5%</span> Commission Per Successful Order</p>

          <label className="block text-sm text-[#1a1a1a]/70">Stock quantity</label>
          <div className="flex items-stretch bg-white rounded-xl border border-[#E8DCC0] overflow-hidden">
            <button className="px-4" onClick={() => set('inventory_quantity', Math.max(0, Number(form.inventory_quantity) - 1))}>−</button>
            <input type="number" className="flex-1 text-center outline-none" value={form.inventory_quantity} onChange={(e) => set('inventory_quantity', e.target.value)} />
            <button className="px-4" onClick={() => set('inventory_quantity', Number(form.inventory_quantity) + 1)}>+</button>
          </div>

          <label className="block text-sm text-[#1a1a1a]/70">SKU (Optional)</label>
          <input className={inputCls} placeholder="Stock keeping unit" value={form.sku} onChange={(e) => set('sku', e.target.value)} />
        </section>

        <section className="space-y-3">
          <div className={sectionCls}>CATEGORY</div>
          <hr className="border-[#E8DCC0]" />
          <label className="block text-sm text-[#1a1a1a]/70">Category</label>
          <select className={inputCls} value={form.category} onChange={(e) => set('category', e.target.value)}>
            <option value="">Select Category</option>
            <option>Apparel</option>
            <option>Home</option>
            <option>Wellness</option>
            <option>Food</option>
            <option>Books</option>
          </select>
          <label className="block text-sm text-[#1a1a1a]/70">Tags (comma separated)</label>
          <input className={inputCls} placeholder="e.g. handmade, organic, wool" value={form.tags} onChange={(e) => set('tags', e.target.value)} />
        </section>

        <div className="rounded-2xl p-4" style={{ background: '#F8EFC4', border: '1px solid #E5D58B' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 font-bold" style={{ color: '#7A5A00' }}>
              <ShieldCheck className="h-5 w-5" /> ISLAMIC COMPLIANCE
            </div>
            <button
              onClick={() => set('islamic_compliance', !form.islamic_compliance)}
              className="w-12 h-6 rounded-full p-0.5 transition"
              style={{ background: form.islamic_compliance ? '#3D7B2E' : '#bbb' }}
            >
              <div className="w-5 h-5 rounded-full bg-white transition" style={{ marginLeft: form.islamic_compliance ? '24px' : '0' }} />
            </button>
          </div>
          <p className="text-xs text-[#1a1a1a]/80">ⓘ "Halal certified" — Products are subject to Barakah review info text below toggle. Ensure documentation is ready.</p>
        </div>

        <section className="space-y-3">
          <div className={sectionCls}>SHIPPING</div>
          <hr className="border-[#E8DCC0]" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[#1a1a1a]/70">Weight</label>
              <input className={inputCls} placeholder="0.00" value={form.weight} onChange={(e) => set('weight', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-[#1a1a1a]/70">Unit</label>
              <select className={inputCls} value={form.weight_unit} onChange={(e) => set('weight_unit', e.target.value)}>
                <option>KG</option><option>G</option><option>LB</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span>Free shipping</span>
            <button
              onClick={() => set('free_shipping', !form.free_shipping)}
              className="w-12 h-6 rounded-full p-0.5"
              style={{ background: form.free_shipping ? '#3D7B2E' : '#bbb' }}
            >
              <div className="w-5 h-5 rounded-full bg-white" style={{ marginLeft: form.free_shipping ? '24px' : '0' }} />
            </button>
          </div>
          {!form.free_shipping && (
            <>
              <label className="block text-sm text-[#1a1a1a]/70">Custom shipping price</label>
              <input className={inputCls} placeholder="Enter fixed rate" value={form.shipping_price} onChange={(e) => set('shipping_price', e.target.value)} />
            </>
          )}
        </section>

        <button
          onClick={publish}
          disabled={saving}
          className="w-full py-4 rounded-2xl text-white font-bold tracking-wide"
          style={{ background: '#1F2937' }}
        >
          {saving ? 'PUBLISHING...' : 'PUBLISH PRODUCT'}
        </button>
      </div>
    </div>
  );
};