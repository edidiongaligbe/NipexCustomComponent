/* eslint-disable */
const generator = require("random-number");
const mysql = require("promise-mysql");
const soap = require("soap");
let util = require("util");
let path = require("path");
const { VRSDB, JQSDB } = require('../db')

module.exports = {
  metadata: () => ({
    name: "PasswordRecovery",
    properties: {
      SupplierID: {
        required: true,
        type: "string"
      },
      SystemType: {
        required: true,
        type: "string"
      },
      QuestionnaireType: {
        required: false,
        type: "string"
      },
      iResult: {
        required: false
      }
    },
    supportedActions: [
      "WrongID",
      "PasswordRecoveryError",
      "WrongEmail",
      "goodBye"
    ]
  }),
  invoke: (conversation, done) => {
    const tableCreationQuery =
      "CREATE TABLE IF NOT EXISTS `password_recovery` ( `transID` INT NOT NULL AUTO_INCREMENT , `email` VARCHAR(255) NOT NULL , `SystemType` VARCHAR(255) NOT NULL , `code` INT(6) NOT NULL , `level` VARCHAR(255) NULL, `SupplierID` VARCHAR(255) NULL , PRIMARY KEY (`transID`)) ENGINE = MyISAM";
    // const tableCreationQuery = 'CREATE TABLE `password_recovery` ( `transID` INT NOT NULL AUTO_INCREMENT , `email` VARCHAR(255) NOT NULL , `SystemType` VARCHAR(255) NOT NULL , `code` INT(6) NOT NULL , `level` VARCHAR(255) NULL, `SupplierID` VARCHAR(255) NULL , PRIMARY KEY (`transID`)) ENGINE = MyISAM';

    const {
      SupplierID,
      SystemType,
      iResult,
      QuestionnaireType
    } = conversation.properties();

    // if (iResult.intentMatches.summary[0].intent == 'goodBye'){
    //   conversation.keepTurn(true).transition('goodBye');
    //   done();
    // }else{

    console.log("Supplier ID", SupplierID);
    console.log("SystemType", SystemType);
    if (SystemType == "NipeX Joint Qualification System") {
      console.log("NJQS", SystemType);
      let connection;
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
            `select * from sec_supp_users where login="${SupplierID}"`
          );
        })
        .then(row => {
          if (row.length != 0) {
            const { email, name } = row[0];

            connection
              .query(tableCreationQuery)
              .then(result => {
                const password = generator({
                  min: 1000,
                  max: 999999,
                  integer: true
                });
                connection
                  .query(
                    `DELETE FROM password_recovery WHERE email = "${email}"`
                  )
                  .then(result => {
                    console.log("delete event", result);
                    connection
                      .query(
                        `INSERT INTO password_recovery (transID, email, SystemType, code) VALUES (NULL, '${email}', '${SystemType}', '${password}')`
                      )
                      .then(result => {
                        connection.end();
                        // EmailService.email(
                        //   email,
                        //   password,
                        //   name,
                        //   "CodeGeneration"
                        // );
                        let reply = `${email}%${password}%${name}%CodeGeneration`;
                        conversation.variable('resultFromEmailRecovery', reply);
                        conversation.keepTurn(true);
                        conversation.transition();
                        done();
                      })
                      .catch(err => {
                        connection.end();
                        console.log(err);
                        conversation
                          .keepTurn(true)
                          .transition("PasswordRecoveryError");
                        done();
                      });
                  });
              })
              .catch(err => {
                connection.end();
                console.log(err);
                conversation.keepTurn(true).transition("PasswordRecoveryError");
                done();
              });
          } else {
            connection.end();
            conversation.keepTurn(true).transition("WrongID");
            done();
          }
        })
        .catch(err => {
          console.log(err);
          conversation.keepTurn(true).transition("PasswordRecoveryError");
          done();
          connection.end();
        });
    } else if (SystemType == "Supplier Registration") {
      console.log("VRS", SystemType);
      console.log("jjdjdddddddddddddddddddddddddddddddddddddddd");
      // 80.241.219.166
      // db db_nipex_dnb
      // user nipex_staging
      //  pass N1p2e3x4#
      // fldv_email_id
      // fldv_company_password

      let connection;
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
          if (QuestionnaireType == "Pre-Questionnaire") {
            let query = `select * from tbl_company_mst where fldv_email_id="${SupplierID}"`;
            console.log(query);
            return connection.query(query);
          } else {
            let query = `select * from tbl_vendor_mst where fldv_issue_ID="${SupplierID}"`;
            console.log(query);
            return connection.query(query);
          }
        })
        .then(row => {
          // console.log(row);
          if (row.length != 0) {
            if (QuestionnaireType == "Pre-Questionnaire") {
              const { fldv_email_id } = row[0];

              connection
                .query(tableCreationQuery)
                .then(result => {
                  const password = generator({
                    min: 1000,
                    max: 999999,
                    integer: true
                  });
                  connection
                    .query(
                      `DELETE FROM password_recovery WHERE email = "${fldv_email_id}"`
                    )
                    .then(result => {
                      connection
                        .query(
                          `INSERT INTO password_recovery (transID, email, SystemType, code, level) VALUES (NULL, '${fldv_email_id}', '${SystemType}', '${password}', '${QuestionnaireType}')`
                        )
                        .then(result => {
                          connection.end();
                          // EmailService.email(
                          //   fldv_email_id,
                          //   password,
                          //   "",
                          //   "CodeGeneration"
                          // );
                          let reply = `${fldv_email_id}%${password}%no_value%CodeGeneration`;
                          conversation.variable('resultFromEmailRecovery', reply);
                          conversation.keepTurn(true);
                          conversation.transition();
                          done();
                        })
                        .catch(err => {
                          console.log(err);
                          if (err.sqlMessage) {
                            conversation
                              .reply(err.sqlMessage)
                              .keepTurn(true)
                              .transition("PasswordRecoveryError");
                            if (connection) {
                              connection.end();
                            }
                            done();
                          } else {
                            conversation
                              .keepTurn(true)
                              .transition("PasswordRecoveryError");
                            if (connection) {
                              connection.end();
                            }
                            done();
                          }
                        });
                    });
                })
                .catch(err => {
                  if (err.sqlMessage) {
                    conversation
                      .reply(err.sqlMessage)
                      .keepTurn(true)
                      .transition("PasswordRecoveryError");
                    if (connection) {
                      connection.end();
                    }
                    done();
                  } else {
                    conversation
                      .keepTurn(true)
                      .transition("PasswordRecoveryError");
                    if (connection) {
                      connection.end();
                    }
                    done();
                  }
                });
            } else {
              console.log("jdjhdhdjdkdireurkrrhjfdhdfdudddj");
              const { fldv_email } = row[0];

              console.log(fldv_email);
              connection
                .query(tableCreationQuery)
                .then(result => {
                  const password = generator({
                    min: 1000,
                    max: 999999,
                    integer: true
                  });
                  connection
                    .query(
                      `DELETE FROM password_recovery WHERE email = "${fldv_email}"`
                    )
                    .then(result => {
                      connection
                        .query(
                          `INSERT INTO password_recovery (transID, email, SystemType, code, level) VALUES (NULL, '${fldv_email}', '${SystemType}', '${password}', '${QuestionnaireType}')`
                        )
                        .then(result => {
                          console.log("deejejejeeueueujjejeje");
                          // EmailService.email(
                          //   fldv_email,
                          //   password,
                          //   "",
                          //   "CodeGeneration"
                          // );
                          let reply = `${fldv_email}%${password}%no_value%CodeGeneration`;
                          conversation.variable('resultFromEmailRecovery', reply);
                          conversation.keepTurn(true);
                          conversation.transition();
                          if (connection) {
                            connection.end();
                          }
                          done();
                        })
                        .catch(err => {
                          console.log(err);
                          if (err.sqlMessage) {
                            conversation
                              .reply(err.sqlMessage)
                              .keepTurn(true)
                              .transition("PasswordRecoveryError");
                            if (connection) {
                              connection.end();
                            }
                            done();
                          } else {
                            conversation
                              .keepTurn(true)
                              .transition("PasswordRecoveryError");
                            if (connection) {
                              connection.end();
                            }
                            done();
                          }
                        });
                    });
                })
                .catch(err => {
                  console.log("hdfhdhdhdhd", err);
                  if (err.sqlMessage) {
                    conversation
                      .reply(err.sqlMessage)
                      .keepTurn(true)
                      .transition("PasswordRecoveryError");
                    if (connection) {
                      connection.end();
                    }
                    done();
                  } else {
                    conversation
                      .keepTurn(true)
                      .transition("PasswordRecoveryError");
                    if (connection) {
                      connection.end();
                    }
                    done();
                  }
                });
            }
          } else {
            if (connection) connection.end();
            console.log(QuestionnaireType);
            if (QuestionnaireType == "Pre-Questionnaire") {
              console.log("jdjdjdjdjdhdhdhdjdjdjdhdhdhd");
              conversation.keepTurn(true).transition("WrongEmail");
              done();
            } else {
              conversation.keepTurn(true).transition("WrongID");
              done();
            }
          }
        })
        .catch(err => {
          console.log(err);
          console.log(Object.keys(err));
          if (err.sqlMessage) {
            conversation
              .reply(err.sqlMessage)
              .keepTurn(true)
              .transition("PasswordRecoveryError");
            if (connection) {
              connection.end();
            }
            done();
          } else {
            conversation.keepTurn(true).transition("PasswordRecoveryError");
            if (connection) {
              connection.end();
            }
            done();
          }
        });
    } else if (SystemType == "SAP e-Markets") {
      console.log("In Sap emarkets", SystemType);
      let users = {
        NIPEXBID11: "afreeman@softalliance.com",

        NIPEXBID12: "everistus@redpagesconsulting.com",

        NIPEXBID13: "oogunniran@softalliance.com",

        NIPEXBID14: "vamaechi@softalliance.com"
      };

      let connection;
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

          try {
            http://nepsap.nipexng.com:8200/sap/bc/srt/rfc/sap/zpassword_reset_ws/500/zbinding1/zbinding1
            // var url ="http://trn.nipex-ng.com:8080/sap/bc/srt/wsdl/bndg_5C7D64A46D811CE9E1000000C0A8010D/wsdl11/allinone/ws_policy/document?sap-client=310";
            var auth =
              "Basic " +
              new Buffer("bot_user" + ":" + "Robot@123").toString("base64");
            let url = path.join(__dirname, "..", "Prod_Email_Req.WSDL");
            console.log("urrrrllrlrl", url);
            soap.createClient(
              url,
              {
                wsdl_headers: {
                  Authorization: auth
                },
                endpoint: "http://nepsap.nipexng.com:8200/sap/bc/srt/rfc/sap/zrequest_supplier_email_ws/500/zbot_request_email/zbinding1"
                // "http://trn.nipex-ng.com:8080/sap/bc/srt/rfc/sap/zrequest_supplier_email_ws/310/zrequest_supp_email/zbinding1"
                //   "http://trn.nipex-ng.com:8080/sap/bc/srt/rfc/sap/zpassword_reset_ws/310/zbinding1/zbinding1"
              },
              function (err, client) {
                console.log(err);
                client.setSecurity(
                  new soap.BasicAuthSecurity("bot_user", "Robot@123")
                );

                console.log(
                  util.inspect(client.describe(), {
                    depth: 200
                  })
                );

                client.ZBOT_REQUEST_EMAIL.ZBINDING1.ZrequestSupplierEmailWs(
                  {
                    ImUser: SupplierID
                  },
                  function (err, result, rawResponse, soapHeader, rawRequest) {
                    console.log(
                      util.inspect(result, {
                        depth: 20
                      })
                    );

                    if (err) {
                      console.log(err);
                      connection.end();
                      conversation.transition("PasswordRecoveryError");
                      done();
                    } else {
                      if (
                        result.ExStatus == "Success" ||
                        result.ExStatus == "success"
                      ) {
                        let email = result.ExEmail;
                        console.log(email);
                        connection
                          .query(tableCreationQuery)
                          .then(result => {
                            const password = generator({
                              min: 1000,
                              max: 999999,
                              integer: true
                            });
                            connection
                              .query(
                                `DELETE FROM password_recovery WHERE email = "${email}"`
                              )
                              .then(result => {
                                console.log("delete event", result);
                                let query = `INSERT INTO password_recovery (transID, email, SystemType, code, SupplierID) VALUES (NULL, '${email}', '${SystemType}', '${password}', '${SupplierID}')`;
                                console.log(query);
                                connection
                                  .query(query)
                                  .then(result => {
                                    connection.end();
                                    // EmailService.email(
                                    //   email,
                                    //   password,
                                    //   "",
                                    //   "CodeGeneration"
                                    // );
                                    let reply = `${email}%${password}%no_value%CodeGeneration`;
                                    conversation.variable('resultFromEmailRecovery', reply);
                                    conversation.keepTurn(true);
                                    conversation.transition();
                                    done();
                                  })
                                  .catch(err => {
                                    connection.end();
                                    console.log(err);
                                    conversation
                                      .keepTurn(true)
                                      .transition("PasswordRecoveryError");
                                    done();
                                  });
                              });
                          })
                          .catch(err => {
                            connection.end();
                            console.log(err);
                            conversation
                              .keepTurn(true)
                              .transition("PasswordRecoveryError");
                            done();
                          });
                      } else {
                        connection.end();
                        conversation.transition("PasswordRecoveryError");
                        done();
                      }
                    }
                  }
                );
              }
            );
          } catch (err) {
            console.log(err);
            connection.end();
            conversation.transition("PasswordRecoveryError");
            done();
          }
          // let email = user[SupplierID];
        });
    }
  }
};
