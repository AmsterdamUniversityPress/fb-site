import { pipe, compose, composeRight } from 'stick-js/es';
import path from 'path';
import { fileURLToPath } from 'url';

// --- usage: `__dirname (import.meta.url)`
export var __dirname = composeRight(fileURLToPath, path.dirname);