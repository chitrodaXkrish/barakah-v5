alter table public.scan_history
  add column if not exists barcode text;

create index if not exists scan_history_barcode_idx
  on public.scan_history(barcode);
