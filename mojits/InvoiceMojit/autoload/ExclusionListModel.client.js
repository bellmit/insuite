/**
 * User: do
 * Date: 15.01.20  09:00
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'ExclusionListModel', function( Y, NAME ) {

        /**
         * @module ExclusionListModel
         */

        var
            peek = ko.utils.peekObservable,
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel;

        function showError( response ) {
            var errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );
            Y.doccirrus.DCWindow.notice( {
                type: 'error',
                window: {width: 'small'},
                message: errors.join( '<br>' )
            } );
        }

        /**
         * @class ExclusionListModel
         * @constructor
         * @param {Object} config
         * @extends KoViewModel
         */
        function ExclusionListModel( config ) {
            ExclusionListModel.superclass.constructor.call( this, config );
        }

        ExclusionListModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( ExclusionListModel, KoViewModel.getBase(), {
                initializer: function ExclusionListModel_initializer() {

                    var self = this;

                    self.physiciansI18n = self.employees.i18n;
                    self.locationsI18n = self.locations.i18n;

                    self.locationsList = ko.observableArray();
                    self.physiciansList = ko.observableArray();

                    self.select2Physicians = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    value = self.employees() || [];

                                return value.map( function( physician ) {

                                    return {
                                        id: peek( physician._id ),
                                        text: peek( physician.lastname ) + ', ' + peek( physician.firstname )
                                    };
                                } );
                            },
                            write: function( $event ) {
                                var
                                    value = $event.val;

                                self.employees( self.physiciansList().filter( function( physician ) {
                                    return value.indexOf( peek( physician._id ) ) > -1;
                                } ) );
                            }
                        } ) ),
                        select2: {
                            placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                            width: '100%',
                            multiple: true,
                            query: function( query ) {
                                var
                                    results;
                                Y.doccirrus.jsonrpc.api.employee.read( {query: {type: 'PHYSICIAN'}} ).done( function( response ) {
                                        if( response && response.data && response.data[0] ) {
                                            self.physiciansList( response.data );
                                            results = [].concat( response.data );
                                            results = results.map( function( item ) {
                                                return {id: item._id, text: item.lastname + ', ' + item.firstname};
                                            } );
                                            query.callback( {results: results} );
                                        }
                                    }
                                ).fail( function( response ) {
                                    showError( response );
                                } );
                            }
                        }
                    };
                    self.select2Locations = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    value = self.locations() || [];

                                return value.map( function( location ) {
                                    return {
                                        id: peek( location._id ),
                                        text: peek( location.locname )
                                    };
                                } );
                            },
                            write: function( $event ) {
                                var
                                    value = $event.val;

                                self.locations( self.locationsList().filter( function( location ) {
                                    return value.indexOf( peek( location._id ) ) > -1;
                                } ) );
                            }
                        } ) ),
                        select2: {
                            placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                            width: '100%',
                            allowEmpty: true,
                            multiple: true,
                            query: function( query ) {
                                var
                                    results;
                                Y.doccirrus.jsonrpc.api.location.read().done( function( response ) {
                                        if( response && response.data && response.data[0] ) {
                                            self.locationsList( response.data );

                                            results = [].concat( response.data );

                                            results = results.map( function( item ) {
                                                return {id: item._id, text: item.locname};
                                            } );
                                            query.callback( {results: results} );
                                        }
                                    }
                                ).fail( function( response ) {
                                    showError( response );
                                } );
                            }
                        }
                    };

                    self.select2Codes = {
                        data: ko.computed( {
                            read: function() {
                                var codes = self.codes();
                                return codes.map( function( code ) {
                                    return {id: code, text: code};
                                } );
                            },
                            write: function( $event ) {
                                if( $event.added ) {
                                    self.codes.push( $event.added.id );
                                }
                                if( $event.removed ) {
                                    self.codes.remove( $event.removed.id );
                                }
                            }
                        } ),
                        select2: {
                            allowClear: true,
                            multiple: true,
                            placeholder: i18n( 'utils_uam_clientJS.createActivityCodeAutoComplete.placeholder' ),
                            // dropdownAutoWidth: true,
                            // dropdownCssClass: 'dc-select2-createActivityCodeAutoComplete',
                            formatResult: function( result, container, query, escapeMarkup ) {
                                var
                                    term = query.term,
                                    code = result.id,
                                    text = result.text,
                                    select2formatCode = [],
                                    select2formatText = [];

                                window.Select2.util.markMatch( code, term, select2formatCode, escapeMarkup );
                                select2formatCode = select2formatCode.join( '' );
                                window.Select2.util.markMatch( text, term, select2formatText, escapeMarkup );
                                select2formatText = select2formatText.join( '' );

                                return Y.Lang.sub( [
                                    '<div class="dc-select2-createActivityCodeAutoComplete-formatResult" title="{code}">',
                                    '<span class="dc-select2-createActivityCodeAutoComplete-formatResult-code">{select2formatCode}</span>',
                                    '<span class="dc-select2-createActivityCodeAutoComplete-formatResult-text">({select2formatText})</span>',
                                    '</div>'
                                ].join( '' ), {
                                    code: Y.Escape.html( code ),
                                    select2formatCode: select2formatCode,
                                    select2formatText: select2formatText
                                } );
                            },
                            formatResultCssClass: function( result ) {
                                var
                                    type = 'textform-homecatalog';

                                if( result._data && 0 !== result._data.count && !result._data.count && !result._data.instockEntry ) {
                                    type = 'textform-originalcatalog';
                                }

                                return type;
                            },
                            formatSelection: function( query ) {
                                return query.id;
                            },
                            createSearchChoice: function( item ) {
                                return {id: item, text: item};
                            },
                            query: function( query ) {
                                function select2Mapper( val ) {
                                    return {id: val.seq, text: val.title || '', _type: 'mapped', _data: val};
                                }

                                var
                                    ebmCatalogDesc = Y.doccirrus.catalogmap.getCatalogEBM(),
                                    params = ebmCatalogDesc && {
                                        itemsPerPage: 20,
                                        query: {
                                            term: '',
                                            catalogs: [
                                                {filename: ebmCatalogDesc.filename, short: ebmCatalogDesc.short}
                                            ]
                                        }
                                    };

                                if( !ebmCatalogDesc ) {
                                    throw new Error( 'ebm catalog descriptor not defined' );
                                }

                                if( params && params.query ) {
                                    params.query.term = query.term;
                                    Y.doccirrus.jsonrpc.api.catalog
                                        .catalogCodeSearch( params )
                                        .done( function( response ) {
                                            var
                                                results = response.data,
                                                hasCode,
                                                exactCodeMatch;

                                            results = results.map( select2Mapper );
                                            hasCode = results.some( function( item, index ) {
                                                if( item.id === query.term ) {
                                                    exactCodeMatch = results[index];
                                                    return true;
                                                }
                                                return false;
                                            } );
                                            if( 0 === results.length || !hasCode ) {
                                                results.unshift( {id: query.term, text: query.term, _type: 'term'} );
                                            }

                                            if( exactCodeMatch ) {
                                                results.splice( results.indexOf( exactCodeMatch ), 1 );
                                                results.unshift( exactCodeMatch );
                                            }
                                            query.callback( {results: results} );
                                        } )
                                        .fail( function( err ) {
                                            Y.log( '"createActivityCodeAutoComplete": Catalog code search is failed, error: ' + err, 'debug', NAME );
                                            query.callback( {results: []} );
                                        } );
                                }
                                else {
                                    query.callback( {results: []} );
                                }
                            }
                        }
                    };

                }
            },
            {
                schemaName: 'invoiceconfiguration.gkvExclusionList',
                NAME: 'ExclusionListModel'
            } );

        KoViewModel.registerConstructor( ExclusionListModel );

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