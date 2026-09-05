// src/lib/storefrontPreviewSanitizer.js
// Small, dependency-free sanitizer for the Business Portal's editor preview.
// This is deliberately stricter than the customer renderer's final sanitizer:
// preview HTML is untrusted draft content and must never execute script/event
// handlers or load unsafe URL schemes inside the portal.

const ALLOWED_TAGS = new Set([
  'A', 'B', 'BR', 'CODE', 'DIV', 'EM', 'H1', 'H2', 'H3', 'I', 'IMG',
  'LI', 'OL', 'P', 'SMALL', 'SPAN', 'STRONG', 'U', 'UL',
]);

const SAFE_ATTRIBUTES = new Map([
  ['A', new Set(['href', 'target', 'rel'])],
  ['IMG', new Set(['src', 'alt', 'width', 'height'])],
]);

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

function isSafeUrl(value) {
  try {
    const url = new URL(value, window.location.origin);
    return SAFE_PROTOCOLS.has(url.protocol);
  } catch (_) {
    return false;
  }
}

function sanitizeElement(element) {
  const tag = element.tagName.toUpperCase();
  if (!ALLOWED_TAGS.has(tag)) return null;

  for (const attribute of [...element.attributes]) {
    const name = attribute.name.toLowerCase();
    const allowed = SAFE_ATTRIBUTES.get(tag)?.has(name) || false;
    if (!allowed) {
      element.removeAttribute(attribute.name);
      continue;
    }

    if ((tag === 'A' && name === 'href') || (tag === 'IMG' && name === 'src')) {
      if (!isSafeUrl(attribute.value)) element.removeAttribute(attribute.name);
    }
  }

  if (tag === 'A' && element.getAttribute('target') === '_blank') {
    element.setAttribute('rel', 'noopener noreferrer');
  }

  for (const child of [...element.children]) {
    const replacement = sanitizeElement(child);
    if (replacement === null) {
      while (child.firstChild) element.insertBefore(child.firstChild, child);
      child.remove();
    }
  }

  return element;
}

export function sanitizeStorefrontPreviewHtml(html, maxLength = 500) {
  if (typeof html !== 'string' || !html.trim()) return '';
  const bounded = html.slice(0, maxLength);
  if (typeof DOMParser === 'undefined') return bounded.replace(/<[^>]*>/g, '');

  const parsed = new DOMParser().parseFromString(`<div>${bounded}</div>`, 'text/html');
  const root = parsed.body.firstElementChild;
  if (!root) return '';

  for (const child of [...root.children]) {
    const replacement = sanitizeElement(child);
    if (replacement === null) {
      while (child.firstChild) root.insertBefore(child.firstChild, child);
      child.remove();
    }
  }

  return root.innerHTML;
}
