# Security

## Reporting a vulnerability

Please report security issues privately through GitHub: **Security → Report a vulnerability** on this repository. Do not open a public issue for anything exploitable.

Include what you found, how to reproduce it, and the version or commit. This is a personal project maintained in spare time, so expect a reply within a couple of weeks, not hours.

Only the latest commit on `main` is supported.

## Security model

ZeroG FileMan is a local Electron app. It works on your own files with your own user permissions. These rules hold:

- **Renderer isolation.** The page talks to the app only through the `window.fileman` preload bridge. The main process validates every path it is given (`resolveLocalPath`) before touching the filesystem, and the window refuses to navigate away from the app's own origin.
- **No shell interpolation.** External programs, such as a terminal opened at a folder, are spawned with argument arrays, never through a shell string.
- **Secrets stay in main.** The optional speech server API key is encrypted with Electron `safeStorage`. The renderer can save, clear or check the key, but cannot read it back. If OS encryption is unavailable, the key is held in memory only and never written to disk.
- **Narrow network surface.** The page CSP allows `fetch` connections only to the app itself and to the Hugging Face hosts that the built-in Whisper engine downloads its model from (once, then cached). The UI fonts (Inter, JetBrains Mono) load from Google Fonts. Requests to a user-configured speech server are made by the main process (see [ADR-0005](docs/adr/0005-server-speech-requests-in-main.md)).

### Where your data goes

| Speech engine | Audio leaves the machine? |
|---------------|---------------------------|
| Demo (typed transcript) | No |
| Built-in Whisper | No. Only the model download contacts Hugging Face. |
| OpenAI-compatible server | Yes, to the URL you configure, along with your API key if one is set. Use `https` for anything not on this machine. |

There is no telemetry. Other than the font and model downloads and your configured speech server, the app makes no network requests.

## Out of scope

- Anything that requires an attacker who already runs code as your user.
- Unsigned Windows builds triggering SmartScreen (see the README).
