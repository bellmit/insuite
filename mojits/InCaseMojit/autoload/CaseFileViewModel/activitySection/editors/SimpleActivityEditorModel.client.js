/**
 * User: pi
 * Date: 10/12/15  14:25
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, $ */

'use strict';

YUI.add( 'SimpleActivityEditorModel', function( Y, NAME ) {
        /**
         * @module SimpleActivityEditorModel
         */

        var
            peek = ko.utils.peekObservable,
            KoViewModel = Y.doccirrus.KoViewModel,
            ActivityEditorModel = KoViewModel.getConstructor( 'ActivityEditorModel' ),
            WYSWYGViewModel = KoViewModel.getConstructor( 'WYSWYGViewModel' );

        /**
         * @class SimpleActivityEditorModel
         * @constructor
         * @extends ActivityEditorModel
         */
        function SimpleActivityEditorModel( config ) {
            SimpleActivityEditorModel.superclass.constructor.call( this, config );
        }

        SimpleActivityEditorModel.ATTRS = {
            whiteList: {
                value: [ 'userContent', 'subType', 'actType' ],
                lazyAdd: false
            }
        };

        Y.extend( SimpleActivityEditorModel, ActivityEditorModel, {
                /**
                 * Enables "caretPosition" for "userContent"
                 * @protected
                 * @property useUserContentCaretPosition
                 * @type {Boolean}
                 * @default true
                 */
                useUserContentCaretPosition: true,
                initializer: function SimpleActivityEditorModel_initializer() {
                    var
                        self = this;

                    self.initSimpleActivityEditorModel();
                },
                destructor: function SimpleActivityEditorModel_destructor() {
                    var self = this;
                    if ( self.listenForUserContent ) {
                        self.listenForUserContent.dispose();
                    }
                },
                initSimpleActivityEditorModel: function SimpleActivityEditorModel_initSimpleActivityEditorModel() {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        currentActivity = ko.unwrap( binder.currentActivity ),
                        activitysettings = binder.getInitialData( 'activitySettings' ) || [],
                        actType = currentActivity.actType(),
                        i;

                    //  activity settings decide whether to use plain textare or markdown editor
                    self.showTextEditor = ko.observable( true );
                    self.showMarkdownEditor = ko.observable( false );
                    self.textEditorFocus = ko.observable( true );

                    for ( i = 0; i < activitysettings.length; i++ ) {
                        if ( activitysettings[i].actType === actType && activitysettings[i].useWYSWYG ) {
                            self.showTextEditor = ko.observable( false );
                            self.showMarkdownEditor = ko.observable( true );
                            self.textEditorFocus = ko.observable( false );
                        }
                    }

                    //  update userContent mapped into forms when it changes in the editor
                    self.listenForUserContent = self.userContent.subscribe( function( newValue ) {
                        var
                            currentView = ko.unwrap( binder.currentView ),
                            activityDetailsVM = ko.unwrap( currentView.activityDetailsViewModel ),
                            template = activityDetailsVM.template;

                        if ( template && template.isMapped ) {
                            template.map( { 'userContent': newValue }, false, Y.dcforms.nullCallback );
                        }
                    } );

                    //  initialize the markdown editor
                    if ( self.showMarkdownEditor() ) {
                        self.wyswyg = new WYSWYGViewModel( { content: self.userContent, isPinned: true } );
                        self.listenWyswyg = self.wyswyg.markdownContent.subscribe( function( newVal ) {
                            self.userContent( newVal );
                        } );

                        self.listenActivityStatus = ko.computed( function() {
                            self.wyswyg.isEditable( currentActivity._isEditable() );
                        } );

                    } else {
                        //  empty, don't convert between markdown and HTML if markdown editor is not shown
                        self.wyswyg = new WYSWYGViewModel( { content: '', isPinned: true } );
                    }
                },

                /**
                 *  Set up listener for paste events when the content-editable div is bound
                 *
                 *  Called by notify-bind
                 *
                 *  @param  {Object}    element     Root dom element of the text tab
                 */

                contentEditableReady: function( element ) {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        docTreeVM;

                    if ( !element ) { return; }

                    docTreeVM = peek( binder.currentView );
                    docTreeVM = peek( docTreeVM.activityDetailsViewModel );
                    docTreeVM = docTreeVM.activityDocTreeViewModel || null;

                    //  intercept events from doctree into content-editable div is using markdown editor
                    if ( self.showMarkdownEditor() ) {

                        self.wyswyg.setTextArea( element );

                        //  Sometimes the focus() won't work in Chrome, must be re-run immediately after.
                        $('#simpleActivityEditableDiv')[0].focus();
                        setTimeout( function() { $('#simpleActivityEditableDiv')[0].focus(); }, 10 );

                        Y.log( 'Setting docTree to use content-editable div.', 'debug', NAME );
                        if ( docTreeVM ) {
                            docTreeVM.targetType = 'contentEditable';
                            docTreeVM.contentEditable = element;
                        }
                    }

                    if ( self.showTextEditor() && docTreeVM ) {
                        Y.log( 'Setting docTree to use text area.', 'debug', NAME );
                        docTreeVM.targetType = 'userContent';
                        docTreeVM.setTarget( self.userContent );
                    }
                }

            }, {
                NAME: 'SimpleActivityEditorModel'
            }
        );

        KoViewModel.registerConstructor( SimpleActivityEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ActivityEditorModel',
            'WYSWYGViewModel'
        ]
    }
)
;
