export interface QueryArgs {
  incident: string;
  section?: string;
}

// Supports both "--section 1.0 <incident>" and "--section=1.0 <incident>"
// so the flag can go anywhere relative to the incident text.
export function parseQueryArgs(argv: string[]): QueryArgs {
  const rest: string[] = [];
  let section: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--section") {
      section = argv[++i];
    } else if (arg.startsWith("--section=")) {
      section = arg.slice("--section=".length);
    } else {
      rest.push(arg);
    }
  }

  return { incident: rest.join(" ").trim(), section };
}
