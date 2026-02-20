# Missing CALL_SETUP_FAILED Error Code

## Problem
`ERROR_CODES.CALL_SETUP_FAILED` was used in multiple catch blocks across `callRouter.js` but was never defined in `constants.js`. This resulted in `code: undefined` in error responses.

## What Changed

### `src/utils/constants.js`
**Added:** `CALL_SETUP_FAILED: 'E109'` to the ERROR_CODES object.

Now all catch blocks in callRouter.js that reference `ERROR_CODES.CALL_SETUP_FAILED` return a proper error code.
