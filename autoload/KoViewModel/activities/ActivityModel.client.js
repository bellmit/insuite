/**
 * User: pi
 * Date: 13/08/15  11:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI, ko, moment, _ */

YUI.add( 'ActivityModel', function( Y, NAME ) {

        'use strict';

        /**
         * @module ActivityModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            i18n = Y.doccirrus.i18n,
            ACTIVITY_UPDATED = i18n( 'activityModel_clientJS.message.ACTIVITY_UPDATED' ),
            localStorageKeyForTreatmentCatalogShort = 'prefered-catalogShort-TREATMENT',
            isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland(),
            linkedActivitiesApiMixin = Y.doccirrus.api.linkedactivities.getLinkedActivitiesAPI();

        //  -- used by _confirmDiscardChanges
        //NEW_ENTRY = i18n( 'InCaseMojit.activity_model_clientJS.label.NEW_ENTRY' );

        function ActivityModel( config ) {
            ActivityModel.superclass.constructor.call( this, config );
        }

        ActivityModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InCaseMojit' ) || Y.doccirrus.utils.getMojitBinderByType( 'MirrorPatientMojit' );
                },
                lazyAdd: false
            },
            locations: {
                value: [],
                lazyAdd: false
            },
            caseFolder: {
                value: null,
                lazyAdd: false
            },
            lastSchein: {
                value: null,
                lazyAdd: false
            },
            lastScheinObservable: {
                value: ko.observable( null ),
                lazyAdd: false
            },
            icdsObj: {
                value: [],
                lazyAdd: false,
                cloneDefaultValue: true,
                getter: function( val ) {
                    return Y.clone( val );
                }
            },
            icdsExtraObj: {
                value: [],
                lazyAdd: false,
                cloneDefaultValue: true,
                getter: function( val ) {
                    return Y.clone( val );
                }
            },
            activitiesObj: {
                value: [],
                lazyAdd: false,
                cloneDefaultValue: true,
                getter: function( val ) {
                    return Y.clone( val );
                }
            },
            continuousIcdsObj: {
                value: [],
                lazyAdd: false,
                cloneDefaultValue: true,
                getter: function( val ) {
                    return Y.clone( val );
                }
            },
            ignoreModificationsOn: {
                value: [
                    'status', // ignored because might change if model is modified
                    'catalogRef' // ignored because of MOJ-5822
                ],
                cloneDefaultValue: true,
                lazyAdd: false
            },
            attachmentsObj: {
                value: [],
                lazyAdd: false,
                cloneDefaultValue: true,
                getter: function( val ) {
                    return Y.clone( val );
                }
            },
            /**
             *  Populated from selectedContact, receipient of a letter, MOJ-11944
             */
            selectedContactObj: {
                value: [],
                lazyAdd: false,
                cloneDefaultValue: true,
                getter: function( val ) {
                    return Y.clone( val );
                }
            },
            /**
             * Used to pass additional data to activity process(post,pre)
             * activity._additionalTransitionData (PUT)
             * activity.originalData_._additionalTransitionData (POST)
             * @property additionalTransitionData
             * @default {}
             */
            additionalTransitionData: {
                value: {},
                lazyAdd: false
            }
        };

        Y.extend( ActivityModel, KoViewModel.getBase(), {
                initializer: function ActivityModel_initializer() {
                    var
                        self = this;

                    self.initActivityModel();
                    self.initSocketListeners();

                    //  mixed in from linkedActivitiesAPIMixin
                    self.initActivityArrays();
                    self.loadLinkedActivities();
                    self.setUpdateLinkedActivitiesOnChange( true );
                },
                /**
                 * override me
                 */
                onActivityUnlinked: function( /*activity*/ ){ return true; },
                /**
                 * override me
                 */
                onActivityLinked: function( /*activity*/ ){ return true; },
                /**
                 * override me
                 */
                onActivityLinkBlocked: function( /*activity*/ ){ return false; },
                destructor: function ActivityModel_destructor() {
                    var
                        self = this;
                    self.destroySocketListeners();
                },
                initActivityModel: function() {
                    var
                        self = this,
                        caseFolder = self.get( 'caseFolder' );

                    self.initDefaults();

                    self.initComputeStatus();

                    //TODO if used only by schein => move to ScheinModel
                    self.employee = ko.observable( null );
                    self.addDisposable( ko.computed( function() {
                        var
                            employeeId = unwrap( self.employeeId ),
                            locationId = peek( self.locationId ),
                            locations,
                            binder = self.get( 'binder' );
                        if( binder && binder.getInitialData ) {
                            locations = binder.getInitialData( 'location' ) || [];
                        } else {
                            locations = self.get( 'locations' ) || [];
                        }
                        locations.some( function( location ) {
                            if( locationId === location._id ) {
                                location.employees.some( function( employee ) {
                                    if( employeeId === employee._id ) {
                                        self.employee( employee );
                                        return true;
                                    }
                                    return false;
                                } );
                                return true;
                            }
                            return false;
                        } );
                    } ) );

                    self._isEditable = ko.observable();

                    self.addDisposable( ko.computed( function() {
                        var
                            status = unwrap( self.status ),
                            actType = unwrap( self.actType ),
                            mirrorActivityId = unwrap( self.mirrorActivityId );

                        var readOnlyFields = Y.doccirrus.schemas.activity.getReadOnlyFields( {
                            'status': status,
                            'mirrorActivityId': mirrorActivityId
                        } );

                        if( 0 !== readOnlyFields.length ) {
                            return self._isEditable( false );
                        }

                        if( 'INVOICEREF' === actType ) {
                            return self._isEditable( true );
                        }

                        switch( status ) {
                            case 'APPROVED':        //  deliberate fallthrough
                            case 'DELETED':         //  deliberate fallthrough
                            case 'ARCHIVED':        //  deliberate fallthrough
                            case 'BILLED':          //  deliberate fallthrough
                            case 'PAID':            //  deliberate fallthrough
                            case 'REMINDED':        //  deliberate fallthrough
                            case 'WARN1':           //  deliberate fallthrough
                            case 'WARN2':           //  deliberate fallthrough
                            case 'BILLINGREJECTED': //  deliberate fallthrough
                            case 'DERECOGNIZED':    //  deliberate fallthrough
                            case 'DEBTCOLLECT':     //  deliberate fallthrough
                            case 'CREDITED':        //  deliberate fallthrough
                            case 'KBVBILLED':       //  deliberate fallthrough
                            case 'KBVREJECTED':     //  deliberate fallthrough
                            case 'CANCELLED':
                            case 'LOCKED':
                                return self._isEditable( false );
                        }

                        return self._isEditable( true );
                    } ) );

                    self.addDisposable( self.userContent.subscribe( function() {
                        var activityData = self.toJSON();

                        activityData._activitiesObj = self.get( 'activitiesObj' );
                        self.content( Y.doccirrus.schemas.activity.generateContent( activityData ) );
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var
                            locationId = unwrap( self.locationId ),
                            timestamp = unwrap( self.timestamp );
                        if( !ko.computedContext.isInitial() ) {
                            Y.doccirrus.jsonrpc.api.patient.lastSchein( {
                                query: {
                                    caseFolderId: peek( self.caseFolderId ),
                                    patientId: peek( self.patientId ),
                                    timestamp: timestamp,
                                    locationId: locationId
                                }
                            } )
                                .done( function( response ) {
                                    var
                                        data = response && response.data && response.data[0];
                                    self.set( 'lastSchein', data );
                                    self.get( 'lastScheinObservable' )( data );
                                } );

                        } else {
                            self.get( 'lastScheinObservable' )( self.get( 'lastSchein' ) );
                        }
                    } ) );

                    if( self.isNew() ) {
                        self.checkLastSchein();
                    }

                    if( Y.doccirrus.schemas.casefolder.additionalTypes.ASV === caseFolder.additionalType ) {
                        self.addDisposable( ko.computed( function() {
                            unwrap( self.locationId );
                            self.updateReadOnly();
                        } ) );
                    }

                    //  this is a temporary identifier used to link media and documents to new activities
                    //  once saved, activities have a database _id and linked items will be updated to use it

                    self._randomId = ko.observable( Y.doccirrus.comctl.getRandId() );

                    self.updateReadOnly();

                },
                /**
                 * Initialise certain default values
                 */
                initDefaults: function() {
                    var
                        self = this;

                    switch( peek( self.actType ) ) {
                        case 'TREATMENT':
                            self.initDefaultsTreatment();
                            break;
                    }

                },
                /**
                 * Initialise certain default values for actType "TREATMENT"
                 */
                initDefaultsTreatment: function() {
                    var
                        self = this;

                    self.initPreferredCatalogShortTreatment();
                },
                /**
                 * Initialise a preferred default value for catalogShort in case of actType "TREATMENT"
                 */
                initPreferredCatalogShortTreatment: function() {
                    var
                        self = this,
                        preferredCatalogShort = self.getPreferredCatalogShortTreatment(),
                        caseFolder = self.get( 'caseFolder' ),
                        forInsuranceType = caseFolder && caseFolder.type;
                    if( self.isNew() && (Y.doccirrus.schemas.patient.isPrivateInsurance( {type: forInsuranceType} ) ||
                                         'SELFPAYER' === forInsuranceType ||
                                         Y.doccirrus.schemas.casefolder.additionalTypes.QUOTATION === caseFolder.additionalType) ) {
                        if( preferredCatalogShort ) {
                            self.catalogShort( preferredCatalogShort );
                        }
                        else {
                            self.catalogShort( 'GOÄ' );
                        }
                    }
                    self.addDisposable( self.catalogShort.subscribe( function( val ) {
                        if( val && 'EBM' !== val && 'UVGOÄ' !== val ) {
                            Y.doccirrus.utils.localValueSet( localStorageKeyForTreatmentCatalogShort, val );
                        }
                    } ) );
                },
                getPreferredCatalogShortTreatment: function() {
                    return Y.doccirrus.utils.localValueGet( localStorageKeyForTreatmentCatalogShort );
                },
                _randomId: null,

                checkLastSchein: function() {
                    var
                        self = this,
                        schein = self.get( 'lastSchein' );
                    if( !schein ) {
                        return;
                    }
                    // always set location of last schein in current case for new activities if location is undefined
                    if( !peek( self.locationId ) ) {
                        self.locationId( schein.locationId );
                    }

                },
                initComputeStatus: function() {
                    var
                        self = this;

                    //  Testing harness, uncomment this if you need to know what is making an approved activity dirty
                    /*
                    var observables = self.readBoilerplate( true ), k;
                    console.log( '(****) observables: ', observables );
                    function makeHandler( k ) {
                        return function( newVal ) {
                            console.log( '(****) activity property ' + k + ' has changed to: ', newVal );
                        };
                    }
                    for ( k in observables ) {
                        if ( observables.hasOwnProperty( k ) ) {
                            if ( self[k] && self[k].subscribe ) {
                                self[k + 'Debug'] = self[k].subscribe( makeHandler( k ) );
                            }
                        }
                    }
                    */

                    self.addDisposable( ko.computed( function() {
                        var
                            isModified = self.isModified(),
                            status = unwrap( self.status );

                        /**
                         * When model is considered modified, status is set to 'CREATED'.
                         * If not modified initial status is reapplied.
                         */
                        if( isModified ) {
                            if( !('CREATED' === status || 'INVALID' === status || 'LOCKED' === status || 'IMPORTED' === status) ) {
                                //  to debug form mappers, to find which line is making an activity dirty
                                //  will need to change isModified so as not to defer evaluation
                                //console.log('Marking activity as dirty:', new Error().stack);

                                self.status( 'CREATED' );
                            }
                        }
                        else {
                            //console.log( 'ActivityModel.client.js setting initial status: ', self.get( 'data.status' ) );
                            if ( self.get( 'data.status' ) ) {
                                self.status( self.get( 'data.status' ) );
                            } else {
                                //  No intial status, assume newly created
                                self.status( 'CREATED' );
                            }

                        }

                    } ).extend( { rateLimit: 0 } ) ); // async because of get data
                },
                /**
                 * Now backed by doTransitionPlus on the server (can save documents, make PDFs)
                 *
                 * @method transitionActivity
                 * @param {Object}  parameters
                 * @param {Object}  parameters.transitionDescription
                 * @param {Boolean} [parameters.isTest=false]
                 * @param {Boolean} [parameters.recreatePdf=false]      Make a new PDF after successful transition
                 * @param {String}  [parameters.printPdf]               Name of printer to use
                 * @param {Number}  [parameters.printCopies]            Number of copies to print
                 * @param {Object}  [parameters.documents]              Documents to save
                 * @param {Boolean} [parameters.letMeHandleErrors=true]
                 * @returns {Promise}
                 */
                transitionActivity: function( parameters ) {
                    var
                        self = this,
                        activity = self.toJSON(),
                        binder = self.get( 'binder' ),
                        quotationTreatments = binder.getQuotationTreatments(),
                        letMeHandleErrors = parameters.letMeHandleErrors;

                    if( Y.Lang.isUndefined( letMeHandleErrors ) ) {
                        letMeHandleErrors = true;
                    }

                    if( self.isNew() && quotationTreatments ) {
                        activity._modifiedQuotationTreatments = quotationTreatments.getModifications();
                    }

                    activity._additionalTransitionData = self.get( 'additionalTransitionData' );
                    self.inTransition( true );

                    return Y.doccirrus.api.activity
                        .transitionActivity( {
                            activity: activity,
                            transitionDescription: parameters.transitionDescription,
                            isTest: parameters.isTest,
                            documents:  parameters.documents || [],
                            printPdf: parameters.printPdf || null,
                            printCopies: parameters.printCopies || 0,
                            recreatePdf: parameters.recreatePdf || false,
                            letMeHandleErrors: letMeHandleErrors
                        } )
                        .then( function onTransitionSuccess( data ) {
                            self.set( 'data', data );
                            self.setNotModified();
                            self.inTransition( false );
                            self.updateReadOnly();
                            return data;
                        } )
                        .catch( function onTransitionFailed( err ) {
                            var message,
                                aDCWindow;

                            if( err && [28007, 28008].indexOf( err.code ) !== -1 ) {
                                message = Y.doccirrus.errorTable.getErrorsFromResponse( err )[0].message +
                                          ' <a href="/incase#/patient/' + activity.patientId + '/section/maindata"' +
                                          'target="_blank">Patient editieren</a>';

                                aDCWindow = new Y.doccirrus.DCWindow( {
                                    title: 'Fehler',
                                    bodyContent: message,
                                    icon: Y.doccirrus.DCWindow.ICON_ERROR,
                                    render: document.body,
                                    modal: true,
                                    visible: true,
                                    centered: true,
                                    alignOn: [],
                                    dragable: false,
                                    maximizable: false,
                                    resizeable: false,
                                    buttons: {
                                        header: ['close'],
                                        footer: [
                                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                            Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                                isDefault: true,
                                                action: onRetrySaveClicked
                                            } )
                                        ]
                                    }

                                } );
                            }

                            function onRetrySaveClicked( e ) {
                                e.target.button.disable();
                                var binder = self.get( 'binder' ),
                                    transitionDescription = Y.doccirrus.schemas.activity.getTransitionDescription( 'validate' ),
                                    caseFileVM = unwrap( binder.currentView ),
                                    activityDetailsVM = unwrap( caseFileVM.activityDetailsViewModel );

                                activityDetailsVM.saveAttachmentsAndTransition( {
                                    transitionDescription: transitionDescription
                                } );

                                aDCWindow.hide();
                            }

                            Y.log( 'transition failed: ' + JSON.stringify( err ), 'warn', NAME );
                            self.inTransition( false );
                            if( parameters.transitionDescription && parameters.transitionDescription.transition === 'approve' ) {
                                binder.removeJob( activity._id );
                            }
                            return Promise.reject( err );
                        } );
                },
                /**
                 * Transition fires off a number of listeners, which cause spurious actions in the form mappers
                 * This property is set true during transition so they may be ignored
                 *
                 * @property inTransition   {Boolean}
                 **/
                inTransition: ko.observable( false ),
                /**
                 * @method copyActivity
                 * @returns {Promise}
                 */
                copyActivity: function( /*parameters*/ ) {
                    var
                        self = this,
                        activityId = peek( self._id );

                    return Y.doccirrus.api.activity
                        .copyActivity( {
                            activityId: activityId
                        } )
                        .catch( catchUnhandled );
                },
                updateReadOnly: function() {
                    var
                        self = this,
                        data, paths,
                        binder = self.get( 'binder' ),
                        tenantSettings = binder.getInitialData( 'tenantSettings' ),
                        currentUser = binder.getInitialData( 'currentUser' ),
                        locations = currentUser.locations || [],
                        caseFolder = self.get( 'caseFolder' ),
                        locationIds = locations.map( function( location ) {
                            return location._id;
                        } ),
                        isASV = Y.doccirrus.schemas.casefolder.additionalTypes.ASV === caseFolder.additionalType,
                        currentLocationId = peek( self.locationId );
                    data = self.toJSON();
                    if( isASV || (true === (tenantSettings && tenantSettings.noCrossLocationAccess)) ) {
                        paths = Y.doccirrus.schemas.activity.getReadOnlyFields( data, {
                            locations:  locationIds
                        } );
                    } else {
                        paths = Y.doccirrus.schemas.activity.getReadOnlyFields( data );
                    }

                    if( isASV && locationIds.indexOf( currentLocationId ) === -1 ){
                        self._isEditable( false );
                    }

                    self.getModuleViewModelReadOnly()._makeReadOnly( {
                        paths: paths
                    } );
                },
                initSocketListeners: function() {
                    var
                        self = this,
                        activityId = peek( self._id ),
                        actType = peek( self.actType );
                    if( activityId ) {
                        Y.doccirrus.communication.notifyIfCollectionHasSubscriber( {
                            collection: 'activity',
                            documentId: activityId
                        } );
                        Y.doccirrus.communication.subscribeCollectionId( {
                            collection: 'activity',
                            documentId: activityId,
                            options: {
                                skipCurrentUser: true
                            },
                            callback: function( data, meta ) {
                                var
                                    text = Y.Lang.sub( ACTIVITY_UPDATED, { username: meta.username } );
                                Y.doccirrus.DCSystemMessages.removeMessage( Y.doccirrus.communication.EVENTS.SUBSCRIBE_COLLECTION );
                                Y.doccirrus.DCSystemMessages.addMessage( {
                                    messageId: Y.doccirrus.communication.EVENTS.SUBSCRIBE_COLLECTION,
                                    content: text,
                                    level: 'WARNING'
                                } );
                            }
                        } );
                    }
                    if( 'TELECONSULT' === actType ) {
                        Y.doccirrus.communication.on( {
                            event: "system.SAVE_TELECONSULT",
                            handlerId: 'ActivityModel',
                            done: function( message ) {
                                if( Y.config.debug ) {
                                    Y.log( 'system.SAVE_TELECONSULT event, data: ' + JSON.stringify( message.data ), 'debug', NAME );
                                }
                                var
                                    targetActivityId = message.data[0] && message.data[0].activityId,
                                    attachments = message.data[0] && message.data[0].attachments;
                                if( targetActivityId === peek( self._id ) ) {
                                    if( attachments ) {
                                        self.attachments( attachments );
                                        self.status( 'CREATED' );
                                    }
                                    self.approveTeleconsultActivity();
                                }
                            }
                        } );
                    }
                },
                destroySocketListeners: function() {
                    var
                        self = this,
                        activityId = peek( self._id );
                    if( activityId ) {
                        Y.doccirrus.communication.releaseSubscription( {
                            collection: 'activity',
                            documentId: activityId
                        } );
                    }
                    Y.doccirrus.communication.off( 'system.SAVE_TELECONSULT', 'ActivityModel' );
                },
                approveTeleconsultActivity: function() {
                    var
                        self = this,
                        status = peek( self.status ),
                        transitions = Y.doccirrus.schemas.activity.getTransitionList(),
                        binder = self.get( 'binder' ),
                        currentPatient = peek( binder.currentPatient );

                    function doApproveActivity() {
                        binder.transitionCurrentActivity( {
                            transitionDescription: transitions.approve,
                            reloadTable: true
                        } )
                            .then( function( activityData ) {
                                activityData = activityData || {};
                                var
                                    activityId = activityData._id;
                                // transfer to all other participants
                                Y.doccirrus.jsonrpc.api.patientTransfer.transferTeleConsult( {
                                    data: {
                                        activityId: activityId,
                                        patientId: peek( currentPatient._id ),
                                        participants: activityData.participants
                                    }
                                } ).done( function( /*body*/ ) {
                                    Y.doccirrus.DCSystemMessages.addMessage( {
                                        messageId: 'TRANSFER-' + activityId,
                                        content: i18n( 'InCaseMojit.casefile_detailJS.message.TRANSFER_SUCCEEDED' ),
                                        level: 'INFO'
                                    } );
                                } ).fail( function( error ) {
                                    var
                                        errMsg = i18n( 'InCaseMojit.casefile_detailJS.message.TRANSFER_FAILED' );

                                    Y.log( 'error in transferring teleConsult data: ' + JSON.stringify( error ), 'debug', NAME );
                                    Y.doccirrus.DCSystemMessages.addMessage( {
                                        messageId: 'TRANSFER-' + activityId,
                                        content: errMsg,
                                        level: 'WARNING'
                                    } );
                                } );
                            } );
                    }

                    if( 'CREATED' === status ) {
                        binder.transitionCurrentActivity( {
                            transitionDescription: transitions.validate
                        } )
                            .then( function() {
                                doApproveActivity();
                            } );
                    }
                    if( 'VALID' === status ) {
                        doApproveActivity();
                    }
                },

                linkedActivityCheckboxDisabled: function( linked, data ){
                    var
                        binder = this.get( 'binder' ),
                        currentActivity = peek( binder.currentActivity ),
                        currentPatient = peek( binder.currentPatient ),
                        hasCurrentActivity = Boolean( currentActivity ),
                        isEditable = hasCurrentActivity && unwrap( currentActivity._isEditable ),
                        currentActType = hasCurrentActivity ? unwrap( currentActivity.actType ) : '',
                        medidataRejected = hasCurrentActivity ? unwrap( currentActivity.medidataRejected ) : '',
                        onHoldActivities = hasCurrentActivity ? currentActivity.onHoldActivities || [] : [],
                        linkableTypes,
                        activities,
                        linkAny,
                        isInvoiceCommunicationActType = Y.doccirrus.schemas.activity.isInvoiceCommunicationActType,
                        activeCaseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab(),
                        caseFolderType = activeCaseFolder && activeCaseFolder.type,
                        isSwissCaseFolder = Y.doccirrus.schemas.casefolder.isSwissCaseFolderType( caseFolderType ),
                        invoiceMedication =
                            ('INVOICE' === data.actType && 'MEDICATION' === currentActType) ||
                            ('INVOICE' === currentActType && 'MEDICATION' === data.actType),
                        invoiceTreatment =
                            ('INVOICE' === currentActType && 'TREATMENT' === data.actType) ||
                            ('INVOICE' === data.actType && 'TREATMENT' === currentActType);

                    if( caseFolderType && 'PREPARED' === caseFolderType ) {
                        return true;
                    }

                    if( invoiceMedication && !( 'DISPENSED' === currentActivity.status()  || 'DISPENSED' === data.status ) ) {
                        return true;
                    }

                    // KAT-293 - exclude onHold activities for invoice
                    if( hasCurrentActivity && currentActivity.status() === 'ONHOLD' ) {
                        return true;
                    }

                    if( (invoiceMedication || invoiceTreatment) && onHoldActivities.includes( data._id ) ) {
                        return true;
                    }

                    //  TODO: move these special cases onto activity models
                    if( isSwiss && ( invoiceMedication || invoiceTreatment ) && !isSwissCaseFolder ) {
                        return true;
                    }
                    if( !isSwiss && invoiceMedication ) {
                        return true;
                    }

                    //  special case for invoice related activities, which can be assigned to invoices after approval
                    if( data.status === 'LOCKED' && !linked.includes(data._id) ) {
                        return true;
                    }

                    if(
                        hasCurrentActivity && isInvoiceCommunicationActType( currentActType ) ) {
                        isEditable = true;

                        //  MOJ-9777 exception to normal linking rules to allow receipts to link to invoices
                        //  the link will be reversed or removed when saved to the server, special
                        //  hooks in the receipt model contain business logic to check outstanding balance
                        if ( ( 'INVOICEREF' === data.actType || 'INVOICE' === data.actType ) && 'CANCELLED' !== data.status ) {
                            return false;
                        }

                    }

                    //  special case for linking billing related activities from invoices, which can happen
                    //  after approval without changing the current invoice state (receipt, crreditnote, wanr, bad debt, etc )
                    if(
                        hasCurrentActivity && ( 'INVOICE' === currentActType || 'INVOICEREF' === currentActType ) &&
                        isInvoiceCommunicationActType( data.actType )
                    )  {

                        if ( data.referencedBy && data.referencedBy[0] === unwrap( currentActivity._id ) ) {
                            //  own this other activity and can unlink it
                            return false;
                        }

                        if ( !data.referencedBy || 0 === data.referencedBy.length ) {
                            //  does not own this other activity but it is free to be claimed
                            return false;
                        }
                    }

                    // EXTMOJ-566 special case for treatment
                    if( hasCurrentActivity && 'TREATMENT' === currentActType ) {
                        activities = unwrap( currentActivity.activities );
                        // Can't be linked to self
                        if( unwrap( currentActivity._id ) === data._id ) {
                            return true;
                        }

                        if( ( !activities.length && Y.doccirrus.schemas.v_treatment.isLinkedPercentageCode( unwrap( currentActivity.code ) ) ) || (1 === activities.length && activities[0] === data._id ) ) {
                            return false;
                        }

                        // One treatment can't be linked to another (can for Swiss mode MOJ-11704)
                        // The "linked" should always have cost type
                        if( !isSwiss ) {
                            if( !unwrap( currentActivity.costType ) && !data.costType ) {
                                return true;
                            }
                        }

                        // Can't link two cost types
                        if( unwrap( currentActivity.costType ) && data.costType ) {
                            return true;
                        }
                    }

                    //  If we do not have a current activity then any activites may be selected in the
                    //  table, linking rules will be applied when an activity is created.
                    if( !hasCurrentActivity || false === isEditable ) {
                        return true;
                    }

                    if( ( 'INVOICEREF' === currentActType || 'INVOICE' === currentActType ) && 'CANCELLED' === data.status ) {
                        return true;
                    }

                    //  Get rules for linking to the current activity
                    linkableTypes = Y.doccirrus.schemas.activity.linkAllowedFor( currentActType );
                    linkAny = ( ( 1 === linkableTypes.length ) && ( '*' === linkableTypes[0] ) );

                    //  MOJ-7843 do not allow linking of treatments to invoices unless treatment is
                    //  in VALID or APPROVED states
                    if( ['INVOICEREF', 'INVOICE'].includes( currentActType ) && 'TREATMENT' === data.actType ) {

                        if( data.invoiceLogId || (data.invoiceId && (unwrap( currentActivity._id ) !== data.invoiceId)) ||
                            !['VALID', 'APPROVED'].includes( data.status ) ) {
                            if( medidataRejected ) {
                                return ((-1 === linkableTypes.indexOf( data.actType )) || linkAny);
                            }
                            return true;
                        }
                    }

                    if ( currentActType === "SURGERY" ) { // It is only possible to unlink alread linked activities
                        activities = unwrap( currentActivity.activities );
                        return activities.indexOf(data._id) === -1;
                    }

                    // Only allow linking of one medication on "Rezept T"
                    if( hasCurrentActivity && currentActType === 'PRESCRT' && linked.length > 0 && !linked.includes( data._id ) ) {
                        return true;
                    }
                    // Only allow linking of one medication on substitutePrescription "Ersatzverordnungen"
                    if( hasCurrentActivity && ['PUBPRESCR', 'PRESCRBTM', 'PRESCRT'].indexOf( currentActType ) !== -1 &&
                        unwrap( currentActivity.substitutePrescription ) && linked.length > 0 && !linked.includes( data._id ) ) {
                        return true;
                    }

                    return ( (-1 === linkableTypes.indexOf( data.actType )) || linkAny );
                },

                linkedActivityCheckboxTrigger: function( columnLinked, link, data ){
                    var
                        binder = this.get( 'binder' ),
                        currentActivity = peek( binder.currentActivity ),
                        caseFileVM = unwrap( binder.currentView ),
                        activityDetailsVM = unwrap( caseFileVM.activityDetailsViewModel ),
                        attachmentsModel = activityDetailsVM.attachmentsModel,
                        currentPatient = peek( binder.currentPatient ),

                        isRowLinked = columnLinked.isLinked( link ),
                        hasCurrentActivity = Boolean( currentActivity ),
                        isEditable = hasCurrentActivity && unwrap( currentActivity._isEditable ),
                        currentActType = unwrap( currentActivity.actType ),
                        onHoldActivities = hasCurrentActivity ? currentActivity.onHoldActivities || [] : [],
                        handledActivity,
                        isInvoiceCommunicationActType = Y.doccirrus.schemas.activity.isInvoiceCommunicationActType,
                        activeCaseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab(),
                        caseFolderType = activeCaseFolder && activeCaseFolder.type,
                        isSwissCaseFolder = Y.doccirrus.schemas.casefolder.isSwissCaseFolderType( caseFolderType ),
                        invoiceMedication =
                            ('INVOICE' === data.actType && 'MEDICATION' === currentActType) ||
                            ('INVOICE' === currentActType && 'MEDICATION' === data.actType),
                        invoiceTreatment =
                            ('INVOICE' === data.actType && 'TREATMENT' === currentActType) ||
                            ('INVOICE' === currentActType && 'TREATMENT' === data.actType);

                    if( invoiceMedication && !( 'DISPENSED' === currentActivity.status()  || 'DISPENSED' === data.status ) ) {
                        return false;
                    }

                    if( 'PREPARED' === currentActivity.status() ) {
                        currentActivity.activities( [] );
                        return false;
                    }

                    if( (invoiceMedication || invoiceTreatment) && onHoldActivities.includes( data._id ) ) {
                        return false;
                    }

                    if( isSwiss && ( invoiceMedication || invoiceTreatment ) && !isSwissCaseFolder ) {
                        return false;
                    }
                    if( !isSwiss && invoiceMedication ) {
                        return false;
                    }

                    if( data.status === 'LOCKED' && !isRowLinked ){
                        return false;
                    }

                    //  special case for receipts, which can be assigned to invoices after approval
                    if( hasCurrentActivity && isInvoiceCommunicationActType( currentActType ) ) {
                        isEditable = true;
                    }

                    //  special case for adding receipts, creditnotes, etc from invoices, handled by the
                    //  invoice model and outside of the normal state transitions.
                    if(
                        hasCurrentActivity && ( 'INVOICE' === currentActType || 'INVOICEREF' === currentActType ) &&
                        isInvoiceCommunicationActType( data.actType )
                    ) {
                        isEditable = true;
                    }

                    if( !hasCurrentActivity || false === isEditable ) {
                        return false;
                    }

                    if( (_.isFunction( currentActivity._linkActivity ) && _.isFunction( currentActivity._unlinkActivity )) ) {

                        if( isRowLinked ) {
                            handledActivity = currentActivity._unlinkActivity( link, data );
                        } else {
                            handledActivity = currentActivity._linkActivity( data );
                        }

                        if( handledActivity ) {
                            if( isRowLinked ) {
                                if( columnLinked.isLinked( link ) ) {
                                    columnLinked.removeLink( link );
                                }
                            } else {
                                if( !columnLinked.isLinked( link ) ) {
                                    columnLinked.addLink( link );
                                }
                            }
                        }

                        if( 'REFERRAL' === currentActType && !attachmentsModel.findDocument( '_hasFormData' ) ) {
                            Y.log( 'No form document to mark dirty, creating one', 'debug', NAME );
                            attachmentsModel.createEmptyFormDoc();
                        }

                        attachmentsModel.markLinkedActivitiesDirty();

                        window.setTimeout( function() {
                            //  MOJ-6110 prod checkboxes to update after this completes
                            //  (subscribers not always notified after change to linked set, suspect rate
                            //  limiting may be responsible.  This effectively forces a deferred evaluation
                            //  of checkbox state)
                            columnLinked.prodCheckboxes( Math.random() + '' );
                        }, 1 );

                        return handledActivity;
                    }

                    // check again, KO events from the activity model may have unlinked this is the meantime
                    if( isRowLinked !== columnLinked.isLinked( link ) ) {
                        return true;
                    }

                    if( isRowLinked ) {
                        columnLinked.removeLink( link );
                    } else {
                        columnLinked.addLink( link );
                    }

                    return true;
                },

                linkedActivityCheckboxSelectAll: function( columnLinked, rows ) {
                    var
                        binder = this.get( 'binder' ),
                        currentActivity = peek( binder.currentActivity ),
                        caseFileVM = unwrap( binder.currentView ),
                        activityDetailsVM = unwrap( caseFileVM.activityDetailsViewModel ),
                        attachmentsModel = activityDetailsVM.attachmentsModel,
                        currentPatient = peek( binder.currentPatient ),
                        currentActType = unwrap( currentActivity.actType ),
                        hasCurrentActivity = Boolean( currentActivity ),
                        isEditable = hasCurrentActivity && unwrap( currentActivity._isEditable ),
                        toLink = [],
                        i,
                        activeCaseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab(),
                        caseFolderType = activeCaseFolder && activeCaseFolder.type,
                        isSwissCaseFolder = Y.doccirrus.schemas.casefolder.isSwissCaseFolderType( caseFolderType );

                    if( 'INVOICE' === currentActType ) {
                        if( (isSwiss && !isSwissCaseFolder) || !isSwiss ) {
                            rows = rows.filter( function( activity ) {
                                return 'MEDICATION' !== activity.actType;
                            } );
                        }

                        if( (isSwiss && isSwissCaseFolder) || !isSwiss ) {
                            rows = rows.filter( function( activity ) {
                                return !('MEDICATION' === activity.actType && 'DISPENSED' !== activity.status);
                            } );
                        }
                    }

                    //  check that currentActivity is editable and can have linked activities
                    if( !hasCurrentActivity || !isEditable || !_.isFunction( currentActivity._linkActivitiesBatch ) ) {
                        return false;
                    }

                    //  link as a single batch to prevent multiple remap / rerender of forms
                    for( i = 0; i < rows.length; i++ ) {
                        if( false === columnLinked.isLinked( rows[i] ) ) {
                            toLink.push( rows[i] );
                        }
                    }

                    //  nothing to do
                    if( 0 === toLink.length ) {
                        return false;
                    }

                    currentActivity.skipAfterLinkActivity = true;
                    currentActivity._linkActivitiesBatch( toLink, caseFolderType );

                    attachmentsModel.markLinkedActivitiesDirty();
                    currentActivity.skipAfterLinkActivity = false;
                    return true;
                },

                linkedActivityCheckboxDeselectAll: function( columnLinked, rows ) {
                    var
                        binder = this.get( 'binder' ),
                        currentActivity = peek( binder.currentActivity ),
                        caseFileVM = unwrap( binder.currentView ),
                        activityDetailsVM = unwrap( caseFileVM.activityDetailsViewModel ),
                        attachmentsModel = activityDetailsVM.attachmentsModel,
                        hasCurrentActivity = Boolean( currentActivity ),
                        isEditable = hasCurrentActivity && unwrap( currentActivity._isEditable ),
                        allLinkedIds = [],
                        i;

                    //  skip this if not possible to modify the set of linked activities
                    if( !hasCurrentActivity || !isEditable || !_.isFunction( currentActivity._unlinkActivity ) ) {
                        return false;
                    }

                    //  try to remove any linked activities from the activity
                    currentActivity._unlinkActivitiesBatch( rows );

                    //  set the checkboxes in the table to match the set of linked activities
                    allLinkedIds = allLinkedIds.concat( currentActivity.activities() );
                    allLinkedIds = allLinkedIds.concat( currentActivity.icds() );

                    currentActivity.skipAfterLinkActivity = true;
                    /// ----
                    for( i = 0; i < rows.length; i++ ) {
                        if( -1 === allLinkedIds.indexOf( rows[i]._id.toString() ) ) {
                            columnLinked.removeLink( rows[i] );
                        }
                    }

                    attachmentsModel.markLinkedActivitiesDirty();
                    currentActivity.skipAfterLinkActivity = false;
                    return true;
                }
            },
            {
                schemaName: 'activity',
                NAME: 'ActivityModel',
                /**
                 * @method getDataFromActivityId
                 * @param {String} activityId
                 * @returns {Promise}
                 * @static
                 */
                getDataFromActivityId: function( activityId ) {
                    return new Promise( function( resolve, reject ) {
                        Y.doccirrus.jsonrpc.api[Y.doccirrus.auth.isISD() ? 'mirroractivity' : 'activity']
                            .getActivityForFrontend( { query: { _id: activityId } } )
                            .then( function( response ) {
                                return response.data || null;
                            } )
                            .done( function( activityData ) {
                                if( activityData && activityData.activity ) {
                                    resolve( activityData );
                                }
                                else {
                                    reject( new Error( 'activity not found or has wrong structure' ) );
                                }
                            } )
                            .fail( function() {
                                reject( 'activity not found' );
                            } );
                    } );
                },
                /**
                 * Returns a Promise that will provide an ActivityModel
                 * - accepts an activity or its id as first argument
                 * @method createModelFrom
                 * @param {String|Object|SimpleActivityModel} firstArgument
                 * @returns {Promise}
                 * @static
                 */
                createModelFrom: function( firstArgument ) {

                    var
                        firstArgumentIsString = Y.Lang.isString( firstArgument ),
                        activityId = firstArgumentIsString ? firstArgument : peek( firstArgument._id ),
                        activityObj = firstArgumentIsString ? undefined : firstArgument,
                        activity = activityObj && activityObj.activity,
                        activityModel = activity instanceof ActivityModel ? activity : undefined,
                        localValueSelectedDoctorParts = (Y.doccirrus.utils.localValueGet( 'incase-selected-doctor' ) || '').split( '-' ),
                        selectedLocationId = localValueSelectedDoctorParts[1] || null,
                        promise;

                    if( activityModel ) {
                        return Promise.resolve( activityModel );
                    }

                    if( activity ) {
                        if( activity.actType ) {
                            promise = Y.doccirrus.api.activity.getInitialDataForNewActivity( {
                                actType: activity.actType,
                                caseFolderId: activity.caseFolderId,
                                patientId: activity.patientId,
                                timestamp: activity.timestamp,
                                locationId: activity.locationId,
                                selectedLocationId: selectedLocationId
                            } )
                                .then( function( data ) {
                                    activityObj = Y.mix( activityObj, data, null, null, null, true );

                                    // caseFolderActive.additionalType not equal to Y.doccirrus.schemas.casefolder.additionalTypes.ASV
                                    //  if a last schein was found, set the activity's location to match the existing last schein

                                    if(
                                        !Y.doccirrus.utils.localValueGet( 'incase-selected-doctor' ) && // MOJ-10029
                                        activityObj &&
                                        activityObj.additionalActivityData &&
                                        activityObj.additionalActivityData.lastSchein && activityObj.additionalActivityData.lastSchein.locationId &&
                                        Y.doccirrus.schemas.casefolder.additionalTypes.ASV !== (activityObj.additionalActivityData.caseFolder && activityObj.additionalActivityData.caseFolder.additionalType)
                                    ) {

                                        activityObj.activity.locationId = activityObj.additionalActivityData.lastSchein.locationId;
                                        Y.log( 'Set location from last schein: ' + activityObj.activity.locationId, 'debug', NAME );
                                    }

                                    if( isSwiss && Y.doccirrus.schemas.activity.isScheinActType( activity.actType ) ) {
                                        if( activityObj.additionalActivityData.scheinTemplate ) {
                                            _.assign( activityObj.activity, activityObj.additionalActivityData.scheinTemplate );
                                        }
                                    }

                                    return activityObj;
                                } );
                        } else {
                            promise = Promise.resolve( activityObj );
                        }

                    }
                    else if( activityId ) {
                        promise = ActivityModel.getDataFromActivityId( activityId );
                    }
                    else {
                        promise = Promise.reject( 'getActivityModelOf: insufficient parameters' );
                    }
                    promise = promise.then( function( data ) {
                        data = data || {};
                        var
                            modelName = 'SimpleActivityModel',
                            activityData = data.activity,
                            actTypeConfig,
                            config = {
                                data: activityData
                            };
                        if( data.additionalActivityData ) {
                            Object.keys( data.additionalActivityData ).forEach( function( key ) {
                                if( 'undefined' !== typeof data.additionalActivityData[key] ) {
                                    config[key] = data.additionalActivityData[key];
                                }
                            } );
                        }
                        if( data.populatedObj ) {
                            Object.keys( data.populatedObj ).forEach( function( key ) {
                                if( 'undefined' !== typeof data.populatedObj[key] ) {
                                    config[key] = data.populatedObj[key];
                                }
                            } );
                        }
                        if( activityData.actType ) {
                            actTypeConfig = Y.doccirrus.schemas.activity.getActTypeClientConfig( activityData.countryMode );
                            modelName = actTypeConfig[activityData.actType].activityModel;
                        }

                        return new KoViewModel.createViewModel( {
                            NAME: modelName,
                            config: config
                        } );
                    } );

                    return promise;
                }
            } );

        /**
         * expand links added by activity-process.js (MOJ-5617)
         */
        ActivityModel.processDocumentLinks = function( attachedMedia ) {
            if( !(Array.isArray( attachedMedia ) && attachedMedia.length) ) {
                return '';
            }
            return attachedMedia
                .map( function( media ) {

                    var
                        mime = Y.doccirrus.media.types.getMime( media.contentType || 'application/binary' ),
                        ext = Y.doccirrus.media.types.getExt( media.contentType || 'application/binary' ),
                        relUrl = '/media/' + media.mediaId + '_original.' + mime + '.' + ext,
                        fullUrl = Y.doccirrus.infras.getPrivateURL( relUrl ),
                        title = (media.title ? ' title="' + media.title + '" ' : ""),
                        link = '<a href="' + fullUrl + '"' + title +' target="_blank">' + ext.toUpperCase() + '</a>';

                    if ( media.malwareWarning ) {
                        //  do not link directly to malware from the table, make the user look at the warning
                        return '<span style="color: red;">' + ext.toUpperCase() + '</span>';
                    }

                    return link;
                } )
                .join( ', ' );
        };

        /**
         * [MOJ-11908]
         * format a badge to be displayed as bootstrap label in front of other content
         * @param {object|string} options string for quick access, with default settings, or a config object
         * @param {string} options.text = label content
         * @param {string|undefined} options.title = title for the label shown when the mouse hovers over the label, defaults to the text
         * @param {string|undefined} options.style = bootstrap style class according to "label-STYLE", defaults to "info"
         * @returns {string}
         */
        ActivityModel.formatBadge = function ( options ) {
            if ( typeof options === "string" ) {
                options = {text: options};
            }
            if( options && options.text && options.text.length ) {
                return '<span class="label label-' + (options.style || 'info') + '" title="' + (options.title || options.text || '') + '">' + options.text + '</span>';
            }
            return '';
        };

        /**
         * Helper function to render activity (VM or plain)
         * as a HTML.
         *
         * @param   {module:activitySchema.activity}    activity            KO Activity ViewModel
         * @param   {Boolean}   [noDocumentLinks]     If true, skip generation of document links
         * @param   {Boolean}   [useMarkdown]         If true, convert markdown to html
         * @returns {String}                HTML for content field in CaseFile activities table
         */
        ActivityModel.renderContentAsHTML = function( activity, noDocumentLinks, useMarkdown ) {
            var
                actType = ko.unwrap( activity.actType ),
                d_extra = ko.unwrap( activity.d_extra ) || {},
                attachedMedia = ko.unwrap( activity.attachedMedia ),
                html,
                words,
                i,
                txtDocumentLinks,
                subWords;

            html = ko.unwrap( activity.content ) || ko.unwrap( activity.userContent ) || '';

            //  MOJ-7307 check for label:: strings and add markup
            words = html
                .replace( new RegExp( '\n', 'g' ) , ' ' )       //  eslint-disable-line no-control-regex
                .replace( new RegExp( '\r', 'g' ) , ' ' )       //  eslint-disable-line no-control-regex
                .split( ' ' );

            for( i = 0; i < words.length; i++ ) {
                words[i] = words[i].trim();
                if( -1 !== words[i].indexOf( '::' ) ) {
                    subWords = words[i].split( '::' );
                    subWords[0] = ActivityModel.formatBadge( subWords[0] );
                    html = html.replace( words[i], subWords.join( ' ' ) );
                    // only one label allowed per activity
                    break;
                }
            }

            switch ( actType ) {
                case 'MEASUREMENT':
                    if ( !ko.unwrap( activity.content ) ) {
                        html = "";
                    }
                    break;

                case 'PROCESS':
                    if ( !ko.unwrap( activity.content ) && Object.keys(d_extra).length ) {
                        html = "";
                    }
                    break;

                case 'AU':
                    html = ActivityModel.getAUContent( activity );
                    break;
                case 'COMMUNICATION':
                case 'CONTACT':
                case 'EXTERNAL':
                    html = ActivityModel.convertImportObjectLink( html );
                    break;

                case 'TREATMENT':
                     if( activity.explanations && ko.unwrap( activity.explanations ) && '' !== ko.unwrap( activity.explanations ) ) {
                         html = html + ' (' + ko.unwrap( activity.explanations ) + ')';
                     }
                     break;

                case 'INVOICE':
                    if ( ko.unwrap( activity.invoiceNo ) ) {
                        html = i18n( 'activity-schema.text.invoiceNoShort' ) + ' ' + unwrap( activity.invoiceNo ) + ' ' + html;
                    }
                    if ( ko.unwrap( activity.status ) === 'REVOKEWARN' ){
                        html = i18n( 'InCaseMojit.casefile_detail.label.ON_HOLD_NOTES' ) + ': ' + unwrap( activity.onHoldNotes ) + ' <br>' + html;
                    }
                    break;
                case 'PKVSCHEIN':
                    if ( ko.unwrap( activity.status ) === 'ONHOLD' ){
                        html = i18n( 'InCaseMojit.casefile_detail.label.ON_HOLD_NOTES' ) + ': ' + unwrap( activity.onHoldNotes ) + ' <br>' + html;
                    }
                    break;
            }

            if ( useMarkdown ) {
                //  Render markdown in content and any backmappings MOJ-11458
                html = Y.dcforms.markdownToHtml( html );
            } else {
                html = html.trim().replace( new RegExp( '\n', 'g' ), '<br/>' );    //  eslint-disable-line no-control-regex
            }

            //// show links to attachments

            //  correct links to attached media --  since these are generated from
            // the attachments, the above code was duplicating the rendering.
            txtDocumentLinks = ActivityModel.processDocumentLinks( attachedMedia );
            if( txtDocumentLinks && !noDocumentLinks ) {
                html += ' ' + txtDocumentLinks;
            }

            // render extra spaces
            html = html.replace( /  /g, '&nbsp;&nbsp;' );   //  eslint-disable-line no-regex-spaces

            // strikethrough Cancelled
            if( 'CANCELLED' === ko.unwrap( activity.status ) ) {
                html = '<strike>' + html + '</strike>';
                //  add cancelReason to tooltip (EXTMOJ-861, part 3)
                if ( ko.unwrap( activity.cancelReason ) && '' !== ko.unwrap( activity.cancelReason ) ) {
                    html = '<div title="' + ko.unwrap( activity.cancelReason ) + '">' + html + '</div>';
                }
            }

            if( activity.textColor ) {
                html = '<span style="color: ' + activity.textColor + '">' + html + '</span>';
            }

            return html;
        };

        ActivityModel.TELEKARDIO_SEVERITY_COLORS = Object.freeze( {
            'yellow': 'telekardio-yellow',
            'red': 'telekardio-red'
        } );

        ActivityModel.getAUContent = function( activity ) {
            var auVon = ko.unwrap( activity.auVon ),
                auVorraussichtlichBis = ko.unwrap( activity.auVorraussichtlichBis ),
                content = ko.unwrap( activity.content ),
                userContent = ko.unwrap( activity.userContent ),
                text = i18n( 'activity-schema.Activity_E.AU' );

            if( content !== userContent ) {
                text = '' + content;
                return text;
            }

            if( ko.unwrap( activity.parentPrescriptionId ) && ko.unwrap( activity.noOfRepetitions ) ) {
                text += ' (' + ko.unwrap( activity.noOfRepetitions ) + ')';
            }

            if( auVon ) {
                text += ' vom ' + moment( activity.auVon ).format( 'DD.MM.YYYY' );
            }

            if( auVorraussichtlichBis ) {
                text += ' bis ' + moment( activity.auVorraussichtlichBis ).format( 'DD.MM.YYYY' );
            }

            text = text + '<br/>' + ko.unwrap( activity.content );

            return text;
        };

        ActivityModel.convertImportObjectLink = function( content ) {
            var words = content.split( ' ' ), i;
            for( i = 0; i < words.length; i++ ) {
                if( 'IMPORT-OBJ:' === words[i].substr( 0, 11 ) ) {
                    words[i] = words[i].substr( 11 );
                    words[i] = Y.doccirrus.infras.getPrivateURL( 'imported-file' ) + words[i];
                    words[i] = '<a href="' + words[i] + '">herunterladen</a>';
                }
            }

            return words.join( ' ' );
        };

        Y.mix( ActivityModel, linkedActivitiesApiMixin, false, Object.keys( linkedActivitiesApiMixin ), 4 );

        KoViewModel.registerConstructor( ActivityModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'promise',
            'KoViewModel',
            'FKModels',
            'activity-schema',
            'casefolder-schema',
            'activity-api',
            'dc-comctl',
            'catalog-schema',
            'DCTaskModal',
            'dcutils',
            'linkedactivities-api'
        ]
    }
)
;