import {
  pipe, compose, composeRight,
  noop, remapTuples,
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
  selectFonds,
} from './selectors'

import { container, useWhy, mediaPhone, mediaTablet, mediaDesktop, mediaTabletWidth, requestResults, } from '../../common'
import config from '../../config'

const DetailS = styled.div`
`

const Detail = ({ data, }) => <DetailS>
  {data | remapTuples ((k, v) => <div key={k} className='x__row'>
    {k}: {JSON.stringify (v)}
  </div>)}
</DetailS>

const FondsDetailS = styled.div`
  height: 100%;
  background: white;
  margin-top: 1%;
  padding: 2%;
`

const dispatchTable = {
  fondsDetailFetchDispatch: fondsDetailFetch,
}

const selectorTable = {
  fonds: selectFonds,
}

export default container (
  ['FondsDetail', dispatchTable, selectorTable],
  (props) => {
    const { fonds, fondsDetailFetchDispatch, } = props
    const params = useRouteParams ('uuid')
    const { uuid, } = params

    useWhy ('FondsDetail', props)
    useReduxReducer ({ createReducer, reducer, key: 'FondsDetail', })
    useSaga ({ saga, key: 'FondsDetail', })

    useEffect (() => {
      fondsDetailFetchDispatch (uuid)
    }, [fondsDetailFetchDispatch, uuid])

    return <FondsDetailS>
      {fonds | requestResults ({
        onError: noop,
        onResults: (data) => <Detail data={data}/>,
      })}
      <div>detail for {uuid}</div>
      <div>
      </div>
    </FondsDetailS>
  }
)
