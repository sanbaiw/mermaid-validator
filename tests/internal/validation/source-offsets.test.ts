import { describe, expect, it } from "vitest";
import { sourceLocationToSpan } from "../../../src/validation/source-offsets.js";

describe("sourceLocationToSpan", () => {
  it("maps one-based line and column to a one-unit UTF-16 span", () => {
    expect(sourceLocationToSpan("flowchart TD\n  A --> B\n", { line: 2, column: 4 })).toEqual({
      startOffset: 16,
      endOffset: 17,
    });
  });

  it("spans a whole line without its CRLF terminator", () => {
    expect(sourceLocationToSpan("one\r\ntwo\r\n", { line: 2 })).toEqual({
      startOffset: 5,
      endOffset: 8,
    });
  });

  it("counts astral characters as two UTF-16 code units", () => {
    expect(sourceLocationToSpan("a😀b\n", { line: 1, column: 4 })).toEqual({
      startOffset: 3,
      endOffset: 4,
    });
  });

  it("clamps columns to the named line and rejects unusable lines", () => {
    expect(sourceLocationToSpan("abc", { line: 1, column: 99 })).toEqual({ startOffset: 3, endOffset: 3 });
    expect(sourceLocationToSpan("abc", { column: 1 })).toBeUndefined();
    expect(sourceLocationToSpan("abc", { line: 2 })).toBeUndefined();
  });
});
