/**
 * User: do
 * Date: 26/07/17  18:31
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global fun:true, ko */ //eslint-disable-line

fun = function _fn( Y/*, NAME*/ ) {
    'use strict';

    var
        peek = ko.utils.peekObservable,
        unwrap = ko.unwrap,

        i18n = Y.doccirrus.i18n,
        DELIVERY_SETTING_NOT_FOUND = i18n( 'InvoiceMojit.gkv_delivery_settings.messages.DELIVERY_SETTING_NOT_FOUND' ),
        DELIVERYTYPE = i18n( 'deliverysettings-schema.DeliverySettings_T.deliveryType.i18n' ),
        LOCNAME = i18n( 'deliverysettings-schema.DeliverySettings_T.locname.i18n' ),
        KV = i18n( 'deliverysettings-schema.DeliverySettings_T.kv.i18n' ),
        COMMERCIALNO = i18n( 'deliverysettings-schema.DeliverySettings_T.commercialNo.i18n' ),
        SAVE_CONFIG = i18n( 'InvoiceMojit.gkv_delivery_settings.messages.SAVE_CONFIG' ),
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,
        ID_GKV_SETTINGS = '#gkv_delivery_settings';

    function applyBindings( model, yNode ) {
        if( ko.dataFor( yNode.one( ID_GKV_SETTINGS ).getDOMNode() ) ) {
            return;
        }
        ko.applyBindings( model, yNode.one( ID_GKV_SETTINGS ).getDOMNode() );
    }

    function cleanNode( yNode ) {
        ko.cleanNode( yNode.one( ID_GKV_SETTINGS ).getDOMNode() );
    }

    function getViewModel( options ) {
        var
            router = options.binder.router,
            initialDeliverySettingId = options && options.params && options.params.deliverySettingId || null,
            componentColumnCheckbox,
            originalMaskedText,
            saveBtnEnabled,
            removeButtonEnabled,
            discardBtnEnabled,
            addButtonEnabled,
            selectedDeliverySettingsEntry = ko.observable( null ),

            deliverySettingsTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'InvoiceMojit-GkvDeliverySettingsBinderIndex-deliverySettingsTable',
                    states: ['limit'],
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: function( params ) {
                        if( initialDeliverySettingId ) {
                            params.query.$or = [{_id: initialDeliverySettingId}, {}];
                        }
                        return Y.doccirrus.jsonrpc.api.gkv_deliverysettings.read( params ).fail( function( err ) {
                            if( initialDeliverySettingId ) {
                                initialDeliverySettingId = null;
                                Y.doccirrus.DCWindow.notice( {
                                    type: 'error',
                                    message: err && err.message || err,
                                    window: {
                                        width: 'medium'
                                    }
                                } );
                                router.save( '/gkv_delivery_settings' );
                            }
                        } );
                    },
                    columns: [
                        {
                            componentType: 'KoTableColumnCheckbox',
                            forPropertyName: 'checked',
                            label: '',
                            checkMode: 'single',
                            allToggleVisible: false
                        },
                        {
                            forPropertyName: 'deliveryType',
                            label: DELIVERYTYPE,
                            isSortable: true,
                            sortInitialIndex: 0,
                            isFilterable: true,
                            renderer: function( meta ) {
                                return Y.doccirrus.schemaloader.translateEnumValue( 'i18n', meta.value, Y.doccirrus.schemas.gkv_deliverysettings.types.DeliveryType_E.list, '' );
                            }
                        },
                        {
                            forPropertyName: 'locname',
                            label: LOCNAME,
                            isSortable: true,
                            sortInitialIndex: 0,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'kv',
                            width: '60px',
                            label: KV,
                            isSortable: true,
                            sortInitialIndex: 0,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'commercialNo',
                            label: COMMERCIALNO,
                            isSortable: true,
                            sortInitialIndex: 0,
                            isFilterable: true
                        }
                    ]
                }
            } ),
            translations = ko.observable();

        ko.computed( function() {
            var rows = deliverySettingsTable.rows(),
                initialRow;
            if( ko.computedContext.isInitial() ) {
                return;
            }
            if( initialDeliverySettingId ) {
                rows.some( function( row ) {
                    if( row._id === initialDeliverySettingId ) {
                        initialRow = row;
                        return true;
                    }
                } );
                initialDeliverySettingId = null;

                if( initialRow ) {
                    deliverySettingsTable.selectRow( {row: initialRow} );
                } else {
                    Y.doccirrus.DCWindow.notice( {
                        type: 'error',
                        message: DELIVERY_SETTING_NOT_FOUND,
                        window: {
                            width: 'medium'
                        }
                    } );
                    router.save( 'gkv_delivery_settings' );
                }
            }
        } );

        componentColumnCheckbox = deliverySettingsTable.getComponentColumnCheckbox();

        deliverySettingsTable.selected.subscribe( function( settings ) {
            var currentDeliverySettingsModel = peek( selectedDeliverySettingsEntry ),
                deliverySettingsModel = settings[0] ? Y.doccirrus.KoViewModel.createViewModel( {
                        NAME: 'DeliverySettingsModel',
                        config: {data: settings[0], kvcAccounts: options.kvcAccounts}
                    } )
                    : null;

            if( currentDeliverySettingsModel ) {
                currentDeliverySettingsModel.destroy();
            }

            selectedDeliverySettingsEntry( deliverySettingsModel );
        } );

        selectedDeliverySettingsEntry.subscribe( function( selectedDeliverySettings ) {
            if( !selectedDeliverySettings ) {
                router.replace( '/gkv_delivery_settings' );
            }
        } );

        saveBtnEnabled = ko.computed( function() {
            var model = unwrap( selectedDeliverySettingsEntry ),
                isModified = model && model.isModified(),
                isValid = model && model.isValid();
            if( !model ) {
                return false;
            }
            return isModified && isValid;
        } );

        discardBtnEnabled = ko.computed( function() {
            var model = unwrap( selectedDeliverySettingsEntry ),
                isModified = model && model.isModified();
            if( !model ) {
                return false;
            }
            return isModified;
        } );

        removeButtonEnabled = ko.computed( function() {
            var checked = componentColumnCheckbox.checked(),
                masked = deliverySettingsTable.masked();
            return Boolean( checked.length ) && !masked;
        } );

        addButtonEnabled = ko.computed( function() {
            var
                masked = deliverySettingsTable.masked();
            return !masked;
        } );

        originalMaskedText = deliverySettingsTable.maskedText();

        ko.computed( function() {
            var currentDeliverySettingsModel = unwrap( selectedDeliverySettingsEntry ),
                isModified = false;
            if( currentDeliverySettingsModel ) {
                isModified = currentDeliverySettingsModel.isModified();
            }
            deliverySettingsTable.masked( isModified );
            deliverySettingsTable.maskedText( isModified ? SAVE_CONFIG : originalMaskedText );
        } );

        function unselect() {
            selectedDeliverySettingsEntry( null );
            deliverySettingsTable.unSelect();
        }

        function save() {
            var currentDeliverySettingsModel = peek( selectedDeliverySettingsEntry ),
                data;
            if( !currentDeliverySettingsModel ) {
                return;
            }

            data = currentDeliverySettingsModel.toJSON();

            if( data._id ) {
                data.fields_ = Object.keys( data );
            }

            Promise.resolve( Y.doccirrus.jsonrpc.api.gkv_deliverysettings[data._id ? 'update' : 'create']( {
                query: data._id ? {_id: data._id} : undefined,
                data: data
            } ) ).then( function() {
                // currentDeliverySettingsModel.destory() ?
                unselect();
                deliverySettingsTable.reload();
            } ).catch( function( err ) {
                Y.doccirrus.DCWindow.notice( {
                    type: 'error',
                    message: err && err.message || err,
                    window: {
                        width: 'medium'
                    }
                } );
            } );

        }

        function discard() {
            var currentDeliverySettingsModel = peek( selectedDeliverySettingsEntry );
            if( !currentDeliverySettingsModel ) {
                return;
            }

            unselect();
        }

        function add() {
            var currentDeliverySettingsModel = peek( selectedDeliverySettingsEntry ),
                deliverySettingsModel = Y.doccirrus.KoViewModel.createViewModel( {
                    NAME: 'DeliverySettingsModel',
                    config: {
                        data: {
                            deliveryType: 'MANUAL'
                        },
                        kvcAccounts: options.kvcAccounts
                    }
                } );

            if( currentDeliverySettingsModel ) {
                currentDeliverySettingsModel.destroy();
            }
            unselect();
            selectedDeliverySettingsEntry( deliverySettingsModel );

        }

        function remove() {
            // TODOOO post-process? check for debs in kbvlogs
            var checked = componentColumnCheckbox.checked(),
                currentDeliverySettingsModel = peek( selectedDeliverySettingsEntry ),
                unselectAfterRemoval;

            if( !checked || !checked[0] ) {
                return;
            }
            unselectAfterRemoval = currentDeliverySettingsModel && unwrap( currentDeliverySettingsModel._id ) === checked[0]._id;
            Promise.resolve( Y.doccirrus.jsonrpc.api.gkv_deliverysettings.delete( {
                query: {
                    _id: checked[0]._id
                }
            } ) ).then( function() {
                deliverySettingsTable.reload();
                if( unselectAfterRemoval ) {
                    unselect();
                }
            } ).catch( function( err ) {
                Y.doccirrus.DCWindow.notice( {
                    type: 'error',
                    message: err && err.message || err,
                    window: {
                        width: 'medium'
                    }
                } );
            } );
        }
        translations.buttonDeleteTextI18n = i18n( 'general.button.DELETE' );
        translations.buttonAddTextI18n = i18n( 'general.button.ADD' );
        translations.onlyLocationsWithBSNRI18n = i18n( 'InvoiceMojit.gkv_delivery_settings.tooltip.ONLY_LOCATIONS_WITH_BSNR' );
        translations.manualDeliveryI18n = i18n( 'InvoiceMojit.gkv_delivery_settings.checkbox.MANUAL_DELIVERY' );
        translations.KVBPortalURLI18n = i18n( 'InvoiceMojit.gkv_delivery_settings.label.KBV_PORTAL_URL' );
        translations.KVConnectDeliveryI18n = i18n( 'InvoiceMojit.gkv_delivery_settings.checkbox.KV_CONNECT_DELIVERY' );
        translations.labelUsernameI18n = i18n( 'InvoiceMojit.gkv_delivery_settings.label.USERNAME' );
        translations.labelPasswordI18n = i18n( 'InvoiceMojit.gkv_delivery_settings.label.PASSWORD' );
        translations.buttonSaveTextI18n = i18n('general.button.SAVE');
        translations.buttonDiscardTextI18n = i18n('general.button.DISCARD');
        translations.buttonChangePWDTextI18n = i18n( 'InvoiceMojit.gkv_delivery_settings.button.CHANGE_PWD' );
        translations.buttonCreateCertTextI18n = i18n( 'InvoiceMojit.gkv_delivery_settings.button.CREATE_CERT' );
        translations.buttonLoginTextI18n = i18n( 'InvoiceMojit.gkv_delivery_settings.button.LOGIN' );
        translations.lastKVCLoginI18n = i18n( 'InvoiceMojit.gkv_delivery_settings.label.LAST_KVC_LOGIN' );
        translations.PWDChangedI18n = i18n( 'InvoiceMojit.gkv_delivery_settings.label.PWD_CHANGED' );
        translations.labelCertCreatedI18n = i18n( 'InvoiceMojit.gkv_delivery_settings.label.CERT_CREATED' );
        translations.labelCertDownloadI18n = i18n( 'InvoiceMojit.gkv_delivery_settings.label.DOWNLOAD_CERT' );
        translations.labelCertUploadI18n = i18n( 'InvoiceMojit.gkv_delivery_settings.label.UPLOAD_CERT' );
        translations.labelCertStorageI18n = i18n( 'InvoiceMojit.gkv_delivery_settings.text.CERT_STORAGE' );
        translations.labelKVI18n = i18n( 'InvoiceMojit.gkv_delivery_settings.label.KV' );
        translations.labelAddressI18n = i18n( 'InvoiceMojit.gkv_delivery_settings.label.ADDRESS' );
        translations.labelFunctionsI18n = i18n( 'InvoiceMojit.gkv_delivery_settings.label.FUNCTIONS' );

        return {
            selectedDeliverySettingsEntry: selectedDeliverySettingsEntry,
            deliverySettingsTable: deliverySettingsTable,
            saveBtnEnabled: saveBtnEnabled,
            save: save,
            discard: discard,
            discardBtnEnabled: discardBtnEnabled,
            add: add,
            remove: remove,
            removeButtonEnabled: removeButtonEnabled,
            addButtonEnabled: addButtonEnabled,
            translations: translations
        };

    }

    function registerNode( yNode, auxFrameRowsKey, options ) {
        Y.doccirrus.jsonrpc.api.kvcaccount.read( {
            query: {}
        } ).done( function( response ) {
            options.kvcAccounts = response.data;
            var viewModel = getViewModel( options );
            applyBindings( viewModel, yNode );

        } );

    }

    function deregisterNode( yNode/*, auxFrameRowsKey, options*/ ) {
        cleanNode( yNode );
    }

    return {
        registerNode: registerNode,
        deregisterNode: deregisterNode
    };
};