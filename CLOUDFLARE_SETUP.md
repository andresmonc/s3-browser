# Cloudflare Pages Configuration

## Disable Cloudflare Web Analytics / Insights

Cloudflare automatically injects analytics scripts into your pages. To disable this:

### Option 1: Via Cloudflare Dashboard (Recommended)

1. Go to your Cloudflare Dashboard
2. Navigate to **Analytics & Logs** → **Web Analytics**
3. Find your domain/project
4. Toggle **Web Analytics** to **OFF**

### Option 2: Via Cloudflare Workers/Pages Settings

1. Go to **Pages** → Your Project → **Settings**
2. Under **Builds & deployments**, look for **Analytics** settings
3. Disable **Web Analytics** or **Browser Insights**

### Option 3: Via Wrangler CLI

Add to your `wrangler.toml`:

```toml
[env.production]
web_analytics = false
```

Or use the Cloudflare API:

```bash
curl -X PATCH "https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/{project_name}" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"web_analytics": false}'
```

### Option 4: Content Security Policy (Already Configured)

The CSP in `index.html` and `nginx.conf` does **not** include `https://static.cloudflareinsights.com`, which means:

- ✅ Cloudflare Insights scripts will be **blocked** by CSP
- ✅ You'll see CSP violation errors in the console (this is expected)
- ✅ The scripts won't execute or send data

**Note**: CSP violations are logged but don't break the application. To completely remove the errors, disable Web Analytics in Cloudflare Dashboard (Option 1).

## Verify It's Disabled

After disabling, check your browser console - you should no longer see:
- CSP violations for `static.cloudflareinsights.com`
- Network requests to `cloudflareinsights.com`
- `beacon.min.js` script loading

## Privacy Note

Disabling Cloudflare Web Analytics ensures:
- ✅ No tracking scripts injected
- ✅ No analytics data sent to Cloudflare
- ✅ Complete privacy for your users
- ✅ Aligns with the "no telemetry" privacy guarantee

