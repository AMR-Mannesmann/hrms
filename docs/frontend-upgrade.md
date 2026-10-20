# Frappe UI 1.0.2 upgrade

The employee PWA and shift roster both use the stable `frappe-ui` 1.0.2 release.
The upgrade uses its public components and package exports. It does not use the
experimental v0 components.

Use Node 24 and Yarn 1.22.22 for development. The build requires Node 20.19 or a
supported newer Node release. Tailwind remains on version 3. Vite and the Vue
plugin use versions 7 and 6. The PWA uses `vite-plugin-pwa` 2.

## Install and check

From the HRMS repository:

```sh
yarn --cwd frontend install --frozen-lockfile
yarn --cwd roster install --frozen-lockfile
yarn --cwd frontend test
yarn --cwd roster typecheck
yarn --cwd frontend build
yarn --cwd roster build
```

The frontend tests import roster components. Install both dependency sets before
running those tests. The frontend GitHub workflow runs these checks.

Run the focused backend tests on a test site:

```sh
bench --site <test-site> run-tests --module hrms.tests.test_pwa_boot --skip-before-tests
```

Both lockfiles resolve one compatible version of each ProseMirror engine package.
Keep that property when updating dependencies. Mixed versions can compile but
crash when the editor creates its plugins.

## Development boot

Each client loads the development boot data before it starts authenticated
requests. The boot response supplies the site name, socket port, and session
CSRF token. The endpoint remains disabled when developer mode is off.

The Vite proxy reads `FRAPPE_WEB_SERVER_PORT`. For example, use this command when
the Frappe server runs on port 8001:

```sh
FRAPPE_WEB_SERVER_PORT=8001 yarn --cwd frontend dev
FRAPPE_WEB_SERVER_PORT=8001 yarn --cwd roster dev
```

Production builds preserve the Jinja boot scripts. The editor subpath stays out
of dependency prebundling so Vite can resolve its extensionless package imports.

## Behavior changes

- Form controls use scalar models. Remote Link searches respond to user input,
  rather than changes to the selected option's display label.
- Overlays use the current open models and slots. Pickers inside Ionic sheets
  render inside the sheet's portal target. Dismissal restores page accessibility.
- The editor preserves rich HTML. Uploads stay private and attach to the parent
  record. New records stage File IDs until insertion succeeds. Attachment retries
  update those File records without inserting another parent or duplicate files.
- Save and lifecycle actions wait for pending operations. Submit and cancel use
  the framework's dedicated endpoints and the saved document snapshot.
- Status colors, typography, radii, and icons use the current design tokens.
  Paired actions fit a 320-pixel viewport.
- Roster drag operations keep their original assignment and date while the
  pointer moves between cells.

## Validation environment and scope

Validation used a new site with only Frappe, ERPNext, and HRMS installed. No
`amr_core` or `erpm` code, configuration, or compatibility changes were required.

The HRMS base was upstream `develop` at `7fc314bdb`. The test dependencies were
Frappe `1498426932e5` and ERPNext `4c9a193549a0`, both on `develop`.

Chromium checks covered desktop and mobile layouts, including 320-pixel action
footers. Employee and manager checks covered authentication, dashboards,
notifications, profile sheets, salary details and PDF downloads, request draft
editing, approvals, submission, cancellation, filters, and permission-dependent
controls. Roster checks covered shift CRUD, recurring schedules, filters, and
native drag movement.

Expense checks used real private image and PDF uploads. They verified disabled
save actions during upload, stored HTML, reopening and editing, and approver
access after parent association. The approver could not read staged files before
the claim existed.

The committed regressions cover field values and defaults, rich-editor startup,
remote searches, roster selection and drag payloads, authentication and OTP form
submission, boot data, salary loading, lifecycle requests, upload retries, and
overlay accessibility.

External OAuth providers, delivery of two-factor codes, push relay delivery,
physical-device installation, and GPS capture were not configured for this site.
The browser checks used English. These checks do not replace the complete HRMS
backend test suite.
