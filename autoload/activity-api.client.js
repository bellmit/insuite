/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, moment, ko, Promise */
/*jshint latedef:false */
YUI.add( 'activity-api', function( Y, NAME ) {
    'use strict';
    /**
     * @module activity-api
     */
    Y.namespace( 'doccirrus.api.activity' );
    var
        NS = Y.doccirrus.api.activity,

        catchUnhandled = Y.doccirrus.promise.catchUnhandled;

        //unwrap = ko.unwrap,
        //peek = ko.utils.peekObservable,

    var CASE_FOLDER_TYPE_TO_COUNTRY_MAP = Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP;

    /**
     * @abstract
     * @class FormBasedActivityAPI
     * @constructor
     */
    function FormBasedActivityAPI( /* config */ ) {
        var
            self = this;

        self.initFormBasedActivityAPI = function FormBasedActivityAPI_initFormBasedActivityAPI() {
            var self = this;

            self.canHaveForm = true;

            //  keep track of slow form operations, so as not to serialize/save a form while mapping is partially complete MOJ-10465
            self._formBusy = ko.observable( 0 );
            self._incFormBusy = function __incFormBusy() { self._formBusy( self._formBusy() + 1 ); };
            self._decFormBusy = function __decFormBusy() { self._formBusy( self._formBusy() - 1 ); };

            if (!self.formLookupInProgress) {
                //  state of form lookup, to make form view wait on form lookup
                //  should generally be defined in FormBasedActivityModel, but not always
                self.formLookupInProgress = ko.observable( false );
            }

            //  if this activity type should have a default form then look it up and assign it
            self._setFormForActType( self.toJSON(), false );

            self.actTypeChangeListener = self.actType.subscribe( function() {
                Y.log('(API) activity type changed to: ' + self.actType() + ' checking for a default form', 'warn', NAME);
                self._setFormForActType( self.toJSON(), true );
            } );

            switch(self.actType()) {
                case 'UTILITY':
                    if (self.catalogShort) {
                        self.catalogShortListener = self.catalogShort.subscribe( function () {
                            Y.log('(API) utility catalog type changed to: ' + self.catalogShort() + ' checking for a default form', 'warn', NAME);
                            self._setFormForActType( self.toJSON(), true );
                        } );
                    }
                    break;
                case 'KBVUTILITY':
                    if (self.subType) {
                        self.subTypeListener = self.subType.subscribe( function () {
                            Y.log('(API) kbv utility catalog subType changed to: ' + self.subType() + ' checking for a default form', 'warn', NAME);
                            self._setFormForActType( self.toJSON(), true );
                        } );
                    }
                    break;

                case 'LABREQUEST':  //  deliberate fallthrough
                    if (self.labRequestType) {
                        self.labRequestTypeListener = self.labRequestType.subscribe( function () {
                            Y.log('(API) lab request type changed to: ' + self.labRequestType() + ' checking for a default form', 'warn', NAME);
                            self._setFormForActType( self.toJSON(), true );
                        } );
                    }
                    break;

                case 'AU':
                    if (self.auType) {
                        self.auTypeListener = self.auType.subscribe( function () {
                            Y.log('(API) au type changed to: ' + self.auType() + ' checking for a default form', 'warn', NAME);
                            self._setFormForActType( self.toJSON(), true );
                        } );
                    }
                    break;
            }

        };



        /**
         *  If this type of activity has a default form, look up the form and assign it
         *
         *  If reset is true then any existing form will be replaced if a default is available
         *  (used when chaging activity types)
         *
         *  @param params
         *  @param reset
         *  @returns {Promise}
         *  @private
         */

        self._setFormForActType = function( params , reset ) {
            var
                self = this,
                formRole = '',
                caseFolderType = (self.get('caseFolder') ||  {}).type,
                countyMode = CASE_FOLDER_TYPE_TO_COUNTRY_MAP[caseFolderType || "ANY"];

            formRole = Y.doccirrus.getFormRole( params.actType, caseFolderType );

            //  special case for UTILITY, LABREQUEST and AU activities
            if( 'UTILITY' === params.actType ) {
                switch( params.subType ) {
                    case 'PHYSIO':
                        formRole = countyMode === "CH" ? Y.namespace( 'doccirrus' ).getFormRole( 'UTILITY', caseFolderType ) : 'casefile-physio';
                        break;
                    case 'LOGO':
                        formRole = 'casefile-logo';
                        break;
                    case 'ERGO':
                        formRole = 'casefile-ergo';
                        break;
                }
            }

            if( 'KBVUTILITY' === params.actType ) {
                switch( params.subType ) {
                    case 'PHYSIO':
                        formRole = 'casefile-physio';
                        break;
                    case 'LOGO':
                        formRole = 'casefile-logo';
                        break;
                    case 'ERGO':
                        formRole = 'casefile-ergo';
                        break;
                    case 'ET':
                        formRole = 'casefile-ergo';
                        break;
                }
            }

            if( 'LABREQUEST' === params.actType ) {
                switch( params.labRequestType ) {
                    case 'LABREQUESTTYPE':
                        formRole = 'casefile-labrequest';
                        break;
                    case 'LABREQUESTTYPE_L':
                        formRole = 'casefile-labrequest-l';
                        break;
                    case 'LABREQUESTTYPE_A':
                        formRole = 'casefile-labrequest-a';
                        break;
                }
            }

            if ( 'AU' === params.actType ) {
                if( !self._auFormRole || '' === self._auFormRole() ) {
                    // no form role to be resolved, return early
                    return Promise.resolve('');
                }
                formRole = self._auFormRole();
            }

            if( '' === formRole ) {
                // no form role to be resolved, return early
                return Promise.resolve('');
            }

            if( self.formId && self.formId() && '' !== self.formId() && !reset ) {
                // activity has already been assigned a form, do no override from role
                return Promise.resolve('');
            }

            function onConfigLoaded(formsConfig) {
                formsConfig = formsConfig.data ? formsConfig.data : formsConfig;

                if (formsConfig.hasOwnProperty(formRole)) {
                    Y.log('setting form for role: ' + formRole + ' to ' + formsConfig[formRole], 'debug', NAME);
                    self.formId( formsConfig[formRole] );
                    self.formVersion( '' );
                } else {
                    Y.log('no configured form for role: ' + formRole, 'info', NAME);
                }

                //  since we can't be sure the form tab is open we need to look up form name here, used for
                //  text tab / activity.content

                if ( self.formId() && '' !== self.formId() ) {
                    //  check BFB status of this instance and get form name for activity content field
                    Y.dcforms.loadCertNumbers( onBFBSettingsCheck );
                } else {
                    //  nothing further to do
                    self.formLookupInProgress( false );
                }
            }

            function onBFBSettingsCheck( err ) {
                if ( err ) {
                    Y.log( 'Error loading certificate numbers: ' + JSON.stringify( err ), 'warn', NAME );
                }

                Y.dcforms.getFormListing( '', self.formId(), onFormListingLoaded );
            }

            function onFormListingLoaded( err, listing ) {
                if (err) { return; }

                var
                    userLang = Y.dcforms.getUserLang(),
                    clientBFB = Y.dcforms.clientHasBFB();

                if ( listing.title && listing.title[userLang] ) {

                    if( -1 === ['UTILITY', 'KBVUTILITY'].indexOf( self.actType() ) ) {
                        //  only override userContent if empty, may have custom backmappings for MOJ-7040
                        if ( !self.userContent() || '' === self.userContent() ) {
                            self.userContent( listing.title[userLang] );
                        }
                    }

                    self.formVersion( listing.latestVersionId );
                    Y.log( 'set formversion: ' + self.formVersion(), 'debug', NAME );

                    if (!clientBFB && listing.bfbAlternative && '' !== listing.bfbAlternative) {
                        Y.log( 'using BFB alternative form: ' + listing.bfbAlternative, 'debug', NAME );
                        self.formId( listing.bfbAlternative );
                        Y.dcforms.getFormListing( '', self.formId(), onFormListingLoaded );
                    }
                }

                self.formLookupInProgress( false );
            }

            self.formLookupInProgress( true );

            return Y.doccirrus.jsonrpc.api.formtemplate
                .getconfig( {} )
                .then( onConfigLoaded );
            //  .catch( catchUnhandled );
        };


        self._isMaskType = function() {
            var self = this;

            switch( self.actType() ) {
                case 'LABREQUEST':          //  deliberate fallthrough
                case 'UTILITY':             //  deliberate fallthrough
                case 'AU':                  //  deliberate fallthrough
                case 'RECEIPT':             //  deliberate fallthrough
                    return true;

                //  Referral is masked, but making editable for MOJ-7071
                //case 'REFERRAL':

            }

            return false;
        };

    }

    /**
     * @method loadActivityById
     * @param {String} activityId
     * @returns {Promise}
     */
    NS.loadActivityById = function( activityId ) {
        return new Promise( function( resolve, reject ) {
            if( !activityId ) {
                return reject( 'invalid activity id' );
            }
            Y.doccirrus.jsonrpc.api.activity
                .read( { query: { _id: activityId } } )
                .then( function( response ) {
                    return Array.isArray( response.data ) && response.data[ 0 ] || null;
                } )
                .done( resolve )
                .fail( reject );
        } );
    };

    /**
     * @method createActivity
     * @param {Object} parameters
     * @param {Object} parameters.patient
     * @param {Object} parameters.caseFolder
     * @param {Object} parameters.activity
     * @param {Object} parameters.currentUser
     * @returns {Promise}
     */
    NS.createActivity = function( parameters ) {
        var
            patient = parameters.patient,
            currentUser = parameters.currentUser,
            caseFolder = parameters.caseFolder,
            caseFolderId = caseFolder && caseFolder._id,
            caseFolderType = caseFolder && caseFolder.type,
            caseFolderAdditionalType = caseFolder && caseFolder.additionalType,

            patientId = patient && patient._id,
            // MOJ-10029
            localValueSelectedDoctorParts = (Y.doccirrus.utils.localValueGet( 'incase-selected-doctor' ) || '').split( '-' ),

            insuranceStatus = patient && patient.insuranceStatus,
            locationId = localValueSelectedDoctorParts[1] || null,
            employeeId = localValueSelectedDoctorParts[0] || null,
            countryMode = CASE_FOLDER_TYPE_TO_COUNTRY_MAP[caseFolderType],

            currentInsurance,
            billingFactorType;

        if( insuranceStatus && insuranceStatus.length ) {
            insuranceStatus.some( function( insurance ) {
                if( insurance.type === caseFolderType ) {
                    currentInsurance = insurance;
                    if( !locationId ) {
                        locationId = insurance.locationId;
                    }
                    return true;
                }
                return false;
            } );
        } else if( !locationId ) {
            locationId = patient && patient.locationId;
        }

        if( currentInsurance && ('PRIVATE' === caseFolderType || 'SELFPAYER' === caseFolderType) && parameters.activity && 'TREATMENT' === parameters.activity.actType ) {
            billingFactorType = currentInsurance.billingFactor;
        }

        if( (Y.doccirrus.schemas.casefolder.additionalTypes.ASV === caseFolderAdditionalType && currentUser && currentUser.locations && currentUser.locations[0]) ||
            (currentUser && currentUser.locations && currentUser.locations.length && !currentUser.locations.some( function( location ) {
                return location._id === locationId;
            } )) ) {

            locationId = currentUser.locations && currentUser.locations[0]._id;
        }

        if( !(patient && patientId) ) {
            return new Promise( function( resolve, reject ) {
                reject( 'insufficient parameters' );
            } );
        }

        return Promise
            .props( {} )
            .then( function() {
                return Y.merge( {
                    billingFactorType: billingFactorType,
                    countryMode: countryMode,
                    timestamp: moment().toJSON(),
                    patientId: patientId,
                    caseFolderId: caseFolderId,
                    locationId: locationId || Y.doccirrus.schemas.location.getMainLocationId(),
                    employeeId: employeeId
                }, parameters.activity );
            } )
            .catch( catchUnhandled );
    };

    /**
     * @method transitionActivity
     * @param {Object}  parameters
     * @param {Object}  parameters.activity
     * @param {Object}  parameters.transitionDescription
     * @param {boolean} [parameters.letMeHandleErrors=false]
     * @param {boolean} [parameters.skipInvalidateParentActivities=false]
     * @param {Boolean} [parameters.isTest=false]
     * @param {Boolean} [parameters.recreatePdf=false]      Make a new PDF after successful transition
     * @param {String}  [parameters.printPdf]               Name of printer to use
     * @param {Number}  [parameters.printCopies]            Number of copies to print
     * @param {Object}  [parameters.documents]              Documents to save
     * @returns {Promise}
     */
    NS.transitionActivity = function( parameters ) {
        var
            activity = parameters.activity,
            letMeHandleErrors = parameters.letMeHandleErrors,
            skipInvalidateParentActivities = parameters.skipInvalidateParentActivities,
            isTest = parameters.isTest,
            description = parameters.transitionDescription,
            promise;

        promise = new Promise( function( resolve, reject ) {

            if( !(activity && description) ) {
                return reject( 'transitionActivity: invalid parameters' );
            }
            var
                transitionName = description.transition,
                params = {
                    activity: activity,
                    transition: transitionName,
                    documents: parameters.documents ? parameters.documents : [],
                    printPdf: parameters.printPdf ? parameters.printPdf : null,
                    printCopies: parameters.printCopies ? parameters.printCopies : 0,
                    recreatePdf: parameters.recreatePdf || false,
                    skipInvalidateParentActivities: skipInvalidateParentActivities || false,
                    _isTest: (isTest ? 'true' : 'false')
                };

            if( description.tempId ) {
                Y.log( 'Setting transition to claim any attached documents for this activity', 'debug', NAME );
                params.tempid = description.tempId;
            }
            Y.doccirrus.jsonrpc.api.activity.doTransitionPlus( {
                    data: params
                } )
                .done( function( response ) {
                    var
                        data = response.data[ 0 ] && response.data[ 0 ].data;
                    resolve( data );
                } )
                .fail( function( error ) {

                    if ( error && [28007, 28008].indexOf( error.code ) !== -1 ) {
                        return reject(error);
                    }

                    if( !letMeHandleErrors ) {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    }

                    //  MOJ-6011 - removed promise.cancel for MOJ-6011 - caller needs to know about failures
                    //  to update the inTransition property
                    //promise.cancel();

                    reject( error );
                } );
        } );
        return promise;
    };

    /**
     * @method copyActivity
     * @param {Object} parameters
     * @param {String} parameters.activityId
     * @returns {Promise}
     */
    NS.copyActivity = function( parameters ) {
        var
            activityId = parameters.activityId,
            currentDate = parameters.currentDate || false,
            locationId = parameters.locationId,
            employeeId = parameters.employeeId,
            timestamp = parameters.timestamp,
            caseFolderId = parameters.caseFolderId,
            promise;

        promise = new Promise( function( resolve, reject ) {

            if( !activityId ) {
                return reject( 'invalid activity id' );
            }
            Y.doccirrus.jsonrpc.api.activity.copeActivity( {
                    data: {
                        activityId: activityId,
                        currentDate: currentDate,
                        locationId: locationId,
                        employeeId: employeeId,
                        timestamp: timestamp,
                        caseFolderId: caseFolderId
                    }
                } )
                .done( function( response ) {
                    var
                        data = response.data;
                    resolve( data );
                } )
                .fail( function( error ) {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    reject( error );
                } );
        } );
        return promise;
    };
    /**
     * @method getFormBasedActivityAPI
     * @returns {Object}
     */
    NS.getFormBasedActivityAPI = function() {
        return new FormBasedActivityAPI();
    };
    /**
     * @method getInitialDataForNewActivity
     * @params {Object} data
     * @params {String} data.caseFolderId
     * @params {String} data.patientId
     * @params {String} data.timestamp
     * @returns {Promise}
     */
    NS.getInitialDataForNewActivity = function( params ){
        var
            caseFolderId = params.caseFolderId,
            patientId = params.patientId,
            timestamp = params.timestamp,
            locationId = params.locationId,
            actType = params.actType;

        return new Promise( function( resolve, reject ) {
            Y.doccirrus.jsonrpc.api.activity.getNewActivityForFrontend( {
                    query: {
                        caseFolderId: caseFolderId,
                        patientId: patientId,
                        timestamp: timestamp,
                        actType: actType,
                        locationId: locationId,
                        selectedLocationId: params.selectedLocationId
                    }
                } )
                .done( function( response ) {
                    var
                        data = response.data;
                    resolve( data );
                } )
                .fail( function( error ) {
                    reject( error );
                } );
        } );
    };

    /**
     * Checks if mmi product has valid(up-to-date) data.
     * @param {Object} config
     * @param {String} config.catalogData data which should be updated
     * @param {String} config.insuranceIknr gkv insurance id
     * @param {Number} config.patientAge patient age
     * @param {String} config.bsnr
     * @param {String} config.lanr
     * @return {Promise}
     *
     */
    NS.checkMMiEntry = function( config ) {
        var
            catalogData = config.catalogData || {};
        return new Promise( function( resolve, reject ) {
            Y.doccirrus.jsonrpc.api.catalogusage.getMMIActualData( {
                    query: {
                        pzn: catalogData.phPZN,
                        patientAge: config.patientAge,
                        bsnr: config.bsnr,
                        lanr: config.lanr,
                        insuranceIknr: config.insuranceIknr
                    }
                } )
                .done( function( response ) {
                    var mmiData = response.data;
                    Y.each( mmiData, function( value, key ) {
                        if( undefined !== catalogData[ key ] ) {
                            catalogData[ key ] = value;
                        }
                    } );
                    resolve( catalogData );

                } )
                .fail( function( error ) {
                    Y.log( 'Can not get mmi product data. Probably MMi is not reachable.' + JSON.stringify( error ), 'debug', NAME );
                    reject( error );
                } );
        } );
    };

}, '3.16.0', {
    requires: [
        'oop',
        'promise',

        'JsonRpcReflection-doccirrus',
        'JsonRpc',

        'activity-schema',
        'location-schema',
        'casefolder-schema',

        'dc-comctl',
        'dcinfrastructs',
        'dcforms-roles'
    ]
} );
