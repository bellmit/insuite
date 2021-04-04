/**
 * User: do
 * Date: 07/03/18  11:36
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'AddInsurancesModel', function( Y/*, NAME*/ ) {
        /**
         * @module AddInsurancesModel
         */

        var peek = ko.utils.peekObservable,
            KoViewModel = Y.doccirrus.KoViewModel,
            i18n = Y.doccirrus.i18n;

        // TODO: MOJ-9352 generalize patient diff dialog -> lablog

        function AddInsurancesModel( config ) {
            AddInsurancesModel.superclass.constructor.call( this, config );
        }

        Y.extend( AddInsurancesModel, KoViewModel.getBase(), {
                initializer: function AddInsurancesModel_initializer( config ) {
                    var
                        insurances,
                        self = this,
                        readInsuranceType = config.readInsuranceType,
                        matchedPatientInsuranceTypes = config.matchedPatientInsuranceTypes || [];

                    self.insuranceOnCardreadI18n = i18n('InCaseMojit.patient_browserJS.message.CREATE_ADDITIONAL_INSURANCE_ON_CARDREAD');
                    self.toOtherInsurancesI18n = i18n( 'InCaseMojit.patient_browserJS.message.COPY_READ_INSURANCE_DATA_TO_OTHER_INSURANCES' );

                    self.showCopyPart = config.copyPublicInsuranceDataToAdditionalInsurance;

                    self.template = {
                        name: 'AddInsurancesModel',
                        data: self
                    };

                    insurances = Y.doccirrus.schemas.person.types.Insurance_E.list.filter( function( entry ) {
                        return entry.val !== readInsuranceType;
                    } );

                    self.insurances = insurances.map( function( entry ) {
                        return {
                            type: entry.val,
                            i18n: entry.i18n,
                            alreadyExists: (-1 !== matchedPatientInsuranceTypes.indexOf( entry.val )),
                            checked: ko.observable( false )
                        };
                    } );
                    self.insurancesToCopyTo = insurances.map( function( entry ) {
                        return {
                            type: entry.val,
                            i18n: entry.i18n,
                            checked: ko.observable( false ),
                            disabled: ko.observable( false )
                        };
                    } );

                    ko.computed( function() {
                        self.insurances.forEach( function( insurance ) {
                            var checked = insurance.checked();
                            self.insurancesToCopyTo.forEach( function( insuranceToCopy ) {
                                if( insuranceToCopy.type === insurance.type ) {
                                    insuranceToCopy.disabled( !checked );
                                }
                            } );
                        } );
                    } );
                },
                getInsuranceTypesToAdd: function() {
                    var self = this;
                    return self.insurances.filter( function( insurance ) {
                        return peek( insurance.checked );
                    } ).map( function( insurance ) {
                        return insurance.type;
                    } );
                },
                getInsuranceTypesToCopy: function() {
                    var self = this;
                    return self.insurancesToCopyTo.filter( function( insurance ) {
                        return peek( insurance.checked ) && !peek( insurance.disabled );
                    } ).map( function( insurance ) {
                        return insurance.type;
                    } );
                },
                destructor: function AddInsurancesModel_destructor() {
                }
            },
            {
                NAME: 'AddInsurancesModel'
            }
        );

        KoViewModel.registerConstructor( AddInsurancesModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'promise',
            'KoViewModel',
            'person-schema'
        ]
    }
);