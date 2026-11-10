<template>
  <main class="atlas">
    <header class="masthead">
      <a class="brand" href="/" aria-label="Systems Atlas home">
        <svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="12" fill="currentColor" /><path d="M10 29 20 10l10 19M14 23h12M20 10v21" fill="none" stroke="#e5ef9e" stroke-width="1.8" /></svg>
        Systems Atlas
      </a>
      <span class="edition">A FIELD GUIDE TO SYSTEM DESIGN</span>
    </header>

    <section class="intro" aria-labelledby="title">
      <p class="eyebrow">EVERY SYSTEM STARTS WITH A REQUEST</p>
      <h1 id="title">Big systems.<br>Small first steps.</h1>
      <p class="lead">Learn how the apps you use actually work. Follow a request, explore the moving parts, and build your intuition along the way.</p>
      <div class="status"><span aria-hidden="true" /> Project foundation · Curriculum coming next</div>
    </section>

    <figure class="request-map" aria-labelledby="map-title">
      <figcaption id="map-title">01 / THE JOURNEY OF A REQUEST</figcaption>
      <svg viewBox="0 0 760 180" role="img" aria-label="A browser sends a request to an API. The API reads a database and returns a response to the browser.">
        <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="m1 1 5 3-5 3" fill="none" stroke="#567769" stroke-width="1.5" /></marker></defs>
        <path d="M190 64H300M460 64H570M570 116H460M300 116H190" fill="none" stroke="#567769" stroke-width="1.5" marker-end="url(#arrow)" />
        <g fill="#fafbf7" stroke="#c8d5c8"><rect x="30" y="40" width="160" height="100" rx="14" /><rect x="300" y="40" width="160" height="100" rx="14" /><rect x="570" y="40" width="160" height="100" rx="14" /></g>
        <g fill="#203e31" text-anchor="middle" font-size="18" font-family="Arial, sans-serif"><text x="110" y="85">Browser</text><text x="380" y="85">API</text><text x="650" y="85">Database</text></g>
        <g fill="#607468" text-anchor="middle" font-size="12" font-family="Arial, sans-serif"><text x="110" y="109">Where you click</text><text x="380" y="109">Where work begins</text><text x="650" y="109">Where data lives</text><text x="245" y="53">request</text><text x="515" y="53">read</text><text x="245" y="137">response</text><text x="515" y="137">result</text></g>
      </svg>
      <p>A browser, an API, a database. A starting point for understanding what happens after you click.</p>
    </figure>

    <footer><span>Build understanding, one request at a time.</span><a href="https://github.com/SaqifHoque/systems-atlas" target="_blank" rel="noopener noreferrer">View on GitHub ↗</a></footer>
  </main>
</template>
