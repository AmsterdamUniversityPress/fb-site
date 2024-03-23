import {
  pipe, compose, composeRight,
  assoc, ifOk, tap, merge,
} from 'stick-js/es'

import { Just, Nothing, } from 'alleycat-js/es/bilby'
import { RequestLoading, RequestResults, } from 'alleycat-js/es/fetch'
import { composeManyRight, logWith, } from 'alleycat-js/es/general'
import { makeReducer, } from 'alleycat-js/es/redux'

import {
  loggedInInstitution,
  loginUserCompleted,
  loggedOutUser,
} from '../../actions/main'

import { reducer, } from '../../../../common'

export const initialState = {
  // --- we expect /hello to be called on app mount, so loading is fine as an initial state.
  userUser: RequestLoading (Nothing),
  userInstitution: RequestLoading (Nothing),
  // --- @todo make consistent (Maybe vs. RequestResults)
  userPrivileges: Nothing,
}

const reducerTable = makeReducer (
  loggedInInstitution, (user) => assoc (
    'userInstitution', RequestResults (user),
  ),
  // --- user null means error or not logged in -- we collapse both to mean 'not logged in' since
  // in the case of error we've already shown the oops bubble
  loginUserCompleted, (user) => composeManyRight (
    assoc ('userUser', user | ifOk (
      () => RequestResults (user),
      () => RequestLoading (Nothing),
    )),
    assoc ('userPrivileges', user | ifOk (
      () => Just (user.privileges),
      () => Nothing,
    )),
  ),
  loggedOutUser, () => merge ({
    userUser: RequestLoading (Nothing),
    userPrivileges: Nothing,
  }),
)

export default reducer ('app', initialState, reducerTable)
