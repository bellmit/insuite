/**
 * User: michael.kleinert
 * Date: 2/2/21  9:15 AM
 * (c) 2021, Doc Cirrus GmbH, Berlin
 */

/* global YUI */
YUI.add( 'edocletterxml-api', function( Y, NAME ) {
        const
            moment = require( 'moment' ),
            xml2js = require( 'xml2js' ),
            path = require( 'path' ),
            fs = require( 'fs' ),
            libxmljs = require( 'libxmljs' ),
            DC_OID = '1.2.276.0.76.3.1.460',

            /**
             * Helper function to throw TypeErrors from tenary operators used inside constructors.
             * @param {string} message
             */
            throwTypeError = function throwTypeError( message ) {
                throw new TypeError( message );
            };

        const

            /**
             * Confidentiality codes to classify the document.
             * Limited for the eDocLetter to "N"|"R"|"V".
             * @see https://hl7.de/wp-content/uploads/Leitfaden-VHitG-Arztbrief-v150.pdf
             * @see https://wiki.hl7.de/index.php?title=2.16.840.1.113883.5.25
             * @type {Readonly<{Restricted: string, VeryRestricted: string, Normal: string}>}
             * @enum {string}
             */
            ConfidentialityCode = Object.freeze( {
                Normal: "N",
                Restricted: "R",
                VeryRestricted: "V"
            } ),

            /**
             * @see https://www.hl7.org/fhir/valueset-name-part-qualifier.html
             * @enum {string}
             * @type {Readonly<{Initial: string}>}
             */
            PersonNamePartQualifier = Object.freeze( {
                Initial: "IN"
            } ),

            /**
             * @see https://www.hl7.org/fhir/valueset-name-part-qualifier.html
             * @enum {string}
             * @type {Readonly<{Professional: string, Nobility: string, Academic: string, Location: string}>}
             */
            PersonNamePartAffixTypes = Object.freeze( {
                Academic: "AC",
                Nobility: "NB",
                Location: "VV",
                Professional: "PR"
            } ),

            /**
             * @see https://www.hl7.org/fhir/valueset-name-part-qualifier.html
             * @enum {string}
             * @type {Readonly<{Acquired: string, Spouse: string, Birth: string}>}
             */
            PersonNamePartChangeQualifier = Object.freeze( {
                Acquired: "AD",
                Birth: "BR",
                Spouse: "SP"
            } ),

            /**
             * @see https://www.hl7.org/fhir/valueset-name-part-qualifier.html
             * @enum {string}
             * @type {Readonly<{CallMe: string}>}
             */
            PersonNamePartMiscQualifier = Object.freeze( {
                CallMe: "CL"
            } ),

            /**
             * @see https://www.hl7.org/fhir/valueset-name-part-qualifier.html
             * @enum {string}
             * @type {Readonly<{Noble: string, Academic: string, Location: string}>}
             */
            EntityNamePartQualifier = Object.freeze( {
                ...PersonNamePartQualifier,
                ...PersonNamePartAffixTypes,
                ...PersonNamePartChangeQualifier,
                ...PersonNamePartMiscQualifier
            } ),

            /**
             * Code which specifies the document type.
             * @see https://hl7.de/wp-content/uploads/Leitfaden-VHitG-Arztbrief-v150.pdf
             * @type {Readonly<{OperativeNote: string, EchocardiogramReport: string, VisitNote: string, EmergencyVisitNote: string, HistoryAndPhysicalNote: string, TransferSummaryNurse: string, ArthroscopyReport: string, CardiacCatheterizationReport: string, ProcedureNote: string, CTReport: string, RadiologyReport: string, ProgressNote: string, AutopsyReport: string, ConsultationNote: string, SummarizationOfEpisodeNote: string, SocialServiceReport: string, TransferSummaryPhysician: string}>}
             * @enum {string}
             */
            DocumentTypeCode = Object.freeze( {
                SummarizationOfEpisodeNote: "34133-9",
                DischargeSummarizationNoteAmbulantHealthCareProf: "18842-5",
                DischargeSummarizationNoteAmbulantPhysician: "11490-0",
                DischargeSummarizationNoteAmbulantCareService: "34745-0",
                DischargeSummarizationNoteHospitalHealthCareProf: " 34105-7",
                DischargeSummarizationNoteHospitalPhysician: "34106-5",
                TransferSummarizationNoteAmbulantHealthCareProf: "18761-7",
                TransferSummarizationNoteAmbulantPhysician: "28616-1",
                TransferSummarizationNoteAmbulantCareService: "28651-8",
                ArthroscopyReport: "18742-7",
                AutopsyReport: "18743-5",
                CardiacCatheterizationReport: "18745-0",
                ConsultationNote: "11488-4",
                CTReport: "18747-6",
                EchocardiogramReport: "11520-4",
                EmergencyVisitNote: "15507-7",
                HistoryAndPhysicalNote: "11492-6",
                OperativeNote: "11504-8",
                ProcedureNote: "11505-5",
                ProgressNote: "11506-3",
                RadiologyReport: "11522-0",
                SocialServiceReport: "11519-6",
                TransferSummaryPhysician: "28616-1",
                TransferSummaryNurse: "28651-8",
                VisitNote: "11542-8"
            } ),

            /**
             * @see https://www.hl7.org/fhir/v3/ServiceDeliveryLocationRoleType/vs.html
             * @enum {string}
             * @type {Readonly<{CardiacCatheterizationLab: string, CoronaryCareUnit: string, IntellectualImpairmentCenter: string, RadiologyDiagnosticsOrTherapeuticsUnit: string, physicalImpairmentHearingCenter: string, ChestUnit: string, ChronicCareFacility: string, NeuroradiologyUnit: string, ParentsWithAdjustmentDifficultiesCenter: string, RehabilitationHospital: string, RadiationOncologyUnit: string, Hospital: string, physicalImpairmentVisualSkillsCenter: string, physicalImpairmentMotorSkillsCenter: string, HospitalUnit: string, HospitalsGeneralAcuteCareHospital: string, EndoscopyLab: string, MilitaryHospital: string, BoneMarrowTransplantUnit: string, EpilepsyUnit: string, PhysicalImpairmentCenter: string, DiagnosticsOrTherapeuticsUnit: string, PsychatricCareFacility: string, AddictionTreatmentCenter: string, YouthsWithAdjustmentDifficultiesCenter: string, GastroenterologyDiagnosticsOrTherapeuticsLab: string, CardiovascularDiagnosticsOrTherapeuticsUnit: string, Emergency, EchocardiographyLab: string}>}
             */
            ServiceDeliveryLocationRoleType = Object.freeze( {
                DiagnosticsOrTherapeuticsUnit: "DX",
                CardiovascularDiagnosticsOrTherapeuticsUnit: "CVDX",
                CardiacCatheterizationLab: "CATH",
                EchocardiographyLab: "ECHO",
                GastroenterologyDiagnosticsOrTherapeuticsLab: "GIDX",
                EndoscopyLab: "ENDOS",
                RadiologyDiagnosticsOrTherapeuticsUnit: "RADDX",
                RadiationOncologyUnit: "RADO",
                NeuroradiologyUnit: "RNEU",
                Hospital: "HOSP",
                ChronicCareFacility: "CHR",
                HospitalsGeneralAcuteCareHospital: "GACH",
                MilitaryHospital: "MHSP",
                PsychatricCareFacility: "PSYCHF",
                RehabilitationHospital: "RH",
                AddictionTreatmentCenter: "RHAT",
                IntellectualImpairmentCenter: "RHII",
                ParentsWithAdjustmentDifficultiesCenter: "RHMAD",
                PhysicalImpairmentCenter: "RHPI",
                physicalImpairmentHearingCenter: "RHPIH",
                physicalImpairmentMotorSkillsCenter: "RHPIMS",
                physicalImpairmentVisualSkillsCenter: "RHPIVS",
                YouthsWithAdjustmentDifficultiesCenter: "RHYAD",
                HospitalUnit: "HU",
                BoneMarrowTransplantUnit: "BMTU",
                CoronaryCareUnit: "CCU",
                ChestUnit: "CHEST",
                EpilepsyUnit: "EPIL",
                EmergencyRoom: "ER",
                EmergencyTraumaUnit: "ETU",
                HemodialysisUnit: "HD",
                HospitalLaboratory: "HLAB",
                inpatientLaboratory: "INLAB",
                outpatientLaboratory: "OUTLAB",
                radiologyUnit: "HRAD",
                specimenCollectionSite: "HUSCS",
                IntensiveCareUnit: "ICU",
                PediatricIntensiveCareUnit: "PEDICU",
                PediatricNeonatalIntensiveCareUnit: "PEDNICU",
                InpatientPharmacy: "INPHARM",
                MedicalLaboratory: "MBL",
                NeurologyCriticalCareAndStrokeUnit: "NCCS",
                NeurosurgeryUnit: "NS",
                OutpatientPharmacy: "OUTPHARM",
                PediatricUnit: "PEDU",
                PsychiatricHospitalUnit: "PHU",
                RehabilitationHospitalUnit: "RHU",
                SleepDisordersUnit: "SLEEP",
                NursingOrCustodialCareFacility: "NCCF",
                SkilledNursingFacility: "SNF",
                OutpatientFacility: "OF",
                AllergyClinic: "ALL",
                AmputeeClinic: "AMPUT",
                BoneMarrowTransplantClinic: "BMTC",
                BreastClinic: "BREAST",
                ChildAndAdolescentNeurologyClinic: "CANC",
                ChildAndAdolescentPsychiatryClinic: "CAPC",
                AmbulatoryHealthCareFacilitiesClinicCenterRehabilitationCardiacFacilities: "CARD",
                PediatricCardiologyClinic: "PEDCARD",
                CoagulationClinic: "COAG",
                ColonAndRectalSurgeryClinic: "CRS",
                DermatologyClinic: "DERM",
                EndocrinologyClinic: "ENDO",
                PediatricEndocrinologyClinic: "PEDE",
                OtorhinolaryngologyClinic: "ENT",
                FamilyMedicineClinic: "FMC",
                GastroenterologyClinic: "GI",
                PediatricGastroenterologyClinic: "PEDGI",
                GeneralInternalMedicineClinic: "GIM",
                GynecologyClinic: "GYN",
                HematologyClinic: "HEM",
                PediatricHematologyClinic: "PEDHEM",
                HypertensionClinic: "HTN",
                ImpairmentEvaluationCenter: "IEC",
                InfectiousDiseaseClinic: "INFD",
                PediatricInfectiousDiseaseClinic: "PEDID",
                InfertilityClinic: "INV",
                LympedemaClinic: "LYMPH",
                MedicalGeneticsClinic: "MGEN",
                NephrologyClinic: "NEPH",
                PediatricNephrologyClinic: "PEDNEPH",
                NeurologyClinic: "NEUR",
                ObstetricsClinic: "OB",
                OralAndMaxillofacialSurgeryClinic: "OMS",
                MedicalOncologyClinic: "ONCL",
                PediatricOncologyClinic: "PEDHO",
                OpthalmologyClinic: "OPH",
                optometryClinic: "OPTC",
                OrthopedicsClinic: "ORTHO",
                HandClinic: "HAND",
                PainClinic: "PAINCL",
                PrimaryCareClinic: "PC",
                PediatricsClinic: "PEDC",
                PediatricRheumatologyClinic: "PEDRHEUM",
                PodiatryClinic: "POD",
                PreventiveMedicineClinic: "PREV",
                ProctologyClinic: "PROCTO",
                ProvidersOffice: "PROFF",
                ProsthodonticsClinic: "PROS",
                PsychologyClinic: "PSI",
                PsychiatryClinic: "PSY",
                RheumatologyClinic: "RHEUM",
                SportsMedicineClinic: "SPMED",
                SurgeryClinic: "SU",
                PlasticSurgeryClinic: "PLS",
                UrologyClinic: "URO",
                TransplantClinic: "TR",
                TravelAndGeographicMedicineClinic: "TRAVEL",
                WoundClinic: "WND",
                ResidentialTreatmentFacility: "RTF",
                PainRehabilitationCenter: "PRC",
                SubstanceUseRehabilitationFacility: "SURF",
                DeliveryAddress: "DADDR",
                MobileUnit: "MOBL",
                Ambulance: "AMB",
                Pharmacy: "PHARM",
                AccidentSite: "ACC",
                CommunityLocation: "COMM",
                CommunityServiceCenter: "CSC",
                PatientsResidence: "PTRES",
                School: "SCHOOL",
                UnderageProtectionCenter: "UPC",
                WorkSite: "WORK"
            } ),

            /**
             * Communication types.
             * @see https://hl7.de/wp-content/uploads/Leitfaden-VHitG-Arztbrief-v150.pdf
             * @type {Readonly<{tel: string, mailto: string, fax: string}>}
             * @enum {string}
             */
            TelecommunicationType = Object.freeze( {
                tel: "tel",
                fax: "fax",
                mailto: "mailto",
                http: "http",
                https: "https"
            } ),

            /**
             * NULLFLAVOR types, if no communication is provided.
             * @see https://hl7.de/wp-content/uploads/Leitfaden-VHitG-Arztbrief-v150.pdf
             * @type {Readonly<{TemporarilyUnavailable: string, AskedButUnknown: string, Unknown: string, NotAsked: string}>}
             * @enum {string}
             */
            NullFlavorType = Object.freeze( {
                Unknown: "UNK",
                NotAsked: "NASK",
                TemporarilyUnavailable: "NAV",
                AskedButUnknown: "ASKU"
            } ),

            /**
             * Address use type.
             * @see https://wiki.hl7.de/index.php?title=v3dtr1:AD
             * @type {Readonly<{PostalAddress: string, VacationHome: string, VisitAddress: string, WorkPlace: string, PrimaryHome: string}>}
             * @enum {string}
             */
            PostalAddressUse = Object.freeze( {
                VisitAddress: "PHYS",
                PostalAddress: "PST",
                PrimaryHome: "HP",
                VacationHome: "HV",
                WorkPlace: "WP"
            } ),

            /**
             * AdministrativeGender as defined in HL7.
             * OID: 2.16.840.1.113883.5.1
             * @see https://hl7.de/wp-content/uploads/Leitfaden-VHitG-Arztbrief-v150.pdf
             * @see https://wiki.hl7.de/index.php?title=2.16.840.1.113883.5.1
             * @type {Readonly<{Undifferentiated: string, Female: string, Male: string}>}
             * @enum {string}
             */
            AdministrativeGender = Object.freeze( {
                Female: "F",
                Male: "M",
                Undifferentiated: "UN"
            } ),

            /**
             * Participation role.
             * @type {Readonly<{PrimaryRecipient: string, SecondaryRecipient: string}>}
             * @enum {string}
             */
            InformationRecipientRole = Object.freeze( {
                PrimaryRecipient: "PRCP",
                SecondaryRecipient: "TRC"
            } ),

            /**
             * @see https://www.hl7.org/fhir/valueset-encounter-participant-type.html
             * @enum {string}
             * @type {Readonly<{Attender: string, Admitter: string, Discharger: string, Referrer: string, Consultant: string}>}
             */
            EncounterParticipantType = Object.freeze( {
                Admitter: "ADM",
                Attender: "ATND",
                Consultant: "CON",
                Discharger: "DIS",
                Referrer: "REF"
            } ),

            /**
             * @see https://terminology.hl7.org/2.0.0/CodeSystem-v3-ParticipationType.html
             * @see http://art-decor.org/decor/services/RetrieveValueSet?id=2.16.840.1.113883.1.11.10901&effectiveDate=&prefix=abde-&version=2017-07-07T22:34:54&format=html&collapsable=true&language=de-DE&ui=nl-NL
             * @type {Readonly<{Origin: string, DirectTarget: string, Tracker: string, PrimaryPerformer: string, Product: string, Verifier: string, SecondaryPerformer: string, Specimen: string, ReusableDevice: string, Witness: string, ReferredTo: string, Authenticator: string, IndirectTarget: string, Device: string, DataEntryPerson: string, Receiver: string, RecordTarget: string, Performer: string, Custodian: string, Donor: string, InformationRecipient: string, GuarantorParty: string, Escort: string, Catalyst: string, Transcriber: string, PrimaryInformationRecipient: string, Analyte: string, Destination: string, UgentNotificationContact: string, Remote: string, ExposureSource: string, ExposureTarget: string, CausativeAgent: string, Attender: string, Admitter: string, TherapeuticAgent: string, CoverageTarget: string, ExposureAgent: string, Discharger: string, EntryLocation: string, LegalAuthenticator: string, Informant: string, Consumable: string, Holder: string, CallbackContact: string, ExposureParticipation: string, Baby: string, ResponsibleParty: string, distributor: string, Subject: string, Via: string, NonReuseableDevice: string, AuthorOriginator: string, Referrer: string, ReferredBy: string, Consultant: string, Beneficiary: string, Location: string}>}
             * @enum {string}
             */
            ParticipationType = Object.freeze( {
                Admitter: "ADM",
                Attender: "ATND",
                CallbackContact: "CALLBCK",
                Consultant: "CON",
                Discharger: "DIS",
                Escort: "ESC",
                Referrer: "REF",
                AuthorOriginator: "AUT",
                Informant: "INF",
                Transcriber: "TRANS",
                DataEntryPerson: "ENT",
                Witness: "WIT",
                Custodian: "CST",
                DirectTarget: "DIR",
                Analyte: "ALY",
                Baby: "BBY",
                Catalyst: "CAT",
                Consumable: "CSM",
                TherapeuticAgent: "TPA",
                Device: "DEV",
                NonReuseableDevice: "NRD",
                ReusableDevice: "RDV",
                Donor: "DON",
                ExposureAgent: "EXPAGNT",
                ExposureParticipation: "EXPART",
                ExposureTarget: "EXPTRGT",
                ExposureSource: "EXSRC",
                Product: "PRD",
                Subject: "SBJ",
                Specimen: "SPC",
                IndirectTarget: "IND",
                Beneficiary: "BEN",
                CausativeAgent: "CAGNT",
                CoverageTarget: "COV",
                GuarantorParty: "GUAR",
                Holder: "HLD",
                RecordTarget: "RCT",
                Receiver: "RCV",
                InformationRecipient: "IRCP",
                UgentNotificationContact: "NOT",
                PrimaryInformationRecipient: "PRCP",
                ReferredBy: "REFB",
                ReferredTo: "REFT",
                Tracker: "TRC",
                Location: "LOC",
                Destination: "DST",
                EntryLocation: "ELOC",
                Origin: "ORG",
                Remote: "RML",
                Via: "VIA",
                Performer: "PRF",
                distributor: "DIST",
                PrimaryPerformer: "PPRF",
                SecondaryPerformer: "SPRF",
                ResponsibleParty: "RESP",
                Verifier: "VRF",
                Authenticator: "AUTHEN",
                LegalAuthenticator: "LA"
            } ),

            /**
             * Subset of ParticipationType
             * @type {Readonly<{IndirectTarget: string, CoverageTarget: string, Holder: string}>}
             * @enum {string}
             */
            ParticipationTypeForParticipant = Object.freeze( {
                IndirectTarget: "IND",
                Holder: "HLD",
                CoverageTarget: "COV"
            } ),

            /**
             * RoleClassAssociative of persons between each other.
             * @type {Readonly<{EmergencyContact: string, PolicyHolder: string, Relative: string, CoveredPersonEntity: string, Other: string}>}
             * @enum {string}
             */
            RoleClassAssociative = Object.freeze( {
                Relative: "NOK",
                EmergencyContact: "ECON",
                PolicyHolder: "POLHOLD",
                CoveredPersonEntity: "COVPTY",
                Other: "PRS"
            } ),

            /**
             * Person relationship roles.
             * @see https://www.hl7.org/fhir/v3/PersonalRelationshipRoleType/vs.html
             * @type {Readonly<{PaternalGrandfather: string, Aunt: string, MaternalGrandparent: string, Inlaw: string, NaturalMotherOfFetus: string, UnrelatedFriend: string, IdenticalTwinBrother: string, FosterMother: string, MaternalAunt: string, Roommate: string, Grandfather: string, Wife: string, PaternalGreatGrandparent: string, Stepmother: string, Child: string, SiblingInLaw: string, HalfBrother: string, ExtendedFamilyMember: string, ParentInLaw: string, Uncle: string, SonInLaw: string, halfSister: string, Stepdaughter: string, Twin: string, NaturalSibling: string, GreatGrandparent: string, PaternalUncle: string, NaturalMother: string, FosterChild: string, PaternalGrandparent: string, AdoptiveFather: string, Self: string, FatherInLaw: string, MaternalGreatGrandfather: string, GestationalMother: string, IdenticalTwinSister: string, Mother: string, FraternalTwinBrother: string, NieceNephew: string, PaternalCousin: string, MaternalGreatGrandmother: string, NaturalBrother: string, NaturalSon: string, Cousin: string, Neighbor: string, FosterFather: string, StepSibling: string, DaughterInLaw: string, AdoptiveMother: string, Son: string, NaturalSister: string, FormerSpouse: string, NaturalParent: string, Father: string, Stepson: string, PaternalAunt: string, IdenticalTwin: string, Stepsister: string, AdoptedSon: string, AdoptiveParent: string, MaternalCousin: string, AdoptedDaughter: string, GreatGrandfather: string, MaternalGrandmother: string, Brother: string, NaturalChild: string, SignificantOther: string, PaternalGreatGrandmother: string, Grandson: string, StepChild: string, TwinSister: string, NaturalFatherOfFetus: string, NaturalFather: string, FosterSon: string, FraternalTwin: string, Daughter: string, MotherInLaw: string, TwinBrother: string, Niece: string, AdoptedChild: string, MaternalGreatGrandparent: string, halfSibling: string, FamilyMember: string, Spouse: string, Stepfather: string, FosterDaughter: string, Stepbrother: string, NaturalDaughter: string, MaternalGrandfather: string, Grandmother: string, MaternalUncle: string, GreatGrandmother: string, StepParent: string, Parent: string, Sibling: string, PaternalGrandmother: string, FraternalTwinSister: string, Sister: string, DomesticPartner: string, Nephew: string, FosterParent: string, Granddaughter: string, Grandchild: string, Husband: string, BrotherInLaw: string, SisterInLaw: string, Grandparent: string, PaternalGreatGrandfather: string, ChildInLaw: string}>}
             * @enum {string}
             */
            PersonalRelationshipRoleType = Object.freeze( {
                FamilyMember: "FAMMEMB",
                Child: "CHILD",
                AdoptedChild: "CHLDADOPT",
                AdoptedDaughter: "DAUADOPT",
                AdoptedSon: "SONADOPT",
                FosterChild: "CHLDFOST",
                FosterDaughter: "DAUFOST",
                FosterSon: "SONFOST",
                Daughter: "DAUC",
                NaturalDaughter: "DAU",
                Stepdaughter: "STPDAU",
                NaturalChild: "NCHILD",
                NaturalSon: "SON",
                Son: "SONC",
                Stepson: "STPSON",
                StepChild: "STPCHLD",
                ExtendedFamilyMember: "EXT",
                Aunt: "AUNT",
                MaternalAunt: "MAUNT",
                PaternalAunt: "PAUNT",
                Cousin: "COUSN",
                MaternalCousin: "MCOUSN",
                PaternalCousin: "PCOUSN",
                GreatGrandparent: "GGRPRN",
                GreatGrandfather: "GGRFTH",
                MaternalGreatGrandfather: "MGGRFTH",
                PaternalGreatGrandfather: "PGGRFTH",
                GreatGrandmother: "GGRMTH",
                MaternalGreatGrandmother: "MGGRMTH",
                PaternalGreatGrandmother: "PGGRMTH",
                MaternalGreatGrandparent: "MGGRPRN",
                PaternalGreatGrandparent: "PGGRPRN",
                Grandchild: "GRNDCHILD",
                Granddaughter: "GRNDDAU",
                Grandson: "GRNDSON",
                Grandparent: "GRPRN",
                Grandfather: "GRFTH",
                MaternalGrandfather: "MGRFTH",
                PaternalGrandfather: "PGRFTH",
                Grandmother: "GRMTH",
                MaternalGrandmother: "MGRMTH",
                PaternalGrandmother: "PGRMTH",
                MaternalGrandparent: "MGRPRN",
                PaternalGrandparent: "PGRPRN",
                Inlaw: "INLAW",
                ChildInLaw: "CHLDINLAW",
                DaughterInLaw: "DAUINLAW",
                SonInLaw: "SONINLAW",
                ParentInLaw: "PRNINLAW",
                FatherInLaw: "FTHINLAW",
                MotherInLaw: "MTHINLAW",
                SiblingInLaw: "SIBINLAW",
                BrotherInLaw: "BROINLAW",
                SisterInLaw: "SISINLAW",
                NieceNephew: "NIENEPH",
                Nephew: "NEPHEW",
                Niece: "NIECE",
                Uncle: "UNCLE",
                MaternalUncle: "MUNCLE",
                PaternalUncle: "PUNCLE",
                Parent: "PRN",
                AdoptiveParent: "ADOPTP",
                AdoptiveFather: "ADOPTF",
                AdoptiveMother: "ADOPTM",
                Father: "FTH",
                FosterFather: "FTHFOST",
                NaturalFather: "NFTH",
                NaturalFatherOfFetus: "NFTHF",
                Stepfather: "STPFTH",
                Mother: "MTH",
                GestationalMother: "GESTM",
                FosterMother: "MTHFOST",
                NaturalMother: "NMTH",
                NaturalMotherOfFetus: "NMTHF",
                Stepmother: "STPMTH",
                NaturalParent: "NPRN",
                FosterParent: "PRNFOST",
                StepParent: "STPPRN",
                Sibling: "SIB",
                Brother: "BRO",
                HalfBrother: "HBRO",
                NaturalBrother: "NBRO",
                TwinBrother: "TWINBRO",
                FraternalTwinBrother: "FTWINBRO",
                IdenticalTwinBrother: "ITWINBRO",
                Stepbrother: "STPBRO",
                halfSibling: "HSIB",
                halfSister: "HSIS",
                NaturalSibling: "NSIB",
                NaturalSister: "NSIS",
                TwinSister: "TWINSIS",
                FraternalTwinSister: "FTWINSIS",
                IdenticalTwinSister: "ITWINSIS",
                Twin: "TWIN",
                FraternalTwin: "FTWIN",
                IdenticalTwin: "ITWIN",
                Sister: "SIS",
                Stepsister: "STPSIS",
                StepSibling: "STPSIB",
                SignificantOther: "SIGOTHR",
                DomesticPartner: "DOMPART",
                FormerSpouse: "FMRSPS",
                Spouse: "SPS",
                Husband: "HUSB",
                Wife: "WIFE",
                UnrelatedFriend: "FRND",
                Neighbor: "NBOR",
                Self: "ONESELF",
                Roommate: "ROOM"
            } ),

            /**
             * DocumentRelationshipType of persons between each other.
             * @type {Readonly<{Transformed: string, Appends: string, Replaces: string}>}
             * @enum {string}
             */
            DocumentRelationshipType = Object.freeze( {
                Appends: "APND",
                Replaces: "RPLC",
                Transformed: "XFRM"
            } ),

            /**
             * Signature code for Authenticator.
             * @enum {string}
             * @type {Readonly<{Intended: "I", Required: "X", Signed: "S"}>}
             */
            ParticipationSignature = Object.freeze( {
                Intended: "I",
                Signed: "S",
                Required: "X"
            } ),

            /**
             * EncounterCode for the documentation.
             * @type {Readonly<{InpatientEncounter: string, Virtual: string, Ambulatory: string}>}
             * @enum {string}
             */
            EncounterCode = Object.freeze( {
                InpatientEncounter: "IMP",
                Ambulatory: "AMB",
                Virtual: "VR"
            } ),

            /**
             * DischargeDispositionCode for the documentation.
             * @enum {string}
             * @type {Readonly<{LeftAgainstAdvice: string, Hospice: string, OtherHealthcareFacility: string, LongTermCare: string, AlternativeHome: string, Expired: string, Rehabilitation: string, Home: string, PsychiatricHospital: string, SkilledNursingFacility: string, Other: string}>}
             */
            DischargeDispositionCode = Object.freeze( {
                Home: "home",
                AlternativeHome: "alt-home",
                OtherHealthcareFacility: "other-hcf",
                Hospice: "hosp",
                LongTermCare: "long",
                LeftAgainstAdvice: "aadvice",
                Expired: "exp",
                PsychiatricHospital: "psy",
                Rehabilitation: "rehab",
                SkilledNursingFacility: "snf",
                Other: "oth"
            } ),

            /**
             * Commonly used OIDs, i.e. in InstanceIdentifiers.
             * @enum {string}
             * @type {Readonly<{PatientInsuranceNr: string, InsuranceIKNr: string, LANR: string, BSNR: string, InsuranceVKNr: string}>}
             */
            CodeSystemTypes = Object.freeze( {
                LANR: "1.2.276.0.76.4.16",
                BSNR: "1.2.276.0.76.4.17",
                PatientInsuranceNr: "1.2.276.0.76.4.8",
                InsuranceIKNr: "1.2.276.0.76.4.5",
                InsuranceVKNr: "1.2.276.0.76.4.7",
                AdministrativeGenderCodes: "2.16.840.1.113883.5.1",
                PersonalRelationshipRoleType: "2.16.840.1.113883.1.11.19563",
                DocumentTypeCode: "2.16.840.1.113883.6.1",
                EncounterCode: "2.16.840.1.113883.5.4",
                DischargeDispositionCode: "2.16.840.1.113883.4.642.4.1093",
                ConfidentialityCode: "2.16.840.1.113883.5.25",
                ServiceDeliveryLocationRoleType: "2.16.840.1.113883.1.11.17660",
                ParticipationType: "2.16.840.1.113883.5.90",
                ParticipationSignature: "2.16.840.1.113883.5.89"
            } );

        /**
         * An InstanceIdentifier is used to identify any entity,
         * that is created or belongs to a system.
         * I.e. a document that is created.
         */
        class InstanceIdentifier {

            /**
             * GUID of the system where the entity (document, person, etc.) is created.
             * @type {string}
             */
            root;

            /**
             * internal identifier of that application
             * @type {string}
             */
            extension;

            /**
             * @param {object} input
             * @param {string|null} [input.root=system identifier] see CodeSystemTypes for commonly used types
             * @see CodeSystemTypes
             * @param {string} input.extension actual ID of the object
             */
            constructor( input ) {

                /**
                 * Rule IIRT: Instance identificators (i.e. documentId) *MUST* implement a @root attribute.
                 */
                this.root = (typeof input.root === "string")
                    ? input.root
                    : InstanceIdentifier.getSystemGUID();

                this.extension = (typeof input.extension === "string")
                    ? input.extension
                    : throwTypeError( "InstanceIdentifier.extension must be provided" );

            }

            /**
             * @returns {{id: {$: {extension: string, root: string}}}}
             */
            toXMLObject() {
                return {
                    $: {
                        extension: this.extension,
                        root: this.root
                    }
                };
            }

            /**
             * @returns {string} <id/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    id: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new InstanceIdentifier( {
                    ...(input && input.$ && input.$.root ? { root: input.$.root } : {}),
                    ...(input && input.$ && input.$.extension ? { extension: input.$.extension } : {})
                } );
            }

            /**
             * 1.2.276.0.76.<dc>.<customerNo>.<bsnr>
             * @param {string} [customerNo]
             * @param {string} [bsnr]
             * @returns {string}
             */
            static getSystemGUID( customerNo, bsnr ) {
                return [DC_OID, "0", customerNo, bsnr].filter( Boolean ).join( '.' );
            }

        }

        /**
         * Telecommunication class, used inside a ClinicalDocument.
         * <telecom value="tel:(0221)467-1234.2"/>
         * <telecom value="fax:(02236)83-12323-12"/>
         * <telecom value="tel:+49.172.266.0814"/>
         * <telecom nullFlavor="NASK"/>
         * In case no number can be provided, but there *MUST* be a Telecom object, a nullFlavor flag must be set.
         * nullFlavor="UNK" Unknown, "NASK" Not asked, "NAV" Temporarily unavailable, "ASKU" Asked but unknown, e.g. <telecom nullFlavor="NASK"/>
         *
         * @see https://hl7.de/wp-content/uploads/Leitfaden-VHitG-Arztbrief-v150.pdf
         */
        class Telecommunication {

            /**
             * Special usage information for the addr.
             * I.e. WP = work place, HP = home primary
             * @type {PostalAddressUse|null}
             */
            use = null;

            /**
             * @type {string}
             */
            type = "";

            /**
             * @type {string|null}
             */
            value = null;

            /**
             * Rule TURS: *MUST* provide the URI schema „tel:“, „fax:“ or „mailto:“
             * Rule TINT: in case of international telephone numbers, must start with „+“
             * Rule TCHS: *MUST* only use letter [0-9], and visual separators [–.\(\)]
             * @param {object} input
             * @param {TelecommunicationType|NullFlavorType|string} input.type
             * @param {string|null} [input.value]
             * @param {PostalAddressUse|null} [input.use]
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( `Telecommunication.constructor requires an input of type Telecommunication` );
                }

                if( typeof input.value === "string" ) {

                    // if a value is provided, the type must match the normal TYPES object
                    if( !Object.values( TelecommunicationType ).includes( input.type ) ) {
                        throw new TypeError( `Telecommunication.type is ${input.type} but must be one of ${Object.values( TelecommunicationType ).join( ", " )}` );
                    }

                    // validate value, depending on the type
                    switch( input.type ) {
                        case TelecommunicationType.mailto:
                            if( !Telecommunication.validateEmailAddress( input.value ) ) {
                                throw new TypeError( `Telecom.value for type mailto requires a valid mail address` );
                            }
                            break;
                        case TelecommunicationType.tel:
                        case TelecommunicationType.fax:
                            if( !Telecommunication.validatePhoneNumber( input.value ) ) {
                                throw new TypeError( `Telecom.value for type tel or fax require a valid phone number` );
                            }
                            break;
                    }

                } else {

                    // if *NO* value is provided, the type must match the NULLFLAVORTYPES object
                    if( !Object.values( NullFlavorType ).includes( input.type ) ) {
                        throw new TypeError( `Telecom nullFlavor is ${input.type} but must be one of ${Object.values( NullFlavorType ).join( "," )}` );
                    }

                }

                // store value and type, as no error message has been thrown up to here
                this.type = input.type;
                this.value = input.value;
                this.use = (input.use && Object.values( PostalAddressUse ).includes( input.use ))
                    ? input.use
                    : null;

            }

            /**
             * Returns a xml2js compatible object of this telecom instance.
             * @returns {{telecom: {$: {value: string}}}|{telecom: {$: {nullFlavor: string}}}}
             */
            toXMLObject() {
                return {
                    $: {
                        ...(this.value && this.use ? { use: this.use } : {}),
                        ...(this.value ? { value: `${this.type}:${this.value}` } : { nullFlavor: this.type })
                    }
                };
            }

            /**
             * @returns {string} <telecom/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    telecom: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                const obj = {};

                if( input && input.$ ) {
                    if( typeof input.$.use === "string" ) {
                        obj.use = input.$.use;
                    }

                    if( typeof input.$.value === "string" ) {
                        const splitValue = input.$.value.split( ":", 2 );
                        if( splitValue.length === 2 ) {
                            obj.type = splitValue[0];
                            obj.value = splitValue[1];
                        }
                    }

                    if( typeof input.$.nullFlavor === "string" ) {
                        obj.type = input.$.nullFlavor;
                    }
                }

                return new Telecommunication( obj );
            }

            /**
             * Validation regexp used for phone validation.
             * @type {RegExp}
             */
            static REGEXP_PHONEVALIDATION = /^\+?[0-9\-–.)(]*$/g;

            /**
             * Validation regexp used for mail validation.
             * @type {RegExp}
             */
            static REGEXP_MAILVALIDATION = Y.doccirrus.regexp.emailUmlauts;

            /**
             * Creates a normalized value of the phone number.
             * => Kicks our spaces.
             * => Converts international prefixes from "00" to "+",
             * @param {string} value
             * @return {string}
             */
            static normalizePhoneNumber( value ) {
                if( typeof value === "string" ) {
                    return value
                        .replace( /\s/g, "" )
                        .replace( /^00/, "+" );
                }
                return value;
            }

            /**
             * Validates a phone number.
             * @param {string} value
             * @returns {boolean}
             */
            static validatePhoneNumber( value ) {
                return (typeof value === "string")
                    ? Array.isArray( value.match( Telecommunication.REGEXP_PHONEVALIDATION ) )
                    : false;
            }

            /**
             * Validates an email addr.
             * @param {string} value
             * @returns {boolean}
             */
            static validateEmailAddress( value ) {
                return (typeof value === "string")
                    ? Array.isArray( value.match( Telecommunication.REGEXP_MAILVALIDATION ) )
                    : false;
            }

        }

        /**
         * Address specification according to chapter 5.12.
         * @see https://hl7.de/wp-content/uploads/Leitfaden-VHitG-Arztbrief-v150.pdf
         */
        class Address {

            /**
             * @type {NullFlavorType|null}
             */
            nullFlavor = null;

            /**
             * Special usage information for the addr.
             * I.e. WP = work place, HP = home primary
             * @type {PostalAddressUse|null}
             */
            use = null;

            /**
             * @type {string|null}
             */
            streetName = null;

            /**
             * @type {string|null}
             */
            streetNameBase = null;

            /**
             * @type {string|null}
             */
            direction = null;

            /**
             * @type {string|null}
             */
            streetAddressLine = null;

            /**
             * @type {string|null}
             */
            houseNumber = null;

            /**
             * @type {string|number|null}
             */
            houseNumberNumeric = null;

            /**
             * @type {string|null}
             */
            postalCode = null;

            /**
             * @type {string|null}
             */
            city = null;

            /**
             * @type {string|null}
             */
            county = null;

            /**
             * @type {string|null}
             */
            country = null;

            /**
             * @type {string|null}
             */
            state = null;

            /**
             * Not together with use = PHYS.
             * @type {string|null}
             */
            postBox = null;

            /**
             * @param {object} input
             * @param {NullFlavorType|null} [input.nullFlavor] Hand over, if no information is available but you need an address for a mandatory field.
             * @param {PostalAddressUse|null} [input.use]
             * @param {string|null} [input.streetAddressLine]
             * @param {string|null} [input.streetName]
             * @param {string|null} [input.streetNameBase]
             * @param {string|null} [input.direction]
             * @param {string|null} [input.houseNumber]
             * @param {string|null} [input.houseNumberNumeric]
             * @param {string|null} [input.postalCode]
             * @param {string|null} [input.city]
             * @param {string|null} [input.county]
             * @param {string|null} [input.country]
             * @param {string|null} [input.state]
             * @param {string|null} [input.postBox]
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "Address.constructor expects input of type Address" );
                }

                this.nullFlavor = (typeof input.nullFlavor === "string" && Object.values( NullFlavorType ).includes( input.nullFlavor ))
                    ? input.nullFlavor
                    : null;

                // existence of a nullFlavor attribute does not allow any other parameter
                if( !this.nullFlavor ) {
                    this.use = (typeof input.use === "string") ? input.use : null;
                    this.streetAddressLine = (typeof input.streetAddressLine === "string") ? input.streetAddressLine : null;
                    this.streetName = (typeof input.streetName === "string") ? input.streetName : null;
                    this.streetNameBase = (typeof input.streetNameBase === "string") ? input.streetNameBase : null;
                    this.direction = (typeof input.direction === "string") ? input.direction : null;
                    this.houseNumber = (typeof input.houseNumber === "string") ? input.houseNumber : null;
                    this.houseNumberNumeric = (typeof input.houseNumberNumeric === "string" || typeof input.houseNumberNumeric === "number") ? input.houseNumberNumeric : null;
                    this.postalCode = (typeof input.postalCode === "string") ? input.postalCode : null;
                    this.city = (typeof input.city === "string") ? input.city : null;
                    this.county = (typeof input.county === "string") ? input.county : null;
                    this.state = (typeof input.state === "string") ? input.state : null;
                    this.country = (typeof input.country === "string") ? input.country : null;
                    this.postBox = (typeof input.postBox === "string") ? input.postBox : null;
                }

            }

            toXMLObject() {
                return {
                    ...(this.nullFlavor ? { $: { nullFlavor: this.nullFlavor } } : {}),
                    ...(this.use ? { $: { use: this.use } } : {}),
                    ...(this.streetName ? { streetName: { _: this.streetName } } : {}),
                    ...(this.streetNameBase ? { streetNameBase: { _: this.streetNameBase } } : {}),
                    ...(this.streetAddressLine ? { streetAddressLine: { _: this.streetAddressLine } } : {}),
                    ...(this.direction ? { direction: { _: this.direction } } : {}),
                    ...(this.houseNumber ? { houseNumber: { _: this.houseNumber } } : {}),
                    ...(this.houseNumberNumeric ? { houseNumberNumeric: { _: this.houseNumberNumeric } } : {}),
                    ...(this.postalCode ? { postalCode: { _: this.postalCode } } : {}),
                    ...(this.city ? { city: { _: this.city } } : {}),
                    ...(this.county ? { county: { _: this.county } } : {}),
                    ...(this.state ? { state: { _: this.state } } : {}),
                    ...(this.country ? { country: { _: this.country } } : {}),
                    ...(this.postBox ? { postBox: { _: this.postBox } } : {})
                };
            }

            /**
             * @returns {string} <addr/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    addr: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new Address( {
                    ...(input && input.$ && input.$.use ? { use: input.$.use } : {}),
                    ...(input && input.$ && input.$.nullFlavor ? { nullFlavor: input.$.nullFlavor } : {}),
                    ...(Array.isArray( input.streetName ) && input.streetName.length > 0 ? { streetName: input.streetName[0] } : {}),
                    ...(Array.isArray( input.streetNameBase ) && input.streetNameBase.length > 0 ? { streetNameBase: input.streetNameBase[0] } : {}),
                    ...(Array.isArray( input.streetAddressLine ) && input.streetAddressLine.length > 0 ? { streetAddressLine: input.streetAddressLine[0] } : {}),
                    ...(Array.isArray( input.direction ) && input.direction.length > 0 ? { direction: input.direction[0] } : {}),
                    ...(Array.isArray( input.houseNumber ) && input.houseNumber.length > 0 ? { houseNumber: input.houseNumber[0] } : {}),
                    ...(Array.isArray( input.houseNumberNumeric ) && input.houseNumberNumeric.length > 0 ? { houseNumberNumeric: input.houseNumberNumeric[0] } : {}),
                    ...(Array.isArray( input.postalCode ) && input.postalCode.length > 0 ? { postalCode: input.postalCode[0] } : {}),
                    ...(Array.isArray( input.city ) && input.city.length > 0 ? { city: input.city[0] } : {}),
                    ...(Array.isArray( input.county ) && input.county.length > 0 ? { county: input.county[0] } : {}),
                    ...(Array.isArray( input.state ) && input.state.length > 0 ? { state: input.state[0] } : {}),
                    ...(Array.isArray( input.country ) && input.country.length > 0 ? { country: input.country[0] } : {}),
                    ...(Array.isArray( input.postBox ) && input.postBox.length > 0 ? { postBox: input.postBox[0] } : {})
                } );
            }

        }

        class Place {

            /**
             * @type {PersonName|null}
             */
            name = null;

            /**
             * @type {Address|null}
             */
            addr = null;

            /**
             * @param {object} input
             * @param {PersonName|null} [input.name]
             * @param {Address|null} [input.addr]
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "Place.constructor expects input of type Place" );
                }

                this.name = (input.name) ? new PersonName( input.name ) : null;
                this.addr = (input.addr) ? new Address( input.addr ) : null;
            }

            toXMLObject() {
                return {
                    ...(this.name ? { name: this.name.toXMLObject() } : {}),
                    ...(this.addr ? { addr: this.addr.toXMLObject() } : {})
                };
            }

            /**
             * @returns {string} <place/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    place: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new Place( {
                    ...(Array.isArray( input.name ) && input.name.length > 0 ? { name: PersonName.fromXMLObject( input.name[0] ) } : {}),
                    ...(Array.isArray( input.addr ) && input.addr.length > 0 ? { addr: Address.fromXMLObject( input.addr[0] ) } : {})
                } );
            }

        }

        /**
         * Rule BRCC: There *MUST* be at least one addr with a city or country given.
         * Chapter 5.12.1.4
         * @see https://hl7.de/wp-content/uploads/Leitfaden-VHitG-Arztbrief-v150.pdf
         */
        class BirthPlace {

            /**
             * @type {Place}
             */
            place;

            /**
             * @param {Place|object} input
             * @param {Place} input.place
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "BirthPlace.constructor expects an input of type Place" );
                }

                if( input.place ) {
                    this.place = new Place( input.place );
                } else {
                    this.place = new Place( input );
                }

                if( !this.place.addr || (!this.place.addr.city && !this.place.addr.country) ) {
                    throw new TypeError( "BirthPlace.constructor expects a Place with at least a country or city given" );
                }
            }

            toXMLObject() {
                return {
                    place: this.place.toXMLObject()
                };
            }

            /**
             * @returns {string} <birthplace/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    birthplace: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new BirthPlace( {
                    ...(Array.isArray( input.place ) && input.place.length > 0 ? { place: Place.fromXMLObject( input.place[0] ) } : {})
                } );
            }

        }

        class OrganizationName {
            /**
             * @mandatory chapter 5.12.1.3
             */
            name;

            /**
             * @param {string|object} input
             * @param {string} input.name
             */
            constructor( input ) {
                if( typeof input === "string" ) {
                    input = {
                        name: input
                    };
                } else if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "OrganizationName.constructor expects input of type OrganizationName or string" );
                }

                this.name = (typeof input.name === "string")
                    ? input.name
                    : throwTypeError( "OrganizationName.name must be provided" );
            }

            toXMLObject() {
                return {
                    _: this.name
                };
            }

            /**
             * @returns {string} <name/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    name: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                if( typeof input === "string" ) {
                    return new OrganizationName( input );
                }
                return new OrganizationName( (input && input._ ? { name: input._ } : {}) );
            }
        }

        class EntityNamePart {

            /**
             * @type {string}
             */
            value;

            /**
             *
             * @type {EntityNamePartQualifier|null}
             */
            qualifier = null;

            /**
             * @param {object|string} input
             * @param {string} input.value
             * @param {EntityNamePartQualifier|null} input.qualifier
             */
            constructor( input ) {
                if( typeof input === "string" ) {
                    input = {
                        value: input,
                        qualifier: null
                    };
                } else if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "EntityNamePart.constructor expects input of type EntityNamePart or string" );
                }

                this.value = (typeof input.value === "string")
                    ? input.value
                    : throwTypeError( "EntityNamePart.value must be of type string" );

                this.qualifier = (typeof input.qualifier === "string" && Object.values( EntityNamePartQualifier ).includes( input.qualifier ))
                    ? input.qualifier
                    : null;
            }

            toXMLObject() {
                return {
                    _: this.value,
                    ...(this.qualifier ? { $: { qualifier: this.qualifier } } : {})
                };
            }

            /**
             * @returns {string} <entityNamePart/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    entityNamePart: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                if( typeof input === "string" ) {
                    return new EntityNamePart( input );
                }
                return new EntityNamePart( {
                    ...(typeof input === "string" ? { value: input } : {}),
                    ...(input && input._ ? { value: input._ } : {}),
                    ...(input && input.$ && input.$.qualifier ? { qualifier: input.$.qualifier } : {})
                } );
            }
        }

        class PersonName {

            /**
             * @type {EntityNamePart[]}
             */
            prefix = [];

            /**
             * @type {EntityNamePart[]}
             */
            given = [];

            /**
             * @type {EntityNamePart[]}
             */
            family = [];

            /**
             * @type {EntityNamePart[]}
             */
            suffix = [];

            /**
             * @param {object} input
             * @param {EntityNamePart[]|EntityNamePart|string[]|string|null} [input.prefix]
             * @param {EntityNamePart[]|EntityNamePart|string[]|string|null} [input.given]
             * @param {EntityNamePart[]|EntityNamePart|string[]|string|null} [input.family]
             * @param {EntityNamePart[]|EntityNamePart|string[]|string|null} [input.suffix]
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "PersonName.constructor expects input of type PersonName" );
                }

                if( Array.isArray( input.prefix ) ) {
                    this.prefix = input.prefix.map( item => new EntityNamePart( item ) );
                } else if( typeof input.prefix === "string" || (typeof input.prefix === "object" && input.prefix !== null) ) {
                    this.prefix = [new EntityNamePart( input.prefix )];
                } else {
                    this.prefix = [];
                }
                if( Array.isArray( input.given ) ) {
                    this.given = input.given.map( item => new EntityNamePart( item ) );
                } else if( typeof input.given === "string" || (typeof input.given === "object" && input.given !== null) ) {
                    this.given = [new EntityNamePart( input.given )];
                } else {
                    this.given = [];
                }
                if( Array.isArray( input.family ) ) {
                    this.family = input.family.map( item => new EntityNamePart( item ) );
                } else if( typeof input.family === "string" || (typeof input.family === "object" && input.family !== null) ) {
                    this.family = [new EntityNamePart( input.family )];
                } else {
                    this.family = [];
                }
                if( Array.isArray( input.suffix ) ) {
                    this.suffix = input.suffix.map( item => new EntityNamePart( item ) );
                } else if( typeof input.suffix === "string" || (typeof input.suffix === "object" && input.suffix !== null) ) {
                    this.suffix = [new EntityNamePart( input.suffix )];
                } else {
                    this.suffix = [];
                }

            }

            toXMLObject() {
                return {
                    ...(this.prefix.length > 0 ? { prefix: this.prefix.map( item => item.toXMLObject() ) } : {}),
                    ...(this.given.length > 0 ? { given: this.given.map( item => item.toXMLObject() ) } : {}),
                    ...(this.family.length > 0 ? { family: this.family.map( item => item.toXMLObject() ) } : {}),
                    ...(this.suffix.length > 0 ? { suffix: this.suffix.map( item => item.toXMLObject() ) } : {})
                };
            }

            /**
             * @returns {string} <name/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    name: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                const obj = {
                    prefix: [],
                    given: [],
                    family: [],
                    suffix: []
                };

                Object.keys( input ).forEach( key => {
                    switch( key ) {
                        case 'given':
                        case 'suffix':
                        case 'family':
                        case 'prefix':
                            if( Array.isArray( input[key] ) ) {
                                input[key].forEach( item => {
                                    obj[key].push( EntityNamePart.fromXMLObject( item ) );
                                } );
                            }
                            break;
                    }
                } );

                return new PersonName( obj );
            }

        }

        /**
         * Patient (entity) specification according to chapter 5.12.
         * @see https://hl7.de/wp-content/uploads/Leitfaden-VHitG-Arztbrief-v150.pdf
         */
        class Patient {

            /**
             * Names of the patient.
             * @optional chapter 5.12.1.2
             * @type {PersonName[]}
             */
            name = [];

            /**
             * Gender of the patient.
             * @optional chapter 5.12.1.2
             * @type {Code|null}
             */
            administrativeGenderCode = null;

            /**
             * Birthday of the patient. Should be echoed as yyyymmdd.
             * @optional chapter 5.12.1.2
             * @type {Time|null}
             */
            birthTime = null;

            /**
             * Birth place of the patient.
             * @optional chapter 5.12.1.2
             * @type {BirthPlace|null}
             */
            birthPlace = null;

            /**
             * @param {object} input
             * @param {PersonName[]|PersonName} [input.name]
             * @param {AdministrativeGender|Code|null} [input.administrativeGenderCode]
             * @param {Time|moment|Date|string|null} [input.birthTime]
             * @param {BirthPlace|null} [input.birthPlace]
             */
            constructor( input ) {
                if( typeof input === "object" && input !== null ) {

                    if( Array.isArray( input.name ) ) {
                        this.name = input.name.map( item => new PersonName( item ) );
                    } else if( typeof input.name === "object" && input.name !== null ) {
                        this.name = [new PersonName( input.name )];
                    } else {
                        this.name = [];
                    }

                    if( Object.values( AdministrativeGender ).includes( input.administrativeGenderCode ) ) {
                        this.administrativeGenderCode = new Code( {
                            code: input.administrativeGenderCode,
                            codeSystem: CodeSystemTypes.AdministrativeGenderCodes,
                            codeValidation: AdministrativeGender
                        } );
                    } else if( typeof input.administrativeGenderCode === "object" && input.administrativeGenderCode !== null ) {
                        this.administrativeGenderCode = new Code( input.administrativeGenderCode );
                    } else {
                        this.administrativeGenderCode = null;
                    }

                    this.birthTime = ((typeof input.birthTime === "object" && input.birthTime !== null) || typeof input.birthTime === "string")
                        ? new Time( input.birthTime )
                        : null;

                    this.birthPlace = (typeof input.birthPlace === "object" && input.birthPlace !== null)
                        ? new BirthPlace( input.birthPlace )
                        : null;

                }
            }

            toXMLObject() {
                return {
                    ...(this.name ? { name: this.name.map( item => item.toXMLObject() ) } : {}),
                    ...(this.administrativeGenderCode ? { administrativeGenderCode: this.administrativeGenderCode.toXMLObject() } : {}),
                    ...(this.birthTime ? { birthTime: this.birthTime.toXMLObject( Patient.FORMAT_BIRTHTIME ) } : {}),
                    ...(this.birthPlace ? { birthplace: this.birthPlace.toXMLObject() } : {})
                };
            }

            /**
             * @returns {string} <patient/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    patient: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new Patient( {
                    ...(Array.isArray( input.name ) ? { name: input.name.map( n => PersonName.fromXMLObject( n ) ) } : {}),
                    ...(Array.isArray( input.administrativeGenderCode ) && input.administrativeGenderCode.length > 0 ? { administrativeGenderCode: Code.fromXMLObject( input.administrativeGenderCode[0] ) } : {}),
                    ...(Array.isArray( input.birthTime ) && input.birthTime.length > 0 ? { birthTime: Time.fromXMLObject( input.birthTime[0] ) } : {}),
                    ...(Array.isArray( input.birthplace ) && input.birthplace.length > 0 ? { birthPlace: BirthPlace.fromXMLObject( input.birthplace[0] ) } : {})
                } );
            }

            /**
             * Time format of the birthtime.
             * @type {string}
             */
            static FORMAT_BIRTHTIME = "YYYYMMDD";

        }

        /**
         * PatientRole specification according to chapter 5.12.
         * @see https://hl7.de/wp-content/uploads/Leitfaden-VHitG-Arztbrief-v150.pdf
         */
        class PatientRole {

            /**
             * InstanceIdentifier of the patient.
             * @mandatory chapter 5.12.1.1
             * @type {InstanceIdentifier[]}
             */
            id = [];

            /**
             * Address collection of the patient.
             * @optional chapter 5.12.1.1
             * @type {Address[]}
             */
            addr = [];

            /**
             * Address collection of the patient.
             * @optional chapter 5.12.1.1
             * @type {Telecommunication[]}
             */
            telecom = [];

            /**
             * Patient (entity) belonging to this role.
             * @mandatory chapter 5.12.1.1
             * @type {Patient|null}
             */
            patient;

            /**
             * Provider organization of the information, likeHospital, or practices.
             * @optional chapter 5.12.1.1
             * @type {Organization|null}
             */
            providerOrganization;

            /**
             * @param {object} input
             * @param {InstanceIdentifier[]|InstanceIdentifier} input.id
             * @param {Patient|null} input.patient
             * @param {Address[]|Address|null} [input.addr]
             * @param {Telecommunication[]|Telecommunication|null} [input.telecom]
             * @param {Organization|null} [input.providerOrganization]
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "PatientRole.constructor expects input of type PatientRole" );
                }

                if( Array.isArray( input.id ) ) {
                    this.id = input.id.map( item => new InstanceIdentifier( item ) );
                } else if( typeof input.id === "object" && input.id !== null ) {
                    this.id = [new InstanceIdentifier( input.id )];
                } else {
                    this.id = [];
                }
                if( this.id.length === 0 ) {
                    throw new TypeError( "PatientRole.id must contain at least one identifier" );
                }

                if( Array.isArray( input.addr ) ) {
                    this.addr = input.addr.map( item => new Address( item ) );
                } else if( typeof input.addr === "object" && input.addr !== null ) {
                    this.addr = [new Address( input.addr )];
                } else {
                    this.addr = [];
                }

                if( Array.isArray( input.telecom ) ) {
                    this.telecom = input.telecom.map( item => new Telecommunication( item ) );
                } else if( typeof input.telecom === "object" && input.telecom !== null ) {
                    this.telecom = [new Telecommunication( input.telecom )];
                } else {
                    this.telecom = [];
                }

                this.patient = (typeof input.patient === "object" && input.patient !== null)
                    ? new Patient( input.patient )
                    : null;

                this.providerOrganization = (typeof input.providerOrganization === "object" && input.providerOrganization !== null)
                    ? new Organization( input.providerOrganization )
                    : null;

            }

            toXMLObject() {
                return {
                    id: this.id.map( item => item.toXMLObject() ),
                    ...(this.addr.length > 0 ? { addr: this.addr.map( item => item.toXMLObject() ) } : {}),
                    ...(this.telecom.length > 0 ? { telecom: this.telecom.map( item => item.toXMLObject() ) } : {}),
                    ...(this.patient ? { patient: this.patient.toXMLObject() } : {}),
                    ...(this.providerOrganization ? { providerOrganization: this.providerOrganization.toXMLObject() } : {})
                };
            }

            /**
             * @returns {string} <patientRole/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    patientRole: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new PatientRole( {
                    ...(Array.isArray( input.id ) ? { id: input.id.map( i => InstanceIdentifier.fromXMLObject( i ) ) } : {}),
                    ...(Array.isArray( input.addr ) ? { addr: input.addr.map( a => Address.fromXMLObject( a ) ) } : {}),
                    ...(Array.isArray( input.telecom ) ? { telecom: input.telecom.map( t => Telecommunication.fromXMLObject( t ) ) } : {}),
                    ...(Array.isArray( input.patient ) && input.patient.length > 0 ? { patient: Patient.fromXMLObject( input.patient[0] ) } : {}),
                    ...(Array.isArray( input.providerOrganization ) && input.providerOrganization.length > 0 ? { providerOrganization: Organization.fromXMLObject( input.providerOrganization[0] ) } : {})
                } );
            }
        }

        /**
         * RecordTarget specification according to chapter 5.12 (host of PatientRole class)
         * @see https://hl7.de/wp-content/uploads/Leitfaden-VHitG-Arztbrief-v150.pdf
         */
        class RecordTarget {

            /**
             * Address collection of the patient.
             * @optional chapter 5.12.1.1
             * @type {PatientRole[]}
             */
            patientRole = [];

            /**
             * @param {object} input
             * @param {PatientRole[]|PatientRole} input.patientRole
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "RecordTarget.constructor expects input of type RecordTarget" );
                }

                if( Array.isArray( input.patientRole ) ) {
                    this.patientRole = input.patientRole.map( item => new PatientRole( item ) );
                } else if( typeof input.patientRole === "object" && input.patientRole !== null ) {
                    this.patientRole = [new PatientRole( input.patientRole )];
                } else {
                    this.patientRole = [];
                }
                if( this.patientRole.length === 0 ) {
                    throw new TypeError( "RecordTarget.patientRole must contain at least a single patient role" );
                }

            }

            toXMLObject() {
                return {
                    patientRole: this.patientRole.map( item => item.toXMLObject() )
                };
            }

            /**
             * @returns {string} <recordTarget/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    recordTarget: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new RecordTarget( {
                    patientRole: input.patientRole.map( item => PatientRole.fromXMLObject( item ) )
                } );
            }

        }

        class Organization {

            /**
             * @type {InstanceIdentifier[]}
             */
            id = [];

            /**
             * @type {OrganizationName[]}
             */
            name = [];

            /**
             * @type {Address[]}
             */
            addr = [];

            /**
             * @type {Telecommunication[]}
             */
            telecom = [];

            /**
             * @param {object} input
             * @param {InstanceIdentifier[]|InstanceIdentifier|null} [input.id]
             * @param {OrganizationName[]|OrganizationName|string|null} [input.name]
             * @param {Address[]|Address|null} [input.addr]
             * @param {Telecommunication[]|Telecommunication|null} [input.telecom]
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "Organization.constructor expects input of type Organization" );
                }

                if( Array.isArray( input.id ) ) {
                    this.id = input.id.map( item => new InstanceIdentifier( item ) );
                } else if( typeof input.id === "object" && input.id !== null ) {
                    this.id = [new InstanceIdentifier( input.id )];
                } else {
                    this.id = [];
                }

                if( Array.isArray( input.name ) ) {
                    this.name = input.name.map( item => new OrganizationName( item ) );
                } else if( (typeof input.name === "object" && input.name !== null) || typeof input.name === "string" ) {
                    this.name = [new OrganizationName( input.name )];
                } else {
                    this.name = [];
                }
                if( this.name.length === 0 ) {
                    throw new TypeError( "Organization.name must contain at least a single OrganizationName" );
                }

                if( Array.isArray( input.addr ) ) {
                    this.addr = input.addr.map( item => new Address( item ) );
                } else if( typeof input.addr === "object" && input.addr !== null ) {
                    this.addr = [new Address( input.addr )];
                } else {
                    this.addr = [];
                }
                if( this.addr.length === 0 ) {
                    this.addr = [new Address( { nullFlavor: NullFlavorType.Unknown } )];
                }

                if( Array.isArray( input.telecom ) ) {
                    this.telecom = input.telecom.map( item => new Telecommunication( item ) );
                } else if( typeof input.telecom === "object" && input.telecom !== null ) {
                    this.telecom = [new Telecommunication( input.telecom )];
                } else {
                    this.telecom = [];
                }
                if( this.telecom.length === 0 ) {
                    this.telecom = [new Telecommunication( { type: NullFlavorType.Unknown } )];
                }

                /**
                 * Rule ORGC: Every organization *MUST* provide a name, and addr, and telecommunication parameters.
                 *            Optionally, a registered OID may be provided. In case an OID is given,
                 *            the explicitly given parameters (name, addr, telecom)
                 *            have lower priorities if there are discrepancies.
                 */

            }

            toXMLObject() {
                return {
                    ...(this.id.length > 0 ? { id: this.id.map( item => item.toXMLObject() ) } : {}),
                    ...(this.name.length > 0 ? { name: this.name.map( item => item.toXMLObject() ) } : {}),
                    ...(this.telecom.length > 0 ? { telecom: this.telecom.map( item => item.toXMLObject() ) } : {}),
                    ...(this.addr.length > 0 ? { addr: this.addr.map( item => item.toXMLObject() ) } : {})
                };
            }

            /**
             * @returns {string} <organization/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    organization: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new Organization( {
                    ...(Array.isArray( input.id ) && input.id.length > 0 ? { id: input.id.map( i => InstanceIdentifier.fromXMLObject( i ) ) } : {}),
                    ...(Array.isArray( input.name ) && input.name.length > 0 ? { name: input.name.map( i => OrganizationName.fromXMLObject( i ) ) } : {}),
                    ...(Array.isArray( input.addr ) && input.addr.length > 0 ? { addr: input.addr.map( i => Address.fromXMLObject( i ) ) } : {}),
                    ...(Array.isArray( input.telecom ) && input.telecom.length > 0 ? { telecom: input.telecom.map( i => Telecommunication.fromXMLObject( i ) ) } : {})
                } );
            }

        }

        /**
         * This class is a special case of the Organization, which MUST provide an ID.
         */
        class CustodianOrganization extends Organization {

            /**
             * @param {object} input
             * @param {InstanceIdentifier[]|InstanceIdentifier} input.id
             * @param {OrganizationName[]|OrganizationName|string|null} [input.name]
             * @param {Address[]|Address|null} [input.addr]
             * @param {Telecommunication[]|Telecommunication|null} [input.telecom]
             */
            constructor( input ) {
                super( input );

                if( this.id.length === 0 ) {
                    throw new TypeError( "CustodianOrganization.id must contain at least a single id" );
                }
            }

            /**
             * @returns {string} <custodianOrganization/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    custodianOrganization: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new CustodianOrganization( {
                    ...(Array.isArray( input.id ) && input.id.length > 0 ? { id: input.id.map( i => InstanceIdentifier.fromXMLObject( i ) ) } : {}),
                    ...(Array.isArray( input.name ) && input.name.length > 0 ? { name: input.name.map( i => OrganizationName.fromXMLObject( i ) ) } : {}),
                    ...(Array.isArray( input.addr ) && input.addr.length > 0 ? { addr: input.addr.map( i => Address.fromXMLObject( i ) ) } : {}),
                    ...(Array.isArray( input.telecom ) && input.telecom.length > 0 ? { telecom: input.telecom.map( i => Telecommunication.fromXMLObject( i ) ) } : {})
                } );
            }

        }

        class Person {

            /**
             * @type {PersonName[]}
             */
            name = [];

            /**
             * @type {Address[]}
             */
            addr = [];

            /**
             * @type {Telecommunication[]}
             */
            telecom = [];

            /**
             * Rule PERS: Every person *MUST* be identified by a name <name>.
             *            Additionally, every person *should* have an addr <addr>
             *            and telecommunication parameters <telecom>.             *
             * @param {object} input
             * @param {PersonName[]|PersonName} input.name
             * @param {Address[]|Address|null} [input.addr]
             * @param {Telecommunication[]|Telecommunication|null} [input.telecom]
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "Person.constructor expects input of type Person" );
                }

                /**
                 * Rule PERS: Every person *MUST* be identified by a name <name>.
                 *            Additionally, every person *should* have an addr <addr>
                 *            and telecommunication parameters <telecom>.
                 */
                if( Array.isArray( input.name ) ) {
                    this.name = input.name.map( item => new PersonName( item ) );
                } else if( typeof input.name === "object" && input.name !== null ) {
                    this.name = [new PersonName( input.name )];
                } else {
                    this.name = [];
                }
                if( this.name.length === 0 ) {
                    throw new TypeError( "Person.name must contain at least one entry" );
                }

                if( Array.isArray( input.addr ) ) {
                    this.addr = input.addr.map( item => new Address( item ) );
                } else if( typeof input.addr === "object" && input.addr !== null ) {
                    this.addr = [new Address( input.addr )];
                } else {
                    this.addr = [];
                }

                if( Array.isArray( input.telecom ) ) {
                    this.telecom = input.telecom.map( item => new Telecommunication( item ) );
                } else if( typeof input.telecom === "object" && input.telecom !== null ) {
                    this.telecom = [new Telecommunication( input.telecom )];
                } else {
                    this.telecom = [];
                }

            }

            toXMLObject() {
                return {
                    ...(this.name.length > 0 ? { name: this.name.map( item => item.toXMLObject() ) } : {}),
                    ...(this.addr.length > 0 ? { addr: this.addr.map( item => item.toXMLObject() ) } : {}),
                    ...(this.telecom.length > 0 ? { telecom: this.telecom.map( item => item.toXMLObject() ) } : {})
                };
            }

            /**
             * @returns {string} <person/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    person: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new Person( {
                    ...(Array.isArray( input.name ) ? { name: input.name.map( item => PersonName.fromXMLObject( item ) ) } : {}),
                    ...(Array.isArray( input.addr ) ? { addr: input.addr.map( item => Address.fromXMLObject( item ) ) } : {}),
                    ...(Array.isArray( input.telecom ) ? { telecom: input.telecom.map( item => Telecommunication.fromXMLObject( item ) ) } : {})
                } );
            }

        }

        class AssignedPerson {

            /**
             * @type {PersonName[]}
             */
            name = [];

            /**
             * @param {object} input
             * @param {PersonName[]|PersonName|null} [input.name]
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "AssignedPerson.constructor expects input of type AssignedPerson" );
                }

                if( Array.isArray( input.name ) ) {
                    this.name = input.name.map( item => new PersonName( item ) );
                } else if( typeof input.name === "object" && input.name !== null ) {
                    this.name = [new PersonName( input.name )];
                } else {
                    this.name = [];
                }

            }

            toXMLObject() {
                return {
                    ...(this.name.length > 0 ? { name: this.name.map( item => item.toXMLObject() ) } : {})
                };
            }

            /**
             * @returns {string} <assignedPerson/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    assignedPerson: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new AssignedPerson( {
                    ...(Array.isArray( input.name ) ? { name: input.name.map( item => PersonName.fromXMLObject( item ) ) } : {})
                } );
            }

        }

        /**
         * chapter 5.12.7
         * Rule PTTL: at least one contact information, telecom or addr, *MUST* exist with an associated entity
         */
        class AssociatedEntity {

            /**
             * @type {InstanceIdentifier[]}
             */
            id = [];

            /**
             * @type {RoleClassAssociative|null}
             */
            classCode = null;

            /**
             * @see https://www.hl7.org/fhir/v3/PersonalRelationshipRoleType/vs.html
             * @type {Code|null}
             */
            code = null;

            /**
             * @type {Address[]}
             */
            addr = [];

            /**
             * @type {Telecommunication[]}
             */
            telecom = [];

            /**
             * @type {Person|null}
             */
            associatedPerson = null;

            /**
             * @type {Organization|null}
             */
            scopingOrganization = null;

            /**
             * @param {object} input
             * @param {InstanceIdentifier[]|InstanceIdentifier|null} [input.id]
             * @param {RoleClassAssociative|null} [input.classCode]
             * @param {PersonalRelationshipRoleType|Code|null} [input.code]
             * @param {Address[]|Address|null} [input.addr]
             * @param {Telecommunication[]|Telecommunication|null} [input.telecom]
             * @param {Person|null} [input.associatedPerson]
             * @param {Organization|null} [input.scopingOrganization]
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "AssociatedEntity.constructor expects input of type AssociatedEntity" );
                }

                if( Array.isArray( input.id ) ) {
                    this.id = input.id.map( item => new InstanceIdentifier( item ) );
                } else if( typeof input.id === "object" && input.id !== null ) {
                    this.id = [new InstanceIdentifier( input.id )];
                } else {
                    this.id = [];
                }

                this.classCode = (input.classCode && Object.values( RoleClassAssociative ).includes( input.classCode ))
                    ? input.classCode
                    : null;

                if( input.code && Object.values( PersonalRelationshipRoleType ).includes( input.code ) ) {
                    this.code = new Code( {
                        code: input.code,
                        codeSystem: CodeSystemTypes.PersonalRelationshipRoleType
                    } );
                } else if( typeof input.code === "object" && input.code !== null ) {
                    this.code = new Code( input.code );
                } else {
                    this.code = null;
                }

                if( Array.isArray( input.addr ) ) {
                    this.addr = input.addr.map( item => new Address( item ) );
                } else if( typeof input.addr === "object" && input.addr !== null ) {
                    this.addr = [new Address( input.addr )];
                } else {
                    this.addr = [];
                }

                if( Array.isArray( input.telecom ) ) {
                    this.telecom = input.telecom.map( item => new Telecommunication( item ) );
                } else if( typeof input.telecom === "object" && input.telecom !== null ) {
                    this.telecom = [new Telecommunication( input.telecom )];
                } else {
                    this.telecom = [];
                }

                this.associatedPerson = (typeof input.associatedPerson === "object" && input.associatedPerson !== null)
                    ? new Person( input.associatedPerson )
                    : null;

                this.scopingOrganization = (typeof input.scopingOrganization === "object" && input.scopingOrganization !== null)
                    ? new Organization( input.scopingOrganization )
                    : null;

                // validations

                /**
                 * chapter 5.12.7
                 * Rule PTNO: if participation.typeCode IND and participatingEntity.classCode NOK: one person must be given, role code must be of PersonalRelationshipRoleType
                 * Rule PTEC: if participation.typeCode IND and participatingEntity.classCode ECON: one person must be given, role code must be of PersonalRelationshipRoleType
                 * Rule PTPR: if participation.typeCode IND and participatingEntity.classCode PRS: one person must be given, role code must be of PersonalRelationshipRoleType
                 * Rule PTPH: if participation.typeCode HLD and participatingEntity.classCode POLHOLD: one organisation must be given
                 */
                const requiresPersonalRoleType = [RoleClassAssociative.Relative, RoleClassAssociative.EmergencyContact, RoleClassAssociative.Other].includes( this.classCode );
                if( requiresPersonalRoleType ) {
                    if( !Object.values( PersonalRelationshipRoleType ).includes( this.code ) ) {
                        throw new TypeError( `AssociatedEntity of classCode ${this.classCode} must provide a personal relationship role` );
                    }
                    if( !this.associatedPerson ) {
                        throw new TypeError( `AssociatedEntity of classCode ${this.classCode} must provide an associated person` );
                    }
                }
                const requiresOrganizationRoleType = [RoleClassAssociative.PolicyHolder].includes( this.classCode );
                if( requiresOrganizationRoleType ) {
                    if( !this.scopingOrganization ) {
                        throw new TypeError( `AssociatedEntity of classCode ${this.classCode} must provide a scoping organization` );
                    }
                }

                /**
                 * Rule HCPC: For each physician there *MUST* be a name, an addr, and telecommunication parameters given.
                 *            This is done through the „scoping organization“ or the associated role, where allowed.
                 *            If no address or telecom is available, this *MUST* be argued by the @nullFlavor attribute.
                 */
            }

            toXMLObject() {
                return {
                    ...(this.classCode ? { $: { classCode: this.classCode } } : {}),
                    ...(this.id.length > 0 ? { id: this.id.map( item => item.toXMLObject() ) } : {}),
                    ...(this.code ? { code: this.code.toXMLObject() } : {}),
                    ...(this.addr.length > 0 ? { addr: this.addr.map( item => item.toXMLObject() ) } : {}),
                    ...(this.telecom.length > 0 ? { telecom: this.telecom.map( item => item.toXMLObject() ) } : {}),
                    ...(this.associatedPerson ? { associatedPerson: this.associatedPerson.toXMLObject() } : {}),
                    ...(this.scopingOrganization ? { scopingOrganization: this.scopingOrganization.toXMLObject() } : {})
                };
            }

            /**
             * @returns {string} <associatedEntity/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    associatedEntity: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new AssociatedEntity( {
                    ...(Array.isArray( input.id ) ? { id: input.id.map( item => InstanceIdentifier.fromXMLObject( item ) ) } : {}),
                    ...(Array.isArray( input.addr ) && input.addr.length > 0 ? { addr: input.addr.map( item => Address.fromXMLObject( item ) ) } : {}),
                    ...(Array.isArray( input.telecom ) && input.telecom.length > 0 ? { telecom: input.telecom.map( item => Telecommunication.fromXMLObject( item ) ) } : {}),
                    ...(input && input.$ && input.$.classCode ? { classCode: input.$.classCode } : {}),
                    ...(Array.isArray( input.code ) && input.code.length > 0 ? { code: Code.fromXMLObject( input.code[0] ) } : {}),
                    ...(Array.isArray( input.associatedPerson ) && input.associatedPerson.length > 0 ? { associatedPerson: Person.fromXMLObject( input.associatedPerson[0] ) } : {}),
                    ...(Array.isArray( input.scopingOrganization ) && input.scopingOrganization.length > 0 ? { scopingOrganization: Organization.fromXMLObject( input.scopingOrganization[0] ) } : {})
                } );
            }

        }

        class AssignedEntity {

            /**
             * @type {InstanceIdentifier[]}
             */
            id = [];

            /**
             * @type {Address[]}
             */
            addr = [];

            /**
             * @type {Telecommunication[]}
             */
            telecom = [];

            /**
             * If the author is a person or device this property is filled.
             * @optional chapter 5.12.2
             * @type {AssignedPerson}
             */
            assignedPerson;

            /**
             * If the author is an organization this property is filled.
             * @optional chapter 5.12.2
             * @type {Organization|null}
             */
            representedOrganization = null;

            /**
             * @param {object} input
             * @param {InstanceIdentifier[]|InstanceIdentifier} input.id
             * @param {Address[]|Address|null} [input.addr]
             * @param {Telecommunication[]|Telecommunication|null} [input.telecom]
             * @param {AssignedPerson} input.assignedPerson
             * @param {Organization|null} [input.representedOrganization]
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "AssignedEntity.constructor expects input of type AssignedEntity" );
                }

                if( Array.isArray( input.id ) ) {
                    this.id = input.id.map( item => new InstanceIdentifier( item ) );
                } else if( typeof input.id === "object" && input.id !== null ) {
                    this.id = [new InstanceIdentifier( input.id )];
                } else {
                    this.id = [];
                }
                if( this.id.length === 0 ) {
                    throw new TypeError( "AssignedEntity.id must contain at least one identifier" );
                }

                if( Array.isArray( input.addr ) ) {
                    this.addr = input.addr.map( item => new Address( item ) );
                } else if( typeof input.addr === "object" && input.addr !== null ) {
                    this.addr = [new Address( input.addr )];
                } else {
                    this.addr = [];
                }

                if( Array.isArray( input.telecom ) ) {
                    this.telecom = input.telecom.map( item => new Telecommunication( item ) );
                } else if( typeof input.telecom === "object" && input.telecom !== null ) {
                    this.telecom = [new Telecommunication( input.telecom )];
                } else {
                    this.telecom = [];
                }

                this.assignedPerson = (typeof input.assignedPerson === "object" && input.assignedPerson !== null)
                    ? new AssignedPerson( input.assignedPerson )
                    : throwTypeError( "AssignedEntity.assignedPerson must be of type AssignedPerson" );

                this.representedOrganization = (typeof input.representedOrganization === "object" && input.representedOrganization !== null)
                    ? new Organization( input.representedOrganization )
                    : null;

            }

            toXMLObject() {
                return {
                    id: this.id.map( item => item.toXMLObject() ),
                    ...(this.addr.length > 0 ? { addr: this.addr.map( item => item.toXMLObject() ) } : {}),
                    ...(this.telecom.length > 0 ? { telecom: this.telecom.map( item => item.toXMLObject() ) } : {}),
                    ...(this.assignedPerson ? { assignedPerson: this.assignedPerson.toXMLObject() } : {}),
                    ...(this.representedOrganization ? { representedOrganization: this.representedOrganization.toXMLObject() } : {})
                };
            }

            /**
             * @returns {string} <assignedEntity/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    assignedEntity: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new AssignedEntity( {
                    ...(Array.isArray( input.id ) && input.id.length > 0 ? { id: input.id.map( item => InstanceIdentifier.fromXMLObject( item ) ) } : {}),
                    ...(Array.isArray( input.addr ) && input.addr.length > 0 ? { addr: input.addr.map( item => Address.fromXMLObject( item ) ) } : {}),
                    ...(Array.isArray( input.telecom ) && input.telecom.length > 0 ? { telecom: input.telecom.map( item => Telecommunication.fromXMLObject( item ) ) } : {}),
                    ...(Array.isArray( input.assignedPerson ) && input.assignedPerson.length > 0 ? { assignedPerson: AssignedPerson.fromXMLObject( input.assignedPerson[0] ) } : {}),
                    ...(Array.isArray( input.representedOrganization ) && input.representedOrganization.length > 0 ? { representedOrganization: Organization.fromXMLObject( input.representedOrganization[0] ) } : {})
                } );
            }

        }

        class Authenticator {

            /**
             * @type {Time}
             */
            time;

            /**
             * @type {ParticipationSignature}
             */
            signatureCode;

            /**
             * @type {AssignedEntity[]}
             */
            assignedEntity = [];

            /**
             * @param {object} input
             * @param {Time|Date|moment|string} input.time
             * @param {ParticipationSignature|Code|string} input.signatureCode
             * @param {AssignedEntity[]|AssignedEntity|null} [input.assignedEntity]
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "Authenticator.constructor expects input of type Authenticator" );
                }

                this.time = ((typeof input.time === "object" && input.time !== null) || typeof input.time === "string")
                    ? new Time( input.time )
                    : throwTypeError( "Authenticator.time must be of type Time" );

                if( typeof input.signatureCode === "string" ) {
                    this.functionCode = new Code( {
                        code: input.signatureCode,
                        codeValidation: ParticipationSignature,
                        codeSystemForbidden: true
                    } );
                } else if( typeof input.signatureCode === "object" && input.signatureCode !== null ) {
                    this.signatureCode = new Code( {
                        ...input.signatureCode,
                        codeSystemForbidden: true
                    } );
                } else {
                    throw new TypeError( `Authenticator.signatureCode is ${input.signatureCode} but must be one of ${Object.values( ParticipationSignature ).join( ", " )}` );
                }

                if( Array.isArray( input.assignedEntity ) ) {
                    this.assignedEntity = input.assignedEntity.map( item => new AssignedEntity( item ) );
                } else if( typeof input.assignedEntity === "object" && input.assignedEntity !== null ) {
                    this.assignedEntity = [new AssignedEntity( input.assignedEntity )];
                } else {
                    this.assignedEntity = [];
                }

            }

            toXMLObject() {
                return {
                    time: this.time.toXMLObject(),
                    signatureCode: this.signatureCode.toXMLObject(),
                    ...(this.assignedEntity.length > 0 ? { assignedEntity: this.assignedEntity.map( item => item.toXMLObject() ) } : {})
                };
            }

            /**
             * @returns {string} <authenticator/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    authenticator: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new Authenticator( {
                    ...(Array.isArray( input.signatureCode ) && input.signatureCode.length > 0 ? { signatureCode: Code.fromXMLObject( input.signatureCode[0] ) } : {}),
                    ...(Array.isArray( input.time ) && input.time.length > 0 ? { time: Time.fromXMLObject( input.time[0] ) } : {}),
                    ...(Array.isArray( input.assignedEntity ) ? { assignedEntity: input.assignedEntity.map( item => AssignedEntity.fromXMLObject( item ) ) } : {})
                } );
            }
        }

        class EncounterParticipant {

            /**
             * @type {EncounterParticipantType}
             */
            typeCode;

            /**
             * @type {Time|null}
             */
            time = null;

            /**
             * @type {AssignedEntity[]}
             */
            assignedEntity = [];

            /**
             * @param {object} input
             * @param {Time|moment|Date|string|null} [input.time]
             * @param {AssignedEntity[]|AssignedEntity} input.assignedEntity
             * @param {EncounterParticipantType|string} input.typeCode
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "EncounterParticipant.constructor expects input of type EncounterParticipant" );
                }

                this.typeCode = (Object.values( EncounterParticipantType ).includes( input.typeCode ))
                    ? input.typeCode
                    : throwTypeError( `EncounterParticipant.typeCode is ${input.typeCode} but must be one of ${Object.values( EncounterParticipantType )}` );

                this.time = ((typeof input.time === "object" && input.time !== null) || typeof input.time === "string")
                    ? new Time( input.time )
                    : null;

                if( Array.isArray( input.assignedEntity ) ) {
                    this.assignedEntity = input.assignedEntity.map( item => new AssignedEntity( item ) );
                } else if( typeof input.assignedEntity === "object" && input.assignedEntity !== null ) {
                    this.assignedEntity = [new AssignedEntity( input.assignedEntity )];
                } else {
                    this.assignedEntity = [];
                }
                if( this.assignedEntity.length === 0 ) {
                    throw new TypeError( "EncounterParticipant.assignedEntity expects at least one entry" );
                }

            }

            toXMLObject() {
                return {
                    ...(this.typeCode ? { $: { typeCode: this.typeCode } } : {}),
                    ...(this.time ? { time: this.time.toXMLObject() } : {}),
                    ...(this.assignedEntity.length > 0 ? { assignedEntity: this.assignedEntity.map( item => item.toXMLObject() ) } : {})
                };
            }

            /**
             * @returns {string} <encounterParticipant/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    encounterParticipant: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new EncounterParticipant( {
                    ...(input && input.$ && input.$.typeCode ? { typeCode: input.$.typeCode } : {}),
                    ...(Array.isArray( input.time ) && input.time.length > 0 ? { time: Time.fromXMLObject( input.time[0] ) } : {}),
                    ...(Array.isArray( input.assignedEntity ) && input.assignedEntity.length > 0 ? { assignedEntity: input.assignedEntity.map( item => AssignedEntity.fromXMLObject( item ) ) } : {})
                } );
            }
        }

        class ResponsibleParty {

            /**
             * @type {AssignedEntity|null}
             */
            assignedEntity = null;

            /**
             * @param {object} input
             * @param {AssignedEntity|null} [input.assignedEntity]
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "ResponsibleParty.constructor expects input of type ResponsibleParty" );
                }

                this.assignedEntity = (typeof input.assignedEntity === "object" && input.assignedEntity !== null)
                    ? new AssignedEntity( input.assignedEntity )
                    : null;

            }

            toXMLObject() {
                return {
                    ...(this.assignedEntity ? { assignedEntity: this.assignedEntity.toXMLObject() } : {})
                };
            }

            /**
             * @returns {string} <responsibleParty/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    responsibleParty: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new ResponsibleParty( {
                    ...(Array.isArray( input.assignedEntity ) && input.assignedEntity.length > 0 ? { assignedEntity: AssignedEntity.fromXMLObject( input.assignedEntity[0] ) } : {})
                } );
            }
        }

        /**
         * Time class, defining a single point in time, or a time span.
         * Timespan, i.e. for noting insurance status validity:
         * Low is the last reading time of the insurance card.
         * High is the "valid until" date of the insurance card.
         */
        class Time {

            /**
             * Giving a single point in time.
             * @type {Date|null}
             */
            time = null;

            /**
             * Timespan, i.e. for noting insurance status validity.
             * Low is the last reading time of the insurance card.
             * @type {Date|null}
             */
            low = null;

            /**
             * Timespan, i.e. for noting insurance status validity.
             * High is the "valid until" date of the insurance card.
             * @type {Date|null}
             */
            high = null;

            /**
             * Is the lower time inclusive?
             * @type {boolean}
             */
            lowInclusive = false;

            /**
             * Is the lower time exclusive?
             * @type {boolean}
             */
            highInclusive = true;

            /**
             * Structure defining a single point in time or a timespan.
             * @param {object|moment|Date|string} input
             * @param {moment|Date|string|null} [input.time] used for a single point in time
             * @param {moment|Date|string|null} [input.low] used as time range lower value
             * @param {moment|Date|string|null} [input.high] used as time range upper value
             * @param {boolean} [input.lowInclusive=false] lower value of range inclusive
             * @param {boolean} [input.highInclusive=true] upper value of range inclusive
             */
            constructor( input ) {
                switch( true ) {
                    // quick constructor (handing of a single string, date or moment object
                    case typeof input === "string":
                    case moment.isMoment( input ):
                    case input instanceof Date:
                        this.time = moment( input ).toDate();
                        this.low = null;
                        this.high = null;
                        break;

                    // error checking
                    case typeof input !== "object":
                    case input === null:
                        throw new TypeError( "Time.constructor expects input of type Time, moment, Date or string" );

                    default:
                        this.time = (input.time) ? moment( input.time ).toDate() : null;
                        this.low = (input.low) ? moment( input.low ).toDate() : null;
                        this.high = (input.high) ? moment( input.high ).toDate() : null;
                }

                // just accept a single point in time or a timespan
                if( this.time && (this.low || this.high) ) {
                    throw new TypeError( "Time.constructor accepts only a single point in time or a timespan" );
                }

                this.lowInclusive = (typeof input.lowInclusive === "boolean") ? input.lowInclusive : false;
                this.highInclusive = (typeof input.highInclusive === "boolean") ? input.highInclusive : true;
            }

            /**
             * returns this.time formatted
             * @param {string} [format]
             * @returns {string|null}
             */
            format( format ) {
                return (this.time) ? moment( this.time ).format( format ) : null;
            }

            /**
             * returns this.low formatted
             * @param {string} [format]
             * @returns {string|null}
             */
            lowFormat( format ) {
                return (this.low) ? moment( this.low ).format( format ) : null;
            }

            /**
             * returns this.high formatted
             * @param {string} [format]
             * @returns {string|null}
             */
            highFormat( format ) {
                return (this.high) ? moment( this.high ).format( format ) : null;
            }

            /**
             * @param {string|null} [format=ClinicalDocument.FORMAT_EFFECTIVETIME]
             * @returns {{high: {inclusive: string, value: *}, $: {value: *}, low: {value: *}}}
             */
            toXMLObject( format ) {
                // set default value for the format
                if( typeof format !== "string" ) {
                    format = ClinicalDocument.FORMAT_EFFECTIVETIME;
                }

                return {
                    ...(this.time ? {
                        $: {
                            value: moment( this.time ).format( format )
                        }
                    } : {}),
                    ...(this.low ? {
                        low: {
                            $: {
                                value: moment( this.low ).format( format ),
                                ...(this.lowInclusive ? { inclusive: "true" } : {})
                            }
                        }
                    } : {}),
                    ...(this.high ? {
                        high: {
                            $: {
                                value: moment( this.high ).format( format ),
                                ...(this.highInclusive ? { inclusive: "true" } : {})
                            }
                        }
                    } : {})
                };
            }

            /**
             * @returns {string} <time/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    time: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                let
                    high = null,
                    low = null;

                if( Array.isArray( input.high ) && input.high.length > 0 ) {
                    high = input.high[0];
                }
                if( Array.isArray( input.low ) && input.low.length > 0 ) {
                    low = input.low[0];
                }

                return new Time( {
                    ...(input && input.$ && input.$.value ? { time: moment( input.$.value, ClinicalDocument.FORMAT_EFFECTIVETIME ) } : {}),
                    ...(high && high.$ && high.$.value ? { high: moment( high.$.value, ClinicalDocument.FORMAT_EFFECTIVETIME ) } : {}),
                    ...(low && low.$ && low.$.value ? { low: moment( low.$.value, ClinicalDocument.FORMAT_EFFECTIVETIME ) } : {}),
                    ...(high && high.$ && high.$.inclusive
                        ? {
                            highInclusive:
                                String( high.$.inclusive ).toLowerCase() === "true" ||
                                (typeof high.$.inclusive === "boolean" && high.$.inclusive)
                        } : {}),
                    ...(low && low.$ && low.$.inclusive ?
                        {
                            lowInclusive:
                                String( low.$.inclusive ).toLowerCase() === "true" ||
                                (typeof low.$.inclusive === "boolean" && low.$.inclusive)
                        } : {})
                } );
            }
        }

        /**
         * Code class defining a code in a given system.
         */
        class Code {

            /**
             * @type {string}
             */
            code;

            /**
             * @type {string|null}
             */
            codeSystem = null;

            /**
             * @type {string|null}
             */
            codeSystemName = null;

            /**
             * @type {string|null}
             */
            codeSystemVersion = null;

            /**
             * @type {string|null}
             */
            displayName = null;

            /**
             * @param {object|string} input
             * @param {string} input.code
             * @param {CodeSystemTypes|string|null} [input.codeSystem]
             * @param {string|null} [input.codeSystemName]
             * @param {string|null} [input.codeSystemVersion]
             * @param {string|null} [input.displayName]
             * @param {Object} [input.codeValidation]
             * @param {boolean} [input.codeSystemMandatory=false]
             * @param {boolean} [input.codeSystemForbidden=false]
             */
            constructor( input ) {
                if( typeof input === "string" ) {
                    input = {
                        code: input
                    };
                }
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "Code.constructor expects input of type Code" );
                }

                this.code = (typeof input.code === "string")
                    ? input.code
                    : throwTypeError( "Code.code must be of type string" );

                this.codeSystem = (typeof input.codeSystem === "string")
                    ? input.codeSystem
                    : null;

                this.codeSystemName = (typeof input.codeSystemName === "string")
                    ? input.codeSystemName
                    : null;

                this.codeSystemVersion = (typeof input.codeSystemVersion === "string")
                    ? input.codeSystemVersion
                    : null;

                this.displayName = (typeof input.displayName === "string")
                    ? input.displayName
                    : null;

                if( typeof input.codeSystemMandatory === "boolean" && input.codeSystemMandatory ) {
                    if( !this.codeSystem ) {
                        throw new TypeError( "Code.codeSystem must be provided" );
                    }
                }
                if( typeof input.codeSystemForbidden === "boolean" && input.codeSystemForbidden ) {
                    if( this.codeSystem || this.codeSystemName || this.codeSystemVersion || this.displayName ) {
                        throw new TypeError( "Code.codeSystem or its related properties codeSystemName, codeSystemVersion or displayName are not allowed in this location" );
                    }
                }

                // optional code validation
                if( input.codeValidation instanceof RegExp ) {
                    if( !Array.isArray( this.code.match( input.codeValidation ) ) ) {
                        throw new TypeError( `Code.code is ${this.code} but must validate against regex: ${input.codeValidation.source}` );
                    }
                } else if( typeof input.codeValidation === "object" && input.codeValidation !== null ) {
                    if( !Object.values( input.codeValidation ).includes( this.code ) ) {
                        throw new TypeError( `Code.code is ${this.code} but must be of one of ${Object.values( input.codeValidation ).join( ", " )}` );
                    }
                }
            }

            toXMLObject() {
                return {
                    $: {
                        code: this.code,
                        ...(this.codeSystem ? { codeSystem: this.codeSystem } : {}),
                        ...(this.codeSystemName ? { codeSystemName: this.codeSystemName } : {}),
                        ...(this.codeSystemVersion ? { codeSystemVersion: this.codeSystemVersion } : {}),
                        ...(this.displayName ? { displayName: this.displayName } : {})
                    }
                };
            }

            /**
             * @returns {string} <code/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    code: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new Code( {
                    code: input && input.$ && input.$.code,
                    ...(input && input.$ && input.$.codeSystem ? { codeSystem: input.$.codeSystem } : {}),
                    ...(input && input.$ && input.$.codeSystemName ? { codeSystemName: input.$.codeSystemName } : {}),
                    ...(input && input.$ && input.$.codeSystemVersion ? { codeSystemVersion: input.$.codeSystemVersion } : {}),
                    ...(input && input.$ && input.$.displayName ? { displayName: input.$.displayName } : {})
                } );
            }
        }

        /**
         * chapter 5.12.2
         */
        class Author {

            /**
             * Time of documentation.
             * @mandatory chapter 5.12.2
             * @type {Time}
             */
            time;

            /**
             * Author.
             * @mandatory chapter 5.12.2
             * @type {AssignedAuthor}
             */
            assignedAuthor;

            /**
             * Role of the author.
             * NOTE: in the ClinicalDocument.code there may
             *       be the function of the author encoded as well.
             * @optional chapter 5.12.2
             * @type {Code<ParticipationType>|null}
             */
            functionCode = null;

            /**
             * @param {object} input
             * @param {AssignedAuthor} input.assignedAuthor
             * @param {Time|moment|Date|string} input.time
             * @param {ParticipationType|Code|string|null} [input.functionCode]
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "Author.constructor expects input of type Author" );
                }

                this.assignedAuthor = (typeof input.assignedAuthor === "object" && input.assignedAuthor !== null)
                    ? new AssignedAuthor( input.assignedAuthor )
                    : throwTypeError( "Author.assignedAuthor expects input of type AssignedAuthor" );

                this.time = ((typeof input.time === "object" && input.time !== null) || typeof input.time === "string")
                    ? new Time( input.time )
                    : throwTypeError( "Author.time expects input of type Time, moment, Date or string" );

                if( typeof input.functionCode === "string" ) {
                    this.functionCode = new Code( {
                        code: input.functionCode,
                        codeSystem: CodeSystemTypes.ParticipationType,
                        codeValidation: ParticipationType
                    } );
                } else if( typeof input.functionCode === "object" && input.functionCode !== null ) {
                    this.functionCode = new Code( input.functionCode );
                } else {
                    this.functionCode = null;
                }

            }

            toXMLObject() {
                return {
                    ...(this.functionCode ? { functionCode: this.functionCode.toXMLObject() } : {}),
                    time: this.time.toXMLObject(),
                    assignedAuthor: this.assignedAuthor.toXMLObject()
                };
            }

            /**
             * @returns {string} <author/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    author: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new Author( {
                    ...(Array.isArray( input.time ) && input.time.length > 0 ? { time: Time.fromXMLObject( input.time[0] ) } : {}),
                    ...(Array.isArray( input.assignedAuthor ) && input.assignedAuthor.length > 0 ? { assignedAuthor: AssignedAuthor.fromXMLObject( input.assignedAuthor[0] ) } : {}),
                    ...(Array.isArray( input.functionCode ) && input.functionCode.length > 0 ? { functionCode: Code.fromXMLObject( input.functionCode[0] ) } : {})
                } );
            }

        }

        /**
         * chapter 5.12.2
         */
        class AssignedAuthor {

            /**
             * InstanceIdentifier of the patient.
             * @mandatory chapter 5.12.2
             * @type {InstanceIdentifier[]}
             */
            id = [];

            /**
             * Address collection of the author.
             * @optional chapter 5.12.2
             * @type {Address[]}
             */
            addr = [];

            /**
             * Address collection of the author.
             * @optional chapter 5.12.2
             * @type {Telecommunication[]}
             */
            telecom = [];

            /**
             * If the author is a person or device this property is filled.
             * @optional chapter 5.12.2
             * @type {AssignedPerson}
             */
            assignedPerson;

            /**
             * If the author is an organization this property is filled.
             * @optional chapter 5.12.2
             * @type {Organization|null}
             */
            representedOrganization = null;

            /**
             * @param {object} input
             * @param {InstanceIdentifier[]|InstanceIdentifier} input.id
             * @param {Address[]|Address|null} [input.addr]
             * @param {Telecommunication[]|Telecommunication|null} [input.telecom]
             * @param {AssignedPerson} input.assignedPerson
             * @param {Organization|null} [input.representedOrganization]
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "AssignedAuthor.constructor expects input of type AssignedAuthor" );
                }

                if( Array.isArray( input.id ) ) {
                    this.id = input.id.map( item => new InstanceIdentifier( item ) );
                } else if( typeof input.id === "object" && input.id !== null ) {
                    this.id = [new InstanceIdentifier( input.id )];
                } else {
                    this.id = [];
                }
                if( this.id.length === 0 ) {
                    throwTypeError( "AssignedAuthor.id must contain at least one identifier" );
                }

                if( Array.isArray( input.addr ) ) {
                    this.addr = input.addr.map( item => new Address( item ) );
                } else if( typeof input.addr === "object" && input.addr !== null ) {
                    this.addr = [new Address( input.addr )];
                } else {
                    this.addr = [];
                }

                if( Array.isArray( input.telecom ) ) {
                    this.telecom = input.telecom.map( item => new Telecommunication( item ) );
                } else if( typeof input.telecom === "object" && input.telecom !== null ) {
                    this.telecom = [new Telecommunication( input.telecom )];
                } else {
                    this.telecom = [];
                }

                this.assignedPerson = (typeof input.assignedPerson === "object" && input.assignedPerson !== null)
                    ? new AssignedPerson( input.assignedPerson )
                    : throwTypeError( "AssignedAuthor.assignedPerson must be of type AssignedPerson" );

                this.representedOrganization = (typeof input.representedOrganization === "object" && input.representedOrganization !== null)
                    ? new Organization( input.representedOrganization )
                    : null;

            }

            toXMLObject() {
                return {
                    id: this.id.map( item => item.toXMLObject() ),
                    ...(this.addr.length > 0 ? { addr: this.addr.map( item => item.toXMLObject() ) } : {}),
                    ...(this.telecom.length > 0 ? { telecom: this.telecom.map( item => item.toXMLObject() ) } : {}),
                    ...(this.assignedPerson ? { assignedPerson: this.assignedPerson.toXMLObject() } : {}),
                    ...(this.representedOrganization ? { representedOrganization: this.representedOrganization.toXMLObject() } : {})
                };
            }

            /**
             * @returns {string} <assignedAuthor/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    assignedAuthor: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new AssignedAuthor( {
                    ...(Array.isArray( input.id ) ? { id: input.id.map( i => InstanceIdentifier.fromXMLObject( i ) ) } : {}),
                    ...(Array.isArray( input.addr ) && input.addr.length > 0 ? { addr: input.addr.map( item => Address.fromXMLObject( item ) ) } : {}),
                    ...(Array.isArray( input.telecom ) && input.telecom.length > 0 ? { telecom: input.telecom.map( item => Telecommunication.fromXMLObject( item ) ) } : {}),
                    ...(Array.isArray( input.assignedPerson ) && input.assignedPerson.length > 0 ? { assignedPerson: AssignedPerson.fromXMLObject( input.assignedPerson[0] ) } : {}),
                    ...(Array.isArray( input.representedOrganization ) && input.representedOrganization.length > 0 ? { representedOrganization: Organization.fromXMLObject( input.representedOrganization[0] ) } : {})
                } );
            }
        }

        /**
         * chapter 5.12.7
         * Rule PTNO: if participation.typeCode IND and participatingEntity.classCode NOK: one person must be given
         * Rule PTEC: if participation.typeCode IND and participatingEntity.classCode ECON: one person must be given
         * Rule PTPR: if participation.typeCode IND and participatingEntity.classCode PRS: one person must be given
         * Rule PTPH: if participation.typeCode HLD and participatingEntity.classCode POLHOLD: one organisation must be given
         */
        class Participant {

            /**
             * @optional chapter 5.12.7
             * @type {ParticipationTypeForParticipant}
             */
            typeCode;

            /**
             * Timespan of participation.
             * @mandatory chapter 5.12.7
             * @type {Time|null}
             */
            time = null;

            /**
             * Associated person.
             * @mandatory chapter 5.12.2
             * @type {AssociatedEntity[]}
             */
            associatedEntity = [];

            /**
             * @param {object} input
             * @param {ParticipationTypeForParticipant} input.typeCode
             * @param {AssociatedEntity[]|AssociatedEntity|null} [input.associatedEntity]
             * @param {Time|null} [input.time]
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "Participant.constructor expects input of type Participant" );
                }

                this.typeCode = (Object.values( ParticipationTypeForParticipant ).includes( input.typeCode ))
                    ? input.typeCode
                    : throwTypeError( `Participant.typeCode is ${input.typeCode} but must be one of ${Object.values( ParticipationTypeForParticipant )}` );

                this.time = (typeof input.time === "object" && input.time !== null)
                    ? new Time( input.time )
                    : null;

                if( Array.isArray( input.associatedEntity ) ) {
                    this.associatedEntity = input.associatedEntity.map( item => new AssociatedEntity( item ) );
                } else if( typeof input.associatedEntity === "object" && input.associatedEntity !== null ) {
                    this.associatedEntity = [new AssociatedEntity( input.associatedEntity )];
                } else {
                    this.associatedEntity = [];
                }
            }

            toXMLObject() {
                return {
                    $: { typeCode: this.typeCode },
                    ...(this.time ? { time: this.time.toXMLObject() } : {}),
                    ...(this.associatedEntity ? { associatedEntity: this.associatedEntity.map( item => item.toXMLObject() ) } : {})
                };
            }

            /**
             * @returns {string} <participant/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    participant: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new Participant( {
                    ...(input && input.$ && input.$.typeCode ? { typeCode: input.$.typeCode } : {}),
                    ...(Array.isArray( input.time ) && input.time.length > 0 ? { time: Time.fromXMLObject( input.time[0] ) } : {}),
                    ...(Array.isArray( input.associatedEntity ) && input.associatedEntity.length > 0 ? { associatedEntity: input.associatedEntity.map( item => AssociatedEntity.fromXMLObject( item ) ) } : {})
                } );
            }

        }

        /**
         * Adminstrative organization (custodian).
         * @mandatory chapter 5.12.3
         */
        class Custodian {

            /**
             * Author.
             * @mandatory chapter 5.12.2
             * @type {AssignedCustodian}
             */
            assignedCustodian;

            /**
             * @param {object} input
             * @param {AssignedCustodian} input.assignedCustodian
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "Custodian.constructor expects input of type Author" );
                }

                this.assignedCustodian = (typeof input.assignedCustodian === "object" && input.assignedCustodian !== null)
                    ? new AssignedCustodian( input.assignedCustodian )
                    : throwTypeError( "Custodian.assignedCustodian expects input of type AssignedCustodian" );
            }

            toXMLObject() {
                return {
                    assignedCustodian: this.assignedCustodian.toXMLObject()
                };
            }

            /**
             * @returns {string} <custodian/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    custodian: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new Custodian( {
                    ...(Array.isArray( input.assignedCustodian ) && input.assignedCustodian.length > 0 ? { assignedCustodian: AssignedCustodian.fromXMLObject( input.assignedCustodian[0] ) } : {})
                } );
            }

        }

        /**
         * chapter 5.12.3
         */
        class AssignedCustodian {

            /**
             * @mandatory chapter 5.12.3
             * @type {CustodianOrganization}
             */
            representedCustodianOrganization;

            /**
             * @param {object} input
             * @param {CustodianOrganization} input.representedCustodianOrganization
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "AssignedCustodian.constructor expects input of type AssignedCustodian" );
                }

                this.representedCustodianOrganization = (typeof input.representedCustodianOrganization === "object" && input.representedCustodianOrganization !== null)
                    ? new CustodianOrganization( input.representedCustodianOrganization )
                    : throwTypeError( "AssignedCustodian.representedCustodianOrganization expects input of type CustodianOrganization" );
            }

            toXMLObject() {
                return {
                    representedCustodianOrganization: this.representedCustodianOrganization.toXMLObject()
                };
            }

            /**
             * @returns {string} <assignedCustodian/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    assignedCustodian: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new AssignedCustodian( {
                    ...(Array.isArray( input.representedCustodianOrganization ) && input.representedCustodianOrganization.length > 0
                        ? { representedCustodianOrganization: CustodianOrganization.fromXMLObject( input.representedCustodianOrganization[0] ) }
                        : {})
                } );
            }

        }

        /**
         * Intended recipients of the document.
         * chapter 5.12.4
         */
        class IntendedRecipient {

            /**
             * InstanceIdentifier of the patient.
             * @mandatory chapter 5.12.2
             * @type {InstanceIdentifier[]}
             */
            id = [];

            /**
             * Address collection of the recipient.
             * @optional chapter 5.12.4
             * @type {Address[]}
             */
            addr = [];

            /**
             * Address collection of the recipient.
             * @optional chapter 5.12.4
             * @type {Telecommunication[]}
             */
            telecom = [];

            /**
             * If the recipient is a person, this property is filled.
             * @optional chapter 5.12.4
             * @type {Person|null}
             */
            informationRecipient = null;

            /**
             * If the recipient is an organization this property is filled.
             * @optional chapter 5.12.4
             * @type {Organization|null}
             */
            receivedOrganization = null;

            /**
             * @param {object} input
             * @param {InstanceIdentifier[]|InstanceIdentifier} input.id
             * @param {Address[]|Address|null} [input.addr]
             * @param {Telecommunication[]|Telecommunication|null} [input.telecom]
             * @param {Person|null} [input.informationRecipient]
             * @param {Organization||null} [input.receivedOrganization]
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "IntendedRecipient.constructor expects input of type IntendedRecipient" );
                }

                if( Array.isArray( input.id ) ) {
                    this.id = input.id.map( item => new InstanceIdentifier( item ) );
                } else if( typeof input.id === "object" && input.id !== null ) {
                    this.id = [new InstanceIdentifier( input.id )];
                } else {
                    this.id = [];
                }
                if( this.id.length === 0 ) {
                    throw new TypeError( "IntendedRecipient.id must contain at least one identifier" );
                }

                if( Array.isArray( input.addr ) ) {
                    this.addr = input.addr.map( item => new Address( item ) );
                } else if( typeof input.addr === "object" && input.addr !== null ) {
                    this.addr = [new Address( input.addr )];
                } else {
                    this.addr = [];
                }

                if( Array.isArray( input.telecom ) ) {
                    this.telecom = input.telecom.map( item => new Telecommunication( item ) );
                } else if( typeof input.telecom === "object" && input.telecom !== null ) {
                    this.telecom = [new Telecommunication( input.telecom )];
                } else {
                    this.telecom = [];
                }

                this.informationRecipient = (typeof input.informationRecipient === "object" && input.informationRecipient !== null)
                    ? new Person( input.informationRecipient )
                    : null;

                this.receivedOrganization = (typeof input.receivedOrganization === "object" && input.receivedOrganization !== null)
                    ? new Organization( input.receivedOrganization )
                    : null;

            }

            toXMLObject() {
                return {
                    id: this.id.map( item => item.toXMLObject() ),
                    ...(this.addr.length > 0 ? { addr: this.addr.map( item => item.toXMLObject() ) } : {}),
                    ...(this.telecom.length > 0 ? { telecom: this.telecom.map( item => item.toXMLObject() ) } : {}),
                    ...(this.informationRecipient ? { informationRecipient: this.informationRecipient.toXMLObject() } : {}),
                    ...(this.receivedOrganization ? { receivedOrganization: this.receivedOrganization.toXMLObject() } : {})
                };
            }

            /**
             * @returns {string} <intendedRecipient/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    intendedRecipient: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new IntendedRecipient( {
                    ...(Array.isArray( input.id ) ? { id: input.id.map( item => InstanceIdentifier.fromXMLObject( item ) ) } : {}),
                    ...(Array.isArray( input.addr ) ? { addr: input.addr.map( item => Address.fromXMLObject( item ) ) } : {}),
                    ...(Array.isArray( input.telecom ) ? { telecom: input.telecom.map( item => Telecommunication.fromXMLObject( item ) ) } : {}),
                    ...(Array.isArray( input.informationRecipient ) && input.informationRecipient.length > 0 ? { informationRecipient: Person.fromXMLObject( input.informationRecipient[0] ) } : {}),
                    ...(Array.isArray( input.receivedOrganization ) && input.receivedOrganization.length > 0 ? { receivedOrganization: Organization.fromXMLObject( input.receivedOrganization[0] ) } : {})
                } );
            }

        }

        /**
         * Collection of intended recipients of the document.
         * chapter 5.12.4
         */
        class InformationRecipient {

            /**
             * @type {InformationRecipientRole|null}
             */
            typeCode = null;

            /**
             * @optional chapter 5.12.4
             * @type {IntendedRecipient[]}
             */
            intendedRecipient = [];

            /**
             * @param {object} input
             * @param {InformationRecipientRole|null} [input.typeCode]
             * @param {IntendedRecipient[]|IntendedRecipient|null} [input.intendedRecipient]
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "InformationRecipient.constructor expects input of type InformationRecipient" );
                }

                this.typeCode = (input.typeCode && Object.values( InformationRecipientRole ).includes( input.typeCode ))
                    ? input.typeCode
                    : null;

                if( Array.isArray( input.intendedRecipient ) ) {
                    this.intendedRecipient = input.intendedRecipient.map( item => new IntendedRecipient( item ) );
                } else if( typeof input.intendedRecipient === "object" && input.intendedRecipient !== null ) {
                    this.intendedRecipient = [new IntendedRecipient( input.intendedRecipient )];
                } else {
                    this.intendedRecipient = [];
                }
            }

            toXMLObject() {
                return {
                    ...(this.typeCode ? { $: { typeCode: this.typeCode } } : {}),
                    ...(this.intendedRecipient.length > 0 ? { intendedRecipient: this.intendedRecipient.map( item => item.toXMLObject() ) } : {})
                };
            }

            /**
             * @returns {string} <informationRecipient/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    informationRecipient: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new InformationRecipient( {
                    ...(input && input.$ && input.$.typeCode ? { typeCode: input.$.typeCode } : {}),
                    ...(Array.isArray( input.intendedRecipient ) ? { intendedRecipient: input.intendedRecipient.map( item => IntendedRecipient.fromXMLObject( item ) ) } : {})
                } );
            }

        }

        /**
         * chapter 5.13
         */
        class ParentDocument {

            /**
             * @mandatory chapter 5.13
             * @type {InstanceIdentifier[]}
             */
            id = [];

            /**
             * @optional chapter 5.13
             * @type {Code|null}
             */
            code = null;

            /**
             * @optional chapter 5.13
             * @type {InstanceIdentifier|null}
             */
            setId = null;

            /**
             * @optional chapter 5.13
             * @type {number|null}
             */
            versionNumber = null;

            /**
             * @param {object} input
             * @param {InstanceIdentifier[]} input.id
             * @param {Code|string|null} [input.code]
             * @param {InstanceIdentifier|null} [input.setId]
             * @param {number|string|null} [input.versionNumber]
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "ParentDocument.constructor expects input of type ParentDocument" );
                }

                /**
                 * Rule PDID: inside the ParentDocument class there *MUST* be
                 *            at least one id which identifies the parent document
                 * @type {InstanceIdentifier[]|*}
                 */
                if( Array.isArray( input.id ) ) {
                    this.id = input.id.map( item => new InstanceIdentifier( item ) );
                } else if( typeof input.id === "object" && input.id !== null ) {
                    this.id = [new InstanceIdentifier( input.id )];
                } else {
                    this.id = [];
                }
                if( this.id.length === 0 ) {
                    throw new TypeError( "ParentDocument.id must contain at least one identifier" );
                }

                if( typeof input.code === "string" ) {
                    this.code = new Code( {
                        code: input.code,
                        codeSystem: CodeSystemTypes.DocumentTypeCode,
                        codeValidation: DocumentTypeCode
                    } );
                } else if( typeof input.code === "object" && input.code !== null ) {
                    this.code = new Code( input.code );
                } else {
                    this.code = null;
                }

                this.setId = (typeof input.setId === "object" && input.setId !== null)
                    ? new InstanceIdentifier( input.setId )
                    : null;

                this.versionNumber = (typeof input.versionNumber === "number" || typeof input.versionNumber === "string")
                    ? parseInt( input.versionNumber, 10 )
                    : null;

            }

            toXMLObject() {
                return {
                    id: this.id.map( item => item.toXMLObject() ),
                    ...(this.code ? { code: this.code.toXMLObject() } : {}),
                    ...(this.setId ? { setId: this.setId.toXMLObject() } : {}),
                    ...(this.versionNumber ? { versionNumber: this.versionNumber } : {})
                };
            }

            /**
             * @returns {string} <parentDocument/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    parentDocument: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new ParentDocument( {
                    ...(Array.isArray( input.id ) ? { id: input.id.map( item => InstanceIdentifier.fromXMLObject( item ) ) } : {}),
                    ...(Array.isArray( input.code ) && input.code.length > 0 ? { code: Code.fromXMLObject( input.code[0] ) } : {}),
                    ...(Array.isArray( input.setId ) && input.setId.length > 0 ? { setId: InstanceIdentifier.fromXMLObject( input.setId[0] ) } : {}),
                    ...(Array.isArray( input.versionNumber ) && input.versionNumber.length > 0 ? { versionNumber: input.versionNumber[0] } : {})
                } );
            }

        }

        /**
         * chapter 5.13
         */
        class RelatedDocument {

            /**
             * @type {DocumentRelationshipType|null}
             */
            typeCode;

            /**
             * @optional chapter 5.13
             * @type {ParentDocument[]}
             */
            parentDocument = [];

            /**
             * @param {object} input
             * @param {DocumentRelationshipType|null} [input.typeCode]
             * @param {ParentDocument[]|ParentDocument|null} [input.parentDocument]
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "RelatedDocument.constructor expects input of type RelatedDocument" );
                }

                this.typeCode = (input.typeCode && Object.values( DocumentRelationshipType ).includes( input.typeCode ))
                    ? input.typeCode
                    : null;

                if( Array.isArray( input.parentDocument ) ) {
                    this.parentDocument = input.parentDocument.map( item => new ParentDocument( item ) );
                } else if( typeof input.parentDocument === "object" && input.parentDocument !== null ) {
                    this.parentDocument = [new ParentDocument( input.parentDocument )];
                } else {
                    this.parentDocument = [];
                }
            }

            toXMLObject() {
                return {
                    ...(this.typeCode ? { $: { typeCode: this.typeCode } } : {}),
                    ...(this.parentDocument.length > 0 ? { parentDocument: this.parentDocument.map( item => item.toXMLObject() ) } : {})
                };
            }

            /**
             * @returns {string} <relatedDocument/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    relatedDocument: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new RelatedDocument( {
                    ...(input && input.$ && input.$.typeCode ? { typeCode: input.$.typeCode } : {}),
                    ...(Array.isArray( input.parentDocument ) && input.parentDocument.length > 0 ? { parentDocument: input.parentDocument.map( item => ParentDocument.fromXMLObject( item ) ) } : {})
                } );
            }

        }

        /**
         * chapter 5.14
         */
        class HealthCareFacility {

            /**
             * @optional chapter 5.14
             * @type {InstanceIdentifier[]}
             */
            id = [];

            /**
             * @optional chapter 5.14
             * @type {Code|null}
             */
            code = null;

            /**
             * @optional chapter 5.14
             * @type {Place|null}
             */
            location = null;

            /**
             * @optional chapter 5.14
             * @type {Organization|null}
             */
            serviceProviderOrganization = null;

            /**
             * @param {object} input
             * @param {InstanceIdentifier[]|InstanceIdentifier} input.id
             * @param {Code|string|null} [input.code]
             * @param {Place|null} [input.location]
             * @param {Organization|null} [input.serviceProviderOrganization]
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "HealthCareFacility.constructor expects input of type HealthCareFacility" );
                }

                if( Array.isArray( input.id ) ) {
                    this.id = input.id.map( item => new InstanceIdentifier( item ) );
                } else if( typeof input.id === "object" && input.id !== null ) {
                    this.id = [new InstanceIdentifier( input.id )];
                } else {
                    this.id = [];
                }

                if( typeof input.code === "string" ) {
                    this.code = new Code( {
                        code: input.code,
                        codeSystem: CodeSystemTypes.ServiceDeliveryLocationRoleType,
                        codeValidation: ServiceDeliveryLocationRoleType
                    } );
                } else if( typeof input.code === "object" && input.code !== null ) {
                    this.code = new Code( input.code );
                } else {
                    this.code = null;
                }

                this.location = (typeof input.location === "object" && input.location !== null)
                    ? new Place( input.location )
                    : null;

                this.serviceProviderOrganization = (typeof input.serviceProviderOrganization === "object" && input.serviceProviderOrganization !== null)
                    ? new Organization( input.serviceProviderOrganization )
                    : null;

            }

            toXMLObject() {
                return {
                    ...(this.id.length > 0 ? { id: this.id.map( item => item.toXMLObject() ) } : {}),
                    ...(this.code ? { code: this.code.toXMLObject() } : {}),
                    ...(this.location ? { location: this.location.toXMLObject() } : {}),
                    ...(this.serviceProviderOrganization ? { serviceProviderOrganization: this.serviceProviderOrganization.toXMLObject() } : {})
                };
            }

            /**
             * @returns {string} <healthCareFacility/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    healthCareFacility: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new HealthCareFacility( {
                    ...(Array.isArray( input.id ) ? { id: input.id.map( item => InstanceIdentifier.fromXMLObject( item ) ) } : {}),
                    ...(Array.isArray( input.code ) && input.code.length > 0 ? { code: Code.fromXMLObject( input.code[0] ) } : {}),
                    ...(Array.isArray( input.location ) && input.location.length > 0 ? { location: Place.fromXMLObject( input.location[0] ) } : {}),
                    ...(Array.isArray( input.serviceProviderOrganization ) && input.serviceProviderOrganization.length > 0 ? { serviceProviderOrganization: Organization.fromXMLObject( input.serviceProviderOrganization[0] ) } : {})
                } );
            }
        }

        class Location {

            /**
             * @type {HealthCareFacility|null}
             */
            healthCareFacility = null;

            /**
             * @param {object} input
             * @param {HealthCareFacility|null} [input.healthCareFacility]
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "Location.constructor expects input of type Location" );
                }

                this.healthCareFacility = (typeof input.healthCareFacility === "object" && input.healthCareFacility !== null)
                    ? new HealthCareFacility( input.healthCareFacility )
                    : null;

            }

            toXMLObject() {
                return {
                    ...(this.healthCareFacility ? { healthCareFacility: this.healthCareFacility.toXMLObject() } : {})
                };
            }

            /**
             * @returns {string} <location/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    location: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new Location( {
                    ...(Array.isArray( input.healthCareFacility ) && input.healthCareFacility.length > 0 ? { healthCareFacility: HealthCareFacility.fromXMLObject( input.healthCareFacility[0] ) } : {})
                } );
            }
        }

        /**
         * chapter 5.14
         */
        class EncompassingEncounter {

            /**
             * @optional chapter 5.14
             * @type {InstanceIdentifier[]}
             */
            id = [];

            /**
             * @optional chapter 5.14
             * @type {Code|null}
             */
            code = null;

            /**
             * @mandatory chapter 5.14
             * @type {Time}
             */
            effectiveTime;

            /**
             * @optional chapter 5.14
             * @type {Code|null}
             */
            dischargeDispositionCode = null;

            /**
             * @optional chapter 5.14
             * @type {ResponsibleParty|null}
             */
            responsibleParty = null;

            /**
             * @optional chapter 5.14
             * @type {EncounterParticipant|null}
             */
            encounterParticipant = null;

            /**
             * @optional chapter 5.14
             * @type {Location|null}
             */
            location = null;

            /**
             * @param {object} input
             * @param {InstanceIdentifier[]|InstanceIdentifier|null} [input.id]
             * @param {EncounterCode|Code<EncounterCode>|string|null} [input.code]
             * @param {Time} input.effectiveTime
             * @param {DischargeDispositionCode|Code<DischargeDispositionCode>|string|null} [input.dischargeDispositionCode]
             * @param {ResponsibleParty|null} [input.responsibleParty]
             * @param {EncounterParticipant|null} [input.encounterParticipant]
             * @param {Location|null} [input.location]
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "EncompassingEncounter.constructor expects input of type EncompassingEncounter" );
                }

                if( Array.isArray( input.id ) ) {
                    this.id = input.id.map( item => new InstanceIdentifier( item ) );
                } else if( typeof input.id === "object" && input.id !== null ) {
                    this.id = [new InstanceIdentifier( input.id )];
                } else {
                    this.id = [];
                }

                if( typeof input.code === "string" ) {
                    this.code = new Code( {
                        code: input.code,
                        codeSystem: CodeSystemTypes.EncounterCode,
                        codeValidation: EncounterCode
                    } );
                } else if( typeof input.code === "object" && input.code !== null ) {
                    this.code = new Code( input.code );
                } else {
                    this.code = null;
                }

                this.effectiveTime = (typeof input.effectiveTime === "object" && input.effectiveTime !== null)
                    ? new Time( input.effectiveTime )
                    : throwTypeError( "EncompassingEncounter.effectiveTime must be a timespan" );

                if( typeof input.dischargeDispositionCode === "string" ) {
                    this.dischargeDispositionCode = new Code( {
                        code: input.dischargeDispositionCode,
                        codeSystem: CodeSystemTypes.DischargeDispositionCode,
                        codeValidation: DischargeDispositionCode
                    } );
                } else if( typeof input.dischargeDispositionCode === "object" && input.dischargeDispositionCode !== null ) {
                    this.dischargeDispositionCode = new Code( input.dischargeDispositionCode );
                } else {
                    this.dischargeDispositionCode = null;
                }

                this.responsibleParty = (typeof input.responsibleParty === "object" && input.responsibleParty !== null)
                    ? new ResponsibleParty( input.responsibleParty )
                    : null;

                this.encounterParticipant = (typeof input.encounterParticipant === "object" && input.encounterParticipant !== null)
                    ? new EncounterParticipant( input.encounterParticipant )
                    : null;

                this.location = (typeof input.location === "object" && input.location !== null)
                    ? new Location( input.location )
                    : null;

            }

            toXMLObject() {
                return {
                    ...(this.id.length > 0 ? { id: this.id.map( item => item.toXMLObject() ) } : {}),
                    ...(this.code ? { code: this.code.toXMLObject() } : {}),
                    ...(this.effectiveTime ? { effectiveTime: this.effectiveTime.toXMLObject() } : {}),
                    ...(this.versionNumber ? { versionNumber: this.versionNumber } : {}),
                    ...(this.dischargeDispositionCode ? { dischargeDispositionCode: this.dischargeDispositionCode.toXMLObject() } : {}),
                    ...(this.responsibleParty ? { responsibleParty: this.responsibleParty.toXMLObject() } : {}),
                    ...(this.encounterParticipant ? { encounterParticipant: this.encounterParticipant.toXMLObject() } : {}),
                    ...(this.location ? { location: this.location.toXMLObject() } : {})
                };
            }

            /**
             * @returns {string} <encompassingEncounter/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    encompassingEncounter: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new EncompassingEncounter( {
                    ...(Array.isArray( input.effectiveTime ) && input.effectiveTime.length > 0 ? { effectiveTime: Time.fromXMLObject( input.effectiveTime[0] ) } : {}),
                    ...(Array.isArray( input.id ) ? { id: input.id.map( item => InstanceIdentifier.fromXMLObject( item ) ) } : {}),
                    ...(Array.isArray( input.code ) && input.code.length > 0 ? { code: Code.fromXMLObject( input.code[0] ) } : {}),
                    ...(Array.isArray( input.versionNumber ) && input.versionNumber.length > 0 ? { versionNumber: input.versionNumber[0] } : {}),
                    ...(Array.isArray( input.dischargeDispositionCode ) && input.dischargeDispositionCode.length > 0 ? { dischargeDispositionCode: Code.fromXMLObject( input.dischargeDispositionCode[0] ) } : {}),
                    ...(Array.isArray( input.responsibleParty ) && input.responsibleParty.length > 0 ? { responsibleParty: ResponsibleParty.fromXMLObject( input.responsibleParty[0] ) } : {}),
                    ...(Array.isArray( input.encounterParticipant ) && input.encounterParticipant.length > 0 ? { encounterParticipant: EncounterParticipant.fromXMLObject( input.encounterParticipant[0] ) } : {}),
                    ...(Array.isArray( input.location ) && input.location.length > 0 ? { location: Location.fromXMLObject( input.location[0] ) } : {})
                } );
            }

        }

        /**
         * chapter 5.15
         */
        class Consent {

            /**
             * @optional chapter 5.15
             * @type {InstanceIdentifier[]}
             */
            id = [];

            /**
             * @optional chapter 5.15
             * @type {Code|null}
             */
            code = null;

            /**
             * @param {object} input
             * @param {InstanceIdentifier[]|InstanceIdentifier} [input.id]
             * @param {Code|string|null} [input.code]
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "Consent.constructor expects input of type Consent" );
                }

                if( Array.isArray( input.id ) ) {
                    this.id = input.id.map( item => new InstanceIdentifier( item ) );
                } else if( typeof input.id === "object" && input.id !== null ) {
                    this.id = [new InstanceIdentifier( input.id )];
                } else {
                    this.id = [];
                }

                if( typeof input.code === "string" ) {
                    this.code = new Code( {
                        code: input.code,
                        codeSystem: CodeSystemTypes.EncounterCode,
                        codeValidation: EncounterCode
                    } );
                } else if( typeof input.code === "object" && input.code !== null ) {
                    this.code = new Code( input.code );
                } else {
                    this.code = null;
                }

            }

            toXMLObject() {
                return {
                    ...(this.id.length > 0 ? { id: this.id.map( item => item.toXMLObject() ) } : {}),
                    ...(this.code ? { code: this.code.toXMLObject() } : {}),
                    statusCode: { $: { code: "completed" } }
                };
            }

            /**
             * @returns {string} <consent/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    consent: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new Consent( {
                    ...(Array.isArray( input.id ) ? { id: input.id.map( item => InstanceIdentifier.fromXMLObject( item ) ) } : {}),
                    ...(Array.isArray( input.code ) && input.code.length > 0 ? { code: Code.fromXMLObject( input.code[0] ) } : {})
                } );
            }

        }

        /**
         * chapter 5.15
         */
        class Authorization {

            /**
             * @optional chapter 5.15
             * @type {Consent[]}
             */
            consent = [];

            /**
             * @param {object} input
             * @param {Consent[]|Consent|null} [input.consent]
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "Authorization.constructor expects input of type Authorization" );
                }

                if( Array.isArray( input.consent ) ) {
                    this.consent = input.consent.map( item => new Consent( item ) );
                } else if( typeof input.consent === "object" && input.consent !== null ) {
                    this.consent = [new Consent( input.consent )];
                } else {
                    this.consent = [];
                }

            }

            toXMLObject() {
                return {
                    ...(this.consent.length > 0 ? { consent: this.consent.map( item => item.toXMLObject() ) } : {})
                };
            }

            /**
             * @returns {string} <authorization/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    authorization: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new Authorization( {
                    ...(Array.isArray( input.consent ) ? { consent: input.consent.map( item => Consent.fromXMLObject( item ) ) } : {})
                } );
            }

        }

        /**
         * chapter 5.15
         */
        class ComponentOf {

            /**
             * @optional chapter 5.15
             * @type {EncompassingEncounter}
             */
            encompassingEncounter = [];

            /**
             * @param {object} input
             * @param {EncompassingEncounter} input.encompassingEncounter
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "ComponentOf.constructor expects input of type ComponentOf" );
                }

                this.encompassingEncounter = (typeof input.encompassingEncounter === "object" && input.encompassingEncounter !== null)
                    ? new EncompassingEncounter( input.encompassingEncounter )
                    : throwTypeError( 'ComponentOf.encompassingEncounter requires an object of type EncompassingEncounter' );

            }

            toXMLObject() {
                return {
                    encompassingEncounter: this.encompassingEncounter.toXMLObject()
                };
            }

            /**
             * @returns {string} <componentOf/>
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    componentOf: this.toXMLObject()
                } );
            }

            static fromXMLObject( input ) {
                return new ComponentOf( {
                    ...(Array.isArray( input.encompassingEncounter ) && input.encompassingEncounter.length > 0 ? { encompassingEncounter: EncompassingEncounter.fromXMLObject( input.encompassingEncounter[0] ) } : {})
                } );
            }

        }

        /**
         * Root structure of an "eArztbrief", an electronical doc letter.
         *
         * Rule NMSP: The document *MUST* start with the element <ClinicalDocument>
         *            and contain the attribute xmlns.
         *
         * @see https://hl7.de/wp-content/uploads/Leitfaden-VHitG-Arztbrief-v150.pdf
         */
        class ClinicalDocument {

            /**
             * InstanceIdentifier of the document.
             * @mandatory chapter 5.5
             * @type {InstanceIdentifier}
             */
            id;

            /**
             * Code which describes the document's content.
             * @mandatory chapter 5.6
             * @type {Code}
             */
            code;

            /**
             * Document title. May contain document type, author and date.
             * I.E. "Entlassbrief von Dr. Müller, Gutsklinik, vom 24.09.2005"
             * @optional chapter 5.7
             * @type {string|null}
             */
            title;

            /**
             * Document creation date.
             * @mandatory chapter 5.8
             * @type {Time}
             */
            effectiveTime;

            /**
             * Confidentiality code of the document.
             * @mandatory chapter 5.9
             * @type {Code}
             */
            confidentialityCode;

            /**
             * Format ss-CC.
             * ss = language code ISO-639-1
             * CC = country code ISO 3166
             * @optional chapter 5.10
             * @type {Code|null}
             */
            languageCode = null;

            /**
             * Describes the set of documents which is versioned.
             * Stays the same across multiple document versions.
             * @type {InstanceIdentifier|null}
             */
            setId = null;

            /**
             * Number is increased by one for each version.
             * @type {number|null}
             */
            versionNumber = null;

            /**
             * Patient about which the document is reporting.
             * @mandatory chapter 5.12.1
             * @type {RecordTarget[]}
             */
            recordTarget = [];

            /**
             * Author of the document.
             * @mandatory chapter 5.12.2
             * @type {Author[]}
             */
            author = [];

            /**
             * Managing organization.
             * @mandatory chapter 5.12.3
             * @type {Custodian}
             */
            custodian;

            /**
             * Intended recipient.
             * @mandatory chapter 5.12.4
             * @type {InformationRecipient[]}
             */
            informationRecipient = [];

            /**
             * Authenticators are optional approvals given by entities for the document.
             * @optional chapter 5.12.5
             * @type {Authenticator[]}
             */
            authenticator = [];

            /**
             * Authenticators are optional approvals given by entities for the document.
             * @optional chapter 5.12.5
             * @type {Authenticator|null}
             */
            legalAuthenticator = null;

            /**
             * Persons or entities important for the documentation.
             * NOTE: If insurance companies are mentioned here, these may *NOT* be used
             *       for billing purposes. This is just for information purposes.
             *       See note in chapter 5.12.8.
             * @optional chapter 5.12.7
             * @type {Participant[]}
             */
            participant = [];

            /**
             * Related documents to this document.
             * @optional chapter 5.13
             * @type {RelatedDocument[]}
             */
            relatedDocument = [];

            /**
             * @optional chapter 5.14
             * @type {ComponentOf|null}
             */
            componentOf = null;

            /**
             * @optional chapter 5.15
             * @type {Authorization[]}
             */
            authorization = [];

            /**
             * @param {object} input
             * @param {InstanceIdentifier} input.id mandatory
             * @param {Code|string} input.code mandatory (code system must be LOINC)
             * @param {string|null} [input.title=""]
             * @param {Date|moment|string|Time} input.effectiveTime
             * @param {ConfidentialityCode|Code} input.confidentialityCode
             * @param {string|Code|null} [input.languageCode]
             * @param {InstanceIdentifier|null} [input.setId]
             * @param {number|string|null} [input.versionNumber]
             * @param {RecordTarget[]|RecordTarget} input.recordTarget
             * @param {Author[]|Author} input.author
             * @param {Custodian} input.custodian
             * @param {InformationRecipient[]|InformationRecipient} input.informationRecipient
             * @param {Authenticator[]|Authenticator|null} [input.authenticator]
             * @param {Authenticator|null} input.legalAuthenticator
             * @param {Participant[]|Participant|null} [input.participant]
             * @param {RelatedDocument[]|RelatedDocument|null} [input.relatedDocument]
             * @param {ComponentOf|null} [input.componentOf]
             * @param {Authorization[]|Authorization|null} [input.authorization]
             */
            constructor( input ) {
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( "ClinicalDocument input must be of type object" );
                }

                this.id = (typeof input.id === "object" && input.id !== null)
                    ? new InstanceIdentifier( input.id )
                    : throwTypeError( "ClinicalDocument.id must be of type InstanceIdentifier" );

                this.setId = (typeof input.setId === "object")
                    ? new InstanceIdentifier( input.setId )
                    : null;

                switch( typeof input.versionNumber ) {
                    case "number":
                        this.versionNumber = input.versionNumber;
                        break;
                    case "string":
                        this.versionNumber = parseInt( input.versionNumber, 10 );
                        break;
                    default:
                        this.versionNumber = null;
                }

                /**
                 * Rule CDCD: ClinicalDocument.code *MUST* provide a @code and @codeSystem attribute.
                 * Rule CDLN: The code-system for ClinicalDocument.code *MUST* be LOINC.
                 */
                if( typeof input.code === "string" ) {
                    this.code = new Code( {
                        code: input.code,
                        codeSystem: CodeSystemTypes.DocumentTypeCode,
                        codeValidation: DocumentTypeCode
                    } );
                } else if( typeof input.code === "object" && input.code !== null ) {
                    this.code = new Code( input.code );
                } else {
                    throw new TypeError( "ClinicalDocument.code must be provided" );
                }

                this.title = (typeof input.title === "string")
                    ? input.title
                    : null;

                /**
                 * Rule CDET: The document creation time ClinicalDocument.effectiveTime
                 *            *MUST* have at least an accuracy of year, month and day.
                 */
                this.effectiveTime = (typeof input.effectiveTime === "object" && input.effectiveTime !== null)
                    ? new Time( input.effectiveTime )
                    : throwTypeError( "ClinicalDocument.effectiveTime must be of type Time" );

                if( input.confidentialityCode && Object.values( ConfidentialityCode ).includes( input.confidentialityCode ) ) {
                    this.confidentialityCode = new Code( {
                        code: input.confidentialityCode,
                        codeSystem: CodeSystemTypes.ConfidentialityCode,
                        codeValidation: ConfidentialityCode
                    } );
                } else if( typeof input.confidentialityCode === "object" && input.confidentialityCode !== null ) {
                    this.confidentialityCode = new Code( input.confidentialityCode );
                } else {
                    throw new TypeError( `ClinicalDocument.confidentialityCode is ${input.confidentialityCode} but must be one of ${Object.values( ConfidentialityCode ).join( ", " )}` );
                }

                /**
                 * Rule CDLC: The format of the languageCode must be given like ss-CC, whereas ss are two lower-case
                 *            letters according to the language code ISO-639-1, and CC are two capital case letters
                 *            according to the country code ISO 3166.
                 */
                if( typeof input.languageCode === "string" ) {
                    // non-compliant XML files transfer only the lower case code
                    // => for compliance, we convert the lower case code into `ss-SS` here.
                    if( input.languageCode.length === 2 ) {
                        input.languageCode = `${input.languageCode.toLowerCase()}-${input.languageCode.toUpperCase()}`;
                    }
                    this.languageCode = new Code( {
                        code: input.languageCode,
                        codeSystemForbidden: true,
                        codeValidation: ClinicalDocument.REGEXP_LANGUAGECODE
                    } );
                } else if( typeof input.languageCode === "object" && input.languageCode !== null ) {
                    if( typeof input.languageCode.code === "string" && input.languageCode.code.length === 2 ) {
                        input.languageCode.code = `${input.languageCode.code.toLowerCase()}-${input.languageCode.code.toUpperCase()}`;
                    }
                    this.languageCode = new Code( {
                        ...input.languageCode,
                        codeSystemForbidden: true,
                        codeValidation: ClinicalDocument.REGEXP_LANGUAGECODE
                    } );
                } else {
                    this.languageCode = null;
                }

                /**
                 * Rule PATR: There *MUST* be at least one patient-role (role) given, with *exactly* one patient (entity).
                 */
                if( Array.isArray( input.recordTarget ) ) {
                    this.recordTarget = input.recordTarget.map( item => new RecordTarget( item ) );
                } else if( typeof input.recordTarget === "object" && input.recordTarget !== null ) {
                    this.recordTarget = [new RecordTarget( input.recordTarget )];
                } else {
                    this.recordTarget = [];
                }
                if( this.recordTarget.length === 0 ) {
                    throw new TypeError( "ClinicalDocument.recordTarget must at least contain a RecordTarget" );
                } else if( !this.recordTarget.some( item => item.patientRole.length === 1 ) ) {
                    throw new TypeError( "ClinicalDocument.recordTarget must at least contain a RecordTarget with exactly one PatientRole" );
                }

                if( Array.isArray( input.author ) ) {
                    this.author = input.author.map( item => new Author( item ) );
                } else if( typeof input.author === "object" && input.author !== null ) {
                    this.author = [new Author( input.author )];
                } else {
                    this.author = [];
                }
                if( this.author.length === 0 ) {
                    throw new TypeError( "ClinicalDocument.author must at least contain a valid Author" );
                }

                this.custodian = (typeof input.custodian === "object" && input.custodian !== null)
                    ? new Custodian( input.custodian )
                    : throwTypeError( "ClinicalDocument.custodian must be of type Custodian" );

                if( Array.isArray( input.informationRecipient ) ) {
                    this.informationRecipient = input.informationRecipient.map( item => new InformationRecipient( item ) );
                } else if( typeof input.informationRecipient === "object" && input.informationRecipient !== null ) {
                    this.informationRecipient = [new InformationRecipient( input.informationRecipient )];
                } else {
                    this.informationRecipient = [];
                }

                if( Array.isArray( input.authenticator ) ) {
                    this.authenticator = input.authenticator.map( item => new Authenticator( item ) );
                } else if( typeof input.authenticator === "object" && input.authenticator !== null ) {
                    this.authenticator = [new Authenticator( input.authenticator )];
                } else {
                    this.authenticator = [];
                }

                this.legalAuthenticator = (typeof input.legalAuthenticator === "object" && input.legalAuthenticator !== null)
                    ? new Authenticator( input.legalAuthenticator )
                    : null;

                if( Array.isArray( input.participant ) ) {
                    this.participant = input.participant.map( item => new Participant( item ) );
                } else if( typeof input.participant === "object" && input.participant !== null ) {
                    this.participant = [new Participant( input.participant )];
                } else {
                    this.participant = [];
                }

                if( Array.isArray( input.relatedDocument ) ) {
                    this.relatedDocument = input.relatedDocument.map( item => new RelatedDocument( item ) );
                } else if( typeof input.relatedDocument === "object" && input.relatedDocument !== null ) {
                    this.relatedDocument = [new RelatedDocument( input.relatedDocument )];
                } else {
                    this.relatedDocument = [];
                }

                this.componentOf = (typeof input.componentOf === "object" && input.componentOf !== null)
                    ? new ComponentOf( input.componentOf )
                    : null;

                if( Array.isArray( input.authorization ) ) {
                    this.authorization = input.authorization.map( item => new Authorization( item ) );
                } else if( typeof input.authorization === "object" && input.authorization !== null ) {
                    this.authorization = [new Authorization( input.authorization )];
                } else {
                    this.authorization = [];
                }

                /** #############################################
                 *   Validation rules for a valid CDA document
                 * ############################################# */

                /**
                 * Rule RELD: A conformant CDA dokument can contain:
                 *            - a single relatedDocument of @typeCode APND, or
                 *            - a single relatedDocument of @typeCode RPLC, or
                 *            - a single relatedDocument of @typeCode XFRM, or
                 *            - two relatedDocuments of @typeCode XFRM and RPLC, or
                 *            - two relatedDocuments of @typeCode XFRM and APND
                 */
                if( this.relatedDocument.length === 1 ) {
                    const singleDocumentTypes = [DocumentRelationshipType.Appends, DocumentRelationshipType.Replaces, DocumentRelationshipType.Transformed];
                    if( !singleDocumentTypes.includes( this.relatedDocument[0].typeCode ) ) {
                        throw new TypeError( `ClinicalDocument.relatedDocument must be of type ${singleDocumentTypes.join( ", " )}` );
                    }
                } else if( this.relatedDocument.length === 2 ) {
                    const
                        rootType = DocumentRelationshipType.Transformed,
                        foundRoot = this.relatedDocument.some( item => item.typeCode === rootType ),
                        counterpartTypes = [DocumentRelationshipType.Appends, DocumentRelationshipType.Replaces],
                        foundCounterpart = this.relatedDocument.some( item => counterpartTypes.includes( item.typeCode ) );
                    if( !foundRoot || !foundCounterpart ) {
                        throw new TypeError( `ClinicalDocument.relatedDocument allows the combination of type: ${rootType} + ${counterpartTypes.join( "|" )}` );
                    }
                } else if( this.relatedDocument.length !== 0 ) {
                    throw new TypeError( "ClinicalDocument.relatedDocument allows a maximum of 2 documents" );
                }

            }

            /**
             * XML header construction
             *
             * Rule HEAD: The header may *ONLY* contain elements of types:
             *
             * @see https://hl7.de/wp-content/uploads/Leitfaden-VHitG-Arztbrief-v150.pdf
             * @returns {object}
             */
            toXMLHeaderObject() {
                return {
                    /**
                     * Rule TYID: The static typeID has to be added:
                     *            <typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
                     *
                     * @mandatory chapter 5.4
                     * @see https://hl7.de/wp-content/uploads/Leitfaden-VHitG-Arztbrief-v150.pdf
                     */
                    typeId: {
                        $: {
                            root: "2.16.840.1.113883.1.3",
                            extension: "POCD_HD000040"
                        }
                    },

                    /**
                     * @optional chapter 5.2
                     * @see https://hl7.de/wp-content/uploads/Leitfaden-VHitG-Arztbrief-v150.pdf
                     */
                    templateId: {
                        $: {
                            extension: "CDA-R2-AB100",
                            root: "1.2.276.0.76.3.1.13.10"
                        }
                    },

                    /**
                     * InstanceIdentifier of the document.
                     * @mandatory chapter 5.5
                     * @see https://hl7.de/wp-content/uploads/Leitfaden-VHitG-Arztbrief-v150.pdf
                     */
                    id: this.id.toXMLObject(),

                    /**
                     * Code which describes the document's content.
                     * @mandatory chapter 5.6
                     * @see https://hl7.de/wp-content/uploads/Leitfaden-VHitG-Arztbrief-v150.pdf
                     */
                    code: this.code.toXMLObject(),

                    /**
                     * Document title. May contain document type, author and date.
                     * I.E. "Entlassbrief von Dr. Müller, Gutsklinik, vom 24.09.2005"
                     * @optional: chapter 5.7
                     */
                    ...(this.title ? { title: { _: this.title } } : {}),

                    /**
                     * Creation date of the document.
                     * @mandatory chapter 5.8
                     */
                    effectiveTime: this.effectiveTime.toXMLObject( ClinicalDocument.FORMAT_EFFECTIVETIME ),

                    /**
                     * @mandatory chapter 5.9
                     */
                    confidentialityCode: this.confidentialityCode.toXMLObject(),

                    /**
                     * @optional chapter 5.10
                     */
                    ...(this.languageCode ? { languageCode: this.languageCode.toXMLObject() } : {}),

                    /**
                     * SetId equal for all documents of the same set.
                     * @optional
                     */
                    ...(this.setId ? { setId: this.setId.toXMLObject() } : {}),

                    /**
                     * Document version number.
                     * @optional
                     */
                    ...(this.versionNumber ? { versionNumber: { $: { value: this.versionNumber } } } : {}),

                    /**
                     * At least a single PatientRole with a patient must be given.
                     * @mandatory chapter 5.12
                     */
                    recordTarget: this.recordTarget.map( item => item.toXMLObject() ),

                    /**
                     * At least a single author must be given.
                     * @mandatory chapter 5.12.2
                     */
                    author: this.author.map( item => item.toXMLObject() ),

                    /**
                     * At least a single custodian must be given.
                     * @mandatory chapter 5.12.3
                     */
                    custodian: this.custodian.toXMLObject(),

                    /**
                     * A informationRecipient can be given.
                     * @optional chapter 5.12.4
                     */
                    ...(this.informationRecipient.length > 0 ? { informationRecipient: this.informationRecipient.map( item => item.toXMLObject() ) } : {}),

                    /**
                     * Person signing the document.
                     * @optional chapter 5.12.5
                     */
                    ...(this.legalAuthenticator ? { legalAuthenticator: this.legalAuthenticator.toXMLObject() } : {}),

                    /**
                     * People additionally signing the document.
                     * @optional chapter 5.12.5
                     */
                    ...(this.authenticator.length > 0 ? { authenticator: this.authenticator.map( item => item.toXMLObject() ) } : {}),

                    /**
                     * Entities relevant for the documentation.
                     * @optional chapter 5.12.7
                     */
                    ...(this.participant.length > 0 ? { participant: this.participant.map( item => item.toXMLObject() ) } : {}),

                    /**
                     * Related document.
                     * @optional chapter 5.13
                     */
                    ...(this.relatedDocument.length > 0 ? { relatedDocument: this.relatedDocument.map( item => item.toXMLObject() ) } : {}),

                    /**
                     * @optional chapter 5.15
                     */
                    ...(this.authorization.length > 0 ? { authorization: this.authorization.map( item => item.toXMLObject() ) } : {}),

                    /**
                     * @optional chapter 5.14
                     */
                    ...(this.componentOf ? { componentOf: this.componentOf.toXMLObject() } : {})
                };
            }

            /**
             * XML body construction
             *
             * @see https://hl7.de/wp-content/uploads/Leitfaden-VHitG-Arztbrief-v150.pdf
             * @returns {object}
             */
            toXMLBodyObject() {
                // TODO: add more sections
                return { component: { section: {} } };
            }

            /**
             * Returns the document's XML root structure object.
             * NOTE: does NOT contain the root element (i.e. <ClinicalDocument>, in analogy to all other toXMLObject functions)
             * @returns {{code: {$: {code: string, codeSystem: string}}, recordTarget: *[], $: {xmlns: string, "xmlns:voc": string, "xmlns:xsi": string}, custodian: {assignedCustodian: {representedCustodianOrganization: {name: *[], telecom: *[], id: *[], addr: *[]}}}, effectiveTime: {high: {inclusive: string, value: *}, $: {value: *}, low: {value: *}}, author: *[], templateID: {$: {extension: string, root: string}}, title: {_: string}, confidentialityCode: {$: {code: string, codeSystem: string}}, languageCode: {$: {code: string}}, consent: *[], participant: *[], component: {structuredBody: {}}, legalAuthenticator: *, typeId: {$: {extension: string, root: string}}, id: {id: {$: {extension: string, root: string}}}, informationRecipient: *[], authenticator: *[], relatedDocument: *[], componentOf: *}}
             */
            toXMLObject() {
                return {
                    $: {
                        "xmlns": "urn:hl7-org:v3",
                        "xmlns:voc": "urn:hl7-org:v3/voc",
                        "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance"
                    },
                    // inject the header
                    ...this.toXMLHeaderObject(),
                    component: {
                        structuredBody: {
                            // inject the body
                            ...this.toXMLBodyObject()
                        }
                    }
                };
            }

            /**
             * Validates the given XML string against the CDA schema.
             * @param {string} input
             * @returns {Promise<string[]>} error messages returned by the libxmljs validation object
             */
            static async validateXMLString( input ) {
                const
                    xsdSchemaFile = path.resolve( __dirname, 'assets', 'edocletter', 'CDA.xsd' ),
                    xsdSchemaFileContent = await fs.promises.readFile( xsdSchemaFile ),
                    xsdDoc = libxmljs.parseXml( xsdSchemaFileContent ),
                    xmlDoc = libxmljs.parseXml( input );

                // validate the schema to populate the validationError messages
                xmlDoc.validate( xsdDoc );

                return xmlDoc.validationErrors;
            }

            /**
             * Creates an XML string from the XML object returned by toXMLObject.
             * @returns {string}
             */
            toXMLString() {
                return ClinicalDocument.buildXMLString( {
                    ClinicalDocument: this.toXMLObject()
                } );
            }

            /**
             * Builds an XML string from a given XML object.
             * @param {object} xmlObject
             * @returns {string}
             */
            static buildXMLString( xmlObject ) {
                return new xml2js.Builder( ClinicalDocument.XML_BUILDER_OPTIONS ).buildObject( xmlObject );
            }

            static XML_BUILDER_OPTIONS = {
                headless: false,
                xmldec: {
                    version: '1.0',
                    encoding: 'UTF-8',
                    standalone: true
                },
                renderOpts: {
                    pretty: true,
                    indent: ' ',
                    newline: '\n'
                }
            };

            static fromXMLObject( input ) {
                // first check, if the root has been removed or not <ClinicalDocument>
                if( typeof input !== "object" || input === null ) {
                    throw new TypeError( 'ClinicalDocument.fromXMLObject requires an object as input' );
                } else if( Object.prototype.hasOwnProperty.call( input, "ClinicalDocument" ) ) {
                    // shift root of document to root of object
                    input = input.ClinicalDocument;
                }

                return new ClinicalDocument( {
                    ...(Array.isArray( input.id ) && input.id.length > 0 ? { id: InstanceIdentifier.fromXMLObject( input.id[0] ) } : {}),
                    ...(Array.isArray( input.setId ) && input.setId.length > 0 ? { setId: InstanceIdentifier.fromXMLObject( input.setId[0] ) } : {}),
                    ...(Array.isArray( input.versionNumber ) && input.versionNumber.length > 0 && input.versionNumber[0].$ && input.versionNumber[0].$.value ? { versionNumber: input.versionNumber[0].$.value } : {}),
                    ...(Array.isArray( input.languageCode ) && input.languageCode.length > 0 ? { languageCode: Code.fromXMLObject( input.languageCode[0] ) } : {}),
                    ...(Array.isArray( input.title ) && input.title.length > 0 ? { title: input.title[0] } : {}),
                    ...(Array.isArray( input.code ) && input.code.length > 0 ? { code: Code.fromXMLObject( input.code[0] ) } : {}),
                    ...(Array.isArray( input.confidentialityCode ) && input.confidentialityCode.length > 0 ? { confidentialityCode: Code.fromXMLObject( input.confidentialityCode[0] ) } : {}),
                    ...(Array.isArray( input.effectiveTime ) && input.effectiveTime.length > 0 ? { effectiveTime: Time.fromXMLObject( input.effectiveTime[0] ) } : {}),
                    ...(Array.isArray( input.recordTarget ) ? { recordTarget: input.recordTarget.map( item => RecordTarget.fromXMLObject( item ) ) } : {}),
                    ...(Array.isArray( input.author ) ? { author: input.author.map( item => Author.fromXMLObject( item ) ) } : {}),
                    ...(Array.isArray( input.custodian ) && input.custodian.length > 0 ? { custodian: Custodian.fromXMLObject( input.custodian[0] ) } : {}),
                    ...(Array.isArray( input.informationRecipient ) ? { informationRecipient: input.informationRecipient.map( item => InformationRecipient.fromXMLObject( item ) ) } : {}),
                    ...(Array.isArray( input.authenticator ) ? { authenticator: input.authenticator.map( item => Authenticator.fromXMLObject( item ) ) } : {}),
                    ...(Array.isArray( input.legalAuthenticator ) && input.legalAuthenticator.length > 0 ? { legalAuthenticator: Authenticator.fromXMLObject( input.legalAuthenticator[0] ) } : {}),
                    ...(Array.isArray( input.participant ) ? { participant: input.participant.map( item => Participant.fromXMLObject( item ) ) } : {}),
                    ...(Array.isArray( input.relatedDocument ) ? { relatedDocument: input.relatedDocument.map( item => RelatedDocument.fromXMLObject( item ) ) } : {}),
                    ...(Array.isArray( input.componentOf ) && input.componentOf.length > 0 ? { componentOf: ComponentOf.fromXMLObject( input.componentOf[0] ) } : {}),
                    ...(Array.isArray( input.authorization ) ? { authorization: input.authorization.map( item => Authorization.fromXMLObject( item ) ) } : {})
                } );
            }

            static async fromXMLString( input ) {
                return ClinicalDocument.fromXMLObject(
                    await xml2js.parseStringPromise( input ),
                    {
                        explicitCharkey: true,
                        explicitArray: true,
                        explicitRoot: false
                    }
                );
            }

            /**
             * Time format of the document time.
             * @type {string}
             */
            static FORMAT_EFFECTIVETIME = "YYYYMMDDHHmm";

            /**
             * Format ss-CC.
             * ss = language code ISO-639-1
             * CC = country code ISO 3166
             * @type {RegExp}
             */
            static REGEXP_LANGUAGECODE = /^[a-z]{2}-[A-Z]{2}/

        }

        Y.namespace( 'doccirrus.api' ).edocletterxml = {

            name: NAME,

            // class exports
            ClinicalDocument,
            Consent,
            EncompassingEncounter,
            HealthCareFacility,
            RelatedDocument,
            ParentDocument,
            InformationRecipient,
            IntendedRecipient,
            AssignedCustodian,
            Custodian,
            Participant,
            Author,
            AssignedAuthor,
            AssignedPerson,
            Code,
            Time,
            AssignedEntity,
            AssociatedEntity,
            Person,
            Organization,
            PatientRole,
            Patient,
            PersonName,
            OrganizationName,
            BirthPlace,
            Place,
            Address,
            Telecommunication,
            InstanceIdentifier,
            Authenticator,
            RecordTarget,
            Authorization,
            EncounterParticipant,
            ResponsibleParty,
            Location,
            EntityNamePart,
            ComponentOf,
            CustodianOrganization,

            // enum exports
            DischargeDispositionCode,
            EncounterCode,
            DocumentRelationshipType,
            PersonalRelationshipRoleType,
            RoleClassAssociative,
            ParticipationTypeForParticipant,
            ParticipationType,
            InformationRecipientRole,
            AdministrativeGender,
            PostalAddressUse,
            NullFlavorType,
            TelecommunicationType,
            DocumentTypeCode,
            ConfidentialityCode,
            EntityNamePartQualifier,
            CodeSystemTypes,
            ParticipationSignature,
            EncounterParticipantType

        };

    },
    '0.0.1', {
        requires: [
            "dcregexp"
        ]
    }
);
