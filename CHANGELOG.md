# Changelog

All notable changes to `cwm_admin` are documented here. Format based on conventional commits (see `cliff.toml`).

## [0.0.1] - 2026-11-17

Baseline: state of `develop` on 2026-11-17. This section was written by hand from `git log` (git-cliff was not available); regenerate with `git cliff` from v0.1.0 on.

### Features

- Admin shell: permissions in the panel, audit page, foldable menu groups, two-step login, Mi cuenta (profile, security, sessions), avatar menu links, Seguridad screen to require two-factor from all staff, reauth dialog and session expiry notice.
- Events and users: events list and summary sheet (plan and payment, Funciones, actions, content and log tabs), users module (list, profile, suspend, export, delete), sign-in methods on user detail, impersonation from user, event and support screens, hidden internal accounts counter.
- Team: Equipo y roles rebuilt with invitations, statuses, suspension and a public accept-invite page.
- Revenue and billing: purchases and price/codes, invoices and credit notes, chargebacks, disputes, needs-review and Stripe sync, coupon usage cap and expiry editing.
- Modules and plans: matrix with impact-checked changes, editable plan limits, name and description.
- Communication: WhatsApp console (connection, summary, messages, templates, delivery rate), message text editor, announcements with es/en form and banner preview.
- Support and moderation: support inbox and request detail, moderation queue with bulk actions.
- Templates: list, detail and draft editor, live preview, publish dialog, zip package upload with validation report, marks, license and credits, quality checklist, activation, locked editor for package-managed versions, Spanish audit labels and linter code help.
- System: read-only health screen, failed job actions and maintenance mode card, Sistema > Versiones page, build version, commit and time exposed in `version.json`.
- Security: full Content-Security-Policy.

### Bug Fixes

- Package warnings: corrected the `section_without_block` help text (the API sends no detail).
- Templates: Spanish translations of every package API error, `409 package_managed` handling, zip signature check, safe package URL links, responsive tables and cards, lazy dev-only mocks.
- Account and auth: 2FA code required to turn off two-step verification, `admin_session_required` and login lockout `Retry-After`.
- Users and team: only active staff listed as assignees, create asks 12+ chars and shows 422 per field.
- Dashboard shows money cards only when the API sends them; payments hidden from support in the event summary.
- Layout fixes for phones (credit table, announcements filters, recovery codes).

### Refactor

- Plan options of the change-plan dialog come from the catalog.

### Chores and tests

- Dependency, build and environment updates, plus unit tests for the new modules (about 23 chore and 4 test commits).
