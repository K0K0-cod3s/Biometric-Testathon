describe('Permissions denial during bioauth', () => {
  it('shows error when OS denies biometric permissions', () => {
    cy.visit('/');
    cy.get('#email').type('demo@bioauth.test');
    cy.get('#password').type('Password123!', { log: false });
    cy.contains('button', 'Continue').click();

    cy.contains('button', 'Deny Permissions').click();
    cy.contains('Biometric permissions denied by OS').should('be.visible');
  });
});
