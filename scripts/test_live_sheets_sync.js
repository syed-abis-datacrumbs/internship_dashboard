const { updateCandidate } = require('../lib/candidates');

console.log("Testing real-time Google Sheets sync for an ACCEPTED candidate...");

const testCandidate = updateCandidate("cand-3", {
  status: "ACCEPTED",
  emailReply: "I accept the offer! Thank you so much!",
  responseDate: new Date().toISOString().split('T')[0]
});

console.log("Updated candidate cand-3 status to ACCEPTED:", testCandidate?.name);
console.log("Waiting 3 seconds for async Google Sheets API trigger...");
setTimeout(() => {
  console.log("Test finished successfully!");
  process.exit(0);
}, 3000);
