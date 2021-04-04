/*
 @author: strix
 @date: 26/06/2018
 */


/*eslint prefer-template:0, strict:0 */
/*global YUI, ko, moment */

'use strict';

YUI.add( 'DcNotifyInvalidParentsModal', function( Y, NAME ) {
        var
            i18n = Y.doccirrus.i18n,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            CANCEL = i18n( 'InCaseMojit.medication_modalJS.button.CANCEL' ),
            CONFIRM = i18n( 'general.button.CONFIRM' ),
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
            peek = ko.utils.peekObservable;

        /**
         * ActivityDataModel model
         * @constructor
         * @extends KoDisposable
         */
        function InvalidParentsDataModel() {
            InvalidParentsDataModel.superclass.constructor.apply( this, arguments );
        }

        Y.extend( InvalidParentsDataModel, Y.doccirrus.KoViewModel.getDisposable(), {

            tableData: null,

            initializer: function ActivityDataModel_initializer( config ) {
                var self = this;
                self.explanationText = i18n( 'InCaseMojit.notify_invalid_parents_modal.EXPLANATION' );
                self.confirmHintText = i18n( 'InCaseMojit.notify_invalid_parents_modal.CONFIRM_HINT' );

                self.initInvalidParentsTable( config );

            },

            /** @protected */
            destructor: function InvalidParentsDataModel_destructor() {
            },

            initInvalidParentsTable: function InvalidParentsDataModel_initInvalidParentsTable( config ) {
                var
                    self = this;

                self.tableData = config.invalidatedParentActivities ? config.invalidatedParentActivities : null;

                if ( !self.tableData ) {
                    //  should never happen
                    Y.log( 'No invalid parent activities to display.', 'warn', NAME );
                }

                self.invalidParentActivitiesTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'InvalidParentActivitiesModal-invalidParentActivitiesTable',
                        data: self.tableData,
                        columns: [
                            {
                                componentType: 'KoTableColumnCheckbox',
                                forPropertyName: 'checked',
                                label: '',
                                checkMode: 'multi',
                                allToggleVisible: true
                            },
                            {
                                label: i18n( 'InCaseMojit.notify_invalid_parents_modal.table.timestamp' ),
                                forPropertyName: 'timestamp',
                                sorted: true,
                                width: '10%',
                                inputField: {
                                    componentType: 'KoSchemaValue',
                                    componentConfig: {
                                        fieldType: 'ISODate',
                                        showLabel: false,
                                        useIsoDate: true
                                    }
                                },
                                renderer: function( meta ) {
                                    var timestamp = peek( meta.value );

                                    if( timestamp ) {
                                        return moment( timestamp ).format( TIMESTAMP_FORMAT );
                                    } else {
                                        return '';
                                    }
                                }
                            },
                            {
                                label: i18n( 'InCaseMojit.notify_invalid_parents_modal.table.actType' ),
                                forPropertyName: 'actType',
                                width: '20%',
                                renderer: function( meta ) {
                                    var actType = peek( meta.value );
                                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', actType, '-de', 'k.A.' );
                                }
                            },
                            {
                                label: i18n( 'InCaseMojit.notify_invalid_parents_modal.table.content' ),
                                forPropertyName: 'content'
                            },
                            {
                                label: i18n( 'InCaseMojit.notify_invalid_parents_modal.table.link' ),
                                forPropertyName: 'link',
                                width: '7%',
                                renderer: function( /*meta*/ ) {
                                    return '<button class="btn"><i class="glyphicon glyphicon-pencil"></i></button>';
                                }
                            }
                        ]
                    }
                } );

                self.invalidParentActivitiesTable.onRowClick = function( evt ) {
                    if ( !evt || !evt.row || !evt.row.activityId ) { return; }

                    var
                        activityUrl = '/incase#/activity/' + evt.row.activityId,
                        activityTarget = '_' + evt.row.activityId;

                    //  open in new window if there are multiple changed activities
                    if ( self.tableData && self.tableData().length > 1 ) {
                        window.open( activityUrl, activityTarget );
                        return;
                    }

                    //  open in same window if there is a single changed activity
                    if ( config.navigateToActivity ) {
                        config.navigateToActivity( evt.row );
                    }

                    //  close the modal
                    config.closeModal();
                    return false; // MOJ-10313: Stops propagation so that onBodyClick is not fired, while the table is being destroyed.
                };

            }
        }, {
            ATTRS: {
                activeCaseFolder: {
                    lazyAdd: false,
                    value: null
                },
                insuranceStatus: {
                    lazyAdd: false,
                    value: []
                },
                _locationList: {
                    lazyAdd: false,
                    value: []
                },
                incaseconfiguration: {
                    lazyAdd: false,
                    value: null
                }
            }
        } );

        function showDialog( config ) {

            var
                btnCancel = Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                    label: CANCEL,
                    action: onBtnOkClick
                } ),
                btnConfirm = Y.doccirrus.DCWindow.getButton( 'CONFIRM', {
                    label: CONFIRM,
                    action: onBtnConfirmClick
                } ),

                modalOptions = {
                    className: 'DCWindow-Appointment',
                    icon: Y.doccirrus.DCWindow.ICON_LIST,
                    width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: [ 'close', 'maximize' ],
                        footer: [ btnConfirm, btnCancel ]
                    },
                    after: {
                        visibleChange: onModalVisibilityChange
                    }
                },

                jadeOpts = { path: 'InCaseMojit/views/notify_invalid_parents_modal' },

                invalidParentsVM,           //  instance of InvalidParentsDataModel
                modal;

            Y.doccirrus.communication.on( {
                event: 'parentActivityInvalidClose',
                done: function(){
                    modal.close();
                },
                handlerId: 'parentActivityInvalidCloseListener'
            } );

            //  load jade template for modal content
            Promise.resolve( Y.doccirrus.jsonrpc.api.jade.renderFile( jadeOpts ) )
                .then( onJadeTemplateLoaded )
                .catch( catchUnhandled );

            //  instantiate and bind the model
            function onJadeTemplateLoaded( template ) {
                template = template.data ? template.data : template;
                modalOptions.bodyContent = Y.Node.create( template );
                modalOptions.title = ( config.invalidatedParentActivities()[0] && config.invalidatedParentActivities()[0].patientName + ' ' ) || '';
                modalOptions.title += i18n( 'InCaseMojit.notify_invalid_parents_modal.TITLE' );
                modal = new Y.doccirrus.DCWindow( modalOptions );

                config.closeModal = function() { onBtnOkClick(); };
                invalidParentsVM = new InvalidParentsDataModel( config );
                ko.applyBindings( invalidParentsVM, modalOptions.bodyContent.getDOMNode() );
            }

            //  dismiss the modal
            function onBtnOkClick() {
                modal.close();
            }

            //  trigger confirm invalidated parents and dismiss the modal
            function onBtnConfirmClick() {
                var checked = invalidParentsVM.invalidParentActivitiesTable.getComponentColumnCheckbox().checked();
                if( checked.length ) {
                    Promise.resolve( Y.doccirrus.jsonrpc.api.linkedactivities.confirmInvalidatedParents( {
                        activityIds: checked.map( function( obj ) {
                            return obj.activityId;
                        } )
                    } ) ).then( function() {
                        modal.close();
                        config.refreshCaseFolder();
                    } ).catch( function( err ) {
                        Y.log( 'could not confirm invalidated parents: ' + err, 'error', NAME );
                        Y.doccirrus.DCWindow.notice( {
                            type: 'error',
                            message: Y.doccirrus.errorTable.getMessages(  err.code || err )
                        } );
                    } );
                } else {
                    modal.close();
                }
            }

            function onModalVisibilityChange( event ) {
                if( !event.newVal ) {
                    Y.doccirrus.communication.off( 'parentActivityInvalidClose', 'parentActivityInvalidCloseListener' );
                    Y.doccirrus.communication.emit( 'messageToClients', {
                        event: 'parentActivityInvalidClose'
                    } );

                    ko.cleanNode( modalOptions.bodyContent.getDOMNode() );
                    if ( config.onDismiss ) { config.onDismiss(); }
                    invalidParentsVM.destroy();
                }
            }

        }

        Y.namespace( 'doccirrus.modals' ).notifyInvalidParents = {
            'show': showDialog
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'doccirrus',
            'KoViewModel',
            'KoUI-all',
            'inCaseUtils',
            'activity-schema',
            'v_activityDataItem-schema'
        ]
    }
);
