/**
 * The launch switch. While false (the default) the site is a demo: a banner says so, sample-content
 * notes are shown, and search engines are told not to index it. Set NEXT_PUBLIC_SITE_LIVE=true on
 * Vercel and redeploy to launch: the banner and notes disappear and indexing is allowed.
 * It is read at build time (also in the browser bundle), so a change needs a new deployment.
 */
export const SITE_LIVE = process.env.NEXT_PUBLIC_SITE_LIVE === "true";
