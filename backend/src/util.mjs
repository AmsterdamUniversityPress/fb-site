import {
  pipe, compose, composeRight,
} from 'stick-js/es'

import path from 'path'
import { fileURLToPath, } from 'url'

// --- usage: `__dirname (import.meta.url)`
export const __dirname = fileURLToPath >> path.dirname


const mkdir = (dir) => sysSpawn (
    'mkdir', ['-p', dir],
    {
          sync: true,
          die: true,
        },
  )

export const mkdirIfNeeded = (dir) => fs.existsSync (dir) || mkdir (dir)

