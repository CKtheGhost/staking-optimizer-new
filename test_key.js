// test_key.js
require("dotenv").config();
const { Account, Ed25519PrivateKey } = require("@aptos-labs/ts-sdk");

console.log("APTOS_PRIVATE_KEY:", process.env.APTOS_PRIVATE_KEY);
console.log("Type of APTOS_PRIVATE_KEY:", typeof process.env.APTOS_PRIVATE_KEY);

try {
  const privateKey = new Ed25519PrivateKey(process.env.APTOS_PRIVATE_KEY); // Direct input
  const account = Account.fromPrivateKey({ privateKey });
  console.log("Address:", account.accountAddress.toString());
} catch (error) {
  console.error("Error:", error.message);
}
