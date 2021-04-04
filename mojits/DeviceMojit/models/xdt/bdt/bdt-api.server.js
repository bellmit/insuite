/*
 @user: jm
 @date: 2015-08-11
 */

/*global YUI  */



YUI.add('bdt-api', function (Y, NAME) {
        var BdtApi = {};
        var moment = require( 'moment' ),
            util = require( 'util' );
        
        var encodingUsed = "ISO 8859-15";

        function getPatientId(patient, showOriginalId) {
            if(showOriginalId) {
                if(!isNaN(patient.patientNo) && parseInt(patient.patientNo, 10) === patient.patientNumber) {
                    return patient.patientNumber.toString();
                } else if(!isNaN(patient.patientNo)) {
                    return `${parseInt(patient.patientNo, 10)}`;
                } else {
                    return patient.patientNo.replace(/^[0]{0,5}/, ""); //basically convert 000abc => abc
                }
            } else {
                return patient.patientNo;
            }
        }

        BdtApi.convertPatientToBDT = function( config, cb ){

            var
                data = config.input,
                bdt = Y.doccirrus.api.xdtVersions.bdt.bdt10,
                patient = data.patient,
                location = data.location,
                employee = data.employee,
                showOriginalId = config.transformer && config.transformer.showOriginalId,
                testdataBytes,
                tail;
            
            if (!patient) {
                return cb(Y.doccirrus.errors.rest(19101));
            }
            if (!employee) {
                return cb(Y.doccirrus.errors.rest(19102));
            }
            if (!location) {
                return cb(Y.doccirrus.errors.rest(19103));
            }
            
            try {
                testdataBytes = Buffer.concat([
                    BdtApi.generateDataHeader({
                        bdt: bdt,
                        senderDocId: employee.officialNo,
                        datapackageOrderNo: "1"
                    }),
                    BdtApi.generatePackageHeader({
                        bdt: bdt,
                        archiveKind: "2",
                        storageBegin: new Date(),
                        storageEnd: new Date()
                    }),
                    BdtApi.generatePracticeData({
                        bdt: bdt,
                        doc: employee,
                        location: location,
                        practiceType: "1",
                        docAmount: "1"
                    }),
                    BdtApi.generatePatientData({
                        bdt: bdt,
                        patient: patient,
                        patientId: getPatientId(patient, showOriginalId)
                    })
                ]);

                tail = BdtApi.generateDataFooter({
                    bdt: bdt
                });

                testdataBytes = Buffer.concat([
                    testdataBytes,
                    BdtApi.generatePackageFooter({
                        bdt: bdt,
                        len: testdataBytes.length + tail.length
                    }),
                    tail
                ]);

                cb(null, testdataBytes);
            } catch (e) {
                cb(Y.doccirrus.errors.rest(19100));
            }
        };

        BdtApi.test = function(args){
            
            var bdt = Y.doccirrus.api.xdtVersions.bdt.bdt10;
            
            var testdataBytes = Buffer.concat([
                BdtApi.generateDataHeader({
                    bdt: bdt,
                    senderDocId: "123456789",
                    datapackageOrderNo: "1"
                }),
                BdtApi.generatePackageHeader({
                    bdt: bdt,
                    archiveKind: "2",
                    storageBegin: moment("2015-07-03", "YYYY-MM-DD").toDate(),
                    storageEnd: moment("2015-07-06", "YYYY-MM-DD").toDate()
                }),
                BdtApi.generatePracticeData({
                    bdt: bdt,
                    doc: {
                        officialNo: "123456789",
                        firstname: "asd",
                        lastname: "qwe"
                    },
                    location: {
                        street: "ZXCstreet",
                        houseno: "15",
                        zip: "12345",
                        city: "Berlin",
                        phone: "03051751751"
                    },
                    practiceType: "1",
                    docAmount: "1"
                }),
                BdtApi.generatePatientData({
                    bdt: bdt,
                    patient: {
                        addresses: [],
                        lastname: "testln",
                        firstname: "asdqwe",
                        dob: new Date(),
                        insuranceStatus: []
                    },
                    patientId: "1234567890"
                })
            ]);
            
            var tail = BdtApi.generateDataFooter({
                bdt: bdt
            });
            
            testdataBytes = Buffer.concat([
                testdataBytes,
                BdtApi.generatePackageFooter({
                    bdt: bdt,
                    len: testdataBytes.length+tail.length
                }),
                tail
            ]);
            
            Y.doccirrus.api.xdtParser.parse({
                data: testdataBytes,
                xdt: "bdt",
                callback: function(err,res) {
                    if (err) {Y.log("err: "+err, 'warn');}
                    if (res) {
                        dbg("res ok.\n"+util.inspect(res, {colors: true}));
                        Y.doccirrus.api.xdtTools.prettyPrint(res);
                    }
                }
            });

            args.callback("ok");

            //var _id = "5458db49d38560c928041bb7";
            
            //Y.doccirrus.mongodb.runDb({
            //    user: args.user,
            //    model: "patient",
            //    action: "get",
            //    query: {
            //        _id: _id
            //    },
            //    callback: function (err, res) {
            //        if (err) {
            //            console.log(err);
            //            args.callback(null, err);
            //        }
            //        if (res.length > 0) {
            //            console.log(util.inspect(res[0]));
            //
            //            console.log("test result:");
            //            var ret = BdtApi.generateStudyDataViewRequest({
            //                sender: "WHATEVS",
            //                receiver: "inSuite",
            //                patientId: res[0].patientNo,
            //                patient: res[0],
            //                treatmentDate: new Date(),
            //                collDate: new Date()
            //            });
            //            if (ret) {
            //                console.log(bop.buff2char(ret, encodingUsed));
            //                Y.doccirrus.api.xdtParser.parse({
            //                    data: ret,
            //                    xdt: "bdt",
            //                    callback: function (err, res) {
            //                        if (err) {
            //                            Y.log("err: " + err, 'warn');
            //                        }
            //                        if (res) {
            //                            console.log("TEST RES::\n" + util.inspect(res));
            //                            Y.doccirrus.api.xdtTools.prettyPrint(res);
            //                        }
            //                    }
            //                });
            //                args.callback(null, {data: bop.buff2char(ret, encodingUsed)});
            //            }
            //            else {
            //                console.log("error");
            //                args.callback("error");
            //            }
            //        } else {
            //            console.log("no such entry");
            //            args.callback("no such entry");
            //        }
            //    }
            //});
        };
            
        /**
         * generator for "Neue Untersuchung anfordern" (6302)
         * requests a new study to be made/potentially sent
         * @method generateStudyDataRequest
         * @param {Object} args
         * @param {Object} args.bdt BDT version to use
         * @param {String} args.senderDocId lanr/etc. len: 7-9?
         * @param {String} [args.datapackageOrderNo] lanr/etc. len: 7-9?
         * @param {Function} [cb]
         *
         * @return {Function}
         */
        BdtApi.generateDataHeader = function(args, cb) {
            var tools = Y.doccirrus.api.xdtTools;
            
            //pad defaults to space/" ", padStart to false
            return tools.metaRecordBuilder(
                "dataHeader", // 0020
                [
                    {key: "senderDocId", val: args.senderDocId}, // 9100
                    {key: "dateOfCreation", val: new Date()}, // 9103
                    {key: "datapackageOrderNo", val: args.datapackageOrderNo || "1", padStart: true, pad: "0"}, // 9105
                    {key: "encoding", val: tools.getEncodingId(encodingUsed, args.bdt)} // 9106
                ],
                args.bdt,
                encodingUsed,
                false,
                cb
            );
        };
    
        /**
         * generator for "Neue Untersuchung anfordern" (6302)
         * requests a new study to be made/potentially sent
         * @method generateStudyDataRequest
         * @param {Object} args
         * @param {Object} args.bdt BDT version to use
         * @param {Function} [cb]
         *
         * @return {Function}
         */
        BdtApi.generateDataFooter = function(args, cb) {
            var tools = Y.doccirrus.api.xdtTools;
            
            // 0021
            return tools.metaRecordBuilder("dataFooter", [], args.bdt, encodingUsed, false, cb);
        };
        
        /**
         * @method generatePackageHeader
         * @param {Object} args
         * @param {Object} args.bdt BDT version to use
         * @param {String} args.archiveKind
         * @param {Date} args.storageBegin
         * @param {Date} args.storageEnd
         * @param {Function} [cb]
         *
         * @return {Function}
         */
        BdtApi.generatePackageHeader = function(args, cb) {
            var bdt = args.bdt;

            return Y.doccirrus.api.xdtTools.metaRecordBuilder (
                "packageHeader", // 0022
                [
                    {key: "adtVersion", val: bdt.adtVersion}, // 9210
                    {key: "bdtVersion", val: bdt.version}, // 9213
                    {key: "archiveKind", val: args.archiveKind}, // 9600
                    {key: "storageTimespan", val: [args.storageBegin, args.storageEnd]}, // 9601
                    {key: "transmissionBegin", val: new Date()} // 9602
                ],
                bdt,
                encodingUsed,
                false,
                cb
            );
        };

        /**
         * @method generatePackageFooter
         * @param {Object} args
         * @param {Object} args.bdt BDT version to use
         * @param {String} args.len length of all other records
         * @param {String} [args.totalVolumes] number of volumes in this set
         * @param {Function} [cb]
         *
         * @return {Function}
         */
        BdtApi.generatePackageFooter = function(args, cb) {
            var bdt = args.bdt;
            var len = args.len;
            
            //precalculate required lengths for all containing fields
            len += bdt.sizeLen + bdt.sizeFk + bdt.sizeSatz + 2; //8000
            len += bdt.sizeLen + bdt.sizeFk + bdt.sizeRecLen + 2; //8100
            len += bdt.sizeLen + bdt.sizeFk + bdt.sizefileLen + 2; //9202
            len += bdt.sizeLen + bdt.sizeFk + bdt.noVolLen + 2; //9203

            return Y.doccirrus.api.xdtTools.metaRecordBuilder (
                "packageFooter", // 0023
                [
                    {key: "datapackageSize", val: len, padStart: true, pad: "0"}, //9202
                    {key: "datapackageVolumeAmount", val: args.totalVolumes || "1", padStart: true, pad: "0"} //9203
                ],
                bdt,
                encodingUsed,
                false,
                cb
            );
        };

        /**
         * @method generatePracticeData
         * @param {Object} args
         * @param {Object} args.bdt BDT version to use
         * @param {Object} args.doc Employee object
         * @param {Object} args.location Location object
         * @param {Object} args.practiceType
         * @param {Object} args.docAmount
         * @param {Function} [cb]
         *
         * @return {Function}
         */
        BdtApi.generatePracticeData = function(args, cb) {
            var bdt = args.bdt,
                pkg = Y.config.insuite,
                loc = args.location,
                ret = [];
            
            ret.push(
                {key: "kbvValidationNo", val: pkg.kbv.kvdtCertNumber}, // 0101
                {key: "sv",              val: pkg.author.name, optional: true}, // 0102
                {key: "sw",              val: pkg.description, optional: true}, // 0103
                {key: "hw",              val: "Doc Cirrus Datensafe"}, // 0104
                {key: "docID",           val: args.doc.officialNo}, // 0201
                {key: "practiceType",    val: args.practiceType}, // 0202 TODO
                {key: "docName",         val: args.doc.firstname + " " + args.doc.lastname}, // 0203 *
                {key: "docGroup",        val: "unbekannt"}, // 0204 TODO
                {key: "practiceStreet",  val: loc.street + " " + loc.houseno}, // 0205
                {key: "practiceZipCity", val: loc.zip+" "+loc.city} // 0206
            );

            if ("3" === args.practiceType) {
                ret.push(
                    {key: "docWithPerf", val: args.doc.firstname+" "+args.doc.lastname+": 0"} // 0207 * TODO
                );
            }
            
            ret.push(
                {key: "practicePhone", val: loc.phone}, // 0208
                {key: "practiceFax",   val: loc.fax, optional: true} // 0209
                //{key: "practiceModem",   val: ""}, // 0210
            );

            if ("2" === args.practiceType || "3" === args.practiceType) {
                ret.push(
                    {key: "docAmount", val: args.docAmount} // 0225
                );
            }
            
            //todo: free category
            
            return Y.doccirrus.api.xdtTools.metaRecordBuilder (
                "practiceData", // 0010
                ret,
                bdt,
                encodingUsed,
                false,
                cb
            );
        };

        /**
         * @method generatePatientData
         * @param {Object} args
         * @param {Object} args.bdt BDT version to use
         * @param {Object} args.patient Patient object
         * @param {Object} [args.insured] Patient to use as primary insurance holder
         * @param {String} args.patientId
         * @param {String} [args.xrayNo]
         * @param {String} [args.archiveNo]
         * @param {Function} [cb]
         *
         * @return {Function}
         */
        BdtApi.generatePatientData = function(args, cb) {
            var bdt = args.bdt,
                pat = args.patient,
                ret = [],
                ins,
                patLoc = Y.doccirrus.schemas.patient.getAddressByKind(pat, "OFFICIAL"),
                tel = Y.doccirrus.schemas.patient.getCommunicationByType(pat, "PHONEJOB");

            if (args.insured) {
                ins = Y.doccirrus.schemas.patient.getInsuranceByType(args.insured, "PUBLIC");
            } else {
                ins = Y.doccirrus.schemas.patient.getInsuranceByType(pat, "PUBLIC");
            }
            
            var genderMap = {
                "MALE": "1",
                "FEMALE": "2"
            };
            
            ret.push(
                {key: "patientId",       val: args.patientId}, // 3000
                {key: "patientNameAdd",  val: pat.nameaffix, optional: true}, // 3100
                {key: "patientName",     val: pat.lastname}, // 3101
                {key: "patientForename", val: pat.firstname}, // 3102
                {key: "patientDob",      val: pat.dob}, // 3103
                {key: "patientTitle",    val: pat.title, optional: true}, // 3104
                {key: "patientInsNo",    val: ins && (ins.kvkHistoricalNo || ins.insuranceNo || "0"), optional: true} // 3105
            );

            if (patLoc) {
                ret.push(
                    {key: "patientCity",     val: patLoc.city}, // 3106
                    {key: "patientStreet",   val: patLoc.street + " " + patLoc.houseno} // 3107
                );
            }

            ret.push(
                {key: "insuranceKind",   val: ins && ins.insuranceKind, optional: true}, // 3108
                {key: "patientGender",   val: genderMap[pat.gender] || "1"} // 3110
            );

            let
                primIns,
                primPatLoc;
            
            if (args.insured) {
                //case for different insurance carrier
                primIns = Y.doccirrus.schemas.patient.getInsuranceByType(pat, "PUBLIC");
                primPatLoc = Y.doccirrus.schemas.patient.getAddressByKind(pat, "OFFICIAL");
                
                ret.push(
                    {key: "insuredPrimName",     val: primIns.lastname}, // 3201
                    {key: "insuredPrimForename", val: primIns.firstname}, // 3202
                    {key: "insuredPrimDob",      val: primIns.dob}, // 3203
                    {key: "insuredPrimCity",     val: primPatLoc.city}, // 3204
                    {key: "insuredPrimStreet",   val: primPatLoc.street + " " + primPatLoc.houseno}, // 3205
                    {key: "insuredPrimGender",   val: genderMap[primIns.gender] || "1"} // 3210
                );
            }

            ret.push(
                {key: "xrayNo",    val: args.xrayNo, optional: true}, // 3601
                {key: "archiveNo", val: args.archiveNo, optional: true} // 3602
                //{key: "bgNo",                  val: ""}, // 3603
                //{key: "patientSince",          val: ""}, // 3610
                //{key: "patientInsuranceStart", val: ""}, // 3612
                //{key: "patientJob",            val: ""}, // 3620
                //{key: "patientEmployer",       val: ""}, // 3625
            );
            
            if (tel) {
                ret.push(
                    {key: "patientPhone", val: tel.value} // 3626
                );
            }
            
            //ret.push(
                //{key: "patientNationality",      val: ""}, // 3627
                //{key: "patientNativelang",       val: ""}, // 3628
                //{key: "patientDocId",            val: ""}, // 3630
                //{key: "patientDistancePractice", val: ""}, // 3631
                //{key: "internalDocAlloc",        val: ""}, // 3635
                //{key: "receiptId",               val: ""}, // 3637
                //{key: "patientconDiagFrom",      val: ""}, // 3649
                //{key: "patientconDiagList",      val: ""}, // 3650
                //{key: "patientconMedFrom",       val: ""}, // 3651
                //{key: "patientconMedList",       val: ""}, // 3652
                //{key: "patientRiskFactors",      val: ""}, // 3654
                //{key: "patientAllergies",        val: ""}, // 3656
                //{key: "patientAccidents",        val: ""}, // 3658
                //{key: "patientSurgeries",        val: ""}, // 3660
                //{key: "anamnesis",               val: ""}, // 3662
                //{key: "patientNoOfChildbirths",  val: ""}, // 3664
                //{key: "patientNoOfChildren",     val: ""}, // 3666
                //{key: "patientNoOfPregnancies",  val: ""}, // 3668
                //{key: "conTherapyList",          val: ""}, // 3670
                //{key: "controlAppointment",      val: ""}, // 3672
                //{key: "insuranceVKNR",           val: ""}, // 4104
                //{key: "insuranceNo",             val: ""}, // 4111
                //{key: "insuredStatusFromCard",   val: ""}, // 4112
                //{key: "insuredEWStatusFromCard", val: ""} // 4113
            //);

            return Y.doccirrus.api.xdtTools.metaRecordBuilder (
                "patientData", // 6100
                ret,
                bdt,
                encodingUsed,
                false,
                cb
            );
        };

        function dbg(msg) {Y.log("\x1b[90mbdt-api debug: "+msg+"\x1b[0m", "debug", NAME);}

        Y.namespace( 'doccirrus.api' ).bdt = BdtApi;

    },
    '0.0.1', {
        requires: [
            'inport-schema',
            'bdt_v_10',
            'bdt_v_30'
        ]
    }
);
