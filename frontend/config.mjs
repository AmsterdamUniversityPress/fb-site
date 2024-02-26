export default {
  frontendDevProxy: [
    ['/api', {
      target: 'http://localhost:4444',
      logLevel: 'debug',
      changeOrigin: true,
      pathRewrite: { '^/api': '' },
    }],
  ],
}
