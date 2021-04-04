/**
 * User: do
 * Date: 12/12/16  13:50
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */

'use strict';

YUI.add( 'KBVUtilityEditorModel', function( Y, NAME ) {
        /**
         * @module KBVUtilityEditorModel
         */

        var
            getObject = Y.doccirrus.utils.getObject,
            i18n = Y.doccirrus.i18n,
            MEDICAL_JUSTIFICATION_NOT_SET = i18n( 'InCaseMojit.KBVUtilityEditorModelJS.MEDICAL_JUSTIFICATION_NOT_SET' ),
            TREATMENT_FREE_INTERVAL_MSG = i18n( 'InCaseMojit.KBVUtilityEditorModelJS.TREATMENT_FREE_INTERVAL_MSG' ),
            P3_12_1_MSG = i18n( 'InCaseMojit.KBVUtilityEditorModelJS.P3_12_1_MSG' ),
            P3_12_2_MSG = i18n( 'InCaseMojit.KBVUtilityEditorModelJS.P3_12_2_MSG' ),
            KoViewModel = Y.doccirrus.KoViewModel,
            peek = ko.utils.peekObservable,
            unwrap = ko.unwrap,
            SimpleActivityEditorModel = KoViewModel.getConstructor( 'SimpleActivityEditorModel' ),
            setCatalogData = Y.doccirrus.kbvutilitycatalogutils.setCatalogData,
            P3_12_1_Exceptions = ['WS1', 'WS2f', 'EX1', 'EX2c', 'EX3c', 'CSb', 'AT1', 'AT2c', 'DF', 'ST3', 'WS2g', 'EX2d', 'EX3d', 'SAS', 'CF'],
            P3_12_2_Allowance = ['WS2f','EX2c','EX3c','CSb','AT2c','WS2g','EX2d','EX3d'];

        // i18n = Y.doccirrus.i18n;

        /**
         * @class KBVUtilityEditorModel
         * @constructor
         * @extends SimpleActivityEditorModel
         */
        function KBVUtilityEditorModel( config ) {
            KBVUtilityEditorModel.superclass.constructor.call( this, config );
        }

        function mapUtilityList( list ) {
            return list.map( function( viewModel ) {
                return peek( viewModel.name );
            } ).join( ', ' );
        }

        function showP3_12_1() {
            var messageId = 'kbvutility_p3_12_1';
            Y.doccirrus.DCSystemMessages.removeMessage( messageId );
            Y.doccirrus.DCSystemMessages.addMessage( {
                messageId: messageId,
                content: P3_12_1_MSG,
                level: 'INFO'
            } );
        }

        function checkIfP3_12_1_ExceptionApplies( indicationCode ) {
            var diagnosisGroup = indicationCode.replace( /[a-z]/, '' );

            return [indicationCode, diagnosisGroup].some( function( code ) {
                return -1 !== P3_12_1_Exceptions.indexOf( code );
            } );
        }

        function showP3_12_2() {
            var messageId = 'kbvutility_p3_12_2';
            Y.doccirrus.DCSystemMessages.removeMessage( messageId );
            Y.doccirrus.DCSystemMessages.addMessage( {
                messageId: messageId,
                content: P3_12_2_MSG,
                level: 'INFO'
            } );
        }

        function checkIfP3_12_2_Applies( indicationCode ) {
            return -1 !== P3_12_2_Allowance.indexOf( indicationCode );
        }

        function showP3_18( hm ) {
            var messageId = 'kbvutility_p3_18';
            Y.doccirrus.DCSystemMessages.removeMessage( messageId );
            Y.doccirrus.DCSystemMessages.addMessage( {
                messageId: messageId,
                content: 'Hinweis für ' + hm.anlage_heilmittelvereinbarung_name + ': \n' + hm.hinweistext,
                level: 'INFO'
            } );
        }

        KBVUtilityEditorModel.ATTRS = {
            whiteList: {
                value: SimpleActivityEditorModel.ATTRS.whiteList.value.concat( [
                    '_id',
                    'status',
                    'utIndicationCode',
                    'utIcdCode',
                    'utIcdText',
                    'utIcdRef',
                    'utSecondIcdCode',
                    'utSecondIcdText',
                    'utSecondIcdRef',
                    'utAgreement',
                    'userContent',
                    'catalogShort',
                    'catalog',
                    'catalogRef',
                    'subType',
                    'comment',
                    'locationId',
                    'patientId',
                    'timestamp',
                    'u_extra',
                    'utRemedy1List',
                    'utRemedy1Name',
                    // 'utRemedy1Item',
                    // 'utRemedy1ItemPrice',
                    'utRemedy1Explanation',
                    'utRemedy1Seasons',
                    'utRemedy1ParentsSeasons',
                    'utRemedy1PerWeek',
                    'utRemedy1PerWeekMax',
                    'utRemedy2List',
                    'utRemedy2Name',
                    // 'utRemedy2Item',
                    // 'utRemedy2ItemPrice',
                    'utRemedy2Explanation',
                    'utRemedy2Seasons',
                    'utRemedy2ParentsSeasons',
                    'utRemedy2PerWeek',
                    'utRemedy2PerWeekMax',
                    'utPrescriptionType',
                    'utHomeVisit',
                    'utGroupTherapy',
                    'utTherapyReport',
                    'utUnfall',
                    'utBvg',
                    'utLatestStartOfTreatment',
                    'utMedicalJustification',
                    'utTherapyGoalsList',
                    'utDiagnosisName',
                    'utVocalTherapy',
                    'utSpeakTherapy',
                    'utSpeechTherapy',
                    'utDurationOfSeason',
                    'utNeuroFinding',
                    'utAudioDiagDate',
                    'utAudioDiagReact',
                    'utAudioDiagCond',
                    'utAudioDiagOwn',
                    'utLupenlaryngoskopie',
                    'utLupenstroboskopieRight',
                    'utLupenstroboskopieLeft',
                    'utAmplitudeRight',
                    'utAmplitudeLeft',
                    'utRandkantenverschiebungRight',
                    'utRandkantenverschiebungLeft',
                    'utRegular',
                    'utGlottisschluss',
                    'utEarDrumFindingRight',
                    'utEarDrumFindingLeft',
                    'utAcuteEvent',
                    'utAgreementApprovedTill',
                    'utAgreementApprovedForInsurance',
                    'utAgreementApprovedText',
                    'utAgreementApprovedCode',
                    'utAgreementApprovedCodeUseDiagnosisGroup',
                    'paidFreeStatus'
                ] ),
                lazyAdd: false
            }
        };

        Y.extend( KBVUtilityEditorModel, SimpleActivityEditorModel, {
                initializer: function KBVUtilityEditorModel_initializer() {
                    var
                        self = this;
                    self.initKBVUtilityEditorModel();
                },
                destructor: function KBVUtilityEditorModel_destructor() {
                },
                initKBVUtilityEditorModel: function KBVUtilityEditorModel_initKBVUtilityEditorModel() {

                    var self = this,
                        currentActivity = peek( self.get( 'currentActivity' ) ),
                        initialSearchDialogOpened = currentActivity.get( 'initialSearchDialogOpened' );

                    self.paidFreeStatusI18n = i18n( 'activity-schema.PaidFreeStatus_E.i18n' );
                    self.utMaxSeasonsStatsI18n = i18n( 'InCaseMojit.KBVUtilityEditorModelJS.MAX_SEASONS_STATS' );

                    self.utRegularYes = ko.computed( {
                        read: function() {
                            return self.utRegular();
                        },
                        write: function( val ) {
                            self.utRegular( !val && self.utRegular.peek() ? null : val );
                        }
                    } );
                    self.utRegularNo = ko.computed( {
                        read: function() {
                            var utRegular = self.utRegular();
                            return typeof utRegular === 'boolean' ? !utRegular : false;
                        },
                        write: function( val ) {
                            self.utRegular( !val && !self.utRegular.peek() ? null : !val );
                        }
                    } );

                    self.utGlottisschlussYes = ko.computed( {
                        read: function() {
                            return self.utGlottisschluss();
                        },
                        write: function( val ) {
                            self.utGlottisschluss( !val && self.utGlottisschluss.peek() ? null : val );

                        }
                    } );
                    self.utGlottisschlussNo = ko.computed( {
                        read: function() {
                            var utGlottisschluss = self.utGlottisschluss();
                            return typeof utGlottisschluss === 'boolean' ? !utGlottisschluss : false;
                        },
                        write: function( val ) {
                            self.utGlottisschluss( !val && !self.utGlottisschluss.peek() ? null : !val );
                        }
                    } );

                    self.displayPriceManagementAnchor = '<a href="/admin/incase#/catalogs">Preisverwaltung</a>';

                    self.isSubTypeVisible = function( subTypeName ) {
                        return self.addDisposable( ko.computed( function() {
                            var subType = unwrap( self.subType );
                            if( Array.isArray( subTypeName ) ) {
                                return -1 !== subTypeName.indexOf( subType );
                            }
                            return subType === subTypeName;
                        } ) );
                    };

                    self.utDurationOfSeasonList = ko.computed( function() {
                        var u_extra = self.u_extra(),
                            list = u_extra && u_extra.entry && u_extra.entry.heilmittelverordnung && u_extra.entry.heilmittelverordnung.therapiedauer_liste;
                        return (list || []).map( function( entry ) {
                            var value = ('object' === typeof entry) ? entry.duration : entry;
                            return {
                                value: value,
                                text: value + ' Minuten'
                            };
                        } );
                    } );

                    // only used for ST3
                    self.utLogoRemedyPerWeekList = ko.computed( function() {
                        var u_extra = self.u_extra(),
                            list = u_extra && u_extra.entry && u_extra.entry.heilmittelverordnung && u_extra.entry.heilmittelverordnung.frequenzempfehlung_liste;
                        return list || [];
                    } );

                    self.select2UtTherapyGoals = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var utTherapyGoalsList = self.utTherapyGoalsList();
                                if( utTherapyGoalsList ) {
                                    return utTherapyGoalsList.map( function( goal ) {
                                        return {id: goal, text: goal};
                                    } );
                                }
                                return null;
                            },
                            write: function( $event ) {
                                if( $event.added && $event.added.text ) {
                                    self.utTherapyGoalsList.push( $event.added.text );
                                }
                                if( $event.removed ) {
                                    self.utTherapyGoalsList.remove( function( data ) {
                                        return data === $event.removed.id;
                                    } );
                                }

                            }
                        } ) ),
                        select2: {
                            placeholder: 'Therapieziele',
                            width: '100%',
                            multiple: true,
                            allowClear: true,
                            data: function() {
                                var u_extra = self.u_extra(),
                                    entry = u_extra && u_extra.entry,
                                    data = {results: []};
                                if( !entry || !entry.therapieziel_liste || !entry.therapieziel_liste.length ) {
                                    return data;
                                }
                                data.results = entry.therapieziel_liste.map( function( entry ) {
                                    return {id: entry, text: entry};
                                } );
                                return data;
                            },
                            createSearchChoice: function( term ) {
                                return {
                                    id: term,
                                    text: term
                                };
                            }
                        }
                    };

                    self.addDisposable( ko.computed( function() {
                        var messageId,
                            isNoNormalCase = !self.isNormalCase(),
                            utMedicalJustification = self.utMedicalJustification();
                        if( true === isNoNormalCase && !utMedicalJustification ) {
                            messageId = 'kbvutility_utNoNormalCase_info-' + self._id() || '';
                            Y.doccirrus.DCSystemMessages.removeMessage( messageId );
                            Y.doccirrus.DCSystemMessages.addMessage( {
                                messageId: messageId,
                                content: MEDICAL_JUSTIFICATION_NOT_SET,
                                level: 'INFO'
                            } );
                        }

                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var
                            timestamp = peek( self.timestamp ),
                            utPrescriptionType = unwrap( self.utPrescriptionType ),
                            indicationCode = unwrap( self.utIndicationCode ),
                            icdCode = unwrap( self.utIcdCode );

                        function renderKbvUtilities( prefix, kbvutilities ) {
                            var result = [prefix];
                            kbvutilities.forEach( function( kbvutility, idx ) {
                                result.push( 'Vorverordnung ' + (idx + 1) + ':' );
                                if( kbvutility.utIndicationCode ) {
                                    result.push( 'Indikation: ' + kbvutility.utIndicationCode );
                                }
                                if( kbvutility.utIcdCode ) {
                                    result.push( 'ICD-10: ' + kbvutility.utIcdCode );
                                }
                                if( kbvutility.utSecondIcdCode ) {
                                    result.push( 'Sekundärer ICD-10: ' + kbvutility.utSecondIcdCode );
                                }
                                if( kbvutility.timestamp ) {
                                    result.push( 'Verordnungsdatum: ' + moment( kbvutility.timestamp ).format( 'DD.MM.YYYY' ) );
                                    result.push( 'Vergangene Wochen: ' + moment().diff( moment( kbvutility.timestamp ), 'weeks' ) );
                                }
                                if( 'LOGO' === kbvutility.actType ) {
                                    result.push( 'Heilmittel: ' + [kbvutility.utVocalTherapy ? 'Stimmtherapie' : null, kbvutility.utSpeechTherapy ? 'Sprachtherapie' : null, kbvutility.utSpeakTherapy ? 'Sprechtherapie' : null].join( ', ' ) );
                                    result.push( 'Verordnungsmenge: ' + (kbvutility.utRemedy1Seasons || '-') );
                                } else {
                                    if( kbvutility.utRemedy1Name ) {
                                        result.push( 'Heilmittel 1: ' + kbvutility.utRemedy1Name );
                                        result.push( 'Verordnungsmenge 1: ' + (kbvutility.utRemedy1Seasons || '-') );
                                        result.push( 'Frequenz 1: ' + (kbvutility.utRemedy1PerWeek || '-') );
                                    }
                                    if( kbvutility.utRemedy2Name ) {
                                        result.push( 'Heilmittel 2: ' + kbvutility.utRemedy2Name );
                                        result.push( 'Verordnungsmenge 2: ' + (kbvutility.utRemedy2Seasons || '-') );
                                        result.push( 'Frequenz 2: ' + (kbvutility.utRemedy2PerWeek || '-') );
                                    }
                                }
                            } );
                            return result.join( '\n' );
                        }

                        if( !ko.computedContext.isInitial() && 'FIRST' === utPrescriptionType && indicationCode && icdCode ) {
                            Y.doccirrus.jsonrpc.api.activity.checkKbvUtilityExistence( {
                                indicationCode: indicationCode.replace( /[a-z]/, '' ),
                                icdCode: icdCode && icdCode.substring( 0, 3 ),
                                patientId: peek( self.patientId ),
                                timestamp: timestamp
                            } ).done( function( response ) {
                                var data = response.data && response.data,
                                    message,
                                    messageId = 'kbvutility_treatment_free-Interval_info-' + self._id() || '';
                                if( data && data.length ) {
                                    message = renderKbvUtilities( TREATMENT_FREE_INTERVAL_MSG, data );
                                    Y.doccirrus.DCSystemMessages.removeMessage( messageId );
                                    Y.doccirrus.DCSystemMessages.addMessage( {
                                        messageId: messageId,
                                        content: message,
                                        level: 'INFO'
                                    } );
                                }
                            } ).fail( function( err ) {
                                Y.log( 'could not check kbv utility existence ' + err, 'error', NAME );
                            } );
                        }

                    } ).extend( {rateLimit: {timeout: 500, method: "notifyWhenChangesStop"}} ) );

                    self.utAgreementNeedsApproval = ko.computed( function() {
                        var
                            utAgreement = unwrap( self.utAgreement ),
                            u_extra = unwrap( self.u_extra ),
                            agreement = u_extra && u_extra.agreement,
                            agreementValue = agreement && agreement.heilmittel_liste && agreement.heilmittel_liste[0] && agreement.heilmittel_liste[0].anlage_heilmittelvereinbarung_value;
                        if( 'NONE' === utAgreement ) {
                            return false;
                        }
                        if( utAgreement !== agreementValue ) {
                            return true;
                        }

                        return false;
                    } );

                    self.addDisposable( ko.computed( function() {
                        var utAgreementNeedsApproval = self.utAgreementNeedsApproval(),
                            insurance;
                        if( ko.computedContext.isInitial() ) {
                            return;
                        }
                        if( false === utAgreementNeedsApproval ) {
                            self.utAgreementApprovedTill( null );
                            self.utAgreementApprovedForInsurance( [] );
                        } else {
                            insurance = self.getInsurance();
                            self.utAgreementApprovedForInsurance( insurance ? [insurance] : [] );
                        }
                    } ) );

                    self.icdWillBeCreated = ko.computed( function() {
                        return self.utIcdCode() && !self.utIcdRef();
                    } );

                    self.icd2WillBeCreated = ko.computed( function() {
                        return self.utSecondIcdCode() && !self.utSecondIcdRef();
                    } );

                    self.addDisposable(ko.computed(function () {
                        var
                            utRemedy1List = unwrap(self.utRemedy1List),
                            utRemedy1Seasons = unwrap(self.utRemedy1Seasons);

                        if (1 === utRemedy1List.length) {
                            utRemedy1List[0].seasons(utRemedy1Seasons);
                        } else {
                            utRemedy1List.forEach(function (entry) {
                                entry.seasons();
                            });
                        }
                        self.utRemedy1List.validate();
                        self.utRemedy1Name( mapUtilityList( utRemedy1List ) );
                    } ) );

                    self.addDisposable(ko.computed(function () {
                        var
                            utRemedy2List = unwrap(self.utRemedy2List),
                            utRemedy2Seasons = unwrap(self.utRemedy2Seasons);

                        if (1 === utRemedy2List.length) {
                            utRemedy2List[0].seasons(utRemedy2Seasons);
                        } else {
                            utRemedy2List.forEach(function (entry) {
                                entry.seasons();
                            });
                        }
                        self.utRemedy2List.validate();
                        self.utRemedy2Name( mapUtilityList( utRemedy2List ) );
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var utRemedy1List = self.utRemedy1List();
                        self.utRemedy2List();
                        self.utRemedy1Seasons();
                        utRemedy1List.forEach( function( entry ) {
                            entry.seasons();
                        } );
                        self.utRemedy2Seasons.validate();
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var utIndicationCode = peek( self.utIndicationCode ),
                            utRemedy1Seasons = self.utRemedy1Seasons(),
                            utRemedy1PerWeek = self.utRemedy1PerWeekMax();
                        if( !self.isNormalCase() && utIndicationCode && !checkIfP3_12_1_ExceptionApplies( utIndicationCode ) && utRemedy1Seasons && utRemedy1PerWeek && (utRemedy1Seasons / utRemedy1PerWeek > 12) ) {
                            showP3_12_1();
                        }
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var utIndicationCode = peek( self.utIndicationCode ),
                            utRemedy2Seasons = self.utRemedy2Seasons(),
                            utRemedy2PerWeek = self.utRemedy2PerWeekMax();
                        if( !self.isNormalCase() && utIndicationCode && !checkIfP3_12_1_ExceptionApplies( utIndicationCode ) && utRemedy2Seasons && utRemedy2PerWeek && (utRemedy2Seasons / utRemedy2PerWeek > 12) ) {
                            showP3_12_1();
                        }
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var utIndicationCode = peek( self.utIndicationCode ),
                            utRemedy1Seasons = self.utRemedy1Seasons();
                        if( !self.isNormalCase() && utIndicationCode && checkIfP3_12_2_Applies( utIndicationCode ) && utRemedy1Seasons && utRemedy1Seasons > 10 ) {
                            showP3_12_2();
                        }
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var utIndicationCode = peek( self.utIndicationCode ),
                            utRemedy2Seasons = self.utRemedy2Seasons();
                        if( !self.isNormalCase() && utIndicationCode && checkIfP3_12_2_Applies( utIndicationCode ) && utRemedy2Seasons && utRemedy2Seasons > 10 ) {
                            showP3_12_2();
                        }
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var u_extra = unwrap( self.u_extra ),
                            hm = u_extra && u_extra.agreement && u_extra.agreement.heilmittel_liste && u_extra.agreement.heilmittel_liste[0],
                            hinweistext = hm && hm.hinweistext;
                        if( ko.computedContext.isInitial() ) {
                            return;
                        }
                        if( hinweistext ) {
                            showP3_18( hm );
                        }
                    } ) );

                    self.showAcuteEvent = ko.computed( function() {
                        var u_extra = unwrap( self.u_extra ),
                            utAgreement = unwrap( self.utAgreement ),
                            hinweistext = u_extra && u_extra.agreement && u_extra.agreement.heilmittel_liste && u_extra.agreement.heilmittel_liste[0] && u_extra.agreement.heilmittel_liste[0].hinweistext;
                        return hinweistext && 'BVB' === utAgreement;
                    } );

                    self.indicationCodeIsAlreadyDiagnosisGroup = ko.computed( function() {
                        var utIndicationCode = self.utIndicationCode(),
                            diagnosisGroup;
                        if( !utIndicationCode ) {
                            return null;
                        }
                        diagnosisGroup = utIndicationCode.replace( /[a-z]/, '' );
                        return utIndicationCode === diagnosisGroup;
                    } );

                    self.addDisposable( ko.computed( function() {
                        var utIndicationCode = self.utIndicationCode(),
                            utAgreementApprovedCodeUseDiagnosisGroup = self.utAgreementApprovedCodeUseDiagnosisGroup(),
                            status = peek( self.status );
                        if( -1 !== ['CREATED', 'VALID'].indexOf( status ) && utIndicationCode ) {
                            self.utAgreementApprovedCode( (true === utAgreementApprovedCodeUseDiagnosisGroup) ? utIndicationCode.replace( /[a-z]/, '' ) : utIndicationCode );
                        }
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var
                            currentPatient = peek( self.get( 'currentPatient' ) ),
                            patientId = peek( currentPatient._id ),
                            utIndicationCode = self.utIndicationCode(),
                            utIcdCode = self.utIcdCode(),
                            timestamp = self.timestamp(),
                            status = peek( self.status );

                        if( -1 === ['CREATED', 'VALID'].indexOf( status ) || !patientId || !utIndicationCode || !utIcdCode || !timestamp ) {
                            return;
                        }

                        Promise.resolve( Y.doccirrus.jsonrpc.api.activity.getKbvUtilityAgreement( {
                            patientId: patientId,
                            utIndicationCode: utIndicationCode,
                            utIcdCode: utIcdCode,
                            timestamp: timestamp
                        } ) ).then( function( response ) {
                            var data = response.data,
                                utAgreement = peek(self.utAgreement),
                                utAgreementApprovedTill = peek(self.utAgreementApprovedTill);

                            if( data.utAgreement && data.utAgreementApprovedTill && data.utAgreementApprovedForInsurance ) {
                                if( utAgreement !== data.utAgreement || (utAgreementApprovedTill && !moment( utAgreementApprovedTill ).isSame( data.utAgreementApprovedTill )) ) {
                                    Y.doccirrus.DCWindow.confirm( {
                                        message: i18n( 'InCaseMojit.KBVUtilityEditorModelJS.CONFIRM_AGREEMENT_OVERRIDE', {
                                            data: {
                                                agreement_type: data.utAgreement,
                                                agreement_till: moment( data.utAgreementApprovedTill ).format( 'DD.MM.YYYY' )
                                            }
                                        } ),
                                        callback: function( result ) {
                                            if( true === result.success ) {
                                                self.setAgreementData( data );
                                            }
                                        }
                                    } );
                                } else {
                                    self.setAgreementData( data );
                                }
                            }
                        } ).catch( function( err ) {
                            Y.log( 'could not get kbv utility agreement data ' + err, 'error', NAME );
                        } );
                    } ) );

                    self.utDurationOfSeasonComputed = ko.computed( {
                        read: function() {
                            return self.utDurationOfSeason();
                        },
                        write: function( val ) {
                            self.utDurationOfSeason( val ? +val : null );
                        }
                    } );

                    self.utMaxSeasons1Stats = ko.computed( function() {
                        var maxSeasonsCatalog = +getObject( 'entry.heilmittelverordnung.verordnungsmenge.gesamtmenge', unwrap( self.u_extra ) ),
                            utRemedy1Seasons = unwrap( self.utRemedy1Seasons ),
                            utRemedy1ParentsSeasons = unwrap( self.utRemedy1ParentsSeasons ),
                            current = +(utRemedy1Seasons || 0) + (utRemedy1ParentsSeasons || 0);

                        return {
                            current: current,
                            max: maxSeasonsCatalog,
                            valid: maxSeasonsCatalog >= current,
                            visible: Boolean( maxSeasonsCatalog )
                        };
                    } );

                    self.utMaxSeasons2Stats = ko.computed( function() {
                        var maxSeasonsCatalog = +getObject( 'entry.heilmittelverordnung.verordnungsmenge.gesamtmenge', unwrap( self.u_extra ) ),
                            utRemedy2Seasons = unwrap( self.utRemedy2Seasons ),
                            utRemedy2ParentsSeasons = unwrap( self.utRemedy2ParentsSeasons ),
                            current = +(utRemedy2Seasons || 0) + (utRemedy2ParentsSeasons || 0);

                        return {
                            current: current,
                            max: maxSeasonsCatalog,
                            valid: maxSeasonsCatalog >= current,
                            visible: Boolean( maxSeasonsCatalog )
                        };

                    } );

                    if( !peek( self._id ) && !initialSearchDialogOpened ) {
                        self.openKbvUtilitySearch();
                        currentActivity.set( 'initialSearchDialogOpened', true );
                    }

                    //  used for inserting text fragments from documentation tree
                    self.utMedicalJustification.caretPosition = { current: ko.observable(), extent: ko.observable( -1 )  };
                    self.utRemedy1Explanation.caretPosition = { current: ko.observable(), extent: ko.observable( -1 )  };
                    self.utRemedy2Explanation.caretPosition = { current: ko.observable(), extent: ko.observable( -1 )  };
                    self.userContent.caretPosition = { current: ko.observable(), extent: ko.observable( -1 )  };

                },
                setAgreementData: function( agreementData ) {
                    var
                        self = this,
                        messageId = 'agreement_found',
                        message = i18n( 'InCaseMojit.KBVUtilityEditorModelJS.AGREEMENT_FOUND', {
                            data: {
                                agreement_type: agreementData.utAgreement,
                                agreement_till: moment( agreementData.utAgreementApprovedTill ).format( 'DD.MM.YYYY' )
                            }
                        } );

                    self.utAgreement( agreementData.utAgreement );
                    self.utAgreementApprovedTill( agreementData.utAgreementApprovedTill );
                    self.utAgreementApprovedCode( agreementData.utAgreementApprovedCode );
                    self.utAgreementApprovedForInsurance( agreementData.utAgreementApprovedForInsurance );
                    self.utAgreementApprovedText( agreementData.utAgreementApprovedText );
                    self.utAgreementApprovedCodeUseDiagnosisGroup( agreementData.utAgreementApprovedCodeUseDiagnosisGroup );

                    Y.doccirrus.DCSystemMessages.removeMessage( messageId );
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: messageId,
                        content: message,
                        level: 'INFO'
                    } );
                },
                openKbvUtilitySearch: function() {
                    var self = this,
                        currentPatient = peek( self.get( 'currentPatient' ) ),
                        locationId = peek( self.locationId ),
                        utIndicationCode = peek( self.utIndicationCode ),
                        utIcdCode = peek( self.utIcdCode ),
                        utIcdText = peek( self.utIcdText ),
                        utSecondIcdCode = peek( self.utSecondIcdCode ),
                        utSecondIcdText = peek( self.utSecondIcdText ),
                        u_extra = peek( self.u_extra ),
                        patientAge = peek( currentPatient.age ),
                        patientId = peek( currentPatient._id ),
                        isNormalCase = self.isNormalCase(),
                        binder = self.get( 'binder' ),
                        locations = binder.getInitialData( 'location' ),
                        kv = null;

                    locations.some( function( location ) {
                        if( locationId === location._id ) {
                            kv = location.kv;
                            return true;
                        }
                    } );

                    Y.doccirrus.modals.kbvutilitySearchModal.showDialog( {
                        locationId: locationId,
                        kv: kv,
                        patientAge: patientAge,
                        patientId: patientId,
                        normalCase: isNormalCase,
                        indicationCode: utIndicationCode || peek( self.comment ),
                        icd: utIcdCode,
                        icd2: utSecondIcdCode,
                        icdText: utIcdText,
                        icd2Text: utSecondIcdText,
                        utilities: u_extra && u_extra.utilities
                    }, function( result ) {
                        self.setCatalogData( result );
                    } );
                },
                setCatalogData: function( data ) {
                    var self = this;
                    setCatalogData( this, data );
                    self.invalidatePrices();
                },
                isNormalCase: function() {
                    var self = this;
                    return 'NO_NORMAL_CASE' !== self.utPrescriptionType();
                },
                getInsurance: function() {
                    var self = this,
                        currentPatient = peek( self.get( 'currentPatient' ) ),
                        caseFolder = peek( self.get( 'caseFolder' ) ),
                        insuranceStatus = peek( currentPatient.insuranceStatus ),
                        result = null;
                    if( caseFolder && insuranceStatus.length ) {
                        insuranceStatus.some( function( insurance ) {
                            if( caseFolder.type === peek( insurance.type ) ) {
                                result = insurance;
                                return true;
                            }
                        } );
                    }
                    return result;
                },
                invalidatePrices: function() {
                    var
                        self = this,
                        locationId = peek( self.locationId ),
                        insurance = self.getInsurance(),
                        utilityNames = peek( self.utRemedy1List ).concat( peek( self.utRemedy2List ) ).map( function( utility ) {
                            return peek( utility.name );
                        } ),
                        vknrSerialNo = null;

                    function find( name, utPrices ) {
                        var result;
                        utPrices.some( function( utPrice ) {
                            if( name === utPrice.utilityName ) {
                                result = utPrice;
                                return true;
                            }
                        } );
                        return result;
                    }

                    if( !insurance ) {
                        Y.log( 'invalidatePrices: could not get prices without insurance matching casefolder', 'debug', NAME );
                        return;
                    }

                    if( !utilityNames.length ) {
                        return;
                    }

                    // MOJ-14319: [OK] [CASEFOLDER]
                    if( Y.doccirrus.schemas.patient.isPublicInsurance( {type: peek( insurance.type )} ) ) {
                        try {
                            vknrSerialNo = Y.doccirrus.kbvcommonutils.getVknrSerialNo( peek( insurance.insuranceGrpId ) );
                        } catch( error ) {
                            Y.log( 'invalidatePrices: could not get vknr serial no. ' + error, 'warn', NAME );
                            return;
                        }
                    }

                    Promise.resolve( Y.doccirrus.jsonrpc.api.kbvutilityprice.getPrices( {
                        insuranceType: unwrap( insurance.type ),
                        utilityNames: utilityNames,
                        locationId: locationId,
                        serialNo: vknrSerialNo
                    } ) ).then( function( response ) {
                        var data = response.data;
                        if( !data || !data.length ) {
                            return;
                        }
                        peek( self.utRemedy1List ).concat( peek( self.utRemedy2List ) ).forEach( function( utility ) {
                            var utPrice = find( peek( utility.name ), data );
                            if( utPrice ) {
                                utility.price( utPrice.price );
                            }
                        } );
                    } ).catch( function( err ) {
                        Y.log( 'could not get kbv utility prices ' + err, 'error', NAME );
                    } );

                },
                displayPrice: function( price ) {
                    if( !price ) {
                        return '';
                    }
                    return Y.doccirrus.comctl.numberToLocalString( price );
                }
            }, {
                NAME: 'KBVUtilityEditorModel'
            }
        );

        KoViewModel.registerConstructor( KBVUtilityEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'dc-comctl',
            'JsonRpcReflection-doccirrus',
            'JsonRpc',
            'inCaseUtils',
            'kbvutility-search-modal',
            'kbvutilitycatalogutils',
            'DCSystemMessages',
            'DCWindow',
            'dckbvutils'
        ]
    }
);
