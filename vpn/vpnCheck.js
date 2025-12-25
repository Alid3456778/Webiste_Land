// vpnCheck.js
const vpnRanges = require("./vpnRanges");

function isVPN(ip) {
  return vpnRanges.some(prefix => ip.startsWith(prefix));
}

module.exports = function vpnBlocker(req, res, next) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress;

  // Remove IPv6 prefix
  const cleanIP = ip.replace("::ffff:", "");

  // Header-based proxy detection
  const proxyHeaders =
    req.headers["via"] ||
    req.headers["x-forwarded-for"] ||
    req.headers["forwarded"];

  if (isVPN(cleanIP) || proxyHeaders) {
    return res.status(403).json({
      success: false,
      message: "VPN or Proxy detected. Access blocked.",
    });
  }

  next();
};
