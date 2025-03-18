<script lang="ts">
  import { setLoading } from '$lib/client/loading.js';
  import { goto, invalidate } from '$app/navigation';
  import Icon from '@iconify/svelte';
  import IconCheckout from '$lib/svg/icon-checkout.svelte';
  import IconOrderSummary from '$lib/svg/icon-order-summary.svelte';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { getContext, onDestroy, onMount } from 'svelte';
  import GlowButton from '$lib/components/fundamental/GlowButton.svelte';
  import type { Unsubscriber, Writable } from 'svelte/store';
  import {
    getActiveCart,
    type CartItem,
    type Cart,
    type CartG,
    changeCart,
  } from '$lib/client/cart';
  import { DELIVERY_FLAT_FEE } from '$lib/constants/numbers.js';

  export let data;
  let isCheckoutHovered = false;
  let cartDetails: Cart;
  let cartSubtotal = 0;
  let isUpdatingCart = false;
  let highlightedRow: number | null = null;

  let quantityList: string[] = [];
  $: {
    if (data.cart && !data.cart.error) {
      cartDetails = data.cart.data!;
      quantityList = Array(cartDetails.list?.length ?? 0).fill(0);
      cartDetails?.list?.forEach((item, i) => {
        quantityList[i] = item.qty.toString();
      });
      cartSubtotal = calculateCartSubtotal();
    }
  }

  let productDetailsCache: Record<string, any> = {};

  async function getItemDetails(itemId: string) {
    // Use cached data if available to reduce requests
    if (productDetailsCache[itemId]) {
      return productDetailsCache[itemId];
    }

    const result = await data.supabase_lt.from('products').select('*').eq('id', itemId);
    if (result.data && result.data[0]) {
      // Cache the result
      productDetailsCache[itemId] = result.data[0];
      return result.data[0];
    } else {
      return null;
    }
  }

  function calculateCartSubtotal() {
    let total = 0;
    cartDetails?.list?.forEach((item) => {
      total += item.price * item.qty;
    });
    return total;
  }

  function calculateTotalPrice(itemPrice: number, itemQuantity: number) {
    return itemPrice * itemQuantity;
  }

  function isStockAvailable(stockCount: number, itemQuantity: number) {
    return itemQuantity <= stockCount;
  }

  async function updateQuantity(event: Event, i: number, result: any) {
    if (isUpdatingCart) return; // Prevent concurrent updates
    isUpdatingCart = true;
    
    const inputQuantity = parseInt(quantityList[i]);

    if (!isNaN(inputQuantity) && isStockAvailable(result.stock.count, inputQuantity)) {
      let product = {...cartDetails.list![i]}; // Clone to avoid reactivity issues
      product.qty = inputQuantity;
      setLoading(load_store, true);
      try {
        const success = await changeCart(
          data.supabase_lt,
          cart_store,
          product,
          result.stock.count,
          data.clientId,
          true,
        );
        
        if (success) {
          await invalidate('cart:change');
          // Force UI update with current cart data
          const cartResult = await getActiveCart(data.supabase_lt, data.clientId);
          if (!cartResult.error && cartResult.data) {
            cartDetails = cartResult.data;
            quantityList = Array(cartDetails.list?.length ?? 0).fill(0);
            cartDetails?.list?.forEach((item, idx) => {
              quantityList[idx] = item.qty.toString();
            });
          }
          highlightRow(i);
        }
      } catch (err) {
        console.error("Error updating cart:", err);
        quantityList[i] = cartDetails.list![i].qty.toString(); // Reset to original on error
      } finally {
        setLoading(load_store, false);
        isUpdatingCart = false;
      }
    } else {
      alert('Not enough stock available!');
      quantityList[i] = cartDetails.list![i].qty.toString();
      isUpdatingCart = false;
    }
  }

  async function incrementDecrementQuantity(isIncrement: boolean, i: number, result: any) {
    console.log(`Button clicked: ${isIncrement ? 'increment' : 'decrement'} for item ${i}`);
    if (isUpdatingCart) return; // Prevent concurrent updates
    isUpdatingCart = true;
    
    let product = {...cartDetails.list![i]}; // Clone to avoid reactivity issues
    let quantity = product.qty ?? 0;
    if (isIncrement) quantity++;
    else quantity = quantity > 0 ? quantity - 1 : 0;

    if (!isStockAvailable(result.stock.count, quantity)) {
      alert('Not enough stock available');
      isUpdatingCart = false;
      return;
    }

    product.qty = quantity;
    setLoading(load_store, true);
    try {
      const success = await changeCart(
        data.supabase_lt,
        cart_store,
        product,
        result.stock.count,
        data.clientId,
        true,
      );
      
      if (success) {
        await invalidate('cart:change');
        // Force refresh cart data
        const cartResult = await getActiveCart(data.supabase_lt, data.clientId);
        if (!cartResult.error && cartResult.data) {
          cartDetails = cartResult.data;
          quantityList = Array(cartDetails.list?.length ?? 0).fill(0);
          cartDetails?.list?.forEach((item, idx) => {
            quantityList[idx] = item.qty.toString();
          });
        }
        highlightRow(i);
      }
    } catch (err) {
      console.error("Error updating cart:", err);
    } finally {
      setLoading(load_store, false);
      isUpdatingCart = false;
    }
  }
  
  async function removeItem(i: number, result: any) {
    if (isUpdatingCart) return; // Prevent concurrent updates
    isUpdatingCart = true;
    
    const product = {...cartDetails.list![i]}; // Clone to avoid reactivity issues
    product.qty = 0;
    
    setLoading(load_store, true);
    try {
      const success = await changeCart(
        data.supabase_lt,
        cart_store,
        product,
        result.stock.count,
        data.clientId,
        true,
      );
      
      if (success) {
        await invalidate('cart:change');
        // Force refresh cart data after removing item
        const cartResult = await getActiveCart(data.supabase_lt, data.clientId);
        if (!cartResult.error && cartResult.data) {
          cartDetails = cartResult.data;
          quantityList = Array(cartDetails.list?.length ?? 0).fill(0);
          cartDetails?.list?.forEach((item, idx) => {
            quantityList[idx] = item.qty.toString();
          });
        }
      }
    } catch (err) {
      console.error("Error removing item:", err);
    } finally {
      setLoading(load_store, false);
      isUpdatingCart = false;
    }
  }
  
  // Visual feedback when updating quantities
  function highlightRow(index: number) {
    highlightedRow = index;
    setTimeout(() => {
      highlightedRow = null;
    }, 1000);
  }

  // Refresh cart data on mount to ensure consistency
  onMount(async () => {
    try {
      const cartResult = await getActiveCart(data.supabase_lt, data.clientId);
      if (!cartResult.error && cartResult.data) {
        cartDetails = cartResult.data;
        quantityList = Array(cartDetails.list?.length ?? 0).fill(0);
        cartDetails?.list?.forEach((item, idx) => {
          quantityList[idx] = item.qty.toString();
        });
      }
    } catch (err) {
      console.error("Error loading cart:", err);
    }
  });

  const cart_store = getContext<Writable<CartG>>('userCartStatus');
  let load_store = getContext<Writable<boolean>>('loading');
