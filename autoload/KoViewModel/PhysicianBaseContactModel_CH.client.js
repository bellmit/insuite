/*jslint anon:true, nomen:true*/
/*global YUI, ko, jQuery */
'use strict';
YUI.add( 'PhysicianBaseContactModel_CH', function( Y/*, NAME */ ) {
        /**
         * @module PhysicianBaseContactModel
         */

        var
            //peek = ko.utils.peekObservable,
            i18n = Y.doccirrus.i18n,
            unwrap = ko.unwrap,
            KoViewModel = Y.doccirrus.KoViewModel,
            BaseContactModel = KoViewModel.getConstructor( 'BaseContactModel' ),
            PLEASE_SELECT = i18n( 'general.message.PLEASE_SELECT' );

        /**
         * @class PhysicianBaseContactModel_CH
         * @constructor
         * @extends BaseContactModel
         */
        function PhysicianBaseContactModel_CH( config ) {
            PhysicianBaseContactModel_CH.superclass.constructor.call( this, config );
        }

        Y.extend( PhysicianBaseContactModel_CH,BaseContactModel, {

            initializer: function PhysicianBaseContactModel_CH_initializer() {
                var
                    self = this;
                self.cantonI18n = i18n( 'person-schema.Address_CH_T.cantonCode' );
                self.initSupportContact_CH();
            },
            destructor: function PhysicianBaseContactModel_CH_destructor() {
            },
            initSupportContact_CH: function PhysicianBaseContactModel_CH_initSupportContact() {
                var
                    self = this,

                    validationGLN = Y.doccirrus.validations.common.Physician_T_glnNumber,
                    validationZSR = Y.doccirrus.validations.common.Physician_T_zsrNumber;

                if (unwrap(self.baseContactType) === 'PHYSICIAN') {
                    self._glnNumber = ko.observable();
                    self._glnNumber.validationMessages = ko.observableArray( [] );
                    self._glnNumber.hasError = ko.computed( function() {
                        var
                            value = self.glnNumber(),
                            isValid;
                        self._glnNumber.validationMessages( [] );
                        isValid = validationGLN.every( function( validate ) {
                            if( !validate.validator( ko.unwrap( value ) ) ) {
                                self._glnNumber.validationMessages.push( validate.msg );
                            }
                            return validate.validator( ko.unwrap( value ) );
                        } );
                        return !isValid;
                    } );

                    self._zsrNumber = ko.observable();
                    self._zsrNumber.validationMessages = ko.observableArray( [] );
                    self._zsrNumber.hasError = ko.computed( function() {
                        var
                            value = self.zsrNumber(),
                            isValid;
                        self._zsrNumber.validationMessages( [] );
                        isValid = validationZSR.every( function( validate ) {
                            if( !validate.validator( ko.unwrap( value ) ) ) {
                                self._zsrNumber.validationMessages.push( validate.msg );
                            }
                            return validate.validator( ko.unwrap( value ) );
                        } );
                        return !isValid;
                    } );
                }
            },
            _glnNumber: null,
            _zsrNumber: null
        }, {
            NAME: 'PhysicianBaseContactModel_CH',
            ATTRS: {
                useSelect2CantonCode: {
                    /**
                     * Determines if a select2-binding config for "cantonCode" should be initialised
                     * @attribute useSelect2CantonCode
                     * @type {boolean}
                     * @default false
                     */
                    value: false,
                    lazyAdd: false
                },
                select2CantonCodeConfig: {
                    /**
                     * Function which should return an appropriate select2-binding config for "cantonCode"
                     * @attribute select2CantonCodeConfig
                     * @type {function}
                     * @see ko.bindingHandlers.select2
                     */
                    value: function select2CantonCodeConfig() {
                        var self = this;

                        self.cantonWithText = self.cantonWithText || ko.observable();

                        if( ko.unwrap( self.cantonCode ) ) {
                            Promise.resolve( Y.doccirrus.jsonrpc.api.catalog.getTarmedCantonsByCode( {
                                code: ko.unwrap( self.cantonCode ),
                                options: {
                                    limit: 1
                                }
                            } ) ).then( function( response ) {
                                var entry = response && response.data && response.data[0];
                                var text = entry && entry.text || ko.unwrap( self.cantonCode );

                                self.cantonWithText( {
                                    id: ko.unwrap( self.cantonCode ),
                                    text: text
                                } );

                                if( !entry || !entry.text ) { // No text was found (text defaulted to the code)
                                    throw new Y.doccirrus.commonerrors.DCError( 'canton_01' );
                                }
                            } )
                                .catch( function( err ) {
                                    self.cantonWithText( {
                                        id: ko.unwrap( self.cantonCode ),
                                        text: ko.unwrap( self.cantonCode ) // default text to code
                                    } );

                                    return Y.doccirrus.DCWindow.notice( {
                                        message: Y.doccirrus.errorTable.getMessage( err )
                                    } );
                                } );
                        }

                        return {
                            data: self.addDisposable( ko.computed( {
                                read: self.select2CantonCodeComputedRead,
                                write: self.select2CantonCodeComputedWrite
                            }, self ) ),
                            select2: {
                                width: '100%',
                                placeholder: PLEASE_SELECT,
                                query: function( search ) {
                                    Promise.resolve( Y.doccirrus.jsonrpc.api.catalog.searchTarmedCantonsByCodeOrName( {
                                        searchTerm: search.term
                                    } ) ).then( function( response ) {
                                        var results = response.data.map( function( item ) {
                                            return {
                                                id: item.code,
                                                text: item.text
                                            };
                                        } );
                                        search.callback( {results: results} );
                                    } ).catch( function( err ) {
                                        return Y.doccirrus.DCWindow.notice( {
                                            message: Y.doccirrus.errorTable.getMessage( err )
                                        } );
                                    } );
                                },
                                formatSelection: function( result ) {
                                    return result.text;
                                },
                                allowClear: true,
                                init: function( element ) {
                                    jQuery( element ).on( 'select2-selected', function( $event ) {
                                        self.select2CantonCodeOnSelect( $event );
                                    } );
                                }
                            }
                        };
                    }
                }
            }
        } );
        KoViewModel.registerConstructor( PhysicianBaseContactModel_CH );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'BaseContactModel',
            'v_physician-schema',
            'person-schema',
            'simpleperson-schema'
        ]
    }
);