// check-env.js
require('dotenv').config();
const SID = process.env.TWILIO_ACCOUNT_SID ? 'present' : 'missing';
const TOKEN = process.env.TWILIO_AUTH_TOKEN ? 'present' : 'missing';
const FROM = process.env.TWILIO_FROM ? process.env.TWILIO_FROM.replace(/\d(?=\d{2})/g, '*') : 'missing';
console.log('TWILIO_ACCOUNT_SID:', SID);
console.log('TWILIO_AUTH_TOKEN:', TOKEN);
console.log('TWILIO_FROM:', FROM);