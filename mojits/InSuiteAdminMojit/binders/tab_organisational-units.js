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
        OrganisationalUnitModel = KoViewModel.getConstructor( 'OrganisationalUnitModel' ),
        i18n = Y.doccirrus.i18n,
        unwrap = ko.unwrap;

    /**
     * @class OrganisationalUnitsViewModel
     * @constructor
     * @extends KoViewModel
     */
    function OrganisationalUnitsViewModel() {
        OrganisationalUnitsViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( OrganisationalUnitsViewModel, KoViewModel.getBase(), {
        initializer: function() {
            let
                self = this;

            self.pageTitle = i18n( 'InSuiteAdminMojit.insuiteadmin.menuitem.ORGANISATIONAL_UNITS' );
            self.created = [];
            self.deleted = [];
            self.updated = [];
            self.numberOfRows = ko.observable();

            self.initOrganisationalUnitsViewModel();
        },

        initOrganisationalUnitsViewModel: function() {
            const
                self = this;

            self.initOrganisationalUnitsTable();
            self.initSaveButton();
        },

        loadData: function() {
            let
                self = this;

            Promise.all([
                Promise.resolve( Y.doccirrus.jsonrpc.api.organisationalunit.read() ),
                Promise.resolve( Y.doccirrus.jsonrpc.api.location.read( {options: {fields: {locname: 1}}}) )
                    .then( function( res ) {
                        self.locations = res.data || [];
                        self.locationsMap = self.locations.reduce( function( obj, item ) {
                            obj[item._id] = item;
                            return obj;
                        }, {} );
                    } )
            ])
                .then( function( res ){
                    const
                        organisationalUnits = res[0].data;

                    organisationalUnits.forEach( function( item ) {
                        self.organisationalUnitsTable.addRow( {data: item} );
                    } );
                    self.numberOfRows( organisationalUnits.length );
                });
        },

        initOrganisationalUnitsTable: function() {
            let
                self = this;

            self.organisationalUnitsTable = KoComponentManager.createComponent( {
                componentType: 'KoEditableTable',
                stateId: 'organisational-units-KoEditableTable',
                componentConfig: {
                    ViewModel: OrganisationalUnitModel,
                    columns: [
                        {
                            componentType: 'KoEditableTableColumnDrag'
                        },
                        {
                            forPropertyName: 'humanId',
                            label: i18n( 'organisationalunit-schema.OrganisationalUnit_T.humanId.i18n' ),
                            title: i18n( 'organisationalunit-schema.OrganisationalUnit_T.humanId.i18n' ),
                            width: '100px'
                        },
                        {
                            forPropertyName: 'name',
                            label: i18n( 'organisationalunit-schema.OrganisationalUnit_T.name.i18n' ),
                            title: i18n( 'organisationalunit-schema.OrganisationalUnit_T.name.i18n' )
                        },
                        {
                            forPropertyName: 'locations',
                            label: i18n( 'organisationalunit-schema.OrganisationalUnit_T.locations.i18n' ),
                            title: i18n( 'organisationalunit-schema.OrganisationalUnit_T.locations.i18n' ),
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
                                                    location = self.locationsMap[entry];
                                                return {
                                                    id: location._id,
                                                    text: location.locname
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
                                                results: self.locations.map( function( item ) {
                                                    return {
                                                        id: item._id,
                                                        text: item.locname
                                                    };
                                                } )
                                            };
                                        }
                                    }
                                }
                            },
                            renderer: function( meta ) {
                                let
                                    locations = ko.unwrap( meta.value );
                                return locations.map( function( item ) {
                                    return (self.locationsMap[item] && self.locationsMap[item].locname) || Y.doccirrus.i18n( 'IncaseAdminMojit.catalogusage_importexport.unknown_location' );
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
                                            unit = $context.$parent.row;
                                        if ( unit._id() ) {
                                            self.deleted.push( unit._id() );
                                        }
                                        self.organisationalUnitsTable.removeRow( unit );
                                    }
                                }
                            }
                        }
                    ],
                    draggableRows: true
                }
            } );

            self.organisationalUnitsTable.addRow = function( data ) {
                Object.getPrototypeOf( self.organisationalUnitsTable ).addRow.call( self.organisationalUnitsTable, data );
                let rows = unwrap( self.organisationalUnitsTable.rows );
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
                    name: 'saveOrganisationalUnits',
                    option: 'PRIMARY',
                    text: i18n( 'general.button.SAVE' ),
                    disabled: ko.computed( function() {
                        let
                            rows = unwrap(self.organisationalUnitsTable.rows),
                            isValid = true,
                            isModified = false;

                        rows.forEach( function( unit ) {
                            isValid = isValid && unit.isValid();
                            isModified = isModified || unit.isModified();
                        });
                        if ( rows.length !== self.numberOfRows() ) {
                            isModified = true;
                            self.numberOfRows( rows.length );
                        }

                        return !isValid || !isModified;
                    } ),
                    click: function updateOrganisationalUnits() {
                        let
                            rows = unwrap(self.organisationalUnitsTable.rows);

                        rows.forEach( function( unit ) {
                            if ( !unwrap(unit._id) ) {
                                self.created.push( unit );
                            } else if ( unit.isModified() ) {
                                self.updated.push( unit );
                            }
                        });

                        Promise.resolve( Y.doccirrus.jsonrpc.api.organisationalunit.updateCollection({
                            created: self.created,
                            updated: self.updated,
                            deleted: self.deleted
                        }))
                            .then(function( res ) {
                                const
                                    insertedUnits = res && res.data && res.data.insertedUnits && res.data.insertedUnits.ops || [],
                                    unitsFailedToDelete = res && res.data && res.data.unitsFailedToDelete;

                                if( unitsFailedToDelete ) {
                                    Y.doccirrus.modals.workStationDeletionPreventedModal.show( unitsFailedToDelete.message );
                                    self.deleted.forEach( function( deletedUnit ) {
                                        self.workStationsTable.addRow( {data: deletedUnit} );
                                    } );
                                }

                                self.updated.forEach( function ( unit ) {
                                    unit.setNotModified();
                                });

                                self.created.forEach( function ( unit ) {
                                    insertedUnits.forEach( function( insertedUnit ) {
                                        if ( unit.humanId() === insertedUnit.humanId ) {
                                            unit.set('data._id', insertedUnit._id);
                                            unit.setNotModified();
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
            Y.use( ['KoViewModel', 'KoEditableTable', 'OrganisationalUnitModel'], function() {
                ko.applyBindings( new OrganisationalUnitsViewModel(), node.getDOMNode() );
            } );
        },
        deregisterNode: function( node ) {
            ko.cleanNode( node.getDOMNode() );
        }
    };
};

