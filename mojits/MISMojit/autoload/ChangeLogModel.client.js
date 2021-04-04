/**
 * User: do
 * Date: 10.12.19  15:37
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment, Promise */

'use strict';

YUI.add( 'ChangeLogModel', function( Y, NAME ) {
        /**
         * @module ChangeLogModel
         */

        var
            i18n = Y.doccirrus.i18n,
            CHANGE_LOG_HEADLINE = i18n( 'MISMojit.ChangeLogModelJS.headline' ),
            DATE_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
            getObject = Y.doccirrus.commonutils.getObject,
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @class ChangeLogModel
         * @constructor
         * @extends KoViewModel
         */
        function ChangeLogModel( config ) {
            ChangeLogModel.superclass.constructor.call( this, config );
        }

        Y.extend( ChangeLogModel, KoViewModel.getBase(), {
            initializer: function() {
                var
                    self = this;

                self.initChangeLogModel();
            },
            destructor: function() {
                var
                    self = this;
                self.destroySocketListeners();
            },
            initChangeLogModel: function() {
                self.
                    changeLogList = ko.observableArray();

                self.headlineI18n = CHANGE_LOG_HEADLINE;

                Promise.resolve( Y.doccirrus.jsonrpc.api.changelog.getChangeLogList() ).then( function( response ) {
                    self.changeLogList( (response.data.results || []).map( function( entry ) {
                        var splitVersion = entry.version.split( '-' );
                        if( splitVersion[0] === splitVersion[1] ) {
                            entry.display = splitVersion[0];
                            entry.title = 'Datum von Preis- und Medikamentenaktualisierung';
                        } else {
                            entry.display = entry.version;
                            entry.title = 'Datum von Medikamentenaktualisierung - Datum von Preisaktualisierung';
                        }
                        if( response.data.showPerLocation ) {
                            entry.display = [entry.display, ' ', '(', entry.locname, ')'].join( '' );
                        }

                        entry.content = ko.observable();
                        entry.collapsed = ko.observable( false );
                        return entry;
                    } ) );

                } ).catch( function( err ) {
                    Y.log( 'could not load change log list: ' + err, 'warn', NAME );
                } );

            },
            onVersionClick: function( versionEntry ) {
                if( versionEntry.collapsed() ) {
                    versionEntry.collapsed( false );
                    return;
                }
                if( versionEntry.content() ) {
                    versionEntry.collapsed( true );
                    return;
                }

                function resolveEnum( path, val ) {

                    var schema = Y.doccirrus.schemas.activity.schema,
                        schemaPath = path.replace( /\.(\d+)\./, '.0.' ),
                        schemaEntry = getObject( schemaPath, schema ),
                        schemaEntryList = schemaEntry && schemaEntry.list,
                        translation;

                    if( schemaEntryList ) {
                        schemaEntryList.some( function( listEntry ) {
                            if( listEntry.val === val ) {
                                translation = listEntry.i18n;
                                return true;
                            }
                        } );
                    }
                    return translation || val;
                }

                function isPrice( path ) {
                    return [
                               'phPriceSale',
                               'phPriceRecommended',
                               'phPatPay',
                               'phFixedPay'
                           ].indexOf( path ) !== -1;
                }

                function toPrice( val ) {
                    if( !val && 0 !== val || val === -1 ) {
                        return '';
                    }
                    return Y.doccirrus.comctl.numberToLocalString( val );
                }

                Promise.resolve( Y.doccirrus.jsonrpc.api.changelog.getChangeLog( {
                    query: {
                        version: versionEntry.version,
                        catalogShort: versionEntry.catalogShort,
                        locationId: versionEntry.locationId
                    }
                } ) ).then( function( response ) {
                    versionEntry.content( (response.data || []).map( function( entry ) {
                        if( !entry.diff ) {
                            entry.diff = {values: []};
                        }
                        if( !entry.comment ) {
                            entry.comment = '';
                        }
                        entry.diff.values = entry.diff.values.filter( function( diffEntry ) {
                            return diffEntry.changed;
                        } ).map( function( diff ) {
                            if( 'Date' === diff.type ) {
                                if( diff.aVal ) {
                                    diff.aVal = moment( diff.aVal ).format( DATE_FORMAT );
                                }
                                if( diff.bVal ) {
                                    diff.bVal = moment( diff.bVal ).format( DATE_FORMAT );
                                }
                            } else if( 'Number' === diff.type && isPrice( diff.path ) ) {
                                if( diff.aVal ) {
                                    diff.aVal = toPrice( diff.aVal );
                                }
                                if( diff.bVal ) {
                                    diff.bVal = toPrice( diff.bVal );
                                }
                            } else if( 'Boolean' === diff.type ) {
                                diff.aVal = diff.aVal ? 'An' : 'Aus';
                                diff.bVal = diff.bVal ? 'An' : 'Aus';
                            } else if( diff.isEnum && 'String' === diff.type ) {
                                diff.aVal = resolveEnum( diff.path, diff.aVal );
                                diff.bVal = resolveEnum( diff.path, diff.bVal );
                            } else if( diff.isEnum && '[String]' === diff.type ) {
                                if( Array.isArray( diff.aVal ) ) {
                                    diff.aVal = diff.aVal.map( function( str ) {
                                        return resolveEnum( diff.path, str );
                                    } );
                                    diff.bVal = diff.bVal.map( function( str ) {
                                        return resolveEnum( diff.path, str );
                                    } );
                                }
                            }
                            return diff;
                        } );
                        return entry;
                    } ) );
                    versionEntry.collapsed( true );
                } ).catch( function( err ) {
                    Y.log( 'could not change log version ' + versionEntry.version + ' for catalogShort: ' + versionEntry.catalogShort + ': ' + err, 'warn', NAME );
                } );
            }
        }, {
            NAME: 'ChangeLogModel',
            ATTRS: {}
        } );

        KoViewModel.registerConstructor( ChangeLogModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'doccirrus',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'promise',
            'KoViewModel',
            'activity-schema'
        ]
    }
);