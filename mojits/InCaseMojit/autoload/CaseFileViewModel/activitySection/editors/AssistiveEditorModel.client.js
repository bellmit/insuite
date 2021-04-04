/**
 * User: pi
 * Date: 20/01/16  14:10
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment, _ */

'use strict';

YUI.add( 'AssistiveEditorModel', function( Y ) {
        /**
         * @module AssistiveEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            i18n = Y.doccirrus.i18n,
            ASS_ALIAS = i18n( 'InCaseMojit.casefile_detail.label.ASS_ALIAS' ),
            ASS_CATEGORIES = i18n( 'InCaseMojit.casefile_detail.label.ASS_CATEGORIES' ),
            ASS_ENTRY = i18n( 'InCaseMojit.casefile_detail.label.ASS_ENTRY' ),
            ASS_GHD_ENTRY = i18n( 'InCaseMojit.casefile_detail.label.ASS_GHD_ENTRY' ),
            CatalogTagEditorModel = KoViewModel.getConstructor( 'CatalogTagEditorModel' ),
            unwrap = ko.unwrap;

        /**
         * @class AssistiveEditorModel
         * @constructor
         * @extends CatalogTagEditorModel
         */
        function AssistiveEditorModel( config ) {
            AssistiveEditorModel.superclass.constructor.call( this, config );
        }

        AssistiveEditorModel.ATTRS = {
            whiteList: {
                value: CatalogTagEditorModel.ATTRS.whiteList.value.concat( [
                    'assId',
                    'assDateAdded',
                    'assDateChanged',
                    'assDescription',
                    'assId',
                    'assManufacturer',
                    'assCharacteristics',
                    'assDose',
                    'assPrescPeriod'

                ] ),
                lazyAdd: false
            }
        };

        Y.extend( AssistiveEditorModel, CatalogTagEditorModel, {
                initializer: function AssistiveEditorModel_initializer() {
                    var
                        self = this;
                    self.initAssistiveEditorModel();

                },
                destructor: function AssistiveEditorModel_destructor() {
                },
                /**
                 * Initializes assistive editor model
                 * @method initAssistiveEditorModel
                 */
                initAssistiveEditorModel: function AssistiveEditorModel_initAssistiveEditorModel() {
                    var
                        self = this,
                        caseFolder = self.get( 'caseFolder' ),
                        caseFolderType = caseFolder && caseFolder.additionalType;

                    self.assCatalogSearchI18n = i18n( 'InCaseMojit.casefile_detail.label.ASS_CATALOG_SEARCH' );
                    self.assCatalogUsageSearchI18n = i18n( 'InCaseMojit.casefile_detail.label.ASS_CATALOGUSAGE_SEARCH' );
                    self.modifyHomeCatI18n = i18n( 'InCaseMojit.casefile_detail.checkbox.MODIFY_HOME_CAT' );

                    if( 'INCARE' === caseFolderType ) {
                        self.isINCARE = true;
                        self.initGHDSearch();
                    } else {
                        self.isINCARE = false;
                        self.initDefaultSearch();
                    }

                    self._displayAssDateAdded = self.addDisposable( ko.computed( function() {
                        var date = self.assDateAdded();
                        return date ? moment( date ).format( 'DD.MM.YYYY' ) : '';
                    } ) );

                    self._displayAssDateChanged = self.addDisposable( ko.computed( function() {
                        var date = self.assDateChanged();
                        return date ? moment( date ).format( 'DD.MM.YYYY' ) : '';
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var
                            code = unwrap( self.code );
                        if( !code ) {
                            self.canModifyHomeCatalog( false );
                        }
                    } ) );
                },
                /**
                 * Initializes default search inputs and so on.
                 */
                initDefaultSearch: function() {
                    var self = this;

                    function getFilledString( ch, len ) {
                        var i,
                            str = '';
                        for( i = 0; i < len; i++ ) {
                            str += ch;
                        }
                        return str;
                    }

                    function fillLeft( value, ch, len ) {
                        var str = getFilledString( ch, len );
                        return str.concat( value ).slice( len * -1 );
                    }

                    function getSeq( entry ) {
                        var seq = '';
                        if( entry.gruppe ) {
                            seq = fillLeft( entry.gruppe, '0', 2 );
                        }
                        if( entry.ort ) {
                            seq = fillLeft( entry.ort, '0', 2 );
                        }
                        if( entry.untergruppe ) {
                            seq = fillLeft( entry.untergruppe, '0', 2 );
                        }
                        if( entry.art ) {
                            seq = fillLeft( entry.art, '0', 1 );
                        }
                        if( entry.produkt ) {
                            seq = fillLeft( entry.produkt, '0', 3 );
                        }
                        return seq;
                    }

                    self.filterTypes = ['GRUPPE', 'ORT', 'UNTERGRUPPE', 'ART'];
                    self.searchTypes = ['ART', 'PRODUKT'];

                    self._assistiveSelected = ko.observable();
                    self._assistiveFilters = ko.observableArray();

                    self._assistiveFiltersDisplay = ko.computed( function() {
                        var assistiveFilters = self._assistiveFilters(),
                            nextCategory = '',
                            lastFilter = assistiveFilters[assistiveFilters.length - 1],
                            lastFilterIndexInTypes = lastFilter && lastFilter._data && self.filterTypes.indexOf( lastFilter._data.typ );
                        if( -1 !== lastFilterIndexInTypes && (lastFilterIndexInTypes + 1) < self.filterTypes.length ) {
                            nextCategory = _.capitalize( self.filterTypes[lastFilterIndexInTypes + 1].toLowerCase() );
                        } else if(-1 !== lastFilterIndexInTypes && (lastFilterIndexInTypes + 1) === self.filterTypes.length) {
                            nextCategory = 'Produkt';
                        }
                        return assistiveFilters.map( function( filter ) {
                            return getSeq( filter._data );
                        } ).concat( nextCategory ).filter( Boolean ).join( '.' );
                    } );

                    self.initAssistiveAutocompletes();
                },
                /**
                 * Initializes GHD search inputs and so on.
                 */
                initGHDSearch: function() {
                    var self = this;

                    self.catalogRef( "blalllalalla" );

                    self._assistiveGHDSearchAutoComplete = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                return null;
                            },
                            write: function( $event ) {
                                var entry = {};

                                if( $event.added ) {
                                    entry = self.mapGhdCatalogData( $event.added._data );
                                }
                                self.setActivityData( entry );
                            }
                        } ) ),
                        select2: {
                            placeholder: ASS_GHD_ENTRY,
                            allowClear: true,
                            dropdownAutoWidth: true,
                            dropdownCssClass: 'dc-select2-createActivityCodeAutoComplete',
                            query: function( query ) {
                                self.getGhdCatalogData( query );
                            }
                        }
                    };

                },
                /**
                 * Initializes autocompleter for 'code' field
                 * @method initSelect2Code
                 */
                initSelect2Code: function AssistiveEditorModel_initSelect2Code() {
                    var
                        self = this;

                    self._assistiveAliasAutoComplete = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var code = self.code();
                                if( !code ) {
                                    return null;
                                }
                                return {id: self.code(), text: self.code()};
                            },
                            write: function( $event ) {
                                var entry = {};
                                self.code( $event.val );
                                if( $event.added && $event.added._data ) {
                                    entry = $event.added._data;
                                    self.setActivityData( entry );
                                    self.canModifyHomeCatalog( true );
                                }
                            }
                        } ) ),
                        select2: {
                            placeholder: ASS_ALIAS,
                            allowClear: true,
                            dropdownAutoWidth: true,
                            dropdownCssClass: 'dc-select2-createActivityCodeAutoComplete',
                            query: function( query ) {
                                Y.doccirrus.jsonrpc.api.catalog.hmvCatalogUsageSearch( {
                                    query: {
                                        term: query.term,
                                        locationId: self.locationId.peek(),
                                        tags: self.selectedCatalogTags.peek()
                                    }
                                } ).done( function( response ) {

                                    var data = response.data;
                                    query.callback( {
                                        results: data.map( self.assistiveSelect2Mapper )
                                    } );

                                } );

                            },
                            formatResultCssClass: function( result ) {
                                var
                                    type = 'textform-homecatalog';
                                if( result._data && 0 !== result._data.count && !result._data.count ) {
                                    type = 'textform-originalcatalog';
                                }
                                return type;
                            },
                            createSearchChoice: function( term ) {
                                return {id: term, text: term};
                            }
                        }
                    };

                },
                /**
                 * @method assistiveSelect2Mapper
                 * @param {Object} item
                 * @return {Object}
                 */
                assistiveSelect2Mapper: function AssistiveEditorModel_assistiveSelect2Mapper( item ) {
                    if( !item ) {
                        return;
                    }
                    return {
                        id: item.typ ? item[item.typ.toLowerCase()] : item.seq || item.pzn || item.hmvNo,
                        text: item.bezeichnung || item.seq,
                        _data: item
                    };
                },
                /**
                 * @method filterMapper
                 * @param {Array} entries
                 * @returns {Object}
                 */
                filterMapper: function AssistiveEditorModel_filterMapper( entries ) {
                    var self = this,
                        filterQuery = {};

                    entries.forEach( function( entry ) {
                        var data = entry._data;
                        self.filterTypes.forEach( function( type ) {
                            var addFilter;
                            type = type.toLowerCase();
                            addFilter = data.typ === type.toUpperCase() && data[type];
                            if( addFilter && !Array.isArray( filterQuery[type] ) ) {
                                filterQuery[type] = {$in: []};
                            }
                            if( addFilter && data[type] ) {
                                filterQuery[type].$in.push( data[type] );
                            }
                        } );
                    } );
                    return filterQuery;
                },
                /**
                 * @method getCatalogData
                 * @param {String} type
                 * @param {Object} query
                 * @param {Object} filterQuery
                 */
                getCatalogData: function AssistiveEditorModel_getCatalogData( type, query, filterQuery, lastFilterEntry ) {
                    var
                        self = this,
                        indexOfLastFilterType,
                        queryType;

                    if('filter' === type && !lastFilterEntry){
                        queryType = self.filterTypes[0];
                    } else if('filter' === type && lastFilterEntry){
                        indexOfLastFilterType = self.filterTypes.indexOf(lastFilterEntry.typ);
                        if(-1 < indexOfLastFilterType && self.filterTypes[indexOfLastFilterType + 1]){
                            queryType = self.filterTypes[indexOfLastFilterType + 1];
                        } else {
                            queryType = 'DOES_NOT_EXIST';
                        }
                    } else {
                        queryType = self.searchTypes;
                    }

                    Y.doccirrus.jsonrpc.api.catalog.hmvSearch( {
                        query: {
                            type: queryType,
                            term: query.term,
                            filterQuery: filterQuery,
                            catalog: self.catalogRef.peek(),
                            locationId: self.locationId.peek(),
                            filter: 'filter' === type,
                            tags: self.selectedCatalogTags.peek()
                        }
                    } ).done( function( response ) {

                        var data = response.data;
                        query.callback( {
                            results: data.map( self.assistiveSelect2Mapper )
                        } );

                    } );

                },
                /**
                 * @method getCatalogData
                 * @param {String} type
                 * @param {Object} query
                 * @param {Object} filterQuery
                 */
                getGhdCatalogData: function AssistiveEditorModel_getCatalogData( query ) {
                    var
                        self = this;
                    Y.doccirrus.jsonrpc.api.catalog.ghdHmvSearch( {
                        query: {
                            term: query.term
                        }
                    } ).done( function( response ) {

                        var data = response.data;
                        query.callback( {
                            results: data.map( self.assistiveSelect2Mapper )
                        } );

                    } );

                },
                /**
                 * @method mapCatalogData
                 * @param {Object} data
                 * @returns {Object}
                 */
                mapCatalogData: function AssistiveEditorModel_mapCatalogData( data ) {
                    var entry = {};
                    entry.assDescription = data.bezeichnung;
                    entry.assId = data.seq;
                    entry.assManufacturer = data.hersteller;
                    entry.assCharacteristics = data.merkmale;
                    entry.assDateAdded = data.aufnahmedatum;
                    entry.assDateChanged = data.aenderungsdatum;
                    return entry;
                },
                /**
                 * @method mapGhdCatalogData
                 * @param {Object} data
                 * @returns {Object}
                 */
                mapGhdCatalogData: function AssistiveEditorModel_mapCatalogData( data ) {
                    var entry = {};
                    entry.assDescription = data.bezeichnung;
                    entry.assId = data.hmvNo;
                    entry.seq = data.pzn;
                    entry.assManufacturer = data.herstellerName;
                    return entry;
                },
                /**
                 * Initializes additional autocompleters
                 * @method initAssistiveAutocompletes
                 */
                initAssistiveAutocompletes: function AssistiveEditorModel_initAssistiveAutocompletes() {
                    var
                        self = this;
                    self._assistiveFilterAutoComplete = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                return self._assistiveFilters();
                            },
                            write: function( $event ) {
                                if( Y.Object.owns( $event, 'added' ) ) {
                                    self._assistiveFilters.push( $event.added );
                                }
                                if( Y.Object.owns( $event, 'removed' ) ) {
                                    self._assistiveFilters.remove( $event.removed );
                                }
                            }
                        } ) ),
                        select2: {
                            placeholder: ASS_CATEGORIES,
                            allowClear: true,
                            multiple: true,
                            query: function( query ) {
                                var _assistiveFilters = self._assistiveFilters(),
                                    lastEntry = _assistiveFilters && _assistiveFilters[_assistiveFilters.length - 1] && _assistiveFilters[_assistiveFilters.length - 1]._data,
                                    filterQuery = self.filterMapper( self._assistiveFilters() );
                                self.getCatalogData( 'filter', query, filterQuery, lastEntry );
                            }
                        }
                    };

                    self._assistiveSearchAutoComplete = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                return null;
                            },
                            write: function( $event ) {
                                var entry = {};

                                if( $event.added ) {
                                    entry = self.mapCatalogData( $event.added._data );
                                }
                                self.setActivityData( entry );
                            }
                        } ) ),
                        select2: {
                            placeholder: ASS_ENTRY,
                            allowClear: true,
                            dropdownAutoWidth: true,
                            dropdownCssClass: 'dc-select2-createActivityCodeAutoComplete',
                            query: function( query ) {
                                var filterQuery = self.filterMapper( self._assistiveFilters() );
                                self.getCatalogData( 'search', query, filterQuery );
                            }
                        }
                    };

                }
            }, {
                NAME: 'AssistiveEditorModel'
            }
        );

        KoViewModel.registerConstructor( AssistiveEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'CatalogBasedEditorModel',
            'JsonRpcReflection-doccirrus',
            'JsonRpc'
        ]
    }
);
