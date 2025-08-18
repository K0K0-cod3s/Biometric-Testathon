const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4003',
    defaultCommandTimeout: 8000,
    video: false,
    setupNodeEvents(on, config) {
      // plugin hooks
      return config;
    },
  },
});

require('@applitools/eyes-cypress')(module);
