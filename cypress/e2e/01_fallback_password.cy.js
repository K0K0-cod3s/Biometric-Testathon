describe('WebAuthn Biometric Authentication', () => {
  beforeEach(() => {
    // Mock WebAuthn APIs since Cypress can't access real biometrics
    cy.window().then((win) => {
      // Mock navigator.credentials.create for registration
      cy.stub(win.navigator.credentials, 'create').resolves({
        id: 'test-credential-id',
        rawId: new ArrayBuffer(32),
        type: 'public-key',
        response: {
          clientDataJSON: new ArrayBuffer(121),
          attestationObject: new ArrayBuffer(306),
          transports: ['internal']
        }
      });
      
      // Mock navigator.credentials.get for authentication
      cy.stub(win.navigator.credentials, 'get').resolves({
        id: 'test-credential-id',
        rawId: new ArrayBuffer(32),
        type: 'public-key',
        response: {
          clientDataJSON: new ArrayBuffer(121),
          authenticatorData: new ArrayBuffer(37),
          signature: new ArrayBuffer(70),
          userHandle: null
        }
      });
    });
  });

  it('should successfully register and authenticate with WebAuthn', () => {
    cy.visit('/');
    
    // Login with credentials
    cy.get('#email').type('demo@bioauth.test');
    cy.get('#password').type('Password123!', { log: false });
    cy.contains('button', 'Continue').click();

    // Verify WebAuthn card is shown
    cy.get('#webauthnCard').should('be.visible');
    cy.contains('No WebAuthn authenticators registered').should('be.visible');

    // Register biometric
    cy.contains('button', 'Register Biometric').click();
    cy.contains('Biometric registration successful', { timeout: 10000 }).should('be.visible');

    // Authenticate with biometric
    cy.contains('button', 'Authenticate').click();
    cy.contains('Biometric authentication successful', { timeout: 10000 }).should('be.visible');

    // Verify dashboard is shown
    cy.contains('Admin Dashboard').should('be.visible');
  });

  it('should handle WebAuthn registration errors gracefully', () => {
    cy.window().then((win) => {
      // Mock registration failure
      cy.stub(win.navigator.credentials, 'create').rejects(new Error('NotAllowedError'));
    });

    cy.visit('/');
    
    // Login with credentials
    cy.get('#email').type('demo@bioauth.test');
    cy.get('#password').type('Password123!', { log: false });
    cy.contains('button', 'Continue').click();

    // Try to register biometric (should fail)
    cy.contains('button', 'Register Biometric').click();
    cy.contains('Registration cancelled or not allowed').should('be.visible');
  });
});
