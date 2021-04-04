/*
 * Copyright (c) 2012 Doc Cirrus GmbH
 * all rights reserved.
 */
/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, jQuery, $, ko, _, moment */

YUI.add( 'misBinderMain', function( Y, NAME ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientModel = KoViewModel.getConstructor( 'PatientModel' ),
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        getUrl = Y.doccirrus.utils.getUrl;

    function ViewModel() {
        ViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ViewModel, KoViewModel.getDisposable(), {
        initializer: function() {
            this.initObservables();
        },
        initObservables: function() {
            this.appIFrameUrl = ko.observable();
            this.appIFrameRootUrl = ko.observable();
            this.currentSolRoute = ko.observable();
            this.PostMessageConnection = Y.doccirrus.utils.getPostMessageConnectionInstance();
            this.handBookUrl = ko.observable(getUrl( 'handbuch' ) + '?video=1' );
            this.orientirungI18n = i18n( 'MISMojit.support_account_modal.label.Orientierung' );
            this.ersteSchritteI18n = i18n( 'MISMojit.support_account_modal.label.Erste_Schritte' );
            this.weitereVideosI18n = i18n( 'MISMojit.support_account_modal.label.weitere_Videos' );
        },
        setContainerHeight: function misBinderMain_setContainerHeight( element ) {
            this.PostMessageConnection.clean();

            this.iframeElement = element;

            this.iframeElement.addEventListener('load', this.iframeLoadListener.bind(this));

            this.PostMessageConnection
                .addListener(this.iframeConnectedListener.bind(this), 'CONNECTED')
                .addListener(this.resizeObserverUpdate.bind(this), 'RESIZE_OBSERVER_UPDATE')
                .addListener(this.modalListener.bind(this), 'SHOW_SOL_MODAL')
                .addListener(this.showTelekonsilModalListener.bind(this), 'SHOW_TELEKONSIL_MODAL')
                .addListener(this.taskModalListener.bind(this), 'SHOW_TASK_MODAL')
                .addListener(this.scanModalListener.bind(this), 'SHOW_SCAN_MODAL')
                .addListener(this.mmiModalListener.bind(this), 'SHOW_MMI_MODAL')
                .addListener(this.approveActivityListener.bind(this), 'APPROVE_ACTIVITY')
                .addListener(this.billActivityListener.bind(this), 'BILL_ACTIVITY')
                .addListener(this.validateActivityListener.bind(this), 'VALIDATE_ACTIVITY')
                .addListener(this.cancelActivityListener.bind(this), 'CANCEL_ACTIVITY')
                .addListener(this.deleteActivityListener.bind(this), 'DELETE_ACTIVITY')
                .addListener(this.transferActivityListener.bind(this), 'TRANSFER_ACTIVITY')
                .addListener(this.sendActivityViaEmailListener.bind(this), 'SEND_ACTIVITY_VIA_EMAIL')
                .addListener(this.sendActivityViaFaxListener.bind(this), 'SEND_ACTIVITY_VIA_FAX')
                .addListener(this.getPresetPatientParameters.bind(this), 'GET_PRESET_PATIENT_PARAMETERS')
                .addListener(this.sendPresetPatientParameters.bind(this), 'SET_PRESET_PATIENT_PARAMETERS')
                .addListener(this.solRouteChangedListener.bind(this), 'SOL_ROUTE_CHANGED')
                .setIframeWindow(this.appIFrameRootUrl(), this.iframeElement.contentWindow);
        },

        resizeObserverUpdate: function(sourceEvent) {
            window.removeEventListener('resize', this.resizeCb);

            this.iframeElement.style.height = sourceEvent.data.payload.height + 'px';
        },

        iframeLoadListener: function() {
            var debounceTimeout = 500;

            this.resizeCb = _.debounce( function() {
                if( this.iframeElement.parentNode ) {
                    this.iframeElement.style.height = '';
                    this.iframeElement.style.height = (window.innerHeight - this.iframeElement.parentNode.offsetHeight).toString() + 'px';
                }
            }.bind( this ), debounceTimeout );

            window.addEventListener('resize', this.resizeCb );

            this.resizeCb();
        },

        iframeConnectedListener: function() {},

        modalListener: function(sourceEvent) {
            this.SolsModal = new Y.doccirrus.modals.DCSolModal(event.data.payload, this.saveModalData.bind(this, sourceEvent.data.payload.iframeUrl));
        },

        showTelekonsilModalListener: function(sourceEvent) {
            Y.doccirrus.modals.startTelekonsil.show( {
                patientId: sourceEvent.data.payload.patientId,
                caseFolderId: sourceEvent.data.payload.caseFolderId
            } );
        },

        taskModalListener: function(sourceEvent) {
            if (sourceEvent.data.payload.taskId) {
                Y.doccirrus.jsonrpc.api.task.getPopulatedTask( {
                    noBlocking: true,
                    query: {
                        _id: sourceEvent.data.payload.taskId
                    }
                } )
                    .done( function( response ) {
                        var
                            _data = response.data && response.data[0];
                        Y.doccirrus.modals.taskModal.showDialog( _data, function() {
                            this.PostMessageConnection.postMessageToIframe({
                                action: 'UPDATE_TASKS',
                                targetUrl: this.appIFrameRootUrl(),
                                payload: {
                                    taskId: sourceEvent.data.payload.taskId
                                }
                            });
                        }.bind(this) );
                    }.bind(this) )
                    .fail( function( error ) {
                        _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } );
            }

        },

        getPresetPatientParameters: function(sourceEvent) {
            this.PostMessageConnection.postMessageToIframe({
                action: 'GET_PRESET_PATIENT_PARAMETERS',
                targetUrl: this.appIFrameRootUrl(),
                payload: sourceEvent.data.payload
            });
        },

        sendPresetPatientParameters: function(sourceEvent) {
            this.PostMessageConnection.postMessageToIframe({
                action: 'SET_PRESET_PATIENT_PARAMETERS',
                isInsuitePage: true,
                targetUrl: window.location.origin,
                payload: sourceEvent.data.payload
            }, window.location.origin, this.SolsModal.contentWindow);
        },

        solRouteChangedListener: function (event) {
            var
                data = event.data.payload;

            if (data.route) {
                this.currentSolRoute( data.route );
                location.hash = '#' + data.route.replace('sol/', '');
            }
        },

        saveModalData: function(iframeUrl, data, cb) {
            Promise.resolve(data)
                .then(function() {
                    if (Array.isArray(data.activities) && data.activities.length) {
                        this.PostMessageConnection.postMessageToIframe({
                            action: 'ACTIVITES_UPDATED',
                            targetUrl: this.appIFrameRootUrl(),
                            payload: { iframeUrl: iframeUrl, activities: data.activities }
                        });
                    }

                    if (data.patientId) {
                        this.PostMessageConnection.postMessageToIframe({
                            action: 'FRAME_VIEW_PATIENT_CONTEXT',
                            targetUrl: this.appIFrameRootUrl(),
                            payload: {
                                iframeUrl: iframeUrl,
                                patientId: data.patientId
                            }
                        });
                    }

                    cb();
                }.bind(this));
        },

        scanModalListener: function(event) {
            var
                data = event.data.payload,
                patientData = data.patient,
                employeeId = data.employeeId,
                caseFolder = data.caseFolder;

            return Promise.all([
                Y.doccirrus.jsonrpc.api.patient.lastSchein( {
                    query: {
                        caseFolderId: caseFolder._id,
                        patientId: patientData._id,
                        timestamp: moment().toISOString(),
                        patientData: patientData
                    }
                } ),
                Y.doccirrus.jsonrpc.api.location.read( { query: {} } )
            ])
                .then( function( response ) {
                    var
                        lastSchein = response[0] && response[0].data && response[0].data[0],
                        locations = response[1].data,
                        insurance = Y.doccirrus.schemas.patient.getInsuranceByType( patientData, caseFolder.type );

                    Y.doccirrus.modals.scanMedicationPlan.show( {
                        locationList: locations,
                        lastSchein: lastSchein,
                        insurance: insurance,
                        patient: patientData,
                        caseFolderType: caseFolder.type,
                        caseFolderId: caseFolder._id,
                        employeeId: employeeId,
                        patientAge: patientData.kbvDob ? moment().diff( moment( data.patient.kbvDob, 'DD.MM.YYYY' ), 'years' ) : ''
                    } );
                } );
        },

        mmiModalListener: function(event) {
            var data = event.data.payload;

            Promise.all([
                Y.doccirrus.jsonrpc.api.patient.read({
                    query: { _id: data.patientId }
                }),
                Y.doccirrus.jsonrpc.api.mmi.getMappingCatalogEntries({
                    query: {
                        catalogShortNames: ['MOLECULETYPE', 'MOLECULEUNIT', 'PHARMFORM', 'DISCOUNTAGREEMENT']
                    }
                })
            ])
                .then( function( response ) {
                    var
                        caseFolders = [data.caseFolder],
                        patientData = response[0] && response[0].data[0],
                        defaultMappings = response[1] && response[1].data,
                        patientModel = new PatientModel({
                            caseFolders: caseFolders,
                            data: patientData
                        });

                    Y.doccirrus.modals.medicationModal.showDialog( defaultMappings, {
                        activity: {
                            locationId: data.locationId,
                            employeeId: data.employeeId,
                            _locationList: data.locations,
                            _employeeList: [{
                                _id: data.employeeId,
                                officialNo: data.employeeOfficialNo
                            }],
                            caseFolder: data.caseFolder
                        },
                        patient: patientModel,
                        multiSelect: true,
                        focusInput: data.focusInput
                    }, function( err, selectedMedications ) {
                        if( err ) {
                            return Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                        }
                        selectedMedications.forEach( function( selected ) {
                            var isOTC,
                                patientAge,
                                isOver12,
                                isChild,
                                phPatPay,
                                phPatPayHint;
                            if( selected && selected.package && selected.package.originalData && selected.product && selected.product.originalData ) {

                                isOTC = selected.product.originalData.phOTC;
                                patientAge = patientModel.age();
                                isOver12 = 12 < patientAge;
                                isChild = 18 >= patientAge;
                                phPatPay = selected.package.originalData.phPatPay;
                                phPatPayHint = selected.package.originalData.phPatPayHint;

                                if( isOTC && isChild && isOver12 ) {
                                    phPatPay = null;
                                    phPatPayHint = null;
                                } else if( isChild ) {
                                    phPatPay = 0;
                                    phPatPayHint = 'zuzahlungsfrei';
                                }

                                Y.doccirrus.schemas.activity._setActivityData( {
                                    initData: {
                                        actType: 'MEDICATION',
                                        catalogShort: 'MMI',
                                        locationId: data.locationId
                                    },
                                    entry: {
                                        code: '',
                                        title: selected.product.originalData.title,
                                        phTer: selected.product.originalData.phTer,
                                        phTrans: selected.product.originalData.phTrans,
                                        phImport: selected.product.originalData.phImport,
                                        phNegative: selected.product.originalData.phNegative,
                                        phLifeStyle: selected.product.originalData.phLifeStyle,
                                        phLifeStyleCond: selected.product.originalData.phLifeStyleCond,
                                        phGBA: selected.product.originalData.phGBA,
                                        phDisAgr: selected.product.originalData.phDisAgr,
                                        phDisAgrAlt: selected.product.originalData.phDisAgrAlt,
                                        phMed: selected.product.originalData.phMed,
                                        phPrescMed: selected.product.originalData.phPrescMed,
                                        phCompany: selected.product.originalData.phCompany,
                                        phOnly: selected.product.originalData.phOnly,
                                        phRecipeOnly: selected.product.originalData.phRecipeOnly,
                                        phBTM: selected.product.originalData.phBTM,
                                        phOTC: selected.product.originalData.phOTC,
                                        phOTX: selected.product.originalData.phOTX,
                                        phAMR: selected.product.originalData.phAMR,
                                        phAtc: selected.product.originalData.phAtc,
                                        phIngr: selected.product.originalData.phIngr,
                                        phForm: selected.product.originalData.phForm,

                                        phPriceSale: selected.package.originalData.phPriceSale,
                                        phRefundAmount: selected.package.originalData.phRefundAmount,
                                        phPriceRecommended: selected.package.originalData.phPriceRecommended,
                                        phPatPay: phPatPay,
                                        phPatPayHint: phPatPayHint,
                                        phFixedPay: selected.package.originalData.phFixedPay,
                                        phCheaperPkg: selected.package.originalData.phCheaperPkg,

                                        phNLabel: selected.package.originalData.phNLabel,

                                        phPZN: selected.package.originalData.phPZN,
                                        phPackSize: selected.package.originalData.phPackSize,
                                        phARV: selected.package.originalData.phARV
                                    },
                                    user: null
                                }, function( err, medication ) {
                                    if( err ) { Y.log( 'can never happen in client #0002' ); }

                                    medication.status = 'CREATED';
                                    medication.locationId = data.locationId;
                                    medication.employeeId = data.employeeId;
                                    medication.caseFolderId = data.caseFolder._id;
                                    medication.patientId = data.patientId;
                                    medication.timestamp = moment().toISOString();

                                    Y.doccirrus.jsonrpc.api.activity.create( {
                                        data: medication
                                    } )
                                        .fail( function( error ) {
                                            Y.log( 'Error creating medication ' + error.toString(), 'warn' );
                                        } );
                                } );
                            }
                        } );
                    });
                } )
                .catch(function( error ) {
                    Y.log( 'Could not get all data to open MMI mmedication selector modal. Error: '+error.toString(), 'warn' );
                });
        },

        validateActivityListener: function( event ) {
            Y.doccirrus.jsonrpc.api.activity.doTransitionBatch( { query: { ids: [event.data.payload.activityId], transition: 'validate' } } );
        },

        billActivityListener: function( event ) {
            Y.doccirrus.jsonrpc.api.activity.doTransitionBatch( { query: { ids: [event.data.payload.activityId], transition: 'bill' } } );
        },

        approveActivityListener: function( event ) {
            Y.doccirrus.jsonrpc.api.activity.doTransitionBatch( { query: { ids: [event.data.payload.activityId], transition: 'approve' } } );
        },

        cancelActivityListener: function( event ) {
            Y.doccirrus.jsonrpc.api.activity.doTransitionBatch( { query: { ids: [event.data.payload.activityId], transition: 'cancel' } } );
        },

        deleteActivityListener: function( event ) {
            Y.doccirrus.jsonrpc.api.activity.doTransitionBatch( { query: { ids: [event.data.payload.activityId], transition: 'delete' } } );
        },

        transferActivityListener: function( event ) {
            Y.doccirrus.modals.transferActivity.show( {
                transferTo: event.data.payload.transferTo || true,
                patientId: event.data.payload.patientId,
                activityIds: event.data.payload.activityIds
            } );
        },

        sendActivityViaEmailListener: function(event) {
            var patientContactIds = [],
                familyDoctor = event.data.payload.currentPatient.familyDoctor,
                physicians = event.data.payload.currentPatient.physicians,
                institution = event.data.payload.currentPatient.institution,
                additionalContacts = event.data.payload.currentPatient.additionalContacts;

            event.data.payload.currentPatient.additionalContactsObj = [];

            if( familyDoctor && 'string' === typeof familyDoctor ) {
                patientContactIds.push( familyDoctor );
            }

            if( physicians && physicians.length ) {
                physicians.forEach( function( physician ) {
                    if( 'string' === typeof physician ) {
                        patientContactIds.push( physician );
                    }
                } );
            }

            if( institution && 'string' === typeof institution ) {
                patientContactIds.push( institution );
            }

            if( additionalContacts && additionalContacts.length ) {
                additionalContacts.forEach( function( additionalContact ) {
                    if( 'string' === typeof additionalContact ) {
                        patientContactIds.push( additionalContact );
                    }
                } );
            }

            return Promise
                .props( {
                    patientContacts: Y.doccirrus.jsonrpc.api.basecontact
                        .getExpandedPhysicians( {query: {'_id': {$in: patientContactIds}}} ),
                    currentEmployee: Y.doccirrus.jsonrpc.api.employee
                        .getEmployeeForUsername( {username: Y.doccirrus.auth.getUserId()} ),
                    employeesFromActivities: Y.doccirrus.jsonrpc.api.employee.read( {
                        query: {_id: event.data.payload.activity.employeeId}
                    } )
                } )
                .then( function( props ) {
                    var currentEmployee = props.currentEmployee && props.currentEmployee.data || null,
                        employeesFromActivities = props.employeesFromActivities && props.employeesFromActivities.data || [],
                        patientContacts = props.patientContacts && props.patientContacts.data || [];

                    patientContacts.forEach( function( contactObj ) {
                        if( physicians && physicians.length && contactObj._id === physicians[0] ) {
                            event.data.payload.currentPatient.physiciansObj = contactObj;
                        }

                        if( institution && contactObj._id === institution ) {
                            event.data.payload.currentPatient.institutionObj = contactObj;
                        }

                        if( familyDoctor && contactObj._id === familyDoctor ) {
                            event.data.payload.currentPatient.familyDoctorObj = contactObj;
                        }

                        if( additionalContacts && (-1 !== additionalContacts.indexOf( contactObj._id )) ) {
                            event.data.payload.currentPatient.additionalContactsObj.push( contactObj );
                        }
                    } );

                    Y.doccirrus.modals.mailActivitiesModal.showDialog(
                        [event.data.payload.activity],
                        event.data.payload.currentPatient,
                        event.data.payload.currentUser,
                        event.data.payload.locations,
                        currentEmployee,
                        employeesFromActivities,
                        function( data ) {
                            Y.doccirrus.jsonrpc.api.activity.mailActivities( {
                                data: data
                            } ).then( function() {
                                Y.doccirrus.DCSystemMessages.addMessage( {
                                    messageId: 'mailActivitiesMessage',
                                    content: i18n( 'InCaseMojit.mailActivities.SUCCESS' )
                                } );
                            }, function( err ) {
                                Y.doccirrus.DCSystemMessages.addMessage( {
                                    messageId: 'mailActivitiesError',
                                    content: "Error: " + err
                                } );
                            } );
                        } );
                } )
                .catch( Y.doccirrus.promise.catchUnhandled );
        },

        sendActivityViaFaxListener: function(event) {
           Y.doccirrus.modals.faxActivitiesModal.showDialog(
               [event.data.payload.activity],
               event.data.payload.currentPatient,
               event.data.payload.currentUser,
               function( data ) {
                //  rotate landscape PDFs to portrait orientation MOJ-7590
                data.autorotate = true;

                Y.doccirrus.jsonrpc.api.activity.mailActivities( {
                    data: data
                } ).then( function() {
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: 'faxActivitiesMessage',
                        content: i18n( 'InCaseMojit.mailActivities.SUCCESS' )
                    } );
                }, function( err ) {
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: 'faxActivitiesError',
                        content: "Error: " + err
                    } );
                } );
            } );
        },

        /** @protected */
        destructor: function() {
            this.destroySolListeners();

            this.destroy();
        },

        destroySolListeners: function () {
            this.PostMessageConnection.clean();


            window.removeEventListener('resize', this.resizeCb);
        }
    } );
    /**
     * Constructor for the patientBinderIndex class.
     *
     * @class patientBinderIndex
     * @constructor
     */
    Y.namespace( 'mojito.binders' )[ NAME ] = {

        /** using client side Jade so we need to announce who we are. */
        jaderef: 'MISMojit',

        /**
         * Binder initialization method, invoked after all binders on the page
         * have been constructed.
         */
        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
        },

        /**
         * The binder method, invoked to allow the mojit to attach DOM event
         * handlers.
         *
         * @param node {Node} The DOM node to which this mojit is attached.
         */
        bind: function( node, domNode ) {
            var
                streamerURL = this.mojitProxy.pageData.get( 'streamerURL' ),
                appRegs = Y.doccirrus.auth.getAppRegs() || [],
                viewModel = new ViewModel();

            this._initSubNavigation( appRegs, viewModel );
            if( streamerURL ) {

                jQuery( domNode ).on( 'click', '[data-video]', function( $event ) {
                    var
                        $target = jQuery( $event.target );

                    if( !($target.is( 'a, a *' ) || $target.is( 'button, button *' )) ) {
                        return true;
                    }

                    var urlp = streamerURL,
                        src1 = urlp + '?video=' + jQuery( this ).data( 'video' ) + '&format=mp4',
                        src2 = urlp + '?video=' + jQuery( this ).data( 'video' ) + '&format=webm';

                    jQuery( '#myModalCopiedFromTutorial-mp4' ).attr( { src: src1, type: 'video/mp4' } );
                    jQuery( '#myModalCopiedFromTutorial-webm' ).attr( { src: src2, type: 'video/webm' } );
                    jQuery( '#myModalCopiedFromTutorial' ).text( jQuery( this ).find( 'a' ).text() );
                    jQuery( '#myModalCopiedFromTutorial-video' ).load();
                    jQuery( '#myModalCopiedFromTutorial-videoModal' ).modal( 'show' );
                } );
            }
            ko.applyBindings( viewModel, document.querySelector( '#viewModel' ) );

            Y.doccirrus.DCBinder.initToggleFullScreen();
        },
        _initSubNavigation: function( appRegs, viewModel ) {
            var
                self = this,
                DC_HOME_PAGE = 'DC_HOME_PAGE',
                rootPath = '/',
                aSubNavigationModel, fullScreenToggleMainPage,
                localStorageActiveTab = getLocalStorageValueForHomePage('activeTab'),
                routes = [
                    {
                        path: '/',
                        callbacks: function( req ) {
                            if( Y.config.debug ) {
                                Y.log( 'Follow main route / ' + JSON.stringify( req.params ), 'debug', NAME );
                            }
                            handleTab( DC_HOME_PAGE, DC_HOME_PAGE, Y.doccirrus.i18n( 'general.PAGE_TITLE.INSUITE_START' ) );
                        }
                    }
                ],
                navItems = [
                    {
                        name: DC_HOME_PAGE,
                        href: '/#/',
                        text: Y.doccirrus.i18n( 'general.PAGE_TITLE.START' ),
                        click: handleTabClick
                    }
                ];
            appRegs.forEach( function( appReg ) {
                if( !appReg.hasAccess ) {
                    return;
                }
                appReg.uiConfiguration.some( function( config ) {
                    var
                        url,
                        elem,
                        testLicense = Y.doccirrus.auth.hasSupportLevel( Y.doccirrus.schemas.settings.supportLevels.TEST );

                    if( config.type === Y.doccirrus.schemas.appreg.uiConfigurationTypes.HOME ) {
                        url = config.targetUrl;
                        if( Y.doccirrus.schemas.apptoken.appTokenTypes.LOCAL === appReg.type || Y.doccirrus.schemas.apptoken.appTokenTypes.BUILTIN === appReg.type ) {
                            elem = document.createElement( "a" );
                            elem.href = url;

                            if( !testLicense || location.host === elem.host ) {
                                url = Y.doccirrus.infras.getPrivateURL( elem.pathname + (elem.hash || '') );
                            }
                        }
                        routes.push( {
                            path: "/" + appReg.appName + "*" ,
                            callbacks: function( req ) {
                                if( Y.config.debug ) {
                                    Y.log( 'Follow main route / ' + JSON.stringify( req.params ), 'debug', NAME );
                                }

                                handleTab( appReg.appName, url + req.path.substring( appReg.appName.length + 2 ), appReg.title || appReg.appName, "/sol/" + appReg.appName );
                            }
                        } );
                        navItems.push( {
                            name: appReg.appName,
                            href: '/#/' + appReg.appName,
                            text: appReg.title || appReg.appName,
                            click: handleTabClick
                        } );
                        return true;
                    }
                } );
            } );

            function handleTabClick (navItem) {
                setLocalStorageValueForHomePage('activeTab', {
                    name: navItem.name(),
                    href: navItem.href().replace('/#', '')
                });

                viewModel.destroySolListeners();
            }

            /**
             * Get localStorage data associated with this HomePage
             * @param {String} propertyName
             * @return {undefined|*}
             */
            function getLocalStorageValueForHomePage( propertyName ) {
                var
                    localValue = Y.doccirrus.utils.localValueGet( 'HomePage' );

                if( '' === localValue ) { // localValue seems to be unset
                    return undefined;
                } else {
                    localValue = JSON.parse( localValue );
                }
                return Y.doccirrus.commonutils.getObject( propertyName, localValue );
            }
            /**
             * Set localStorage data associated with this HomePage
             * @param {String} propertyName
             * @param {*} value
             */
            function setLocalStorageValueForHomePage( propertyName, value ) {
                var
                    localValue = Y.doccirrus.utils.localValueGet( 'HomePage' );

                if( '' === localValue ) { // localValue seems to be unset
                    localValue = {};
                } else {
                    localValue = JSON.parse( localValue );
                }
                Y.doccirrus.commonutils.setObject( propertyName, value, localValue );
                Y.doccirrus.utils.localValueSet( 'HomePage', localValue );
            }

            function handleTab( tabName, url, title, rootUrl ) {
                var tab = self.subNavigation.getItemByName( tabName );

                document.title = title;
                if( url === DC_HOME_PAGE ) {
                    viewModel.currentSolRoute( null );
                    viewModel.appIFrameUrl( null );
                    viewModel.appIFrameRootUrl( null );
                } else {
                    if ( viewModel.currentSolRoute() && viewModel.appIFrameUrl() ) {
                        if ( viewModel.currentSolRoute() !== url ) {
                            viewModel.PostMessageConnection.postMessageToIframe({
                                action: 'INSUITE_ROUTE_CHANGED',
                                targetUrl: viewModel.appIFrameRootUrl(),
                                payload: {
                                    route: url
                                }
                            });
                        }
                    } else {
                        viewModel.appIFrameRootUrl( rootUrl || url );
                        viewModel.appIFrameUrl( url );
                    }
                }
                if( tab ) {
                    tab.active( true );
                }
            }

            aSubNavigationModel = self.subNavigation = KoComponentManager.createComponent( {
                componentType: 'KoNav',
                componentConfig: {
                    items: navItems
                }
            } );
            aSubNavigationModel.showNav = ko.observable( navItems.length > 1 );

            fullScreenToggleMainPage = {
                toggleFullScreenHandler: function () {
                    Y.doccirrus.DCBinder.toggleFullScreen();
                },
                viewPortBtnI18n: Y.doccirrus.DCBinder.viewPortBtnI18n
            };

            ko.applyBindings( aSubNavigationModel, document.querySelector( '#mainPageNavigation' ) );
            ko.applyBindings( fullScreenToggleMainPage, document.querySelector( '#fullScreenToggleInMainPage' ) );

            self.router = new Y.doccirrus.DCRouter( {
                root: rootPath,
                routes: routes
            } );

            //  Set the default hash fragment, or action the route if one is given

            var routeTo = location.href.split( rootPath.replace( /^\//, '' ) + '#' );
            routeTo = (routeTo.length < 2) ? '/' : routeTo[ 1 ];

            if (localStorageActiveTab && routeTo === '/') {
                if (_.some(navItems, function (item) { return item.name() === localStorageActiveTab.name; })) { // Check if the activeTab stored in localStorage exists in the current navItems)
                    routeTo = localStorageActiveTab.href;
                } else { // As current localStorageActiveTab does not exist inside navItems then it should be removed from localStorage
                    setLocalStorageValueForHomePage('activeTab', undefined);
                }
            }

            Y.log( 'Initial YUI router path: ' + routeTo, 'debug', NAME );
            self.router.save( routeTo );

            //  update - YUI router may have refused the route which was set
            routeTo = self.router.getPath();
            Y.log( 'Parsed router path: ' + routeTo, 'debug', NAME );

            setTimeout(function() {
                $('.container').removeClass('hide');
            }, 1000);
        }
    };

}, '0.0.1', {
    requires: [
        'DCBinder',
        'doccirrus',
        'KoUI',
        'KoComponentManager',
        'KoNav',
        'KoViewModel',
        'dcutils',
        'JsonRpc',
        'event-mouseenter',
        'mojito-client',
        'mojito-rest-lib',
        'appreg-schema',
        'apptoken-schema',
        'DCRouter',
        'dcauth',
        'DCSolModal',
        'PatientModel',
        'DCScanMedicationPlanModal',
        'DCMailActivitiesModal',
        'DcSelectContactsModal',
        'dccatalogmap',
        'DCFaxActivitiesModal',
        'DCMailActivitiesModalPreview',
        'dctransfermodal',
        'partner-schema',
        'DCWindow',
        'DCMedicationSearchModel',
        'DocumentModel',
        'promise',
        'oop',
        'router',
        'dcmedicationmodal',
        'casefolder-schema',
        'inCaseUtils',
        'KoUI-all',
        'KoButton',
        'KoEditableTable',
        'KoSchemaValue',
        'JsonRpcReflection-doccirrus',
        'dcquery',
        'dcutils-uam',
        'dc-comctl',
        'v_medication-schema',
        'dcforms-schema-InCase-T',
        'dcpatientandreceiptselect',
        'edmp-commonutils',
        'dcpatienttransfermodal',
        'dcstarttelekonsilmodal'
    ] } );
