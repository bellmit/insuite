/**
 * User: pi
 * Date: 22/07/15  11:20
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, moment */

'use strict';

YUI.add( 'DcActivitySequenceModal', function( Y ) {

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            catchUnhandled = Y.doccirrus.promise.catchUnhandled,
            i18n = Y.doccirrus.i18n,
            DATE = i18n( 'InCaseMojit.casefile_browserJS.placeholder.DATE' ),
            TYPE = i18n( 'InCaseMojit.casefile_browserJS.placeholder.TYPE' ),
            CATALOG = i18n( 'InCaseMojit.casefile_browserJS.placeholder.CATALOG' ),
            CODE = i18n( 'InCaseMojit.casefile_browserJS.placeholder.CODE' ),
            DESCRIPTION = i18n( 'InCaseMojit.casefile_browserJS.placeholder.DESCRIPTION' ),
            KoUI = Y.doccirrus.KoUI,
            KoComponentManager = KoUI.KoComponentManager;

        function ActivitySequenceModal() {

        }

        /**
         * ActivitySequenceListModel model
         * @constructor
         * @extends ActivitysequenceModel
         */
        function ActivitySequenceListModel() {
            ActivitySequenceListModel.superclass.constructor.apply( this, arguments );
        }

        ActivitySequenceListModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            activities: {
                value: [],
                lazyAdd: false
            }
        };
        Y.extend( ActivitySequenceListModel, KoViewModel.constructors.ActivitysequenceModel, {
            /** @protected */
            initializer: function() {
                var
                    self = this;
                self.sequenceGroupsI18n = i18n( 'activitysequence-schema.ActivitySequence_T.sequenceGroups.i18n' );
                self._initActivitySequenceListModel();
                self._initActivitySequenceKoTable();
                self.initSelect2Groups();
            },
            /** @protected */
            destructor: function() {
            },
            getModelData: function() {
                var
                    self = this,
                    data = self.toJSON();
                if( !self.editMode ) {
                    data.activitiesId = data.activities.map( function( activity ) {
                        return activity._id;
                    } );
                }

                return data;
            },
            removeSelected: function() {
                var
                    self = this,
                    checked = self.activitySequenceTable.getComponentColumnCheckbox().checked(),
                    activitiesId = checked.map( function( activity ) {
                        return activity._id;
                    } );
                self.activities = self.activities.filter( function( activity ) {
                    var
                        activityId = activity._id;
                    return -1 === activitiesId.indexOf( activityId );
                } );
                self.activitySequenceTable.data( self.activities );
                self.activitySequenceTable.getComponentColumnCheckbox().uncheckAll();
            },
            canSave: function() {
                var
                    self = this;
                if( self.editMode && !self.activities.length ) {
                    Y.doccirrus.DCWindow.notice( {
                        message: 'Alle Aktivitäten können nicht gelöscht werden.'
                    } );
                    return false;
                }
                return true;
            },
            select2Group: null,
            select2GroupMapper: function( item ) {
                var data = {};
                if( item.data) {
                    item = item.data;
                }
                if( !item.name ) {
                    data.name = item;
                    item = data;
                }
                return {
                    id: item.name,
                    text: item.name,
                    data: item
                };
            },
            /**
             * Handles "group" field
             */
            initSelect2Groups: function() {
                var
                    self = this,
                    GROUPS = Y.doccirrus.i18n( 'InTimeAdminMojit.tab_calendars.label.GROUP_PLACEHOLDER' );

                self.select2Group = {
                    data: self.addDisposable( ko.computed( {
                        read: function() {
                            var
                                groups = ko.unwrap( self.sequenceGroups );
                            return groups.map(function( item ) {
                                return self.select2GroupMapper(item);
                            });
                        },
                        write: function( $event ) {
                            var index;
                            if( Y.Object.owns( $event, 'added' ) ) {
                                self.sequenceGroups.push( $event.added );
                            }
                            if( Y.Object.owns( $event, 'removed' ) ) {
                                index = self.sequenceGroups.indexOf( $event.removed );
                                self.sequenceGroups.splice( index, 1 );
                            }
                        }
                    } ) ),
                    placeholder: ko.observable( GROUPS ),
                    select2: {
                        multiple: true,
                        createSearchChoice: self.select2GroupMapper,
                        formatSelection: function( item ) {
                            return item.text;
                        },
                        query: function( query ) {
                            Y.doccirrus.jsonrpc.api.activitysequence.getAllSequenceGroups( {
                                    query: {
                                        "sequenceGroups.name": {
                                           $regex: '',
                                           $options: 'i'
                                        }
                                    }
                                }
                            ).done( function( response ) {
                                var data = response && response.data || [],
                                    mergedData = data.map( function( item ) {
                                        return item;
                                    } );
                                query.callback( {
                                    results: mergedData.map( self.select2GroupMapper )
                                } );
                            } );
                        }
                    }
                };
            },
            /** @protected */
            _initActivitySequenceListModel: function() {
                var
                    self = this;
                self.editMode = self.get( 'editMode' );
                self.contentI18n = i18n('general.title.CONTENT');
            },
            /** @protected */
            _initActivitySequenceKoTable: function() {
                var
                    self = this,
                    data = self.activities;
                self.activitySequenceTable = KoComponentManager.createComponent( {
                    componentType: 'KoTable',
                    componentConfig: {
                        stateId: 'ActivitySequenceListModel-activitySequenceTable',
                        states: ['limit'],
                        fillRowsToLimit: false,
                        data: data,
                        columns: [
                            {
                                componentType: 'KoTableColumnCheckbox',
                                forPropertyName: 'select',
                                label: ''
                            },
                            {
                                forPropertyName: 'timestamp',
                                label: DATE,
                                title: DATE,
                                width: '15%',
                                direction: 'DESC',
                                sortInitialIndex: 0,
                                renderer: function( meta ) {
                                    const timestamp = meta && meta.value;
                                    if( timestamp ) {
                                        return moment( timestamp ).format( i18n( 'general.TIMESTAMP_FORMAT' ) );
                                    } else {
                                        return '';
                                    }
                                }
                            },
                            {
                                forPropertyName: 'actType',
                                label: TYPE,
                                title: TYPE,
                                width: '15%',
                                renderer: function( meta ) {
                                    const actType = meta && meta.value;
                                    return Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', actType, 'i18n', 'k.A.' );
                                }
                            },
                            {
                                forPropertyName: 'subType',
                                label: i18n( 'InCaseMojit.casefile_browserJS.placeholder.SUBTYPE' ),
                                title: i18n( 'InCaseMojit.casefile_browserJS.placeholder.SUBTYPE' ),
                                visible: false,
                                width: '100px',
                                renderer: function( meta ) {
                                    const data = meta && meta.row;
                                    return data && data.subType;
                                }
                            },
                            {
                                forPropertyName: 'catalogShort',
                                label: CATALOG,
                                title: CATALOG,
                                width: '15%'
                            },
                            {
                                forPropertyName: 'code',
                                label: CODE,
                                title: CODE,
                                width: '15%',
                                renderer: function( meta ) {
                                    const data = meta && meta.row;
                                    return Y.doccirrus.schemas.activity.displayCode( data );
                                }
                            },
                            {
                                forPropertyName: 'userContent',
                                label: DESCRIPTION,
                                title: DESCRIPTION,
                                width: '40%'
                            }
                        ]
                    }
                } );
            }
        }, {
            schemaName: 'activitysequence',
            NAME: 'ActivitySequenceListModel'
        } );

        function show( config, callback ) {
            Promise.resolve( Y.doccirrus.jsonrpc.api.jade
                .renderFile( { path: 'InCaseMojit/views/activitysequence_modal' } )
            )
                .then( function( response ) {
                    return response && response.data;
                } )
                .then( function( template ) {
                    var
                        i18n = Y.doccirrus.i18n,
                        bodyContent = Y.Node.create( template ),
                        MODAL_TITLE = i18n( 'InCaseMojit.activitysequence_modal_clientJS.title.MODAL_TITLE' ),
                        DELETE_ACTIVITIES = i18n( 'InCaseMojit.activitysequence_modal_clientJS.title.DELETE_ACTIVITIES' ),
                        modal,
                        activitySequenceListModel,
                        buttons = [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL' )
                        ];
                    activitySequenceListModel = new ActivitySequenceListModel( config );

                    if( config.editMode ) {
                        buttons.push( {
                            label: DELETE_ACTIVITIES,
                            name: 'deleteActivity',
                            disabled: true,
                            action: function() {
                                activitySequenceListModel.removeSelected();
                            }
                        } );
                    }
                    buttons.push( Y.doccirrus.DCWindow.getButton( 'OK', {
                            isDefault: true,
                            action: function() {
                                if( !activitySequenceListModel.title.hasError() && activitySequenceListModel.canSave() ) {
                                    if (modal.getButton( 'OK' ) && modal.getButton( 'OK' ).button) {
                                        modal.getButton( 'OK' ).button.disable();
                                    }
                                    callback( activitySequenceListModel.getModelData() );// eslint-disable-line callback-return
                                    modal.close();
                                }
                            }
                        } )
                    );

                    modal = new Y.doccirrus.DCWindow( {
                        id: 'activitysequence_modal',
                        className: 'DCWindow-Appointment',
                        bodyContent: bodyContent,
                        title: MODAL_TITLE,
                        width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        height: '90%',
                        centered: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: ['close'],
                            footer: buttons
                        },
                        after: {
                            visibleChange: function( event ) {
                                if( !event.newVal ) {
                                    ko.cleanNode( bodyContent.getDOMNode() );
                                    activitySequenceListModel.destroy();
                                }
                            }
                        }
                    } );

                    if( config.editMode ) {
                        activitySequenceListModel.addDisposable( ko.computed( function() {
                            var
                                checked = activitySequenceListModel.activitySequenceTable.getComponentColumnCheckbox().checked(),
                                okBtn = modal.getButton( 'deleteActivity' ).button;
                            if( checked.length ) {
                                okBtn.enable();
                            } else {
                                okBtn.disable();
                            }
                        } ) );
                    }

                    activitySequenceListModel.addDisposable( ko.computed( function() {
                        var
                            modelValid = !activitySequenceListModel.title.hasError(),
                            okBtn = modal.getButton( 'OK' ).button;
                        if( modelValid ) {
                            okBtn.enable();
                        } else {
                            okBtn.disable();
                        }
                    } ) );

                    ko.applyBindings( activitySequenceListModel, bodyContent.getDOMNode() );
                } ).catch( catchUnhandled );

        }

        ActivitySequenceModal.prototype.showAddDialog = function( data, callback ) {
            show( data || {}, callback );

        };
        ActivitySequenceModal.prototype.showEditDialog = function( data, callback ) {
            data = data || {};
            data.editMode = true;
            show( data, callback );

        };
        Y.namespace( 'doccirrus.modals' ).activitySequenceModal = new ActivitySequenceModal();

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'DCWindow',
            'doccirrus',
            'ActivitysequenceModel',
            'KoUI-all',
            'activitysequence-schema'
        ]
    }
);
