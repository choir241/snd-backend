function handleErrorMessage(res, errorMsg) {
  res.redirect(process.env.FRONTEND_URL);
  console.error(errorMsg);
  return res.status(400).json({ error: errorMsg });
}

module.exports = { handleErrorMessage };
