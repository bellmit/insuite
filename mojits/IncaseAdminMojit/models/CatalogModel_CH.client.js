/**
 * User: oliversieweke
 * Date: 05.02.19  18:09
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, ko*/
YUI.add( 'CatalogModel_CH', function( Y/*, NAME*/ ) {
    'use strict';

    /**
     * @module CatalogModel_CH
     */

    var i18n = Y.doccirrus.i18n;
    var KoUI = Y.doccirrus.KoUI;
    var KoViewModel = Y.doccirrus.KoViewModel;
    var KoComponentManager = KoUI.KoComponentManager;
    var TarmedDignitiesModel = KoViewModel.getConstructor( 'TarmedDignitiesModel' );
    var TARMED_DIGNITIES = i18n( 'IncaseAdminMojit.incase_tab_catalogs.title.TARMED_DIGNITIES' );
    var CATALOG_ENTRY = i18n( 'catalog-schema.TarmedDignity_T.catalogExtension.CATALOG_ENTRY' );
    var CUSTOM_ENTRY = i18n( 'catalog-schema.TarmedDignity_T.catalogExtension.CUSTOM_ENTRY' );
    var ADD_DIGNITY_BTN = i18n( 'IncaseAdminMojit.incase_tab_catalogs.buttons.ADD_DIGNITY' );
    var EDIT_DIGNITY_BTN = i18n( 'IncaseAdminMojit.incase_tab_catalogs.buttons.EDIT_DIGNITY' );
    var REMOVE_DIGNITY_BTN = i18n( 'IncaseAdminMojit.incase_tab_catalogs.buttons.REMOVE_DIGNITY' );
    var ADD_QUALI_DIGNITY = i18n( 'IncaseAdminMojit.incase_tab_catalogs.modals.ADD_QUALI_DIGNITY' );
    var EDIT_QUALI_DIGNITY = i18n( 'IncaseAdminMojit.incase_tab_catalogs.modals.EDIT_QUALI_DIGNITY' );
    var ADD_QUANTI_DIGNITY = i18n( 'IncaseAdminMojit.incase_tab_catalogs.modals.ADD_QUANTI_DIGNITY' );
    var EDIT_QUANTI_DIGNITY = i18n( 'IncaseAdminMojit.incase_tab_catalogs.modals.EDIT_QUANTI_DIGNITY' );

    function CatalogModel_CH() {
    // ============================================================================================================== \\
    // ===========================================  ADD DIGNITIES SECTION =========================================== \\
        if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
            this.sideBarNavItems.push( {
                id: 'TARMED_DIGNITIES',
                title: TARMED_DIGNITIES
            } );
        }

    // ============================================================================================================== \\
    // ==============================================  QUALI DIGNITIES ============================================== \\
        this.qualiDignitiesI18n = i18n( 'IncaseAdminMojit.incase_tab_catalogs.title.TARMED_QUALI_DIGNITIES' );
        this.tarmedDignitiesTable_quali = this.createDignityTable( 'quali' );
        this.addButtons( this.tarmedDignitiesTable_quali, 'quali' );

    // ============================================================================================================== \\
    // =============================================  QUANTI DIGNITIES ============================================== \\
        this.quantiDignitiesI18n = i18n( 'IncaseAdminMojit.incase_tab_catalogs.title.TARMED_QUANTI_DIGNITIES' );
        this.tarmedDignitiesTable_quanti = this.createDignityTable( 'quanti' );
        this.addButtons( this.tarmedDignitiesTable_quanti, 'quanti' );
    }

    // ============================================================================================================== \\
    // ============================================== COMMON METHODS ================================================ \\
    Object.assign( CatalogModel_CH.prototype, {
        getTarmedDignities: function( type ) {
            var self = this;
            return function getTarmedDignitesForType( params ) {
                return Y.doccirrus.jsonrpc.api.catalog.getTarmedDignities( {...params, type: type} )
                    .fail( self.notice );
            };
        },
        createDignityTable: function( type ) {
            return KoComponentManager.createComponent( {
                componentType: 'KoTable',
                stateId: 'tarmedQualiDignities-KoEditableTable_' + type + '-KoEditableTable',
                componentConfig: {
                    ViewModel: TarmedDignitiesModel,
                    remote: true,
                    proxy: this.getTarmedDignities( type ),
                    columns: [
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'select',
                            label: ''
                        },
                        {
                            forPropertyName: 'code',
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.IREGEX_OPERATOR,
                            label: i18n( 'catalog-schema.TarmedDignity_T.code.i18n' ),
                            title: i18n( 'catalog-schema.TarmedDignity_T.code.i18n' ),
                            width: '100px'
                        },
                        {
                            forPropertyName: 'text',
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.IREGEX_OPERATOR,
                            label: i18n( 'catalog-schema.TarmedDignity_T.text.i18n' ),
                            title: i18n( 'catalog-schema.TarmedDignity_T.text.i18n' )
                        },
                        {
                            forPropertyName: 'catalogExtension',
                            isSortable: true,
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.CATALOG_EXTENSION_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: [
                                    {
                                        text: CATALOG_ENTRY,
                                        value: false
                                    },
                                    {
                                        text: CUSTOM_ENTRY,
                                        value: true
                                    }
                                ],
                                optionsText: 'text',
                                optionsValue: 'value',
                                select2Config: {
                                    multiple: false
                                }
                            },
                            label: i18n( 'catalog-schema.TarmedDignity_T.catalogExtension.i18n' ),
                            title: i18n( 'catalog-schema.TarmedDignity_T.catalogExtension.i18n' ),
                            renderer: function( meta ) {
                                var catalogExtension = ko.unwrap( meta.value );
                                return catalogExtension ? CUSTOM_ENTRY : CATALOG_ENTRY;
                            }
                        }
                    ],
                    getCssRow: function( $context, css ) {
                        if( !$context.$data.catalogExtension ) {
                            css.success = true;
                        }
                    }
                }
            } );
        },
        addButtons: function( table, type ) {
            var self = this;
            // Add Button ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            self['addDignityBtn_' + type] = KoComponentManager.createComponent( { // addDignityBtn_quali || addDignityBtn_quanti
                componentType: 'KoButton',
                componentConfig: {
                    text: ADD_DIGNITY_BTN,
                    click: function() {
                        self.showDignityEditDialog( type, table );
                    }
                }
            } );

            // Edit Button •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            self['editDignityBtn_' + type] = KoComponentManager.createComponent( { // editDignityBtn_quali || editDignityBtn_quanti
                componentType: 'KoButton',
                componentConfig: {
                    text: EDIT_DIGNITY_BTN,
                    disabled: ko.computed( function() {
                        var checkedRows = table.getComponentColumnCheckbox().checked();
                        var checkedCatalogEntries = checkedRows.filter( function( entry ) {
                            return !entry.catalogExtension;
                        } );
                        return checkedRows.length !== 1 || checkedCatalogEntries.length; // We don't want to allow the editing of original catalog entries
                    } ),
                    click: function() {
                        self.showDignityEditDialog( type, table );
                    }
                }
            } );
            // Delete Button •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            self['removeDignityBtn_' + type] = KoComponentManager.createComponent( { // removeDignityBtn_quali || removeDignityBtn_quanti
                componentType: 'KoButton',
                componentConfig: {
                    text: REMOVE_DIGNITY_BTN,
                    disabled: ko.computed( function() {
                        var checkedRows = table.getComponentColumnCheckbox().checked();
                        var checkedCatalogEntries = checkedRows.filter( function( entry ) {
                            return !entry.catalogExtension;
                        } );
                        return !checkedRows.length || checkedCatalogEntries.length; // We don't want to allow the editing of original catalog entries
                    } ),
                    click: function removeQualiDignities() {
                        var idsToRemove = table.getComponentColumnCheckbox().checked().map( function( entry ) {
                            return entry._id;
                        } );

                        Y.doccirrus.jsonrpc.api.catalog.delete( {
                            query: {
                                _id: {$in: idsToRemove}
                            }
                        } )
                            .done( table.reload.bind( table ) )
                            .fail( self.notice );
                    }
                }
            } );
        },
        showDignityEditDialog: function showDignityEditDialog( type, table ) {
            var self = this;
            var dignityEntry = table.getComponentColumnCheckbox().checked()[0] || null;

            return Y.doccirrus.jsonrpc.api.jade.renderFile( {path: 'IncaseAdminMojit/views/incase_tab_tarmed_dignities_editor'} )
                .then( function( response ) {
                    var bodyContent = Y.Node.create( response.data );
                    var model = new TarmedDignitiesModel( {dignityEntry: dignityEntry, type: type} );
                    var title;

                    if( type === 'quali' ) {
                        title = dignityEntry ? EDIT_QUALI_DIGNITY : ADD_QUALI_DIGNITY;
                    } else if( type === 'quanti' ) {
                        title = dignityEntry ? EDIT_QUANTI_DIGNITY : ADD_QUANTI_DIGNITY;
                    }

                    var modal = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-DignityEditDialog',
                        icon: Y.doccirrus.DCWindow.ICON_LIST,
                        title: title,
                        bodyContent: bodyContent,
                        centered: true, modal: true, dragable: true, maximizable: true, resizeable: true,
                        render: document.body,
                        width: Y.doccirrus.DCWindow.SIZE_LARGE,
                        buttons: {
                            header: ['close'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                    action: function() {
                                        return this.close();
                                    }
                                } ),
                                Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                    isDefault: true,
                                    action: function() {
                                        var data = model.toJSON();
                                        var method = data._id ? 'update' : 'create';
                                        var params = {
                                            data: data,
                                            query: data._id && {_id: data._id},
                                            fields: data._id && ['code', 'text']
                                        };

                                        Y.doccirrus.jsonrpc.api.catalog[method]( params ) // catalog.create || catalog.update
                                            .done( function() {
                                                modal.close();
                                                table.reload();
                                            } )
                                            .fail( self.notice );
                                    }
                                } )
                            ]
                        }
                    } );
                    ko.computed( function() {
                        var modelIsValid = model._isValid();
                        var saveButton = modal.getButton( 'SAVE' ).button;

                        return modelIsValid ? saveButton.enable() : saveButton.disable();
                    } );

                    ko.applyBindings( model, bodyContent.getDOMNode() );
                } );
        },
        notice: function( err ) {
            return Y.doccirrus.DCWindow.notice( {
                message: Y.doccirrus.errorTable.getMessage( err )
            } );
        }
    } );

    Y.namespace( 'doccirrus.countryextensions' ).CatalogModel_CH = CatalogModel_CH;

}, '0.0.1', {
    requires: ['KoViewModel', 'KoEditableTable', 'TarmedDignitiesModel']
} );