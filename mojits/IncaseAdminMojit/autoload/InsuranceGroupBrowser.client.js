/**
 * User: do
 * Date: 17.10.18  16:53
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'InsuranceGroupBrowser', function( Y, NAME ) {
        /**
         * @module InsuranceGroupBrowser
         */

        var
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            KoViewModel = Y.doccirrus.KoViewModel,
            InsuranceGroupModel = KoViewModel.getConstructor( 'InsuranceGroupModel' ),
            i18n = Y.doccirrus.i18n,
            GROUP_NAME = i18n( 'insurancegroup-schema.InsuranceGroup_T.name' ),
            GROUP_ITEMS = i18n( 'insurancegroup-schema.InsuranceGroup_T.items' ),
            GROUP_ITEM_SERIAL_NO = i18n( 'insurancegroup-schema.InsuranceGroupItem_T.serialNo' ),
            GROUP_CONTENT_VKNR = i18n( 'insurancegroup-schema.InsuranceGroupItemContent_T.vknr' ),
            GROUP_CONTENT_NAME = i18n( 'insurancegroup-schema.InsuranceGroupItemContent_T.name' ),
            CANCEL = i18n( 'general.button.CANCEL' ),
            SAVE = i18n( 'general.button.SAVE' ),
            ADD_INSURANCES_BTN = i18n( 'IncaseAdminMojit.InsuranceGroupBrowserJS.buttons.text.addInsurancesBtn' ),
            REMOVE_INSURANCES_BTN = i18n( 'IncaseAdminMojit.InsuranceGroupBrowserJS.buttons.text.removeInsurancesBtn' );

        function showError( response ) {
            var errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );
            Y.doccirrus.DCWindow.notice( {
                type: 'error',
                window: {width: 'small'},
                message: errors.join( '<br>' )
            } );
        }

        function itemToJson( item ) {
            return item.toJSON();
        }

        /**
         * @class InsuranceGroupBrowser
         * @constructor
         * @extends ActivityModel
         */
        function InsuranceGroupBrowser( config ) {
            InsuranceGroupBrowser.superclass.constructor.call( this, config );
        }

        InsuranceGroupBrowser.ATTRS = {};

        Y.extend( InsuranceGroupBrowser, KoViewModel.getBase(), {

                initializer: function InsuranceGroupBrowser_initializer() {
                    var
                        self = this;
                    self.initInsuranceGroupBrowser();
                },
                destructor: function InsuranceGroupBrowser_destructor() {
                },
                initInsuranceGroupBrowser: function InsuranceGroupBrowser_initInsuranceGroupBrowser() {
                    var self = this;

                    self.selected = ko.observable( null );
                    self.selectedContent = ko.computed( function() {
                        var selected = self.selected();
                        if( !selected ) {
                            return [];
                        }
                        return selected.items().map( itemToJson );
                    } );
                    // stores original items while editing to reset on cancel
                    self.originalSelectedContent = [];

                    self.insuranceGroupTable = KoComponentManager.createComponent( {
                        componentType: 'KoEditableTable',
                        componentConfig: {
                            stateId: 'InsuranceGroupBrowser-insuranceGroupTable',
                            ViewModel: InsuranceGroupModel,
                            sharedViewModelData: {
                                getTableInstance: function() {
                                    return self.insuranceGroupTable;
                                }
                            },
                            data: self.initialConfig.data,
                            columns: [
                                {
                                    label: GROUP_NAME,
                                    text: GROUP_NAME,
                                    width: '20%',
                                    forPropertyName: 'name'
                                },
                                {
                                    label: GROUP_ITEMS,
                                    text: GROUP_ITEMS,
                                    forPropertyName: 'items',
                                    renderer: function( meta ) {
                                        var items = unwrap( meta.value );

                                        return items.map( function( item ) {
                                            var content = unwrap( item.content );
                                            return content.map( function( entry ) {
                                                return '<span class="badge">' + unwrap( entry.name ) + '</span>';
                                            } ).join( '' );
                                        } ).join( '' );
                                    }
                                },
                                {
                                    forPropertyName: 'editButton',
                                    utilityColumn: true,
                                    width: '60px',
                                    css: {
                                        'text-center': 1
                                    },
                                    inputField: {
                                        componentType: 'KoButton',
                                        componentConfig: {
                                            name: 'delete',
                                            title: i18n( 'general.button.EDIT' ),
                                            icon: 'PENCIL',
                                            click: function( button, $event, $context ) {
                                                self.editInsuranceGroup( $context.$parent.row );
                                            }
                                        }
                                    }
                                },
                                {
                                    forPropertyName: 'saveButton',
                                    utilityColumn: true,
                                    width: '60px',
                                    css: {
                                        'text-center': 1
                                    },
                                    inputField: {
                                        componentType: 'KoButton',
                                        componentConfig: {
                                            name: 'save',
                                            title: i18n( 'general.button.SAVE' ),
                                            icon: 'FILE_TEXT_O',
                                            click: function( button, $event, $context ) {
                                                $context.$parent.row.save().catch( function( response ) {
                                                    Y.log( 'could not save insurance group: ' + response, 'error', NAME );
                                                    showError( response );
                                                } );
                                            }
                                        }
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
                                            title: i18n( 'general.button.DELETE' ),
                                            icon: 'TRASH_O',
                                            click: function( button, $event, $context ) {
                                                $context.$parent.row.remove().then( function() {
                                                    self.insuranceGroupTable.removeRow( $context.$parent.row );
                                                } ).catch( function( response ) {
                                                    Y.log( 'could not remove insurance group: ' + response, 'error', NAME );
                                                    showError( response );
                                                } );
                                            }
                                        }
                                    }
                                }
                            ],
                            onAddButtonClick: function() {
                                self.insuranceGroupTable.addRow( {
                                    data: {
                                        name: '',
                                        items: []
                                    }
                                } );
                                return false;
                            },
                            onRowClick: function( meta ) {
                                if( meta.col.forPropertyName === 'items' ) {
                                    self.editInsuranceGroup( meta.row );
                                }
                                return false;
                            }
                        }
                    } );

                    self.insuranceGroupSearchTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                        componentType: 'KoTable',
                        componentConfig: {
                            fillRowsToLimit: false,
                            remote: true,
                            proxy: Y.doccirrus.jsonrpc.api.insurancegroup.search,
                            baseParams: self.addDisposable( ko.computed( function() {
                                var selectedContent = (self.selectedContent() || []).map( function( content ) {
                                    return content.serialNo;
                                } );
                                return {selectedContent: selectedContent};
                            } ) ),
                            columns: [
                                {
                                    componentType: 'KoTableColumnCheckbox',
                                    forPropertyName: 'checked',
                                    label: '',
                                    checkMode: 'multi',
                                    allToggleVisible: true
                                },
                                {
                                    label: GROUP_ITEM_SERIAL_NO,
                                    text: GROUP_ITEM_SERIAL_NO,
                                    width: '20%',
                                    forPropertyName: 'serialNo',
                                    isSortable: true,
                                    isFilterable: true
                                },
                                {
                                    label: GROUP_CONTENT_VKNR,
                                    text: GROUP_CONTENT_VKNR,
                                    width: '20%',
                                    forPropertyName: 'content.vknr',
                                    queryFilterType: Y.doccirrus.DCQuery.IN_OPERATOR,
                                    renderer: function( meta ) {
                                        return meta.row.content.map( function( entry ) {
                                            return entry.vknr;
                                        } ).join( ', ' );
                                    },
                                    isSortable: true,
                                    isFilterable: true
                                },
                                {
                                    label: GROUP_CONTENT_NAME,
                                    text: GROUP_CONTENT_NAME,
                                    forPropertyName: 'content.name',
                                    queryFilterType: Y.doccirrus.DCQuery.IN_OPERATOR,
                                    renderer: function( meta ) {
                                        return meta.row.content.map( function( entry ) {
                                            return entry.name;
                                        } ).join( ', ' );
                                    },
                                    isSortable: true,
                                    isFilterable: true
                                }
                            ]
                        }
                    } );

                    self.addInsurancesBtn = KoComponentManager.createComponent( {
                        componentType: 'KoButton',
                        componentConfig: {
                            name: 'addInsurancesBtn',
                            text: ADD_INSURANCES_BTN,
                            title: ADD_INSURANCES_BTN,
                            icon: 'CHEVRON_DOWN',
                            disabled: self.addDisposable( ko.computed( function() {
                                return self.insuranceGroupSearchTable.getComponentColumnCheckbox().checked().length <= 0;
                            } ) ),
                            click: function() {
                                var checked = self.insuranceGroupSearchTable.getComponentColumnCheckbox().checked(),
                                    selected = self.selected();

                                if( !checked.length || !selected ) {
                                    return;
                                }

                                checked.forEach( function( entry ) {
                                    selected.items.push( entry );
                                } );
                            }
                        }
                    } );

                    self.insuranceGroupItemTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                        componentType: 'KoTable',
                        componentConfig: {
                            fillRowsToLimit: false,
                            remote: false,
                            data: self.addDisposable( ko.computed( function() {
                                return self.selectedContent();
                            } ) ),
                            columns: [
                                {
                                    componentType: 'KoTableColumnCheckbox',
                                    forPropertyName: 'checked',
                                    label: '',
                                    checkMode: 'multi',
                                    allToggleVisible: true
                                },
                                {
                                    label: GROUP_ITEM_SERIAL_NO,
                                    text: GROUP_ITEM_SERIAL_NO,
                                    width: '20%',
                                    forPropertyName: 'serialNo'
                                },
                                {
                                    label: GROUP_CONTENT_VKNR,
                                    text: GROUP_CONTENT_VKNR,
                                    width: '20%',
                                    forPropertyName: 'content.vknr',
                                    queryFilterType: Y.doccirrus.DCQuery.IN_OPERATOR,
                                    renderer: function( meta ) {
                                        return meta.row.content.map( function( entry ) {
                                            return entry.vknr;
                                        } ).join( ', ' );
                                    }
                                },
                                {
                                    label: GROUP_CONTENT_NAME,
                                    text: GROUP_CONTENT_NAME,
                                    forPropertyName: 'content.name',
                                    renderer: function( meta ) {
                                        return meta.row.content.map( function( entry ) {
                                            return entry.name;
                                        } ).join( ', ' );
                                    }
                                }
                            ]
                        }
                    } );

                    self.removeInsurancesBtn = KoComponentManager.createComponent( {
                        componentType: 'KoButton',
                        componentConfig: {
                            name: 'removeInsurancesBtn',
                            text: REMOVE_INSURANCES_BTN,
                            title: REMOVE_INSURANCES_BTN,
                            icon: 'CHEVRON_UP',
                            disabled: self.addDisposable( ko.computed( function() {
                                return self.insuranceGroupItemTable.getComponentColumnCheckbox().checked().length <= 0;
                            } ) ),
                            click: function() {
                                var checked = self.insuranceGroupItemTable.getComponentColumnCheckbox().checked(),
                                    checkedSerialNos,
                                    selected = self.selected();

                                if( !checked.length || !selected ) {
                                    return;
                                }
                                checkedSerialNos = checked.map( function( item ) {
                                    return item.serialNo;
                                } );

                                selected.items.remove( function( item ) {
                                    var serialNo = unwrap( item.serialNo );
                                    return -1 !== checkedSerialNos.indexOf( serialNo );
                                } );
                            }
                        }
                    } );

                    self.cancelEditBtn = KoComponentManager.createComponent( {
                        componentType: 'KoButton',
                        componentConfig: {
                            name: 'cancelEditBtn',
                            text: CANCEL,
                            title: CANCEL,
                            click: function() {
                                var selected = peek( self.selected );
                                selected.items( self.originalSelectedContent );
                                self.selected( null );
                            }
                        }
                    } );

                    self.saveBtn = KoComponentManager.createComponent( {
                        componentType: 'KoButton',
                        componentConfig: {
                            name: 'saveBtn',
                            text: SAVE,
                            title: SAVE,
                            option: 'PRIMARY',
                            click: function() {
                                var selected = unwrap( self.selected ),
                                    promise;
                                if( selected ) {
                                    promise = selected.save().catch( function( response ) {
                                        Y.log( 'could not save insurance group: ' + response, 'error', NAME );
                                        showError( response );
                                    } );
                                } else {
                                    Y.log( 'could not save becuase selected insurance group is not set', 'warn', NAME );
                                    promise = Promise.resolve();
                                }
                                promise.then( function() {
                                    self.selected( null );
                                } );
                            }
                        }
                    } );
                },
                editInsuranceGroup: function( insuranceGroup ) {
                    var self = this;
                    self.selected( insuranceGroup );
                    self.originalSelectedContent = JSON.parse( JSON.stringify( peek( insuranceGroup.items ).map( itemToJson ) ) );
                }
            },
            {
                NAME: 'InsuranceGroupBrowser'
            }
        );
        KoViewModel.registerConstructor( InsuranceGroupBrowser );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'KoUI',
            'KoComponentManager',
            'InsuranceGroupModel'
        ]
    }
);