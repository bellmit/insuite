/* global db:true */
print( '==== KAT-399: Q-DOCU ====' );
db = db.getSiblingDB( "2222222222" );
let count = 0;
const formNames = [ 'ZKA', 'ZKP', 'ZKH', 'ZKZ' ];
const formTotal = db.documents.find( {
    'formState.formName': { $in: formNames },
    type: 'FORM',
    activityId: {$exists: true},
    patientId: {$exists: true},
    caseFolderId: {$exists: true},
    formId: {$exists: true}
} ).count();
print('Founded total ' + formTotal + ' documents.')

let result = db.documents.aggregate([
    {
        $match: {
            'formState.formName': { $in: formNames },
            type: 'FORM',
            activityId: {$exists: true},
            patientId: {$exists: true},
            caseFolderId: {$exists: true},
            formId: {$exists: true}
        }
    },
        {
            $addFields: {
                activityIdObj: {$toObjectId: '$activityId'}
            }
        },
        {
            $lookup: {
                from: 'activities',
                localField: 'activityIdObj',
                foreignField: '_id',
                as: 'activity'
            }
        },
        {
            $group: {
                _id: {
                    locationId: '$locationId'
                },
                documents: {$addToSet: '$$ROOT'}
            }
        },
        {
            $project: {
                locationId: '$_id.locationId',
                documents: '$documents'
            }
        }
    ]
);
if (result._batch) {
    result = result._batch;
}
    // print(JSON.stringify(result));
    const makeMigration = (document) => {
        const activity = document.activity[0];
        const formState = document.formState;

        const newActivity = {
            actType : "QDOCU",
            module: document.formState.formName,
            userContent: document.formState.formName,
            content: document.formState.formName,
            locationId: activity.locationId,
            patientId: activity.patientId,
            timestamp: activity.timestamp,
            caseFolderId: activity.caseFolderId,
            editor: activity.editor,
            employeeName: activity.employeeName,
            patientLastName: activity.patientLastName,
            patientFirstName: activity.patientFirstName,
            lastChanged: activity.lastChanged,
            kasseiknr: formState.KennzeichenKK,
            versichertenidneu: formState.eGKVersichertennr,
            bsnrambulant: formState.BSNR,
            lanr: formState.LANR,
            idnrpat: formState.PatIdentnr,
            gebdatum: new Date(formState.Patdob)
        }
        switch( document.formState.formName ) {
            case 'ZKA':
                newActivity.datumunt = new Date(formState.OPdate);
                newActivity.zytbefundvorunt = formState.VorbefundZytoNomenklaturlll;
                newActivity.zytbefundvorunt01 = formState.VorbefundZytoGruppe0l;
                newActivity.zytbefundvoruntii = formState.VorbefundZytoGruppell;
                newActivity.zytbefundvoruntiii = formState.VorbefundZytoGruppelll;
                newActivity.zytbefundvoruntiiid = formState.VorbefundZytoGruppelllD;
                newActivity.zytbefundvoruntiv = formState.VorbefundZytoGruppeIV;
                newActivity.zytbefundvoruntv = formState.VorbefundZytoGrupeV;
                newActivity.hpvtvoruntvorhand = formState.VorbefundHPV;
                newActivity.hpvtvorbefund = formState.VorbefundHPVErgebnis;
                newActivity.hpvvirustypvorbefund = formState.VorbefundVirustyp;
                newActivity.zervixeinstellbar = formState.ZervixEinstellbar;
                newActivity.kolposkbefund = formState.KolposkopischerBefund;
                newActivity.pzgsichtbar = formState.SichtbarkeitPZG;
                newActivity.tztyp = formState.TypTZ;
                newActivity.normalbefund = formState.Normalbefund;
                newActivity.gradabnbefunde = formState.EinstufungabnormenBefunde;
                newActivity.verdachtais = formState.VerdachtAIS;
                newActivity.lokalabnbefunde = formState.LokalisationabnormenBefunde;
                newActivity.groesselaesion = formState.GroeßeLaesion;
                newActivity.verdachtinvasion = formState.VerdachtInvasion;
                newActivity.weiterebefunde = formState.weitereBefunde;
                newActivity.kongenanomalie = formState.kongenitaleAnomalie;
                newActivity.kondylome = formState.Kondylome;
                newActivity.endometriose = formState.Endometriose;
                newActivity.ektoendopolypen = formState.Polypen;
                newActivity.entzuendung = formState.Entzuendung;
                newActivity.stenose = formState.Stenose;
                newActivity.postopveraend = formState.PostOPVeraenderung;
                newActivity.sonstweitbefunde = formState.Sonstige32;
                newActivity.sonstbefunde =  [formState['1Sonstige33'], formState['2Sonstige33']];
                newActivity.massnahmen = formState.Maßnahmen;
                newActivity.anzahlbiopsien = formState.AnzahlBiopsien;
                newActivity.befundbiopskueret = formState.Befund;
                newActivity.metaplasievorgaenge = formState.EinstufungDysplasievorgaenge;
                newActivity.adenocarcinomainsitu = formState.AIS !== '?' ? formState.AIS : '';
                newActivity.invasivplattenepithelkarz = formState.InvasivesPlattenepithelkarzinom;
                newActivity.invasivadenokarz = formState.InvasivesAdenokarzinom;
                newActivity.sonstmetaplasiebefunde = formState.sonstigeBefunde37;
                newActivity.sonstbefbiopskueret  = [formState['1sonstigeBefunde38'], formState['2sonstigeBefunde38']];
                newActivity.empfohlenemassnahmebiops = formState.EmpfohleneManahme;
                newActivity.empfohlenekontrabkl = formState.EmpfehlungKontolleAbklaerung;
                newActivity.zeithorizontkontrabkl = formState.ZeithorizontweitereKolposkopie;
                newActivity.zeithorizont = formState.Zeithorizont;
                newActivity.therapieempfehlung = formState.Therapieempfehlung;
                // newActivity.therapieempfehlung = [formState['1SonstigeoperativeEingriffe44'], formState['2SonstigeoperativeEingriffe44']];
                // newActivity.therapieempfehlung = [formState.weitereTherapieempfehlungen1, formState.weitereTherapieempfehlungen2];
                newActivity.opdatum = formState.OPdate;
                newActivity.artopeingriff = formState.DurchfuehrungoperativerEingriff;
                newActivity.methokonisation = formState.MethodeKonisation;
                newActivity.tiefekonus = formState.TiefeKonus;
                newActivity.methoexzision = formState.MethodeExzision;
                newActivity.umfangexzision = formState.UmfangExzision;
                // newActivity.therapieempfehlung = [formState['1SonstigeoperativeEingriffe52'], formState['1SonstigeoperativeEingriffe521']];
                newActivity.endhistolbefundvorh = formState.endueltigerhistoBefund;
                newActivity.grading = formState.Grading;
                newActivity.stagingfigo = formState.StagingFIGO;
                newActivity.tnmpt = formState.StagingpT;
                newActivity.tnmpn = formState.StagingpN;
                newActivity.tnmpm = formState.StagingpM;
                break;
            case 'ZKH':
                newActivity.datumunt = new Date(formState.HPVTestdate);
                newActivity.untersuchungsnummer = formState.PatUntersuchungsnr;
                newActivity.pznvorhanden = formState.hatHPVTextPZN;
                newActivity.pzn = formState.HPVTestPZN;
                newActivity.produkt = [formState.HPVTestProduktname1, formState.HPVTestProduktname2];
                newActivity.hpvtergebnis = formState.HPVTestErgebnis;
                newActivity.hpvvirustyp = formState.Virustyp;
                break;
            case 'ZKP':
                newActivity.plz3stellig = formState.PatPLZ;
                newActivity.datumunt = new Date(formState.Primärscreeningdate);
                newActivity.hpvimpfung = formState.HPVImpfung;
                newActivity.produkt = [formState.NameHPVImpfstoff1, formState.NameHPVImpfstoff2];
                newActivity.herkunftimpfstatus = formState.FeststellungImpfstatus;
                newActivity.artuanlunt = formState.ArtAnlassUntersuchung;
                newActivity.befundevoruntvorh = formState.vorherigeBefunde;
                newActivity.herkunftergebvoru = formState.Ergebnisdokumentation;
                newActivity.voruntdatum = formState.letzteUntersuchungdate;
                newActivity.zytbefundvoruntvorh = formState.BefundZytoNomenklaturlll_1;
                newActivity.zytbefundvorunt = formState.VorbefundZytoNomenklaturlll;
                newActivity.zytbefundvorunt01 = formState.VorbefundZyto0l;
                newActivity.zytbefundvoruntii = formState.VorbefundZytoGruppell;
                newActivity.zytbefundvoruntiii = formState.VorbefundZytoGruppelll;
                newActivity.zytbefundvoruntiiid = formState.VorbefundZytoGruppelllD;
                newActivity.zytbefundvoruntiv = formState.VorbefundZytoGruppeIV;
                newActivity.zytbefundvoruntv = formState.VorbefundZytoGruppeV;
                newActivity.hpvtvoruntvorhand = formState.HPVTestErgebnis_2;
                newActivity.hpvtvorbefund = formState.VorbefundHPVTestErgebnis;
                newActivity.hpvvirustypvorbefund = formState.VorbefundVirustyp;
                newActivity.histologvorbefundvorunt = formState.VorbefundHisto;
                newActivity.metaplasievorgaenge = formState.EinstufungDysplasievorgaenge;
                newActivity.adenocarcinomainsitu = formState.AIS !== '?' ? formState.AIS : '';
                newActivity.invasivplattenepithelkarz = formState.InvasivesPlattenepithelkarzinom;
                newActivity.invasivadenokarz = formState.InvasivesAdenokarzinom;
                newActivity.sonstmetaplasiebefunde = formState.SonstigeBefunde31;
                newActivity.sonstbefunde = [formState['1SonstigeBefunde32'], formState['2SonstigeBefunde32']];
                newActivity.anamabweichvorunt = formState.Abweichungen;
                newActivity.ausflusspathblutung = formState.AusflusspathBlutungen;
                newActivity.iup = formState.IUP;
                newActivity.hormonanwendungen = formState.EinnahmeOvuhemmerSonstigeHormone;
                newActivity.gynopradiatio = formState.ZustandnachGynOPRadiatio;
                newActivity.graviditaet = formState.Schwangerschaft;
                newActivity.klinischerbefund = formState.KlinischerBefund;
                newActivity.untersuchungsnummer = formState.UntersuchungsnummerZyto;
                newActivity.zytbefund = formState.BefundZytoNomenklaturlll;
                newActivity.zytbefund01 = formState.BefundZytoGruppe0i;
                newActivity.zytbefundii = formState.BefundZytoGruppell;
                newActivity.zytbefundiii = formState.BefundZytoGruppelll;
                newActivity.zytbefundiiid = formState.BefundZytoGruppelllD;
                newActivity.zytbefundiv = formState.BefundZytoGruppeIV;
                newActivity.zytbefundv = formState.BefundZytoGruppeV;
                newActivity.hpvtest = formState.HPVTest;
                newActivity.hpvtergebnis = formState.HPVTestErgebnis_1;
                newActivity.hpvvirustyp = formState.Virustyp;
                newActivity.empfohlenemassnahme = formState.EmpfohleneMaßnahme;
                newActivity.empfohlenekontrabkl = formState.EmpfehlungKontrolleAbklaerung;
                newActivity.zeithorizontkontrabkl = formState.ZeithorizontKontrolleAbklaerung;
                newActivity.zeithorizont = formState.Zeithorizont;
                break;
            case 'ZKZ':
                newActivity.datumunt = new Date(formState.ZytotestUntersuchungsdate);
                newActivity.untersuchungsnummer = formState.PatUntersuchungsnr;
                newActivity.methoabstrentnahme = formState.MethodeAbstrichentnahmeAufbereitung;
                newActivity.produkt = [formState.NameDünnschichtzytoTest1, formState.NameDünnschichtzytoTest2];
                newActivity.zytbefund = formState.BefundZytoNomenklaturlll;
                newActivity.zytbefund01 = formState.BefundZytoGruppe0l;
                newActivity.zytbefundii = formState.BefundZytoGruppell;
                newActivity.zytbefundiii = formState.BefundZytoGruppelll;
                newActivity.zytbefundiiid = formState.BefundZytoGruppelllD;
                newActivity.zytbefundiv = formState.BefundZytoGruppeIV;
                newActivity.zytbefundv = formState.BefundZytoGruppeV;
                break;
        }
        db.activities.insert(newActivity);
        count++;
    };

    if (Array.isArray(result)) {
        for (let i = 0; i < result.length; i ++) {
            const locationGroup = result[i];
            for (let j = 0; j < locationGroup.documents.length; j ++) {
                makeMigration(locationGroup.documents[j]);
            }
        }
    } else {
        result.documents.foreach( document => {
            makeMigration( document );
        } )
    }


print( '==== KAT-399: Created ' + count + ' activity items (from ' + formTotal + ' documents total) from formular documents ====' );
