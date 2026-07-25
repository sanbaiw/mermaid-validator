import type { RuleModule, RuleReport } from "../contracts.js";
import { strictEmptyOptionsSchema } from "../options-schema.js";

interface LegacyDelimiter {
  readonly opening: string;
  readonly closings: readonly string[];
}

// Longest first so doubled and directional forms cannot degrade into a shorter
// delimiter. These are the legacy Flowchart node shapes accepted by Mermaid's
// lexer; the matching close is checked before a Markdown String is actionable.
const legacyDelimiters: readonly LegacyDelimiter[] = [
  { opening: "(((", closings: [")))"] },
  { opening: "[[", closings: ["]]"] },
  { opening: "([", closings: ["])"] },
  { opening: "[(", closings: [")]"] },
  { opening: "{{", closings: ["}}"] },
  { opening: "[/", closings: ["\\]", "/]"] },
  { opening: "[\\", closings: ["\\]", "/]"] },
  { opening: "((", closings: ["))"] },
  { opening: "(-", closings: ["-)"] },
  { opening: "[", closings: ["]"] },
  { opening: "(", closings: [")"] },
  { opening: "{", closings: ["}"] },
  { opening: ">", closings: ["]"] },
];

function hasNodeIdBefore(source: string, openingOffset: number): boolean {
  if (openingOffset <= 0) return false;
  const previous = source[openingOffset - 1]!;
  // All supported forms attach directly to a node id. Structural punctuation
  // here instead identifies an edge, nesting, or an incomplete declaration.
  return !/\s/.test(previous) && !"-=>|;:,([{<>/@\\".includes(previous);
}

function identifierBefore(source: string, offset: number): string | undefined {
  let start = offset;
  while (start > 0) {
    const character = source[start - 1]!;
    if (/\s/.test(character) || ";|[](){}<>:=,@".includes(character)) break;
    start -= 1;
  }
  return start === offset ? undefined : source.slice(start, offset);
}

function beginsEdgeOperator(source: string, offset: number): boolean {
  const character = source[offset];
  if (character === "-" || character === "=" || character === "." || character === "~") return true;
  const next = source[offset + 1];
  return (character === "x" || character === "o" || character === "<")
    && (next === "-" || next === "=" || next === ".");
}

function legacyDelimiterBefore(source: string, quoteOffset: number): LegacyDelimiter | undefined {
  for (const delimiter of legacyDelimiters) {
    const openingOffset = quoteOffset - delimiter.opening.length;
    if (openingOffset >= 0
      && source.startsWith(delimiter.opening, openingOffset)
      && hasNodeIdBefore(source, openingOffset)) return delimiter;
  }
  return undefined;
}

function isModernLabelField(source: string, quoteOffset: number): boolean {
  let cursor = quoteOffset - 1;
  while (cursor >= 0 && (source[cursor] === " " || source[cursor] === "\t")) cursor -= 1;
  if (source[cursor] !== ":") return false;
  cursor -= 1;
  while (cursor >= 0 && (source[cursor] === " " || source[cursor] === "\t")) cursor -= 1;
  const end = cursor + 1;
  while (cursor >= 0 && /[A-Za-z_]/.test(source[cursor]!)) cursor -= 1;
  return source.slice(cursor + 1, end) === "label";
}

function isEscaped(source: string, offset: number): boolean {
  let slashes = 0;
  for (let index = offset - 1; index >= 0 && source[index] === "\\"; index -= 1) slashes += 1;
  return slashes % 2 === 1;
}

function closingMarkdownString(source: string, contentStart: number): number | undefined {
  for (let index = contentStart; index + 1 < source.length; index += 1) {
    if (source[index] === "`" && source[index + 1] === '"' && !isEscaped(source, index)) return index;
  }
  return undefined;
}

function closingQuotedString(source: string, contentStart: number): number | undefined {
  for (let index = contentStart; index < source.length; index += 1) {
    if (source[index] === '"' && !isEscaped(source, index)) return index;
  }
  return undefined;
}

function hasLegacyClosing(source: string, markdownClose: number, delimiter: LegacyDelimiter): boolean {
  const closeOffset = markdownClose + 2;
  return delimiter.closings.some((closing) => source.startsWith(closing, closeOffset));
}

function beginsKeyword(source: string, offset: number, keyword: string): boolean {
  if (!source.startsWith(keyword, offset)) return false;
  const next = source[offset + keyword.length];
  return next === undefined || /\s/.test(next);
}

