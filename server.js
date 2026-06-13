/**
 * EduSphere AI - Server Network Entry Point
 * Imports application environment layers and handles server port bindings.
 */
const app = require('./app');
const dotenv = require('dotenv');

// Initialize configuration layers
dotenv.config();
const PORT = process.env.PORT || 5000;

// Fire up live network tracking port listener
app.listen(PORT, () => {
    console.log(`🚀 EduSphere AI API Backend Engine actively running on port ${PORT}`);
    console.log(`🔒 Secure JWT Signature Core active. Enforcing Role Access Controls.`);
});