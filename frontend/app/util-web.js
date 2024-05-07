import {
  pipe, compose, composeRight,
  each, whenOk, recurry,
} from 'stick-js/es'

// --- clone a URLSearchParams and pluck only the specified keys.
// we use only `append` and not `set`, meaning lists get handled properly.

export const mkURLSearchParams = recurry (2) (
  (keys) => (queryString) => {
    const usp = new URLSearchParams (queryString)
    const ret = new URLSearchParams ()
    keys | each (
      (key) => usp.getAll (key) | whenOk (
        // --- note
        (vals) => vals | each ((val) => ret.append (key, val)),
      ),
    )
    return ret
  },
)
