/**
 * User: pi
 * Date: 13/08/15  11:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI */

'use strict';

YUI.add( 'TonometryModel', function( Y ) {
        /**
         * @module TonometryModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @class OtAppliedSetModel
         * @constructor
         */
        function OtAppliedSetModel( config ) {
            OtAppliedSetModel.superclass.constructor.call( this, config );
        }

        Y.extend( OtAppliedSetModel, KoViewModel.getBase(), {

            initializer: function OtAppliedSetModel_initializer() {
                var
                    self = this;
                self.initOphthalmologyOtAppliedSetModel();
            },
            destructor: function OtAppliedSetModel_destructor() {

            },
            initOphthalmologyOtAppliedSetModel: function OtAppliedSetModel_initOphthalmologyOtAppliedSetModel() {
            }
        }, {
            schemaName: 'v_ophthalmology_tonometry.otAppliedSet',
            NAME: 'OtAppliedSetModel'
        } );

        KoViewModel.registerConstructor( OtAppliedSetModel );

        /**
         * @class TonometryModel
         * @constructor
         * @extends OphthalmologyModel
         */
        function TonometryModel( config ) {
            TonometryModel.superclass.constructor.call( this, config );
        }

        TonometryModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( TonometryModel, KoViewModel.getConstructor( 'OphthalmologyModel' ), {

                initializer: function TonometryModel_initializer() {
                    var
                        self = this;
                    self.initTonometryModel();
                },
                destructor: function TonometryModel_destructor() {
                },
                /**
                 * initializes address model
                 */
                initTonometryModel: function TonometryModel_initTonometryModel() {
                },
                /**
                 * see {{#crossLink "KoViewModel/getTypeName:method"}}{{/crossLink}}
                 * @method getTypeName
                 */
                getTypeName: function TonometryModel_getTypeName() {
                    var result = TonometryModel.superclass.getTypeName.apply( this, arguments );
                    switch( result ) {
                        case 'OtAppliedSetModel':
                            result = 'OtAppliedSetModel';
                            break;
                    }
                    return result;
                },
                addOtAppliedSet: function TonometryModel_addOtAppliedSet() {
                    var
                        self = this;
                    self.otAppliedSet.push( {} );
                },
                removeOtAppliedSet: function TonometryModel_removeOtAppliedSet( obj ) {
                    var
                        self = this;
                    self.otAppliedSet.remove( obj );
                }

            },
            {
                schemaName: 'v_ophthalmology_tonometry',
                NAME: 'TonometryModel'
            }
        );
        KoViewModel.registerConstructor( TonometryModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'OphthalmologyModel',
            'v_ophthalmology_tonometry-schema'
        ]
    }
)
;