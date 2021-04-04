/**
 * User: ma
 * Date: 09/10/14  15:37
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
'use strict';

// New pattern for cascading pre and post processes.
// automatically called by the DB Layer before any
// mutation (CUD, excl R) is called on a data item.

YUI.add( 'company-process', function( Y, NAME ) { //eslint-disable-line no-unused-vars

        NAME = Y.doccirrus.schemaloader.deriveProcessName( NAME );

        const
            i18n = Y.doccirrus.i18n,
            _ = require( 'lodash' );

        function updateHostnameForTenants( user, company, callback ) {
            var
                oldData = company.originalData_ || {};

            if( Y.doccirrus.schemas.company.systemTypes.APPLIANCE === company.systemType &&
                Y.doccirrus.schemas.company.serverTypes.VPRC === company.serverType ) {
                if( oldData.vprcFQHostName !== company.vprcFQHostName && company.tenants && company.tenants.length ) {
                    company.tenants.forEach( tenant => {
                        tenant.prodServices.forEach( service => {
                            if( 'VPRC' === service.ps ) {
                                let
                                    hostnameConfigInd = service.config.findIndex( item => "hostname" === item.key );
                                if( -1 < hostnameConfigInd ) {
                                    service.config[hostnameConfigInd].value = `${tenant.tenantId}.${company.vprcFQHostName.replace( /^insuite./, '' )}`;
                                }
                            }
                        } );
                    } );
                    return callback( null, company );
                } else {
                    return callback( null, company );
                }
            } else {
                return callback( null, company );
            }
        }

        /**
         * Sets wasNew value  for post-process from isNew property in pre-process
         *
         * @method setWasNew
         * @param {Object} user
         * @param {Object} company
         * @param {Function} callback
         * @returns {Function} callback
         */
        function setWasNew( user, company, callback ) {
            company.wasNew = company.isNew;
            return callback( null, company );
        }

        /**
         * Sends and email to dcInfoService_sales with licenseScope and dcCustomerNo
         * if license was changed in company with all systemTypes (except TRIAL)
         *
         * @method notifyAboutLicenseChanges
         * @param {Object} user
         * @param {Object} company
         * @param {Function} callback
         * @returns {Function} callback
         */
        function notifyAboutLicenseChanges( user, company, callback ) {
            let oldData = company.originalData_ || {},
                prettyLicenseScope = [],
                addedLicense = [],
                removedLicense = [],
                currentLicenseScope = company.licenseScope && company.licenseScope[0] && company.licenseScope[0]._doc,
                oldLicenseScope = oldData.licenseScope && oldData.licenseScope[0],
                message = {text: '', subject: '', serviceName: 'dcInfoService_sales'};

            if( Y.doccirrus.schemas.company.systemTypes.TRIAL === company.systemType || company.wasNew ) {
                return callback( null, company );
            }

            /**
             * Removes 'upgrade' and '_id' fields from passed licenseScope
             *
             * @param {Object} scope
             */
            function removeNonConnectedFields( scope ) {
                Object.keys( scope ).forEach( item => {
                    if( ['_id', 'upgrade', 'trialExpire', 'trialBegin'].includes( item ) ) {
                        delete scope[item];
                    }
                } );
            }

            removeNonConnectedFields( currentLicenseScope );
            removeNonConnectedFields( oldLicenseScope );

            if( !_.isEqual( currentLicenseScope, oldLicenseScope ) ) {
                Object.keys( currentLicenseScope ).forEach( function( item ) {
                    let unselectedItem, selectedItem;
                    if( Array.isArray( oldLicenseScope[item] ) ) {
                        unselectedItem = {
                            field: item,
                            oldValue: _.difference( oldLicenseScope[item], currentLicenseScope[item] )
                        };
                    } else {
                        unselectedItem = oldLicenseScope[item] !== currentLicenseScope[item] ? {
                            field: item,
                            oldValue: oldLicenseScope[item]
                        } : null;
                    }

                    if( Array.isArray( currentLicenseScope[item] ) ) {
                        selectedItem = {
                            field: item,
                            newValue: _.difference( currentLicenseScope[item], oldLicenseScope[item] )
                        };
                    } else {
                        selectedItem = oldLicenseScope[item] !== currentLicenseScope[item] ? {
                            field: item,
                            newValue: currentLicenseScope[item]
                        } : null;
                    }

                    prettyLicenseScope.push( item + ' : ' + JSON.stringify( currentLicenseScope[item] ) + '\n' );

                    if( selectedItem && selectedItem.newValue.length ) {
                        addedLicense.push( selectedItem.field + ' : ' + JSON.stringify( selectedItem.newValue ) + '\n' );
                    }

                    if( unselectedItem && unselectedItem.oldValue.length ) {
                        removedLicense.push( unselectedItem.field + ' : ' + JSON.stringify( unselectedItem.oldValue ) + '\n' );
                    }
                } );
                message.subject = i18n( 'CRMMojit.company_process.message.CHANGE_LICENSE.subject', {
                    data: {
                        customerNo: company.customerNo || '',
                        systemId: company.systemId || ''
                    }
                } );

                message.text = i18n( 'CRMMojit.company_process.message.CHANGE_LICENSE.text', {
                    data: {
                        userName: user.U,
                        coname: company.coname || '',
                        dcCustomerNo: company.dcCustomerNo,
                        licenseScope: prettyLicenseScope.join( '' )
                    }
                } );

                if( addedLicense.length ) {
                    message.text += '\n\n' + i18n( 'CRMMojit.company_process.message.CHANGE_LICENSE.addedLicense', {
                        data: {
                            addedLicense: addedLicense.join( '' )
                        }
                    } );
                }

                if( removedLicense.length ) {
                    message.text += '\n\n' + i18n( 'CRMMojit.company_process.message.CHANGE_LICENSE.removedLicense', {
                        data: {
                            removedLicense: removedLicense.join( '' )
                        }
                    } );
                }

                Y.doccirrus.email.sendEmail( {...message, user}, function( err ) {
                    if( err ) {
                        Y.log( `Can't send licenseScope changing email. Error: ${err.stack || err}`, 'error', NAME );
                    }
                } );
            }
            return callback( null, company );
        }

        /**
         *
         * v.0. presents an array of pre process functions &
         *      an array of post-process functions.
         *
         * @Class RepetitionProcess
         */
        NAME = Y.namespace( 'doccirrus.schemaprocess' )[NAME] = {

            pre: [
                {
                    run: [
                        Y.doccirrus.auth.getCollectionAccessChecker( 'write', 'company' ),
                        updateHostnameForTenants, setWasNew
                    ], forAction: 'write'
                }
            ],

            post: [
                {
                    run: [
                        notifyAboutLicenseChanges
                    ], forAction: 'write'
                }
            ],

            audit: {
                // audit: {}  switches on auditing.  for no auditing, do not include the "audit" parameter

                /**
                 * optional:  true = in addition to regular auditing note down actions
                 * on this model that were attempted as well as ones that failed.
                 * Descr. in this case will always be "Versuch".
                 *
                 * false = note down only things that actually took place,
                 * not attempts that failed
                 */
                noteAttempt: false,

                /**
                 * optional: here we can override what is shown in the audit log description
                 * only used when the action succeeds (see noteAttempt)
                 *
                 * @param data
                 * @returns {*|string|string}
                 */
                descrFn: function( data ) {
                    var
                        str = '';
                    str += 'Active: ' + data.activeState + ', ';
                    str += 'dcCustomerNo: ' + data.dcCustomerNo + ', ';
                    str += 'tenantId: ' + data.tenantId;
                    return str;
                }

            },

            name: NAME
        };

    },
    '0.0.1', {requires: []}
);