</script>

<div class="min-h-screen bg-[#0c0c0c] text-white">
  <div class="container mx-auto px-4 py-12">
    <!-- Page Header -->
    <div class="text-center mb-10" in:fly="{{ y: -20, duration: 600, delay: 200, easing: cubicOut }}">
      <div class="inline-flex items-center justify-center mb-4">
        <span class="w-4 h-4 rounded-full bg-accent mr-2"></span>
        <span class="text-accent text-sm uppercase tracking-wider font-medium">Shopping Cart</span>
      </div>
      <h1 class="text-4xl font-bold mb-2">Your Items</h1>
      <p class="text-gray-400">Review your cart before checking out</p>
    </div>

    <!-- Main Content -->
    <div class="flex flex-col lg:flex-row gap-8 mb-16" in:fly="{{ y: 20, duration: 400, delay: 300, easing: cubicOut }}">
      <!-- Cart Items -->
      <div class="lg:w-2/3 space-y-6 flex-1">
        {#if !cartDetails || (cartDetails.list ?? []).length === 0}
          <div class="flex items-center justify-center w-full">
            <div 
              class="bg-[#151515]/40 backdrop-blur-sm rounded-2xl p-10 border border-[#252525] transition-all duration-300 hover:shadow-glow flex flex-col items-center justify-center text-center min-h-[400px] w-full max-w-2xl mx-auto"
              in:fade={{ duration: 200 }}
            >
              <div class="relative">
                <div class="absolute -inset-4 rounded-full bg-accent/5 blur-xl"></div>
                <Icon icon="ph:shopping-cart" class="text-accent text-6xl mb-6 opacity-70" />
              </div>
              <h2 class="text-3xl font-bold mb-3">Your cart is empty</h2>
              <p class="text-gray-400 mb-8 max-w-md">Looks like you haven't added any items yet. Explore our products and find something you like!</p>
              <button 
                class="flex items-center justify-center gap-2 bg-accent/10 text-accent px-8 py-4 rounded-xl font-medium hover:bg-accent/20 transition-all duration-300 hover:scale-105 transform"
                on:click={() => goto('/')}
              >
                <Icon icon="ph:shopping-bag-bold" class="text-xl" />
                Browse Crafts
              </button>
            </div>
          </div>
        {:else}
          {#each cartDetails.list ?? [] as productItem, i (productItem.product_id)}
            {#await getItemDetails(productItem.product_id)}
              <div class="bg-[#151515]/40 backdrop-blur-sm rounded-2xl p-4 border border-[#252525] animate-pulse">
                <div class="flex items-center space-x-4">
                  <div class="w-20 h-20 bg-[#252525] rounded-xl"></div>
                  <div class="flex-1">
                    <div class="h-5 bg-[#252525] rounded w-1/2 mb-2"></div>
                    <div class="h-4 bg-[#252525] rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            {:then result}
              <div 
                class="bg-[#151515]/40 backdrop-blur-sm rounded-2xl border border-[#252525] overflow-hidden transition-all duration-300 hover:shadow-glow group"
                class:highlight-animation={highlightedRow === i}
                in:fade={{ duration: 200 }}
                style="isolation: isolate;"
              >
                <div class="flex flex-col md:flex-row">
                  <!-- Product Image - No black borders -->
                  <div class="relative md:w-1/4 lg:w-1/3 bg-[#151515] flex items-center justify-center overflow-hidden">
                    <img
                      src={result.images[0].url}
                      class="object-cover w-full h-full max-h-[200px] transition-transform duration-300 group-hover:scale-110"
                      alt={result.name}
                      loading="lazy"
                    />
                    <div class="absolute inset-0 bg-gradient-to-r from-transparent to-[#151515]/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                  
                  <!-- Product Details - More compact -->
                  <div class="flex-1 p-4 flex flex-col">
                    <div class="flex flex-col md:flex-row justify-between">
                      <div>
                        <h3 class="text-xl font-bold text-white group-hover:text-accent transition-colors duration-300">{result.name}</h3>
                        <p class="text-accent opacity-80 text-xs mb-2">by {result.author}</p>
                      </div>
                      <!-- Removed duplicate price here -->
                    </div>
                    
                    <div class="flex items-center text-xs text-gray-400 mb-3">
                      <Icon icon="ph:cube-bold" class="mr-1" />
                      <span class={result.stock.count > 5 ? 'text-green-400' : 'text-yellow-400'}>
                        {result.stock.count} in stock
                      </span>
                      
                      {#if result.guarantee}
                        <span class="mx-2">•</span>
                        <Icon icon="ph:shield-check-bold" class="mr-1" />
                        <span>{result.guarantee}</span>
                      {/if}
                    </div>
                    
                    <!-- Price and Quantity Controls - More compact -->
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-auto pt-2 border-t border-[#252525]">
                      <div class="text-2xl font-bold text-accent">
                        ₹{calculateTotalPrice(result.price.new, productItem.qty)}
                      </div>
                      
                      <div class="flex items-center mt-2 sm:mt-0 relative z-10">
                        <button
                          on:click={() => incrementDecrementQuantity(false, i, result)}
                          class="w-8 h-8 flex items-center justify-center bg-[#252525]/30 hover:bg-accent/20 text-accent rounded-l-lg transition-colors duration-200 relative z-10"
                          aria-label="Decrease quantity"
                          type="button"
                          style="touch-action: manipulation;"
                        >
                          <span class="flex items-center justify-center w-full h-full pointer-events-none">
                            <Icon icon="ph:minus-bold" />
                          </span>
                        </button>
                        
                        <input
                          type="number"
                          bind:value={quantityList[i]}
                          min="1"
                          max={result.stock.count}
                          class="w-12 h-8 bg-[#252525]/30 text-center border-x border-[#353535] text-white focus:outline-none focus:ring-1 focus:ring-accent/50 relative z-10"
                          disabled={isUpdatingCart}
                          on:change={(e) => updateQuantity(e, i, result)}
                          style="touch-action: manipulation;"
                        />
                        
                        <button
                          on:click={() => incrementDecrementQuantity(true, i, result)}
                          class="w-8 h-8 flex items-center justify-center bg-[#252525]/30 hover:bg-accent/20 text-accent rounded-r-lg transition-colors duration-200 relative z-10"
                          aria-label="Increase quantity"
                          disabled={isUpdatingCart}
                          type="button"
                          style="touch-action: manipulation;"
                        >
                          <span class="flex items-center justify-center w-full h-full pointer-events-none">
                            <Icon icon="ph:plus-bold" />
                          </span>
                        </button>
                        
                        <button
                          on:click={() => removeItem(i, result)}
                          class="ml-3 w-8 h-8 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors duration-200 relative z-10"
                          aria-label="Remove item"
                          disabled={isUpdatingCart}
                          type="button"
                          style="touch-action: manipulation;"
                        >
                          <span class="flex items-center justify-center w-full h-full pointer-events-none">
                            <Icon icon="ph:trash-bold" />
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            {:catch err}
              <div class="bg-[#151515]/70 backdrop-blur-sm rounded-2xl p-6 border border-red-500/20 text-center">
                <Icon icon="ph:warning-circle" class="text-red-400 text-3xl mb-2" />
                <p>There was an error loading this item. Please try refreshing the page.</p>
              </div>
            {/await}
          {/each}
        {/if}
      </div>

      <!-- Order Summary with background blur -->
      {#if cartDetails && cartDetails.list && cartDetails.list.length > 0}
        <div class="lg:w-1/3">
          <div 
            class="relative bg-[#151515]/30 backdrop-blur-md rounded-2xl border border-[#252525] overflow-hidden sticky top-4 transition-all duration-300 hover:shadow-glow"
            in:fade={{ duration: 200, delay: 300 }}
          >
            <div class="p-5 border-b border-[#252525]">
              <h2 class="text-xl font-bold flex items-center">
                <Icon icon="ph:receipt-bold" class="mr-2 text-accent" />
                Order Summary
              </h2>
            </div>
            
            <div class="p-5 space-y-4">
              <div class="flex justify-between items-center">
                <span class="text-gray-400">Subtotal</span>
                <span class="font-medium">₹{cartSubtotal.toFixed(2)}</span>
              </div>
              
              <div class="flex justify-between items-center pb-4 border-b border-[#252525]">
                <div>
                  <span class="text-gray-400">Shipping</span>
                  <div class="text-xs text-gray-500">India-Wide Flat Rate</div>
                </div>
                <span class="font-medium">₹{DELIVERY_FLAT_FEE}</span>
              </div>
              
              <div class="flex justify-between items-center pt-1">
                <span class="text-lg font-bold">Total</span>
                <span class="text-2xl font-bold text-accent">
                  ₹{(cartSubtotal + DELIVERY_FLAT_FEE).toFixed(2)}
                </span>
              </div>
              
              <button
                class="w-full mt-5 relative group/button overflow-hidden"
                class:opacity-50={isUpdatingCart}
                disabled={isUpdatingCart}
                on:click={() => goto('/checkout')}
              >
                <div class="absolute inset-0 bg-accent opacity-10 group-hover/button:opacity-20 transition-opacity duration-300"></div>
                
                <div class="relative flex items-center justify-center gap-2 bg-transparent border border-accent/30 rounded-xl px-5 py-3 font-medium text-accent">
                  <Icon icon="ph:shopping-cart-simple-bold" />
                  <span>Proceed to Checkout</span>
                  
                  <div class="absolute right-4 opacity-0 group-hover/button:opacity-100 transform group-hover/button:translate-x-1 transition-all duration-300">
                    <Icon icon="ph:arrow-right-bold" />
                  </div>
                </div>
              </button>
              
              <div class="text-center mt-3">
                <button 
                  class="text-sm text-gray-400 hover:text-white transition-colors duration-300 flex items-center justify-center gap-1 mx-auto"
                  on:click={() => goto('/products')}
                >
                  <Icon icon="ph:arrow-left-bold" />
                  Continue Shopping
                </button>
              </div>
              
              <div class="pt-4 border-t border-[#252525] flex items-center justify-center gap-3 text-gray-500">
                <Icon icon="ph:shield-check-bold" class="text-accent opacity-50" />
                <span class="text-xs">Secure Checkout</span>
                <Icon icon="ph:lock-simple-bold" class="text-accent opacity-50" />
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style lang="postcss">
  .shadow-glow {
    @apply [box-shadow:0_4px_20px_-5px_accent/10];
  }

  .shadow-glow-lg {
    @apply [box-shadow:0_8px_30px_-5px_accent/20];
  }

  /* Animation for price changes */
  @keyframes highlight {
    0% { background-color: hsl(var(--accent) / 0.1); }
    100% { background-color: transparent; }
  }

  .highlight-animation {
    animation: highlight 1.5s ease-out;
  }

  /* Smooth transitions */
  .transition-all {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 300ms;
  }

  /* Input styles */
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type=number] {
    -moz-appearance: textfield;
  }

  input:focus {
    outline: none;
  }

  /* Loading animation */
  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: .5; }
  }
</style>
