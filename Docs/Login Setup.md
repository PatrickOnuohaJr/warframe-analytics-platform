# Login Setup (owner-only Google sign-in)

Cephalon Gu now sits behind a Google sign-in, and the database refuses anyone who isn't a listed owner. This guide is the one-time setup. Nothing here is a secret: **never paste your Google client secret, your user id, or any key into this repo.**

## What you get

- A login screen before anything loads, and a **Sign out** link in the masthead.
- A "Not authorized" screen if some other Google account signs in.
- After the lockdown migration, **the database itself** rejects everyone except you — the login screen is only the friendly front for that.

## Run order (do not skip or reorder)

1. **Add the owner table** — run `DB/Migrations/20261023_add_app_owners.sql` in the Supabase SQL editor. Safe any time; changes nobody's access.
2. **Set up Google as a sign-in provider** (below).
3. **Sign in once** at the app. At this point the database is still open, so the app works normally.
4. **Make yourself the owner** — Supabase dashboard > Authentication > Users > copy your **User UID**, then in the SQL editor run:
   ```sql
   insert into wf_user.app_owners (user_id) values ('PASTE-YOUR-UID-HERE');
   ```
5. **Lock the database down** — run `DB/Migrations/20261023_lock_down_to_owner.sql`. It refuses to run if `app_owners` is empty, so it can't lock you out by accident.
6. **Turn off new sign-ups** — Supabase dashboard > Authentication > Sign In / Providers > uncheck "Allow new users to sign up". (Extra protection; the database already ignores non-owners.)

**Emergency exit:** `DB/Migrations/20261023_rollback_lock_down.sql` re-opens access so the app works again.

## Google provider setup (step 2)

You do these in your own accounts; Claude can't and shouldn't enter these values.

1. **Google Cloud Console** (console.cloud.google.com) > create or pick a project > **APIs & Services > OAuth consent screen**: choose *External*, fill the app name, and add your own Google account under **Test users**. Leaving it in "Testing" is fine for personal use.
2. **Credentials > Create credentials > OAuth client ID > Web application.** Under **Authorized redirect URIs** add Supabase's callback, shown on the Supabase Google provider page. It looks like `https://<your-project>.supabase.co/auth/v1/callback`.
3. Copy the **Client ID** and **Client secret** Google gives you.
4. **Supabase dashboard > Authentication > Sign In / Providers > Google**: enable it and paste the Client ID and Client secret there. Save.
5. **Supabase > Authentication > URL Configuration**:
   - **Site URL**: `http://localhost:5173`
   - **Redirect URLs**: add `http://localhost:5173/**`, `http://localhost:5174/**` (the dev server falls back to 5174 when 5173 is busy), and later your phone/tablet address or hosted URL.

## Using it on a phone or tablet

Whatever address you open Gu at must be in the Supabase **Redirect URLs** list, or Google sign-in will bounce back with an error. Add each new address there. A private-network address (Tailscale or your home network) works the same way as `localhost`.

### Tailscale setup (what is running)

Gu's dev server runs on the PC and Tailscale Serve publishes it, **inside the tailnet only**, over HTTPS:

1. Tailscale on the PC and the tablet, signed in to the same account. In the Tailscale admin console > DNS, MagicDNS and **HTTPS Certificates** are on.
2. The dev server must be running on the PC. It listens on the IPv6 loopback only, so Serve must target `[::1]`, not `127.0.0.1`:
   ```
   tailscale serve --bg "http://[::1]:5173"
   ```
   (Use the port the dev server actually printed; it falls back to 5174 if 5173 is busy.) Turn it off with `tailscale serve --https=443 off`. The setting survives reboots.
3. `vite.config.js` allows `.ts.net` hostnames (`server.allowedHosts`); Vite rejects unknown hostnames otherwise.
4. Open `https://<pc-name>.<tailnet>.ts.net` on the tablet and add `https://<pc-name>.<tailnet>.ts.net/**` to Supabase Redirect URLs. Do not commit your real tailnet name here.
5. The first HTTPS request after enabling can take up to a minute while Tailscale issues the certificate.

The PC has to stay on with the dev server running for the tablet to reach Gu.

## What changes for tooling

After the lockdown, anything that talks to the database with only the public key — including Claude's read-only diagnostics — is refused, because the public key no longer proves who you are. Seed scripts that use the service-role key are unaffected. To let Claude read data again you would sign in through the app, not hand over a key.

## Later: more than one user

This is owner-only. For clanmates, the next step is an owner column on each `wf_user` table and per-user policies (Shipment E). The `wf_user.is_owner()` function and `app_owners` table are the seam where that grows from.
