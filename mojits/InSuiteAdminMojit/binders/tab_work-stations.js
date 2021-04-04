/**
 * User: oliversieweke
 * Date: 10.04.18  16:55
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global fun:true,ko */ // eslint-disable-line no-unused-vars

fun = function _fn( Y ) {
    'use strict';

    const
        KoUI = Y.doccirrus.KoUI,
        KoViewModel = Y.doccirrus.KoViewModel,
        KoComponentManager = KoUI.KoComponentManager,
        WorkStationModel = KoViewModel.getConstructor( 'WorkStationModel' ),
        i18n = Y.doccirrus.i18n,
        unwrap = ko.unwrap;

    /**
     * @class WorkStationsViewModel
     * @constructor
     * @extends KoViewModel
     */
    function WorkStationsViewModel() {
        WorkStationsViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( WorkStationsViewModel, KoViewModel.getBase(), {
        initializer: function() {
            let
                self = this;

            self.pageTitle = i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.WORK_STATIONS' );
            self.created = [];
            self.deleted = [];
            self.updated = [];
            self.numberOfRows = ko.observable();

            self.initWorkStationsViewModel();
        },

        initWorkStationsViewModel: function() {
            const
                self = this;

            self.initWorkStationsTable();
            self.initSaveButton();
        },

        loadData: function() {
            let
                self = this;

            Promise.all([
                Promise.resolve( Y.doccirrus.jsonrpc.api.workstation.read() ),
                Promise.resolve( Y.doccirrus.jsonrpc.api.ticardreader.read( {options: {fields: {name: 1}}}) )
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
                        workStations = res[0].data;

                    workStations.forEach( function( item ) {
                        self.workStationsTable.addRow( {data: item} );
                    } );
                    self.numberOfRows( workStations.length );
                });
        },

        initWorkStationsTable: function() {
            let
                self = this;

            self.workStationsTable = KoComponentManager.createComponent( {
                componentType: 'KoEditableTable',
                stateId: 'work-stations-KoEditableTable',
                componentConfig: {
                    ViewModel: WorkStationModel,
                    columns: [
                        {
                            componentType: 'KoEditableTableColumnDrag'
                        },
                        {
                            forPropertyName: 'humanId',
                            label: i18n( 'workstation-schema.WorkStation_T.humanId.i18n' ),
                            title: i18n( 'workstation-schema.WorkStation_T.humanId.i18n' ),
                            width: '100px'
                        },
                        {
                            forPropertyName: 'name',
                            label: i18n( 'workstation-schema.WorkStation_T.name.i18n' ),
                            title: i18n( 'workstation-schema.WorkStation_T.name.i18n' )
                        },
                        {
                            forPropertyName: 'tiCardReaders',
                            label: i18n( 'workstation-schema.WorkStation_T.tiCardReaders.i18n' ),
                            title: i18n( 'workstation-schema.WorkStation_T.tiCardReaders.i18n' ),
                            visible: Y.doccirrus.auth.hasAdditionalService( 'inTi' ),
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
                                                    tiCardReaders = self.tiCardReadersMap[entry];
                                                return {
                                                    id: tiCardReaders._id,
                                                    text: tiCardReaders.name
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
                                const
                                    locations = ko.unwrap( meta.value );
                                return locations.map( function( item ) {
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
                                            workStation = $context.$parent.row;
                                        if ( workStation._id() ) {
                                            self.deleted.push( workStation.toJSON() );
                                        }
                                        self.workStationsTable.removeRow( workStation );
                                    }
                                }
                            }
                        }
                    ],
                    draggableRows: true
                }
            } );

            self.workStationsTable.addRow = function( data ) {
                Object.getPrototypeOf( self.workStationsTable ).addRow.call( self.workStationsTable, data );
                let rows = unwrap( self.workStationsTable.rows );
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
                    name: 'saveWorkStations',
                    option: 'PRIMARY',
                    text: i18n( 'general.button.SAVE' ),
                    disabled: ko.computed( function() {
                        let
                            rows = unwrap(self.workStationsTable.rows),
                            isValid = true,
                            isModified = false;

                        rows.forEach( function( workStation ) {
                            isValid = isValid && workStation.isValid();
                            isModified = isModified || workStation.isModified();
                        });
                        if ( rows.length !== self.numberOfRows() ) {
                            isModified = true;
                            self.numberOfRows( rows.length );
                        }

                        return !isValid || !isModified;
                    } ),
                    click: function updateWorkStations() {
                        const
                            rows = unwrap(self.workStationsTable.rows);

                        rows.forEach( function( workStation ) {
                            if ( !unwrap(workStation._id) ) {
                                self.created.push( workStation );
                            } else if ( workStation.isModified() ) {
                                self.updated.push( workStation );
                            }
                        });

                        Promise.resolve( Y.doccirrus.jsonrpc.api.workstation.updateCollection({
                            created: self.created,
                            updated: self.updated,
                            deleted: self.deleted.map( function( deletedWorkStation ) { return deletedWorkStation._id; } )
                        }))
                            .then(function( res ) {
                                const
                                    insertedWorkStations = res && res.data && res.data.insertedWorkStations && res.data.insertedWorkStations.ops || [],
                                    workStationFailedToDelete = res && res.data && res.data.workStationFailedToDelete;

                                if( workStationFailedToDelete ) {
                                    Y.doccirrus.modals.workStationDeletionPreventedModal.show( workStationFailedToDelete.message );
                                    self.deleted.forEach( function( deletedWorkStation ) {
                                        self.workStationsTable.addRow( {data: deletedWorkStation} );
                                    } );
                                }

                                self.updated.forEach( function ( workStation ) {
                                    workStation.setNotModified();
                                });

                                self.created.forEach( function ( workStation ) {
                                    insertedWorkStations.forEach( function( insertedWorkStation ) {
                                        if ( workStation.humanId() === insertedWorkStation.humanId ) {
                                            workStation.set('data._id', insertedWorkStation._id);
                                            workStation.setNotModified();
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
            Y.use( ['KoViewModel', 'KoEditableTable', 'WorkStationModel'], function() {
                ko.applyBindings( new WorkStationsViewModel(), node.getDOMNode() );
            } );
        },
        deregisterNode: function( node ) {
            ko.cleanNode( node.getDOMNode() );
        }
    };
};

