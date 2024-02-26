import {
  pipe, compose, composeRight,
  againstBoth, ne, eq, not,
} from 'stick-js/es'

export const appEnv = process.env.APP_ENV || 'blah'
export const envIsNotPrdLike = appEnv | againstBoth (ne ('acc'), ne ('prd'))
export const envIsPrdLike = envIsNotPrdLike | not
export const envIsPrd = appEnv | eq ('prd')
export const envIsNotPrd = envIsPrd | not
export const envIsAcc = appEnv | eq ('acc')
export const envIsTst = appEnv | eq ('tst')
export const envIsDev = appEnv | eq ('dev')
export const envIsNotTst = envIsTst | not
export const envIsTstLike = envIsTst || envIsDev
export const envIsNotTstLike = envIsTstLike | not


