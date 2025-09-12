import { stringify } from "yaml";
import { inspect } from "node:util";

/**
 * Convert simple arrays to flow style for more compact YAML output
 */
function convertSimpleArraysToFlowStyle(value: unknown): unknown {
  if (Array.isArray(value)) {
    // Check if array contains only simple values (strings, numbers, booleans)
    const isSimpleArray = value.every((item) =>
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean" ||
      item === null
    );

    if (isSimpleArray && value.length <= 10) {
      // Mark array for flow style by wrapping in a special object
      return { __flowStyleArray: value };
    }

    // Recursively process nested arrays/objects
    return value.map(convertSimpleArraysToFlowStyle);
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(obj)) {
      result[key] = convertSimpleArraysToFlowStyle(val);
    }

    return result;
  }

  return value;
}

/**
 * Dump value to YAML string with special handling for arrays and Jest environment
 */
export function yamlDump(value: unknown): string {
  try {
    // Convert simple arrays to flow style for more compact output
    const processedValue = convertSimpleArraysToFlowStyle(value);

    return stringify(processedValue, {
      indent: 2,
      // Do not fold long lines automatically to avoid unexpected newlines
      lineWidth: 0,
      minContentWidth: 20,
      // Use PLAIN by default so that multi-line strings are emitted as block scalars (|)
      // and single-line strings are not needlessly quoted
      defaultStringType: "PLAIN",
    });
  } catch {
    // fall back to util.inspect if YAML serialization fails
    return inspect(value, { depth: 6, colors: false, maxArrayLength: 50 });
  }
}
