/**
 * User: sabine.gottfried
 * Date: 22.01.21  16:08
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

// noinspection JSNonASCIINames

YUI.add( 'qdocu-filebuilder', function( Y, NAME ) {

        const
            uuid = require( 'node-uuid' ),
            moment = require( 'moment' ),
            edocConverter = Y.doccirrus.edocConverter,
            convert = edocConverter.convert,
            hasValue = ( value ) => value && value !== '&nbsp;',
            addField = ( doc, elementName, value ) => {
                let attrs;
                if( Array.isArray( value ) ) {
                    const val0 = (value[0] || '').trim();
                    const val1 = (value[1] || '').trim();
                    attrs = (hasValue( val0 ) || hasValue( val1 )) ? {V: `${val0}${val1}`} : {};
                } else {
                    value = (value || '').trim();
                    attrs = hasValue( value ) ? {V: value} : {};
                }
                return doc.ele( elementName, attrs ).up();
            };

        const
            qdocuDocProcessConfig = [
                startRoot,
                startHeader,
                {
                    'Header': [
                        startDocument,
                        documentInfo,
                        software,
                        dataInfo,
                        endDocument,
                        provider,
                        startProtocol,
                        protocolInfo,
                        endProtocol,
                        encryption
                    ]
                },
                endHeader,
                body,
                endBody,
                endRoot
            ];

        function startRoot( doc, context ) {
            const schemaLocation = context && context.xsdSchema && context.xsdSchema.schemaLocation;
            return doc
                .dec( {
                    encoding: 'utf-8'
                } )
                .ele( 'root', {
                    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                    'xsi:schemaLocation': 'urn:gba:sqg  ../../' + schemaLocation,
                    xmlns: 'urn:gba:sqg',
                    container_version: '2.0',
                    content_version: '1.0'
                } );
        }

        function endRoot( doc ) {
            return doc.up();
        }

        function endBody( doc ) {
            return doc.up().up();
        }

        function startHeader( doc ) {
            return doc.ele( 'header' );
        }

        function endHeader( doc ) {
            return doc.up();
        }

        function startDocument( doc ) {
            return doc.ele( 'document' );
        }

        function endDocument( doc ) {
            return doc.up();
        }

        function startProtocol( doc ) {
            return doc.ele( 'protocol' );
        }

        function endProtocol( doc ) {
            return doc.up();
        }

        function startStatistic( doc ) {
            return doc.ele( 'statistic' );
        }

        function endStatistic( doc ) {
            return doc.up();
        }

        function startCases( doc, context ) {
            return doc.ele( 'cases', {
                module: context.activity.module,
                pseud_procedure: 'ZK'
            } );
        }

        function endCases( doc ) {
            return doc.up();
        }

        function body( doc, context ) {
            const {
                activity,
                document,
                employee,
                location,
                patient
            } = context;

            //const cases = activities.filter( activity => activity.employeeId === employee._id.toString() );
            //start
            doc = doc.ele( 'body' ).ele( 'data_container' );
            //care provider
            doc = doc
                .ele( 'care_provider' )
                .ele( 'BSNRAMBULANT', {
                    V: location.commercialNo // TODO: in addition NBSNRAMBULANT must be added if sub locations are present
                } ).up()
                .ele( 'LANR', {
                    V: employee.officialNo
                } ).up().up();

            //cases
            doc = startCases( doc, context );

            doc = caseInfo( doc, {
                activity: activity,
                document: document,
                patient: patient
            } );


            doc = startStatistic( doc );
            doc = statisticInfo( doc, 1 );
            doc = endStatistic( doc );
            doc = endCases( doc, context );
            return doc;
        }

        function documentInfo( doc ) {
            const currentDate = moment().toISOString();
            const id = uuid.v4();
            return doc
                .ele( 'id', {
                    V: `{${id}}`
                } ).up()
                .ele( 'set_id', {
                    V: `{${id}}` // TODO: must be changed alter to an id that does not change even if the doc is delivered again
                } ).up()
                .ele( 'origination_dttm', {
                    V: currentDate
                } ).up()
                .ele( 'modification_dttm', {
                    V: currentDate
                } ).up();
        }

        function statisticInfo( doc, num ) {
            return doc
                .ele( 'sent', {
                    count: num
                } )
                .ele( 'create', {
                    V: num
                } ).up()
                .ele( 'update', {
                    V: '0'
                } ).up()
                .ele( 'delete', {
                    V: '0'
                } ).up()
                .ele( 'corrupted', {
                    V: '0'
                } ).up().up()
                .ele( 'processed', {
                    count: '0'
                } )
                .ele( 'create', {
                    V: '0'
                } ).up()
                .ele( 'update', {
                    V: '0'
                } ).up()
                .ele( 'delete', {
                    V: '0'
                } ).up()
                .ele( 'corrupted', {
                    V: '0'
                } ).up().up();
        }

        function caseInfo( doc, context ) {
            const now = moment();
            const id = uuid.v4();
            const {
                activity
            } = context;

            const
                quarterOfActivity = moment( activity.timestamp ).format( 'Q/YYYY' ),
                iknrFirst2Digits = hasValue( activity.kasseiknr ) && activity.kasseiknr.slice( 0, 2 ) || '',
                versichertenstatusgkv = activity.versichertenstatusgkv;

            /*
            TODO
            See spec: Achtung - Dokumentation der Felder KASSEIKNR, PERSONENKREIS und VERSI- CHERTENIDNEU
                      Liegen Daten zur elektronischen Gesundheitskarte (eGK) zum Zeitpunkt der Erfas- sung noch nicht vor, erlischt nicht die Dokumentationspflicht der Felder KAS- SEIKNR, PERSONENKREIS und VERSICHERTENIDNEU für GKV-Versicherte. Die Angabe ist bei Vorliegen der elektronischen Gesundheitskarte zu dokumentieren.

            unused fields atm
            - versichertenidgkv

             */

            doc = doc
                .ele( 'case' )
                .ele( 'patient', {
                    twodigitik: activity.kasseiknr.substring( 0, 2 )
                } )
                .ele( 'pid' )
                .ele( 'VERSICHERTENIDNEU', {
                    V: activity.versichertenidneu || ''
                } ).up().up().up()
                .ele( 'case_admin' )
                .ele( 'id', {
                    V: activity.idnrpat //TODO: check this in spec old comment was"aufsteigende nummer"'; but need a way to differencaiate in the html protocol
                } ).up()
                .ele( 'guid', {
                    V: `{${id}}`
                } ).up()
                .ele( 'version', {
                    V: '1'
                } ).up()
                .ele( 'action', {
                    V: 'create'
                } ).up()
                .ele( 'module', {
                    V: activity.module
                } ).up()
                .ele( 'quarter', {
                    V: quarterOfActivity
                } ).up()
                .ele( 'protocol' )
                .ele( 'status_case', {
                    V: 'OK'
                } ).up().up().up()
                .ele( 'qs_data', {
                    'xsi:type': `qs_data_${activity.module.toLowerCase()}_type`,
                    module: activity.module
                } )
                .ele( 'B' )
                .ele( 'felder' )
                .ele( 'DokAbschlDat', {
                    V: now.format( 'DD.MM.YYYY' ) //TODO: should actually be date of approval
                } ).up()
                .ele( 'PROGRAMMZK', {
                    V: activity.programmzk
                } ).up()
                .ele( 'kasseiknr2Stellen', {
                    V: iknrFirst2Digits
                } ).up()
                .ele( 'versichertenstatusgkv', {
                    V: versichertenstatusgkv
                } ).up()
                .ele( 'GEBDATUM', {
                    V: moment( activity.gebdatum ).format( 'DD.MM.YYYY' )
                } ).up();

            const
                QDocuYear = moment( activity.datumunt ).year();
            switch( activity.module ) {
                case 'ZKA':
                    // 2021 fields
                    if( -1 !== [2021].indexOf( QDocuYear ) ) {
                        doc = addField( doc, 'PLZ3stellig', activity.plz3stellig.substring( 0, 3 ) );
                    }
                    if( activity.datumunt ) {
                        doc = addField( doc, 'DATUMUNT', moment( activity.datumunt ).format( 'DD.MM.YYYY' ) );
                    }
                    doc = addField( doc, 'ZYTBEFUNDVORUNT', activity.zytbefundvorunt );
                    if( -1 !== [2020].indexOf( QDocuYear ) ) {
                        doc = addField( doc, 'ZYTBEFUNDVORUNT01', activity.zytbefundvorunt01 );
                        doc = addField( doc, 'ZYTBEFUNDVORUNTII', activity.zytbefundvoruntii );
                        doc = addField( doc, 'ZYTBEFUNDVORUNTIII', activity.zytbefundvoruntiii );
                        doc = addField( doc, 'ZYTBEFUNDVORUNTIIID', activity.zytbefundvoruntiiid );
                        doc = addField( doc, 'ZYTBEFUNDVORUNTIV', activity.zytbefundvoruntiv );
                        doc = addField( doc, 'ZYTBEFUNDVORUNTV', activity.zytbefundvoruntv );
                    }
                    doc = addField( doc, 'HPVTVORUNTVORHAND', activity.hpvtvoruntvorhand );
                    doc = addField( doc, 'HPVTVORBEFUND', activity.hpvtvorbefund );
                    if( -1 !== [2020].indexOf( QDocuYear ) ) {
                        doc = addField( doc, 'HPVVIRUSTYPVORBEFUND', activity.hpvvirustypvorbefund );
                        doc = addField( doc, 'ZERVIXEINSTELLBAR', activity.zervixeinstellbar );
                    }
                    doc = addField( doc, 'KOLPOSKBEFUND', activity.kolposkbefund );
                    doc = addField( doc, 'PZGSICHTBAR', activity.pzgsichtbar );
                    doc = addField( doc, 'TZTYP', activity.tztyp );
                    doc = addField( doc, 'NORMALBEFUND', activity.normalbefund );
                    doc = addField( doc, 'GRADABNBEFUNDE', activity.gradabnbefunde );
                    if( -1 !== [2020].indexOf( QDocuYear ) ) {
                        doc = addField( doc, 'VERDACHTAIS', activity.verdachtais );
                    }
                    doc = addField( doc, 'LOKALABNBEFUNDE', activity.lokalabnbefunde );
                    doc = addField( doc, 'GROESSELAESION', activity.groesselaesion );
                    doc = addField( doc, 'VERDACHTINVASION', activity.verdachtinvasion );
                    doc = addField( doc, 'WEITEREBEFUNDE', activity.weiterebefunde );
                    doc = addField( doc, 'KONGENANOMALIE', activity.kongenanomalie );
                    doc = addField( doc, 'KONDYLOME', activity.kondylome );
                    doc = addField( doc, 'ENDOMETRIOSE', activity.endometriose );
                    doc = addField( doc, 'EKTOENDOPOLYPEN', activity.ektoendopolypen );
                    doc = addField( doc, 'ENTZUENDUNG', activity.entzuendung );
                    doc = addField( doc, 'STENOSE', activity.stenose );
                    doc = addField( doc, 'POSTOPVERAEND', activity.postopveraend );
                    doc = addField( doc, 'SONSTWEITBEFUNDE', activity.sonstweitbefunde );
                    doc = addField( doc, 'SONSTBEFUNDE', activity.sonstbefunde);
                    doc = addField( doc, 'MASSNAHMEN', activity.massnahmen );
                    doc = addField( doc, 'ANZAHLBIOPSIEN', activity.anzahlbiopsien );
                    doc = addField( doc, 'BEFUNDBIOPSKUERET', activity.befundbiopskueret );
                    if( -1 === [2020].indexOf( QDocuYear ) ) {
                        doc = addField( doc, 'KARZTYP', activity.karzinomtyp );
                    }
                    if( -1 !== [2020].indexOf( QDocuYear ) ) {
                        doc = addField( doc, 'METAPLASIEVORGAENGE', activity.metaplasievorgaenge );
                        doc = addField( doc, 'ADENOCARCINOMAINSITU', activity.adenocarcinomainsitu );
                        doc = addField( doc, 'INVASIVPLATTENEPITHELKARZ', activity.invasivplattenepithelkarz );
                        doc = addField( doc, 'INVASIVADENOKARZ', activity.invasivadenokarz );
                        doc = addField( doc, 'SONSTMETAPLASIEBEFUNDE', activity.sonstmetaplasiebefunde );
                    }
                    doc = addField( doc, 'SONSTBEFBIOPSKUERET', activity.sonstbefbiopskueret  );
                    doc = addField( doc, 'EMPFOHLENEMASSNAHMEBIOPS', activity.empfohlenemassnahmebiops );
                    doc = addField( doc, 'EMPFOHLENEKONTRABKL', activity.empfohlenekontrabkl );
                    if( -1 !== [2020].indexOf( QDocuYear ) ) {
                        doc = addField( doc, 'ZEITHORIZONTKONTRABKL', activity.zeithorizontkontrabkl );
                    }
                    if( -1 === [2020].indexOf( QDocuYear ) ) {
                        doc = addField( doc, 'ZEITHORIZONTKOLP', activity.zeithorizontkontrabkl );
                    }
                    doc = addField( doc, 'ZEITHORIZONT', activity.zeithorizont );
                    doc = addField( doc, 'THERAPIEEMPFEHLUNG', activity.therapieempfehlung  );
                    if( -1 === [2020].indexOf( QDocuYear ) ) {
                        doc = addField( doc, 'SONSTOPEINGR', activity.sonstopeingr);
                        doc = addField( doc, 'WEITERETHERAPIEEMPF', activity.weiteretherapieempf);
                        doc = addField( doc, 'OP', activity.op  );
                        doc = addField( doc, 'OPEINGRIFF', activity.opeingriff  );
                        if( activity.opdatum ) {
                            doc = addField( doc, 'OPDATUM', moment( activity.opdatum ).format( 'DD.MM.YYYY' ) );
                        } else {
                            doc = addField( doc, 'OPDATUM', activity.opdatum );
                        }
                        doc = addField( doc, 'METHOKONISATION', activity.methokonisation );
                        doc = addField( doc, 'METHOEXZISION', activity.methoexzision );
                        doc = addField( doc, 'TIEFEKONUS', activity.tiefekonus );
                        doc = addField( doc, 'UMFANGEXZISION', activity.umfangexzision );
                        doc = addField( doc, 'HISTOBEF', activity.histobef );
                        doc = addField( doc, 'KARZTYP2', activity.karzinomtyp2 );
                        doc = addField( doc, 'SONSTBEF', activity.sonstbef );
                        doc = addField( doc, 'GRADING', activity.grading );
                        doc = addField( doc, 'TNMPT', activity.tnmpt );
                        doc = addField( doc, 'TNMPN', activity.tnmpn );
                        doc = addField( doc, 'TNMPM', activity.tnmpm );
                        doc = addField( doc, 'STAGINGFIGO', activity.stagingfigo );
                        doc = addField( doc, 'RESIDUALSTATUS', activity.residualstatus );
                    }
                    if( -1 !== [2020].indexOf( QDocuYear ) ) {
                        doc = addField( doc, 'SONSTOPEINGR', activity.sonstopeingr);
                        doc = addField( doc, 'WEITERETHERAPIEEMPF', activity.weiteretherapieempf);
                        if( activity.opdatum ) {
                            doc = addField( doc, 'OPDATUM', moment( activity.opdatum ).format( 'DD.MM.YYYY' ) );
                        } else {
                            doc = addField( doc, 'OPDATUM', activity.opdatum );
                        }
                        doc = addField( doc, 'ARTOPEINGRIFF', activity.artopeingriff );
                        doc = addField( doc, 'METHOKONISATION', activity.methokonisation );
                        doc = addField( doc, 'TIEFEKONUS', activity.tiefekonus );
                        doc = addField( doc, 'METHOEXZISION', activity.methoexzision );
                        doc = addField( doc, 'UMFANGEXZISION', activity.umfangexzision );
                        doc = addField( doc, 'SONSTOPEINGR2', activity.sonstopeingr2 );
                        doc = addField( doc, 'ENDHISTOLBEFUNDVORH', activity.endhistolbefundvorh );
                        doc = addField( doc, 'GRADING', activity.grading );
                        doc = addField( doc, 'STAGINGFIGO', activity.stagingfigo );
                        doc = addField( doc, 'TNMPT', activity.tnmpt );
                        doc = addField( doc, 'TNMPN', activity.tnmpn );
                        doc = addField( doc, 'TNMPM', activity.tnmpm );
                    }
                    break;
                case 'ZKH':
                    // order is important
                    if( -1 !== [2021].indexOf( QDocuYear ) ) {
                        doc = addField( doc, 'PLZ3stellig', activity.plz3stellig.substring( 0, 3 ) );
                    }
                    if( activity.datumunt ) {
                        doc = addField( doc, 'DATUMUNT', moment( activity.datumunt ).format( 'DD.MM.YYYY' ) );
                    } else {
                        doc = addField( doc, 'DATUMUNT', activity.datumunt );
                    }
                    doc = addField( doc, 'UNTERSUCHUNGSNUMMER', activity.untersuchungsnummer );
                    // those fields for 2020 only
                    if( -1 !== [2020].indexOf( QDocuYear ) ) {
                        doc = addField( doc, 'PZNVORHANDEN', activity.pznvorhanden );
                        doc = addField( doc, 'PZN', activity.pzn );
                    }
                    doc = addField( doc, 'PRODUKT', activity.produkt);
                    doc = addField( doc, 'HPVTERGEBNIS', activity.hpvtergebnis );
                    doc = addField( doc, 'HPVVIRUSTYP', activity.hpvvirustyp );
                    // those fields for 2021 only
                    if( -1 !== [2021].indexOf( QDocuYear ) ) {
                        doc = addField( doc, 'WELCHHPVTYP', activity.welchhpvtyp );
                    }
                    break;
                case 'ZKP':
                    doc = addField( doc, 'PLZ3stellig', activity.plz3stellig.substring( 0, 3 ) );
                    if( activity.datumunt ) {
                        doc = addField( doc, 'DATUMUNT', moment( activity.datumunt ).format( 'DD.MM.YYYY' ) );
                    } else {
                        doc = addField( doc, 'DATUMUNT', activity.datumunt );
                    }
                    if( -1 === [2020].indexOf( QDocuYear ) ) {
                        doc = addField( doc, 'HERKUNFTIMPFSTATUS', activity.herkunftimpfstatus );
                    }
                    doc = addField( doc, 'HPVIMPFUNG', activity.hpvimpfung );
                    doc = addField( doc, 'PRODUKT', activity.produkt );
                    if( -1 !== [2020].indexOf( QDocuYear ) ) {
                        doc = addField( doc, 'HERKUNFTIMPFSTATUS', activity.herkunftimpfstatus );
                    }
                    doc = addField( doc, 'ARTUANLUNT', activity.artuanlunt );
                    doc = addField( doc, 'BEFUNDEVORUNTVORH', activity.befundevoruntvorh );
                    doc = addField( doc, 'HERKUNFTERGEBVORU', activity.herkunftergebvoru );
                    doc = addField( doc, 'VORUNTDATUM', activity.voruntdatum );
                    doc = addField( doc, 'ZYTBEFUNDVORUNTVORH', activity.zytbefundvoruntvorh );
                    if( -1 === [2020].indexOf( QDocuYear ) ) {
                        doc = addField( doc, 'ZYTBEFUNDVORUNT2', activity.zytbefundvorunt );
                    }
                    if( -1 !== [2020].indexOf( QDocuYear ) ) {
                        doc = addField( doc, 'ZYTBEFUNDVORUNT', activity.zytbefundvorunt );
                        doc = addField( doc, 'ZYTBEFUNDVORUNT01', activity.zytbefundvorunt01 );
                        doc = addField( doc, 'ZYTBEFUNDVORUNTII', activity.zytbefundvoruntii );
                        doc = addField( doc, 'ZYTBEFUNDVORUNTIII', activity.zytbefundvoruntiii );
                        doc = addField( doc, 'ZYTBEFUNDVORUNTIIID', activity.zytbefundvoruntiiid );
                        doc = addField( doc, 'ZYTBEFUNDVORUNTIV', activity.zytbefundvoruntiv );
                        doc = addField( doc, 'ZYTBEFUNDVORUNTV', activity.zytbefundvoruntv );
                    }
                    doc = addField( doc, 'HPVTVORUNTVORHAND', activity.hpvtvoruntvorhand );
                    doc = addField( doc, 'HPVTVORBEFUND', activity.hpvtvorbefund );
                    if( -1 !== [2020].indexOf( QDocuYear ) ) {
                        doc = addField( doc, 'HPVVIRUSTYPVORBEFUND', activity.hpvvirustypvorbefund );
                    }
                    doc = addField( doc, 'HISTOLOGVORBEFUNDVORUNT', activity.histologvorbefundvorunt );
                    if( -1 !== [2020].indexOf( QDocuYear ) ) {
                        doc = addField( doc, 'METAPLASIEVORGAENGE', activity.metaplasievorgaenge );
                        doc = addField( doc, 'ADENOCARCINOMAINSITU', activity.adenocarcinomainsitu );
                        doc = addField( doc, 'INVASIVPLATTENEPITHELKARZ', activity.invasivplattenepithelkarz );
                        doc = addField( doc, 'INVASIVADENOKARZ', activity.invasivadenokarz );
                        doc = addField( doc, 'SONSTMETAPLASIEBEFUNDE', activity.sonstmetaplasiebefunde );
                    }
                    if( -1 === [2020].indexOf( QDocuYear ) ) {
                        doc = addField( doc, 'KARZTYP', activity.karzinomtyp );
                    }
                    doc = addField( doc, 'SONSTBEFUNDE', activity.sonstbefunde);
                    doc = addField( doc, 'ANAMABWEICHVORUNT', activity.anamabweichvorunt );
                    doc = addField( doc, 'AUSFLUSSPATHBLUTUNG', activity.ausflusspathblutung );
                    doc = addField( doc, 'IUP', activity.iup );
                    doc = addField( doc, 'HORMONANWENDUNGEN', activity.hormonanwendungen );
                    doc = addField( doc, 'GYNOPRADIATIO', activity.gynopradiatio );
                    doc = addField( doc, 'GRAVIDITAET', activity.graviditaet );
                    doc = addField( doc, 'KLINISCHERBEFUND', activity.klinischerbefund );
                    if( -1 === [2020].indexOf( QDocuYear ) ) {
                        doc = addField( doc, 'UNTERSUCHUNG', activity.untersuchung );
                    }
                    doc = addField( doc, 'UNTERSUCHUNGSNUMMER', activity.untersuchungsnummer );
                    doc = addField( doc, 'ZYTBEFUND', activity.zytbefund );
                    if( -1 !== [2020].indexOf( QDocuYear ) ) {
                        doc = addField( doc, 'ZYTBEFUND01', activity.zytbefund01 );
                        doc = addField( doc, 'ZYTBEFUNDII', activity.zytbefundii );
                        doc = addField( doc, 'ZYTBEFUNDIII', activity.zytbefundiii );
                        doc = addField( doc, 'ZYTBEFUNDIIID', activity.zytbefundiiid );
                        doc = addField( doc, 'ZYTBEFUNDIV', activity.zytbefundiv );
                        doc = addField( doc, 'ZYTBEFUNDV', activity.zytbefundv );
                    }
                    doc = addField( doc, 'HPVTEST', activity.hpvtest );
                    doc = addField( doc, 'HPVTERGEBNIS', activity.hpvtergebnis );
                    doc = addField( doc, 'HPVVIRUSTYP', activity.hpvvirustyp );
                    doc = addField( doc, 'EMPFOHLENEMASSNAHME', activity.empfohlenemassnahme );
                    doc = addField( doc, 'EMPFOHLENEKONTRABKL', activity.empfohlenekontrabkl );
                    doc = addField( doc, 'ZEITHORIZONTKONTRABKL', activity.zeithorizontkontrabkl );
                    doc = addField( doc, 'ZEITHORIZONT', activity.zeithorizont );
                    break;
                case 'ZKZ':
                    // 2021 fields
                    if( -1 !== [2021].indexOf( QDocuYear ) ) {
                        doc = addField( doc, 'PLZ3stellig', activity.plz3stellig.substring( 0, 3 ) );
                    }
                    if( activity.datumunt ) {
                        doc = addField( doc, 'DATUMUNT', moment( activity.datumunt ).format( 'DD.MM.YYYY' ) );
                    } else {
                        doc = addField( doc, 'DATUMUNT', activity.datumunt );
                    }
                    doc = addField( doc, 'UNTERSUCHUNGSNUMMER', activity.untersuchungsnummer );
                    doc = addField( doc, 'METHOABSTRENTNAHME', activity.methoabstrentnahme );
                    doc = addField( doc, 'PRODUKT', activity.produkt );
                    doc = addField( doc, 'ZYTBEFUND', activity.zytbefund );
                    if( -1 !== [2020].indexOf( QDocuYear ) ) {
                        doc = addField( doc, 'ZYTBEFUND01', activity.zytbefund01 );
                        doc = addField( doc, 'ZYTBEFUNDII', activity.zytbefundii );
                        doc = addField( doc, 'ZYTBEFUNDIII', activity.zytbefundiii );
                        doc = addField( doc, 'ZYTBEFUNDIIID', activity.zytbefundiiid );
                        doc = addField( doc, 'ZYTBEFUNDIV', activity.zytbefundiv );
                        doc = addField( doc, 'ZYTBEFUNDV', activity.zytbefundv );
                    }
                    break;
            }

            return doc.up().up().up().up();
        }

        function protocolInfo( doc ) {
            return doc.ele( 'status_document', {
                V: 'OK'
            } ).up();
        }

        function encryption( doc ) {
            return doc.ele( 'encryption' ).up();
        }

        function software( doc, context ) {
            const specification = context && context.xsdSchema && context.xsdSchema.specification;
            const pkg = Y.config.insuite;
            return doc
                .ele( 'software' )
                .ele( 'vendor', {
                    name: pkg.author.name,
                    address: 'Bessemerstr. 82, 12103 Berlin',
                    email: pkg.author.email,
                    function: 'Softwarehersteller',
                    fax: '+49.30.20898729.9',
                    phone: '+49.30.20898729.0',
                    registration: 'sw12345' // TODO: get number. need dummy can not be empty
                } ).up()
                .ele( 'name', {
                    V: pkg.description
                } ).up()
                .ele( 'version', {
                    V: pkg.version
                } ).up()
                .ele( 'specification', {
                    V: specification
                } ).up().up();
        }

        function dataInfo( doc ) {
            doc = doc
                .ele( 'data_flow', {
                    V: 'QS-Kollektivvertraglich'
                } ).up()
                .ele( 'data_target', {
                    // V: 'Testdatenpool'
                    // V: 'Probedatenpool'
                    V: 'Echtdatenpool'
                } ).up();

            return doc;
        }

        function provider( doc ) {
            const pkg = Y.config.insuite;
            return doc.ele( 'provider', {
                name: pkg.author.name,
                address: 'Bessemerstr. 82, 12103 Berlin',
                email: pkg.author.email,
                function: 'Leistungserbringer',
                fax: '+49.30.20898729.9',
                phone: '+49.30.20898729.0',
                registration: 'sw12345'
            } ).up();
        }

        function buildDocXml( context ) {
            return convert( context, qdocuDocProcessConfig );
        }

        Y.namespace( 'doccirrus' ).qdocuFileBuilder = {
            name: NAME,
            buildDocXml
        };

    },
    '0.0.1', {
        requires: [
            'edoc-converter'
        ]
    }
);

