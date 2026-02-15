# AegisKYC – What to Configure (API Keys & Environment)

This doc lists **everything you need to set** so the app runs correctly. Most of it goes in the **`.env`** file in the **project root** (same folder as this file).

---

## 1. Quick checklist

| What | Required? | Where to get / how to set |
|------|-----------|----------------------------|
| **MongoDB URL** | Yes | Local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) → connection string |
| **ENCRYPTION_MASTER_KEY** | Yes | Generate (see below) – 64 hex characters |
| **FLASK_SECRET_KEY** | Recommended | Any long random string (e.g. `openssl rand -hex 32`) |
| **JWT_SECRET** | Recommended | Same as above, or another long random string |
| **VAULT_MASTER_KEY** | Optional | Any strong string; used by identity vault (has default) |
| **CREDENTIAL_PRIVATE_KEY / PUBLIC_KEY** | Optional | RSA keypair for signing credentials (auto-generated if omitted) |
| **External API keys** | No | Geolocation uses free APIs (ip-api.com, ipapi.co) – no keys needed |

**No third-party API keys are required** for the built-in features (geolocation, OCR, etc.). Everything below is either in `.env` or local setup.

---

## 2. Required: MongoDB

- **Local:** Install [MongoDB](https://www.mongodb.com/try/download/community) and run it, then use:
  - `MONGO_URL=mongodb://localhost:27017/`
  - `MONGODB_URI=mongodb://localhost:27017/`
- **Atlas:** Create a cluster, get the connection string, then in `.env`:
  - `MONGO_URL=mongodb+srv://USER:PASSWORD@cluster.xxxxx.mongodb.net/aegis_kyc?retryWrites=true&w=majority`
  - Set `MONGODB_URI` to the same value.

Replace `USER`, `PASSWORD`, and cluster host with your real Atlas credentials.

---

## 3. Required: Encryption key (32-byte hex)

Used for PII encryption (AES-256). Must be **exactly 64 hexadecimal characters** (0–9, a–f).

**Generate once and put in `.env`:**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```
Copy the output and set:
```env
ENCRYPTION_MASTER_KEY=<paste_64_char_hex_here>
```
**Important:** If you change this key later, existing encrypted data cannot be decrypted. Back it up securely.

---

## 4. Recommended: Flask & JWT secrets

Used for session signing and organization JWT tokens.

**Generate (example):**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```
Use two different values in `.env`:
```env
FLASK_SECRET_KEY=<first_long_random_string>
JWT_SECRET=<second_long_random_string>
```

---

## 5. Optional: Identity vault key

Used by `identity_vault.py`. If not set, a default is used (fine for dev, not for production).

```env
VAULT_MASTER_KEY=your-strong-vault-key-string
```

---

## 6. Optional: RSA keypair for KYC credentials

Used to **sign** KYC credentials. If you don’t set these, the app generates a keypair at startup (OK for dev; for production you should set your own and keep the private key safe).

**Generate keypair:**
```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```
Put the **full PEM contents** (including `-----BEGIN ... -----` and `-----END ... -----`) into `.env`. Use `\n` for line breaks if you put them on one line:
```env
CREDENTIAL_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----"
CREDENTIAL_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIB...\n-----END PUBLIC KEY-----"
```

---

## 7. Optional: Audit log directory

Default is `audit_logs`. Override if you want logs elsewhere (relative to backend or absolute path):

```env
AUDIT_LOG_DIR=audit_logs
```

---

## 8. Production: PORT, HOST, SSL

When deploying behind HTTPS:

```env
PORT=8443
HOST=0.0.0.0
SSL_KEY_FILE=/path/to/private.key
SSL_CERT_FILE=/path/to/cert.pem
```

---

## 9. What does **not** need API keys

- **Geolocation:** Uses free services (ip-api.com, ipapi.co) – no key.
- **OCR:** Uses local Tesseract (and/or PaddleOCR) – install Tesseract on the machine; no cloud API key.
- **Deepfake / face / behavioral logic:** Implemented in-code – no external API keys.

So you **do not** need to sign up for or add any external API keys for the standard AegisKYC flow.

---

## 10. Summary: minimal `.env` to run

Minimum to run locally:

```env
MONGO_URL=mongodb://localhost:27017/
MONGODB_URI=mongodb://localhost:27017/
ENCRYPTION_MASTER_KEY=<64_hex_chars_from_secrets.token_hex(32)>
FLASK_SECRET_KEY=any-long-secret
FLASK_ENV=development
```

Use `.env.example` as a template: copy it to `.env` and fill in the values above.