import {
  pipe, compose, composeRight,
  path, noop,
} from 'stick-js/es'

import React, { useCallback, useEffect, useMemo, useRef, useState, } from 'react'

import { FormattedMessage, } from 'react-intl'
import { connect, useDispatch, } from 'react-redux'
import { createStructuredSelector, } from 'reselect'
import styled from 'styled-components'

import configure from 'alleycat-js/es/configure'
import { clss, } from 'alleycat-js/es/dom'
import { logWith, } from 'alleycat-js/es/general'
import { useCallbackConst, } from 'alleycat-js/es/react'
import { useReduxReducer, useSaga, } from 'alleycat-js/es/redux-hooks'
import { media, mediaQuery, } from 'alleycat-js/es/styled'

import { createReducer, } from '../../redux'

import { queryUpdated, } from './actions'
import reducer from './reducer'
import saga from './saga'
import { selectResults, } from './selectors'

import { Input, } from '../../components/shared/Input'

import { container, effects, isNotEmptyString, useWhy, whenIsNotEmptyString, requestResults, } from '../../common'
import config from '../../config'

const targetValue = path (['target', 'value'])

const SearchS = styled.div`
  > * {
    vertical-align: middle;
  }
  > .x__text {
    margin-left: 20px;
    &.x--disabled {
      opacity: 0.6;
    }
  }
`

const dispatchTable = {
  queryUpdatedDispatch: queryUpdated,
}

const selectorTable = {
  results: selectResults,
}

export default container (
  ['Search', dispatchTable, selectorTable],
  (props) => {
    const { queryUpdatedDispatch, results, } = props
    const [string, setString] = useState ('')
    const onChange = useCallbackConst (targetValue >> effects ([
      setString,
      queryUpdatedDispatch,
    ]))
    const canSearch = useMemo (() => string | isNotEmptyString, [string])
    const cls = clss ('x__text', canSearch || 'x--disabled')

    useWhy ('Search', props)
    useReduxReducer ({ createReducer, reducer, key: 'Search', })
    useSaga ({ saga, key: 'Search', })

    return <SearchS>
      <Input
        withIcon={['search', 'left']}
        height='100%'
        width='50%'
        padding='16px'
        style={{ display: 'inline-block', }}
        inputStyle={{
          fontSize: '25px',
          border: '2px solid black',
          borderRadius: '1000px',
          background: 'white',
        }}
        onChange={onChange}
        value={string}
      />
      <span className={cls}>zoeken</span>
      <div>
        {results | requestResults ({ onLoading: noop, })}
      </div>
    </SearchS>
  }
)
