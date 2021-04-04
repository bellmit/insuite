/**
 * User: do
 * Date: 20/04/16  16:08
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/


YUI.add( 'edmp-commonutils', function( Y, NAME ) {

        var
            // after this quarter copd schema version 4.0.0 applies
            COPD_4_0_0_LAST_QUARTER = 'Q4/2017',
            PARTICIPATION_CHRONICHEART_FAILURE_LAST_QUARTER = 'Q1/2018',
            DMP_PERS_GROUP_CHANGES_LAST_QUARTER = 'Q2/2018',
            Q3_2018 = 'Q3/2018',
            Q1_2019 = 'Q1/2019',
            Q1_2021 = 'Q1/2021',
            Q3_2019 = 'Q3/2019',
            EHKS_V2_3_2_LAST_QUARTER = '4/2018',
            Q2_2020 = 'Q2/2020',

            _moment = Y.doccirrus.commonutils.getMoment(),
            i18n = Y.doccirrus.i18n,
            validationLibrary = Y.doccirrus.validations.common,
            longNames = {
                DM1: i18n( 'InvoiceMojit.edmp_browserJS.longName.DM1' ),
                DM2: i18n( 'InvoiceMojit.edmp_browserJS.longName.DM2' ),
                BK: i18n( 'InvoiceMojit.edmp_browserJS.longName.BK' ),
                HGV: i18n( 'InvoiceMojit.edmp_browserJS.longName.HGV' ),
                HGVK: i18n( 'InvoiceMojit.edmp_browserJS.longName.HGVK' ),
                KHK: i18n( 'InvoiceMojit.edmp_browserJS.longName.KHK' ),
                ASTHMA: i18n( 'InvoiceMojit.edmp_browserJS.longName.ASTHMA' ),
                COPD: i18n( 'InvoiceMojit.edmp_browserJS.longName.COPD' )
            },
            actTypeConcomitantDiseaseMap = {
                DM1: 'DIABETES_MELLITUS',
                DM2: 'DIABETES_MELLITUS',
                ASTHMA: 'BRONCHIAL_ASTHMA',
                COPD: 'COPD',
                KHK: 'KHK'
            },
            dmpTypesActTypeMap = [
                null,
                "DM2",
                "BK",
                "KHK",
                "DM1",
                "ASTHMA",
                "COPD",
                "QDOCU"
            ],
            patientShortFields = 'lastname firstname nameaffix gender dob kbvDob fk3120 nameaffix title addresses edmpParticipationChronicHeartFailure'.split( ' ' ),
            eDmpTypes = Y.doccirrus.schemas.casefolder.eDmpTypes,
            eDocTypes = Y.doccirrus.schemas.casefolder.eDocTypes,
            mergePathsByActType = {},
            mappedMergePathsByActType = {},
            VERSIONS_CONDITIONS = {
                BK: {
                    4.21: isBeforeQ32018,
                    4.23: isAfterQ32018 // Uncommment when done testing
                    // 4.23: isBeforeQ32018
                }
            };



        eDmpTypes.forEach( function( type ) {
            mergePathsByActType[type] = createMergePaths( type );
        } );
        eDocTypes.forEach( function( type ) {
            mappedMergePathsByActType[type] = createMappedMergePaths( type );
        } );

        function generateStatus( data ) {
            var translation = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'ActStatus_E', data.status, '-de', '' ),
                nErrors = data.dmpErrors && data.dmpErrors.nErrors || 0,
                nWarnings = data.dmpErrors && data.dmpErrors.nWarnings || 0,
                errorStr = [nErrors, nWarnings].filter( Boolean ).join( '/' );

            if( 'CREATED' === data.status ) {
                return translation;
            }
            if( errorStr ) {
                errorStr = ' ('+errorStr+')';
            }

            return translation + errorStr;
        }

        function generateContent( data ) {
            var status = generateStatus( data ),
                longName = longNames[data.actType] || '';

            return ''+longName+' '+status;
        }

        function getLongName( dmpActType ) {
            return longNames[dmpActType] || '';
        }

        function getConcomitantDiseaseIdByActType( actType ) {
            return actTypeConcomitantDiseaseMap[actType];
        }

        function dobHeadDiff( dob, headDate ) {
            if( !dob || !headDate ) {
                return null;
            }
            return _moment( headDate ).diff( _moment( dob ), 'year', true );
        }

        function isOlderThan( patient, headDate, val ) {
            var diff = dobHeadDiff( patient.dob, headDate );
            if( null === diff ) {
                return false;
            }
            return diff >= val;
        }

        function isGradOptional( patient, headDate, val, footstatus ) {
            var isOptional = isOlderThan( patient, headDate, val );

            if( !isOptional && footstatus === 'CONSPICUOUS' ) {
                return false;
            }

            return true;
        }

        function isDmpInjectionSitesOptional( eDmpType, isInsulin ) {

            return eDmpType === 'DM1' ? false : !isInsulin;

        }

        function isBloodPressureOptional( patient, headDate, val, actType ) {

            var isOptional = !isOlderThan( patient, headDate, val );
            return 'ASTHMA' === actType ? isOptional : false;

        }

        function validateBloodPressure( patient, activity ) {

            var eDmpTypes = Y.doccirrus.schemas.casefolder.eDmpTypes;

            if (activity.actType === "BK") { return {isValid: true}; }

            if( -1 === eDmpTypes.indexOf( activity.actType ) ) {
                return {isValid: true};
            }

            var isOptional = isBloodPressureOptional( patient, activity.dmpHeadDate, 18, activity.actType ),
                systolic = activity.dmpBloodPressureSystolic,
                diastolic = activity.dmpBloodPressureDiastolic;

            if( !isOptional ) {

                if( !systolic ) {
                    return {isValid: false, err: createError( 28003 )};
                }

                if( !diastolic ) {
                    return {isValid: false, err: createError( 28003 )};
                }

            }

            if( systolic && !validationLibrary._rangeNumber( systolic, 50, 300 ) ) {
                return {isValid: false, err: createError( 28002 )};
            }

            if( diastolic && !validationLibrary._rangeNumber( diastolic, 30, 180 ) ) {
                return {isValid: false, err: createError( 28002 )};
            }

            if( systolic && diastolic && systolic <= diastolic ) {
                return {isValid: false, err: createError( 28002 )};
            }

            return {isValid: true};

        }

        function validateSerumElectrolytes( patient, activity ) {

            if( activity.actType !== 'KHK' ) {
                return {isValid: true};
            }

            var isHeartFailure = patient.edmpParticipationChronicHeartFailure;

            if( isHeartFailure && !activity.dmpSerumElectrolytes ) {
                return {isValid: false, err: createError( 28003 )};
            }

            return {isValid: true};

        }

        function validateRegularWeightControlRecommended( patient, activity ) {

            if( activity.actType !== 'KHK' ) {
                return {isValid: true};
            }

            var isHeartFailure = patient.edmpParticipationChronicHeartFailure;
            var weight = activity.dmpRegularWeightControlRecommended;

            if( isHeartFailure && !weight.length ) {
                return {isValid: false, err: createError( 28003 )};
            }

            if( -1 !== weight.indexOf( 'YES' ) && weight.length > 1 ) {
                return {isValid: false, err: createError( 28005 )};
            }

            return {isValid: true};

        }

        function validateFootStatus( patient, activity, field ) {
            if( -1 === ['DM1', 'DM2'].indexOf( activity.actType ) ) {
                return {isValid: true};
            }

            var isOptional = !isOlderThan( patient, activity.dmpHeadDate, 18 );

            if( !isOptional ) {

                if( !activity[field] ) {
                    return {isValid: false, err: createError( 28003 )};
                }

            }

            return {isValid: true};
        }

        function validateFootStatusArmstrongValue( patient, activity ) {

            if( -1 === ['DM1', 'DM2'].indexOf( activity.actType ) ) {
                return {isValid: true};
            }

            var isOptional = !isOlderThan( patient, activity.dmpHeadDate, 18 );

            if( !isOptional ) {

                if( activity.dmpFootStatusText === 'CONSPICUOUS' ) {
                    if( -1 === ['A', 'B', 'C', 'D'].indexOf( activity.dmpFootStatusArmstrongValue ) ) {
                        return {isValid: false, err: createError( 28003 )};
                    }
                } else {
                    if( activity.dmpFootStatusArmstrongValue ) {
                        return {isValid: false, err: createError( 28004 )};
                    }
                }

            }

            return {isValid: true};

        }

        function validateFootStatusWagnerValue( patient, activity ) {
            if( -1 === ['DM1', 'DM2'].indexOf( activity.actType ) ) {
                return {isValid: true};
            }

            var isOptional = !isOlderThan( patient, activity.dmpHeadDate, 18 );

            if( !isOptional ) {

                if( activity.dmpFootStatusText === 'CONSPICUOUS' ) {
                    if( -1 === ['1', '2', '3', '4', '5'].indexOf( activity.dmpFootStatusWagnerValue ) ) {
                        return {isValid: false, err: createError( 28003 )};
                    }
                } else {
                    if( activity.dmpFootStatusWagnerValue ) {
                        return {isValid: false, err: createError( 28004 )};
                    }
                }

            }

            return {isValid: true};

        }

        function validateInjectionSites( patient, activity ) {

            if( -1 === ['DM1', 'DM2'].indexOf( activity.actType ) ) {
                return {isValid: true};
            }

            var isInsulin = activity.dmpInsulin === 'YES';
            var isOptional = isDmpInjectionSitesOptional( activity.actType, isInsulin );

            if( !isOptional && !activity.dmpInjectionSites ) {
                return {isValid: false, err: createError( 28004 )};
            }

            return {isValid: true};

        }

        function validateDmpAsthma( patient, activity ) {

            if( 'ASTHMA' !== activity.actType ) {
                return {isValid: true};
            }

            return {isValid: isOlderThan( patient, activity.dmpHeadDate, 5 ), err: createError( 28007 )};

        }

        function validateDmpCopd( patient, activity ) {

            if( 'COPD' !== activity.actType ) {
                return {isValid: true};
            }

            return {isValid: isOlderThan( patient, activity.dmpHeadDate, 18 ), err: createError( 28008 )};

        }

        function createError( code ) {
            var err = new Error( Y.doccirrus.errorTable.getMessage( code ) );
            err.code = code;
            return err;
        }

        /**
         * Compares two diagnosis dates, and returns the later one of both.
         * Dates may be given as RFC strings. Dates are normalized to 00:00:00.000
         * @param {string|Date} date1
         * @param {string|Date} date2
         * @returns {null|Date}
         */
        function compareDatesAndReturnLaterDate( date1, date2 ) {
            // create dates from strings
            if( typeof date1 === "string" ) {
                date1 = new Date( date1 );
            }
            if( typeof date2 === "string" ) {
                date2 = new Date( date2 );
            }

            // compare dates
            if( date1 instanceof Date && date2 instanceof Date ) {
                date1 = new Date( date1.setHours( 0, 0, 0, 0 ) );
                date2 = new Date( date2.setHours( 0, 0, 0, 0 ) );

                if( date2 < date1 ) {
                    return date1;
                } else {
                    return date2;
                }
            } else if( date1 instanceof Date ) {
                date1 = new Date( date1.setHours( 0, 0, 0, 0 ) );
                return date1;
            } else if( date2 instanceof Date ) {
                date2 = new Date( date2.setHours( 0, 0, 0, 0 ) );
                return date2;
            } else {
                return null;
            }
        }

        /**
         * Increments a given quarter and year by a given number of quarters.
         * @param {number} quarter, 1-4
         * @param {number} year
         * @param {number} n, increment
         * @param {boolean|undefined} returnFullMomentObject, if set, returns the full incremented moment object
         * @returns {{year: number, quarter: number}}
         */
        function increaseQuarter( quarter, year, n, returnFullMomentObject ) {
            n = (n && 'number' === typeof n) ? n : 1;
            var date = _moment( ''+quarter+'/'+year, 'Q/YYYY' ).add( n, 'quarter' );
            return (returnFullMomentObject) ? date : {quarter: date.quarter(), year: date.year()};
        }

        /**
         * Converts the interval terms given as strings into numbers.
         * 'QUARTERLY':1
         * 'EVERY_SECOND_QUARTER': 2
         * 'EVERY_FOURTH_QUARTER': 4
         * @param {String|DmpDocumentationInterval_E} intervalDefinition
         * @returns {number}
         */
        function mapIntervalEnumToQuarterCount( intervalDefinition ) {
            switch( intervalDefinition ) {
                case 'QUARTERLY':
                    return 1;
                case 'EVERY_SECOND_QUARTER':
                    return 2;
                case 'EVERY_FOURTH_QUARTER':
                    return 4;
            }
            // [MOJ-12605] set default to EVERY_SECOND_QUARTER for cases with undefined interval enum
            return 2;
            // throw Error( 'invalid quarter interval definition' );
        }

        /**
         * Returns the follow-up EdmpHeadDate from a previous eDMP document.
         * This is determined from the doc.dmpDocumentationInterval,
         * and is, most of the time, equal to "EVERY_SECOND_QUARTER"
         *
         * @param {activity} doc, eDMP document
         * @param {boolean|undefined} returnFullMomentObject, if set, returns the full moment object, and not the JS-Date
         * @returns {Date|moment}
         */
        function calculateFollowUpEdmpHeadDate( doc, returnFullMomentObject ) {
            const
                increaseByQuarters = mapIntervalEnumToQuarterCount( doc.dmpDocumentationInterval ),
                momentObject = increaseQuarter( doc.dmpQuarter, doc.dmpYear, increaseByQuarters, true );
            return (returnFullMomentObject) ? momentObject : momentObject.toDate();
        }

        function createEdmpDeliveryBaseData( data ) {
            data = 'object' === typeof data ? data : {};
            const year = data && data.year;
            const quarter = data && data.quarter;
            var
                now = _moment(),
                baseData = {
                    edmpDeliveryStatus: 'OPEN',
                    quarter: quarter || now.quarter(),
                    year: year || now.year()
                };
            return Y.mix( baseData, data );
        }

        function sddaDmpTypeToActType( dmpType ) {
            return dmpTypesActTypeMap[dmpType];
        }

        function actTypeToSddaDmpType( actType ) {
            return ''+dmpTypesActTypeMap.indexOf( actType );
        }

        function getPatientShort( patient, patientShort ) {
            if( !patient ) {
                throw new Error( 'Patient is undefined' );
            }
            if( !patientShort ) {
                patientShort = {};
            }

            patientShortFields.forEach( function( key ) {
                patientShort[key] = patient[key] ? patient[key] : '';
            } );

            patientShort.patientVersionId = patient._originalId || patient._id;

            patientShort.insuranceStatus = patient.insuranceStatus.find( function( i ) {
                return i.type === 'PUBLIC';
            } );

            return patientShort;

        }

        function createMergePaths( actType ) {
            var
                paths = ['dmpGender', 'dmpHeight', 'dmpWeight', 'dmpConcomitantDisease'],
                additionalPaths = {
                    dmpSmoker: ['DM1', 'DM2', 'KHK'],
                    // medications
                    dmpAntiplatelet: ['DM1', 'DM2', 'KHK'],
                    dmpBetaBlocker: ['DM1', 'DM2', 'KHK'],
                    dmpACE: ['DM1', 'DM2', 'KHK'],
                    dmpHMG: ['DM1', 'DM2', 'KHK'],
                    dmpTHIA: ['DM1', 'DM2'],
                    dmpInsulin: ['DM2'],
                    dmpGlibenclamide: ['DM2'],
                    dmpMetformin: ['DM2'],
                    dmpOtherOralAntiDiabetic: ['DM2'],
                    dmpKhkOtherMedication: ['KHK'],
                    dmpInhaledGlucocorticosteroids: ['ASTHMA'],
                    dmpInhaledLongActingBeta2AdrenergicAgonist: ['ASTHMA'],
                    dmpInhaledRapidActingBeta2AdrenergicAgonist: ['ASTHMA'],
                    dmpSystemicGlucocorticosteroids: ['ASTHMA'],
                    dmpOtherAsthmaSpecificMedication: ['ASTHMA'],
                    dmpCheckedInhalationTechnique: ['ASTHMA', 'COPD'],
                    dmpShortActingBeta2AdrenergicAgonistAnticholinergics: ['COPD'],
                    dmpLongActingBeta2AdrenergicAgonist: ['COPD'],
                    dmpLongActingAnticholinergics: ['COPD'],
                    dmpOtherDiseaseSpecificMedication: ['COPD'],
                    // DM1 and DM2 only
                    dmpSequelae: ['DM1', 'DM2']
                    // not valid after Q2 2017
                    // dmpFootStatusText: ['DM1', 'DM2'],
                    // dmpFootStatusWagnerValue: ['DM1', 'DM2'],
                    // dmpFootStatusArmstrongValue: ['DM1', 'DM2']
                };

            Object.keys( additionalPaths ).forEach( function( path ) {
                var actTypes = additionalPaths[path];
                if( -1 !== actTypes.indexOf( actType ) ) {
                    paths.push( path );
                }
            } );

            return paths;
        }

        function createMappedMergePaths( actType ) {
            var mappings = [
                {actType: 'HGV', origin: 'dmpSpeakingTestPossible', target: 'dmpSpeakingTestPossible_following'}
            ];
            return mappings.filter(function (entry) {return entry.actType === actType;});
        }

        function filterEdmpActStatus( list ) {
            var statusWhiteList = ['CREATED', 'VALID', 'INVALID', 'APPROVED', 'SENT', 'CANCELLED'];
            return list.filter( function( entry ) {
                return -1 !== statusWhiteList.indexOf( entry.val );
            } );
        }

        function validateEdmpDob( val ) {
            var
                isKvdtValid = Y.doccirrus.validations.kbv._Person_T_kbvDob( val ),
                dateArr = val && val.split( '.' ),
                isEdmpValid = isKvdtValid && '0000' !== dateArr[2] && !('00' === dateArr[1] || '00' === dateArr[0]);

            return {isValid: isEdmpValid, err: isEdmpValid ? null : 'Falsches Datumsformat.'};
        }

        function isAfterQ( activity, quarter ) {
            var
                quarterDate = _moment(quarter, 'Q/YYYY'),
                dmpQuarter = activity.dmpQuarter,
                dmpYear = activity.dmpYear;

            return _moment(''+dmpQuarter+'/'+dmpYear, 'Q/YYYY').isAfter(quarterDate);
        }

        /**
         * Use timestamp to determine validity.
         *
         * @param timestamp
         * @param quarter
         * @return {Boolean}
         */
        function isAfterTimestampQ( timestamp, quarter ) {
            var timestampDate = _moment( timestamp );
            if( !timestamp ) {
                return false;
            }
            return _moment( timestampDate.quarter() + '/' + timestampDate.year(), 'Q/YYYY' )
                .isAfter( _moment( quarter, 'Q/YYYY' ) );
        }

        function isAfterQ32018( activity ) {
            return Y.doccirrus.edmpcommonutils.isAfterQ(activity, "Q3/2018");
        }
        function isBeforeQ32018( activity ) {
            return !Y.doccirrus.edmpcommonutils.isAfterQ(activity, "Q3/2018");
        }

        function dmpActivityIsRelevant( activity, {dmpTypes: dmpTypes, versions: versions, actTypes: actTypes} ) {
            var relevantActType = !actTypes || actTypes.indexOf( activity.actType ) > -1;
            var relevantDmpType = !dmpTypes || dmpTypes.indexOf( activity.dmpType ) > -1;

            var relevantVersion = !versions;
            var currentVersion = Y.doccirrus.edmpcommonutils.currentVersion( activity );
            var i;

            var versionsLength = versions && versions.length || 0;
            for( i = 0; i < versionsLength; i++ ) {
                if( versions[i] === currentVersion ) {
                    relevantVersion = true;
                    break;
                }
            }

            // console.log("EQUALITY", versions[1] === currentVersion)
            // console.log("LENGTH", versions && versions.length || 0)
            // console.log("DMP TYPE ARGUMENT", dmpTypes);
            // console.log("VERSIOM ARGUMENT", versions);
            // console.log("CURRENT VERSION", currentVersion);
            // // console.log("THIS DMP TYPE", activity.dmpType);
            // // console.log("RELEVANT DMP TYPE", relevantDmpType);
            // // console.log("RELEVANT ACT TYPE", relevantActType);
            // console.log("RELEVANT VERSION", relevantVersion);
            //



            return relevantVersion && relevantActType && relevantDmpType;
        }

        function hgvActivityIsRelevant( activity, {dmpTypes: dmpTypes, dmpAges: dmpAges} ) {

            var relevantAge = !dmpAges || dmpAges.indexOf( activity.dmpAge ) > -1;
            var relevantDmpType = !dmpTypes || dmpTypes.indexOf( activity.dmpType ) > -1;

            return relevantDmpType && relevantAge;
        }


        function currentVersion( activity ) {
            var versionConditions = VERSIONS_CONDITIONS[activity.actType];
            var isCurrentVersion;
            var version;

            for( version in versionConditions ) {
                if( versionConditions.hasOwnProperty( version ) ) {
                    isCurrentVersion = versionConditions && versionConditions[version] && versionConditions[version]( activity );
                    if( isCurrentVersion ) {
                        return version;
                    }
                }
            }
            return null;
        }

        Y.namespace( 'doccirrus' ).edmpcommonutils = {

            name: NAME,
            COPD_4_0_0_LAST_QUARTER: COPD_4_0_0_LAST_QUARTER,
            PARTICIPATION_CHRONICHEART_FAILURE_LAST_QUARTER: PARTICIPATION_CHRONICHEART_FAILURE_LAST_QUARTER,
            DMP_PERS_GROUP_CHANGES_LAST_QUARTER: DMP_PERS_GROUP_CHANGES_LAST_QUARTER,
            Q3_2018: Q3_2018,
            Q1_2019: Q1_2019,
            Q1_2021: Q1_2021,
            Q3_2019: Q3_2019,
            EHKS_V2_3_2_LAST_QUARTER: EHKS_V2_3_2_LAST_QUARTER,
            Q2_2020: Q2_2020,
            generateStatus: generateStatus,
            generateContent: generateContent,
            getLongName: getLongName,
            getConcomitantDiseaseIdByActType: getConcomitantDiseaseIdByActType,
            dobHeadDiff: dobHeadDiff,
            isOlderThan: isOlderThan,
            isGradOptional: isGradOptional,
            isDmpInjectionSitesOptional: isDmpInjectionSitesOptional,
            isBloodPressureOptional: isBloodPressureOptional,
            increaseQuarter: increaseQuarter,
            validateBloodPressure: validateBloodPressure,
            validateSerumElectrolytes: validateSerumElectrolytes,
            validateRegularWeightControlRecommended: validateRegularWeightControlRecommended,
            validateFootStatus: validateFootStatus,
            validateFootStatusArmstrongValue: validateFootStatusArmstrongValue,
            validateFootStatusWagnerValue: validateFootStatusWagnerValue,
            validateInjectionSites: validateInjectionSites,
            validateDmpAsthma: validateDmpAsthma,
            validateDmpCopd: validateDmpCopd,
            validateEdmpDob: validateEdmpDob,
            createEdmpDeliveryBaseData: createEdmpDeliveryBaseData,
            sddaDmpTypeToActType: sddaDmpTypeToActType,
            actTypeToSddaDmpType: actTypeToSddaDmpType,
            getPatientShort: getPatientShort,
            mergePathsByActType: mergePathsByActType,
            mappedMergePathsByActType: mappedMergePathsByActType,
            filterEdmpActStatus: filterEdmpActStatus,
            isAfterQ: isAfterQ,
            dmpActivityIsRelevant: dmpActivityIsRelevant,
            hgvActivityIsRelevant: hgvActivityIsRelevant,
            currentVersion: currentVersion,
            isAfterTimestampQ: isAfterTimestampQ,
            mapIntervalEnumToQuarterCount: mapIntervalEnumToQuarterCount,
            calculateFollowUpEdmpHeadDate: calculateFollowUpEdmpHeadDate,
            compareDatesAndReturnLaterDate: compareDatesAndReturnLaterDate
        };
    },
    '0.0.1', {requires: ['doccirrus', 'dccommonutils']}
);

