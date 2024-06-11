import {
  pipe, compose, composeRight,
  noop, remapTuples, join, whenPredicate,
  whenOk, id, map, find, ok, concatTo,
  compact, concat, againstAll, tap, ifOk, lets,
} from 'stick-js/es'

import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState, } from 'react'
import { Link, useNavigate, useParams as useRouteParams, } from 'react-router-dom'
import { useSelector, } from 'react-redux'
import styled from 'styled-components'

import configure from 'alleycat-js/es/configure'
import { logWith, toString, } from 'alleycat-js/es/general'
import { ifEquals, } from 'alleycat-js/es/predicate'
import { useCallbackConst, } from 'alleycat-js/es/react'
import { useReduxReducer, useSaga, } from 'alleycat-js/es/redux-hooks'
import { media, mediaQuery, } from 'alleycat-js/es/styled'

import { createReducer, } from '../../redux'

import { fondsDetailFetch, } from './actions'
import reducer from './reducer'
import saga from './saga'
import { selectFonds, } from './selectors'
import { selectQuery, } from '../Search/selectors'

import { StyledLink, MenuItem, } from '../../components/shared'
import { container, container2, useWhy, mediaPhone, mediaTablet, mediaDesktop, mediaTabletWidth, requestResults, } from '../../common'
import config from '../../config'
import { isNotEmptyString, } from '../../util-general'

const configTop = config | configure.init
const iconArrow = configTop.get ('icons.arrow')
const imageEyeWall = configTop.get ('images.fondsPlaceholder')
const imageTest = configTop.get ('imagesFonds.test')
const colors = configTop.get ('colors')
const okAndNotEmptyString = againstAll ([ok, isNotEmptyString])
const whenOkAndNotEmptyString = okAndNotEmptyString | whenPredicate

const jaNee = (x) => ['nee', 'ja'] [Number (x)]
const link = (value) => <StyledLink to={value} target='_blank'>{value}</StyledLink>

const DetailS = styled.div`
  color: ${colors.textBlock1Fg};
  a {
    color: initial;
  }
  > .x__image-and-tag {
    width: 100%;
    position: relative;
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
  > .x__back {
    font-size: 18px;
    margin-left: 20px;
    margin-right: 20px;
  }
  > .x__title-and-doelstelling {
    position: sticky;
    background: white;
    width: 100%;
    left: 0px;
    padding-bottom: 20px;
    > .x__doelstelling {
      color: ${colors.highlight3};
    }
  }
  ${mediaQuery (
    mediaPhone (`
      > .x__back {
        margin-top: 30px;
      }
      > .x__title-and-doelstelling {
        top: 0px;
        text-align: center;
        margin-top: 20px;
        > .x__title {
          font-size: 35px;
        }
        > .x__doelstelling {
          display: none;
        }
      }
    `),
    mediaTablet (`
      > .x__back {
        margin-top: 10px;
      }
      > .x__title-and-doelstelling {
        top: 100px;
        padding-left: 100px;
        margin-top: 20px;
        > .x__title {
          font-size: 60px;
        }
        > .x__doelstelling {
          display: initial;
        }
      }
    `),
  )}
  > .x__rubriek {
    background: ${colors.textBlock1};
  }
  > .x__algemeen {
    background: ${colors.textBlock2};
  }
  > .x__missie {
    background: ${colors.textBlock3};
  }
  > .x__doelgroep {
    background: ${colors.textBlock4};
  }
  > .x__werkgebied {
    background: ${colors.textBlock5};
  }
  > .x__bestedingen {
    background: ${colors.textBlock6};
  }
  > .x__projecten {
    background: ${colors.textBlock7};
  }
  > .x__proceduren {
    background: ${colors.textBlock8};
  }
  > .x__financieel {
    background: ${colors.textBlock9};
  }
  > .x__contact {
    background: ${colors.textBlock10};
  }
`

const FieldS = styled.div`
  > .x__field {
    > .x__name {
      font-variant: small-caps;
      text-transform: lowercase;
      display: inline;
      &:after {
        content: ': '
      }
    }
    > .x__content {
      display: inline;
    }
  }
`

const Field = ({ name, value, wrap=id, }) => <FieldS>
  {value | whenOkAndNotEmptyString (() => <>
    <div className='x__field'>
      <div className='x__name'>
        {name}
      </div>
      <div className='x__content'>
        {wrap (value)}
      </div>
    </div>
  </>)}
</FieldS>

const FieldsS = styled.div`
  font-size: 16px;
  padding-right: 30px;
  padding-top: 20px;
  padding-bottom: 20px;
  > .x__block-title {
  }
  ${mediaQuery (
    mediaPhone (`
      padding-left: 50px;
    `),
    mediaTablet (`
      padding-left: 450px;
    `),
  )}
`

const Fields = ({ title, data, }) => {
  const show = useMemo (() => data | find (
    ([_name, value]) => value | okAndNotEmptyString,
  ), [data])
  return show && <FieldsS>
    <div className='x__block-title'>
      {title}
    </div>
    {data | map (([name, value, wrap]) => <Field
      key={name} name={name} value={value} wrap={wrap}
    />)}
  </FieldsS>
}

const BackS = styled.div`
  cursor: pointer;
  > img {
    transform: rotate(180deg);
  }
  > .x__link {
    padding-left: 10px;
  }
`

