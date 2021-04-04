/*global YUI, ko */

'use strict';

YUI.add( 'dcselectreceivermodal', function( Y/*,NAME*/ ) {

        var
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            getObject = Y.doccirrus.commonutils.getObject,
            utilsFunction = KoUI.utils.Function,
            utilsObject = KoUI.utils.Object,
            NOOP = utilsFunction.NOOP,
            FALSE = utilsFunction.FALSE,
            makeClass = utilsObject.makeClass,
            KoTable = KoComponentManager.registeredComponent( 'KoTable' );

        /**
         * @class KoTableRemoteColumnCheckbox
         * @constructor
         * @extends KoTableColumn
         * @param {Object} config a configuration object
         */
        function KoTableRemoteColumnCheckbox() {
            KoTableRemoteColumnCheckbox.superclass.constructor.apply( this, arguments );
        }

        makeClass( {
            constructor: KoTableRemoteColumnCheckbox,
            extends: KoComponentManager.componentTypes.KoTableColumn,
            descriptors: {
                componentType: 'KoTableRemoteColumnCheckbox',
                width: '32px',
                _checkedIdentifiers: null,
                isUtility: true,
                isExcludedInCsv: true,
                init: function() {
                    var self = this;
                    KoTableRemoteColumnCheckbox.superclass.init.apply( self, arguments );
                    self.checkedIds = ko.observableArray( self.checkedIds );
                },
                isRowChecked: function( meta ) {
                    var self = this;
                    return ko.computed( function() {
                        return self.isChecked( meta.row );
                    } );
                },
                isChecked: function( row ) {
                    var
                        self = this,
                        checkedIds = self.checkedIds(),
                        rowDataId = self.getIdFrom( row );


                    if( rowDataId && checkedIds.filter( function( el ){
                            return self.getIdFrom( el ) === rowDataId;
                        } ).length ) {
                        return true;
                    }
                    return false;

                },
                isRowDisabledByMeta: function() {
                    return false;
                },
                addId: function( data ) {
                    var self = this;
                    self.checkedIds.push( data );
                },
                removeId: function( id ) {
                    var self = this;

                    self.checkedIds( self.checkedIds().filter( function( el ){
                        return self.getIdFrom( el ) !== id;
                    } ) );
                },
                getIdFrom: function( obj ) {
                    var self = this;
                    return getObject( self.idPath, obj );
                },
                checkRow: function( meta ) {
                    var self = this.col;
                    if( self.isChecked( meta.row ) ) {
                        self.removeId( self.getIdFrom( meta.row ) );
                    } else {
                        self.addId( meta.row );
                    }
                    return true;
                },
                propertyToCheckBy: '_id'
            },
            lazy: {
                templateNameCell: function( key ) {
                    var
                        self = this;

                    return self._handleLazyConfig( key, ko.observable( 'KoTableCellField' ) );
                },
                isSortable: function() {
                    return ko.computed( {
                        read: FALSE,
                        write: NOOP
                    } );
                },
                isFilterable: function() {
                    return ko.computed( {
                        read: FALSE,
                        write: NOOP
                    } );
                },
                isEditable: function() {
                    return ko.computed( {
                        read: FALSE,
                        write: NOOP
                    } );
                },
                isDraggable: function() {
                    return ko.computed( {
                        read: FALSE,
                        write: NOOP
                    } );
                },
                isDroppable: function() {
                    return ko.computed( {
                        read: FALSE,
                        write: NOOP
                    } );
                },
                allToggled: function() {
                    var
                        self = this;

                    return ko.computed( {
                        read: function() {
                           return Boolean( self.checkedIds().length );
                        },
                        write: function( toggleValue ) {
                            var
                                modelsAvailable = Y.Array.filter( ko.unwrap( self.owner.rows ), function( model ) {
                                    return model !== KoTable.CONST.EMPTY_ROW;
                                } );

                            if( toggleValue ) {
                                self.checkedIds( modelsAvailable );
                            } else {
                                self.checkedIds( [] );
                            }

                        }
                    }, self ).extend( { rateLimit: 0 } );
                },
                allToggleVisible: function( key ) {
                    var self = this;
                    return self._handleLazyConfig( key, ko.observable( true ) );
                },
                templateName: function( key ) {
                    var
                        self = this;

                    return self._handleLazyConfig( key, ko.observable( 'KoTableColumnCheckbox' ) );
                },
                handleTableOnRowClick: function( key ) {
                    var self = this;
                    return self._handleLazyConfig( key, ko.observable( false ) );
                }
            }
        } );

        KoComponentManager.registerComponent( KoTableRemoteColumnCheckbox );

        var
            i18n = Y.doccirrus.i18n;

        function createTable( data ) {
            return KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    striped: false,
                    remote: true,
                    limitList: [25, 50, 75, 100],
                    limit: 100,
                    proxy: Y.doccirrus.jsonrpc.api.partner.read,
                    baseParams: {
                        sort: {
                            name: 1
                        },
                        query: {
                            status: {$eq: 'CONFIRMED'}
                        }
                    },
                    columns: [
                        {
                            componentType: 'KoTableRemoteColumnCheckbox',
                            forPropertyName: 'checked',
                            label: '',
                            checkedIds: data || [],
                            idPath: '_id'
                        },
                        {
                            forPropertyName: 'name',
                            label: i18n( 'partner-schema.Partner_T.NAME' ),
                            isFilterable: true,
                            isSortable: true
                        },
                        {
                            forPropertyName: 'partnerType',
                            label: i18n( 'partner-schema.PartnerType_E.i18n' ),
                            renderer: function( meta ) {
                                var
                                    partnerType = meta.value;

                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'partner', 'PartnerType_E', partnerType, 'i18n', 'k.A.' );
                            },
                            isFilterable: true,
                            queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                            filterField: {
                                componentType: 'KoFieldSelect2',
                                options: Y.doccirrus.schemas.partner.types.PartnerType_E.list,
                                optionsCaption: '',
                                optionsText: 'i18n',
                                optionsValue: 'val'
                            },
                            isSortable: true
                        },
                        {
                            forPropertyName: 'comment',
                            label: i18n( 'partner-schema.Partner_T.COMMENT' ),
                            isFilterable: true,
                            isSortable: true
                        }
                    ],
                    onRowClick: function() {
                        return false;
                    }
                }
            } );
        }

        Y.namespace( 'doccirrus.modals' ).selectReceiverModal = {
            ProcessViewModel: function( data ) {
                var self = this;

                self.partnerTable = createTable( data );

                self.getPartners = function() {
                    return self.partnerTable.getColumnByPropertyName('checked').checkedIds();
                };
            },

            show: function( data, callback ) {
                var
                    self = this,
                    modal,  //eslint-disable-line no-unused-vars
                    node = Y.Node.create( '<div></div>' ),
                    processVM = new self.ProcessViewModel( data );

                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'select_receiver_modal',
                    'PatientTransferMojit',
                    {},
                    node,
                    function() {
                        modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-Receiver',
                            bodyContent: node,
                            title: i18n( 'PatientTransferMojit.NewMessage.select_sender' ),
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: ['close'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true,
                                        action: function() {
                                            this.close();
                                            return callback( processVM.getPartners() || [] );
                                        }
                                    } )
                                ]
                            }
                        } );

                        ko.applyBindings( processVM, node.getDOMNode() );
                    }
                );
            }
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'doccirrus',
            'KoViewModel',
            'template',
            'MessageViewModel'
        ]
    }
);