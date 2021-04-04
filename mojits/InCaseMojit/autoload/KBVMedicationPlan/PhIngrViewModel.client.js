/**
 * User: do
 * Date: 31.01.20  11:03
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'PhIngrViewModel', function( Y ) {
        /**
         * @module PhIngrViewModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            i18n = Y.doccirrus.i18n,
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            ACTIVE_INGREDIENTS = i18n( 'utils_uam_clientJS.placeholder.ACTIVE_INGREDIENTS' );

        function PhIngrViewModel( config ) {
            PhIngrViewModel.superclass.constructor.call( this, config );
        }

        PhIngrViewModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( PhIngrViewModel, KoViewModel.getBase(), {
            initializer: function() {
                var
                    self = this;
                self.initPhIngr();
            },
            initPhIngr: function() {
                var
                    self = this;
                self.initSelect2Name();
            },
            initSelect2Name: function() {
                var
                    self = this;
                self.select2Name = {
                    data: self.addDisposable( ko.computed( {
                        read: function() {
                            var
                                code = unwrap( self.code ),
                                name = unwrap( self.name );
                            if( !code && !name ) {
                                return null;
                            }
                            return {id: code, name: name};
                        },
                        write: function( $event ) {
                            var
                                name = $event.added && $event.added.name,
                                code = $event.added && $event.added.id;
                            self.name( name );
                            self.code( code );
                            if( name && (name === code) ) {
                                self.code( '' );
                            }
                        }
                    } ) ),
                    placeholder: ACTIVE_INGREDIENTS,
                    select2: {
                        allowClear: true,
                        minimumInputLength: 1,
                        containerCssClass: 'ko-select2-container ko-select2-no-right-border',
                        formatResult: function( query ) {
                            var name = query.name;
                            return '<div class="dc-formatResult" title="' + name + '">' + name + '</div>';
                        },
                        formatSelection: function( query ) {
                            return query.name;
                        },
                        createSearchChoice: function( term ) {
                            return {id: term, name: term};
                        },
                        query: Y.doccirrus.utils.debounceSelect2Query( function( query ) {
                            var maxresult = this.maxresult || 10;
                            Y.doccirrus.jsonrpc.api.mmi.getMolecules( {
                                query: {
                                    name: query.term,
                                    maxresult: maxresult
                                }
                            } ).done( function( response ) {
                                    var results = response.data && response.data.MOLECULE.map( function( item ) {
                                        return {
                                            id: item.ID,
                                            name: item.NAME
                                        };
                                    } );
                                    query.callback( {
                                        results: results
                                    } );
                                }
                            )
                                .fail( function() {
                                    query.callback( {
                                        results: []
                                    } );
                                } );
                        }, 750, this )
                    }
                };
            },
            toString: function() {
                var self = this;
                return [peek( self.code ), peek( self.name ), peek( self.shortName ), peek( self.strength )].join( ',' );
            },
            destructor: function() {
            }
        }, {
            schemaName: 'v_medication.phIngr',
            NAME: 'PhIngrViewModel'
        } );
        KoViewModel.registerConstructor( PhIngrViewModel );
    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'JsonRpc'
        ]
    }
);
