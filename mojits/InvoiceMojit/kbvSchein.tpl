{{l '8000' scheinType }}
{{patientNo '3000' _id patient.patientNo patient.insuranceStatus.0.createUniqCaseIdentNoOnInvoice }}
{{l '3003' _id }}
{{~# ifReplacement patient.insuranceStatus.0.cardSwipe timestamp }}
{{~egkType '3004' patient.insuranceStatus.0.cardTypeGeneration }}
{{~else}}
{{~# iff patient.insuranceStatus.0.cardType '==' 'EGK' }}
{{~egkType '3004' patient.insuranceStatus.0.cardTypeGeneration }}
{{l '3006' patient.insuranceStatus.0.cdmVersion }}
{{~o '3010' patient.insuranceStatus.0.fk3010 }}
{{~o '3011' patient.insuranceStatus.0.fk3011 }}
{{~o '3012' patient.insuranceStatus.0.fk3012 }}
{{~o '3013' patient.insuranceStatus.0.fk3013 }}
{{~/ iff }}
{{~/ ifReplacement}}
{{~o '3100' patient.nameaffix }}
{{~o '3120' patient.fk3120 }}
{{l '3101' patient.lastname }}
{{l '3102' patient.firstname }}
{{dob '3103' patient.kbvDob }}
{{~o '3104' patient.title }}
{{~# ifReplacement patient.insuranceStatus.0.cardSwipe timestamp }}
{{~insuranceNumber patient.insuranceStatus.0.insuranceNo }}
{{~else}}
{{~insuranceNumber patient.insuranceStatus.0.insuranceNo }}
{{~/ ifReplacement}}
{{~addresses patient.addresses }}
{{~wop '3116' locationFeatures patient.insuranceStatus.0.locationFeatures}}
{{l '3108' patient.insuranceStatus.0.insuranceKind }}
{{gender '3110' patient.gender }}
{{d '4101' timestamp 'QYYYY' }}
{{~# iff scheinType '!=' '0104' }}
{{scheinDate '4102' scheinDate timestamp 'YYYYMMDD' }}
{{~/ iff }}
{{l '4104' patient.insuranceStatus.0.insuranceGrpId }}
{{l '4106' patient.insuranceStatus.0.costCarrierBillingSection }}
{{~o '4108' patient.insuranceStatus.0.fk4108 }}
{{~# ifReplacement patient.insuranceStatus.0.cardSwipe timestamp }}
{{~else}}
{{d '4109' patient.insuranceStatus.0.cardSwipe 'YYYYMMDD' }}
{{~/ ifReplacement}}
{{~oDate '4133' patient.insuranceStatus.0.fk4133 'YYYYMMDD' }}
{{~oDate '4110' patient.insuranceStatus.0.fk4110 'YYYYMMDD' }}
{{l '4111' patient.insuranceStatus.0.insuranceId }}
{{~# ifReplacement patient.insuranceStatus.0.cardSwipe timestamp }}
{{~else}}
{{~o '4134' patient.insuranceStatus.0.insuranceName }}
{{~/ ifReplacement}}
{{~persGroup '4131' patient.insuranceStatus.0.persGroup }}
{{~dmp '4132' patient.insuranceStatus.0.dmp }}
{{l '4121' patient.insuranceStatus.0.feeSchedule }}
{{l '4122' scheinBillingArea }}
{{~o '4123' fk4123 }}
{{~o '4124' fk4124 }}
{{~# iff scheinType '!=' '0103' }}
{{~oFromTo '4125' fk4125from fk4125to }}
{{~/ iff }}
{{~chunk '4126' fk4126 }}
{{~checkbox '4202' fk4202 }}
{{~# iff scheinType '!=' '0104' }}
{{~checkbox '4204' fk4204 }}
{{~/ iff }}
{{~DC '**********************' }}
{{~DC '*******0101***********' }}
{{~DC '**********************' }}
{{~# iff scheinType '==' '0101' }}
{{~oDate '4206' fk4206 }}
{{~checkbox '4234' fk4234 }}
{{~FK4235Set fk4235Set }}
{{~/ iff }}
{{~# iff scheinType '==' '0102' }}
{{~chunk '4205' scheinOrder }}
{{~oDate '4206' fk4206 }}
{{~scheinDiagnosis '4207' scheinDiagnosis scheinIcds}}
{{~chunk '4208' scheinFinding }}
{{~# iff scheinSubgroup '==' '27' }}
{{~scheinInitiator asvInitiator fk4217 fk4241 }}
{{~/ iff }}
{{~# if scheinEstablishment }}
{{~scheinReferrer asvReferrer scheinEstablishment scheinRemittor }}
{{~else}}
{{l '4219' fk4219 }}
{{~/ if }}
{{l60 '4220' scheinSpecialisation }}
{{~# iff scheinSubgroup '>' '26' }}
{{l '4221' scheinSlipMedicalTreatment }}
{{~o '4229' fk4229 }}
{{~/ iff }}
{{~checkbox '4234' fk4234 }}
{{~FK4235Set fk4235Set }}
{{~/ iff }}
{{~# iff scheinType '==' '0103' }}
{{~chunk '4205' scheinOrder }}
{{~# iff scheinSubgroup '==' '31' }}
{{~oDate '4206' fk4206 }}
{{~scheinDiagnosis '4207' scheinDiagnosis scheinIcds}}
{{~chunk '4208' scheinFinding }}
{{~scheinReferrer asvReferrer scheinEstablishment scheinRemittor }}
{{~else}}
{{~oDate '4206' fk4206 }}
{{~scheinDiagnosis '4207' scheinDiagnosis scheinIcds}}
{{~chunk '4208' scheinFinding }}
{{~/ iff }}
{{~hospitalStay '4233' scheinClinicalTreatmentFrom scheinClinicalTreatmentTo }}
{{~/ iff }}
{{~# iff scheinType '==' '0101' }}
{{~checkbox '4236' fk4236 }}
{{~/ iff }}
{{~# iff scheinType '==' '0102' }}
{{~/ iff }}
{{l '4239' scheinSubgroup }}
{{~o '4103' scheinTransferType }}
{{~# iff scheinTransferType '==' '1' }}
{{~o '4114' scheinTransferArrangementCode }}
{{~oDate '4115' scheinTransferDateOfContact }}
{{~chunk '4105' scheinTransferTypeInfo }}
{{~/ iff }}
{{~# iff scheinTransferType '==' '2' }}
{{~o '4114' scheinTransferArrangementCode }}
{{~oDate '4115' scheinTransferDateOfContact }}
{{~chunk '4105' scheinTransferTypeInfo }}
{{~/ iff }}
{{~# iff scheinTransferType '==' '3' }}
{{~o '4114' scheinTransferArrangementCode }}
{{~oDate '4115' scheinTransferDateOfContact }}
{{~chunk '4105' scheinTransferTypeInfo }}
{{~/ iff }}
{{~# iff scheinTransferType '==' '4' }}
{{~o '4114' scheinTransferArrangementCode }}
{{~oDate '4115' scheinTransferDateOfContact }}
{{~chunk '4105' scheinTransferTypeInfo }}
{{~/ iff }}
{{~# iff scheinTransferType '==' '5' }}
{{~o '4114' scheinTransferArrangementCode }}
{{~oDate '4115' scheinTransferDateOfContact }}
{{~chunk '4105' scheinTransferTypeInfo }}
{{~/ iff }}
{{~# iff scheinType '==' '0104' }}
{{l '4243' scheinNextTherapist }}
{{~/ iff }}
{{~DC '********************' }}
{{~DC '**** Leistungen ****' }}
{{~DC '********************' }}
{{~# each treatments }}
{{~treatmentDate '5000' timestamp 'YYYYMMDD' }}
{{~o '5001' code }}
{{~o '5002' fk5002 }}
{{~o '5003' tsvDoctorNo }}
{{~multiplicator '5005' fk5005 }}
{{~daySeparation '5006' daySeparation time }}
{{~o '5008' fk5008 }}
{{~chunk '5009' explanations }}
{{~o '5010' fk5010BatchNumber}}
{{~FK5012Set fk5012Set }}
{{~o '5013' fk5013 }}
{{~chunk '5015' fk5015 }}
{{~chunk '5016' fk5016 }}
{{~# iff ../scheinType '!=' '0103' }}
{{~o '5017' fk5017 }}
{{~/ iff }}
{{~o '5018' fk5018 }}
{{~o '5019' fk5019 }}
{{~FK5020Set fk5020Set }}
{{~o '5023' fk5023 }}
{{~o '5024' fk5024 }}
{{~oDate '5025' fk5025}}
{{~oDate '5026' fk5026}}
{{~oDate '5034' fk5034}}
{{~FK5035Set fk5035Set}}
{{~FK5036Set fk5036Set}}
{{~o '5037' fk5037 }}
{{~chunk '5038' fk5038 }}
{{~o '5040' fk5040 }}
{{~FK5042Set fk5042Set}}
{{~# iff ../scheinType '==' '0102' }}
{{~o '5044' fk5044 }}
{{~/ iff }}
{{~omimCodes omimCodes }}
{{l '5098' _bsnr }}
{{~o '5099' _lanr }}
{{~# iff noASV '!=' true }}
{{~o '5100' asvTeamnumber }}
{{~/ iff }}
{{~o '5101' _pseudoLanr }}
{{~/ each }}
{{~DC '***********************' }}
{{~DC '**** Diagnose ICDs ****' }}
{{~DC '***********************' }}
{{~# each diagnoses }}
{{l '6001' code }}
{{~diagnosisCert '6003' diagnosisCert }}
{{~oDiagnosisSite '6004' diagnosisSite}}
{{~chunk '6006' explanations }}
{{~o '6008' diagnosisDerogation }}
{{~/ each }}
{{~DC '****************************' }}
{{~DC '**** Dauerdiagnose ICDs ****' }}
{{~DC '****************************' }}
{{~# each continuousDiagnoses }}
{{l '3673' code }}
{{~diagnosisCert '3674' diagnosisCert }}
{{~oDiagnosisSite '3675' diagnosisSite}}
{{~chunk '3676' explanations }}
{{~o '3677' diagnosisDerogation }}
{{~/ each }}