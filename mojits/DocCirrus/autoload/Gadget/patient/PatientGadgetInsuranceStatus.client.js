/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'PatientGadgetInsuranceStatus', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module PatientGadgetInsuranceStatus
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadget = KoViewModel.getConstructor( 'PatientGadget' ),
        i18n = Y.doccirrus.i18n;

    /**
     * @constructor
     * @class PatientGadgetInsuranceStatus
     * @extends PatientGadget
     */
    function PatientGadgetInsuranceStatus() {
        PatientGadgetInsuranceStatus.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetInsuranceStatus, PatientGadget, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self.initInsuranceInfo();
        },
        /** @private */
        destructor: function() {
        },
        // NOTE: This is the same as in "MirrorActivityPatientInfoViewModel" formerly known as ""ActivityPatientInfoViewModel""
        _linkToInsurances: null,
        _insuranceNames: null,
        _employees: null,
        _isPatientShortInfoInsuranceStatusVisible: null,
        initInsuranceInfo: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = peek( binder.currentPatient );

            self.insuranceStatusI18n = i18n( 'PatientGadget.PatientGadgetInsuranceStatus.i18n' );

            /**
             * Computes a link to the patient insurances, if patient has an id else returns null
             * @property _linkToInsurances
             * @type {ko.computed|null|String}
             */
            self._linkToInsurances = ko.computed( function() {
                var
                    id = unwrap( currentPatient._id );

                if( id ) {
                    return Y.doccirrus.utils.getUrl( 'inCaseMojit' ) + '#/patient/' + id + '/section/insurance';
                }
                else {
                    return null;
                }
            } );

            /**
             * Computes the name of the first insurance employee if available
             * @method _firstInsuranceEmployeeName
             * @returns {String}
             */
            self._employees = Y.doccirrus.KoViewModel.utils.createAsync( {
                cache: {},
                initialValue: '',
                jsonrpc: {
                    fn: Y.doccirrus.jsonrpc.api.employee.read,
                    params: self.addDisposable( ko.computed( function() {
                        var
                            insuranceStatus = unwrap( currentPatient.insuranceStatus ),
                            employeeIds;

                        if( Array.isArray( insuranceStatus ) && insuranceStatus.length ) {
                            employeeIds = insuranceStatus.map( function( insurance ) {
                                return unwrap( insurance.employeeId );
                            } ).filter( Boolean );
                            if( employeeIds && employeeIds.length ) {
                                return {noBlocking: true, query: {_id: {$in: employeeIds}, type: 'PHYSICIAN'}};
                            }
                        }

                        return null;

                    } ) )
                },
                converter: function( response ) {
                    return response.data || null;
                }
            } );

            /**
             * Computes the name of the first insurance if available
             * @method _insuranceNames
             * @returns {String}
             */
            self._insuranceNames = ko.computed( function() {
                var
                    insuranceStatus = unwrap( currentPatient.insuranceStatus ),
                    _employees = unwrap( self._employees );

                function getEmployeeName( insurance ) {
                    var result = '',
                        employeeId = insurance && unwrap( insurance.employeeId );
                    if( employeeId && _employees && _employees.length ) {
                        _employees.some( function( employee ) {
                            if( employee._id === employeeId ) {
                                result = Y.doccirrus.schemas.person.personDisplay( employee );
                                return true;
                            }
                        } );
                    }
                    return result;
                }

                if( Array.isArray( insuranceStatus ) && insuranceStatus.length ) {
                    return insuranceStatus.filter( function( insurance ) {
                        return !unwrap( insurance.doNotShowInsuranceInGadget );
                    } ).map( function( insurance ) {
                        var insuranceName = unwrap( insurance.insurancePrintName ) || unwrap( insurance.insuranceName ),
                            type = unwrap( insurance.type );
                        if( !insurance || !type ) {
                            return;
                        }
                        return [
                            Y.doccirrus.schemaloader.translateEnumValue(
                                'i18n',
                                type,
                                Y.doccirrus.schemas.person.types.Insurance_E.list,
                                ''
                            ),
                            ': ',
                            insuranceName,
                            ' ',
                            getEmployeeName( insurance ),
                            '<br>'
                        ].filter( Boolean ).join( '' );
                    } ).join( '' );
                } else {
                    return '';
                }

            } );

            /**
             * Computes visibility of insurance status section in patient short info
             * @method _isPatientShortInfoInsuranceStatusVisible
             * @returns {Boolean}
             */
            self._isPatientShortInfoInsuranceStatusVisible = ko.computed( function() {
                var
                    _insuranceNames = unwrap( self._insuranceNames );

                return Boolean( _insuranceNames );
            } );
        }
    }, {
        NAME: 'PatientGadgetInsuranceStatus',
        ATTRS: {}
    } );

    KoViewModel.registerConstructor( PatientGadgetInsuranceStatus );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'PatientGadget',

        'dcutils',

        'person-schema'
    ]
} );
