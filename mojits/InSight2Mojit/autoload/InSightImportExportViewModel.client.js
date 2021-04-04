/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI */
YUI.add( 'InSightImportExportViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        InSight2MojitViewModel = KoViewModel.getConstructor( 'InSight2MojitViewModel' );

    /**
     * @constructor
     * @class InSightImportExportViewModel
     * @extends InSight2MojitViewModel
     */
    function InSightImportExportViewModel() {
        InSightImportExportViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( InSightImportExportViewModel, InSight2MojitViewModel, {
            templateName: 'InSightImportExportViewModel',
            /** @protected */
            initializer: function() {
                var
                    self = this;

                self.importExportModel = new Y.doccirrus.RuleImportExport.create( {
                    exportConfig: {
                        resolver: self.createGetData( Y.doccirrus.jsonrpc.api.insight2importexport.listSetOnDB ),
                        enableDragDrop: false
                    },
                    importConfig: {
                        resolver: self.createGetData( Y.doccirrus.jsonrpc.api.insight2importexport.listSetOnDisk ),
                        enableDragDrop: false
                    },
                    jsonRpcApiImportExport: Y.doccirrus.jsonrpc.api.insight2importexport,
                    metaDataFileName: 'insight2_meta.json',
                    fileNamePrefix: 'reports-'
                } );

                self.importExportModel.isShowButtons( true );
            },

            createGetData: function( api ) {
                var
                    self = this;

                return function( /*node*/ ) {
                    return new Promise( function( resolve, reject ) {
                        var query = {};
                        api( {
                            query: query,
                            options: {
                                sort: {
                                    _id: 1
                                }
                            }
                        } )
                            .then( function( response ) {
                                return (response && response.data || []).map( self.mapEntryToTreeNode );
                            } )
                            .then( resolve )
                            .fail( function( response ) {
                                reject( response );
                            } );
                    } );
                };
            },

            mapEntryToTreeNode: function( entry ) {
                return {
                    id: entry._id,
                    text: entry.name,
                    totalCount: entry.totalCount,
                    entry: entry,
                    children: false
                };
            },

            /** @protected */
            destructor: function() {
            }

        },
        {
            NAME: 'InSightImportExportViewModel',
            ATTRS: {}
        }
    );

    KoViewModel.registerConstructor( InSightImportExportViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'InSight2MojitViewModel',
        'dcRuleImportExport'
    ]
} );
