/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'InSetupImportExportTextBlocksViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        InSetupMojitViewModel = KoViewModel.getConstructor( 'InSetupMojitViewModel' );

    /**
     * @constructor
     * @class InSetupImportExportTextBlocksViewModel
     * @extends InSetupMojitViewModel
     */
    function InSetupImportExportTextBlocksViewModel() {
        InSetupImportExportTextBlocksViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( InSetupImportExportTextBlocksViewModel, InSetupMojitViewModel, {
            templateName: 'InSetupImportExportTextBlocksViewModel',
            /** @protected */
            initializer: function() {
                var
                    self = this;

                self.importExportModel = new Y.doccirrus.ImportExport.create( {
                    exportConfig: {
                        resolver: self.createGetData( Y.doccirrus.jsonrpc.api.textblocksimportexport.listSetOnDB,  {entries: {$not: {$size: 0}}} ),
                        enableDragDrop: false
                    },
                    importConfig: {
                        resolver: self.createGetData( Y.doccirrus.jsonrpc.api.textblocksimportexport.listSetOnDisk, {} ),
                        enableDragDrop: false
                    },
                    jsonRpcApiImportExport: Y.doccirrus.jsonrpc.api.textblocksimportexport,
                    metaDataFileName: 'textblocks_meta.json',
                    fileNamePrefix: 'textblocks-'
                } );

                self.importExportModel.isShowButtons( true );
            },

            createGetData: function( api, query ) {
                var
                    self = this;

                return function( node ) {
                    return new Promise( function( resolve, reject ) {
                        query = query || {};
                        api( {
                            query: ( node && node.id ) ? Object.assign ( {}, query, {_id: node.id } ) : query,
                            options: {
                                sort: {
                                    _id: 1
                                }
                            }
                        } )
                            .then( function( response ) {
                                return (response && response.data || []).map( function( data ){ return self.mapEntryToTreeNode( data, node ); } );
                            } )
                            .then( resolve )
                            .fail( function( response ) {
                                reject( response );
                            } );
                    } );
                };
            },

            mapEntryToTreeNode: function( entry, node ) {
                return {
                    id: entry._id,
                    text: entry.name,
                    totalCount: entry.totalCount,
                    entry: entry,
                    children: !Boolean( node )
                };
            },

            /** @protected */
            destructor: function() {
            }

        },
        {
            NAME: 'InSetupImportExportTextBlocksViewModel',
            ATTRS: {
                /**
                 * DCBinder
                 * @attribute binder
                 * @type {doccirrus.DCBinder}
                 * @default InCaseMojitBinder
                 */
                binder: {
                    valueFn: function() {
                        return Y.doccirrus.utils.getMojitBinderByType( 'InSetupMojit' );
                    }
                }
            }
        }
    );

    KoViewModel.registerConstructor( InSetupImportExportTextBlocksViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'InSetupMojitViewModel',
        'dcImportExport'
    ]
} );
