/**
 * User: mahmoud
 * Date: 30/09/14  12:41
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/


YUI.add( 'company-api', function( Y, NAME ) {
        const {formatPromiseResult} = require( 'dc-core' ).utils;
        const uuid = require( 'node-uuid' );
        const NOT_A_TRIAL = 9999,
            UPDATE_TENANT_LIST = "UPDATE_TENANT_LIST";

        var
            YDC = Y.doccirrus,
            REG_PREFIX = '/rgnx?ccode=',
            i18n = Y.doccirrus.i18n,
            deleteTenantTimeout;

        function generateKeys( user, callback ) {
            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'admin',
                action: 'delete',
                query: {
                    _id: Y.doccirrus.schemas.admin.getKeyPairId()
                },
                options: {
                    override: true
                }
            }, function( err ) {
                if( err ) {
                    callback( err );
                    return;
                }
                Y.doccirrus.auth.generateKeysOnStartUp( user, callback );
            } );
        }

        /**
         * trialDaysLeft
         *
         * @param {Object} company the company (mongoose or not) document definig a company.
         * @returns {Number} the number of days left in the trial (positive number).  Can be a negative number (expired) or NOT_A_TRIAL constant.
         */
        function trialDaysLeft( company ) {
            var
                moment = require( 'moment' ),
                now = moment(),
                trialDates,
                daysLeft;

            trialDates = Y.doccirrus.schemas.company.getTrialDates( company );
            if( !trialDates.trialBegin ) {
                return NOT_A_TRIAL;
            }
            daysLeft = moment( trialDates.trialExpire ).diff( now, 'hours' ) / 24;
            daysLeft = daysLeft > 1 ? Math.floor( daysLeft ) : daysLeft; // we don't want something like 1.6 days! But like 0.5 is OK (to display in hours)
            return daysLeft;
        }

        function addTenantInfoToDCPRC( params, callback ) {
            let
                { user, newCompany = {} } = params,
                async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'practice',
                        action: 'get',
                        query: {},
                        options: {
                            lean: true,
                            select: {
                                dcCustomerNo: 1
                            },
                            limit: 1
                        }
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        if( !results.length ) {
                            Y.log( 'addTenantInfoToDCPRC. Practice collections is empty.', 'error', NAME );
                            return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Practice entry nor found' } ) );
                        }
                        next( null, results[ 0 ] );
                    } );
                },
                function( practice, next ) {
                    Y.log( 'Sending request to DCPRC to add new customer entry', 'info', NAME );
                    Y.doccirrus.https.externalPost( Y.doccirrus.auth.getDCPRCUrl( '/1/company/:addTenantInfo' ),
                        {
                            companyData: newCompany,
                            ownerDcCustomerNo: practice.dcCustomerNo
                        }, Object.assign( { errDataCallback: true }, Y.doccirrus.auth.setInternalAccessOptions() ),
                        next
                    );
                }
            ], callback );

        }

        function setVprcFQHostNameFromMVPRC( args ) {
            let
                { user, data: { vprcFQHostName } = {}, callback } = args,
                async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    //get active tenants from this MTS
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'company',
                        action: 'get',
                        query: {
                            activeState: true,
                            'prodServices.ps' : 'VPRC',
                            'prodServices.config.key': 'hostname'
                        }
                    }, ( err, res ) => {
                        if( err ) {
                            return next( err );
                        }
                        return next( null, res );
                    } );
                },
                function( companies, next ) {
                    //change hostname of inner tenants in prodServices
                    if( companies && companies.length ) {
                        async.eachSeries( companies, ( company, done ) => {
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                model: 'company',
                                action: 'update',
                                query: {
                                    _id: company._id,
                                    'prodServices.config.key': 'hostname'
                                },
                                data: {$set: {'prodServices.$[elem].config.$[elem1].value': `${company.tenantId}.${vprcFQHostName.replace( /^insuite./, '' )}`}},
                                options: {
                                    "arrayFilters": [{'elem.ps': 'VPRC'}, {'elem1.key': 'hostname'}]
                                }
                            }, ( err ) => {
                                if( err ) {
                                    Y.log( `Error while setting hostname value in prodServices for company ${company._id} : ${JSON.stringify( err )} `, 'error', NAME );
                                    return done( err );
                                }
                                return done();
                            } );
                        }, next );
                    } else {
                        return next();
                    }
                },
                function( next ) {
                //get current practice (MTS)
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'practice',
                        action: 'get',
                        query: {},
                        options: {
                            lean: true,
                            select: {
                                dcCustomerNo: 1
                            },
                            limit: 1
                        }
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        if( !results.length ) {
                            Y.log( 'setVprcFQHostNameFromMVPRC. Practice collections is empty.', 'error', NAME );
                            return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Practice entry not found' } ) );
                        }
                        next( null, results[ 0 ] );
                    } );
                },
                function( practice, next ) {
                //update vprcFQHostName in current practice
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'practice',
                        action: 'put',
                        query: {
                            _id: practice && practice._id
                        },
                        fields: [ 'vprcFQHostName' ],
                        data: Y.doccirrus.filters.cleanDbObject( {
                            vprcFQHostName: vprcFQHostName
                        } )
                    }, ( err ) => {
                        if( err ) {
                            Y.log( `Error while setting vprcFQHostName for practice ${practice._id} : ${JSON.stringify( err )} `, 'error', NAME );
                            return next( err );
                        }
                        next( null, practice );
                    } );
                },
                function( practice, next ) {
                //send external request to DCPRC to update vprcFQHostName of MTS
                    Y.log( 'Sending request to DCPRC to set new vprcFQHostName', 'info', NAME );
                    Y.doccirrus.https.externalPost( Y.doccirrus.auth.getDCPRCUrl( '/1/company/:setVprcFQHostName' ),
                        {
                            ownerDcCustomerNo: practice.dcCustomerNo,
                            vprcFQHostName: vprcFQHostName
                        }, Object.assign( { errDataCallback: true }, Y.doccirrus.auth.setInternalAccessOptions() ),
                        (err) => {
                            next( err );
                        }
                    );
                },
                function( next ) {
                    Y.doccirrus.auth.setVPRCHost( vprcFQHostName );
                    Y.doccirrus.api.partnerreg.registerOnPUC( null, next );
                    Y.log( 'Register changed hostname in metaprac', 'info', NAME );
                }
            ], callback );
        }

        function setVprcFQHostName( args ) {
                let
                    { user, data: { ownerDcCustomerNo, vprcFQHostName } = {}, callback } = args,
                    async = require( 'async' ),
                    company;
                if( !ownerDcCustomerNo ) {
                    Y.log( `setVprcFQHostName. Invalid params. ownerDcCustomerNo: ${ownerDcCustomerNo} is missing`, 'error', NAME );
                    return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'invalid params' } ) );
                }
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'company',
                            action: 'get',
                            query: {
                                dcCustomerNo: ownerDcCustomerNo
                            },
                            options: {
                                lean: true
                            }
                        }, ( err, results ) => {
                            if( err ) {
                                return next( err );
                            }
                            if( !results.length ) {
                                Y.log( `setVprcFQHostName. company with dcCustomerNo: ${ownerDcCustomerNo} does not exist`, 'error', NAME );
                                return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Company not found' } ) );
                            }
                            company = results[ 0 ];
                            next();
                        } );
                    },
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'company',
                            action: 'put',
                            query: {
                                _id: company._id
                            },
                            fields: [ 'vprcFQHostName', 'vprcFQHostnameOverrideFlag' ],
                            data: Y.doccirrus.filters.cleanDbObject( {
                                vprcFQHostName: vprcFQHostName,
                                vprcFQHostnameOverrideFlag: true
                            } )
                        }, ( err ) => {
                            next( err );
                        } );
                    }
                ], callback );



        }

        function deleteTenantInfoFromDCPRC( params, callback ) {
            let
                { user, dcCustomerNo } = params,
                async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'practice',
                        action: 'get',
                        query: {},
                        options: {
                            lean: true,
                            select: {
                                dcCustomerNo: 1
                            },
                            limit: 1
                        }
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        if( !results.length ) {
                            Y.log( 'deleteTenantInfoFromDCPRC. Practice collections is empty.', 'error', NAME );
                            return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Practice entry nor found' } ) );
                        }
                        next( null, results[ 0 ] );
                    } );
                },
                function( practice, next ) {
                    Y.log( 'Sending request to DCPRC to add new customer entry', 'info', NAME );
                    Y.doccirrus.https.externalPost( Y.doccirrus.auth.getDCPRCUrl( '/1/company/:deleteTenantInfo' ),
                        {
                            dcCustomerNo,
                            ownerDcCustomerNo: practice.dcCustomerNo
                        }, Object.assign( { errDataCallback: true }, Y.doccirrus.auth.setInternalAccessOptions() ),
                        next
                    );
                }
            ], callback );

        }

        function addTenantInfo( args ) {
            let
                { user, data: { companyData, ownerDcCustomerNo } = {}, callback } = args,
                { dcCustomerNo } = companyData,
                async = require( 'async' ),
                company;
            if( !ownerDcCustomerNo ) {
                Y.log( `addTenantInfo. Invalid params. ownerDcCustomerNo: ${ownerDcCustomerNo} is missing`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'invalid params' } ) );
            }
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'company',
                        action: 'get',
                        query: {
                            dcCustomerNo: ownerDcCustomerNo
                        },
                        options: {
                            lean: true,
                            select: {
                                tenants: 1
                            }
                        }
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        if( !results.length ) {
                            Y.log( `addTenantInfo. company with dcCustomerNo: ${ownerDcCustomerNo} does not exist`, 'error', NAME );
                            return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Company not found' } ) );
                        }
                        company = results[ 0 ];
                        next();
                    } );
                },
                function( next ) {
                    let
                        tenants = (company.tenants || []).filter( item => item.dcCustomerNo !== dcCustomerNo );
                    tenants.push( companyData );
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'company',
                        action: 'put',
                        query: {
                            _id: company._id
                        },
                        fields: [ 'tenants' ],
                        data: {
                            tenants,
                            skipcheck_: true
                        }
                    }, ( err ) => {
                        next( err, dcCustomerNo );
                    } );
                }
            ], callback );

        }

        function deleteTenantInfo( args ) {
            let
                { user, data: { dcCustomerNo, ownerDcCustomerNo } = {}, callback } = args,
                async = require( 'async' ),
                company;
            if( !ownerDcCustomerNo ) {
                Y.log( `deleteTenantInfo. Invalid params. ownerDcCustomerNo: ${ownerDcCustomerNo} is missing`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'invalid params' } ) );
            }
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'company',
                        action: 'get',
                        query: {
                            dcCustomerNo: ownerDcCustomerNo
                        },
                        options: {
                            lean: true,
                            select: {
                                tenants: 1
                            }
                        }
                    }, ( err, results ) => {
                        if( err ) {
                            return next( err );
                        }
                        if( !results.length ) {
                            Y.log( `deleteTenantInfo. company with dcCustomerNo: ${ownerDcCustomerNo} does not exist`, 'error', NAME );
                            return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Company not found' } ) );
                        }
                        company = results[ 0 ];
                        next();
                    } );
                },
                function( next ) {
                    let
                        tenants = (company.tenants || []).filter( item => item.dcCustomerNo !== dcCustomerNo );
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'company',
                        action: 'put',
                        query: {
                            _id: company._id
                        },
                        fields: [ 'tenants' ],
                        data: {
                            tenants,
                            skipcheck_: true
                        }
                    }, ( err ) => {
                        next( err, dcCustomerNo );
                    } );
                }
            ], callback );

        }

        function upgradeCompaniesInGroup( args ) {
            let
                { user, data: { groups, releaseAll, conames, emailText } = {}, callback } = args,
                moment = require( 'moment' ),
                async = require( 'async' ),
                query = { releaseGroup: { $in: groups } };

            if( releaseAll ) {
                query = {};
            }

            async.series( [
                function( done ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'put',
                        model: 'settings',
                        query: { _id: Y.doccirrus.schemas.settings.getDefaultSettings()._id },
                        data: Y.doccirrus.filters.cleanDbObject( {
                            upgradedGroups: groups,
                            upgrade: moment().format( 'DD.MM.YYYY' ),
                            conames: conames,
                            emailText: emailText,
                            currentVersion: Y.config.insuite && Y.config.insuite.version
                        } ),
                        fields: [ 'upgradedGroups', 'upgrade', 'currentVersion', 'conames', 'emailText' ]
                    }, function( err ) {
                        if( err ) {
                            return done( err );
                        }
                        return done();
                    } );
                },
                function( done ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'update',
                        model: 'company',
                        query: {},
                        data: { $unset: { 'licenseScope.0.upgrade': 1 } },
                        options: { multi: true }
                    }, ( err ) => {
                        if( err ) {
                            return done( err );
                        }
                        return done();
                    } );
                },
                function( done ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'update',
                        model: 'company',
                        query: query,
                        data: { $set: { 'licenseScope.0.upgrade': moment().format( 'DD.MM.YYYY' ) } },
                        options: { multi: true }
                    }, ( err ) => {
                        if( err ) {
                            return done( err );
                        }
                        return done();
                    } );
                },
                function( done ) {
                    let
                        domain = Y.doccirrus.auth.getPUCUrl( '' ).split( '.' ).splice( 1 ).join( '.' ),
                        today = moment().format( 'DD.MM.YYYY' ),
                        prcGroup = releaseAll ? 'ALLE' : groups.join( ', ' ),
                        emailParams;

                    conames = conames.map( function( item ) {
                        return '<li>' + item + '</li>';
                    } );

                    emailParams = {
                        serviceName: 'prcService',
                        to: 'doc-cirrus.com' === domain ? 'team@doc-cirrus.com' : 'dev@doc-cirrus.com',
                        subject: `Release Notification ${today}`,
                        text: '{emailText}<br> At {today}, {user} authorised the release of the current version in {domain} to PRC Group: { prcGroup }<br><ul>{ conames }</ul>'
                    };

                    emailParams.text = Y.Lang.sub( emailParams.text, {
                        emailText: emailText,
                        today: today,
                        user: user.U,
                        domain: domain,
                        prcGroup: prcGroup,
                        conames: conames.join( '' )
                    } );
                    emailParams = Y.doccirrus.email.createHtmlEmailMessage( emailParams );
                    Y.doccirrus.email.sendEmail( { ...emailParams, user }, done );

                }
            ], ( error ) => {
                if( error ) {
                    return callback( error );
                }
                callback( null );
            } );
        }

        function getNextDcCustomerNo( args ) {
            let
                { user, callback } = args;
            Y.doccirrus.api.sysnum.getNextDcCustomerNo( {
                user,
                callback
            } );
        }

        function getNextDcCustomerNoFromDCPRC( args ) {
            Y.log( 'Sending request to DCPRC for new dcCustomerNo', 'info', NAME );
            Y.doccirrus.https.externalPost( Y.doccirrus.auth.getDCPRCUrl( '/1/company/:getNextDcCustomerNo' ),
                {},
                Object.assign( { errDataCallback: true },
                    Y.doccirrus.auth.setInternalAccessOptions() ),
                args.callback
            );
        }

        /**
         * Helper. Copies INTIMECONNECT trial dates to licenseScope
         * @param {Object} company
         */
        function checkTrialDates( company ) {
            let
                licenseScope = company.licenseScope && company.licenseScope[ 0 ] || {};
            if( !licenseScope ) {
                return;
            }
            if( !licenseScope.trialExpire && !licenseScope.trialBegin && company.prodServices ) {
                company.prodServices.some( service => {
                    if( 'INTIMECONNECT' === service.ps ) {
                        licenseScope.trialExpire = service.to;
                        licenseScope.trialBegin = service.from;
                        return true;
                    }
                    return false;
                } );
            }
        }

        async function createCommissionKey( args ) {
            Y.log('Entering Y.doccirrus.api.company.createCommissionKey', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.createCommissionKey');
            }
            const DCError = Y.doccirrus.commonerrors.DCError;
            const {encryptData} = require( '../../../autoload/commission.server.js' );
            const {user, originalParams, callback} = args;

            if( !originalParams || !originalParams.companyId || !originalParams.systemId ) {
                callback( new DCError( 400, {message: 'invalid params'} ) );
                return;
            }
            const commissionKey = uuid.v1();
            const commissionKeyCreatedAt = new Date();
            let [err, result] = await formatPromiseResult( encryptData( {
                commissionKey: commissionKey,
                data: originalParams.systemId
            } ) );
            const encryptedSystemId = result;

            if( err ) {
                Y.log( `could not encrypt systemId with commission key for ${originalParams.companyId} with commission key ${commissionKey}: ${err.stack || err}`, 'error', NAME );
                callback( new DCError( 400 ) );
                return;
            }

            [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                action: 'put',
                model: 'company',
                user,
                query: {
                    _id: originalParams.companyId
                },
                fields: ['commissionKey', 'commissionKeyCreatedAt', 'encryptedSystemId'],
                data: {
                    commissionKey,
                    commissionKeyCreatedAt,
                    encryptedSystemId,
                    skipcheck_: true
                }
            } ) );

            if( err ) {
                Y.log( `could not create commission key for ${originalParams.companyId}`, 'error', NAME );
                callback( err );
                return;
            }

            callback( null, result );
        }

        async function removeCommissionKey( args ) {
            Y.log('Entering Y.doccirrus.api.company.removeCommissionKey', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.removeCommissionKey');
            }
            const DCError = Y.doccirrus.commonerrors.DCError;
            const {user, originalParams, callback} = args;

            if( !originalParams || !originalParams.companyId ) {
                callback( new DCError( 400, {message: 'invalid params'} ) );
                return;
            }

            let [err, result] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                action: 'put',
                model: 'company',
                user,
                query: {
                    _id: originalParams.companyId
                },
                fields: ['commissionKey', 'commissionKeyCreatedAt', 'encryptedSystemId'],
                data: {
                    commissionKey: null,
                    commissionKeyCreatedAt: null,
                    encryptedSystemId: null,
                    skipcheck_: true
                }
            } ) );

            if( err ) {
                Y.log( `could not remove commission key: ${err.stack || err}`, 'error', NAME );
                return;

            }

            callback( null, result );
        }

        /**
         * Gets correct company(s) data
         *  include trial date check
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Object} args.options
         * @param {Function} args.callback
         */
        function getCompany( args ) {
            var
                user = args.user,
                query = args.query,
                options = args.options || {},
                callback = args.callback;
            options.lean = true;

            Y.doccirrus.mongodb.runDb( {
                action: 'get',
                model: 'company',
                user: user,
                query: query,
                options: options
            }, function( err, results ) {
                let
                    companies;
                if( err ) {
                    return callback( err );
                }
                if( results.result ) {
                    companies = results.result;
                } else {
                    companies = results;
                }
                companies.forEach( checkTrialDates );
                callback( err, results );

            } );
        }

        /**
         * FIXME EXTMOJ-626
         * Sets systemType to PRC
         * deletes tenant db on vprc
         * set prodService to []
         * @param {Object} args
         * @param {Object} args.query
         * @param {Array} args.companyIds array of company _id's
         * @param {Object} args.user
         * @param {Function} args.callback
         *
         * @return {Function} callback
         */
        function transformToPRC( args ) {
            let
                // user = args.user,
                // query = args.query || {},
                callback = args.callback;
            // async = require( 'async' );
            Y.log( 'transformToPRC. this method should be changed according new logic.', 'error', NAME );
            // FIXME remove after fix

            return callback( new Y.doccirrus.commonerrors.DCError( 501 ) );

            // if( !query.companyIds ) {
            //     Y.log( `transformToPRC. companyIds is missing`, 'error', NAME );
            //     return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'missing companyIds' } ) );
            // }
            // function transformCompany( company, done ) {
            //     async.series( [
            //         function( next ) {
            //             var tenantData = {
            //                 secret: Y.doccirrus.auth.getDCPRCSecret(),
            //                 companyId: company._id.toString(),
            //                 tenantId: company.tenantId
            //             };
            //                 var vprcUrl = Y.doccirrus.auth.getVPRCUrl( '/1/company/:deleteTenantDb' );
            //                 Y.log( 'Sending delete tenant request, via ' + vprcUrl, 'debug', NAME );
            //
            //                 Y.doccirrus.https.externalPost( vprcUrl,
            //                     tenantData, Y.doccirrus.auth.setInternalAccessOptions(), next );
            //         },
            //         function( next ) {
            //             Y.doccirrus.mongodb.runDb( {
            //                 user: user,
            //                 model: 'company',
            //                 action: 'put',
            //                 fields: [ 'systemType', 'prodServices', 'serverType' ],
            //                 query: {
            //                     _id: company._id
            //                 },
            //                 data: Y.doccirrus.filters.cleanDbObject( {
            //                     systemType: Y.doccirrus.schemas.company.systemTypes.APPLIANCE,
            //                     serverType: Y.doccirrus.schemas.company.serverTypes.PRC,
            //                     prodServices: []
            //                 } )
            //             }, next );
            //         }
            //     ], done );
            // }
            //
            // async.waterfall( [
            //     function( next ) {
            //         Y.doccirrus.mongodb.runDb( {
            //             user: user,
            //             model: 'company',
            //             action: 'get',
            //             query: {
            //                 _id: { $in: query.companyIds }
            //             },
            //             options: {
            //                 lean: true,
            //                 select: {
            //                     tenantId: 1
            //                 }
            //             }
            //         }, next );
            //     },
            //     function( companies, next ) {
            //         async.each( companies, transformCompany, next );
            //     }
            // ], callback );
        }

        /**
         * Gets full company data which includes company, centralContact, supportContact
         * @method getCompanyData
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.query
         * @param {Function} args.callback
         */
        function getCompanyData( args ) {
            var
                { user, query, callback } = args,
                async = require( 'async' ),
                result = [];

            if( !query.deleted ) {
                query.deleted = { $ne: true };
            }

            function getAdditionalData( company, callback ) {
                let
                    companyData = {
                        company
                    };

                delete company.user_;
                result.push( companyData );
                company.licenseScope = [
                    Y.doccirrus.schemas.settings.getCleanLicenseData( company.licenseScope && company.licenseScope[ 0 ] )
                ];
                async.parallel( {
                    centralContact( done ) {
                        if( !company.centralContact ) {
                            return setImmediate( done );
                        }
                        Y.doccirrus.api.contact.get( {
                            user,
                            query: {
                                _id: company.centralContact
                            },
                            options: {
                                lean: true
                            },
                            callback( err, results ) {
                                if( err ) {
                                    Y.log( `getCompanyData: Could not get central contact for company data: ${err.stack||err}`, 'error', NAME );
                                    return done( err );
                                }
                                done( null, results[ 0 ] );
                            }
                        } );
                    },
                    supportContact( done ) {
                        if( !company.supportContact ) {
                            return setImmediate( done );
                        }
                        Y.doccirrus.api.basecontact.getSupportContact( {
                            user,
                            query: {
                                _id: company.supportContact
                            },
                            options: {
                                lean: true
                            },
                            callback( err, results ) {
                                if( err ) {
                                    Y.log( `getCompanyData: Could not get support contact for company data: ${err.stack||err}`, 'error', NAME );
                                    return done( err );
                                }
                                done( null, results[ 0 ] );
                            }
                        } );
                    }
                }, ( err, results ) => {
                    if( err ) {
                        return callback( err );
                    }
                    if( results.supportContact ) {
                        delete results.supportContact.user_;
                    }
                    if( results.centralContact ) {
                        delete results.centralContact.user_;
                    }
                    companyData.supportContact = results.supportContact;
                    companyData.centralContact = results.centralContact;
                    callback();
                } );
            }

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.api.company.get( {
                        user: user,
                        query: query,
                        options: {
                            lean: true
                        },
                        callback: next
                    } );
                },
                function( companies, next ) {
                    companies.forEach( checkTrialDates );
                    async.eachSeries( companies, getAdditionalData, next );
                }
            ], ( err ) => {
                if ( err ) {
                    Y.log( `getCompanyData: Problem getting company data: ${err.stack||err}`, 'error', NAME );
                }
                callback( err, result );
            } );

        }

        function deactivateIdentity( tenantId, callback ) {
            let
                dbUser = Y.doccirrus.auth.getSUForTenant( tenantId ),
                async = require( 'async' );
            Y.log( 'Entering deactivateIdentity ...', 'info', NAME );
            async.waterfall( [
                function( next ) {
                    /**
                     * first check if it exists, to prevent creating a empty tenant
                     */
                    Y.doccirrus.mongodb.existsDbForTenant( tenantId, next );
                },
                function( exists, next ) {
                    if( exists ) {
                        return Y.doccirrus.mongodb.runDb( {
                                user: dbUser,
                                action: 'put',
                                model: 'identity',
                                fields: 'status',
                                query: {},
                                data: { status: 'INACTIVE', skipcheck_: true, multi_: true }
                            }, ( err ) => {
                                if( err ) {
                                    Y.log( `deactivateTenant. error during identity deactivation: ${JSON.stringify( err )}`, 'error', NAME );
                                    return next( err );
                                }
                                next();
                            }
                        );
                    }
                    setImmediate( next );
                }
            ], callback );
        }

        function deactivateTenant( args ) {

            var
                async = require( 'async' ),
                { user, callback, data } = args;

            if( !Y.doccirrus.auth.hasAPIAccess( args.user, 'company.all' ) ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 401 ) );
            }

            if( !data._id ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Invalid Params' } ) );
            }

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.api.company.get( {
                        user,
                        query: { '_id': data._id },
                        callback( err, results ) {
                            if( err ) {
                                return next( err );
                            }
                            if( !results[ 0 ] ) {
                                return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Company not found' } ) );
                            }
                            return next( null, results[ 0 ] );
                        }
                    } );
                },
                function( company, next ) {
                    deleteTenantInfoFromDCPRC( {
                        user,
                        dcCustomerNo: company.dcCustomerNo
                    }, ( err ) => {
                        next( err, company );
                    } );
                },
                function( company, next ) {
                    /**
                     * deactivateTenant just deactivate the first user of the tenant
                     */
                    Y.log( `Deactivating the customer: ${company.customerNo}`, 'info', NAME );
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'company',
                        action: 'put',
                        fields: [ 'activeState' ],
                        query: { _id: company._id },
                        data: { activeState: false, skipcheck_: true }
                    }, ( err ) => {
                        if( err ) {
                            Y.log( `deactivateTenant. Can not deactivate customer with _id: ${company._id}. Error: ${JSON.stringify( err )}`, 'error', NAME );
                            return next( err );
                        }
                        next( null, company );
                    } );
                },
                function( company, next ) {
                    deactivateIdentity( company.tenantId, next );
                }
            ], callback );

        }

        function cleanIds( obj ) {
            if( !obj ) {
                return;
            }
            if( obj.user_ ) {
                delete obj.user_;
            }
            if( obj._id && 'object' === typeof obj._id ) {
                obj._id = obj._id.toString();
            }
            Object.keys( obj ).forEach( key => {
                let
                    value = obj[ key ];
                if( 'object' === typeof value ) {
                    cleanIds( value );
                }
            } );
        }

        function getEmailTextBuilder( greetings, trialLoginLink ) {
            return function() {
                return greetings + '\n\n' +
                       i18n( 'CRMMojit.company_api_serverJS.PART1' ) + '\n\n' +
                       trialLoginLink + '\n\n' +
                       i18n( 'CRMMojit.company_api_serverJS.PART2' ) + '\n\n' +
                       i18n( 'CRMMojit.company_api_serverJS.BUTTOMLINE' ) + '\n\n\n' +
                       i18n( 'CRMMojit.company_api_serverJS.PS' ) + '\n';
            };
        }

        function sendMail( data, callback ) {
            let
                { user, tenantId, emailAddress, identity, dcCustomerNo, coname, isTrial, emailConfig, activeDays, mixedResult } = data,
                firstLoginLink = identity.pwResetToken && Y.doccirrus.auth.getPRCUrl( '/login/first?token=' + encodeURIComponent( identity.pwResetToken ) +
                                                                                      '&id=' + (identity.specifiedBy && identity.specifiedBy.toString()), tenantId ),
                loginLink2 = Y.doccirrus.auth.getPRCUrl( '/login', tenantId ),
                message = { text: '', to: '', subject: '' };

            message.replyTo = emailConfig.registrationService.from;
            message.from = emailConfig.registrationService.from;
            message.to = emailAddress;

            if( isTrial ) {
                let
                    greetings = ('MS' === mixedResult.centralContact.talk) ? 'Sehr geehrte Frau' : 'Sehr geehrter Herr',
                    trialLoginLink,
                    jadeParams,
                    messageParams;

                trialLoginLink = Y.doccirrus.auth.getWWWUrl( '/triallogin?loginUrl=' + encodeURIComponent( loginLink2 ) );
                trialLoginLink += '?trial=1';
                greetings = greetings + ' ' + mixedResult.centralContact.lastname + ',';

                jadeParams = {
                    link: trialLoginLink
                };

                // escape non-ASCII characters before rendering into html
                jadeParams.greetings = Y.doccirrus.commonutils.toHTMLEscaped( greetings );
                jadeParams.PART1 = Y.doccirrus.commonutils.toHTMLEscaped( i18n( 'CRMMojit.company_api_serverJS.PART1' ) );
                jadeParams.PART2 = Y.doccirrus.commonutils.toHTMLEscaped( i18n( 'CRMMojit.company_api_serverJS.PART2' ) );
                jadeParams.BUTTON_LOGIN = Y.doccirrus.commonutils.toHTMLEscaped( i18n( 'CRMMojit.company_api_serverJS.BUTTON_LOGIN' ) );
                jadeParams.BUTTOMLINE = Y.doccirrus.commonutils.toHTMLEscaped( i18n( 'CRMMojit.company_api_serverJS.BUTTOMLINE' ) );

                messageParams = {
                    serviceName: 'registrationService',
                    jadeParams: jadeParams,
                    jadePath: './mojits/CRMMojit/views/activationemail.jade.html',
                    replyTo: emailConfig.registrationService.from,
                    from: emailConfig.registrationService.from,
                    to: emailAddress,
                    subject: i18n( 'CRMMojit.company_api_serverJS.SUBJECT' ),
                    textBuilder: getEmailTextBuilder( greetings, trialLoginLink ),
                    attachments: []
                };

                message = Y.doccirrus.email.createHtmlEmailMessage( messageParams );

            } else {
                message.text = 'Automatische Mitteilung:\n\n' +
                               (dcCustomerNo ? 'Ihre Kundennummer bei Doc Cirrus lautet: ' + dcCustomerNo + '\n\n' : '') + // MVPRC doesn't have it
                               (firstLoginLink ? ('Für die erstmalige Anmeldung gehen Sie bitte zu folgendem Link: \n\n' + firstLoginLink + '\n\n' +
                               'Anschliessend werden Sie auf die Login Seite weitergeleitet. Auf der\n ' +
                               'Login Seite können Sie sich dann mit Ihrem Benutzernamen und Passwort\n' +
                               'anmelden.\n\n') : '') +
                               'Ihr Benutzername lautet: ' + identity.username + '\n\n' +
                               'Für Ihre künftige Anmeldung verwenden Sie bitte den direkten Link:' + '\n\n' +
                               loginLink2 + '\n\n' +
                               /*'oder alternativ den allgemeinen Link unter zusätzlicher Angabe Ihrer Kundennummer:' + '\n\n' +
                                loginLink3 + '\n\n' +*/
                               'Bitte bewahren Sie Ihre Anmeldedaten an einem sicheren Ort auf.\n' +
                               'Bitte geben Sie diese E-Mail unter keinen Umständen an Dritte weiter.\n\n' +
                               'Ihr Doc Cirrus Registrierungsdienst\n';
                message.subject = 'Freischaltung Ihres Doc Cirrus Dienstes';
            }

            Y.doccirrus.email.sendEmail( { ...message, user }, function( err ) {
                if( err ) {
                    Y.log( 'problem sending email to tenant customer: ' + JSON.stringify( err ), 'error', NAME );
                    return callback( err );
                }
                setTimeout( function() {
                    informDC( { user, coname, dcCustomerNo, tenantId, emailConfig, activeDays }, ( err ) => {
                        if( err ) {
                            Y.log( `Could not send informDC email`, 'error', NAME );
                        } else {
                            Y.log( `informDC email was sent`, 'info', NAME );
                        }
                    } );
                }, 5000 );
                callback( null, dcCustomerNo );

            } );
        }

        function informDC( config, callback ) {
            let
                { user, coname, dcCustomerNo, tenantId, emailConfig, activeDays } = config,
                message = {};
            if( emailConfig && emailConfig.dcInfoService_trial ) {
                message.from = emailConfig.dcInfoService_trial.from;
                message.to = emailConfig.dcInfoService_trial.to;
                message.noBcc = true;
                message.subject = 'Tenant activated for ' + coname;
                message.text = 'The tenant ' + tenantId + ' was activated/extended for ' + activeDays + ' days.' +
                               '\ndcCustomerNo: ' + dcCustomerNo;
                Y.doccirrus.email.sendEmail( { ...message, user }, callback );
            }

        }

        /**
         * Activates tenant.
         * @method activateTenant
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {Number} args.data.days
         * @param {String} [args.data.templateTenantId]
         * @param {String} args.data._id company id
         * @param {Function} args.callback
         * @return {Function} callback
         */
        function activateTenant( args ) {
            const
                { user, callback, data: params = {} } = args,
                { config: emailConfig } = require( 'dc-core' ).config.load( process.cwd() + '/email.json' ) || {},
                MAX_ACTIVE_DAYS = 1825,
                templateTenantId = (!params.templateTenantId && 0 !== params.templateTenantId) ? null : params.templateTenantId,
                async = require( 'async' );
            let
                isTrial = false,
                activeDays = Math.min( params.days, MAX_ACTIVE_DAYS ),
                mixedResult = {
                    secret: Y.doccirrus.auth.getDCPRCSecret(),
                    templateTenantId: templateTenantId  // if not empty the new tenant will be a soft copy of template tenant
                };

            if( !Y.doccirrus.auth.hasAPIAccess( args.user, 'company.all' ) ) {
                Y.log( 'activateTenant. User does not have permission.', 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 401 ) );
            }

            // check _id is set
            if( !params._id ) {
                Y.log( 'activateTenant. Invalid Params.', 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Invalid Params' } ) );
            }

            Y.log( `activateTenant. Starting initialization of company with id: ${params._id}`, 'info', NAME );
            async.waterfall( [
                function( next ) {
                    /**
                     * get company data (inc. central contact and support contact).
                     */
                    Y.doccirrus.api.company.getCompanyData( {
                        user,
                        query: { _id: params._id },
                        callback( err, results ) {
                            let
                                company;
                            if( err ) {
                                Y.log( `activateTenant. Can not get company with id: ${params._id}`, 'error', NAME );
                                return next( err );
                            }
                            if( !results[ 0 ] ) {
                                Y.log( `activateTenant. Company with id: ${params._id} not found`, 'error', NAME );
                                return next( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Company not found' } ) );
                            }
                            company = results[ 0 ].company;

                            company.supportContact = results[ 0 ].supportContact;
                            company.centralContact = results[ 0 ].centralContact;
                            mixedResult.company = company;
                            mixedResult.centralContact = company.centralContact;
                            mixedResult.supportContact = company.supportContact;

                            cleanIds( mixedResult );
                            if( !mixedResult.company.communications || !mixedResult.company.communications[ 0 ] ) {
                                mixedResult.company.communications = mixedResult.centralContact.communications || [];
                            }
                            return next();
                        }
                    } );
                },
                function( next ) {
                    /**
                     * initialize tenant
                     */
                    Y.doccirrus.api.company.initializeTenant( {
                        data: mixedResult,
                        callback: function( err, result ) {
                            if( err ) {
                                Y.log( `activateTenant. error from initializeTenant: ${JSON.stringify( err )}`, 'error', NAME );
                                return next( err );
                            }

                            if( !result ) {
                                Y.log( 'activateTenant. error from initializeTenant: no identity', 'error', NAME );
                                return next( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Identity could not be created.' } ) );
                            }
                            next( null, result );

                        }
                    } );
                },
                function registerOnPUC( identity, next ) {
                    Y.doccirrus.api.partnerreg.registerOnPUC( Y.doccirrus.auth.getSUForTenant( mixedResult.company.tenantId ), ( err ) => {
                        next( err, identity );
                    } );
                },
                function registerOnDCPRC( identity, next ) {
                    /**
                     * update company
                     */
                    let
                        company = mixedResult.company,
                        tenantId = company.tenantId,
                        VPRCConf = {
                            "ps": "VPRC",
                            "config": [
                                {
                                    "key": "hostname",
                                    "value": `${tenantId}.${Y.doccirrus.auth.getCurrentDomain()}`
                                }
                            ]
                        },
                        trialService,
                        now = require( 'moment' )();
                    if( company.deleted ) {
                        company.deleted = false;
                    }

                    if( 0 === activeDays ) {
                        activeDays = MAX_ACTIVE_DAYS;
                    }

                    company.prodServices.some( service => {
                        if( 'VPRC' === service.ps ) {
                            let
                                hostnameConfig = service.config.find( item => "hostname" === item.key );
                            if( hostnameConfig ) {
                                hostnameConfig.value = `${tenantId}.${Y.doccirrus.auth.getCurrentDomain()}`;
                            } else {
                                service.config.push( VPRCConf.config[ 0 ] );
                            }
                            VPRCConf = null;
                            return true;
                        }
                        return false;
                    } );

                    trialService = Y.doccirrus.schemas.company.getTrialService( company );
                    // check for cases when licenseScope is not set
                    if( !trialService ) {
                        company.licenseScope = company.licenseScope || [];
                        trialService = Y.doccirrus.schemas.settings.getCleanLicenseData();
                        company.licenseScope.push( trialService );
                    }

                    trialService.trialBegin = now.toJSON(); // activation time
                    trialService.trialExpire = now.endOf( 'day' ).add( 'day', activeDays ).toJSON();  // expiration time

                    company.activeState = true;

                    if( VPRCConf ) {
                        company.prodServices.push( VPRCConf );
                    }

                    addTenantInfoToDCPRC( {
                        user,
                        newCompany: Object.assign( {}, company )
                    }, ( err ) => {
                        if( err ) {
                            return next( err );
                        }
                        next( null, identity, company );
                    } );
                },
                function( identity, company, next ) {

                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'company',
                        action: 'put',
                        fields: [ 'activeState', 'prodServices', 'deleted', 'licenseScope' ],
                        query: { _id: company._id },
                        data: Y.doccirrus.filters.cleanDbObject( {
                            activeState: company.activeState,
                            prodServices: company.prodServices,
                            deleted: company.deleted,
                            licenseScope: company.licenseScope
                        } )
                    }, ( err ) => {
                        if( err ) {
                            return next( err );
                        }
                        Y.log( '*********** TENANT WAS SUCCESSFULLY CREATED *************', 'info', NAME );
                        Y.log( `Company record: ${JSON.stringify( company )}`, 'info', NAME );
                        Y.log( `Central contact record: ${JSON.stringify( mixedResult.centralContact )}`, 'info', NAME );
                        Y.log( `Identity record: ${JSON.stringify( identity )}`, 'info', NAME );
                        next( null, identity );
                    } );
                },
                function sendEmail( identity, next ) {
                    /**
                     * send email
                     */
                    let
                        { dcCustomerNo, tenantId, coname } = mixedResult.company,
                        emailEntry = Y.doccirrus.schemas.simpleperson.getEmail( mixedResult.centralContact.communications ),
                        emailAddress = emailEntry && emailEntry.value;
                    if( emailAddress && emailConfig ) {
                        Y.log( 'activateTenant. *********** EMAIL FOR NEW TENANT WAS SENT *************', 'info', NAME );
                        sendMail( {
                            user,
                            tenantId,
                            emailAddress,
                            identity,
                            dcCustomerNo,
                            coname,
                            isTrial,
                            emailConfig,
                            activeDays,
                            mixedResult
                        }, next );
                        return;
                    }
                    Y.log( `activateTenant. Central contact email address is not set: ${emailAddress} or email config is empty: ${emailConfig}. *********** NO email was send *************`, 'info', NAME );
                    return next();

                }
            ], callback );

        }

        /**
         * Deleting all data that belongs to the given tenant
         * @param {Object} args
         * @method deleteTenant
         * @return {Function} callback
         */
        function deleteTenant( args ) {
            let
                { user, callback, query: params } = args,
                company,
                contactIds = [],
                tenantExists,
                async = require( 'async' );
            if( !Y.doccirrus.auth.hasAPIAccess( args.user, 'company.all' ) && Y.doccirrus.auth.isVPRCAdmin( user ) ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 401 ) );
            }

            // check _id is set
            if( !params._id ) {
                callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Invalid parameters' } ) );
                return;
            }

            function deleteContacts( callback ) {
                let
                    async = require( 'async' );
                async.each( contactIds, ( contact, done ) => {
                    async.waterfall( [
                        function( next ) {
                            Y.doccirrus.mongodb.runDb( {
                                user,
                                action: 'count',
                                model: 'company',
                                query: {
                                    'centralContact': contact
                                }
                            }, next );
                        },
                        function( count, next ) {
                            if( !count ) {
                                Y.log( `deleteContacts. central contact ${contact} will be deleted - it is not used anymore.`, 'info', NAME );
                                Y.doccirrus.mongodb.runDb( {
                                    user,
                                    action: 'delete',
                                    model: 'contact',
                                    query: {
                                        '_id': contact
                                    }
                                }, next );
                            } else {
                                Y.log( `deleteContacts. central contact ${contact} can not be deleted - it is used in another company.`, 'info', NAME );
                                setImmediate( next );
                            }
                        }
                    ], done );
                }, callback );
            }

            function postToPUC( callback ) {
                if( company.dcCustomerNo ) {
                    let
                        pucData = {
                            secret: Y.doccirrus.auth.getPUCSecret(),
                            host: Y.doccirrus.auth.getPRCUrl( '/', company.tenantId ),
                            customerIdPrac: company.dcCustomerNo
                        };
                    Y.log( 'Sending request to PUC for deleting tenant meta data...', 'info', NAME );
                    return Y.doccirrus.https.externalPost( Y.doccirrus.auth.getPUCUrl( '/r/deletemetadata/?action=deletemetadata' ),
                        pucData, Y.doccirrus.auth.setInternalAccessOptions(),
                        ( err, response ) => {
                            if( err ) {
                                Y.log( `deletetenant: Error from PUC. Will not delete patient contacts: ${JSON.stringify( err )}`, 'error', NAME );
                            }

                            if( response && response.body && Array.isArray( response.body ) ) {
                                contactIds = contactIds.concat( response.body ); // centralContact + patient contacts
                            } else { // no patient was registered for this practice
                                Y.log( 'deletetenant: No contactId received from PUC', 'info', NAME );
                            }
                            callback();
                        }
                    );
                }
                Y.log( 'no customerNo, skipping deletion on PUC', 'info', NAME );
                setImmediate( callback );
            }

            function getCompanyData( callback ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'get',
                    model: 'company',
                    query: { '_id': params._id },
                    options: {
                        lean: true
                    }
                }, ( err, results ) => {
                    let
                        i;
                    if( err ) {
                        return callback( err );
                    }
                    if( !results.length ) {
                        return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Company not found' } ) );
                    }
                    company = results[ 0 ];
                    contactIds.push( company.centralContact );
                    for( i = 0; i < company.prodServices.length; i++ ) {
                        if( 'VPRC' === company.prodServices[ i ].ps ) {
                            company.prodServices.splice( i, 1 );
                        }
                    }
                    callback( null );
                } );

            }

            function deleteCompany( callback ) {
                Y.log( `deleteCompany. company.deletedName: ${company.deletedName}`, 'info', NAME );
                if( false === tenantExists ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'company',
                        action: 'delete',
                        query: {
                            _id: company._id
                        }
                    }, ( err ) => {
                        if( err ) {
                            Y.log( `error in deleting company: ${JSON.stringify( err )}`, 'error', NAME );
                            return callback( err );
                        }
                        Y.log( `Company has been deleted: ${company.tenantId}`, 'info', NAME );
                        callback();
                    } );
                } else {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'company',
                        action: 'put',
                        fields: [ 'deleted', 'addresses', 'communications', 'deletedName', 'activeState', 'prodServices' ],
                        query: { _id: company._id },
                        data: {
                            deleted: true,
                            addresses: company.addresses,
                            communications: company.communications,
                            deletedName: company.deletedName,
                            activeState: company.activeState,
                            prodServices: company.prodServices,
                            skipcheck_: true
                        }
                    }, ( err ) => {
                        if( err ) {
                            Y.log( `error in updating company: ${JSON.stringify( err )}`, 'error', NAME );
                            return callback( err );
                        }
                        Y.log( `Company was tagged deleted: ${company.tenantId}`, 'info', NAME );
                        callback();
                    } );
                }
            }

            function removeTenantCache( callback ) {
                if( Y.doccirrus.cacheUtils.mongoDbCache.isClientConnected() ) {
                    Y.doccirrus.cacheUtils.mongoDbCache.removeCache( {
                        tenantId: company.tenantId
                    }, ( err ) => {
                        if( err ) {
                            Y.log( `could not remove cache data: ${JSON.stringify( err )}`, 'warn', NAME );
                        }
                        callback();
                    } );
                } else {
                    return callback();
                }
            }

            async.series( [
                function( next ) {
                    Y.doccirrus.api.company.deactivateTenant( {
                        user,
                        data: {
                            _id: params._id
                        },
                        callback: next
                    } );
                },
                function( next ) {
                    getCompanyData( next );
                },
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        action: 'get',
                        model: 'contact',
                        query: { '_id': company.centralContact }
                    }, function( err, result ) {
                        let
                            myContact = result && result[ 0 ];
                        if( err ) {
                            return next( err );
                        }
                        company.communications = company.communications || [];
                        company.addresses = company.addresses || [];
                        if( myContact && myContact.communications ) {
                            company.communications = company.communications.concat( myContact.communications );
                            company.communications = Y.Array.unique( company.communications, function( a, b ) { // remove duplicates
                                return a.value === b.value && a.type === b.type;
                            } );
                        }
                        if( myContact && myContact.addresses ) {
                            company.addresses = company.addresses.concat( myContact.addresses );
                        }
                        if( myContact ) {
                            company.deletedName = Y.doccirrus.schemas.person.getFullName( myContact.firstname + myContact.lastname, myContact.talk );
                        } else {
                            Y.log( `no central contact found for tenant: ${company.tenantId}`, 'info', NAME );
                            company.deletedName = 'KA';
                        }
                        next();

                    } );
                },
                function( next ) {
                    let
                        tenantData = {
                            tenantId: company.tenantId
                        };

                    Y.doccirrus.api.company.deleteTenantDb( {
                        data: tenantData,
                        callback( err, data ) {
                            if( err ) {
                                return next( err );
                            }
                            tenantExists = data && data.tenantExists;
                            next();
                        }
                    } );

                },
                function( next ) {
                    postToPUC( next );
                },
                function( next ) {
                    deleteContacts( next );
                },
                function( next ) {
                    deleteCompany( next );
                },
                function( next ) {
                    removeTenantCache( next );

                    clearTimeout( deleteTenantTimeout );
                    deleteTenantTimeout = setTimeout( () => {
                        deleteZombieTenantsFromDb();
                    }, 180000 );
                }
            ], callback );
        }

        function deleteZombieTenantsFromDb() {
            let
                async = require( 'async' ),
                db = require( 'dc-core' ).db,
                user = Y.doccirrus.auth.getSUForTenant( '0' ),
                zombieTenantsArr = [],
                allDeletedTenantsArr = [];

            function getZombieTenants( result ) {
                Y.log( `deleteZombieTenantsFromDb: Checking DB for any zombie tenants`, 'info', NAME );

                async.eachSeries( result, ( company, next ) => {
                    Y.doccirrus.mongodb.existsDbForTenant( company.tenantId, ( err, exists ) => {
                        if( err ) {
                            Y.log( `deleteZombieTenantsFromDb: Error trying to check whether zombie tenant exists in DB for tenantId: ${company.tenantId} Error: ${JSON.stringify( err )}`, 'warn', NAME );
                        } else if( exists ) {
                            zombieTenantsArr.push( company.tenantId );
                        }
                        allDeletedTenantsArr.push( company.tenantId );

                        next();
                    } );
                }, () => {
                    deleteZombieTenants();
                } );
            }

            function deleteZombieTenants() {
                if( zombieTenantsArr.length ) {
                    Y.log( `deleteZombieTenantsFromDb: Found Zombie tenants. Ids are: ${JSON.stringify( zombieTenantsArr )} . Deleting them...`, 'info', NAME );
                    async.eachSeries( zombieTenantsArr, ( tenantId, next ) => {
                        db.dropDb( tenantId, ( err ) => {
                            if( err ) {
                                Y.log( `deleteZombieTenantsFromDb: Error while DELETING zombie tenant DB for tenantId: ${tenantId}`, 'warn', NAME );
                            }

                            removeZombieTenantCache( tenantId, () => {
                                next();
                            } );
                        } );
                    }, () => {
                        Y.log( `deleteZombieTenantsFromDb: Deleted zombie tenants db. Now cleaning cache...`, 'info', NAME );
                        deleteAllDeletedTenantsCache();
                    } );
                } else {
                    Y.log( `deleteZombieTenantsFromDb: No zombie tenants found. Now cleaning cache...`, 'info', NAME );
                    deleteAllDeletedTenantsCache();
                }
            }

            function deleteAllDeletedTenantsCache() {
                if( allDeletedTenantsArr.length ) {
                    async.eachSeries( allDeletedTenantsArr, ( tenantId, next ) => {
                        removeZombieTenantCache( tenantId, () => {
                            next();
                        } );
                    }, () => {
                        Y.log( `deleteZombieTenantsFromDb: Cleared all possible zombie tenants cache. All clean...`, 'info', NAME );
                    } );
                } else {
                    Y.log( `deleteZombieTenantsFromDb: No zombie tenants cache to clear. All clean...`, 'info', NAME );
                }
            }

            function removeZombieTenantCache( tenantId, callback ) {
                if( Y.doccirrus.cacheUtils.mongoDbCache.isClientConnected() ) {
                    Y.doccirrus.cacheUtils.mongoDbCache.removeCache( {
                        tenantId: tenantId
                    }, ( err ) => {
                        if( err ) {
                            Y.log( `could not remove cache data: ${JSON.stringify( err )} for tenantId: ${tenantId}`, 'warn', NAME );
                        }
                        callback();
                    } );
                } else {
                    return callback();
                }
            }

            if( YDC.auth.isVPRC() ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    action: 'get',
                    model: 'company',
                    query: {
                        activeState: false,
                        deleted: true,
                        tenantId: { $exists: true }
                    },
                    useCache: false,
                    options: {
                        select: {
                            tenantId: 1
                        }
                    }
                } )
                    .then( ( result ) => {
                        if( result && Array.isArray( result ) && result.length ) {
                            getZombieTenants( result );
                        }
                    } )
                    .catch( ( err ) => {
                        Y.log( `deleteZombieTenantsFromDb: Error while querying company collection: ${JSON.stringify( err )}`, 'warn', NAME );
                    } );
            }
        }

        function deleteTenantDb( args ) {
            let
                { data: params, callback } = args,
                { tenantId } = params || {},
                tenantExists = true,
                async = require( 'async' );

            Y.log( 'Entering RegistrationMojit.deleteTenant ...', 'info', NAME );

            // check params
            if( !tenantId ) {
                callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Invalid parameters' } ) );
                return;
            }
            // check given tenant Id:  assume it is on the company
            if( !Y.doccirrus.auth.isHexTenantId( tenantId ) ) {
                callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Invalid Tenant Id' } ) );
                return;
            }

            // to prevent further calls to this db by cron jobs
            function invalidateTenant( callback ) {
                Y.doccirrus.licmgr.forceRefresh( callback );
            }

            async.waterfall( [
                function( next ) {
                    // check if the tenant we are going to delete actually exists
                    Y.doccirrus.mongodb.existsDbForTenant( tenantId, next );
                },
                function( bool, next ) {
                    if( bool ) {
                        let
                            db = require( 'dc-core' ).db;

                        Y.log( 'Tenant DB exists, trying to invalidate and then delete it...', 'info', NAME );
                        return invalidateTenant( function( err ) {
                            if( err ) {
                                Y.log( `error trying to invalidate the company for tenant: ${tenantId}: ${JSON.stringify( err )}`, 'error', NAME );
                            }
                            //here we delete the whole tenant's database
                            db.dropDb( tenantId, next );
                        } );

                    }
                    Y.log( 'Tenant DB does NOT exist. (possibly an unfinished trial registration)', 'info', NAME );
                    tenantExists = false;
                    next( null );

                }
            ], ( err ) => {
                if( err ) {
                    Y.log( `error in deleting db of tenant: ${tenantId}. Error: ${JSON.stringify( err )}`, 'error', NAME );
                    return callback( err );
                }
                invalidateTenantMTSList();
                callback( null, { tenantExists: tenantExists } );

            } );
        }

        function createTenant( args ) {
            var
                { user, callback, data: { company = {}, contact, supportContact = {}, automaticCustomerNo, updateNew } = {} } = args,
                tenantId,
                newDCCustomerNo,
                async = require( 'async' ),
                moment = require( 'moment' ),
                isPRCType, isDCPRC_MTS;

            if( !Y.doccirrus.auth.hasAPIAccess( args.user, 'company.all' ) ) {
                return callback( Y.doccirrus.errors.rest( 401, '', true ) );
            }

            isPRCType = company.serverType === Y.doccirrus.schemas.company.serverTypes.PRC || company.serverType === Y.doccirrus.schemas.company.serverTypes.ISD;

            isDCPRC_MTS = !isPRCType && (Y.doccirrus.auth.isPRC() || Y.doccirrus.auth.isDCPRC());

            if( (!company.customerNo && !isPRCType && !automaticCustomerNo) || !company.addresses || !company.addresses[ 0 ] || !contact || !contact.communications || !contact.communications[ 0 ] ) {
                Y.log( 'not enough parameters for tenant creation: ' + JSON.stringify( args.data ), 'error', NAME );
                callback( Y.doccirrus.errors.rest( 400, 'insufficient data' ) );
                return;
            }

            company.communications = (company.communications && company.communications[ 0 ]) ? company.communications : contact.communications || [];

            function serviceMapper( service ) {
                delete service._id;
                delete service.from;
                delete service.to;
                service.config = service.config.map( function( config ) {
                    delete config._id;
                    if( 'isTemplate' === config.key ) {
                        config.value = false;
                    }
                    return config;
                } );
                return service;
            }

            function removeId( obj ) {
                delete obj._id;
                return obj;
            }

            company.activeState = false;

            company.prodServices = company.prodServices && company.prodServices.map( serviceMapper );
            company.addresses = company.addresses.map( removeId );
            company.communications = company.communications.map( removeId );
            company.systemType = company.systemType || Y.doccirrus.schemas.company.systemTypes.TRIAL;
            company.serverType = company.serverType || Y.doccirrus.schemas.company.serverTypes.VPRC;

            if( updateNew ) {
                company.licenseScope[ 0 ].upgrade = moment().format( 'DD.MM.YYYY' );
            }

            async.series( [
                function getTenantId( next ) {
                    if( isPRCType || isDCPRC_MTS ) {
                        tenantId = "0";
                        return setImmediate( next, null );
                    }
                    Y.doccirrus.auth.getNewTenantId( ( err, _tenantId ) => {
                        tenantId = _tenantId;
                        next( err );
                    } );
                },
                function getNextDcCustomerNoSer( next ) {
                    var _next = ( err, number ) => {
                        if( err ) {
                            Y.log( 'getNextDcCustomerNoSer. Cannot get dcCustomerNo ' + err, 'error', NAME );
                            if( !Y.doccirrus.auth.isDCPRC() ) {
                                return next( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Failure contacting DCPRC. Check connection to ' + Y.doccirrus.auth.getDCPRCUrl( '/' ) } ) );
                            }
                            return next( err );
                        }
                        if( !number ) {
                            Y.log( 'getNextDcCustomerNoSer. dcCustomerNo is empty', 'error', NAME );
                            return next( new Y.doccirrus.commonerrors.DCError( 500, { message: 'dcCustomerNo is empty' } ) );
                        }
                        newDCCustomerNo = number;
                        next();
                    };

                    if( Y.doccirrus.auth.isDCPRC() ) {
                        // direct
                        getNextDcCustomerNo( { user, callback: _next } );
                    } else {
                        Y.doccirrus.api.company.getNextDcCustomerNoFromDCPRC( { callback: _next } );
                    }
                },
                function addContact( next ) {
                    if( company.centralContact ) {
                        return setImmediate( next );
                    }
                    if( contact._id ) {
                        company.centralContact = contact._id;
                        return setImmediate( next );
                    }
                    delete contact.optIn;
                    delete contact.centralContact;
                    contact.confirmed = false;
                    contact.addresses = contact.addresses.map( removeId );
                    contact.communications = contact.communications.map( removeId );
                    contact.accounts = [];

                    contact = Y.doccirrus.filters.cleanDbObject( contact );
                    YDC.mongodb.runDb( {
                        user: user,
                        model: 'contact',
                        action: 'post',
                        data: contact,
                        callback: function( err, result ) {
                            company.centralContact = result && result[ 0 ];
                            next( err, company.centralContact );
                        }
                    } );
                },
                function addSupportContant( next ) {
                    if( !supportContact || !Object.keys( supportContact ).length ) {
                        return setImmediate( next );
                    }
                    if( company.supportContact ) {
                        return setImmediate( next );
                    }
                    if( supportContact._id ) {
                        company.supportContact = supportContact._id;
                        return setImmediate( next );
                    }
                    Y.doccirrus.api.basecontact.post( {
                        user,
                        data: supportContact,
                        callback( err, result ) {
                            if( err ) {
                                return next( err );
                            }
                            company.supportContact = result[ 0 ];
                            next( null, company.supportContact );
                        }
                    } );
                },
                function addCompany( next ) {
                    company.tenantId = tenantId;
                    company.dcCustomerNo = newDCCustomerNo;
                    if( (isPRCType && !company.customerNo) || (automaticCustomerNo && !company.customerNo) ) {
                        company.customerNo = company.dcCustomerNo;
                    }
                    if( isDCPRC_MTS ) {
                        company.systemType = Y.doccirrus.schemas.company.systemTypes.APPLIANCE;
                        company.activeState = true;
                    }
                    company = Y.doccirrus.filters.cleanDbObject( company );
                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'company',
                        action: 'post',
                        data: company
                    }, ( err, result ) => {
                        if( err ) {
                            return next( err );
                        }
                        return next( null, {
                            companyId: result && result[ 0 ],
                            tenantId: tenantId
                        } );
                    } );
                }
            ], callback );
        }
        // TODO: EXTMOJ-1710 remove button and generation code?
        function generateScript( args ) {
            var { user, data = {}, query = {}, callback } = args,
                company,
                script,
                packageJson = require( process.cwd() + '/package.json' ),
                moment = require( 'moment' ),
                dbVersion = getMajorVersion( packageJson.version ),
                locations = [],
                res = "",
                contacts;

            function getMajorVersion( fullV ) {
                var res = (/^(\d{1,4}\.\d{1,4})\./).exec( fullV );
                if( res ) {
                    return res[ 1 ];
                }
                return '';
            }

            Y.doccirrus.api.company.getCompanyData( {
                user,
                query: { _id: query._id },
                callback( err, results ) {
                    if( err ) {
                        return callback( err );
                    }
                    company = results[ 0 ].company;

                    delete company._id;
                    delete company.supportContact;
                    delete company.prodServices;
                    company.centralContact = data;
                    company.activeState = true;
                    company.addresses.forEach( function( item ) {
                        delete item._id;
                    } );
                    company.communications.forEach( function( item ) {
                        delete item._id;
                    } );
                    contacts = Y.doccirrus.schemas.simpleperson.getSimplePersonFromPerson( company );

                    company.addresses.slice( 1 ).forEach( function( item ) {
                        let location;

                        location = {
                            "kv": "72",
                            "kind": item.kind,
                            "postbox": item.postbox,
                            "addon": item.addon,
                            "countryCode": item.countryCode,
                            "country": item.country,
                            "city": item.city,
                            "zip": item.zip,
                            "houseno": item.houseno,
                            "street": item.street,
                            "phone": contacts.phone,
                            "fax": contacts.fax,
                            "email": contacts.email,
                            "locname": company.coname,
                            "countryMode": company.countryMode,
                            "commercialNo": ""
                        };
                        locations.push( location );
                    } );

                    locations.forEach( function( location ) {
                        res += JSON.stringify( location, null, "\t" ) + ',\n';
                    } );

                    script = 'use 0\n' +
                             'db.practices.insert(\n' + JSON.stringify( company, null, "    " ) +
                             '\n);\n' +
                             'db.admins.insert(\n' +
                             '\t{\n' +
                             '\t\t"_id": ObjectId("000000000000000000000001"),\n' +
                             '\t\t"cardSwipeResetDate": ISODate("' + moment().subtract( 1, 'quarter' ).endOf( 'quarter' ).toISOString() + '"),\n' +
                             '\t\t"dbVersion": "' + dbVersion + '",\n' +
                             '\t\t"catalogsVersion": 1,\n' +
                             '\t\t"currentVersion": "' + packageJson.version + '"\n' +
                             '\t}' +
                             '\n);\n' +
                             'db.locations.insert(\n' +
                             '[\n' +
                             res +
                             '{\n' +
                             '\t"kv": "72",\n' +
                             '\t"kind": "' + (company.addresses[ 0 ].kind || "") + '",\n' +
                             '\t"postbox": "' + (company.addresses[ 0 ].postbox || "") + '",\n' +
                             '\t"addon": "' + (company.addresses[ 0 ].addon || "") + '",\n' +
                             '\t"countryCode": "' + (company.addresses[ 0 ].countryCode || "") + '",\n' +
                             '\t"countryMode": ' + JSON.stringify(company.countryMode) + ',\n' +
                             '\t"country": "' + (company.addresses[ 0 ].country || "") + '",\n' +
                             '\t"city": "' + (company.addresses[ 0 ].city || "") + '",\n' +
                             '\t"zip": "' + (company.addresses[ 0 ].zip || "") + '",\n' +
                             '\t"houseno": "' + (company.addresses[ 0 ].houseno || "") + '",\n' +
                             '\t"street": "' + (company.addresses[ 0 ].street || "") + '",\n' +
                             '\t"phone": "' + (contacts.phone || "") + '",\n' +
                             '\t"fax": "' + (contacts.fax || "") + '",\n' +
                             '\t"email": "' + (contacts.email || "") + '",\n' +
                             '\t"locname": "' + (company.coname || "") + '",\n' +
                             '\t"commercialNo": "", \n' +
                             '\t"_id": ObjectId("000000000000000000000001")\n' +
                             '}' +
                             '\n]' +
                             '\n);\n' +
                             'var myID, myCursor, wr;\n' +
                             '/* Support account creation */\n' +
                             'wr = db.employees.insert(\n' +
                             '{\n' +
                             '\t"username": "Support",\n' +
                             '\t"countryMode": ' + JSON.stringify(company.countryMode) + ',\n' +
                             '\t"officialNo": "",\n' +
                             '\t"type": "OTHER",\n' +
                             '\t"from": ISODate("2014-11-11T19:31:02.581Z"),\n' +
                             '\t"to": null,\n' +
                             '\t"employeeNo": "",\n' +
                             '\t"department": "",\n' +
                             '\t"dob": ISODate("2014-11-11T18:32:13.922Z"),\n' +
                             '\t"bsnrs": [],\n' +
                             '\t"talk": "MR",\n' +
                             '\t"locations": [],\n' +
                             '\t"specialities": [],\n' +
                             '\t"addresses": [],\n' +
                             '\t"communications": [\n' +
                             '\t\t{\n' +
                             '\t\t"type": "EMAILPRIV",\n' +
                             '\t\t"preferred": false,\n' +
                             '\t\t"value": "support@doc-cirrus.com",\n' +
                             '\t\t"_id": ObjectId( "5462562da423b51c2ef34936" )\n' +
                             '\t\t}\n' +
                             '\t],\n' +
                             '\t"prodServices": [],\n' +
                             '\t"accounts": [],\n' +
                             '\t"lastname": "Kundendienst",\n' +
                             '\t"fk3120": "",\n' +
                             '\t"middlename": "",\n' +
                             '\t"memberOf": [\n' +
                             '\t\t{"group": "ADMIN"},{"group": "SUPPORT"}\n' +
                             '\t],\n' +
                             '\t"status": "ACTIVE",\n' +
                             '\t"nameaffix": "",\n' +
                             '\t"firstname": "Doc-Cirrus",\n' +
                             '\t"__v": 0\n' +
                             '}' +
                             '\n);\n' +
                             'if(wr.nInserted) {\n' +
                             '\tmyCursor = db.employees.find().sort({_id:-1});\n' +
                             '\tmyID = myCursor.next()._id.str;\n' +
                             '\twr = db.identities.insert(\n' +
                             '\t{\n' +
                             '\t\t"username": "Support",\n' +
                             '\t\t"firstname": "Doc-Cirrus",\n' +
                             '\t\t"lastname": "Kundendienst",\n' +
                             '\t\t"pwResetToken": "",\n' +
                             '\t\t"status": "ACTIVE",\n' +
                             '\t\t"specifiedBy": myID,\n' +
                             '\t\t"memberOf": [\n' +
                             '\t\t\t{"group": "ADMIN"},{"group": "SUPPORT"}\n' +
                             '\t\t],\n' +
                             '\t\t"__v": 0,\n' +
                             '\t\t"pw": "$2$8a23feb650db7f319743eeb155be5f2fcf0c9f03a393bfecb47abf9e5bd3cc56b35e6718f5af1b947e58726884c7d9c492d7cb95cc56de7461c633d7116fc10872eba78ba7a5"\n' +
                             '\t}\n' +
                             '\t);\n' +
                             '\tif( wr.nInserted ) {\n' +
                             '\t\tprint("Created support account");\n' +
                             '\t} else {\n' +
                             '\t\tprint("Failed creating support IDENTITY");\n' +
                             '\t}\n' +
                             '} else {\n' +
                             '\tprint("Failed creating support EMPLOYEE");\n' +
                             '}\nexit\n';

                    return callback( null, script );
                }
            } );
        }

        function getActiveTenants( args ) {
            var
                { user, query = {}, options = {}, callback } = args,
                params = args.data || query,
                populateCompany = params.populateCompany,
                version = params.version,
                systemId = params.systemId,
                appsMetaData = params.appsMetaData,
                _query = { activeState: true };

            options.lean = true;

            if( !YDC.auth.isDCPRC() && !YDC.auth.isVPRC() ) {
                return callback( YDC.errors.rest( 403 ) );
            }

            if( YDC.auth.isDCPRC() && !params.dcCustomerNo ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'params.dcCustomerNo is missing' } ) );
            }

            if( params.tenantId ) {
                _query.tenantId = params.tenantId;
            } else if( params.dcCustomerNo ) {
                _query.dcCustomerNo = params.dcCustomerNo;
            } else if( params.customerNo ) {
                _query.customerNo = params.customerNo;
            }

            if( params.systemType ) {
                _query.systemType = params.systemType;
            }
            if( params.serverType ) {
                _query.serverType = params.serverType;
            }

            if( populateCompany ) {
                Y.doccirrus.api.company.getCompanyData( {
                    user,
                    query: _query,
                    callback( err, data ) {

                        if ( !err && !Array.isArray( data ) ) {
                            err = new Error( `Invalid data in companies array: ${JSON.stringify( data )}` );
                        }

                        if( err ) {
                            Y.log( `getActiveTenants: Could not getCompanyData: ${err.stack||err}`, 'error', NAME );
                            return callback( err );
                        }

                        // eslint-disable-next-line callback-return
                        callback( null, data.map( obj => { //early callback and continue processing
                            let
                                company = obj.company;
                            company.supportContact = obj.supportContact;
                            company.centralContact = obj.centralContact;
                            return company;
                        } ) );

                        if( version ) {
                            version = version.substr( 0, 30 );
                            if( version.lastIndexOf( '.' ) === (version.length - 1) ) {
                                version = version.substring( 0, version.length - 1 );
                            }
                            if( /^\d{3,10}$/.exec( params.dcCustomerNo ) ) {
                                let
                                    updateData = { version: version };

                                if( systemId ) {
                                    updateData.systemId = systemId;
                                }

                                if( appsMetaData ) {
                                    updateData.appsMetaData = appsMetaData;
                                }

                                Y.doccirrus.mongodb.runDb( {
                                    user: user,
                                    action: 'update',
                                    model: 'company',
                                    query: { dcCustomerNo: params.dcCustomerNo },
                                    data: { $set: updateData }
                                }, ( err ) => {
                                    if( err ) {
                                        Y.log( `getActiveTenants: error updating version for prc ${params.dcCustomerNo}: ${JSON.stringify( err )}`, 'error', NAME );
                                    }
                                } );
                            }
                        }
                    }
                } );
            } else {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    action: 'get',
                    model: 'company',
                    query: _query,
                    options: options,
                    callback: function( err, result ) {
                        if( err ) {
                            Y.log( `getActiveTenants: error in getting active companies: ${err.stack||err}`, 'error', NAME );
                            return callback( err );
                        }
                        callback( null, result );
                    }
                } );
            }
        }

        function terminateExpiredTrials( args ) {
            var
                query = {
                    $or: [
                        {tenantId: {$regex: /^(?!deleted)/, $ne: '0'}},
                        {
                            tenantId: '0',
                            serverType: Y.doccirrus.schemas.company.serverTypes.VPRC
                        }
                    ]
                },
                user = args.user,
                callback = args.callback,
                async = require( 'async' ),
                affected = 0;

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'company',
                action: 'get',
                query: query,
                callback: function( err, result ) {
                    if( err ) {
                        Y.log( 'error getting trial tenants: ' + JSON.stringify( err ), 'error', NAME );
                        return;
                    }
                    async.each( result, function( company, _cb ) { // check if expired then deactivate
                        if( true !== company.activeState ) {
                            _cb();
                            return;
                        }
                        Y.doccirrus.api.company.checkTrial( {
                            user: user,
                            data: { tenantId: company.tenantId, companyId: company._id },
                            callback: function( err1, result ) {
                                if( err1 ) {
                                    return _cb( err1 );
                                }
                                affected = result && result.active ? affected : affected + 1;
                                _cb();
                            }
                        } );
                    }, function( err3 ) {
                        if( err3 ) {
                           return  callback( err3 );
                        }
                        callback( null, affected );
                    } );
                }
            } );
        }

        function checkTrial( args ) {
            Y.log( 'entering checkTrial', 'info', NAME );
            var
                callback = args.callback,
                async = require( 'async' ),
                user = args.user || Y.doccirrus.auth.getSUForTenant( '0' ),
                params = args.data || args.originalParams,
                tenantId = params.tenantId,
                companyId = params.companyId, // optional
                query;

            Y.log( 'checktrial: ' + require( 'util' ).inspect( params ), 'debug', NAME );

            function getCompaniesCb( err, result, isFromVPRC, cb ) {
                var daysLeft,
                    _callback = cb || callback;
                if( err || !result || !result[ 0 ] ) {
                    Y.log( JSON.stringify( err || 'not a trial tenant (1): ' + tenantId ), err ? 'error' : 'info', NAME );
                    _callback( err );
                    return;
                }
                if( true !== result[ 0 ].activeState ) {
                    Y.log( 'tenant not active: ' + tenantId, 'info', NAME );
                    _callback();
                    return;
                }
                companyId = result[ 0 ]._id;
                daysLeft = trialDaysLeft( result[ 0 ] );

                Y.log( 'checktrial: ' + daysLeft + ' days remaining for trial tenant ' + tenantId, 'debug', NAME );

                if( NOT_A_TRIAL === daysLeft ) {
                    Y.log( JSON.stringify( err || 'not a trial tenant: ' + tenantId ), err ? 'error' : 'debug', NAME );
                    _callback( null );
                    return;
                }
                if( daysLeft <= 0 ) {
                    Y.log( 'Deactivating expired trial: ' + tenantId, 'info', NAME );
                    if( isFromVPRC ) {
                        Y.doccirrus.mongodb.runDb( {
                            user,
                            model: 'company',
                            action: 'update',
                            query: { "tenants._id": companyId },
                            data: {
                                $set: {
                                    "tenants.$.activeState": false
                                }
                            }
                        }, ( err ) => {
                            if( err ) {
                                Y.log( 'error deactivating trial tenant: ' + JSON.stringify( err ), 'error', NAME );
                                return _callback( err );
                            }
                            return _callback( null, { daysLeft: daysLeft, active: false } );
                        } );
                    } else {
                        Y.doccirrus.api.company.deactivateTenant( {
                            user: user,
                            data: { tenantId: tenantId, _id: companyId },
                            callback: function( err /*,customerNo*/ ) {
                                if( err ) {
                                    Y.log( 'error deactivating trial user: ' + JSON.stringify( err ), 'error', NAME );
                                    _callback( err );
                                } else {
                                    _callback( null, { daysLeft: daysLeft, active: false } );
                                }
                            }
                        } );
                    }
                } else {  // not expired
                    _callback( null, { daysLeft: daysLeft, active: true } );
                }
            }

            query = {
                prodServices: { $elemMatch: { config: { $elemMatch: { key: 'TrialVersion' } } } },
                tenantId: tenantId
            };
            if( companyId ) { // undefined if called from the website
                query = { _id: companyId };
            }

            Y.doccirrus.mongodb.runDb( {
                user: user,
                model: 'company',
                action: 'get',
                query: query
            }, ( err, result )=>{
                if( err ) {
                    return callback( err );
                }
                if( result && result[0] ) {
                    if( Y.doccirrus.schemas.company.serverTypes.VPRC === result[0].serverType &&
                        result[0].tenants && result[0].tenants[0] && '0' === result[0].tenantId ) {
                        async.each( result[0].tenants, ( tenant, innerCb )=>{
                            getCompaniesCb( null, [tenant], true, innerCb );
                        }, ( error )=>{
                            if( error ) {
                                return callback( error );
                            } else {
                                return callback();
                            }
                        } );
                    } else {
                        getCompaniesCb( null, result, false );
                    }
                } else {
                    return callback();
                }
            } );
        }

        function initializeTenant( args ) {
            let
                { data, callback } = args,
                myTenant,
                identity,
                centralContact,
                tenantUser,
                async = require( 'async' );

            Y.log( `Entering initialize Tenant, data: ${JSON.stringify( data )}`, 'info', NAME );

            // check params
            if( !data.company || !data.company.centralContact ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Invalid parameters' } ) );
            }

            centralContact = data.company.centralContact;

            // check if the given tenant Id has been marked deleted, if so then unmark it
            myTenant = data.company.tenantId;

            if( data.company.deleted ) {
                data.company.deleted = false;
            }
            if( !data.company.activeState ) {
                data.company.activeState = true;
            }

            if( !Y.doccirrus.auth.isHexTenantId( myTenant ) ) {
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'Invalid Tenant Id' } ) );
            }

            tenantUser = Y.doccirrus.auth.getSUForTenant( myTenant );

            function postIdentity( callback ) {
                let
                    identityData = {},
                    emailEntry = centralContact.communications && Y.doccirrus.schemas.simpleperson.getEmail( centralContact.communications ),
                    username = emailEntry && emailEntry.value,
                    cleanData;

                if( Y.doccirrus.schemas || Y.doccirrus.schemas.identity ) {
                    identityData = Y.doccirrus.schemas.identity.createNewIdentityForPerson( centralContact, true, username );
                } else {
                    return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Failed generating identity from contact.' } ) );
                }
                if( !identityData ) {
                    return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'Failed generating identity from contact. (1)' } ) );
                }

                //  clean id object of XSS and other threats before storing in database
                cleanData = Y.doccirrus.filters.cleanDbObject( identityData );
                Y.doccirrus.mongodb.runDb( {
                    user: tenantUser,
                    model: 'identity',
                    action: 'post',
                    data: cleanData,
                    options: { entireRec: true }
                }, ( err, result ) => {
                    identity = result[ 0 ];
                    callback( err, result );
                } );
            }

            function initNewTenant( callback ) {
                // the following also cleans the sub-objects, so we can use skipcheck afterwards.
                let company = Y.doccirrus.filters.cleanDbObject( data.company );
                company.systemType = Y.doccirrus.auth.getSystemType() || Y.doccirrus.schemas.company.systemTypes.APPLIANCE;
                // we are changing the contact to an employee...
                centralContact.type = 'PHYSICIAN';
                centralContact.status = 'ACTIVE';
                async.parallel( [
                    function( done ) {
                        Y.doccirrus.api.location.getLocationFromPractice( data.company, undefined, function( err, location ) {
                            if( err ) {
                                return done( err );
                            }
                            Y.doccirrus.filters.setSkipCheck( location, true );
                            Y.doccirrus.mongodb.runDb( {
                                action: 'post',
                                user: tenantUser,
                                model: 'location',
                                data: location,
                                callback: done
                            } );
                        } );
                    },
                    function( done ) {
                        Y.doccirrus.filters.setSkipCheck( company, true );
                        Y.doccirrus.mongodb.runDb( {
                            action: 'post',
                            model: 'practice',
                            user: tenantUser,
                            data: company,
                            options: {}
                        }, done );
                    },
                    function( done ) {
                        centralContact.locations = [
                            {
                                locname: data.company.coname,
                                _id: Y.doccirrus.schemas.location.getMainLocationId()
                            } ];
                        centralContact.countryMode = data.company.countryMode || ['D'];
                        Y.doccirrus.filters.setSkipCheck( centralContact, true );
                        Y.doccirrus.mongodb.runDb( {
                            action: 'post',
                            model: 'employee',
                            user: tenantUser,
                            data: centralContact,
                            options: {}
                        }, done );
                    },
                    function( done ) {
                        invalidateTenantMTSList( myTenant );
                        done();
                    },
                    function( done ) {
                        postIdentity( done );
                    },
                    function( done ) {
                        generateKeys( tenantUser, done );
                    },
                    function( done ) {
                        Y.log( 'Initial rules import started', 'info', NAME );
                        Y.doccirrus.api.ruleimportexport.docCirrusImportAll( {
                            user: tenantUser,
                            originalParams: {
                                force: '1',
                                regenerate: '0',
                                specificTenantUser: tenantUser
                            },
                            callback: () => {
                                Y.log( 'Initial rules import finished', 'info', NAME );
                                Y.doccirrus.schemas.sysnum.resetRuleImportLock( Y.doccirrus.auth.getSUForLocal(), function() {
                                } );
                                Y.doccirrus.communication.emitEventForSession( {
                                    sessionId: tenantUser.sessionId,
                                    event: 'ruleImport',
                                    msg: {
                                        data: {
                                            status: 'done'
                                        }
                                    }
                                } );
                            }
                        } );
                        done();
                    }
                ], function( err ) {
                    callback( err, identity );
                } );
            }

            // return the identity that belongs to central contact of the tenant, or if deleted, all remaining ones
            function returnCentralUser( identities, callback ) {
                var
                    emailEntry = centralContact.communications && Y.doccirrus.schemas.simpleperson.getEmail( centralContact.communications ),
                    username = emailEntry && emailEntry.value;

                Y.doccirrus.mongodb.runDb( {
                    user: tenantUser,
                    model: 'identity',
                    query: { username: username },
                    callback: function( err, result ) {
                        if( err ) {
                            Y.log( `error in getting central user: ${JSON.stringify( err )}`, 'error', NAME );
                            return callback( err );
                        }
                        if( result && result[ 0 ] ) {
                            return callback( null, result[ 0 ] );
                        }
                        identities = identities || [];
                        Y.log( `central user not found, returning first of identities: ${identities.length}`, 'info', NAME );
                        callback( null, identities[ 0 ] );
                    }
                } );
            }

            /**
             * remove the 'deleted' mark from tenantId
             * @param err
             * @param result
             */


            function reactivateExistingTenant( callback ) {
                Y.log( 'the tenant already exists, activating tenant users...', 'info', NAME );
                // update only the first identity
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                                user: tenantUser,
                                action: 'put',
                                model: 'identity',
                                query: {},
                                fields: 'status',
                                data: { status: 'ACTIVE', skipcheck_: true, multi_: true }
                            }, ( err, results ) => {
                                if( err ) {
                                    Y.log( `error trying to reactivate tenant user: ${JSON.stringify( err )}`, 'error', NAME );
                                    return callback( err );
                                }
                                next( null, results );
                            }
                        );
                    },
                    function( result, next ) {
                        returnCentralUser( result, next );
                    }
                ], callback );
            }

            function checkExist( exists, callback ) {

                if( exists ) { // then just try to activate tenant users
                    reactivateExistingTenant( callback );
                } else if( data.templateTenantId && 'undefined' !== data.templateTenantId ) {
                    Y.doccirrus.api.company.createTenantDB( data, myTenant, function( err, result ) {
                        if( err ) {
                            Y.log( `error from create template Tenant: ${JSON.stringify( err )}`, 'error', NAME );
                            return callback( err );
                        }
                        callback( null, result ); // this is a separate registration path
                    } );

                } else {
                    initNewTenant( callback );
                }
            }

            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.existsDbForTenant( myTenant, next );
                },
                function( exists, next ) {
                    checkExist( exists, next );
                }
            ], callback );
        }

        function getTemplateTenants( args ) {
            var
                callback = args.callback;

            function returnData( err, result ) {
                let isArray = Array.isArray(result);
                if( err || !result || (isArray && !result[0]) || (!isArray && (!result.result || !result.result.length)) ) {
                    Y.log( 'getTemplateTenants: no result, possible error: ' + err, (err) ? 'error' : 'info', NAME );
                    callback( err, result );
                    return;
                }
                callback( null, result );
            }

            Y.doccirrus.mongodb.runDb( {
                user: args.user,
                model: 'company',
                action: 'get',
                query: {
                    prodServices: {
                        $elemMatch: {
                            config: { $elemMatch: { key: 'isTemplate', value: 'true' } },
                            ps: 'VPRC'
                        }
                    }, activeState: true
                },
                options: args.options,
                callback: returnData
            } );
        }

        function getCentralContact( args ) {
            var
                dbuser = args.user,
                callback = args.callback,
                options = args.options || {},
                mixedResult = {},
                query = args.query || {};

            if( !query.deleted ) {
                query.deleted = { $ne: true };
            }

            function handleContactCb( err, result ) {
                if( err ) {
                    Y.log( 'Failed to find record: ' + err, 'error' );
                    return callback( null, {} );
                }
                // join company and related contact
                for( let i = 0; i < mixedResult.result.length; i++ ) {
                    for( let j = 0; j < result.length; j++ ) {
                        if( mixedResult.result[ i ].centralContact === result[ j ]._id.toString() ) {
                            mixedResult.result[ i ].centralContact = result[ j ].toObject ? result[ j ].toObject() : result[ j ];
                        }
                    }
                }
                callback( null, mixedResult );
            }

            function handleCompanyResult( err, result ) {
                if( !err ) {
                    let
                        contactIds = [];
                    mixedResult = result;
                    for( let i = 0; i < mixedResult.result.length; i++ ) {
                        mixedResult.result[ i ].licenseScope = [
                            Y.doccirrus.schemas.settings.getCleanLicenseData( mixedResult.result[ i ].licenseScope && mixedResult.result[ i ].licenseScope[ 0 ] )
                        ];
                    }

                    for( let i = 0; i < mixedResult.result.length; i++ ) {
                        if( mixedResult.result[ i ].centralContact ) {
                            contactIds.push( mixedResult.result[ i ].centralContact );
                        }
                    }
                    Y.doccirrus.mongodb.runDb( {
                        user: dbuser,
                        model: 'contact',
                        action: 'get',
                        query: { _id: { $in: contactIds } },
                        options: {
                            fields: {
                                firstname: 1,
                                lastname: 1,
                                confirmed: 1,
                                title: 1,
                                communications: 1,
                                workingAt: 1
                            }
                        }
                    }, handleContactCb );
                } else {
                    Y.log( 'Failed to load companies: ' + err, 'error' );
                    return callback( null, {} );
                }
            }

            options.lean = true;
            Y.doccirrus.api.company.get( {
                user: dbuser,
                query: query,
                options: options,
                callback: handleCompanyResult
            } );
        }

        function createTenantDB( data, targetTenantId, callback ) {
            let
                user = Y.doccirrus.auth.getSUForTenant( targetTenantId ),
                { templateTenantId: sourceTenantId, centralContact: contact, company } = data || {},
                identity,
                async = require( 'async' );

            if( !data || !company || !contact ) {
                Y.log( `createTenantDB. missing params. contact: ${Boolean( contact )}, data: ${Boolean( data )}, data.company: ${Boolean( data && data.company )}`, 'error', NAME );
                return callback( new Y.doccirrus.commonerrors.DCError( 400, { message: 'insufficient parameters' } ) );
            }

            // dump source tenant then restore as target tenant
            function copyPaste( callback ) {
                let
                    exec = require( 'child_process' ).exec,
                    // TODO check if it makes any sense.
                    dropCmd = `mongo ${Y.doccirrus.mongoutils.getMongoDbArgs( targetTenantId, true ).join( " " )} --eval "db.audits.drop();db.sysnums.drop()"`;

                function afterRestore( error, stdout ) {
                    if( error ) {
                        Y.log( `createTenantDB. A restore error: ${JSON.stringify( error )}`, 'error', NAME );
                        return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'could not restore tenant db' } ) );
                    }
                    Y.log( `restore command output: ${JSON.stringify( stdout )}`, 'info', NAME );
                    Y.log( `shell command: ${dropCmd}`, 'info', NAME );
                    exec( dropCmd, function( error, stdout ) {
                        if( error ) {
                            Y.log( `A shell command error: ${JSON.stringify( error )}`, 'error', NAME );
                            return callback( error );
                        }
                        Y.log( `restore command output: ${JSON.stringify( stdout )}`, 'info', NAME );
                        callback();
                    } );
                }

                Y.doccirrus.mongoutils.dump( null, sourceTenantId, function( err ) {
                    if( err ) {
                        Y.log( `createTenantDB. Could not dump data. error: ${JSON.stringify( err )}`, 'error', NAME );
                        return callback( err );
                    } else {
                        Y.doccirrus.mongoutils.restore( null, targetTenantId, sourceTenantId, null, afterRestore );
                    }
                } );
            }

            function rewriteIdentities( callback ) {
                async.waterfall( [
                    function( next ) {
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'identity'
                        }, next );
                    },
                    function( result, next ) {
                        if( result && result[ 0 ] ) {
                            let promiseArr = [];
                            let
                                identities = result.map( function( item ) {
                                    promiseArr.push(
                                        //mongooselean.remove
                                        Y.doccirrus.mongodb.runDb( {
                                            user: user,
                                            action: 'delete',
                                            model: 'identity',
                                            query: {
                                                _id: item._id
                                            }
                                        } )
                                    );
                                    delete item._id;
                                    return item;
                                } );

                            Promise.all( promiseArr )
                                .then( () => {
                                    next( null, identities );
                                } )
                                .catch( error => {
                                    next( error );
                                } );
                        } else {
                            return next( null, [] );
                        }
                    },
                    function( identities, next ) {
                        if( identities && identities.length ) {
                            Y.log( `rewriting identities: ${identities.length}`, 'info', NAME );
                            identities.skipcheck_ = true;
                            Y.doccirrus.mongodb.runDb( {
                                user: user,
                                model: 'identity',
                                action: 'post',
                                data: identities
                            }, err => next( err ) );
                        } else {
                            setImmediate( next );
                        }
                    }
                ], callback );
            }

            function createUser( callback ) {
                let
                    employee = contact;

                Y.log( `createTenantDB: adding a new user to the new tenant: ${targetTenantId}`, 'info', NAME );

                employee.type = 'PHYSICIAN'; // doctor by default
                employee.officialNo = '999999900';
                employee.countryMode = company.countryMode || ['D'];
                employee.locations = [
                    {
                        locname: company.coname,
                        _id: Y.doccirrus.schemas.location.getMainLocationId()
                    }
                ];
                employee = Y.doccirrus.filters.cleanDbObject( employee );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'employee',
                    action: 'post',
                    data: employee
                }, ( err, result ) => {
                    if( err ) {
                        return callback( err );
                    }
                    callback( err, result && result[ 0 ] );
                } );
            }

            // user credentials required for login
            function createIdentity( employeeId, callback ) {
                let
                    emailEntry = Y.doccirrus.schemas.simpleperson.getEmail( contact.communications ),
                    username = emailEntry && emailEntry.value;

                identity = Y.doccirrus.schemas.identity.createNewIdentityForPerson( contact, true, username ); // username=the email user registered with. Central contact of the company.
                identity.pw = Y.doccirrus.auth.getSaltyPassword( contact.middlename, null ); // the password entered by user in registration form
                identity.specifiedBy = employeeId; // the id of the employee
                contact.middlename = '';
                //TODO update contact on DCPRC

                identity = Y.doccirrus.filters.cleanDbObject( identity );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'identity',
                    action: 'post',
                    data: identity,
                    options: { entireRec: true }
                }, ( err, results ) => {
                    identity = results && results[ 0 ];
                    callback( err );
                } );
            }

            // read the first practice, we need the address info
            function getPractice( callback ) {
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'practice',
                    action: 'get',
                    options: { limit: 1 }
                }, callback );
            }

            // just empty practice collection
            function deletePractice( result, callback ) {
                let
                    correctAddress = company.addresses && company.addresses[ 0 ] && 'NA' !== company.addresses[ 0 ].street && 'NA' !== company.addresses[ 0 ].houseno;
                if( !correctAddress && result && result[ 0 ] && result[ 0 ].addresses && result[ 0 ].addresses[ 0 ] ) { // replace with address from template tenant
                    company.addresses = (result[ 0 ].toObject ? result[ 0 ].toObject() : result[ 0 ]).addresses;
                }

                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'practice',
                    action: 'delete',
                    query: { _id: { $exists: true } }
                }, err => callback( err ) );
            }

            // set potentially faulty sysnums (semaphores)
            function updateSysnums( callback ) {
                Y.doccirrus.schemas.sysnum.resetSemaphores( user, err => callback( err ) );
            }

            // post the newly created company (i.e. DCPRC.company) as practice
            function postPractice( callback ) {
                Y.log( `createTenantDB: replace practice profile for the new tenant: ${targetTenantId}`, 'info', NAME );
                company.communications = (company.communications && company.communications[ 0 ]) || contact.communications;
                company = Y.doccirrus.filters.cleanDbObject( company );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'practice',
                    action: 'post',
                    data: company
                }, err => callback( err ) );
            }

            // overwrite main location with new data
            function updateLocation( callback ) {
                let
                    location = Y.doccirrus.api.location.getLocationFromPractice( data.company ),
                    useFromTemplate = [ 'commercialNo' ],
                    fields;
                fields = Object.keys( location ).concat( [ 'phone', 'fax', 'email' ] ).filter( function( f ) {
                    return 0 > useFromTemplate.indexOf( f ) && undefined !== location[ f ];
                } );
                location = Y.doccirrus.filters.cleanDbObject( location );
                Y.doccirrus.mongodb.runDb( {
                    user: user,
                    model: 'location',
                    action: 'put',
                    fields: fields,
                    data: location,
                    query: { _id: Y.doccirrus.schemas.location.getMainLocationId() }
                }, err => callback( err ) );
            }

            async.waterfall( [
                function( next ) {
                    copyPaste( next );
                },
                function( next ) {
                    rewriteIdentities( next );
                },
                function( next ) {
                    createUser( next );
                },
                function( result, next ) {
                    createIdentity( result, next );
                },
                function( next ) {
                    getPractice( next );
                },
                function( result, next ) {
                    deletePractice( result, next );
                },
                function( next ) {
                    updateSysnums( next );
                },
                function( next ) {
                    postPractice( next );
                },
                function( next ) {
                    updateLocation( next );
                },
                function( next ) {
                    generateKeys( user, next );
                }
            ], function( err ) {
                if( err ) {
                    Y.log( `createTenantDB. Error during tenant creation. Error: ${JSON.stringify( err )}`, 'error', NAME );
                } else {
                    Y.log( 'createTenantDB: trial tenant has been set up successfully', 'info', NAME );
                    invalidateTenantMTSList( targetTenantId );
                }
                callback( err, identity );
            } );
        }

        function finalConfirm( args ) {
            var
                callback = args.callback,
                params = args.data,
                code = params.ccode || '',
                dbuser = Y.doccirrus.auth.getSUForTenant( '0' ),
                userName,
                companyId,
                tstamparr,
                contact;

            code = Y.doccirrus.auth.getDCPRCUrl( REG_PREFIX ) + code;

            if( !Y.doccirrus.email.isReady() ) {
                Y.log( '/finalconfirm called -- but email service down. E-Mail is a necessary vector for authorisation.', 'error', NAME );
                callback( null, { status: 'fail' } );
                return;
            }

            function sendMail( tenantId, dcCustomerNo ) {
                var cfgRaw = require( 'dc-core' ).config.load( process.cwd() + '/email.json' ),
                    myEmailCfg = cfgRaw.config || {},
                    talk = ('MS' === contact.talk) ? 'Frau' : 'Herr',
                    message;

                if( !myEmailCfg || !myEmailCfg.dcInfoService_trial ) {
                    callback( YDC.errors.rest( 500, 'email entry missing' ) );
                    return;
                }

                message = {
                    text: 'Automatische Mitteilung,\n\n' +
                          talk + ' ' + contact.firstname + ' ' + contact.lastname + ', ' + contact.communications[ 0 ].value + ', Kundennr. ' + dcCustomerNo + ', TenantId: ' + tenantId + '\n' +
                          'hat den Opt-in durchgeführt und der Datenschutzerklärung (Anhang)\n' +
                          'per Willenserklärung im Webformular gerade zugestimmt.\n\n' +
                          'ZEITSTEMPEL: am ' + tstamparr[ 1 ] + ' um ' + tstamparr[ 2 ] + '\n\n' +
                          'Diese E-Mail dient als Nachweis ' +
                          'der Zustimmung \nzur Datenschutzerklärung in der beigefügten Form.' + '\n\n' +
                          'Doc Cirrus Registrierungsdienst\n',
                    replyTo: myEmailCfg.dcInfoService_trial.from,
                    to: myEmailCfg.dcInfoService_trial.to,
                    subject: contact.firstname + ' ' + contact.lastname + ', hat den Opt-in durchgeführt! ' + userName,
                    attachments: [
                        {
                            path: "./mojits/DocCirrus/assets/docs/Datenschutz.pdf",
                            contentType: "application/pdf",
                            filename: "Datenschutz.pdf"
                        }
                    ]
                };

                // result must be a valid record with the
                // confirmed == true
                Y.doccirrus.email.sendEmail( { ...message, user: dbuser }, ()=>{
                    callback( null, { status: 'ok' } );
                } );
            }

            function tenantIdCb( err, result ) {
                if( !err && result && result[ 0 ] ) {
                    //console.dir( result );
                    sendMail( result[ 0 ].tenantId, result[ 0 ].dcCustomerNo );
                } else {
                    return callback( err, { status: 'fail' } );
                }
            }

            function putCb( err, result ) {

                tstamparr = new Date().toJSON().match( /([\-0-9]*)T([0-9:.]*)Z/ );
                Y.log( 'confirm registration came back:  err ' + err + '  data[0]: ' + (result ? JSON.stringify( result ) : 'null-ish') );
                //console.dir( result );
                if( !err && result && true === result.confirmed ) {

                    userName = result.firstname + ' ' + result.lastname;
                    companyId = result.centralContact;

                    contact = result;
                    //console.log( companyId );

                    // we can only send a loginlink if the user is getting their own tenant.
                    // for now we only check if there is a company involved.
                    if( !companyId ) {
                        sendMail();
                    } else {
                        Y.doccirrus.mongodb.runDb( {
                            user: dbuser,
                            model: 'company',
                            action: 'get',
                            query: { _id: companyId },
                            options: {}
                        }, tenantIdCb );
                    }

                } else {
                    return callback( err, { status: 'fail' } );
                }
            }

            function checkCb( err, result ) {
                var
                    data;
                if( !err ) {
                    if( result && result[ 0 ] ) {
                        if( !result[ 0 ].confirmed ) {
                            data = { confirmed: true };
                            Y.doccirrus.filters.setSkipCheck( data, true );
                            // believed to be safe from XSS, not filtered
                            Y.doccirrus.mongodb.runDb( {
                                user: dbuser,
                                model: 'contact',
                                action: 'put',
                                query: { optIn: code },
                                fields: [ 'confirmed' ],
                                data: data
                            }, putCb );

                        } else {
                            // person has confirmed already
                            Y.log( 'repeat confirmation', 'info', NAME );
                            return callback( null, { status: 'confirmed' } );
                        }
                    } else {
                        // no records found
                        Y.log( 'bogus link', 'info', NAME );
                        return callback( null, { status: 'fail' } );
                    }
                } else {
                    Y.log( 'Failed to find record: ' + err, 'error', NAME );
                    return callback( err, { status: 'fail' } );
                }
            }

            // at this point we are not logged in yet!
            Y.doccirrus.mongodb.runDb( {
                user: dbuser,
                model: 'contact',
                action: 'get',
                query: { optIn: code },
                options: {}
            }, checkCb );
        }

        function getLicences( args ) {
            let
                { callback } = args;
            callback( null, Y.doccirrus.licmgr.getFullLicenseData() );
        }

        /**
         * Return company or tenant data
         * @method getCompanyDataByDCCustomerNo
         * @param {Object} args
         * @param {Object} args.user
         * @param {Object} args.data
         * @param {String} args.data.dcCustomerNo
         * @param {Function} args.callback
         */
        function getCompanyDataByDCCustomerNo( args ) {
            let
                { user, data: { dcCustomerNo } = {}, callback } = args,
                async = require( 'async' );
            async.waterfall( [
                function( next ) {
                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'company',
                        action: 'get',
                        query: {
                            dcCustomerNo
                        },
                        options: {
                            lean: true,
                            limit: 1
                        }
                    }, next );
                }, function( company, next ) {
                    if( company.length ) {
                        return setImmediate( next, null, company );
                    }

                    Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'company',
                        action: 'get',
                        query: {
                            'tenants.dcCustomerNo': dcCustomerNo
                        },
                        options: {
                            lean: true,
                            limit: 1
                        }
                    }, ( err, companies ) => {
                        let
                            result = [];
                        if( err ) {
                            return next( err );
                        }
                        if( companies.length ) {
                            result.push( companies[ 0 ].tenants.find( tenantData => dcCustomerNo === tenantData.dcCustomerNo ) );
                        }
                        next( null, result );
                    } );

                }
            ], callback );
        }

        function activateSystem( args ) {
            const { user, callback, query } = args,
                { newState, dcCustomerNumbers } = query;
            if( true === newState || false === newState ) {
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'company',
                    action: 'put',
                    data: Y.doccirrus.filters.cleanDbObject( { activeState: newState, multi_: true } ),
                    fields: [ 'activeState' ],
                    query: {
                        'dcCustomerNo': { $in: dcCustomerNumbers }
                    },
                    options: {
                        lean: true
                    }
                }, ( err, res ) => {
                    if( err ) {
                        Y.log( "Error activating system. Error: " + JSON.stringify( err ), "error", NAME );
                        return callback( err );
                    }
                    return callback( null, res );
                } );
            }
            else {
                return callback( new Y.doccirrus.commonerrors.DCError( 500, { message: 'New company state is undefined' } ) );
            }
        }

        function invalidateTenantMTSList( newTenantId ) {
            var tenantIdList = newTenantId || [];

            Y.doccirrus.ipc.send( UPDATE_TENANT_LIST, tenantIdList );
            require( process.cwd() + '/middleware/mts.js' )( tenantIdList );
        }

        Y.doccirrus.ipc.subscribeNamed( UPDATE_TENANT_LIST, NAME, true, function( tenantIdList ) {
            require( process.cwd() + '/middleware/mts.js' )( tenantIdList );
        } );

        function getDataForCompanyBrowser( args ) {
            Y.log('Entering Y.doccirrus.api.company.getDataForCompanyBrowser', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.getDataForCompanyBrowser');
            }
            const
                { user, query, callback } = args,
                async = require( 'async' );
            async.parallel( {
                companyData( done ) {
                    Y.doccirrus.api.company.getCompanyData( {
                        user,
                        query,
                        callback( err, results ) {
                            done( err, results && results[ 0 ] );
                        }
                    } );
                },
                appTokens( done ) {
                    Y.doccirrus.api.apptoken.get( {
                        user,
                        query: {},
                        callback: done
                    } );
                }
            }, callback );
        }

        /**
         * @method PUBLIC
         *
         * This method runs only on DCPRC and queries company by provided dcCustomerNo
         *
         * @param {Object} args
         * @param {Object} [args.user] If not present then superuser will be used
         * @param {String} args.dcCustomerNo The customer number to verify
         * @returns {Promise<Object>}  Returns company DB object
         */
        async function getCompanyByDcCustomerNo( args = {} ) {
            const
                {user, dcCustomerNo} = args;

            let
                err,
                result;

            Y.log('Entering Y.doccirrus.api.company.getCompanyByDcCustomerNo', 'info', NAME);

            // --------------------------------------------- 1. Validate ----------------------------------------
            if( !Y.doccirrus.auth.isDCPRC() ) {
                throw new Error("NOT_DCPRC");
            }

            if( !dcCustomerNo ) {
                throw new Error(`Missing 'dcCustomerNo'`);
            }
            // ---------------------------------------------- 1. END --------------------------------------------


            // ---------------------------------------- 2. Query company by dcCustomerNo ----------------------------------------------
            [err, result] = await formatPromiseResult(
                                    Y.doccirrus.mongodb.runDb( {
                                        user: user || Y.doccirrus.auth.getSUForLocal(),
                                        model: 'company',
                                        action: 'get',
                                        query: {
                                            dcCustomerNo
                                        }
                                    })
                                  );

            if( err ) {
                Y.log(`getCompanyByDcCustomerNo: Error while querying company by dcCustomerNo: ${dcCustomerNo}. Error: ${err.stack || err}`, "error", NAME);
                throw new Error(`DB error while querying company by dcCustomerNo: ${dcCustomerNo}. Error: ${err.message || JSON.stringify(err)}`);
            }

            if( !result || !Array.isArray(result) || !result.length ) {
                throw new Error(`dcCustomerNo = '${dcCustomerNo}' not found in DCPRC database`);
            }
            // ------------------------------------------------------ 2. END ----------------------------------------------------------------

            Y.log('Exiting Y.doccirrus.api.company.getCompanyByDcCustomerNo', 'info', NAME);
            return result[0];
        }

        Y.namespace( 'doccirrus.api' ).company = {

            trialDaysLeft,

            NOT_A_TRIAL,

            /**
             *
             * @param {Object} args
             */
            'get': function (args) {
                Y.log('Entering Y.doccirrus.api.company.get', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.get');
                }

                getCompany( args );
            },

            /**
             *
             * The user clicked their OPT-IN link!
             *
             * 1. update the contact's status (if required)
             * 2. transmit the future loginlink (if required)
             *
             * @param {Object} args
             *
             */
            finalConfirm( args ) {
                Y.log('Entering Y.doccirrus.api.company.finalConfirm', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.finalConfirm');
                }
                finalConfirm( args );
            },
            /**
             * create a Tenant from the template tenant
             * the call is originated from DCPRC, activating a trial tenant
             * @param {Object} data
             * @param {Tenant} targetTenantId
             * @param {Function} callback
             */
            createTenantDB( data, targetTenantId, callback ) {
                createTenantDB( data, targetTenantId, callback );
            },

            getCompanyData( args ) {
                Y.log('Entering Y.doccirrus.api.company.getCompanyData', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.getCompanyData');
                }
                getCompanyData( args );
            },

            getDataForCompanyBrowser,

            getCentralContact( args ) {
                Y.log('Entering Y.doccirrus.api.company.getCentralContact', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.getCentralContact');
                }
                getCentralContact( args );
            },

            /**
             * return those companies marked as template
             * one is marked as template if the prodService entry for VPRC
             * has the config entry {key:'isTemplate, value:'true'}
             * @param {Object} args
             */
            getTemplateTenants( args ) {
                Y.log('Entering Y.doccirrus.api.company.getTemplateTenants', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.getTemplateTenants');
                }
                getTemplateTenants( args );
            },
            /**
             * This interface exists for the DC-PRC to install a new tenant.
             *
             * In the body, following params must be set:
             *
             * 1) secret -> DCPRC shared secret
             * 2) contact -> Contact_T
             * 3) company -> Company_T
             *
             * if templateTenantId is provided then the new tenant will be a modified copy of the template tenant
             * if the tenant DB already exists then it will only activate its users and returns the user with username === email of the contact
             * @param{Tenant} args
             */
            initializeTenant( args ) {
                Y.log('Entering Y.doccirrus.api.company.initializeTenant', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.initializeTenant');
                }
                initializeTenant( args );
            },

            /**
             * returns trial days left for the given tenantId
             * Deactivates the tenant if it is expired.
             * Does nothing if the tenant is not a trial.
             * @param {Object} args
             */
            checkTrial( args ) {
                Y.log('Entering Y.doccirrus.api.company.checkTrial', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.checkTrial');
                }
                checkTrial( args );
            },
            /**
             * get all tenants and check handle them to trial checker. It will in turn deactivate the tenant if it is expired.
             * Nothing will be done if a tenant is not trial or is not expired.
             * The function is idempotent. Doesn't lead to error if repeated.
             *
             * @param {Object} args
             */
            terminateExpiredTrials( args ) {
                Y.log('Entering Y.doccirrus.api.company.terminateExpiredTrials', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.terminateExpiredTrials');
                }
                terminateExpiredTrials( args );
            },

            /**
             * on DCPRC
             * @param {Object} args
             */
            getActiveTenants( args ) {
                Y.log('Entering Y.doccirrus.api.company.getActiveTenants', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.getActiveTenants');
                }
                getActiveTenants( args );
            },
            /**
             * delete VPRC side of tenant
             * @param {Object} args
             */
            deleteTenantDb( args ) {
                Y.log('Entering Y.doccirrus.api.company.deleteTenantDb', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.deleteTenantDb');
                }
                deleteTenantDb( args );
            },
            /**
             *
             * @param {Object} args
             */
            createTenant( args ) {
                Y.log('Entering Y.doccirrus.api.company.createTenant', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.createTenant');
                }
                createTenant( args );
            },
            generateScript( args ) {
                Y.log('Entering Y.doccirrus.api.company.generateScript', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.generateScript');
                }
                generateScript( args );
            },

            transformToPRC( args ) {
                Y.log('Entering Y.doccirrus.api.company.transformToPRC', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.transformToPRC');
                }
                transformToPRC( args );
            },

            activateTenant( args ) {
                Y.log('Entering Y.doccirrus.api.company.activateTenant', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.activateTenant');
                }
                activateTenant( args );
            },

            deactivateTenant( args ) {
                Y.log('Entering Y.doccirrus.api.company.deactivateTenant', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.deactivateTenant');
                }
                deactivateTenant( args );
            },
            deleteTenant( args ) {
                Y.log('Entering Y.doccirrus.api.company.deleteTenant', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.deleteTenant');
                }
                deleteTenant( args );
            },
            addTenantInfo( args ) {
                Y.log('Entering Y.doccirrus.api.company.addTenantInfo', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.addTenantInfo');
                }
                addTenantInfo( args );
            },
            deleteTenantInfo( args ) {
                Y.log('Entering Y.doccirrus.api.company.deleteTenantInfo', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.deleteTenantInfo');
                }
                deleteTenantInfo( args );
            },
            upgradeCompaniesInGroup( args ) {
                Y.log('Entering Y.doccirrus.api.company.upgradeCompaniesInGroup', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.upgradeCompaniesInGroup');
                }
                upgradeCompaniesInGroup( args );
            },
            getNextDcCustomerNo( args ) {
                Y.log('Entering Y.doccirrus.api.company.getNextDcCustomerNo', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.getNextDcCustomerNo');
                }
                getNextDcCustomerNo( args );
            },
            getNextDcCustomerNoFromDCPRC( args ) {
                Y.log('Entering Y.doccirrus.api.company.getNextDcCustomerNoFromDCPRC', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.getNextDcCustomerNoFromDCPRC');
                }
                getNextDcCustomerNoFromDCPRC( args );
            },
            getLicences( args ) {
                Y.log('Entering Y.doccirrus.api.company.getLicences', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.getLicences');
                }
                getLicences( args );
            },
            getCompanyDataByDCCustomerNo( args ) {
                Y.log('Entering Y.doccirrus.api.company.getCompanyDataByDCCustomerNo', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.getCompanyDataByDCCustomerNo');
                }
                getCompanyDataByDCCustomerNo( args );
            },
            activateSystem( args ) {
                Y.log('Entering Y.doccirrus.api.company.activateSystem', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.activateSystem');
                }
                activateSystem( args );
            },
            setVprcFQHostNameFromMVPRC( args ) {
                Y.log('Entering Y.doccirrus.api.company.setVprcFQHostNameFromMVPRC', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.setVprcFQHostNameFromMVPRC');
                }
                setVprcFQHostNameFromMVPRC( args );
            },
            setVprcFQHostName( args ) {
                Y.log('Entering Y.doccirrus.api.company.setVprcFQHostName', 'info', NAME);
                if (args.callback) {
                    args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                        .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.company.setVprcFQHostName');
                }
                setVprcFQHostName( args );
            },
            createCommissionKey,
            removeCommissionKey,
            getCompanyByDcCustomerNo
        };
    },
    '0.0.1', {
        requires: [
            'oop',
            'trial-checker',
            'admin-schema',
            'dcauth',
            'cache-utils'
        ]
    }
);
