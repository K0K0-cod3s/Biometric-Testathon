describe('Bioauthentication success and failure', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('#email').type('demo@bioauth.test');
    cy.get('#password').type('Password123!', { log: false });
    cy.contains('button', 'Continue').click();
  });

  it('Face ID success path', () => {
    cy.contains('button', 'Face ID').click();
    cy.contains('button', 'Approve').click();
    cy.contains('Admin Dashboard').should('be.visible');
  });

  it('Face ID failure (rejected)', () => {
    cy.contains('button', 'Face ID').click();
    cy.contains('button', 'Reject').click();
    cy.contains('Biometric mismatch').should('be.visible');
    cy.contains('Admin Dashboard').should('not.exist');
  });
});
