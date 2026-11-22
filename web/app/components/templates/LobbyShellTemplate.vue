<template>
  <div class="min-h-[100dvh] flex flex-col bg-[#161B22] text-slate-100">
    <slot name="header" />

    <main class="flex-1 w-full max-w-[1220px] mx-auto px-4 sm:px-6 py-5 sm:py-8 flex flex-col gap-6 sm:gap-8">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
        <section class="lg:col-span-7 flex flex-col"><slot name="hero-visual" /></section>
        <section class="lg:col-span-5 flex flex-col"><slot name="setup-panel" /></section>
      </div>

      <section class="pt-6 border-t border-[#2A3647]"><slot name="footer-rules" /></section>
    </main>

    <slot name="modal" />
  </div>
</template>
