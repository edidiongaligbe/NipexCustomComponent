const express = require('express');
const OracleBot = require('@oracle/bots-node-sdk');
const app = express();
OracleBot.init(app);
// implement custom component api
OracleBot.Middleware.customComponent(app, {
 baseUrl: '/nipexcc/components',
 cwd: __dirname,
 register: [
 './components'
 ]
});
module.exports = app;