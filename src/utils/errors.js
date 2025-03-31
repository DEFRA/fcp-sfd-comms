const isServerErrorCode = (code) => {
  return code >= 500 && code <= 599
}

export {
  isServerErrorCode
}
