<template>
  <div class="atlas">
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="masthead">
      <NuxtLink class="brand" to="/" aria-label="Systems Atlas home">
        <svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="12" fill="currentColor" /><path d="M10 29 20 10l10 19M14 23h12M20 10v21" fill="none" stroke="#e5ef9e" stroke-width="1.8" /></svg>
        Systems Atlas
      </NuxtLink>
      <NuxtLink to="/" class="map-link">Your learning map <span aria-hidden="true">↗</span></NuxtLink>
    </header>
    <NuxtPage />
    <footer><span>Build understanding, one request at a time.</span><span>A field guide to system design</span></footer>
  </div>
</template>
