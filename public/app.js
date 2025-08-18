// Use local WebAuthn browser library
let currentUser = null;

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Check WebAuthn support
  if (!window.WebAuthnBrowser.browserSupportsWebAuthn()) {
    document.getElementById('webauthnStatus').textContent = 'WebAuthn not supported in this browser';
  }
});

// Login with email/password
document.getElementById('continueBtn').addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const credStatus = document.getElementById('credStatus');
  
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email, password })
    });
    
    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
      credStatus.classList.add('hidden');
      document.getElementById('webauthnCard').classList.remove('hidden');
      
      // Check if user has registered authenticators
      if (currentUser.authenticators && currentUser.authenticators.length > 0) {
        document.getElementById('webauthnStatus').textContent = 'WebAuthn authenticator found. You can authenticate directly or register a new one.';
      } else {
        document.getElementById('webauthnStatus').textContent = 'No WebAuthn authenticators registered. Please register your biometric first.';
      }
    } else {
      const errorData = await res.json();
      credStatus.textContent = errorData.error || 'Invalid credentials';
      credStatus.classList.remove('hidden');
    }
  } catch (error) {
    credStatus.textContent = 'Network error. Please try again.';
    credStatus.classList.remove('hidden');
    console.error('Login error:', error);
  }
});

// WebAuthn Registration
document.getElementById('registerBtn').addEventListener('click', async () => {
  if (!currentUser) {
    document.getElementById('webauthnStatus').textContent = 'Please login first';
    return;
  }
  
  const statusEl = document.getElementById('webauthnStatus');
  const lockoutEl = document.getElementById('lockout');
  
  try {
    statusEl.textContent = 'Starting biometric registration...';
    
    // Get registration options from server
    const optionsRes = await fetch('/api/webauthn/register/begin', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email: currentUser.email })
    });
    
    if (!optionsRes.ok) {
      const error = await optionsRes.json();
      statusEl.textContent = error.error || 'Failed to start registration';
      return;
    }
    
    const options = await optionsRes.json();
    statusEl.textContent = 'Please provide your biometric (Face ID, Touch ID, Windows Hello, etc.)...';
    
    // Start WebAuthn registration
    const attResp = await window.WebAuthnBrowser.startRegistration(options);
    statusEl.textContent = 'Verifying registration...';
    
    // Send registration response to server
    const verificationRes = await fetch('/api/webauthn/register/complete', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        email: currentUser.email,
        response: attResp
      })
    });
    
    const verificationData = await verificationRes.json();
    
    if (verificationRes.ok && verificationData.verified) {
      statusEl.textContent = 'Biometric registration successful! You can now authenticate.';
      statusEl.className = 'success';
    } else {
      statusEl.textContent = verificationData.error || 'Registration failed';
      statusEl.className = 'error';
    }
  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'InvalidStateError') {
      statusEl.textContent = 'This authenticator is already registered';
    } else if (error.name === 'NotAllowedError') {
      statusEl.textContent = 'Registration cancelled or not allowed';
    } else if (error.name === 'AbortError') {
      statusEl.textContent = 'Registration timed out';
    } else {
      statusEl.textContent = 'Registration failed: ' + (error.message || 'Unknown error');
    }
    statusEl.className = 'error';
  }
});

// WebAuthn Authentication
document.getElementById('authenticateBtn').addEventListener('click', async () => {
  if (!currentUser) {
    document.getElementById('webauthnStatus').textContent = 'Please login first';
    return;
  }
  
  const statusEl = document.getElementById('webauthnStatus');
  const lockoutEl = document.getElementById('lockout');
  
  try {
    statusEl.textContent = 'Starting biometric authentication...';
    statusEl.className = 'muted';
    
    // Get authentication options from server
    const optionsRes = await fetch('/api/webauthn/authenticate/begin', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email: currentUser.email })
    });
    
    if (!optionsRes.ok) {
      const error = await optionsRes.json();
      statusEl.textContent = error.error || 'Failed to start authentication';
      statusEl.className = 'error';
      return;
    }
    
    const options = await optionsRes.json();
    statusEl.textContent = 'Please provide your biometric (Face ID, Touch ID, Windows Hello, etc.)...';
    
    // Start WebAuthn authentication
    const authResp = await window.WebAuthnBrowser.startAuthentication(options);
    statusEl.textContent = 'Verifying authentication...';
    
    // Send authentication response to server
    const verificationRes = await fetch('/api/webauthn/authenticate/complete', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        email: currentUser.email,
        response: authResp
      })
    });
    
    const verificationData = await verificationRes.json();
    
    if (verificationRes.ok && verificationData.verified) {
      statusEl.textContent = 'Biometric authentication successful!';
      statusEl.className = 'success';
      lockoutEl.classList.add('hidden');
      
      // Show dashboard
      document.getElementById('dashboard').classList.remove('hidden');
    } else if (verificationRes.status === 423) {
      statusEl.textContent = verificationData.error || 'Account locked';
      statusEl.className = 'error';
      lockoutEl.classList.remove('hidden');
    } else {
      statusEl.textContent = verificationData.error || 'Authentication failed';
      statusEl.className = 'error';
    }
  } catch (error) {
    console.error('Authentication error:', error);
    if (error.name === 'NotAllowedError') {
      statusEl.textContent = 'Authentication cancelled or not allowed';
    } else if (error.name === 'AbortError') {
      statusEl.textContent = 'Authentication timed out';
    } else {
      statusEl.textContent = 'Authentication failed: ' + (error.message || 'Unknown error');
    }
    statusEl.className = 'error';
  }
});

// Check if user has registered authenticators
document.getElementById('hasAuthenticatorBtn').addEventListener('click', async () => {
  if (!currentUser) {
    document.getElementById('webauthnStatus').textContent = 'Please login first';
    return;
  }
  
  const statusEl = document.getElementById('webauthnStatus');
  
  if (currentUser.authenticators && currentUser.authenticators.length > 0) {
    statusEl.textContent = `Found ${currentUser.authenticators.length} registered authenticator(s). You can authenticate.`;
    statusEl.className = 'success';
  } else {
    statusEl.textContent = 'No authenticators registered. Please register your biometric first.';
    statusEl.className = 'muted';
  }
});