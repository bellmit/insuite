/*jslint anon:true, nomen:true*/
/*global YUI, ko */

YUI.add( 'EmployeeModel', function( Y/*, NAME */ ) {
        'use strict';

        /**
         * @module EmployeeModel
         */

        var
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap,
            i18n = Y.doccirrus.i18n,
            KoViewModel = Y.doccirrus.KoViewModel,
            LANR_ALTERNATIVE_VALUE = '999999900';

        /**
         * __ABSTRACT__
         *
         * NOTE: when extending this class and you want to adjust things wrapped inside the initializer, they have to be pulled out of the initializer here and be placed in overwritable or reusable prototype functions or ATTRs on this class
         *
         * @class EmployeeModel
         * @constructor
         * @extends KoViewModel
         */
        function EmployeeModel( config ) {
            EmployeeModel.superclass.constructor.call( this, config );
        }

        EmployeeModel.ATTRS = {
            supportCountryExtensions: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( EmployeeModel, KoViewModel.getBase(), {
            initializer: function EmployeeModel_initializer() {
            },
            destructor: function EmployeeModel_destructor() {
            }
        }, {
            schemaName: 'v_employee',
            NAME: 'EmployeeModel'
        } );
        KoViewModel.registerConstructor( EmployeeModel );

        /**
         * @class EmployeeEditModel
         * @constructor
         * @extends EmployeeModel
         */
        function EmployeeEditModel() {
            EmployeeEditModel.superclass.constructor.apply( this, arguments );
        }

        Y.extend( EmployeeEditModel, EmployeeModel, {
            initializer: function EmployeeEditModel_initializer() {
                var self = this;

                self.initEmployeeEditModel();
            },
            destructor: function EmployeeEditModel_destructor() {
            },
            _isAsvPseudoNo: function( officialNo ) {
                return null !== Y.doccirrus.regexp.isAsvPseudoNo.exec( officialNo );
            },
            /**
             * Initialises "EmployeeEditModel"
             */
            initEmployeeEditModel: function EmployeeEditModel_initEmployeeEditModel() {
                var
                    self = this;

                self.initSelect2Specialities();
                self.initSelect2Locations();
                self.initSelect2RlvPhysician();
                self.initSelect2PhysicianType();
                self.initSelect2AsvTeamNumbers();
                self.initSelect2AsvSpecializations();

                self.asvSpecializationsTypes = Y.doccirrus.schemas.employee.types.AsvMembershipType_E.list.map( function( membership ) {
                    return {
                        val: membership.val,
                        i18n: membership.i18n
                    };
                } );

                self.computeTypeAdditionalFieldsVisible = ko.computed( self.computeTypeAdditionalFieldsVisibleComputed, self );

                self.addDisposable( ko.computed( self.mandatoryCommunicationsComputed, self ) );

                self.addDisposable( ko.computed( self.resetOnTypeChangeComputed, self ) );

                self.isAsvPseudoNo = ko.computed( function() {
                    var officialNo = self.officialNo();
                    return self._isAsvPseudoNo( officialNo );
                } );

                self.employeeTypeList = Y.doccirrus.schemas.employee.types.Employee_E.list.filter( function( item ) {
                    if( !Y.doccirrus.auth.hasAdditionalService( Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTORAPO ) ) {
                        return -1 === ['PHARMACIST', 'PHARMACY_STAFF'].indexOf(item.val);
                    }

                    return true;
                });

            },
            showCheckLanrDialog: function EmployeeEditModel_showCheckLanrDialog() {
                var
                    self = this;

                Y.doccirrus.DCWindow.notice( {
                    type: 'info',
                    message: i18n( 'EmployeeModel.showCheckLanrDialog.message' ),
                    window: {
                        width: 'medium',
                        buttons: {
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    label: i18n( 'EmployeeModel.showCheckLanrDialog.button.alternative' ),
                                    action: function( e ) {
                                        self.officialNo( LANR_ALTERNATIVE_VALUE );
                                        this.close( e );
                                    }
                                } ),
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    action: function( e ) {
                                        this.close( e );
                                    }
                                } )
                            ]
                        }
                    }
                } );

            },
            showAsvPseudoNoDialog: function EmployeeEditModel_showCheckLanrDialog() {
                Y.doccirrus.DCWindow.notice( {
                    type: 'info',
                    message: i18n( 'EmployeeModel.showAsvPseudoNoDialog.message' ),
                    window: {
                        width: 'info',
                        buttons: {
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    action: function( e ) {
                                        this.close( e );
                                    }
                                } )
                            ]
                        }
                    }
                } );

            },
            /**
             * specialities autoComplete
             * @see ko.bindingHandlers.select2
             * @type {Object}
             * @private
             */
            select2Specialities: null,
            /**
             * Initialises specialities autoComplete
             */
            initSelect2Specialities: function EmployeeEditModel_initSelect2Specialities() {
                var
                    self = this;

                self.select2Specialities = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            var
                                value = self.specialities() || null;

                            return value;

                        },
                        write: function( $event ) {
                            var
                                value = $event.val;

                            self.specialities( value );

                        }
                    } ) ),
                    select2: {
                        placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                        width: '100%',
                        multiple: true,
                        data: self.get( 'specialitiesList' ).map( function( entry ) {
                            return {id: entry.key, text: entry.value};
                        } )
                    }
                };
            },
            /**
             * locations autoComplete
             * @see ko.bindingHandlers.select2
             * @type {Object}
             * @private
             */
            select2Locations: null,
            /**
             * Initialises locations autoComplete
             */
            initSelect2Locations: function EmployeeEditModel_initSelect2Locations() {
                var
                    self = this;

                self.select2Locations = {
                    data: self.addDisposable( ko.computed( {
                        read: function() {
                            var
                                value = self.locations();

                            return value.map( function( location ) {

                                return {
                                    id: peek( location._id ),
                                    text: peek( location.locname )
                                };
                            } );

                        },
                        write: function( $event ) {
                            var
                                value = $event.val;

                            self.locations( Y.Array.filter( self.get( 'locationsList' ), function( location ) {
                                return value.indexOf( peek( location._id ) ) > -1;
                            } ) );

                        }
                    } ) ),
                    select2: {
                        placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                        width: '100%',
                        multiple: true,
                        data: self.get( 'locationsList' ).map( function( entry ) {
                            return {id: entry._id, text: entry.locname};
                        } )
                    }
                };
            },
            /**
             * Initialises rlvPhysician autoComplete
             */
            initSelect2RlvPhysician: function EmployeeEditModel_initSelect2RlvPhysician() {
                var
                    self = this;

                self.select2RlvPhysician = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {

                            return ko.unwrap( self.rlvPhysician ) || '';
                        },
                        write: function( $event ) {
                            self.rlvPhysician( $event.val );
                        }
                    }, self ) ),
                    select2: {
                        minimumInputLength: 1,
                        allowClear: true,
                        placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                        initSelection: function( element, callback ) {
                            if( !self.rlvPhysician.peek() ) {
                                return;
                            }
                            Y.doccirrus.jsonrpc.api.employee
                                .read( {query: {_id: self.rlvPhysician.peek(), type: 'PHYSICIAN'}} )
                                .then( function( response ) {
                                    return response && response.data && response.data[0] || null;
                                } )
                                .done( function( employee ) {
                                    if( employee ) {
                                        callback( {
                                            id: employee._id,
                                            text: Y.doccirrus.schemas.person.personDisplay( employee )
                                        } );
                                    }
                                } );
                        },
                        query: function( query ) {
                            var results = [];
                            Y.doccirrus.jsonrpc.api.employee.getRlvPhysicians( {
                                employeeId: self._id.peek(),
                                term: query.term
                            } ).done( function( response ) {
                                if( Array.isArray( response.data ) && response.data.length ) {
                                    results = response.data.map( function( employee ) {
                                        return {
                                            id: employee._id,
                                            text: Y.doccirrus.schemas.person.personDisplay( employee )
                                        };
                                    } );
                                }
                                query.callback( {
                                    results: results
                                } );
                            } );
                        }
                    }
                };
            },
            /**
             * Initialize physicianType select2
             */
            initSelect2PhysicianType: function EmployeeEditModel_initSelect2PhysicianType() {

                var self = this,
                    results = Y.doccirrus.schemas.employee.types.PhysicianType_E.list.map( function( entry ) {
                        return {
                            id: entry.val,
                            text: Y.doccirrus.schemaloader.translateEnumValue( 'i18n', entry.val,
                                Y.doccirrus.schemas.employee.types.PhysicianType_E.list, entry.val )
                        };
                    } );
                self.select2PhysicianType = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {

                            return ko.unwrap( self.physicianType ) || '';
                        },
                        write: function( $event ) {
                            self.physicianType( $event.val );
                        }
                    }, self ) ),
                    select2: {
                        allowClear: true,
                        placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                        data: {
                            results: results
                        }
                    }
                };

            },
            /**
             * Initialize asvTeamNumbers select2
             */
            initSelect2AsvTeamNumbers: function EmployeeEditModel_initSelect2AsvTeamNumbers() {

                var self = this;
                self.select2AsvTeamNumbers = {
                    data: self.addDisposable( ko.computed( {
                        read: function() {
                            var val = self.asvTeamNumbers(),
                                mapped = (val || []).map( function( v ) {
                                    return {id: v, text: v};
                                } );
                            return mapped;
                        },
                        write: function( $event ) {
                            self.asvTeamNumbers( $event.val );
                        }
                    }, self ) ),
                    select2: {
                        multiple: true,
                        minimumInputLength: 1,
                        maximumInputLength: 9,
                        allowClear: true,
                        placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                        query: function( query ) {
                            Y.doccirrus.jsonrpc.api.employee.getASVTeamNumbers( {
                                    query: {
                                        term: query.term
                                    }
                                }
                            )
                                .done( function( response ) {
                                    var
                                        data = response.data;
                                    query.callback( {
                                        results: data.map( function( teamNumber ) {
                                            return {
                                                id: teamNumber,
                                                text: teamNumber
                                            };
                                        } )
                                    } );
                                } )
                                .fail( function( error ) {
                                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                    query.callback( {
                                        results: []
                                    } );
                                } );
                        },
                        createSearchChoice: function( term ) {
                            if( 9 === term.length ) {
                                return { id: term, text: term };
                            } else {
                                return null;
                            }

                        }
                    }
                };

            },
            /**
             * Initialize asvSpecializations select2
             */

            initSelect2AsvSpecializations: function EmployeeEditModel_initSelect2AsvSpecializations() {

                var self = this;
                self.select2AsvSpecializations = {
                    val: self.addDisposable( ko.computed( {
                        read: function() {
                            return unwrap( self.asvSpecializations ) || null;
                        },
                        write: function( $event ) {
                            self.asvSpecializations( $event.val );
                        }
                    }, self ) ),
                    select2: {
                        multiple: true,
                        allowClear: true,
                        placeholder: i18n( 'general.message.PLEASE_SELECT' ),
                        data: {
                            results: Y.doccirrus.schemas.employee.types.AsvSpecializations_E.list.map( function(item){
                                return {
                                    id: item.val,
                                    text: item.i18n
                                };
                            } )
                        }
                    }
                };

            },
            /**
             * Observable of "computeTypeAdditionalFieldsVisibleComputed"
             * @type {null|ko.computed}
             */
            computeTypeAdditionalFieldsVisible: null,
            /**
             * Computes the visibility of "type" = "PHYSICIAN" additional fields
             * @return {boolean}
             */
            computeTypeAdditionalFieldsVisibleComputed: function EmployeeEditModel_computeTypeAdditionalFieldsVisibleComputed() {
                var
                    self = this,
                    type = self.type();

                return type && 'PHYSICIAN' === type;
            },
            /**
             * Computes and handles mandatory "communications" entries
             */
            mandatoryCommunicationsComputed: function EmployeeEditModel_mandatoryCommunicationsComputed() {
                var
                    self = this,
                    communications = ko.unwrap( self.communications );

                if( !Y.Array.find( communications, function( item ) {
                        var
                            type = ko.unwrap( item.type );

                        return 'EMAILJOB' === type || 'EMAILPRIV' === type;
                    } ) ) {
                    self.communications.push( {
                        type: 'EMAILJOB',
                        value: '',
                        preferred: false
                    } );
                }
            },
            /**
             * Computes and resets necessary "type" changes
             */
            resetOnTypeChangeComputed: function EmployeeEditModel_resetOnTypeChangeComputed() {
                var
                    self = this,
                    type = self.type();

                if( ko.computedContext.isInitial() ) {
                    return;
                }

                if( 'PHYSICIAN' === type ) {
                    self.officialNo( '' );
                    self.specialisationText( '' );
                    self.specialities( [] );
                }
            }
        }, {
            NAME: 'EmployeeEditModel',
            schemaName: EmployeeModel.schemaName,
            ATTRS: {
                validatable: {
                    value: true,
                    lazyAdd: false
                },
                specialitiesList: {
                    value: [],
                    cloneDefaultValue: true,
                    lazyAdd: false
                },
                locationsList: {
                    value: [],
                    cloneDefaultValue: true,
                    lazyAdd: false
                }
            }
        } );
        KoViewModel.registerConstructor( EmployeeEditModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'doccirrus',
            'KoViewModel',
            'DCWindow',
            'v_employee-schema',
            'dcregexp',
            'EmployeeEditModel_D',
            'EmployeeEditModel_CH'
        ]
    }
);
