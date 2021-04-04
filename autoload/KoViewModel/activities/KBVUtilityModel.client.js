/**
 * User: do
 * Date: 12/12/16  13:40
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment  */

'use strict';

YUI.add( 'KBVUtilityModel', function( Y, NAME ) {
        /**
         * @module KBVUtilityModel
         */

        var
            i18n = Y.doccirrus.i18n,
            CONFIRM_WARNINGS = i18n( 'InCaseMojit.ActivityActionButtonsViewModel.text.CONFIRM_WARNINGS' ),
            KoViewModel = Y.doccirrus.KoViewModel,
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap,
            FormBasedActivityModel = KoViewModel.getConstructor( 'FormBasedActivityModel' );

        /**
         * @class KBVUtilityModel
         * @constructor
         * @extends FormBasedActivityModel
         */
        function KBVUtilityModel( config ) {
            KBVUtilityModel.superclass.constructor.call( this, config );
        }

        KBVUtilityModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            lastKbvUtility: {
                value: null,
                lazyAdd: false
            },
            acuteEvents: {
                value: null,
                lazyAdd: false
            },
            initialSearchDialogOpened: {
                value: false,
                lazyAdd: false
            }
        };

        var warningPaths = [
            'utIndicationCode',
            'utIcdCode',
            'utMedicalJustification',
            'utLatestStartOfTreatment',
            'utGroupTherapy',
            'utPrescriptionType',
            'utRemedy1List',
            'utRemedy2List',
            'utRemedy1PerWeek',
            'utRemedy2PerWeek'
        ];

        function getMaxFromRange( str ) {
            var x, y, result = Y.doccirrus.regexp.numRange.exec( str );
            if( !result ) {
                return null;
            }
            x = Number( result[1] );
            y = -Number( result[2] );

            if( 0 === y || y ) {
                return y;
            }

            if( 0 === x || x ) {
                return x;
            }

            return null;
        }

        Y.extend( KBVUtilityModel, FormBasedActivityModel, {

                initializer: function KBVUtilityModel_initializer() {
                    var
                        self = this;

                    // set up some validation deps
                    self.addDisposable( ko.computed( function() {
                        self.utPrescriptionType();
                        self.utMedicalJustification.validate();
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        self.timestamp();
                        self.utLatestStartOfTreatment.validate();
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        self.u_extra();
                        self.utRemedy1Name();
                        self.utRemedy2Name();
                        self.utGroupTherapy.validate();
                    } ) );

                    self._isValid = ko.computed( function() {
                        var validStateMap = self._validStateMap(),
                            filteredValidStateMap = [];
                        validStateMap.forEach( function( path ) {
                            var fieldName = path.split( '.' )[1];
                            if( -1 === warningPaths.indexOf( fieldName ) ) {
                                filteredValidStateMap.push( path );
                            }
                        } );
                        return 0 === filteredValidStateMap.length;
                    } );

                    self.hasWarnings = ko.computed( function() {
                        var validStateMap = self._validStateMap(),
                            filteredValidStateMap = [];
                        validStateMap.forEach( function( path ) {
                            var fieldName = path.split( '.' )[1];
                            if( -1 !== warningPaths.indexOf( fieldName ) ) {
                                filteredValidStateMap.push( path );
                            }
                        } );
                        return 0 !== filteredValidStateMap.length;
                    } );

                    self.addDisposable( ko.computed( function() {
                        var
                            timestamp = unwrap( self.timestamp ),
                            utIndicationCode = unwrap(self.utIndicationCode ),
                            past3montes = moment( timestamp ).subtract(3, 'months').toDate();
                        if( !ko.computedContext.isInitial() ) {
                            Y.doccirrus.jsonrpc.api.activity.lastKbvUtility( {
                                patientId: peek( self.patientId ),
                                timestamp: timestamp,
                                utIndicationCode: utIndicationCode,
                                fromDate: past3montes
                            } ).done( function( response ) {
                                var
                                    old = self.get( 'lastKbvUtility' ),
                                    data = response && response.data || null;
                                self.set( 'lastKbvUtility', data );
                                if( !old || data._id !== old._id ) {
                                    self.checkLastPrescription( true );
                                }
                            } ).fail( function( err ) {
                                Y.log( 'could not get last kbv utility ' + err, 'error', NAME );
                            } );
                        }
                    } ) );

                    self.utRemedy1PerWeekMax = ko.computed( function() {
                        var utRemedy1PerWeek = unwrap( self.utRemedy1PerWeek );
                        if( !utRemedy1PerWeek ) {
                            return;
                        }
                        return getMaxFromRange( utRemedy1PerWeek );
                    } );

                    self.utRemedy2PerWeekMax = ko.computed( function() {
                        var utRemedy2PerWeek = unwrap( self.utRemedy2PerWeek );
                        if( !utRemedy2PerWeek ) {
                            return;
                        }
                        return getMaxFromRange( utRemedy2PerWeek );
                    } );

                    self.checkLastPrescription( false );
                    self.checkAcuteEvents();
                },
                checkAcuteEvents: function() {
                    var
                        self = this,
                        messageId = 'show_acute_events',
                        acuteEvents = self.get( 'acuteEvents' );
                    if( acuteEvents && acuteEvents.length ) {
                        Y.doccirrus.DCSystemMessages.removeMessage( messageId );
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            messageId: messageId,
                            content: i18n( 'InCaseMojit.KBVUtilityModelJS.SHOW_ACUTE_EVENTS', {
                                data: {
                                    acute_events: acuteEvents.map( function( acuteEvent ) {
                                        return moment( acuteEvent ).format( 'DD.MM.YYYY' );
                                    } ).join( ', ' )
                                }
                            } ),
                            level: 'INFO'
                        } );
                    }
                },
                checkLastPrescription: function( onLastKbv ) {

                    var self = this,
                        status = peek( self.status ),
                        lastKbvUtility = self.get( 'lastKbvUtility' );
                    if( -1 !== ['APPROVED', 'CANCELLED'].indexOf( status ) ) {
                        return;
                    }

                if( onLastKbv ){
                    if( lastKbvUtility && Object.keys(lastKbvUtility).length ) {
                        self.utPrescriptionType( 'FOLLOWING' );
                        self.utHomeVisit( lastKbvUtility.utHomeVisit );
                        self.utTherapyReport( lastKbvUtility.utTherapyReport );
                        self.utGroupTherapy( lastKbvUtility.utGroupTherapy );
                    } else {
                        self.utPrescriptionType( 'FIRST' );
                    }
                } else if( self.isNew() ){
                    self.utPrescriptionType( 'FIRST' );
                }


                },
                createDiagnoses: function() {
                    var
                        self = this,
                        baseObj = {
                            timestamp: peek( self.timestamp ),
                            patientId: peek( self.patientId ),
                            employeeId: peek( self.employeeId ),
                            locationId: peek( self.locationId ),
                            caseFolderId: peek( self.caseFolderId )
                        },
                        utIcdCode = peek( self.utIcdCode ),
                        utIcdRef = peek( self.utIcdRef ),
                        utSecondIcdCode = peek( self.utSecondIcdCode ),
                        utSecondIcdRef = peek( self.utSecondIcdRef ),
                        diagnosesToCreate = [];

                    if( utIcdCode && !utIcdRef ) {
                        diagnosesToCreate.push( Object.assign( {
                            code: utIcdCode,
                            userContent: peek( self.utIcdText )
                        }, baseObj ) );
                    }

                    if( utSecondIcdCode && !utSecondIcdRef ) {
                        diagnosesToCreate.push( Object.assign( {
                            code: utSecondIcdCode,
                            userContent: peek( self.utSecondIcdText ),
                            isSecond: true
                        }, baseObj ) );
                    }

                    if( 0 === diagnosesToCreate.length ) {
                        return {confirmed: true};
                    }

                    return new Promise( function( resolve ) {
                        Y.doccirrus.modals.kbvutilityDiagnosesCreationModal.showDialog( {data: diagnosesToCreate}, function( result ) {
                            if( result && result.utIcdRef ) {
                                self.utIcdRef( result.utIcdRef );
                            }
                            if( result && result.utSecondIcdRef ) {
                                self.utSecondIcdRef( result.utSecondIcdRef );
                            }
                            resolve( {confirmed: true} );
                        } );
                    } );
                },
                askConfirmWarnings: function() {
                    return new Promise( function( resolve ) {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'info',
                            message: CONFIRM_WARNINGS,
                            window: {
                                width: 'auto',
                                buttons: {
                                    footer: [
                                        Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                            action: function() {
                                                this.close();
                                                resolve( {confirmed: false} );
                                            }
                                        } ),
                                        Y.doccirrus.DCWindow.getButton( 'OK', {
                                            isDefault: true,
                                            action: function() {
                                                this.close();
                                                resolve( {confirmed: true} );
                                            }
                                        } )
                                    ]
                                }
                            }
                        } );
                    } );
                },
                destructor: function KBVUtilityModel_destructor() {
                }
            },
            {
                schemaName: 'v_kbvutilitymodel',
                NAME: 'KBVUtilityModel'
            }
        );

        KoViewModel.registerConstructor( KBVUtilityModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'dcregexp',
            //'CatalogBasedActivityModel',
            'FormBasedActivityModel',
            'v_kbvutilitymodel-schema',
            'activity-api',
            'kbvutility-diagnoses-creation-modal'
        ]
    }
);