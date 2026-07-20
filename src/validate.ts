export function assertIncidentLength(incident: string, maxLength: number): void {
  if (incident.length > maxLength) {
    throw new RangeError(`Incident description too long (${incident.length} chars, max ${maxLength}).`);
  }
}

const SECTION_FORMAT = /^\d+\.\d+$/;

// Matches the sectionNumber format parse-rulebook.ts assigns (e.g. "1.0").
// Rejecting malformed input here, rather than letting it reach Chroma's
// `where` filter, turns a silent "no matches" result into a clear usage error.
export function assertSectionFormat(section: string): void {
  if (!SECTION_FORMAT.test(section)) {
    throw new RangeError(`Invalid --section value "${section}" (expected format like "1.0").`);
  }
}
