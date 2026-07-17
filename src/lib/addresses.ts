export type ShippingAddress = {
  id: string;
  fullName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

const KEY = 'barakah_shipping_addresses';
const SELECTED_KEY = 'barakah_selected_address_id';

export const loadAddresses = (): ShippingAddress[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ShippingAddress[];
  } catch {
    return [];
  }
};

export const saveAddresses = (list: ShippingAddress[]) => {
  localStorage.setItem(KEY, JSON.stringify(list));
};

export const upsertAddress = (addr: ShippingAddress) => {
  const list = loadAddresses();
  const idx = list.findIndex(a => a.id === addr.id);
  if (idx >= 0) list[idx] = addr;
  else list.push(addr);
  saveAddresses(list);
  if (list.length === 1) setSelectedAddressId(addr.id);
};

export const deleteAddress = (id: string) => {
  const list = loadAddresses().filter(a => a.id !== id);
  saveAddresses(list);
  if (getSelectedAddressId() === id) {
    setSelectedAddressId(list[0]?.id ?? null);
  }
};

export const getSelectedAddressId = (): string | null => {
  return localStorage.getItem(SELECTED_KEY);
};

export const setSelectedAddressId = (id: string | null) => {
  if (id) localStorage.setItem(SELECTED_KEY, id);
  else localStorage.removeItem(SELECTED_KEY);
};

export const getSelectedAddress = (): ShippingAddress | null => {
  const id = getSelectedAddressId();
  const list = loadAddresses();
  return list.find(a => a.id === id) || list[0] || null;
};

export const formatAddressLines = (a: ShippingAddress) => ({
  line1: a.address,
  line2: `${a.city}, ${a.state} ${a.zip}, ${a.country}`,
});