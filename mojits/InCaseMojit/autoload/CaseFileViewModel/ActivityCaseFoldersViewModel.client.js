/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, _ */
YUI.add( 'ActivityCaseFoldersViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        DOCUMENTING_FOR_FILTER= i18n( 'InCaseMojit.casefile_browser.placeholder.DOCUMENTING_FOR_FILTER' ),
        unwrap = ko.unwrap,
        ignoreDependencies = ko.ignoreDependencies,
        peek = ko.utils.peekObservable,

        KoComponentManager = Y.doccirrus.KoUI.KoComponentManager,
        KoViewModel = Y.doccirrus.KoViewModel;

    /**
     * @constructor
     * @class ActivityCaseFoldersViewModel
     */
    function ActivityCaseFoldersViewModel() {
        ActivityCaseFoldersViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ActivityCaseFoldersViewModel, KoViewModel.getDisposable(), {
        /** @protected */
        initializer: function() {
            var
                self = this; //,
                //binder = self.get( 'binder' );

            self.initActivityCaseFoldersViewModel();


            /*
            //TODO: replace with an ordinary tooltip
            function checkPopover() {
                if ( !binder || !binder.navigation || 'tab_caseFile' !== binder.navigation.activeTab().name() ) {
                    Y.log( 'ActivityCaseFoldersViewModel KILLING checkPopover', 'info', NAME );
                    return;
                }

                if ( document.querySelectorAll('[data-toggle="popover"]').length > 0 ) {
                    $('[data-toggle="popover"]').popover();
                } else {
                    self.popoverTimer = setTimeout(checkPopover, 1000);
                }
            }
            self.popoverTimer = setTimeout(checkPopover, 1000);
            */
        },
        /** @protected */
        destructor: function() {
            var
                self = this;

            /*
            if ( self.popoverTimer ) {
                clearTimeout( self.popoverTimer );
            }
            */

            if( self.caseStatsUpdatedHandler ) {
                self.caseStatsUpdatedHandler.removeEventListener();
                self.caseStatsUpdatedHandler = null;
            }
        },
        initActivityCaseFoldersViewModel: function() {
            var
                self = this;

            self.initCaseFolderNav();
            self.initDoctorSelect();
            self.initObservables();

            self.isRendered = self.addDisposable( ko.observable(false) );
            self.isPinned = self.addDisposable( ko.observable(null) );
            this.manageContainerClasses = self.addDisposable( ko.computed(function () {
                var
                    isPinned = unwrap( this.isPinned );

                return isPinned ? 'affix-enabled' : 'affix-disabled';
            }, this));
        },
        caseFolderNav: null,
        doctorSelect2Config: null,
        initCaseFolderNav: function() {
            var
                self = this;

            self.caseFolderNav = KoComponentManager.createComponent( {
                componentType: 'KoNav',
                componentConfig: {}
            } );
        },
        templateReady: function () {
            var
                localValuePatientShortInfo = JSON.parse(Y.doccirrus.utils.localValueGet( 'widget_case_folders' ) || '{}'),
                isInitiallyPinned = _.get(localValuePatientShortInfo, 'pinned');

            this.isRendered(true);

            this.isPinned.subscribe( function( newValue ) {
                localValuePatientShortInfo = JSON.parse(Y.doccirrus.utils.localValueGet( 'widget_case_folders' ) || '{}');

                localValuePatientShortInfo.pinned = newValue;

                Y.doccirrus.utils.localValueSet( 'widget_case_folders',  localValuePatientShortInfo);
            });

            if ('undefined' !== typeof isInitiallyPinned ) {
                this.isPinned(isInitiallyPinned);
            } else {
                this.isPinned(false);
            }

            this.getPinClasses = this.addDisposable( ko.computed(function () {
                var isPinned = unwrap( this.isPinned );

                return isPinned ? 'pin-pinned' : 'pin-unpinned';
            }, this));
        },
        onPinClick: function () {
            this.isPinned( !peek( this.isPinned ) );
        },
        /**
         * MOJ-10029: None doctors can select doctor/location to use in newly created activities.
         */
        initDoctorSelect: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                locations = binder.getInitialData( 'location' ) || [],
                currentUser = binder.getInitialData( 'currentUser' ),
                currentUserLocationIds = currentUser.locations.map( function( location ) {
                    return location._id;
                } ),
                data = [],
                localValueKey = 'incase-selected-doctor',
                localValueFilterKey = 'incase-selected-doctor-filter',
                localValue = Y.doccirrus.utils.localValueGet( localValueKey ),
                localValueFilter = Y.doccirrus.utils.localValueGet( localValueFilterKey ),
                selected = ko.observable( localValue );

            locations.filter( function( location ) {
                return -1 !== currentUserLocationIds.indexOf( location._id );
            } ).forEach( function( location ) {
                var locname = location.locname,
                    locId = location._id;
                location.employees.filter( function( employee ) {
                    return 'PHYSICIAN' === employee.type && 'ACTIVE' === employee.status;
                } ).forEach( function( employee ) {
                    data.push( {
                        id: [employee._id, '-', locId].join( '' ),
                        text: [employee.lastname, ', ', employee.firstname, ' (', locname, ')'].join( '' )
                    } );
                } );
            } );

            data.sort( function( a, b ) {
                return a.text.toLocaleLowerCase().localeCompare(b.text.toLocaleLowerCase());
            } );

            self.doctorSelect2Config = {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        Y.doccirrus.utils.localValueSet( localValueKey, unwrap( selected ) || '' );
                        return unwrap( selected );
                    },
                    write: function( $event ) {
                        selected( $event.val );
                    }
                } ) ),
                select2: {
                    allowClear: true,
                    width: '100%',
                    placeholder: i18n( 'InCaseMojit.casefile_browser.placeholder.DOCUMENTING_FOR' ),
                    minimumInputLength: 0,
                    data: data
                }
            };

            self.documentingForFilterI18n = DOCUMENTING_FOR_FILTER;

            self.doctorSelectFilterList = [
                {val: 'DOCTOR'},
                {val: 'LOCATION'},
                {val: 'BOTH'}
            ].map( function( entry ) {
                entry.i18n = i18n( 'InCaseMojit.casefile_browser.documentingForFilterList.' + entry.val );
                return entry;
            } );

            self.doctorSelectFilterValue = ko.observable( localValueFilter );

            self.showDoctorSelectFilter = ko.computed( function() {
                var doctorSelectValue = self.doctorSelect2Config.val(),
                    doctorSelectValueParts = doctorSelectValue && doctorSelectValue.split( '-' );
                return doctorSelectValueParts && doctorSelectValueParts[0] && doctorSelectValueParts[1];
            } );

            self.caseFileDoctorSelectFilter = ko.computed( function() {
                var doctorSelectFilterValue = self.doctorSelectFilterValue(),
                    doctorSelectValue = self.doctorSelect2Config.val(),
                    doctorSelectValueParts = doctorSelectValue && doctorSelectValue.split( '-' ),
                    employeeId = doctorSelectValueParts && doctorSelectValueParts[0],
                    locationId = doctorSelectValueParts && doctorSelectValueParts[1],
                    filterResult = null;

                Y.doccirrus.utils.localValueSet( localValueFilterKey, doctorSelectFilterValue || '' );

                switch( doctorSelectFilterValue ) {
                    case 'DOCTOR':
                        filterResult = employeeId && {employeeId: employeeId};
                        break;
                    case 'LOCATION':
                        filterResult = locationId && {locationId: locationId};
                        break;
                    case 'BOTH':
                        filterResult = locationId && employeeId && {employeeId: employeeId, locationId: locationId};
                        break;
                }

                return filterResult;
            } );

        },
        /**
         * Update badge from socket handler
         */
        caseStatsUpdatedHandler: null,
        initObservables: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = unwrap( self.get( 'currentPatient' ) ),
                caseFolderNav = self.caseFolderNav;

            /**
             * Syncs case folders with nav items
             */
            self.addDisposable( ko.computed( function() {
                var
                    caseFolders = currentPatient && unwrap( currentPatient.caseFolderCollection.items ),
                    patientId = currentPatient && unwrap( currentPatient._id ),
                    navUrl;

                if( !currentPatient ) {
                    return;
                }

                ignoreDependencies( function() {
                    self.caseFolderNav.items.removeAll();

                    navUrl = '#/patient/'+patientId+'/tab/casefile_browser/casefolder/';

                    caseFolders = [{_id: undefined, title: i18n( 'InCaseMojit.casefile_browser.label.ALL_CASES' ) }].concat( caseFolders );
                    self.caseFolderNav.addItems( caseFolders.map( function( folder ) {
                        var
                            postfix = folder._id || 'all',
                            config = {
                                name: 'caseFolder-' + postfix,
                                html: Y.doccirrus.schemas.casefolder.renderCasefolderName( folder, true ),
                                href: navUrl + postfix,
                                caseFolderId: folder._id,
                                icon: folder.disabled ? 'LOCK' : undefined,
                                iconName: '',
                                onBadgeClick: function( me, event ) {
                                    event.stopPropagation();
                                    Y.doccirrus.modals.invoiceErrorLogCaseFolderModal.show( folder.patientId, folder._id, folder.sumexErrors );
                                }
                            },
                            sumexErrors =  (folder.sumexErrors || []).length; //In not Swiss mode will be 0

                        if( 0 < folder.ruleActivities ) {
                            config = Y.merge( config, {
                                badge: sumexErrors + folder.ruleErrors + '/' + folder.ruleWarnings + '/' + folder.ruleActivities,
                                badgeTitle: i18n( 'InCaseMojit.casefile_browser.tooltips.ruleWarningsAndErrorsAndActivities', {
                                    data: {
                                        errors: sumexErrors + folder.ruleErrors,
                                        warnings: folder.ruleWarnings,
                                        activities: folder.ruleActivities
                                    }
                                } )
                            } );
                        } else if( 0 < folder.ruleWarnings || 0 < folder.ruleErrors || 0 < sumexErrors) {
                            config = Y.merge( config, {
                                badge: sumexErrors + folder.ruleErrors + '/' + folder.ruleWarnings,
                                badgeTitle: i18n( 'InCaseMojit.casefile_browser.tooltips.ruleWarningsAndErrors', {
                                    data: {
                                        errors: sumexErrors + folder.ruleErrors,
                                        warnings: folder.ruleWarnings
                                    }
                                } )
                            } );
                        } else {
                            config = Y.merge( config, {
                                badge: '',
                                badgeTitle: ''
                            } );
                        }

                        if( 'PREPARED' === folder.type ) {
                            config.css = {
                                'right-item': true
                            };
                        }

                        return config;
                    } ) );
                } );

            } ) );

            /** Update badge from socket **/
            self.caseStatsUpdatedHandler = Y.doccirrus.communication.on( {
                event: 'caseStatsUpdated',
                handlerId: 'caseStatsUpdated.ActivityCaseFoldersViewModel',
                done: function( message ) {
                    var
                        folder = message && message.data && message.data[0] && message.data[0].caseFolder,
                        tab;

                    if( Y.Lang.isObject( folder ) && folder._id ) {
                        tab = self.caseFolderNav.getItemByName( 'caseFolder-' + folder._id );
                        if( tab ) {
                            // get last state of casefolder
                            Y.doccirrus.jsonrpc.api.casefolder.read( {
                                noBlocking: true,
                                query: {
                                    _id: folder._id
                                }
                            }).done(function( res ) {
                                var data = res && res.data && res.data[0],
                                    sumexErrors;

                                //  caseFolder is removed
                                if( !data ) { return; }
                                sumexErrors = (data.sumexErrors || []).length;  //In not Swiss mode will be 0

                                //  race between navigating away and the JSONRPC
                                if ( !tab || 'function' !== typeof tab.badge ) { return; }

                                if( 0 < data.ruleActivities ) {
                                    tab.badge(''+(sumexErrors + data.ruleErrors)+'/'+data.ruleWarnings+'/'+data.ruleActivities);
                                    tab.badgeTitle( i18n( 'InCaseMojit.casefile_browser.tooltips.ruleWarningsAndErrorsAndActivities', {
                                        data: {
                                            errors: sumexErrors + data.ruleErrors,
                                            warnings: data.ruleWarnings,
                                            activities: data.ruleActivities
                                        }
                                    } ) );
                                } else if( 0 < data.ruleWarnings || 0 < data.ruleErrors || 0 < sumexErrors) {
                                    tab.badge(''+(sumexErrors + data.ruleErrors)+'/'+data.ruleWarnings );
                                    tab.badgeTitle( i18n( 'InCaseMojit.casefile_browser.tooltips.ruleWarningsAndErrors', {
                                        data: {
                                            errors: sumexErrors + data.ruleErrors,
                                            warnings: data.ruleWarnings
                                        }
                                    } ) );
                                } else {
                                    tab.badge( '' );
                                    tab.badgeTitle( '' );
                                }
                            });
                        }
                    }
                }
            } );

            /**
             * Sync nav active tab with active case folder id
             */
            self.addDisposable( ko.computed( function() {
                var tab = unwrap( caseFolderNav.activeTab ),
                    isInitial = ko.computedContext.isInitial();

                if( isInitial ) {
                    return;
                }

                if( null !== tab ) {
                    currentPatient.caseFolderCollection.activeCaseFolderId( tab.caseFolderId );
                }

            } ) );

            /**
             * Propagate active case folder id to patient
             * ( That there are problems with is known )
             */
            self.addDisposable( ko.computed( function() {
                var
                    activeCaseFolderId = unwrap( currentPatient.caseFolderCollection.activeCaseFolderId ),
                    isInitial = ko.computedContext.isInitial();

                if( isInitial ) {
                    return;
                }

                if( activeCaseFolderId ) { // prevent if false, because server throws error
                    binder.casefolderApiFn
                        .setActiveTab( {
                            caseFolderId: activeCaseFolderId,
                            patientId: peek( currentPatient._id )
                        } )
                        .done( function() {
                            currentPatient.activeCaseFolderId( activeCaseFolderId );
                        } );
                }

            } ) );

            /**
             * Determine from various parameters which nav tab should be active
             */
            self.addDisposable( ko.computed( function() {
                unwrap( caseFolderNav.items );
                var
                    patientCaseFolderId = currentPatient && unwrap( currentPatient.activeCaseFolderId ),

                    currentActivity = unwrap( binder.currentActivity ),
                    activityCaseFolderId = currentActivity && unwrap( currentActivity.caseFolderId ),

                    route = unwrap( binder.route ),
                    routeCaseFolderId = route && route.params.caseFolder,

                    caseFolderId = 'all',
                    tab;

                ignoreDependencies( function() {

                    if( !currentActivity ) {
                        if( routeCaseFolderId ) {
                            caseFolderId = routeCaseFolderId;
                        }
                        else if( patientCaseFolderId ) {
                            caseFolderId = patientCaseFolderId;
                        }
                    }
                    else {
                        if( activityCaseFolderId ) {
                            caseFolderId = activityCaseFolderId;
                        }
                        else if( routeCaseFolderId ) {
                            caseFolderId = routeCaseFolderId;
                        }
                    }

                    tab = caseFolderNav.getItemByName( 'caseFolder-'+caseFolderId );

                    if( !tab ) {
                        tab = caseFolderNav.getItemByName( 'caseFolder-all' );
                    }

                    if( tab ) {
                        tab.active( true );
                    }
                } );

            } ).extend( {rateLimit: 0} ) );

        }

    }, {
        NAME: 'ActivityCaseFoldersViewModel',
        ATTRS: {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InCaseMojit' ) || Y.doccirrus.utils.getMojitBinderByType( 'MirrorPatientMojit' );
                }
            },
            currentPatient: {
                valueFn: function() {
                    return this.get( 'binder' ).currentPatient;
                },
                lazyAdd: false
            }
        }
    } );

    KoViewModel.registerConstructor( ActivityCaseFoldersViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'dcutils',
        'casefolder-schema',
        'dcruleloggmodal',
        'dcinvoiceerrorlogcasefoldermodal'
    ]
} );
