/**
 * User: strix
 * Date: 12/01/16
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*jshint latedef:false */
/*global YUI, ko  */

'use strict';

YUI.add( 'FormBasedActivityModel', function( Y/*, NAME */ ) {
        /**
         * @module FormBasedActivityModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            SimpleActivityModel = KoViewModel.getConstructor( 'SimpleActivityModel' ),
            mixin = Y.doccirrus.api.activity.getFormBasedActivityAPI();

        /**
         * @abstract
         * @class FormBasedActivityModel
         * @constructor
         * @extends SimpleActivityModel
         */

        function FormBasedActivityModel( config ) {
            FormBasedActivityModel.superclass.constructor.call( this, config );
        }

        Y.extend( FormBasedActivityModel, SimpleActivityModel, {

                initializer: function FormBasedActivityModel_initializer() {
                    var self = this;

                    if( self.initFormBasedActivityAPI ) {
                        self.formLookupInProgress = self.addDisposable( ko.observable( false ) );
                        self.initFormBasedActivityAPI();
                    }
                },
                /**
                 * Allows to load full activity data when it is linked.
                 */
                _updateLinkedActivitiesOnChange: null,
                destructor: function FormBasedActivityModel_destructor() {
                },

                //  We must sometimes look up the default form for a given role, this is async
                //  and will sometimes complete after the ActivitySectionFormViewModel template
                //  has loaded. This observable is used to trigger display of form once the
                //  lookup is complete and we know which form to load.

                formLookupInProgress: null,

                _isPrescriptionType: function() {
                    var self = this;

                    switch( self.actType.peek() ) {
                        case 'PUBPRESCR':
                        case 'PRIVPRESCR':
                        case 'PRESCRBTM':
                        case 'PRESCRG':
                        case 'PRESCRT':
                        case 'LONGPRESCR':
                            return true;
                    }

                    return false;
                }
            },
            {
                schemaName: 'v_form',
                NAME: 'FormBasedActivityModel'
            }
        );

        Y.mix( FormBasedActivityModel, mixin, false, Object.keys( mixin ), 4 );
        KoViewModel.registerConstructor( FormBasedActivityModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'v_simple_activity-schema',
            'v_form-schema',
            'activity-api'
        ]
    }
);
