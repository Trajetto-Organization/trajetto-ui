interface SpotlightPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface ParsedContent {
  type: "text" | "list" | "important" | "permissions" | "warning" | "note";
  content: string;
  items?: string[];
}

export type { SpotlightPosition, ParsedContent };
