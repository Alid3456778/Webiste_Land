const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.in',
  port: 465,
  secure: true,
  auth: {
    user: 'orderconfirmation@mclandpharma.com',
    pass: 'YFc3HfTpMu5S',
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP is NOT working:', error);
  } else {
    console.log('✅ SMTP is working! Ready to send emails.');
  }
});