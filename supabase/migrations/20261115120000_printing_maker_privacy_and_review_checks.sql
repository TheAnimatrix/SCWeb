-- 1. Printing makers' contact and payment details.
--    The old policy let any signed-in user read every row of "PrintingCrafters" with the browser
--    client, including email, contact_number and payment_details. The public maker list comes from
--    the API, and server loads use the service role, so the browser only ever needs a maker's own row.
drop policy if exists "Allow read access to authenticated users" on public."PrintingCrafters";
drop policy if exists "Makers can read their own printing profile" on public."PrintingCrafters";

create policy "Makers can read their own printing profile"
	on public."PrintingCrafters"
	for select
	to authenticated
	using (maker_id = (select auth.uid()));

-- 2. Reviews: a review must be written as yourself, and not on your own listing.
drop policy if exists "Enable insert for authenticated users only" on public.reviews;
drop policy if exists "Buyers can review listings that are not their own" on public.reviews;

create policy "Buyers can review listings that are not their own"
	on public.reviews
	for insert
	to authenticated
	with check (
		user_id = (select auth.uid())
		and not exists (
			select 1
			from public.products p
			where p.id = reviews.product_id
				and p.uid = (select auth.uid())
		)
	);

-- 3. Addresses: you can only add an address to your own account.
drop policy if exists "Enable insert for authenticated users only" on public.addresses;
drop policy if exists "Users can add their own addresses" on public.addresses;

create policy "Users can add their own addresses"
	on public.addresses
	for insert
	to authenticated
	with check (uid = (select auth.uid()));
