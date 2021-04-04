/*
 * @author: jm
 * @date: 2015-07-15
 */

/*jshint esnext:true */

/**
 * Library for lab-related actions
 */

/*global YUI */



YUI.add( 'ldt-api', function( Y, NAME ) {
        // Y.log( "message", "level", NAME );

        /**
         * creates and handles labdata objects
         * @class LdtApi
         */
        let LdtApi = {};
        LdtApi.name = NAME;

        const
            moment = require( 'moment' ),
            encodingUsed = "ISO 8859-1",
            {formatPromiseResult} = require( 'dc-core' ).utils,
            tools = Y.doccirrus.api.xdtTools,
            crypto = require( 'crypto' ),
            diagnosisCerntaintyTranslationMap = {
                'CONFIRM': 'G',
                'TENTATIVE': 'V',
                'ASYMPTOMATIC': 'Z',
                'EXCLUDE': 'A'
            },
            diagnosisLocalisationTranslationMap = {
                'LEFT': 'L',
                'RIGHT': 'R',
                'BOTH': 'B'
            };

        function getFeeScheduleFromInsuranceType( insuranceType ) {
            // 0: EBM - LDT3 only, currently not in use
            // 1: BMÄ - public
            // 2: EGO - public, currently not in use
            // 3: GOÄ 96 - private & selfpayer
            // 4: BG-Tarif - bg
            // 5: GOÄ 88 - LDT2 only, currently not in use

            const feeSchedule = {
                'PUBLIC': '1',
                'PRIVATE': '3',
                'PUBLIC_A': '1',
                'PRIVATE_A': '3',
                'PRIVATE_CH': undefined,
                'PRIVATE_CH_IVG': undefined,
                'PRIVATE_CH_UVG': undefined,
                'PRIVATE_CH_MVG': undefined,
                'PRIVATE_CH_VVG': undefined,
                'SELFPAYER': '3',
                'BG': '4'
            };
            return feeSchedule[insuranceType];
        }

        function getBillingTypeFromInsuranceType( insuranceType ) {
            const billingType = {
                'PUBLIC': 'K',
                'PRIVATE': 'P',
                'PUBLIC_A': 'K',
                'PRIVATE_A': 'P',
                'PRIVATE_CH': undefined,
                'PRIVATE_CH_IVG': undefined,
                'PRIVATE_CH_UVG': undefined,
                'PRIVATE_CH_MVG': undefined,
                'PRIVATE_CH_VVG': undefined,
                'SELFPAYER': 'X',
                'BG': 'X'
            };
            return billingType[insuranceType];
        }

        /**
         * @method generateLabFAOrder
         * @param {Object} args
         * @param {Object} args.ldt LDT version to use
         * @param {module:patientSchema.patient} args.patient
         * @param {module:employeeSchema.employee} args.employee
         * @param {module:locationSchema.location} args.location
         * @param {module:locationSchema.location} [args.customLocation]
         * @param {module:employeeSchema.employee} [args.customEmployee]
         * @param {module:patientSchema.insuranceStatusObj} [args.insurance]
         * @param {String} [args.recordRequestId]
         * @param {module:v_userSchema.v_user} args.user
         * @param {Function} cb
         */
        LdtApi.generateLabFAOrder = function generateLabFAOrder( args, cb ) {
            args.labName = "";
            args.dcCustomerNo = "000";
            args.recordRequestId = args.recordRequestId || Y.doccirrus.utils.generateLabRequestId();
            args.billingDoneBy = "lab";
            args.currentDate = moment();

            let scheinArgs = {
                user: args.user,
                query: {
                    timestamp: new Date(),
                    patientId: args.patient._id
                },
                options: {doNotQueryCaseFolder: !(args.patient.activeCaseFolderId)},
                callback: ( err, res ) => {
                    if( err ) {
                        return cb( err );
                    }
                    args.schein = res[0] || {};

                    if( args.schein && args.schein.employeeId ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: args.user,
                            action: 'get',
                            model: 'employee',
                            query: {
                                _id: args.schein.employeeId
                            }
                        }, ( err, res ) => {
                            if( !err && res && res.length ) {
                                args.employee = res[0];
                            } else {
                                Y.log( 'generateLabFAOrder: could not get correct employee for patient.', 'warn', NAME );
                            }
                            doGenerateOrder();
                        } );
                    } else {
                        doGenerateOrder();
                    }
                }
            };

            if( args.patient.activeCaseFolderId ) {
                scheinArgs.query.caseFolderId = args.patient.activeCaseFolderId;
            }

            Y.doccirrus.api.patient.lastSchein( scheinArgs );

            async function doGenerateOrder() {
                let
                    err,
                    dataHeader = [],
                    pPackageHeader = [],
                    elTransaction = [],
                    dataFooter = [],
                    pPackageFooter = [];

                if( !args.employee ) {
                    return cb( 'generateLabFAOrder: No employee.' );
                }
                if( args.employee.asvTeamNumbers && args.employee.asvTeamNumbers[0] ) {
                    args.docAsv = args.employee.asvTeamNumbers; //send entire array
                }
                if( args.insurance ) {
                    args.feeSchedule = getFeeScheduleFromInsuranceType( args.insurance.type ) || "00";
                    args.billingType = getBillingTypeFromInsuranceType( args.insurance.type ) || 'X';
                } else if( args.schein && Object.keys( args.schein ).length > 0 ) {
                    if( args.schein.actType === "SCHEIN" ) {
                        args.billingType = "K";
                        if( !args.insurance ) {
                            // MOJ-14319:[OK] - no other chance
                            args.insurance = Y.doccirrus.schemas.patient.getInsuranceByType( args.patient, "PUBLIC" );
                        }
                    } else {
                        args.billingType = "P";
                        if( !args.insurance ) {
                            // MOJ-14319: [OK] - no other chance
                            args.insurance = Y.doccirrus.schemas.patient.getInsuranceByType( args.patient, "PRIVATE" );
                        }
                    }
                } else {
                    return cb( 'Kein regulärer Fallordner ausgewählt (GKV, PKV, SZ, BG).', null );
                }

                if( args.ldt.name.includes( 'ldt2' ) ) {
                    // S 0020 x1 Datenträger-Header
                    dataHeader = LdtApi.generateDataHeader( args );

                    // S 8230 x1 P-Datenpaket-Header
                    pPackageHeader = LdtApi.generatePPackageHeader( args );

                    // S 8218 xN Elektronische Überweisung //TODO: xN
                    elTransaction = LdtApi.generateElTransaction( args );

                    // S 0021 x1 Datenträger-Abschluss
                    dataFooter = LdtApi.generateDataFooter( args );

                    args.len = dataHeader.length + pPackageHeader.length + elTransaction.length + dataFooter.length;
                    // S 8231 x1 P-Datenpaket-Abschluss
                    pPackageFooter = LdtApi.generatePPackageFooter( args );

                    return cb( null, Buffer.concat( [
                        dataHeader,
                        pPackageHeader,
                        elTransaction,
                        pPackageFooter,
                        dataFooter
                    ] ) );
                } else {
                    [err, pPackageHeader] = await formatPromiseResult(
                        LdtApi.generatePPackageHeaderVersion3( args )
                    );

                    if( err ) {
                        Y.log( `doGenerateOrder: error generating PPackageHeaderVersion3: ${err.stack || err}`, 'warn', NAME );
                        return cb( err, null );
                    }

                    [err, elTransaction] = await formatPromiseResult(
                        LdtApi.generateElTransactionVersion3( args )
                    );

                    if( err ) {
                        Y.log( `doGenerateOrder: error generating ElTransactionVersion3: ${err.stack || err}`, 'warn', NAME );
                        return cb( err, null );
                    }

                    let checksum = crypto.createHash( 'sha1' );
                    checksum.update( Buffer.concat( [
                        pPackageHeader,
                        elTransaction
                    ] ) );
                    args.checksum = checksum.digest( 'hex' );
                    [err, pPackageFooter] = await formatPromiseResult(
                        LdtApi.generatePPackageFooterVersion3( args )
                    );

                    if( err ) {
                        Y.log( `doGenerateOrder: error generating PPackageFooterVersion3: ${err.stack || err}`, 'warn', NAME );
                        return cb( err, null );
                    }

                    return cb( null, Buffer.concat( [
                        pPackageHeader,
                        elTransaction,
                        pPackageFooter
                    ] ) );
                }
            }
        };

        /**
         * @method generateLabGMOrder
         * @/param {Object} args
         * @/param {Object} args.ldt LDT version to use
         */
        LdtApi.generateLabGMOrder = function generateLabGMOrder( /*args*/ ) {
            // S 0020 x1 Datenträger-Header

            // S 8230 x1 P-Datenpaket-Header
            // S 8218/8219 xN Elektronische Überweisung/Auftrag an eine Laborgemeinschaft
            // S 8231 x1 P-Datenpaket-Abschluss

            // S 0021 x1 Datenträger-Abschluss
        };

        /**
         * @method generateLabSEOrder
         * @/param {Object} args
         * @/param {Object} args.ldt LDT version to use
         */
        LdtApi.generateLabSEOrder = function generateLabSEOrder( /*args*/ ) {
            // S 0020 x1 Datenträger-Header

            // S 8230 x1 P-Datenpaket-Header
            // S 8218 xN Elektronische Überweisung
            // S 8231 x1 P-Datenpaket-Abschluss

            // S 0021 x1 Datenträger-Abschluss
        };

        /**
         * @method generateDataHeader
         * @param {Object} args
         * @param {Object} args.ldt LDT version to use
         * @param {Object} [args.fileNumber]  the file number to add
         * @param {Function} [cb]
         * @returns {Array}
         */
        LdtApi.generateDataHeader = function generateDataHeader( args, cb ) {
            const fileNum = args.fileNumber || "1";
            return Y.doccirrus.api.xdtTools.metaRecordBuilder(
                "dataHeader",
                [{key: "FileNumber", val: fileNum}],
                args.ldt,
                encodingUsed,
                false,
                cb
            );
        };

        /**
         * @method generateDataFooter
         * @param {Object} args
         * @param {Object} args.ldt LDT version to use
         * @param {Function} [cb]
         *
         * @returns {Array}
         */
        LdtApi.generateDataFooter = function generateDataFooter( args, cb ) {
            return Y.doccirrus.api.xdtTools.metaRecordBuilder(
                "dataFooter",
                [],
                args.ldt,
                encodingUsed,
                false,
                cb
            );
        };

        /**
         * @method generateElTransaction
         * @param {Object} args
         * @param {Object} args.ldt LDT version to use
         * @param {String} args.recordRequestId the request Id of this particular set of tests ( grouped by patient )
         * @param {Boolean} [args.user] possible editor to note as wildcard data
         * @param {Boolean} [args.subsequentReq] if the given record is a subsequent request to an already previously sent entry
         * @param {String} args.billingType possible values: ["P"]rivatpatient, ["X"] andere Rechnungsempfänger, ["E"]insender   ( invalid: ["K"]assenpatient )
         * @param {String} [args.BillingDoneBy] possible values: [lab/1] Labor, [doc/2] Einweiser
         * @param {String} [args.labClient] LANR/doc id
         *
         * @param {Object} args.patient Patient object
         * @param {Object} args.invoiceReceiver Patient object
         * @param {Object} [args.schein] Schein object, needed when billingType = "K"
         * @param {Object} args.employee Employee object
         * @param {Object} args.location Location object
         * @param {Object} args.order_Diagnose order or diagnose
         *
         * @param {Object} [args.extendedProperties] extended Properties from LDT-Export Flow
         * @param {Object} [args.customInsurance] MOJ-10732 - work around for BG and Selbstzahler Insurance
         *
         * @param {String} [args.patientAddInfo] short additional patient information
         * @param {Boolean} [args.sampleInfectious] if the given patient/sample will be infectious
         * @param {Boolean} [args.pregnancy]
         * @param {String} [args.pregnancyGestationLen] length in format WWD - weeks and days
         * @param {Date} [args.firstDayOfLastCycle]
         * @param {Array} [args.medicationTaken] list of medication names that was taken/active while the sample was taken
         * @param {String} [args.patientHeight]
         * @param {String} [args.patientWeight]
         * @param {String} args.feeSchedule [1] BMÄ, [2] EGO, [3] GOÄ 96, [4] BG-Tarif, [5] GOÄ 88
         * @param {Boolean} [args.budgetFree]
         * @param {Boolean} [args.testResultPathKnown] if pathologically known( ?)
         * @param {String} [args.sampleUrgency] [1] Notfall, [2] eilig
         * @param {Boolean} [args.accident_consequences]
         * @param {Array} [args.diagnosis_suspected]
         * @param {Array} [args.findings_Medication]
         * @param {String} [args.exceptionalMedIndication]
         * @param {Boolean} [args.followUpOfKnownInfection]
         * @param {Date} [args.sampleColDate]
         *
         * @param {Array} [args.additionalWayFindings]
         * @param {String} args.additionalWayFindings.type [0] Papier [1] Telefon [2] Telefax [4] Mailbox [5] Praxis-Computer [7] Diskette
         * @param {String} [args.additionalWayFindings.number] number to be called for emergency case
         * @param {Array} [args.additionalRecipients] list of strings of additional recipients
         *
         * @param {Array} [args.requests] list of request objects
         * @param {String} [args.requests.requestDescription]
         * @param {String} [args.requests.sampleId]
         * @param {String} [args.requests.sampleIndex]
         * @param {String} [args.requests.sampleLabel]
         * @param {Array} [args.requests.sampleSpec] array of strings
         * @param {String} [args.requests.sampleColDate]
         * @param {String} [args.requests.sampleAmountVal]
         * @param {String} args.requests.sampleAmountUnit
         * @param {String} [args.requests.sampleColSpan]
         * @param {String} [args.requests.Comment_RefNumber]

         * @param {Array} [args.test] list of test objects
         * @param {String} args.test.testId
         * @param {String} [args.test.testLabel]
         * @param {String} [args.test.sampleId]
         * @param {String} [args.test.sampleIndex]
         * @param {String} [args.test.sampleLabel]
         * @param {Array} [args.test.sampleSpec] array of strings
         * @param {String} [args.test.sampleColDate]
         * @param {String} [args.test.sampleAmountVal]
         * @param {String} args.test.sampleAmountUnit
         * @param {String} [args.test.sampleColSpan]
         * @param {Function} [cb]
         *
         * @returns {Array}
         */
        LdtApi.generateElTransaction = function generateElTransaction( args, cb ) {//TODO
            const tools = Y.doccirrus.api.xdtTools;
            // const ldt = args.ldt || Y.doccirrus.api.xdtVersions.ldt.ldt20;

            const genderMap = {
                "MALE": "M",
                "FEMALE": "W",
                "UNDEFINED": "X"
            };

            const pat = args.patient;
            const ins = args.insurance;
            const sch = args.schein;
            const doc = args.employee;
            // const loc = args.location;
            const rec = args.invoiceReceiver;
            const user = args.user;

            const customEmployee = args.customEmployee;
            const customLocation = args.customLocation;
            const customEmployeeName = customEmployee && `${customEmployee.firstname} ${customEmployee.lastname}`;
            const customEmployeeId = customEmployee && customEmployee._id;

            let ret = [
                {key: "recordRequestId", val: args.recordRequestId} // 8310
            ];

            if( args.subsequentReq ) { // 8313 X
                ret.push( {key: "subsequentReq", val: "1"} );
            }

            if( args.billingType ) {
                ret.push( {key: "billingType", val: args.billingType} ); // 8609
            }

            switch( args.billingDoneBy ) { // 8614 X  1: Labor 2: Einweiser
                case 1:
                case "1":
                case "lab":
                    ret.push( {key: "BillingDoneBy", val: "0"} );
                    break;
                case 2:
                case "2":
                case "doc":
                    ret.push( {key: "BillingDoneBy", val: "1"} );
                    break;
            }

            ret.push(
                {key: "labClient", val: args.labClient, optional: true}, // 8615 X
                {key: "patientNameAdd", val: pat.nameaffix, optional: true}, // 3100
                {key: "patientPrefix", val: pat.fk3120, optional: true}, // 3120
                {key: "patientName", val: pat.lastname}, // 3101
                {key: "patientForename", val: pat.firstname}, // 3102
                {key: "patientDob", val: moment( pat.kbvDob, "DD.MM.YYYY" ).toDate()}, // 3103
                {key: "patientTitle", val: pat.title, optional: true} // 3104
            );

            if( "K" === args.billingType ) {
                ret.push(
                    {key: "patientInsId", val: ins && ins.insuranceNo}, // 3119
                    {key: "patientWop", val: ins && ins.locationFeatures}, // 3116
                    {key: "patientInsKind", val: ins && ins.insuranceKind}, // 3108
                    {key: "insName", val: ins && ins.insurancePrintName}, // 2002
                    {key: "insuranceVKNR", val: ins && ins.insuranceGrpId}, // 4104
                    {key: "payerBillingArea", val: ins && ins.costCarrierBillingSection} // 4106
                );
                if( sch ) {
                    ret.push(
                        {key: "refFromOther", val: ins && ins.fk4219, optional: true}, // 4219
                        {key: "insuranceBillingArea", val: sch.scheinBillingArea} // 4122
                    );
                }

                if( args.order_Diagnose ) {
                    ret.push( {key: "order_Diagnose", val: ins && ins.cardSwipe} ); // 4209
                }

                ret.push(
                    {key: "insurancelastCardReadOfQuarter", val: ins && ins.cardSwipe}, // 4109
                    {key: "insuranceValidFromDate", val: ins && ins.fk4133, optional: true}, // 4133
                    {key: "insuranceValidToDate", val: ins && ins.fk4110, optional: true}, // 4110
                    {key: "payerNo", val: ins && ins.insuranceId}, // 4111
                    {key: "insuranceSpeGroup", val: ins && ins.persGroup, optional: true}, // 4131
                    {key: "insuranceDmp", val: ins && ins.dmp, optional: true}, // 4132
                    {key: "insuranceSktAdd", val: ins && ins.fk4124, optional: true}, // 4124
                    {key: "treatmentAccordingToSGBV", val: ins && ins.fk4204, optional: true} // 4204
                );
            }
            if( "P" === args.billingType ) {
                ret.push(
                    {key: "patientInsId", val: ins && ins.insuranceNo}, // 3119
                    {key: "patientWop", val: ins && ins.locationFeatures}, // 3116
                    {key: "insName", val: ins && ins.insurancePrintName}, // 2002
                    {key: "insuranceVKNR", val: ins && ins.insuranceGrpId}, // 4104
                    {key: "payerBillingArea", val: ins && ins.costCarrierBillingSection} // 4106
                );

                ret.push(
                    {key: "insurancelastCardReadOfQuarter", val: ins && ins.cardSwipe}, // 4109
                    {key: "insuranceValidFromDate", val: ins && ins.fk4133, optional: true}, // 4133
                    {key: "insuranceValidToDate", val: ins && ins.fk4110, optional: true}, // 4110
                    {key: "payerNo", val: ins && ins.insuranceId} // 4111
                );
            }
            if( 'X' === args.billingType ) {
                ret.push(
                    {key: 'insName', val: ins && ins.insurancePrintName} // 2002
                );
            }

            let add = Y.doccirrus.schemas.patient.getAddressByKind( pat, "OFFICIAL" );
            const addP = Y.doccirrus.schemas.patient.getAddressByKind( pat, "POSTBOX" );
            if( !add && pat.addresses && pat.addresses[0] ) {
                add = pat.addresses[0];
            }

            if( add ) {
                ret.push(
                    {key: "patientStreet", val: add.street}, // 3107
                    {key: "patientHouseNo", val: add.houseno}, // 3109
                    {key: "patientZip", val: add.zip}, // 3112
                    {key: "patientCity", val: add.city}, // 3113
                    {key: "patientCountrycode", val: add.countryCode} // 3114
                );
            } else if( addP ) {
                ret.push(
                    {key: "patientPostboxZip", val: addP.zip}, // 3121
                    {key: "patientPostboxCity", val: addP.city}, // 3122
                    {key: "patientPostbox", val: addP.postbox}, // 3123
                    {key: "patientPostboxCountrycode", val: addP.street} // 3124
                );
            }
            ret.push(
                {key: "patientGender", val: genderMap[args.patient.gender] || "U"}, // 3110
                {key: "patientAddInfo", val: args.patientAddInfo || pat.patientNo, optional: true} // 8405 X
            );

            if( args.accident_consequences ) {
                ret.push( {key: "accident_consequences", val: "1"} ); // 4202 X
            }

            // if( "K" === args.billingType ) {
            //     if( sch ) {
            //         ret.push( {key: "scheinSubgroup", val: sch.scheinSubgroup} ); // 4239
            //         // 4220 TODO
            //
            //         if( "21" === sch.scheinSubgroup || "27" === sch.scheinSubgroup ) {
            //             if( ldt.fields.hasOwnProperty( "4205" ) && sch.scheinOrder ) {
            //                 ret.push( {key: "order", val: sch.scheinOrder.substring(0, parseInt(ldt.fields["4205"].len.match( /\d+/g ), 10))} ); // 4205
            //             }
            //         }
            //     } else {
            //         if( cb ) {
            //             cb( "Missing Schein Data" );
            //         }
            //         return null;
            //     }
            // }

            const extendedProperties = args.extendedProperties;

            // 4209 TODO: Auftrag/Diagnose/Verdacht
            if( extendedProperties ) {
                if( pat.latestMedData && pat.latestMedData.length > 0 ) {
                    if( extendedProperties.patientHeightInCm ) {
                        const height = pat.latestMedData.find( medData => medData.type === 'HEIGHT' );
                        if( height ) {
                            const heightInCm = height.value * 100;
                            ret.push(
                                {key: "patientHeight", val: heightInCm && heightInCm.toString()} // 3622
                            );
                        }
                    }

                    if( extendedProperties.patientWeightInKg ) {
                        const weight = pat.latestMedData.find( medData => medData.type === 'WEIGHT' );
                        if( weight ) {
                            ret.push(
                                {key: "patientWeight", val: weight.value} // 3623
                            );
                        }
                    }

                    const pregnancy = pat.latestMedData.find( medData => medData.type === 'LAST_MENSTRUATION_P' );
                    const pregnancyValue = pregnancy !== undefined;
                    if( extendedProperties.patientPregnancy ) {
                        ret.push(
                            {key: "pregnancy", val: pregnancyValue ? '1' : '0'} // 8510
                        );
                    }

                    if( extendedProperties.patientPregnancyGestationLength ) {
                        const
                            thisDate = moment(),
                            pregDate = pregnancy && moment( pregnancy.textValue, 'DD.MM.YYYY' );

                        if( pregDate ) {
                            let weeks = thisDate.diff( pregDate, 'weeks' );
                            pregDate.add( weeks, 'weeks' );
                            const days = thisDate.diff( pregDate, 'days' );

                            if( weeks < 10 ) {
                                weeks = `0${weeks}`;
                            }

                            ret.push(
                                {key: "pregnancyGestationLen", val: `${weeks}${days}`} // 8511
                            );
                        }
                    }
                }

                //filter unwanted selected activities
                const selectedDiagnosis = args.selectedActivities && args.selectedActivities.filter( activity => activity.actType === 'DIAGNOSIS' );
                if( extendedProperties.diagnosisSuspected ) {
                    if( args.selectedActivities && args.selectedActivities.length > 0 ) {

                        for( let diagnosis of selectedDiagnosis ) {
                            if( diagnosis.content ) {
                                if( extendedProperties.diagnosisSuspectedFK === '4207' ) {
                                    ret.push( {key: "diagnosis_suspected", val: diagnosis.content} ); // 4207
                                } else if( extendedProperties.diagnosisSuspectedFK === '4209' ) {
                                    ret.push( {key: "order_diagnosis_suspected", val: diagnosis.content} ); // 4209
                                }
                            }
                            if( extendedProperties.ICDCode ) {
                                ret.push( {key: "icdCode", val: diagnosis.code} ); // 6001
                            }
                            if( extendedProperties.diagnosisCertainty ) {
                                ret.push( {
                                    key: "diagnosisCertainty",
                                    val: diagnosisCerntaintyTranslationMap[diagnosis.diagnosisCert]
                                } ); // 6003
                            }
                            if( extendedProperties.diagnosisLoc ) {
                                ret.push( {
                                    key: "diagnosisLoc",
                                    val: diagnosisLocalisationTranslationMap[diagnosis.diagnosisSite]
                                } ); // 6004
                            }
                            if( extendedProperties.diagnosisDesc ) {
                                ret.push( {key: "diagnosisDesc", val: diagnosis.explanations} ); // 6006
                            }
                            if( extendedProperties.diagnosisExceptionDesc ) {
                                ret.push( {key: "diagnosisExceptionDesc", val: diagnosis.diagnosisDerogation} ); // 6008
                            }
                        }
                    }
                }

                //Schein Data
                if( extendedProperties.initiatorBSNR && customLocation && customLocation.commercialNo ) {
                    ret.push( {key: "initiatorBSNR", val: customLocation.commercialNo} ); // 4217
                }

                if( extendedProperties.initiatorLANR && customEmployee && customEmployee.officialNo ) {
                    ret.push( {key: "initiatorLANR", val: customEmployee.officialNo} ); // 4241
                }

                if( extendedProperties.refBSNR ) {
                    if( extendedProperties.selectedRefBSNRMapping === 'Kein' && sch.scheinEstablishment ) {
                        ret.push( {key: "refBSNR", val: sch.scheinEstablishment} ); // 4218
                    } else if( extendedProperties.selectedRefBSNRMapping === '0201' && customLocation ) {
                        ret.push( {
                            key: "refBSNR",
                            val: (customLocation && customLocation.commercialNo) || args.location.commercialNo
                        } ); // 4218
                    }
                }

                if( extendedProperties.refLANR ) {
                    if( extendedProperties.selectedRefLANRMapping === 'Kein' && sch.scheinRemittor ) {
                        ret.push( {key: "refLANR", val: sch.scheinRemittor} ); // 4242
                    } else if( extendedProperties.selectedRefLANRMapping === '0212' && customEmployee ) {
                        ret.push( {
                            key: "refLANR",
                            val: (customEmployee && customEmployee.officialNo) || args.employee.officialNo
                        } ); // 4242
                    }
                }

                if( extendedProperties.treatmentTypeSel && extendedProperties.treatmentType ) {
                    ret.push( {key: "treatmentType", val: extendedProperties.treatmentType || '1'} ); // 4221
                }

                ret.push(
                    {key: "feeSchedule", val: args.feeSchedule} // 8403
                );
            } else {
                for( let q = 0; args.diagnosis_suspected && q < args.diagnosis_suspected.length; q++ ) {
                    ret.push( {key: "diagnosis_suspected", val: args.diagnosis_suspected[q]} ); // 4207
                }
                for( let r = 0; args.findings_Medication && r < args.findings_Medication.length; r++ ) {
                    ret.push( {key: "findings_Medication", val: args.findings_Medication[r]} ); // 4208
                }

                ret.push( {key: "refLANR", val: doc.officialNo} ); // 4242

                if( args.pregnancy ) { // 8510 X
                    ret.push( {key: "pregnancy", val: "1"} );
                } else {
                    ret.push( {key: "pregnancy", val: "0"} );
                }

                ret.push(
                    {key: "pregnancyGestationLen", val: args.pregnancyGestationLen, optional: true}, // 8511 X
                    {key: "firstDayOfCycle", val: args.firstDayOfLastCycle, optional: true} // 8512 X
                );

                for( let i = 0; args.medicationTaken && i < args.medicationTaken.length; i++ ) {
                    ret.push( {key: "medicationTaken", val: args.medicationTaken[i]} ); // 8504 X
                }

                ret.push(
                    {key: "patientHeight", val: args.patientWeight, optional: true}, // 3622 X
                    {key: "patientWeight", val: args.patientWeight, optional: true}, // 3623 X
                    {key: "feeSchedule", val: args.feeSchedule} // 8403
                );
            }

            // 4217 TODO: Erstveranlasser?
            // 4241

            if( "K" === args.billingType ) {
                if( sch ) {
                    if( "27" === sch.scheinSubgroup || "28" === sch.scheinSubgroup ) {
                        ret.push( {key: "treatmentType", val: sch.scheinSlipMedicalTreatment || 1} ); // 4221
                        ret.push( {
                            key: "exceptionalMedIndication",
                            val: args.exceptionalMedIndication,
                            optional: true
                        } ); // 4229
                    }
                } else {
                    if( cb ) {
                        cb( "Missing Schein Data" );
                    }
                    return null;
                }
            }

            if( args.followUpOfKnownInfection ) {
                ret.push( {key: "followUpOfKnownInfection", val: "1"} ); // 4231 X
            }

            ret.push(
                {key: "sampleColDate.date", val: args.sampleColDate, optional: true}, // 8432 X
                {key: "sampleColDate.time", val: args.sampleColDate, optional: true} // 8433 X
            );

            // 8610 TODO

            if( rec ) {

                const recLoc = Y.doccirrus.schemas.patient.getAddressByKind( rec, "OFFICIAL" );

                ret.push(
                    {key: "recipientName", val: rec.lastname}, // 8601
                    {key: "recipientTitleForename", val: rec.firstname}, // 8602
                    {key: "recipientCity", val: `${recLoc.zip} ${recLoc.city}`}, // 8606
                    {key: "recipientStreetHouseno", val: `${recLoc.street} ${recLoc.houseno}`} // 8607
                );
            }

            ret.push( {key: "Comment_RefNumber", val: args.Comment_RefNumber, optional: true} ); // 8608

            if( args.sampleInfectious ) { // 8503 X
                ret.push( {key: "sampleInfectious", val: "1"} );
            }

            if( args.budgetFree ) { // 8425 X
                ret.push( {key: "budgetFree", val: "1"} );
            }

            if( args.testResultPathKnown ) {  // 8423 X
                ret.push( {key: "testResultPathKnown", val: "1"} );
            }

            if( args.sampleUrgency ) { // 8501 X
                ret.push( {key: "sampleUrgency", val: args.sampleUrgency} );
                for( let j = 0; args.additionalWayFindings && j < args.additionalWayFindings.length; j++ ) {
                    ret.push( {key: "additionalWayFindings", val: args.additionalWayFindings.type} ); // 8611 X
                    ret.push( {key: "callNumber", val: args.additionalWayFindings.number} ); // 8612 X
                }
            }

            for( let k = 0; args.additionalRecipients && k < args.additionalRecipients.length; k++ ) {
                ret.push( {key: "additionalRecipients", val: args.additionalRecipients[k]} ); // 8613 X
            }

            //8434 block

            for( let n = 0; n < args.requests && args.requests.length; n++ ) {
                const req = args.requests[n];
                ret.push(
                    {key: "sampleRequests", val: req.requestDescription}, // 8434 X
                    {key: "sampleId", val: req.sampleId, optional: true}, // 8428 X
                    {key: "sampleIndex", val: req.sampleIndex, optional: true}, // 8429 X
                    {key: "sampleLabel", val: req.sampleLabel, optional: true} // 8430 X
                );

                for( let o = 0; o < args.requests[n].sampleSpec.length; o++ ) {
                    ret.push( {key: "sampleSpec", val: args.requests.sampleSpec[o]} ); // 8431 X
                }

                ret.push(
                    {key: "sampleColDate.date", val: req.sampleColDate, optional: true}, // 8432 X
                    {key: "sampleColDate.time", val: req.sampleColDate, optional: true}, // 8433 X
                    {key: "sampleAmountVal", val: req.sampleAmountVal, optional: true}, // 8520 X
                    {key: "sampleAmountUnit", val: req.sampleAmountUnit}, // 8521
                    {key: "sampleColSpan", val: req.sampleColSpan, optional: true}  // 8522 X
                );
            }

            //8410 block

            for( let l = 0; l < args.test && args.test.length; l++ ) {
                const test = args.test[l];
                ret.push(
                    {key: "testId", val: test.testId}, // 8410
                    {key: "testLabel", val: test.testLabel, optional: true}, // 8411 X
                    {key: "sampleId", val: test.sampleId, optional: true}, // 8428 X
                    {key: "sampleIndex", val: test.sampleIndex, optional: true}, // 8429 X
                    {key: "sampleLabel", val: test.sampleLabel, optional: true} // 8430 X
                );

                for( let m = 0; m < args.test[l].sampleSpec.length; m++ ) {
                    ret.push( {key: "sampleSpec", val: args.test.sampleSpec[m]} ); // 8431 X
                }

                ret.push(
                    {key: "sampleColDate.date", val: test.sampleColDate, optional: true}, // 8432 X
                    {key: "sampleColDate.time", val: test.sampleColDate, optional: true}, // 8433 X
                    {key: "sampleAmountVal", val: test.sampleAmountVal, optional: true}, // 8520 X
                    {key: "sampleAmountUnit", val: test.sampleAmountUnit}, // 8521
                    {key: "sampleColSpan", val: test.sampleColSpan, optional: true}  // 8522 X
                );
            }

            if( pat.activeCaseFolderId ) {
                ret.push( {key: "wildcardField", val: `DCcaseFolderId: ${pat.activeCaseFolderId}`, optional: true} );
            }

            if( user ) {
                ret.push( {
                    key: "wildcardField",
                    val: `DCEmployeeName: ${customEmployeeName || user.U}`,
                    optional: true
                } );
                ret.push( {
                    key: "wildcardField",
                    val: `DCEmployeeId: ${customEmployeeId || user.specifiedBy}`,
                    optional: true
                } );
            }

            return tools.metaRecordBuilder( "elTransaction", ret, args.ldt, encodingUsed, false, cb );
        };

        /**
         * @method generateElTransactionVersion3
         * @param {Object} args
         * @param {Object} args.ldt LDT version to use
         * @param {String} args.recordRequestId the request Id of this particular set of tests ( grouped by patient )
         * @param {Boolean} [args.user] possible editor to note as wildcard data
         * @param {Boolean} [args.subsequentReq] if the given record is a subsequent request to an already previously sent entry
         * @param {String} args.billingType possible values: ["P"]rivatpatient, ["X"] andere Rechnungsempfänger, ["E"]insender   ( invalid: ["K"]assenpatient )
         * @param {String} [args.BillingDoneBy] possible values: [lab/1] Labor, [doc/2] Einweiser
         * @param {String} [args.labClient] LANR/doc id
         *
         * @param {Object} args.patient Patient object
         * @param {Object} args.invoiceReceiver Patient object
         * @param {Object} [args.schein] Schein object, needed when billingType = "K"
         * @param {Object} args.employee Employee object
         * @param {Object} args.location Location object
         * @param {Object} args.order_Diagnose order or diagnose
         *
         * @param {Object} [args.extendedProperties] extended Properties from LDT-Export Flow
         * @param {Object} [args.customInsurance] MOJ-10732 - work around for BG and Selbstzahler Insurance
         *
         * @param {String} [args.patientAddInfo] short additional patient information
         * @param {Boolean} [args.sampleInfectious] if the given patient/sample will be infectious
         * @param {Boolean} [args.pregnancy]
         * @param {String} [args.pregnancyGestationLen] length in format WWD - weeks and days
         * @param {Date} [args.firstDayOfLastCycle]
         * @param {Array} [args.medicationTaken] list of medication names that was taken/active while the sample was taken
         * @param {String} [args.patientHeight]
         * @param {String} [args.patientWeight]
         * @param {String} args.feeSchedule [1] BMÄ, [2] EGO, [3] GOÄ 96, [4] BG-Tarif, [5] GOÄ 88
         * @param {Boolean} [args.budgetFree]
         * @param {Boolean} [args.testResultPathKnown] if pathologically known( ?)
         * @param {String} [args.sampleUrgency] [1] Notfall, [2] eilig
         * @param {Boolean} [args.accident_consequences]
         * @param {Array} [args.diagnosis_suspected]
         * @param {Array} [args.findings_Medication]
         * @param {String} [args.exceptionalMedIndication]
         * @param {Boolean} [args.followUpOfKnownInfection]
         * @param {Date} [args.sampleColDate]
         *
         * @param {Array} [args.additionalWayFindings]
         * @param {String} args.additionalWayFindings.type [0] Papier [1] Telefon [2] Telefax [4] Mailbox [5] Praxis-Computer [7] Diskette
         * @param {String} [args.additionalWayFindings.number] number to be called for emergency case
         * @param {Array} [args.additionalRecipients] list of strings of additional recipients
         *
         * @param {Array} [args.requests] list of request objects
         * @param {String} [args.requests.requestDescription]
         * @param {String} [args.requests.sampleId]
         * @param {String} [args.requests.sampleIndex]
         * @param {String} [args.requests.sampleLabel]
         * @param {Array} [args.requests.sampleSpec] array of strings
         * @param {String} [args.requests.sampleColDate]
         * @param {String} [args.requests.sampleAmountVal]
         * @param {String} args.requests.sampleAmountUnit
         * @param {String} [args.requests.sampleColSpan]
         * @param {String} [args.requests.Comment_RefNumber]

         * @param {Array} [args.test] list of test objects
         * @param {String} args.test.testId
         * @param {String} [args.test.testLabel]
         * @param {String} [args.test.sampleId]
         * @param {String} [args.test.sampleIndex]
         * @param {String} [args.test.sampleLabel]
         * @param {Array} [args.test.sampleSpec] array of strings
         * @param {String} [args.test.sampleColDate]
         * @param {String} [args.test.sampleAmountVal]
         * @param {String} args.test.sampleAmountUnit
         * @param {String} [args.test.sampleColSpan]
         *
         * @returns {Array}
         */
        LdtApi.generateElTransactionVersion3 = async function generateElTransactionVersion3( args ) {//TODO
            const
                {
                    ldt,
                    patient,
                    insurance,
                    schein,
                    customLocation,
                    docAsv,
                    recordRequestId,
                    currentDate,
                    selectedActivities
                } = args,
                genderMap = {
                    "MALE": "M",
                    "FEMALE": "W",
                    "UNDEFINED": "X"
                },
                feeScheduleMap = {
                    'PUBLIC': '0', //EBM
                    'PRIVATE': '3', //GOÄ
                    'SELFPAYER': '3', //GOÄ
                    'BG': '4' //BG-Tarif
                },
                asvTeamNumber = docAsv && docAsv.length && docAsv[0],
                patientHasWohnanschrift = patient.addresses && patient.addresses.length && patient.addresses.find( address => address && address.kind === 'OFFICIAL' ),
                patientHasCompanyCommunication = patient.communications && patient.communications.length && patient.communications.find( communication => communication && communication.type && communication.type.includes( 'JOB' ) ),
                diagnoses = selectedActivities && selectedActivities.filter( elem => elem.actType === 'DIAGNOSIS' );

            let dob;
            if( patient.kbvDob ) {
                dob = moment( patient.kbvDob, "DD.MM.YYYY" );
            } else if( patient.dob ) {
                dob = moment( patient.dob );
            }

            let
                err,
                result,
                entries = [];

            //Patient
            entries.push(
                {key: "8145", val: 'Patient'},
                {key: "8002", val: 'Obj_0045'},
                {key: "8147", val: 'Person'},
                {key: "8002", val: 'Obj_0047'},
                {key: "3100", val: patient.nameaffix},
                {key: '3101', val: patient.lastname}, // Nachname
                {key: '3102', val: patient.firstname}, // Vorname
                {key: '3103', val: dob}, // Geburtsdatum
                {key: '3104', val: patient.title}, // Titel
                {key: '3110', val: genderMap[patient.gender]}, // Geschlecht
                ...patientHasWohnanschrift ? [
                    {key: '8228', val: 'Wohnanschrift'},
                    {key: "8002", val: 'Obj_0007'},
                    {key: '3112', val: patientHasWohnanschrift.zip}, // PLZ
                    {key: '3113', val: patientHasWohnanschrift.city}, // Ort
                    {key: '3107', val: patientHasWohnanschrift.street}, // Straße
                    {key: '3109', val: patientHasWohnanschrift.houseno}, // Hausnummer
                    {key: '3115', val: patientHasWohnanschrift.addon}, // Anschriftenzusatz
                    {key: '3114', val: patientHasWohnanschrift.countryCode}, // Wohnsitzländercode
                    {key: '1202', val: '1'}, // Adresstyp
                    {key: "8003", val: 'Obj_0007'}
                ] : [],
                ...patientHasCompanyCommunication ? [
                    {key: '8233', val: 'Geschaeftliche_Kommunikationsdaten'},
                    {key: "8002", val: 'Obj_0031'},
                    {key: '7330', val: (patient.communications.find( com => com && com.type && com.type === 'PHONEJOB' ) || {}).value}, // Telefonnummer
                    {key: '7331', val: (patient.communications.find( com => com && com.type && com.type === 'MOBILEJOB' ) || {}).value}, // Mobiltelefonnummer
                    {key: '7332', val: ''}, // Alternative elektronische Postadresse
                    {key: '7340', val: ''}, // Spezifizierung der alternativen elektronischen Postadresse
                    {key: '7333', val: (patient.communications.find( com => com && com.type && com.type === 'FAXJOB' ) || {}).value}, // Faxnummer
                    {key: '7335', val: (patient.communications.find( com => com && com.type && com.type === 'EMAILJOB' ) || {}).value}, // E-Mailadresse
                    {key: '7334', val: (patient.communications.find( com => com && com.type && com.type === 'URL' ) || {}).value}, // Webadresse
                    {key: "8003", val: 'Obj_0031'}
                ] : [],
                {key: "8003", val: 'Obj_0047'},
                {key: '3119', val: insurance.insuranceId}, // Versicherten_ID
                {key: '3105', val: insurance.insuranceNo}, // Versichertennummer
                {key: '7329', val: genderMap[patient.gender]}, // Normalbereichsrelevantes Geschlecht
                {key: '7922', val: ''}, // Sterbedatum des Patienten
                {key: '3000', val: patient.patientNo}, // Patientennummer
                {key: "8003", val: 'Obj_0045'}
            );

            //Obj_Auftragsinformation
            entries.push(
                {key: "8113", val: 'Auftragsinformation'},
                {key: "8002", val: 'Obj_0013'},
                {key: '8310', val: recordRequestId}, // Auftragsnummer des Einsenders
                // {key: '8313', val: ''}, // ID Nachforderung
                // {key: '8311', val: recordRequestId}, // ID Auftragsnummer des Labors
                // {key: '7268', val: ''}, // Fachrichtung oder Stationskennung
                {key: '0080', val: patient.activeCaseFolderId}, // ID Fallakte oder Studie
                {key: '0081', val: 'Akte'}, // Bezeichnung der Fallakte oder Studie
                {key: '8213', val: 'Timestamp_Erstellung_Untersuchungsanforderung'},
                {key: "8002", val: 'Obj_0054'},
                {key: '7278', val: currentDate}, // Datum des Timestamp
                {key: '7279', val: currentDate}, // Uhrzeit des Timestamp
                {
                    key: '7273',
                    val: `UTC${currentDate.format( 'Z' ).replace( /0|:/g, '' )}`
                }, // Zeitzone
                {key: "8003", val: 'Obj_0054'},
                {key: "8003", val: 'Obj_0013'}
            );

            //Obj_Veranlassungsgrund
            let diagnosesLDTObjects = [];
            for( let i = 0; i < diagnoses.length; i++ ) {
                diagnosesLDTObjects.push(
                    {key: "8200", val: 'Akutdiagnose'},
                    {key: "8002", val: 'Obj_0100'},
                    {key: '4207', val: 'Diagnose'},
                    {key: '6001', val: diagnoses[i].code},
                    {
                        key: '6003',
                        val: diagnosisCerntaintyTranslationMap[diagnoses[i].diagnosisCert]
                    },
                    {
                        key: '6004',
                        val: diagnosisLocalisationTranslationMap[diagnoses[i].diagnosisSite]
                    },
                    {key: '6006', val: diagnoses[i].explanations},
                    {key: '6008', val: diagnoses[i].diagnosisDerogation},
                    {key: "8003", val: 'Obj_0100'}
                );
            }
            entries.push(
                {key: "8127", val: 'Veranlassungsgrund'},
                {key: "8002", val: 'Obj_0027'},
                {key: "7303", val: '1'},
                {key: "8417", val: '1'},
                {key: "8427", val: '1'},
                ...diagnosesLDTObjects,
                {key: "8003", val: 'Obj_0027'}
            );

            //Obj_Koerperkenngroessen
            // entries.push(
            //     {
            //         key: '8169',
            //         entries: [
            //             {
            //                 key: 'Obj_0069', entries: [
            //                     {key: '3119', val: ''}, // Größe des Patienten
            //                     {key: '3105', val: ''}, // Maßeinheit des Messwertes / Wertes
            //                     { // Timestamp_Messung
            //                         key: 'Obj_0054',
            //                         entries: [
            //                             {key: '7278', val: ''}, // Datum des Timestamp
            //                             {key: '7279', val: ''}, // Uhrzeit des Timestamp
            //                             {key: '7273', val: ''}, // Zeitzone
            //                             {key: '7272', val: ''} // Freitext zum Timestamp
            //                         ]
            //                     },
            //                     {key: '7329', val: ''}, // Gewicht des Patienten
            //                     {key: '7922', val: ''}, // Maßeinheit des Messwertes / Wertes
            //                     { // Timestamp_Messung
            //                         key: 'Obj_0054',
            //                         entries: [
            //                             {key: '7278', val: ''}, // Datum des Timestamp
            //                             {key: '7279', val: ''}, // Uhrzeit des Timestamp
            //                             {key: '7273', val: ''}, // Zeitzone
            //                             {key: '7272', val: ''} // Freitext zum Timestamp
            //                         ]
            //                     }
            //                 ]
            //             }
            //         ]
            //     }
            // );

            //Obj_Schwangerschaft
            // entries.push(
            //     {
            //         key: 'Obj_0050', entries: [
            //             {key: '8511', val: ''}, // Schwangerschaftsdauer
            //             {key: '8512', val: ''}, // letzte Periode
            //             {key: '3471', val: ''} // errechneter Entbindungstermin
            //         ]
            //     }
            // );

            //Obj_Mutterschaft
            // entries.push(
            //     {
            //         key: 'Obj_0040', entries: [
            //             {key: '3668', val: ''}, // Anzahl Schwangerschaften
            //             {key: '3664', val: ''}, // Anzahl Geburten
            //             {key: '3666', val: ''} // Anzahl Kinder
            //         ]
            //     }
            // );

            switch( insurance.type ) {
                case 'PUBLIC':
                    //Obj_Abrechnungsinformationen
                    entries.push(
                        {key: "8101", val: 'Abrechnungsinformation'},
                        {key: "8002", val: 'Obj_0001'},
                        {key: "8102", val: 'Abrechnung_GKV'},
                        {key: "8002", val: 'Obj_0002'},
                        {key: '4239', val: schein.scheinSubgroup}, // Scheinuntergruppe
                        {key: '4134', val: insurance.insuranceName}, // Kostentraegername
                        {key: '4104', val: insurance.insuranceGrpId}, // Abrechnungs-VKNR
                        {key: '4106', val: insurance.kv}, // Kostenträger-Abrechnungsbereich (KTAB)
                        // {key: '4108', val: ''}, // Zulassungsnummer des mobilen Kartenlesegerätes
                        {key: '3116', val: schein.locationFeatures}, // WOP
                        {key: '3108', val: insurance.insuranceKind}, // Versichertenart
                        {key: '4109', val: insurance.cardSwipe}, // Letzter Einlesetag der Versichertenkarte im Quartal
                        {key: '4133', val: insurance.fk4133}, // VersicherungsschutzBeginn
                        {key: '4110', val: insurance.fk4110}, // VersicherungsschutzEnde
                        {key: '4111', val: insurance.insuranceId}, // Kostenträgerkennung
                        // {key: '4229', val: ''}, // Ausnahmeindikation
                        {key: '4122', val: insurance.kv}, // Abrechnungsgebiet
                        {key: '4124', val: schein.fk4124}, // SKT Zusatzangaben
                        {key: '4126', val: schein.fk4126}, // SKT-Zusatzbemerkungen
                        {
                            key: '4131',
                            val: insurance.persGroup ? insurance.persGroup : '00'
                        }, // Besondere Personengruppe
                        {key: '4132', val: insurance.dmp ? insurance.dmp : '0'}, // DMP_Kennzeichnung
                        {key: '4202', val: Number( schein.fk4202 )}, // Unfall, Unfallfolgen
                        {key: '4204', val: Number( schein.fk4204 )}, // eingeschränkter Leistungsanspruch gemäß §16 Abs. 3a SGB
                        {key: '4221', val: ''}, // Kurativ / Präventiv / ESS / bei belegärztl. Behandlung
                        // {key: '4231', val: ''}, // Kontrolluntersuchung einer bekannten Infektion
                        // {key: '8616', val: ''}, // Testung
                        // {key: '8618', val: ''}, // Betreut/untergebracht in
                        // {key: '8619', val: ''}, // Tätigkeit in Einrichtung
                        // {key: '8620', val: ''}, // Betroffene Einrichtung
                        // {key: '8621', val: ''}, // Einverständnis
                        // {key: '8622', val: ''}, // Corona-GUID
                        // {key: '8624', val: ''}, // Covid-Beauftragung
                        // {key: '4248', val: ''}, // Pseudo-LANR für Krankenhausärzte im Rahmen der ASV-Abrechnung des Erstveranlassers
                        {key: '4217', val: customLocation._id}, // (N)BSNR des Erstveranlassers
                        {key: '4225', val: asvTeamNumber}, // ASV-Teamnummer des Erstveranlassers
                        {key: "8003", val: 'Obj_0002'},
                        {key: "8003", val: 'Obj_0001'}
                    );
                    break;
                case 'PRIVATE':
                    //Obj_Abrechnungsinformationen
                    entries.push(
                        {key: "8101", val: 'Abrechnungsinformation'},
                        {key: "8002", val: 'Obj_0001'},
                        {key: "8103", val: 'Abrechnung_PKV'},
                        {key: "8002", val: 'Obj_0003'},
                        {key: '7362', val: schein.scheinSettledDate}, // Abrechnungsart PKV
                        {key: '4134', val: insurance.insuranceName}, // Kostentraegername
                        {key: '4121', val: feeScheduleMap[insurance.type]}, // Gebührenordnung
                        // {key: '4202', val: ''}, // Unfall, Unfallfolgen
                        {key: "8148", val: 'RgEmpfaenger'},
                        {key: "8002", val: 'Obj_0048'},
                        {key: '8310', val: recordRequestId}, // Auftragsnummer des Einsenders
                        {key: '7421', val: '05'}, // Status Rechnungsempfänger
                        {key: '0600', val: customLocation.locname}, // Name der Einrichtung des Auftraggebers
                        {key: "8108", val: 'Adressat'},
                        {key: "8002", val: 'Obj_0008'},
                        {key: "8147", val: 'Person'},
                        {key: "8002", val: 'Obj_0047'},
                        {key: "3100", val: patient.nameaffix},
                        {key: '3101', val: patient.lastname}, // Nachname
                        {key: '3102', val: patient.firstname}, // Vorname
                        {key: '3103', val: dob}, // Geburtsdatum
                        {key: '3104', val: patient.title}, // Titel
                        {key: '3110', val: genderMap[patient.gender]}, // Geschlecht
                        ...patientHasWohnanschrift ? [
                            {key: '8228', val: 'Wohnanschrift'},
                            {key: "8002", val: 'Obj_0007'},
                            {key: '3112', val: patientHasWohnanschrift.zip}, // PLZ
                            {key: '3113', val: patientHasWohnanschrift.city}, // Ort
                            {key: '3107', val: patientHasWohnanschrift.street}, // Straße
                            {key: '3109', val: patientHasWohnanschrift.houseno}, // Hausnummer
                            {key: '3115', val: patientHasWohnanschrift.addon}, // Anschriftenzusatz
                            {key: '3114', val: patientHasWohnanschrift.countryCode}, // Wohnsitzländercode
                            {key: '1202', val: '1'}, // Adresstyp
                            {key: "8003", val: 'Obj_0007'}
                        ] : [],
                        ...patientHasCompanyCommunication ? [
                            {key: '8233', val: 'Geschaeftliche_Kommunikationsdaten'},
                            {key: "8002", val: 'Obj_0031'},
                            {key: '7330', val: (patient.communications.find( com => com && com.type && com.type === 'PHONEJOB' ) || {}).value}, // Telefonnummer
                            {key: '7331', val: (patient.communications.find( com => com && com.type && com.type === 'MOBILEJOB' ) || {}).value}, // Mobiltelefonnummer
                            {key: '7332', val: ''}, // Alternative elektronische Postadresse
                            {key: '7340', val: ''}, // Spezifizierung der alternativen elektronischen Postadresse
                            {key: '7333', val: (patient.communications.find( com => com && com.type && com.type === 'FAXJOB' ) || {}).value}, // Faxnummer
                            {key: '7335', val: (patient.communications.find( com => com && com.type && com.type === 'EMAILJOB' ) || {}).value}, // E-Mailadresse
                            {key: '7334', val: (patient.communications.find( com => com && com.type && com.type === 'URL' ) || {}).value}, // Webadresse
                            {key: "8003", val: 'Obj_0031'}
                        ] : [],
                        {key: "8003", val: 'Obj_0047'},
                        {key: "8003", val: 'Obj_0008'},
                        {key: '8610', val: '1'}, // Privattarif
                        // {key: '8608', val: ''} // Kommentar/Aktenzeichen
                        {key: "8003", val: 'Obj_0048'},
                        {key: "8003", val: 'Obj_0003'},
                        {key: "8003", val: 'Obj_0001'}
                    );
                    break;
                case 'SZ':
                    //Obj_Abrechnungsinformationen
                    // entries.push(
                    //     {key: "8101", val: 'Abrechnungsinformation'},
                    //     {key: "8002", val: 'Obj_0001'},
                    //     {key: "8103", val: 'Abrechnung_PKV'},
                    //     {key: "8002", val: 'Obj_0003'},
                    //
                    //     {key: "8003", val: 'Obj_0003'},
                    //     {key: "8003", val: 'Obj_0001'}
                    // );
                    break;
            }

            [err, result] = await formatPromiseResult(
                tools.metaRecordBuilderLDT3( {
                    recordType: 'request',
                    entries: entries,
                    xdt: ldt,
                    encoding: encodingUsed,
                    ignoreLen: false
                } )
            );

            if( err ) {
                Y.log( `generatePPackageHeaderVersion3: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }

            return result;
        };

        /**
         * API is WIP - see xdtVersions_ldt.server.js for german translation/etc.
         * @method generateLgRequest
         * @param {Object} args
         * @param {Object} args.ldt LDT version to use
         * @param {String} args.recordRequestId the request Id of this particular set of tests ( grouped by patient )
         * @param {Boolean} [args.subsequentReq] if the given record is a subsequent request to an already previously sent entry
         * @param {String} args.billingType possible values: ["P"]rivatpatient, ["X"] andere Rechnungsempfänger, ["E"]insender   ( invalid: ["K"]assenpatient )
         * @param {String} [args.BillingDoneBy] possible values: [lab/1] Labor, [doc/2] Einweiser
         * @param {String} [args.labClient] LANR/doc id
         * @param {Object} args.patient Patient object
         * @param {String} [args.patientAddInfo] short additional patient information
         * @param {Boolean} [args.sampleInfectious] if the given patient/sample will be infectious
         * @param {Boolean} [args.maternity]
         * @param {Boolean} [args.pregnancy]
         * @param {String} [args.pregnancyGestationLen] length in format WWD - weeks and days
         * @param {Date} [args.firstDayOfLastCycle]
         * @param {Array} [args.medicationTaken] list of medication names that was taken/active while the sample was taken
         * @param {String} [args.patientHeight]
         * @param {String} [args.patientWeight]
         * @param {String} args.feeSchedule [1] BMÄ, [2] EGO, [3] GOÄ 96, [4] BG-Tarif, [5] GOÄ 88
         * @param {Boolean} [args.budgetFree]
         * @param {Boolean} [args.testResultPathKnown] if pathologically known( ?)
         * @param {String} [args.sampleUrgency] [1] Notfall, [2] eilig
         *
         * @param {Array} [args.additionalWayFindings]
         * @param {String} args.additionalWayFindings.type [0] Papier [1] Telefon [2] Telefax [4] Mailbox [5] Praxis-Computer [7] Diskette
         * @param {String} [args.additionalWayFindings.number] number to be called for emergency case
         * @param {Array} [args.additionalRecipients] list of strings of additional recipients
         *
         * @param {Array} args.test list of test objects
         * @param {String} args.test.testId
         * @param {String} [args.test.testLabel]
         * @param {String} [args.test.sampleId]
         * @param {String} [args.test.sampleIndex]
         * @param {String} [args.test.sampleLabel]
         * @param {Array} [args.test.sampleSpec] array of strings
         * @param {String} [args.test.sampleColDate]
         * @param {String} [args.test.sampleAmountVal]
         * @param {String} args.test.sampleAmountUnit
         * @param {String} [args.test.sampleColSpan]
         * @param {Function} [cb]
         *
         * @returns {Array}
         */
        LdtApi.generateLgRequest = function generateLgRequest( args, cb ) {//TODO
            const genderMap = {
                "MALE": "M",
                "FEMALE": "W"
            };

            let ret = [
                {key: "recordRequestId", val: args.recordRequestId} // 8310
            ];

            if( args.subsequentReq ) { // 8313 X
                ret.push( {key: "subsequentReq", val: "1"} );
            }

            ret.push( {key: "billingType", val: args.billingType} ); // 8609

            switch( args.billingDoneBy ) { // 8614 X  1: Labor 2: Einweiser
                case 1:
                case "1":
                case "lab":
                    ret.push( {key: "BillingDoneBy", val: "0"} );
                    break;
                case 2:
                case "2":
                case "doc":
                    ret.push( {key: "BillingDoneBy", val: "1"} );
                    break;
            }

            ret.push(
                {key: "labClient", val: args.labClient, optional: true}, // 8615 X
                {key: "patientDob", val: moment( args.patient.kbvDob, "DD.MM.YYYY" ).toDate()}, // 3103
                {key: "patientGender", val: genderMap[args.patient.gender] || "U"}, // 3110
                {key: "patientAddInfo", val: args.patientAddInfo, optional: true} // 8405 X
            );

            if( args.sampleInfectious ) { // 8503 X
                ret.push( {key: "sampleInfectious", val: "1"} );
            }

            if( args.maternity ) { // 8424 X
                ret.push( {key: "maternity", val: "1"} );
            }

            if( args.pregnancy ) { // 8510 X
                ret.push( {key: "pregnancy", val: "1"} );
            } else {
                ret.push( {key: "pregnancy", val: "0"} );
            }

            ret.push( [
                {key: "pregnancyGestationLen", val: args.pregnancyGestationLen, optional: true}, // 8511 X
                {key: "firstDayOfCycle", val: args.firstDayOfLastCycle, optional: true} // 8512 X
            ] );

            for( let i = 0; args.medicationTaken && i < args.medicationTaken.length; i++ ) {
                ret.push( {key: "medicationTaken", val: args.medicationTaken[i]} ); // 8504 X
            }

            ret.push( [
                {key: "patientHeight", val: args.patientWeight, optional: true}, // 3622 X
                {key: "patientWeight", val: args.patientWeight, optional: true}, // 3623 X
                {key: "feeSchedule", val: args.feeSchedule} // 8403
            ] );

            if( args.budgetFree ) { // 8425 X
                ret.push( {key: "budgetFree", val: "1"} );
            }

            if( args.testResultPathKnown ) {  // 8423 X
                ret.push( {key: "testResultPathKnown", val: "1"} );
            }

            if( args.sampleUrgency ) { // 8501 X
                ret.push( {key: "sampleUrgency", val: args.sampleUrgency} );
                for( let j = 0; args.additionalWayFindings && j < args.additionalWayFindings.length; j++ ) {
                    ret.push( {key: "additionalWayFindings", val: args.additionalWayFindings.type} ); // 8611 X
                    ret.push( {key: "callNumber", val: args.additionalWayFindings.number} ); // 8612 X
                }
            }

            for( let k = 0; args.additionalRecipients && k < args.additionalRecipients.length; k++ ) {
                ret.push( {key: "additionalRecipients", val: args.additionalRecipients[k]} ); // 8613 X
            }

            for( let l = 0; l < args.test.length; l++ ) {
                const test = args.test[l];
                ret.push(
                    {key: "testId", val: test.testId}, // 8410
                    {key: "testLabel", val: test.testLabel, optional: true}, // 8411 X
                    {key: "sampleId", val: test.sampleId, optional: true}, // 8428 X
                    {key: "sampleIndex", val: test.sampleIndex, optional: true}, // 8429 X
                    {key: "sampleLabel", val: test.sampleLabel, optional: true} // 8430 X
                );

                for( let m = 0; m < args.test[l].sampleSpec.length; m++ ) {
                    ret.push( {key: "sampleSpec", val: args.test.sampleSpec[m]} ); // 8431 X
                }

                ret.push(
                    {key: "sampleColDate.date", val: test.sampleColDate, optional: true}, // 8432 X
                    {key: "sampleColDate.time", val: test.sampleColDate, optional: true}, // 8433 X
                    {key: "sampleAmountVal", val: test.sampleAmountVal, optional: true}, // 8520 X
                    {key: "sampleAmountUnit", val: test.sampleAmountUnit}, // 8521
                    {key: "sampleColSpan", val: test.sampleColSpan, optional: true}  // 8522 X
                );
            }

            return Y.doccirrus.api.xdtTools.metaRecordBuilder(
                "lgRequest",
                ret,
                args.ldt,
                encodingUsed,
                false,
                cb
            );
        };

        /**
         * @method generatePPackageHeader
         * @param {Object} args
         * @param {Object} args.ldt LDT version to use
         * @param {Object} args.location Location object
         * @param {Object} args.employee Employee object
         * @param {Array} [args.docAsv] ASV team numbers
         * @param {String} args.labName  lab descriptor( ?) or name
         * @param {String} [args.labStreet] street of the lab address
         * @param {String} [args.labZip] zip of the lab address
         * @param {String} [args.labCity] city of the lab address
         * @param {String} args.dcCustomerNo
         * @param {Array} [args.generalInformation]
         * @param {Function} [cb]
         *
         * @returns {Array}
         */
        LdtApi.generatePPackageHeader = function generatePPackageHeader( args, cb ) {//TODO
            const tools = Y.doccirrus.api.xdtTools;
            const customLocation = args.customLocation;
            const customEmployee = args.customEmployee;

            let ent = [
                {key: "ldtVersion", val: args.ldt.version}, // 9212
                {key: "bsnr", val: (customLocation && customLocation.commercialNo) || args.location.commercialNo}, // 0201
                {key: "bsnrDesc", val: (customLocation && customLocation.locname) || args.location.locname}, // 0203
                {key: "docLANR", val: (customEmployee && customEmployee.officialNo) || args.employee.officialNo}, // 0212
                {
                    key: "docName",
                    val: (customEmployee && `${customEmployee.firstname} ${customEmployee.lastname}`) || (`${args.employee.firstname} ${args.employee.lastname}`)
                } // 0211
            ];

            if( args.docAsv ) {
                for( let i = 0; i < args.docAsv.length; i++ ) {
                    ent.push( {key: "asvTeamNo", val: args.docAsv[i]} ); // 0222
                }
            }

            ent.push(
                {key: "bsnrStreet", val: (customLocation && customLocation.street) || args.location.street}, // 0205
                {key: "bsnrZip", val: (customLocation && customLocation.zip) || args.location.zip}, // 0215
                {key: "bsnrCity", val: (customLocation && customLocation.city) || args.location.city} // 0216
            );

            if( !args.labStreet && !args.labZip && !args.labAddress ) {
                ent.push( {key: "lab", val: args.labName} ); // 8300
            } else {
                ent.push(
                    {key: "labName", val: args.labName}, // 8320
                    {key: "labStreet", val: args.labStreet}, // 8321
                    {key: "labZip", val: args.labZip}, // 8322
                    {key: "labCity", val: args.labCity} // 8323
                );
            }

            return Y.doccirrus.api.xdtTools.metaRecordBuilder(
                "pPackageHeader",
                ent.concat( [
                    {key: "kbvValidationNo", val: Y.config.insuite.kbv.labCertNumber}, // 0101
                    {key: "encoding", val: tools.getEncodingId( encodingUsed, args.ldt )}, // 9106
                    {key: "customerNo", val: args.dcCustomerNo}, // 8312
                    {key: "dateOfCreation", val: new Date()}, // 9103
                    {key: "generalInformation", val: args.generalInformation, optional: true} // 9472
                    // 9300 not implemented
                    // 9301 not implemented
                ] ),
                args.ldt,
                encodingUsed,
                false,
                cb
            );
        };

        /**
         * @method generatePPackageHeaderVersion3
         * @param {Object} args
         * @param {Object} args.ldt LDT version to use
         * @param {Object} args.location Location object
         * @param {Object} args.employee Employee object
         * @param {Array} [args.docAsv] ASV team numbers
         * @param {String} args.labName  lab descriptor( ?) or name
         * @param {String} [args.labStreet] street of the lab address
         * @param {String} [args.labZip] zip of the lab address
         * @param {String} [args.labCity] city of the lab address
         * @param {String} args.dcCustomerNo
         * @param {Array} [args.generalInformation]
         *
         * @returns {Array}
         */
        LdtApi.generatePPackageHeaderVersion3 = async function generatePPackageHeaderVersion3( args ) {
            const
                {
                    customLocation,
                    customEmployee,
                    currentDate,
                    docAsv,
                    ldt
                } = args,
                asvTeamNumber = docAsv && docAsv.length && docAsv[0],
                tools = Y.doccirrus.api.xdtTools,
                pkg = Y.config.insuite;

            let
                err,
                result,
                entries = [];

            entries.push(
                {key: "8132", val: 'Kopfdaten'},
                {key: "8002", val: 'Obj_0032'},
                {key: '0001', val: ldt.version}, // Version der Datensatzbeschreibung
                {key: "8132", val: 'Sendendes_System'},
                {key: "8002", val: 'Obj_0051'},
                // {key: '8315', val: ''}, // ID des Empfängers
                {
                    key: '8316',
                    val: `${customEmployee.firstname} ${customEmployee.lastname}`
                }, // ID des Senders
                // {key: '0105', val: ''}, // KBV-Prüfnummer
                {key: "8132", val: 'Softwareverantwortlicher'},
                {key: "8002", val: 'Obj_0043'},
                {key: '1250', val: 'Doc-Cirrus'},
                {key: '1251', val: 'GmbH'},
                {
                    key: '1252', //Funktionsbezeichnung der Person innerhalb der Organisation
                    val: 'Support'
                },
                {key: "8147", val: 'Person'},
                {key: "8002", val: 'Obj_0047'},
                {key: '3101', val: 'Support'}, // Nachname
                {key: '3102', val: 'Doc-Cirrus'}, // Vorname
                {key: '8990', val: 'SU-0'}, // Namenskürzel / Namenszeichen
                {key: "8003", val: 'Obj_0047'},
                {key: "8003", val: 'Obj_0043'},
                {key: '0103', val: pkg.description}, //Software/Name der Software
                {key: '0132', val: pkg.version}, // Version/Releasestand der Software
                {key: "8003", val: 'Obj_0051'},
                {key: "8218", val: 'Timestamp_Erstellung_Datensatz'},
                {key: "8002", val: 'Obj_0054'},
                {key: '7278', val: currentDate}, // Datum des Timestamp
                {
                    key: '7279',
                    val: currentDate
                },
                {key: '7273', val: `UTC${currentDate.format( 'Z' ).replace( /0|:/g, '' )}`}, // Zeitzone
                {key: "8003", val: 'Obj_0054'},
                {key: "8003", val: 'Obj_0032'},
                {key: '7265', val: '1'}, // Absender des Datensatzes
                {key: "8122", val: 'Einsenderidentifikation'},
                {key: "8002", val: 'Obj_0022'},
                {key: '8312', val: customEmployee.officialNo}, // Kunden/Arzt Nummer
                {key: '7267', val: customEmployee._id}, // ID des Auftraggebers
                {key: "8114", val: 'Arztidentifikation'},
                {key: "8002", val: 'Obj_0014'},
                {key: "8147", val: 'Person'},
                {key: "8002", val: 'Obj_0047'},
                {key: '3101', val: customEmployee.lastname}, // Nachname
                {key: '3102', val: customEmployee.firstname}, // Vorname
                {key: '3103', val: moment( customEmployee.dob )}, // Geburtsdatum
                {key: '3104', val: customEmployee.title}, // Titel
                {key: '8990', val: customEmployee.initials}, // Namenskürzel / Namenszeichen
                {key: "8003", val: 'Obj_0047'},
                {key: '0212', val: ''}, // Lebenslange Arztnummer (LANR)
                // {key: '0223', val: ''}, // Pseudo-LANR für Krankenhausärzte im Rahmen der ASV-Abrechnung
                // {key: '0306', val: ''}, // Vertrags-ID des behandelnden Arztes
                {key: '0307', val: customEmployee._id}, // Arzt-ID eines Arztes
                {key: '0308', val: '9'}, // Typ der Arzt-ID
                {key: '0222', val: asvTeamNumber}, // ASV-Teamnummer
                {key: "8003", val: 'Obj_0014'},
                // {key: '7268', val: ''}, // Fachrichtung oder Stationskennung
                {key: "8119", val: 'Betriebsstaette'},
                {key: "8002", val: 'Obj_0019'},
                {key: '0204', val: '1'}, // Status der Betriebsstätte
                {key: '0203', val: customLocation.locname}, // (N)BSNR-Bezeichnung
                {key: '0200', val: customLocation._id}, // Betriebsstätten_ID
                {key: '0201', val: customLocation.commercialNo}, // Betriebs- (BSNR) oder Nebenbetriebsstättennummer(NBSNR)
                {key: "8003", val: 'Obj_0019'},
                {key: "8003", val: 'Obj_0022'}
            );

            [err, result] = await formatPromiseResult(
                tools.metaRecordBuilderLDT3( {
                    recordType: 'pPackageHeader',
                    entries: entries,
                    xdt: ldt,
                    encoding: encodingUsed,
                    ignoreLen: false
                } )
            );

            if( err ) {
                Y.log( `generateElTransactionVersion3: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }
            return result;
        };

        /**
         * @method generatePPackageFooter
         * @param {Object} args
         * @param {Object} args.ldt LDT version to use
         * @param {String} args.len length of all other records
         * @param {Function} [cb]
         *
         * @returns {Array}
         */
        LdtApi.generatePPackageFooter = function generatePPackageFooter( args, cb ) {
            const ldt = args.ldt;
            let len = args.len;
            len += ldt.sizeLen + ldt.sizeFk + ldt.sizeSatz + 2; //8000
            len += ldt.sizeLen + ldt.sizeFk + ldt.sizeRecLen + 2; //8100
            len += ldt.sizeLen + ldt.sizeFk + ldt.sizefileLen + 2; //9202

            return Y.doccirrus.api.xdtTools.metaRecordBuilder(
                "pPackageFooter",
                [{key: "sizeTotal", val: len, padStart: true, pad: "0"}],
                ldt,
                encodingUsed,
                false,
                cb
            );
        };

        /**
         * @method generatePPackageFooterVersion3
         * @param {Object} args
         * @param {Object} args.ldt LDT version to use
         * @param {String} args.checksum LDT version to use
         *
         * @returns {Array}
         */
        LdtApi.generatePPackageFooterVersion3 = async function generatePPackageFooterVersion3( args ) {
            const
                {
                    ldt,
                    checksum
                } = args;

            let
                err,
                result;

            [err, result] = await formatPromiseResult(
                tools.metaRecordBuilderLDT3( {
                    recordType: 'pPackageFooter',
                    entries: [
                        {key: '9300', val: checksum}
                    ],
                    xdt: ldt,
                    encoding: encodingUsed,
                    ignoreLen: false
                } )
            );

            if( err ) {
                Y.log( `generatePPackageFooterVersion3: ${err.stack || err}`, 'warn', NAME );
                throw err;
            }
            return result;
        };

        Y.namespace( 'doccirrus.api' ).ldt = LdtApi;

    },
    '0.0.1', {
        requires: [
            'inport-schema'
        ]
    }
);
