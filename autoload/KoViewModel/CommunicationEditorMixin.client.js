/*jslint anon:true, nomen:true*/
/*global YUI, ko, jQuery */

'use strict';

YUI.add( 'CommunicationEditorMixin', function( Y/*, NAME*/ ) {
        /**
         * @module CommunicationEditorMixin
         */

        var
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,

            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel,
            CommunicationModel = KoViewModel.getConstructor( 'CommunicationModel' );

        // mixTypeField
        (function() {
            var
                mixin = {
                    initEditTypeField: function() {
                        var
                            self = this,
                            typeList = self.type.list(),
                            availableTypes = [
                                'PHONEJOB',
                                'MOBILEPRIV',
                                'PHONEPRIV',
                                'FAXJOB',
                                'FAXPRIV',
                                'EMAILJOB',
                                'EMAILPRIV',
                                'URL',
                                'OTHER',
                                'PHONEEMERGENCY'
                            ];

                        // schema job? ...
                        self.type.list( Y.Array.filter( typeList, function( type ) {
                            return -1 !== availableTypes.indexOf( type.val );
                        } ) );
                    }
                };

            /**
             * @method mixTypeField
             * @for PatientModel
             * @param {Object} receiver prototype
             * @static
             */
            CommunicationModel.mixTypeField = function( receiver ) {
                Y.mix( receiver, mixin, false, Object.keys( mixin ), 4 );
            };
        })();

        // mixEmailConfirmation
        (function() {
            var
                mixin = {
                    sendEmailConfirmationAgainAvailable: null,
                    valueFieldStyle: null,
                    valueFieldTooltip: null,
                    initEditEmailConfirmation: function() {
                        var
                            self = this;

                        self.sendEmailConfirmationAgainAvailable = ko.computed( function() {
                            var
                                confirmNeeded = unwrap( self.confirmNeeded ),
                                confirmed = unwrap( self.confirmed ),
                                currentPatient = unwrap( self.get( 'currentPatient' ) ),
                                isNew = currentPatient.isNew();

                            return confirmNeeded && !confirmed && !isNew;
                        } );

                        self.valueFieldStyle = ko.computed( function() {
                            var
                                confirmNeeded = unwrap( self.confirmNeeded ),
                                confirmed = unwrap( self.confirmed );

                            // ...
                            return confirmNeeded ? { color: confirmed ? 'green' : '' } : {};
                        } );

                        self.valueFieldTooltip = ko.computed( function() {
                            var
                                confirmNeeded = unwrap( self.confirmNeeded ),
                                confirmed = unwrap( self.confirmed );

                            // ...
                            return { title: confirmed && i18n( 'person-schema.Communication_T.confirmed' ) || confirmNeeded && i18n( 'person-schema.Communication_T.confirmNeeded' ) || "" };
                        } );
                    },
                    _sendEmailConfirmationAgain: function() {
                        var
                            self = this,
                            currentPatient = peek( self.get( 'currentPatient' ) ),
                            email = peek( self.value );

                        if( email ) {
                            Y.doccirrus.jsonrpc.api.patient.askConfirmEMail( {
                                data: {
                                    patientId: peek( currentPatient._id ),
                                    email: email
                                }
                            } )
                                .done( function() {
                                    Y.doccirrus.DCWindow.notice( {
                                        type: 'success',
                                        message: i18n( 'InCaseMojit.patient-modelJS.messages.CONFIRM_EMAIL_SENT' ),
                                        window: {
                                            title: i18n( 'InCaseMojit.patient-modelJS.title.CONFIRM_EMAIL_SENT_MODAL' )
                                        }
                                    } );
                                } )
                                .fail( function( error ) {
                                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                } );
                        } else {
                            Y.doccirrus.DCWindow.notice( {
                                type: 'error',
                                message: 'email should be set'
                            } );
                        }
                    }
                };

            /**
             * @method mixEmailConfirmation
             * @for PatientModel
             * @param {Object} receiver prototype
             * @static
             */
            CommunicationModel.mixEmailConfirmation = function( receiver ) {
                Y.mix( receiver, mixin, false, Object.keys( mixin ), 4 );
            };
        })();

        // mixRemoveItem
        (function() {
            var
                mixin = {
                    removeItem: function() {
                        var
                            self = this,
                            dataModelParent = self.get( 'dataModelParent' ),
                            currentPatient = peek( self.get( 'currentPatient' ) );

                        currentPatient.communications.remove( dataModelParent );
                        // make active last added address
                        jQuery( '.communication-tabs li.component-tab' ).first().addClass( "active" );
                        jQuery( '.communication-tabs div.component-content' ).first().addClass( "active" );
                    }
                };

            /**
             * @method mixRemoveItem
             * @for PatientModel
             * @param {Object} receiver prototype
             * @static
             */
            CommunicationModel.mixRemoveItem = function( receiver ) {
                Y.mix( receiver, mixin, false, Object.keys( mixin ), 4 );
            };
        })();

    },
    '0.0.1',
    {
        requires: [
            'doccirrus',
            'KoViewModel',
            'CommunicationModel',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'DCWindow',
            'dcerrortable'
        ]
    }
);