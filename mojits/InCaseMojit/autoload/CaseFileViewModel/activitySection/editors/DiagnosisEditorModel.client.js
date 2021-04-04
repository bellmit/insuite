/**
 * User: pi
 * Date: 16/12/15  10:40
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'DiagnosisEditorModel', function( Y ) {
        /**
         * @module DiagnosisEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            CatalogTagEditorModel = KoViewModel.getConstructor( 'CatalogTagEditorModel' ),
            unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            i18n = Y.doccirrus.i18n,
            P10_490_j = i18n( 'activity-schema.DiagnosisEditorModel_client.MESSAGES.P10_490_j' ),
            P10_500_j = i18n( 'activity-schema.DiagnosisEditorModel_client.MESSAGES.P10_500_j' ),
            P10_510_j = i18n( 'activity-schema.DiagnosisEditorModel_client.MESSAGES.P10_510_j' ),
            UUU_USAGE_WARNING = i18n( 'activity-schema.DiagnosisEditorModel_client.MESSAGES.UUU_USAGE_WARNING' );

        /**
         * @class DiagnosisEditorModel
         * @constructor
         * @extends CatalogTagEditorModel
         */
        function DiagnosisEditorModel( config ) {
            DiagnosisEditorModel.superclass.constructor.call( this, config );
        }

        DiagnosisEditorModel.ATTRS = {
            whiteList: {
                value: CatalogTagEditorModel.ATTRS.whiteList.value.concat( [
                    'timestamp',
                    'status',
                    'caseFolderId',
                    'userContent',
                    'subType',
                    'explanations',
                    'diagnosisCert',
                    'diagnosisSite',
                    'diagnosisType',
                    'diagnosisTreatmentRelevance',
                    'diagnosisDerogation',
                    'u_extra',
                    'subType'
                ] ),
                lazyAdd: false
            }
        };

        Y.extend( DiagnosisEditorModel, CatalogTagEditorModel, {
                initializer: function DiagnosisEditorModel_initializer() {
                    var
                        self = this;
                    self.initDiagnosisEditorModel();
                },
                destructor: function DiagnosisEditorModel_destructor() {
                },
                initDiagnosisEditorModel: function DiagnosisEditorModel_initDiagnosisEditorModel() {
                    var
                        self = this,
                        currentPatient = peek( self.get( 'currentPatient' ) ),
                        currentCaseFolder = currentPatient && currentPatient.caseFolderCollection.getActiveTab(),
                        officialCaseFolder = currentCaseFolder &&
                                             (Y.doccirrus.schemas.patient.isPublicInsurance( {type: currentCaseFolder.type} ) ||
                                              currentCaseFolder.type === 'BG');

                    self.contentDiagnosisI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.CONTENT_DIAGNOSIS' );
                    self.catalogTextI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.CATALOG_TEXT' );
                    self.sd3ExplanationsI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.SD3EXPLANATIONS' );
                    self.modifyHomeCatI18n = i18n( 'InCaseMojit.casefile_detail.checkbox.MODIFY_HOME_CAT' );
                    self.diagnosisSiteI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.DIAGNOSIS_SITE' );
                    self.diagnosisDerogationI18n = i18n( 'InCaseMojit.casefile_detail.placeholder.DIAGNOSIS_DEROGATION' );
                    self.groupPropertiesI18n = i18n( 'InCaseMojit.casefile_detail.group.PROPERTIES' );
                    self.labelNotifiableI18n = i18n( 'InCaseMojit.casefile_detail.label.NOTIFIABLE' );
                    self.labelBillableI18n = i18n( 'InCaseMojit.casefile_detail.label.BILLABLE' );

                    self._diagnosisCertList = Y.doccirrus.schemas.activity.types.DiagnosisCert_E.list;

                    self._diagnosisCertList = self._diagnosisCertList.map( function( el ){
                        el.disabled = ( el.val === 'NONE' ) && officialCaseFolder;
                        return el;
                    } );
                    // has error = i18n( 'validations.kbv.message.FK6003_ERR' )
                    // TODO: KBV Q1 2020 - remove UUU stuff after Q4 2019 invoicing is done
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
                    self.addDisposable( ko.computed( self.checkICDPlausibilities, self ) );

                    self.diagnosisTypeChangeHandler( self );

                    // TODO: KBV Q1 2020 - remove UUU stuff after Q4 2019 invoicing is done
                    /**
                     * Replacement code UUU is replaced with ICD code 'Z01.7' since Q1 2020.
                     * This code must have diagnosisCert set to 'CONFIRMED' ('G' in KBV terms).
                     */
                    self.addDisposable( ko.computed( function() {
                        var
                            isEditable = ['CREATED', 'VALID'].indexOf( self.status() ) !== -1,
                            code = self.code(),
                            diagnosisCert = self.diagnosisCert();

                        if( ko.computedContext.isInitial() ) {
                            return;
                        }

                        if( self.isBeforeQ12020() ) {
                            return;
                        }

                        if( isEditable && officialCaseFolder && code === 'Z01.7' && diagnosisCert !== 'CONFIRM' ) {
                            self.diagnosisCert( 'CONFIRM' );
                        }
                    } ) );

                    // TODO: KBV Q1 2020 - remove UUU stuff after Q4 2019 invoicing is done
                    /**
                     * Replacement code UUU is not valid starting Q1 2020.
                     */
                    self.addDisposable( ko.computed( function() {
                        var
                            code = self.code();

                        if( self.isBeforeQ12020() ) {
                            return;
                        }

                        if( officialCaseFolder && code === 'UUU' ) {
                            self.showUUUWarning();
                        }
                    } ) );
                },
                isBeforeQ12020: function() {

                    var self = this,
                        timestamp = self.timestamp(),
                        isBeforeQ12020 = Y.doccirrus.commonutils.isDateBeforeQ12020( timestamp );
                    return isBeforeQ12020;
                },
                showUUUWarning: function() {
                    var message = {
                        messageId: 'UUU-WARNING',
                        content: UUU_USAGE_WARNING,
                        level: 'WARNING'
                    };

                    Y.doccirrus.DCSystemMessages.addMessage( message );
                },
                /**
                 * Returns a ko computed, that checks if the specified u_extraKey is enabled.
                 * @param u_extraKey
                 * @returns {*}
                 */
                hasUExtra: function DiagnosisEditorModel_hasUExtra( u_extraKey ) {
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
                inRange: function DiagnosisEditorModel_inRange( value, from, to ) {
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
                buildTextDuration: function DiagnosisEditorModel_buildTextDuration( minV, minU, maxV, maxU, isZ ) {
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
                 * [MOJ-1440] Testing of ICD-plausibility
                 */
                checkICDPlausibilities: function DiagnosisEditorModel_checkICDPlausibilities() { // Prüfung von ICD-Plausibilitäten
                    var
                        self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) ),
                        currentPatient = peek( self.get( 'currentPatient' ) ),
                        getObject = Y.doccirrus.utils.getObject,
                        genderPatient,
                        agePatient,
                        u_extra,
                        diagnosisDerogation,
                        diagnosisCert,
                        diagnosisCertZ, diagnosisCertV, diagnosisCertG, diagnosisCertA,
                        messages = [];

                    genderPatient = currentPatient.gender();
                    agePatient = currentPatient.age();
                    u_extra = currentActivity.u_extra();
                    diagnosisDerogation = currentActivity.diagnosisDerogation();
                    diagnosisCert = currentActivity.diagnosisCert();

                    diagnosisCertZ = ('ASYMPTOMATIC' === diagnosisCert); // Zustand nach
                    diagnosisCertV = ('TENTATIVE' === diagnosisCert); // Verdacht auf
                    diagnosisCertG = ('CONFIRM' === diagnosisCert); // Gesichert
                    diagnosisCertA = ('EXCLUDE' === diagnosisCert); // Ausschluss
                    // P10-440 - nicht abrechenbare Schlüsselnummern
                    if( 'n' === getObject( 'abrechenbar', u_extra ) ) {
                        messages.push( {
                            messageId: 'P10-440-n',
                            content: 'Der angegebene Kode existiert nicht und darf daher nicht zur Abrechnung und/oder Bedruckung der AU verwendet werden.',
                            level: 'WARNING'
                        } );
                    }
                    // P10-450 - Schlüsselnummern ohne Inhalt
                    if( 'n' === getObject( 'schlüsselnummer_mit_inhalt_belegt', u_extra ) ) {
                        messages.push( {
                            messageId: 'P10-450-n',
                            content: 'Der angegebene Kode darf nicht zur Abrechnung und/oder Bedruckung der AU verwendet werden.',
                            level: 'WARNING'
                        } );
                    }
                    // P10-460 - Sekundäre Schlüsselnummern
                    if( '*' === getObject( 'notationskennzeichen', u_extra ) || '!' === getObject( 'notationskennzeichen', u_extra ) ) {
                        messages.push( {
                            messageId: 'P10-460',
                            content: 'Der angegebene Kode ist für Abrechnung und Bedruckung einer AU nicht zulässig und darf nur zusätzlich zu einer primären Schlüsselnummer verwendet werden.',
                            level: 'WARNING'
                        } );
                    }
                    // P10-470 - Geschlechtsbezug von ICD-10-GM-Kodes (Echtzeitprüfung)
                    // gb = geschlechtsbezug; gbfa = geschlechtsbezug_fehlerart
                    switch( genderPatient ) {
                        case 'FEMALE':
                            if( 'm' === getObject( 'gb', u_extra ) && 'k' === getObject( 'gbfa', u_extra ) ) {
                                messages.push( {
                                    messageId: 'P10-470-FEMALE',
                                    content: 'Bitte Kodierung überprüfen: Kode gilt überwiegend nur für männliche Patienten.',
                                    level: 'WARNING'
                                } );
                            }
                            if( 'm' === getObject( 'gb', u_extra ) && 'm' === getObject( 'gbfa', u_extra ) ) {
                                if( diagnosisDerogation ) {
                                    messages.push( {
                                        messageId: 'P10-470-FEMALE-diagnosisDerogation',
                                        content: 'Bitte Kodierung überprüfen: Kode gilt nur für männliche Patienten.',
                                        level: 'WARNING'
                                    } );
                                } else {
                                    messages.push( {
                                        messageId: 'P10-470-FEMALE-diagnosisDerogationNot',
                                        content: 'Bitte Kodierung überprüfen: Kode gilt nur für männliche Patienten.',
                                        level: 'ERROR'
                                    } );
                                }
                            }
                            break;
                        case 'MALE':
                            if( 'w' === getObject( 'gb', u_extra ) && 'k' === getObject( 'gbfa', u_extra ) ) {
                                messages.push( {
                                    messageId: 'P10-470-MALE',
                                    content: 'Bitte Kodierung überprüfen: Kode gilt überwiegend nur für weibliche Patienten.',
                                    level: 'WARNING'
                                } );
                            }
                            if( 'w' === getObject( 'gb', u_extra ) && 'm' === getObject( 'gbfa', u_extra ) ) {
                                if( diagnosisDerogation ) {
                                    messages.push( {
                                        messageId: 'P10-470-MALE-diagnosisDerogation',
                                        content: 'Bitte Kodierung überprüfen: Kode gilt nur für weibliche Patienten.',
                                        level: 'WARNING'
                                    } );
                                } else {
                                    messages.push( {
                                        messageId: 'P10-470-MALE-diagnosisDerogationNot',
                                        content: 'Bitte Kodierung überprüfen: Kode gilt nur für weibliche Patienten.',
                                        level: 'ERROR'
                                    } );
                                }
                            }
                            break;
                    }
                    // P10-480 - Altersgruppenbezug von ICD-10-GM-Kodes (Echtzeitprüfung)
                    // uagv = untere_altersgrenze; oagv = obere_altersgrenze; abfa = altersbezug_fehlerart; uagu, oagu = @U
                    if( !self.inRange( agePatient, getObject( 'uagv', u_extra ), getObject( 'oagv', u_extra ) ) ) {
                        switch( getObject( 'abfa', u_extra ) ) {
                            case 'k':
                                messages.push( {
                                    messageId: 'P10-480-k',
                                    content: 'Bitte Kodierung überprüfen: Kode gilt überwiegend nur für Patienten ' +
                                             self.buildTextDuration( getObject( 'uagv', u_extra ), getObject( 'uagu', u_extra ), getObject( 'oagv', u_extra ), getObject( 'oagu', u_extra ), diagnosisCertZ ),
                                    level: 'WARNING'
                                } );
                                break;
                            case 'm':
                                messages.push( {
                                    messageId: 'P10-480-m',
                                    content: 'Bitte Kodierung überprüfen: Kode gilt nur für Patienten ' +
                                             self.buildTextDuration( getObject( 'uagv', u_extra ), getObject( 'uagu', u_extra ), getObject( 'oagv', u_extra ), getObject( 'oagu', u_extra ), diagnosisCertZ ),
                                    level: 'ERROR'
                                } );
                                break;
                        }
                    }
                    // P10-490 - Kennzeichnung "Exotische" Diagnosen (Echtzeitprüfung)
                    if( 'j' === getObject( 'krankheit_in_mitteleuropa_sehr_selten', u_extra ) ) {
                        messages.push( {
                            messageId: 'P10-490-j',
                            content: P10_490_j,
                            level: 'WARNING'
                        } );
                    }
                    // P10-500 - IfSG-Meldung (Echtzeitprüfung)
                    if( 'j' === getObject( 'infektionsschutzgesetz_meldepflicht', u_extra ) ) {
                        if( diagnosisCertV || diagnosisCertG ) {
                            messages.push( {
                                messageId: 'P10-500-j',
                                content: P10_500_j,
                                level: 'INFO'
                            } );
                        }
                    }
                    // P10-510 - IfSG-Abrechnungsbesonderheit (Echtzeitprüfung)
                    if( 'j' === getObject( 'infektionsschutzgesetz_abrechnungsbesonderheit', u_extra ) ) {
                        if( diagnosisCertA || diagnosisCertV || diagnosisCertG ) {
                            messages.push( {
                                messageId: 'P10-510-j',
                                content: P10_510_j,
                                level: 'INFO'
                            } );
                        }
                    }
                    // display messages
                    Y.each( messages, function( message ) {
                        message.messageId = (message.messageId + '-' + (currentActivity._id || currentActivity._cid));
                        Y.doccirrus.DCSystemMessages.addMessage( message );
                    } );
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
                }

            }, {
                NAME: 'DiagnosisEditorModel'
            }
        );

        KoViewModel.registerConstructor( DiagnosisEditorModel );

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
