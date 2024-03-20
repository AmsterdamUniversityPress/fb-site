import {
  pipe, compose, composeRight,
  lets,
} from 'stick-js/es'

import React from 'react'

import { loadable, } from 'alleycat-js/es/react'

import { LoadableLoading, } from '../../alleycat-components'

export const Admin = lets (
  () => import ('./index'),
  () => <LoadableLoading/>,
  (loadPromise, fallback) => loadable (
    () => loadPromise, { fallback },
  ),
)
