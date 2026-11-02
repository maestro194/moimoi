# Web imports the shared core by a file path

The web app depends on `@maimai-suite/core` as `"file:../../packages/core"`, not `"workspace:*"`. Vercel installs the web app with npm (the pnpm lockfile is not committed), and npm rejects the `workspace:` protocol: a preview build with `workspace:*` failed and one with the `file:` path built (tested 2 Nov 2026). Mobile, installed with pnpm, keeps `workspace:*`. Switching Vercel to pnpm would allow `workspace:*` everywhere, but needs the lockfile committed and the Vercel install settings changed.
