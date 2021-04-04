/**
 * Specialized meddata collection recording child physical development
 *
 * User: strix
 * Date: 06/02/18
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'PercentileCurveEditorModel', function( Y ) {
        /**
         * @module PercentileCurveEditorModel
         */

        var
            peek = ko.utils.peekObservable,
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel,
            MedDataEditorModel = KoViewModel.getConstructor( 'MedDataEditorModel' ),
            MedDataConfigClient = Y.doccirrus.api.meddata.MedDataConfigClient;

        /**
         * @class PercentileCurveEditorModel
         * @constructor
         * @param {Object} config
         * @extends ActivityEditorModel
         */
        function PercentileCurveEditorModel( config ) {
            PercentileCurveEditorModel.superclass.constructor.call( this, config );
        }

        Y.extend( PercentileCurveEditorModel, MedDataEditorModel, {
                /**
                 * Enables "caretPosition" for "userContent"
                 * @protected
                 * @property useUserContentCaretPosition
                 * @type {Boolean}
                 * @default true
                 */
                useUserContentCaretPosition: true,
                initializer: function PercentileCurveEditorModel_initializer() {
                    var
                        self = this;

                    self.initPercentileCurveEditorModel();
                },
                destructor: function PercentileCurveEditorModel_destructor() {
                },
                initPercentileCurveEditorModel: function initPercentileCurveEditorModel() {
                    var
                        self = this,
                        binder = self.get( 'binder' ),
                        currentActivity = peek( binder.currentActivity ),
                        percentileCurveConfig = new MedDataConfigClient( {
                            subType: '',
                            defaultCategoryForNewItems: Y.doccirrus.schemas.v_meddata.medDataCategories.PERCENTILECURVE,
                            columnOrder: [
                                'type',
                                'smartValue',
                                'unit',
                                'deleteButton'
                            ]
                        } );

                    // overwrite any initialization medDataConfig with this one
                    if( currentActivity && currentActivity.medDataConfig ) {
                        currentActivity.medDataConfig( percentileCurveConfig );
                    }

                    self.notesI18n = i18n( 'InCaseMojit.MedDataEditorModel_clientJS.notes' );
                }
            },
            {
                NAME: 'PercentileCurveEditorModel'
            }
        );
        KoViewModel.registerConstructor( PercentileCurveEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'MedDataEditorModel',
            'SubEditorModel',
            'v_meddata-schema',
            'activity-schema'
        ]
    }
);
