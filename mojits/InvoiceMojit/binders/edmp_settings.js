/*global fun:true, ko, Promise, YUI */
/*exported fun */

fun = function _fn( Y, NAME ) {
    'use strict';

    var
        ID_EDMP_SETTINGS = '#edmp_settings',

        // TODOOO translations
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,

        ORGANIZATIONID = i18n( 'catalog-schema.SDDA_T.orgianizationId' ),
        ORGANIZATIONNAME = i18n( 'catalog-schema.SDDA_T.orgianizationName' ),
        KV = 'KV',
        UKV = 'UKV',
        PROGRAMS = i18n( 'catalog-schema.SDDA_T.constraints' ),
        KVCONNECT_ADDRESS = i18n( 'catalog-schema.SDDA_T.kv_connect' ),
        MESSAGE_SUCCESS = i18n( 'InvoiceMojit.configuration.messages.SUCCESS' ),
        MESSAGE_STD_ERR = i18n( 'general.message.AN_ERROR_OCCURRED' ),

        setValidationRules = Y.doccirrus.ruleutils.validate,

        SDDA_mandatory = Y.doccirrus.validations.kbv.SDDA_mandatory[0].validator,
        SDDA_IK_OR_UKV = Y.doccirrus.validations.kbv.SDDA_IK_OR_UKV[0].validator,
        SDDA_connect = Y.doccirrus.validations.kbv.SDDA_connect[0].validator,
        sddaDmpTypeToActType = Y.doccirrus.edmpcommonutils.sddaDmpTypeToActType,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager;

    function applyBindings( model, yNode ) {
        if( ko.dataFor( yNode.one( ID_EDMP_SETTINGS ).getDOMNode() ) ) {
            return;
        }
        ko.applyBindings( model, yNode.one( ID_EDMP_SETTINGS ).getDOMNode() );
    }

    function cleanNode( yNode ) {
        ko.cleanNode( yNode.one( ID_EDMP_SETTINGS ).getDOMNode() );
    }

    function getSddaCatalogFilename() {
        return Y.doccirrus.catalogmap.getCatalogSDDA().filename;
    }

    function createExtSddaEditor() {

        var editor = Object.create( null );
        editor.data = {
            orgianizationId: ko.observable(),
            orgianizationName: ko.observable(),
            kv: ko.observable(),
            ukv: ko.observable(),
            kv_connect: ko.observable(),
            catalogShort: 'SDDA'
        };

        editor.init = function( data ) {
            if( data ) {
                if( data._id ) {
                    editor.data._id = data._id;
                }
                editor.data.orgianizationId( data.orgianizationId );
                editor.data.orgianizationName( data.orgianizationName );
                editor.data.kv( data.kv );
                editor.data.ukv( data.ukv );
                editor.data.kv_connect( data.kv_connect );
            }

            return editor;
        };

        setValidationRules( editor.data, {
            orgianizationId: SDDA_IK_OR_UKV,
            orgianizationName: SDDA_mandatory,
            kv: SDDA_mandatory,
            ukv: SDDA_IK_OR_UKV,
            kv_connect: SDDA_connect
        } );

        ko.computed( function() {
            editor.data.orgianizationId();
            editor.data.ukv();
            editor.data.orgianizationId.validate();
            editor.data.ukv.validate();
        } );

        editor.reset = function() {
            if( editor.data._id ) {
                delete editor.data._id;
            }
            editor.data.orgianizationId( null );
            editor.data.orgianizationName( null );
            editor.data.kv( null );
            editor.data.ukv( null );
            editor.data.kv_connect( null );

            return editor;
        };

        editor.toJSON = function() {
            var data = ko.toJS( editor.data );
            return data;
        };

        return editor;
    }

    function registerNode( yNode ) {

        var extSddaEditor = createExtSddaEditor(),
            filename = getSddaCatalogFilename(),
            sddaTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'InvoiceMojit-InvoiceNavigationBinderIndex-sddaTable',
                    states: ['limit'],
                    striped: false,
                    fillRowsToLimit: false,
                    remote: true,
                    proxy: Y.doccirrus.jsonrpc.api.catalog.read,
                    baseParams: {
                        query: {
                            catalog: filename
                        }
                    },
                    columns: [
                        {
                            forPropertyName: 'orgianizationId',
                            label: ORGANIZATIONID,
                            title: ORGANIZATIONID,
                            renderer: function( meta ) {
                                return meta.value;
                            },
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'orgianizationName',
                            label: ORGANIZATIONNAME,
                            title: ORGANIZATIONNAME,
                            renderer: function( meta ) {
                                return meta.value;
                            },
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'kv',
                            label: KV,
                            title: KV,
                            width: '75px',
                            sortInitialIndex: 0,
                            renderer: function( meta ) {
                                return meta.value;
                            },
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'ukv',
                            label: UKV,
                            title: UKV,
                            width: '75px',
                            sortInitialIndex: 0,
                            renderer: function( meta ) {
                                return meta.value;
                            },
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                            isFilterable: true
                        },
                        // {
                        //     forPropertyName: 'constraints',
                        //     label: PROGRAMS,
                        //     title: PROGRAMS,
                        //     renderer: function( meta ) {
                        //         var types = [];
                        //
                        //         (Array.isArray( meta.value ) ? meta.value : []).forEach( function( entry ) {
                        //             types.push( sddaDmpTypeToActType( entry.dmpType ) );
                        //         } );
                        //         return types.join( ', ' );
                        //     },
                        //     isSortable: true,
                        //     queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                        //     isFilterable: true
                        // },
                        {
                            forPropertyName: 'kv_connect',
                            label: KVCONNECT_ADDRESS,
                            title: KVCONNECT_ADDRESS,
                            renderer: function( meta ) {
                                return meta.value;
                            },
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                            isFilterable: true
                        }
                    ]
                }
            } ),
            extSddaTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'InvoiceMojit-InvoiceNavigationBinderIndex-extSddaTable',
                    states: ['limit'],
                    striped: false,
                    fillRowsToLimit: false,
                    remote: true,
                    sortersLimit: 2,
                    proxy: Y.doccirrus.jsonrpc.api.catalogusage.read,
                    baseParams: {
                        query: {
                            catalogShort: 'SDDA'
                        }
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
                            forPropertyName: 'orgianizationId',
                            label: ORGANIZATIONID,
                            title: ORGANIZATIONID,
                            renderer: function( meta ) {
                                return meta.value;
                            },
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'orgianizationName',
                            label: ORGANIZATIONNAME,
                            title: ORGANIZATIONNAME,
                            renderer: function( meta ) {
                                return meta.value;
                            },
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'kv',
                            label: KV,
                            title: KV,
                            width: '75px',
                            sortInitialIndex: 0,
                            renderer: function( meta ) {
                                return meta.value;
                            },
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'ukv',
                            label: UKV,
                            title: UKV,
                            width: '75px',
                            sortInitialIndex: 0,
                            renderer: function( meta ) {
                                return meta.value;
                            },
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'constraints',
                            label: PROGRAMS,
                            title: PROGRAMS,
                            renderer: function( meta ) {
                                var types = [];

                                (Array.isArray( meta.value ) ? meta.value : []).forEach( function( entry ) {
                                    types.push( sddaDmpTypeToActType( entry.dmpType ) );
                                } );
                                return types.join( ', ' );
                            },
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'kv_connect',
                            label: KVCONNECT_ADDRESS,
                            title: KVCONNECT_ADDRESS,
                            renderer: function( meta ) {
                                return meta.value;
                            },
                            isSortable: true,
                            queryFilterType: Y.doccirrus.DCQuery.EQ_OPERATOR,
                            isFilterable: true
                        }
                    ]
                }
            } ),

            invoiceConfiguration = ko.observable({}),
            tPackerPassword = ko.observable(''),
            tPackerUsername = ko.observable(''),
            qsDataKey = ko.observable(''),
            patientKey = ko.observable(''),

            extSddaTableHasSelection = ko.computed( function() {
                var checked = extSddaTable.getComponentColumnCheckbox().checked();
                return Boolean( checked.length );
            } ),

            extSddaTableHasOneSelection = ko.computed( function() {
                var checked = extSddaTable.getComponentColumnCheckbox().checked();
                return 1 === checked.length;
            } );
        
        extSddaEditor.orgianizationIdTextI18n = i18n( 'catalog-schema.SDDA_T.orgianizationId' );
        extSddaEditor.orgianizationNameTextI18n = i18n( 'catalog-schema.SDDA_T.orgianizationName' );
        extSddaEditor.kvConnectTextI18n = i18n( 'catalog-schema.SDDA_T.kv_connect' );

        function showExtSddaEditor( entry, callback ) {

            var node = Y.Node.create( '<div></div>' ),
                modal,
                saveBtn;

            YUI.dcJadeRepository.loadNodeFromTemplate(
                'edmp_sdda_editor-modal',
                'InvoiceMojit',
                {},
                node,
                function() {

                    modal = Y.doccirrus.DCWindow.dialog( {
                        title: 'SDDA erweitern',
                        type: 'info',
                        callback: callback,
                        window: {
                            width: 'medium',
                            buttons: {
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                        action: function() {
                                            modal.close();
                                            callback( null, false );
                                        }
                                    } ),
                                    Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                        isDefault: true,
                                        action: function() {
                                            var data = extSddaEditor.toJSON();

                                            if( data._id ) {
                                                data.fields_ = Object.keys( data );
                                            }
                                            Promise.resolve( Y.doccirrus.jsonrpc.api.catalogusage[data._id ? 'update' : 'create']( {
                                                query: data._id ? {_id: data._id} : undefined,
                                                data: data
                                            } ) ).then( function() {
                                                callback( null, true );
                                            } ).catch( function( err ) {
                                                callback( err );
                                            } ).finally( function() {
                                                modal.close();
                                                extSddaEditor.reset();
                                            } );
                                        }
                                    } )
                                ]
                            }
                        },
                        message: node
                    } );

                    saveBtn = modal.getButton( 'SAVE' ).button;

                    ko.computed( function() {
                        if( extSddaEditor.data.isValid() ) {
                            saveBtn.enable();
                        } else {
                            saveBtn.disable();
                        }
                    } );

                    ko.applyBindings( extSddaEditor.init( entry ), node.one( '#edmpSettingsExtSddaEditorModal' ).getDOMNode() );
                }
            );

        }

        function addExtEntry() {
            showExtSddaEditor( null, function( err, reload ) {
                if( err ) {
                    Y.log( 'could not add external sdda entry ' + err, 'error', NAME );
                    return;
                }
                if( reload ) {
                    extSddaTable.reload();
                }
            } );

        }

        function editExtEntry() {

            var data = extSddaTable.getComponentColumnCheckbox().checked()[0];

            showExtSddaEditor( data, function( err, reload ) {
                if( err ) {
                    Y.log( 'could not edit external sdda entry ' + err, 'error', NAME );
                    return;
                }
                if( reload ) {
                    extSddaTable.reload();
                }
            } );

        }

        function removeExtEntry() {
            var checked = extSddaTable.getComponentColumnCheckbox().checked();

            Promise.resolve( Y.doccirrus.jsonrpc.api.catalogusage.delete( {
                query: {
                    _id: {
                        $in: checked.map( function( entry ) {
                            return entry._id;
                        } )
                    }
                }
            } ) ).then( function() {
                extSddaTable.reload();
            } ).catch( function( err ) {
                Y.log( 'could not delete sdda catalogusage entry ' + err, 'error', NAME );
            } );

        }

        function loadQDocuConfiguration() {
            Y.doccirrus.jsonrpc.api.invoiceconfiguration
                .read()
                .done( function( response ) {
                    var
                        invoiceConfigurationModel,
                        data = response && response.data;

                    if( data && data[0] ) {
                        invoiceConfigurationModel = KoViewModel.createViewModel( {
                            NAME: 'InvoiceConfigurationModel',
                            config: {data: data[0]}
                        } );
                        invoiceConfiguration( invoiceConfigurationModel );
                        tPackerPassword( ko.unwrap( invoiceConfigurationModel.tPackerPassword ) );
                        tPackerUsername( ko.unwrap( invoiceConfigurationModel.tPackerUsername ) );
                        qsDataKey( ko.unwrap( invoiceConfigurationModel.qsDataKey ) );
                        patientKey( ko.unwrap( invoiceConfigurationModel.patientKey ) );
                    }
                });
        }

        function saveInvoiceconfiguration() {
            var invoiceConfig = ko.unwrap( invoiceConfiguration );
            if( invoiceConfig ) {
                invoiceConfig.tPackerPassword( ko.unwrap( tPackerPassword ) );
                invoiceConfig.tPackerUsername( ko.unwrap( tPackerUsername ) );
                invoiceConfig.qsDataKey( ko.unwrap( qsDataKey ) );
                invoiceConfig.patientKey( ko.unwrap( patientKey ) );

                invoiceConfig
                    ._saveConfig.apply( this, arguments )
                    .done( function onSave( response ) {
                        var
                            errors = Y.doccirrus.errorTable.getErrorsFromResponse( response );

                        if( errors.length ) {
                            // eslint-disable-next-line no-undef
                            _.invoke( errors, 'display' );
                        } else {
                            Y.doccirrus.DCWindow.notice( {
                                message: MESSAGE_SUCCESS
                            } );
                        }
                    } )
                    .fail( function onSaveError() {
                        Y.doccirrus.DCWindow.notice( {
                            message: MESSAGE_STD_ERR
                        } );
                    } );
            }
        }

        function showInfoDialog () {

            new Y.doccirrus.DCWindow( { // eslint-disable-line
                className: 'DCWindow-tab_employees-info',
                bodyContent: i18n( 'invoiceconfiguration-schema.QDocuSettings_T.infoDialogText' ),
                title: i18n( 'DCWindow.notice.title.info' ),
                icon: Y.doccirrus.DCWindow.ICON_LIST,
                width: Y.doccirrus.DCWindow.SIZE_SMALL,
                height: Y.doccirrus.DCWindow.SIZE_SMALL,
                minHeight: Y.doccirrus.DCWindow.SIZE_SMALL,
                minWidth: Y.doccirrus.DCWindow.SIZE_SMALL,
                centered: true,
                modal: true,
                render: document.body,
                buttons: {
                    header: ['close'],
                    footer: [
                        Y.doccirrus.DCWindow.getButton( 'OK', {
                            isDefault: true,
                            action: function( e ) {
                                e.target.button.disable();
                                this.close( e );
                            }
                        } )
                    ]
                }
            } );
        }

        loadQDocuConfiguration();

        applyBindings( {
            sddaTable: sddaTable,
            extSddaTable: extSddaTable,
            extSddaTableHasSelection: extSddaTableHasSelection,
            extSddaTableHasOneSelection: extSddaTableHasOneSelection,
            addExtEntry: addExtEntry,
            editExtEntry: editExtEntry,
            removeExtEntry: removeExtEntry,
            invoiceConfiguration: invoiceConfiguration,
            transportEncryptionI18n: i18n( 'invoiceconfiguration-schema.QDocuSettings_T.transportEncryption' ),
            publicKeysI18n: i18n( 'invoiceconfiguration-schema.QDocuSettings_T.publicKeys' ),
            saveButtonI18n: i18n( 'DCWindow.BUTTONS.SAVE' ),
            tPackerPassword: tPackerPassword,
            tPackerUsername: tPackerUsername,
            qsDataKey: qsDataKey,
            patientKey: patientKey,
            qsDataKeysList: Y.doccirrus.schemas.invoiceconfiguration.types.qsDataKey_E.list,
            patientKeysList: Y.doccirrus.schemas.invoiceconfiguration.types.patientKey_E.list,
            basI18n: i18n( 'invoiceconfiguration-schema.QDocuSettings_T.BAS' ),
            vstI18n: i18n( 'invoiceconfiguration-schema.QDocuSettings_T.VST' ),
            showInfoDialog: showInfoDialog,
            saveInvoiceconfiguration: saveInvoiceconfiguration,
            qDocuI18n: i18n( 'activity-schema.Activity_E.QDOCU' )

        }, yNode );
    }

    function deregisterNode( yNode/*, auxFrameRowsKey, options*/ ) {
        cleanNode( yNode );
    }

    return {
        registerNode: registerNode,
        deregisterNode: deregisterNode
    };
};