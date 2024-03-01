import {
  pipe, compose, composeRight,
  lets, recurry,
} from 'stick-js/es'

import crypto from 'node:crypto'

// --- traverses the entire length of the control buffer, even when it could return earlier, to
// ensure constant time.
export const bufferEqualsConstantTime = recurry (2) (
  (ctrl) => (test) => {
    let ret = void 8
    for (const i of ctrl.keys ())
      ret = (ret !== false) && test [i] === ctrl [i]
    return ret
  },
)

export const hashPasswordScrypt = recurry (3) (
  (salt) => (keylen) => (password) => lets (
    () => String.prototype.normalize.call (password, 'NFD'),
    (pw) => crypto.scryptSync (pw, salt, keylen),
  ),
)
