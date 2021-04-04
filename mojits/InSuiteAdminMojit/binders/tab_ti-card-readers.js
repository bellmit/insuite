/**
 * User: oliversieweke
 * Date: 10.04.18  16:55
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global fun:true,ko */
/*exported fun */
fun = function _fn( Y ) {
    'use strict';

    const
        KoUI = Y.doccirrus.KoUI,
        KoViewModel = Y.doccirrus.KoViewModel,
        KoComponentManager = KoUI.KoComponentManager,
        TiCardReaderModel = KoViewModel.getConstructor( 'TiCardReaderModel' ),
        i18n = Y.doccirrus.i18n,
        unwrap = ko.unwrap;

    /**
     * @class TiCardReadersViewModel
     * @constructor
     * @extends KoViewModel
     */
    function TiCardReadersViewModel() {
        TiCardReadersViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( TiCardReadersViewModel, KoViewModel.getBase(), {
        initializer: function() {
            let
                self = this;

            self.pageTitle = i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.TI_CARD_READERS' );
            self.created = [];
            self.deleted = [];
            self.updated = [];
            self.numberOfRows = ko.observable();

            self.initTiCardReadersViewModel();
        },

        initTiCardReadersViewModel: function() {
            const
                self = this;

            self.initCardReadersTable();
            self.initSaveButton();
        },

        loadData: function() {
            let
                self = this;

            Promise.all([
                Promise.resolve( Y.doccirrus.jsonrpc.api.ticardreader.read() ),
                Promise.resolve( Y.doccirrus.jsonrpc.api.organisationalunit.read( {options: {fields: {name: 1}}}) )
                    .then( function( res ) {
                        self.tiCardReaders = res.data || [];
                        self.tiCardReadersMap = self.tiCardReaders.reduce( function( obj, item ) {
                            obj[item._id] = item;
                            return obj;
                        }, {} );
                    } )
            ])
                .then( function( res ){
                    const
                        tiCardReaders = res[0].data;

                    tiCardReaders.forEach( function( item ) {
                        self.tiCardReadersTable.addRow( {data: item} );
                    } );
                    self.numberOfRows( tiCardReaders.length );
                });
        },

        initCardReadersTable: function() {
            let
                self = this;

            self.tiCardReadersTable = KoComponentManager.createComponent( {
                componentType: 'KoEditableTable',
                stateId: 'ti-card-readers-KoEditableTable',
                componentConfig: {
                    ViewModel: TiCardReaderModel,
                    columns: [
                        {
                            componentType: 'KoEditableTableColumnDrag'
                        },
                        {
                            forPropertyName: 'humanId',
                            label: i18n( 'ticardreader-schema.TiCardReader_T.humanId.i18n' ),
                            title: i18n( 'ticardreader-schema.TiCardReader_T.humanId.i18n' ),
                            width: '100px'
                        },
                        {
                            forPropertyName: 'name',
                            label: i18n( 'ticardreader-schema.TiCardReader_T.name.i18n' ),
                            title: i18n( 'ticardreader-schema.TiCardReader_T.name.i18n' )
                        },
                        {
                            forPropertyName: 'organisationalUnits',
                            label: i18n( 'ticardreader-schema.TiCardReader_T.organisationalUnits.i18n' ),
                            title: i18n( 'ticardreader-schema.TiCardReader_T.organisationalUnits.i18n' ),
                            inputField: {
                                componentType: 'KoFieldSelect2',
                                componentConfig: {
                                    useSelect2Data: true,
                                    select2Read: function( value ) {
                                        if( !value ) {
                                            return value;
                                        } else {
                                            return value.map( function( entry ) {
                                                const
                                                    organisationalUnit = self.tiCardReadersMap[entry];
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
                                    },
                                    select2Config: {
                                        multiple: true,
                                        query: undefined,
                                        initSelection: undefined,
                                        data: function() {
                                            return {
                                                results: self.tiCardReaders.map( function( item ) {
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
                                let
                                    tiCardReaders = ko.unwrap( meta.value );
                                return tiCardReaders.map( function( item ) {
                                    return self.tiCardReadersMap[item].name;
                                } ).join( ', ' );
                            }
                        },
                        {
                            forPropertyName: 'deleteButton',
                            utilityColumn: true,
                            width: '60px',
                            css: {
                                'text-center': 1
                            },
                            inputField: {
                                componentType: 'KoButton',
                                componentConfig: {
                                    name: 'delete',
                                    title: Y.doccirrus.i18n( 'general.button.DELETE' ),
                                    icon: 'TRASH_O',
                                    click: function( button, $event, $context ) {
                                        const
                                            cardReader = $context.$parent.row;
                                        if ( cardReader._id() ) {
                                            self.deleted.push( cardReader._id() );
                                        }
                                        self.tiCardReadersTable.removeRow( cardReader );
                                    }
                                }
                            }
                        }
                    ],
                    draggableRows: true
                }
            } );

            self.tiCardReadersTable.addRow = function( data ) {
                Object.getPrototypeOf( self.tiCardReadersTable ).addRow.call( self.tiCardReadersTable, data );
                let rows = unwrap( self.tiCardReadersTable.rows );
                if( rows.length > 1 ) {
                    let thisRow = rows[rows.length - 1];
                    let rowsWithoutNewlyAddedRow = rows.filter( function(row){return row !== thisRow;} );
                    thisRow.humanId.validationFunction.push( {
                        validator: function( val ) {
                            return !rowsWithoutNewlyAddedRow.find( function(row){return row.humanId() === val;} );
                        },
                        msg: i18n( 'InSuiteAdminMojit.tab_organisational-units.duplicateErrorMessage' )
                    } );
                }
            };

            this.loadData();
        },

        initSaveButton: function() {
            let
                self = this;

            self.saveButton = KoComponentManager.createComponent( {
                componentType: 'KoButton',
                componentConfig: {
                    name: 'saveTiCardReaders',
                    option: 'PRIMARY',
                    text: i18n( 'general.button.SAVE' ),
                    disabled: ko.computed( function() {
                        let
                            rows = unwrap(self.tiCardReadersTable.rows),
                            isValid = true,
                            isModified = false;

                        rows.forEach( function( cardReader ) {
                            isValid = isValid && cardReader.isValid();
                            isModified = isModified || cardReader.isModified();
                        });
                        if ( rows.length !== self.numberOfRows() ) {
                            isModified = true;
                            self.numberOfRows( rows.length );
                        }

                        return !isValid || !isModified;
                    } ),
                    click: function updateTiCardReaders() {
                        let
                            rows = unwrap(self.tiCardReadersTable.rows);

                        rows.forEach( function( cardReader ) {
                            if ( !unwrap(cardReader._id) ) {
                                self.created.push( cardReader );
                            } else if ( cardReader.isModified() ) {
                                self.updated.push( cardReader );
                            }
                        });

                        Promise.resolve( Y.doccirrus.jsonrpc.api.ticardreader.updateCollection({
                            created: self.created,
                            updated: self.updated,
                            deleted: self.deleted
                        }))
                            .then(function( res ) {
                                const
                                    insertedCardReaders = res && res.data && res.data.insertedUnits && res.data.insertedUnits.ops || [],
                                    cardReadersFailedToDelete = res && res.data && res.data.cardReadersFailedToDelete;

                                if( cardReadersFailedToDelete ) {
                                    Y.doccirrus.modals.workStationDeletionPreventedModal.show( cardReadersFailedToDelete.message );
                                    self.deleted.forEach( function( deletedCardReader ) {
                                        self.workStationsTable.addRow( {data: deletedCardReader} );
                                    } );
                                }

                                self.updated.forEach( function ( cardReader ) {
                                    cardReader.setNotModified();
                                });

                                self.created.forEach( function ( cardReader ) {
                                    insertedCardReaders.forEach( function( insertedUnit ) {
                                        if ( cardReader.humanId() === insertedUnit.humanId ) {
                                            cardReader.set('data._id', insertedUnit._id);
                                            cardReader.setNotModified();
                                        }
                                    });
                                });

                                self.numberOfRows.notifySubscribers();
                                self.created = [];
                                self.updated = [];
                                self.deleted = [];
                            });
                    }
                }
            } );
        }
    }, {
        ATTRS: {}
    } );

    return {
        registerNode: function( node ) {
            Y.use( ['KoViewModel', 'KoEditableTable', 'TiCardReaderModel'], function() {
                ko.applyBindings( new TiCardReadersViewModel(), node.getDOMNode() );
            } );
        },
        deregisterNode: function( node ) {
            ko.cleanNode( node.getDOMNode() );
        }
    };
};

