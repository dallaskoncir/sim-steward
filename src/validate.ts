export function assertIncidentLength(incident: string, maxLength: number): void {
  if (incident.length > maxLength) {
    throw new RangeError(`Incident description too long (${incident.length} chars, max ${maxLength}).`);
  }
}
