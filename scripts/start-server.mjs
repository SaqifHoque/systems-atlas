// Keep npm start convenient while matching Nitro's production runtime contract.
process.env.NODE_ENV ??= 'production'
await import('../.output/server/index.mjs')
