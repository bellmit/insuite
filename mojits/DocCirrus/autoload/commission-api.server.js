/**
 * User: do
 * Date: 07.11.18  13:56
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

YUI.add( 'commission-api', function( Y, NAME ) {
        const {encryptData} = require('../../../autoload/commission.server.js');
        const moment = require( 'moment' );
        const DCError = Y.doccirrus.commonerrors.DCError;
        const {formatPromiseResult} = require( 'dc-core' ).utils;

        function getCompanyByEncryptedSystemId( user, encryptedSystemId ) {
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.company.getCompanyData( {
                    user: user,
                    query: {
                        encryptedSystemId,
                        commissionKeyCreatedAt: {
                            $gte: moment().subtract( 30, 'minutes' ).toDate()
                        }
                    },
                    callback: ( err, result ) => {
                        if( err ) {
                            reject( err );
                            return;
                        }

                        if( !result.length ) {
                            reject( new DCError( 'no company found with queried commission key' ) );
                            return;
                        }

                        resolve( result[0].company );
                    }
                } );
            } );
        }

        function getCentralContact( args ) {
            const {user, contactId} = args;
            return new Promise( ( resolve, reject ) => {
                Y.doccirrus.api.contact.get( {
                    user,
                    query: {
                        _id: contactId
                    },
                    options: {limit: 1},
                    callback: ( err, results ) => {
                        if( err ) {
                            reject( err );
                            return;
                        }
                        if( !results.length ) {
                            reject( Error( `contact ${contactId} does not exist` ) );
                            return;
                        }
                        resolve( results[0] );
                    }
                } );
            } );
        }

        function getMajorVersion( fullV ) {
            var res = (/^(\d{1,4}\.\d{1,4})\./).exec( fullV );
            if( res ) {
                return res[1];
            }
            return '';
        }

        async function createInitalData( args ) {
            const {user, company} = args;
            let err, centralContact;

            [err, centralContact] = await formatPromiseResult( getCentralContact( {
                user,
                contactId: company.centralContact
            } ) );

            if( err ) {
                Y.log( `could not find central contact: ${company.centralContact}`, 'error', NAME );
                throw err;
            }

            const removeIdField = ( item ) => {
                delete item._id;
            };

            delete company._id;
            delete company.supportContact;
            delete company.prodServices;
            delete company.commissionKey;
            delete company.commissionKeyCreatedAt;

            delete centralContact._id;
            company.centralContact = centralContact;
            company.activeState = true;
            company.addresses.forEach( removeIdField );
            company.communications.forEach( removeIdField );

            const simplePerson = Y.doccirrus.schemas.simpleperson.getSimplePersonFromPerson( company );

            // KAP-237: get kv from zip; needed for kbvutility price generation
            const zipCodes = company.addresses.map( address => address.zip );
            let sdPlzEntries;
            if( zipCodes.length ) {
                [err, sdPlzEntries] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user: Y.doccirrus.auth.getSUForLocal(),
                    model: 'catalog',
                    query: {
                        plz: {$in: zipCodes},
                        catalog: /SDPLZ-D/
                    }
                } ) );
                if( err ) {
                    Y.log( `createInitalData: could not get kv of zip codes: ${err.stack || err}`, 'warn', NAME );
                }
            }

            const locations = company.addresses.map( item => {
                const matchingSdPlzEntry = (sdPlzEntries || []).find( entry => entry.plz === item.zip );
                return {
                    _id: '000000000000000000000001',
                    kv: matchingSdPlzEntry && matchingSdPlzEntry.kv || '',
                    kind: item.kind,
                    postbox: item.postbox,
                    addon: item.addon,
                    countryCode: item.countryCode,
                    country: item.country,
                    city: item.city,
                    zip: item.zip,
                    houseno: item.houseno,
                    street: item.street,
                    phone: simplePerson && simplePerson.phone,
                    fax: simplePerson && simplePerson.fax,
                    email: simplePerson && simplePerson.email,
                    locname: company.coname,
                    commercialNo: "",
                    cantonCode: item.cantonCode
                };
            } );

            const getAdminId = Y.doccirrus.schemas.admin.getId();
            const currentVersion = Y.config.insuite.version;
            const dbVersion = getMajorVersion( currentVersion );

            // TODO: EXTMOJ-1710 _id fields must be casted before inserting
            const admins = Y.doccirrus.schemas.admin.defaultItems.map( item => {
                item = JSON.parse( JSON.stringify( item ) );
                if( item._id === getAdminId ) {
                    Object.assign( item, {
                        cardSwipeResetDate: moment().subtract( 1, 'quarter' ).endOf( 'quarter' ).toDate(),
                        dbVersion,
                        catalogsVersion: 1,
                        currentVersion
                    } );
                }

                return item;
            } );

            const supportEmployee = {
                username: 'Support',
                officialNo: '',
                type: 'OTHER',
                from: '2014-11-11T19:31:02.581Z',
                to: null,
                employeeNo: '',
                department: '',
                dob: '2014-11-11T18:32:13.922Z',
                bsnrs: [],
                talk: 'MR',
                locations: [],
                specialities: [],
                addresses: [],
                communications: [
                    {
                        type: 'EMAILPRIV',
                        preferred: false,
                        value: 'support@doc-cirrus.com'
                    }
                ],
                prodServices: [],
                accounts: [],
                lastname: 'Kundendienst',
                fk3120: '',
                middlename: '',
                memberOf: [
                    {group: 'ADMIN'}, {group: 'SUPPORT'}
                ],
                status: 'ACTIVE',
                nameaffix: '',
                firstname: 'Doc-Cirrus'
            };

            const supportIdentity = {
                username: 'Support',
                firstname: 'Doc-Cirrus',
                lastname: 'Kundendienst',
                pwResetToken: '',
                status: 'ACTIVE',
                memberOf: [
                    {group: 'ADMIN'}, {group: 'SUPPORT'}
                ],
                pw: '$2$8a23feb650db7f319743eeb155be5f2fcf0c9f03a393bfecb47abf9e5bd3cc56b35e6718f5af1b947e58726884c7d9c492d7cb95cc56de7461c633d7116fc10872eba78ba7a5'
            };

            return {
                practices: [company],
                employees: [supportEmployee],
                identities: [supportIdentity],
                locations,
                admins
            };
        }

        async function getCommission( args ) {
            Y.log('Entering Y.doccirrus.api.commission.getCommission', 'info', NAME);
            if (args.callback) {
                args.callback = require(`${ process.cwd() }/server/utils/logWrapping.js`)(Y, NAME)
                    .wrapAndLogExitAsync(args.callback, 'Exiting Y.doccirrus.api.linkedactivities.commission.getCommission');
            }
            Y.log( `getCommission`, 'debug', NAME );
            const {user, originalParams, callback} = args;
            const encryptedSystemId = originalParams && originalParams.data && originalParams.data.data;
            let err, company, initialData, encryptedData;

            if( !Y.doccirrus.auth.isDCPRC() || !encryptedSystemId ) {
                callback( new DCError( 400 ) );
                return;
            }

            [err, company] = await formatPromiseResult( getCompanyByEncryptedSystemId( user, encryptedSystemId ) );

            if( err ) {
                Y.log( `could not get company by encrypted system id ${encryptedSystemId}: ${err.stack || err}`, 'error', NAME );
                callback( new DCError( 400 ) );
                return;
            }
            const commissionKey = company.commissionKey;
            const companyId = company.commissionKey._id;

            [err, initialData] = await formatPromiseResult( createInitalData( {user, company} ) );

            if( err ) {
                Y.log( `could not get initial data for company ${company._id} with commission key ${commissionKey}`, 'error', err );
                callback( new DCError( 400 ) );
                return;
            }

            [err, encryptedData] = await formatPromiseResult( encryptData( {
                commissionKey: commissionKey,
                data: {initialData, timestamp: new Date()}
            } ) );

            if( err ) {
                Y.log( `could not encrypt initial data for company ${company._id} with commission key ${commissionKey}: ${err.stack || err}`, 'error', NAME );
                callback( new DCError( 400 ) );
                return;
            }

            Y.doccirrus.api.company.removeCommissionKey( {
                user,
                originalParams: {
                    companyId
                },
                callback: ( err ) => {
                    if( err ) {
                        Y.log( `could not remove commission key of company ${companyId}: ${err.stack || err}`, 'error', NAME );
                    }
                }
            } );
            callback( null, {encryptedData} );
        }

        Y.namespace( 'doccirrus' ).api.commission = {
            getCommission
        };
    }, '0.0.1',
    {
        requires: ['dcauth', 'dccommonerrors', 'contact-api', 'simpleperson-schema', 'admin-schema', 'dcauthpub']
    }
);
