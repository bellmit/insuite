/**
 *  Modal to add a new tag, specifically for pre-configuring activity subtypes, MOJ-13232
 *
 *  User: strix
 *  Date: 2020-05-26
 *  (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, async */

/*eslint prefer-template:0, strict:0 */
'use strict';

YUI.add( 'createtag-modal', function( Y, NAME ) {

        var
            i18n = Y.doccirrus.i18n;

        /**
         *  ViewModel for binding the modal
         *  @param  {Object}    settings
         *  @constructor
         */

        function CreateTagModalVM( settings, modal ) {
            var
                self = this;

            function initVm() {
                //  translations
                self.TYPE_DOSE = Y.doccirrus.schemaloader.getEnumListTranslation( 'tag', 'Type_E', 'DOSE', 'i18n', 'k.A.' );
                self.TYPE_SUBTYPE = Y.doccirrus.schemaloader.getEnumListTranslation( 'tag', 'Type_E', 'SUBTYPE', 'i18n', 'k.A.' );
                self.TYPE_DOCUMENT = Y.doccirrus.schemaloader.getEnumListTranslation( 'tag', 'Type_E', 'DOCUMENT', 'i18n', 'k.A.' );

                //  observables
                self.tagType = ko.observable( "SUBTYPE" );
                self.tagTitle = ko.observable( "" );

                //  computeds
                self.tagTitle.hasError = ko.computed( function() {
                    return ( self.tagTitle().trim() === '' );
                } );
            }

            //  EVENTS

            self.onTitleKeyDown = function  __onTitleKeyDown( ctx, evt ) {
                if ( ( evt.keyCode === 10 || evt.keyCode === 13 ) && !self.tagTitle.hasError() ) {
                    modal.saveAndClose();
                    return false;
                }
                return true;
            };

            //  PUBLIC METHODS

            /**
             *  Check that this tag des not already exist before saving to the server
             */

            self.save = function __saveNewTag( callback ) {
                var
                    newTag = {
                        type: self.tagType(),
                        title: self.tagTitle()
                    };

                //  do not call back if invalid, leave modal open for correction to value
                if ( '' === newTag.title.trim() ) { return; }

                async.series( [ checkIfNew, saveNewTag ], onAllDone );

                function checkIfNew( itcb ) {
                    Y.doccirrus.jsonrpc.api.tag.read( { query: newTag } ).then( onCheckExtant ).fail( itcb );
                    function onCheckExtant( result ) {
                        result = result.result ? result.result : result;
                        if (!result.data || !result.data[0]) {
                            //  does not match existing tag
                            return itcb(null);
                        }

                        //  noting to do, tag is already created
                        Y.log( 'Tag was already created, not recreating duplicate.', 'info', NAME );
                        result.data[0].duplicate = true;
                        callback(result.data[0]);
                    }
                }

                function saveNewTag( itcb ) {
                    Y.doccirrus.jsonrpc.api.tag.create( { data: newTag } ).then( onTagCreated ).fail( itcb );
                    function onTagCreated( result ) {
                        if ( !result || !result.data || !result.data[0] ) {
                            return itcb( new Error( 'New tag not created.' ) );
                        }
                        newTag._id = result.data[0];
                        itcb( null );
                    }
                }

                function onAllDone( err ) {
                    if ( err ) { return callback( err ); }
                    return callback( newTag );
                }

            };

            self.dispose = function __dispose() {
                Y.log( 'Disposing CreateTagModalVM', 'debug', NAME );
            };

            initVm();
        }

        /**
         *  Show the modal and bind VM
         *
         *  @param  {Object}    settings
         *  @param  {Function}  settings.onAdd      Callback when new tags are created, of the form fn( err, mediaObj )
         */

        function showCreateTagModal( settings ) {
            var
                createTagModalVM,

                modal,
                containerNode = Y.Node.create( '<div id="divCreateTagContainer"></div>' ),
                containerDiv,

                windowDefinition = {
                    className: 'DCWindow-CreateTag',
                    bodyContent: containerNode,
                    title:  i18n( 'IncaseAdminMojit.incase_tab_tags.messages.CREATE_TAG' ),
                    icon: Y.doccirrus.DCWindow.ICON_EDIT,
                    centered: true,
                    modal: true,
                    dragable: true,
                    maximizable: false,
                    resizeable: false,
                    width: 450,
                    height: 250,
                    render: document.body,
                    buttons: {
                        header: ['close'],
                        footer: [
                            Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                isDefault: true,
                                action: function() {
                                    this.close();
                                }
                            } ),
                            Y.doccirrus.DCWindow.getButton( 'OK', {
                                isDefault: true,
                                action: function() {
                                    modal.saveAndClose();
                                }
                            } )
                        ]
                    },
                    after: {
                        destroy: onModalDestroyed
                    }
                };


            async.series( [ loadJadeTemplate, createModal ], onModalReady );

            function loadJadeTemplate( itcb ) {
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'createtag-modal',
                    'IncaseAdminMojit',
                    {},
                    containerNode,
                    onJadeTemplateLoaded
                );

                function onJadeTemplateLoaded(err /*, status, nodeObj */ ) {
                    if ( err ) { return itcb( err ); }
                    itcb( null );
                }
            }

            function createModal( itcb ) {
                modal = new Y.doccirrus.DCWindow( windowDefinition );

                containerDiv = document.querySelector( '#divCreateTagContainer' );
                createTagModalVM = new CreateTagModalVM( settings, modal );
                ko.applyBindings( createTagModalVM, containerDiv );

                modal.saveAndClose = function() { createTagModalVM.save( onSaved ); };

                itcb( null );
            }

            function onModalReady( err ) {
                if ( err ) {
                    Y.log( 'showCreateTagModal: Problem initializing modal: ' + JSON.stringify( err ), 'warn', NAME );
                    return;
                }
            }

            function onModalDestroyed() {
                if ( containerNode ) { containerNode.destroy(); }
                createTagModalVM.dispose();
                ko.cleanNode( containerDiv );
                Y.log( 'showCreateTagModal: Closed create tag modal.', 'debug', NAME );
            }

            function onSaved( newTag ) {
                if ( settings.onAdd ) { settings.onAdd( newTag ); }
                modal.close();
            }

        }

        /*
         *  Expose API
         */

        Y.namespace( 'doccirrus.modals' ).createTag = {
            show: showCreateTagModal
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow'
        ]
    }
);