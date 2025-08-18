describe('Lockout after multiple failed bioauth attempts', () => {
  it('locks user after 3 failed Face ID attempts', () => {
    cy.visit('/');
    cy.get('#email').type('demo@bioauth.test');
    cy.get('#password').type('Password123!', { log: false });
    cy.contains('button', 'Continue').click();

    cy.contains('button', 'Face ID').click();
    for (let i = 0; i < 3; i++) {
      cy.contains('button', 'Reject').click();
      cy.contains(/Biometric mismatch|LOCKED/).should('be.visible');
    }

    // Fourth attempt should show LOCKED
    cy.contains('button', 'Reject').click();
    cy.get('#lockout').should('be.visible');
    cy.contains('Account locked').should('be.visible');
  });
});
