/**
 * User: pi
 * Date: 11/12/15  10:40
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, jQuery, moment */

'use strict';

YUI.add( 'GKVScheinEditorModel', function( Y ) {
        /**
         * @module GKVScheinEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            ScheinEditorModel = KoViewModel.getConstructor( 'ScheinEditorModel' ),
            i18n = Y.doccirrus.i18n,
            PLACEHOLDER_PLEASE_SELECT = i18n( 'InCaseMojit.activity_model_clientJS.placeholder.PLEASE_SELECT' ),
            VALUE_PLEASE_SELECT = i18n( 'InCaseMojit.activity_model_clientJS.value.PLEASE_SELECT' ),
            SCHEIN_ORDER_39 = i18n( 'InCaseMojit.activity_model_clientJS.tooltip.SCHEIN_ORDER_39' ),
            FK4123_MANDATORY_ERR = 'Das Feld "Personenkreis" darf nicht leer bleiben, wenn Informationen dazu vorliegen.',
            FK4124_MANDATORY_ERR = 'Das Feld "SKT-Zusatzangaben" darf nicht leer bleiben, wenn Informationen dazu vorliegen.',
            FK4125FROM_MANDATORY_ERR = 'Das Feld "Gültigkeitszeitraum von" darf nicht leer bleiben, wenn Informationen dazu vorliegen.',
            FK4125TO_MANDATORY_ERR = 'Das Feld "Gültigkeitszeitraum bis" darf nicht leer bleiben, wenn Informationen dazu vorliegen.',
            FK4126_MANDATORY_ERR = 'Das Feld "SKT-Bemerkungen" darf nicht leer bleiben, wenn Informationen dazu vorliegen.';

        /**
         * @class GKVScheinEditorModel
         * @constructor
         * @extends ScheinEditorModel
         */
        function GKVScheinEditorModel( config ) {
            GKVScheinEditorModel.superclass.constructor.call( this, config );
        }

        GKVScheinEditorModel.ATTRS = {
            initialKBVScheinTypes: {
                value: [
                    {
                        "value": "ambulante Behandlung",
                        "key": "0101"
                    },
                    {
                        "value": "Überweisung",
                        "key": "0102"
                    },
                    {
                        "value": "Belegärztliche Behandlung",
                        "key": "0103"
                    },
                    {
                        "value": "Notfall/Vertretung",
                        "key": "0104"
                    },
                    {
                        "value": "ambulante Behandlung",
                        "key": "00"
                    },
                    {
                        "value": "Selbstausstellung",
                        "key": "20"
                    },
                    {
                        "value": "Auftragsleistungen",
                        "key": "21"
                    },
                    {
                        "value": "Konsiliaruntersuchung",
                        "key": "23"
                    },
                    {
                        "value": "Mit-/Weiterbehandlung",
                        "key": "24"
                    },
                    {
                        "value": "Überweisungs-/Abrechnungsschein für Laboratoriumsuntersuchungen als Auftragsleistung",
                        "key": "27"
                    },
                    {
                        "value": "Anforderungsschein für Laboratoriumsuntersuchungen bei Laborgemeinschaften",
                        "key": "28"
                    },
                    {
                        "value": "Stationäre Mitbehandlung, Vergütung nach ambulanten Grundsätzen",
                        "key": "26"
                    },
                    {
                        "value": "Belegärztliche Behandlung",
                        "key": "30"
                    },
                    {
                        "value": "Belegärztliche Mitbehandlung",
                        "key": "31"
                    },
                    {
                        "value": "Urlaubs-/Krankheitsvertretung bei belegärztlicher Behandlung",
                        "key": "32"
                    },
                    {
                        "value": "Ärztlicher Notfalldienst",
                        "key": "41"
                    },
                    {
                        "value": "Urlaubs-/Krankheitsvertretung",
                        "key": "42"
                    },
                    {
                        "value": "Notfall",
                        "key": "43"
                    },
                    {
                        "value": "Notarzt-/Rettungswagen",
                        "key": "45"
                    },
                    {
                        "value": "Zentraler Notfalldienst",
                        "key": "46"
                    }
                ],
                lazyAdd: false

            },
            whiteList: {
                value: ScheinEditorModel.ATTRS.whiteList.value.concat( [
                    'scheinYear',
                    'orderAccounting',
                    'scheinBillingArea',
                    'scheinType',
                    'actType',
                    'scheinSubgroup',//fk4239
                    'scheinTransferType',
                    'scheinTransferArrangementCode',
                    'scheinTransferDateOfContact',
                    'scheinTransferTypeInfo',
                    'scheinDate',
                    'scheinSlipMedicalTreatment',//fk4221
                    'locationFeatures',
                    'locationFeatures',
                    'scheinOrder',
                    'scheinFinding',
                    'scheinSettledDate',
                    'userContent',
                    'fk4217',//(N)BSNR des Erstveranlassers
                    'fk4241',//(LANR) des Erstveranlassers
                    'fk4123',
                    'fk4124',
                    'fk4125from',
                    'fk4125to',
                    'fk4126',
                    'employee',
                    'fk4206',
                    'fk4236',
                    'fk4204',//Eingeschränkter Leistungsanspruch
                    'fk4202',//Unfall/Unfallfolgen
                    '_id',
                    'employeeId',
                    'asvReferrer',
                    'asvInitiator',
                    'fk4218',//BSNR des Überweisers, ScheinEstablishment
                    'fk4242',//LANR des Überweisers, scheinRemittor
                    'timestamp',
                    'initiatorPhysicianName',
                    'fk4229', // when checked 87777 Ausnahmeindikation
                    'fk5098',
                    'fk5099',
                    'scheinInputTemplate'
                ] ),
                lazyAdd: false
            },
            subModelsDesc: {
                value: ScheinEditorModel.ATTRS.subModelsDesc.value.concat( [] ),
                lazyAdd: false
            }
        };

        Y.extend( GKVScheinEditorModel, ScheinEditorModel, {
                initializer: function GKVScheinEditorModel_initializer() {
                    var
                        self = this;
                    self.initGKVScheinEditorModel();

                },
                destructor: function GKVScheinEditorModel_destructor() {
                },
                initGKVScheinEditorModel: function GKVScheinEditorModel_initGKVScheinEditorModel() {
                    var
                        self = this,
                        currentPatient = peek( self.get( 'currentPatient' ) ),
                        currentActivity = peek( self.get( 'currentActivity' ) ),
                        caseFolder = peek( self.get( 'caseFolder' ) );

                    self.billingAreaI18n = i18n( 'InCaseMojit.casefile_detail.label.BILLING_AREA' );
                    self.initialRemittorI18n = i18n( 'InCaseMojit.casefile_detail.group.INITIAL_REMITTOR' );
                    self.labelLanrI18n = i18n( 'InCaseMojit.casefile_detail.label.LANR' );
                    self.labelPseudoLabelI18n = i18n( 'InCaseMojit.casefile_detail.label.PSEUDO_LANR' );
                    self.remittorI18n = i18n( 'InCaseMojit.casefile_detail.group.REMITTOR' );
                    self.labelToI18n = i18n( 'InCaseMojit.casefile_detail.label.TO' );
                    self.labelWopI18n = i18n( 'InCaseMojit.casefile_detail.label.WOP' );
                    self.labelDSICDI18n = i18n( 'InCaseMojit.casefile_detail.label.D_S_ICD' );
                    self.operationsI18n = i18n( 'InCaseMojit.casefile_detail.group.OPERATION' );
                    self.etsI18n = i18n( 'InCaseMojit.casefile_detail.group.ETS' );
                    self.sktI18n = i18n( 'InCaseMojit.casefile_detail.group.SKT' );
                    self.pregnancyI18n = i18n( 'InCaseMojit.casefile_detail.group.PREGNANCY' );
                    self.psychotherapyI18n = i18n( 'InCaseMojit.casefile_detail.group.PSYCHOTHERAPY' );
                    self.bewillgteLeistungenI18n = i18n( 'InCaseMojit.casefile_detail.group.BEWILLIGTE_LEISTUNGEN' );
                    self.recalculateI18n = i18n( 'InCaseMojit.casefile_detail.button.RECALCULATE' );
                    self.initialRemittorI18n = i18n( 'InCaseMojit.casefile_detail.group.INITIAL_REMITTOR' );
                    self.labelBNSRI18n = i18n( 'InCaseMojit.casefile_detail.label.BSNR' );
                    self.labelAsvTeamNumberI18n = i18n( 'activity-schema.Activity_T.asvTeamnumber.i18n' );
                    self.otherI18n = i18n( 'InCaseMojit.casefile_detail.group.OTHER' );
                    self.patientDataI18n = i18n( 'InCaseMojit.casefile_detail.button.PATIENT_DATA' );
                    self.employeeNameI18n = i18n( 'activity-schema.Activity_T.employeeName.i18n' );
                    self.scheinSlipMedicalTreatment1I18n = i18n( 'activity-schema.ScheinSlipMedicalTreatment_E.1' );
                    self.scheinSlipMedicalTreatment2I18n = i18n( 'activity-schema.ScheinSlipMedicalTreatment_E.2' );
                    self.scheinSlipMedicalTreatment3ShortI18n = i18n( 'activity-schema.ScheinSlipMedicalTreatment_E.3' ).substring( 1, 4 );
                    self.scheinSlipMedicalTreatment3I18n = i18n( 'activity-schema.ScheinSlipMedicalTreatment_E.3' );
                    self.scheinSlipMedicalTreatment4ShortI18n = i18n( 'activity-schema.ScheinSlipMedicalTreatment_E.4' ).substring( 1, 3 );
                    self.scheinSlipMedicalTreatment4I18n = i18n( 'activity-schema.ScheinSlipMedicalTreatment_E.4' );
                    self.accidentFk4229InfoDialogI18n = i18n( 'activity-schema.GKVSchein_T.fk4229InfoDialog.i18n' );
                    self.labelInputTemplate = i18n( 'activity-schema.GKVSchein_T.scheinInputTemplate.i18n' );

                    self.initialKBVScheinTypes = self.get( 'initialKBVScheinTypes' );

                    self.scheinInputTemplateList21 = ko.observableArray( Y.doccirrus.schemas.activity.types.ScheinInputTemplate_E.listFor21);
                    self.scheinInputTemplateList27 = ko.observableArray( Y.doccirrus.schemas.activity.types.ScheinInputTemplate_E.listFor27);
                    self.scheinSlipMedicalTreatmentList = ko.observableArray( Y.doccirrus.schemas.activity.types.ScheinSlipMedicalTreatment_E.list );


                    self.scheinInputTemplate = ko.observable();

                    self.isNew = ko.computed( function() {
                        return currentActivity.isNew();
                    } );

                    self.fk4229CheckboxValue = ko.observable();
                    self.fk4229CheckboxValue(self.fk4229());
                    self.fk4229CheckboxValue.subscribe( function( val ) {
                        if( val === true ) {
                            self.fk4229( '87777' );
                        } else {
                            self.fk4229( '' );
                        }
                    } );

                    self.initiatorLabelBNSRI18nComputed = ko.computed( function() {
                        var asvInitiator = self.asvInitiator();
                        if( asvInitiator ) {
                            return self.labelAsvTeamNumberI18n;
                        }
                        return self.labelBNSRI18n;
                    } );

                    self.initiatorLabelLanrI18nComputed = ko.computed( function() {
                        var asvInitiator = self.asvInitiator();
                        if( asvInitiator ) {
                            return self.labelLanrI18n + '/' + self.labelPseudoLabelI18n;
                        }
                        return self.labelLanrI18n;
                    } );

                    self.labelBNSRI18nComputed = ko.computed( function() {
                        var asvReferrer = self.asvReferrer();
                        if( asvReferrer ) {
                            return self.labelAsvTeamNumberI18n;
                        }
                        return self.labelBNSRI18n;
                    } );

                    self.labelLanrI18nComputed = ko.computed( function() {
                        var asvReferrer = self.asvReferrer();
                        if( asvReferrer ) {
                            return self.labelLanrI18n + '/' + self.labelPseudoLabelI18n;
                        }
                        return self.labelLanrI18n;
                    } );

                    self.showPatientVersions = ko.computed( function() {
                        var caseFolder = self.get( 'caseFolder' );
                        return caseFolder.type === 'PUBLIC';
                    } );

                    /**
                     * If subgroup 28 is selected the LANR, BSNR and name of "Überweiser" is set from selected "Betriebsstätte"
                     * and "Vertragsarzt".
                     */
                    self.addDisposable( ko.computed( function() {

                        var
                            subgroup = unwrap( self.scheinSubgroup ),
                            employee = unwrap( self.fk5099 ),
                            location = unwrap( self.fk5098 ),
                            name = Y.doccirrus.schemas.person.personDisplay( self.employee() );

                        if( subgroup === '28' ) {
                            self.scheinEstablishment( location );
                            self.scheinRemittor( employee );
                            self.fk4219( name );
                            self.fk4219.readOnly( true );

                        } else {
                            self.fk4219.readOnly( false );
                        }
                    } ));

                    /**
                     * list of KBV data (Group and Subgroups in one list)
                     * @type ko.computed
                     * @returns {Array}
                     * @private
                     */
                    if( Y.doccirrus.auth.isISD() ) {
                        self._scheinTypeKBV = ko.observableArray( self.initialKBVScheinTypes );
                    } else {
                        self._scheinTypeKBV = KoViewModel.utils.createAsync( {
                            cache: self,
                            initialValue: self.initialKBVScheinTypes,
                            jsonrpc: {
                                fn: Y.doccirrus.jsonrpc.api.kbv.scheinarten,
                                params: self.addDisposable( ko.computed( function() {
                                    var
                                        patientId = peek( currentPatient._id ),
                                        params,
                                        locationId,
                                        costCarrierBillingSection,
                                        costCarrierBillingGroup,
                                        // MOJ-14319: [OK] [CASEFOLDER]
                                        insurance = currentPatient.getPublicInsurance( caseFolder && caseFolder.type );

                                    params = {
                                        patientId: patientId
                                    };

                                    if( insurance ) {
                                        locationId = unwrap( insurance.locationId );
                                        costCarrierBillingSection = unwrap( insurance.costCarrierBillingSection );
                                        costCarrierBillingGroup = unwrap( insurance.costCarrierBillingGroup );
                                    }

                                    if( costCarrierBillingGroup && costCarrierBillingSection && locationId ) {
                                        params.locationId = locationId;
                                        params.costCarrierBillingSection = costCarrierBillingSection;
                                        params.costCarrierBillingGroup = costCarrierBillingGroup;
                                    } else {
                                        return null;
                                    }
                                    return params;

                                } ) )
                            },
                            converter: function( response ) {
                                var data = response.data;

                                if( data[0] && data[0].kvValue ) {
                                    data = data[0].kvValue;
                                }

                                return data;
                            }
                        } );
                    }

                    /**
                     * list of Group
                     * @type ko.computed
                     * @returns {Array}
                     * @private
                     */
                    self._scheinTypeList = ko.computed( function() {
                        var
                            _scheinTypeKBV = unwrap( self._scheinTypeKBV );

                        //  prevent creash when creating new schein, strix 2016-02-16
                        if( !_scheinTypeKBV ) {
                            _scheinTypeKBV = [];
                        }

                        return _scheinTypeKBV.filter( function( item ) {
                            return 4 === item.key.length;
                        } );
                    } );
                    /**
                     * list of current Subgroup determined by current scheinType
                     * @type ko.computed
                     * @returns {Array}
                     * @private
                     */
                    self._scheinSubgroup = ko.computed( function() {
                        // build lists
                        // subgroups are those with key length 2
                        // a subgroup is defined by key at 0 equals key at last of group ...
                        // exceptional 00 which would be 1
                        var scheinType = unwrap( self.scheinType ),
                            scheinTypeKBV = unwrap( self._scheinTypeKBV ),
                            scheinFilterType,
                            preselectIdx;

                        if( ('undefined' !== typeof scheinType) && (4 === scheinType.length) ) {
                            scheinFilterType = Y.Array.filter( scheinTypeKBV, function( item ) {
                                var scheinCharLast, itemCharAt;
                                if( item.key && 2 === item.key.length ) {
                                    scheinCharLast = scheinType.charAt( scheinType.length - 1 );
                                    if( '00' === item.key ) {
                                        itemCharAt = '1';
                                    } else {
                                        itemCharAt = item.key.charAt( 0 );
                                    }
                                    return (itemCharAt === scheinCharLast);
                                } else {
                                    return false;
                                }
                            } );

                            //EXTMOJ-565
                            preselectIdx = scheinFilterType.findIndex( function( itm ) {
                                return "24" === itm.key;
                            } );

                            if( -1 !== preselectIdx ) {
                                scheinFilterType.unshift( scheinFilterType.splice( preselectIdx, 1 )[0] );
                            }

                            return scheinFilterType;
                        } else {
                            return [];
                        }
                    } ).extend( {rateLimit: 300} );

                    /**
                     * check if view is the current scheinType to display
                     * @param {String|Array|...} scheinTypeValue Strings of scheinTypes or Array of String of scheinTypes
                     * @returns {Boolean}
                     * @private
                     */
                    self._isVisibleScheinType = function() {
                        var result = false,
                            scheinType = unwrap( self.scheinType );
                        Y.Object.each( arguments, function( argument ) {
                            switch( Y.Lang.type( argument ) ) {
                                case 'string':
                                    if( argument === scheinType ) {
                                        result = true;
                                    }
                                    break;
                                case 'array':
                                    Y.Array.each( argument, function( arg ) {
                                        if( arg === scheinType ) {
                                            result = true;
                                        }
                                    } );
                                    break;
                            }
                        } );
                        return result;
                    };

                    /**
                     * check if view is the current scheinSubgroup to display
                     * @param {String|Array|...} scheinSubgroupValue Strings of scheinSubgroups or Array of String of scheinSubgroups
                     * @returns {Boolean}
                     * @private
                     */
                    self._isVisibleScheinSubgroup = function() {
                        var result = false,
                            scheinSubgroup = unwrap( self.scheinSubgroup );
                        Y.Object.each( arguments, function( argument ) {
                            switch( Y.Lang.type( argument ) ) {
                                case 'string':
                                    if( argument === scheinSubgroup ) {
                                        result = true;
                                    }
                                    break;
                                case 'array':
                                    Y.Array.each( argument, function( arg ) {
                                        if( arg === scheinSubgroup ) {
                                            result = true;
                                        }
                                    } );
                                    break;
                            }
                        } );
                        return result;
                    };
                    /**
                     * @type ko.computed
                     * @returns {Array}
                     * @private
                     */
                    if( Y.doccirrus.auth.isISD() ) {
                        self._scheinBillingAreaList = ko.observableArray( [  //MOJ-2434 - maxiaml list.
                            {"key": "00", "value": "kein besonderes Abrechnungsgebiet (Defaultwert)"},
                            {"key": "15", "value": "AOP nach §115b"},
                            {"key": "03", "value": "Methadon-Substitutionsbehandlung"},
                            {"key": "14", "value": "Ambulantes Operieren"},
                            {"key": "08", "value": "Umweltmedizin"},
                            {"key": "02", "value": "Dialyse-Sachkosten"},
                            {
                                "key": "05",
                                "value": "sonstige Notfalleistungen durch ermächtigte Krankenhausärzte"
                            },
                            {"key": "07", "value": "Diabetesabrechnung"},
                            {"key": "80", "value": "Wahltarif BKK Arzt privat"},
                            {
                                "key": "04",
                                "value": "persönlich erbrachte Notfalleistungen durch ermächtigte Krankenhausärzte"
                            },
                            {"key": "10", "value": "Hirnleistungsstörungen"},
                            {"key": "01", "value": "Dialyse-Arztkosten"},
                            {"key": "09", "value": "Rheuma"},
                            {"key": "06", "value": "Fremde Zytologie"}
                        ] );
                    } else {
                        self._scheinBillingAreaList = KoViewModel.utils.createAsync( {
                            cache: self,
                            initialValue: [  //MOJ-2434 - maxiaml list.
                                {"key": "00", "value": "kein besonderes Abrechnungsgebiet (Defaultwert)"},
                                {"key": "15", "value": "AOP nach §115b"},
                                {"key": "03", "value": "Methadon-Substitutionsbehandlung"},
                                {"key": "14", "value": "Ambulantes Operieren"},
                                {"key": "08", "value": "Umweltmedizin"},
                                {"key": "02", "value": "Dialyse-Sachkosten"},
                                {
                                    "key": "05",
                                    "value": "sonstige Notfalleistungen durch ermächtigte Krankenhausärzte"
                                },
                                {"key": "07", "value": "Diabetesabrechnung"},
                                {"key": "80", "value": "Wahltarif BKK Arzt privat"},
                                {
                                    "key": "04",
                                    "value": "persönlich erbrachte Notfalleistungen durch ermächtigte Krankenhausärzte"
                                },
                                {"key": "10", "value": "Hirnleistungsstörungen"},
                                {"key": "01", "value": "Dialyse-Arztkosten"},
                                {"key": "09", "value": "Rheuma"},
                                {"key": "06", "value": "Fremde Zytologie"}
                            ],
                            jsonrpc: {
                                fn: Y.doccirrus.jsonrpc.api.kbv.abrechnungsgebiete,
                                params: self.addDisposable( ko.computed( function() {
                                    var
                                        patientId = peek( currentPatient._id ),
                                        locationId = unwrap( self.locationId ),
                                        scheinSubgroup = self.scheinSubgroup(),
                                        params = {
                                            scheinSubgroup: scheinSubgroup,
                                            patientId: patientId,
                                            locationId: locationId
                                        };

                                    return params;
                                } ) )
                            },
                            converter: function( response ) {
                                var data = response.data;
                                if( data[0] && data[0].kvValue ) {
                                    data = data[0].kvValue;
                                }
                                return data;
                            }
                        } );
                    }

                    self._fk4123FromTable = ko.observable( false );
                    /**
                     * @type ko.computed
                     * @returns {Array}
                     * @private
                     */
                    self._fk4123List = KoViewModel.utils.createAsync( {
                        cache: self,
                        initialValue: [],
                        jsonrpc: {
                            fn: Y.doccirrus.jsonrpc.api.kbv.personenkreis,
                            params: self.addDisposable( ko.computed( function() {
                                var
                                    patientId = peek( currentPatient._id ),
                                    locationId,
                                    costCarrierBillingSection,
                                    costCarrierBillingGroup,
                                    params,
                                    insurance;

                                // MOJ-14319: [OK] [CASEFOLDER]
                                insurance = currentPatient.getPublicInsurance( caseFolder && caseFolder.type );
                                // P6-160: for "Personenkreis" we can get the list every time, because there is no alert shown
                                // if data is returned like for "SKT-Zusatzangaben". The whole list is returned anyway,
                                // if no kvc specific data is found.
                                // if( insurance && unwrap( insurance.cardSwipe ) ) {
                                //     return null;
                                // }
                                params = {
                                    patientId: patientId
                                };

                                if( insurance ) {
                                    locationId = unwrap( insurance.locationId );
                                    costCarrierBillingSection = unwrap( insurance.costCarrierBillingSection );
                                    costCarrierBillingGroup = unwrap( insurance.costCarrierBillingGroup );
                                }

                                if( costCarrierBillingGroup && costCarrierBillingSection && locationId ) {
                                    params.locationId = locationId;
                                    params.costCarrierBillingSection = costCarrierBillingSection;
                                    params.costCarrierBillingGroup = costCarrierBillingGroup;
                                } else {
                                    return null;
                                }
                                return params;
                            } ) )
                        },
                        converter: function( response ) {
                            var fromTable = true,
                                data = response.data;

                            if( data[0] && data[0].kvAB ) {
                                fromTable = false;
                            }
                            if( data[0] && data[0].kvValue ) {
                                data = data[0].kvValue;
                            }
                            if( data.length ) {
                                data = [
                                    {value: VALUE_PLEASE_SELECT, key: ''}
                                ].concat( data );
                            }
                            self._fk4123FromTable( fromTable );
                            return data;
                        }
                    } );

                    self._fk4123Needed = ko.computed( function() {
                        var _fk4123List = unwrap( self._fk4123List ),
                            fk4123 = unwrap( self.fk4123 ),
                            _fk4123FromTable = unwrap( self._fk4123FromTable ),
                            // MOJ-14319: [OK] [CASEFOLDER]
                            insurance = currentPatient.getPublicInsurance( caseFolder && caseFolder.type );

                        if( !fk4123 && _fk4123List && _fk4123List.length && insurance && !unwrap( insurance.cardSwipe ) && !_fk4123FromTable ) {
                            Y.doccirrus.DCSystemMessages.removeMessage( 'FK4123_MANDATORY_ERR' );
                            Y.use( 'DCSystemMessages', function() {
                                Y.doccirrus.DCSystemMessages.addMessage( {
                                    messageId: 'FK4123_MANDATORY_ERR',
                                    content: FK4123_MANDATORY_ERR,
                                    level: 'WARNING'
                                } );
                            } );
                        }
                    } );

                    /**
                     * notes to display for fk4124 (SKT-Zusatzangaben)
                     * @type ko.computed
                     * @returns {Array}
                     * @private
                     */
                    self._fk4124Notes = KoViewModel.utils.createAsync( {
                        cache: self,
                        initialValue: [],
                        jsonrpc: {
                            fn: Y.doccirrus.jsonrpc.api.kbv.sktzusatz,
                            params: self.addDisposable( ko.computed( function() {
                                var
                                    patientId = peek( currentPatient._id ),
                                    params,
                                    locationId,
                                    costCarrierBillingSection,
                                    costCarrierBillingGroup,
                                    // MOJ-14319: [OK] [CASEFOLDER]
                                    insurance = currentPatient.getPublicInsurance( caseFolder && caseFolder.type );

                                // P6-160
                                if( insurance && unwrap( insurance.cardSwipe ) ) {
                                    return null;
                                }
                                params = {
                                    patientId: patientId
                                };

                                if( insurance ) {
                                    locationId = unwrap( insurance.locationId );
                                    costCarrierBillingSection = unwrap( insurance.costCarrierBillingSection );
                                    costCarrierBillingGroup = unwrap( insurance.costCarrierBillingGroup );
                                }

                                if( costCarrierBillingGroup && costCarrierBillingSection && locationId ) {
                                    params.locationId = locationId;
                                    params.costCarrierBillingSection = costCarrierBillingSection;
                                    params.costCarrierBillingGroup = costCarrierBillingGroup;
                                } else {
                                    return null;
                                }
                                return params;
                            } ) )
                        },
                        converter: function( response ) {
                            var data = response.data;
                            if( data[0] && data[0].kvValue ) {
                                data = [data[0].kvValue];
                            }
                            return data;
                        }
                    } );

                    /**
                     * determine visibility of _fk4124Notes
                     * @type ko.computed
                     */
                    self._isVisibleFk4124Notes = ko.computed( function() {
                        var
                            _fk4124Notes = unwrap( self._fk4124Notes );
                        return Boolean( _fk4124Notes && _fk4124Notes.length );
                    } );

                    /**
                     * notes to display for fk4125/fk4126 (Gültigkeitszeitraum/SKT-Bemerkungen)
                     * @type ko.computed
                     * @returns {Array}
                     * @private
                     */
                    self._T9404Notes = KoViewModel.utils.createAsync( {
                        cache: self,
                        initialValue: [],
                        jsonrpc: {
                            fn: Y.doccirrus.jsonrpc.api.kbv.sktinfo,
                            params: self.addDisposable( ko.computed( function() {
                                var
                                    patientId = peek( currentPatient._id ),
                                    params,
                                    locationId,
                                    costCarrierBillingSection,
                                    costCarrierBillingGroup,
                                    insurance;
                                // MOJ-14319: [OK] [CASEFOLDER]
                                insurance = currentPatient.getPublicInsurance( caseFolder && caseFolder.type );
                                // P6-160
                                if( insurance && unwrap( insurance.cardSwipe ) ) {
                                    return null;
                                }
                                params = {patientId: patientId};

                                if( insurance ) {
                                    locationId = unwrap( insurance.locationId );
                                    costCarrierBillingSection = unwrap( insurance.costCarrierBillingSection );
                                    costCarrierBillingGroup = unwrap( insurance.costCarrierBillingGroup );
                                }

                                if( costCarrierBillingGroup && costCarrierBillingSection && locationId ) {
                                    params.locationId = locationId;
                                    params.costCarrierBillingSection = costCarrierBillingSection;
                                    params.costCarrierBillingGroup = costCarrierBillingGroup;
                                } else {
                                    return null;
                                }
                                return params;
                            } ) )
                        },
                        converter: function( response ) {
                            var data = response.data;
                            if( data[0] && data[0].kvValue ) {
                                data = data[0].kvValue;
                            }
                            return data;
                        }
                    } );

                    /**
                     * determine visibility of _T9404Notes
                     * @type ko.computed
                     */
                    self._isVisibleT9404 = ko.computed( function() {
                        var _T9404Notes = unwrap( self._T9404Notes );
                        return Boolean( _T9404Notes && _T9404Notes.length );
                    } );

                    /**
                     * notes to display for fk4125 (Gültigkeitszeitraum)
                     * @type ko.computed
                     * @returns {Array}
                     * @private
                     */
                    self._fk4125Notes = ko.computed( function() {
                        return Y.Array.filter( unwrap( self._T9404Notes ) || [], function( item ) {
                            return '1' === item.key;
                        } );
                    } );
                    /**
                     * determine visibility of _fk4125Notes
                     * @type ko.computed
                     */
                    self._isVisibleFk4125Notes = ko.computed( function() {
                        var _fk4125Notes = unwrap( self._fk4125Notes );
                        return Boolean( _fk4125Notes && _fk4125Notes.length );
                    } );

                    /**
                     * notes to display for fk4126 (SKT-Bemerkungen)
                     * @type ko.computed
                     * @returns {Array}
                     * @private
                     */
                    self._fk4126Notes = ko.computed( function() {
                        return Y.Array.filter( unwrap( self._T9404Notes ) || [], function( item ) {
                            return '4' === item.key;
                        } );
                    } );
                    /**
                     * determine visibility of _fk4126Notes
                     * @type ko.computed
                     */
                    self._isVisibleFk4126Notes = ko.computed( function() {
                        var _fk4126Notes = unwrap( self._fk4126Notes );
                        return Boolean( _fk4126Notes && _fk4126Notes.length );
                    } );

                    /**
                     * placeholder handling
                     */
                    self._fk4217BsnrList = ko.observableArray( [] );
                    self._fk4217Placeholder = ko.computed( function() {
                        var _fk4217BsnrList = unwrap( self._fk4217BsnrList );
                        if( !_fk4217BsnrList.length ) {
                            _fk4217BsnrList = ['BSNR'];
                        }
                        return _fk4217BsnrList.join( ', ' );
                    } );

                    /**
                     * placeholder handling
                     */
                    self._initiatorPhysicianNameList = ko.observableArray( [] );
                    self._initiatorPhysicianNamePlaceholder = ko.computed( function() {
                        var initiatorPhysicianNameList = unwrap( self._initiatorPhysicianNameList );
                        if( !initiatorPhysicianNameList.length ) {
                            initiatorPhysicianNameList = [self.initiatorPhysicianName.i18n];
                        }
                        return initiatorPhysicianNameList.join( ', ' );
                    } );

                    /**
                     * placeholder handling
                     */
                    self._fk4241LanrList = ko.observableArray( [] );

                    self.addDisposable( self.scheinSubgroup.subscribe( function( newValue ) {
                        self.setScheinContent( newValue );
                    } ) );

                    /**
                     * validate those dependencies
                     */
                    self.addDisposable( ko.computed( function() {
                        unwrap( self._fk4123List );
                    } ).extend( {rateLimit: ko.extenders.validate.VALIDATE_RATELIMIT_TIMEOUT} ) );

                    self.initSelect2scheinSpecialisation();
                    self.initSelect2Fk4217();
                    self.initSelect2Fk4241();
                    self.initSelect2InitiatorPhysicianNameCfgAutoComplete();
                    self.initSelect2ScheinOrder();
                    self._initDateCheckForfk4202();
                    self._initPhysicianSetters();

                    self._setScheinOrder39Tooltip = SCHEIN_ORDER_39;

                    self.addDisposable( ko.computed( function() {
                        var
                            _fk4124Notes = unwrap( self._fk4124Notes ),
                            fk4124 = unwrap( self.fk4124 );
                        if( Array.isArray( _fk4124Notes ) && _fk4124Notes.length ) {
                            Y.doccirrus.DCSystemMessages.removeMessage( 'FK4124_MANDATORY_ERR' );
                            if( !fk4124 ) {
                                Y.use( 'DCSystemMessages', function() {
                                    Y.doccirrus.DCSystemMessages.addMessage( {
                                        messageId: 'FK4124_MANDATORY_ERR',
                                        content: FK4124_MANDATORY_ERR,
                                        level: 'WARNING'
                                    } );
                                } );
                            }
                        }

                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var
                            scheinType = self.scheinType(),
                            fk4125from = self.fk4125from(),
                            _fk4125Notes = self._fk4125Notes();

                        if( ['0101', '0102', '0104'].indexOf( scheinType ) > -1 ) {

                            if( Array.isArray( _fk4125Notes ) && _fk4125Notes.length ) {
                                Y.doccirrus.DCSystemMessages.removeMessage( 'FK4125FROM_MANDATORY_ERR' );
                                if( !(Y.doccirrus.validations.common._mandatory( fk4125from ) && Y.doccirrus.validations.common._date( fk4125from )) ) {
                                    Y.use( 'DCSystemMessages', function() {
                                        Y.doccirrus.DCSystemMessages.addMessage( {
                                            messageId: 'FK4125FROM_MANDATORY_ERR',
                                            content: FK4125FROM_MANDATORY_ERR,
                                            level: 'WARNING'
                                        } );
                                    } );
                                }
                            }
                        }

                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var
                            scheinType = self.scheinType(),
                            fk4125to = self.fk4125to(),
                            _fk4125Notes = self._fk4125Notes();

                        if( ['0101', '0102', '0104'].indexOf( scheinType ) > -1 ) {
                            // this is only available in UI and only on editing ... ?
                            if( Array.isArray( _fk4125Notes ) && _fk4125Notes.length ) {
                                Y.doccirrus.DCSystemMessages.removeMessage( 'FK4125TO_MANDATORY_ERR-' + self._cid );

                                if( !(Y.doccirrus.validations.common._mandatory( fk4125to ) && Y.doccirrus.validations.common._date( fk4125to )) ) {
                                    Y.use( 'DCSystemMessages', function() {
                                        Y.doccirrus.DCSystemMessages.addMessage( {
                                            messageId: 'FK4125TO_MANDATORY_ERR-' + self._cid,
                                            content: FK4125TO_MANDATORY_ERR,
                                            level: 'WARNING'
                                        } );
                                    } );
                                }
                            }
                        }

                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var
                            fk4126 = self.fk4126(),
                            _fk4126Notes = self._fk4126Notes();

                        if( _fk4126Notes.length ) {
                            Y.doccirrus.DCSystemMessages.removeMessage( 'FK4126_MANDATORY_ERR' );
                            if( !fk4126 ) {
                                Y.use( 'DCSystemMessages', function() {
                                    Y.doccirrus.DCSystemMessages.addMessage( {
                                        messageId: 'FK4126_MANDATORY_ERR',
                                        content: FK4126_MANDATORY_ERR,
                                        level: 'WARNING'
                                    } );
                                } );
                            }
                        }

                    } ) );
                },
                setScheinContent: function GKVScheinEditorModel_setScheinContent( subgroupValue ) {
                    // can be moved to Data model
                    var
                        self = this,
                        subgroups = peek( self._scheinSubgroup ) || [],
                        scheinTypeList = peek( self._scheinTypeList ) || [],
                        scheinType = peek( self.scheinType ),
                        scheinTypeTitle = '',
                        subgroupTitle = '',
                        content = peek( self.scheinNotes ) || '';

                    scheinTypeList.some( function( type ) {
                        if( scheinType === type.key ) {
                            scheinTypeTitle = type.value || '';
                            return true;
                        }
                        return false;
                    } );

                    if( scheinTypeTitle ) {
                        subgroups.some( function( subgroup ) {
                            if( subgroupValue === subgroup.key ) {
                                subgroupTitle = subgroup.value || '';
                                return true;
                            }
                            return false;
                        } );
                        content = scheinTypeTitle + ' (' + subgroupTitle + ')';
                    }
                    self.userContent( content );

                    //self.content( Y.doccirrus.schemas.activity.generateContent( self.toJSON() ) );
                },
                initSelect2Fk4241: function GKVScheinEditorModel_initSelect2Fk4241() {
                    var
                        self = this;
                    self._fk4241Placeholder = ko.computed( function() {
                        var _fk4241LanrList = unwrap( self._fk4241LanrList );
                        if( !_fk4241LanrList.length ) {
                            _fk4241LanrList = ['LANR'];
                        }
                        return _fk4241LanrList.join( ', ' );
                    } );
                    /**
                     * @see ko.bindingHandlers.select2
                     * @type {Object}
                     * @private
                     */
                    self._fk4241CfgAutoComplete = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    fk4241 = unwrap( self.fk4241 );

                                if( fk4241 ) {
                                    return {id: fk4241, text: fk4241};
                                } else {
                                    return null;
                                }
                            },
                            write: function( $event ) {
                                self.fk4241( $event.val );
                                if( $event.added ) {
                                    self._getPhysicianName( {
                                        value: $event.val,
                                        param: 'officialNo'
                                    } ).then( function( result ) {
                                        if( result && result[0] ) {
                                            self.initiatorPhysicianName( result[0].fullNames[0] );
                                            self._initiatorPhysicianNameList( '' );
                                        } else {
                                            self.initiatorPhysicianName( '' );
                                            self._initiatorPhysicianNameList( '' );
                                        }
                                    } );
                                }
                                if( $event.removed ) {
                                    self._fk4241LanrList( [] );
                                }
                            }
                        } ) ),
                        placeholder: self._fk4241Placeholder,
                        select2: {
                            minimumInputLength: 1,
                            allowClear: true,
                            query: function( query ) {
                                var
                                    fk4217 = unwrap( self.fk4217 ),
                                    bsnr = (Y.doccirrus.validations.common._bsnr( fk4217 ) ? fk4217 : '');

                                function done( data ) {
                                    var
                                        results = [].concat( data );

                                    // reject existing "Ersatzwert"
                                    results = Y.Array.filter( results, function( item ) {
                                        return item.lanr !== '999999900';
                                    } );
                                    // first entry "Ersatzwert"
                                    results.unshift( {
                                        "lanr": "999999900",
                                        "parentBsnr": "",
                                        "bsnrList": [],
                                        "lanrList": []
                                    } );
                                    // map to select2
                                    results = results.map( function( item ) {
                                        return {id: item.lanr, text: item.lanr, _data: item};
                                    } );
                                    // publish results
                                    query.callback( {
                                        results: results
                                    } );
                                }

                                // handle not having a catalog
                                if( null === Y.doccirrus.catalogmap.getCatalogSDAV() ) {
                                    done( [] );
                                } else {
                                    jQuery
                                        .ajax( {
                                            type: 'GET', xhrFields: {withCredentials: true},
                                            url: Y.doccirrus.infras.getPrivateURL( '/r/catsearch/' ),
                                            data: {
                                                action: 'catsearch',
                                                catalog: Y.doccirrus.catalogmap.getCatalogSDAV().filename,
                                                itemsPerPage: 10,
                                                term: query.term,
                                                key: 'lanr',
                                                bsnr: bsnr
                                            }
                                        } )
                                        .done( done )
                                        .fail( function() {
                                            done( [] );
                                        } );
                                }

                            },
                            formatResult: function format( result, container, query, escapeMarkup ) {
                                var
                                    select2formatResult = [],
                                    replacementValueI18n = 'Ersatzwert',
                                    postFix = '',
                                    classNames = [];

                                window.Select2.util.markMatch( result.text, query.term, select2formatResult, escapeMarkup );
                                select2formatResult = select2formatResult.join( '' );
                                if( result._data.lanr === '999999900' ) {
                                    postFix = ' <span class="select2-match">(' + replacementValueI18n + ')</span>';
                                }
                                return Y.Lang.sub( '<span class="{classNames}">{text}{postFix}</span>', {
                                    text: select2formatResult,
                                    classNames: classNames.join( ' ' ),
                                    postFix: postFix
                                } );
                            },
                            formatResultCssClass: function( result ) {
                                if( '999999900' === result.id ) {
                                    return 'dc-select2-result-replacementValue';
                                } else {
                                    return '';
                                }
                            }
                        },
                        init: function( element ) {
                            var
                                $element = jQuery( element );

                            $element.on( 'select2-selected', function( $event ) {
                                var
                                    choiceData = $event.choice._data;

                                if (choiceData.bsnrList.length > 0) {
                                    self._fk4217BsnrList( choiceData.bsnrList );
                                } else if(choiceData.parentBsnr) {
                                    self._fk4217BsnrList( [choiceData.parentBsnr] );
                                }
                            } );
                        }
                    };
                },
                /**
                 * Select functionality for bsnr(fk4217) of Erstveranlasser view field. Searches in baseContacts for
                 * initiator by bsnr and fills the correspondending fields with initiatorPhysicianName and LANR(fk4241) if
                 * these are available.
                 * @param initiatorPhysicanName: field for name of initiator with placeholder.
                 * @param _fk4217BsnrList: list with BSNR of initiator with placeholder.
                 * @param _fk4241LanrList: list with LANR of initiator with placeholder.
                 * @see ko.bindingHandlers.select2
                 * @type {Object}
                 * @private
                 */
                initSelect2Fk4217: function GKVScheinEditorModel_initSelect2Fk4217() {
                    var
                        self = this;
                    /**
                     * @see ko.bindingHandlers.select2
                     * @type {Object}
                     * @private
                     */
                    self._fk4217CfgAutoComplete = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    fk4217 = unwrap( self.fk4217 );

                                if( fk4217 ) {
                                    return {id: fk4217, text: fk4217};
                                } else {
                                    return null;
                                }
                            },
                            write: function( $event ) {
                                self.fk4217( $event.val );
                                if( $event.added ) {
                                    self._getPhysicianName( {
                                        value: $event.val,
                                        param: 'bsnrs'
                                    } ).then( function( result ) {
                                        if( !self.fk4241() ) {
                                            if( result && result[0] ) {
                                                if( result[0].fullNames.length > 1 ) {
                                                    self.initiatorPhysicianName( '' );
                                                    self._initiatorPhysicianNameList( result[0].fullNames );
                                                } else {
                                                    self.initiatorPhysicianName( result[0].fullNames[0] );
                                                }
                                            } else {
                                                self.initiatorPhysicianName( '' );
                                                self._initiatorPhysicianNameList( '' );
                                            }
                                        }
                                    } );
                                }
                                if( $event.removed ) {
                                    self._fk4217BsnrList( [] );
                                }
                            }
                        } ) ),
                        placeholder: self._fk4217Placeholder,
                        select2: {
                            minimumInputLength: 1,
                            allowClear: true,
                            query: function( query ) {
                                var
                                    fk4241 = unwrap( self.fk4241 ),
                                    lanr = (Y.doccirrus.validations.common._lanr( fk4241 ) ? fk4241 : '');

                                function done( data ) {
                                    var
                                        results = [].concat( data );

                                    // map to select2
                                    results = results.map( function( item ) {
                                        return {id: item.bsnr, text: item.bsnr, _data: item};
                                    } );
                                    // publish results
                                    query.callback( {
                                        results: results
                                    } );
                                }

                                // handle not having a catalog
                                if( null === Y.doccirrus.catalogmap.getCatalogSDAV() ) {
                                    done( [] );
                                } else {
                                    jQuery
                                        .ajax( {
                                            type: 'GET', xhrFields: {withCredentials: true},
                                            url: Y.doccirrus.infras.getPrivateURL( '/r/catsearch/' ),
                                            data: {
                                                action: 'catsearch',
                                                catalog: Y.doccirrus.catalogmap.getCatalogSDAV().filename,
                                                itemsPerPage: 10,
                                                term: query.term,
                                                key: 'bsnr',
                                                lanr: lanr
                                            }
                                        } )
                                        .done( done )
                                        .fail( function() {
                                            done( [] );
                                        } );
                                }

                            }
                        },
                        init: function( element ) {
                            var
                                $element = jQuery( element );

                            $element.on( 'select2-selected', function( $event ) {
                                var
                                    choiceData = $event.choice._data;

                                self._fk4241LanrList( choiceData.lanrList );
                            } );
                        }
                    };

                },
                /**
                 * Select functionality for InitiatorPhysicianName view field. Searches in baseContacts for
                 * initiator by name and fills the correspondending fields with BSNR(fk4217) and LANR(fk4241) if
                 * these are available.
                 * @param initiatorPhysicanName: field for name of initiator with placeholder.
                 * @param _fk4217BsnrList: list with BSNR of initiator.
                 * @param _fk4241LanrList: list with LANR of initiator.
                 * @see ko.bindingHandlers.select2
                 * @type {Object}
                 * @private
                 */
                initSelect2InitiatorPhysicianNameCfgAutoComplete: function GKVScheinEditorModel_initSelect2InitiatorPhysicianNameCfgAutoComplete() {
                    var
                        self = this;

                    self._initiatorPhysicianNameCfgAutoComplete = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    initiatorPhysicianName = unwrap( self.initiatorPhysicianName );

                                if( initiatorPhysicianName ) {
                                    return {id: initiatorPhysicianName, text: initiatorPhysicianName};
                                } else {
                                    return null;
                                }
                            },
                            write: function( $event ) {
                                if( $event.added ) {
                                    self.initiatorPhysicianName( $event.val );
                                }
                                if( $event.removed ) {
                                    self._initiatorPhysicianNameList( [] );
                                }
                            }
                        } ) ),
                        placeholder: self._initiatorPhysicianNamePlaceholder,
                        select2: {
                            width: '100%',
                            allowClear: true,
                            minimumInputLength: 1,
                            query: function( query ) {

                                Y.doccirrus.jsonrpc.api.basecontact.searchContact( {
                                    query: {
                                        term: query.term
                                    }
                                } )
                                    .done( function( response ) {
                                        var results = [].concat( response.data );

                                        // map to select2
                                        results = results.map( function( item ) {
                                            return {
                                                id: item.firstname + ' ' + item.lastname,
                                                text: item.firstname + ' ' + item.lastname,
                                                bsnr: item.bsnrs,
                                                lanr: item.officialNo
                                            };
                                        } );
                                        // publish results
                                        query.callback( {
                                            results: results
                                        } );
                                    } );
                            }
                        },
                        init: function( element ) {
                            var
                                $element = jQuery( element );

                            $element.on( 'select2-selected', function( $event ) {
                                var
                                    choiceData = $event.choice;

                                if( choiceData.bsnr.length === 1 ) {
                                    self.fk4217( choiceData.bsnr );
                                } else {
                                    self._fk4217BsnrList( choiceData.bsnr );
                                }
                                self.fk4241( choiceData.lanr );
                            } );
                        }
                    };
                },
                initSelect2scheinSpecialisation: function GKVScheinEditorModel_initSelect2scheinSpecialisation() {
                    var
                        self = this,
                        select2Mapper = function( item ) {
                            return {
                                id: item.key,
                                text: item.value
                            };
                        };
                    //binder configuration
                    self._select2scheinSpecialisation = {
                        val: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    isNewActivity = peek( self.isNew ),
                                    scheinSpecialisation = self.scheinSpecialisation(),
                                    scheinType,
                                    employee;

                                // pre-selection of 'fachrichtung' for current employee
                                // only if he has one qualification
                                if( isNewActivity ) {
                                    scheinType = unwrap( self.scheinType );
                                    employee = unwrap( self.employee );

                                    if( !scheinSpecialisation && employee && '0102' === scheinType && 1 === employee.specialities.length ) {
                                        self.scheinSpecialisation( employee.specialities[0] );
                                        return employee.specialities[0];
                                    }

                                }

                                return scheinSpecialisation;
                            },
                            write: function( $event ) {
                                self.scheinSpecialisation( $event.val );
                            }
                        } ) ),
                        placeholder: ko.observable( PLACEHOLDER_PLEASE_SELECT ),
                        select2: {
                            width: '100%',
                            allowClear: true,

                            query: function( query ) {
                                var
                                    select2 = this,
                                    term = query.term,
                                    data = {results: Y.Array.map( self._scheinSpecialisationList(), select2Mapper )};

                                //// add user input to list
                                if( term ) {
                                    data.results.push( {id: term, text: term} );
                                }

                                data.results = Y.Array.filter( data.results, function( item ) {
                                    return select2.matcher( term, item.text );
                                } );
                                query.callback( data );
                            },
                            initSelection: function( element, callback ) {
                                var
                                    val = element.val(),
                                    observableArray = self._scheinSpecialisationList,
                                    items = observableArray(),
                                    subscription,
                                    doCallback = function( result ) {
                                        if( !result.length ) {
                                            return false;
                                        }
                                        var
                                            item = Y.Array.find( result, function( obj ) {
                                                return val === obj.key;
                                            } );

                                        // add user input to items and/or callback
                                        if( null === item ) {
                                            if( val ) {
                                                item = {key: val, value: val};
                                                result.push( item );
                                                observableArray( result );
                                                callback( select2Mapper( item ) );
                                            } else {
                                                callback();
                                            }
                                        } else {
                                            callback( select2Mapper( item ) );
                                        }
                                    };

                                if( items.length ) {
                                    doCallback( items );
                                } else {
                                    subscription = self.addDisposable( observableArray.subscribe( function( value ) {
                                        if( value.length ) {
                                            subscription.dispose();
                                            doCallback( value );
                                        }
                                    } ) );
                                }
                            }
                        }
                    };
                },
                initSelect2ScheinOrder: function initSelect2ScheinOrder() {
                    var
                        self = this;

                    self._select2scheinOrder = {
                        val: self.addDisposable( ko.computed( {
                            read: function() {
                                return self.scheinOrder();
                            },
                            write: function( $event ) {
                                self.scheinOrder( $event.val );
                            }
                        } ) ),
                        placeholder: ko.observable( PLACEHOLDER_PLEASE_SELECT ),
                        select2: {
                            width: '100%',
                            allowClear: true,
                            query: function( query ) {
                                var data = { results: self._getOrderChoiceForSelectedTemplate( self.scheinInputTemplate() )};
                                query.callback( data );
                            },
                            createSearchChoice: function( term ) {
                                return {
                                    id: term,
                                    text: term
                                };
                            },
                            initSelection: function( element, callback ) {
                                callback( {id: self.scheinOrder(), text: self.scheinOrder()} );
                            }
                        }
                    };
                },
                editPatientVersion: function GKVScheinEditorModel_editPatientVersion() {
                    var
                        self = this,
                        PatientVersionEditor = KoViewModel.getConstructor( 'PatientVersionEditor' ),
                        scheinPatient = peek( self.get( 'currentPatient' ) );

                    PatientVersionEditor.showAsModal( {
                        activityId: peek( self._id ),
                        locations: self.get( 'binder' ).getAllLocations(),
                        scheinPatient: scheinPatient && scheinPatient.initialConfig && scheinPatient.initialConfig.data
                    } );

                },
                showExceptionalindicationFk4229InfoDialog: function showExceptionalindicationFk4229InfoDialog() {
                    var
                        self = this;

                    Y.doccirrus.DCWindow.notice( {
                        message: self.accidentFk4229InfoDialogI18n,
                        window: {width: 'small'}
                    } );
                },

                /** @private **/
                _initDateCheckForfk4202: function() {
                    var
                        self = this;

                    self._isVisibleGreaterOrEqualDate = ko.computed( function() {
                        var
                            time = unwrap( self.timestamp ),
                            compareDate = moment( '32020', 'QYYYY' );

                        if( moment( time ).isAfter( compareDate ) ) {
                            return true;
                        }

                        return false;
                    } );
                },

                /**
                 * Sets name, BSNR and LANR for chosen referrer and initiator.
                 * @private
                 **/
                _initPhysicianSetters: function() {
                    var
                        self = this;

                    self.selectPhysician0102 = self._buildPhysicianSetter( {
                        asvContext: self.asvReferrer,
                        bsnr: 'scheinEstablishment',
                        lanr: 'scheinRemittor',
                        substitute: 'fk4219'
                    } );

                    self.selectPhysician0102_27 = self._buildPhysicianSetter( {
                        asvContext: self.asvInitiator,
                        bsnr: 'fk4217',
                        lanr: 'fk4241',
                        substitute: 'initiatorPhysicianName'
                    } );

                    self.selectPhysician0103 = self._buildPhysicianSetter( {
                        asvContext: self.asvReferrer,
                        bsnr: 'scheinEstablishment',
                        lanr: 'scheinRemittor'
                    } );
                },
                /**
                 * Search the "Y.doccirrus.jsonrpc.api.basecontact.searchContact" for contacts by given parameter. For
                 * MOJ_14188 state there are apicalls for officialNo and bsnrs search. From the apicall it gets all
                 * information about the found basecontacts. The data gets transformed to find basecontact names ordered
                 * by the search parameter.
                 * @param searchParams.param: Its the serachfield of basecontacts.
                 * @param searchParams.value: Its the searchterm for the searchfield.
                 * @param callback: the query result ordered by searchparam with names as array.
                 * @private
                 */
                _getPhysicianName: function( searchParams ) {
                    return Promise.resolve( Y.doccirrus.jsonrpc.api.basecontact.searchContact( {
                        query: {
                            term: searchParams.value,
                            searchParam: searchParams.param,
                            options: 'i'
                        }
                    } ) ).then( function( results ) {
                        if( searchParams.param ) {
                            results = results.data.map( function( currentValue ) {
                                return {
                                    id: currentValue[searchParams.param],
                                    text: currentValue[searchParams.param],
                                    fullName: currentValue.firstname + ' ' + currentValue.lastname
                                };
                            } ).reduce( function( acc, current ) {
                                if( !acc[current.id] ) {
                                    acc[current.id] = [
                                        {
                                            id: current.id,
                                            text: current.text,
                                            fullNames: [current.fullName]
                                        }];
                                } else {
                                    acc[current.id][0].fullNames.push( current.fullName );
                                }
                                return acc;
                            }, {} );
                        }

                        results = Object.values( results ).map( function( values ) {
                            return values[0];
                        } );

                        return results;

                    } ).catch( function( err ) {
                        Y.log( 'Error querying by param in basecontacts-api: ' + err.stack || err, 'error', 'GKVScheinEditorModel.client.js' );
                    } );
                },
                /**
                 * This method gets the possible selections for a selected template.
                 * @param {String} inputTemplate: The selected input template.
                 * @returns {[]}: All orders possibilites for the selected template. If no template is selected it returns
                 * an empty array.
                 * @private
                 */
                _getOrderChoiceForSelectedTemplate: function( inputTemplate ) {
                    var result = [];
                    if( inputTemplate === '39' ) {
                        result = Y.doccirrus.schemas.activity.types.ScheinOrder_E.list.map( function( entry ) {
                            return {id: entry.val, text: entry.val};
                        } );
                    } else if( inputTemplate === '10c' ) {
                        result = Y.doccirrus.schemas.activity.types.ScheinOrderTenC_E.list.map( function( entry ) {
                            return {id: entry.val, text: entry.val};
                        } );
                    }
                    return result;
                }
            }, {
                NAME: 'GKVScheinEditorModel'
            }
        );
        KoViewModel.registerConstructor( GKVScheinEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ScheinEditorModel',
            'PatientModel',
            'DCWindow',
            'dcerrortable',
            'dcvalidations',
            'FKEditorModels',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'PatientVersionEditor',
            'dcauth'
        ]
    }
)
;
