
insert into storage.buckets (id, name, public)
values ('category-icons', 'category-icons', true)
on conflict (id) do nothing;

create policy "public read category icons"
on storage.objects for select
using (bucket_id = 'category-icons');

create policy "admin write category icons"
on storage.objects for insert
to authenticated
with check (bucket_id = 'category-icons' and public.is_admin(auth.uid()));

create policy "admin update category icons"
on storage.objects for update
to authenticated
using (bucket_id = 'category-icons' and public.is_admin(auth.uid()));

create policy "admin delete category icons"
on storage.objects for delete
to authenticated
using (bucket_id = 'category-icons' and public.is_admin(auth.uid()));
