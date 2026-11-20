# Cloudflare Access

How the extension reaches a MeTube behind Cloudflare Access, how the owner's setup is made, and how to diagnose it. Read before touching authentication, `lib/metube.js`'s requests, the auth rule, or when "Test connection" fails behind Access. The code-level decision is in `architecture.md` (2026-11-20); the homelab side is `docs/cloudflare-access.md`, "Machine clients", in `costardrouge/homelab`.

## How it works (2026-11-20)

- **Why a token**: Access answers any request without an Access session with a `302` to `<team>.cloudflareaccess.com`. A tab follows it and signs in; the service worker can't (no cookie: `credentials: 'omit'`; no permission on the Access host, so following it ends in a CORS "Failed to fetch"). A **service token** is Access's way in for a non-person client.
- **What is sent**: `authHeaders()` (`lib/metube.js`) adds `CF-Access-Client-Id` and `CF-Access-Client-Secret` (both settings fields, both needed) to every service-worker request, next to `Authorization: Basic` when username/password are set. The player's `<video>` gets the same headers from the one DNR rule (`sw/auth-rule.js`: `GET`, media, initiated by the extension, under the MeTube URL), so YouTube never sees them.
- **What Access checks**: a policy whose action is **Service Auth** (`non_identity` in the API) including that token, on MeTube's Access application. An *Allow* policy ignores tokens (it asks for an identity). Access then lets the request through and hands cloudflared a signed token, so "Protect with Access" on the tunnel route stays on.
- **Redirects are never followed** (`redirect: 'manual'`): MeTube's API never redirects, so a 3xx means a sign-in page is in the way → fatal `access` error, "redirected the request … set a service token". That message is the signature of a missing, wrong, expired or not-yet-sent token.
- **Rejected**: a *Bypass* policy on MeTube's API paths (`/add` open to the Internet); riding the tab's `CF_Authorization` cookie (24 h, needs a tab sign-in, third-party inside the player's frame).

## The owner's setup (applied 2026-11-20)

- Token `metube-sender`, one year, **expires 2027-11-20** (Cloudflare Zero Trust → Access controls → Service credentials → Service Tokens). Refresh before then: same Client ID, new secret, pasted into the settings.
- Policy `service-token` (Service Auth, Include that token) on the `MeTube` application, after the two *Allow* policies of the Sésame sign-in, which stay for the browser.
- MeTube itself has no basic-auth since 2026-11-18: the username/password fields can stay empty.
- Checked live: 4.3.0's *Test connection* answered "Connected to MeTube". Read back by a cloud session through the Cloudflare API connector, read only (`/access/apps/<id>/policies`, `/access/service_tokens`), names and dates only.

## Diagnosing a failure behind Access

1. **Is the right code running?** The foot of the settings page must show the version just installed. After unzipping an update, the extension must be **reloaded** (↻ in `chrome://extensions` / `arc://extensions`): until then the settings page comes from disk (new fields show) but the manifest and the service worker stay the old ones in memory, so the version reads old ("4" on 2026-11-20) and the old worker sends no token — it looks exactly like a wrong token. This is what happened on 2026-11-20.
2. **"redirected the request"**: the token is not accepted. Check both fields are filled, the token is not expired, and the policy on MeTube's application is *Service Auth* with that token.
3. **"Can't reach … (Failed to fetch)"** on 4.3.0 or later is a real network error, not Access (Access's redirect no longer looks like that).
4. **From a shell** (owner's machine, values in a mode-600 header file, never in argv): `curl -s -o /dev/null -w '%{http_code}\n' -H @<file> https://<metube>/version` → `200`; without `-H` → `302`.
