/**
 * User: do
 * Date: 10/04/15  14:15
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, ko, moment */

'use strict';

YUI.add( 'dcmovetocasefolderrmodal', function( Y, NAME ) {

        var i18n = Y.doccirrus.i18n,
            MOVEMENT_NOT_ALLOWED = i18n( 'InCaseMojit.movetocasefolder-modalJS.messages.MOVEMENT_NOT_ALLOWED' ),
            MOVE_BLOCKED_BY_LINK = i18n( 'InCaseMojit.movetocasefolder-modalJS.messages.MOVE_BLOCKED_BY_LINK' ),
            COPY_ONLY_ALLOWED = i18n( 'InCaseMojit.movetocasefolder-modalJS.messages.COPY_ONLY_ALLOWED' ),
            LBL_MOVE = i18n( 'InCaseMojit.movetocasefolder-modalJS.messages.LBL_MOVE' );

        function mapToIds( activity ) {
            return activity._id;
        }

        /**
         *  ViewModel for contents of move/copy modal
         *
         *  @param  {Object}    data
         *  @param  {Object}    data.caseFolders        Array of plain casefolder objects
         *  @param  {Object}    data.selectedActivities Array of plain activity objects
         *  @param  {Object}    data.currentCaseFolder  Plain CaseFolder object
         *  @param  {Object}
         *  @constructor
         */

        function MoveToCaseFolderModel( data ) {
            var
                currentCaseFolder = data && data.currentCaseFolder,
                currentCaseFolderAdditionalType = currentCaseFolder && currentCaseFolder.additionalType,
                self = this;

            self.selectFolderI18n = i18n('InCaseMojit.change_activity_modal_clientJS.text.SELECT');
            self.timestampPlaceholderI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.TIMESTAMP' );
            this.amount = data && data.selectedActivities && data.selectedActivities.length || 0;
            this.caseFolders = data && data.caseFolders;
            this.currentCaseFolderId = currentCaseFolder && currentCaseFolder._id;
            this.currentCaseFolderType = currentCaseFolder && 'PREPARED' === currentCaseFolder.type;
            this.hasLabData = data.selectedActivities.some( function( item ) {
                return 'LABDATA' === item.actType;
            });


            this.disableCaseFolder = function( $data ) {
                var
                    moveAllowed = Y.doccirrus.schemas.casefolder.movementAllowed( data.selectedActivities, $data ),
                    currentCaseFolder = ( $data._id === self.currentCaseFolderId ),
                    isImported = data && data.currentCaseFolder && !data.currentCaseFolder.imported,
                    additionalType = data && data.currentCaseFolder && Y.doccirrus.schemas.casefolder.additionalTypes.ERROR !== data.currentCaseFolder.additionalType,
                    selectedActivitesHasQDocu = data.selectedActivities.some(function(item){
                        return item.actType === "QDOCU";
                    }),
                    additionalTypeQuotation = data && data.currentCaseFolder && Y.doccirrus.schemas.casefolder.additionalTypes.QUOTATION !== data.currentCaseFolder.additionalType;
                return !moveAllowed || currentCaseFolder || ( data && data.currentCaseFolder && !( isImported || additionalType ) ) || ( this.hasLabData && 'PREPARED' === $data.type ) || ( !additionalTypeQuotation && 'PREPARED' === $data.type ) || ($data.type !== "PUBLIC" && $data.type !== "PUBLIC_A" && selectedActivitesHasQDocu);
            };

            this.findFirstToSelect = function( caseFolders, currentCaseFolderId ) {
                var found;
                caseFolders.some( function( casefolder ) {
                    if( currentCaseFolderId !== casefolder._id && !self.disableCaseFolder( casefolder ) ) {
                        found = casefolder._id;
                        return true;
                    }
                } );
                return found;
            };

            this.selected = ko.observable( this.findFirstToSelect( this.caseFolders, this.currentCaseFolderId ) );

            this.selectedObj = ko.computed( function() {
                var found,
                    selectedId = this.selected();
                if( this.caseFolders && this.caseFolders.length ) {
                    this.caseFolders.some( function( caseFolder ) {
                        if( caseFolder._id === selectedId ) {
                            found = caseFolder;
                            return true;
                        }
                    } );
                }
                return found;
            }.bind( this ) );

            this.canOnlyCopy = '';
            this.copyMode = false;
            this.timestamp = ko.observable( moment().toISOString() );
            ko.computed( function() {
                var
                    timestamp = ko.unwrap( self.timestamp ),
                    time = moment( timestamp ),
                    now = moment();
                if( time.isValid && time.isAfter( now ) ) {
                    self.timestamp( now.toISOString() );
                }
            } );
            if( data && Y.doccirrus.schemas.casefolder.additionalTypes.QUOTATION === currentCaseFolderAdditionalType || currentCaseFolder && currentCaseFolder.imported ) {
                this.canOnlyCopy = COPY_ONLY_ALLOWED;
                this.copyMode = true;
            }




            this.getSelectedTimestamp = function() {
                if( currentCaseFolder ) {
                    return ko.utils.peekObservable( self.timestamp );
                } else {
                    return null;
                }
            };


            /**
             *  Check if a batch of activities can be moved to another casefolder
             *
             *  If there are links in referencedBy which fall outside the set of activities then we cannot move the batch
             *  because we would be breaking activities in the casefolder we are moving from - eg, moving a medication but
             *  not the prescription it belongs to.
             *
             *  @param  {Object}    activities  Array of plain activity objects or activity models
             *  @return {Boolean}               True if all OK
             */

            this.canMoveFromCaseFolder = function( activities ) {
                var
                    allIds = [],
                    canMove = true,
                    referencedByPlain,
                    currRef,
                    i, j;

                for ( i = 0; i < activities.length; i++ ) {
                    allIds.push( ko.unwrap( activities[i]._id ) );
                }

                for ( i = 0; i < activities.length; i++ ) {
                    referencedByPlain = ko.unwrap( activities[i].referencedBy ) || [];

                    for ( j = 0; j < referencedByPlain.length; j++ ) {
                        currRef = referencedByPlain[j];

                        if ( -1 === allIds.indexOf( currRef ) ) {
                            canMove = false;
                            Y.log( 'Can not move batch of activities between casefolder, block by reference of ' + currRef + ' ' + ko.unwrap( activities[i]._id ), 'info', NAME );
                        }
                    }
                }

                return canMove;
            };

            //  check whether move is possible given links between activities and others in the casefolder
            if ( !this.canMoveFromCaseFolder( data.selectedActivities ) ) {
                this.canOnlyCopy = MOVE_BLOCKED_BY_LINK;
                this.copyMode = true;
            }
        }

        function showErrorOnMovement() {
            Y.doccirrus.DCWindow.notice( {
                message: MOVEMENT_NOT_ALLOWED
            } );
        }

        Y.namespace( 'doccirrus.modals' ).moveToCaseFolder = {
            show: function( data, callback ) {
                var
                    model = new MoveToCaseFolderModel( data ),
                    modal,
                    node = Y.Node.create( '<div></div>' );

                function runMove(  caseFolderId, activityIds ) {
                    Y.doccirrus.jsonrpc.api.casefolder.moveActivitiesToCaseFolder( {
                        activityIds: activityIds,
                        caseFolderId: caseFolderId
                    } ).done( function() {
                        callback( null, {caseFolderId: caseFolderId} );
                    } ).fail( function( error ) {
                        callback( new Error( 'could not move activity to case folder' ) );
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } ).always( function() {
                        modal.close();
                    } );
                }

                function moveActivities( caseFolderId, activityIds ) {
                    if( Y.doccirrus.schemas.casefolder.getPreparedCaseFolderId() === caseFolderId ) {
                        Y.doccirrus.DCWindow.confirm( {
                            message: i18n( 'InCaseMojit.movetocasefolder-modalJS.confirm' ),
                            callback: function( confirm ) {
                                if( confirm.success ) {
                                    runMove(  caseFolderId, activityIds );
                                }
                            }
                        } );
                    } else {
                        runMove(  caseFolderId, activityIds );
                    }
                }

                function copyActivities( caseFolderId, activityIds, timestamp ) {
                    Y.doccirrus.jsonrpc.api.casefolder.copyActivitiesToCaseFolder( {
                        query: {
                            activityIds: activityIds,
                            caseFolderId: caseFolderId,
                            timestamp: timestamp
                        }
                    } ).done( function() {
                        callback( null, {caseFolderId: caseFolderId} );
                    } ).fail( function( error ) {
                        callback( new Error( 'could not copy activity to case folder' ) );
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } ).always( function() {
                        modal.close();
                    } );
                }

                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'movetocasefolder_modal',
                    'InCaseMojit',
                    {},
                    node,
                    function() {
                        modal = new Y.doccirrus.DCWindow( {
                                className: 'DCWindow-Create-CaseFolder',
                                bodyContent: node,
                                title: i18n( 'InCaseMojit.movetocasefolder-modalJS.title' ),
                                icon: Y.doccirrus.DCWindow.ICON_LIST,
                                width: Y.doccirrus.DCWindow.SIZE_LARGE,
                                minHeight: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                                centered: true,
                                modal: true,
                                dragable: true,
                                maximizable: true,
                                resizeable: true,
                                render: document.body,
                                buttons: {
                                    header: ['close', 'maximize'],
                                    footer: [
                                        Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                        Y.doccirrus.DCWindow.getButton( 'OK', {
                                            label: LBL_MOVE + ' ( ' + model.amount + ' )',
                                            isDefault: true,
                                            action: function() {
                                                modal.close();
                                                if( 
                                                    Y.doccirrus.schemas.casefolder.movementAllowed( data.selectedActivities, model.selectedObj() ) ||
                                                    Y.doccirrus.schemas.casefolder.additionalTypes.ERROR === data.currentCaseFolder.additionalType ||
                                                    data.currentCaseFolder.imported
                                                ) {
                                                    if( model.copyMode ) {
                                                        copyActivities( model.selected(), data.selectedActivities.map( mapToIds ), model.getSelectedTimestamp() );
                                                    } else {
                                                        moveActivities( model.selected(), data.selectedActivities.map( mapToIds ) );
                                                    }

                                                } else {
                                                    showErrorOnMovement();
                                                }
                                            }
                                        } )
                                    ]
                                }
                            }
                        );

                        ko.computed( function() {
                            var
                                SAVE = modal.getButton( 'OK' ).button,
                                isValid =  ko.unwrap( model.selected );
                            if( modal && SAVE ) {
                                if ( isValid ) {
                                    SAVE.enable();
                                } else {
                                    SAVE.disable();
                                }
                            }
                        } );

                        ko.applyBindings( model, node.getDOMNode().querySelector( '#movetocasefolder' ) );
                    }
                );

            }
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow'
        ]
    }
);
