/**
 * User: pi
 * Date: 22/01/16  13:10
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko  */

'use strict';

YUI.add( 'LabRequestModel', function( Y, NAME ) {
        /**
         * @module LabRequestModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            FormBasedActivityModel = KoViewModel.getConstructor( 'FormBasedActivityModel' );

            //SimpleActivityModel = KoViewModel.getConstructor( 'SimpleActivityModel' );

        /**
         * @class LabRequestModel
         * @constructor
         * @extends FormBasedActivityModel
         */
        function LabRequestModel( config ) {
            LabRequestModel.superclass.constructor.call( this, config );
        }

        LabRequestModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( LabRequestModel, FormBasedActivityModel, {

                initializer: function LabRequestModel_initializer() {
                    var
                        self = this;
                    self.initLabRequestModel();
                },
                destructor: function LabRequestModel_destructor() {
                },
                initLabRequestModel: function LabRequestModel_initLabRequestModel() {
                    var
                        self = this,
                        caseFolder = self.get( 'caseFolder' ),
                        asvContext = caseFolder && 'ASV' === caseFolder.additionalType;

                    self._asvContext = ko.observable( asvContext );

                    if( self.isNew() ) {
                        if( asvContext ) {
                            self.asvTeamReferral( true );
                        }
                    }

                    if ( !ko.unwrap( self.labRequestId ) ) {
                        self.labRequestId( Y.doccirrus.utils.generateLabRequestId() );
                        Y.log( 'Initialized labRequestId: ' + self.labRequestId(), 'debug', NAME );
                    }

                    self.addDisposable( ko.computed( function() {
                        self.befEiltFaxBool();
                        self.befEiltTelBool();
                        self.befEiltNr.validate();
                    } ) );
                }
            },
            {
                schemaName: 'v_labrequest',
                NAME: 'LabRequestModel'
            }
        );

        KoViewModel.registerConstructor( LabRequestModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityModel',
            'v_labrequest-schema'
        ]
    }
);