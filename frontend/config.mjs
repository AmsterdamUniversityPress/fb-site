export default {
  frontendDevProxy: [
    ['/api', {
      target: 'http://localhost:4444',
      logLevel: 'debug',
      changeOrigin: true,
      pathRewrite: { '^/api': '' },
    }],
  ],
  devServerClient: {
    webSocketURL: 'wss://fb-dev.alleycat.cc/ws',
  },
}
