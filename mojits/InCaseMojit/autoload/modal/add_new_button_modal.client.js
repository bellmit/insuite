/*global YUI, ko, _*/

'use strict';

YUI.add( 'addnewbuttonmodal', function( Y, NAME ) {
    var
        KoUI = Y.doccirrus.KoUI,
        KoViewModel = Y.doccirrus.KoViewModel,
        KoComponentManager = KoUI.KoComponentManager,
        i18n = Y.doccirrus.i18n,
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        userLang = Y.dcforms.getUserLang(),
        formAssoc = Y.doccirrus.formAssoc;


        /**
         * ActionButtonViewModel for KoEditableTable
         * @param config
         * @constructor
         */
        function ActionButtonViewModel( config ) {
            ActionButtonViewModel.superclass.constructor.call( this, config );
        }

        ActionButtonViewModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            caseFolder: {
                value: null,
                lazyAdd: false
            }
        };

        Y.extend( ActionButtonViewModel, KoViewModel.getBase(), {

                initializer: function ActionButtonViewModel_initializer( config ) {
                    var self = this,
                    k;
                    self.actType.disabled = ko.observable( true );
                    self.subType = ko.observable( config.data.subType );
                    self.subType.disabled = ko.observable( true );
                    self.formData.disabled = ko.observable( true );
                    self.formData.readOnly = true;
                    self.uri.disabled = ko.observable( true );
                    self.uriHasError = ko.observable(false);

                    self.addDisposable(ko.computed( function() {
                        var action = unwrap( self.action ),
                            actType = unwrap( self.actType ),
                            formData = unwrap(self.formData);

                        if( action && action.data) {
                            action = action.data;
                        }

                        // when user selected form default for specified activity
                        if( action && 'form' === action._id && formData ) {
                            for( k in formAssoc ) {
                                if( formAssoc.hasOwnProperty( k ) ) {
                                    if( k === formData.defaultFor ) {
                                        //  the form role applies to a specific activity type
                                        // UTILITY has blockCreation
                                        if( 'UTILITY' === formAssoc[ k ] ) {
                                            self.actType( null );
                                            self.formData( null );
                                        } else {
                                            self.actType( formAssoc[ k ] );
                                        }

                                    }
                                }

                            }
                        }

                        // disable Form field
                        if( !('UTILITY' === unwrap( self.actType ) ||
                              'KBVUTILITY' === unwrap( self.actType ) ||
                              'LABREQUEST' === unwrap( self.actType ) )
                            && (action && 'form' === action._id)  ) {
                            self.formData.disabled( false );
                        } else {
                            self.formData( null );
                            self.formData.disabled( true );
                        }

                        // disable ActType and subType field
                        if( action && ( 'form' === action._id
                                        || 'scan' === action._id
                                        || 'upload' === action._id
                                        || 'solModal' === action._id
                                        || 'camera' === action._id ) ) {
                            if ( 'form' === action._id && !actType ) {
                                self.actType( 'FORM' );
                            }
                            if ( ('upload' === action._id
                                  || 'camera' === action._id
                                  || 'scan' === action._id ) && !actType ) {
                                self.actType( 'FINDING' );
                            }
                            self.actType.disabled( false );
                            self.subType.disabled( false );
                        } else {
                            self.actType( null );
                            self.actType.disabled( true );
                            self.subType.disabled( true );
                        }

                        //disable uri field
                        if (action && ('uri' === action._id || 'solModal' === action._id)) {
                            if ( !ko.unwrap(self.uri) ) {
                                self.uri.hasError(true);
                            }
                            self.uri.disabled(false);
                        } else {
                            self.uri( null );
                            self.uri.hasError(false);
                            self.uri.disabled(true);
                        }
                    }));

                    // show red when action empty
                    self.action.hasError = ko.computed(function() {
                        var action = unwrap( self.action );
                        return !action;
                    });

                    // show red when form required and empty
                    self.formData.hasError = ko.computed(function() {
                        var action = unwrap( self.action ),
                            isError = false,
                            actType  = unwrap(self.actType);
                        if( action && action.data) {
                            action = action.data;
                        }

                        if( action && 'form' === action._id
                            && !unwrap( self.formData ) ) {
                            isError = true;
                            // checking if actType has standart form
                            if ( Y.doccirrus.getFormRole( actType, self.get('caseFolder') )) {
                                isError = false;
                            }

                        }

                        return isError;
                    });
                    // show red when actType required and empty
                    self.actType.hasError = ko.computed(function() {
                        var action = unwrap( self.action );
                        if( action && action.data) {
                            action = action.data;
                        }

                        if( action && ( 'form' === action._id
                                        || 'scan' === action._id
                                        || 'upload' === action._id
                                        || 'camera' === action._id )
                            && !unwrap( self.actType ) ) {
                            return true;
                        }

                        return false;
                    });

                    // show red when uri required and empty
                    self.uri.hasError = ko.computed({
                        write: function ( val ) {
                            var action = unwrap( self.action );
                            if( action && action.data ) {
                                action = action.data;
                            }

                            if (action && ('uri' === action._id || 'solModal' === action._id)) {
                                self.uriHasError(val);
                            } else {
                                self.uriHasError(false);
                            }
                        },
                        read: function () {
                          return ko.unwrap(self.uriHasError());
                        }
                    });
                },
                destructor: function ActionButtonViewModel_destructor() {
                }
            },
            {
                schemaName: 'actionbutton',
                NAME: 'ActionButtonViewModel'
            }
        );
        KoViewModel.registerConstructor( ActionButtonViewModel );

        /**
         * AddNewButtonViewModel
         * @param config
         * @constructor
         */
        function AddNewButtonViewModel( config ) {
            AddNewButtonViewModel.superclass.constructor.call( this, config );
        }

        AddNewButtonViewModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            caseFolder: {
                value: null,
                lazyAdd: false
            }
        };

        Y.extend( AddNewButtonViewModel, KoViewModel.getBase(), {
            actionButtonsEditableTable: null,
            buttonsData: null,
            initializer: function AddNewButtonViewModel_initializer() {
                var self = this;
                self.initObservables();
                self.loadSelectData();
                self.initTableData();
                self.initTable();

                self._isValid = ko.computed( function() {
                    var rows = unwrap( self.actionButtonsEditableTable.rows ),
                        result = true;

                    rows.forEach( function( row ) {
                        var name = unwrap( row.name ),
                            action = unwrap( row.action ) && unwrap( row.action ).data || unwrap( row.action ),
                            actType = unwrap( row.actType ),
                            formData = unwrap( row.formData ),
                            uri = unwrap( row.uri),
                            isFormRole = false,
                            swissType = actType;

                        if ( Y.doccirrus.getFormRole( swissType, self.get('caseFolder') )) {
                            isFormRole = true;
                        }

                        row.userId( Y.doccirrus.auth.getUserId() );
                        if( false === row._isValid() && row.isModified() ) {
                            result = false;
                        }
                        if( !name || '' === name || row.name.hasError() || !action ) {
                            result = false;
                        }
                        if( ( action && 'form' === action._id) && ( ( !isFormRole && !formData ) || !actType ) ) {
                            result = false;
                        }
                        if( ( action
                            && ('upload' === action._id
                                || 'camera' === action._id
                                || 'scan' === action._id ) ) && !actType ) {
                            result = false;
                        }
                        if ( (action && ('uri' === action._id)) && (!uri || row.uri.hasError())) {
                            result = false;
                        }
                    } );
                    return result;
                } );
            },
            destructor: function AddNewButtonViewModel_destructor() {
            },
            initObservables: function AddNewButtonViewModel_initTableData() {
                var self = this;
                self.buttonsData = ko.observableArray([]);
                self.actions = ko.observableArray([]);
                // add custom buttons
                self.newCustomOptions = [
                    {_id: 'scan', text: i18n( 'InCaseMojit.addNewButtonModal_clientJS.buttonScan' )},
                    {_id: 'form', text: i18n( 'InCaseMojit.addNewButtonModal_clientJS.buttonForm' )},
                    // upload button removed
                    //{_id: 'upload', text: i18n( 'general.button.UPLOAD' )},
                    {_id: 'camera', text: i18n( 'general.button.WEBCAM' )},
                    {_id: 'uri', text: i18n('actionbutton-schema.ActionButton_T.Uri.i18n')},
                    {_id: 'solModal', text: i18n('actionbutton-schema.ActionButton_T.solModal.i18n')}
                    ];
            },
            customOptionsMapper: function( item ) {
                return {
                    id: item._id,
                    text: item.text,
                    data: item
                };
            },
            initTableData: function AddNewButtonViewModel_initTableData() {
                var self = this;
                Y.doccirrus.jsonrpc.api.actionbutton
                    .read( {query: {userId: Y.doccirrus.auth.getUserId()}} )
                    .done( function( result ) {
                        self.buttonsData( _.sortBy( result.data.map( function( button ) {
                            return {data: _.assign( {}, button )};
                        } ), 'data.order' ) );
                    } )
                    .fail( function( err ) {
                        Y.log( 'Could not load Action Buttons data: ' + err, 'error', NAME );
                    } );
            },
            loadSelectData: function() {
                var self = this;
                Y.doccirrus.jsonrpc.api.flow.getFlowsForCollection( {
                    query: {
                        collectionName: 'patient'
                    }
                } )
                    .done( function( response ) {
                        self.actions(response.data);
                    } )
                    .fail( function( error ) {
                        _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } );
            },
            initTable: function AddNewButtonViewModel_initTable() {
                var
                    self = this;

                self.actionButtonsEditableTable = KoComponentManager.createComponent( {
                    componentType: 'KoEditableTable',
                    componentConfig: {
                        ViewModel: ActionButtonViewModel,
                        data: self.buttonsData,
                        sharedViewModelData: {caseFolder: self.get('caseFolder')},
                        columns: [
                            {
                                componentType: 'KoEditableTableColumnDrag',
                                forPropertyName: 'KoEditableTableColumnDrag'
                            },
                            {
                                forPropertyName: 'name',
                                label: i18n( 'actionbutton-schema.ActionButton_T.Name.i18n' ),
                                title: i18n( 'actionbutton-schema.ActionButton_T.Name.i18n' )
                            },
                            {
                                forPropertyName: 'action',
                                label: i18n( 'actionbutton-schema.ActionButton_T.Action.i18n' ),
                                title: i18n( 'actionbutton-schema.ActionButton_T.Action.i18n' ),
                                inputField: {
                                    componentType: 'KoFieldSelect2',
                                    componentConfig: {
                                        useSelect2Data: true,
                                        select2Read: function( value ) {
                                            if( !value ) {
                                                return value;
                                            } else {
                                                if( value.text ) {
                                                    return {
                                                        id: value._id,
                                                        text: value.text,
                                                        data: value
                                                    };
                                                } else {
                                                    return {
                                                        id: value._id,
                                                        text: (value.title || '') + ' (' + Y.doccirrus.schemaloader.getEnumListTranslation( 'flow', 'FlowType_E', value.flowType, 'i18n', '' ) + ')',
                                                        data: value
                                                    };
                                                }
                                            }
                                        },
                                        select2Write: function( $event, observable ) {
                                            observable( $event.added );
                                        },
                                        select2Config: {
                                            query: undefined,
                                            initSelection: undefined,
                                            data: function() {
                                                return {
                                                    results: self.newCustomOptions.map( self.customOptionsMapper )
                                                        .concat( self.actions().map( function( item ) {
                                                            return {
                                                                id: item._id,
                                                                text: (item.title || '') + ' (' + Y.doccirrus.schemaloader.getEnumListTranslation( 'flow', 'FlowType_E', item.flowType, 'i18n', '' ) + ')',
                                                                data: item
                                                            };
                                                        } ) )
                                                };
                                            },
                                            multiple: false
                                        }
                                    }
                                },
                                renderer: function( meta ) {
                                    var
                                        value = unwrap( meta.value );
                                    if( !value ) {
                                        return null;
                                    }
                                    if( value.data ) {
                                        value = value.data;
                                    }
                                    if( 'upload' === value._id
                                        || 'camera' === value._id
                                        || 'scan' === value._id
                                        || 'form' === value._id
                                        || 'uri' === value._id
                                        || 'solModal' === value._id) {
                                        return value.text;
                                    }
                                    return (value.title || '') + ' (' + Y.doccirrus.schemaloader.getEnumListTranslation( 'flow', 'FlowType_E', value.flowType, 'i18n', '' ) + ')';
                                }
                            },
                            {
                                forPropertyName: 'actType',
                                label: i18n( 'actionbutton-schema.ActionButton_T.actType.i18n' ),
                                title: i18n( 'actionbutton-schema.ActionButton_T.actType.i18n' ),
                                inputField: {
                                    componentType: 'KoFieldSelect2',
                                    componentConfig: {
                                        useSelect2Data: true,
                                        select2Read: function( value ) {
                                            if( !value ) {
                                                return value;
                                            } else {
                                                return {
                                                    id: value,
                                                    text: Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', value, 'i18n', '' ),
                                                    data: value
                                                };
                                            }
                                        },
                                        select2Write: function( $event, observable ) {
                                            observable( $event.val );
                                        },
                                        select2Config: {
                                            query: undefined,
                                            allowClear: true,
                                            multiple: false,
                                            initSelection: undefined,
                                            data: function() {
                                                return {
                                                    results: self.selectActType()
                                                };
                                            }
                                        }
                                    }
                                },
                                renderer: function( meta ) {
                                    var
                                        value = unwrap( meta.value );
                                    if( !value ) {
                                        return null;
                                    }
                                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', value, 'i18n', '' );
                                }
                            },
                            {
                                forPropertyName: 'subType',
                                label: i18n( 'actionbutton-schema.ActionButton_T.subType.i18n' ),
                                title: i18n( 'actionbutton-schema.ActionButton_T.subType.i18n' ),
                                visible: false,
                                queryFilterType: Y.doccirrus.DCQuery.IREGEX_ENUM_OPERATOR,
                                inputField: {
                                    componentType: 'KoSchemaValue',
                                    componentConfig: {
                                        fieldType: 'String',
                                        showLabel: false,
                                        required: false,
                                        placeholder: i18n( 'actionbutton-schema.ActionButton_T.subType.i18n' )
                                    }
                                }
                            },
                            {
                                forPropertyName: 'formData',
                                label: i18n( 'actionbutton-schema.ActionButton_T.formId.i18n' ),
                                title: i18n( 'actionbutton-schema.ActionButton_T.formId.i18n' ),
                                valueUpdate: 'change',
                                onCellClick: function( meta ) {
                                    var action = unwrap( meta.row.action );
                                    function formSelected( res ) {
                                        var data = res && res.data;
                                        meta.row.formData( data );
                                    }
                                    if ( action  && action.data ) {
                                        action = action.data;
                                    }
                                    if ( !meta.row.formData.disabled() && ( action  && 'form' === action._id ) ) {
                                        Y.doccirrus.modals.selectForm.show( {callback: formSelected} );
                                    }
                                },
                                renderer: function( data ) {
                                    var value = unwrap( data.value );

                                    if( !value || typeof value !== 'object') {
                                        return '';
                                    }

                                    if( value.defaultFor ) {
                                        return '<div class="form-assigned">' + value.title[userLang] + '</div>';
                                    }

                                    return value.title[userLang];
                                }
                            },
                            {
                                forPropertyName: 'uri',
                                label: i18n( 'actionbutton-schema.ActionButton_T.Uri.i18n' ),
                                title: i18n( 'actionbutton-schema.ActionButton_T.Uri.i18n' )
                            },
                            {
                                forPropertyName: 'delete',
                                label: i18n( 'general.button.DELETE' ),
                                utilityColumn: true,
                                width: '60px',
                                css: {
                                    'text-center': 1
                                },
                                inputField: {
                                    componentType: 'KoButton',
                                    componentConfig: {
                                        name: 'deleteItem',
                                        title: i18n( 'general.button.DELETE' ),
                                        icon: 'TRASH_O',
                                        click: function( button, $event, $context ) {
                                            var
                                                rowModel = $context.$parent.row;
                                            if( unwrap( rowModel._id ) ) {
                                                Y.doccirrus.jsonrpc.api.actionbutton.delete( {
                                                    query: { _id: unwrap( rowModel._id ) }
                                                } ).done( function() {
                                                    self.actionButtonsEditableTable.removeRow( rowModel );
                                                } );
                                            } else {
                                                self.actionButtonsEditableTable.removeRow( rowModel );
                                            }
                                        }
                                    }
                                }
                            }
                        ],
                        onAddButtonClick: function() {
                            self.actionButtonsEditableTable.addRow( {
                                data: {
                                    order: self.addOrder()
                                }
                            } );
                            return false;
                        },
                        onRowDragged: function() {
                            var self = this,
                                rows = unwrap( self.rows );
                            rows.forEach(function( row, idx ) {
                                if( row.order() ) {
                                    row.order( idx + 1 );
                                }
                            });
                        }
                    }
                } );
            },
            selectActType: function() {
                var self = this,
                    activeCell = self.actionButtonsEditableTable.activeCell
                                 && self.actionButtonsEditableTable.activeCell.row
                                 && self.actionButtonsEditableTable.activeCell.row.action()
                                 && self.actionButtonsEditableTable.activeCell.row.action(),
                    actConfig = Y.doccirrus.schemas.activity.getActTypeClientConfig(),
                    selectItems = [],
                    text;
                if( activeCell && activeCell.data ) {
                    activeCell = activeCell.data;
                }
                Y.doccirrus.schemas.activity.activityTypes.forEach( function( item ) {
                    if( activeCell && activeCell._id && !actConfig[item].blockCreation ) {
                        // actTypes that have form
                        if( 'form' === activeCell._id && Y.doccirrus.schemas.activity.hasForm( item ) ) {
                            text = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', item, 'i18n', '' );
                            if( !text ) {
                                return;
                            }
                            selectItems.push( {
                                id: item,
                                text: text,
                                data: item
                            } );
                        }
                        // simple activity types for solModal
                        if( 'solModal' === activeCell._id ) {
                            text = Y.doccirrus.schemaloader.getEnumListTranslation( 'v_simple_activity', 'SimpleActivityActType_E', item, 'i18n', '' );
                            if( !text ) {
                                return;
                            }
                            selectItems.push( {
                                id: item,
                                text: text,
                                data: item
                            } );
                        }
                        //actTypes for Scan
                        if( ('upload' === activeCell._id
                             || 'camera' === activeCell._id
                             || 'scan' === activeCell._id)
                            && -1 === actConfig[item].disabledTabs.indexOf( 'documentform' ) ) {
                            text = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', item, 'i18n', '' );
                            if( !text ) {
                                return;
                            }
                            selectItems.push( {
                                id: item,
                                text: text,
                                data: item
                            } );
                        }
                    }
                } );

                selectItems.unshift( {
                    id: 'blank',
                    text: '- ' + i18n( 'general.button.CLEAR' ) + ' -',
                    data: ''
                } );

                return selectItems;
            },
            addOrder: function() {
                var self = this,
                    item = Math.max.apply( Math, self.actionButtonsEditableTable.rows().map( function( button ) { //  eslint-disable-line prefer-spread
                        return unwrap( button.order );
                    } ) );
                if( item && isFinite( item ) ) {
                    return item + 1;
                } else {
                    return 1;
                }
            }
        },
        {
            NAME: 'AddNewButtonViewModel'
        });

        KoViewModel.registerConstructor( AddNewButtonViewModel );


        function getTemplate( node, callback ) {
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'add_new_button_modal',
                'InCaseMojit',
                {},
                node,
                callback
            );
        }

        function show( data ) { //eslint-disable-line
            var node = Y.Node.create( '<div></div>' );

            getTemplate( node, function() {
                var model = new AddNewButtonViewModel( data ),
                    modal = new Y.doccirrus.DCWindow( {
                    className: 'DCWindow-AddNewButton',
                    bodyContent: node,
                    title: i18n( 'InCaseMojit.addNewButtonModal_clientJS.title.MODAL_TITLE' ),
                    icon: Y.doccirrus.DCWindow.ICON_INFO,
                    width: 750,
                    height: Y.doccirrus.DCWindow.SIZE_LARGE,
                    resizeable: true,
                    dragable: true,
                    maximizable: true,
                    centered: true,
                    visible: false,
                    focusOn: [],
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: ['close', 'maximize'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                isDefault: true,
                                action: function() {
                                    var self = this;
                                    peek( model.actionButtonsEditableTable.rows ).filter( function( row ) {
                                        return row.isModified();
                                    }).map( function( row ) {
                                        var data = {
                                            name: unwrap( row.name ),
                                            userId: unwrap( row.userId ),
                                            order: unwrap( row.order )
                                        };
                                        if( unwrap( row._id ) ) {
                                            data._id = unwrap( row._id );
                                        }
                                        if( unwrap( row.action ) ) {
                                            if( unwrap( row.action ).data ) {
                                                data.action = unwrap( row.action ).data;
                                            } else {
                                                data.action = unwrap( row.action );
                                            }
                                        }
                                        if( unwrap( row.actType ) ) {
                                            data.actType = unwrap( row.actType );
                                        }
                                        if( unwrap( row.subType ) ) {
                                            data.subType = unwrap( row.subType );
                                        }
                                        if( unwrap( row.formData ) ) {
                                            data.formData = unwrap( row.formData );
                                        }
                                        if( unwrap( row.uri ) ) {
                                            data.uri = unwrap( row.uri );
                                        }

                                        if( unwrap( row._id ) ) {
                                            Y.doccirrus.jsonrpc.api.actionbutton
                                                .update( {
                                                    query: {_id: data._id},
                                                    data: data,
                                                    fields: ['name', 'action', 'actType', 'subType', 'formData', 'userId', 'order', 'uri']
                                                } )
                                                .done( function() {
                                                    row.setNotModified();
                                                } )
                                                .fail( function( err ) {
                                                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                                                } );
                                        } else {
                                            Y.doccirrus.jsonrpc.api.actionbutton
                                                .create( {
                                                    data: data
                                                } )
                                                .done( function() {
                                                    row.setNotModified();
                                                } )
                                                .fail( function( err ) {
                                                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( err ), 'display' );
                                                } );
                                        }
                                    });
                                    self.close();
                                }
                            } )
                        ]
                    },
                    after: {
                        visibleChange: function( event ) {
                            if( !event.newVal ) {
                                ko.cleanNode( node.getDOMNode() );
                                model.destroy();
                            }
                            if ( data.onClose ) {
                                data.onClose();
                            }
                        }
                    }
                } );

                model.addDisposable( ko.computed( function() {
                    var
                        SAVE = modal.getButton( 'OK' ).button,
                        isValid = model._isValid(),
                        isModified = unwrap( model.actionButtonsEditableTable.rows ).some( function( item ) {
                            return item.isModified();
                        } );

                    if( modal && SAVE ) {
                        if ( isValid && isModified ) {
                            SAVE.enable();
                        } else {
                            SAVE.disable();
                        }
                    }


                } ) );

                // need time for avoid jump effect
                window.setTimeout( function() { modal.show(); modal.centered(); }, 200 );
                ko.applyBindings( model, node.getDOMNode() );

            } );
        }

        Y.namespace( 'doccirrus.modals' ).addNewButton = {
            show: show
        };

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'doccirrus',
            'KoViewModel',
            'DCWindow',
            'actionbutton-schema',
            'selectformmodal',
            'dcutils',
            'dc-comctl',
            'inCaseUtils'
        ]
    }
);
