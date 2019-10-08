'use strict';

/**
 * Log 5xx errors to the console.
 * This allows us to disable error logging in strong-error-handler
 * to prevent 4xx errors being logged to the console.
 * @see https://github.com/strongloop/strong-error-handler/issues/40#issuecomment-286061880
 */
module.exports = function createErrorLogger(options) {
  return function logError(err, req, res, next) {
    const status = err.status || err.statusCode;
    if (status >= 500) {
      // log only Internal Server errors
      console.log('Unhandled error for request %s %s: %s',
        req.method, req.url, err.stack || err);
    }

    // Let the next error handler middleware
    // produce the HTTP response
    next(err);
  };
};
