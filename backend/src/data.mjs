import {
  pipe, compose, composeRight,
  each, recurry, dot,
  tap,
} from 'stick-js/es'

import { toListCollapseNil, } from './util.mjs'

import dataTst from '../../__data/fb-data-tst.json' with { type: 'json', }
import dataAcc from '../../__data/fb-data-acc.json' with { type: 'json', }
import dataPrd from '../../__data/fb-data-prd.json' with { type: 'json', }

export { dataTst, dataAcc, dataPrd, }

/* notes: they want 4 'filters'
 * naam, categorie, trefwoord, doelregio
 *
 * --- naam:
 * this is probaly just going to be a 'search field' where we ask elastic to do a text
 * search in the naam. So there are no 'filter options'
 *
 * --- categorie:
 * there are 12, so it makes sense to make those into filter options
 *
 * --- trefwoorden:
 * there are many (more than 600), examples:
 *
 * 'behoeftigen', 'behoud', 'bejaarden', 'belangenbehartiging', 'beperking', 'beroepsonderwijs',
 * 'betaalbare zorg', 'beurzen', 'beveiliging', 'beweging', 'bibliotheek', 'bijbel', 'bijstand',
 * so this could be the same as name, I guess (with autocomplete)
 *
 * --- doelregio
 * this is indeed a tricky one. There are many countries (more than 100), and even more regios in
 * Nederland, en plaatsen in Nederland. It might be an idea to split international and national,
 * and give an autocomplete field for each (and just regio en plaats in Nederland together)
*/
const get = recurry (2) (
  (field) => (data) => {
    const seen = new Set
    for (const fonds of data) {
      fonds [field]
        | toListCollapseNil
        | each ((x) => seen.has (x) || seen.add (x))
    }
    return Array.from (seen)
  },
)

const get_naam_organisatie = get ('naam_organisatie')
const get_categories = get ('categories')
const get_doelgroepen = get ('doelgroep')
const get_trefwoorden = get ('trefwoorden')
// @todo there is a fonds with Err:522 as werkregio
const get_werkregio = get ('werk_regio')
const get_regios = get ('regios')

const sort = dot ('sort')

// --- we only search naam and regio here since they're alphabetical -- we sort the other ones by
// number of hits so it needs to be done later
export const getFilters = (data) => [
  { name:  "categories",
    options: get_categories (data)
  },
  { name:  "naam_organisatie",
    options: get_naam_organisatie (data) | sort,
  },
  { name:  "trefwoorden",
    options: get_trefwoorden (data),
  },
  { name:  "regios",
    options: get_regios (data) | sort,
  },
]

// const { log, } = console
// ; dataTst
  // | take (20)
  // | get_doelgroepen
  // | get_categories
  // | get_naam_organisatie
  // | get_trefwoorden
  // | get_landen
  // | get_regio_in_nederland
  // | get_plaats_in_nederland
  // | get_werkregio
  // | map (tap (log))
  // | sort
  // | log

