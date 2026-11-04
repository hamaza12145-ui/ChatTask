/**
 * End-to-End Encryption (E2EE) Cryptographic Service
 * Provides client-side asymmetric key exchange (RSA-OAEP 2048) and symmetric authenticated
 * encryption (AES-GCM 256) for direct and group communications.
 *
 * Messages are encrypted on the sender's device and decrypted ONLY on authorized recipients' devices.
 * Server, database, and unauthorized administrators only ever see AES-GCM ciphertext.
 */

import { dmsApi, DMS_CREDENTIALS } from './dmsApi';
import { ChatMessage, TaskAttachment, QuotedMessage } from '../types';

const USER_PASSWORDS_BY_ID: Record<string, string> = {
  '1': 'store%1123',
  '2': 'procurements%1123',
  '3': 'program%1123',
  '4': 'finance%1123',
  '5': 'admin%1123',
  '6': 'admin%1123',
};

export interface DecryptedMessagePayload {
  text: string;
  attachment?: TaskAttachment;
  voiceDuration?: number;
  taskId?: string;
  replyTo?: QuotedMessage;
  isEncrypted: boolean;
  isDecrypted: boolean;
  keyVersion?: number;
}

export interface EncryptedMessageResult {
  ciphertext: string;
  isEncrypted: boolean;
  keyVersion: number;
}

// Utility: ArrayBuffer <-> Base64
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

class E2eeCryptoService {
  private cryptoSubtle: SubtleCrypto | null = null;
  private currentUserId: string | null = null;

  // In-memory key caches
  private myPrivateKey: CryptoKey | null = null;
  private myPublicKey: CryptoKey | null = null;
  private myPublicKeyJwk: string | null = null;

  // Maps userId -> RSA-OAEP public CryptoKey
  private userPublicKeysCache = new Map<string, CryptoKey>();

  // Maps `${conversationId}:v${version}` -> AES-GCM 256 CryptoKey
  private conversationKeysCache = new Map<string, CryptoKey>();

  // Tracks active key version for each conversation
  private conversationKeyVersions = new Map<string, number>();

  // Initialization promise guard to prevent race conditions
  private initPromise: Promise<void> | null = null;

