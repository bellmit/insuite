/**
 * User: maximilian.kramp
 * Date: 30.09.19  09:37
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global fun:true,ko */
/*exported fun */
fun = function _fn( Y, NAME ) {
    'use strict';

    var
        KoUI = Y.doccirrus.KoUI,
        KoViewModel = Y.doccirrus.KoViewModel,
        KoComponentManager = KoUI.KoComponentManager,
        TiSMCBModel = KoViewModel.getConstructor( 'TiSMCBModel' ),
        i18n = Y.doccirrus.i18n,
        unwrap = ko.unwrap;

    /**
     * @class TiSMCBViewModel
     * @constructor
     * @extends KoViewModel
     */
    function TiSMCBViewModel() {
        TiSMCBViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( TiSMCBViewModel, KoViewModel.getBase(), {
        initializer: function() {
            var
                self = this;

            self.pageTitle = i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.TI_SMCB' );
            self.warningTextI18n = i18n( 'tismcb-schema.TiSMCB_T.warningText' );
            self.created = [];
            self.deleted = [];
            self.updated = [];
            self.numberOfRows = ko.observable();

            self.initTiSMCBViewModel();
        },

        initTiSMCBViewModel: function() {
            var
                self = this;

            self.initTiSMCBTable();
            self.initReloadButton();
        },

        loadData: function() {
            var
                self = this;

            Promise.all( [
                Promise.resolve( Y.doccirrus.jsonrpc.api.tismcb.read() ),
                Promise.resolve( Y.doccirrus.jsonrpc.api.organisationalunit.read( {options: {fields: {name: 1}}} ) )
                    .then( function( res ) {
                        self.tiSmcbs = res.data || [];
                        self.tiSmcbsMap = self.tiSmcbs.reduce( function( obj, item ) {
                            obj[item._id] = item;
                            return obj;
                        }, {} );
                    } )
            ] )
                .then( function( res ) {
                    var tiSmcbs = res[0].data;
                    tiSmcbs.forEach( function( item ) {
                        item.organisationalUnits = item.organisationalUnits.filter( function( unit ) {
                            return self.tiSmcbsMap[unit];
                        } );
                        self.tiSmcbsTable.addRow( {data: item} );
                    } );
                    self.numberOfRows( tiSmcbs.length );
                } );
        },

        initTiSMCBTable: function() {
            var self = this;

            self.tiSmcbsTable = KoComponentManager.createComponent( {
                componentType: 'KoEditableTable',
                stateId: 'ti-smcb-KoEditableTable',
                componentConfig: {
                    ViewModel: TiSMCBModel,
                    columns: [
                        {
                            forPropertyName: 'iccsn',
                            label: i18n( 'tismcb-schema.TiSMCB_T.iccsn' ),
                            title: i18n( 'tismcb-schema.TiSMCB_T.iccsn' ),
                            width: '20%'
                        },
                        {
                            forPropertyName: 'name',
                            label: i18n( 'tismcb-schema.TiSMCB_T.name' ),
                            title: i18n( 'tismcb-schema.TiSMCB_T.name' ),
                            width: '35%'
                        },
                        {
                            forPropertyName: 'organisationalUnits',
                            label: i18n( 'tismcb-schema.TiSMCB_T.organisationalUnits' ),
                            title: i18n( 'tismcb-schema.TiSMCB_T.organisationalUnits' ),
                            width: '40%',
                            inputField: {
                                componentType: 'KoFieldSelect2',
                                componentConfig: {
                                    useSelect2Data: true,
                                    select2Read: function( value ) {
                                        if( !value ) {
                                            return value;
                                        } else {
                                            return value.map( function( entry ) {
                                                var organisationalUnit = self.tiSmcbsMap[entry];
                                                return {
                                                    id: organisationalUnit._id,
                                                    text: organisationalUnit.name
                                                };
                                            } );
                                        }
                                    },
                                    select2Write: function( $event, observable ) {
                                        if( $event.added ) {
                                            observable.push( $event.added.id );
                                        }
                                        if( $event.removed ) {
                                            observable.remove( function( item ) {
                                                return item === $event.removed.id;
                                            } );
                                        }

                                        var rows = unwrap( self.tiSmcbsTable.rows );

                                        rows.forEach( function( unit ) {
                                            if( !unwrap( unit._id ) ) {
                                                self.created.push( unit );
                                            } else if( unit.isModified() ) {
                                                self.updated.push( unit );
                                            }
                                        } );

                                        Promise.resolve( Y.doccirrus.jsonrpc.api.tismcb.updateCollection( {
                                            created: self.created,
                                            updated: self.updated,
                                            deleted: self.deleted
                                        } ) )
                                            .then( function( res ) {
                                                var
                                                    insertedUnits = res && res.data && res.data.insertedUnits && res.data.insertedUnits.ops || [],
                                                    unitsFailedToDelete = res && res.data && res.data.unitsFailedToDelete;

                                                if( unitsFailedToDelete ) {
                                                    Y.doccirrus.modals.workStationDeletionPreventedModal.show( unitsFailedToDelete.message );
                                                    self.deleted.forEach( function( deletedUnit ) {
                                                        self.workStationsTable.addRow( {data: deletedUnit} );
                                                    } );
                                                }

                                                self.updated.forEach( function( unit ) {
                                                    unit.setNotModified();
                                                } );

                                                self.created.forEach( function( unit ) {
                                                    insertedUnits.forEach( function( insertedUnit ) {
                                                        if( unit.iccsn() === insertedUnit.iccsn ) {
                                                            unit.set( 'data._id', insertedUnit._id );
                                                            unit.setNotModified();
                                                        }
                                                    } );
                                                } );

                                                self.numberOfRows.notifySubscribers();
                                                self.created = [];
                                                self.updated = [];
                                                self.deleted = [];
                                            } ).then( function() {
                                            self.checkForTiErrors();
                                        } );
                                    },
                                    select2Config: {
                                        multiple: true,
                                        query: undefined,
                                        initSelection: undefined,
                                        data: function() {
                                            return {
                                                results: self.tiSmcbs.map( function( item ) {
                                                    return {
                                                        id: item._id,
                                                        text: item.name
                                                    };
                                                } )
                                            };
                                        }
                                    }
                                }
                            },
                            renderer: function( meta ) {
                                var tiSmcbs = ko.unwrap( meta.value );
                                return tiSmcbs.map( function( item ) {
                                    return self.tiSmcbsMap[item].name;
                                } ).join( ', ' );
                            }
                        }
                    ],
                    draggableRows: false
                }
            } );

            this.loadData();
        },

        initReloadButton: function() {
            var
                self = this,
                data;

            self.reloadButton = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'reloadTiSMCB',
                    option: 'PRIMARY',
                    text: i18n( 'FormEditorMojit.status_messages.RELOADING' ),
                    click: function() {
                        Y.doccirrus.communication.apiCall( {
                            method: 'ticontext.reloadSMCBs'
                        }, function( err, res ) {
                            if( err ) {
                                data = err && err.data && Array.isArray( err.data ) && err.data[0] && err.data[0].message;
                                Y.doccirrus.DCSystemMessages.addMessage( {
                                    messageId: 'tab_tismcb',
                                    content: data,
                                    level: 'ERROR'
                                } );
                            } else if( res ) {
                                self.tiSmcbsTable.removeAllRows();
                                self.loadData();
                                self.checkForTiErrors();
                            }
                        } );
                    }
                }
            } );
        },

        checkForTiErrors: function() {
            var
                misconfiguredTi = false,
                i,
                listOfMisconfiguredSMCBs = [],
                smcbCardsList,
                tmpLen,
                tmpMandantId;

            Y.doccirrus.communication.apiCall( {
                method: 'ticontext.tiForPatientBrowser'
            }, function( err, res ) {
                if( err ) {
                    Y.log( 'TI-tiForPatientBrowser: Error in getting configuration parameters in patient browser: ' + err, 'error', NAME );
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: 'tiForPatientBrowser',
                        content: Y.doccirrus.errorTable.getMessages( err ),
                        level: 'WARNING'
                    } );
                } else if( res && res.data ) {
                    smcbCardsList = res.data.SMCBCards;
                    tmpLen = Object.keys( smcbCardsList );

                    for( i = 0; i < tmpLen.length; i++ ) {
                        tmpMandantId = tmpLen[i];
                        if( smcbCardsList[tmpMandantId].length > 1 ) {
                            misconfiguredTi = true;
                            listOfMisconfiguredSMCBs.push( tmpMandantId );
                        }
                    }

                    if( misconfiguredTi ) {
                        Y.doccirrus.DCSystemMessages.addMessage( {
                            messageId: 'tab_tismcb',
                            content: i18n( 'InTiMojit.tiConfigurations.misconfiguredTiMessage', {
                                data: {
                                    smcbs: listOfMisconfiguredSMCBs.join( ', ' )
                                }
                            } ),
                            level: 'ERROR'
                        } );
                    }
                }
            } );
        }
    }, {
        ATTRS: {}
    } );

    return {
        registerNode: function( node ) {
            ko.applyBindings( new TiSMCBViewModel(), node.getDOMNode() );
        },
        deregisterNode: function( node ) {
            ko.cleanNode( node.getDOMNode() );
        }
    };
};

