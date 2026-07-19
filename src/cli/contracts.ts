import type { DocumentSnapshot, ValidationResult } from "../validation/index.js";

export interface ValidatedDocument {
  readonly document: DocumentSnapshot;
  readonly result: ValidationResult;
}

export interface CliInputError {
  readonly code: "input/read-failed";
  readonly path: string;
  readonly message: "Unable to read input file";
}

export class CliInputFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliInputFailure";
  }
}