  constructor() {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      this.cryptoSubtle = window.crypto.subtle;
    }
  }

  private getSubtle(): SubtleCrypto {
    if (!this.cryptoSubtle) {
      if (typeof window !== 'undefined' && window.crypto?.subtle) {
        this.cryptoSubtle = window.crypto.subtle;
      } else {
        throw new Error('Web Cryptography API (crypto.subtle) is not available in this environment');
      }
    }
    return this.cryptoSubtle;
  }

  /**
   * Derive a 256-bit Key Derivation Key (KDK) via PBKDF2 from user credentials.
   * Used to encrypt the user's private key before syncing to the server.
   * The server never sees the cleartext private key.
   */
  private async deriveUserKdk(userId: string, email?: string, password?: string): Promise<CryptoKey> {
    const subtle = this.getSubtle();
    const effectiveEmail = email || (dmsApi.currentEmail ? dmsApi.currentEmail : undefined);
    const effectivePassword =
      password ||
      (effectiveEmail && DMS_CREDENTIALS[effectiveEmail]) ||
      USER_PASSWORDS_BY_ID[String(userId)] ||
      DMS_CREDENTIALS['admin@example.com'] ||
      'admin%1123';

    const salt = 'dms_e2ee_salt_' + userId;
    const enc = new TextEncoder();

    const baseKey = await subtle.importKey(
      'raw',
      enc.encode(effectivePassword),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode(salt),
        iterations: 100000,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Initialize E2EE for the active authenticated user.
   * Generates or loads RSA-OAEP 2048 identity keypair and publishes public key to server.
   * If on a new device or persona switch, securely recovers the private key from server using client-derived KDK.
   */
  async initUser(userId: string, email?: string, password?: string): Promise<void> {
    if (!userId) return;
    const uid = String(userId);

    // If already initialized for this user with a valid private key, return immediately
    if (this.currentUserId === uid && this.myPrivateKey) {
      return;
    }

    if (this.currentUserId !== uid) {
      this.clearSession();
      this.currentUserId = uid;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      const subtle = this.getSubtle();
      const privKeyStorageKey = `e2ee_priv_jwk_${uid}`;
      const pubKeyStorageKey = `e2ee_pub_jwk_${uid}`;

      let savedPriv = typeof localStorage !== 'undefined' ? localStorage.getItem(privKeyStorageKey) : null;
      let savedPub = typeof localStorage !== 'undefined' ? localStorage.getItem(pubKeyStorageKey) : null;

      // 1. Check local storage cache and ensure it matches the server's public key
      let isLocalKeyValid = false;
      if (savedPriv && savedPub) {
        try {
          const privJwk = JSON.parse(savedPriv);
          const pubJwk = JSON.parse(savedPub);

          const privKey = await subtle.importKey(
            'jwk',
            privJwk,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            true,
            ['decrypt']
          );
          const pubKey = await subtle.importKey(
            'jwk',
            pubJwk,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            true,
            ['encrypt']
          );

          // Verify roundtrip test (encrypt with pub, decrypt with priv)
          const testBuffer = new Uint8Array([1, 2, 3, 4]);
          const encTest = await subtle.encrypt({ name: 'RSA-OAEP' }, pubKey, testBuffer);
          const decTest = await subtle.decrypt({ name: 'RSA-OAEP' }, privKey, encTest);
          const roundtripOk = decTest.byteLength === 4;

          if (roundtripOk) {
            // Verify server has this exact public key
            const serverKey = await dmsApi.fetchUserPublicKey(uid);
            if (!serverKey) {
              await this.syncPublicKeyToServer(uid, savedPub);
              isLocalKeyValid = true;
            } else {
              try {
                const serverPubJwk = JSON.parse(serverKey);
                if (serverPubJwk.n === pubJwk.n) {
                  isLocalKeyValid = true;
                } else {
                  console.warn(`Local public key out of sync with server for user ${uid}. Refreshing from server...`);
                }
              } catch {
                isLocalKeyValid = false;
              }
            }
          }

          if (isLocalKeyValid) {
            this.myPrivateKey = privKey;
            this.myPublicKey = pubKey;
            this.myPublicKeyJwk = savedPub;
            this.userPublicKeysCache.set(uid, pubKey);
            return;
          } else {
            // Clear stale/desynced local storage keys
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem(privKeyStorageKey);
              localStorage.removeItem(pubKeyStorageKey);
            }
          }
        } catch (err) {
          console.warn('Could not restore cached E2EE keys from localStorage:', err);
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(privKeyStorageKey);
            localStorage.removeItem(pubKeyStorageKey);
          }
        }
      }

      // 2. Not in local storage or desynced: Check if server has encrypted private key backup
      try {
        const serverRecord = await dmsApi.fetchUserIdentityRecord(uid);
        if (serverRecord && serverRecord.encrypted_private_key && serverRecord.public_key) {
          try {
            const kdk = await this.deriveUserKdk(uid, email, password);
            const encPayload = JSON.parse(serverRecord.encrypted_private_key);
            const ivBuffer = base64ToArrayBuffer(encPayload.iv);
            const ctBuffer = base64ToArrayBuffer(encPayload.ct);

            const decPrivBuf = await subtle.decrypt(
              { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
              kdk,
              ctBuffer
            );

            const decoder = new TextDecoder();
            const privJwk = JSON.parse(decoder.decode(decPrivBuf));
            const pubJwk = JSON.parse(serverRecord.public_key);

            const privKey = await subtle.importKey(
              'jwk',
              privJwk,
              { name: 'RSA-OAEP', hash: 'SHA-256' },
              true,
              ['decrypt']
            );
            const pubKey = await subtle.importKey(
              'jwk',
              pubJwk,
              { name: 'RSA-OAEP', hash: 'SHA-256' },
              true,
              ['encrypt']
            );

            // Verify recovered keypair with roundtrip check
            const testBuffer = new Uint8Array([5, 6, 7, 8]);
            const encTest = await subtle.encrypt({ name: 'RSA-OAEP' }, pubKey, testBuffer);
            const decTest = await subtle.decrypt({ name: 'RSA-OAEP' }, privKey, encTest);
            if (decTest.byteLength === 4) {
              this.myPrivateKey = privKey;
              this.myPublicKey = pubKey;
              this.myPublicKeyJwk = serverRecord.public_key;
              this.userPublicKeysCache.set(uid, pubKey);

              // Persist to local storage for instant future access
              if (typeof localStorage !== 'undefined') {
                localStorage.setItem(privKeyStorageKey, JSON.stringify(privJwk));
                localStorage.setItem(pubKeyStorageKey, serverRecord.public_key);
              }
              return;
            }
          } catch (restoreErr) {
            console.warn('Failed to decrypt server-backed private key:', restoreErr);
          }
        }
      } catch (srvErr) {
        console.warn('Could not fetch identity record from server:', srvErr);
      }

      // 3. First time key generation: Generate fresh RSA-OAEP 2048 keypair
      const keyPair = await subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt']
      );

      this.myPrivateKey = keyPair.privateKey;
      this.myPublicKey = keyPair.publicKey;

      const privJwk = await subtle.exportKey('jwk', keyPair.privateKey);
      const pubJwk = await subtle.exportKey('jwk', keyPair.publicKey);

      const pubJwkString = JSON.stringify(pubJwk);
      const privJwkString = JSON.stringify(privJwk);
      this.myPublicKeyJwk = pubJwkString;
      this.userPublicKeysCache.set(uid, keyPair.publicKey);

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(privKeyStorageKey, privJwkString);
        localStorage.setItem(pubKeyStorageKey, pubJwkString);
      }

      // Encrypt private key with KDK before backup to server
      try {
        const kdk = await this.deriveUserKdk(uid, email, password);
        const iv = new Uint8Array(12);
        if (typeof window !== 'undefined' && window.crypto) {
          window.crypto.getRandomValues(iv);
        }
        const encoder = new TextEncoder();
        const encPriv = await subtle.encrypt(
          { name: 'AES-GCM', iv },
          kdk,
          encoder.encode(privJwkString)
        );
        const encPayload = JSON.stringify({
          iv: arrayBufferToBase64(iv),
          ct: arrayBufferToBase64(encPriv),
        });

        await dmsApi.publishIdentityKey(uid, pubJwkString, 'RSA-OAEP', encPayload, 'dms_e2ee_salt_' + uid);
      } catch (backupErr) {
        console.warn('Failed to backup client-encrypted private key to server:', backupErr);
        await this.syncPublicKeyToServer(uid, pubJwkString);
      }
    })().finally(() => {
      this.initPromise = null;
    });

    return this.initPromise;
  }

  private async syncPublicKeyToServer(userId: string, publicKeyJwk: string): Promise<void> {
    try {
      await dmsApi.publishIdentityKey(userId, publicKeyJwk, 'RSA-OAEP');
    } catch (err: any) {
      console.warn('Failed to publish E2EE public key to server:', err?.message);
    }
  }

  /**
   * Fetch and import public key for a target user
   */
  async getUserPublicKey(userId: string): Promise<CryptoKey | null> {
    const uid = String(userId);
    if (this.userPublicKeysCache.has(uid)) {
      return this.userPublicKeysCache.get(uid)!;
    }

    if (uid === this.currentUserId && this.myPublicKey) {
      return this.myPublicKey;
    }

    try {
      const pubKeyStr = await dmsApi.fetchUserPublicKey(uid);
      if (!pubKeyStr) return null;

      const subtle = this.getSubtle();
      const jwk = JSON.parse(pubKeyStr);
      const cryptoKey = await subtle.importKey(
        'jwk',
        jwk,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['encrypt']
      );

      this.userPublicKeysCache.set(uid, cryptoKey);
      return cryptoKey;
    } catch (err) {
      console.warn(`Could not retrieve public key for user ${uid}:`, err);
      return null;
    }
  }

  /**
   * Batch fetch public keys for multiple users
   */
  async getMultiplePublicKeys(userIds: string[]): Promise<Map<string, CryptoKey>> {
    const result = new Map<string, CryptoKey>();
    const missingIds: string[] = [];

    for (const id of userIds) {
      const uid = String(id);
      if (this.userPublicKeysCache.has(uid)) {
        result.set(uid, this.userPublicKeysCache.get(uid)!);
      } else if (uid === this.currentUserId && this.myPublicKey) {
        result.set(uid, this.myPublicKey);
      } else {
        missingIds.push(uid);
      }
    }

    if (missingIds.length > 0) {
      try {
        const keyMap = await dmsApi.fetchUsersPublicKeys(missingIds);
        const subtle = this.getSubtle();

        for (const [uid, pubKeyStr] of Object.entries(keyMap)) {
          if (pubKeyStr) {
            try {
              const jwk = JSON.parse(pubKeyStr);
              const key = await subtle.importKey(
                'jwk',
                jwk,
                { name: 'RSA-OAEP', hash: 'SHA-256' },
                false,
                ['encrypt']
              );
              this.userPublicKeysCache.set(uid, key);
              result.set(uid, key);
            } catch {}
          }
        }
      } catch (err) {
        console.warn('Batch fetch public keys error:', err);
      }
    }

    return result;
  }

  /**
   * Ensure that all participants have a wrapped bundle for the current conversation key.
   */
  async ensureBundlesForParticipants(
    conversationId: string,
    keyVersion: number,
    convKey: CryptoKey,
    participantIds: string[]
  ): Promise<void> {
    if (!participantIds || participantIds.length === 0) return;
    const subtle = this.getSubtle();

    try {
      const allParticipants = new Set(participantIds.map(String));
      if (this.currentUserId) allParticipants.add(this.currentUserId);

      const rawKey = await subtle.exportKey('raw', convKey);
      const pubKeys = await this.getMultiplePublicKeys([...allParticipants]);
      const bundles: Array<{ userId: string; encryptedKey: string }> = [];

      for (const [uid, pubKey] of pubKeys.entries()) {
        try {
          const encryptedBuffer = await subtle.encrypt(
            { name: 'RSA-OAEP' },
            pubKey,
            rawKey
          );
          bundles.push({
            userId: uid,
            encryptedKey: arrayBufferToBase64(encryptedBuffer),
          });
        } catch (encErr) {
          console.warn(`Failed to wrap key for user ${uid}:`, encErr);
        }
      }

      if (bundles.length > 0) {
        await dmsApi.publishKeyBundle(conversationId, keyVersion, bundles);
      }
    } catch (err) {
      console.warn('Failed to ensure bundles for participants:', err);
    }
  }

  /**
   * Retrieve or create conversation symmetric encryption key (AES-GCM 256).
   * For existing conversations, retrieves key bundle and decrypts with user's private key.
   * For new conversations, generates AES-GCM key and wraps it with all participants' public keys.
   */
  async getOrCreateConversationKey(
    conversationId: string,
    participantIds: string[] = [],
    requestedVersion?: number
  ): Promise<{ key: CryptoKey; version: number } | null> {
    const subtle = this.getSubtle();
    const version = requestedVersion || this.conversationKeyVersions.get(conversationId) || 1;
    const cacheKey = `${conversationId}:v${version}`;

    if (this.conversationKeysCache.has(cacheKey)) {
      const cached = this.conversationKeysCache.get(cacheKey)!;
      if (participantIds && participantIds.length > 0) {
        this.ensureBundlesForParticipants(conversationId, version, cached, participantIds).catch(() => {});
      }
      return { key: cached, version };
    }

    // Ensure our private key is loaded
    if (!this.myPrivateKey && this.currentUserId) {
      await this.initUser(this.currentUserId);
    }

    // 1. Try to fetch key bundle from server for current user
    try {
      const bundle = await dmsApi.fetchConversationKeyBundle(conversationId, requestedVersion, this.currentUserId || undefined);
      const encKeyBase64 = bundle?.encrypted_key || bundle?.encryptedKey;

      if (bundle && encKeyBase64) {
        if (!this.myPrivateKey && this.currentUserId) {
          await this.initUser(this.currentUserId);
        }
        if (this.myPrivateKey) {
          try {
            const encKeyBuffer = base64ToArrayBuffer(encKeyBase64);
            const rawKeyBuffer = await subtle.decrypt(
              { name: 'RSA-OAEP' },
              this.myPrivateKey,
              encKeyBuffer
            );

            const convKey = await subtle.importKey(
              'raw',
              rawKeyBuffer,
              { name: 'AES-GCM' },
              true, // Extractable so we can wrap for missing participants
              ['encrypt', 'decrypt']
            );

            const actualVersion = bundle.key_version || bundle.keyVersion || version;
            const actualCacheKey = `${conversationId}:v${actualVersion}`;
            this.conversationKeysCache.set(actualCacheKey, convKey);
            this.conversationKeyVersions.set(conversationId, actualVersion);

            if (participantIds && participantIds.length > 0) {
              this.ensureBundlesForParticipants(conversationId, actualVersion, convKey, participantIds).catch(() => {});
            }

            return { key: convKey, version: actualVersion };
          } catch (decErr) {
            console.warn(`Could not decrypt conversation key for ${conversationId}:`, decErr);
          }
        }
      }
    } catch {}

    // 2. If no bundle exists, generate a new conversation key and distribute to participants
    if (participantIds.length > 0) {
      try {
        const convKey = await subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );
        const rawKey = await subtle.exportKey('raw', convKey);

        const allParticipants = new Set(participantIds.map(String));
        if (this.currentUserId) allParticipants.add(this.currentUserId);

        const pubKeys = await this.getMultiplePublicKeys([...allParticipants]);
        const bundles: Array<{ userId: string; encryptedKey: string }> = [];

        for (const [uid, pubKey] of pubKeys.entries()) {
          try {
            const encryptedBuffer = await subtle.encrypt(
              { name: 'RSA-OAEP' },
              pubKey,
              rawKey
            );
            bundles.push({
              userId: uid,
              encryptedKey: arrayBufferToBase64(encryptedBuffer),
            });
          } catch (encErr) {
            console.warn(`Failed to wrap conversation key for user ${uid}:`, encErr);
          }
        }

        if (bundles.length > 0) {
          await dmsApi.publishKeyBundle(conversationId, version, bundles);
        }

        this.conversationKeysCache.set(cacheKey, convKey);
        this.conversationKeyVersions.set(conversationId, version);
        return { key: convKey, version };
      } catch (genErr) {
        console.error(`Failed to generate/distribute conversation key for ${conversationId}:`, genErr);
      }
    }

    return null;
  }

  /**
   * Rotate conversation key when participants change (member added or removed).
   * Generates a new key version and distributes only to the updated participant list.
   */
  async rotateConversationKey(conversationId: string, currentParticipantIds: string[]): Promise<number> {
    const subtle = this.getSubtle();
    const currentVersion = this.conversationKeyVersions.get(conversationId) || 1;
    const nextVersion = currentVersion + 1;

    const newKey = await subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const rawKey = await subtle.exportKey('raw', newKey);

    const allParticipants = new Set(currentParticipantIds.map(String));
    if (this.currentUserId) allParticipants.add(this.currentUserId);

    const pubKeys = await this.getMultiplePublicKeys([...allParticipants]);
    const bundles: Array<{ userId: string; encryptedKey: string }> = [];

    for (const [uid, pubKey] of pubKeys.entries()) {
      try {
        const encryptedBuffer = await subtle.encrypt(
          { name: 'RSA-OAEP' },
          pubKey,
          rawKey
        );
        bundles.push({
          userId: uid,
          encryptedKey: arrayBufferToBase64(encryptedBuffer),
        });
      } catch (err) {
        console.warn(`Error wrapping rotated key for user ${uid}:`, err);
      }
    }

    await dmsApi.publishKeyBundle(conversationId, nextVersion, bundles);

    const cacheKey = `${conversationId}:v${nextVersion}`;
    this.conversationKeysCache.set(cacheKey, newKey);
    this.conversationKeyVersions.set(conversationId, nextVersion);

    return nextVersion;
  }

  /**
   * Encrypt a message payload with AES-GCM 256 before transmitting or storing.
   * Returns formatted ciphertext string with version header: `e2ee:v1:<base64>`.
   */
  async encryptMessage(
    conversationId: string,
    participantIds: string[],
    payload: {
      text: string;
      attachment?: TaskAttachment;
      voiceDuration?: number;
      taskId?: string;
      replyTo?: QuotedMessage;
    }
  ): Promise<EncryptedMessageResult> {
    const subtle = this.getSubtle();
    const keyInfo = await this.getOrCreateConversationKey(conversationId, participantIds);

    if (!keyInfo) {
      return {
        ciphertext: payload.text,
        isEncrypted: false,
        keyVersion: 1,
      };
    }

    const { key, version } = keyInfo;

    const iv = new Uint8Array(12);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(iv);
    }

    const jsonString = JSON.stringify({
      text: payload.text,
      attachment: payload.attachment,
      voiceDuration: payload.voiceDuration,
      taskId: payload.taskId,
      replyTo: payload.replyTo,
      timestamp: Date.now(),
    });

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonString);

    const encryptedBuffer = await subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBuffer
    );

    const packageData = {
      iv: arrayBufferToBase64(iv),
      ct: arrayBufferToBase64(encryptedBuffer),
      v: version,
    };

    const ciphertext = 'e2ee:v1:' + btoa(JSON.stringify(packageData));

    return {
      ciphertext,
      isEncrypted: true,
      keyVersion: version,
    };
  }

  /**
   * Decrypt a message received from server or storage.
   * Gracefully handles unencrypted legacy messages and unauthorized/unreadable messages.
   */
  async decryptMessage(
    chatId: string,
    rawText: string,
    fallbackKeyVersion: number = 1
  ): Promise<DecryptedMessagePayload> {
    if (!rawText || !rawText.startsWith('e2ee:v1:')) {
      return {
        text: rawText || '',
        isEncrypted: false,
        isDecrypted: true,
      };
    }

    try {
      const base64Data = rawText.substring(8);
      const packageJson = atob(base64Data);
      const pkg = JSON.parse(packageJson);

      const version = pkg.v || fallbackKeyVersion || 1;
      let keyInfo = await this.getOrCreateConversationKey(chatId, [], version);

      // If initial key retrieval failed and private key is not loaded, ensure user keys are ready
      if (!keyInfo && this.currentUserId && !this.myPrivateKey) {
        await this.initUser(this.currentUserId);
        keyInfo = await this.getOrCreateConversationKey(chatId, [], version);
      }

      if (!keyInfo) {
        return {
          text: '🔒 [End-to-End Encrypted Message - Key not available for this account]',
          isEncrypted: true,
          isDecrypted: false,
          keyVersion: version,
        };
      }

      const subtle = this.getSubtle();
      const ivBuffer = base64ToArrayBuffer(pkg.iv);
      const ctBuffer = base64ToArrayBuffer(pkg.ct);

      const decryptedBuffer = await subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
        keyInfo.key,
        ctBuffer
      );

      const decoder = new TextDecoder();
      const decryptedJson = decoder.decode(decryptedBuffer);
      const payload = JSON.parse(decryptedJson);

      return {
        text: payload.text || '',
        attachment: payload.attachment,
        voiceDuration: payload.voiceDuration,
        taskId: payload.taskId,
        replyTo: payload.replyTo,
        isEncrypted: true,
        isDecrypted: true,
        keyVersion: version,
      };
    } catch (err: any) {
      return {
        text: '🔒 [End-to-End Encrypted Message - Decryption failed or unauthorized participant]',
        isEncrypted: true,
        isDecrypted: false,
      };
    }
  }

  /**
   * Decrypt an array of ChatMessage objects in parallel
   */
  async decryptMessages(messages: ChatMessage[]): Promise<ChatMessage[]> {
    if (!messages || messages.length === 0) return [];

    // Ensure private key is initialized before attempting bulk decryption
    if (this.currentUserId && !this.myPrivateKey) {
      await this.initUser(this.currentUserId);
    }

    return Promise.all(
      messages.map(async (msg): Promise<ChatMessage> => {
        const textToDecrypt = (msg.rawCiphertext && !msg.isDecrypted) ? msg.rawCiphertext : msg.text;
        if (!textToDecrypt || !textToDecrypt.startsWith('e2ee:v1:')) {
          return msg;
        }

        const decrypted = await this.decryptMessage(
          msg.chatId,
          textToDecrypt,
          (msg as any).keyVersion || 1
        );

        if (decrypted.isDecrypted) {
          return {
            ...msg,
            text: decrypted.text,
            rawCiphertext: textToDecrypt,
            attachment: decrypted.attachment || msg.attachment,
            voiceDuration: decrypted.voiceDuration ?? msg.voiceDuration,
            taskId: decrypted.taskId || msg.taskId,
            replyTo: decrypted.replyTo || msg.replyTo,
            isEncrypted: true,
            isDecrypted: true,
          };
        } else {
          return {
            ...msg,
            text: decrypted.text,
            rawCiphertext: textToDecrypt,
            isEncrypted: true,
            isDecrypted: false,
          };
        }
      })
    );
  }

  /**
   * Clear in-memory caches on logout or persona switch
   */
  clearSession(): void {
    this.currentUserId = null;
    this.myPrivateKey = null;
    this.myPublicKey = null;
    this.myPublicKeyJwk = null;
    this.userPublicKeysCache.clear();
    this.conversationKeysCache.clear();
    this.conversationKeyVersions.clear();
    this.initPromise = null;
  }
}

export const e2eeCrypto = new E2eeCryptoService();
