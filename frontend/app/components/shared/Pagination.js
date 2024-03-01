import {
  pipe, compose, composeRight,
  map,
} from 'stick-js/es'

import React, { useMemo, } from 'react'
import styled from 'styled-components'

import { clss, } from 'alleycat-js/es/dom'
import { useCallbackConst, } from 'alleycat-js/es/react'

import { component, container, useWhy, } from '../../common'

const PaginationS = styled.div`
  line-height: 2em;

  >.x__num-per-page, >.x__cur-page >.x__page {
    >.x__num {
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
        top: 55px;
        height: 0px;
        width: 100%;
        border-top: 2px solid black;
      }
      &.x--selected >.x__cursor {
        display: block;
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
      height: 80px;
      white-space: nowrap !important;
    }
  }
`

const Pagination = component ([
  'Pagination',
], (props) => {
  const {
    collectionName,
    numsPerPage, page,
    setNumPerPageIdxDispatch, setCurPageDispatch,
  } = props

  const onClickNpp = useCallbackConst (
    (idx) => () => { setNumPerPageIdxDispatch (idx) },
  )

  const onClicksNpp = useMemo (
    () => numsPerPage | map (({ idx, }) => onClickNpp (idx)),
    [numsPerPage, onClickNpp],
  )

  const onClickPage = useCallbackConst (
    (idx) => () => { setCurPageDispatch (idx) },
  )

  const onClicksPage = useMemo (
    () => page | map (({ idx, }) => onClickPage (idx)),
    [page, onClickPage],
  )

  useWhy ('Pagination', props)
  return <PaginationS>
    <div className='x__num-per-page'>
      Number of {collectionName} per page:
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
      <div>
        Page:
      </div>
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
export const mkPagination = ({
  setNumPerPageIdx, setCurPage,
  selectNumsPerPage, selectPage,
}) => container ([
  'PaginationWrapper',
  {
    setNumPerPageIdxDispatch: setNumPerPageIdx,
    setCurPageDispatch: setCurPage,
  },
  {
    numsPerPage: selectNumsPerPage,
    page: selectPage,
  },
], ({
    setNumPerPageIdxDispatch, setCurPageDispatch, numsPerPage, page,
    ... restProps
  }) => <Pagination
    {... restProps}
    setNumPerPageIdxDispatch={setNumPerPageIdxDispatch}
    setCurPageDispatch={setCurPageDispatch}
    numsPerPage={numsPerPage}
    page={page}
  />
)
