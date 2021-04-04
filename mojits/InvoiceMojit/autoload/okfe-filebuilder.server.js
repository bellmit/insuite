/**
 * User: do
 * Date: 24.12.20  09:28
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/**
 * User: maximilian.kramp
 * Date: 12/15/20  12:46 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */

// noinspection JSNonASCIINames

YUI.add( 'okfe-filebuilder', function( Y, NAME ) {

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
            okfeDocProcessConfig = [
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

        function startRoot( doc ) {
            return doc
                .dec( {
                    encoding: 'utf-8'
                } )
                .ele( 'root', {
                    'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                    'xsi:schemaLocation': 'urn:gba:sqg  ../../interface_LE/2020_kv_pid_1.0_Export.xsd',
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

        function startCases( doc, formName ) {
            return doc.ele( 'cases', {
                module: formName,
                pseud_procedure: 'ZK'
            } );
        }

        function endCases( doc ) {
            return doc.up();
        }

        function body( doc, context ) {
            const {
                formName,
                activities,
                documents,
                employees,
                location,
                patients
            } = context;

            doc = doc.ele( 'body' );

            for( let i = 0; i < employees.length; i++ ) {
                const
                    employee = employees[i],
                    cases = activities.filter( activity => activity.employeeId === employee._id.toString() );
                //start

                if( i > 0 ) {
                    doc.up().up();
                }

                doc = doc.ele( 'data_container' );

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
                doc = startCases( doc, formName );

                for( let j = 0; j < cases.length; j++ ) {
                    doc = caseInfo( doc, {
                        activity: cases[j],
                        document: documents.find( document => cases[j]._id.toString() === document.activityId ),
                        patient: patients.find( patient => cases[j].patientId === patient._id.toString() )
                    } );
                }
                doc = startStatistic( doc );
                doc = statisticInfo( doc, cases.length );
                doc = endStatistic( doc );
            }
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
                activity,
                document,
                document: {
                    formState
                },
                patient
            } = context;

            const
                quarterOfActivity = moment( activity.timestamp ).format( 'Q/YYYY' ),
                publicInsurance = patient.insuranceStatus.find( elem => elem.type === 'PUBLIC' ),
                iknrFirst2Digits = hasValue( formState.KennzeichenKK ) && formState.KennzeichenKK.slice( 0, 2 ) || '',
                versichertenstatusgkv = iknrFirst2Digits === '10' && !publicInsurance.persGroup ? '1' : 0;

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
                    twodigitik: publicInsurance.insuranceId.substring( 0, 2 )
                } )
                .ele( 'pid' )
                .ele( 'VERSICHERTENIDNEU', {
                    V: publicInsurance.insuranceNo || ''
                } ).up().up().up()
                .ele( 'case_admin' )
                .ele( 'id', {
                    V: patient.patientNo //TODO: check this in spec old comment was"aufsteigende nummer"'; but need a way to differencaiate in the html protocol
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
                    V: document.formState.formName
                } ).up()
                .ele( 'quarter', {
                    V: quarterOfActivity
                } ).up()
                .ele( 'protocol' )
                .ele( 'status_case', {
                    V: 'OK'
                } ).up().up().up()
                .ele( 'qs_data', {
                    'xsi:type': `qs_data_${document.formState.formName.toLowerCase()}_type`,
                    module: document.formState.formName
                } )
                .ele( 'B' )
                .ele( 'felder' )
                .ele( 'DokAbschlDat', {
                    V: now.format( 'DD.MM.YYYY' ) //TODO: should actually be date of approval
                } ).up()
                .ele( 'PROGRAMMZK', {
                    V: formState.BasisProgrammnr
                } ).up()
                .ele( 'kasseiknr2Stellen', {
                    V: iknrFirst2Digits
                } ).up()
                .ele( 'versichertenstatusgkv', {
                    V: versichertenstatusgkv
                } ).up()
                .ele( 'GEBDATUM', {
                    V: formState.Patdob
                } ).up();

            switch( document.formState.formName ) {
                case 'ZKA':
                    doc = addField( doc, 'DATUMUNT', formState.OPdate );
                    doc = addField( doc, 'ZYTBEFUNDVORUNT', formState.VorbefundZytoNomenklaturlll );
                    doc = addField( doc, 'ZYTBEFUNDVORUNT01', formState.VorbefundZytoGruppe0l );
                    doc = addField( doc, 'ZYTBEFUNDVORUNTII', formState.VorbefundZytoGruppell );
                    doc = addField( doc, 'ZYTBEFUNDVORUNTIII', formState.VorbefundZytoGruppelll );
                    doc = addField( doc, 'ZYTBEFUNDVORUNTIIID', formState.VorbefundZytoGruppelllD );
                    doc = addField( doc, 'ZYTBEFUNDVORUNTIV', formState.VorbefundZytoGruppeIV );
                    doc = addField( doc, 'ZYTBEFUNDVORUNTV', formState.VorbefundZytoGrupeV );
                    doc = addField( doc, 'HPVTVORUNTVORHAND', formState.VorbefundHPV );
                    doc = addField( doc, 'HPVTVORBEFUND', formState.VorbefundHPVErgebnis );
                    doc = addField( doc, 'HPVVIRUSTYPVORBEFUND', formState.VorbefundVirustyp );
                    doc = addField( doc, 'ZERVIXEINSTELLBAR', formState.ZervixEinstellbar );
                    doc = addField( doc, 'KOLPOSKBEFUND', formState.KolposkopischerBefund );
                    doc = addField( doc, 'PZGSICHTBAR', formState.SichtbarkeitPZG );
                    doc = addField( doc, 'TZTYP', formState.TypTZ );
                    doc = addField( doc, 'NORMALBEFUND', formState.Normalbefund );
                    doc = addField( doc, 'GRADABNBEFUNDE', formState.EinstufungabnormenBefunde );
                    doc = addField( doc, 'VERDACHTAIS', formState.VerdachtAIS );
                    doc = addField( doc, 'LOKALABNBEFUNDE', formState.LokalisationabnormenBefunde );
                    doc = addField( doc, 'GROESSELAESION', formState.GroeßeLaesion );
                    doc = addField( doc, 'VERDACHTINVASION', formState.VerdachtInvasion );
                    doc = addField( doc, 'WEITEREBEFUNDE', formState.weitereBefunde );
                    doc = addField( doc, 'KONGENANOMALIE', formState.kongenitaleAnomalie );
                    doc = addField( doc, 'KONDYLOME', formState.Kondylome );
                    doc = addField( doc, 'ENDOMETRIOSE', formState.Endometriose );
                    doc = addField( doc, 'EKTOENDOPOLYPEN', formState.Polypen );
                    doc = addField( doc, 'ENTZUENDUNG', formState.Entzuendung );
                    doc = addField( doc, 'STENOSE', formState.Stenose );
                    doc = addField( doc, 'POSTOPVERAEND', formState.PostOPVeraenderung );
                    doc = addField( doc, 'SONSTWEITBEFUNDE', formState.Sonstige32 );
                    doc = addField( doc, 'SONSTBEFUNDE', [formState['1Sonstige33'], formState['2Sonstige33']] );
                    doc = addField( doc, 'MASSNAHMEN', formState.Maßnahmen );
                    doc = addField( doc, 'ANZAHLBIOPSIEN', formState.AnzahlBiopsien );
                    doc = addField( doc, 'BEFUNDBIOPSKUERET', formState.Befund );
                    doc = addField( doc, 'METAPLASIEVORGAENGE', formState.EinstufungDysplasievorgaenge );
                    // TODO: the forms have an "?" options which is not valid; can also be removed with editor
                    doc = addField( doc, 'ADENOCARCINOMAINSITU', formState.AIS !== '?' ? formState.AIS : '' );
                    doc = addField( doc, 'INVASIVPLATTENEPITHELKARZ', formState.InvasivesPlattenepithelkarzinom );
                    doc = addField( doc, 'INVASIVADENOKARZ', formState.InvasivesAdenokarzinom );
                    doc = addField( doc, 'SONSTMETAPLASIEBEFUNDE', formState.sonstigeBefunde37 );
                    doc = addField( doc, 'SONSTBEFBIOPSKUERET', [formState['1sonstigeBefunde38'], formState['2sonstigeBefunde38']] );
                    doc = addField( doc, 'EMPFOHLENEMASSNAHMEBIOPS', formState.EmpfohleneManahme );
                    doc = addField( doc, 'EMPFOHLENEKONTRABKL', formState.EmpfehlungKontolleAbklaerung );
                    doc = addField( doc, 'ZEITHORIZONTKONTRABKL', formState.ZeithorizontweitereKolposkopie );
                    doc = addField( doc, 'ZEITHORIZONT', formState.Zeithorizont );
                    // TODO: form saves values like `0  1` so replace can be removed with new editor
                    doc = addField( doc, 'THERAPIEEMPFEHLUNG', (formState.Therapieempfehlung || '').replace( /\s/g, '' ) );
                    doc = addField( doc, 'SONSTOPEINGR', [formState['1SonstigeoperativeEingriffe44'], formState['2SonstigeoperativeEingriffe44']] );
                    doc = addField( doc, 'WEITERETHERAPIEEMPF', [formState.weitereTherapieempfehlungen1, formState.weitereTherapieempfehlungen2] );
                    doc = addField( doc, 'OPDATUM', formState.OPdate );
                    doc = addField( doc, 'ARTOPEINGRIFF', formState.DurchfuehrungoperativerEingriff );
                    doc = addField( doc, 'METHOKONISATION', formState.MethodeKonisation );
                    doc = addField( doc, 'TIEFEKONUS', formState.TiefeKonus );
                    doc = addField( doc, 'METHOEXZISION', formState.MethodeExzision );
                    doc = addField( doc, 'UMFANGEXZISION', formState.UmfangExzision );
                    doc = addField( doc, 'SONSTOPEINGR2', [formState['1SonstigeoperativeEingriffe52'], formState['1SonstigeoperativeEingriffe521']] );
                    doc = addField( doc, 'ENDHISTOLBEFUNDVORH', formState.endueltigerhistoBefund );
                    // TODO: form saves values like `0  1` so replace can be removed with new editor
                    doc = addField( doc, 'GRADING', (formState.Grading || '').replace( /\s/g, '' ) );
                    doc = addField( doc, 'STAGINGFIGO', formState.StagingFIGO );
                    doc = addField( doc, 'TNMPT', formState.StagingpT );
                    doc = addField( doc, 'TNMPN', formState.StagingpN );
                    doc = addField( doc, 'TNMPM', formState.StagingpM );
                    break;
                case 'ZKH':
                    doc = addField( doc, 'DATUMUNT', formState.HPVTestdate );
                    doc = addField( doc, 'UNTERSUCHUNGSNUMMER', formState.PatUntersuchungsnr );
                    doc = addField( doc, 'PZNVORHANDEN', formState.hatHPVTextPZN );
                    doc = addField( doc, 'PZN', formState.HPVTestPZN );
                    doc = addField( doc, 'PRODUKT', [formState.HPVTestProduktname1, formState.HPVTestProduktname2] );
                    doc = addField( doc, 'HPVTERGEBNIS', formState.HPVTestErgebnis );
                    doc = addField( doc, 'HPVVIRUSTYP', formState.Virustyp );
                    break;
                case 'ZKP':
                    doc = addField( doc, 'PLZ3stellig', formState.PatPLZ.substring( 0, 3 ) );
                    doc = addField( doc, 'DATUMUNT', formState.Primärscreeningdate );
                    doc = addField( doc, 'HPVIMPFUNG', formState.HPVImpfung );
                    doc = addField( doc, 'PRODUKT', [formState.NameHPVImpfstoff1, formState.NameHPVImpfstoff2] );
                    doc = addField( doc, 'HERKUNFTIMPFSTATUS', formState.FeststellungImpfstatus );
                    doc = addField( doc, 'ARTUANLUNT', formState.ArtAnlassUntersuchung );
                    doc = addField( doc, 'BEFUNDEVORUNTVORH', formState.vorherigeBefunde );
                    doc = addField( doc, 'HERKUNFTERGEBVORU', formState.Ergebnisdokumentation );
                    doc = addField( doc, 'VORUNTDATUM', formState.letzteUntersuchungdate ? moment( formState.letzteUntersuchungdate ).format( 'MM.YYYY' ) : '' );
                    doc = addField( doc, 'ZYTBEFUNDVORUNTVORH', formState.BefundZytoNomenklaturlll_1 );
                    doc = addField( doc, 'ZYTBEFUNDVORUNT', formState.VorbefundZytoNomenklaturlll );
                    doc = addField( doc, 'ZYTBEFUNDVORUNT01', formState.VorbefundZyto0l );
                    doc = addField( doc, 'ZYTBEFUNDVORUNTII', formState.VorbefundZytoGruppell );
                    doc = addField( doc, 'ZYTBEFUNDVORUNTIII', formState.VorbefundZytoGruppelll );
                    doc = addField( doc, 'ZYTBEFUNDVORUNTIIID', formState.VorbefundZytoGruppelllD );
                    doc = addField( doc, 'ZYTBEFUNDVORUNTIV', formState.VorbefundZytoGruppeIV );
                    doc = addField( doc, 'ZYTBEFUNDVORUNTV', formState.VorbefundZytoGruppeV );
                    doc = addField( doc, 'HPVTVORUNTVORHAND', formState.HPVTestErgebnis_2 );
                    doc = addField( doc, 'HPVTVORBEFUND', formState.VorbefundHPVTestErgebnis );
                    doc = addField( doc, 'HPVVIRUSTYPVORBEFUND', formState.VorbefundVirustyp );
                    doc = addField( doc, 'HISTOLOGVORBEFUNDVORUNT', formState.VorbefundHisto );
                    doc = addField( doc, 'METAPLASIEVORGAENGE', formState.EinstufungDysplasievorgaenge );
                    doc = addField( doc, 'ADENOCARCINOMAINSITU', formState.AIS !== '?' ? formState.AIS : '' );
                    doc = addField( doc, 'INVASIVPLATTENEPITHELKARZ', formState.InvasivesPlattenepithelkarzinom );
                    doc = addField( doc, 'INVASIVADENOKARZ', formState.InvasivesAdenokarzinom );
                    doc = addField( doc, 'SONSTMETAPLASIEBEFUNDE', formState.SonstigeBefunde31 );
                    doc = addField( doc, 'SONSTBEFUNDE', [formState['1SonstigeBefunde32'], formState['2SonstigeBefunde32']] );
                    doc = addField( doc, 'ANAMABWEICHVORUNT', formState.Abweichungen );
                    doc = addField( doc, 'AUSFLUSSPATHBLUTUNG', formState.AusflusspathBlutungen );
                    doc = addField( doc, 'IUP', formState.IUP );
                    doc = addField( doc, 'HORMONANWENDUNGEN', formState.EinnahmeOvuhemmerSonstigeHormone );
                    doc = addField( doc, 'GYNOPRADIATIO', formState.ZustandnachGynOPRadiatio );
                    doc = addField( doc, 'GRAVIDITAET', formState.Schwangerschaft );
                    doc = addField( doc, 'KLINISCHERBEFUND', formState.KlinischerBefund );
                    doc = addField( doc, 'UNTERSUCHUNGSNUMMER', formState.UntersuchungsnummerZyto );
                    doc = addField( doc, 'ZYTBEFUND', formState.BefundZytoNomenklaturlll );
                    doc = addField( doc, 'ZYTBEFUND01', formState.BefundZytoGruppe0i );
                    doc = addField( doc, 'ZYTBEFUNDII', formState.BefundZytoGruppell );
                    doc = addField( doc, 'ZYTBEFUNDIII', formState.BefundZytoGruppelll );
                    doc = addField( doc, 'ZYTBEFUNDIIID', formState.BefundZytoGruppelllD );
                    doc = addField( doc, 'ZYTBEFUNDIV', formState.BefundZytoGruppeIV );
                    doc = addField( doc, 'ZYTBEFUNDV', formState.BefundZytoGruppeV );
                    doc = addField( doc, 'HPVTEST', formState.HPVTest );
                    doc = addField( doc, 'HPVTERGEBNIS', formState.HPVTestErgebnis_1 );
                    doc = addField( doc, 'HPVVIRUSTYP', formState.Virustyp );
                    doc = addField( doc, 'EMPFOHLENEMASSNAHME', formState.EmpfohleneMaßnahme );
                    doc = addField( doc, 'EMPFOHLENEKONTRABKL', formState.EmpfehlungKontrolleAbklaerung );
                    doc = addField( doc, 'ZEITHORIZONTKONTRABKL', formState.ZeithorizontKontrolleAbklaerung );
                    doc = addField( doc, 'ZEITHORIZONT', formState.Zeithorizont );
                    break;
                case 'ZKZ':
                    doc = addField( doc, 'DATUMUNT', formState.ZytotestUntersuchungsdate );
                    doc = addField( doc, 'UNTERSUCHUNGSNUMMER', formState.PatUntersuchungsnr );
                    doc = addField( doc, 'METHOABSTRENTNAHME', formState.MethodeAbstrichentnahmeAufbereitung );
                    doc = addField( doc, 'PRODUKT', [formState.NameDünnschichtzytoTest1, formState.NameDünnschichtzytoTest2] );
                    doc = addField( doc, 'ZYTBEFUND', formState.BefundZytoNomenklaturlll );
                    doc = addField( doc, 'ZYTBEFUND01', formState.BefundZytoGruppe0l );
                    doc = addField( doc, 'ZYTBEFUNDII', formState.BefundZytoGruppell );
                    doc = addField( doc, 'ZYTBEFUNDIII', formState.BefundZytoGruppelll );
                    doc = addField( doc, 'ZYTBEFUNDIIID', formState.BefundZytoGruppelllD );
                    doc = addField( doc, 'ZYTBEFUNDIV', formState.BefundZytoGruppeIV );
                    doc = addField( doc, 'ZYTBEFUNDV', formState.BefundZytoGruppeV );
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

        function software( doc ) {
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
                    V: '2020 PB V05'
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
            return convert( context, okfeDocProcessConfig );
        }

        Y.namespace( 'doccirrus' ).okfeFileBuilder = {
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

