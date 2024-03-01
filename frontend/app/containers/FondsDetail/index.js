import {
  pipe, compose, composeRight,
} from 'stick-js/es'

import React, { Fragment, useCallback, useEffect, useRef, useState, } from 'react'
import { useParams as useRouteParams, } from 'react-router-dom'

import styled from 'styled-components'

import configure from 'alleycat-js/es/configure'
import {} from 'alleycat-js/es/general'
import { useCallbackConst, } from 'alleycat-js/es/react'
import { useReduxReducer, useSaga, } from 'alleycat-js/es/redux-hooks'
import { media, mediaQuery, } from 'alleycat-js/es/styled'

import { createReducer, } from '../../redux'

import { fondsDetailFetch, } from './actions'
import reducer from './reducer'
import saga from './saga'
import {
  selectFondsDetail,
} from './selectors'

import { container, useWhy, mediaPhone, mediaTablet, mediaDesktop, mediaTabletWidth, } from '../../common'
import config from '../../config'

const FondsDetailS = styled.div`
`

const dispatchTable = {
  fondsDetailFetchDispatch: fondsDetailFetch,
}

const selectorTable = {
}

export default container (
  ['FondsDetail', dispatchTable, selectorTable],
  (props) => {

    useWhy ('FondsDetail', props)
    useReduxReducer ({ createReducer, reducer, key: 'FondsDetail', })
    useSaga ({ saga, key: 'FondsDetail', })

    const { fondsDetailFetchDispatch, } = props
    const params = useRouteParams ('uuid')
    const { uuid, } = params
    useEffect (() => {
      fondsDetailFetchDispatch (uuid)
    }, [uuid])

    return <FondsDetailS>
      detail for {uuid}
    </FondsDetailS>
  }
)
