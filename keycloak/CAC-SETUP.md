# Enabling CAC/PIV Login (X.509 Client Certificate Auth)

The `tms-realm` import already includes a `browser-cac` authentication flow
(see `realm-export.json`) that accepts a DoD CAC/PIV client certificate as an
**alternative** to username/password. It is **not** active yet - the realm
still uses Keycloak's default `browser` flow - because activating it requires
real infrastructure this local Docker setup doesn't have:

1. **TLS in front of Keycloak, with client-certificate request enabled.**
   Keycloak itself doesn't terminate mutual TLS for you in `start-dev` mode;
   put a reverse proxy (nginx, HAProxy, Apache) in front of it with
   `ssl_verify_client optional` (so users without a CAC still reach the
   username/password fallback) and forward the verified cert to Keycloak via
   the `X-SSL-CERT` header (Keycloak reads this when
   `X509ClientCertificateLookup` is configured for `haproxy`/`nginx`/`apache`
   in `proxy-headers`/`https-client-auth` server config).

2. **A DoD PKI trust store.** The proxy needs the DoD CA certificate chain
   (available from https://public.cyber.mil/pki-pke/) to validate that a
   presented CAC certificate is genuinely DoD-issued, not just any client
   cert.

3. **CAC reader middleware on each user's machine** (ActivClient, OpenSC, or
   the OS-native PIV driver) so the browser can present the certificate
   during the TLS handshake at all.

4. **An EDIPI (or other CAC identifier) on each Keycloak user.** The
   `cac-x509-config` authenticator config in `realm-export.json` extracts the
   trailing numeric segment of the certificate's Subject CN (the standard DoD
   CAC format `LAST.FIRST.MIDDLE.EDIPI`) and matches it against a Keycloak
   user attribute named `EDIPI`. Set that attribute on each user
   (Admin Console → Users → \<user\> → Attributes) once real CAC users are
   onboarded.

## Activating it once the above is in place

1. Admin Console → **Authentication** → confirm `browser-cac` imported
   correctly (three flows: `browser-cac`, `browser-cac forms`,
   `browser-cac Browser - Conditional OTP`).
2. **Realm settings** → **Login** tab (or **Authentication** → **Bindings**
   depending on version) → set **Browser Flow** to `browser-cac`.
3. Confirm the reverse proxy is passing verified client certs through before
   flipping this in production - test with a non-privileged realm first.

## Why the app itself needs zero code changes

The backend (`backend/src/middleware/syncUser.ts`) already trusts whichever
identity Keycloak vouches for in the access token - it doesn't care whether
that identity was established via password or X.509. Every approval record
already stores `{approver identity, role, timestamp}`
(`supervisorSignedAt`/`AOSignedAt` on `TrainingRequest`). The moment
`browser-cac` becomes the active flow, those become genuine CAC-backed
signatures with no application changes - only the Keycloak/infra
configuration above changes.
