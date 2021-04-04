/*global YUI, ko, _ */

'use strict';

YUI.add( 'DiagnosisChEditorModel', function( Y ) {
        /**
         * @module DiagnosisEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            CatalogTagEditorModel = KoViewModel.getConstructor( 'CatalogTagEditorModel' ),
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            i18n = Y.doccirrus.i18n;

        function fail( error ) {
            _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
        }

        /**
         * @class DiagnosisChEditorModel
         * @constructor
         * @extends CatalogTagEditorModel
         */
        function DiagnosisChEditorModel( config ) {
            DiagnosisChEditorModel.superclass.constructor.call( this, config );
        }

        DiagnosisChEditorModel.ATTRS = {
            whiteList: {
                value: CatalogTagEditorModel.ATTRS.whiteList.value.concat( [
                    'relatedCodes',
                    'caseFolderId',
                    'userContent',
                    'subType',
                    'explanations',
                    'diagnosisCert',
                    'diagnosisLaterality',
                    'diagnosisPeriod',
                    'content',
                    'diagnosisSite',
                    'diagnosisType',
                    'diagnosisDerogation',
                    'diagnosisTreatmentRelevance',
                    'u_extra',
                    'subType',
                    'diagnosisInfectious',
                    'diagnosisFunctional',
                    'diagnosisNeoplasia',
                    'diagnosisOcupationally'
                ] ),
                lazyAdd: false
            }
        };

        Y.extend( DiagnosisChEditorModel, CatalogTagEditorModel, {
                initializer: function DiagnosisChEditorModel_initializer() {
                    var
                        self = this;
                    self.initDiagnosisChEditorModel();
                    self.initSubscriptions();
                },
                destructor: function DiagnosisEditorModel_destructor() {
                },
                initDiagnosisChEditorModel: function DiagnosisChEditorModel_initDiagnosisChEditorModel() {
                    var
                        self = this,
                        currentPatient = peek( self.get( 'currentPatient' ) ),
                        currentActivity = peek( self.get( 'currentActivity' ) ),
                        currentCaseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab(),
                        officialCaseFolder = currentCaseFolder && (Y.doccirrus.schemas.patient.isPublicInsurance( currentCaseFolder ) || currentCaseFolder.type === 'BG'); // MOJ-14319: [OK]

                    self.showSwitzFields = ko.observable( 'TESS-KAT' === self.catalogShort() );

                    // set default catalogShort ICD-10
                    if( currentActivity.isNew() ) {
                        self.catalogShort( 'ICD-10' );
                        self.diagnosisTreatmentRelevance( 'DOKUMENTATIV' );
                    }

                    self.contentDiagnosisI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.CONTENT_DIAGNOSIS' );
                    self.catalogTextI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.CATALOG_TEXT' );
                    self.sd3ExplanationsI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.SD3EXPLANATIONS' );
                    self.modifyHomeCatI18n = i18n( 'InCaseMojit.casefile_detail.checkbox.MODIFY_HOME_CAT' );
                    self.diagnosisSiteI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.DIAGNOSIS_SITE' );
                    self.diagnosisDerogationI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.DIAGNOSIS_DEROGATION' );
                    self.diagnosisLateralityI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.DIAGNOSIS_SITE' );
                    self.groupPropertiesI18n = i18n( 'InCaseMojit.casefile_detail.group.PROPERTIES' );
                    self.labelNotifiableI18n = i18n( 'InCaseMojit.casefile_detail.label.NOTIFIABLE' );
                    self.labelBillableI18n = i18n( 'InCaseMojit.casefile_detail.label.BILLABLE' );
                    self.labelInfectiousI18n = i18n( 'InCaseMojit.casefile_detail.checkbox.INFECTIOUS' );
                    self.labelFunctionalI18n = i18n( 'InCaseMojit.casefile_detail.checkbox.FUNCTIONAL' );
                    self.labelNeoplasiaI18n = i18n( 'InCaseMojit.casefile_detail.checkbox.NEOPLASIA' );
                    self.labelOcupationallyI18n = i18n( 'InCaseMojit.casefile_detail.checkbox.OCUPATIONALLY' );
                    self.labelExtraOptions = i18n( 'InCaseMojit.casefile_detail.label.EXTRA_OPTIONS' );

                    self._diagnosisCertList = Y.doccirrus.schemas.activity.types.DiagnosisCert_E.list;

                    self._diagnosisCertList = self._diagnosisCertList.map( function( el ){
                        el.disabled = ( el.val === 'NONE' ) && officialCaseFolder;
                        return el;
                    } );
                    // has error = i18n( 'validations.kbv.message.FK6003_ERR' )
                    self.diagnosisCert.hasError = ko.pureComputed(
                        {
                            read: function() {
                                var
                                    emptyDiagnosisCert = 'NONE' === unwrap( self.diagnosisCert ),
                                    nonUuuCode = 'UUU' !== unwrap( self.code ), // TODO: KBV Q1 2020 - remove UUU stuff after Q4 2019 invoicing is done
                                    isDiagnosisCertInvalid = ( nonUuuCode && emptyDiagnosisCert && officialCaseFolder );
                                return isDiagnosisCertInvalid;
                            },
                            write: function() {
                            }
                        } );
                    self.diagnosisCert.validationMessages = ko.observableArray( [ Y.doccirrus.errorTable.getMessage( { code: 18025 } ), i18n('validations.kbv.message.FK6003_ERR' ) ] );

                    self._diagnosisLateralityList = Y.doccirrus.schemas.activity.types.DiagnosisLaterality_E.list;
                    self._diagnosisPeriodList = Y.doccirrus.schemas.activity.types.DiagnosisPeriod_E.list;
                    self._diagnosisSiteList = Y.doccirrus.schemas.activity.types.DiagnosisSite_E.list;
                    self._diagnosisTypeList = Y.doccirrus.schemas.activity.types.DiagnosisType_E.list;
                    self._diagnosisTreatmentRelevanceList = Y.doccirrus.schemas.activity.types.DiagnosisTreatmentRelevance_E.list;

                    //  used for inserting text fragments from documentation tree
                    self.userContent.caretPosition = { current: ko.observable(), extent: ko.observable( -1 ) };
                    self.explanations.caretPosition = { current: ko.observable(), extent: ko.observable( -1 ) };

                    /**
                     * determine if special properties list will be empty
                     * @returns {Boolean} if true there are special properties to show
                     */
                    self.hasSpecial = ko.computed( function() {
                        return Boolean( unwrap( self.u_extra ) );
                    } );

                    self.checkedAll = ko.computed( {
                        read: function() {
                            // Get selected when dependent children are selected
                            var someSelected = false,
                                relatedCodes = unwrap( self.relatedCodes );
                            if( relatedCodes ) {
                                relatedCodes.forEach( function( code ) {
                                    if( code.checked() ) {
                                        someSelected = true;
                                    }
                                } );
                            }
                            return someSelected;
                        },
                        write: function( newState ) {
                            var relatedCodes = self.relatedCodes();
                            if( relatedCodes ) {
                                relatedCodes.forEach( function( code ) {
                                    code.checked( newState );
                                } );
                            }
                        }
                    } );

                    self.diagnosisTypeChangeHandler( self );

                },
                initSubscriptions: function() {
                    var self = this;
                    self.catalogShort.subscribe(function() {
                        self.catalogShortChangeHandler();
                    });

                    self.code.subscribe( function( val ) {
                        if( val ) {
                            self.loadCatalogReference();
                        }
                    });
                },
                /**
                 * loads reference for current code
                 * @returns {*}
                 */
                loadCatalogReference: function DiagnosisChEditorModel_loadCatalogReference() {
                    var
                        self = this,
                        val = unwrap( self.code ),
                        catalog = ( 'ICD-10' === unwrap( self.catalogShort ) ),
                        query = {},
                        index;
                    if( catalog ) {
                        index = val.indexOf( '.' );
                        query.codes = {};
                        if( -1 !== index ) {
                            query.codes.$in = [val.substring(0, index )];
                        } else {
                            query.codes.$in = [val];
                        }

                        Y.doccirrus.jsonrpc.api.catalogreference.read( {
                            query: query
                        } ).done( function( response ) {
                            var
                                data = response && response.data && response.data.map( function( item ) {
                                    return item.code;
                                });
                            self.loadRelatedCodes( data );
                        } ).fail( fail );
                    }
                },
                /**
                 * loads reference for current code
                 * * @param catalog
                 * * @param data
                 * @returns {*}
                 */
                loadRelatedCodes: function DiagnosisChEditorModel_loadRelatedCodes( data ) {
                    var self = this;
                    Y.doccirrus.jsonrpc.api.catalog.read( {
                        query: {
                            catalog: { $regex: 'DC-TESS-KAT' },
                            seq: { $in: data }
                        }
                    } ).done( function( response ) {
                        var
                            data = response && response.data;
                        self.relatedCodes( data.map( function( item ) {
                            return {
                                checked: true,
                                seq: item.seq,
                                title: item.title,
                                F: false,
                                I: false,
                                N: false,
                                B: false
                            };
                        }) );
                    } ).fail( fail );
                },
                /**
                 * Returns a ko computed, that checks if the specified u_extraKey is enabled.
                 * @param u_extraKey
                 * @returns {*}
                 */
                hasUExtra: function DiagnosisChEditorModel_hasUExtra( u_extraKey ) {
                    var
                        self = this;
                    return self.addDisposable( ko.computed( function() {
                        var u_extra = self.u_extra(),
                            hasExtra = 'j' === ((u_extra && u_extra[u_extraKey]) ? u_extra[u_extraKey] : undefined);
                        return hasExtra;
                    } ) );

                },
                /**
                 * checks if value is in range
                 * @param {number|string} value
                 * @param {number|string} from
                 * @param {number|string} to
                 * @returns {boolean}
                 */
                inRange: function DiagnosisChEditorModel_inRange( value, from, to ) {
                    value = Math.floor( value );
                    from = Math.floor( from );
                    to = Math.floor( to );
                    return (from <= value) && (value <= to);
                },
                /**
                 * builds string for message
                 * @param {string} minV
                 * @param {string} minU
                 * @param {string} maxV
                 * @param {string} maxU
                 * @param {boolean} isZ
                 * @returns {string}
                 */
                buildTextDuration: function DiagnosisChEditorModel_buildTextDuration( minV, minU, maxV, maxU, isZ ) {
                    minV = parseInt( minV, 10 );
                    maxV = parseInt( maxV, 10 );
                    if( isZ ) { // handle FK 6003 = Z
                        maxV = 124;
                    }
                    var minVText = minV,
                        minUText = (1 === minV ? minU : minU + 'en'), // determine plural
                        maxVText = ('Jahr' === maxU ? maxV + 1 : maxV), // increment for Jahr
                        maxUText = (1 === maxVText ? maxU : maxU + 'en'), // determine plural
                        areSame = (minV === maxV) && (minU === maxU),
                        minText = null,
                        maxText = null,
                        text = '';
                    // determine maxText
                    if( 124 > maxV ) {
                        maxText = (maxVText + ' ' + maxUText);
                        if( 'Jahr' === maxU ) {
                            maxText = ('unter ' + maxText);
                        }
                    }
                    // determine minText
                    if( areSame || null === maxText || minU !== maxU ) {
                        minText = (minVText + ' ' + minUText);
                    } else {
                        minText = minVText; // do not show unit twice
                    }
                    // combine min/max
                    if( areSame ) {
                        text = ('im Alter von ' + minText);
                    } else if( null === maxText ) {
                        text = ('ab einem Alter von ' + minText);
                    } else {
                        text = ('in der Altersgruppe zwischen ' + minText + ' und ' + maxText);
                    }
                    return text;
                },
                /**
                 * Change handler of "diagnosisType" select:
                 *
                 * MOJ-5649: dependency between dropdowns for diagnose
                 * @method diagnosisTypeChangeHandler
                 * @param editor
                 * @param event
                 */
                diagnosisTypeChangeHandler: function( /*editor, event*/ ) {
                    var
                        self = this,
                        value = peek( self.diagnosisType );

                    if( 'ANAMNESTIC' === value && Y.Array.find( self._diagnosisTreatmentRelevanceList, function( item ) {
                            return item.val === 'DOKUMENTATIV';
                        } ) ) {
                        self.diagnosisTreatmentRelevance( 'DOKUMENTATIV' );
                    }
                },

            /**
             * Change handler of "catalogShort" select:
             *
             * @method catalogShortChangeHandler
             * @param editor
             * @param event
             */
            catalogShortChangeHandler: function( /*editor, event*/  ) {
                    var
                        self = this,
                        value = peek( self.catalogShort );

                    self.showSwitzFields( 'TESS-KAT' === value );
                if( 'TESS-KAT' !== value && Y.Array.find( self._diagnosisTreatmentRelevanceList, function( item ) {
                        return item.val === 'DOKUMENTATIV';
                    } ) ) {
                    self.diagnosisTreatmentRelevance( 'DOKUMENTATIV' );
                } else {
                    if (Y.Array.find( self._diagnosisTreatmentRelevanceList, function( item ) {
                        return item.val === 'TREATMENT_RELEVANT';
                    } ) ) {
                        self.diagnosisTreatmentRelevance( 'TREATMENT_RELEVANT' );
                    }
                }
                }

            }, {
                NAME: 'DiagnosisChEditorModel'
            }
        );

        KoViewModel.registerConstructor( DiagnosisChEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'CatalogBasedEditorModel',
            'dccommonutils',
            'DCSystemMessages'
        ]
    }
);
