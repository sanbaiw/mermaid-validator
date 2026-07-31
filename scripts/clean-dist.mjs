#!/usr/bin/env node

import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const generatedDirectory = fileURLToPath(new URL("../dist/", import.meta.url));
await rm(generatedDirectory, { recursive: true, force: true });
