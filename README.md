# Luna Tracker Analyzer

A **purely client-side** single-page web app for analyzing baby-tracker export data.  
No installation, no backend, no data leaves your browser — just open `index.html` and start exploring.

---

## Features

### Data input – three ways to load your data

| Method | How |
|--------|-----|
| **Paste JSON** | Open the *Input Data* panel, paste your export JSON into the text area, and click **Analyze Data** |
| **Upload a file** | Choose a `.json` file from your device in the same panel |
| **Fetch from Nextcloud** | Enter your Nextcloud WebDAV credentials and click **⬇️ Fetch from Nextcloud** |

### Analysis views

Navigate between views with the top buttons:

#### 📊 Charts (Breastfeeding)
- **Occurrences per Day** – bar chart showing how many breastfeeding events happened each day
- **Occurrences per Hour (Aggregated)** – line chart of breastfeeding frequency by time-of-day across all days
- **Daily Patterns: Breastfeeding per Hour by Day** – multi-line chart overlaying each day so you can spot daily rhythms

#### 😴 Sleep Analysis
- **Sleep Status per Hour** – stepped line chart showing sleeping (1) vs awake (0) for each recorded day
- **Accumulated Sleep per Day** – bar chart of total sleep hours per day
- **Sleep Sessions** – formatted text list of each sleep interval with start time, end time, and duration
- **Sleep Note Events** – table of all `note` events where `notes` is `schläft` or `wach`

#### 📋 Data Table
Raw view of every entry in the JSON export: time, type, signature, and notes.

#### 📝 Formatted Breastfeeding Events
Human-readable log of breastfeeding sessions grouped by day, using `l` (left nipple) and `r` (right nipple) shorthand with time ranges and gap markers.

---

## JSON Data Format

The app expects a JSON array of tracker entries.  
Each entry is an object with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `time` | number | Unix timestamp (seconds) |
| `type` | string | Event type (see below) |
| `signature` | string | Identifier / source tag |
| `notes` | string *(optional)* | Free-text note; used `"schläft"` / `"wach"` for sleep tracking |

### Known event types

| `type` value | Meaning |
|---|---|
| `BREASTFEEDING_LEFT_NIPPLE` | Breastfeeding – left side |
| `BREASTFEEDING_RIGHT_NIPPLE` | Breastfeeding – right side |
| `DIAPER_CHANGE` | Diaper change |
| `note` (with `notes: "schläft"`) | Baby fell asleep |
| `note` (with `notes: "wach"`) | Baby woke up |

**Minimal example:**
```json
[
  { "time": 1700000000, "type": "BREASTFEEDING_LEFT_NIPPLE",  "signature": "abc" },
  { "time": 1700003600, "type": "BREASTFEEDING_RIGHT_NIPPLE", "signature": "abc" },
  { "time": 1700010000, "type": "note", "notes": "schläft",   "signature": "abc" },
  { "time": 1700020000, "type": "note", "notes": "wach",      "signature": "abc" }
]
```

---

## Nextcloud / WebDAV Integration

The app can pull your export file directly from a Nextcloud instance:

1. Click **📝 Input Data** to expand the input panel.
2. Fill in the **Nextcloud** section:
   - **Nextcloud URL** – full base URL of your instance (e.g. `https://cloud.example.com`)
   - **Username** – your Nextcloud login name
   - **Password** – your Nextcloud password (or app token)
   - **File path** – path inside Nextcloud (e.g. `Luna/export.json`)
3. Tick **Remember connection** if you want the browser to save the details for next time.
4. Click **⬇️ Fetch from Nextcloud**.

> **Note:** Your Nextcloud server must allow [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) requests from the page's origin for the fetch to succeed.

---

## Security

Because this is a purely client-side application, all sensitive handling happens inside your own browser. No credentials or health data are ever sent to a third-party server.

### HTTPS enforcement
The app refuses to connect to any Nextcloud URL that does not start with `https://`. This ensures your credentials are never transmitted in plaintext over the network.

### Encrypted credential storage
When "Remember connection" is checked the credentials are persisted in the browser's `localStorage` with the following protections:

| What is stored | How |
|---|---|
| Server URL, username, file path | Plain text in `localStorage` (not sensitive in isolation) |
| Password | Encrypted with **AES-256-GCM** via the browser's built-in [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) |

**Encryption details:**
- A fresh **256-bit AES key** is generated with `crypto.subtle.generateKey` each time the credentials are saved.
- A fresh **random 12-byte IV** is generated with `crypto.getRandomValues` for every encryption operation.
- The resulting ciphertext, key, and IV are all Base64-encoded and stored in `localStorage`.

**Honest security model:**  
Because there is no server-side secret, the AES key lives alongside the ciphertext in `localStorage`. A determined attacker who has full DevTools or file-system access to the browser profile can recover the password. The encryption provides meaningful protection against:
- Casual inspection of `localStorage` in DevTools
- Passwords appearing in plaintext in bug reports, screenshots, or browser-profile exports
- The previous approach where credentials were stored as **plaintext cookies** that were attached to every HTTP request

### Cookie migration
On every page load the app automatically deletes any plaintext WebDAV cookies written by older versions of the app.

### Credential-free fetch
The WebDAV HTTP request is made with `credentials: "omit"`, which prevents the browser from automatically attaching session cookies or other stored credentials to the request.

### Basic Auth hardening
- The username is validated to not contain a colon (`:`) as required by [RFC 7617](https://datatracker.ietf.org/doc/html/rfc7617).
- Non-ASCII characters in username and password are percent-encoded before base64 encoding so the `Authorization` header is well-formed for any character set.

---

## Getting Started

No build step or server is required.

```bash
# Clone the repository
git clone https://github.com/derDieDasJojo/luna-tracker-analyzer.git
cd luna-tracker-analyzer
# Open in your browser
open index.html        # macOS
xdg-open index.html   # Linux
start index.html       # Windows
```

or start npx serve
```bash
npx serve -p 8000
# Open in your browser
open localhost:8000       # macOS
xdg-open localhost:8000   # Linux
start localhost:8000       # Windows
```

Or simply double-click `index.html` in your file manager.

> **Browser requirement:** Any modern browser that supports the [Web Crypto API](https://caniuse.com/cryptography) (Chrome 37+, Firefox 34+, Safari 11+, Edge 79+).

---

## License

See [LICENSE](LICENSE).
