import {
  pipe, compose, composeRight,
  map,
} from 'stick-js/es'

import React, { useMemo, } from 'react'

import styled from 'styled-components'

import { clss, } from 'alleycat-js/es/dom'
import {} from 'alleycat-js/es/general'
import { useCallbackConst, } from 'alleycat-js/es/react'

import { useReduxReducer, useSaga, } from 'alleycat-js/es/redux-hooks'

import { setNumPerPageIdx, setPage, } from './actions'
import reducer from './reducer'
import { createReducer, } from '../../../redux'
import saga from './saga'
import { selectNumsPerPageComponent, selectPageComponent, } from './selectors'

import { component, container, useWhy, } from '../../../common'

const PaginationS = styled.div`
  line-height: 2em;

  >.x__num-per-page, >.x__cur-page >.x__page {
    >.x__num {
      cursor: pointer;
      display: inline-block;
      padding: 0px 6px 0px 6px;
      min-width: 35px;
      text-align: center;
      &:nth-child(1) {
        border: 0;
      }
      >.x__cursor {
        display: none;
        position: relative;
        top: 40px;
        height: 0px;
        width: 100%;
        border-top: 2px solid black;
      }
      &.x--selected {
        cursor: inherit;
        >.x__cursor {
          cursor: inherit;
          display: block;
        }
      }
    }
  }
  >.x__cur-page {
    display: flex;
    > *:nth-child(1) {
      flex: 0 0 50px;
    }
    > *:nth-child(2) {
      flex: 1 0 50px;
    }
    >.x__page {
      display: inline-block;
      overflow-x: auto;
      overflow-y: hidden;
      width: 650px;
      height: 57px;
      white-space: nowrap !important;
    }
  }
`

const PaginationInner = component ([
  'PaginationInner',
], (props) => {
  const {
    collectionName,
    numsPerPage, page,
    setNumPerPageIdxDispatch, setPageDispatch,
    textNumber='Number per page:',
    textPage='Page:',
  } = props

  const onClickNpp = useCallbackConst (
    (idx) => () => { setNumPerPageIdxDispatch (idx) },
  )

  const onClicksNpp = useMemo (
    () => numsPerPage | map (({ idx, }) => onClickNpp (idx)),
    [numsPerPage, onClickNpp],
  )

  const onClickPage = useCallbackConst (
    (idx) => () => { setPageDispatch (idx) },
  )

  const onClicksPage = useMemo (
    () => page | map (({ idx, }) => onClickPage (idx)),
    [page, onClickPage],
  )

  useWhy ('PaginationInner', props)

  return <PaginationS>
    <div className='x__num-per-page'>
      {textNumber}
      {numsPerPage | map (({ n, idx, selected, }) => {
        const onClick = { onClick: onClicksNpp [idx], }
        const cls = clss ('x__num', selected && 'x--selected')
        return <div key={idx} className={cls} {... selected || onClick}>
          <div className='x__cursor'/>
          {n}
        </div>
      })}
    </div>
    {page.length > 1 && <div className='x__cur-page'>
      <div>{textPage}</div>
      <div className='x__page'>
        {page | map (({ n, idx, selected, }) => {
          const onClick = { onClick: onClicksPage [idx], }
          const cls = clss ('x__num', selected && 'x--selected')
          return <div key={idx} className={cls} {... selected || onClick}>
            <div className='x__cursor'/>
            {n}
          </div>
        })}
      </div>
    </div>}
  </PaginationS>
})

// --- a function which returns a React component (a Redux container)
export default container ([
  'Pagination',
  {
    setNumPerPageIdxDispatch: setNumPerPageIdx,
    setPageDispatch: setPage,
  },
  {
    numsPerPage: selectNumsPerPageComponent,
    page: selectPageComponent,
  },
], (props) => {
    const {
      setNumPerPageIdxDispatch, setPageDispatch, numsPerPage, page,
      numItems, textNumber, textPage,
      ... restProps
    } = props

    useWhy ('Pagination', props)
    useReduxReducer ({ createReducer, reducer, key: 'Pagination', })
    useSaga ({ saga, key: 'Pagination', })

    return <PaginationInner
      {... restProps}
      setNumPerPageIdxDispatch={setNumPerPageIdxDispatch}
      setPageDispatch={setPageDispatch}
      numsPerPage={numsPerPage}
      page={page (numItems)}
      textNumber={textNumber}
      textPage={textPage}
    />
  },
)
