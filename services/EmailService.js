const Email = require('email-templates');
const path = require('path');

const nodemailer = require('nodemailer');

const transport = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: '587',
  secure: false,
  requireTLS: true,
  auth: {
    user: 'Nipexsupport@nipex.com.ng', // generated ethereal user
    pass: '%liuJ1vJjV', // generated ethereal password
  },
  // tls: { ciphers: 'SSLv3' }
});

exports.email = (emailAddress, password, name, template) => {
  console.log(__dirname);
  const templateDir = path.join(__dirname, 'Emails');

  const emailService = new Email({
    views: { root: templateDir },
    message: {
      from: 'Nipexsupport@nipex.com.ng',
    },

    send: true,
    transport,
  });

  emailService
    .send({
      template,
      message: {
        to: emailAddress,
      },
      locals: {
        password,
        name,
      },
    })
    .then(console.dir)
    .catch(err => console.error('Error', err));
};
