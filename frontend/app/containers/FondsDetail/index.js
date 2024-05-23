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
const configTop = config | configure.init
const imageEyeWall = configTop.get ('images.fonds')
const colors = configTop.get ('colors')

const DetailS = styled.div`
  .x__image-and-tag {
    width: 100%;
    position: relative;
    margin-top: 1%;
    padding: 2%;
    img {
      height: 100%;
      width: 100%;
    }
    span {
      position: absolute;
      top: 300px;
      left: 100px;
      color: white;
      font-size: 60px;
    }
  }
  .x__title-and-doelstelling {
    margin-left: 100px;
    padding-bottom: 20px;
    .x__title {
      font-size: 60px;
    }
    .x__doelstelling {
      color: ${colors.highlight3};
    }
  }
  .x__block {
    font-size: 16px;
    padding-top: 20px;
    padding-bottom: 20px;
    padding-left: 450px;
    .x__title {
      font-size: 30px;
    }
  }
  .x__block1 {
    background: ${colors.textBlock1};
  }
  .x__block2 {
    background: ${colors.textBlock2};
  }
  .x__block3 {
    background: ${colors.textBlock3};
  }
`

const oldDetail = ({ data, }) => <DetailS>
  {data | remapTuples ((k, v) => <div key={k} className='x__row'>
    {k}: {JSON.stringify (v)}
  </div>)}
</DetailS>

const Detail = ({ image, title, tag, doelstelling, title1, title2, title3, text1, text2, text3, }) => <DetailS>
  <div className='x__image-and-tag'>
    <img src={image}/>
    <span>{tag}</span>
  </div>
  <div className='x__title-and-doelstelling'>
    <div className='x__title'>
      {title}
    </div>
    <div className='x__doelstelling'>
      {doelstelling}
    </div>
  </div>
  <div className='x__block x__block1'>
    <div className='x__title'>
      {title1}
    </div>
    {text1}
  </div>
  <div className='x__block x__block2'>
    <div className='x__title'>
      {title2}
    </div>
    {text2}
  </div>
  <div className='x__block x__block3'>
    <div className='x__title'>
      {title3}
    </div>
    {text3}
  </div>
</DetailS>

const FondsDetailS = styled.div`
  height: 100%;
  background: white;
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
        onResults: (data) => <Detail
          image={imageEyeWall}
          title={data.naam_organisatie}
          tag='Alles van waarde is weerloos'
          doelstelling={data.doelstelling}
          title1='Vijf muzikale beurzen'
          title2='Vijf muzikale beurzen'
          title3='Vijf muzikale beurzen'
          text1={data.doelstelling}
          text2={data.doelstelling}
          text3={data.doelstelling}
        />,
      })}
    </FondsDetailS>
  }
)
