/**
 * User: pi
 * Date: 27/01/16  16:25
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, $ */
YUI.add( 'ActivityDocTreeViewModel', function( Y, NAME ) {
    'use strict';

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        DocumentationTreeModel = KoViewModel.getConstructor( 'DocumentationTreeModel' ),
        peek = ko.utils.peekObservable;

    /**
     * @constructor
     * @class ActivityDocTreeViewModel
     */
    function ActivityDocTreeViewModel() {
        ActivityDocTreeViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( ActivityDocTreeViewModel, KoViewModel.getDisposable(), {
        /** @protected */
        initializer: function ActivityDocTreeViewModel_initializer() {
            var self = this;
            self.initActivityDocTreeViewModel();
        },
        /** @protected */
        destructor: function ActivityDocTreeViewModel_destructor() {
            var self = this;
            self.destroyActivityDocTreeViewModel();
        },
        setContainerHeight: function ActivityHouseCatalogViewModel_setContainerHeight( element ) {
            var self = this;
                setTimeout( function() {
                    if( element.parentNode.previousElementSibling && !self.isFullViewMode() ) {
                        element.style.maxHeight = (0.9 * element.parentNode.previousElementSibling.offsetHeight).toString() + 'px';
                    }
                }, 100 );
        },
        initActivityDocTreeViewModel: function ActivityDocTreeViewModel_initActivityDocTreeViewModel() {
            var
                self = this,
                currentEditor = self.get( 'currentEditor' );

            self.target = null;
            self.targetType = '';
            self.contentEditable = null;
            self.isFullViewMode = ko.observable( 'false' === Y.doccirrus.utils.localValueGet( 'doc_tree_scroll' ) );

            //  hack for MOJ-11259, Safari browser event is not reliably passing the button, pass by shared YUI object
            Y.dcforms.docTreeElement = null;

            //  bind to user content by default
            if ( currentEditor && currentEditor.userContent ) {
                self.targetType = 'userContent';
                self.setTarget( currentEditor.userContent );
            }

            self.template = {
                name: self.get( 'templateName' ),
                data: self,
                afterRender: self.afterRender.bind( self ),
                afterAdd: self.afterAdd.bind( self ),
                beforeRemove: self.beforeRemove.bind( self )
            };

            self.treeModel = ko.observable();
            self._buttons = ko.computed( function() {
                var treeModel = self.treeModel();
                return (treeModel && ko.unwrap( treeModel._buttons ) );
            } );

            self.onButtonClick = function( data, evt, index ) {
                var treeModel = self.treeModel();

                if( treeModel ) {
                    self.insertText( data, treeModel, index );
                }

                //  hacky situation to pass button to form input on Safari
                //  something is preventing the focus from falling reliably on the button in this browser

                if ( event && event.target ) {
                    Y.dcforms.docTreeElement = evt.target;

                    //  clear it after a half second if not collected by form input
                    setTimeout( function() {
                        if ( Y.dcforms.docTreeElement && Y.dcforms.docTreeElement === evt.target ) {
                            Y.dcforms.docTreeElement = null;
                        }
                    }, 500 );
                }

            };

            self.switchMode = function( item, $event ) {
                var element = $event.target.name ? $event.target: $event.target.parentNode,
                    container = element && element.parentNode.parentNode.parentNode.nextElementSibling;
                if( container ) {
                    if( container.style.maxHeight ) {
                        container.style.maxHeight = null;
                        self.isFullViewMode( true );
                        Y.doccirrus.utils.localValueSet( 'doc_tree_scroll', false );
                    } else {
                        container.style.maxHeight = (0.9 * container.parentNode.previousElementSibling.offsetHeight).toString() + 'px';
                        self.isFullViewMode( false );
                        Y.doccirrus.utils.localValueSet( 'doc_tree_scroll', true );
                    }
                }

                //  markdown editor will need focus returned to it
                self.refocusMarkdownEditor();
            };

            self.goToDocumentationTreeHome = function() {
                var treeModel = self.treeModel();
                if( treeModel ) {
                    treeModel.getBaseButtons();
                }

                //  markdown editor will need focus returned to it
                self.refocusMarkdownEditor();
            };

            self.refocusMarkdownEditor = function() {
                if ( 'contentEditable' !== self.targetType || !self.contentEditable ) { return; }

                var jqContentEditable = $('#simpleActivityEditableDiv');

                if ( jqContentEditable[0] && document.activeElement !== jqContentEditable[0] ) {
                    //  Sometimes the focus() won't work in Chrome, must be re-run immediately after.
                    jqContentEditable[0].focus();
                    setTimeout( function() { jqContentEditable[0].focus(); }, 10 );
                }
            };

            self.goToPreviousLevel = function() {
                var treeModel = self.treeModel();
                if( treeModel ) {
                    treeModel.getPreviousLevel();
                }

                //  markdown editor will need focus returned to it
                self.refocusMarkdownEditor();
            };

            self.initializeButtonDocumentation();
        },

        setTarget: function( field ) {
            var self = this;

            if ( !field ) {
                self.target = null;
                return;
            }

            self.target = {
                field: field,               //  editorModel
                caret: field.caretPosition  //  editorModel
            };
            self.setTargetField( self.target.field, self.target.caret );
        },

        setTargetField: function ActivityDocTreeViewModel_setTargetField( field, caret ) {
            var
                self = this;
            if( field && caret ) {
                self.target.field = field;
                self.target.caret = caret;
            }
        },

        getCaretPosition: function ActivityDocTreeViewModel_getCaretPosition() {
            var self = this;
            if ( !self.target || !self.target.caret ) { return -1; }
            return peek( self.target.caret.current );
        },

        getCaretExtent: function ActivityDocTreeViewModel_getCaretExtent() {
            var self = this;
            if ( !self.target || !self.target.caret ) { return -1; }
            if ( !self.target.caret.extent ) { return 0; }
            return peek( self.target.caret.extent ) || 0;
        },

        updateCaretPosition: function ActivityDocTreeViewModel_updateCaretPosition( position, extent ) {
            var self = this;

            if ( !self.target || !self.target.caret ) { return false; }
            self.target.caret.current( position );

            //  not all text/textarea inputs support selecting a text range
            if ( self.target.caret.extent ) {
                self.target.caret.extent( extent );
            }

            return true;
        },

        setPositionAndFocus: function ActivityDocTreeViewModel_setPositionAndFocus( position ) {
            var self = this;
            if ( !self.target || !self.target.caret || 'function' !== typeof self.target.caret.setPositionAndFocus ) {
                return false;
            }

            self.target.caret.setPositionAndFocus( position );
            return true;
        },

        isCaretOnNewLine: function( position, content ) {
            var char;
            if ( position < 1 ) {
                return true;
            }
            char = content.charAt( position - 1 );
            return  ['\n', '\r', '\r\n'].indexOf( char ) !== -1;
        },

        insertText: function ActivityDocTreeViewModel_insertText( data, treeModel, index ) {
            var
                self = this,
                userText,
                caretPosition = self.getCaretPosition(),
                caretExtent = self.getCaretExtent(),

                additionalContent,
                newText;

            //  inject into content-editable div if using markdown editor, MOJ-11458
            if ( 'contentEditable' === self.targetType ) {
                if( true === data.isDocumentationNode() ) {
                    additionalContent = data.text();
                    additionalContent = Y.dcforms.markdownToHtml( additionalContent );

                    if ( self.contentEditable && document.activeElement !== self.contentEditable ) {
                        self.contentEditable.focus();
                    }
                    document.execCommand( 'insertHTML', false, additionalContent );

                } else {
                    if ( self.contentEditable ) {
                        self.contentEditable.focus();
                    }
                }
                treeModel.getNextLevelAtIndex( peek( index ), 'document' );
                return;
            }

            //  inject into observable bound to textarea
            if ( self.target ) {
                userText = peek( self.target.field );

                if ( -1 === caretExtent ) {
                    //  target has never been selected, assume focus at end of content MOJ-10127
                    caretExtent = 0;
                    caretPosition = userText.length;
                }

                if( data.isDocumentationNode() === true ) {
                    if( !userText ) {

                        self.target.field( data.text() );
                        self.updateCaretPosition( data.text().length, 0 );

                    } else {

                        additionalContent = data.text();
                        newText = userText;

                        if ( !self.isCaretOnNewLine( caretPosition, newText ) ) {
                            additionalContent = ' ' + additionalContent;
                        }

                        newText = userText.substr( 0, caretPosition ) + additionalContent + userText.substr( caretPosition + caretExtent );

                        self.target.field( newText );

                        self.updateCaretPosition( caretPosition + additionalContent.length, 0 );
                    }
                    self.setPositionAndFocus();
                } else {
                    //  will need to re-select highlighted text range if it was present before button click
                    self.updateCaretPosition( caretPosition, caretExtent );
                    self.setPositionAndFocus();
                }
            } else {
                Y.log( 'Cannot insert text, no target element set.', 'debug', NAME );
            }

            treeModel.getNextLevelAtIndex( peek( index ), 'document' );
        },

        initializeButtonDocumentation: function ActivityDocTreeViewModel_initializeButtonDocumentation() {

            var
                self = this;

            function getDocuTreeCb( err, treeModel ) {
                if ( err ) {
                    Y.log( 'Problem loading documentation subtree: ' + JSON.stringify( err ), 'warn', NAME );
                    return;
                }

                if( treeModel ) {
                    Y.log( 'doctree: setbindings', 'debug', NAME );
                    self.treeModel( treeModel );
                } else {
                    self.treeModel( null );
                }
                Y.log( 'doctree: binding', 'debug', NAME );
            }

            Y.log( 'doctree: getting', 'debug', NAME );
            self.getDocumentationTree( getDocuTreeCb );
        },

        getDocumentationTree: function ActivityDocTreeViewModel_getDocumentationTree( callback ) {
            var
                self = this,
                treeModel,
                binder = self.get( 'binder' ),
                currentActivity = peek( binder.currentActivity ),
                actType = peek( currentActivity.actType ),
                copyFromCache;

            //  may already be cached
            if ( binder.docTreeCache && binder.docTreeCache[ actType ] ) {
                Y.log( 'Loading docTree from cache for activity type: ' + actType, 'debug', NAME );
                //  copy value from cache, will be extended by KO
                copyFromCache = JSON.parse( JSON.stringify( binder.docTreeCache[ actType ] ) );
                treeModel = new DocumentationTreeModel( { data: copyFromCache } );
                treeModel.initiate();
                return callback( null, treeModel );
            }

            Y.doccirrus.jsonrpc.api.documentationtree.read( {
                    noBlocking: true,
                    query: {
                        actType: actType
                    }
                } )
                .done( onDocTreeRead )
                .fail( onDocTreeErr );

            function onDocTreeRead( response ) {
                if( response.data.length > 0 ) {

                    //  keep for next time - user may repeatedly re-initialize by moving between
                    //  text fields in some activity types ( copy of object, original is extended with KO )
                    binder.docTreeCache[ actType ] = JSON.parse( JSON.stringify ( response.data[0] ) );

                    treeModel = new DocumentationTreeModel( { data: response.data[0] } );
                    treeModel.initiate();
                    return callback( null, treeModel );
                }
                callback();
            }

            function onDocTreeErr( err ) {
                Y.log( 'doctree: Could not GET documentation tree model for ' + actType, 'error', NAME );
                callback( err );
            }
        },

        destroyActivityDocTreeViewModel: function ActivityDocTreeViewModel_destroyActivityDocTreeViewModel() {
        },
        afterRender: function ActivityDocTreeViewModel_afterRender() {

        },
        afterAdd: function ActivityDocTreeViewModel_afterAdd() {

        },
        beforeRemove: function ActivityDocTreeViewModel_beforeRemove() {

        }
    }, {
        NAME: 'ActivityDocTreeViewModel',
        ATTRS: {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InCaseMojit' )  || Y.doccirrus.utils.getMojitBinderByType( 'MirrorPatientMojit' );
                },
                lazyAdd: false
            },
            templateName: {
                value: 'activityDocTreeViewModel',
                lazyAdd: false
            },
            currentEditor: {
                value: null,
                lazyAdd: false
            }
        }
    } );

    KoViewModel.registerConstructor( ActivityDocTreeViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'DocumentationTreeModel'
    ]
} );
