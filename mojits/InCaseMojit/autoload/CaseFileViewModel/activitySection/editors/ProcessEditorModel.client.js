/**
 * User: pi
 * Date: 10/12/15  14:25
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI ko */

'use strict';

YUI.add( 'ProcessEditorModel', function( Y ) {
        /**
         * @module ProcessEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            SimpleActivityEditorModel = KoViewModel.getConstructor( 'SimpleActivityEditorModel' ),
            peek = ko.utils.peekObservable;

        /**
         * @class ProcessEditorModel
         * @constructor
         * @extends ActivityEditorModel
         */
        function ProcessEditorModel( config ) {
            ProcessEditorModel.superclass.constructor.call( this, config );
        }

        ProcessEditorModel.ATTRS = {
            whiteList: {
                value: SimpleActivityEditorModel.ATTRS.whiteList.value.concat( ['vendorId', 'specialDOQUVIDE', 'd_extra'] ),
                lazyAdd: false
            }
        };

        Y.extend( ProcessEditorModel, SimpleActivityEditorModel, {
                /**
                 * Enables "caretPosition" for "userContent"
                 * @protected
                 * @property useUserContentCaretPosition
                 * @type {Boolean}
                 * @default true
                 */
                useUserContentCaretPosition: true,
                initializer: function ProcessEditorModel_initializer() {
                    var
                        self = this;
                    self.initProcessEditorModel();

                },
                destructor: function MeasurementEditorModel_destructor() {
                },
                initProcessEditorModel: function ProcessEditorModel_initProcessEditorModel() {
                    var self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) ),
                        d_extra = currentActivity && peek( currentActivity.d_extra ) || {};
                    self.cardioProcess = Object.keys(d_extra).length;
                }
            }, {
                NAME: 'ProcessEditorModel'
            }
        );
        KoViewModel.registerConstructor( ProcessEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityEditorModel'
        ]
    }
)
;
