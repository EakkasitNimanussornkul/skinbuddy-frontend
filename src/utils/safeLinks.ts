/**
 * The one rule for turning a stored or typed web address into a link.
 *
 * Anything a person typed (a submitted source, an ingredient's link, a source
 * row written by hand) is not trusted to be a web address. A javascript: or
 * data: value in an href runs on click, so only http and https become links;
 * everything else is shown as plain text by the caller.
 *
 * Every external link opens in a new tab with the same rel, chosen here so the
 * pages cannot drift apart:
 *   - user: a link someone outside the team sent. "nofollow ugc" tells search
 *     engines the site does not vouch for it.
 *   - curated: a source the team attached after opening it.
 */

/** The backend's rule (schemas._http_url): an http or https scheme and a host. */
export const isHttpUrl = (value: string): boolean => safeHref(value) !== null

/**
 * The address to put in an href, as the browser itself reads it (new URL), or
 * null when it is not an http(s) address with a host. Binding the parsed form
 * means the link goes exactly where the check looked.
 */
export const safeHref = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.length > 0 ? url.href : null
  } catch {
    return null
  }
}

/**
 * The host a link really goes to ("brand.example"), for showing before the
 * full address so a lookalike domain stands out. A non-ASCII host comes back
 * in its punycode form (xn--...), which is what gives a lookalike away.
 */
export const linkHost = (value: unknown): string | null => {
  const href = safeHref(value)
  if (!href) return null
  try {
    return new URL(href).hostname
  } catch {
    return null
  }
}

export type LinkKind = 'user' | 'curated'

export const LINK_REL: Record<LinkKind, string> = {
  user: 'noopener noreferrer nofollow ugc',
  curated: 'noopener noreferrer',
}
