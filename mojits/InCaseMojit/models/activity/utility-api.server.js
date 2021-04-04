/**
 * User: rrrw
 * Date: 29/01/2016  15:45
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'utility-api', function( Y, NAME ) {
        

        Y.log();

        const
            Promise = require( 'bluebird' ),
            makeUserContent = Y.doccirrus.kbvutilitycatalogcommonutils.makeUserContent,
            virtualActivity = new Y.doccirrus.ActivityUtils( 'utility' );

        function getAgreement( user, utilityData ) {
            let indicationCode = utilityData.comment;
            return new Promise( ( resolve, reject ) => {
                const
                    params = {
                        diagnosisGroup: indicationCode.replace( /[a-z]/, '' )
                    };

                if( utilityData.utIcdCode ) {
                    params.icd = utilityData.utIcdCode;
                }

                if( utilityData.utSecondIcdCode ) {
                    params.icd2 = utilityData.utSecondIcdCode;
                }


                Y.doccirrus.api.kbv.kvFromLocationId( {
                    user: user,
                    originalParams: {
                        locationId: utilityData.locationId
                    },
                    callback: ( err, kv ) => {
                        if( err ){
                            Y.log( `Error on getting kv for location ${utilityData.locationId}`, 'error', NAME );
                        }
                        params.kv = kv;
                        Y.doccirrus.api.catalog.getUtilityAgreement( {
                            user,
                            originalParams: params,
                            callback: ( err, result ) => {
                                if( err ) {
                                    reject( err );
                                } else {
                                    resolve( result );
                                }
                            }
                        } );
                    }
                } );

            } );
        }

        function checkAgreementType( agreementData, type ) {
            if( !agreementData ) {
                return false;
            }

            let agreementDataType = agreementData.heilmittel_liste && agreementData.heilmittel_liste[0] && agreementData.heilmittel_liste[0].anlage_heilmittelvereinbarung_value;
            return agreementDataType === type;
        }

        function mapUtilityList( list ) {
            return list.map( function( entry ) {
                return entry.name + (entry.seasons ? (' (' + entry.seasons + ')' ) : '');
            } ).join( ', ' );
        }

        function checkKbvUtility( args ) {
            const
                {user, originalParams, callback} = args,
                SU = Y.doccirrus.auth.getSUForLocal(),
                utilityData = originalParams && originalParams.utilityData,
                u_extra = {
                    normalCase: 'NO_NORMAL_CASE' !== utilityData.utPrescriptionType,
                    entry: null,
                    agreement: null,
                    utilities: null

                },
                u_extraUtilities = [],
                sdhm = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                    actType: 'KBVUTILITY',
                    short: 'SDHM'
                } ),
                warnings = [],
                indicationCode = utilityData.utIndicationCode,
                utilityList1 = utilityData.utRemedy1List,
                utilityList2 = utilityData.utRemedy2List;

            if( !indicationCode ) {
                warnings.push( new Y.doccirrus.commonerrors.DCError( 400, {
                    type: 'WARNING',
                    message: `Keine Prüfung der Inhalte konnte ausgeführt werden, da Indikationsschlüssel leer!`
                } ) );
                return callback( null, {
                    data: utilityData,
                    warnings: warnings
                } );
            }

            utilityData.comment = indicationCode;
            delete utilityData.utIndicationCode;

            Promise.resolve( Y.doccirrus.mongodb.runDb( {
                user: SU,
                model: 'catalog',
                query: {
                    catalog: sdhm.filename,
                    seq: indicationCode
                },
                options: {
                    lean: true,
                    limit: 1
                }
            } ) ).get( 0 ).then( entry => {

                // initial checks will fail fast

                if( !utilityData.subType ) {
                    throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'missing subType'} );
                }

                if( !['PHYSIO', 'ERGO', 'LOGO', 'ET'].includes( utilityData.subType ) ) {
                    throw new Y.doccirrus.commonerrors.DCError( 400, {message: `unknown subType ${utilityData.subType}`} );
                }

                if( !entry || !entry.heilmittelverordnung ) {
                    throw new Y.doccirrus.commonerrors.DCError( 400, {message: 'indication code not found'} );
                }

                if( !utilityData.userContent ) {
                    utilityData.userContent = makeUserContent( entry.leitsymptomatik_name, utilityData.utIcdCode, utilityData.utIcdText, utilityData.utSecondIcdCode, utilityData.utSecondIcdText );
                }

                if( !['FIRST', 'FOLLOWING', 'NO_NORMAL_CASE'].includes( utilityData.utPrescriptionType ) ) {
                    utilityData.utPrescriptionType = 'FIRST';
                }

                u_extra.entry = entry;

                const
                    utilityAttrs = [
                        'vorrangiges_heilmittel_liste',
                        'optionales_heilmittel_liste',
                        'ergaenzendes_heilmittel_liste',
                        'standardisierte_heilmittel_liste'],
                    heilmittelverordnung = entry.heilmittelverordnung,
                    checkUtilityList = ( utility ) => {
                        let found = Object.keys( heilmittelverordnung ).some( attrName => {
                            if( -1 === utilityAttrs.indexOf( attrName ) ) {
                                return false;
                            }

                            let utDetailList = heilmittelverordnung[attrName];

                            if( !utDetailList || !Array.isArray( utDetailList ) ) {
                                return false;
                            }

                            return utDetailList.some( ut => {
                                let fnd = ut.name === utility.name;
                                if( fnd ) {
                                    utility.type = ut.type; // normalize this field
                                    u_extraUtilities.push( ut );
                                }
                                return fnd;
                            } );
                        } );

                        if( !found ) {
                            warnings.push( new Y.doccirrus.commonerrors.DCError( 400, {
                                type: 'WARNING',
                                message: `Das Heilmittel ${utility.name} konnte nicht dem ausgewählten Indikations zugeordnet werden!`
                            } ) );
                        }

                        return found;
                    },
                    checkLogoUtilities = ( utilityState, utilityName ) => {
                        if( !utilityState ) {
                            return false;
                        }
                        let found = Object.keys( heilmittelverordnung ).some( attrName => {
                            if( -1 === utilityAttrs.indexOf( attrName ) ) {
                                return false;
                            }

                            let utDetailList = heilmittelverordnung[attrName];

                            if( !utDetailList || !Array.isArray( utDetailList ) ) {
                                return false;
                            }

                            return utDetailList.some( ut => {
                                let fnd = ut.name === utilityName;
                                if( fnd ) {
                                    u_extraUtilities.push( ut );
                                }
                                return fnd;
                            } );
                        } );

                        if( !found ) {
                            warnings.push( new Y.doccirrus.commonerrors.DCError( 400, {
                                type: 'WARNING',
                                message: `Das Heilmittel ${utilityName} konnte nicht dem ausgewählten Indikations zugeordnet werden!`
                            } ) );
                        }

                        return found;
                    };

                // check if selected utilities match indicationCode
                // if utility is not matched it will be removed and warning will be added
                if( 'LOGO' === utilityData.subType ) {
                    utilityData.utVocalTherapy = checkLogoUtilities( utilityData.utVocalTherapy, 'Stimmtherapie' );
                    utilityData.utSpeechTherapy = checkLogoUtilities( utilityData.utSpeechTherapy, 'Sprachtherapie' );
                    utilityData.utSpeakTherapy = checkLogoUtilities( utilityData.utSpeakTherapy, 'Sprechtherapie' );
                } else {
                    if( Array.isArray( utilityList1 ) ) {
                        utilityData.utRemedy1List = utilityList1.filter( checkUtilityList );
                        utilityData.utRemedy1Name = mapUtilityList( utilityData.utRemedy1List );
                    }
                    if( Array.isArray( utilityList2 ) ) {
                        utilityData.utRemedy2List = utilityList2.filter( checkUtilityList );
                        utilityData.utRemedy2Name = mapUtilityList( utilityData.utRemedy2List );
                    }
                }
                let isLogo = 0 === entry.kapitel.indexOf( 'II. ' );
                if( utilityData.utDurationOfSeason && !isLogo ) {
                    delete utilityData.utDurationOfSeason;
                } else if( utilityData.utDurationOfSeason && isLogo ) {
                    // must match one of the catalog entries
                    let list = entry.heilmittelverordnung && entry.heilmittelverordnung.therapiedauer_liste;
                    if( !list.some( ( entry ) => {
                            if( 'object' === typeof entry ) {
                                return entry.duration === '' + utilityData.utDurationOfSeason;
                            }
                            return entry === '' + utilityData.utDurationOfSeason;
                        } ) ) {
                        delete utilityData.utDurationOfSeason;
                    }
                }

                u_extra.utilities = u_extraUtilities;
                utilityData.u_extra = u_extra;
                return utilityData;
            } ).then( utilityData => {
                // check ICD-10 validity and sanitize icd texts
                const
                    icd10 = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                        actType: 'DIAGNOSIS',
                        short: 'ICD-10'
                    } ),
                    icdCodes = [utilityData.utIcdCode, utilityData.utSecondIcdCode].filter( Boolean );

                return Promise.resolve( Y.doccirrus.mongodb.runDb( {
                    user: SU,
                    model: 'catalog',
                    query: {
                        catalog: icd10.filename,
                        seq: {$in: icdCodes}
                    },
                    options: {
                        lean: true,
                        select: {
                            seq: 1,
                            title: 1
                        }
                    }
                } ) ).then( entries => {
                    let foundIcd1 = false,
                        foundIcd2 = false;

                    entries.forEach( entry => {
                        // only missing icd texts are set
                        if( entry.seq === utilityData.utIcdCode ) {
                            foundIcd1 = true;
                            if( !utilityData.utIcdText ) {
                                utilityData.utIcdText = entry.title;
                            }
                        }

                        if( entry.seq === utilityData.utSecondIcdCode ) {
                            foundIcd2 = true;
                            if( !utilityData.utSecondIcdText ) {
                                utilityData.utSecondIcdText = entry.title;
                            }
                        }
                    } );
                    if( false === foundIcd1 ) {
                        if( utilityData.utIcdCode ) {
                            warnings.push( new Y.doccirrus.commonerrors.DCError( 400, {
                                type: 'WARNING',
                                message: `Der ICD-10-Code ${utilityData.utIcdCode} existiert nicht in der Stammdatei und wurde gelöscht!`
                            } ) );

                        }
                        delete utilityData.utIcdCode;
                        delete utilityData.utIcdText;
                    }
                    if( false === foundIcd2 ) {
                        if( utilityData.utSecondIcdCode ) {
                            warnings.push( new Y.doccirrus.commonerrors.DCError( 400, {
                                type: 'WARNING',
                                message: `Der ICD-10-Code (Sekundär) ${utilityData.utSecondIcdCode} existiert nicht in der Stammdatei und wurde gelöscht!`
                            } ) );

                        }
                        delete utilityData.utSecondIcdCode;
                        delete utilityData.utSecondIcdText;
                    }

                    return utilityData;
                } );

            } ).then( utilityData => {
                // agreement with approval: indicationCode/icd combination may not exist
                if( -1 !== ['LHM', 'BVB'].indexOf( utilityData.utAgreement ) && utilityData.utAgreementApprovedTill ) {
                    if( utilityData.utAgreementApprovedCode ) {
                        // we consider codes with lower case letter as full indication code
                        utilityData.utAgreementApprovedCodeUseDiagnosisGroup = null === /[a-z]$/.exec( utilityData.utAgreementApprovedCode );
                    }
                } else if( -1 !== ['LHM', 'BVB'].indexOf( utilityData.utAgreement ) && !utilityData.utAgreementApprovedTill ) {
                    // check catalog for valid indicationCode/icd combination
                    return getAgreement( user, utilityData ).then( result => {
                        let agreementData = result && result.result && result.result[0] || null;
                        if( result && result.agreed && checkAgreementType( agreementData, utilityData.utAgreement ) ) {
                            // enhance u_extra with valid catalog agreement data
                            u_extra.agreement = agreementData;
                        } else {
                            // provide warning if no agreement found or agreement is not matching actual agreement type
                            warnings.push( new Y.doccirrus.commonerrors.DCError( 400, {
                                type: 'WARNING',
                                message: `Die Indikation/ICD-10-Kombination sieht keine Heilmittelvereinbarung ohne Genehmigung ${utilityData.utAgreement} vor!`
                            } ) );
                            u_extra.agreement = null;
                        }
                    } );
                }
                return utilityData;

            } ).then( result => {
                callback( null, {
                    data: result,
                    warnings: warnings
                } );
            } ).catch( err => {
                callback( err );
            } );

        }

        /**
         * generate billings for the tenant
         * @param args
         * @param callback
         */

        Y.namespace( 'doccirrus.api' ).utility = {
            get: function GET( args ) {
                Y.log('Entering Y.doccirrus.api.utility.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.utility.get');
                }
                virtualActivity.filterActivity( args, 'get' );
                Y.doccirrus.api.activity.get( args );
            },

            post: function POST( args ) {
                Y.log('Entering Y.doccirrus.api.utility.post', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.utility.post');
                }
                virtualActivity.filterActivity( args, 'post' );
                const
                    originalCallback = args.callback;

                // update some auto-generated fields
                args.data.catalog = true;  // need a good solution for this
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );

                if( 'UTILITY' === args.data.actType ) {
                    return args.callback( new Y.doccirrus.commonerrors.DCError( 405, {message: 'only read access'} ) );
                }

                checkKbvUtility( {
                    user: args.user,
                    originalParams: {
                        utilityData: args.data
                    },
                    callback: ( err, result ) => {
                        if( err ) {
                            args.callback( err );
                            return;
                        }
                        args.callback = function( err, results ) {
                            if( err ) {
                                return originalCallback( err );
                            }
                            originalCallback( null, {meta: {warnings: result.warnings, errors: []}, data: results} );
                        };
                        Y.doccirrus.api.activity.post( args );
                    }
                } );
            },

            put: function PUT( args ) {
                Y.log('Entering Y.doccirrus.api.utility.put', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.utility.put');
                }
                virtualActivity.filterActivity( args, 'put' );
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                if( 'UTILITY' === args.data.actType ) {
                    return args.callback( new Y.doccirrus.commonerrors.DCError( 405, {message: 'only read access'} ) );
                }

                Y.doccirrus.api.activity.put( args );
            },

            upsert: function UPSERT( args ) {
                Y.log('Entering Y.doccirrus.api.utility.upsert', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.utility.upsert');
                }
                virtualActivity.filterActivity( args, 'upsert' );
                args.data = Y.doccirrus.filters.cleanDbObject( args.data );
                if( 'UTILITY' === args.data.actType ) {
                    return args.callback( new Y.doccirrus.commonerrors.DCError( 405, {message: 'only read access'} ) );
                }

                Y.doccirrus.api.activity.upsert( args );
            },

            'delete': function DELETE( args ) {
                Y.log('Entering Y.doccirrus.api.utility.delete', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.utility.delete');
                }
                var
                    callback = args.callback;

                virtualActivity.filterActivity( args, 'delete' );
                // delete must return the deleted item
                args.callback = function deleteCb( err, result ) {
                    callback( err, result && result[0] && result[0].data && [result[0].data] );
                };
                Y.doccirrus.api.activity.delete( args );
            }
        };
    },
    '0.0.1', {
        requires: [
            'dcactivityutils', 'dcschemaloader', 'catalog-api', 'dccommonerrors', 'kbvutilitycatalogcommonutils'
        ]
    }
);
