# ADB Installer Design System

## 1. Atmosphere & Identity

A quiet local command center for Android device operations. The interface should feel precise, compact, and trustworthy, with a dark native canvas inspired by Linear-style engineering tools. The signature is a live device rail: each discovered phone or tablet reads like a connected endpoint with product identity, transport, and install readiness visible at a glance.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/primary | `--surface-primary` | `#f6f7f8` | `#08090a` | Page canvas |
| Surface/secondary | `--surface-secondary` | `#ffffff` | `#0f1011` | Main panels |
| Surface/elevated | `--surface-elevated` | `#eef0f2` | `#191a1b` | Lists, drop zones, activity log |
| Surface/interactive | `--surface-interactive` | `#e6e8ec` | `#24262b` | Hover and selected controls |
| Text/primary | `--text-primary` | `#111317` | `#f7f8f8` | Primary text |
| Text/secondary | `--text-secondary` | `#4f5661` | `#d0d6e0` | Body and labels |
| Text/tertiary | `--text-tertiary` | `#727986` | `#8a8f98` | Metadata and placeholders |
| Border/subtle | `--border-subtle` | `#dfe3e8` | `rgba(255,255,255,0.05)` | Quiet dividers |
| Border/default | `--border-default` | `#c9d0d8` | `rgba(255,255,255,0.08)` | Cards, fields, drop zones |
| Accent/primary | `--accent-primary` | `#3157d5` | `#5e6ad2` | Primary actions, focus |
| Accent/hover | `--accent-hover` | `#2448bd` | `#828fff` | Hover states |
| Status/success | `--status-success` | `#0f8f47` | `#10b981` | Connected and installed |
| Status/warning | `--status-warning` | `#a96700` | `#f59e0b` | Unauthorized or pending |
| Status/error | `--status-error` | `#c72e3b` | `#ef4444` | Failed scan or install |
| Status/info | `--status-info` | `#2f6fbe` | `#3b82f6` | Scanning and progress |

### Rules

- Accent is reserved for primary actions, focus rings, and selected device state.
- Status colors appear only with operational state text.
- Product chrome uses neutral luminance steps, not decorative color.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| Display | `40px` | 600 | 1.05 | 0 | Page title |
| H1 | `32px` | 600 | 1.15 | 0 | Major panel headings |
| H2 | `24px` | 600 | 1.25 | 0 | Section headers |
| H3 | `18px` | 600 | 1.35 | 0 | Card titles |
| Body | `16px` | 400 | 1.55 | 0 | Default text |
| Body/sm | `14px` | 400 | 1.45 | 0 | Secondary copy |
| Caption | `12px` | 500 | 1.35 | 0 | Metadata, badges |
| Mono | `13px` | 400 | 1.5 | 0 | Device IDs, commands, logs |

### Font Stack

- Primary: `Inter Variable, SF Pro Display, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif`
- Mono: `Berkeley Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`

### Rules

- No text uses negative letter spacing.
- Device identifiers and command output always use the mono stack.
- Body text never drops below `14px`.

## 4. Spacing & Layout

### Base Unit

All spacing derives from `4px`.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | `4px` | Tight icon gaps |
| `--space-2` | `8px` | Compact groups |
| `--space-3` | `12px` | Field padding |
| `--space-4` | `16px` | Panel inner gaps |
| `--space-5` | `20px` | Card padding |
| `--space-6` | `24px` | Section gaps |
| `--space-8` | `32px` | Major groups |
| `--space-10` | `40px` | Page rhythm |
| `--space-12` | `48px` | Wide desktop rhythm |

### Grid

- Max content width: `1320px`.
- Desktop: two columns, device rail at `420px`, workflow panel fills the rest.
- Tablet and mobile: one column with the device rail above the install panel.
- Breakpoints: `640px`, `768px`, `1024px`, `1280px`.

## 5. Components

### App Button

- Structure: native `button` with optional Lucide icon and text.
- Variants: primary, secondary, ghost, danger.
- Spacing: `--space-2` inline gap, `--space-3` by `--space-4` padding.
- States: default, hover, active, focus, disabled, loading.
- Accessibility: visible focus ring, `aria-busy` for loading, icon hidden from screen readers.
- Motion: `120ms` transform and color transition.

### Device Card

- Structure: button-like card with status dot, product identity, transport badge, and metadata rows.
- Variants: connected, unauthorized, offline, selected.
- Spacing: `--space-4` internal gap.
- States: default, hover, active, focus, selected, empty, error.
- Accessibility: selectable `button` with `aria-pressed`.
- Motion: selected state uses border and background luminance change only.

### APK Drop Zone

- Structure: label-backed file input with icon, file metadata, and selected-device context.
- Variants: idle, drag-over, ready, installing, success, error.
- Spacing: `--space-6` padding.
- States: default, hover, focus-within, drag-over, disabled, error.
- Accessibility: native file input remains keyboard reachable through the label.
- Motion: drop feedback uses `transform` and border color.

### Activity Log

- Structure: ordered list of timestamped scan, connect, product, and install events.
- Variants: info, success, warning, error.
- Spacing: `--space-3` row gap.
- States: empty, appended, error.
- Accessibility: `aria-live="polite"` for new entries.
- Motion: new entries fade in over `160ms`.

### Package Cleanup Panel

- Structure: compact tool panel with load action, preset selection, search field, action select, confirmation checkbox, and package rows with a fixed app-type icon column.
- Variants: empty, loading, filtered, preset-selected, applying, partial-error.
- Spacing: `--space-3` between controls and rows, `--space-4` panel padding.
- States: default, hover, focus, disabled, selected, confirmed, error.
- Accessibility: native checkboxes for package selection, labeled search/select controls, and clear disabled states for destructive actions.
- Safety: default action is disable for user `0`; uninstall is available only for explicitly selected packages after confirmation.
- Motion: row selection uses border and background luminance change only.

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | `120ms` | `ease-out` | Button press, card hover |
| Standard | `180ms` | `ease-in-out` | Drop-zone and selection changes |
| Emphasis | `260ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | Initial page entry |

### Rules

- Animate only `transform`, `opacity`, `filter`, and color.
- Respect `prefers-reduced-motion` by removing non-essential transforms.
- Every interactive element has hover, active, focus, and disabled treatment.

## 7. Depth & Surface

### Strategy

Mixed depth: dark-mode luminance stepping plus thin borders. Shadows are reserved for the main shell only.

| Level | Value | Usage |
|-------|-------|-------|
| Border/subtle | `1px solid var(--border-subtle)` | Dividers |
| Border/default | `1px solid var(--border-default)` | Cards, inputs |
| Shadow/shell | `0 24px 80px rgba(0,0,0,0.28)` | App shell |
| Shadow/focus | `0 0 0 3px color-mix(in srgb, var(--accent-primary) 28%, transparent)` | Keyboard focus |

Cards use an `8px` radius. Large panels use `12px`. Buttons and inputs use `8px`. Pills use `999px`.
