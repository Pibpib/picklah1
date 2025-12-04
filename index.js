export const revenuecatWebhook = functions.https.onRequest(async (req, res) => {
  console.log("RevenueCat Webhook Event:", req.body);
  res.status(200).send("OK");
});
