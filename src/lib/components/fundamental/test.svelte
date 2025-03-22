<script>
	import Logo from "$lib/svg/logo_main.svg"
  import Cart from "$lib/svg/add_to_cart_icon.svg"
</script>
<div class="sticky top-0 z-4">
    <nav class="">
      <div class="mx-auto max-w-auto px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center space-around justify-center">
          <div class="flex items-center">
            <div class="shrink-0">
              <a href="/"><img class="h-3/4 w-full" src="{Logo}" alt="Your Company"></a>
            </div>
            <div class="hidden md:block">
              <div class="ml-10 flex items-center space-x-4">
                <a href="/" class=":bg-white text-black px-1 py-1 font-bold text-2xl" aria-current="page">Crafts</a>
                <a href="/about" class="text-gray-300 hover:bg-gray-700 hover:text-white rounded-md px-3 py-2 text-md font-medium">About</a>
                <a href="/crafting" class="text-gray-300 hover:bg-gray-700 hover:text-white rounded-md px-3 py-2 text-md font-large">Start Crafting</a>
                <a href="/cart"><img src="{Cart}" alt="cart"/></a>
              </div>
            </div>
          </div>
          <div class="ml-2 -mr-2 flex md:hidden">
            <!-- Mobile menu button -->
            <button type="button" class="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-hidden focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800" aria-controls="mobile-menu" aria-expanded="false">
              <span class="absolute -inset-0.5"></span>
              <span class="sr-only">Open main menu</span>
              <!-- Menu open: "hidden", Menu closed: "block" -->
              <svg class="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
              <!-- Menu open: "block", Menu closed: "hidden" -->
              <svg class="hidden h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <a class="ml-2" href="/cart"><img src="{Cart}" alt="cart"/></a>
          </div>
        </div>
      </div>
  
      <!-- Mobile menu, show/hide based on menu state. -->
      <div class="md:hidden" id="mobile-menu">
        <div class="space-y-1 px-2 pb-3 pt-2 sm:px-3">
          <!-- Current: "bg-gray-900 text-white", Default: "text-gray-300 hover:bg-gray-700 hover:text-white" -->
          <a href="#" class="bg-gray-900 text-white block rounded-md px-3 py-2 text-base font-medium" aria-current="page">Crafts</a>
          <a href="#" class="text-gray-300 hover:bg-gray-700 hover:text-white block rounded-md px-3 py-2 text-base font-medium">About</a>
          <a href="#" class="text-gray-300 hover:bg-gray-700 hover:text-white block rounded-md px-3 py-2 text-base font-medium">Sell your craft</a>
        </div>
      </div>
    </nav>
  
  </div>