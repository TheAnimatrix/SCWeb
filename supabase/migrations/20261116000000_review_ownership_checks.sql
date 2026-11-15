-- Reviews: close the gaps left by 20261115120000.
--
-- 1. An older, looser INSERT policy ("reviews_insert_own", created by 20260708130000_rls_lockdown)
--    may exist alongside the new one. Postgres ORs permissive policies, so it would let a maker
--    review their own listing. Drop it so the stricter policy is the only one.
-- 2. A listing can belong to a maker through products.uid or products.maker_id. Check both.
-- 3. The UPDATE policy had no "not your own listing" check, so a review could be re-pointed at
--    one of the reviewer's own listings.
drop policy if exists "reviews_insert_own" on public.reviews;
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
				and (p.uid = (select auth.uid()) or p.maker_id = (select auth.uid()))
		)
	);

drop policy if exists "Enable update for users based on user_id" on public.reviews;
drop policy if exists "Reviewers can edit their own reviews" on public.reviews;

create policy "Reviewers can edit their own reviews"
	on public.reviews
	for update
	to authenticated
	using (user_id = (select auth.uid()))
	with check (
		user_id = (select auth.uid())
		and not exists (
			select 1
			from public.products p
			where p.id = reviews.product_id
				and (p.uid = (select auth.uid()) or p.maker_id = (select auth.uid()))
		)
	);

-- Same duplicate-policy cleanup for addresses: keep one INSERT rule.
drop policy if exists "addresses_insert_own" on public.addresses;
