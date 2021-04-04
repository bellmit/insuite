/**
 * User: pi
 * Date: 25/01/16  10:55
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, async, _ */
YUI.add( 'inCaseUtils', function( Y, NAME ) {
    'use strict';
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        CANCELL_ERROR = new Error( 'CANCELLED' ),
        i18n = Y.doccirrus.i18n,
        NEW_CASE_FOLDER_BL = i18n( 'InCaseMojit.casefile_detailJS.message.NEW_CASE_FOLDER_BL' ),
        CREATE_GKV_SCHEIN = i18n( 'InCaseMojit.casefile_browserJS.button.CREATE_GKV_SCHEIN' ),
        CREATE_PKV_SCHEIN = i18n( 'InCaseMojit.casefile_browserJS.button.CREATE_PKV_SCHEIN' ),
        CREATE_GKV_A_SCHEIN = i18n( 'InCaseMojit.casefile_browserJS.button.CREATE_GKV_A_SCHEIN' ),
        CREATE_PKV_A_SCHEIN = i18n( 'InCaseMojit.casefile_browserJS.button.CREATE_PKV_A_SCHEIN' ),
        CREATE_PKV_CH_SCHEIN = i18n( 'InCaseMojit.casefile_browserJS.button.CREATE_PKV_CH_SCHEIN' ),
        CREATE_GB_SCHEIN = i18n( 'InCaseMojit.casefile_browserJS.button.CREATE_GB_SCHEIN' ),
        CREATE_IVG_SCHEIN = i18n( 'InCaseMojit.casefile_browserJS.button.CREATE_IVG_SCHEIN' ),
        CREATE_UVG_SCHEIN = i18n( 'InCaseMojit.casefile_browserJS.button.CREATE_UVG_SCHEIN' ),
        CREATE_MVG_SCHEIN = i18n( 'InCaseMojit.casefile_browserJS.button.CREATE_MVG_SCHEIN' ),
        CREATE_VVG_SCHEIN = i18n( 'InCaseMojit.casefile_browserJS.button.CREATE_VVG_SCHEIN' ),
        CREATE_SELFPAYER_SCHEIN = i18n( 'InCaseMojit.casefile_browserJS.button.CREATE_SELFPAYER_SCHEIN' ),
        CREATE_GRAVIDOGRAMM = i18n( 'person-schema.Insurance_E.PREGNANCY' ),
        SELECT_COST_CARRIER = i18n( 'InCaseMojit.casefile_browserJS.button.SELECT_COST_CARRIER' ),
        NO_COST_CARRIER = i18n( 'InCaseMojit.casefile_browserJS.message.NO_INSURANCE' ),
        NOTE = i18n( 'InCaseMojit.casefile_browserJS.title.NOTE' ),
        SELECT_SCHEIN = i18n( 'InCaseMojit.casefile_browserJS.text.SELECT_SCHEIN' ),
        PHYSICIANS = i18n( 'InCaseMojit.activity_model_clientJS.label.PHYSICIANS' ),
        OTHERS = i18n( 'InCaseMojit.activity_model_clientJS.label.OTHERS' ),
        SELECT_CASE_FOLDER = i18n( 'InCaseMojit.inCaseUtils_clientJS.text.SELECT_CASE_FOLDER' ),
        CREATE_BUTTON = i18n ( 'InCaseMojit.inCaseUtils_clientJS.button.CREATE' ),
        IMPORTED_CASEFOLDER_WARNING = i18n( 'InCaseMojit.inCaseUtils_clientJS.text.IMPORTED_CASEFOLDER_WARNING' ),
        CREATE_CASE_FOLDER_CONFIRMATION = i18n( 'InCaseMojit.inCaseUtils_clientJS.text.CREATE_CASE_FOLDER_CONFIRMATION' );

    function filterPhysician( item ) {
        return item.type === "PHYSICIAN";
    }

    function sortEmployee( a, b ) {
        return a.lastname.toLocaleLowerCase() > b.lastname.toLocaleLowerCase();
    }

    function InCaseUtils() {

    }

    InCaseUtils.prototype = {

        /**
         * For every field injects observable array and set listener for attr of activity data model.
         *  When attr is updated, it updates observable array.
         * This method should be called with target model context!
         * @method injectPopulatedObjs
         * @param {Object} config
         * @param {Object} config.dataModel
         * @param {Object} config.fields
         */
        injectPopulatedObjs: function( config ) {
            var
                self = this,
                dataModel = config.dataModel,
                fields = config.fields || [];
            fields.forEach( function( field ) {
                self[ field ] = ko.observableArray( dataModel.get( field ) || [] );
                dataModel.after( field + 'Change', function( e ) {
                    var
                        newArr = e.newVal || [],
                        newArrId = newArr.map( function( item ) {
                            return item._id;
                        } ),
                        oldArr = e.prevVal || [],
                        oldArrId = oldArr.map( function( item ) {
                            return item._id;
                        } );
                    newArr.forEach( function( item ) {
                        if( -1 === oldArrId.indexOf( item._id ) ) {
                            self[ field ].push( item );
                        }
                    } );
                    oldArr.forEach( function( item ) {
                        if( -1 === newArrId.indexOf( item._id ) ) {
                            self[ field ].remove( function( _item ) {
                                return _item._id === item._id;
                            } );
                        }
                    } );
                } );
            } );
        },
        /**
         * a list of employees grouped by type
         * - currently only PHYSICIANs
         * @param {Array} employeeList
         */
        groupEmployeeList: function( employeeList ) {
            var
                physicians = Y.Array.filter( employeeList, filterPhysician ),
                others = [],
                grouped = [];

            if( physicians.length ) {
                physicians.sort( sortEmployee );
                grouped.push( {i18n: PHYSICIANS, items: physicians} );
            }
            if( others.length ) {
                others.sort( sortEmployee );
                grouped.push( {i18n: OTHERS, items: others} );
            }
            return grouped;
        },
        getBinder: function() {
            return Y.doccirrus.utils.getMojitBinderByType( 'InCaseMojit' ) || Y.doccirrus.utils.getMojitBinderByType( 'MirrorPatientMojit' );
        },
        getCurrentPatient: function() {
            var
                self = this,
                binder = self.getBinder();
            return unwrap( binder && binder.currentPatient );
        },
        getInsuranceScheinMap: function() {
            return Y.doccirrus.schemas.activity.getInsuranceScheinMap();
        },
        getScheinInsuranceMap: function() {
            return Y.doccirrus.schemas.activity.getScheinInsuranceMap();
        },
        /**
         * Only this method should be used to create activity
         * @method createActivity
         * @param {Object} params
         * @param {String} params.actType
         * @param {Object} [params.newActivityConfig] optional for "SCHEIN"
         */
        createActivity: function( params ) {
            params = params || {};
            var
                self = this,
                binder = self.getBinder(),
                tenantSettings = binder.getInitialData( 'tenantSettings' ) || {},
                skipCaseFolderCheck = false,
                currentPatient = self.getCurrentPatient(),
                currentCaseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab();

            if( tenantSettings.useExternalPrescriptionSoftware && params.actType === 'KBVMEDICATIONPLAN' ) {
                Y.doccirrus.incase.handlers.createMedicationPlan( {
                    user: binder.getInitialData( 'currentUser' ),
                    patient: currentPatient.get( 'data' ),
                    caseFolder: currentCaseFolder,
                    externalPrescriptionSoftwareUrl: tenantSettings.externalPrescriptionSoftwareUrl
                } );
                return;
            }

            //  special case for GRAVIDOGRAMM activities, there should only be one active at
            //  a time, button will navigate to open pregnancy if one exists
            if ( params.actType && 'GRAVIDOGRAMM' === params.actType ) {
                Y.doccirrus.inCaseUtils.createOrOpenGravidogramm();
                return;
            }
            if( 'SCHEIN' === params.actType ) {
                Y.doccirrus.inCaseUtils._createSchein();
                return;
            }
            if( 'QUOTATION' === params.actType ) {
                skipCaseFolderCheck = true;
            }
            if( currentCaseFolder && 'PREPARED' === currentCaseFolder.type ) {
                skipCaseFolderCheck = true;
            }
            Y.doccirrus.inCaseUtils._createActivityByType( params.actType, {
                newActivityConfig: params.newActivityConfig,
                skipCaseFolderCheck: skipCaseFolderCheck
            } );
        },
        /**
         * @method _createActivity
         * @param {Object} actData
         * @param {String} actData.actType
         * @param {Object} options
         * @see navigateToNewActivity
         * @private
         */
        _createActivity: function( actData, options ) {
            var
                self = this,
                binder = self.getBinder();
            if( binder ) {
                binder.navigateToNewActivity( {
                    type: actData.actType,
                    newActivityConfig: options.newActivityConfig
                } );
            }
        },
        /**
         * Creates activity by activity type
         * main method to create activity
         * @method _createActivityByType
         * @param {Object} actData
         * @param {String} [actData.actType] activity type
         * @param {Object} [options]
         * @param {Object} [options.skipCaseFolderCheck] skip check for case folder
         * @param {Object} [options.newActivityConfig] pre-set proeprties of the new activity
         * @private
         */
        _createActivityByType: function( actType, options ) {
            var
                self = this,
                currentPatient = self.getCurrentPatient(),
                casefolders = currentPatient && currentPatient.caseFolderCollection,
                timeout = (options && options.skipCaseFolderCheck) ? 200 : 0;

            options = options || {};

            /**
             * This is tricky moment, 'skipCaseFolderCheck' should be set to true only if next operation will be _createActivity
             * currently 'skipCaseFolderCheck' is used when activeTab could be not ready after 'navigateToCaseFolder' is called.
             */
            if( (casefolders && casefolders.canCreateActivity( { caseFolderId: options.caseFolderId } ) ) || options.skipCaseFolderCheck ) {

                options.newActivityConfig = options.newActivityConfig ? options.newActivityConfig : {};

                if( options.caseFolderId ) {
                    options.newActivityConfig.caseFolderId = options.caseFolderId;
                }

                if( options.pressButton ) {
                    options.newActivityConfig.pressButton = options.pressButton;
                }

                //  set form gender of new activity from patient (default, can be changed on formtree tab)
                if ( !options.newActivityConfig.formGender ) {
                    if ( currentPatient.gender() === 'FEMALE' ) { options.newActivityConfig.formGender = 'f'; }
                    if ( currentPatient.gender() === 'MALE' ) { options.newActivityConfig.formGender = 'm'; }
                }

                options.newActivityConfig.formLang = Y.doccirrus.comctl.getUserLang();

                //todo change when casefolder will be ready
                setTimeout( function() { // really dab and temp solution
                    switch( actType ) {
                        case 'PUBPRESCR':
                            /**
                             * don't need to call 'checkSelectedPrescriptionType' here.
                             * When activity created, all selected items in activity table are unchecked,
                             * but _linkActivity function is called for every of them.
                             * For system it looks like user have selected(checked) them.
                             */
                            self._createActivity( {actType: actType || 'PUBPRESCR'}, options );
                            break;
                        case 'PRESCRBTM':
                            self._createActivity( {actType: actType || 'PUBPRESCR'}, options );
                            break;
                        case 'PRESCRG':
                            self._createActivity( {actType: actType || 'PUBPRESCR'}, options );
                            break;
                        case 'PRESCRT':
                            self._createActivity( {actType: actType || 'PUBPRESCR'}, options );
                            break;
                        // these activities can not be created without 'Kostenträger'
                        case 'PKVSCHEIN':
                        case 'BGSCHEIN':
                        case 'SCHEIN':
                        case 'TREATMENT':
                            if( self.checkPatientHasCostCarrier().valid ) {
                                self._createActivity( {actType: actType}, options );
                            }
                            break;
                        default:
                            if( actType ) {
                                self._createActivity( {actType: actType}, options );
                            } else {
                                self._createActivity( {}, options );
                            }
                    }
                }, timeout );
            } else {
                self.askSelectCaseFolder( {currentCaseFolderId: options.caseFolderId} )
                    .then( function( caseFolder ) {
                        var
                            scheinInsuranceMap = self.getScheinInsuranceMap() || {},
                            insuranceScheinMap = self.getInsuranceScheinMap() || {},
                            // MOJ-14319: [OK] [CASEFOLDER]
                            matchingInsuranceTypes = scheinInsuranceMap[actType] || [],
                            _options;

                        // MOJ-11299: newly created case folders return only id so find the it
                        if( typeof caseFolder === 'string' ) {
                            caseFolder = casefolders.find( function( cf ) {
                                return caseFolder === cf._id;
                            } );
                        }

                        _options = _.assign( {skipCaseFolderCheck: true}, options, {caseFolderId: caseFolder._id} );

                        // MOJ-10384: if dialog is triggered by different case folder type then target case folder we need to switch schein type
                        if( matchingInsuranceTypes.length && matchingInsuranceTypes.indexOf( caseFolder.type ) === -1 &&
                            insuranceScheinMap[caseFolder.type] ) {
                            actType = insuranceScheinMap[caseFolder.type];
                        }
                        self._createActivityByType( actType, _options );
                    } )
                    .catch( function( error ) {
                        if( error !== CANCELL_ERROR ) {
                            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                        }
                    } );
            }
        },
        /**
         * Handler for Schein creation (When it is not clear which schein should be created).
         * @method _createSchein
         * @private
         */
        _createSchein: function() {
            var
                self = this,
                currentPatient = self.getCurrentPatient(),
                currentCaseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab(),
                scheinMap = self.getInsuranceScheinMap() || {};

            if( currentCaseFolder && currentCaseFolder._id ) {
                self._createActivityByType( scheinMap[currentCaseFolder.type] );
            } else {
                self.createNewCaseFolderWithSchein();
            }
        },
        /**
         * @method createNewCaseFolderWithSchein
         */
        createNewCaseFolderWithSchein: function() {
            var
                self = this,
                currentPatient = self.getCurrentPatient(),
                scheinMap = self.getInsuranceScheinMap() || {},
                insuranceList = currentPatient.getInsuranceTypes() || [];
            function createCaseFolderAndSchein( type ) {
                self.createAndActivateNewCaseFolder( {
                        insuranceType: type
                    } )
                    .then( function( caseFolderId ) {
                        if( 'PREPARED' !== type ) {
                            self._createActivityByType( scheinMap[ type ], {
                                skipCaseFolderCheck: true,
                                caseFolderId: caseFolderId
                            } );
                        }
                    } )
                    .catch( function( error ) {
                        if( error !== CANCELL_ERROR ) {
                            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                        }
                    } );
            }

            if( self.checkPatientHasCostCarrier().valid ) {
                if( insuranceList && 1 === insuranceList.length ) {
                    createCaseFolderAndSchein( insuranceList[0] );
                } else {
                    self.showCaseFolderTypesSelector()
                        .then( createCaseFolderAndSchein )
                        .catch( function( error ) {
                            if( error !== CANCELL_ERROR ) {
                                Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                            }
                        } );
                }
            }
        },
        /**
         * checks if we should should forward the user to set a cost carrier (Kostenträger)
         * @param {Object} [parameters]
         * @param {PatientModel} [parameters.patient] current patient by default
         * @param {ActivityModel} [parameters.activity]
         * @return {{valid: boolean, notice: undefined|DCWindow}} return valid=true if everything is fine
         */
        checkPatientHasCostCarrier: function( parameters ) {
            parameters = parameters || {};
            var
                self = this,
                valid = true,
                currentPatient = self.getCurrentPatient(),
                patient = parameters.patient || currentPatient,
                insuranceStatus = patient && ko.unwrap( patient.insuranceStatus ),
                notice;

            // the patient has no insurances, display a message to notify about
            if( !insuranceStatus || !insuranceStatus.length ) {
                valid = false;
                notice = self.askCreateCostCarrier();
            }

            return {
                valid: valid,
                notice: notice
            };

        },
        /**
         * Shows modal with link to patient detail view
         * @method askCreateCostCarrier
         */
        askCreateCostCarrier: function() {
            var
                self = this,
                binder = self.getBinder();
            Y.doccirrus.DCWindow.notice( {
                message: NO_COST_CARRIER,
                window: {
                    id: 'checkPatientHasCostCarrier',
                    width: 'medium',
                    buttons: {
                        footer: [
                            {
                                isDefault: true,
                                label: SELECT_COST_CARRIER,
                                action: function() {
                                    this.close();
                                    binder.navigateToPatientCostCarriers();
                                }
                            }
                        ]
                    }
                }
            } );
        },
        /**
         * Asks to select case folder type or to create cost carrier
         * @method showCaseFolderTypesSelector
         * @return {Promise} Resolved only if a case folder type was selected
         */
        showCaseFolderTypesSelector: function() {
            var
                self = this,
                modal,
                buttons = [
                    Y.doccirrus.DCWindow.getButton( 'CANCEL' )
                ],
                currentPatient = self.getCurrentPatient(),
                insuranceList = currentPatient.getInsuranceTypes(),
                titles = {
                    PUBLIC: CREATE_GKV_SCHEIN,
                    PRIVATE: CREATE_PKV_SCHEIN,
                    PUBLIC_A: CREATE_GKV_A_SCHEIN,
                    PRIVATE_A: CREATE_PKV_A_SCHEIN,
                    PRIVATE_CH: CREATE_PKV_CH_SCHEIN,
                    BG: CREATE_GB_SCHEIN,
                    SELFPAYER: CREATE_SELFPAYER_SCHEIN,
                    PREGNANCY: CREATE_GRAVIDOGRAMM,
                    PRIVATE_CH_IVG: CREATE_IVG_SCHEIN,
                    PRIVATE_CH_UVG: CREATE_UVG_SCHEIN,
                    PRIVATE_CH_MVG: CREATE_MVG_SCHEIN,
                    PRIVATE_CH_VVG: CREATE_VVG_SCHEIN
                };
            
            return new Promise( function( resolve, reject ) {
                if( insuranceList && insuranceList.length ) {
                    insuranceList.reverse();
                    insuranceList.forEach( function( insurance ) {
                        buttons.push(
                            {
                                label: titles[insurance],
                                isDefault: true,
                                action: function() {
                                    resolve( insurance );
                                    this.close();
                                }
                            }
                        );
                    } );

                    modal = Y.doccirrus.DCWindow.notice( {
                        message: SELECT_SCHEIN,
                        title: NOTE,
                        type: 'info',
                        window: {
                            manager: Y.doccirrus.DCWindow.defaultDCWindowManager,
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            width: Y.doccirrus.DCWindow.SIZE_LARGE,
                            dragable: true,
                            maximizable: true,
                            resizeable: true,
                            buttons: {
                                header: ['close', 'maximize'],
                                footer: buttons
                            }
                        }

                    } );
                    modal.on( 'visibleChange', function( event ) {
                        if( false === event.newVal ) {
                            reject( CANCELL_ERROR );
                        }
                    } );
                } else {
                    self.askCreateCostCarrier();
                    reject( new Error( 'Case folder not found' ) );
                }
            } );

        },
        /**
         * @method createNewCaseFolder
         * @param {Object} data
         * @param {String} data.type
         * @param {String} [data.patientId] default is id of current patient
         * @param {Boolean} [skipTabListUpdate] if set to true, tab list will not be updated
         * @returns {Promise}
         */
        createNewCaseFolder: function( data ) {
            var
                self = this,
                binder = self.getBinder(),
                currentPatient = unwrap( binder.currentPatient ) || {},
                skipTabListUpdate = data && data.skipTabListUpdate,
                insuranceType = data && data.type,
                additionalType = data && data.additionalType,
                title = data && data.title ? data.title : null,
                patientId = (data && data.patientId) || ( unwrap( currentPatient._id ));

            if( !insuranceType && !additionalType ) {
                Y.log( 'createNewCaseFolder. could not create casefolder cant no insurance type passed', 'error', NAME );
                return Promise.reject( new Error( 'could not create casefolder cant no insurance type passed' ) );
            }
            return Promise.resolve( Y.doccirrus.jsonrpc.api.casefolder.create( {
                    data: {
                        type: insuranceType,
                        additionalType: additionalType,
                        patientId: patientId,
                        title: title,
                        start: Date.now()
                    }
                } ) )
                .then( function( response ) {
                    var
                        data = response.data && response.data[0];
                    return data;
                } )
                .then( function( data ) {
                    var
                        caseFolders = currentPatient && currentPatient.caseFolderCollection;

                    if( !skipTabListUpdate && caseFolders ) {
                        return Promise.resolve( caseFolders.load( {patientId: patientId} ) )
                            .then( function() {
                                return data;
                            } );
                    } else {
                        return data;
                    }
                } );
        },
        /**
         * @method createAndActivateNewCaseFolder
         * @param {Object} data
         * @param {String} data.insuranceType
         * @param {String} [data.patientId] default is id of current patient
         * @returns {Promise}
         */
        createAndActivateNewCaseFolder: function( data ) {
            var
                self = this,
                binder = self.getBinder(),
                currentPatient = unwrap( binder.currentPatient ) || {},
                currentPatientId = unwrap( currentPatient._id ),
                patientId = (data && data.patientId) || currentPatientId;

            return self.createNewCaseFolder( {
                    type: data && data.insuranceType,
                    additionalType: data && data.additionalType,
                    title: ( data && data.title ? data.title : null ),
                    patientId: patientId
                } )
                .then( function( caseFolder ) {
                    var
                        caseFolderId = caseFolder && caseFolder._id;
                    return Promise.resolve( Y.doccirrus.jsonrpc.api.casefolder
                        .setActiveTab( {
                            caseFolderId: caseFolderId,
                            patientId: patientId
                        } ) )
                        .then( function() {
                            // TODO probably currentPatient.activeCaseFolderId( caseFolderId )
                            if( currentPatientId === patientId ) {
                                binder.navigateToCaseFolder( {
                                    caseFolderId: caseFolderId
                                } );
                            }
                            return caseFolderId;
                        } );
                } );
        },
        /**
         * Either shows modal this all available case folders or ask to create new one
         * @method askSelectCaseFolder
         * @returns {Promise}
         */
        askSelectCaseFolder: function( params ) {
            var
                self = this,
                currentCaseFolderId = params.currentCaseFolderId,
                buttons = [],
                binder = self.getBinder(),
                currentPatient = self.getCurrentPatient(),
                casefolders = currentPatient && currentPatient.caseFolderCollection.getCaseFolders(),
                currentCaseFolder = currentPatient && (currentCaseFolderId) ? currentPatient.caseFolderCollection.getTabById( currentCaseFolderId ) : currentPatient.caseFolderCollection.getActiveTab();

            return new Promise( function( resolve, reject ) {
                var
                    text = SELECT_CASE_FOLDER,
                    caseFolderSelected;
                if( casefolders && casefolders.length ) {
                    casefolders.forEach( function( casefolder ) {
                        buttons.push(
                            Y.doccirrus.DCWindow.getButton( casefolder.title, {
                                    label: casefolder.title,
                                    isDefault: true,
                                    action: function() {
                                        caseFolderSelected = true;
                                        this.close();
                                        binder.navigateToCaseFolder( {
                                            caseFolderId: casefolder._id
                                        } );
                                        resolve( casefolder );

                                    }
                                }
                            )
                        );
                    } );
                    if( currentCaseFolder && currentCaseFolder.imported ) {
                        text = IMPORTED_CASEFOLDER_WARNING + '<br/>' + text;
                    }
                    /*modal =*/ Y.doccirrus.DCWindow.notice( {
                        message: text,
                        title: NOTE,
                        type: 'info',
                        window: {
                            width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                            dragable: true,
                            maximizable: true,
                            resizeable: true,
                            buttons: {
                                header: ['close', 'maximize'],
                                footer: buttons
                            },
                            after: {
                                visibleChange: function( event ) {
                                    if( false === event.newVal && !caseFolderSelected ) {
                                        reject( CANCELL_ERROR );
                                    }
                                }
                            }
                        }
                    } );
                } else {
                    resolve( self.doCaseFolderCreation() );
                }
            } );
        },
        /**
         * Asks to create case folder
         * @method doCaseFolderCreation
         * @returns {Promise}
         */
        doCaseFolderCreation: function() {
            var
                self = this;

            function createCaseFolder() {
                return self.showCaseFolderTypesSelector()
                    .then( function( type ) {
                        return self.createAndActivateNewCaseFolder( {insuranceType: type} );
                    } );
            }

            return new Promise( function( resolve, reject ) {
                var
                    modal;
                modal = Y.doccirrus.DCWindow.notice( {
                    message: CREATE_CASE_FOLDER_CONFIRMATION,
                    title: NOTE,
                    type: 'info',
                    window: {
                        width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                        dragable: true,
                        maximizable: true,
                        resizeable: true,
                        buttons: {
                            header: ['close'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                {
                                    name: 'create',
                                    label: CREATE_BUTTON,
                                    isDefault: true,
                                    action: function() {
                                        resolve( createCaseFolder() );
                                        this.close();
                                    }
                                }
                            ]
                        }
                    }
                } );
                modal.on( 'visibleChange', function( event ) {
                    if( false === event.newVal ) {
                        reject( CANCELL_ERROR );
                    }
                } );
            } );
        },

        /**
         * Checks if schein has legal BL for current case folder
         * @param {Object} params
         * @param {Object} params.activity
         * @param {Array} [params.caseFolderBl] is not set, is taken from activity
         * @returns {boolean}
         */
        isLegalBLForCaseFolder: function( params ) {
            params = params || {};
            var
                activity = params.activity || {},
                caseFolderBl = params.caseFolderBl || (activity.get && activity.get( 'caseFolderBl' )) || [],
                currentBLCodes = [],
                isLegal = true,
                fk4235Set = unwrap( activity.fk4235Set );
            if( fk4235Set && fk4235Set.length && caseFolderBl.length ) {
                fk4235Set.forEach( function( fk4235Set ) {
                    var
                        fk4244Set = unwrap( fk4235Set.fk4244Set ),
                        fk4256Set = unwrap( fk4235Set.fk4256Set );
                    fk4244Set.forEach( function( fk4244Set ) {
                        var
                            fk4244 = unwrap( fk4244Set.fk4244 );
                        if( -1 === currentBLCodes.indexOf( fk4244 ) ) {
                            currentBLCodes.push( fk4244 );
                        }
                    } );
                    if( fk4256Set ) {
                        fk4256Set.forEach( function( fk4244Set ) {
                            var
                                fk4244 = unwrap( fk4244Set.fk4244 );
                            if( -1 === currentBLCodes.indexOf( fk4244 ) ) {
                                currentBLCodes.push( fk4244 );
                            }
                        } );
                    }
                } );
                isLegal = (currentBLCodes.length === caseFolderBl.length) && currentBLCodes.every( function( code ) {
                        return -1 !== caseFolderBl.indexOf( code );
                    } );
            }
            return isLegal;
        },

        /**
         * Checks if schein has legal BL for current case folder and shows Modal
         * @param {Object} params
         * @param {Object} params.activity should have 'caseFolderBl' attr
         * @returns {Promise} resolved with true, if user accepted new case folder creation.
         */
        checkBLSchein: function( params ) {
            var
                self = this,
                activity = params && params.activity,
                modal;
            return new Promise( function( resolve, reject ) {
                if( !self.isLegalBLForCaseFolder( {
                        activity: activity
                    } ) ) {
                    modal = Y.doccirrus.DCWindow.notice( {
                        message: NEW_CASE_FOLDER_BL,
                        type: 'info',
                        window: {
                            width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                            buttons: {
                                header: ['close'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                        action: function() {
                                            reject( CANCELL_ERROR );
                                            this.close();
                                        }
                                    } ),
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true,
                                        action: function() {
                                            resolve( true );
                                            this.close();
                                        }
                                    } )
                                ]
                            }
                        }
                    } );
                    modal.on( 'visibleChange', function( event ) {
                        if( false === event.newVal ) {
                            reject( CANCELL_ERROR );
                        }
                    } );
                } else {
                    resolve();
                }
            } );
        },

        /**
         *  Patient may have gravidogramm / pregnancy casefolder if
         *
         *       - practice has inGyn licence
         *       - patient is not male
         *       - there is not currently another pregnancy ongoing
         */
        canHavePregnancyCaseFolder: function( currentPatient ) {
            var
                inGynModule = Y.doccirrus.schemas.settings.specialModuleKinds.GYN,
                hasInGynLicence = Y.doccirrus.auth.hasSpecialModule( inGynModule );

            if ( !hasInGynLicence ) {
                return false;
            }

            if ( 'MALE' === ko.unwrap( currentPatient.gender ) ) {
                //  note that 'gender' field records sex, not gender
                return false;
            }

            return true;
        },
        /**
         * @method checkTransition
         * @param {Object} params
         * @param {Object} params.currentActivity
         * @param {Object} params.transition
         * @returns {boolean|*}
         */
        checkTransition: function( params ) {
            var
                transition = params.transition,
                currentActivity = params.currentActivity,
                currentActivityActType = currentActivity && peek( currentActivity.actType ),
                currentActivityStatus = currentActivity && peek( currentActivity.status ),
                transitionsForState = Y.doccirrus.schemas.activity.getTransitions( currentActivityActType, currentActivityStatus ) || [],
                visible,
                hasPermissions,
                result;
            visible = transitionsForState.some( function( transitionDescription ) {
                if( transition === transitionDescription.transition ) {
                    result = transitionDescription;
                    hasPermissions = transitionDescription.accessGroups.some( Y.doccirrus.auth.memberOf );
                    return true;
                } else {
                    return false;
                }
            } );
            return visible && hasPermissions && peek( currentActivity._isValid ) && result;
        },

        /**
         *  Create pregnancy casefolder and open a new gravidogramm activity or open exiting
         *  gravidogramm on active pregnancy
         */

        createOrOpenGravidogramm: function( ) {
            var
                self = this,
                binder = self.getBinder(),
                currentPatient = self.getCurrentPatient(),
                caseFolders = currentPatient.caseFolderCollection,
                caseFolderId, activityId;

            async.series(
                [
                    lookupCaseFolder,
                    createPregnancyCaseFolder,
                    lookupGravidogramm,
                    createGravidogramm,
                    openGravidogramm
                ],
                onAllDone
            );

            //  Check if there is an existing active pregnancy
            function lookupCaseFolder( itcb ) {
                var caseFolder = caseFolders.getActivePregnancy();
                if ( caseFolder && caseFolder._id ) {
                    caseFolderId = caseFolder._id;
                }
                itcb( null );
            }

            //  Post new casefolder to server and update current patient casefolder collection
            function createPregnancyCaseFolder( itcb ) {
                //  if we already have an active caseFolder then we can skip this step
                if ( caseFolderId ) { return itcb( null ); }

                var
                    newCaseFolderData = {
                        'patientId': ko.unwrap( currentPatient._id ),
                        'additionalType': 'PREGNANCY',
                        'title': 'Schwangerschaft',
                        'disabled': false
                    };

                Y.doccirrus.inCaseUtils.createAndActivateNewCaseFolder( newCaseFolderData )
                    .then( onCaseFolderCreated )
                    .catch( itcb );

                function onCaseFolderCreated( newCaseFolderId ) {
                    Y.log( 'Created PREGNANCY caseFolder, id: ' + newCaseFolderId, 'debug', NAME );
                    caseFolderId = newCaseFolderId;
                    itcb( null );
                }
            }

            //  Check pregnancy casefolder for existing GRAVIDOGRAMM activity
            function lookupGravidogramm( itcb ) {
                var
                    query = {
                        'patientId': ko.unwrap( currentPatient._id ),
                        'caseFolderId': caseFolderId,
                        'actType': 'GRAVIDOGRAMM'
                    };

                Y.doccirrus.jsonrpc.api.activity
                    .read( { 'query': query } )
                    .then( onLookupGravidogramm )
                    .fail( itcb );

                function onLookupGravidogramm( result ) {
                    result = result.data ? result.data : result;

                    if ( result[0] ) {
                        activityId = result[0]._id;
                    }

                    itcb( null );
                }
            }

            //  Open a new GRAVIDOGRAMM activity in the casefolder if none exist
            function createGravidogramm( itcb ) {
                //  if we already have a gravidogramm then we can skip this step
                if ( activityId ) { return itcb( null ); }

                Y.doccirrus.inCaseUtils._createActivityByType( 'GRAVIDOGRAMM',
                    {
                        newActivityConfig: {
                            'patientId': ko.unwrap( currentPatient._id ),
                            'caseFolderId': caseFolderId
                        },
                        skipCaseFolderCheck: true
                    } );

                //  open to text tab
                itcb( null );
            }

            //  Open existing GRAVIDOGRAMM
            function openGravidogramm( itcb ) {
                if ( !activityId ) { return itcb( null ); }
                //  open to table tab
                Y.log( 'Navigate to existing GRAVIDOGRAMM: ' + activityId, 'debug', NAME );
                binder.navigateToActivity( { 'activityId': activityId } );
                itcb( null );
            }

            //  Display notice if error
            function onAllDone( err ) {
                if ( err ) {
                    Y.log( 'Could not open gravidogramm: ' + JSON.stringify( err ), 'warn', NAME );
                    //Y.doccirrus.DCWindow.notice( {
                    //    message: 'TRANSLATEME: could not open GRAVIDOGRAMM'
                    //} );
                }
            }

        },

        /**
         *  For activity tables where content should be collapsed/expanded with {{...}} markers
         *  @param meta
         */

        collapseActivityContent: function( meta ) {
            var
                self = this,
                USER_CONTENT_FOLD_MARKER = '{{...}}',
                USER_CONTENT_FOLD_BY_LEN_REGEXP = /{{\.\.\. ?\((\d+)\) ?}}/g,
                renderContentAsHTML = meta.value || '',
                foldedSomehow = false,
                divideByCharacters,
                parts, match;

            if ( -1 === renderContentAsHTML.indexOf( USER_CONTENT_FOLD_MARKER ) ) {
                return renderContentAsHTML;
            }

            //  Add custom fold to text, may be specified in activity type settings, or added to individual activities
            if ( -1 !== renderContentAsHTML.indexOf( USER_CONTENT_FOLD_MARKER ) && !divideByCharacters) {
                foldedSomehow = true;
                parts = renderContentAsHTML.split( USER_CONTENT_FOLD_MARKER, 2 );
                renderContentAsHTML = parts[0] +
                    '<a class="onActivitiesTableShowMoreContent-more" href="javascript:void(0);"> ... </a>' +
                    '<div class="onActivitiesTableShowMoreContent-detail onActivitiesTableShowMoreContent-detail-hidden">' +
                    parts[1] +
                    '</div>';
            }

            match = USER_CONTENT_FOLD_BY_LEN_REGEXP.exec(renderContentAsHTML || '');
            if( match && match.length ){
                divideByCharacters = Number.parseInt(match[1], 10);
                renderContentAsHTML = (renderContentAsHTML || '').replace( USER_CONTENT_FOLD_BY_LEN_REGEXP, '');
            }

            if ( !foldedSomehow ) {
                if( divideByCharacters ){
                    renderContentAsHTML = self.foldTextByCharsNumber( renderContentAsHTML, divideByCharacters );
                } else if( meta.data.actType === 'PROCESS' ) {
                    //if any folding are applied use default by 80 characters
                    renderContentAsHTML = self.foldTextByCharsNumber( renderContentAsHTML, 80 );
                }
            }

            return renderContentAsHTML;
        },

        foldTextByCharsNumber: function( renderContentAsHTML, divideByCharacters ){

            var
                stripedHtml, left, right, found, ind;

            if( !divideByCharacters ) {
                return divideByCharacters;
            }
            stripedHtml = renderContentAsHTML.replace(/<[^>]+>/g, '').replace( /&nbsp;/g, String.fromCharCode(0) );
            renderContentAsHTML = renderContentAsHTML.replace( /&nbsp;/g, String.fromCharCode(0) );
            if (stripedHtml.length > divideByCharacters ) {
                left = stripedHtml.substring( 0, divideByCharacters );
                right = stripedHtml.substring( divideByCharacters );
                found = false;

                //for left
                while( !found && left.length > 3 ) {
                    found = renderContentAsHTML.indexOf( left ) >= 0;
                    if( found ) {
                        break;
                    }
                    left = left.substring( 1 );
                }

                if( found ) {
                    ind = renderContentAsHTML.indexOf( left ) + left.length;
                    renderContentAsHTML = renderContentAsHTML.substring( 0, ind ) +
                        '<a class="onActivitiesTableShowMoreContent-more" href="javascript:void(0);"> ... </a>' +
                        '<div class="onActivitiesTableShowMoreContent-detail onActivitiesTableShowMoreContent-detail-hidden">' +
                        renderContentAsHTML.substring( ind ) +
                        '</div>';
                } else {
                    //for right
                    while( !found && right.length > 3 ) {
                        found = renderContentAsHTML.indexOf( right );
                        if( found >= 0 ) {
                            break;
                        }
                        right = right.substring( 0, right.length - 1 );
                    }

                    if( found ) {
                        ind = renderContentAsHTML.indexOf( right );
                        renderContentAsHTML = renderContentAsHTML.substring( 0, ind ) +
                            '<a class="onActivitiesTableShowMoreContent-more" href="javascript:void(0);"> ... </a>' +
                            '<div class="onActivitiesTableShowMoreContent-detail onActivitiesTableShowMoreContent-detail-hidden">' +
                            renderContentAsHTML.substring( ind ) +
                            '</div>';

                    }
                }

                renderContentAsHTML = renderContentAsHTML.replace( /\0/g, '&nbsp;' );
            }

            return renderContentAsHTML;
        }

    };

    Y.namespace( 'doccirrus' ).inCaseUtils = new InCaseUtils();

}, '3.16.0', {
    requires: [
        'activity-schema',
        'DCWindow',
        'create-medicationplan-handler'
    ]
} );
