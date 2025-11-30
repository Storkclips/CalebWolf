# Caleb Wolf Photography Site

A React single-page site for Caleb Wolf’s photography portfolio, pricing, blog, and inquiries. Built with Vite and configured for Netlify hosting.

## Pages
- **Home:** Hero, featured portfolio sets, testimonials, blog highlights, and booking call-to-action.
- **Pricing:** Collections with features and booking links.
- **About:** Photographer introduction, philosophy, and approach.
- **Blog:** All journal posts/resources.
- **Contact:** Netlify-ready inquiry form with honeypot spam protection.

## Local Development
Install dependencies and start the Vite dev server:

```bash
npm install
npm run dev
```

## Production Build
Generate optimized assets:

```bash
npm run build
```

Preview the build locally:

```bash
npm run preview
```

## Netlify
The included `netlify.toml` sets the build command to `npm run build`, publishes the `dist` folder, and applies an SPA redirect so client-side routing works on refresh.
