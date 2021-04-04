/**
 * User: pi
 * Date: 15/12/15  14:25
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI */

'use strict';

YUI.add( 'SubEditorModel', function( Y ) {
        /**
         * @module SubEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            EditorModel = KoViewModel.getConstructor( 'EditorModel' );

        /**
         * This is main sub editor class.
         * It just initializes observable(ATTR whiteList) and submodels(ATTR subModelsDesc)
         * It also set ATTR 'dataModelParent' - data model for current sub editor.
         * @abstract
         * @class SubEditorModel
         * @constructor
         * @extend EditorModel
         * @see EditorModel
         */
        function SubEditorModel( config ) {
            SubEditorModel.superclass.constructor.call( this, config );
        }

        SubEditorModel.ATTRS = {
            dataModelParent: {
                value: null,
                lazyAdd: false
            },
            editorModelParent: {
                value: null,
                lazyAdd: false
            }
        };

        Y.extend( SubEditorModel, EditorModel, {

                initializer: function SubEditorModel_initializer() {
                    var
                        self = this;
                    self.initSubEditorModel();
                },
                destructor: function SubEditorModel_destructor() {
                },
                initSubEditorModel: function SubEditorModel_initSubEditorModel() {
                    var
                        self = this,
                        dataModelParent = self.get( 'dataModelParent' );

                    self.mixWhiteListFromDataModel( dataModelParent );
                    self.initSubModels( dataModelParent );

                }
            },
            {
                NAME: 'SubEditorModel'
            }
        );
        KoViewModel.registerConstructor( SubEditorModel );

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
