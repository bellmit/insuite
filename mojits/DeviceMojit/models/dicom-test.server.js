/*
 @user: jm
 @date: 2015-07-28
 */

/**
 * test run for dicom client
 */

/*global YUI */



YUI.add( 'dicom-test', function( Y, NAME ) {
        Y.namespace( 'doccirrus.api.dicom' ).test = {

            /**
             * starts the test run.
             * @method run
             */
            run: function() {

                Y.log("starting dicom-test...", "log", NAME);

                var net = require('net');
                var util = require('util');

                var host = "192.168.253.230";
                var port = 4242;

                var server_port = 6969;

                var playProxy = false;

                var clog = function(msg) {
                    Y.log(msg, "log", NAME);
                };

                var bop   = Y.doccirrus.api.bop;
                var tools = Y.doccirrus.api.dicom.tools;
                var dmsgb  = Y.doccirrus.api.dicom.messageBuilder;
                var dmsgr  = Y.doccirrus.api.dicom.messageReader;


//---------------------------------------------------------------------------------------------
                if (!playProxy) {
                    var client = new net.Socket();

                    client.stm = new tools.StateMachine("this machine", true);
                    client.pstm = new tools.StateMachine("partner machine");
                    client.stm.event("SEND_CONNECTION_REQUEST");
                    client.connect(port, host, function() {
                        client.pstm.event("RECV_CONNECTION_INDICATION");
                        client.stm.event("RECV_CONNECTION_CONFIRM");
                        clog("CONNECTED TO "+host+":"+port);
                        clog(util.inspect(arguments));
                        associate(this);
                    });

                    client.on("data", function(data) {
                        //clog("data: "+util.inspect(arguments));

                        clog("server data:");
                        clog(bop.buff2hex(data));
                        clog(bop.buff2char(data));

                        var dicomdata = dmsgr.inputHandler(arguments[0], client);
                        tools.minimizeObj(dicomdata);
                        clog("data:\n"+util.inspect(dicomdata, {depth: 10, colors: true}));

                        if ("A_ASSOCIATE_AC" === dicomdata.type) {
                            send_data(this);
                        }
                    });

                    client.on("end", function() {
                        clog("end: "+util.inspect(arguments, {colors: true}));
                    });

                    client.on("timeout", function() {
                        clog("timeout: "+util.inspect(arguments, {colors: true}));
                    });

                    client.on("close", function() {
                        clog("server close: "+util.inspect(arguments, {colors: true}));
                    });

                    client.on("drain", function() {
                        clog("drain: "+util.inspect(arguments, {colors: true}));
                    });

                    client.on("error", function() {
                        clog("error: "+util.inspect(arguments, {colors: true}));
                    });

                    net.createServer(function(sock) {
                        clog('CLIENT CONNECTED FROM: ' + sock.remoteAddress +':'+ sock.remotePort);
                        sock.on('data', function(data) {
                            var sent = dmsgr.inputHandler(data);
                            clog("json:\n"+util.inspect(sent, {depth: 10, colors: true}));
                        });
                        sock.on('close', function() {
                            clog("client close: "+util.inspect(arguments, {colors: true}));
                        });
                    }).listen(server_port);
                    clog('Server listening on: '+ server_port);

                }
//----------------------------------------------------------------------------------------------
                else {
                    //this just routes everything from an incoming dicom client to an existing dicom server and logs everything
                    net.createServer(function(sock) {
                        clog('CONNECTED: ' + sock.remoteAddress +':'+ sock.remotePort);
                        var client = new net.Socket();
                        client.connect(port, host, function() { clog("connected to "+host+":"+port); });
                        client.on("data", function(data) {
                            clog("\n-------- SERVER DATA\n");
                            var sent = dmsgr.inputHandler(data);
                            tools.minimizeObj(sent);
                            clog("json:\n"+util.inspect(sent, {depth: 10, colors: true}));
                            sock.write(data);
                        });
                        client.on("end", function() { clog("server end: "+util.inspect(arguments, {colors: true})); });
                        client.on("timeout", function() { clog("server timeout: "+util.inspect(arguments, {colors: true})); });
                        client.on("close", function() {
                            clog("server close: "+util.inspect(arguments, {colors: true}));
                            sock.destroy();
                        });
                        client.on("drain", function() { clog("server drain: "+util.inspect(arguments, {colors: true})); });
                        client.on("error", function() { clog("server error: "+util.inspect(arguments, {colors: true})); });
                        sock.on('data', function(data) {
                            clog("\n-------- CLIENT DATA\n");
                            var sent = dmsgr.inputHandler(data);
                            tools.minimizeObj(sent);
                            clog("json:\n"+util.inspect(sent, {depth: 10, colors: true}));
                            client.write(data);
                        });
                        sock.on('close', function() {
                            clog("client close: "+util.inspect(arguments, {colors: true}));
                            client.destroy();
                        });
                    }).listen(server_port);
                    clog('Server listening on: '+ server_port);
                }




// 04 00 00 00 00 5e 00 00 00 5a 01 03 00 00 00 00 04 00 00 00 4c 00 00 00 00 00 02 00 1c 00 00 00 31 2e 32 2e 38 34 30 2e 31 30 30 30 38 2e 35 2e 31 2e 34 2e 31 2e 32 2e 32 2e 31 00 00 00 00 01 02 00 00 00 20 00 00 00 10 01 02 00 00 00 03 00 00 00 00 07 02 00 00 00 00 00 00 00 00 08 02 00 00 00 02 01
// EOTNULNULNULNUL ^ NULNULNUL Z SOHETXNULNULNULNULEOTNULNULNUL L NULNULNULNULNULSTXNULFS NULNULNUL 1  .  2  .  8  4  0  .  1  0  0  0  8  .  5  .  1  .  4  .  1  .  2  .  2  .  1 NULNULNULNULSOHSTXNULNULNUL   NULNULNULDLESOHSTXNULNULNULETXNULNULNULNULBELSTXNULNULNULNULNULNULNULNULBS STXNULNULNULSTXSOH


// 04 00 00 00 00 98 00 00 00 94 01 02 08 00 00 00 04 00 00 00 2e 00 00 00 08 00 20 00 00 00 00 00 08 00 30 00 00 00 00 00 08 00 50 00 00 00 00 00 08 00 52 00 06 00 00 00 53 54 55 44 59 20 08 00 30 10 00 00 00 00 10 00 00 00 04 00 00 00 20 00 00 00 10 00 10 00 00 00 00 00 10 00 20 00 00 00 00 00 10 00 30 00 00 00 00 00 10 00 40 00 00 00 00 00 20 00 00 00 04 00 00 00 20 00 00 00 20 00 0d 00 00 00 00 00 20 00 10 00 00 00 00 00 20 00 06 12 00 00 00 00 20 00 08 12 00 00 00 00
// EOTNULNULNULNUL ÿ NULNULNUL ö SOHSTXBS NULNULNULEOTNULNULNUL . NULNULNULBS NUL   NULNULNULNULNULBS NUL 0 NULNULNULNULNULBS NUL P NULNULNULNULNULBS NUL R NULACKNULNULNUL S  T  U  D  Y    BS NUL 0 DLENULNULNULNULDLENULNULNULEOTNULNULNUL   NULNULNULDLENULDLENULNULNULNULNULDLENUL   NULNULNULNULNULDLENUL 0 NULNULNULNULNULDLENUL @ NULNULNULNULNUL   NULNULNULEOTNULNULNUL   NULNULNUL   NULCR NULNULNULNULNUL   NULDLENULNULNULNULNUL   NULACKDC2NULNULNULNUL   NULBS DC2NULNULNULNUL








//----------------------------------------------------------------------------------------------

                function associate(client) {

                    var A_ASSOCIATE_RQ = new Buffer(dmsgb.A_ASSOCIATE_RQ({
                        from: "DOCCIRRUS",
                        to: "ORTHANC",
                        ac_name: tools.defaults.application_context_name,
                        presentation_contexts: [
                            {
                                contextId: 0x40,
                                class: tools.serviceClasses.verification,
                                syntax: [tools.transferSyntax.implicitVRLittleEndian]
                            },
                            {
                                contextId: 0x41,
                                class: tools.serviceClasses.patientRoot_FIND,
                                syntax: [tools.transferSyntax.implicitVRLittleEndian]
                            },
                            {
                                contextId: 0x42,
                                class: tools.serviceClasses.patientRoot_GET,
                                syntax: [tools.transferSyntax.implicitVRLittleEndian]
                            },
                            {
                                contextId: 0x43,
                                class: tools.serviceClasses.patientRoot_MOVE,
                                syntax: [tools.transferSyntax.implicitVRLittleEndian]
                            },
                            {
                                contextId: 0x01,
                                class: tools.serviceClasses.studyRoot_FIND,
                                syntax: [tools.transferSyntax.explicitVRBigEndian]
                            }
                        ]
                    }));

                    clog("bytes: "+A_ASSOCIATE_RQ.length);

                    client.write(A_ASSOCIATE_RQ);

                    var sent = dmsgr.inputHandler(A_ASSOCIATE_RQ);
                    tools.minimizeObj(sent);
                    clog("sent:\n"+util.inspect(sent, {depth: 10, colors: true}));
                }

                function send_data(client) {
                    var P_DATA_TF = new Buffer(dmsgb.P_DATA_TF({
                        presentation_data: [
                            {
                                contextId: 0x01,
                                command: true,
                                last: true,
                                messages: [
                                    //{type: tools.commands.CommandGroupLength, value: tools.longToByteArrayB(36+10+10+10+10).slice(4,8)},
                                    {type: tools.commands.AffectedSOPClassUID, value: tools.serviceClasses.patientRoot_FIND},
                                    {type: tools.commands.CommandField, value: tools.commandFIeldTags.C_FIND_RQ},
                                    {type: tools.commands.MessageID, value: [0x03,0x00]},
                                    {type: tools.commands.Priority, value: tools.priority.MEDIUM},
                                    {type: tools.commands.CommandDataSetType, value: tools.dataSetPresent.TRUE}
                                ]
                            }
                        ]
                    }));

                    client.write(P_DATA_TF);
                    //client.write(bop.hex2buff(
                    //    "04 00 00 00 00 5e " +
                    //    "00 00 00 5a 01 03 " +
                    //    "00 00 00 00 04 00 00 00 4c 00 00 00 " +
                    //    "00 00 02 00 1c 00 00 00 31 2e 32 2e 38 34 30 2e 31 30 30 30 38 2e 35 2e 31 2e 34 2e 31 2e 32 2e 32 2e 31 00 " + 
                    //    "00 00 00 01 02 00 00 00 20 00 " +
                    //    "00 00 10 01 02 00 00 00 03 00 " +
                    //    "00 00 00 07 02 00 00 00 00 00 " +
                    //    "00 00 00 08 02 00 00 00 02 01"
                    //));

                    var sent = dmsgr.inputHandler(P_DATA_TF);
                    tools.minimizeObj(sent);
                    clog("sent:\n"+util.inspect(sent, {depth: 10, colors: true}));
                }
                
            }
        };

    },
    '0.0.1', {requires: []}
);