function reportsForContent(source: string, start: number, end: number): RuleReport[] {
  const reports: RuleReport[] = [];
  let lineStart = start;
  while (lineStart <= end) {
    let lineEnd = source.indexOf("\n", lineStart);
    if (lineEnd < 0 || lineEnd > end) lineEnd = end;
    let cursor = lineStart;
    let spaces = 0;
    while (cursor < lineEnd && source[cursor] === " " && spaces < 4) {
      cursor += 1;
      spaces += 1;
    }
    if (spaces <= 3 && source[cursor] === "#" && !isEscaped(source, cursor)) {
      const markerStart = cursor;
      let hashes = 0;
      while (cursor < lineEnd && source[cursor] === "#" && hashes < 7) {
        cursor += 1;
        hashes += 1;
      }
      if (hashes >= 1 && hashes <= 6 && (source[cursor] === " " || source[cursor] === "\t")) {
        while (cursor < lineEnd && (source[cursor] === " " || source[cursor] === "\t")) cursor += 1;
        if (/\S/.test(source.slice(cursor, lineEnd).replace(/\r$/, ""))) {
          reports.push({
            message: "Markdown headings are not allowed in Flowchart node labels",
            span: { startOffset: markerStart, endOffset: cursor },
            help: "Use plain text or inline emphasis in the node label",
            fixes: [{ span: { startOffset: markerStart, endOffset: cursor }, newText: "" }],
          });
        }
      }
    }
    if (lineEnd === end) break;
    lineStart = lineEnd + 1;
  }
  return reports;
}

export function scanMarkdownHeadingsInFlowchartLabels(source: string): readonly RuleReport[] {
  const reports: RuleReport[] = [];
  let statementKind: "unknown" | "subgraph" | "other" = "unknown";
  let inComment = false;
  let modernDepth = 0;
  let modernNodeObject = false;
  const declaredEdgeIds = new Set<string>();

  for (let index = 0; index + 1 < source.length; index += 1) {
    const character = source[index]!;

    if (character === "\n") {
      inComment = false;
      statementKind = "unknown";
      continue;
    }
    if (inComment) continue;
    if (statementKind === "unknown") {
      if (character === " " || character === "\t" || character === "\r") continue;
      if (source.startsWith("%%", index)) {
        inComment = true;
        continue;
      }
      statementKind = beginsKeyword(source, index, "subgraph") ? "subgraph" : "other";
    }
    if (character === ";" && modernDepth === 0) {
      statementKind = "unknown";
      continue;
    }

    if (character === "@" && modernDepth === 0 && beginsEdgeOperator(source, index + 1)) {
      const edgeId = identifierBefore(source, index);
      if (edgeId !== undefined) declaredEdgeIds.add(edgeId);
      continue;
    }
    if (character === "@" && source[index + 1] === "{" && modernDepth === 0) {
      const owner = identifierBefore(source, index);
      modernDepth = 1;
      modernNodeObject = statementKind !== "subgraph"
        && hasNodeIdBefore(source, index)
        && (owner === undefined || !declaredEdgeIds.has(owner));
      index += 1;
      continue;
    }
    if (modernDepth > 0 && character === "{") {
      modernDepth += 1;
      continue;
    }
    if (modernDepth > 0 && character === "}") {
      modernDepth -= 1;
      if (modernDepth === 0) modernNodeObject = false;
      continue;
    }

    if (character !== '"') continue;
    const delimiter = statementKind === "subgraph" ? undefined : legacyDelimiterBefore(source, index);
    const structurallyEscaped = delimiter?.opening === "[\\";
    if (isEscaped(source, index) && !structurallyEscaped) continue;
    if (source[index + 1] !== "`") {
      const closing = closingQuotedString(source, index + 1);
      if (closing !== undefined) index = closing;
      continue;
    }

    const contentStart = index + 2;
    const closing = closingMarkdownString(source, contentStart);
    if (closing === undefined) continue;
    const isLegacyLabel = delimiter !== undefined && hasLegacyClosing(source, closing, delimiter);
    const isModernLabel = modernDepth === 1 && modernNodeObject && isModernLabelField(source, index);
    if (isLegacyLabel || isModernLabel) reports.push(...reportsForContent(source, contentStart, closing));
    index = closing + 1;
  }
  return reports;
}

export const noMarkdownHeadingInLabelRule: RuleModule<Record<string, never>> = {
  id: "flowchart/no-markdown-heading-in-label",
  defaultSeverity: "warning",
  prerequisite: "syntax-valid",
  diagramTypes: ["flowchart"],
  optionsSchema: strictEmptyOptionsSchema,
  defaultOptions: {},
  async run(context) {
    return scanMarkdownHeadingsInFlowchartLabels(context.source);
  },
};
