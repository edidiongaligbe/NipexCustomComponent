/* eslint-disable */
const generator = require("generate-password");
const mysql = require("promise-mysql");
const Promise = require("bluebird");
const md5 = require("crypto-js/md5");
const soap = require("soap");
var path = require('path');
let util = require("util");

const {VRSDB, JQSDB} = require('../db')
module.exports = {
  metadata: () => ({
    name: "CodeEntryy",
    properties: {
      code: {
        required: true,
        type: "string"
      }
    },
    supportedActions: ["codeEntryError"]
  }),
  invoke: (conversation, done) => {
    let { code } = conversation.properties();
    code = code.trim();
    let connection;
    let connection2;
    let SystemType;

    Promise.all([
      mysql
        .createConnection({
          host: JQSDB.host,
          password: JQSDB.password,
          user: JQSDB.user,
          port: JQSDB.port,
          database: JQSDB.database
        })
        .then(conn => {
          connection = conn;
          return connection.query(
            `select * from password_recovery where code="${code}"`
          );
        })
        .then(row => {
          connection.end();
          if (row.length != 0) {
            return row[0].SystemType;
          }
          return false;
        })
        .catch(e => {
          if (connection) connection.end();
          return false;
        }),

      mysql
        .createConnection({
          host: VRSDB.host,
          password: VRSDB.password,
          user: VRSDB.user,
          port: VRSDB.port,
          database: VRSDB.database
        })
        .then(conn => {
          connection2 = conn;
          return connection2.query(
            `select * from password_recovery where code="${code}"`
          );
        })
        .then(row => {
          connection2.end();
          if (row.length != 0) {
            return row[0].SystemType;
          }
          return false;
        })
        .catch(e => {
          // console.log("THIS ERRORORORORORORORRO:",e);
          if (connection2) connection2.end();

          return false;
        })
    ]).spread((NJQS, VRS) => {
      console.log(NJQS, VRS);
      if (NJQS) {
        SystemType = NJQS;
      } else if (VRS) {
        SystemType = VRS;
      } else {
        SystemType = "Invalid";
      }

      console.log("System Type", SystemType);
      if (SystemType == "NipeX Joint Qualification System") {
        mysql
          .createConnection({
            host: JQSDB.host,
            password: JQSDB.password,
            user: JQSDB.user,
            port: JQSDB.port,
            database: JQSDB.database
          })
          .then(conn => {
            connection = conn;
            return connection.query(
              `select * from password_recovery where code="${code}"`
            );
          })
          .then(row => {
            if (row.length != 0) {
              const { email } = row[0];

              const password = generator.generate({
                length: 8,
                numbers: true,
                uppercase: true,
                excludeSimilarCharacters: true
              });
              connection
                .query(`DELETE FROM password_recovery WHERE code = "${code}"`)
                .then(result => {
                  connection
                    .query(
                      `UPDATE sec_supp_users SET pswd = '${password}' WHERE sec_supp_users.email = '${email}'`
                    )
                    .then(result =>
                      connection.query(
                        `select * from sec_supp_users where email="${email}"`
                      )
                    )
                    .then(row => {
                      if (row.length != 0) {
                        const { email, name } = row[0];
                        connection.end();
                        // EmailService.email(
                        //   email,
                        //   password,
                        //   name,
                        //   "PasswordRecovery"
                        // );
                        let reply = `${email}%${password}%${name}%PasswordRecovery`;
                        conversation.variable('resultFromEmailRecovery', reply);
                        conversation.keepTurn(true);
                        conversation.transition();
                        done();
                      } else {
                        connection.end();
                        conversation.transition("codeEntryError");
                      }
                    })
                    .catch(err => {
                      connection.end();
                      console.log(err);
                      conversation.transition("codeEntryError");
                      done();
                    });
                });
            } else {
              connection.end();
              conversation.transition("codeEntryError");
              done();
            }
          })
          .catch(err => {
            console.log(err);

            connection.end();
          });
      } else if (SystemType == "Supplier Registration") {
        mysql
          .createConnection({
            host: VRSDB.host,
          password: VRSDB.password,
          user: VRSDB.user,
          port: VRSDB.port,
          database: VRSDB.database
          })
          .then(conn => {
            connection = conn;
            return connection.query(
              `select * from password_recovery where code="${code}"`
            );
          })
          .then(row => {
            if (row.length != 0) {
              const { email, level } = row[0];

              console.log(level);
              const password = generator.generate({
                length: 8,
                numbers: true,
                uppercase: true,
                excludeSimilarCharacters: true
              });
              const salt = "$anexamplestringforsalt$";
              let hashedPassword = md5(salt + password);
              console.log(password);
              connection
                .query(`DELETE FROM password_recovery WHERE code = "${code}"`)
                .then(result => {
                  if (level == "Pre-Questionnaire") {
                    connection
                      .query(
                        `UPDATE tbl_company_mst SET fldv_company_password = '${hashedPassword}' WHERE fldv_email_id = '${email}'`
                      )
                      .then(result =>
                        connection.query(
                          `select * from tbl_company_mst where fldv_email_id="${email}"`
                        )
                      )
                      .then(row => {
                        if (row.length != 0) {
                          // const {
                          //   email,

                          // } = row[0];
                          connection.end();
                          // EmailService.email(
                          //   email,
                          //   password,
                          //   "",
                          //   "PasswordRecovery"
                          // );
                          let reply = `${email}%${password}%no_value%PasswordRecovery`;
                          conversation.variable('resultFromEmailRecovery', reply);
                          conversation.keepTurn(true);
                          conversation.transition();
                          done();
                        } else {
                          connection.end();
                          conversation.transition("codeEntryError");
                        }
                      })
                      .catch(err => {
                        connection.end();
                        console.log(err);
                        conversation.transition("codeEntryError");
                        done();
                      });
                  } else {
                    connection
                      .query(
                        `UPDATE tbl_vendor_mst SET fldv_password = '${hashedPassword}' WHERE tbl_vendor_mst.fldv_email = '${email}'`
                      )
                      .then(result =>
                        connection.query(
                          `select * from tbl_vendor_mst where fldv_email="${email}"`
                        )
                      )
                      .then(row => {
                        if (row.length != 0) {
                          // const {
                          //   fldv_email,

                          // } = row[0];
                          connection.end();
                          // EmailService.email(
                          //   email,
                          //   password,
                          //   "",
                          //   "PasswordRecovery"
                          // );
                          let reply = `${email}%${password}%no_value%PasswordRecovery`;
                          conversation.variable('resultFromEmailRecovery', reply);
                          conversation.keepTurn(true);
                          conversation.transition();
                          done();
                        } else {
                          connection.end();
                          conversation.transition("codeEntryError");
                        }
                      })
                      .catch(err => {
                        connection.end();
                        console.log(err);
                        conversation.transition("codeEntryError");
                        done();
                      });
                  }
                });
            } else {
              connection.end();
              conversation.transition("codeEntryError");
              done();
            }
          })
          .catch(err => {
            console.log(err);

            connection.end();
          });
      } else if (SystemType == "NipeX e-Market") {
        console.log(SystemType)
        mysql
          .createConnection({
            host: JQSDB.host,
          password: JQSDB.password,
          user: JQSDB.user,
          port: JQSDB.port,
          database: JQSDB.database
          })
          .then(conn => {
            connection = conn;
            return connection.query(
              `select * from password_recovery where code="${code}"`
            );
          })
          .then(row => {
            if (row.length != 0) {
              const { email, SupplierID } = row[0];

              console.log(email, SupplierID);

              // var url =       "http://trn.nipex-ng.com:8080/sap/bc/srt/wsdl/bndg_5C7D64A46D811CE9E1000000C0A8010D/wsdl11/allinone/ws_policy/document?sap-client=310";
              var auth =
              "Basic " +
              new Buffer.from("bot_user" + ":" + "Robot@123").toString("base64");
            let url = path.join(__dirname, "..", "Password_Request_WS.wsdl");
            console.log("urrrrllrlrl", url);
            soap.createClient(
              url,
              {
                wsdl_headers: {
                  Authorization: auth
                },
                endpoint: "http://secure.nipex-ng.com:8191/sap/bc/srt/rfc/sap/zpassword_reset_ws/500/zbinding1/zbinding1"
                // "http://trn.nipex-ng.com:8080/sap/bc/srt/rfc/sap/zrequest_supplier_email_ws/310/zrequest_supp_email/zbinding1"
                //   "http://trn.nipex-ng.com:8080/sap/bc/srt/rfc/sap/zpassword_reset_ws/310/zbinding1/zbinding1"
              },
                function(err, client) {
                  client.setSecurity(
                    new soap.BasicAuthSecurity("bot_user", "Robot@123")
                  );

                  client.ZBINDING1.ZBINDING1.ZresetUserPassword(
                    {
                      ImUser: SupplierID
                    },
                    function(err, result, rawResponse, soapHeader, rawRequest) {
                      if (err) {
                        console.log(err);
                        connection.end();
                        conversation.transition("codeEntryError");
                        done();
                      } else {
                        if (
                          result.ExStatus == "success" ||
                          result.ExStatus == "Success"
                        ) {
                          connection.end();
                          // EmailService.email(
                          //   email,
                          //   result.ExPassword,
                          //   "",
                          //   "PasswordRecovery"
                          // );
                          let reply = `${email}%${result.ExPassword}%no_value%PasswordRecovery`;
                          conversation.variable('resultFromEmailRecovery', reply);
                          conversation.keepTurn(true);
                          conversation.transition();
                          done();
                        } else {
                          connection.end();
                          conversation.transition("codeEntryError");
                          done();
                        }
                      }
                    }
                  );
                }
              );
            }
          });
      } else {
        console.log(SystemType);
        connection.end();
        conversation
          .reply(
            "The code you entered is incorrect. Please enter the correct code"
          )
          .transition("codeEntryError");
        done();
      }
    });
  }
};
