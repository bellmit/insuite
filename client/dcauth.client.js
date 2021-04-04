/**
 * User: rrrw
 * Date: 12.02.13  12:09
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * Client Side Auth Library
 *
 * !!!  THIS FILE IS SECURED BY grunt obfuscator
 */

/*jslint anon:true, nomen:true*/
/*global YUI, _ */


'use strict';
YUI.add( 'dcauth', function( Y, NAME ) {

        var myAuth,
            serverType,
            systemType,
            user,
            ENV;

        /**
         * Constructor for the module class.
         *
         * @class DCAuth
         * @private
         */
        function DCAuth() {
            // purely static object at the moment, nothing in the instances.
        }

        myAuth = new DCAuth();

        DCAuth.prototype.init = function init() {
            var
                env = Y.Object.getValue( Y, 'config.doccirrus.Env'.split( '.' ) ),
                prodServices;

            ENV = env;
            user = env.user || {};
            if( env.groups ) {
                user.groups = Y.JSON.parse( env.groups );
                // FIXME deprecated
                user.version = env.version || '';
            }

            if( env.roles ) {
                user.roles = Y.JSON.parse( env.roles );
            }

            prodServices = env.prodServices || '';
            if( prodServices ) {
                user.prodServices = (prodServices && prodServices.split( ',' )) || [];
            }

            user.dcprc = ('true' === env.dcprc); // convert to boolean
            if( user.dcprc ) {
                Y.log( 'User-agent for DCPRC', 'info', NAME );
            }

            serverType = env.serverType || '';
            systemType = env.systemType || '';
        };

        /**
         * returns if the user is an admin
         *
         */
        DCAuth.prototype.isAdmin = function isAdmin() {
            var i;
            for( i = 0; i < user.groups.length; i++ ) {
                if( 'ADMIN' === user.groups[ i ].group.toUpperCase() ) {
                    return true;
                }
            }
            return false;
        };

        /**
         * check if the user is an admin or higher (e.g. SUPPORT)
         *
         * @returns {null | Boolean}
         */
        DCAuth.prototype.isAdminOrHigher = function isAdminOrHigher() {
            var
                userGroupsNames = (user.groups.length && user.groups.map( function( userGroup ) {
                    return userGroup.group;
                } )) || null,
                adminGroupWeight = Y.doccirrus.schemas.employee.getGroupWeight( 'ADMIN' );

            return userGroupsNames && Boolean( userGroupsNames.find( function( groupName ) {
                return adminGroupWeight <= Y.doccirrus.schemas.employee.getGroupWeight( groupName );
            } ) );
        };

        /**
         * Returns hasSolConf entries.
         * @returns {Array}
         */
        DCAuth.prototype.hasSolsConfig = function hasSolsConfig() {
            return ENV.hasSolsConfig;
        };

        /**
         * Returns appRegs entries.
         * @returns {Array}
         */
        DCAuth.prototype.getAppRegs = function getAppRegs() {
            return ( ENV.hasSolsConfig && ( this._appRegs || ENV.appRegs ) ) || []; // must return an array (c6)
        };

        /**
         * Set appRegs entries.
         * @param {Array} appRegs
         */
        DCAuth.prototype.setAppRegs = function getAppRegs( appRegs ) {
            this._appRegs = appRegs;
        };

        /**
         * returns if the user has logged in to the DCPRC
         *
         */
        DCAuth.prototype.isDCPRC = function isDCPRC() {
            return user.dcprc;
        };

        /**
         * returns if the user has logged in to an MVPRC
         *
         */
        DCAuth.prototype.isMVPRC = function isMVPRC() {
            return this.isVPRC() && systemType.startsWith( Y.doccirrus.schemas.company.systemTypes.MEDNEO );
        };

        DCAuth.prototype.isDOQUVIDE = function isDOQUVIDE() {
            return this.isISD() && systemType === Y.doccirrus.schemas.company.systemTypes.DSCK;
        };
        DCAuth.prototype.isINCARE = function isINCARE() {
            return this.isISD() && systemType === Y.doccirrus.schemas.company.systemTypes.INCARE;
        };

        DCAuth.prototype.isVPRC = function isVPRC() {
            return 'VPRC' === serverType;
        };

        DCAuth.prototype.isVPRCAdmin = function isVPRCAdmin() {
            return ENV.isVPRCAdmin;
        };

        DCAuth.prototype.isMTSAndMasterUser = function() {
            return ENV.isMTSAndMasterUser;
        };

        DCAuth.prototype.getDccliSupportedFeatures = function () {
            return ENV.dccliSupportedFeatures;
        };

        DCAuth.prototype.isSolsSupported = function() {
            return ENV.isSolsSupported;
        };

        DCAuth.prototype.isAdminTenant = function () {
            return ENV.isAdminTenant;
        };

        DCAuth.prototype.isPatientPortal = function isPatientPortal() {
            return 'PP' === serverType;
        };

        /**
         * returns if a patient is logged in to patient portal
         * @returns {boolean}
         */
        DCAuth.prototype.isPatientLoggedIn = function() {
            return Boolean( Y.Object.getValue( ENV, 'patientportal.patientLoggedIn'.split( '.' ) ) );
        };

        /**
         * returns if the user has logged in to the PRC
         *
         */
        DCAuth.prototype.isPRC = function isPRC() {
            return 'PRC' === serverType;
        };

        DCAuth.prototype.isISD = function isISD() {
            return 'ISD' === serverType;
        };

        /**
         * returns true, if the given product name is valid (licensed) for this tenant
         *
         * @param name product name to validify (ie string)
         */
        DCAuth.prototype.validProduct = function( name ) {
            var rtn = false;

            if( user.prodServices && Array.isArray( user.prodServices ) ) {
                rtn = user.prodServices.some( function( el ) {
                    return name === el;
                } );
            } else {
                rtn = (undefined !== user.version) ?
                    user.version === name : false;
            }

            return rtn;
        };

        /**
         * convenience
         *
         * @param names array of product names to validify
         * @returns true, if at least one of the provided product
         * names turns out to be valid for this client
         */
        DCAuth.prototype.validProducts = function( names ) {
            return names.some( function( el ) {
                return myAuth.validProduct( el );
            } );
        };

        /**
         * Stub for the calculation of the company secret in the Client.
         * All private data to the server must be encrypted with the
         * company secret.
         * @param callback  err, string
         */
        DCAuth.prototype.getCompanySecret = function getCompanySecret( callback ) {
            // 1. check in cache (pull XOR encrypted CS)

            // 2. if not found, use a modal window to get user password to unlock the stored company secret.
            // 2.a and cache it in the localStorage

            // 3. callback with the actual verbatim company secret.
            callback( null, '<key>78687fe5435abcd</key><data>0gmG78OJcBzwrTSaKMKqkaoeTVw=</data>' );

        };

        /**
         * Returns the current User name in human readable form.
         */
        DCAuth.prototype.getUserName = function getUserName() {
            return user.name;
        };

        /**
         * Returns the current User object.
         */
        DCAuth.prototype.getUser = function getUserName() {
            return _.assign( {}, user );
        };
        /**
         * Returns the current ENV object.
         */
        DCAuth.prototype.getENV = function getENV() {
            return _.assign( {}, ENV );
        };

        /**
         * Returns the current User employeeId.
         */
        DCAuth.prototype.getUserEmployeeId = function getUserEmployeeId() {
            return user.employeeId;
        };

        /**
         * Returns the current User name in human readable form.
         */
        DCAuth.prototype.getUserId = function getUserId() {
            return user.id;
        };

        /**
         * Returns company name.
         * @returns {String}
         */
        DCAuth.prototype.getCompanyName = function() {
            return user.coname;
        };

        /**
         * Returns license data.
         * @returns {String}
         */
        DCAuth.prototype.getLicenseData = function() {
            return ENV.licenses;
        };

        DCAuth.prototype.ignoresLicensing = function() {
            return ENV.ignoresLicensing;
        };

        DCAuth.prototype.hasLicense = function hasLicense( licenseSet, licenseName, licenseData ) {
            if( DCAuth.prototype.ignoresLicensing() ) {
                return true;
            }

            var
                _licenseData = licenseData || this.getLicenseData(),
                licenseSetVal = _licenseData[ licenseSet ],
                licenseSetValType = Object.prototype.toString.call( licenseSetVal );
            switch( licenseSetValType ) {
                case "[object String]":
                    return licenseName === licenseSetVal;
                case "[object Array]":
                    return -1 < licenseSetVal.indexOf( licenseName );
                default:
                    return false;
            }
        };
        DCAuth.prototype.hasSpecialModule = function hasSpecialModule( licenseName ) {
            return this.hasLicense( "specialModules", licenseName );
        };
        DCAuth.prototype.hasBaseSystemLevel = function hasBaseSystemLevel( licenseName ) {
            return this.hasLicense( "baseSystemLevel", licenseName );
        };
        DCAuth.prototype.hasBaseServices = function hasBaseServices( licenseName ) {
            return this.hasLicense( "baseServices", licenseName );
        };
        DCAuth.prototype.getBaseSystemLevel = function getBaseSystemLevel() {
            return this.getLicenseData().baseSystemLevel;
        };
        DCAuth.prototype.getDoctorsAmount = function getDoctorsAmount() {
            return this.getLicenseData().doctorsAmount;
        };
        DCAuth.prototype.hasAdditionalService = function hasAdditionalService( licenseName ) {
            return this.hasLicense( "additionalServices", licenseName );
        };
        DCAuth.prototype.hasTelematikServices = function hasTelematikServices( licenseName ) {
            return this.hasLicense( "telematikServices", licenseName );
        };
        DCAuth.prototype.hasSupportLevel = function hasSupportLevel( licenseName ) {
            return this.hasLicense( "supportLevel", licenseName );
        };
        DCAuth.prototype.getSupportLevel = function getSupportLevel() {
            return this.getLicenseData().baseSystemLevel;
        };
        DCAuth.prototype.getUserRoles = function getUserRoles() {
            if( user && user.roles ) {
                return user.roles;
            }
        };

        /**
         * Checks if specified user has specified group
         * @param {String} group
         * @returns {Boolean}
         */
        DCAuth.prototype.memberOf = function( group ) {
            if( user && user.groups ) {
                return user.groups.some( function( data ) {
                    return group === data.group;
                } );
            } else {
                return false;
            }
        };

        /**
         * Checks if specified user has access to specified api function
         * @method hasSectionAccess
         * @param {String} api function api path ('<API>.<method>'), e.g. 'kbvlog.approve'
         * @see Y.doccirrus.authpub.restrictedAPI
         * @returns {Boolean}
         */
        DCAuth.prototype.hasAPIAccess = function( apiPath ) {
            var api = apiPath.split( '.' ),
                accessGroups = Y.doccirrus.authpub.restrictedAPI;
            if( user && user.groups && api && api.length ) {
                api.every( function( _api ) {
                    accessGroups = accessGroups[ _api ];
                    return 'undefined' !== typeof accessGroups;
                } );
                if( !accessGroups ) {
                    Y.log( 'The api path: "' + apiPath + '" does not exist', 'error', NAME );
                    return false;
                }
                return user.groups.some( function( data ) {
                    return -1 === accessGroups.indexOf( data.group );
                } );
            } else {
                return false;
            }
        };

        /**
         * Checks if the prc has license to use the module
         * @param {String} section module section, e.g. CaseFileMojit
         * @returns {*}
         */
        DCAuth.prototype.hasModuleAccess = function( section ) {
            var
                accessGroups = Y.doccirrus.authpub.sectionsAccess,
                requiredLicense = (accessGroups[ section ] && accessGroups[ section ].requiredLicense);
            if( !requiredLicense ) {
                return true;
            }

            switch( requiredLicense.type ) {
                case Y.doccirrus.schemas.settings.licenseCategories.BASE_SERVICES:
                    return myAuth.hasBaseServices( requiredLicense.license );
                case Y.doccirrus.schemas.settings.licenseCategories.ADDITIONAL_SERVICES:
                    return myAuth.hasAdditionalService( requiredLicense.license );
                default:
                    return false;
            }
        };

        DCAuth.prototype.getRequiredLicense = function( section ) {
            var
                accessGroups = Y.doccirrus.authpub.sectionsAccess;
            return (accessGroups[ section ] && accessGroups[ section ].requiredLicense && accessGroups[ section ].requiredLicense.license) || '';
        };

        /**
         * Checks if specified user has permission to open specified section of the system
         * @method hasSectionAccess
         * @param {String} section section of system, can be: Mojit or section of mojit
         *      syntax for section: '<Mojit>.<Section>' e.g. 'UserMgmtMojit.companyadmin'
         *      takes property '_access' of specified section if it exists, otherwise value of section.
         * @see Y.doccirrus.authpub.sectionsAccess
         * @returns {Boolean}
         */
        DCAuth.prototype.hasSectionAccess = function( section ) {
            var sections = section.split( '.' ),
                accessGroups = Y.doccirrus.authpub.sectionsAccess;
            if( user && user.groups && sections && sections.length ) {
                sections.every( function( _section ) {
                    accessGroups = accessGroups[ _section ];
                    return 'undefined' !== typeof accessGroups;
                } );
                if( !accessGroups ) {
                    Y.log( 'The section path: "' + section + '" does not exist', 'error', NAME );
                    return false;
                }
                //                accessGroups = accessGroups._access || accessGroups;

                return user.groups.some( function( data ) {
                    return -1 !== accessGroups.indexOf( data.group );
                } );
            } else {
                return false;
            }

        };

        DCAuth.prototype.isAppDeliveredFromPUC = function() {
            var host = window.location.host,
                regex = new RegExp( '^puc\\.' );
            return Boolean( regex.exec( host ) );
        };

        DCAuth.prototype.getPatientPortalUser = function() {
            return ENV.patientportal;
        };
        myAuth.init();

        Y.namespace( 'doccirrus' ).auth = myAuth;

    },
    '0.0.1', {
        requires: [
            'json',
            'dcauthpub',
            'company-schema'
        ]
    }
);
