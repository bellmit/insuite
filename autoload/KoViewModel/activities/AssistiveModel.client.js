/**
 * User: pi
 * Date: 20/01/16  14:00
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI  */

'use strict';

YUI.add( 'AssistiveModel', function( Y, NAME ) {
        /**
         * @module AssistiveModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            CatalogBasedActivityModel = KoViewModel.getConstructor( 'CatalogBasedActivityModel' );

        /**
         * @class AssistiveModel
         * @constructor
         * @extends CatalogBasedActivityModel
         */
        function AssistiveModel( config ) {
            AssistiveModel.superclass.constructor.call( this, config );
        }

        AssistiveModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( AssistiveModel, CatalogBasedActivityModel, {

                initializer: function AssistiveModel_initializer() {
                    var
                        self = this;
                    self.initAssistiveModel();
                },
                destructor: function AssistiveModel_destructor() {
                },
                initAssistiveModel: function AssistiveModel_initAssistiveModel() {
                    var
                        self = this;
                    // must be set explicitly
                    self.set('data.catalogShort', 'HMV');
                    self.setNotModified();

                    self.listenForUserContentChange = self.assDescription.subscribe( function( newValue ) {
                        if ( self._isEditable() ) {
                            Y.log( 'Setting userContent from description: ' + newValue, 'debug', NAME );
                            self.userContent( newValue );
                        }
                    } );

                }
            },
            {
                schemaName: 'v_assistive',
                NAME: 'AssistiveModel'
            }
        );
        KoViewModel.registerConstructor( AssistiveModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'CatalogBasedActivityModel',
            'v_assistive-schema'
        ]
    }
)
;