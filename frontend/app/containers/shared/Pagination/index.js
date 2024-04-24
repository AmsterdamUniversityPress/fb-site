import {
  pipe, compose, composeRight,
  map, find, prop, eq, last, tap,
  lets, not, compact, noop, whenOk, nil,
  defaultToV,
} from 'stick-js/es'

import React, { useCallback, useEffect, useMemo, useState, } from 'react'

import styled from 'styled-components'

import { clss, } from 'alleycat-js/es/dom'
import { logWith, warn, } from 'alleycat-js/es/general'
import { isEmptyList, } from 'alleycat-js/es/predicate'
import { useCallbackConst, } from 'alleycat-js/es/react'

import { useReduxReducer, useSaga, } from 'alleycat-js/es/redux-hooks'

import { setNumPerPageIdx, setPage, } from './actions'
import mkReducer from './reducer'
import { createReducer, } from '../../../redux'
import mkSaga from './saga'
import { init as initSelectors, } from './selectors'

import { component, container, useWhy, } from '../../../common'

const PaginationInnerS = styled.div`
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
    > * {
      display: inline-block;
      vertical-align: middle;
    }
    > *:nth-child(1) {
    }
    > *:nth-child(2) {
    }
    >.x__page {
      display: inline-block;
      overflow-x: auto;
      overflow-y: hidden;
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
    numItems,
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

  // --- note that the following assumes `page` is not empty (we must not render this component if
  // it is).

  // --- @todo selector
  // const selectedIdx = page | find (prop ('selected') >> eq (true)) | prop ('idx')
  const selectedIdx = page | find (prop ('selected') >> eq (true)) | whenOk (prop ('idx'))
  if (nil (selectedIdx)) warn ('ok this is weird, page was', page)
  const lastIdx = last (page).idx
  const [isFirst, isLast] = [selectedIdx === 0, selectedIdx === lastIdx]
  const [canLeft, canRight] = [not (isFirst), not (isLast)]
  const [prevIdx, nextIdx] = [
    Math.max (0, selectedIdx - 1), Math.min (lastIdx, selectedIdx + 1),
  ]
  const pageRange = lets (
    () => isLast ? [1, 2] : [0, 3],
    ([n, m]) => page.slice (Math.max (prevIdx - n, 0), prevIdx + m),
  )
  const onClickLeft2 = useCallback (
    () => canLeft && onClicksPage [0] (),
    [canLeft, onClicksPage],
  )
  const onClickLeft1 = useCallback (
    () => canLeft && onClicksPage [prevIdx] (),
    [canLeft, onClicksPage, prevIdx],
  )
  const onClickRight2 = useCallback (
    () => canRight && onClicksPage [lastIdx] (),
    [canRight, onClicksPage, lastIdx],
  )
  const onClickRight1 = useCallback (
    () => canRight && onClicksPage [nextIdx] (),
    [canRight, onClicksPage, nextIdx],
  )
  // @todo memoize
  const numsPerPageDisplay = compact (numsPerPage | map (({ n, idx, selected, }) => {
    // --- e.g. if there are 11 items total, show 10 and 50 as options, but not 100
    // --- @todo ugly to refer to previous element during map
    if (idx !== 0)
      if (numsPerPage [idx - 1].n >= numItems)
        return
    const onClick = { onClick: onClicksNpp [idx], }
    const cls = clss ('x__num', selected && 'x--selected')
    return <div key={idx} className={cls} {... selected || onClick}>
      <div className='x__cursor'/>
      {n}
    </div>
  }))

  return <PaginationInnerS>
    {numsPerPageDisplay.length > 1 && <div className='x__num-per-page'>
      {textNumber}
      {numsPerPageDisplay}
    </div>}
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
  </PaginationInnerS>
})

// --- a function which returns a React component (a Redux container)
export default (key='Pagination') => {
  const {
    selectNumsPerPageComponent,
    selectPageComponent,
    selectRange,
  } = initSelectors (key)

  return container ([
    key,
    {
      setNumPerPageIdxDispatch: (n) => setNumPerPageIdx (key, n),
      setPageDispatch: (n) => setPage (key, n),
    },
    {
      numsPerPage: selectNumsPerPageComponent,
      page: selectPageComponent,
      range: selectRange,
    },
  ], (props) => {
    const {
      setNumPerPageIdxDispatch, setPageDispatch,
      numsPerPage, page, range,
      numItems, textNumber, textPage, mkExplanation,
      ... restProps
    } = props

    // --- @todo intentionally doing this too often for now: we need a way to force refresh
    const [first, last] = range
    const explanation = mkExplanation (numItems, first, Math.min (last, numItems))

    useWhy (key, props)
    useReduxReducer ({ createReducer, reducer: mkReducer (key), key, })
    useSaga ({ saga: mkSaga (key), key, })

    return <>
      {explanation}
      {Boolean (numItems) && <PaginationInner
        {... restProps}
        setNumPerPageIdxDispatch={setNumPerPageIdxDispatch}
        setPageDispatch={setPageDispatch}
        numItems={numItems}
        numsPerPage={numsPerPage}
        page={page (numItems)}
        textNumber={textNumber}
        textPage={textPage}
      />}
    </>
  })
}
