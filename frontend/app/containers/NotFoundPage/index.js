import React from 'react'
import styled from 'styled-components'

import { withDisplayName, } from 'alleycat-js/es/react'

export default withDisplayName ('NotFound') (
  () => <article>
    Pagina niet gevonden.
  </article>
)
