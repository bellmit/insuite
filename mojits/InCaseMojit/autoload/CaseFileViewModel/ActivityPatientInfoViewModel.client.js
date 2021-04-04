/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment, _, $ */
YUI.add( 'ActivityPatientInfoViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        i18n = Y.doccirrus.i18n,
        UNKNOWN_INSURANCE = i18n( 'InCaseMojit.patient-modelJS._displayInsuranceTypes.UNKNOWN_INSURANCE' ),
        KoViewModel = Y.doccirrus.KoViewModel;

    /**
     * @constructor
     * @class ActivityPatientInfoViewModel
     */
    function ActivityPatientInfoViewModel() {
        ActivityPatientInfoViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ActivityPatientInfoViewModel, KoViewModel.getDisposable(), {
        /** @protected */
        initializer: function() {
            var
                self = this;

            self.initActivityPatientInfoViewModel();
        },
        /** @protected */
        destructor: function() {
        },
        initActivityPatientInfoViewModel: function() {
            var
                self = this;

            self.initHeader();
            self.initAttachedContentInfo();
            self.initDashboardPatient();

            self.isRendered = self.addDisposable( ko.observable( false ) );
            self.isPinned = self.addDisposable( ko.observable( null ) );
            this.manageContainerClasses = self.addDisposable( ko.computed( function() {
                var
                    isPinned = unwrap( this.isPinned );

                return isPinned ? 'affix-enabled' : 'affix-disabled';
            }, this ) );

            self.isInfoCollapsed = self.addDisposable( ko.observable( null ) );
        },
        panelTitle: null,
        hasBirthday: null,
        displayInsuranceTypes: null,
        hasPublicCard: null,
        getPublicCardColor: null,
        getPublicCardTitle: null,
        templateReady: function() {
            var
                self = this,
                localValuepatientShortInfo = JSON.parse( Y.doccirrus.utils.localValueGet( 'widget_patient_short_info' ) || '{}' ),
                isInitiallyPinned = _.get( localValuepatientShortInfo, 'pinned' );

            this.isRendered( true );

            this.isPinned.subscribe( function( newValue ) {
                localValuepatientShortInfo = JSON.parse( Y.doccirrus.utils.localValueGet( 'widget_patient_short_info' ) || '{}' );

                localValuepatientShortInfo.pinned = newValue;

                Y.doccirrus.utils.localValueSet( 'widget_patient_short_info', localValuepatientShortInfo );
            } );

            if( 'undefined' !== typeof isInitiallyPinned ) {
                this.isPinned( isInitiallyPinned );
            } else {
                this.isPinned( false );
            }

            this.getPinClasses = this.addDisposable( ko.computed( function() {
                var isPinned = unwrap( this.isPinned );

                return isPinned ? 'pin-pinned' : 'pin-unpinned';
            }, this ) );

            $( '.activityPatientInfoViewModel' ).children( '.panel-collapse' ).first().on( 'shown.bs.collapse hidden.bs.collapse', function( event ) {
                if( peek( self.isInfoCollapsed ) === null ) {
                    _.delay( function() {
                        if( event.type === 'shown' ) {
                            self.isInfoCollapsed( true );
                        } else {
                            self.isInfoCollapsed( false );
                        }
                    }, 600 );
                }
            } );
        },
        onPinClick: function() {
            this.isPinned( !peek( this.isPinned ) );
        },
        onCollapseButtonClick: function( vm, event ) {
            var
                self = this,
                $collapse = $( event.currentTarget ).parents( '.panel' ).first().children( '.panel-collapse' ).first();

            _.delay( function() {
                var hasInClass = $collapse.hasClass( 'in' );

                self.isInfoCollapsed( hasInClass );
            }, 600 );
        },
        initHeader: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient );

            self.panelTitle = ko.computed( function() {
                return Y.doccirrus.utils.getPatientTitle( currentPatient );
            } ).extend( {rateLimit: 0} );

            self.isDead = ko.computed( function() {
                return Boolean( unwrap( currentPatient.dateOfDeath ) );
            } );

            self.treatmentNeeds = ko.computed( function() {
                if( unwrap( currentPatient.treatmentNeeds ) ) {
                    return '(' + i18n( 'patient-schema.Patient_T.treatmentNeedsShort.i18n' ) + ') ';
                }
            } );

            self.hasBirthday = ko.computed( function() {
                var
                    dob = unwrap( currentPatient.dob );

                return moment( dob ).format( 'DD.MM' ) === moment().format( 'DD.MM' ) && !self.isDead();
            } );

            self.displayInsuranceTypes = ko.computed( function() {
                var
                    insuranceStatus = unwrap( currentPatient.insuranceStatus );

                if( !(Array.isArray( insuranceStatus ) && insuranceStatus.length) ) {
                    return i18n( 'InCaseMojit.patient-modelJS._displayInsuranceTypes.NOT_INSURED' );
                }
                return insuranceStatus.filter( function( insurance ) {
                    return !unwrap( insurance.doNotShowInsuranceInGadget );
                } ).map( function( entry ) {
                    var i18nType = Y.doccirrus.schemaloader.translateEnumValue( 'i18n', unwrap( entry.type ), Y.doccirrus.schemas.person.types.Insurance_E.list, i18n( 'InCaseMojit.patient-modelJS._displayInsuranceTypes.UNKNOWN_TYPE' ) );
                    if( unwrap( entry.unknownInsurance ) ) {
                        i18nType += ' <span class="text-danger">' + UNKNOWN_INSURANCE + '</span>';
                    }
                    return i18nType;
                } ).join( ', ' );
            } );

            self.hasPublicCard = ko.computed( function() {
                var insuranceStatus = unwrap( currentPatient.insuranceStatus ),
                    doNotShowPublicInsurance = insuranceStatus.some( function( insurance ) {
                        return unwrap( insurance.type ) === 'PUBLIC' && unwrap( insurance.doNotShowInsuranceInGadget );
                    } );

                // MOJ-14319: [OK] [CARDREAD]
                return unwrap( currentPatient.hasPublicInsurance ) && !doNotShowPublicInsurance;
            } );

            self.getPublicCardColor = ko.computed( function() {

                return unwrap( currentPatient.hasCardSwiped ) ? 'green' : unwrap( currentPatient.insuranceWOCard ) ? 'orange' : 'red';
            } );

            self.getPublicCardTitle = ko.computed( function() {
                var
                    CARD_PULLED_THROUGH = i18n( 'InCaseMojit.casefile_browser.title_attribute.CARD_PULLED_THROUGH' ),
                    CARD_PULLED_THROUGH_NOT = i18n( 'InCaseMojit.casefile_browser.title_attribute.CARD_PULLED_THROUGH_NOT' ),
                    CARD_NA = i18n( 'InCaseMojit.casefile_browser.title_attribute.CARD_NA' );

                return unwrap( currentPatient.hasCardSwiped ) ? CARD_PULLED_THROUGH : unwrap( currentPatient.insuranceWOCard ) ? CARD_NA : CARD_PULLED_THROUGH_NOT;
            } );

            self.processCardStatus = ko.computed( function() {
                return !unwrap( currentPatient.hasCardSwiped );
            } );

            self.setOrange = function() {
                var _id = peek( currentPatient._id ),
                    currentDate = new Date(),
                    currentState = unwrap( currentPatient.insuranceWOCard );
                if( !_id ) {
                    return;
                }

                Y.doccirrus.DCWindow.confirm( {
                    type: 'warn',
                    icon: Y.doccirrus.DCWindow.ICON_QUESTION,
                    title: i18n( 'DCWindow.notice.title.info' ),
                    message: i18n( 'InCaseMojit.casefile_browser.cardStatus.' + (currentState ? 'text_o2r' : 'text_r2o') ),
                    buttonOkConfig: {
                        label: i18n( 'person-schema.Insurance_search.YES' )
                    },
                    buttonCancelConfig: {
                        label: i18n( 'person-schema.Insurance_search.NO' )
                    },
                    callback: function( confirm ) {
                        if( confirm.success ) {
                            Y.doccirrus.DCWindow.confirm( {
                                message: i18n( 'general.message.ARE_YOU_SURE' ),
                                callback: function( confirm ) {
                                    if( confirm.success ) {
                                        Y.doccirrus.jsonrpc.api.patient.update( {
                                            query: {
                                                _id: _id
                                            },
                                            data: {
                                                insuranceWOCard: currentState ? null : currentDate
                                            },
                                            fields: ['insuranceWOCard']
                                        } ).then( function() {
                                            currentPatient.insuranceWOCard( currentState ? null : currentDate );
                                        } );
                                    }
                                }
                            } );
                        }
                    }
                } );
            };

        },
        attachedContentText: null,
        attachedContentColor: null,
        showAttachedContentHeader: null,
        initAttachedContentInfo: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                severityMap = binder.getInitialData( 'severityMap' ),
                currentPatient = peek( binder.currentPatient );

            self.attachedContentText = ko.computed( function() {

                return unwrap( currentPatient.attachedContent );
            } );
            self.attachedContentColor = ko.computed( function() {
                var
                    severity = unwrap( currentPatient.attachedSeverity ),
                    color = '';
                if( severity && severityMap ) {
                    color = severityMap[severity] && severityMap[severity].color || color;
                }
                return color;
            } );

            self.showAttachedContentHeader = ko.computed( function() {
                var
                    attachedContent = unwrap( self.attachedContentText );

                return attachedContent && 100 > attachedContent.length;
            } );

        },
        detachActivity: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = unwrap( binder.currentPatient );
            currentPatient.detachActivity();
        },
        dashboardPatient: null,
        initDashboardPatient: function() {
            var
                self = this;

            self.dashboardPatient = ko.observable( null );

            self.dashboardPatientConfig = {
                environment: 'activityPatientInfo',
                onInitialized: function( componentInstance ) {
                    self.dashboardPatient( componentInstance );
                },
                onDestroyed: function( /*componentInstance*/ ) {
                    self.dashboardPatient( null );
                }
            };

        }
    }, {
        NAME: 'ActivityPatientInfoViewModel',
        ATTRS: {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InCaseMojit' ) || Y.doccirrus.utils.getMojitBinderByType( 'MirrorPatientMojit' );
                }
            }
        }
    } );

    KoViewModel.registerConstructor( ActivityPatientInfoViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'dcutils',
        'person-schema',

        'Gadgets'
    ]
} );
