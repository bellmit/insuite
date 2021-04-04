/**
 * User: strix
 * Date: 26/10/16
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'HistoryEditorModel', function( Y ) {

        /**
         * @module HistoryEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap,
            SimpleActivityEditorModel = KoViewModel.getConstructor( 'SimpleActivityEditorModel' );

        /**
         * @class HistoryEditorModel
         * @constructor
         * @extends ActivityEditorModel
         */
        function HistoryEditorModel( config ) {
            HistoryEditorModel.superclass.constructor.call( this, config );
        }

        HistoryEditorModel.ATTRS = {
            whiteList: {
                value: ['userContent', 'actType', '_isEditable', 'subType'],
                lazyAdd: false
            }
        };

        Y.extend( HistoryEditorModel, SimpleActivityEditorModel, {
                /**
                 * Enables "caretPosition" for "userContent"
                 * @protected
                 * @property useUserContentCaretPosition
                 * @type {Boolean}
                 * @default true
                 */
                useUserContentCaretPosition: true,
                initializer: function HistoryyEditorModel_initializer() {
                    var
                        self = this;
                    self.initHistoryEditorModel();
                },
                destructor: function HistoryEditorModel_destructor() {
                },
                initHistoryEditorModel: function HistoryEditorModel_initHistoryEditorModel() {
                    var
                        self = this,
                        binder = self.get( 'binder' );

                    self.liveFormContent = ko.computed( function() {
                        var
                            currentActivity = unwrap( binder.currentActivity ),
                            plainContent = unwrap( currentActivity.userContent ),
                            plainState,
                            currentView,
                            activityDetailsVM,
                            attachmentsModel,
                            formDoc;


                        if( !plainContent ) {
                            plainContent = '';
                        }

                        currentView = unwrap( binder.currentView );

                        if( !currentView ) {
                            return plainContent;
                        }

                        activityDetailsVM = unwrap( currentView.activityDetailsViewModel );

                        if( !activityDetailsVM ) {
                            return plainContent;
                        }

                        attachmentsModel = activityDetailsVM.attachmentsModel;
                        if( !attachmentsModel ) {
                            return plainContent;
                        }

                        formDoc = attachmentsModel.findDocument( 'FORM' );
                        if ( !formDoc || !formDoc.formState ) {
                            return plainContent;
                        }

                        plainState = unwrap( formDoc.formState );
                        if ( 'object' !== typeof plainState ) {
                            return plainContent;
                        }

                        plainContent = attachmentsModel.parseFormFieldsInContent( plainContent, plainState );
                        return plainContent;
                    } );
                }
            }, {
                NAME: 'HistoryEditorModel'
            }
        );

        KoViewModel.registerConstructor( HistoryEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ActivityEditorModel'
        ]
    }
);