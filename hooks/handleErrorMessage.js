function handleErrorMessage(errorMsg, variableValue = "", variable = "") {
  console.error(errorMsg);
  if (variable && variableValue) {
    console.log(`${variable} logged: ${variableValue}`);
  }
  throw new Error(`${errorMsg}`);
}

module.exports = { handleErrorMessage };
