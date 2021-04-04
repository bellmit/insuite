/**
 * User: mykhaylo.dolishniy
 * Date: 27.04.20  18:00
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, ko, _ */

YUI.add( 'TarmedInvoiceFactorValueModel', function( Y/*, NAME*/ ) {
        /**
         * @module TarmedInvoiceFactorValueModel
         */

        var
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel;

        function TarmedInvoiceFactorValueModel( config ) {
            TarmedInvoiceFactorValueModel.superclass.constructor.call( this, config );
        }

        TarmedInvoiceFactorValueModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( TarmedInvoiceFactorValueModel, KoViewModel.getBase(), {
                initializer: function TarmedInvoiceFactorValueModel_initializer() {
                    var self = this;


                    self.buttonDeleteTextI18n = i18n('general.button.DELETE');
                    self.qualiDignityI18n = i18n( 'employee-schema.Employee_CH_T.qualiDignities.i18n' );
                    self.caseTypesI18n = i18n( 'partner-schema.Partner_T.configuration.caseFolders' );
                    self.factorI18n = i18n( 'InCaseMojit.casefile_browserJS.placeholder.FACTOR' );

                    self.initSelect2Dignity();
                    self.initSelect2CaseTypes();
                },
                initSelect2Dignity: function() {
                    var self = this,
                        dignities = ko.observableArray();

                    self.select2QualiDignity = {
                        val: ko.computed( {
                            read: function() {
                                return ko.unwrap( self.qualiDignity );
                            },
                            write: function( $event ) {
                                self.qualiDignity( $event.val );
                            }
                        } ),
                        select2: {
                            placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                            initSelection: function( element, callback ) {
                                var dignity = ko.unwrap( self.qualiDignity );
                                if( !dignity ){
                                    return callback();
                                }

                                var list = ko.unwrap( dignities ),
                                    filteredData;

                                list.forEach( function( entry ) {
                                    var data = entry.children.find( function( item ) { return item.id === dignity; } );
                                    if( data ){
                                        filteredData = data;
                                        return;
                                    }
                                });
                                return callback( filteredData );

                            },
                            query: function( options ) {
                                var list = ko.unwrap( dignities ),
                                    term = options.term && options.term.toLowerCase(),
                                    filteredData;
                                if( !term ){
                                    return options.callback( { results: list } );
                                }

                                filteredData = JSON.parse(JSON.stringify(list)).filter( function( entry ) {
                                    return entry.children.some( function( item ) { return item.text.toLowerCase().indexOf( term ) !== -1; } );
                                }).map( function( entry ) {
                                    entry.children = entry.children.filter( function( item ) { return item.text.toLowerCase().indexOf( term ) !== -1; } );
                                    return entry;
                                });
                                return options.callback( { results: filteredData } );
                            }
                        }
                    };

                    Y.doccirrus.jsonrpc.api.catalog.getTarmedDignities( {
                        type: 'quali'
                    } ).done( function( response ) {
                        var data,
                            results = [];

                        data = [
                            {
                                text: i18n( 'employee-schema.Employee_CH_T.groups.specialisationAndTitles' ),
                                children: []
                            },
                            {
                                text: i18n( 'employee-schema.Employee_CH_T.groups.ProcedureLicenses' ),
                                children: []
                            }];
                        response.data.sort( function( a, b ) {
                            var value1 = a.text.replace( "FA", "" ).trim().toUpperCase();
                            var value2 = b.text.replace( "FA", "" ).trim().toUpperCase();
                            if( value1 < value2 ) {
                                return -1;
                            }
                            if( value1 > value2 ) {
                                return 1;
                            }
                            return 0;
                        } ).map( function( entry ) {
                            var checkEntry = -1 !== entry.text.indexOf( 'FA' ),
                                text = entry.text.replace( "FA", "" ).trim();
                            text = text.charAt( 0 ).toUpperCase() + text.slice( 1 );
                            if( "9999" !== entry.code ) {
                                if( checkEntry && "0" === entry.fmh ) {
                                    data[1].children.push( {id: entry.code, text: text} );
                                } else {
                                    data[0].children.push( {id: entry.code, text: text} );
                                }
                            }
                        } );
                        data.forEach( function( item ) {
                            if( 0 < item.children.length ) {
                                results.push( item );
                            }
                        } );

                        return dignities( results );
                    } ).fail( function( error ) {
                        _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } );


                },
                initSelect2CaseTypes: function() {
                    var self = this,
                        dignities = ko.observableArray();

                    self.select2CaseTypes = {
                        val: ko.computed( {
                            read: function() {
                                return ko.unwrap( self.caseTypes );
                            },
                            write: function( $event ) {
                                if( $event.added ) {
                                    self.caseTypes.push( $event.added.id );
                                }
                                if( $event.removed ) {
                                    self.caseTypes.remove( function( item ) {
                                        return item === $event.removed.id;
                                    } );
                                }
                            }
                        } ),
                        select2: {
                            placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                            multiple: true,
                            data: [
                                { id: 'PRIVATE_CH', text: 'KVG' },
                                { id: 'PRIVATE_CH_UVG', text: 'UVG' },
                                { id: 'PRIVATE_CH_IVG', text: 'IVG' },
                                { id: 'PRIVATE_CH_VVG', text: 'VVG' },
                                { id: 'PRIVATE_CH_MVG', text: 'MVG' }
                            ]
                        }
                    };

                    Y.doccirrus.jsonrpc.api.catalog.getTarmedDignities( {
                        type: 'quali'
                    } ).done( function( response ) {
                        var data,
                            results = [];

                        data = [
                            {
                                text: i18n( 'employee-schema.Employee_CH_T.groups.specialisationAndTitles' ),
                                children: []
                            },
                            {
                                text: i18n( 'employee-schema.Employee_CH_T.groups.ProcedureLicenses' ),
                                children: []
                            }];
                        response.data.sort( function( a, b ) {
                            var value1 = a.text.replace( "FA", "" ).trim().toUpperCase();
                            var value2 = b.text.replace( "FA", "" ).trim().toUpperCase();
                            if( value1 < value2 ) {
                                return -1;
                            }
                            if( value1 > value2 ) {
                                return 1;
                            }
                            return 0;
                        } ).map( function( entry ) {
                            var checkEntry = -1 !== entry.text.indexOf( 'FA' ),
                                text = entry.text.replace( "FA", "" ).trim();
                            text = text.charAt( 0 ).toUpperCase() + text.slice( 1 );
                            if( "9999" !== entry.code ) {
                                if( checkEntry && "0" === entry.fmh ) {
                                    data[1].children.push( {id: entry.code, text: text} );
                                } else {
                                    data[0].children.push( {id: entry.code, text: text} );
                                }
                            }
                        } );
                        data.forEach( function( item ) {
                            if( 0 < item.children.length ) {
                                results.push( item );
                            }
                        } );

                        return dignities( results );
                    } ).fail( function( error ) {
                        _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } );


                },
                deleteTarmedInvoiceFactorSetting: function( data, item ) {
                    data.tarmedInvoiceFactorValues.remove( function( tarmedInvoiceFactorValue ) {
                        return tarmedInvoiceFactorValue.clientId === item.clientId;
                    } );
                }
            },
            {
                schemaName: 'invoiceconfiguration.tarmedInvoiceFactorValues',
                NAME: 'TarmedInvoiceFactorValueModel'
            } );

        KoViewModel.registerConstructor( TarmedInvoiceFactorValueModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'promise',
            'KoViewModel',
            'invoiceconfiguration-schema'
        ]
    }
);