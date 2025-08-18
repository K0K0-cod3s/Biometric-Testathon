const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// In-memory storage (use proper database in production)
const users = new Map(); // email -> user data
const authenticators = new Map(); // credentialID -> authenticator data
let failCounts = {}; // track failed bio attempts by email

// WebAuthn configuration
const RP_ID = process.env.NODE_ENV === 'production' ? 'yourdomain.com' : 'localhost';
const RP_NAME = 'Bioauth Demo App';
const ORIGIN = process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : `http://localhost:${process.env.PORT || 3000}`;

// Clean up old fail count entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;
  
  for (const [email, data] of Object.entries(failCounts)) {
    if (typeof data === 'object' && data.lastAttempt && now - data.lastAttempt > thirtyMinutes) {
      delete failCounts[email];
    }
  }
}, 30 * 60 * 1000);

// Simulated REST endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  
  // Input validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password must be strings' });
  }
  
  if (email === 'demo@bioauth.test' && password === 'Password123!') {
    // Check if user exists, if not create them
    if (!users.has(email)) {
      const userId = uuidv4();
      users.set(email, {
        id: userId,
        idBuffer: new TextEncoder().encode(userId), // Convert to Uint8Array for WebAuthn
        email: email,
        authenticators: []
      });
    }
    return res.json({ next: 'webauthn', user: users.get(email) });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
});

// WebAuthn Registration - Begin
app.post('/api/webauthn/register/begin', async (req, res) => {
  const { email } = req.body || {};
  
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  const user = users.get(email);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  try {
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: user.idBuffer, // Use Uint8Array instead of string
      userName: user.email,
      userDisplayName: user.email,
      attestationType: 'none',
      excludeCredentials: user.authenticators.map(authenticator => ({
        id: authenticator.credentialID,
        type: 'public-key',
        transports: authenticator.transports,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform',
      },
    });
    
    // Store challenge for verification
    user.currentChallenge = options.challenge;
    users.set(email, user);
    
    res.json(options);
  } catch (error) {
    console.error('Registration begin error:', error);
    res.status(500).json({ error: 'Failed to generate registration options' });
  }
});

// WebAuthn Registration - Complete
app.post('/api/webauthn/register/complete', async (req, res) => {
  const { email, response } = req.body || {};
  
  if (!email || !response) {
    return res.status(400).json({ error: 'Email and response are required' });
  }
  
  const user = users.get(email);
  if (!user || !user.currentChallenge) {
    return res.status(404).json({ error: 'User not found or no active registration' });
  }
  
  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });
    
    const { verified, registrationInfo } = verification;
    
    if (verified && registrationInfo) {
      const { credentialPublicKey, credentialID, counter } = registrationInfo;
      
      const existingDevice = user.authenticators.find(device => {
        if (device.credentialID && credentialID) {
          // Compare credential IDs as base64url strings or buffers
          const deviceIdStr = Buffer.isBuffer(device.credentialID) 
            ? device.credentialID.toString('base64url') 
            : device.credentialID;
          const currentIdStr = Buffer.isBuffer(credentialID) 
            ? credentialID.toString('base64url') 
            : credentialID;
          return deviceIdStr === currentIdStr;
        }
        return false;
      });
      
      if (!existingDevice) {
        const newAuthenticator = {
          credentialID,
          credentialPublicKey,
          counter,
          transports: response.response.transports || [],
        };
        
        user.authenticators.push(newAuthenticator);
        authenticators.set(credentialID, newAuthenticator);
      }
      
      user.currentChallenge = undefined;
      users.set(email, user);
      
      res.json({ verified: true });
    } else {
      res.status(400).json({ error: 'Registration verification failed', verified: false });
    }
  } catch (error) {
    console.error('Registration complete error:', error);
    res.status(500).json({ error: 'Registration verification failed' });
  }
});

// WebAuthn Authentication - Begin
app.post('/api/webauthn/authenticate/begin', async (req, res) => {
  const { email } = req.body || {};
  
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  const user = users.get(email);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  try {
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: user.authenticators.map(authenticator => ({
        id: authenticator.credentialID,
        type: 'public-key',
        transports: authenticator.transports,
      })),
      userVerification: 'preferred',
    });
    
    user.currentChallenge = options.challenge;
    users.set(email, user);
    
    res.json(options);
  } catch (error) {
    console.error('Authentication begin error:', error);
    res.status(500).json({ error: 'Failed to generate authentication options' });
  }
});

// WebAuthn Authentication - Complete
app.post('/api/webauthn/authenticate/complete', async (req, res) => {
  const { email, response } = req.body || {};
  
  if (!email || !response) {
    return res.status(400).json({ error: 'Email and response are required' });
  }
  
  const user = users.get(email);
  if (!user || !user.currentChallenge) {
    return res.status(404).json({ error: 'User not found or no active authentication' });
  }
  
  const authenticator = user.authenticators.find(device => {
    if (device.credentialID && response.rawId) {
      // Compare credential IDs as base64url strings
      const deviceIdStr = Buffer.isBuffer(device.credentialID) 
        ? device.credentialID.toString('base64url') 
        : device.credentialID;
      const responseIdStr = typeof response.rawId === 'string' 
        ? response.rawId 
        : Buffer.from(response.rawId).toString('base64url');
      return deviceIdStr === responseIdStr;
    }
    return false;
  });
  
  if (!authenticator) {
    return res.status(400).json({ error: 'Authenticator not found' });
  }
  
  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: authenticator.credentialID,
        credentialPublicKey: authenticator.credentialPublicKey,
        counter: authenticator.counter,
      },
    });
    
    const { verified, authenticationInfo } = verification;
    
    if (verified) {
      authenticator.counter = authenticationInfo.newCounter;
      user.currentChallenge = undefined;
      users.set(email, user);
      
      // Reset fail counts on successful auth
      failCounts[email] = { count: 0, lastAttempt: Date.now() };
      
      res.json({ verified: true, token: 'jwt-webauthn-demo' });
    } else {
      // Track failed attempts
      failCounts[email] = failCounts[email] || { count: 0, lastAttempt: Date.now() };
      failCounts[email].count += 1;
      failCounts[email].lastAttempt = Date.now();
      
      if (failCounts[email].count >= 3) {
        return res.status(423).json({ error: 'Account locked due to failed authentication attempts' });
      }
      
      res.status(401).json({ error: 'Authentication verification failed', verified: false });
    }
  } catch (error) {
    console.error('Authentication complete error:', error);
    res.status(500).json({ error: 'Authentication verification failed' });
  }
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Mock app running at http://localhost:${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please use a different port with: PORT=<port> npm run dev:server`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});
