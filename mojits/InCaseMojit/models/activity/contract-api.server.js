/**
 * User: rrrw
 * Date: 02/06/2015  15:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jshint esnext:true */
/*global YUI*/


YUI.add( 'contract-api', function( Y, NAME ) {

        const {formatPromiseResult, promisifyArgsCallback, handleResult} = require( 'dc-core' ).utils;
        const virtualActivity = new Y.doccirrus.ActivityUtils('contract');
        const
            MATERIAL = 'MATERIAL',
            DRUGS = 'MEDIKAMENTE',  // latest customer requirement
            MX = new RegExp( MATERIAL + '::' ),
            DX = new RegExp( DRUGS + '::' ),
            KH_H = /^Honorar/,
            KH_P = /^Porto/,
            KH_L = /^Auslage/;

        const privateFactorsList = Y.doccirrus.schemas.person.types.BillingFactor_E.list.reduce( ( map, item )=> {
            map[item.val] = item.pvsVal;
            return map;
        }, {} );


        /**
         * Tells us if some treatment is purely a Sachkosten / Auslage entry.
         *
         * @param {Object} item treatment or schein
         * @return {"M" | "L" | "P"}
         */
        function isExpense( item ) {
            // need to in future also check fk5xxx fields etc.
            // currently this is just enough for MOJ-7079. Final solution with MOJ-7544.
            if ( "POST" === item.costType || MATERIAL === item.subType || MX.exec( item.content ) || KH_P.exec( item.code ) ){
                return 'P';
            }
            if( "MEDICATION" === item.costType || DRUGS === item.subType || DX.exec( item.content ) ) {
                return 'M';
            }
            if( "MATERIAL" === item.costType || KH_L.exec( item.code ) ) {
                return 'L';
            }
            return;
        }

        /**
         * Tells us if some treatment is purely a Honrar entry.
         *
         * @param {Object}  item treatment or schein
         * @return {Boolean}
         */
        function isFee( item ) {
            if(  "DOCTORFEE" === item.costType || KH_H.exec( item.code ) ) {
                return true;
            }
            return false;
        }

        /**
         * Get the list of Private contract types and return the PVS code
         * for each type.
         * @param  {String}     privateCode  e.g. "postbeamte"
         * @return {Number}  e.g. 30
         */
        function getPrivateContractPVSCode( privateCode ) {
            return privateFactorsList[ privateCode ] || 1;
        }

        /**
         * creates an summary for the case folder
         * if there is no schein in the folder then returns empty.
         *
         * @param {Object}      user
         * @param {String}      caseFolderId
         * @param {Function}    callback
         */
        function getFolderSummary( user, caseFolderId, callback ) {
            var
                async = require( 'async' ),
                myActTypes = ['MEDICATION', 'TREATMENT', 'INVOICE'],
                validStati = ['VALID','APPROVED','BILLED','PAID','PARTIALPAYMENT','REMINDED','WARN1','WARN2'];

            // helper to create summary object
            function createSummaryEntry( data ) {
                var
                    theSchein = data.schein,
                    theInsurance = Y.doccirrus.schemas.patient.getInsuranceByType( data.patient, data.caseFolderType ),
                    theInvoice = data.activities && data.activities.filter( function( item ) {
                            return 'INVOICE' === item.actType;
                        } ),
                    invoiceStati = theInvoice && theInvoice.length && theInvoice.map(function(item){
                        console.warn('billing status: ', item.status, Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'ActStatus_E', item && item.status, '-de', '' ));//eslint-disable-line
                            return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'ActStatus_E', item && item.status, '-de', '' );
                        }).filter( (i) => { return Boolean(i); }),
                    invoiceNos = theInvoice && theInvoice.length && theInvoice.map(function(item){
                            return item.invoiceNo;
                        }).filter( (i) => { return Boolean(i); }).join( '; ' ),
                    codes = data.activities && data.activities.map( function( item ) {
                            return item.code;
                        } ),
                    // sum of all DRUGS
                    drugCost = data.activities && data.activities.reduce( function( sum, item ) {
                            return (item.price &&
                                    'INVOICE' !== item.actType &&
                                    ( DRUGS === item.subType || DX.exec( item.content ) ) ) ?
                                item.price + sum : sum;
                        }, 0 ),
                    // sum of all MATERIAL
                    matCost = data.activities && data.activities.reduce( function( sum, item ) {
                            return (item.price &&
                                    'INVOICE' !== item.actType &&
                                    ( MATERIAL === item.subType || MX.exec( item.content ) ) ) ?
                            item.price + sum : sum;
                        }, 0 ),
                    // sum of all invoices
                    totalCost = data.activities && data.activities.reduce( function( sum, item ) {
                            return (item.price && 'INVOICE' === item.actType ) ? item.price + sum : sum;
                        }, 0 ),
                    subtotalCost = data.activities && data.activities.reduce( function( sum, item ) {
                            return (item.price && 'INVOICE' !== item.actType ) ? item.price + sum : sum;
                        }, 0 ),
                    treatCost = subtotalCost - matCost - drugCost,
                    moment = require( 'moment' ),
                    birthmom = moment.utc( data.patient.dob ).local(),
                    deathmom = data.patient.dateOfDeath && moment.utc( data.patient.dateOfDeath ).local(),
                    age = deathmom ? moment( deathmom ).diff( birthmom, 'years' ) : moment().diff( birthmom, 'years' ),
                    patientGender = Y.doccirrus.schemas.patient.mapGenderKBV( data.patient.gender ),
                    explanations = data.activities && data.activities.map( function( item ) {
                            var result;
                            if( 'TREATMENT' === item.actType ) {
                                if( item.explanations ) {
                                    result = item.explanations;
                                } else if( item.userContent &&
                                           item.userContent.indexOf( 'Begründung:' ) > 0 ) {
                                    result = item.userContent.substring( item.userContent.indexOf( 'Begründung:' ) );
                                }
                            }
                            return result;
                        } ),
                    factors = data.activities && data.activities.map( function( item ) {
                            return (item.billingFactorValue &&
                                    'TREATMENT' === item.actType ) ?
                                item.billingFactorValue : undefined;
                        } );
                console.warn('billing invoiceNos: ', invoiceNos);//eslint-disable-line

                invoiceStati = invoiceStati && invoiceStati.join( '; ' );
                if( 0===invoiceStati ) {
                    invoiceStati = undefined;
                }
                explanations = explanations.join( '; ' );
                factors = factors.join( '; ' );

                //console.log( theInvoice )
                return {
                    practiceName: data.practice && data.practice.coname,
                    practiceId: data.practice && data.practice.customerNo,
                    patientId: data.patient._id,
                    patientFirstName: data.patient.firstname,
                    patientLastName: data.patient.lastname,
                    patientDOB: data.patient.dob,
                    patientAge: age,
                    patientGender: patientGender,
                    employeeName: theSchein.employeeName,
                    explanations: explanations,
                    factors: factors,
                    invoiceNo: invoiceNos,
                    orderNo: theSchein.partnerInfo,
                    timestamp: theSchein.timestamp,
                    status: invoiceStati,
                    insuranceType: data.caseFolderType,
                    insuranceName: theInsurance && theInsurance.insuranceName,
                    debtCollection: theSchein.debtCollection,
                    orderAccounting: theSchein.orderAccounting,
                    agencyCost: theSchein.agencyCost,
                    scheinNotes: theSchein.scheinNotes,
                    order: theSchein.scheinOrder,
                    content: theSchein.content,
                    comment: theSchein.comment,
                    billingCodes: codes.join( ';' ),
                    treatCost: treatCost,
                    matCost: matCost,
                    drugCost: drugCost,
                    totalCost: totalCost,
                    tenantId: user.tenantId,
                    _id: theSchein.caseFolderId
                };
            }

            // get a past version of patient, if not found get the actual patient
            function getPatient( activity, _callback ) {
                Y.doccirrus.api.kbv.scheinRelatedPatientVersion( {
                    user: user,
                    data: {
                        schein: activity
                    },
                    callback: function( err, patient ) {
                        if( (err && '4052' !== err.code) || patient ) {
                            return _callback( err, patient );
                        }
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'patient',
                            query: {_id: activity.patientId}
                        }, function( err1, result ) {
                            _callback( err1, result && result[0] );
                        } );
                    }
                } );
            }

            // first get all the required data
            async.parallel( {
                    practice: function( cb ) {
                        Y.doccirrus.api.practice.getMyPractice( {
                            user: user,
                            callback: function( err, myPrac ) {
                                cb( err, myPrac );
                            }
                        } );
                    },
                    schein: function( cb ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'activity',
                            query: {
                                actType: {$in: virtualActivity.assignment},
                                caseFolderId: caseFolderId,
                                status: {$in: validStati}
                            },
                            callback: function( err, result ) {
                                cb( err, result && result[0] );
                            }
                        } );
                    },
                    activities: function( cb ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'activity',
                            options: {
                                select: {
                                    actType: true,
                                    code: true,
                                    price: true,
                                    invoiceNo: true,
                                    timestamp: true,
                                    subType: true,
                                    content: true,
                                    userContent: true,
                                    billingFactorValue: true,
                                    status:true,
                                    explanations: true
                                }
                            },
                            query: {
                                actType: {$in: myActTypes},
                                caseFolderId: caseFolderId
                                /*,  // we want to select all entries, because CANCELLED also important for overview.
                                status: {$in: validStati}*/
                            }
                        }, function( err, result ) {
                            cb( err, result );
                        } );
                    },
                    caseFolderType: function( cb ) { // TODO check for SELFPAYER?
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'casefolder',
                            query: {
                                _id: caseFolderId
                            }
                        }, function( err, result ) {
                            cb( err, result && result[0] && result[0].type );
                        } );
                    }
                },
                function gotAll( err, data ) {
                    // this way of billing is deprecated, correct solution is
                    // via inTouch, hence this hacky solution here.
                    let deleteResult = {
                        comment: "DELETED",
                        totalCost: 0,
                        tenantId: user.tenantId,
                        _id: caseFolderId};

                    if( err ) {
                        return callback( err );
                    }
                    if( !data.schein ) {
                        Y.log( 'no schein for the case folder: ' + caseFolderId, 'debug', NAME );
                        return callback(null, deleteResult);
                    }
                    getPatient( data.schein, function( err, patient ) {
                        var
                            summaryEntry;
                        if( err || !patient ) {
                            return callback( err || 'no patient exists behind the schein' );
                        }
                        data.patient = patient;
                        summaryEntry = createSummaryEntry( data );
                        //console.log( summaryEntry )
                        callback( null, summaryEntry ); // done
                    } );
                } );
        }

        /**
         * generate billings for the tenant
         * @param args
         * @param callback
         */

        Y.namespace( 'doccirrus.api' ).contract = {
            get: async function GET( args ) {
                Y.log( 'Entering Y.doccirrus.api.contract.get', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.contract.get' );
                }
                virtualActivity.filterActivity( args, 'get' );

                const getCb = args.callback;
                const get = promisifyArgsCallback( Y.doccirrus.api.activity.get );
                const scheinRelatedPatientVersion = promisifyArgsCallback( Y.doccirrus.api.kbv.scheinRelatedPatientVersion );

                let [err, results] = await formatPromiseResult( get( args ) );

                if( err ) {
                    return handleResult( err, undefined, getCb );
                }
                const contracts = results.result;

                Y.log( `populate public contracts with patientversion`, 'info', NAME );
                for( let contract of contracts ) {  // eslint-disable-line
                    // works only with pubic gkv scheins
                    if( contract.actType === 'SCHEIN' ) {
                        let patientVersion;
                        [err, patientVersion] = await formatPromiseResult( scheinRelatedPatientVersion( {
                            user: args.user,
                            originalParams: {
                                schein: contract
                            }
                        } ) );

                        if( err ) {
                            Y.log( `error while getting patient version for public  contract ${contract._id}`, 'warn', NAME );
                        }

                        contract.patientVersion = patientVersion || null;
                    } else {
                        let query = { patientId: contract.patientId },
                            patientVersions;

                        if( contract.scheinSettledDate ){
                            query.timestamp = {$lte: contract.scheinSettledDate};
                        }

                        [err, patientVersions] = await formatPromiseResult(
                            Y.doccirrus.mongodb.runDb( {
                                user: args.user,
                                model: 'patientversion',
                                query,
                                options: {
                                    sort: {
                                        timestamp: -1
                                    },
                                    limit: 1
                                }
                            } )
                        );
                        if( err ) {
                            Y.log( `error while getting patient version for non public contract ${contract._id}`, 'warn', NAME );
                        }

                        contract.patientVersion = patientVersions && patientVersions[0] || null;
                    }


                }

                return handleResult( null, results, getCb );
            },

            post: function POST( args ) {
                Y.log('Entering Y.doccirrus.api.contract.post', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.contract.post');
                }
                virtualActivity.filterActivity( args, 'post' );

                // 1. add casefolder
                var cfType,
                    cfText,
                    cfObj = {
                        title: null,
                        patientId: args.data.patientId,
                        type: null,
                        skipcheck_: true
                    };

                switch (args.data.actType) {
                    case 'SZSCHEIN':
                        cfType = 'SELFPAYER';
                        args.data.actType = 'PKVSCHEIN';
                        break;
                    case 'AMTSSCHEIN':
                        // a case folder for an AMTSSCHEIN is created in a post process of the AMTS care type => skip folder creation
                        return Y.doccirrus.api.activity.post( args );
                    default:
                        cfType = Y.doccirrus.schemas.casefolder.caseFolderTypeForSchein( args.data.actType );
                }

                if( !cfType ) {
                    //bad actType abort
                    args.callback( new Y.doccirrus.errors.rest( 400, 'Falsche Scheinart.', true ) );
                    return;
                }
                cfText = Y.doccirrus.schemaloader.getEnumListTranslation( 'person', 'Insurance_E', cfType, 'i18n', '' );

                // keep an existing title, or add a new one
                if( typeof cfObj.title !== "string" ) {
                    cfObj.title = args.data.scheinNotes + ' (' + cfText + ')' || cfType;
                }
                cfObj.type = cfType;

                Y.doccirrus.mongodb.runDb( {
                    action: 'post',
                    model: 'casefolder',
                    user: args.user,
                    data: cfObj,
                    callback: cbCF
                } );

                // 2. check BG SCHEIN for vertragsart
                if(
                    'BGSCHEIN' === args.data.actType &&
                    !args.data.uvGoaeType
                ) {
                    args.data.uvGoaeType = Y.doccirrus.schemas.activity.types.UvGoaeType_E.list[0].val;
                }

                /*jshint latedef:nofunc*/
                function cbCF( err, result ) {
                    if( err ) {
                        args.callback( new Y.doccirrus.errors.rest( 400, 'Fall nicht angelegbar.' ) ); // setup in error table!!
                        return;
                    }

                    args.data.caseFolderId = result[0];
                    // 2. check the LANR and BSNR pair -- not sure whether to do this here
                    //   or in the activity pre-process for all SCHEIN with the right code.
                    args.data = Y.doccirrus.filters.cleanDbObject( args.data );

                    if( '0102' === args.data.scheinType &&
                        args.data.scheinRemittor &&
                        args.data.scheinEstablishment

                    ) {
                        Y.log( 'Checking 0102 Schein for fitting BSNR and LANR.', 'info', NAME );
                        // TODO MOJ-5828: There is no need to check syntax of LANR here:
                        //    a syntactically invalid LANR or BSNR produces the error in
                        //    regular validation process, resulting in an error 400 being returned.
                        //    this means that
                        Y.doccirrus.api.kbv.checkLanrAndBsnr( {
                            query: {
                                lanr: args.data.scheinRemittor,
                                bsnr: args.data.scheinEstablishment
                            },
                            callback: function checkComplete( err, result ) {
                                if( err ) {
                                    return args.callback( new Y.doccirrus.errors.rest( 500, 'Datenbank Fehler.' ) );
                                } else if( result.exists ) {
                                    // 3. add the contract/schein
                                    Y.doccirrus.api.activity.post( args );
                                } else {
                                    let finalCallback = args.callback;
                                    let finalWarnings = [ new Y.doccirrus.commonerrors.DCError( 3099 ) ];
                                    args.callback = function addWarningCallback( err, result, warnings ) {
                                        var errors = [];
                                        if( Array.isArray( warnings ) ) {
                                            finalWarnings.concat( warnings );
                                        }
                                        if( err && err.name && 'ValidationError' === err.name ) {
                                            errors = Object.keys( err && err.errors || {} ).map( function( key ) {
                                                return {
                                                    message: err.errors[key] && err.errors[key].message || ''
                                                };
                                            } );
                                            finalCallback( null, {
                                                meta: {
                                                    errors: errors || [],
                                                    warnings: finalWarnings
                                                },
                                                data: result || {}
                                            } );
                                        } else {
                                            finalCallback( err, result, finalWarnings );
                                        }


                                    };
                                    Y.doccirrus.api.activity.post( args );
                                    //args.callback( new Y.doccirrus.errors.rest( 400, 'Falsche LANR oder BSNR.' ) );
                                }

                            }
                        } );

                    } else {
                        // 3. add the contract/schein
                        Y.doccirrus.api.activity.post( args );
                    }

                }
            },

            put: function PUT( args ) {
                Y.log('Entering Y.doccirrus.api.contract.put', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.contract.put');
                }
                virtualActivity.filterActivity( args, 'put' );
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                Y.doccirrus.api.activity.put( args );
            },

            upsert: function UPSERT( args ) {
                Y.log('Entering Y.doccirrus.api.contract.upsert', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.contract.upsert');
                }
                virtualActivity.filterActivity( args, 'upsert' );

                // 1. add casefolder
                var cfType,
                    cfText,
                    cfObj = {
                        title: null,
                        patientId: args.data.patientId,
                        type: null,
                        skipcheck_: true
                    };

                switch (args.data.actType) {
                    case 'SZSCHEIN':
                        cfType = 'SELFPAYER';
                        args.data.actType = 'PKVSCHEIN';
                        break;
                    case 'AMTSSCHEIN':
                        // a case folder for an AMTSSCHEIN is created in a post process of the AMTS care type => skip folder creation
                        return Y.doccirrus.api.activity.upsert( args );
                    default:
                        cfType = Y.doccirrus.schemas.casefolder.caseFolderTypeForSchein( args.data.actType );
                }

                if( !cfType ) {
                    //bad actType abort
                    args.callback( new Y.doccirrus.errors.rest( 400, 'Falsche Scheinart.', true ) );
                    return;
                }
                cfText = Y.doccirrus.schemaloader.getEnumListTranslation( 'person', 'Insurance_E', cfType, 'i18n', '' );

                // keep an existing title, or add a new one
                if( typeof cfObj.title !== "string" ) {
                    cfObj.title = args.data.scheinNotes + ' (' + cfText + ')' || cfType;
                }
                cfObj.type = cfType;

                Y.doccirrus.mongodb.runDb( {
                    action: 'post',
                    model: 'casefolder',
                    user: args.user,
                    data: cfObj,
                    callback: cbCF
                } );

                // 2. check BG SCHEIN for vertragsart
                if(
                    'BGSCHEIN' === args.data.actType &&
                    !args.data.uvGoaeType
                ) {
                    args.data.uvGoaeType = Y.doccirrus.schemas.activity.types.UvGoaeType_E.list[0].val;
                }

                /*jshint latedef:nofunc*/
                function cbCF( err, result ) {
                    if( err ) {
                        args.callback( new Y.doccirrus.errors.rest( 400, 'Fall nicht angelegbar.' ) ); // setup in error table!!
                        return;
                    }

                    args.data.caseFolderId = result[0];
                    args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                    Y.doccirrus.api.activity.upsert( args );
                }
            },

            'delete': function DELETE( args ) {
                Y.log('Entering Y.doccirrus.api.contract.delete', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.contract.delete');
                }
            var callback = args.callback;
                virtualActivity.filterActivity( args, 'delete' );
                // delete must return the deleted item
                args.callback = function deleteCb( err, result ) {
                    callback( err, result && result[0] && result[0].data && [result[0].data] );
                };
                Y.doccirrus.api.activity.delete( args );
            },

            getLastContractForActivity: async function getLastContractForActivityId( args ) {
                Y.log( 'Entering Y.doccirrus.api.contract.getLastContractForActivity', 'info', NAME );
                if( args.callback ) {
                    args.callback = require( `${ process.cwd() }/server/utils/logWrapping.js` )( Y, NAME )
                        .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.contract.getLastContractForActivity' );
                }

                const {user, query, options, callback} = args;
                const activityId = query && query.activityId;

                if( !activityId ) {
                    Y.log( `missing activityId param`, 'warn', NAME );
                    return handleResult( Y.doccirrus.errors.http( 500, 'invalid params' ), undefined, callback );
                }

                let [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    query: {
                        _id: activityId
                    },
                    options: {
                        limit: 1
                    }
                } ) );

                if( err ) {
                    Y.log( `could not get activity ${activityId}: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }

                if( !results.length ) {
                    Y.log( `could not find activity ${activityId}`, 'debug', NAME );
                    return handleResult( Y.doccirrus.errors.http( 404, 'activity not found' ), undefined, callback );
                }
                const activity = results[0];

                [err, results] = await formatPromiseResult( Y.doccirrus.api.contract.get( {
                    user,
                    query: {
                        actType: {$in: ['SCHEIN', 'PKVSCHEIN', 'BGSCHEIN']},
                        status: {$nin: ['CANCELED', 'INVALID']},
                        caseFolderId: activity.caseFolderId,
                        patientId: activity.patientId,
                        locationId: activity.locationId,
                        timestamp: {
                            $lt: activity.timestamp
                        }
                    },
                    options: Object.assign(options, {
                            sort: {
                                timestamp: -1
                            },
                            limit: 1
                        }
                    )
                } ) );

                if( err ) {
                    Y.log( `would not get last schein for activityId ${activityId}: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }

                return handleResult( null, results, callback );
            },
            /**
             * Get invoice ref activity of type INVOICEREFGKV or INVOICEREFPVS according to invoiceLogType KBV or PVS.
             * @param {Object}      args
             * @param {String}      args.patientId
             * @param {String}      args.invoiceLogId
             * @param {String}      args.invoiceLogType
             * @return {Promise<*>}
             */
            getInvoiceRef: async function( args ) {
                const {user, query, callback} = args;
                let errMsg;
                if( !query.invoiceLogId || !query.invoiceLogType || !query.patientId ) {
                    errMsg = 'insufficient params';
                    Y.log( errMsg, 'warn', NAME );
                    return handleResult( Y.doccirrus.errors.http( 400, errMsg ), undefined, callback );
                }
                let actType, logIdField;
                switch( query.invoiceLogType ) {
                    case 'KBV':
                        actType = 'INVOICEREFGKV';
                        logIdField = 'kbvlogId';
                        break;
                    case 'PVS':
                        actType = 'INVOICEREFPVS';
                        logIdField = 'pvslogId';
                        break;
                    default:
                        errMsg = `unknown invoice type: ${query.invoiceLogType}`;
                        Y.log( errMsg, 'warn', NAME );
                        return handleResult( Y.doccirrus.errors.http( 400, errMsg ), undefined, callback );
                }

                let [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'activity',
                    query: {
                        actType: actType,
                        patientId: query.patientId,
                        [logIdField]: query.invoiceLogId
                    },
                    options: {
                        limit: 1
                    }
                } ) );

                if( err ) {
                    Y.log( `could not get ${query.invoiceLogType} invoice ref ${query.invoiceLogId} for patient ${query.patientId}: ${err.stack || err}`, 'warn', NAME );
                    return handleResult( err, undefined, callback );
                }

                return handleResult( null, results, callback );
            },

            getPrivateContractPVSCode: getPrivateContractPVSCode,

            isTypeContract: function( type ) { return virtualActivity.isCorrectActType(type); },

            getFolderSummary: getFolderSummary,

            isExpense: isExpense,

            isFee: isFee,

            getLinkedActivities: function( args ) {
                return Y.doccirrus.api.activity.getActivitiesLinkedToContract( args );
            }
        };
    },
    '0.0.1', {
        requires: [
            'dcactivityutils', 'dcschemaloader', 'casefolder-schema', 'patient-schema'
        ]
    }
);
