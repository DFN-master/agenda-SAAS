const setupWhatsAppIntegration = (app) => {
  app.post('/webhook', (req, res) => {
    const message = req.body;
    console.log('Received message:', message);

    // TODO: Process the message and respond
    res.status(200).send('Message received');
  });
};

module.exports = { setupWhatsAppIntegration };