const Back = container2 (['Back'], () => {
  const navigate = useNavigate ()
  const onClick = useCallbackConst (() => navigate (-1))
  const query = useSelector (selectQuery)
  const MI = useCallbackConst ((props) => <MenuItem withArrow={false} style={{ display: 'inline-block', }} {... props}/>)
  const Elem = useCallback (({ text, }) => query | ifOk (
    () => <MI text={text} onClick={onClick}/>,
    () => <Link to='/search/*'><MI text={text}/></Link>,
  ), [query])
  return <BackS>
    <img src={iconArrow}/>
    <span className='x__link'>
      <Elem text='terug naar zoekresultaten'/>
    </span>
  </BackS>
})

const Detail = ({ image: _image, data, }) => <DetailS className='text'>
  <div className='x__image-and-tag'>
    <img src={imageTest}/>
  </div>
  <div className='x__back'>
    <Back/>
  </div>
  <div className='x__title-and-doelstelling'>
    <div className='x__title'>
      <StyledLink to={data.website} target='_blank'>
        {data.naam_organisatie}
      </StyledLink>
    </div>
    {/*<div className='x__doelstelling'>
      {data.doelstelling}
    </div>*/}
  </div>
  <div className='x__rubriek'>
    <Fields title='Rubriek' data={[
      ['categorieën', data.categories | whenOk (join (', '))],
      ['trefwoorden', data.trefwoorden | whenOk (join (', '))],
    ]}/>
    <Fields title='Rubriek' data={[
      ['categorieën', null],
      ['trefwoorden', null],
    ]}/>
  </div>
  <div className='x__algemeen'>
    <Fields title='Algemeen' data={[
      ['website', data.website, link],
      ['typering', data.type_organisatie],
      ['beheerd door', data.naam_moeder_organisatie],
      ['opgericht', data.oprichtings_datum],
      ['rechtsvorm', data.rechtsvorm],
      ['KVK', data.kvk_number],
      ['ANBI status', jaNee (data.anbi_status)],
      ['directie', data.directeur_algemeen],
      ['bestuur', [
        data.bestuursvoorzitter | whenOk (concat (', voorzitter')),
        data.bestuurssecretaris | whenOk (concat (', secretaris')),
        data.bestuurspenningmeester | whenOk (concat (', penningmeester')),
        ... data.bestuursleden_overig,
      ] | compact | join ('; ')],
    ]}/>
  </div>
  <div className='x__missie'>
    <Fields title='Missie' data={[
      ['doelstelling', data.doelstelling],
      ['stichter(s)', data.stichter],
      ['historie', data.historie],
      ['beleidsplan op website', jaNee (data.beleidsplan_op_website)],
    ]}/>
  </div>
  <div className='x__doelgroep'>
    <Fields title='Doelgroep' data={[
      ['algemeen', data.doelgroep],
      ['specifiek', data.doelgroep_overig],
      ['activiteiten', data.activiteiten_beschrijving],
      ['interventieniveau', data.interventie_niveau],
    ]}/>
  </div>
  <div className='x__werkgebied'>
    <Fields title='Werkgebied' data={[
      ['werkgebied', data.werk_regio],
      ['regio in Nederland', data.regio_in_nederland],
      ['plaats in Nederland', data.plaats_in_nederland],
      ['landen', data.landen],
    ]}/>
  </div>
  <div className='x__bestedingen'>
    <Fields title='Bestedingen' data={[
      ['budget', data.besteding_budget],
      ['ondersteunde projecten', data.ondersteunde_projecten],
      ['soort bijdrage', data.fin_fonds],
      ['bovengrens', data.max_ondersteuning],
      ['ondergrens', data.min_ondersteuning],
    ]}/>
  </div>
  <div className='x__projecten'>
    <Fields title='Projecten' data={[
      ['criteria', data.beschrijving_project_aanmerking],
      ['doorlooptijd', data.doorloop_tijd_act],
      ['status aanvrager', data.fonds_type_aanvraag],
      ['voorkeur/uitsluiting', data.uitsluiting],
    ]}/>
  </div>
  <div className='x__proceduren'>
    <Fields title='Procedure' data={[
      ['op aanvraag', jaNee (data.op_aanvraag)],
      ['doorlooptijd', data.doorloop_tijd],
      ['aanvraagprocedure', data.aanvraag_procedure],
      ['url', data.url_aanvraag_procedure, link],
    ]}/>
  </div>
  <div className='x__financieel'>
    <Fields title='Financieel' data={[
      ['eigen vermogen', data.eigen_vermogen],
      ['inkomsten EV', data.inkomsten_eigen_vermogen],
      ['herkomst middelen', data.herkomst_middelen],
      ['boekjaar', data.boekjaar],
      ['jaarverslag op website', data.url_jaarverslag, link],
    ]}/>
  </div>
  <div className='x__contact'>
    <Fields title='Contact' data={[
      ['bereikbaar per', data.contact],
      ['contactpersoon', data.cpfinaanvragen],
      ['postadres', data.postadres],
      ['email (algemeen)', data.email],
      ['telefoon (algemeen)', data.telefoon],
      ['telefoon (financiele aanvragen)', data.telefoon_fin_aanvragen | ifEquals (data.telefoon) (
        () => null, id,
      )],
    ]}/>
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
          data={data}
        />,
      })}
    </FondsDetailS>
  }
)
