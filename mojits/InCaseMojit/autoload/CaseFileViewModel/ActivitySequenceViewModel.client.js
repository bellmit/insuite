/**
 * User: pi
 * Date: 25/01/16  10:55
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*eslint prefer-template: 0*/
/*global YUI, ko, moment, _, $ */
'use strict';
YUI.add( 'ActivitySequenceViewModel', function( Y, NAME ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        SCHEIN_AMOUNT_ERROR = i18n( 'InCaseMojit.casefile_browserJS.message.SCHEIN_AMOUNT_ERROR' ),
        PLEASE_CORRECT = i18n( 'InCaseMojit.casefile_browserJS.message.PLEASE_CORRECT' ),
        //BTN_OK = i18n( 'InCaseMojit.casefile_browserJS.button.OK' ),
        CANCELLED_SEQUENCE = i18n( 'InCaseMojit.casefile_browserJS.message.CANCELLED_SEQUENCE' ),
        SELECT_CASEFILE = i18n( 'InCaseMojit.casefile_browserJS.message.SELECT_CASEFILE' ),
        WRONG_CASEFOLDER_EXAMPLES = i18n( 'InCaseMojit.casefile_browserJS.text.WRONG_CASEFOLDER_EXAMPLES' ),
        BLOCKED_FOR_SEQUENCE = i18n('InCaseMojit.casefile_browserJS.message.BLOCKED_FOR_SEQUENCE'),
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable;

    /**
     * @constructor
     * @class ActivitySequenceViewModel
     */
    function ActivitySequenceViewModel() {
        ActivitySequenceViewModel.superclass.constructor.apply( this, arguments );
    }

    function onFailed( error ) {
        Y.doccirrus.DCWindow.notice( {
            type: 'error',
            message: error.data,
            window: {
                width: Y.doccirrus.DCWindow.SIZE_MEDIUM
            }
        } );
    }

    Y.extend( ActivitySequenceViewModel, KoViewModel.getDisposable(), {
        /** @protected */
        initializer: function ActivitySequenceViewModel_initializer() {
            var
                self = this;

            self.initActivitySequenceViewModel();
            self.initSlidePanel();
        },
        /** @protected */
        destructor: function ActivitySequenceViewModel_destructor() {
            var
                self = this;

            self.destroyActivitySequenceViewModel();
        },
        initActivitySequenceViewModel: function ActivitySequenceViewModel_initActivitySequenceViewModel() {
            var
                self = this,
                currentPatient = unwrap( self.get( 'currentPatient' ) ),
                currentCaseFolder;

            self.template = {
                name: self.get( 'templateName' ),
                data: self,
                afterRender: self.afterRender.bind( self ),
                afterAdd: self.afterAdd.bind( self ),
                beforeRemove: self.beforeRemove.bind( self )
            };

            self.canChangeMode = ko.observable( true );
            self.applySequence = function( sequence ) {
                self.showApplyModal( {
                    sequenceId: peek( sequence._id )
                } );
            };
            self.changeViewMode = function() {
                var
                    self = this;
                self.groupViewMode( !self.groupViewMode() );
            };

            /**
             *  Save new and modified activity sequences back to the server, raised by save button in edit mode
             */

            self.save = function() {
                var
                    plainSequences = unwrap( self.sequenceList ),
                    dirtySequences = [],
                    justOrderUpdate = [];

                //If has new need to update the order of each
                var hasNew = plainSequences.find( function( sequence ) {
                    return sequence.isNew();
                } );
                // find new or edited activity sequences to be saved back to server
                plainSequences.forEach( function( sequence, idx ) {
                    sequence.order( idx + 1 );
                    if( sequence.isNew() || sequence.isModified() ) {
                        dirtySequences.push( self.lightSequenceToJSON( sequence ) );
                    } else if( hasNew ){
                        justOrderUpdate.push( self.lightSequenceToJSON( sequence ) );
                    }
                } );

                if ( 0 === dirtySequences.length ) {
                    self.toggleMode();
                    return;
                }

                if( dirtySequences.length ) {
                    Y.doccirrus.jsonrpc.api.activitysequence.updateSequences( {
                        query: {
                            sequences: dirtySequences
                        }
                    } ).done( function() {
                        updateEntries( justOrderUpdate );
                    } ).fail( onFailed );
                } else {
                    updateEntries( justOrderUpdate );
                }

                function updateEntries( changedEntries ){
                    if( changedEntries.length ){
                        Y.doccirrus.jsonrpc.api.activitysequence.batchUpdate( {
                            data: {
                                sequence: changedEntries.map( function( el ){ return { _id: el._id, order: el.order }; })
                            }
                        } )
                        .done( function(){
                            self.clearCaches();
                            self.updateList( currentCaseFolder );
                            self.toggleMode();
                        } )
                        .fail( onFailed );
                    } else {
                        self.clearCaches();
                        self.updateList( currentCaseFolder );
                        self.toggleMode();
                    }
                }

            };
            self.back = function() {
                self.toggleMode();
                self.updateList( currentCaseFolder );
            };
            self.changeMode = function() {
                self.toggleMode();
            };
            self.addFirst = function() {
                self.addSequence( {
                    order: function() {
                        return 0;
                    },
                    _prevOrder: 0,
                    sequenceGroups: []
                }, -1 );
            };

            self.deleteSequence = function( activitySequenceModel, position ) {
                if( activitySequenceModel._id() ) {
                    activitySequenceModel.isDeleted( true );

                    Y.doccirrus.jsonrpc.api.activitysequence.delete( {
                        noBlocking: true,
                        query: { _id: activitySequenceModel._id() }
                    } )
                        .then( onSequenceDeleted )
                        .fail( onDeletionFailed );

                } else {
                    if( activitySequenceModel.dispose ) {
                        activitySequenceModel.dispose();
                    }
                    self.sequenceList.splice( position, 1 );
                }

                function onSequenceDeleted() {
                    //  reload the list of sequences to clean up
                    currentCaseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab();
                    self.clearCaches();
                    self.updateList( currentCaseFolder );
                }

                function onDeletionFailed( err ) {
                    Y.log( 'Could not delete activity sequence: ' + JSON.stringify( err ), 'error', NAME );
                }
            };
            self.changeSequence = function( activitySequenceModel, position ) {
                if( !activitySequenceModel.isNew() && !activitySequenceModel.activities.length ) {
                    Y.doccirrus.jsonrpc.api.activitysequence.getSequenceWithActivities( {
                            query: {
                                _id: activitySequenceModel._id()
                            }
                        } )
                        .done( function( response ) {
                            var
                                fullData = response.data && response.data[0];

                            activitySequenceModel.activities = fullData.activities || [];
                            self.showEditModal( position, activitySequenceModel );
                        } )
                        .fail( function( error ) {
                            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                        } );
                } else {
                    self.showEditModal( position, activitySequenceModel );
                }

            };
            
            self.isItemVisible = function( groups, group ) {
                return groups.some( function( item ) {
                    return item.name === group;
                } );
            };
            
            self.isEditMode = ko.observable( false );
            self.groupViewMode = ko.observable( Y.doccirrus.utils.localValueGet( 'sequence_groups' ) === 'true' );
            self.sequenceList = ko.observableArray();
            self.sequenceGroups = ko.observableArray();
            self.filter = ko.observable( '' );

            self.filterSubscription = self.filter.subscribe( function( newValue ) {
                self.filterVisible( newValue );
            } );

            self.addDisposable( ko.computed( function() {
                var newCaseFolder = unwrap( currentPatient && currentPatient.caseFolderCollection.getActiveTab() );
                // looks like newCaseFolder has a value always, except when deleting a cf
                // -> if currentCaseFolder exists and it has different type than newCaseFolder OR currentCaseFolder doesn't exists
                // -> assign a value of newCaseFolder to currentCaseFolder and update a list of activitysequences for that currentCaseFolder
                if( !newCaseFolder ) {
                    self.updateList(); // deleting CF
                    return;
                }
                if( (currentCaseFolder && currentCaseFolder.type !== newCaseFolder.type) || !currentCaseFolder ) {
                    currentCaseFolder = newCaseFolder;
                    self.updateList( currentCaseFolder );
                }
            } ) );

            self.addDisposable( ko.computed( function() {
                var
                    groupViewMode = unwrap( self.groupViewMode );
                Y.doccirrus.utils.localValueSet( 'sequence_groups', groupViewMode );
                if( groupViewMode ) {
                    self.openGroup();
                }
            }) );

            self.buttonChangeI18n = i18n('InCaseMojit.casefile_browser.button.CHANGE');
            self.placeholderSearchI18n = i18n('InCaseMojit.casefile_browser.placeholder.SEARCH');
            self.placeholderSearchTitleI18n = i18n('InCaseMojit.casefile_browser.title.SEARCH_TITLE');
            self.activityButtonSaveI18n = i18n('InCaseMojit.casefile_browser.button.SAVE');
        },
        sideBarConfig: null,
        rightSidePanel: null,
        isPinned: null,
        wasPinned: null,
        initSlidePanel: function ActivitySequenceViewModel_initSlidePanel() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient ),
                ddDelegate,
                drag,
                ddDelegateGroups,
                dragGroups,
                ddDelegateDocs,
                dragDocs;

            self.isPinned = ko.observable( false );
            self.wasPinned = false;

            self.sideBarConfig = {
                side: 'right',
                name: 'activitySequenceView',
                panelHeading: i18n( 'InCaseMojit.casefile_browser.title.NEW_SEQUENCE' ),
                visible: self.addDisposable( ko.computed( function() {
                    var caseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab(),
                        isEDOC = caseFolder && Y.doccirrus.schemas.casefolder.isEDOC( caseFolder ),
                        isPinned = self.isPinned(),
                        activeTab = currentPatient && currentPatient.caseFolderCollection.getActiveTab(),
                        currentCaseFolderType = activeTab && activeTab.type, // Evaluates to null on the "Alle Fälle" tab.
                        isEDocOrAllCaseFolders = isEDOC || !currentCaseFolderType;

                    if( self.rightSidePanel && isEDocOrAllCaseFolders && isPinned ) {
                        self.wasPinned = true;
                        self.rightSidePanel.setPinned( false, true );
                    } else if( self.rightSidePanel && !isEDocOrAllCaseFolders && !isPinned && self.wasPinned ) {
                        self.wasPinned = false;
                        self.rightSidePanel.setPinned( true, true );
                    }

                    return !isEDocOrAllCaseFolders;
               } ) ),
                onInit: function( sideBar ) {
                    var
                        element = sideBar.$panelBody[0];
                    sideBar.$container.addClass( 'col-md-2' );

                    self.rightSidePanel = sideBar;

                    setTimeout(function() {
                        // need delay to initiate drag
                        initDrag();
                    }, 500);

                    function initDrag() {
                        destroyDrag();

                        ddDelegate = new Y.DD.Delegate( {
                            container: element,
                            nodes: 'div.sequenceList-block',
                            target: true, // items should also be a drop target
                            dragConfig: {}
                        } );
                        drag = ddDelegate.dd;

                        ddDelegateGroups = new Y.DD.Delegate( {
                            container: element,
                            nodes: 'div.groupsList-block',
                            target: true, // items should also be a drop target
                            dragConfig: {}
                        } );
                        dragGroups = ddDelegateGroups.dd;

                        ddDelegateDocs = new Y.DD.Delegate( {
                            container: element,
                            nodes: 'div.sequenceList-docs-block',
                            target: true, // items should also be a drop target
                            dragConfig: {}
                        } );
                        dragDocs = ddDelegateDocs.dd;

                        drag.addHandle( '.activitySequenceViewModel-dragHandle' );
                        dragGroups.addHandle( '.activitySequenceViewModel-group-dragHandle' );
                        dragDocs.addHandle( '.activitySequenceViewModel-docs-dragHandle' );

                        ddDelegate.on( {
                            'drag:start': function( yEvent ) {
                                var
                                    node = yEvent.target.get( 'node' ),
                                    dragNode = yEvent.target.get( 'dragNode' );
                                drag.con.set( 'constrain2node', node._node.parentNode );
                                ddDelegate.syncTargets();

                                node.setStyle( 'opacity', 0.25 );
                                dragNode.setStyle( 'opacity', 0.65 );

                            },
                            'drag:end': function( yEvent ) {
                                var
                                    node = yEvent.target.get( 'node' );

                                node.setStyle( 'opacity', 1 );

                            },
                            'drop:hit': function( yEvent ) {
                                var
                                    dropNode = yEvent.drop.get( 'node' ),
                                    dragNode = yEvent.drag.get( 'node' ),
                                    dragData = ko.dataFor( dragNode.getDOMNode() ),
                                    dropData = ko.dataFor( dropNode.getDOMNode() ),
                                    buttons = unwrap( self.sequenceList ),
                                    data = peek( buttons ),
                                    dragIndex = data.indexOf( dragData ),
                                    dropIndex = data.indexOf( dropData ),
                                    item = buttons[dragIndex];

                                if( dragIndex === dropIndex ){
                                    return;
                                }

                                self.sequenceList.splice( dragIndex, 1 );
                                self.sequenceList.splice( dropIndex, 0, item);

                                // change sorting
                                self.sequenceList().forEach(function( item, idx ) {
                                   item.order( idx + 1 );
                                });

                                if( !self.sequenceList().length ){
                                    return;
                                }

                                Y.doccirrus.jsonrpc.api.activitysequence.batchUpdate( {
                                    data: {
                                        sequence: (self.sequenceList() || []).map( function( sequence ){
                                            var el = self.lightSequenceToJSON( sequence );
                                            return { _id: el._id, order: el.order };
                                        } )
                                    }
                                } )
                                    .done( onDragUpdateSuccess )
                                    .fail( onFailed );
                            }
                        } );

                        ddDelegateGroups.on( {
                            'drag:start': function( yEvent ) {
                                var
                                    node = yEvent.target.get( 'node' ),
                                    dragNode = yEvent.target.get( 'dragNode' );

                                dragGroups.con.set( 'constrain2node', node._node.parentNode );
                                ddDelegateGroups.syncTargets();

                                node.setStyle( 'opacity', 0.25 );
                                dragNode.setStyle( 'opacity', 0.65 );
                            },
                            'drag:end': function( yEvent ) {
                                var
                                    node = yEvent.target.get( 'node' );

                                node.setStyle( 'opacity', 1 );

                            },
                            'drag:drophit': function( yEvent ) {
                                var
                                    dropNode = yEvent.drop.get( 'node' ),
                                    dragNode = yEvent.drag.get( 'node' ),
                                    dragData = ko.dataFor( dragNode.getDOMNode() ),
                                    dropData = ko.dataFor( dropNode.getDOMNode() ),
                                    buttons = self.sequenceGroups(),
                                    allSequences = self.sequenceList(),
                                    data = peek( buttons ),
                                    dragIndex = data.indexOf( dragData ),
                                    dropIndex = data.indexOf( dropData ),
                                    dirtySequences = [];

                                if ( 0 === dropIndex ) {
                                    buttons.unshift( buttons[ dragIndex ] );
                                    buttons.splice( dragIndex + 1, 1 );
                                } else {
                                    buttons.splice( dropIndex + 1, 0, buttons[dragIndex]);
                                    buttons.splice( dragIndex, 1 );
                                }

                                self.sequenceGroups( buttons );

                                //  change sorting order
                                buttons.forEach( function( item, idx ) {
                                    var
                                        sequenceQuery = { sequenceGroups: item.name },
                                        inThisGroup = self.getSequencesByGroup( sequenceQuery );

                                    inThisGroup.forEach( function( sequence ) {
                                        sequence.sequenceGroups.forEach( function( i ) {
                                            if( i.name === item.name ) {
                                                if ( !i.order || i.order !== idx + 1 ) {
                                                    i.order = idx + 1;
                                                    sequence.isModified( true );
                                                }
                                            }
                                        } );

                                    } );
                                } );

                                //  collect those which need to be updated on the server
                                allSequences.forEach( function( sequence ) {
                                    if ( sequence.isModified() ) {
                                        dirtySequences.push( self.lightSequenceToJSON( sequence ) );
                                    }
                                } );

                                if( dirtySequences.length ){
                                    Y.doccirrus.jsonrpc.api.activitysequence.updateSequences( { query: { sequences: dirtySequences } } )
                                    .done( onDragUpdateSuccess )
                                    .fail( onFailed );
                                }
                            }
                        } );

                        ddDelegateDocs.on( {
                            'drag:start': function( yEvent ) {
                                var
                                    node = yEvent.target.get( 'node' ),
                                    dragNode = yEvent.target.get( 'dragNode' );

                                dragDocs.con.set( 'constrain2node', node._node.parentNode );
                                ddDelegateDocs.syncTargets();

                                node.setStyle( 'opacity', 0.25 );
                                dragNode.setStyle( 'opacity', 0.65 );
                            },
                            'drag:end': function( yEvent ) {
                                var
                                    node = yEvent.target.get( 'node' );

                                node.setStyle( 'opacity', 1 );
                            },
                            'drag:drophit': function( yEvent ) {
                                var
                                    dropNode = yEvent.drop.get( 'node' ),
                                    dragNode = yEvent.drag.get( 'node' ),
                                    groupName = dragNode._node.parentNode.parentNode.childNodes[1].textContent,
                                    filteredGroups = self.sequenceGroups().filter(function( item ) {
                                        return item.name === groupName;
                                    }),
                                    data = filteredGroups[0].sequenceList(),
                                    dragData = ko.dataFor( dragNode.getDOMNode() ),
                                    dropData = ko.dataFor( dropNode.getDOMNode() ),
                                    dragIndex = data.indexOf( dragData ),
                                    dropIndex = data.indexOf( dropData ),
                                    item = _.assign({}, data[dragIndex]),
                                    dirtySequences = [];

                                filteredGroups[0].sequenceList.splice( dragIndex, 1 );
                                filteredGroups[0].sequenceList.splice( dropIndex, 0, item);

                                ( filteredGroups[0].sequenceList() || []).forEach( function( sequence, idx ) {
                                    var groupIndex;
                                    if( !sequence.orderInGroup ) {
                                        sequence.orderInGroup = {};
                                    }
                                    sequence.sequenceGroups.forEach( function( i, indx ) {
                                        if( i.name === groupName ) {
                                            groupIndex = indx;
                                        }
                                    } );
                                    sequence.orderInGroup[sequence.sequenceGroups[groupIndex].name.toString()] = idx + 1;
                                    dirtySequences.push( self.lightSequenceToJSON( sequence ) );
                                } );
                                if( dirtySequences.length ){
                                    Y.doccirrus.jsonrpc.api.activitysequence.batchUpdate( {
                                        data: {
                                            sequence: dirtySequences.map( function( el ){
                                                return { _id: el._id, orderInGroup: el.orderInGroup };
                                            } )
                                        }
                                    } )
                                    .done( onDragUpdateSuccess )
                                    .fail( onFailed );
                                }
                            }
                        } );

                        // drag proxy
                        drag.plug( Y.Plugin.DDProxy, {
                            moveOnEnd: false,
                            resizeFrame: false,
                            cloneNode: true
                        } );

                        // drag proxy
                        dragGroups.plug( Y.Plugin.DDProxy, {
                            moveOnEnd: false,
                            resizeFrame: false,
                            cloneNode: true
                        } );

                        // drag proxy
                        dragDocs.plug( Y.Plugin.DDProxy, {
                            moveOnEnd: false,
                            resizeFrame: false,
                            cloneNode: true
                        } );

                        // drag constrained
                        drag.plug( Y.Plugin.DDConstrained, {
                            constrain2node: element.querySelector( '.sequenceList-container' ),
                            stickY: true
                        } );

                        // drag constrained
                        dragGroups.plug( Y.Plugin.DDConstrained, {
                            constrain2node: element.querySelector( '.groupsList-container' ),
                            stickY: true
                        } );

                        // drag constrained
                        dragDocs.plug( Y.Plugin.DDConstrained, {
                            constrain2node: element.querySelector( '.sequenceList-docs-block' ),
                            stickY: true
                        } );
                    }

                    function onDragUpdateSuccess() {
                        self.clearCaches();
                    }

                    function destroyDrag() {
                        if( ddDelegate ) {
                            ddDelegate.destroy();
                        }
                        if( ddDelegateGroups ) {
                            ddDelegateGroups.destroy();
                        }
                        if( ddDelegateDocs ) {
                            ddDelegateDocs.destroy();
                        }
                    }

                    sideBar.onPin = function( pinned ) {
                        self.isPinned( pinned );

                        initDrag(); // @see description

                        // drag scroll  @see "initDrag" description
                        if( pinned ) {
                            drag.plug( Y.Plugin.DDWinScroll, {
                                horizontal: false,
                                buffer: 50
                            } );

                            dragGroups.plug( Y.Plugin.DDWinScroll, {
                                horizontal: false,
                                buffer: 50
                            } );

                            dragDocs.plug( Y.Plugin.DDWinScroll, {
                                horizontal: false,
                                buffer: 50
                            } );
                        }
                        else {
                            drag.plug( Y.Plugin.DDNodeScroll, {
                                horizontal: false,
                                buffer: 50,
                                node: sideBar.$container[0]
                            } );
                            dragGroups.plug( Y.Plugin.DDNodeScroll, {
                                horizontal: false,
                                buffer: 50,
                                node: sideBar.$container[0]
                            } );
                            dragDocs.plug( Y.Plugin.DDNodeScroll, {
                                horizontal: false,
                                buffer: 50,
                                node: sideBar.$container[0]
                            } );
                        }
                    };
                }
            };
        },
        destroyActivitySequenceViewModel: function ActivitySequenceViewModel_destroyActivitySequenceViewModel() {
        },
        templateName: null,
        updateList: function ActivitySequenceViewModel_updateList( caseFolder ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                cacheKey = 'activitysequences-' + ( caseFolder && caseFolder.type ),
                cachedLightSequences,
                query = {};

            caseFolder = caseFolder || {};

            if( caseFolder.type ) {
                query.caseFolderType = caseFolder.type;
            }

            self.sequenceList( [] );

            //  we might have downloaded these already
            if ( caseFolder.type ) {
                cachedLightSequences = binder.getSimpleData( cacheKey );
                if ( cachedLightSequences ) {
                    return onDownloadedSequences( { data: cachedLightSequences } );
                }
            }

            Y.doccirrus.jsonrpc.api.activitysequence.getLightSequences( {noBlocking: true, query: query } )
                .done( onDownloadedSequences )
                .fail( onDownloadFail );

            function onDownloadedSequences( response ) {
                var
                    newSequenceViewModels = [],
                    startTime = new Date().getTime(), endTime;

                //  save these for next time
                if ( caseFolder.type && !cachedLightSequences ) {
                    binder.setSimpleData( cacheKey, response.data );
                }

                if( response && response.data ) {
                    self.currentLightSequences = response.data;
                    _.sortBy(response.data, 'order').forEach( function( sequence ) {
                        newSequenceViewModels.push( self.makeLightActivitySequenceModel( sequence ) );
                    } );
                }

                try {
                    self.sequenceList( newSequenceViewModels );
                    self.updateGroups( caseFolder );
                    //self.filterVisible( self.filter() );
                } catch ( koErr ) {
                    Y.log( 'Could not update list of activity sequences: ' + JSON.stringify( koErr ), 'error', NAME );
                }

                endTime = new Date().getTime();
                Y.log( 'Created ' + response.data.length + ' activity sequence models in ' + ( endTime - startTime ) + ' ms', 'info', NAME );
            }

            function onDownloadFail( err ) {
                Y.log( 'Could not download activitysequences: ' + JSON.stringify( err ), 'error', NAME );
            }

        },

        /**
         *  Make a KO viewmodel which is lighter and faster than instantiating ActivitysequenceModel
         *
         *  @param  {Object}    lightSequence   Reduced activitysequence model
         */

        makeLightActivitySequenceModel: function( lightSequence ) {
            function getLightKoModel() {
                var
                    self = {};

                self.plainData = lightSequence;

                //  observables used by KO binding
                self._id = ko.observable( lightSequence._id );
                self.title = ko.observable( lightSequence.title || '' );
                self.description = ko.observable( lightSequence.description || '' );
                self.order = ko.observable( lightSequence.order || 0 );

                self.isDeleted = ko.observable( false );
                self.isNew = ko.observable( false );
                self.isModified = ko.observable( false );
                self.isVisible = ko.observable( true );

                //  don't need to be observable
                self.useOriginalValues = lightSequence.useOriginalValues || false;
                self.sequenceGroups = lightSequence.sequenceGroups || [];

                self.activities = lightSequence.activities || [];
                self.activitiesId = lightSequence.activitiesId || [];
                self.orderInGroup = lightSequence.orderInGroup || {};

                return self;
            }

            return getLightKoModel();
        },

        /**
         *  Serialize light KO viewmodel to JSON to be saved back to server
         *
         *  @param  {Object}    lightSequence
         */

        lightSequenceToJSON: function( lightSequence ) {
            var
                copyFields = [
                    '_id', 'title', 'description', 'order', 'useOriginalValues', 'activitiesId',
                    'sequenceGroups', 'prevOrder', 'activities', 'orderInGroup'
                ],
                jsonObj = {},
                i;

            for ( i = 0; i < copyFields.length; i++ ) {
                jsonObj[ copyFields[i] ] = unwrap( lightSequence[ copyFields[i] ] );
            }

            return jsonObj;
        },

        /**
         *  Get a list of all sequence groups and cache it on the binder
         *  @param caseFolder
         */

        updateGroups: function ActivitySequenceViewModel_updateGroups( caseFolder ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                caseType = caseFolder && caseFolder.type,
                cacheKey = 'sequencegroups-' + caseType,
                cachedSequenceGroups;

            if( caseType ){
                cachedSequenceGroups = binder.getSimpleData( cacheKey );
            }

            self.sequenceGroups([]);

            //  groups may already be cached
            if ( cachedSequenceGroups ) {
                return onGroupsAvailable( { data: cachedSequenceGroups } );
            }

            Y.doccirrus.jsonrpc.api.activitysequence.getAllSequenceGroups( { query: {} } ).done( onGroupsAvailable );

            function onGroupsAvailable( response ) {
                var data = response && response.data || [];

                if ( !cachedSequenceGroups ) {
                    binder.setSimpleData( cacheKey, data );
                }

                self.sequenceGroups(_.sortBy( data, 'order').map( function( item ) {
                    item.sequenceList = ko.observableArray( [] );
                    item.itemsVisible = ko.observable( true );
                    return item;
                } ));

                self.sequenceGroups().map(function( item ) {
                    var query = {}, data;
                    caseFolder = caseFolder || {};
                    if( caseFolder.type ) {
                        query.caseFolderType = caseFolder.type;
                    }
                    //if( filter ) {
                    //    query.titleOrDescription = filter;
                    //}

                    query.sequenceGroups = item.name;

                    data = self.getSequencesByGroup( query );
                    item.itemsVisible( data && data.length > 0 );
                    item.sequenceList( _.sortBy( data, 'orderInGroup['+ item.name +']' ) );
                });

                try {
                    self.filterVisible( self.filter() );
                    self.openGroup();
                } catch ( koErr ) {
                    Y.log( 'Error on updating groups: ' + JSON.stringify( koErr ), 'error', NAME );
                }

            }
        },

        /**
         *  Filter the set of sequences on client, rather than calling to the server for every group (some practices have hundreds of groups)
         *
         *  @param query
         *  @return {Array}
         */

        getSequencesByGroup: function( query ) {
            var
                self = this,
                lightSequences = self.sequenceList() || [],
                seq,
                kept = [],
                hasGroup,
                i, j;

            for ( i = 0; i < lightSequences.length; i++ ) {
                seq = lightSequences[i];
                seq.sequenceGroups = seq.sequenceGroups || [];
                hasGroup = false;

                if ( query.sequenceGroups && seq.sequenceGroups && seq.sequenceGroups[0] ) {
                    for ( j = 0; j < seq.sequenceGroups.length; j++ ) {
                        if ( seq.sequenceGroups[j] && seq.sequenceGroups[j].name === query.sequenceGroups ) {
                            hasGroup = true;
                        }
                    }
                }
                
                //  light sequences are already filtered to casefolder type
                if ( hasGroup ) {
                    kept.push( seq );
                }
            }

            return kept;
        },

        /**
         *  Update the visibility of sequence buttons in the panel on change to filter value
         *  @param filterValue
         */

        filterVisible: function ActivitySequenceViewModel_filterVisible( filterValue ) {
            var
                self = this,
                query = filterValue.toLowerCase().split( ' ' ),
                plainSequences = self.sequenceList(),
                plainGroups = self.sequenceGroups(),
                lightSequence, matchAll, searchString,
                i, j;

            //  change visibility of buttons
            for ( i = 0; i < plainSequences.length; i++ ) {
                lightSequence = plainSequences[i];
                searchString = lightSequence.title().toLowerCase() + ' ' + lightSequence.description().toLowerCase();
                matchAll = true;

                //  check each clause of the query
                for ( j = 0; j < query.length; j++ ) {
                    if ( '' !== query[j] && -1 === searchString.indexOf( query[j] ) ) {
                        matchAll = false;
                    }
                }
                lightSequence.isVisible( matchAll );
            }

            //  change visibility of groups, hide those with no visible sequences
            for ( i = 0; i < plainGroups; i++ ) {
                plainSequences = plainGroups[i].sequenceList();
                matchAll = false;
                for ( j = 0; j < plainSequences.length; j++ ) {
                    if ( plainSequences[j].isVisible() ) {
                        matchAll = true;
                    }
                }
                plainGroups[i].itemsVisible( matchAll );
            }
        },

        addSequence: function ActivitySequenceViewModel_addSequence( data, position ) {
            var
                self = this,
                currentPatient = unwrap( self.get( 'currentPatient' ) ),
                currentCaseFolderModel = currentPatient.caseFolderCollection,
                activeCaseFolder = currentCaseFolderModel.getActiveTab(),
                aCaseFileViewModel = KoViewModel.getViewModel( 'CaseFileViewModel' ),
                selectedActivities = aCaseFileViewModel && aCaseFileViewModel.activitiesTable.getComponentColumnCheckbox().checked(),
                scheinAmout = 0, errMessage = CANCELLED_SEQUENCE,
                warningMessage,
                actTypeConfig = Y.doccirrus.schemas.activity.getActTypeClientConfig(),
                blockedActivitiesTypes = new Set([]);

            selectedActivities.forEach(function( act ) {
                if (actTypeConfig[act.actType].isBlockedForSequence) {
                    blockedActivitiesTypes.add(Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', act.actType, 'i18n', 'k.A.' ));
                }
            });

            if( selectedActivities && selectedActivities.length && !blockedActivitiesTypes.size) {
                if( selectedActivities.some( function( activity ) {
                        if( 'SCHEIN' === activity.actType || 'PKVSCHEIN' === activity.actType || 'BGSCHEIN' === activity.actType ) {
                            scheinAmout++;
                        }
                        if( 1 < scheinAmout ) {
                            errMessage = SCHEIN_AMOUNT_ERROR;
                        }
                        return 'CANCELLED' === activity.status || 1 < scheinAmout;
                    } ) ) {
                    Y.doccirrus.DCWindow.notice( {
                        message: errMessage + '</br>' + PLEASE_CORRECT,
                        window: {
                            width: 'medium',
                            buttons: {
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        label: Y.doccirrus.i18n('FormEditorMojit.generic.BTN_OK')
                                    } )
                                ]
                            }
                        }
                    } );
                    return;
                }
                Y.doccirrus.jsonrpc.api.activitysequence.getActivityCompleteList( {
                    query: {
                        activitiesId: selectedActivities.map( function( activity ) {
                            return activity._id;
                        } )
                    }
                } ).done( function( response ) {
                        var
                            activities = response.data;
                        Y.doccirrus.modals.activitySequenceModal.showAddDialog( {
                            activeCaseFolder: activeCaseFolder,
                            activities: activities,
                            data: { prevOrder: data.order() || data._prevOrder, sequenceGroups: data.sequenceGroups }
                        }, function( activitySequence ) {
                            var
                                lightSequence = self.makeLightActivitySequenceModel( activitySequence );

                            lightSequence.isNew( true );
                            lightSequence.isModified( true );

                            delete activitySequence.activities;
                            self.sequenceList.splice( position + 1, 0, lightSequence );
                            self.clearCaches();
                        } );
                    } )
                    .fail( function( error ) {
                        Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                    } );

            } else {
                warningMessage = SELECT_CASEFILE;
                if (blockedActivitiesTypes.size) {
                    warningMessage = BLOCKED_FOR_SEQUENCE.replace('{{0}}', Array.from(blockedActivitiesTypes).join(','));
                }

                Y.doccirrus.DCWindow.notice( {
                    message: warningMessage,
                    window: {
                        width: 'medium',
                        buttons: {
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    label: Y.doccirrus.i18n( 'FormEditorMojit.generic.BTN_OK' )
                                } )
                            ]
                        }
                    }
                } );

            }

        },

        /**
         *  Activity sequence and group information is cached on the binder per casefolder
         *  Must be invalidated on changes to the sequences or groups, may be cached for more than one caseFolder type
         */

        clearCaches: function ActivitySequenceViewModel_clearCaches() {
            var
                self = this,
                binder = self.get( 'binder' ),
                caseFolderType,
                k;

            for ( k in Y.doccirrus.schemas.person.types.Insurance_E.list ) {
                if ( Y.doccirrus.schemas.person.types.Insurance_E.list.hasOwnProperty( k ) ) {
                    caseFolderType = Y.doccirrus.schemas.person.types.Insurance_E.list[k];
                    binder.setSimpleData( 'activitysequences-' + caseFolderType.val, null );
                    binder.setSimpleData( 'sequencegroups-' + caseFolderType.val, null );
                }
            }
        },

        itemCollapsed: function ActivitySequenceViewModel_itemCollapsed( $data, $event ) {
            var index = $( $event.target.parentNode ).index();
            if( !$event.target.nextSibling.classList.contains( 'in' ) && "number" === typeof index ) {
                Y.doccirrus.utils.localValueSet( 'openedGroup', index );
            } else {
                Y.doccirrus.utils.localValueSet( 'openedGroup', 'none' );
            }
        },

        toggleMode: function ActivitySequenceViewModel_toggleMode() {
            var
                self = this;
            self.isEditMode( !self.isEditMode() );
            self.groupViewMode( false );
        },

        /**
         *  Opens a modal for editing an activity sequence
         *
         *  @param position
         *  @param activitySequenceModel
         */

        showEditModal: function ActivitySequenceViewModel_showEditModal( position, activitySequenceModel ) {
            var
                self = this,
                currentPatient = unwrap( self.get( 'currentPatient' ) ),
                currentCaseFolderModel = currentPatient.caseFolderCollection,
                activeCaseFolder = currentCaseFolderModel.getActiveTab(),
                data = self.lightSequenceToJSON( activitySequenceModel ),
                activities = activitySequenceModel.activities;

            delete data.activities;
            if( !data.sequenceGroups ) {
                data.sequenceGroups = [];
            }

            Y.doccirrus.modals.activitySequenceModal.showEditDialog( { activeCaseFolder: activeCaseFolder, activities: activities, data: data  }, onSequenceChanged );

            function onSequenceChanged( data ) {
                //  KO properties
                activitySequenceModel.title( data.title );
                activitySequenceModel.description( data.description );

                //  Plain properties
                activitySequenceModel.useOriginalValues = data.useOriginalValues;
                activitySequenceModel.activities = data.activities;
                activitySequenceModel.activityIds = data.activityIds;
                activitySequenceModel.sequenceGroups = data.sequenceGroups;

                if( activitySequenceModel.isDeleted() ) {
                    self.deleteSequence( activitySequenceModel, position );
                } else {
                    activitySequenceModel.isModified( true );
                }

                self.clearCaches();
                self.filterVisible( self.filter() );
            }
        },

        showApplyModal: function ActivitySequenceViewModel_showApplyModal( params ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = unwrap( self.get( 'currentPatient' ) ),
                patientData = currentPatient.toJSON(),
                locations = binder.getInitialData( 'location' ),
                rightSidePanel = self.rightSidePanel,
                aCaseFileViewModel = KoViewModel.getViewModel( 'CaseFileViewModel' ),
                activitiesTable = aCaseFileViewModel.activitiesTable,
                currentCaseFolderModel = currentPatient.caseFolderCollection,
                sequenceId = params.sequenceId,
                sequenceData = params.sequenceData,
                activeCaseFolder = currentCaseFolderModel.getActiveTab(),
                promise;

            if( !activeCaseFolder ) {
                promise = Promise.resolve();
            } else {
                promise = Promise.resolve( Y.doccirrus.jsonrpc.api.patient.lastSchein( {
                    query: {
                        caseFolderId: activeCaseFolder && activeCaseFolder._id,
                        patientId: patientData._id,
                        timestamp: moment().toISOString()
                    }
                } ) );
            }
            promise.then( function( response ) {
                var
                    lastSchein = response && response.data && response.data[ 0 ];
                Y.doccirrus.modals.activityDataModal.showDialog( {
                    _locationList: locations,
                    lastSchein: lastSchein,
                    insuranceStatus: peek( patientData.insuranceStatus ),
                    incaseconfiguration: binder.getInitialData( 'incaseconfiguration' ),
                    sequenceData: sequenceData,
                    sequenceId: sequenceId,
                    availableCaseFolders: currentCaseFolderModel.getCaseFolders(),
                    activeCaseFolder: activeCaseFolder
                }, function( data ) {
                    binder.showBackgroundProcessMask();
                    Y.doccirrus.jsonrpc.api.activitysequence.applySequence( {
                        query: {
                            _id: sequenceId,
                            employeeId: data.employeeId,
                            timestamp: data.timestamp,
                            locationId: data.locationId,
                            daySeparation: data.daySeparation,
                            patientId: peek( patientData._id ),
                            caseFolderId: data.selectedCaseFolder && data.selectedCaseFolder._id,
                            caseFolderType: data.selectedCaseFolder && data.selectedCaseFolder.type,
                            caseFolderAdditionalType: data.selectedCaseFolder && data.selectedCaseFolder.additionalType,
                            useOriginalValues: data.useOriginalValues,
                            insuranceStatus: peek( patientData.insuranceStatus )
                        },
                        data: {
                            activitiesData: data.activitiesData
                        }
                    } ).done( function() {
                        activitiesTable.getComponentColumnCheckbox().uncheckAll();
                        if( rightSidePanel ) {
                            rightSidePanel.hideSideBar( true );
                        }
                    } ).fail( function( error ) {
                        var additionalText = '';
                        binder.hideLoadingMask();
                        if( 10000 === error.code ) {
                            additionalText = Y.Lang.sub( WRONG_CASEFOLDER_EXAMPLES, { separator: '</br>' } );
                        }

                        Y.doccirrus.DCWindow.notice( {
                            message: Y.doccirrus.errorTable.getMessage( error ) + '</br>' + additionalText,
                            window: {
                                width: 'auto',
                                buttons: {
                                    footer: [
                                        Y.doccirrus.DCWindow.getButton( 'CANCEL' )
                                    ]
                                }
                            }
                        } );

                    } );
                } );
            } );
        },
        afterRender: function ActivitySequenceViewModel_afterRender() {
            var
                self = this;
            if( self.rightSidePanel.isVisible() ) {
                self.openGroup();
            }

            self.rightSidePanel.isVisible.subscribe( function( val ) {
                if( val ) {
                    self.openGroup();
                }
            });
        },
        afterAdd: function ActivitySequenceViewModel_afterAdd() {

        },
        beforeRemove: function ActivitySequenceViewModel_beforeRemove() {

        },
        openGroup: function () {
            var localValue  = Y.doccirrus.utils.localValueGet( 'openedGroup' );
        if( localValue && 'none' !== localValue ) {
            $( '#collapse-' + localValue ).collapse('show');
        }
    }
    }, {
        NAME: 'ActivitySequenceViewModel',
        ATTRS: {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InCaseMojit' )  || Y.doccirrus.utils.getMojitBinderByType( 'MirrorPatientMojit' );
                }
            },
            templateName: {
                value: 'activitySequenceViewModel',
                lazyAdd: false
            },
            currentPatient: {
                valueFn: function() {
                    return this.get( 'binder' ).currentPatient;
                },
                lazyAdd: false
            }
        }
    } );

    KoViewModel.registerConstructor( ActivitySequenceViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'dd-delegate',
        'dd-constrain',
        'dd-proxy',
        'dd-scroll',
        'doccirrus',
        'KoViewModel',
        'dcutils-uam',
        'inCaseUtils',
        'ActivitysequenceModel',
        'DcActivityDataModal',
        'DcActivitySequenceModal'
    ]
} );
