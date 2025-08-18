describe('Network interruption during bioauthentication', () => {
  it('handles a network drop mid-flow and recovers', () => {
    cy.visit('/');
    cy.get('#email').type('demo@bioauth.test');
    cy.get('#password').type('Password123!', { log: false });
    cy.contains('button', 'Continue').click();

    cy.contains('button', 'Face ID').click();

    // Simulate network drop via UI
    cy.contains('button', 'Simulate Network Drop').click();
    cy.contains('Network interrupted').should('be.visible');

    // Attempting approval should do nothing; then restore network
    cy.contains('button', 'Approve').click();
    cy.wait(500);
    cy.contains('button', 'Simulate Network Drop').click(); // restore
    cy.contains('Network restored').should('be.visible');

    // Approve now succeeds
    cy.contains('button', 'Approve').click();
    cy.contains('Admin Dashboard').should('be.visible');
  });
});
