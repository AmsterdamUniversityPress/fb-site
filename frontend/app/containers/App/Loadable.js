import {
  pipe, compose, composeRight,
  lets,
} from 'stick-js/es'

import React from 'react'

import { loadable, } from 'alleycat-js/es/react'

import { LoadableLoading, } from '../../alleycat-components/index'

export const App = lets (
  () => import ('./index'),
  () => <LoadableLoading/>,
  (loadPromise, fallback) => loadable (
    () => loadPromise, { fallback },
  ),
)
