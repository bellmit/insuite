/**
 * User: pi
 * Date: 26/01/16  13:55
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment */
YUI.add( 'ActivityHouseCatalogViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        catchUnhandled = Y.doccirrus.promise.catchUnhandled,
        KoComponentManager = Y.doccirrus.KoUI.KoComponentManager,
        i18n = Y.doccirrus.i18n,
        SAVE_PLUS_PLUS = i18n( 'InCaseMojit.casefile_detail.menu.SAVE_PLUS_PLUS' ),
        CHANGES_NOT_SAVED = i18n( 'general.message.CHANGES_NOT_SAVED' ),
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable;

    /**
     * @constructor
     * @class ActivityHouseCatalogViewModel
     */
    function ActivityHouseCatalogViewModel() {
        ActivityHouseCatalogViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ActivityHouseCatalogViewModel, KoViewModel.getDisposable(), {
        /** @protected */
        initializer: function ActivityHouseCatalogViewModel_initializer() {
            var
                self = this;
            self.initActivityHouseCatalogViewModel();
        },
        /** @protected */
        destructor: function ActivityHouseCatalogViewModel_destructor() {
            var
                self = this;

            self.destroyActivityHouseCatalogViewModel();
        },
        initActivityHouseCatalogViewModel: function ActivityHouseCatalogViewModel_initActivityHouseCatalogViewModel() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentActivity = unwrap( self.get( 'currentActivity' ) ),
                activityDetailsViewModel = self.get( 'activityDetailsViewModel' ),
                checkboxList = [];

            self.isFrameView = unwrap( binder.isFrameView );

            self.template = {
                name: self.get( 'templateName' ),
                data: self,
                afterRender: self.afterRender.bind( self ),
                afterAdd: self.afterAdd.bind( self ),
                beforeRemove: self.beforeRemove.bind( self )
            };

            self.buttons = ko.observableArray();
            self.showButtons = ko.observable( true );
            self.hasSelectedItem = ko.observable( false );
            self._isValid = ko.computed( function() {
                return currentActivity._isValid();
            } );

            self.dataToSave = [];

            self.checkboxClick = function( data, $event ) {
                if( $event.target.checked ) {
                    data.checkbox = $event.target;
                    self.dataToSave.push( data );
                } else {
                    self.dataToSave = self.dataToSave.filter( function( item ) {
                        return data.seq !== item.seq;
                    } );
                }
                self.hasSelectedItem( 0 !== self.dataToSave.length );
                return true;
            };

            self._saveBtn = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'savePlusPlus',
                    text: SAVE_PLUS_PLUS,
                    option: 'PRIMARY',
                    css: {
                        'btn-block': true
                    },
                    disabled: ko.computed( function() {
                        return !(unwrap( self._isValid ) && unwrap( self.hasSelectedItem ));
                    } ),
                    click: function() {
                        self.saveData();
                    }
                }
            } );

            self.clearData = function() {
                if( 0 < checkboxList.length ) {
                    checkboxList.forEach( function( checkbox ) {
                        checkbox.checked = false;
                    } );
                }
                self.dataToSave = [];
                self.hasSelectedItem( 0 !== self.dataToSave.length );
            };
            self.askToChangeData = function( data ) {
                if( !peek( currentActivity.code ) && !peek( currentActivity.userContent ) ) {
                    self.uploadActivityData( data );
                } else {
                    Y.doccirrus.DCWindow.notice( {
                        type: 'info',
                        message: i18n('InCaseMojit.text.changeDescription'),
                        window: {
                            buttons: {
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true,
                                        action: function() {
                                            this.close();
                                            self.uploadActivityData( data );
                                        }
                                    } )
                                ]
                            }
                        }
                    } );
                }
            };
            self.addDisposable( ko.computed( function() {
                var catalogShort,
                    employeeId,
                    actType,
                    readOnlyMode,
                    visible,
                    locationId,
                    currentActivitySectionViewModel = unwrap( activityDetailsViewModel.currentActivitySectionViewModel ),
                    currentEditor = currentActivitySectionViewModel && peek( currentActivitySectionViewModel.currentActivityEditor ),
                    tags = currentEditor && unwrap( currentEditor.selectedCatalogTags ),
                    query;
                catalogShort = unwrap( currentActivity.catalogShort );
                employeeId = unwrap( currentActivity.employeeId );
                actType = peek( currentActivity.actType );
                readOnlyMode = currentActivity.code && peek( currentActivity.code.readOnly );
                locationId = unwrap( currentActivity.locationId );
                visible = catalogShort && actType && !readOnlyMode;
                self.showButtons( visible );
                if( !(visible) ) {
                    return self.buttons( [] );
                }
                query = {
                    catalogShort: catalogShort,
                    locationId: locationId
                };
                if( tags && tags.length ) {
                    query.tags = tags;
                }
                if( Y.doccirrus.schemas.activity.TARMED_CATALOGS_MAP.includes( catalogShort ) ) {
                    query.employeeId = employeeId;
                }
                self.loadButtons( query );
            } ).extend( { rateLimit: 300 } ) );

        },
        loadButtons: function( query ) {
            var
                self = this;
            Y.doccirrus.jsonrpc.api.catalogusage.getTopByShortName( {
                    query: query
                }
            )
                .done( function( response ) {
                    var codes = [];
                    if( response.data.length ) {
                        response.data = response.data.filter( function( data ) {
                            var result = -1 === codes.indexOf( data.seq );
                            codes.push( data.seq );
                            return result;
                        } );
                        self.showButtons( true );
                    } else {
                        self.showButtons( false );
                    }
                    self.buttons( response.data );
                } );

        },
        getMMIQueryData: function() {
            var
                self = this,
                currentActivity = unwrap( self.get( 'currentActivity' ) ),
                currentPatient = unwrap( self.get( 'currentPatient' ) ),
                caseFolder = currentActivity.get( 'caseFolder' ),
                binder = self.get( 'binder' ),
                location,
                employee,
                // MOJ-14319: [OK] [CASEFOLDER]
                publicInsurance = currentPatient.getPublicInsurance( caseFolder && caseFolder.type ),
                result = {
                    bsnr: '',
                    lanr: '',
                    patientAge: peek( currentPatient.age ),
                    insuranceIknr: publicInsurance && peek( publicInsurance.insuranceId )
                };

            binder.getInitialData( 'location' ).some( function( _location ) {
                if( _location._id === peek( currentActivity.locationId ) ) {
                    location = _location;
                    _location.employees.some( function( _employee ) {
                        if( _employee._id === peek( currentActivity.employeeId ) ) {
                            employee = _employee;
                            return true;
                        }
                        return false;
                    } );
                    return true;
                }
                return false;
            } );
            result.bsnr = ( location && location.commercialNo ) || result.bsnr;
            result.lanr = ( employee && employee.officialNo ) || result.lanr;
            return result;

        },
        uploadActivityData: function ActivityHouseCatalogViewModel_uploadActivityData( data ) {
            var
                self = this,
                currentActivity = unwrap( self.get( 'currentActivity' ) ),
                mmiQueryData;

            //  Remove references to invoice logs or other activities, CCDEV-65
            delete data.invoiceId;
            delete data.invoiceLogId;
            delete data.invoiceLogType;

            if( 'MEDICATION' === peek( currentActivity.actType ) && data.phPZN ) {
                mmiQueryData = self.getMMIQueryData();
                Y.doccirrus.api.activity.checkMMiEntry( {
                        catalogData: data,
                        patientAge: mmiQueryData.patientAge,
                        bsnr: mmiQueryData.bsnr,
                        lanr: mmiQueryData.lanr,
                        insuranceIknr: mmiQueryData.insuranceIknr

                    } )
                    .then( function( actualData ) {
                        currentActivity.setActivityData( actualData );
                    }, function() {
                        currentActivity.setActivityData( data );
                    } );
            } else {
                currentActivity.catalog( data.catalog === true );
                currentActivity.setActivityData( data );
            }
        },
        setContainerHeight: function ActivityHouseCatalogViewModel_setContainerHeight( element ) {
            if (!this.isFrameView) {
                setTimeout( function() {
                    if( element.parentElement.parentNode.previousElementSibling ) {
                        element.style.maxHeight = (0.9 * element.parentElement.parentNode.previousElementSibling.offsetHeight).toString() + 'px';
                    }
                }, 100 );
            }
        },
        saveData: function ActivityHouseCatalogViewModel_saveData() {
            var
                self = this,
                transitionDescription = Y.doccirrus.schemas.activity.getTransitionDescription( 'validate' ),
                binder = self.get( 'binder' ),
                caseFileVM = unwrap( binder.currentView ),
                activityDetailsVM = unwrap( caseFileVM.activityDetailsViewModel ),
                currentActivity = peek( self.get( 'currentActivity' ) );

            self._saveBtn.masked( true );
            function unmaskBtn() {
                if( self._saveBtn && self._saveBtn.masked ) {
                    self._saveBtn.masked( false );
                }
            }

            if( peek( currentActivity.code.peek ) ) {
                // save current activity
                activityDetailsVM.saveAttachmentsAndTransition( {
                        transitionDescription: transitionDescription
                    } )
                    .then( function( activity ) {
                        if( 0 < self.dataToSave.length ) {
                            if( 'PREPARED' === activity.status ) {
                                activity.timestamp = moment( new Date() ).toISOString();
                            }
                            self.saveSelectedActivity( activity, unmaskBtn );
                        }
                    } )
                    .catch( catchUnhandled );
            } else {
                self.saveSelectedActivity( currentActivity.toJSON(), unmaskBtn );
            }

        },
        saveSelectedActivity: function ActivityHouseCatalogViewModel_saveSelectedActivity( activity, callback ) {
            var
                self = this,
                oldActivity = {},
                illegalEBMFields = ["catalog", "billingFactorValue", "price", "u_extra", "value", "actualPrice", "unit", "actualUnit"],
                catIds,
                aCaseFileViewModel = KoViewModel.getViewModel( 'CaseFileViewModel' ),
                currentActivityTable = aCaseFileViewModel.activitiesTable;
            catIds = self.dataToSave.map( function( entry ) {
                return entry._id;
            } );

            /* prevent applying all the keys for certain activity types, where it is illegal*/
            Y.Object.some( activity, function( value, key ) {
                let isIllegal = (oldActivity.catalogShort === 'EBM' && illegalEBMFields.includes( key ));

                if( '_' !== key.charAt( 0 ) && 'timestamp' !== key && !isIllegal ) {
                    oldActivity[key] = value;
                }
            } );

            oldActivity.timestamp = activity.timestamp;
            oldActivity.status = 'VALID';

            Y.doccirrus.jsonrpc.api.activity.createActivitiesFromCatalogusage( {
                catalogusageIds: catIds,
                oldActivity: oldActivity
            } ).fail( function() {
                Y.doccirrus.DCWindow.notice( {
                    type: 'error',
                    message: CHANGES_NOT_SAVED
                } );
            } ).always( function() {
                currentActivityTable.reload();
                self.clearData();
                callback();
            } );
        },
        destroyActivityHouseCatalogViewModel: function ActivityHouseCatalogViewModel_destroyActivityHouseCatalogViewModel() {
        },
        templateName: null,
        afterRender: function ActivityHouseCatalogViewModel_afterRender() {

        },
        afterAdd: function ActivityHouseCatalogViewModel_afterAdd() {

        },
        beforeRemove: function ActivityHouseCatalogViewModel_beforeRemove() {

        }
    }, {
        NAME: 'ActivityHouseCatalogViewModel',
        ATTRS: {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InCaseMojit' )  || Y.doccirrus.utils.getMojitBinderByType( 'MirrorPatientMojit' );
                },
                lazyAdd: false
            },
            currentActivity: {
                valueFn: function() {
                    var
                        binder = this.get( 'binder' );
                    return binder.currentActivity;
                },
                lazyAdd: false
            },
            currentPatient: {
                valueFn: function() {
                    var
                        binder = this.get( 'binder' );
                    return binder.currentPatient;
                },
                lazyAdd: false
            },
            activityDetailsViewModel: {
                value: null,
                lazyAdd: false
            },
            templateName: {
                value: 'activityHouseCatalogViewModel',
                lazyAdd: false
            }
        }
    } );

    KoViewModel.registerConstructor( ActivityHouseCatalogViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'KoUI-all',
        'catalog-schema',
        'activity-schema',
        'activity-api',
        'promise'
    ]
} );
