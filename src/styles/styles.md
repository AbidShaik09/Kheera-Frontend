# Kheera Frontend Style Guide

## Overview

Kheera uses a token-based design system built on top of **Tailwind CSS v4**.

The goal is to ensure:

- Consistent UI across the application
- Easy light/dark theme support
- Centralized styling
- Minimal hardcoded values
- Easy maintenance and future redesigns

The design system is divided into the following categories:

- Base Styles
- Color Tokens
- Typography
- Spacing
- Border Radius
- Containers
- Tailwind Theme Tokens

---

# Base Styles

Global styles are defined using Tailwind's `@layer base`.

These styles provide sensible defaults so developers don't need to repeatedly specify common properties.

## Global Defaults

### Universal

- `box-sizing: border-box` applied to all elements
- Includes pseudo-elements

### HTML

- Smooth scrolling enabled
- Supports both Light and Dark color schemes

### Body

Default values:

- Background → `--color-background`
- Text → `--color-primary-text`
- Font → `--font-primary`
- Antialiased text rendering
- Minimum height → `100vh`
- Margin removed

### Headings

Applies to:

- h1
- h2
- h3
- h4
- h5
- h6

Defaults:

- Color → Primary Text
- Font Weight → 600

### Text Elements

The following inherit their parent color automatically:

- p
- span
- label
- li

### Links

Default:

- Color → Primary

Hover:

- Primary Hover

Text decoration is removed by default.

### Form Controls

Applies to:

- input
- textarea
- select

Defaults:

- Inherit application font
- Background → Background Color
- Text → Primary Text
- Border → Border Color

### Buttons

Buttons inherit the application font.

Cursor automatically becomes `pointer`.

Visual appearance should be provided by reusable Button components.

### Images

Applies to:

- img
- picture
- svg
- video

Defaults:

- display: block
- max-width: 100%

### Text Selection

Selected text uses:

Background:

- Primary Tint

Text:

- Primary Text

---

# Color System

The application supports both **Light** and **Dark** themes.

All colors are stored as CSS variables and automatically switch when `.dark` is applied.

---

## Interaction

| Token              | Purpose                     |
| ------------------ | --------------------------- |
| `--color-hover`    | Hover backgrounds           |
| `--color-selected` | Selected items              |
| `--color-overlay`  | Modal & overlay backgrounds |

---

## Accent Colors

Used for status and feedback.

| Token                    | Usage       |
| ------------------------ | ----------- |
| `--color-danger-accent`  | Errors      |
| `--color-success-accent` | Success     |
| `--color-warning-accent` | Warnings    |
| `--color-info-accent`    | Information |

---

## Primary Button

| Token                            | Usage      |
| -------------------------------- | ---------- |
| `--color-btn-primary-background` | Background |
| `--color-btn-primary-hover`      | Hover      |
| `--color-btn-primary-pressed`    | Active     |
| `--color-btn-primary-text`       | Text       |

---

## Secondary Button

| Token                              | Usage      |
| ---------------------------------- | ---------- |
| `--color-btn-secondary-background` | Background |
| `--color-btn-secondary-hover`      | Hover      |
| `--color-btn-secondary-border`     | Border     |
| `--color-btn-secondary-text`       | Text       |

---

## Neutral Colors

| Token                          | Usage                |
| ------------------------------ | -------------------- |
| `--color-background`           | Main page background |
| `--color-secondary-background` | Alternate background |
| `--color-card-background`      | Cards                |
| `--color-border`               | Borders              |
| `--color-divider`              | Dividers             |

---

## Primary Brand Colors

| Token                    | Usage            |
| ------------------------ | ---------------- |
| `--color-primary`        | Brand color      |
| `--color-primary-hover`  | Hover            |
| `--color-primary-active` | Active           |
| `--color-primary-dark`   | Dark shade       |
| `--color-primary-light`  | Light shade      |
| `--color-primary-tint`   | Soft backgrounds |

---

## Text Colors

| Token                    | Usage          |
| ------------------------ | -------------- |
| `--color-primary-text`   | Main text      |
| `--color-secondary-text` | Secondary text |
| `--color-muted-text`     | Muted text     |
| `--color-disabled-text`  | Disabled state |

---

# Typography

## Font Family

| Token            | Value             |
| ---------------- | ----------------- |
| `--font-primary` | Inter, sans-serif |

---

## Font Sizes

| Token       | Size |
| ----------- | ---- |
| `--text-sm` | 14px |
| `--text-md` | 16px |
| `--text-lg` | 18px |

These are exposed to Tailwind and can be used with:

```
text-sm
text-md
text-lg
```

---

# Spacing System

Kheera follows an **8-point spacing system** with a 4px micro-grid.

| Token         | Value |
| ------------- | ----: |
| `--space-0`   |   0px |
| `--space-xs`  |   4px |
| `--space-sm`  |   8px |
| `--space-md`  |  16px |
| `--space-lg`  |  24px |
| `--space-xl`  |  32px |
| `--space-2xl` |  40px |
| `--space-3xl` |  48px |
| `--space-4xl` |  64px |

Exposed to Tailwind as:

```
p-md
m-lg
gap-sm
space-y-xl
px-2xl
```

Developers should always use spacing tokens instead of arbitrary pixel values.

---

# Border Radius

| Token         | Value |
| ------------- | ----: |
| `--radius-sm` |   6px |
| `--radius-md` |  10px |
| `--radius-lg` |  14px |

Available in Tailwind:

```
rounded-sm
rounded-md
rounded-lg
```

---

# Container Widths

Standard responsive content widths.

| Token             | Width  |
| ----------------- | ------ |
| `--container-sm`  | 640px  |
| `--container-md`  | 768px  |
| `--container-lg`  | 1024px |
| `--container-xl`  | 1280px |
| `--container-2xl` | 1440px |

Used for:

- Dashboard
- Settings
- Authentication
- Documentation
- Landing pages

---

# Tailwind Theme Tokens

All design tokens are mapped through Tailwind's `@theme`.

This provides utility classes while keeping CSS variables as the single source of truth.

Example:

```css
@theme {
  --color-primary: var(--color-primary);

  --spacing-md: var(--space-md);

  --radius-md: var(--radius-md);

  --font-primary: var(--font-primary);
}
```

---

# Styling Guidelines

## ✅ Preferred

Use design tokens.

```html
<div class="bg-card-background p-lg rounded-md"></div>
```

Use spacing utilities.

```html
<div class="gap-md"></div>
```

Use semantic colors.

```html
<p class="text-secondary-text"></p>
```

---

## ❌ Avoid

Hardcoded values.

```css
padding: 17px;

margin: 23px;

border-radius: 13px;

color: #555;
```

Instead use tokens.

---

# Best Practices

- Never hardcode colors.
- Never hardcode spacing.
- Prefer Tailwind utilities over custom CSS.
- Reuse design tokens whenever possible.
- Create reusable components before page-specific styles.
- Global styles belong in `@layer base`.
- Component appearance belongs inside the component.

---

# Future Improvements

The following may be added as the design system evolves:

- Shadows
- Motion tokens
- Elevation system
- Z-index tokens
- Component tokens
- Icon sizing
- Avatar sizing
- Animation presets

These are intentionally postponed until the application grows.
