/**
 * User: sabine.gottfried
 * Date: 22.01.21  16:08
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */
YUI.add( 'QDocuEditorModel', function( Y ) {
        'use strict';
        /**
         * @module QDocuEditorModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            ActivityEditorModel = KoViewModel.getConstructor( 'ActivityEditorModel' ),
            unwrap = ko.unwrap,
            i18n = Y.doccirrus.i18n,

            MODULE_CHANGE_WARNING = i18n( 'InCaseMojit.qDocuEditorModel.text.moduleChangeWarning' );

        function _mapEnumValues( list, currentDate ) {
            return list.map( function( i ) {
                if( i.yearsAvailable && i.yearsAvailable.length ) {
                    if( -1 !== i.yearsAvailable.indexOf( moment( currentDate ).year().toString() ) ) {
                        return i;
                    } else {
                        return null;
                    }
                }

                if( i.yearsNotAvailable && i.yearsNotAvailable.length ) {
                    if( -1 !== i.yearsNotAvailable.indexOf( moment( currentDate ).year().toString() ) ) {
                        return null;
                    } else {
                        return i;
                    }
                }
                if( !i.yearsAvailable && !i.yearsNotAvailable ) {
                    return i;
                }

                return null;
            }).filter( function( i ) {
                return i;
            });
        }
        function _mapEnumValuesForModule( list, currentDate, module ) {
            return list.map( function( i ) {
                if( i.yearAndModule && i.yearAndModule.length ) {
                    if( -1 !== i.yearAndModule.indexOf( module + '-' + moment( currentDate ).year().toString() ) ) {
                        return i;
                    } else {
                        return null;
                    }
                }

                if( i.notYearAndModule && i.notYearAndModule.length ) {
                    if( -1 !== i.notYearAndModule.indexOf( module + '-' + moment( currentDate ).year().toString() ) ) {
                        return null;
                    } else {
                        return i;
                    }
                }
                if( !i.yearAndModule && !i.notYearAndModule ) {
                    return i;
                }

                return null;
            }).filter( function( i ) {
                return i;
            });
        }

        /**
         * @class QDocuEditorModel
         * @constructor
         * @param {Object} config object
         * @extends ActivityEditorModel
         */
        function QDocuEditorModel( config ) {
            QDocuEditorModel.superclass.constructor.call( this, config );
        }

        QDocuEditorModel.ATTRS = {
            whiteList: {
                value: [
                    'module',
                    'programmzk',
                    'kasseiknr',
                    'versichertenstatusgkv',
                    'versichertenidneu',
                    'bsnrambulant',
                    'nbsnrambulant',
                    'lanr',
                    'idnrpat',
                    'gebdatum',
                    'datumunt',
                    // ZKH + ZKP
                    'zytbefundvorunt',
                    'zytbefundvorunt01',
                    'zytbefundvoruntii',
                    'zytbefundvoruntiii',
                    'zytbefundvoruntiiid',
                    'zytbefundvoruntiv',
                    'zytbefundvoruntv',
                    'hpvtvoruntvorhand',
                    'hpvtvorbefund',
                    'hpvvirustypvorbefund',
                    'metaplasievorgaenge',
                    'adenocarcinomainsitu',
                    'invasivplattenepithelkarz',
                    'invasivadenokarz',
                    'sonstmetaplasiebefunde',
                    //ZKH
                    'zervixeinstellbar',
                    'kolposkbefund',
                    'pzgsichtbar',
                    'tztyp',
                    'normalbefund',
                    'gradabnbefunde',
                    'verdachtais',
                    'lokalabnbefunde',
                    'groesselaesion',
                    'verdachtinvasion',
                    'weiterebefunde',
                    'kongenanomalie',
                    'kondylome',
                    'endometriose',
                    'ektoendopolypen',
                    'entzuendung',
                    'stenose',
                    'postopveraend',
                    'sonstweitbefunde',
                    'sonstbefunde',
                    'massnahmen',
                    'anzahlbiopsien',
                    'befundbiopskueret',
                    'histobef',
                    'sonstbef',
                    'sonstbefbiopskueret',
                    'empfohlenemassnahmebiops',
                    'empfohlenekontrabkl',
                    'zeithorizontkontrabkl',
                    'zeithorizont',
                    'therapieempfehlung',
                    'sonstopeingr',
                    'weiteretherapieempf',
                    'opdatum',
                    'artopeingriff',
                    'opeingriff',
                    'op',
                    'methokonisation',
                    'tiefekonus',
                    'methoexzision',
                    'umfangexzision',
                    'sonstopeingr2',
                    'endhistolbefundvorh',
                    'grading',
                    'stagingfigo',
                    'residualstatus',
                    'tnmpt',
                    'tnmpn',
                    'tnmpm',
                    // ZKH + ZKP
                    'untersuchungsnummer',
                    'untersuchung',
                    'hpvtergebnis',
                    'hpvvirustyp',
                    'produkt',
                    // ZKH
                    'pznvorhanden',
                    'pzn',
                    'welchhpvtyp',
                    // ZKP
                    'plz3stellig',
                    'hpvimpfung',
                    'herkunftimpfstatus',
                    'artuanlunt',
                    'befundevoruntvorh',
                    'herkunftergebvoru',
                    'voruntdatum',
                    'zytbefundvoruntvorh',
                    'sonstbefunde',
                    'karzinomtyp',
                    'karzinomtyp2',
                    'anamabweichvorunt',
                    'ausflusspathblutung',
                    'iup',
                    'hormonanwendungen',
                    'gynopradiatio',
                    'graviditaet',
                    'klinischerbefund',
                    'zytbefund',
                    'zytbefund01',
                    'zytbefundii',
                    'zytbefundiii',
                    'zytbefundiiid',
                    'zytbefundiv',
                    'zytbefundv',
                    'histologvorbefundvorunt',
                    'hpvtest',
                    'empfohlenemassnahme',
                    //ZKZ
                    'methoabstrentnahme'
                ],
                lazyAdd: false
            }
        };

        Y.extend( QDocuEditorModel, ActivityEditorModel, {
                initializer: function QDocuEditorModel_initializer() {
                    var
                        self = this;

                    self.initQDocuEditorModel();
                },
                destructor: function QDocuEditorModel_destructor() {
                },
                initQDocuEditorModel: function QDocuEditorModel_initQDocuEditorModel() {
                    var
                        self = this;

                    self.moduleSelect = ko.computed( {
                        read: function() {
                            return self.module();
                        },
                        write: function( value ) {
                            var
                                oldValue = ko.unwrap( self.module );
                            if( !oldValue ) {
                                oldValue = '';
                            }
                            self.module( oldValue );
                            if( value !== oldValue ) {
                                // ask for confirm only if previous value exists
                                if( oldValue ) {
                                    Y.doccirrus.DCWindow.confirm( {
                                        message: MODULE_CHANGE_WARNING,
                                        callback: function( result ) {
                                            if( result.success ) {
                                                self.module( value );

                                            }

                                        self.moduleSelect.notifySubscribers(self.module());
                                        }
                                    } );
                                } else {
                                    self.module( value );
                                }
                            }
                        }
                    });
                    self.initLabels();
                    self.initEnums();
                    self.initDateValidationFields();
                    self.headlineZkhI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.headlineZKH' );
                    self.headlineZkaI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.headlineZKA' );
                    self.headlineZkpI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.headlineZKP' );
                    self.headlineZkzI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.headlineZKZ' );

                },
                initLabels: function QDocuEditorModel_initLabels() {
                    var self = this;
                    self.mixinData = {};
                    self.mixinData.basisI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.basis' );
                    self.basisDocumentationI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.basisDocumentation' );
                    self.moduleI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.module');
                    self.mixinData.headlinemoduleI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.module');
                    // Subheadlings (green background)
                    self.insuranceI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.insurance' );
                    self.mixinData.patientDataI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.patientData' );
                    self.providerDataI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.providerData' );
                    self.patientI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.patient' );
                    // ZKH
                    self.mixinData.hpvtestI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.hpvTest' );
                    // ZKA
                    self.mixinData.abkKoloskI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.abkKolosk' );
                    self.mixinData.vorbefundeI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.vorbefunde' );
                    self.mixinData.kolBefundRioI18n = ko.computed( function() {
                        var
                            year = moment( unwrap( self.datumunt ) ).year();
                        if( -1 !== [2021].indexOf( year ) ) {
                            return i18n( 'InCaseMojit.qDocuEditorModel.label.kolBefundRio2021' );
                        } else {
                            return i18n( 'InCaseMojit.qDocuEditorModel.label.kolBefundRio' );
                        }
                    });
                    self.mixinData.durchgefMassnahmenI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.durchgefMassnahmen' );
                    self.mixinData.ergebnisBiopsieI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.ergebnisBiopsie' );
                    self.mixinData.empfohlMassnahmeI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.empfohlMassnahme' );
                    self.mixinData.opI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.op' );
                    // ZKP
                    self.mixinData.primarScreeningI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.primarScreening' );
                    self.mixinData.hpvImpfStatusI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.hpvImpfStatus' );
                    self.mixinData.untersuchungI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.untersuchung' );
                    self.mixinData.vorangeUntersuchungI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.vorangeUntersuchung' );
                    self.mixinData.anamAngabenI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.anamAngaben' );
                    self.mixinData.ergebnisZytUntersuchungI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.ergebnisZytUntersuchung' );
                    self.mixinData.ergebnisHpvTestI18n = i18n( 'InCaseMojit.qDocuEditorModel.label.ergebnisHpvTest' );
                    self.mixinData.zytTestI18n = ko.computed( function() {
                        var
                            year = moment( unwrap( self.datumunt ) ).year();
                        if( -1 !== [2021].indexOf( year ) ) {
                            return i18n( 'InCaseMojit.qDocuEditorModel.label.zytTest2021' );
                        } else {
                            return i18n( 'InCaseMojit.qDocuEditorModel.label.zytTest' );
                        }
                    });
                    // Shared Fields
                    self.programmzkI18n = i18n( 'activity-schema.QDocu_T.programmzk.i18n' );
                    self.kasseiknrI18n = i18n( 'activity-schema.QDocu_T.kasseiknr.i18n' );
                    self.versichertenstatusgkvI18n = i18n( 'activity-schema.QDocu_T.versichertenstatusgkv.i18n' );
                    self.versichertenidneuI18n = i18n( 'activity-schema.QDocu_T.versichertenidneu.i18n' );
                    self.bsnrambulantI18n = i18n( 'activity-schema.QDocu_T.bsnrambulant.i18n' );
                    self.nbsnrambulantI18n = i18n( 'activity-schema.QDocu_T.nbsnrambulant.i18n' );
                    self.lanrI18n = i18n( 'activity-schema.QDocu_T.lanr.i18n' );
                    self.idnrpatI18n = i18n( 'activity-schema.QDocu_T.idnrpat.i18n' );
                    self.gebdatumI18n = i18n( 'activity-schema.QDocu_T.gebdatum.i18n' );
                    self.datumuntI18n = i18n( 'activity-schema.QDocu_T.datumunt.i18n' );
                    // ZKA fields
                    self.zytbefundvoruntI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.zytbefundvorunt.i18n' );
                    self.zytbefundvorunt01I18n = i18n( 'activity-schema.QDocu_T.ZKA_T.zytbefundvorunt01.i18n' );
                    self.zytbefundvoruntiiI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.zytbefundvoruntii.i18n' );
                    self.zytbefundvoruntiiiI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.zytbefundvoruntiii.i18n' );
                    self.zytbefundvoruntiiidI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.zytbefundvoruntiiid.i18n' );
                    self.zytbefundvoruntivI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.zytbefundvoruntiv.i18n' );
                    self.zytbefundvoruntvI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.zytbefundvoruntv.i18n' );
                    self.hpvtvoruntvorhandI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.hpvtvoruntvorhand.i18n' );
                    self.hpvtvorbefundI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.hpvtvorbefund.i18n' );
                    self.hpvtvorbefundZKPI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.hpvtvorbefund.i18n' );
                    self.hpvvirustypvorbefundI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.hpvvirustypvorbefund.i18n' );
                    self.zervixeinstellbarI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.zervixeinstellbar.i18n' );
                    self.kolposkbefundI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.kolposkbefund.i18n' );
                    self.pzgsichtbarI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.pzgsichtbar.i18n' );
                    self.tztypI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.tztyp.i18n' );
                    self.normalbefundI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.normalbefund.i18n' );
                    self.gradabnbefundeI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.gradabnbefunde.i18n' );
                    self.verdachtaisI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.verdachtais.i18n' );
                    self.lokalabnbefundeI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.lokalabnbefunde.i18n' );
                    self.groesselaesionI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.groesselaesion.i18n' );
                    self.verdachtinvasionI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.verdachtinvasion.i18n' );
                    self.weiterebefundeI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.weiterebefunde.i18n' );
                    self.kongenanomalieI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.kongenanomalie.i18n' );
                    self.kondylomeI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.kondylome.i18n' );
                    self.endometrioseI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.endometriose.i18n' );
                    self.ektoendopolypenI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.ektoendopolypen.i18n' );
                    self.entzuendungI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.entzuendung.i18n' );
                    self.stenoseI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.stenose.i18n' );
                    self.postopveraendI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.postopveraend.i18n' );
                    self.sonstweitbefundeI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.sonstweitbefunde.i18n' );
                    self.sonstbefundeI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.sonstbefunde.i18n' );
                    self.massnahmenI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.massnahmen.i18n' );
                    self.anzahlbiopsienI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.anzahlbiopsien.i18n' );
                    self.befundbiopskueretI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.befundbiopskueret.i18n' );
                    self.histobefI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.histobef.i18n' );
                    self.metaplasievorgaengeI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.metaplasievorgaenge.i18n' );
                    self.adenocarcinomainsituI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.adenocarcinomainsitu.i18n' );
                    self.invasivplattenepithelkarzI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.invasivplattenepithelkarz.i18n' );
                    self.invasivadenokarzI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.invasivadenokarz.i18n' );
                    self.sonstmetaplasiebefundeI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.sonstmetaplasiebefunde.i18n' );
                    self.sonstbefbiopskueretI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.sonstbefbiopskueret.i18n' );
                    self.empfohlenemassnahmebiopsI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.empfohlenemassnahmebiops.i18n' );
                    self.empfohlenekontrabklI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.empfohlenekontrabkl.i18n' );
                    self.zeithorizontkontrabklI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.zeithorizontkontrabkl.i18n' );
                    self.zeithorizontI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.zeithorizont.i18n' );
                    self.therapieempfehlungI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.therapieempfehlung.i18n' );
                    self.sonstopeingrI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.sonstopeingr.i18n' );
                    self.opeingriffI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.opeingriff.i18n' );
                    self.opI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.op.i18n' );
                    self.weiteretherapieempfI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.weiteretherapieempf.i18n' );
                    self.opdatumI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.opdatum.i18n' );
                    self.artopeingriffI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.artopeingriff.i18n' );
                    self.methokonisationI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.methokonisation.i18n' );
                    self.methokonisation2021I18n = i18n( 'activity-schema.QDocu_T.ZKA_T.methokonisation_2021.i18n' );
                    self.tiefekonusI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.tiefekonus.i18n' );
                    self.tiefekonus2021I18n = i18n( 'activity-schema.QDocu_T.ZKA_T.tiefekonus_2021.i18n' );
                    self.methoexzisionI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.methoexzision.i18n' );
                    self.methoexzision2021I18n = i18n( 'activity-schema.QDocu_T.ZKA_T.methoexzision_2021.i18n' );
                    self.umfangexzisionI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.umfangexzision.i18n' );
                    self.umfangexzision2021I18n = i18n( 'activity-schema.QDocu_T.ZKA_T.umfangexzision_2021.i18n' );
                    self.sonstopeingr2I18n = i18n( 'activity-schema.QDocu_T.ZKA_T.sonstopeingr2.i18n' );
                    self.endhistolbefundvorhI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.endhistolbefundvorh.i18n' );
                    self.gradingI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.grading.i18n' );
                    self.stagingfigoI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.stagingfigo.i18n' );
                    self.residualstatusI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.residualstatus.i18n' );
                    self.tnmptI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.tnmpt.i18n' );
                    self.tnmpnI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.tnmpn.i18n' );
                    self.tnmpmI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.tnmpm.i18n' );
                    // ZKH fields
                    self.untersuchungsnummerI18n = i18n( 'activity-schema.QDocu_T.ZKH_T.untersuchungsnummer.i18n' );
                    self.untersuchungI18n = i18n( 'activity-schema.QDocu_T.ZKH_T.untersuchung.i18n' );
                    self.pznvorhandenI18n = i18n( 'activity-schema.QDocu_T.ZKH_T.pznvorhanden.i18n' );
                    self.pznI18n = i18n( 'activity-schema.QDocu_T.ZKH_T.pzn.i18n' );
                    self.produktI18n = i18n( 'activity-schema.QDocu_T.ZKH_T.produkt.i18n' );
                    self.hpvtergebnisI18n = i18n( 'activity-schema.QDocu_T.ZKH_T.hpvtergebnis.i18n' );
                    self.hpvvirustypI18n = i18n( 'activity-schema.QDocu_T.ZKH_T.hpvvirustyp.i18n' );
                    self.hpvvirustyp2021I18n = i18n( 'activity-schema.QDocu_T.ZKH_T.hpvvirustyp2021.i18n' );
                    self.welchhpvtypI18n = i18n( 'activity-schema.QDocu_T.ZKH_T.welchhpvtyp.i18n' );
                    // ZKP fields
                    self.plz3stelligI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.plz3stellig.i18n' );
                    self.hpvimpfungI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.hpvimpfung.i18n' );
                    self.zkpProduktI18n = i18n( 'activity-schema.QDocu_T.ZKA_T.produkt.zkp.i18n' );
                    self.herkunftimpfstatusI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.herkunftimpfstatus.i18n' );
                    self.artuanluntI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.artuanlunt.i18n' );
                    self.befundevoruntvorhI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.befundevoruntvorh.i18n' );
                    self.herkunftergebvoruI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.herkunftergebvoru.i18n' );
                    self.voruntdatumI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.voruntdatum.i18n' );
                    self.zytbefundvoruntvorhI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.zytbefundvoruntvorh.i18n' );
                    self.sonstbefundeI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.sonstbefunde.i18n' );
                    self.karzinomtypI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.karzinomtyp.i18n' );
                    self.anamabweichvoruntI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.anamabweichvorunt.i18n' );
                    self.ausflusspathblutungI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.ausflusspathblutung.i18n' );
                    self.iupI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.iup.i18n' );
                    self.hormonanwendungenI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.hormonanwendungen.i18n' );
                    self.gynopradiatioI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.gynopradiatio.i18n' );
                    self.graviditaetI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.graviditaet.i18n' );
                    self.klinischerbefundI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.klinischerbefund.i18n' );
                    self.zytbefundI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.zytbefund.i18n' );
                    self.zytbefund01I18n = i18n( 'activity-schema.QDocu_T.ZKP_T.zytbefund01.i18n' );
                    self.zytbefundiiI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.zytbefundii.i18n' );
                    self.zytbefundiiiI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.zytbefundiii.i18n' );
                    self.zytbefundiiidI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.zytbefundiiid.i18n' );
                    self.zytbefundivI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.zytbefundiv.i18n' );
                    self.zytbefundvI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.zytbefundv.i18n' );
                    self.hpvtestI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.hpvtest.i18n' );
                    self.empfohlenemassnahmeI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.empfohlenemassnahme.i18n' );
                    self.histologvorbefundvoruntI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.histologvorbefundvorunt.i18n' );
                    // fields with differing translation
                    self.produktZKPI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.produkt.i18n' );
                    self.hpvtvoruntvorhandZKPI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.hpvtvoruntvorhand.i18n' );
                    self.metaplasievorgaengeZKPI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.metaplasievorgaenge.i18n' );
                    self.zeithorizontkontrabklZKPI18n = i18n( 'activity-schema.QDocu_T.ZKP_T.zeithorizontkontrabkl.i18n' );
                    // ZKZ fields
                    self.methoabstrentnahmeI18n = i18n( 'activity-schema.QDocu_T.ZKZ_T.methoabstrentnahme.i18n' );
                    self.produktZKZI18n = i18n( 'activity-schema.QDocu_T.ZKZ_T.produkt.i18n' );
                    self.produkt2021ZKZI18n = i18n( 'activity-schema.QDocu_T.ZKZ_T.produkt2021.i18n' );
                },
                initEnums: function QDocuEditorModel_initEnums() {
                    var self = this;
                    // ENUMS
                    self.moduleList = Y.doccirrus.schemas.activity.types.QDocuModule_E.list;
                    self.janeinList = Y.doccirrus.schemas.activity.types.QDocuJanein_E.list;
                    self.jaList = Y.doccirrus.schemas.activity.types.QDocuJa_E.list;
                    self.hpvtvorbefundList = ko.observableArray( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuHpvtvorbefund_E.list, unwrap( self.datumunt ) ));
                    self.hpvtergebnisList = Y.doccirrus.schemas.activity.types.QDocuHpvtergebnis_E.list;
                    self.hpvvirustypList = ko.observableArray( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuHpvvirustyp_E.list, unwrap( self.datumunt ) ));
                    self.welchhpvtypList = Y.doccirrus.schemas.activity.types.QDocuWelchhpvtyp_E.list;
                    self.zytbefundvoruntList = ko.observableArray( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuZytbefundvorunt_E.list, unwrap( self.datumunt ) ));
                    self.zytbefundvorunt01List = Y.doccirrus.schemas.activity.types.QDocuZytbefundvorunt01_E.list;
                    self.zytbefundvoruntiiList = Y.doccirrus.schemas.activity.types.QDocuZytbefundvoruntii_E.list;
                    self.zytbefundvoruntiiiList = Y.doccirrus.schemas.activity.types.QDocuZytbefundvoruntiii_E.list;
                    self.zytbefundvoruntiiidList = Y.doccirrus.schemas.activity.types.QDocuZytbefundvoruntiiid_E.list;
                    self.zytbefundvoruntivList = Y.doccirrus.schemas.activity.types.QDocuZytbefundvoruntiv_E.list;
                    self.zytbefundvoruntvList = Y.doccirrus.schemas.activity.types.QDocuZytbefundvoruntv_E.list;
                    self.hpvvirustypvorbefundList = Y.doccirrus.schemas.activity.types.QDocuHpvvirustypvorbefund_E.list;
                    self.kolposkbefundList = Y.doccirrus.schemas.activity.types.QDocuKolposkbefund_E.list;
                    self.pzgsichtbarList = Y.doccirrus.schemas.activity.types.QDocuPzgsichtbar_E.list;
                    self.tztypList = Y.doccirrus.schemas.activity.types.QDocuTztyp_E.list;
                    self.lokalabnbefundeList = Y.doccirrus.schemas.activity.types.QDocuLokalabnbefunde_E.list;
                    self.groesselaesionList = Y.doccirrus.schemas.activity.types.QDocuGroesselaesion_E.list;
                    self.massnahmenList = ko.observableArray( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuMassnahmen_E.list, unwrap( self.datumunt ) ));
                    self.befundbiopskueretList = ko.observableArray( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuBefundbiopskueret_E.list, unwrap( self.datumunt ) ));
                    self.metaplasievorgaengeList = Y.doccirrus.schemas.activity.types.QDocuMetaplasievorgaenge_E.list;
                    self.empfohlenemassnahmebiopsList = Y.doccirrus.schemas.activity.types.QDocuEmpfohlenemassnahmebiops_E.list;
                    self.empfohlenemassnahmeList = Y.doccirrus.schemas.activity.types.QDocuEmpfohlenemassnahme_E.list;
                    self.empfohlenekontrabklList = Y.doccirrus.schemas.activity.types.QDocuEmpfohlenekontrabkl_E.list;
                    self.zeithorizontkontrabklList = ko.observableArray( _mapEnumValuesForModule( Y.doccirrus.schemas.activity.types.QDocuZeithorizontkontrabkl_E.list, unwrap( self.datumunt ), unwrap( self.module ) ));
                    self.therapieempfehlungList = ko.observableArray( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuTherapieempfehlung_E.list, unwrap( self.datumunt ) ));
                    self.artopeingriffList = Y.doccirrus.schemas.activity.types.QDocuArtopeingriff_E.list;
                    self.methokonisationList = ko.observableArray( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuMethokonisation_E.list, unwrap( self.datumunt ) ));
                    self.methoexzisionList = ko.observableArray( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuMethoexzision_E.list, unwrap( self.datumunt ) ));
                    self.gradingList = ko.observableArray( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuGrading_E.list,  unwrap( self.datumunt ) ));
                    self.residualstatusList = Y.doccirrus.schemas.activity.types.QDocuResidualstatus_E.list;
                    self.stagingfigoList = ko.observableArray( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuStagingfigo_E.list,  unwrap( self.datumunt ) ));
                    self.tnmptList = ko.observableArray( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuTnmpt_E.list, unwrap( self.datumunt ) ));
                    self.tnmpnList = ko.observableArray( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuTnmpn_E.list, unwrap( self.datumunt ) ));
                    self.tnmpmList = ko.observableArray( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuTnmpm_E.list, unwrap( self.datumunt ) ));
                    self.gradabnbefundeList = Y.doccirrus.schemas.activity.types.QDocuGradabnbefunde_E.list;
                    self.hpvimpfungList = Y.doccirrus.schemas.activity.types.QDocuHpvimpfung_E.list;
                    self.herkunftimpfstatusList = Y.doccirrus.schemas.activity.types.QDocuHerkunftimpfstatus_E.list;
                    self.artuanluntList = Y.doccirrus.schemas.activity.types.QDocuArtuanlunt_E.list;
                    self.herkunftergebvoruList = Y.doccirrus.schemas.activity.types.QDocuHerkunftergebvoru_E.list;
                    self.anamabweichvoruntList = Y.doccirrus.schemas.activity.types.QDocuAnamabweichvorunt_E.list;
                    self.klinischerbefundList = Y.doccirrus.schemas.activity.types.QDocuKlinischerbefund_E.list;
                    self.histologvorbefundvoruntList = ko.observableArray( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuHistologvorbefundvorunt_E.list, unwrap( self.datumunt ) ));
                    self.methoabstrentnahmeList = Y.doccirrus.schemas.activity.types.QDocuMethoabstrentnahme_E.list;


                    self.datumunt.subscribe( function() {
                        self.zytbefundvoruntList( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuZytbefundvorunt_E.list, unwrap( self.datumunt ) ));
                        self.hpvtvorbefundList( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuHpvtvorbefund_E.list, unwrap( self.datumunt ) ));
                        self.hpvvirustypList( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuHpvvirustyp_E.list, unwrap( self.datumunt ) ));
                        self.massnahmenList( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuMassnahmen_E.list, unwrap( self.datumunt ) ));
                        self.befundbiopskueretList( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuBefundbiopskueret_E.list, unwrap( self.datumunt ) ));
                        self.zeithorizontkontrabklList( _mapEnumValuesForModule( Y.doccirrus.schemas.activity.types.QDocuZeithorizontkontrabkl_E.list, unwrap( self.datumunt ), unwrap( self.module ) ));
                        self.therapieempfehlungList( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuTherapieempfehlung_E.list, unwrap( self.datumunt ) ));
                        self.methokonisationList( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuMethokonisation_E.list, unwrap( self.datumunt ) ));
                        self.methoexzisionList( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuMethoexzision_E.list, unwrap( self.datumunt ) ));
                        self.gradingList( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuGrading_E.list,  unwrap( self.datumunt ) ));
                        self.stagingfigoList( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuStagingfigo_E.list,  unwrap( self.datumunt ) ));
                        self.tnmptList( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuTnmpt_E.list, unwrap( self.datumunt ) ));
                        self.tnmpnList( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuTnmpn_E.list, unwrap( self.datumunt ) ));
                        self.tnmpmList( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuTnmpm_E.list, unwrap( self.datumunt ) ));
                        self.histologvorbefundvoruntList( _mapEnumValues( Y.doccirrus.schemas.activity.types.QDocuHistologvorbefundvorunt_E.list, unwrap( self.datumunt ) ));
                    });

                    self.module.subscribe( function() {
                        self.zeithorizontkontrabklList( _mapEnumValuesForModule( Y.doccirrus.schemas.activity.types.QDocuZeithorizontkontrabkl_E.list, unwrap( self.datumunt ), unwrap( self.module ) ));
                    });
                },
                initDateValidationFields: function QDocuEditorModel_initDateValidationFields() {
                    var
                        self = this;
                    self.currentYear = ko.computed( function() {
                        return moment( unwrap( self.datumunt ) ).year();
                    });

                    self.showGeneral = ko.computed( function() {
                        return -1 === ['2021'].indexOf( moment( unwrap( self.datumunt ) ).year().toString() );
                    });
                }
            }, {
                NAME: 'QDocuEditorModel'
            }
        );

        KoViewModel.registerConstructor( QDocuEditorModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'ActivityEditorModel',
            'activity-schema'
        ]
    }
);
