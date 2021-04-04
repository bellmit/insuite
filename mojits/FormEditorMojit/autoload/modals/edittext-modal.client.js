/**
 * User: strix
 * Date: 30/06/2017
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

'use strict';

//  TEMPORARY, DEVELOPMENT DO NOT COMMIT
/*global YUI, $, async, ko */

YUI.add( 'edittext-modal', function( Y, NAME ) {

        var
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel,
            WYSWYGViewModel = KoViewModel.getConstructor( 'WYSWYGViewModel' ),
            ActivityDocTreeViewModel = KoViewModel.getConstructor( 'ActivityDocTreeViewModel' );

        function MarkdownEditorViewModel( config ) {
            var
                self = this,
                //  Stub for doctTree configuration
                currentActivityEditor = {};


            self.useWYSWYG = ( config.useWYSWYG || false );
            self.useTextarea = ( !config.useWYSWYG || false );
            self.wyswygButtons = new WYSWYGViewModel();
            self.showDocTree = ko.observable( config.showDocTree || false );
            self.hasDocTree = ko.observable( false );

            self.markdownText = ko.observable( config.value  || '' );
            self.markdownText.caretPosition = { current: ko.observable(), extent: ko.observable( -1 ) };

            //  Set up docTree / TextBausteine only if requested (not available in inForm)
            if ( !self.showDocTree() ) {
                return;
            }

            self.activityDocTreeViewModel = new ActivityDocTreeViewModel( { currentEditor: currentActivityEditor } );

            self.activityDocTreeViewModel.addDisposable( ko.computed( function() {
                var
                    treeModel = self.activityDocTreeViewModel.treeModel();

                self.hasDocTree( ( treeModel && treeModel.entries && treeModel.entries.length !== 0 ) );

                if( !ko.computedContext.isInitial() && !treeModel ) {
                    Y.log( 'Could not find documentation tree for current activity.', 'warn', NAME );
                }
            } ) );

            if ( self.useWYSWYG && config.contentEditable ) {
                self.activityDocTreeViewModel.targetType = 'contentEditable';
                self.activityDocTreeViewModel.contentEditable = config.contentEditable;
            }

            if ( self.useTextarea ) {
                self.activityDocTreeViewModel.setTarget( self.markdownText );
            }

        }

        /**
         *  WYSWYG text editor modal
         *
         *  @param  config                      {Object}
         *  @param  config.value                {String}    Markdown value to edit
         *  @param  config.onUpdate             {Function}  Of the form fn( newValue )
         */

        function show( config ) {
            
            var
                JADE_TEMPLATE = 'FormEditorMojit/views/edittext_modal',

                jq = {},

                modal,

                btnSelect = {
                    name: 'SETTEXT',
                    label: i18n( 'FormEditorMojit.chooseprinter_modal.buttons.SELECT' ),
                    isDefault: true,
                    action: onUpdateButtonClick
                },

                btnCancel = {
                    name: 'CANCEL',
                    label: i18n( 'FormEditorMojit.chooseprinter_modal.buttons.CANCEL' ),    //  OK
                    isDefault: true,
                    action: onCancelButtonClick
                },

                modalOptions = {
                    className: 'DCWindow-editFormText',
                    bodyContent: null,                                              //  added from template
                    title: 'Text',                                                  //  TODO: translateme
                    icon: Y.doccirrus.DCWindow.ICON_LIST,
                    width: 1400,
                    height: Y.doccirrus.DCWindow.SIZE_XLARGE,
                    centered: true,
                    modal: true,
                    render: document.body,
                    buttons: {
                        header: [ 'close', 'maximize' ],
                        footer: [ btnCancel, btnSelect ]
                    },
                    after: {
                        visibleChange: onModalVisibilityChange,
                        maximizedChange: resizeContentEditable      //  TODO: fixme
                    }
                },

                markdownEditorViewModel;

            async.series(
                [
                    loadJade,
                    createModal
                ],
                onModalReady
            );

            //  5. Load modal jade template (stub)
            function loadJade( itcb ) {
                Y.doccirrus.jsonrpc.api.jade.renderFile( { path: JADE_TEMPLATE } )
                    .then( onTemplateLoaded )
                    .fail( itcb );

                function onTemplateLoaded( response ) {
                    var template = ( response && response.data ) ? response.data : null;
                    modalOptions.bodyContent = Y.Node.create( template );
                    itcb( null );
                }
            }

            //  6. Instantiate the modal
            function createModal( itcb ) {
                modal = new Y.doccirrus.DCWindow( modalOptions );

                //  TODO: deduplicate
                jq = {
                    divContentEditableModal: $('#divContentEditableModal')
                };

                config.contentEditable = jq.divContentEditableModal[0];

                markdownEditorViewModel = new MarkdownEditorViewModel( config );

                jq.divContentEditableModal[0].contentEditable = true;
                jq.divContentEditableModal.html( Y.dcforms.markdownToHtml( config.value ) );

                ko.applyBindings( markdownEditorViewModel, modalOptions.bodyContent.getDOMNode() );

                if ( markdownEditorViewModel.useWYSWYG ) {
                    markdownEditorViewModel.wyswygButtons.setTextArea( jq.divContentEditableModal[0] );
                    Y.dcforms.setHtmlPaste( jq.divContentEditableModal[0] );
                    resizeContentEditable();
                }

                itcb( null );
            }

            //  Event handlers

            /**
             *  Raised after modal is created
             *
             *  @param err
             */

            function onModalReady( err ) {
                if ( err ) {
                    Y.log( 'Could not set printer modal: ' + JSON.stringify( err ), 'warn', NAME );
                }
                jq.divContentEditableModal[0].focus();
            }

            /**
             *  Get current content of the contentEditable div as markdown
             *  @return {String}
             */

            function getMarkdown() {
                var
                    asHtml, asMarkdown;

                if ( markdownEditorViewModel.useWYSWYG ) {
                    asHtml = jq.divContentEditableModal.html();
                    asMarkdown = Y.dcforms.htmlToMarkdown( asHtml );
                } else {
                    asMarkdown = markdownEditorViewModel.markdownText();
                }

                return asMarkdown;
            }

            /**
             *  Resize the contentEditable div when the window size changes
             */

            function resizeContentEditable() {
                var
                    whitespace = 40,
                    containerElem = modalOptions.bodyContent._node,
                    newHeight = $( containerElem.parentNode ).height() - whitespace;

                jq.divContentEditableModal.css( 'height', ( newHeight + 'px' ) );

                //  expand the width of the contentEditable element if there id no docTree / Textbausteine
                if ( !markdownEditorViewModel.hasDocTree() ) {
                    $( '#divEditFormText' ).removeClass( 'col-md-10' ).addClass( 'col-md-12' );
                }
            }

            /**
             *  Clean up when the modal is closed
             *  @param event
             */

            function onModalVisibilityChange( event ) {
                if ( !event.newVal ) {
                    Y.log( 'Closing WYSWYG editor modal.', 'debug', NAME );
                    markdownEditorViewModel.wyswygButtons.destroy();
                }
            }

            /**
             *  User pressed the cancel button, just close the modal
             */

            function onCancelButtonClick() {
                modal.close();
            }

            function onUpdateButtonClick() {
                config.onUpdate( getMarkdown() );
                modal.close();
            }

        }

        Y.namespace( 'doccirrus.modals' ).editFormText = {
            show: show
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'node-event-simulate',
            'dcforms-utils',

            'dcforms-markdown-html',
            'dcforms-html-markdown',
            'WYSWYGViewModel',
            'ActivityDocTreeViewModel'
        ]
    }
);