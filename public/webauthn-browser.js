// WebAuthn Browser Functions - Minimal Implementation
// Based on @simplewebauthn/browser functionality

function browserSupportsWebAuthn() {
  return window?.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === 'function';
}

async function startRegistration(creationOptionsJSON) {
  if (!browserSupportsWebAuthn()) {
    throw new Error('WebAuthn is not supported in this browser');
  }

  // Convert base64url strings to ArrayBuffers
  const publicKeyCredentialCreationOptions = {
    ...creationOptionsJSON,
    challenge: base64URLStringToBuffer(creationOptionsJSON.challenge),
    user: {
      ...creationOptionsJSON.user,
      id: base64URLStringToBuffer(creationOptionsJSON.user.id),
    },
  };

  if (creationOptionsJSON.excludeCredentials) {
    publicKeyCredentialCreationOptions.excludeCredentials = creationOptionsJSON.excludeCredentials.map(cred => ({
      ...cred,
      id: base64URLStringToBuffer(cred.id),
    }));
  }

  const credential = await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions,
  });

  if (!credential) {
    throw new Error('Registration was not completed');
  }

  const { id, rawId, response, type } = credential;

  return {
    id,
    rawId: bufferToBase64URLString(rawId),
    response: {
      clientDataJSON: bufferToBase64URLString(response.clientDataJSON),
      attestationObject: bufferToBase64URLString(response.attestationObject),
      transports: response.getTransports ? response.getTransports() : [],
    },
    type,
  };
}

async function startAuthentication(requestOptionsJSON) {
  if (!browserSupportsWebAuthn()) {
    throw new Error('WebAuthn is not supported in this browser');
  }

  // Convert base64url strings to ArrayBuffers
  const publicKeyCredentialRequestOptions = {
    ...requestOptionsJSON,
    challenge: base64URLStringToBuffer(requestOptionsJSON.challenge),
  };

  if (requestOptionsJSON.allowCredentials && requestOptionsJSON.allowCredentials.length > 0) {
    publicKeyCredentialRequestOptions.allowCredentials = requestOptionsJSON.allowCredentials.map(cred => ({
      ...cred,
      id: base64URLStringToBuffer(cred.id),
    }));
  }

  const credential = await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions,
  });

  if (!credential) {
    throw new Error('Authentication was not completed');
  }

  const { id, rawId, response, type } = credential;

  return {
    id,
    rawId: bufferToBase64URLString(rawId),
    response: {
      authenticatorData: bufferToBase64URLString(response.authenticatorData),
      clientDataJSON: bufferToBase64URLString(response.clientDataJSON),
      signature: bufferToBase64URLString(response.signature),
      userHandle: response.userHandle ? bufferToBase64URLString(response.userHandle) : null,
    },
    type,
  };
}

// Helper functions for base64url encoding/decoding
function bufferToBase64URLString(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const charCode of bytes) {
    str += String.fromCharCode(charCode);
  }

  const base64String = btoa(str);
  return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64URLStringToBuffer(base64URLString) {
  const base64 = base64URLString.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = base64.padEnd(base64.length + padLength, '=');

  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return buffer;
}

// Export functions to global scope for use in app.js
window.WebAuthnBrowser = {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn
};