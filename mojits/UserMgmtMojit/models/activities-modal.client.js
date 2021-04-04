/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */

YUI.add( 'dcactivitiesmodal', function( Y ) {
        'use strict';
        var
            i18n = Y.doccirrus.i18n,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            KoViewModel = Y.doccirrus.KoViewModel,
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager,
            closeButtonI18n = i18n( 'DCWindow.BUTTONS.CLOSE' );

        function ActivitiesModalModel( config ) {
            ActivitiesModalModel.superclass.constructor.call( this, config );
        }

        Y.extend( ActivitiesModalModel, KoViewModel.getDisposable(), {
            destructor: function() {

            },

            initializer: function( config ) {
                var
                    self = this;
                    self.initActivityTable( config );

            },
            initActivityTable: function( config ) {
                var
                    self= this;
                self.activities = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'intouch-activity-modal',
                        states: ['limit', 'usageShortcutsVisible'],
                        striped: false,
                        fillRowsToLimit: false,
                        remote: true,
                        proxy: Y.doccirrus.jsonrpc.api.activityTransfer.getPendingActivities,
                        baseParams: config,
                        limit: 10,
                        limitList: [10, 20, 30, 40, 50, 100],
                        columns: [
                             {
                                forPropertyName: 'timestamp',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
                                width: '100px',
                                isSortable: true,
                                direction: 'DESC',
                                sortInitialIndex: 0,
                                isFilterable: false,
                                renderer: function( meta ) {
                                    var
                                        timestamp = meta.value;

                                    if( timestamp ) {
                                        return moment( timestamp ).format( 'DD.MM.YYYY' );
                                    } else {
                                        return '';
                                    }
                                }
                            },
                            {
                                forPropertyName: 'actType',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.TYPE' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.TYPE' ),
                                width: '100px',
                                isSortable: true,
                                isFilterable: false,
                                renderer: function( meta ) {
                                    var
                                        actType = meta.value;

                                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', actType, 'i18n', 'k.A.' );
                                }
                            },
                            {
                                forPropertyName: 'catalogShort',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CATALOG' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CATALOG' ),
                                width: '80px',
                                isSortable: true,
                                isFilterable: false
                            },
                            {
                                forPropertyName: 'code',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CODE' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CODE' ),
                                width: '80px',
                                isSortable: true,
                                isFilterable: false,
                                renderer: function( meta ) {
                                    var
                                        data = meta.row;

                                    // Special case forT CARDIO codes
                                    if( data && 'BIOTRONIK' === data.catalogShort ) {
                                        return data.catalogShort;
                                    }

                                    return Y.doccirrus.schemas.activity.displayCode( data );
                                }
                            },
                            {
                                forPropertyName: 'content',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DESCRIPTION' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.DESCRIPTION' ),
                                width: '70%',
                                isSortable: true,
                                isFilterable: false
                            },
                            {
                                forPropertyName: 'caseFolderTitle',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CASE_FOLDER' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.CASE_FOLDER' ),
                                width: '80px',
                                isSortable: false,
                                isFilterable: false,
                                visible: true
                            },
                            {
                                forPropertyName: 'status',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.STATUS' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.STATUS' ),
                                width: '80px',
                                isSortable: true,
                                isFilterable: false,
                                renderer: function( meta ) {
                                    var
                                        status = meta.value;

                                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'ActStatus_E', status, 'i18n', '' );
                                }
                            },
                            {
                                forPropertyName: 'editorName',  //  editor.name is editorName in Form schema
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.USER' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.USER' ),
                                width: '40%',
                                isSortable: false,
                                isFilterable: false,
                                renderer: function( meta ) {
                                    var
                                        data = meta.row,
                                        editor = data.editor;

                                    if( editor && editor.length ) {
                                        return editor[editor.length - 1].name;
                                    } else {
                                        return '';
                                    }
                                }
                            },
                            {
                                forPropertyName: 'employeeName',
                                label: i18n( 'activity-schema.Activity_T.employeeName.i18n' ),
                                title: i18n( 'activity-schema.Activity_T.employeeName.i18n' ),
                                width: '40%',
                                isSortable: false,
                                isFilterable: false
                            },
                            {
                                forPropertyName: 'linkedActivities',  //  editor.name is editorName in Form schema
                                label: i18n( 'UserMgmtMojit.transfer_settings.linkedActivities' ),
                                title: i18n( 'UserMgmtMojit.transfer_settings.linkedActivities' ),
                                width: '40px',
                                isSortable: false,
                                isFilterable: false,
                                css: { 'text-right': true },
                                renderer: function( meta ) {
                                    var
                                        data = meta.row;
                                    return data && data.linkedActivities && data.linkedActivities.length || '';
                                }
                            }
                        ],
                        onRowClick: function( meta ) {
                            var
                                data = meta.row;
                            window.open( '/incase#/activity/' + data._id, '_blank' );
                            return false;
                        },
                        isAddRowButtonVisible: function() {
                            return false;
                        }
                    }

                } );
            }

        } );

        function ActivitiesModal() {

        }

        ActivitiesModal.prototype.showDialog = function( config ) {

            function show() {
                Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                    .renderFile( {path: 'UserMgmtMojit/views/activities-modal'} )
                )
                    .then( function( response ) {
                        return response && response.data;
                    } )
                    .then( function( template ) {
                        var
                            activitiesModalModel,
                            modal,
                            bodyContent = Y.Node.create( template );


                        activitiesModalModel = new ActivitiesModalModel( config ) ;

                        modal = new Y.doccirrus.DCWindow( {
                            bodyContent: bodyContent,
                            title:  i18n('UserMgmtMojit.transfer_settings.activitiesToProcess'),
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            centered: true,
                            modal: true,
                            maximizable: true,
                            width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                            height: Y.doccirrus.DCWindow.SIZE_XLARGE,
                            render: document.body,
                            buttons: {
                                header: ['close', 'maximize'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                        label: closeButtonI18n
                                    } )
                                ]
                            }
                        } );

                        modal.set( 'focusOn', [] );

                        modal.after( 'visibleChange', function(  ) {
                            activitiesModalModel.destroy();
                            modal = null;
                        } );

                        ko.applyBindings( activitiesModalModel, bodyContent.getDOMNode() );
                    } ).catch( catchUnhandled );
            }

            show();

        };
        Y.namespace( 'doccirrus.modals' ).activityModal = new ActivitiesModal();

    },
    '0.0.1',
    {
        requires: [
            'doccirrus',
            'oop',
            'KoViewModel',
            'DCWindow',
            'JsonRpcReflection-doccirrus',
            'KoUI-all',
            'dcutils',
            'dc-comctl',
            'activity-schema'
        ]
    }
);
