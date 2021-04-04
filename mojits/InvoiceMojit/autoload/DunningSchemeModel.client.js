/*global YUI, ko*/

'use strict';

YUI.add( 'DunningSchemeModel', function( Y/*, NAME*/ ) {

        /**
         * @module DunningSchemeModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            i18n = Y.doccirrus.i18n;

        function DunningSchemeModel( config ) {
            DunningSchemeModel.superclass.constructor.call( this, config );
        }

        DunningSchemeModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( DunningSchemeModel, KoViewModel.getBase(), {
                initializer: function DunningSchemeModel_initializer() {
                    var
                        self = this,
                        validation = Y.doccirrus.validations.common.floatNumber[0];

                    self.warn1I18n = i18n( 'activity-schema.transitionList.warn1.i18n' );
                    self.warn2I18n = i18n( 'activity-schema.transitionList.warn2.i18n' );
                    self.remindI18n = i18n( 'activity-schema.transitionList.remind.i18n' );
                    self.invoiceI18n = i18n( 'activity-schema.Activity_E.INVOICE' );

                    self._locationList = Y.doccirrus.KoViewModel.utils.createAsync( {
                        initialValue: [],
                        jsonrpc: Y.doccirrus.jsonrpc.api.location.read,
                        converter: function( response ) {
                            function sortLocation( a, b ) {
                                return a._id > b._id;
                            }
                            var sorted = [].concat( response.data );
                            if( sorted && sorted.length ) {
                                sorted.sort( sortLocation );

                                if( 0 > sorted[0].locname.indexOf( 'Standard ( ') ) { // just a hack to avoid multiple 'Standard (' appearing in a locname
                                    sorted[0].locname = 'Standard ( ' + sorted[0].locname + ' )'; // rename default location
                                }
                            }
                            return sorted;
                        }
                    } );

                    self._warning1Value = ko.computed( {
                        read: function() {
                            var empiricalvalue = self.warning1Value(),
                                locale = Y.doccirrus.comctl.getUserLang(),
                                valueForDraw = parseFloat( empiricalvalue ).toFixed( 2 );
                            if( 'de-ch' !== locale ) {
                                valueForDraw.replace( '.', ',' );
                            }
                            return 0 === empiricalvalue ||  ( empiricalvalue && !isNaN( empiricalvalue ) ) ? valueForDraw : empiricalvalue;
                        },
                        write: function( value ) {
                            var
                                modifiedValue = Number( parseFloat( value.replace( ',', '.' ) ).toFixed( 2 ) );
                            if( !isNaN( modifiedValue ) ) {
                                self.warning1Value( modifiedValue );
                            } else {
                                self.warning1Value( value );
                            }
                        }
                    } );
                    self.countryModeSwiss = ko.observable(false);

                    self.addDisposable(ko.computed(function(  ) {
                        var locationId = self.locationId(),
                            location = self._locationList().find( function(location){return location._id === locationId;});
                        if(location) {
                            self.countryModeSwiss((location.countryMode || []).includes('CH'));
                        }
                    }));

                    self._warning1Value.validationMessages = ko.observableArray( [validation.msg] );
                    self._warning1Value.hasError = ko.computed( function() {
                        var
                            value = self.warning1Value(),
                            isValid = validation.validator( ko.unwrap( value ) );
                        return !isValid;
                    } );

                    self._warning2Value = ko.computed( {
                        read: function() {
                            var empiricalvalue = self.warning2Value(),
                                locale = Y.doccirrus.comctl.getUserLang(),
                                valueForDraw = parseFloat( empiricalvalue ).toFixed( 2 );
                            if( 'de-ch' !== locale ) {
                                valueForDraw.replace( '.', ',' );
                            }
                            return 0 === empiricalvalue || ( empiricalvalue && !isNaN( empiricalvalue ) ) ? valueForDraw : empiricalvalue;
                        },
                        write: function( value ) {
                            var
                                modifiedValue = Number( parseFloat( value.replace( ',', '.' ) ).toFixed( 2 ) );
                            if( !isNaN( modifiedValue ) ) {
                                self.warning2Value( modifiedValue );
                            } else {
                                self.warning2Value( value );
                            }
                        }
                    } );
                    self._warning2Value.validationMessages = ko.observableArray( [validation.msg] );
                    self._warning2Value.hasError = ko.computed( function() {
                        var
                            value = self.warning2Value(),
                            isValid = validation.validator( value );
                        return !isValid;
                    } );
                },
                deleteDunningScheme: function( data, item ) {
                    data.dunningSchemes.remove( function( schema ) {
                        return schema.clientId === item.clientId;
                    } );
                }
            },
            {
                schemaName: 'invoiceconfiguration.dunningSchemes',
                NAME: 'DunningSchemeModel'
            } );

        KoViewModel.registerConstructor( DunningSchemeModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'promise',
            'KoViewModel',
            'invoiceconfiguration-schema',
            'dc-comctl'
        ]
    }
);