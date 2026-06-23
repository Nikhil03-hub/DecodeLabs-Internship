/**
 * notFound.js — catch-all for any route not matched by the router.
 * Must be registered AFTER all real routes so it only fires for unmatched paths.
 */
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code:    'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found.`,
    }
  });
};

module.exports = notFound;
