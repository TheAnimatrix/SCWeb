# Cart System Design Document

## Overview
The cart system is implemented using SvelteKit (Svelte5 runes mode), TailwindCSS for styling, and Supabase for backend data storage and RPC logic. It supports both authenticated and guest users, with cart persistence and synchronization via Supabase.

---

## Data Model
- **Cart**: `{ id, list, status, price, last_updated }`
  - `id`: Unique cart identifier (per user or client).
  - `list`: Array of cart items (`{ product_id, price, qty }`).
  - `status`: Cart status (`active`, `paid`, etc.).
  - `price`: Total price (may include shipping).
  - `last_updated`: Timestamp.
- **CartItem**: `{ product_id, price, qty }`
- **CartG**: UI state `{ valid, itemCount }`

---

## Core Flow
### 1. Cart Initialization
- On page load or user action, `getActiveCart(supabase, clientId)` is called.
  - If a cart exists for the client/user, it is fetched.
  - If not, a new cart is created in Supabase (`cart` table, status `active`).

### 2. Adding/Updating/Removing Items
- `changeCart(supabase, cart_store, changed, changedItemStock, clientId, absoluteStockChange)`
  - Fetches the current cart.
  - Locates the item in the cart list:
    - If found, updates quantity (or removes if qty=0).
    - If not found, adds the item.
    - Checks stock before updating.
  - Updates the cart in Supabase via `update_cart_by_id` RPC.
  - Updates the UI store (`cart_store`) with new item count.

### 3. Cart UI
- Cart page (`/cart`) displays items, allows quantity changes, and removal.
- Uses Svelte5 runes for reactivity and context for cart state.
- Order summary is shown with subtotal, shipping, and total.
- Checkout button navigates to `/checkout`.

### 4. Checkout & Order Creation
- On checkout, the cart is validated and a payment order is created (Razorpay integration).
- On payment success, cart status is updated to `paid`, stock is decremented, and a purchase record is created.
- On failure, user is redirected to a failure summary page.

### 5. Guest vs Authenticated Users
- Cart is always stored in Supabase, keyed by `client_id` (for guests) or user id (for logged-in users).
- There is commented-out logic for localStorage fallback, but it is not active.

---

## Supabase Functions
- `get_cart_by_uid`: Fetches cart by client/user id.
- `update_cart_by_id`: Updates cart list and status.
- Cart table stores all cart data, including list as JSON.

---

## UI/UX
- All cart and checkout pages use TailwindCSS for styling.
- Svelte5 runes mode is used for reactivity and event handling.
- Cart icon in the header shows item count (reactive).
- Error and loading states are handled with context stores and visual feedback.

---

## Possible Issues
- **Race Conditions**: Multiple rapid updates may cause inconsistent cart state.
- **Stock Sync**: Stock is checked both when updating the cart and at purchase time. However, overselling is still possible if multiple users purchase the same item simultaneously, due to the lack of transactional locking or atomic stock decrement.
- **Guest Cart Persistence**: No localStorage fallback is active; guests lose cart if clientId changes or session is lost.
- **Cart Merging**: No logic for merging guest and user carts on login.
- **Performance**: Each cart update triggers a full RPC/database write.
- **Offline Support**: No offline cart support.
- **Error Handling**: Some errors are only logged, not surfaced to the user.

---

## Suggestions for Improvement / Redesign
### If Remade from Scratch
- **LocalStorage Fallback**: Implement localStorage for guests, sync to Supabase on login.
- **Optimistic UI**: Update UI immediately, then sync to backend; rollback on error.
- **Cart Merging**: On login, merge guest and user carts.
- **Batch Updates**: Debounce or batch cart updates to reduce server load.
- **Stock Locking**: Implement server-side stock reservation to prevent overselling.
- **Offline Support**: Use localStorage or IndexedDB for offline cart, sync when online.
- **Improved Error Handling**: Show user-friendly error messages and retry options.
- **Testing**: Add unit and integration tests for cart logic.
- **API Layer**: Abstract cart logic into a service for easier testing and maintenance.

---

## References
- Svelte5 runes mode, TailwindCSS, Supabase RPC, Razorpay integration.
- See `src/lib/client/cart.ts`, `src/routes/(cart)/cart/+page.svelte`, and related files for implementation details. 