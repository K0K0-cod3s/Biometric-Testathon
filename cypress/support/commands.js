import '@applitools/eyes-cypress/commands';

// Custom commands for AI-assisted steps (placeholders)
Cypress.Commands.add('aiSuggestTestData', (seed='') => {
  // In real usage, call your AI tool or load from fixture.
  return { email: 'demo@bioauth.test', password: 'Password123!' };
});
