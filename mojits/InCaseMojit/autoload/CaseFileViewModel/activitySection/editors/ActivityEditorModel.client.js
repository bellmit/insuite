/**
 * User: pi
 * Date: 10/12/15  14:25
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, $ */

'use strict';

YUI.add( 'ActivityEditorModel', function( Y ) {
        /**
         * @module ActivityEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            EditorModel = KoViewModel.getConstructor( 'EditorModel' ),
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable;

        /**
         * @class ActivityEditorModel
         * @constructor
         * @extend EditorModel
         */
        function ActivityEditorModel( config ) {
            ActivityEditorModel.superclass.constructor.call( this, config );
        }

        ActivityEditorModel.ATTRS = {
            caseFolder: {
                valueFn: function() {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) );
                    return currentActivity.get( 'caseFolder' );
                }
            },
            activitiesTable: {
                valueFn: function () {
                    var viewModel = KoViewModel.getViewModel('CaseFileViewModel') || KoViewModel.getViewModel('MirrorCaseFileViewModel');
                    return viewModel.caseFolders;
                },
                lazyAdd: false
            },
            templateName: {
                valueFn: function() {
                    return this.templateName;
                },
                lazyAdd: false
            },
            /**
             * Creates "caretPosition" for "userContent"
             * @protected
             * @attribute useUserContentCaretPosition
             * @type Boolean
             * @default prototype.useUserContentCaretPosition
             */
            useUserContentCaretPosition: {
                valueFn: function() {
                    return this.useUserContentCaretPosition;
                },
                lazyAdd: false
            }
        };

        Y.extend( ActivityEditorModel, EditorModel, {
                templateName: '',
                /**
                 * Enables "caretPosition" for "userContent"
                 * @protected
                 * @property useUserContentCaretPosition
                 * @type {Boolean}
                 * @default false
                 */
                useUserContentCaretPosition: false,
                initializer: function ActivityEditorModel_initializer() {
                    var
                        self = this;
                    self.initActivityEditorModel();
                },
                destructor: function ActivityEditorModel_destructor() {
                },
                getTemplateName: function() {
                    var
                        templateName = unwrap( this.templateName );
                    if( !templateName ) {
                        templateName = (this.name || 'SimpleActivityEditorModel').replace( /EditorModel$/, '' );
                    }
                    return 'AT-' + templateName;
                },
                afterRender: function() {

                },
                afterAdd: function() {

                },
                beforeRemove: function() {

                },
                initActivityEditorModel: function ActivityEditorModel_initActivityEditorModel() {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) );
                    var onActivityUnlinked = currentActivity.onActivityUnlinked.bind(currentActivity);
                    var onActivityLinked = currentActivity.onActivityLinked.bind(currentActivity);
                    var onActivityLinkBlocked = currentActivity.onActivityLinkBlocked.bind(currentActivity);
                    currentActivity.onActivityUnlinked = function( activity ){
                        var originResult = onActivityUnlinked( activity );
                        if( typeof self.onActivityUnlinked === 'function' ){
                            self.onActivityUnlinked( activity );
                        }
                        return originResult;
                    };
                    currentActivity.onActivityLinked = function( activity ){
                        var originResult = onActivityLinked( activity );
                        if( typeof self.onActivityLinked === 'function' ){
                            self.onActivityLinked( activity );
                        }
                        return originResult;
                    };
                    currentActivity.onActivityLinkBlocked = function( activity ){
                        var originResult = onActivityLinkBlocked( activity );
                        if( typeof self.onActivityLinkBlocked === 'function' ){
                            self.onActivityLinkBlocked( activity );
                        }
                        return originResult;
                    };


                    self.mixWhiteListFromDataModel( currentActivity );
                    self.initSubModels( currentActivity );
                    self.templateName = ko.observable( self.get( 'templateName' ) );
                    self.template = {
                        name: self.getTemplateName.bind( self ),
                        data: self,
                        afterRender: self.afterRender.bind( self ),
                        afterAdd: self.afterAdd.bind( self ),
                        beforeRemove: self.beforeRemove.bind( self )
                    };

                    if( self.get( 'useUserContentCaretPosition' ) && self.userContent ) {
                        //  doctree nees the start and length of text selection to paste into text/textarea elements
                        //  see: ko-bindingHandlers.client.js
                        self.userContent.caretPosition = { current: ko.observable(), extent: ko.observable( -1 ) };
                    }

                },
                //  Events to manage interaction with DocTreeViewModel (shares a column, toggled)

                /**
                 *  Show docTree / text bausteine
                 * @param {Object}  vm  ViewModel, should be self, have element name matching vm property
                 * @param {Object}  evt DOM event
                 */
                onDocTreeFocus: function( vm, evt ) {
                    var self = this;
                    self.updateDocTree( true, vm[evt.target.name] );
                },
                /**
                 *  When clicking out of textarea with doctree, hide it
                 *  @param vm
                 *  @param evt
                 */

                onDocTreeBlur: function( vm, evt ) {
                    var self = this;
                    if( evt.relatedTarget && $( evt.relatedTarget ).hasClass( 'text-tree-element' ) ) {
                        //  leave it
                        return;
                    }
                    //  hide text bausteine
                    self.updateDocTree( false, null );
                },
                /**
                 *  Set documentation tree viewmodel visibility and target
                 *
                 *  @param  {Boolean}  showDocTree
                 *  @param  {Object}   target       Observable with caretPosition
                 */

                updateDocTree: function( showDocTree, target ) {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        caseFileVM = ko.unwrap( binder.currentView ),
                        activityDetailsVM = ko.unwrap( caseFileVM.activityDetailsViewModel );

                    activityDetailsVM.showDocTree( showDocTree );

                    if( activityDetailsVM.activityDocTreeViewModel ) {
                        activityDetailsVM.activityDocTreeViewModel.setTarget( target );
                    }
                }
            }, {
                NAME: 'ActivityEditorModel'
            }
        );
        KoViewModel.registerConstructor( ActivityEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'EditorModel'
        ]
    }
)
;
