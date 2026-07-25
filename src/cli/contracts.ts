import type { DocumentFixPlan, DocumentSnapshot, ValidationResult } from "../validation/index.js";

export type FixStatus = "unchanged" | "previewed" | "applied" | "blocked" | "write-failed";

export interface ValidatedDocument {
  readonly document: DocumentSnapshot;
  readonly result: ValidationResult;
  readonly fix?: {
    readonly status: FixStatus;
    readonly plan: DocumentFixPlan;
  };
}

export type CliInputError =
  | { readonly code: "input/read-failed"; readonly path: string; readonly message: "Unable to read input file" }
  | { readonly code: "input/write-failed"; readonly path: string; readonly message: "Unable to write input file" };

export class CliInputFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliInputFailure";
  }
}
