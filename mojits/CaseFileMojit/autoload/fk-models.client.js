/*jslint anon:true, nomen:true*/
/*global YUI, ko, jQuery */
YUI.add( 'dcFkModels', function( Y, NAME ) {
        'use strict';

        Y.namespace( 'doccirrus.uam' );

        var
            i18n = Y.doccirrus.i18n;

        /**
         * @param config
         * @constructor
         */
        function Fk4234Model( config ) {
            var self = this;

            self._modelName = 'Fk4234Model';
            Y.doccirrus.uam.ViewModel.call( self );
            self._schemaName = 'activity';
            Y.doccirrus.uam.SubViewModel.call( self, config );

            self._runBoilerplate( config );
            self._generateDependantModels();
        }

        /**
         * @namespace Y.doccirrus.uam
         * @type {Fk4234Model}
         */
        Y.doccirrus.uam.Fk4234Model = Fk4234Model;

        /**
         * @param config
         * @constructor
         */
        function Fk4235Model( config ) {
            var self = this;

            // setting some defaults
            if( Y.Lang.isObject( config ) ) {
                if( !Y.Lang.isArray( config.fk4244Set ) ) {
                    config.fk4244Set = [];
                }
            }

            self._modelName = 'Fk4235Model';
            Y.doccirrus.uam.ViewModel.call( self );
            self._schemaName = 'activity';
            Y.doccirrus.uam.SubViewModel.call( self, config );

            self._runBoilerplate( config );
            self.fk4244Set._arrayOf = 'Fk4244Model';
            self._generateDependantModels();
        }

        /**
         * @namespace Y.doccirrus.uam
         * @type {Fk4235Model}
         */
        Y.doccirrus.uam.Fk4235Model = Fk4235Model;

        /**
         * @param config
         * @constructor
         */
        function Fk4244Model( config ) {
            var self = this,
                currentActivity = Y.doccirrus.uam.loadhelper.get( 'currentActivity' ),
                patient = Y.doccirrus.uam.loadhelper.get( 'currentPatient' ),
                options = {
                    actType: 'TREATMENT'
                };

            function getCatalogs() {
                var caseFolder,
                    forInsuranceType;

                patient = patient || Y.doccirrus.uam.loadhelper.get( 'currentPatient' );
                currentActivity = currentActivity || Y.doccirrus.uam.loadhelper.get( 'currentActivity' );
                caseFolder = currentActivity._caseFolder();
                forInsuranceType = caseFolder && caseFolder.type;

                options.short = Y.doccirrus.schemas.catalog.getShortNameByInsuranceType(
                    Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[forInsuranceType || 'ANY'],
                    forInsuranceType
                );

                return Y.doccirrus.catalogmap.getCatalogs( options );
            }

            self._modelName = 'Fk4244Model';
            Y.doccirrus.uam.ViewModel.call( self );
            self._schemaName = 'activity.fk4235Set';
            Y.doccirrus.uam.SubViewModel.call( self, config );

            self._runBoilerplate( config );

            self._addDisposable( ko.computed( function() {
                self.fk4244();
                self.fk4246();
                self._revalidate();
            } ) );

            self._displayfk4246 = ko.pureComputed( function() {
                return self.fk4246();
            } );
            (function() {
                function select2Mapper( val ) {
                    return {id: val.seq, text: val.title, catalogShort: val.catalogShort };
                }

                self._select2fk4244 = {
                    data: self._addDisposable( ko.computed( {
                        read: function() {
                            var fk4244 = self.fk4244();
                            return {id: fk4244, text: fk4244};
                        },
                        write: function( $event ) {
                            self.fk4244( $event.val );
                            if( $event.val ) {
                                self.fk4246( 0 );
                            } else {
                                self.fk4246( null );
                            }
                        }
                    } ) ),
                    placeholder: ko.observable( i18n( 'InCaseMojit.casefile_detail.placeholder.fk4244' ) ),
                    select2: {
                        minimumInputLength: 1,
                        allowClear: true,
                        dropdownCssClass: 'dc-big-drop',
                        formatResult: function( query ) {
                            var code = query.id,
                                text = query.text,
                                catalogShort = query.catalogShort;
                            return '<div class="dc-formatResult" title="' + catalogShort + ': ' + code + ', ' + text + '">' + code + ' ' + '(' + text + ')' + '</div>';
                        },
                        formatSelection: function( query ) {
                            return query.id;
                        },
                        query: function( query ) {
                            var catalogs = getCatalogs();
                            currentActivity = currentActivity || Y.doccirrus.uam.loadhelper.get( 'currentActivity' );
                            Y.doccirrus.jsonrpc.api.catalog.catalogCodeSearch( {
                                itemsPerPage: 20,
                                query: {
                                    term: query.term,
                                    catalogs: catalogs && catalogs.map( function( catalog ) {
                                        return {
                                            filename: catalog.filename,
                                            short: catalog.short
                                        };
                                    } ),
                                    locationId: currentActivity.locationId(),
                                    reduceData: true
                                }
                            } )
                                .done( function( response ) {
                                    var results;
                                    results = response.data.map( select2Mapper );
                                    if( 0 === results.length ) {
                                        results[0] = {id: query.term, text: query.term};
                                    }
                                    query.callback( {results: results} );
                                } )
                                .fail( function( err ) {
                                    Y.log( 'Catalog code search is failed, error: ' + err, 'debug', NAME );
                                    query.callback( {results: []} );
                                } );
                        }
                    }
                };
            })();
        }

        /**
         * @namespace Y.doccirrus.uam
         * @type {Fk4244Model}
         */
        Y.doccirrus.uam.Fk4244Model = Fk4244Model;

        /**
         * @param config
         * @constructor
         */
        function Fk5012Model( config ) {
            var self = this;

            // setting some defaults
            if( Y.Lang.isObject( config ) ) {
                if( !Y.Lang.isArray( config.fk5011Set ) ) {
                    config.fk5011Set = [];
                }
            }

            self._modelName = 'Fk5012Model';
            Y.doccirrus.uam.ViewModel.call( self );
            self._schemaName = 'activity.fk5012Set';
            Y.doccirrus.uam.SubViewModel.call( self, config );

            self._runBoilerplate( config );

            self.fk5011Set._arrayOf = 'Fk5011Model';
            self._generateDependantModels();

        }

        /**
         * @namespace Y.doccirrus.uam
         * @type {Fk5012Model}
         */
        Y.doccirrus.uam.Fk5012Model = Fk5012Model;

        /**
         * @param config
         * @constructor
         */
        function Fk5011Model( config ) {
            var self = this;

            self._modelName = 'Fk5011Model';
            Y.doccirrus.uam.ViewModel.call( self );
            self._schemaName = 'activity.fk5012Set.fk5011Set';
            Y.doccirrus.uam.SubViewModel.call( self, config );

            self._runBoilerplate( config );

        }

        /**
         * @namespace Y.doccirrus.uam
         * @type {Fk5011Model}
         */
        Y.doccirrus.uam.Fk5011Model = Fk5011Model;

        /**
         * @param config
         * @constructor
         */
        function Fk5020Model( config ) {
            var self = this;

            self._modelName = 'Fk5020Model';
            Y.doccirrus.uam.ViewModel.call( self );
            Y.doccirrus.uam.SubViewModel.call( self, config );

            self._runBoilerplate( config );

            self._addDisposable( self.fk5020.subscribe( function() {
                self._revalidate();
            } ) );
        }

        /**
         * @namespace Y.doccirrus.uam
         * @type {Fk5020Model}
         */
        Y.doccirrus.uam.Fk5020Model = Fk5020Model;

        /**
         * @param config
         * @constructor
         */
        function Fk5035Model( config ) {
            var self = this;

            self._modelName = 'Fk5035Model';
            Y.doccirrus.uam.ViewModel.call( self );
            Y.doccirrus.uam.SubViewModel.call( self, config );

            self._runBoilerplate( config );
        }

        /**
         * @namespace Y.doccirrus.uam
         * @type {Fk5035Model}
         */
        Y.doccirrus.uam.Fk5035Model = Fk5035Model;

        /**
         * @param config
         * @constructor
         */
        function Fk5036Model( config ) {
            var self = this;

            self._modelName = 'Fk5036Model';
            Y.doccirrus.uam.ViewModel.call( self );
            Y.doccirrus.uam.SubViewModel.call( self, config );

            self._runBoilerplate( config );

            /**
             * @see ko.bindingHandlers.select2
             * @type {Object}
             * @private
             */
            self._fk5036CfgAutoComplete = {
                data: self._addDisposable( ko.computed( {
                    read: function() {
                        var
                            fk5036 = self.fk5036();

                        if( fk5036 ) {
                            return {id: fk5036, text: fk5036};
                        }
                        else {
                            return null;
                        }
                    },
                    write: function( $event ) {
                        self.fk5036( $event.val );
                    }
                } ) ),
                placeholder: ko.observable( i18n( 'InCaseMojit.casefile_detail.placeholder.FK5036' ) ),
                select2: {
                    minimumInputLength: 1,
                    allowClear: true,
                    dropdownAutoWidth: true,
                    dropdownCssClass: 'dc-select2-createActivityCodeAutoComplete',
                    query: function( query ) {

                        function done( data ) {
                            var
                                results = [].concat( data );

                            if( 0 === results.length ) {
                                results[0] = {seq: query.term, title:''};
                            }
                            // map to select2
                            results = results.map( function( item ) {
                                return {id: item.seq, text: item.seq, _data: item};
                            } );
                            // publish results
                            query.callback( {
                                results: results
                            } );
                        }

                        // handle not having a catalog
                        if( null === Y.doccirrus.catalogmap.getCatalogEBM() ) {
                            done( [] );
                        }
                        else {
                            jQuery
                                .ajax( {
                                    type: 'GET', xhrFields: {withCredentials: true},
                                    url: Y.doccirrus.infras.getPrivateURL( '/r/catsearch/' ),
                                    data: {
                                        action: 'catsearch',
                                        catalog: Y.doccirrus.catalogmap.getCatalogEBM().filename,
                                        itemsPerPage: 10,
                                        term: query.term
                                    }
                                } )
                                .done( done )
                                .fail( function() {
                                    done( [] );
                                } );
                        }
                    },
                    formatResult: function format( result, container, query, escapeMarkup ) {
                        var
                            select2formatResult = [];

                        window.Select2.util.markMatch( result.text, query.term, select2formatResult, escapeMarkup );
                        select2formatResult = select2formatResult.join( '' );

                        if (result._data.title) {
                            return select2formatResult + ' (' + result._data.title + ')';
                        }
                        else {
                            return select2formatResult;
                        }

                    }
                }
            };
        }

        /**
         * @namespace Y.doccirrus.uam
         * @type {Fk5036Model}
         */
        Y.doccirrus.uam.Fk5036Model = Fk5036Model;

        /**
         * @param config
         * @constructor
         */
        function Fk5042Model( config ) {
            var self = this;

            self._modelName = 'Fk5042Model';
            Y.doccirrus.uam.ViewModel.call( self );
            Y.doccirrus.uam.SubViewModel.call( self, config );

            self._runBoilerplate( config );

            self._addDisposable( ko.computed( function() {
                self.fk5042();
                self.fk5043();
                self._revalidate();
            } ) );
        }

        /**
         * @namespace Y.doccirrus.uam
         * @type {Fk5042Model}
         */
        Y.doccirrus.uam.Fk5042Model = Fk5042Model;

    },
    '0.0.1',
    {
        requires: [
            'doccirrus',
            'dcviewmodel',
            'JsonRpcReflection-doccirrus',
            'JsonRpc'
        ]
    }
);