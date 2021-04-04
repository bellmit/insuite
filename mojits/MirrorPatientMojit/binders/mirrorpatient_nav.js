/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */
YUI.add( 'MirrorPatientMojitBinder', function( Y, NAME ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        peek = ko.utils.peekObservable,
        ignoreDependencies = ko.ignoreDependencies,
        unwrap = ko.unwrap,

        NO_SCHEIN = i18n( 'InCaseMojit.casefile_detailJS.message.NO_SCHEIN' ),
        NO_SCHEIN_IN_QUARTER = i18n( 'InCaseMojit.casefile_detailJS.message.NO_SCHEIN_IN_QUARTER' ),
        NO_SCHEIN_EXPLANATION = i18n( 'InCaseMojit.casefile_detailJS.message.NO_SCHEIN_EXPLANATION' ),
        CREATE_SCHEIN = i18n( 'InCaseMojit.casefile_detailJS.button.CREATE_SCHEIN' ),

        catchUnhandled = Y.doccirrus.promise.catchUnhandled,

        KoViewModel = Y.doccirrus.KoViewModel,
        PatientModel = KoViewModel.getConstructor( 'PatientModel' ),
        ActivityModel = KoViewModel.getConstructor( 'ActivityModel' ),

        TAB_PATIENT_BROWSER = 'tab_patientBrowser',
        TAB_CASE_FILE = 'tab_caseFile',
        TAB_PATIENT_DETAIL = 'tab_patientDetail',
        TAB_WITHOUT_CARDREAD = 'tab_withoutCardRead',
        TAB_APK = 'tab_apkInProgress',

        MirrorPatientBrowserViewModel = KoViewModel.getConstructor( 'MirrorPatientBrowserViewModel' ),
        CaseFileViewModel = KoViewModel.getConstructor( 'MirrorCaseFileViewModel' ),
        PatientDetailViewModel = KoViewModel.getConstructor( 'PatientDetailViewModel' ),
        WithoutCardReadViewModel = KoViewModel.getConstructor( 'WithoutCardReadViewModel' ),
        ApkInProgressViewModel = KoViewModel.getConstructor( 'ApkInProgressViewModel' );

    /**
     * @class MirrorPatientMojitBinder
     * @extends Y.doccirrus.DCBinder
     * @constructor
     */
    function MirrorPatientMojitBinder() {
        MirrorPatientMojitBinder.superclass.constructor.apply( this, arguments );
    }

    Y.extend( MirrorPatientMojitBinder, Y.doccirrus.DCBinder, {
        /** @private */
        initializer: function() {
            var
                self = this;

            // console.warn( 'MirrorPatientMojitBinder', self );
            self.initObservables();

            //  set the default / 'not found' image
            Y.doccirrus.media.setDefaultImage( '/static/CaseFileMojit/assets/images/default-patient-image.jpg' );
            //self.initHotKeys();
            self.initDcChangeTab();
            Y.doccirrus.DCBinder.initToggleFullScreen();

        },
        /** @private */
        destructor: function() {
            //var
            //    self = this;
            //self.destroyHotKeys();
        },
        /**
         * @property hotKeysGroup
         * @type {null|Object}
         */
        hotKeysGroup: null,
        initHotKeys: function() {
            var
                self = this;

            self.hotKeysGroup = Y.doccirrus.HotKeysHandler.addGroup( 'global' )
                .on( 'ctrl+h', 'Hilfe für Tastenkürzel', function() {
                    var
                        currentView = peek( self.currentView ),
                        currentActivity = peek( self.currentActivity ),
                        hotKeysGroups = currentActivity ? ['ActivityDetailsViewModel', currentView && currentView.name] : currentView && currentView.name,
                        htmlForOverlay = [
                            '<table class="table table-bordered">',
                            '<thead><tr><th><b>Symbol</b></th><th><b>Bezeichnung</b></th></tr></thead>',
                            Y.doccirrus.HotKeysHandler.toHtml( hotKeysGroups ),
                            '</table>'
                        ].join( '' );

                    if( !Y.one( '#HotKeysHandlerCheatSheet' ) ) {
                        Y.doccirrus.DCWindow.notice( {
                            title: "Die Übersicht von möglichen Tastenabkürzungen",
                            message: htmlForOverlay,
                            window: {
                                id: 'HotKeysHandlerCheatSheet',
                                width: 'large', type: 'info'
                            }
                        } );
                    }
                } );

        },
        destroyHotKeys: function() {
            var
                self = this;
            if( self.hotKeysGroup ) {
                self.hotKeysGroup
                    .un( 'ctrl+h' );
                self.hotKeysGroup = null;
            }
        },
        initDcChangeTab: function() {
            Y.doccirrus.NavBarHeader.setActiveEntry( 'mirror_patients' );
        },
        viewPortBtnI18n : Y.doccirrus.DCBinder.viewPortBtnI18n,
        /**
         * Handler of the toggle full-screen action
         */
        toggleFullScreenHandler: function () {
            Y.doccirrus.DCBinder.toggleFullScreen();
        },
        /** @private */
        _setInitialData: function() {
            var
                self = this;

            MirrorPatientMojitBinder.superclass._setInitialData.apply( self, arguments );
            self.updateActivityTypes();
        },
        /**
         * Rebuilds "activityTypes" based on "activitySettings"
         * @method updateActivityTypes
         */
        updateActivityTypes: function() {
            var
                self = this,
                activitySettings = self.getInitialData( 'activitySettings' ),
                activitySettingsMap = Y.Array.reduce( activitySettings, {}, function( result, item ) {
                    result[item.actType] = item;
                    return result;
                } ),
                actTypeConfig = Y.doccirrus.schemas.activity.getActTypeClientConfig(),
                ACTTYPEMAP = {},
                ACTTYPELIST = Y.Array.map( Y.doccirrus.schemas.activity.nameGroupedActivityTypeConfigs, function( item ) {
                    var
                        config = actTypeConfig[item.val],
                        activitySetting = activitySettingsMap[item.val],
                        result = Y.merge( item, {
                            visible: activitySetting && activitySetting.isVisible || false,
                            activeTab: config.activeTab,
                            disabledTabs: config.disabledTabs,
                            editorView: item.functionality,
                            activitySetting: activitySetting
                        } );
                    ACTTYPEMAP[item.val] = result;

                    return result;
                } );

            self.setInitialData( 'activityTypes', {
                list: ACTTYPELIST,
                map: ACTTYPEMAP
            } );

        },
        /**
         * @property currentView
         * @type {null|ko.observable(null|ViewModel)}
         */
        currentView: null,
        /**
         * @property currentPatient
         * @type {null|ko.observable(null|PatientModel)}
         */
        currentPatient: null,
        /**
         * @property currentActivity
         * @type {null|ko.observable(null|SimpleActivityModel)}
         */
        currentActivity: null,

        /**
         * Multiple child views use this flag to disable UI
         * @property pdfRenderInProgress
         * @type {null|ko.observable(null|Boolean)}
         */

        pdfRenderInProgress: null,

        casefolderApiFn: Y.doccirrus.jsonrpc.api.mirrorcasefolder,

        /** @protected */
        initObservables: function() {
            var
                self = this,
                currentView = ko.observable( null ),
                currentPatient = ko.observable( null ),
                currentActivity = ko.observable( null );

            self.currentView = ko.computed( {
                read: currentView,
                write: function( value ) {
                    if( value !== peek( currentView ) ) { // prevent change for same value
                        currentView( value );
                    }
                }
            } );
            self.currentPatient = ko.computed( {
                read: currentPatient,
                write: function( value ) {
                    var
                        currentPatientPeek = peek( currentPatient );

                    if( value !== currentPatientPeek ) { // prevent change for same value
                        if( currentPatientPeek ) {
                            currentPatientPeek.destroy();
                        }
                        currentPatient( value );
                    }
                }
            } );
            self.currentActivity = ko.computed( {
                read: currentActivity,
                write: function( value ) {
                    var
                        currentActivityPeek = peek( currentActivity );

                    if( value !== currentActivityPeek ) { // prevent change for same value
                        if( currentActivityPeek ) {
                            currentActivityPeek.destroy();
                        }
                        currentActivity( value );
                    }
                }
            } );

            self.route = ko.observable( null );

            /*
            ko.computed( function() {
                console.warn( 'CHANGED: route', self.route() );
            } );
            ko.computed( function() {
                console.warn( 'CHANGED: currentPatient', unwrap( self.currentPatient ) );
            } );
            ko.computed( function() {
                console.warn( 'CHANGED: currentActivity', unwrap( self.currentActivity ) );
            } );
            ko.computed( function() {
                var currentView = unwrap( self.currentView );
                console.warn( 'CHANGED: currentView', currentView && currentView.constructor.NAME, currentView );
            } );
            */

            self.initRouteDependentHandling();
            self.initDocumentTitleHandling();
            self.initPdfHandling();
        },
        initRouteDependentHandling: function() {
            var
                self = this;

            self.route.subscribe( function( route ) {

                if( 'activity' !== route.route.routeId ) {
                    // unset activity on any route that is not "activity"
                    self.currentActivity( null );
                }
            } );

        },
        initDocumentTitleHandling: function() {
            var
                self = this,
                defaultTitle = Y.doccirrus.i18n( 'top_menu.LBL_MENU_PATIENTS' );

            ko.computed( function() {
                var
                    currentView = unwrap( self.currentView ),
                    currentPatient = peek( self.currentPatient );

                ignoreDependencies( function() {

                    if( !currentView ) {
                        document.title = defaultTitle;
                        return;
                    }

                    if( currentPatient ) {
                        switch( currentView.constructor.NAME ) {
                            case 'MirrorCaseFileViewModel':
                            case 'PatientDetailViewModel':
                                document.title = peek( currentPatient.lastname );
                                return;
                        }
                    }

                    document.title = defaultTitle;
                } );

            } ).extend( {rateLimit: 0} );
        },
        initPdfHandling: function() {
            var
                self = this;

            self.pdfWindows = {};
            self.currentPdfJobs = ko.observableArray( [] );
            self.pdfRenderInProgress = ko.observable( false );

            //  MOJ-8927 Enable print and PDF buttons when a PDF is available on ISD
            self.blockPDFButtons = ko.computed( function() {
                var currentActivity = unwrap( self.currentActivity );
                if ( currentActivity && currentActivity.formPdf && '' !== currentActivity.formPdf() ) {
                    return false;
                }
                return true;
            } );

        },
        getCurrentPdfJob: function() {
            return null;
        },
        setupNavigation: function() {
            var
                self = this,
                navigation = self.get( 'navigation' );

            navigation.addItems( [
                {
                    text: i18n( 'InCaseMojit.casefile_navJS.menu.PATIENTS' ),
                    name: TAB_PATIENT_BROWSER,
                    href: '#/patientbrowser'
                },
                {
                   text: 'Akte',
                   name: TAB_CASE_FILE,
                   visible: ko.computed( function() {
                       var
                           visible = false,
                           currentPatient = unwrap( self.currentPatient );

                       if( currentPatient && !currentPatient.isNew() ) {
                           visible = true;
                       }

                       return visible;
                   } ),
                   href: ko.computed( function() {
                       var
                           href = null,
                           currentPatient = unwrap( self.currentPatient ),
                           patientId = unwrap( currentPatient && currentPatient._id );

                       if( currentPatient && !currentPatient.isNew() ) {
                           href = '#/patient/' + patientId + '/tab/casefile_browser';
                       }

                       return href;
                   } )
                }
                //{
                //    text: 'Daten',
                //    name: TAB_PATIENT_DETAIL,
                //    visible: ko.computed( function() {
                //        var
                //            visible = false,
                //            currentPatient = unwrap( self.currentPatient );
                //
                //        if( currentPatient ) {
                //            visible = true;
                //        }
                //
                //        return visible;
                //    } ),
                //    href: ko.computed( function() {
                //        var
                //            href = null,
                //            currentPatient = unwrap( self.currentPatient ),
                //            patientId = unwrap( currentPatient && currentPatient._id );
                //
                //        if( currentPatient ) {
                //            if( currentPatient.isNew() ) {
                //                href = '#/patient/new/tab/patient_detail';
                //            }
                //            else {
                //                href = '#/patient/' + patientId + '/tab/patient_detail';
                //            }
                //        }
                //
                //        return href;
                //    } )
                //},
                //{
                //    text: i18n( 'InCaseMojit.casefile_navJS.menu.REPORTS' ),
                //    name: TAB_REPORTS,
                //    href: '#/reports'
                //},
                //{
                //    text: i18n( 'InCaseMojit.casefile_navJS.menu.tab_withoutCardRead' ),
                //    name: TAB_WITHOUT_CARDREAD,
                //    href: '#/withoutcardread'
                //},
                //{
                //    text: i18n( 'InCaseMojit.casefile_navJS.menu.tab_apkInProgress' ),
                //    name: TAB_APK,
                //    href: '#/apkinprogress'
                //}
            ] );

        },
        setupRouter: function() {
            var
                self = this,
                router = self.get( 'router' );

            router.set( 'root', Y.doccirrus.utils.getUrl( 'mirror_patients' ) );
            router.set( 'routes', [
                {
                    routeId: 'patientbrowser',
                    path: '/',
                    callbacks: Y.bind( self.route_patientbrowser, self )
                },
                {
                    routeId: 'patientbrowser',
                    path: '/patientbrowser',
                    callbacks: Y.bind( self.route_patientbrowser, self )
                },
                {
                    routeId: 'patient',
                    path: /^\/patient($|\/.*$)/,
                    callbacks: [
                        router.resolvePathAsKeyValue,
                        Y.bind( self.routeResolve_patient, self ),
                        Y.bind( self.route_patient, self )
                    ]
                },
                {
                    routeId: 'activity',
                    path: /^\/activity($|\/.*$)/,
                    callbacks: [
                        router.resolvePathAsKeyValue,
                        Y.bind( self.routeResolve_activity, self ),
                        Y.bind( self.route_activity, self )
                    ]
                }
                /*{
                    routeId: 'reports',
                    path: '/reports',
                    callbacks: Y.bind( self.route_reports, self )
                },
                {
                    routeId: 'withoutcardread',
                    path: '/withoutcardread',
                    callbacks: Y.bind( self.route_withoutcardread, self )
                },
                {
                    routeId: 'apkinprogress',
                    path: '/apkinprogress',
                    callbacks: Y.bind( self.route_apkinprogress, self )
                },
                 {
                 path: '*',
                 callbacks: function() {
                 console.warn( 'catch all other' );
                 }
                 }*/
            ] );

            /** specific routing for occurred events **/
            Y.on( 'activityTransitioned', function( activityTransitioned ) {
                var
                    currentPatient,
                    caseFolders,
                    activeTab,
                    quotationCaseFolder,
                    goToQuotationCaseFolder;

                function doDefault() {
                    if( !Y.doccirrus.schemas.activity.hasForm( activityTransitioned.data.actType ) && !activityTransitioned.skipRedirectBack ) {
                        self.navigateToCaseFileBrowser();
                    }
                }

                switch( activityTransitioned.data.status ) {
                    case 'DELETED':
                        self.navigateToCaseFileBrowser();
                        break;
                }

                switch( activityTransitioned.data.actType ) {
                    case 'QUOTATION':
                        currentPatient = unwrap(self.currentPatient);
                        caseFolders = currentPatient.caseFolderCollection;
                        activeTab = caseFolders.getActiveTab();
                        quotationCaseFolder = caseFolders.getLastOfAdditionalType( 'QUOTATION' );
                        goToQuotationCaseFolder = 'QUOTATION' === peek( activityTransitioned.data.actType ) && activityTransitioned.isNew && !(activeTab && 'QUOTATION' === activeTab.additionalType);

                        if( goToQuotationCaseFolder ) {
                            if( !quotationCaseFolder ) {
                                caseFolders.load( {patientId: peek( activityTransitioned.data.patientId )} )
                                    .then( function() {
                                        self.navigateToCaseFolder( {
                                            caseFolderId: caseFolders.getLastOfAdditionalType( 'QUOTATION' )._id
                                        } );
                                    } );
                            } else {
                                self.navigateToCaseFolder( {
                                    caseFolderId: quotationCaseFolder._id
                                } );
                            }
                        } else {
                            doDefault();
                        }
                        break;
                    default:
                        doDefault();
                }
            } );

        },
        /**
         * Get "quotationTreatments".
         * @returns {null|QuotationTreatmentsHandler}
         */
        getQuotationTreatments: function() {
            var
                activityDetailsViewModel = KoViewModel.getViewModel( 'MirrorActivityDetailsViewModel' ),
                quotationTreatments = activityDetailsViewModel && activityDetailsViewModel.get( 'quotationTreatments' ) || null;

            return quotationTreatments;
        },
        /**
         * Checks for "quotationTreatments".
         * @returns {boolean}
         */
        hasQuotationTreatments: function() {
            var
                self = this,
                quotationTreatments = self.getQuotationTreatments(),
                hasQuotationTreatments = Boolean( quotationTreatments );

            return hasQuotationTreatments;
        },
        /**
         * Checks for "quotationTreatments" and if available considers the modifications of.
         * @returns {boolean}
         */
        quotationTreatmentsHasModifications: function() {
            var
                self = this,
                quotationTreatments = self.getQuotationTreatments(),
                quotationTreatmentsHasModifications = Boolean( quotationTreatments && quotationTreatments.hasModifications() );

            return quotationTreatmentsHasModifications;
        },
        /**
         * Returns a Promise that will provide a PatientModel for patientId, could be the currentPatient if patientId matches
         * @method getPatientModelForPatientId
         * @param {String} patientId
         * @returns {Promise}
         */
        getPatientModelForPatientId: function( patientId ) {
            var
                self = this,
                currentPatient = peek( self.currentPatient );

            if( currentPatient && ( peek( currentPatient._id ) === patientId) ) {
                return Promise.resolve( currentPatient );
            }

            return PatientModel
                .createMirrorModelFromPatientId( patientId )
                .catch( catchUnhandled );
        },
        /**
         * Returns a Promise that will provide an ActivityModel, could be the currentActivity if computed same
         * - accepts an activity or its id as first argument
         * @method getActivityModelOf
         * @param {String|Object|SimpleActivityModel} firstArgument
         * @returns {Promise}
         */
        getActivityModelOf: function( firstArgument ) {

            var
                self = this,
                firstArgumentIsString = Y.Lang.isString( firstArgument ),
                activityId = firstArgumentIsString ? firstArgument : peek( firstArgument._id ),
                actType = firstArgument && firstArgument.activity && peek( firstArgument.activity.actType ),
                currentActivity = peek( self.currentActivity );

            /**
             * reuse currentActivity model if:
             * 1. CurrentActivity exists
             * 2. User is trying to open the same existing activity. Marker - passed _id === currentActivity._id
             * 3. User switched tab(activity section). Marker - There is no new actType
             * 4. User is trying to create new activity, when the same new activity(actType the same) is already opened.
             *  Marker - no '_id' but passed actType === currentActivity.actType
             */
            if( currentActivity && ( peek( currentActivity._id ) === activityId) && (activityId || !actType || (peek( currentActivity.actType ) === actType) ) ) {
                return Promise.resolve( currentActivity );
            }

            return ActivityModel
                .createModelFrom( firstArgument )
                .catch( catchUnhandled );
        },

        /**
         * Get the current set patients _id (subscribeable)
         * @returns {String|undefined}
         */
        getCurrentPatientId: function() {
            var
                self = this,
                currentPatientId = unwrap( self.currentPatient );

            currentPatientId = currentPatientId && unwrap( currentPatientId._id );

            return currentPatientId || undefined;
        },
        /**
         * Note: this is called indirectly, through the ActivityDetailsViewModel, to allow attachments to be saved
         * for server-side FSM prior to transition
         *
         * @method transitionCurrentActivity
         * @param {Object} parameters
         * @returns {Promise}
         */
        transitionCurrentActivity: function( parameters ) {
            var
                self = this,
                currentActivity = peek( self.currentActivity ),
                transitionDescription = parameters.transitionDescription,
                isNew;

            if( !(currentActivity && transitionDescription) ) {
                return Promise.reject( 'transitionCurrentActivity: invalid parameters' );
            }

            isNew = currentActivity.isNew();

            return currentActivity.transitionActivity( {
                    transitionDescription: transitionDescription
                } )
                .then( function( activity ) {
                    //  inTransition property prevents spurious action by the mappers due to .set updating things
                    currentActivity.inTransition( true );

                    if (isNew) {
                        //  we now have an _id for this activity, add it to hash fragment in URL
                        if (activity._id) {
                            window.location.hash = window.location.hash.replace('/new/', '/' + activity._id + '/');
                        }
                    }

                    currentActivity.set( 'data', activity );

                    currentActivity.inTransition( false );
                    currentActivity.setNotModified();

                    Y.fire( 'activityTransitioned', {
                        model: currentActivity,
                        data: activity,
                        transitionDescription: transitionDescription,
                        isNew: isNew,
                        skipRedirectBack: parameters.skipRedirectBack
                    } );
                    return activity;
                } )
                .catch( catchUnhandled );
        },
        /**
         * @method copyCurrentActivity
         * @returns {Promise}
         */
        copyCurrentActivity: function() {
            var
                self = this,
                currentActivity = peek( self.currentActivity );

            if( !currentActivity ) {
                return Promise.reject( 'copyCurrentActivity: invalid parameters' );
            }

            return currentActivity
                .copyActivity()
                .then( function( activity ) {
                    Y.fire( 'activityCopied', {
                        data: activity
                    } );
                    return activity;
                } )
                .catch( catchUnhandled );
        },
        /**
         * @method navigateToRoot
         */
        navigateToRoot: function() {
            var
                self = this;

            self
                .get( 'router' )
                .save( '/' );
        },
        /**
         * @method navigateToPatientBrowser
         */
        navigateToPatientBrowser: function() {
            var
                self = this;

            self
                .get( 'router' )
                .save( '/patientbrowser' );
        },
        /**
         * @method navigateToCaseFileBrowser
         * @param {Object} [parameters]
         * @param {String} [parameters.patientId=currentPatient._id]
         */
        navigateToCaseFileBrowser: function( parameters ) {
            parameters = parameters || {};
            var
                self = this,
                patientId = parameters.patientId || self.getCurrentPatientId();

            self
                .get( 'router' )
                .save( '/patient/' + patientId + '/tab/casefile_browser' );
        },
        /**
         * @method navigateToCaseFolder
         * @param {Object} parameters
         * @param {String} [parameters.patientId]
         * @param {String} [parameters.caseFolderId='all']
         */
        navigateToCaseFolder: function( parameters ) {
            parameters = parameters || {};
            var
                self = this,
                patientId = parameters.patientId || self.getCurrentPatientId(),
                caseFolderId = parameters.caseFolderId || 'all';

            self
                .get( 'router' )
                .save( '/patient/' + patientId + '/tab/casefile_browser/casefolder/' + caseFolderId );
        },
        /**
         * @method navigateToPatientDetail
         * @param {Object} [parameters]
         * @param {String} [parameters.patientId]
         */
        navigateToPatientDetail: function( parameters ) {
            parameters = parameters || {};
            var
                self = this,
                router = self.get( 'router' ),
                updatePatientConfig = parameters.updatePatientConfig,
                patientId;

            if( updatePatientConfig ) {
                patientId = updatePatientConfig.data._id;
                self.set( 'updatePatientConfig', updatePatientConfig );
            } else {
                patientId = parameters.patientId = parameters.patientId || self.getCurrentPatientId();
            }

            router.save( '/patient/' + patientId + '/tab/patient_detail' );

        },
        /**
         * @method navigateToPatientCostCarriers
         * @param {Object} [parameters]
         * @param {String} [parameters.patientId]
         */
        navigateToPatientCostCarriers: function( parameters ) {
            parameters = parameters || {};
            var
                self = this,
                router = self.get( 'router' ),
                patientId;

            patientId = parameters.patientId = parameters.patientId || self.getCurrentPatientId();

            router.save( '/patient/' + patientId + '/section/insurance' );

        },
        /**
         * @method navigateToNewPatient
         * @param {Object} [parameters]
         * @param {Object} [parameters.newPatientConfig]
         */
        navigateToNewPatient: function( parameters ) {
            parameters = parameters || {};
            var
                self = this,
                router = self.get( 'router' );

            self
                .isNavigateToNewPatientAllowed( parameters )
                .then( function() {
                    var
                        newPatientConfig = null;

                    if( parameters.newPatientConfig ) {
                        newPatientConfig = parameters.newPatientConfig;
                    }

                    self.set( 'newPatientConfig', newPatientConfig );
                    router.save( '/patient/new/tab/patient_detail' );
                } );

        },
        /**
         * @method isNavigateToNewPatientAllowed
         * @param {Object} parameters
         * @param {Object} [parameters.data]
         * @returns {Promise}
         */
        isNavigateToNewPatientAllowed: function( /*parameters*/ ) {

            return Promise.resolve( null );
        },
        /**
         * @method navigateToActivity
         * @param {Object} [parameters]
         * @param {String} parameters.activityId
         */
        navigateToActivity: function( parameters ) {
            parameters = parameters || {};
            var
                self = this,
                router = self.get( 'router' ),

                activityId = parameters.activityId;

            router.save( '/activity/' + activityId );

        },
        /**
         * @method navigateToNewActivity
         * @param {Object} [parameters]
         * @param {String} [parameters.patientId]
         * @param {String} [parameters.type]
         * @param {Object} [parameters.newActivityConfig]
         */
        navigateToNewActivity: function( parameters ) {
            parameters = parameters || {};
            var
                self = this,
                router = self.get( 'router' ),

                patientId = parameters.patientId = parameters.patientId || self.getCurrentPatientId(),
                type = parameters.type,
                localActiveTab = type && Y.doccirrus.utils.localValueGet( type + '-ACTIVE-TAB' ),
                tableFormPostFix = '';

            if( 'tableform' === localActiveTab ) {
                tableFormPostFix = '/section/tableform';
            }

            self
                .isNavigateToNewActivityAllowed( parameters )
                .then( function() {
                    var
                        newActivityConfig = null;

                    if( parameters.newActivityConfig ) {
                        newActivityConfig = parameters.newActivityConfig;
                    }

                    self.set( 'newActivityConfig', newActivityConfig );
                    if( type ) {
                        router.save( '/activity/new/type/' + type + '/patient/' + patientId + tableFormPostFix);
                    }
                    else {
                        router.save( '/activity/new/patient/' + patientId + tableFormPostFix );
                    }
                } );

        },
        /**
         * @method isNavigateToNewActivityAllowed
         * @param {Object} parameters
         * @param {String} parameters.patientId
         * @param {String} [parameters.type]
         * @returns {Promise}
         */
        isNavigateToNewActivityAllowed: function( parameters ) {

            return new Promise( function( resolve, reject ) {
                var
                    patientId = parameters.patientId/*,
                 type = parameters.type*/;

                if( !patientId ) {
                    reject( 'no patientId' );
                    return;
                }

                resolve();

            } );
        },
        /**
         * @method navigateToCalendar
         */
        navigateToCalendar: function() {
            location.href = Y.doccirrus.utils.getUrl( 'calendar' );
        },
        /**
         * @protected
         * @method route_patientbrowser
         * @param {Object} request
         * @param {String} request.params
         * @param {Object} request.route
         * @param {Object} response
         * @param {Function} next
         * @returns {void}
         */
        route_patientbrowser: function( request/*, response, next*/ ) {
            var
                self = this;

            self.showLoadingMask();

            Promise
                .props( {
                    templateMirrorPatientBrowserViewModel: self.useTemplate( {
                        name: 'MirrorPatientBrowserViewModel',
                        path: 'MirrorPatientMojit/views/MirrorPatientBrowserViewModel'
                    } )
                } )
                .then( function() {
                    var
                        navigation = self.get( 'navigation' ),
                        activeTab = peek( navigation.activeTab ),
                        aMirrorPatientBrowserViewModel;

                    self.route( request );

                    if( TAB_PATIENT_BROWSER !== peek( activeTab && activeTab.name ) ) {

                        document.title = i18n( 'general.PAGE_TITLE.PATIENTS' );

                        aMirrorPatientBrowserViewModel = KoViewModel.getViewModel( 'MirrorPatientBrowserViewModel' );

                        if( !aMirrorPatientBrowserViewModel ) {
                            aMirrorPatientBrowserViewModel = new MirrorPatientBrowserViewModel();
                        }

                        self.currentView( aMirrorPatientBrowserViewModel );
                        self.get( 'navigation' ).activateTab( TAB_PATIENT_BROWSER );
                    }
                } )
                .then( function() {
                    self.hideLoadingMask();
                }, function( error ) {
                    self.hideLoadingMask();
                    throw error;
                } )
                .catch( catchUnhandled );
        },
        /**
         * Helper for building patient route params
         * @protected
         */
        routeResolve_patient: function( request, response, next ) {
            var
                params = request.params;

            // remap path keys
            request.params = {
                patientId: params.patient, // id
                patientTab: params.tab,
                sectionTab: params.section,
                insuranceId: params.insurance, // iid
                caseFolder: params.casefolder
            };

            if( !request.params.patientTab ) {
                request.params.patientTab = 'patient_detail';
            }

            next();
        },
        /**
         * @protected
         * @method route_patient
         * @param {Object} request
         * @param {String} request.params
         * @param {String} request.params.patientTab
         * @param {String} request.params.patientId
         * @param {String} [request.params.sectionTab]
         * @param {String} [request.params.insuranceId]
         * @param {String} [request.params.caseFolder]
         * @param {Object} request.route
         * @param {Object} response
         * @param {Function} next
         * @returns {void}
         */
        route_patient: function( request/*, response, next*/ ) {
            var
                self = this,
                parameters = request.params,
                patientTab = parameters.patientTab,
                patientId = parameters.patientId,

                isNewPatient = 'new' === patientId,

                navigation = self.get( 'navigation' ),
                activeTab = peek( navigation.activeTab );

            if( !patientId ) {
                self.navigateToRoot();
                return;
            }

            self.showLoadingMask();

            Promise
                .props( {
                    /** ensure template is available **/
                    templateCaseFileViewModelPromise: self.useTemplate( {
                        name: 'MirrorCaseFileViewModel',
                        path: 'MirrorPatientMojit/views/MirrorCaseFileViewModel'
                    } ),
                    /** ensure template is available **/
                    templatePatientDetailViewModelPromise: self.useTemplate( {
                        name: 'PatientDetailViewModel',
                        path: 'InCaseMojit/views/PatientDetailViewModel'
                    } )
                } )
                .then( function( /*props*/ ) {
                    var
                        promise,
                        updatePatientConfig = self.get( 'updatePatientConfig' );

                    self.route( request );

                    if( updatePatientConfig ) {
                        promise = self.createMirrorModelFromPatientId( patientId )
                            .then( function( model ) {
                                Y.each( updatePatientConfig, function( item, key ) {
                                    if( 'data' !== key ) {
                                        model.set( key, item );
                                    }
                                } );
                                if( Y.Lang.isObject( updatePatientConfig.data ) ) {
                                    model.updateBoilerplate( updatePatientConfig.data );
                                }
                                return model;
                            } );
                    } else if( isNewPatient ) {
                        // currently for a new patient and there is a currentPatient which is new it is assumed they are the same
                        if( unwrap( self.currentPatient ) && unwrap( self.currentPatient ).isNew() ) {
                            promise = Promise.resolve( unwrap( self.currentPatient ) );
                        }
                        else {
                            promise = Promise.resolve( new PatientModel( (self.get( 'newPatientConfig' ) || {}) ) );
                        }
                    }
                    else {
                        promise = self.getPatientModelForPatientId( patientId );
                    }

                    self.set( 'newPatientConfig', null );
                    self.set( 'updatePatientConfig', null );

                    /** set current patient **/
                    return promise
                        .then( function( model ) {
                            model.getModuleViewModelReadOnly()._makeReadOnly({
                                paths: ['*']
                            });
                            self.currentPatient( model );
                        } );

                } )
                .then( function() {
                    var
                        aCaseFileViewModel,
                        aPatientDetailViewModel;

                    switch( patientTab ) {
                        case 'casefile_browser':

                            if( TAB_CASE_FILE !== peek( activeTab && activeTab.name ) ) {

                                aCaseFileViewModel = KoViewModel.getViewModel( 'MirrorCaseFileViewModel' );

                                if( !aCaseFileViewModel ) {
                                    aCaseFileViewModel = new CaseFileViewModel();
                                    aCaseFileViewModel.addDisposable( self.currentPatient.subscribe( function() {
                                        aCaseFileViewModel.destroy();
                                    } ) );
                                }

                                self.currentView( aCaseFileViewModel );
                                self.get( 'navigation' ).activateTab( TAB_CASE_FILE );
                            }
                            break;
                        case 'patient_detail':

                            if( TAB_PATIENT_DETAIL !== peek( activeTab && activeTab.name ) ) {

                                aPatientDetailViewModel = KoViewModel.getViewModel( 'PatientDetailViewModel' );

                                if( !aPatientDetailViewModel ) {
                                    aPatientDetailViewModel = new PatientDetailViewModel();
                                    aPatientDetailViewModel.addDisposable( self.currentPatient.subscribe( function() {
                                        aPatientDetailViewModel.destroy();
                                    } ) );
                                }

                                self.currentView( aPatientDetailViewModel );
                                self.get( 'navigation' ).activateTab( TAB_PATIENT_DETAIL );
                            }
                            break;
                    }

                } )
                .then( function() {
                    self.hideLoadingMask();
                }, function( error ) {
                    self.hideLoadingMask();
                    throw error;
                } )
                .catch( catchUnhandled );

        },
        /**
         * Helper for building routes available params
         * @protected
         */
        routeResolve_activity: function( request, response, next ) {
            var
                params = request.params;

            // remap path keys
            request.params = {
                activityId: params.activity,
                patientId: params.patient,
                activityType: params.type,
                sectionTab: params.section
            };

            next();
        },
        /**
         * @protected
         * @method route_patient
         * @param {Object} request
         * @param {String} request.params
         * @param {String} request.params.activityId
         * @param {String} [request.params.patientId]
         * @param {String} [request.params.activityType]
         * @param {String} [request.params.sectionTab]
         * @param {Object} request.route
         * @param {Object} response
         * @param {Function} next
         * @returns {void}
         */
        route_activity: function( request/*, response, next*/ ) {
            var
                self = this,
                parameters = request.params,
                activityId = parameters.activityId,
                patientId = parameters.patientId || self.getCurrentPatientId(),
                activityType = parameters.activityType,

                isNewActivity = 'new' === activityId,

                navigation = self.get( 'navigation' ),
                activeTab = peek( navigation.activeTab ),
                aCaseFileViewModel = KoViewModel.getViewModel( 'MirrorCaseFileViewModel' );

            if( !activityId || isNewActivity && !patientId ) {
                self.navigateToRoot();
                return;
            }

            Promise
                .props( new Promise( function( propsResolve/*, propsReject*/ ) {
                    var
                        /** common properties **/
                        props = {
                            /** ensure template is available **/
                            templateCaseFileViewModel: self.useTemplate( {
                                name: 'MirrorCaseFileViewModel',
                                path: 'MirrorPatientMojit/views/MirrorCaseFileViewModel'
                            } )
                        },
                        newActivityConfig = self.get( 'newActivityConfig' );
                    self.set( 'newActivityConfig', null );
                    /** handle dependent properties **/
                    if( isNewActivity ) {
                        //  new activity will have no existing documents to load
                        props.patient = self.getPatientModelForPatientId( patientId );
                        props.activity = props.patient
                            .then( function( patient ) {
                                var
                                    patientData = patient.toJSON(),
                                    caseFolderActive = patient.caseFolderCollection.getActiveTab(),
                                    caseFolderId = caseFolderActive && caseFolderActive._id || undefined;

                                if( !caseFolderId ) {
                                    caseFolderActive = patient.caseFolderCollection.getTabById( patientData.activeCaseFolderId );
                                }

                                return Y.doccirrus.api.mirroractivity
                                    .createActivity( {
                                        patient: patientData,
                                        caseFolder: caseFolderActive,
                                        activity: (function() {
                                            var
                                                activity = {};

                                            if( activityType ) {
                                                activity.actType = activityType;
                                            }
                                            return activity;
                                        })()
                                    } ).then( function( activity ) {
                                        var
                                            activityData = {
                                                activity: Y.merge( activity, newActivityConfig ),
                                                additionalActivityData: {
                                                    caseFolder: caseFolderActive
                                                }
                                            };
                                        return activityData;
                                    } );
                            } )
                            .then( function( activityData ) {
                                return self.getActivityModelOf( activityData );
                            } )
                            .catch( catchUnhandled );
                    }
                    else {
                        // not a new activity
                        props.activity = self.getActivityModelOf( activityId ).catch( catchUnhandled );

                        // handle not given patient id (read from activity)
                        if( !patientId ) {
                            props.patient = props.activity
                                .then( function( activityModel ) {
                                    return self.getPatientModelForPatientId( peek( activityModel.patientId ) );
                                } )
                                .catch( catchUnhandled );
                        }
                        else {
                            props.patient = self.getPatientModelForPatientId( patientId );
                        }

                    }

                    propsResolve( props );

                } ) )
                /**
                 * Checks is there Schein
                 */
                .then( function( props ) {

                    var
                        activity = props.activity,
                        actType = peek( activity.actType ),
                        lastSchein = activity.get( 'lastSchein' ),
                        isNew = activity.isNew(),
                        isScheinActType = Y.doccirrus.schemas.activity.isScheinActType( actType ),
                        activityDate = moment( peek( activity.timestamp ) ),
                        caseFolderActive = activity.get( 'caseFolder' ),
                        caseFolderType = caseFolderActive && caseFolderActive.type,
                        message = 'PUBLIC' === caseFolderType ? NO_SCHEIN_IN_QUARTER : (NO_SCHEIN + '<br/><br/>' + NO_SCHEIN_EXPLANATION );
                    if( isNew && !isScheinActType && actType && 'QUOTATION' !== actType && !caseFolderActive.additionalType && !Y.doccirrus.DCWindowManager.getById('checkQuarterHasSchein') ) {
                        if( lastSchein && ( 'VALID' === lastSchein.status || 'APPROVED' === lastSchein.status ) ) {
                            if( 'PUBLIC' !== caseFolderType ) {
                                return props;
                            }
                            if( moment( lastSchein.timestamp ).isBetween( activityDate.startOf( 'quarter' ).toISOString(), activityDate.endOf( 'quarter' ).toISOString() ) ) {
                                return props;
                            }
                        }
                        Y.doccirrus.DCWindow.notice( {
                            message: message,
                            window: {
                                id: 'checkQuarterHasSchein',
                                width: 'medium',
                                buttons: {
                                    footer: [
                                        {
                                            isDefault: true,
                                            label: CREATE_SCHEIN,
                                            action: function() {
                                                this.close();
                                                Y.doccirrus.inCaseUtils.createActivity( {actType: 'SCHEIN'} );
                                            }
                                        }
                                    ]
                                }
                            }
                        } );
                        return props;
                    } else {
                        return props;
                    }
                } )
                /** props have to provide patient, activity **/
                .then( function( props ) {
                    var
                        patient = props.patient,
                        activity = props.activity,
                        activitiesTable = aCaseFileViewModel && aCaseFileViewModel.activitiesTable,
                        currentActivity = peek( self.currentActivity ),
                        preLinkedActivities = self.get( 'preLinkedActivities' );
                    self.set( 'preLinkedActivities', null );
                    /** handle existing activities table **/
                    if( activitiesTable ) {
                        (function() {
                            var
                                componentColumnColumnCheckbox = activitiesTable.getComponentColumnCheckbox(),
                                componentColumnLinked = activitiesTable.getComponentColumnLinked(),
                                checked = preLinkedActivities || [].concat( componentColumnColumnCheckbox.checked() ),
                                activityActType = peek( activity.actType ),
                                linkableTypes = Y.doccirrus.schemas.activity.linkAllowedFor( activityActType );
                            componentColumnColumnCheckbox.uncheckAll();

                            if( !currentActivity || currentActivity !== activity ) {
                                componentColumnLinked.removeLinks();
                            }

                            /** link appropriate checked for a new activity **/
                            if( isNewActivity && Y.Lang.isFunction( activity._linkActivity ) ) {
                                checked.forEach( function( item ) {
                                    if( -1 !== linkableTypes.indexOf( item.actType ) ) {
                                        activity._linkActivity( item );
                                    }
                                } );
                            }

                        })();
                    }

                    activity.getModuleViewModelReadOnly()._makeReadOnly( {
                        paths: ['*']
                    } );

                    self.route( request );
                    self.currentPatient( patient );
                    self.currentActivity( activity );

                    if( TAB_CASE_FILE !== peek( activeTab && activeTab.name ) ) {

                        if( !aCaseFileViewModel ) {
                            aCaseFileViewModel = new CaseFileViewModel();
                            aCaseFileViewModel.addDisposable( self.currentPatient.subscribe( function() {
                                aCaseFileViewModel.destroy();
                            } ) );
                        }

                        self.currentView( aCaseFileViewModel );
                        self.get( 'navigation' ).activateTab( TAB_CASE_FILE );
                    }

                } )
                .then( function() {
                    self.hideLoadingMask();
                }, function( error ) {
                    self.hideLoadingMask();
                    throw error;
                } )
                .catch( catchUnhandled );
        },
        /** @protected */
        route_reports: function( /*request, response, next*/ ) {
            //var
            //    self = this;
            //
            //self.showLoadingMask();
            //
            //Promise
            //    .props( {
            //        templateReportsViewModel: self.useTemplate( {
            //            name: 'ReportsViewModel',
            //            path: 'InCaseMojit/views/ReportsViewModel'
            //        } )
            //    } )
            //    .then( function() {
            //        var
            //            navigation = self.get( 'navigation' ),
            //            activeTab = peek( navigation.activeTab ),
            //            aReportsViewModel;
            //
            //        self.route( request );
            //
            //        if( TAB_REPORTS !== peek( activeTab && activeTab.name ) ) {
            //
            //            aReportsViewModel = KoViewModel.getViewModel( 'ReportsViewModel' );
            //
            //            if( !aReportsViewModel ) {
            //                aReportsViewModel = new ReportsViewModel();
            //            }
            //
            //            self.currentView( aReportsViewModel );
            //            self.get( 'navigation' ).activateTab( TAB_REPORTS );
            //        }
            //    } )
            //    .then( function() {
            //        self.hideLoadingMask();
            //    }, function( error ) {
            //        self.hideLoadingMask();
            //        throw error;
            //    } )
            //    .catch( catchUnhandled );
            //
        },
        /** @protected */
        route_withoutcardread: function( request/*, response, next*/ ) {
            var
                self = this;

            self.showLoadingMask();

            Promise
                .props( {
                    templateWithoutCardReadViewModel: self.useTemplate( {
                        name: 'WithoutCardReadViewModel',
                        path: 'InCaseMojit/views/WithoutCardReadViewModel'
                    } )
                } )
                .then( function() {
                    var
                        navigation = self.get( 'navigation' ),
                        activeTab = peek( navigation.activeTab ),
                        aWithoutCardReadViewModel;

                    self.route( request );

                    if( TAB_WITHOUT_CARDREAD !== peek( activeTab && activeTab.name ) ) {

                        aWithoutCardReadViewModel = KoViewModel.getViewModel( 'WithoutCardReadViewModel' );

                        if( !aWithoutCardReadViewModel ) {
                            aWithoutCardReadViewModel = new WithoutCardReadViewModel();
                        }

                        self.currentView( aWithoutCardReadViewModel );
                        self.get( 'navigation' ).activateTab( TAB_WITHOUT_CARDREAD );
                    }
                } )
                .then( function() {
                    self.hideLoadingMask();
                }, function( error ) {
                    self.hideLoadingMask();
                    throw error;
                } )
                .catch( catchUnhandled );
        },
        /** @protected */
        route_apkinprogress: function( request/*, response, next*/ ) {
            var
                self = this;

            self.showLoadingMask();

            Promise
                .props( {
                    templateApkInProgressViewModel: self.useTemplate( {
                        name: 'ApkInProgressViewModel',
                        path: 'InCaseMojit/views/ApkInProgressViewModel'
                    } )
                } )
                .then( function() {
                    var
                        navigation = self.get( 'navigation' ),
                        activeTab = peek( navigation.activeTab ),
                        aApkInProgressViewModel;

                    self.route( request );

                    if( TAB_APK !== peek( activeTab && activeTab.name ) ) {

                        aApkInProgressViewModel = KoViewModel.getViewModel( 'ApkInProgressViewModel' );

                        if( !aApkInProgressViewModel ) {
                            aApkInProgressViewModel = new ApkInProgressViewModel();
                        }

                        self.currentView( aApkInProgressViewModel );
                        self.get( 'navigation' ).activateTab( TAB_APK );
                    }
                } )
                .then( function() {
                    self.hideLoadingMask();
                }, function( error ) {
                    self.hideLoadingMask();
                    throw error;
                } )
                .catch( catchUnhandled );

        }
    }, {
        ATTR: {
            /**
             * Config options to pre-set for a new patient that is created via routing.
             *
             * In case of an object, it is the same as for the patients constructor.
             * @attribute newPatientConfig
             * @type {null|Object}
             * @default null
             */
            newPatientConfig: {
                value: null
            },
            /**
             * Config options to pre-set for a new activity that is created via routing.
             *
             * In case of an object, it is the same as for the constructor of activity.
             * @attribute newActivityConfig
             * @type {null|Object}
             * @default null
             */
            newActivityConfig: {
                value: null
            },
            /**
             * Config options to pre-set linked activities.
             *
             * @attribute preLinkedActivities
             * @type {null|Array}
             * @default null
             */
            preLinkedActivities: {
                value: null
            },
            /**
             * Config options that holds the raw data of an existing patient.
             * At the moment this is used when navigating to patient detail after successful cardread.
             *
             * @attribute updatePatientConfig
             * @type {null|Object}
             * @default null
             */
            updatePatientConfig: {
                value: null
            }
        }
    } );

    /**
     * @event activityTransitioned
     * @description Fires when an activity has been transitioned.
     * @param {KoViewModel} model currentActivity
     * @param {Object} data received data
     * @param {Object} transitionDescription used transition description
     * @type Event.Custom
     */
    Y.publish( 'activityTransitioned', {preventable: false} );
    /**
     * @event activityCopied
     * @description Fires when an activity has been copied.
     * @param {Object} data received data
     * @type Event.Custom
     */
    Y.publish( 'activityCopied', {preventable: false} );

    Y.namespace( 'mojito.binders' )[NAME] = new MirrorPatientMojitBinder( {
        binderName: NAME,
        initialData: {
            readOnly: true,
            incaseconfiguration: Y.doccirrus.jsonrpc.api.incaseconfiguration
                .readConfig()
                .then( function( response ) {
                    return Y.Lang.isObject( response.data ) && response.data || {};
                } ),
            activitySettings: Y.doccirrus.jsonrpc.api.activitysettings
                .read( {query: {_id: Y.doccirrus.schemas.activitysettings.getId()}} )
                .then( function( response ) {
                    return Y.Lang.isArray( response.data ) && response.data[0] && Y.Lang.isArray( response.data[0].settings ) && response.data[0].settings || [];
                } ),
            activitysettingsuser: Y.doccirrus.jsonrpc.api.activitysettingsuser
                .read( {query: {userId: Y.doccirrus.auth.getUserId()}} )
                .then( function( response ) {
                    return Y.Lang.isArray( response.data ) && response.data[0] || {};
                } ),
            invoiceconfiguration: Y.doccirrus.jsonrpc.api.invoiceconfiguration
                .read()
                .then( function( response ) {
                    return Y.Lang.isArray( response.data ) && response.data[0] || {};
                } ),
            location: Y.doccirrus.jsonrpc.api.mirrorlocation
                .read()
                .then( function( response ) {
                    return Y.Lang.isArray( response.data ) && response.data || [];
                } ),
            severityMap: Y.doccirrus.jsonrpc.api.severity
                .read()
                .then( function( response ) {
                    var
                        results = Y.Lang.isArray( response.data ) && response.data || [],
                        result = {};

                    results.forEach( function( item ) {
                        result[item.severity] = item;
                    } );

                    return result;
                } ),
            currentUser: Y.doccirrus.jsonrpc.api.employee
                .getIdentityForUsername( {username: Y.doccirrus.auth.getUserId()} )
                .then( function( response ) {
                    return Y.Lang.isObject( response.data ) && response.data || {};
                } ),
            catalogDescriptors: Y.doccirrus.jsonrpc.api.catalog
                .getCatalogDescriptorsByActType()
                .then( function( response ) {
                    return response.data;
                } )
                .then( function( data ) {
                    Y.doccirrus.catalogmap.init( data );
                } ),
            vatList: Y.doccirrus.jsonrpc.api.InCaseMojit
                .getVatList()
                .then( function( response ) {
                    return response.data;
                } )
                .then( function( data ) {
                    Y.doccirrus.vat.init( data );
                } ),
            printerList: new Promise( function( resolve ) {
                Y.doccirrus.jsonrpc.api.printer
                    .getPrinter()
                    .done( function( response ) {
                        resolve( response );
                    } )
                    .fail( function( error ) {
                        Y.log( 'getPrinter. Can not get printers. Error: ' + JSON.stringify( error ), 'debug', NAME );
                        resolve();
                    } );
            } ).then( function( response ) {
                Y.dcforms.setPrinterList( response && response.data );
                return response && response.data;
            } )
        }
    } );

}, '0.0.1', {
    requires: [
        'oop',
        'mojito-client',

        'doccirrus',
        'promise',
        'DCBinder',
        'DCRouter',
        'KoViewModel',

        'JsonRpcReflection-doccirrus',
        'JsonRpc',

        'NavBarHeader',

        'dcauth',
        'dcutils',
        'dccatalogmap',
        'dcmedia',
        'dcforms-utils',

        'activitysettings-schema',
        'activity-schema',
        'activity-api',

        'PatientModel',
        'ActivityModels',
        'dcvat',
        'DocumentModel',

        'MirrorCaseFileViewModel',
        'MirrorPatientBrowserViewModel',
        'PatientDetailViewModel',
        'ApkInProgressViewModel',
        'WithoutCardReadViewModel'
    ]
} );
