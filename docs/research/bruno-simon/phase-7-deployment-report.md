# Phase 7 Deployment Report

## Final status

**PREVIEW DEPLOYED**

The portfolio is deployed to Vercel and the public preview responds successfully.

## 1. Hosting provider

- Provider: Vercel
- Project: `game-repo`
- Framework preset: Next.js
- Branch: `master`
- Root directory: repository root (`./`)
- Preview URL: https://game-repo-theta.vercel.app/

## 2. GitHub repository status

- Repository: https://github.com/Faazil-zainab/game-repo
- Current commit: `1d92883`
- Remote push: verified on `origin/master`
- Git LFS remains enabled for the original fallback GLBs.
- The optimized GLBs are normal Git blobs so Vercel receives their actual binary
  contents instead of Git LFS pointer files.

## 3. Build configuration

- Next.js `16.3.5`
- React `19.2.4`
- Node.js engine requirement `>=24`
- `next.config.ts` uses `output: "standalone"`
- Default Vercel Next.js build and install settings
- `npm run build` — passed locally
- No `vercel.json` or production environment variables are required

## 4. Asset hosting strategy

The application still uses optimized-first model URLs with original fallback
URLs. The optimized models are committed directly because Vercel's Git
integration deployed LFS pointer files when all GLBs were LFS-tracked.

- Optimized island: 42,001,232 bytes
- Optimized Supra: 80,200,092 bytes
- Original fallback models: preserved in Git LFS

No model files or model URLs were changed. No paid external storage was
configured.

## 5. Environment variable configuration

No environment variables are required by the inspected application source.
No `.env*` files are present.

## 6. Deployment URL

https://game-repo-theta.vercel.app/

## 7. GLB asset delivery results

Verified against the public preview:

| Asset | HTTP | Content type | Delivered size |
|---|---:|---|---:|
| Optimized island | 200 | `model/gltf-binary` | 42,001,232 bytes |
| Optimized Supra | 200 | `model/gltf-binary` | 80,200,092 bytes |

The previous deployment returned 133-byte LFS pointers. After commit `1d92883`,
both optimized assets return their full binary payloads.

## 8. Production browser test results

Verified on the public preview:

- Homepage returned HTTP 200.
- Loading screen completed.
- Portfolio title and interactive start screen rendered.
- `/lab` returned HTTP 200.
- Optimized island and Supra assets returned HTTP 200.
- Resume returned HTTP 200 with `application/pdf`.

The public page uses the intended Mohamed Faazil portfolio title and content.
Full driving, map, circuit, Whisper Wall, audio, and console validation should
still be completed in a real desktop/mobile browser session.

## 9. Mobile test results

Not fully verified with a true mobile viewport in this session. The preview
should be checked at phone and tablet widths before custom-domain promotion.

## 10. Errors and limitations

- The original Supra fallback is larger than common GitHub/Vercel Hobby
  individual-file limits and remains available through Git LFS for environments
  that support it.
- Vercel currently serves the optimized assets successfully.
- No custom domain was configured.
- The browser automation could verify loading and routes, but not every
  pointer-driven 3D interaction.

## 11. Ongoing hosting costs

No paid storage, domain, or external service was configured. Vercel plan usage
and bandwidth limits depend on the connected account.

## 12. Final deployment status

**PREVIEW DEPLOYED**

The preview URL is publicly accessible and serves the optimized portfolio
models and resume PDF. Do not promote a custom production domain until the
remaining interaction and mobile checks are completed.
