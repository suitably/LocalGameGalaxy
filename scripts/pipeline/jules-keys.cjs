// Collects JULES_API_KEY and JULES_API_KEY_* from the environment in stable order.
// Secrets are mapped explicitly in the workflows (least privilege, no toJSON(secrets)).
module.exports = function loadKeys() {
  return Object.keys(process.env)
    .filter((n) => /^JULES_API_KEY(_\w+)?$/.test(n) && process.env[n])
    .sort()
    .map((name) => ({ name, value: process.env[name] }));
};
