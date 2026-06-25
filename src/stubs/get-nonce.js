// Stub for get-nonce — provides CSP nonce support (no-op when nonce is not set)
var _nonce = undefined;
export function setNonce(nonce) {
  _nonce = nonce;
}
export function getNonce() {
  return _nonce;
}
