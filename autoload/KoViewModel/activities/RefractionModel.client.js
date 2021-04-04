/**
 * User: pi
 * Date: 13/08/15  11:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'RefractionModel', function( Y ) {
        /**
         * @module RefractionModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @class RefractionModel
         * @constructor
         * @extends OphthalmologyModel
         */
        function RefractionModel( config ) {
            RefractionModel.superclass.constructor.call( this, config );
        }

        RefractionModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( RefractionModel, KoViewModel.getConstructor('OphthalmologyModel'), {

                initializer: function() {
                    var
                        self = this;
                    self.initRefractionModel();
                },
                destructor: function() {
                },
                /**
                 * initializes address model
                 */
                initRefractionModel: function() {
                    var self = this;
                    // computed for refraction orVisAcuTyp
                    // if orVisAcuTyp == SC then SPH & CYL should be automatically be set to 0
                    self.addDisposable( ko.computed( function() {
                        var
                            orVisAcuTyp = self.orVisAcuTyp(),
                            orVisAcuTypSC = 'SC',
                            orSphL = self.orSphL.peek(),
                            orSphR = self.orSphR.peek(),
                            orCylL = self.orCylL.peek(),
                            orCylR = self.orCylR.peek();

                        // handle SPH
                        if( orVisAcuTypSC === orVisAcuTyp && self.isEmptyFieldValue( orSphL ) ) {
                            self.orSphL( 0 );
                        }
                        if( orVisAcuTypSC === orVisAcuTyp && self.isEmptyFieldValue( orSphR ) ) {
                            self.orSphR( 0 );
                        }

                        // handle CYL
                        if( orVisAcuTypSC === orVisAcuTyp && self.isEmptyFieldValue( orCylL ) ) {
                            self.orCylL( 0 );
                        }
                        if( orVisAcuTypSC === orVisAcuTyp && self.isEmptyFieldValue( orCylR ) ) {
                            self.orCylR( 0 );
                        }

                    } ) );
                },
                isEmptyFieldValue: function( value ) {
                    return (null === value || '' === value);
                }
            },
            {
                schemaName: 'v_ophthalmology_refraction',
                NAME: 'RefractionModel'
            }
        );
        KoViewModel.registerConstructor( RefractionModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'OphthalmologyModel',
            'v_ophthalmology_refraction-schema'
        ]
    }
)
;