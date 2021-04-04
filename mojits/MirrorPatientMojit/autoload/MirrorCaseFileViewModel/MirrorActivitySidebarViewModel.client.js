/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, jQuery */
YUI.add( 'MirrorActivitySidebarViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap,
        ignoreDependencies = ko.ignoreDependencies,
        KoViewModel = Y.doccirrus.KoViewModel;

    /**
     * @constructor
     * @class KrwStatusViewModel
     */
    function KrwStatusViewModel() {
        KrwStatusViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( KrwStatusViewModel, KoViewModel.getDisposable(), {
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initKrwStatusViewModel();
        },
        /** @protected */
        destructor: function() {
        },

        initKrwStatusViewModel: function() {
            var
                self = this;

            self._krwValidationStatus = ko.observable( Y.doccirrus.utils.localValueGet( 'krwvalidationfilter' ) || 'ALL' );

            self.addDisposable( self._krwValidationStatus.subscribe( function( val ) {
                Y.doccirrus.utils.localValueSet( 'krwvalidationfilter', val );
            } ) );

            self._krwValidationStatusList = [
                {
                    value: 'ALL',
                    '-de': 'Alle Meldungen',
                    '-en': 'All Notifications'
                },
                {
                    value: 'ERRORS',
                    '-de': 'Nur Fehler',
                    '-en': 'Only Errors'
                }
            ];

        }

    } );

    /**
     * @constructor
     * @class MirrorActivitySidebarViewModel
     */
    function MirrorActivitySidebarViewModel() {
        MirrorActivitySidebarViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( MirrorActivitySidebarViewModel, KoViewModel.getDisposable(), {
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initMirrorActivitySidebarViewModel();

        },
        /** @protected */
        destructor: function() {
            var
                self = this;

            self.destroyMirrorActivitySidebarViewModel();
        },
        _id: null,
        actType: null,
        timestamp: null,
        daySeparation: null,
        locationId: null,
        locationName: null,
        employeeId: null,
        employeeName: null,
        apkState: null,
        comment: null,
        initObservables: function() {
            var
                self = this,
                binder = self.get( 'binder' );

            /**
             * Mix properties from "currentActivity" - this is not really considered MVVM, but for now it saves time
             */
            Y.mix( self, binder.currentActivity(), true, [
                '_id',
                'actType',
                'timestamp',
                'daySeparation',
                'locationId',
                'employeeId',
                'employeeName',
                'apkState',
                'comment'
            ] );
        },
        initMirrorActivitySidebarViewModel: function() {
            var
                self = this;

            self.timestampI18n = i18n('InCaseMojit.casefile_detail.placeholder.TIMESTAMP');
            self.daySeparationI18n = i18n('InCaseMojit.casefile_detail.sr_only.DAY_SEPERATION');
            self.placeholderDaySeparationI18n = i18n('InCaseMojit.casefile_detail.placeholder.DAY_SEPERATION');
            self.textAreaNoteI18n = i18n('InCaseMojit.casefile_detail.textarea.NOTE');

            self.initObservables();

            self.initSelect2actType();
            self.initDaySeparation();
            self.initLocation();
            self.initEmployee();
            self.initApkState();
            self.initKrwStatusViewModel();
        },
        destroyMirrorActivitySidebarViewModel: function() {
            var
                self = this;

            self.destroyKrwStatusViewModel();
        },
        _select2actType: null,
        initSelect2actType: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                activityTypeList = binder.getInitialData( 'activityTypes' ).list,
                userLang = Y.doccirrus.comctl.getUserLang(),
                lang = '-' + userLang,
                groupI18n = {
                    'CASEHISTORY': {'-de': 'Anamnese', '-en': 'Case History'},
                    'ASSESSMENT': {'-de': 'Bewertung', '-en': 'Assessment'},
                    'THERAPY': {'-de': 'Therapie', '-en': 'Therapy'},
                    'PROCESSES': {'-de': 'Prozesse', '-en': 'Processes'},
                    'OPHTHALMOLOGY': {'-de': 'Ophthalmologie', '-en': 'Ophthalmology'}
                };

            self._actTypeList = ko.observableArray( activityTypeList );

            self._select2actType = {
                val: self.addDisposable( ko.computed( {
                    read: function() {

                        return ko.unwrap( self.actType ) || null;
                    },
                    write: function( $event ) {
                        var
                            actType = peek( self.actType ),
                            currentActivity = peek( binder.currentActivity );
                        if( !actType ) {
                            binder.set( 'preLinkedActivities', currentActivity && currentActivity.get( 'activitiesObj' ) );
                        }
                        Y.doccirrus.inCaseUtils.createActivity( {actType: $event.val} );
                    }
                } ) ),
                placeholder: ko.observable( "Typ wählen..." ),
                select2: {
                    allowClear: true,
                    data: (function() {
                        var
                            groups = {},
                            data = [];

                        self._actTypeList().forEach( function( item ) {
                            var group = item.group;
                            if( !item.visible ) {
                                return;
                            }
                            if( !(group in groups) ) {
                                groups[group] = {text: groupI18n[group][lang], children: []};
                                data.push( groups[group] );
                            }

                            groups[group].children.push( {id: item.val, text: item[lang]} );
                        } );

                        return data;
                    })()
                },
                init: function( el ) {
                    var
                        select2 = jQuery( el ).data( 'select2' ),
                        currentActivity = peek( binder.currentActivity );

                    if( select2 && currentActivity && !peek( currentActivity.actType ) ) {
                        setTimeout( function() {
                            select2.open();
                        }, 20 ); // delay for layout changes unknown for select2
                    }

                }
            };
        },
        isDaySeparationAvailable: function() {
            var
                self = this;

            return 'TREATMENT' === unwrap( self.actType );
        },
        _daySeparationInputVisible: null,
        /**
         * shows placeholder 'Tagtrennung' or 'daySeparation' value
         * @type {null|ko.computed}
         */
        _daySeparationText: null,
        _toggleDaySeparationInputVisible: null,
        initDaySeparation: function() {
            var
                self = this;

            self._daySeparationInputVisible = ko.observable( false );

            self._daySeparationText = ko.computed( function() {
                var
                    daySeparation = unwrap( self.daySeparation );

                return daySeparation || i18n( 'InCaseMojit.activity_model_clientJS.placeholder.DAY_SEPERATION' );
            } );

            self._toggleDaySeparationInputVisible = ko.computed( {
                read: function() {
                    var
                        hasError = unwrap( self.daySeparation.hasError ),
                        visible = unwrap( self._daySeparationInputVisible );

                    if( hasError ) {
                        return true;
                    }

                    return visible;

                },
                write: self._daySeparationInputVisible
            } );

        },
        _toggleDaySeparation: function() {
            var
                self = this;

            self._toggleDaySeparationInputVisible( !peek( self._toggleDaySeparationInputVisible ) );
        },
        initLocation: function () {
            var
                self = this,
                binder = self.get('binder'),
                location = [].concat(binder.getInitialData('location')),
                currentActivity = unwrap( binder.currentActivity ),
                loc;

            self.locationName = ko.observable('');

            if(currentActivity.mirrorActivityId() && currentActivity.locationName()){
                self.locationName( currentActivity.locationName() );
                return;
            }

            if (self.locationId() === '000000000000000000000001') {
                self.locationName('Hauptbetriebsstätte');
            } else {
                loc = location.filter(function (loc) {
                    return loc._id === self.locationId();
                });
                if (loc && loc.length > 0) {
                    self.locationName(loc[0].locname);
                } else {
                    Y.doccirrus.jsonrpc.api.mirrorlocation
                        .read()
                        .then(function (response) {
                            if (Y.Lang.isArray(response.data) && response.data.length > 0) {
                                self.locationName(response.data[0].locname);
                            }
                        });
                }
            }
        },
        initEmployee: function() {
            var
                self = this,
                binder = self.get('binder');

            self.addDisposable(ko.computed(function () {
                var
                    employeeName = unwrap(binder.currentActivity).get('data.employeeName');

                if ( ko.unwrap( self.employeeName ) !== employeeName && self.employeeName ) {
                    self.employeeName( employeeName );
                }

            })).extend({rateLimit: 0});
        },
        initApkState: function() {
            var
                self = this,
                binder = self.get( 'binder' );

            self._apkStateBtnText = ko.computed( function() {
                var
                    state = unwrap( self.apkState ),
                    text = '';

                switch( state ) {
                    case 'IN_PROGRESS':
                        text = i18n( 'InCaseMojit.activity_model_clientJS.button.APK_IN_PROGRESS' );
                        break;
                    case 'DOCUMENTED':
                        text = i18n( 'InCaseMojit.activity_model_clientJS.button.APK_DOCUMENTED' );
                        break;
                    case 'VALIDATED':
                        text = i18n( 'InCaseMojit.activity_model_clientJS.button.APK_VALIDATED' );
                        break;
                }

                return text;
            } );

            self._apkStateBtnCss = ko.computed( function() {
                var
                    state = unwrap( self.apkState ),
                    cssclass = '',
                    editable = binder.currentActivity()._isEditable();

                if( !editable ) {
                    cssclass = 'disabled ';
                }

                switch( state ) {
                    case 'IN_PROGRESS':
                        cssclass += 'btn-danger';
                        break;
                    case 'DOCUMENTED':
                        cssclass += 'btn-warning';
                        break;
                    case 'VALIDATED':
                        cssclass += 'btn-success';
                        break;
                }

                return cssclass;
            } );
        },
        onApkStateBtnClicked: function() {
            var
                self = this,
                state = unwrap( self.apkState ),
                canToggleAllStates = ['PHYSICIAN', 'CONTROLLER', 'ADMIN'].some( Y.doccirrus.auth.memberOf ),
                states = ['IN_PROGRESS', 'DOCUMENTED', 'VALIDATED'], currentIndex;

            if( !state ) {
                state = states[0];
            }

            currentIndex = states.indexOf( state );

            // this user is now allowed to change state back from "VALIDATED"
            if( !canToggleAllStates && currentIndex === states.length - 1 ) {
                return;
            }

            // this user can only toggle first two states
            if( !canToggleAllStates ) {
                states.pop();
            }

            self.apkState( states[currentIndex === states.length - 1 ? 0 : ++currentIndex] );
        },
        _krwValidationStatusList: null,
        initKrwStatusViewModel: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = unwrap( self.get( 'currentPatient' ) );

            self.filedAllI18n = i18n('InCaseMojit.casefile_detail.dropdown_field.ALL');
            self.fieldErrorsI18n = i18n('InCaseMojit.casefile_detail.dropdown_field.ERRORS');

            if( !self.krwStatusViewModel ) {
                self.krwStatusViewModel = ko.computed( function() {
                    var
                        currentActivity = unwrap( binder.currentActivity ),
                        actType = currentActivity && unwrap( currentActivity.actType ),
                        caseFolderId = unwrap( currentActivity.caseFolderId ),
                        applicableActType = 'DIAGNOSIS' === actType,
                        available = false,
                        lastKrwStatusViewModel,
                        invoiceconfiguration,
                        caseFolder;

                    if( applicableActType ) {
                        invoiceconfiguration = binder.getInitialData( 'invoiceconfiguration' );
                        caseFolder = currentPatient.caseFolderCollection.getTabById( caseFolderId );

                        available = invoiceconfiguration && invoiceconfiguration.kbvFocusFunctionalityKRW && caseFolder && 'PUBLIC' === caseFolder.type;
                    }

                    return ignoreDependencies( function() {

                        lastKrwStatusViewModel = peek( self.krwStatusViewModel );

                        if( available ) {
                            if( lastKrwStatusViewModel ) {
                                return lastKrwStatusViewModel;
                            }
                            return new KrwStatusViewModel();
                        }
                        else {
                            if( lastKrwStatusViewModel ) {
                                lastKrwStatusViewModel.destroy();
                            }
                            return null;
                        }
                    } );

                } );
            }

        },
        destroyKrwStatusViewModel: function() {
            var
                self = this,
                krwStatusViewModel;

            if( self.krwStatusViewModel ) {
                self.krwStatusViewModel.dispose();
                krwStatusViewModel = peek( self.krwStatusViewModel );
                if( krwStatusViewModel ) {
                    krwStatusViewModel.destroy();
                }
                self.krwStatusViewModel = null;
            }

        },
        /**
         * shows 'comment' if not empty in a notice window
         * @private
         */
        showComment: function() {
            var
                self = this,
                message = unwrap( self.comment );

            if( message ) {
                Y.use( 'DCWindow', function() {
                    Y.doccirrus.DCWindow.notice( {
                        message: message,
                        window: {width: 'medium', dragable: true, modal: false}
                    } );
                } );
            }
        },
        showActivityActtypeNeeded: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( binder.currentActivity ),
                currentActivityActType = unwrap( currentActivity.actType );

            return !currentActivityActType;
        }
    }, {
        NAME: 'MirrorActivitySidebarViewModel',
        ATTRS: {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'MirrorPatientMojit' ) || Y.doccirrus.utils.getMojitBinderByType( 'InCaseMojit' );
                }
            },
            caseFolders: {
                valueFn: function() {
                    var viewModel = KoViewModel.getViewModel( 'MirrorCaseFileViewModel' ) || KoViewModel.getViewModel( 'CaseFileViewModel' );
                    return viewModel.caseFolders;
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

    KoViewModel.registerConstructor( MirrorActivitySidebarViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'dcutils',
        'dc-comctl',
        'inCaseUtils'
    ]
} );
