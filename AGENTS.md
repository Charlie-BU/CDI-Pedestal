# CDI-Pedestal Agent Guide

## Project scope

CDI-Pedestal is the CDI shell application. It owns product-level navigation, authentication state, `/cam/*` routing, and the Module Federation host integration for CAM. CAM business screens remain in the separate CAM-FE repository.

## Toolchain and commands

- Use `pnpm`; this repository includes `pnpm-lock.yaml`.
- `pnpm dev` starts the Vite host (default port `9000`). `VITE_CAM_REMOTE_ENTRY` is required.
- `pnpm lint` runs ESLint.
- `pnpm build` runs `tsc -b` followed by a production Vite build.
- There is no committed unit-test runner at present. Do not invent test commands or claim a test suite passed. Add focused tests with the test tooling in the same change when introducing it.

## Architecture boundaries

- Keep shell layout, login, token ownership, and top-level product routing in this repository. Load CAM through the `cam/App` federation remote rather than copying CAM screens into the shell.
- `PlatformContextValue` in `src/platform.ts` is the host-to-remote contract. When it changes, update the remote consumer contract and verify both repositories together.
- Browser requests to CAM use `/api/cam/v1/*`; Vite and Caddy rewrite that prefix to the CAM backend `/v1/*`. Do not bypass this boundary with environment-specific browser URLs.
- API access is centralized in `src/services/CDIService.ts`. Preserve request cancellation, error semantics, token isolation, and cache behavior when changing the adapter.
- `src/cam-auto-generate/` is generated API client output. Do not hand-edit it; change the source contract/configuration and regenerate it with the repository-supported workflow.
- Never expose server secrets in `VITE_*` variables, source code, browser storage, or logs. The access token is user-scoped data and must not leak across cache keys or sessions.

## Implementation conventions

- Use `@/` aliases for source imports and retain React/React Router singleton sharing in the federation configuration.
- Keep user-visible text in both locale files under `src/i18n/locales/`.
- Prefer service, hook, and component layers over API calls or authentication logic embedded in presentation components.
- Preserve existing user changes outside the requested scope. Inspect `git status` before editing and stage explicit files only when committing.

## Validation expectations

- 涉及生产代码、测试、Vite/federation、请求缓存、代理、平台合同或构建入口的改动，先阅读 [`docs/UTSpec.md`](docs/UTSpec.md)，并按其中的分层、隔离和提交前闭环执行。
- Run `pnpm lint` for source changes when the environment permits.
- Run `pnpm build` for TypeScript, Vite configuration, generated-client integration, federation, asset, or packaging changes.
- For shell-to-CAM contract changes, validate both the host and remote build and report any part that could not be run.
- Report executed commands, failures, and skipped checks accurately; static inspection is not an E2E result.
