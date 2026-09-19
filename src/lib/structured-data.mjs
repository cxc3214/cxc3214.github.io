/** Serialize data for an HTML script element without allowing a closing script tag. */
export function serializeJsonLd(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
