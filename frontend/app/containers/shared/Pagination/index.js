import {
  pipe, compose, composeRight,
  map, find, prop, eq, last,
  lets, not,
} from 'stick-js/es'

import React, { useCallback, useMemo, } from 'react'

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

  >.x__num-per-page {
    font-size: 80%;
  }
  >.x__cur-page {
    >.x__arrow {
      position: relative;
      cursor: pointer;
      &.x--disabled {
        cursor: inherit;
        opacity: 0.5;
      }
    }
  }
  .x__left1, .x__right1 {
    font-size: 50px;
    top: -14px;
  }
  .x__left2, .x__right2 {
    font-size: 30px;
    top: -6px;
  }
  >.x__num-per-page, >.x__cur-page >.x__page {
    >.x__num {
      cursor: pointer;
      display: inline-block;
      padding: 0px 6px 0px 6px;
      min-width: 35px;
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
    // display: flex;
    > * {
      display: inline-block;
      vertical-align: middle;
    }
    > *:nth-child(1) {
      // flex: 0 0 50px;
    }
    > *:nth-child(2) {
      // flex: 1 0 50px;
    }
    >.x__page {
      display: inline-block;
      overflow-x: auto;
      overflow-y: hidden;
      // width: 650px;
      width: 150px;
      height: 57px;
      white-space: nowrap !important;
    }
  }
`

const PaginationInner = component ([
  'PaginationInner',
], (props) => {
  const {
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

  // --- @todo selector
  const selectedIdx = page | find (prop ('selected') >> eq (true)) | prop ('idx')

  const lastIdx = page | last | prop ('idx')
  const isLast = selectedIdx === lastIdx
  const isFirst = selectedIdx === 0
  const canLeft = not (isFirst)
  const canRight = not (isLast)
  const prevIdx = Math.max (0, selectedIdx - 1)
  const nextIdx = Math.min (lastIdx, selectedIdx + 1)
  const pageRange = lets (
    () => isLast ? [1, 2] : [0, 3],
    ([n, m]) => page.slice (prevIdx - n, prevIdx + m),
  )
  const onClickLeft2 = useCallback (
    () => canLeft && onClicksPage [0] (),
    [canLeft, onClicksPage],
  )
  const onClickLeft1 = useCallback (
    () => canLeft && onClicksPage [prevIdx] (),
    [canLeft, selectedIdx, onClicksPage],
  )
  const onClickRight2 = useCallback (
    () => canRight && onClicksPage [lastIdx] (),
    [canRight, onClicksPage],
  )
  const onClickRight1 = useCallback (
    () => canRight && onClicksPage [nextIdx] (),
    [canRight, selectedIdx, onClicksPage],
  )

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
      <div className={clss ('x__arrow', 'x__left2', canLeft || 'x--disabled')} onClick={onClickLeft2}>
        ⇤
      </div>
      <div className={clss ('x__arrow', 'x__left1', canLeft || 'x--disabled')} onClick={onClickLeft1}>
        ←
      </div>
      <div className='x__page'>
        {pageRange | map (({ n, idx, selected, }) => {
          const onClick = { onClick: onClicksPage [idx], }
          const cls = clss ('x__num', selected && 'x--selected')
          return <div key={idx} className={cls} {... selected || onClick}>
            <div className='x__cursor'/>
            {n}
          </div>
        })}
      </div>
      <div className={clss ('x__arrow', 'x__right1', canRight || 'x--disabled')} onClick={onClickRight1}>
        →
      </div>
      <div className={clss ('x__arrow', 'x__right2', canRight || 'x--disabled')} onClick={onClickRight2}>
        ⇥
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
