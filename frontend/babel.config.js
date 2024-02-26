module.exports = (api) => {
  api.cache.forever ()
  return {
    presets: [
      '@babel/preset-react',
    ],
    plugins: [
      // --- reduce code size and avoid namespace pollution (e.g. global
      // polyfills; be sure to add @babel/runtime to runtime deps)
      '@babel/transform-runtime',
      '@babel/syntax-import-meta',
      'alleycat-stick-transforms',
    ],
  }
}
