/**
 * User: sabine.gottfried
 * Date: 22.01.21  16:08
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, moment */

YUI.add( 'QDocuModel', function( Y/*, NAME */ ) {
        /**
         * @module QDocuModel
         */

        'use strict';

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            unwrap = ko.unwrap,

            QDOCU_RELATED_FIELDS = Y.doccirrus.schemas.activity.QDocuFieldsRelated;

        /**
         * @class QDocuModel
         * @constructor
         * @param {Object} config object
         * @extends SimpleActivityModel
         */
        function QDocuModel( config ) {
            QDocuModel.superclass.constructor.call( this, config );
        }

        QDocuModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( QDocuModel, KoViewModel.getConstructor( 'ActivityModel' ), {

                initializer: function QDocuModel_initializer() {
                    var
                        self = this;
                    self.initQDocuModel();
                },
                destructor: function QDocuModel_destructor() {
                },
                initQDocuModel: function QDocuModel_initQDocuModel() {
                    var
                        self = this;
                    self.initData();
                },
                initData: function QDocuEditorModel_initData() {
                    var
                        self = this,
                        publicInsurance,
                        kasseIknr,
                        persGroup,
                        iknrFirst2Digits,
                        activityStatus = unwrap( self.status ),
                        versichertenstatusgkv;

                    if( self.isNew() ) {
                        self.programmzk( 'ZK' );
                        self.datumunt( unwrap( self.timestamp ) );
                    }

                    self.addDisposable( ko.computed( function() {
                        var binder = self.get( 'binder' ),
                            currentPatient = unwrap( binder.currentPatient ),
                            caseFolder = self.get( 'caseFolder' ),
                            employee = self.employee(),
                            year = moment( unwrap( self.datumunt ) ).year(),
                            addresses;


                        // Only fill the patient detail on form when activity is not submitted yet
                        if( activityStatus === "CREATED" || activityStatus === "VALID" ) {
                            if( employee && employee.officialNo ) {
                                self.lanr( employee.officialNo );
                                self.setNotModified();
                            }

                            if( currentPatient ) {
                                if( caseFolder && caseFolder.type ) {
                                    publicInsurance = currentPatient.getPublicInsurance( caseFolder && caseFolder.type );
                                }
                                addresses = unwrap( currentPatient.addresses );

                                if( unwrap( currentPatient.patientNo ) ) {
                                    self.idnrpat( unwrap( currentPatient.patientNo ) );
                                    self.setNotModified();
                                }
                                if( unwrap( currentPatient.dob ) ) {
                                    self.gebdatum( unwrap( currentPatient.dob ) );
                                    self.setNotModified();
                                }

                                // ON ZKP in 2020 patient postcode is mandatory as well
                                if( ( -1 !== [2020].indexOf( year ) && unwrap( self.module ) === "ZKP" ) || -1 === [2020].indexOf( year ) ) {
                                    if( addresses.length ) {
                                        addresses.find( function( address ) {
                                            if( unwrap( address.kind ) === "OFFICIAL" ) {
                                                self.plz3stellig( unwrap( address.zip ) );
                                                self.setNotModified();
                                            }
                                        } );
                                    }
                                }

                                if( publicInsurance && unwrap( publicInsurance.insuranceNo ) ) {
                                    self.versichertenidneu( unwrap( publicInsurance.insuranceNo ) );
                                    self.setNotModified();
                                }

                                if( publicInsurance && unwrap( publicInsurance.insuranceId ) ) {
                                    kasseIknr = unwrap( publicInsurance.insuranceId );
                                    persGroup = unwrap( publicInsurance.persGroup );
                                    iknrFirst2Digits = kasseIknr && kasseIknr.slice( 0, 2 ) || '';
                                    // versichertenstatusgkv equals 1, if iknr starts with '10' and persGroup undefined
                                    versichertenstatusgkv = iknrFirst2Digits === '10' && !persGroup ? '1' : '0';
                                    self.kasseiknr( unwrap( publicInsurance.insuranceId ) );
                                    self.versichertenstatusgkv( versichertenstatusgkv );
                                    self.setNotModified();
                                }
                            }
                        }
                    } ) );

                    self.addDisposable( ko.computed( function() {
                        var
                            result = {},
                            mainLocation,
                            binder = self.get( 'binder' ),
                            locationId = unwrap( self.locationId ),
                            locations = binder.getInitialData( 'location' ),
                            datumunt;

                        if( activityStatus === "CREATED" || activityStatus === "VALID" ) {
                            locations.find( function( location ) {
                                if( location._id === locationId ) {
                                    if( location.isAdditionalLocation ) {
                                        mainLocation = locations.find( function( mainLocation ) {
                                            if( location.mainLocationId === mainLocation._id ) {
                                                return mainLocation;
                                            }
                                        } );
                                        result = {
                                            bsnrambulant: mainLocation.commercialNo,
                                            nbsnrambulant: location.commercialNo
                                        };
                                    } else {
                                        result = {
                                            bsnrambulant: location.commercialNo,
                                            nbsnrambulant: null
                                        };
                                    }
                                    return true;
                                }
                            } );

                            self.nbsnrambulant( result.nbsnrambulant );
                            self.bsnrambulant( result.bsnrambulant );

                            datumunt = moment( unwrap( self.datumunt ));
                            if( datumunt ) {
                                self.dmpQuarter( datumunt.quarter() );
                                self.dmpYear( datumunt.year() );
                            }
                            self.setNotModified();
                        }
                    } ) );

                    self.module.subscribe( function( newVal ) {
                        if( newVal !== self.module.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'module' );
                                self.datumunt( unwrap( self.timestamp ) );
                            }
                        }
                    });

                    self.timestamp.subscribe( function( newVal ) {
                        if( newVal !== self.timestamp.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.datumunt( unwrap( self.timestamp ) );
                            }
                        }
                    });

                    self.zytbefund.subscribe( function( newVal ) {
                        if( newVal !== self.zytbefund.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'zytbefund' );
                            }

                            self.zytbefund01.validate();
                            self.zytbefundii.validate();
                            self.zytbefundiii.validate();
                            self.zytbefundiiid.validate();
                            self.zytbefundiv.validate();
                            self.zytbefundv.validate();
                        }
                    });

                    self.methoabstrentnahme.subscribe( function( newVal ) {
                        if( newVal !== self.methoabstrentnahme.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'methoabstrentnahme' );
                            }

                            self.produkt.validate();
                        }
                    });

                    self.hpvimpfung.subscribe( function( newVal ) {
                        if( newVal !== self.hpvimpfung.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'hpvimpfung' );
                            }

                            self.produkt.validate();
                        }
                    });

                    self.pznvorhanden.subscribe( function( newVal ) {
                        if( newVal !== self.pznvorhanden.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'pznvorhanden' );
                            }

                            self.pzn.validate();
                            self.produkt.validate();
                        }
                    });

                    self.hpvtest.subscribe( function( newVal ) {
                        if( newVal !== self.hpvtest.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'hpvtest' );
                            }

                            self.hpvtergebnis.validate();
                        }
                    });

                    self.hpvtergebnis.subscribe( function( newVal ) {
                        if( newVal !== self.hpvtergebnis.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'hpvtergebnis' );
                            }

                            self.hpvvirustyp.validate();
                        }
                    });

                    self.hpvtvoruntvorhand.subscribe( function( newVal ) {
                        if( newVal !== self.hpvtvoruntvorhand.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'hpvtvoruntvorhand' );
                            }

                            self.hpvtvorbefund.validate();
                        }
                    });

                    self.hpvtvorbefund.subscribe( function( newVal ) {
                        if( newVal !== self.hpvtvorbefund.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'hpvtvorbefund' );
                            }

                            self.hpvvirustypvorbefund.validate();
                        }
                    });

                    self.zytbefundvorunt.subscribe( function( newVal ) {
                        if( newVal !== self.zytbefundvorunt.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'zytbefundvorunt' );
                            }

                            self.zytbefundvorunt01.validate();
                            self.zytbefundvoruntiii.validate();
                            self.zytbefundvoruntiiid.validate();
                            self.zytbefundvoruntii.validate();
                            self.zytbefundvoruntiv.validate();
                            self.zytbefundvoruntv.validate();
                        }
                    });

                    self.kolposkbefund.subscribe( function( newVal ) {
                        if( newVal !== self.kolposkbefund.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'kolposkbefund' );
                            }

                            self.pzgsichtbar.validate();
                            self.tztyp.validate();
                            self.normalbefund.validate();
                        }
                    });

                    self.normalbefund.subscribe( function( newVal ) {
                        if( newVal !== self.normalbefund.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'normalbefund' );
                            }

                            self.gradabnbefunde.validate();
                            self.verdachtais.validate();
                            self.lokalabnbefunde.validate();
                            self.groesselaesion.validate();
                            self.verdachtinvasion.validate();
                            self.weiterebefunde.validate();
                        }
                    });

                    self.weiterebefunde.subscribe( function( newVal ) {
                        if( newVal !== self.weiterebefunde.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'weiterebefunde' );
                            }
                        }
                    });

                    self.massnahmen.subscribe( function( newVal ) {
                        if( newVal !== self.massnahmen.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'massnahmen' );
                            }

                            self.anzahlbiopsien.validate();
                            self.befundbiopskueret.validate();
                        }
                    });

                    self.sonstweitbefunde.subscribe( function( newVal ) {
                        if( newVal !== self.massnahmen.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'sonstweitbefunde' );
                            }

                            self.sonstbefunde.validate();
                        }
                    });

                    self.histologvorbefundvorunt.subscribe( function( newVal ) {
                        if( newVal !== self.histologvorbefundvorunt.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'histologvorbefundvorunt' );
                            }

                            self.metaplasievorgaenge.validate();
                            self.adenocarcinomainsitu.validate();
                            self.invasivplattenepithelkarz.validate();
                            self.invasivadenokarz.validate();
                            self.sonstmetaplasiebefunde.validate();
                            self.sonstbefunde.validate();
                            self.karzinomtyp.validate();
                        }
                    });

                    self.befundbiopskueret.subscribe( function( newVal ) {
                        if( newVal !== self.befundbiopskueret.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'befundbiopskueret' );
                            }

                            self.metaplasievorgaenge.validate();
                            self.adenocarcinomainsitu.validate();
                            self.invasivplattenepithelkarz.validate();
                            self.invasivadenokarz.validate();
                            self.sonstmetaplasiebefunde.validate();
                            self.karzinomtyp.validate();
                            self.sonstbefbiopskueret.validate();
                        }
                    });

                    self.sonstmetaplasiebefunde.subscribe( function( newVal ) {
                        if( newVal !== self.sonstmetaplasiebefunde.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'sonstmetaplasiebefunde' );
                            }

                            self.sonstbefbiopskueret.validate();
                            self.sonstbefunde.validate();
                        }
                    });

                    self.empfohlenemassnahmebiops.subscribe( function( newVal ) {
                        if( newVal !== self.empfohlenemassnahmebiops.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'empfohlenemassnahmebiops' );
                            }

                            self.empfohlenekontrabkl.validate();
                            self.therapieempfehlung.validate();
                        }
                    });

                    self.empfohlenemassnahme.subscribe( function( newVal ) {
                        if( newVal !== self.empfohlenemassnahme.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'empfohlenemassnahmebiops' );
                            }

                            self.empfohlenekontrabkl.validate();
                            self.therapieempfehlung.validate();
                        }
                    });

                    self.empfohlenekontrabkl.subscribe( function( newVal ) {
                        if( newVal !== self.empfohlenekontrabkl.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'empfohlenekontrabkl' );
                            }

                            self.zeithorizontkontrabkl.validate();
                        }
                    });

                    self.zeithorizontkontrabkl.subscribe( function( newVal ) {
                        if( newVal !== self.zeithorizontkontrabkl.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'zeithorizontkontrabkl' );
                            }

                            self.zeithorizont.validate();
                        }
                    });

                    self.therapieempfehlung.subscribe( function( newVal ) {
                        if( newVal !== self.therapieempfehlung.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'therapieempfehlung' );
                            }

                            self.sonstopeingr.validate();
                            self.weiteretherapieempf.validate();
                            self.opdatum.validate();
                            self.artopeingriff.validate();
                            self.endhistolbefundvorh.validate();
                            self.op.validate();
                        }
                    });

                    self.artopeingriff.subscribe( function( newVal ) {
                        if( newVal !== self.artopeingriff.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'artopeingriff' );
                            }

                            self.methokonisation.validate();
                            self.tiefekonus.validate();
                            self.methoexzision.validate();
                            self.umfangexzision.validate();
                            self.sonstopeingr2.validate();
                        }
                    });

                    self.op.subscribe( function( newVal ) {
                        if( newVal !== self.artopeingriff.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'op' );
                            }

                            self.methokonisation.validate();
                            self.tiefekonus.validate();
                            self.methoexzision.validate();
                            self.umfangexzision.validate();
                            self.opdatum.validate();
                            self.histobef.validate();
                            self.opeingriff.validate();
                        }
                    });

                    self.opeingriff.subscribe( function( newVal ) {
                        if( newVal !== self.artopeingriff.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'opeingriff' );
                            }

                            self.histobef.validate();
                        }
                    });

                    self.herkunftimpfstatus.subscribe( function( newVal ) {
                        if( newVal !== self.artopeingriff.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'herkunftimpfstatus' );
                            }

                            self.produkt.validate();
                        }
                    });

                    self.histobef.subscribe( function( newVal ) {
                        if( newVal !== self.artopeingriff.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'histobef' );
                            }

                            self.karzinomtyp2.validate();
                            self.sonstbef.validate();
                            self.grading.validate();
                            self.stagingfigo.validate();
                            self.tnmpt.validate();
                            self.tnmpn.validate();
                            self.tnmpm.validate();
                            self.residualstatus.validate();
                        }
                    });

                    self.endhistolbefundvorh.subscribe( function( newVal ) {
                        if( newVal !== self.endhistolbefundvorh.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'endhistolbefundvorh' );
                            }

                            self.grading.validate();
                            self.stagingfigo.validate();
                            self.tnmpt.validate();
                            self.tnmpn.validate();
                            self.tnmpm.validate();
                        }
                    });

                    self.befundevoruntvorh.subscribe( function( newVal ) {
                        if( newVal !== self.befundevoruntvorh.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'befundevoruntvorh' );
                            }

                            self.herkunftergebvoru.validate();
                            self.voruntdatum.validate();
                            self.zytbefundvoruntvorh.validate();
                            self.hpvtvoruntvorhand.validate();
                            self.histologvorbefundvorunt.validate();
                        }
                    });

                    self.zytbefundvoruntvorh.subscribe( function( newVal ) {
                        if( newVal !== self.zytbefundvoruntvorh.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'zytbefundvoruntvorh' );
                            }

                            self.zytbefundvorunt.validate();
                        }
                    });

                    self.artuanlunt.subscribe( function( newVal ) {
                        if( newVal !== self.artuanlunt.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'artuanlunt' );
                            }

                            self.anamabweichvorunt.validate();
                            self.ausflusspathblutung.validate();
                            self.iup.validate();
                            self.hormonanwendungen.validate();
                            self.gynopradiatio.validate();
                            self.untersuchung.validate();
                            self.untersuchungsnummer.validate();
                        }
                    });

                    self.anamabweichvorunt.subscribe( function( newVal ) {
                        if( newVal !== self.anamabweichvorunt.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'anamabweichvorunt' );
                            }

                            self.ausflusspathblutung.validate();
                            self.iup.validate();
                            self.hormonanwendungen.validate();
                            self.gynopradiatio.validate();
                        }
                    });

                    self.hpvvirustyp.subscribe( function( newVal ) {
                        if( newVal !== self.hpvvirustyp.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                self.clearRelatedFields( 'hpvvirustyp' );
                            }

                            self.welchhpvtyp.validate();
                        }
                    });

                    self.untersuchung.subscribe( function( newVal ) {
                        if( newVal !== self.untersuchung.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                // clean for ZKP module only
                                if( 'ZKP' === unwrap( self.module ) ) {
                                    self.clearRelatedFields( 'untersuchung' );
                                }
                            }
                            self.untersuchungsnummer.validate();
                        }
                    });

                    // validate specific date related fields
                    self.datumunt.subscribe( function( previousValue ) {
                        self.datumuntBefore = previousValue;
                    }, self, 'beforeChange' );

                    self.datumunt.subscribe( function( newVal ) {
                        var
                            year = moment( unwrap( self.datumunt ) ).year(),
                            previousValueYear = moment( self.datumuntBefore ).year();
                        if( newVal !== self.datumunt.originalValue ) {
                            if( self.isNew() || self.isModified() ) {
                                if( year !== previousValueYear ) {
                                    if( 2021 === year ) {
                                        self.clearRelatedFields( 'datumunt2020' );
                                    }

                                    if( 2020 === year ) {
                                        self.clearRelatedFields( 'datumunt2021' );
                                    }
                                }
                            }
                            self.pznvorhanden.validate();
                            self.produkt.validate();
                            self.plz3stellig.validate();
                            self.zytbefundvorunt.validate();
                            self.zytbefundvorunt01.validate();
                            self.zytbefundvoruntii.validate();
                            self.zytbefundvoruntiii.validate();
                            self.zytbefundvoruntiiid.validate();
                            self.zytbefundvoruntiv.validate();
                            self.zytbefundvoruntv.validate();
                            self.zytbefund.validate();
                            self.zytbefund01.validate();
                            self.zytbefundii.validate();
                            self.zytbefundiii.validate();
                            self.zytbefundiiid.validate();
                            self.zytbefundiv.validate();
                            self.hpvvirustypvorbefund.validate();
                            self.histologvorbefundvorunt.validate();
                            self.metaplasievorgaenge.validate();
                            self.adenocarcinomainsitu.validate();
                            self.invasivplattenepithelkarz.validate();
                            self.invasivadenokarz.validate();
                            self.sonstmetaplasiebefunde.validate();
                            self.untersuchung.validate();
                            self.befundbiopskueret.validate();
                            self.sonstbefbiopskueret.validate();
                            self.op.validate();
                            self.opeingriff.validate();
                            self.sonstopeingr2.validate();
                            self.endhistolbefundvorh.validate();
                            self.methoexzision.validate();
                            self.methokonisation.validate();
                        }
                    });


                    // trigger one of few required value
                    self.metaplasievorgaenge.subscribe( function( newVal ) {
                        if( newVal !== self.metaplasievorgaenge.originalValue ) {
                            self.metaplasievorgaenge.validate();
                            self.adenocarcinomainsitu.validate();
                            self.invasivplattenepithelkarz.validate();
                            self.invasivadenokarz.validate();
                            self.sonstmetaplasiebefunde.validate();
                        }
                    });

                    self.adenocarcinomainsitu.subscribe( function( newVal ) {
                        if( newVal !== self.adenocarcinomainsitu.originalValue ) {
                            self.metaplasievorgaenge.validate();
                            self.adenocarcinomainsitu.validate();
                            self.invasivplattenepithelkarz.validate();
                            self.invasivadenokarz.validate();
                            self.sonstmetaplasiebefunde.validate();
                        }
                    });

                    self.invasivplattenepithelkarz.subscribe( function( newVal ) {
                        if( newVal !== self.invasivplattenepithelkarz.originalValue ) {
                            self.metaplasievorgaenge.validate();
                            self.adenocarcinomainsitu.validate();
                            self.invasivplattenepithelkarz.validate();
                            self.invasivadenokarz.validate();
                            self.sonstmetaplasiebefunde.validate();
                        }
                    });

                    self.invasivadenokarz.subscribe( function( newVal ) {
                        if( newVal !== self.invasivadenokarz.originalValue ) {
                            self.metaplasievorgaenge.validate();
                            self.adenocarcinomainsitu.validate();
                            self.invasivplattenepithelkarz.validate();
                            self.invasivadenokarz.validate();
                            self.sonstmetaplasiebefunde.validate();
                        }
                    });

                    self.sonstmetaplasiebefunde.subscribe( function( newVal ) {
                        if( newVal !== self.sonstmetaplasiebefunde.originalValue ) {
                            self.metaplasievorgaenge.validate();
                            self.adenocarcinomainsitu.validate();
                            self.invasivplattenepithelkarz.validate();
                            self.invasivadenokarz.validate();
                            self.sonstmetaplasiebefunde.validate();
                        }
                    });

                    // trigger at least 1 of many required
                    self.kongenanomalie.subscribe( function( newVal ) {
                        if( newVal !== self.kongenanomalie.originalValue ) {
                            self.kongenanomalie.validate();
                            self.kondylome.validate();
                            self.endometriose.validate();
                            self.ektoendopolypen.validate();
                            self.entzuendung.validate();
                            self.stenose.validate();
                            self.postopveraend.validate();
                            self.sonstweitbefunde.validate();
                        }
                    });

                    self.kondylome.subscribe( function( newVal ) {
                        if( newVal !== self.kondylome.originalValue ) {
                            self.kongenanomalie.validate();
                            self.kondylome.validate();
                            self.endometriose.validate();
                            self.ektoendopolypen.validate();
                            self.entzuendung.validate();
                            self.stenose.validate();
                            self.postopveraend.validate();
                            self.sonstweitbefunde.validate();
                        }
                    });

                    self.endometriose.subscribe( function( newVal ) {
                        if( newVal !== self.endometriose.originalValue ) {
                            self.kongenanomalie.validate();
                            self.kondylome.validate();
                            self.endometriose.validate();
                            self.ektoendopolypen.validate();
                            self.entzuendung.validate();
                            self.stenose.validate();
                            self.postopveraend.validate();
                            self.sonstweitbefunde.validate();
                        }
                    });

                    self.ektoendopolypen.subscribe( function( newVal ) {
                        if( newVal !== self.ektoendopolypen.originalValue ) {
                            self.kongenanomalie.validate();
                            self.kondylome.validate();
                            self.endometriose.validate();
                            self.ektoendopolypen.validate();
                            self.entzuendung.validate();
                            self.stenose.validate();
                            self.postopveraend.validate();
                            self.sonstweitbefunde.validate();
                        }
                    });

                    self.entzuendung.subscribe( function( newVal ) {
                        if( newVal !== self.entzuendung.originalValue ) {
                            self.kongenanomalie.validate();
                            self.kondylome.validate();
                            self.endometriose.validate();
                            self.ektoendopolypen.validate();
                            self.entzuendung.validate();
                            self.stenose.validate();
                            self.postopveraend.validate();
                            self.sonstweitbefunde.validate();
                        }
                    });

                    self.stenose.subscribe( function( newVal ) {
                        if( newVal !== self.stenose.originalValue ) {
                            self.kongenanomalie.validate();
                            self.kondylome.validate();
                            self.endometriose.validate();
                            self.ektoendopolypen.validate();
                            self.entzuendung.validate();
                            self.stenose.validate();
                            self.postopveraend.validate();
                            self.sonstweitbefunde.validate();
                        }
                    });

                    self.postopveraend.subscribe( function( newVal ) {
                        if( newVal !== self.postopveraend.originalValue ) {
                            self.kongenanomalie.validate();
                            self.kondylome.validate();
                            self.endometriose.validate();
                            self.ektoendopolypen.validate();
                            self.entzuendung.validate();
                            self.stenose.validate();
                            self.postopveraend.validate();
                            self.sonstweitbefunde.validate();
                        }
                    });

                    self.sonstweitbefunde.subscribe( function( newVal ) {
                        if( newVal !== self.sonstweitbefunde.originalValue ) {
                            self.kongenanomalie.validate();
                            self.kondylome.validate();
                            self.endometriose.validate();
                            self.ektoendopolypen.validate();
                            self.entzuendung.validate();
                            self.stenose.validate();
                            self.postopveraend.validate();
                            self.sonstweitbefunde.validate();
                        }
                    });

                    self.addDisposable( ko.computed( function() {
                        var
                            metaplasievorgaenge = unwrap( self.metaplasievorgaenge ),
                            adenocarcinomainsitu = unwrap( self.adenocarcinomainsitu ),
                            invasivplattenepithelkarz = unwrap( self.invasivplattenepithelkarz ),
                            invasivadenokarz = unwrap( self.invasivadenokarz ),
                            sonstmetaplasiebefunde = unwrap( self.sonstmetaplasiebefunde );

                        switch( true ) {
                            case Boolean( metaplasievorgaenge ):
                                self.adenocarcinomainsitu( undefined );
                                self.adenocarcinomainsitu.readOnly( true );
                                self.invasivplattenepithelkarz( undefined );
                                self.invasivplattenepithelkarz.readOnly( true );
                                self.invasivadenokarz( undefined );
                                self.invasivadenokarz.readOnly( true );
                                self.sonstmetaplasiebefunde( undefined );
                                self.sonstmetaplasiebefunde.readOnly( true );
                                break;
                            case Boolean( adenocarcinomainsitu ):
                                self.metaplasievorgaenge( undefined );
                                self.metaplasievorgaenge.readOnly( true );
                                self.invasivplattenepithelkarz( undefined );
                                self.invasivplattenepithelkarz.readOnly( true );
                                self.invasivadenokarz( undefined );
                                self.invasivadenokarz.readOnly( true );
                                self.sonstmetaplasiebefunde( undefined );
                                self.sonstmetaplasiebefunde.readOnly( true );
                                break;
                            case Boolean( invasivplattenepithelkarz ):
                                self.metaplasievorgaenge( undefined );
                                self.metaplasievorgaenge.readOnly( true );
                                self.adenocarcinomainsitu( undefined );
                                self.adenocarcinomainsitu.readOnly( true );
                                self.invasivadenokarz( undefined );
                                self.invasivadenokarz.readOnly( true );
                                self.sonstmetaplasiebefunde( undefined );
                                self.sonstmetaplasiebefunde.readOnly( true );
                                break;
                            case Boolean( invasivadenokarz ):
                                self.metaplasievorgaenge( undefined );
                                self.metaplasievorgaenge.readOnly( true );
                                self.adenocarcinomainsitu( undefined );
                                self.adenocarcinomainsitu.readOnly( true );
                                self.invasivplattenepithelkarz( undefined );
                                self.invasivplattenepithelkarz.readOnly( true );
                                self.sonstmetaplasiebefunde( undefined );
                                self.sonstmetaplasiebefunde.readOnly( true );
                                break;
                            case Boolean( sonstmetaplasiebefunde ):
                                self.metaplasievorgaenge( undefined );
                                self.metaplasievorgaenge.readOnly( true );
                                self.adenocarcinomainsitu( undefined );
                                self.adenocarcinomainsitu.readOnly( true );
                                self.invasivplattenepithelkarz( undefined );
                                self.invasivplattenepithelkarz.readOnly( true );
                                self.invasivadenokarz( undefined );
                                self.invasivadenokarz.readOnly( true );
                                break;
                            default:
                                self.metaplasievorgaenge( undefined );
                                self.metaplasievorgaenge.readOnly( false );
                                self.adenocarcinomainsitu( undefined );
                                self.adenocarcinomainsitu.readOnly( false );
                                self.invasivplattenepithelkarz( undefined );
                                self.invasivplattenepithelkarz.readOnly( false );
                                self.invasivadenokarz( undefined );
                                self.invasivadenokarz.readOnly( false );
                                self.sonstmetaplasiebefunde( undefined );
                                self.sonstmetaplasiebefunde.readOnly( false );
                        }
                    }));
                },
                clearRelatedFields: function( field ) {
                    var
                        self = this;
                    if( field ) {
                        QDOCU_RELATED_FIELDS[field].forEach( function( item ) {
                            self[item]( undefined );
                        });
                    }
                }
            },
            {
                schemaName: 'v_qdocu',
                NAME: 'QDocuModel'
            }
        );
        KoViewModel.registerConstructor( QDocuModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'SimpleActivityModel',
            'ActivityModel',
            'v_qdocu-schema'
        ]
    }
);