/**
/**
 * User: pi
 * Date: 11/12/15  10:40
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, jQuery, async, moment */

'use strict';

YUI.add( 'ScheinEditorModel', function( Y, NAME ) {
        /**
         * @module ScheinEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            ActivityEditorModel = KoViewModel.getConstructor( 'ActivityEditorModel' ),
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap,
            i18n = Y.doccirrus.i18n,
            WARNING = i18n( 'InCaseMojit.activity_model_clientJS.title.WARNING' ),
            OPENED_BILLED_BL = i18n( 'InCaseMojit.activity_model_clientJS.message.OPENED_BILLED_BL' ),
            OPENED_BL = i18n( 'InCaseMojit.activity_model_clientJS.message.OPENED_BL' ),
            OPENED_BL_Q = i18n( 'InCaseMojit.activity_model_clientJS.message.OPENED_BL_Q' ),
            OPENED_BL_NOTICE = i18n( 'InCaseMojit.activity_model_clientJS.message.OPENED_BL_NOTICE' ),
            BTN_YES = i18n( 'InCaseMojit.activity_model_clientJS.button.YES' ),
            BTN_NO = i18n( 'InCaseMojit.activity_model_clientJS.button.NO' ),
            ACTUAL_BL = i18n( 'InCaseMojit.activity_model_clientJS.message.ACTUAL_BL' );

        /**
         * @abstract
         * @class ScheinEditorModel
         * @constructor
         * @extends ActivityEditorModel
         */
        function ScheinEditorModel( config ) {
            ScheinEditorModel.superclass.constructor.call( this, config );
        }

        /**
         * Injects select2(_scheinEstablishmentCfgAutoComplete and _scheinRemittorCfgAutoComplete) to current context
         * @static
         */
        ScheinEditorModel.injectSelect2 = function() {
            var
                self = this;

            /**
             * placeholder handling
             */
            self._scheinEstablishmentBsnrList = ko.observableArray( [] );
            self._scheinEstablishmentPlaceholder = ko.computed( function() {
                if( ko.isObservable( self.asvReferrer ) && unwrap( self.asvReferrer ) ) {
                    return i18n( 'activity-schema.Activity_T.asvTeamnumber.i18n' );
                }
                var _scheinEstablishmentBsnrList = self._scheinEstablishmentBsnrList();
                if( !_scheinEstablishmentBsnrList.length ) {
                    _scheinEstablishmentBsnrList = ['BSNR'];
                }
                return _scheinEstablishmentBsnrList.join( ', ' );
            } );

            /**
             * @see ko.bindingHandlers.select2
             * @type {Object}
             * @private
             */
            self._scheinEstablishmentCfgAutoComplete = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        if( self.scheinEstablishment && self.scheinEstablishment() ) {
                            return {id: self.scheinEstablishment(), text: self.scheinEstablishment()};
                        }
                        else {
                            return null;
                        }
                    },
                    write: function( $event ) {
                        if( self.scheinEstablishment ) {
                            self.scheinEstablishment( $event.val );
                        } else {
                            Y.log( 'This schein type does not have a scheinEstablishment', 'info', NAME );
                        }

                    }
                } ) ),
                placeholder: self._scheinEstablishmentPlaceholder,
                select2: {
                    minimumInputLength: 1,
                    allowClear: true,
                    query: function( query ) {
                        var scheinRemittor = self.scheinRemittor(),
                            lanr = (Y.doccirrus.validations.common._lanr( scheinRemittor ) ? scheinRemittor : '');

                        function done( data ) {
                            var
                                results = [].concat( data );

                            if( 0 === results.length ) {
                                results[0] = {
                                    "bsnr": query.term,
                                    "parentBsnr": "",
                                    "bsnrList": [],
                                    "lanrList": []
                                };
                            }
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
                        }
                        else {
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
                                        lanr: ('999999900' === lanr) ? undefined : lanr
                                    }
                                } )
                                .done( done )
                                .fail( function() {
                                    done( [] );
                                } );
                        }

                    },
                    createSearchChoice: function( term ) {
                        return {
                            id: term,
                            text: term
                        };
                    }
                },
                init: function( element ) {
                    var
                        $element = jQuery( element );

                    $element.on( 'select2-selected', function( $event ) {
                        var
                            choiceData = $event.choice._data;

                        self._scheinRemittorLanrList( choiceData && choiceData.lanrList || [] );
                        // if there is only one result set this value
                        if( choiceData && choiceData.lanrList && 1 === choiceData.lanrList.length ) {
                            self.scheinRemittor( choiceData.lanrList[0] );
                        }
                    } );
                }
            };


            /**
             * If ASV Mode or noCrossLocationAccess option is enabled, then also check if user is in location of
             * current activity. Otherwise disable on ISD or if activity is new or in status 'BILLED'.
             */
            self.editPatientVersionDisabled = ko.computed( function() {
                var binder = self.get( 'binder' ),
                    currentActivity = unwrap( self.get( 'currentActivity' ) ),
                    tenantSettings = binder.getInitialData( 'tenantSettings' ),
                    currentUser = binder.getInitialData( 'currentUser' ),
                    caseFolder = self.get( 'caseFolder' ),
                    currentUserLocations, userNotInLocation,
                    locationId = unwrap( currentActivity.locationId ),
                    isBilled = ('BILLED' === unwrap( currentActivity.status ));

                if( Y.doccirrus.schemas.casefolder.additionalTypes.ASV === caseFolder.additionalType ||
                    (true === (tenantSettings && tenantSettings.noCrossLocationAccess)) ) {
                    currentUserLocations = currentUser.locations.map( function( _location ) {
                        return _location._id;
                    } );
                    userNotInLocation = -1 === currentUserLocations.indexOf( locationId );
                }

                return userNotInLocation || currentActivity.isNew() || Y.doccirrus.auth.isISD() || isBilled;
            } );

            self.editPatientVersion = function () {
                var
                    PatientVersionEditor = KoViewModel.getConstructor( 'PatientVersionEditor' ),
                    scheinPatient =  peek( self.get( 'currentPatient' ) ),
                    caseFolderType =  self.get('caseFolder').type;

                PatientVersionEditor.showAsModal( {
                    activityId: peek( self._id ),
                    locations: self.get( 'binder' ).getAllLocations(),
                    scheinPatient: scheinPatient && scheinPatient.initialConfig && scheinPatient.initialConfig.data,
                    caseFolderType: caseFolderType
                } );

            };
            /**
             * placeholder handling
             */
            self._scheinRemittorLanrList = ko.observableArray( [] );
            self._scheinRemittorPlaceholder = ko.computed( function() {
                if( ko.isObservable( self.asvReferrer ) && unwrap( self.asvReferrer ) ) {
                    return 'LANR/' + i18n( 'InCaseMojit.casefile_detail.label.PSEUDO_LANR' );
                }
                var _scheinRemittorLanrList = self._scheinRemittorLanrList();
                if( !_scheinRemittorLanrList.length ) {
                    _scheinRemittorLanrList = ['LANR'];
                }
                return _scheinRemittorLanrList.join( ', ' );
            } );

            /**
             * @see ko.bindingHandlers.select2
             * @type {Object}
             * @private
             */
            self._scheinRemittorCfgAutoComplete = {
                data: self.addDisposable( ko.computed( {
                    read: function() {
                        if( self.scheinRemittor && self.scheinRemittor() ) {
                            return {id: self.scheinRemittor(), text: self.scheinRemittor()};
                        }
                        else {
                            return null;
                        }
                    },
                    write: function( $event ) {
                        if( self.scheinRemittor ) {
                            self.scheinRemittor( $event.val );
                        } else {
                            Y.log( 'This schein type does not have a scheinRemittor', 'info', NAME );
                        }
                    }
                } ) ),
                placeholder: self._scheinRemittorPlaceholder,
                select2: {
                    minimumInputLength: 1,
                    allowClear: true,
                    query: function( query ) {
                        var
                            scheinEstablishment = self.scheinEstablishment(),
                            bsnr = (Y.doccirrus.validations.common._bsnr( scheinEstablishment ) ? scheinEstablishment : '');

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
                        }
                        else {
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
                    },
                    createSearchChoice: function( term ) {
                        return {
                            id: term,
                            text: term,
                            _data: {}
                        };
                    }
                },
                init: function( element ) {
                    var
                        $element = jQuery( element );

                    $element.on( 'select2-selected', function( $event ) {
                        var
                            choiceData = $event.choice._data;

                        if( choiceData.parentBsnr && -1 === choiceData.bsnrList.indexOf( choiceData.parentBsnr ) ) {
                            choiceData.bsnrList.push( choiceData.parentBsnr );
                        }

                        self._scheinRemittorLanrList( choiceData && choiceData.lanrList || [] );
                        // if there is only one result set this value
                        if( choiceData && choiceData.bsnrList && 1 === choiceData.bsnrList.length ) {
                            self.scheinEstablishment( choiceData.bsnrList[0] );
                        }
                    } );


                }
            };
        };

        ScheinEditorModel.ATTRS = {
            whiteList: {
                value: [
                    'caseFolderId',
                    'locationId',
                    'treatmentType',
                    'scheinEstablishment',
                    'scheinRemittor',
                    'continuousIcds',
                    'continuousMedications',
                    'includesBSK',
                    'isChiefPhysician',
                    'timestamp',
                    'scheinSpecialisation',
                    'debtCollection',
                    'reasonType',
                    'scheinQuarter',
                    'scheinNotes',
                    'scheinSettledDate',
                    'scheinNextTherapist',
                    'fk4219',
                    'icds',
                    'scheinDiagnosis',
                    'scheinOrder',
                    'scheinFinding',
                    'fk4234',
                    'scheinClinicalTreatmentFrom',
                    'scheinClinicalTreatmentTo',
                    'orderAccounting',
                    'agencyCost',
                    'createContinuousDiagnosisOnSave',
                    'createContinuousMedicationsOnSave'
                ],
                lazyAdd: false
            },
            subModelsDesc: {
                value: [
                    {
                        propName: 'fk4235Set',
                        editorName: 'Fk4235EditorModel'
                    }
                ],
                lazyAdd: false
            }
        };

        Y.extend( ScheinEditorModel, ActivityEditorModel, {
                initializer: function ScheinEditorModel_initializer() {
                    var
                        self = this;
                    self.initScheinEditorModel();

                },
                destructor: function ScheinEditorModel_destructor() {
                },
                initScheinEditorModel: function ScheinEditorModel_initScheinEditorModel() {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) );

                    Y.doccirrus.inCaseUtils.injectPopulatedObjs.call( self, {
                        dataModel: currentActivity,
                        fields: ['icdsObj', 'continuousIcdsObj', 'continuousMedicationsObj']
                    } );
                    
                    self.isNew = ko.computed( function() {
                        return currentActivity.isNew();
                    } );

                    self.addFk4235Set = function() {
                        currentActivity.addFk4235Set();
                    };
                    self.removeFk4235Set = function( data ) {
                        currentActivity.removeFk4235Set( data.get( 'dataModelParent' ) );
                    };
                    /**
                     * shows formated 'cheinSettledDate' (date of invoice)
                     */
                    self._showScheinSettledDate = ko.computed( function() {
                        var date = unwrap( self.scheinSettledDate );
                        return !date ? '' : moment( date ).format( 'DD.MM.YYYY' );
                    } );

                    self.initSelect2();

                    self.debtCollection.list = Y.doccirrus.schemas.activity.types.DebtCollection_E.list;

                    /**
                     * @type ko.computed
                     * @returns {Array}
                     * @private
                     */
                    self._scheinSpecialisationList = Y.doccirrus.uam.ViewModel.createAsync( {
                        cache: self,
                        initialValue: [],
                        jsonrpc: Y.doccirrus.jsonrpc.api.kbv.fachgruppe,
                        converter: function( response ) {
                            var data = response.data;
                            if( data[0] && data[0].kvValue ) {
                                data = data[0].kvValue;
                            }
                            return data;
                        }
                    } );

                    self._recalculate = function() {
                        async.waterfall( [
                            function( next ) {
                                Y.doccirrus.jsonrpc.api.activity.recalcBLInCaseFolder( {
                                        query: {
                                            caseFolderId: ko.utils.peekObservable( self.caseFolderId ),
                                            patientId: ko.utils.peekObservable( self.patientId )
                                        }
                                    } )
                                    .done( function() {
                                        next();
                                    } )
                                    .fail( next );
                            },
                            function( next ) {
                                var
                                    activitiesTable = self.get( 'activitiesTable' );
                                if( activitiesTable ) {
                                    activitiesTable.reload();
                                }
                                Y.doccirrus.jsonrpc.api.activity.getBLOfLastSchein( {
                                        query: {
                                            caseFolderId: ko.utils.peekObservable( self.caseFolderId ),
                                            patientId: ko.utils.peekObservable( self.patientId ),
                                            actType: ko.utils.peekObservable( self.actType )
                                        }
                                    } )
                                    .done( function( response ) {
                                        var message = ACTUAL_BL + ' ',
                                            data = response && response.data && response.data[0];
                                        if( data ) {
                                            message = message + Y.doccirrus.schemas.activity.generateSchein( data.fk4235Set );
                                        }

                                        next( null, message );
                                    } )
                                    .fail( next );
                            }
                        ], function( err, message ) {
                            var
                                text = message,
                                type = 'info';
                            if( err ) {
                                text = err.toString();
                                type = 'error';
                            }
                            Y.doccirrus.DCWindow.notice( {
                                message: text,
                                type: type,
                                window: {
                                    width: Y.doccirrus.DCWindow.SIZE_LARGE
                                }
                            } );
                        } );

                    };

                    self.checkIsThereOpenBlSchein();

                    self.addDisposable( ko.computed( function() {
                        var treatmentType = self.treatmentType(),
                            includesBSK = self.includesBSK();

                        if( 'AMBULANT' === treatmentType && true === includesBSK ) {
                            Y.doccirrus.DCWindow.notice( {
                                message: 'Bitte beachten Sie, dass in der inSuite für die besonderen Sachkosten die Pauschalen gemäß Spalte 4 des DKG-NT erfasst sind und eine pauschale Abrechnung von Auslagen gemäß §10 GOÄ im Ambulanten Bereich nur in Ausnahmefällen zulässig ist.',
                                window: {width: 'medium', dragable: true, modal: false}
                            } );
                        } else if( 'STATIONARY' === treatmentType && true === includesBSK ) {
                            Y.doccirrus.DCWindow.notice( {
                                message: 'Bitte beachten Sie, dass die besonderen Sachkosten normalerweise bereits Teil des Behandlungsvertrages zwischen dem Patienten und dem Krankenhaus sind und nicht mehr in der Ärztlichen Leistung abgerechnet werden dürfen. Bitte prüfen Sie die Zulässigkeit der Berechnung der BSK.',
                                window: {width: 'medium', dragable: true, modal: true}
                            } );
                        }

                        if( 'AMBULANT' === treatmentType ) {
                            self.isChiefPhysician( false );
                        }
                    } ) );

                },
                initSelect2: function ScheinEditorModel_initSelect2() {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) ),
                        currentPatient = peek( self.get( 'currentPatient' ) );

                    ScheinEditorModel.injectSelect2.call( this );
                    /**
                     * Schein - Continuous Diagnoses Handling
                     */
                    (function() {
                        var // map data to select2 format and include a reference
                            select2Mapper = function( data ) {
                                return {id: data._id, text: unwrap( data.code ), _ref: data};
                            },
                        // formatting select2 list entries
                            select2FormatResult = function( object ) {
                                var code = unwrap( object._ref.code ),
                                    content = unwrap( object._ref.content ),
                                    text = Y.Escape.html( code + ' (' + content + ')' );
                                return '<div class="dc-formatResult" title="' + text + '">' + text + '</div>';
                            },
                        // formatting select2 tags
                            select2FormatSelection = function( object, container ) {
                                var code = unwrap( object._ref.code ),
                                    content = unwrap( object._ref.content ),
                                    text = Y.Escape.html( code + ' (' + content + ')' ),
                                    ref = object._ref;
                                if( ref.actType === 'DIAGNOSIS' && ref.diagnosisType === 'CONTINUOUS' &&
                                    ref.diagnosisTreatmentRelevance === 'TREATMENT_RELEVANT' ) {
                                    container.parent().css( {'background-image': 'linear-gradient(to top, #FFCC91 20%, #FFCC91 50%, #FFCC91 52%, #eee 100%)'} );
                                }
                                return '<span title="' + text + '">' + code + '</span>';
                            };

                        self._select2continuousDiagnoses = {
                            data: self.addDisposable( ko.computed( {
                                read: function() {
                                    // provide select2 data objects
                                    return self.continuousIcdsObj().map( select2Mapper );
                                },
                                write: function( $event ) {
                                    // transfer select2 data status
                                    if( $event.hasOwnProperty( 'added' ) ) {
                                        currentActivity.addContinuousIcds( $event.added._ref );
                                    }
                                    if( $event.hasOwnProperty( 'removed' ) ) {
                                        currentActivity.removeContinuousIcds( $event.removed._ref._id );
                                    }
                                }
                            } ) ),
                            select2: {
                                multiple: true,
                                formatResult: select2FormatResult,
                                formatSelection: select2FormatSelection,

                                query: function( query ) {
                                    // TODO: check conICDS
                                    Y.doccirrus.jsonrpc.api.activity.getContinuousDiagnosis( {
                                            itemsPerPage: 20,
                                            omitScheinCheck: true,
                                            query: {
                                                patientId: peek( currentPatient._id ),
                                                timestamp: peek( self.timestamp ),
                                                locationId: peek( self.locationId )
                                            }
                                        } )
                                        .done( function( response ) {
                                            var
                                                _continuousDiagnoses = response.data;
                                            query.callback( {
                                                results: _continuousDiagnoses.map( select2Mapper )
                                            } );
                                        } )
                                        .fail( function() {
                                            query.callback( {
                                                results: []
                                            } );
                                        } );
                                }
                            }
                        };

                        self.addDisposable( ko.computed( function() {
                        } ).extend( {rateLimit: 300} ) );

                    })();

                    /**
                     * Schein - Continuous Medications Handling
                     */
                    (function() {
                        var // map data to select2 format and include a reference
                            select2Mapper = function( data ) {
                                return {id: data._id, text: unwrap( data.code ), _ref: data};
                            },
                            // formatting select2 list entries
                            select2FormatResult = function( object ) {
                                var code = unwrap( object._ref.code ),
                                    content = unwrap( object._ref.content ),
                                    text = Y.Escape.html( code + ' (' + content + ')' );
                                return '<div class="dc-formatResult" title="' + text + '">' + text + '</div>';
                            },
                            // formatting select2 tags
                            select2FormatSelection = function( object, container ) {
                                var code = unwrap( object._ref.code ),
                                    content = unwrap( object._ref.content ),
                                    text = Y.Escape.html( code + ' (' + content + ')' ),
                                    ref = object._ref;
                                if( ref.actType === 'MEDICATION' && ref.phContinuousMed ) {
                                    container.parent().css( {'background-image': 'linear-gradient(to top, #FFCC91 20%, #FFCC91 50%, #FFCC91 52%, #eee 100%)'} );
                                }
                                return '<span title="' + text + '">' + code + '</span>';
                            };

                        self._select2continuousMedications = {
                            data: self.addDisposable( ko.computed( {
                                read: function() {
                                    // provide select2 data objects
                                    return self.continuousMedicationsObj().map( select2Mapper );
                                },
                                write: function( $event ) {
                                    // transfer select2 data status
                                    if( Y.Object.owns( $event, 'added' ) ) {
                                        currentActivity.addContinuousMedications( $event.added._ref );
                                    }
                                    if( Y.Object.owns( $event, 'removed' ) ) {
                                        currentActivity.removeContinuousMedications( $event.removed._ref._id );
                                    }
                                }
                            } ) ),
                            select2: {
                                multiple: true,
                                formatResult: select2FormatResult,
                                formatSelection: select2FormatSelection,

                                query: function( query ) {
                                    Y.doccirrus.jsonrpc.api.activity.getContinuousMedications( {
                                        itemsPerPage: 20,
                                        omitScheinCheck: true,
                                        query: {
                                            patientId: peek( currentPatient._id ),
                                            timestamp: peek( self.timestamp ),
                                            locationId: peek( self.locationId )
                                        }
                                    } )
                                        .done( function( response ) {
                                            var
                                                _continuousMedications = response.data;
                                            query.callback( {
                                                results: _continuousMedications.map( select2Mapper )
                                            } );
                                        } )
                                        .fail( function() {
                                            query.callback( {
                                                results: []
                                            } );
                                        } );
                                }
                            }
                        };

                        self.addDisposable( ko.computed( function() {
                        } ).extend( {rateLimit: 300} ) );

                    })();

                    /**
                     * SCHEIN - Diagnoses Handling
                     *
                     * @rw: extend to handle diagnoses as activities
                     */
                    (function() {
                        var catalog = Y.doccirrus.catalogmap.getCatalogForDiagnosis(),
                        // map data to select2 format and include a reference
                            select2Mapper = function( data ) {
                                var
                                    diagData;
                                // note: just for now return dummy item if cannot resolve
                                if( data ) {
                                    diagData = currentActivity.makeActivityFromICD( {
                                        dataICD: data,
                                        patientId: peek( currentPatient._id )
                                    } );
                                    return {id: diagData._id, text: diagData.code, _ref: diagData};
                                } else {
                                    return {id: 0, text: 'Undefined', _ref: {code: 'Unknown', content: 'Undefined'}};
                                }
                            },
                        // formatting select2 list entries
                            select2FormatResult = function( object ) {
                                var code = unwrap( object._ref.code ),
                                    content = unwrap( object._ref.content ),
                                    text = Y.Escape.html( code + ' (' + content + ')' );
                                return '<div class="dc-formatResult" title="' + text + '">' + text + '</div>';
                            },
                        // formatting select2 tags
                            select2FormatSelection = function( object ) {
                                var code = unwrap( object._ref.code ),
                                    content = unwrap( object._ref.content ),
                                    text = Y.Escape.html( code + ' (' + content + ')' );
                                return '<span title="' + text + '">' + code + '</span>';
                            };

                        // setup input widgets
                        self._select2scheinCaseHistory = {
                            data: self.addDisposable( ko.computed( {
                                read: function() {
                                    return self.icdsObj().map( select2Mapper );
                                },
                                write: function( $event ) {
                                    var
                                        additionalTransitionData = currentActivity.get( 'additionalTransitionData' );
                                    additionalTransitionData.newIcds = additionalTransitionData.newIcds || [];
                                    // transfer select2 data status
                                    if( Y.Object.owns( $event, 'added' ) ) {
                                        currentActivity._linkActivity( $event.added._ref, true );
                                        additionalTransitionData.newIcds.push( $event.added._ref );
                                    }
                                    if( Y.Object.owns( $event, 'removed' ) ) {
                                        currentActivity._unlinkActivity( $event.removed._ref._id );
                                        additionalTransitionData.newIcds = additionalTransitionData.newIcds.filter( function( item ) {
                                            return item._id === $event.removed._ref._id;
                                        } );
                                    }
                                }
                            } ) ),
                            select2: {
                                multiple: true,
                                formatResult: select2FormatResult,
                                formatSelection: select2FormatSelection,
                                query: function( query ) {
                                    if( query.term ) {
                                        Y.io( Y.doccirrus.infras.getPrivateURL( '/r/catsearch/' ), {
                                            data: {
                                                itemsPerPage: 20,
                                                term: query.term,
                                                action: 'catsearch',
                                                catalog: catalog.filename
                                            },
                                            headers: {'Accept': 'application/json'},
                                            xdr: {use: 'native', credentials: true},
                                            on: {
                                                success: function( id, xhr ) {
                                                    var data = JSON.parse( xhr.responseText ),
                                                        mapped = data.map( select2Mapper );
                                                    query.callback( {
                                                        results: mapped
                                                    } );
                                                }
                                            }
                                        } );
                                    } else {
                                        query.callback( {
                                            results: []
                                        } );
                                    }
                                }
                            }
                        };
                    })();
                },
                checkIsThereOpenBlSchein: function ScheinEditorModel_checkIsThereOpenBlSchein() {
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) ),
                        activities = peek( currentActivity.activities ),
                        openScheinBl = currentActivity.get( 'openScheinBl' ),
                        openBilledScheinBl = currentActivity.get( 'openBilledScheinBl' ),
                        isNewActivity = peek( self.isNew );

                    if( 0 === activities.length && isNewActivity && openScheinBl ) {
                        Y.doccirrus.DCWindow.notice( {
                            title: WARNING,
                            type: 'info',
                            window: {
                                manager: Y.doccirrus.DCWindow.defaultDCWindowManager,
                                width: 'xlarge',
                                maximizable: true,
                                buttons: {
                                    footer: [
                                        Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                            label: BTN_NO,
                                            action: function() {
                                                this.close();
                                            }
                                        } ),
                                        Y.doccirrus.DCWindow.getButton( 'OK', {
                                            label: BTN_YES,
                                            isDefault: true,
                                            action: function() {
                                                currentActivity.insertBL( openScheinBl.fk4235Set, openScheinBl.parentId );
                                                this.close();
                                            }
                                        } )
                                    ]
                                }
                            },
                            message: OPENED_BL + '<br/>' + OPENED_BL_NOTICE + '<br/>' + OPENED_BL_Q
                        } );
                    } else if( 0 === activities.length && isNewActivity && openBilledScheinBl ) {
                        Y.doccirrus.DCWindow.notice( {
                            title: WARNING,
                            type: 'info',
                            window: {
                                manager: Y.doccirrus.DCWindow.defaultDCWindowManager,
                                width: 'xlarge',
                                maximizable: true,
                                buttons: {
                                    footer: [
                                        Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                            label: BTN_NO,
                                            action: function() {
                                                this.close();
                                            }
                                        } ),
                                        Y.doccirrus.DCWindow.getButton( 'OK', {
                                            label: BTN_YES,
                                            isDefault: true,
                                            action: function() {
                                                currentActivity.prefillBL( openBilledScheinBl.fk4235Set );
                                                this.close();
                                            }
                                        } )
                                    ]
                                }
                            },
                            message: OPENED_BILLED_BL
                        } );
                    }
                },
            /**
             * Shorthand builder for creating a "selectPhysician" and fill the supplied field names.
             * @param {object} config
             * @param {string} config.bsnr Name of field for bsnr
             * @param {string} config.lanr Name of field for lanr
             * @param {string} [config.substitute] Name of field that might receive full name in case no lanr available
             * @returns {function}
             * @private
             */
            _buildPhysicianSetter: function( config ) {
                var
                    self = this,
                    asvContext = config.asvContext,
                    bsnrKey = config.bsnr,
                    lanrKey = config.lanr,
                    substituteKey = config.substitute;

                return function() {
                    var
                        selectPhysician = Y.doccirrus.utils.selectPhysician();

                    selectPhysician.after( 'select', function( eventFacade, physician ) {
                        var
                            fullnameData = (physician.content) || '',
                            lanrData = (physician.officialNo) || '',
                            bsnrData = (physician.bsnrs && physician.bsnrs[0]) || '',
                            asvTeamNumberData = (physician.asvTeamNumbers && physician.asvTeamNumbers[0]) || '';

                        // reset previous values
                        self[bsnrKey]( '' );
                        self[lanrKey]( '' );
                        if( substituteKey ) {
                            self[substituteKey]( '' );
                        }

                        // determine what to set
                        if( lanrData ) {
                            self[lanrKey]( lanrData );
                            if( !unwrap( asvContext ) && bsnrData ) {
                                self[bsnrKey]( bsnrData );
                            } else if( unwrap( asvContext ) && asvTeamNumberData ) {
                                self[bsnrKey]( asvTeamNumberData );
                            }
                        }
                        if( substituteKey && fullnameData ) {
                            self[substituteKey]( fullnameData );
                        }
                    } );
                };
            }
            }, {
                NAME: 'ScheinEditorModel'
            }
        );
        KoViewModel.registerConstructor( ScheinEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ActivityEditorModel',
            'activity-schema',
            'dccatalogmap',
            'DCWindow',
            'dcerrortable',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'inCaseUtils'
        ]
    }
);
