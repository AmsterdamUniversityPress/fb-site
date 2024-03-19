import {
  pipe, compose, composeRight,
  ok, prop, map, path,
} from 'stick-js/es'

import { createSelector, defaultMemoize as memoize, } from 'reselect'

import { fold, foldMaybe, isJust, toJust, } from 'alleycat-js/es/bilby'
import configure from 'alleycat-js/es/configure'
import { foldIfRequestResults, } from 'alleycat-js/es/fetch'
import { logWith, ierror, reduceX, } from 'alleycat-js/es/general'

import { initialState, } from './reducer'

import { initSelectors, nullMap, } from '../../../../common'

const { select, selectTop, selectVal, } = initSelectors (
  'app',
  initialState,
)

// --- returns Request which wraps (user | null)
const selectUserUser = selectVal ('userUser')
const selectUserInstitution = selectVal ('userInstitution')

// --- returns Request which wraps (true | false)
export const selectUserLoggedIn = select (
  'selectUserLoggedIn',
  [selectUserUser],
  // --- map means take the RequestResults case
  (user) => user | map (ok),
)

// --- returns Request which wraps (true | false)
export const selectInstitutionLoggedIn = select (
  'selectInstitutionLoggedIn',
  [selectUserInstitution],
  // --- map means take the RequestResults case
  (institution) => institution | map (ok),
)

// --- folds to true or false
export const selectUserLoggedInDefaultFalse = select (
  'selectUserLoggedInDefaultFalse',
  [selectUserLoggedIn],
  (user) => user | foldIfRequestResults (
    (yesNo) => yesNo,
    () => false,
  ),
)

// --- folds to true or false
export const selectInstitutionLoggedInDefaultFalse = select (
  'selectInstitutionLoggedInDefaultFalse',
  [selectInstitutionLoggedIn],
  (institution) => institution | foldIfRequestResults (
    (yesNo) => yesNo,
    () => false,
  ),
)

export const selectLoggedInDefaultFalse = select (
  'selectLoggedInDefaultFalse',
  [selectUserLoggedIn, selectInstitutionLoggedIn],
  (user, institution) => user || institution,
)

export const selectGetUserType = select (
  'selectGetUserType',
  [selectUserLoggedInDefaultFalse, selectInstitutionLoggedInDefaultFalse],
  (user, institution) => () => user ? 'user' : institution ? 'institution' : null,
)

// ------ type: institution. Only use these once you're sure that userInstitution is a Just.

export const selectGetContactEmail = select (
  'selectGetContactEmail',
  [selectUserInstitution],
  (institution) => () => institution | toJust | path (['contact', 'email']),
)

export const selectGetInstitutionName = select (
  'selectGetInstitutionName',
  [selectUserInstitution],
  (institution) => () => institution | toJust | prop ('name'),
)

// ------ type: user. Only use these once you're sure that userUser is a Just.

export const selectGetFirstName = select (
  'selectGetFirstName',
  [selectUserUser],
  (user) => () => user | toJust | prop ('firstName'),
)

export const selectGetLastName = select (
  'selectGetLastName',
  [selectUserUser],
  (user) => () => user | toJust | prop ('lastName'),
)

export const selectGetEmail = select (
  'selectGetEmail',
  [selectUserUser],
  (user) => () => user | toJust | prop ('email'),
)
