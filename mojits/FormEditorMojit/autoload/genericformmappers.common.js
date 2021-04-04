/**
 *  Mappers used in forms and reporting
 *
 *  Hello world example for form mappers:
 *
 *  addFormMapper({                                         <--- call this to create a mapper
 *      name: 'exampleMapper',                              <--- give it a unique name
 *      group: ['testFieldHere', 'anotherField'],           <--- these are the fields the mapper can provide
 *      fn: function (formData, config) {                   <--- all mappers share formData object and config
 *          formData.testFieldHere = 'Hello world!';        <--- set your fields on the formData object
 *          formData.anotherField = 'Foo Bar';
 *      }
 *  });
 *
 *  The config will be different for different contexts (activities, tasks, schedules, etc)
 *
 *  See mappinghelper.server.js for details of the context
 *
 *  See InCase_T.common.js for details of the inCase form/reporting bindings
 *
 * User: do
 * Date: 13/07/15  11:59
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*eslint prefer-template:0, strict:0 */
/*global YUI*/

'use strict';

YUI.add( 'dcgenericformmappers', function( Y, NAME ) {

        /**
         * This modules registers all available generic form mappers.
         */

        var
            i18n = Y.doccirrus.i18n,
            MedDataTypes = Y.doccirrus.schemas.v_meddata.medDataTypes,
            PAPER_DOSIS = i18n( 'InCaseMojit.medicationplan_prescription_modalJS.text.PAPER_DOSIS' ),
            PAPER_DOSIS_LONG2 = i18n( 'InCaseMojit.medicationplan_prescription_modalJS.text.PAPER_DOSIS_LONG2' ),
            KIND_POSTBOX = 'POSTBOX',
            KIND_POSTAL = 'POSTAL',
            KIND_BILLING = 'BILLING',
            KIND_OFFICIAL = 'OFFICIAL';

        var form4FormRoles = ['casefile-kbv-form-4', 'casefile-kbv-form-4-bfb'];

        var _scheinBillingAreaList = [  //MOJ-2434 - maxiaml list.
            {"key": "00", "value": "kein besonderes Abrechnungsgebiet (Defaultwert)"},
            {"key": "15", "value": "AOP nach §115b"},
            {"key": "03", "value": "Methadon-Substitutionsbehandlung"},
            {"key": "14", "value": "Ambulantes Operieren"},
            {"key": "08", "value": "Umweltmedizin"},
            {"key": "02", "value": "Dialyse-Sachkosten"},
            {
                "key": "05",
                "value": "sonstige Notfalleistungen durch ermächtigte Krankenhausärzte"
            },
            {"key": "07", "value": "Diabetesabrechnung"},
            {"key": "80", "value": "Wahltarif BKK Arzt privat"},
            {
                "key": "04",
                "value": "persönlich erbrachte Notfalleistungen durch ermächtigte Krankenhausärzte"
            },
            {"key": "10", "value": "Hirnleistungsstörungen"},
            {"key": "01", "value": "Dialyse-Arztkosten"},
            {"key": "09", "value": "Rheuma"},
            {"key": "06", "value": "Fremde Zytologie"}
        ];

        var _scheinTypeList = [
            {
                "value": "ambulante Behandlung",
                "key": "0101"
            },
            {
                "value": "Überweisung",
                "key": "0102"
            },
            {
                "value": "Belegärztliche Behandlung",
                "key": "0103"
            },
            {
                "value": "Notfall/Vertretung",
                "key": "0104"
            },
            {
                "value": "ambulante Behandlung",
                "key": "00"
            },
            {
                "value": "Selbstausstellung",
                "key": "20"
            },
            {
                "value": "Auftragsleistungen",
                "key": "21"
            },
            {
                "value": "Konsiliaruntersuchung",
                "key": "23"
            },
            {
                "value": "Mit-/Weiterbehandlung",
                "key": "24"
            },
            {
                "value": "Stationäre Mitbehandlung, Vergütung nach ambulanten Grundsätzen",
                "key": "26"
            },
            {
                "value": "Belegärztliche Behandlung",
                "key": "30"
            },
            {
                "value": "Belegärztliche Mitbehandlung",
                "key": "31"
            },
            {
                "value": "Urlaubs-/Krankheitsvertretung bei belegärztlicher Behandlung",
                "key": "32"
            },
            {
                "value": "Ärztlicher Notfalldienst",
                "key": "41"
            },
            {
                "value": "Urlaubs-/Krankheitsvertretung",
                "key": "42"
            },
            {
                "value": "Notfall",
                "key": "43"
            },
            {
                "value": "Notarzt-/Rettungswagen",
                "key": "45"
            },
            {
                "value": "Zentraler Notfalldienst",
                "key": "46"
            }
        ];

        var
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
            TIMESTAMP_FORMAT_DOQUVIDE = i18n( 'general.TIMESTAMP_FORMAT_DOQUVIDE' ),

            TXT_YES = i18n( 'DCWindow.BUTTONS.YES' ),
            TXT_NO = i18n( 'DCWindow.BUTTONS.NO' ),

            _k = Y.dcforms.mapper.koUtils.getKo(),
            moment = Y.doccirrus.commonutils.getMoment(),
            getBarcode = Y.dcforms.mapper.objUtils.getBarcode, // TODOOO new place for this method?
            addFormMapper = Y.dcforms.mapper.genericUtils.addFormMapper,
            barcodes = [
                {
                    name: 'barcode1a',
                    deps: ['setupFindingMedicationDiagnoses', 'setAdditionalFormData', 'setupFormdataPatient', 'getAU']
                },
                {
                    name: 'barcode2a',
                    deps: ['setupFindingMedicationDiagnoses', 'setAdditionalFormData', 'setupFormdataPatient', 'getBFBCheckBoxes']
                },
                {name: 'barcode3a', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {
                    name: 'barcode2b',
                    deps: ['setupFindingMedicationDiagnoses', 'setAdditionalFormData', 'setupFormdataPatient', 'getBFBCheckBoxes']
                },
                {name: 'barcode4', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {
                    name: 'barcode6',
                    deps: ['setupFindingMedicationDiagnoses', 'setAdditionalFormData', 'setupFormdataPatient', 'getLabRequest']
                },
                {name: 'barcode8', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {name: 'barcode8a', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {name: 'barcode9', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {
                    name: 'barcode10',
                    deps: ['setupFindingMedicationDiagnoses', 'setAdditionalFormData', 'setupFormdataPatient', 'getLabRequest']
                },
                {
                    name: 'barcode10L',
                    deps: ['setupFindingMedicationDiagnoses', 'setAdditionalFormData', 'setupFormdataPatient', 'getLabRequest']
                },
                {
                    name: 'barcode10A',
                    deps: ['setupFindingMedicationDiagnoses', 'setAdditionalFormData', 'setupFormdataPatient', 'getLabRequest']
                },
                {
                    name: 'barcode10Ca',
                    deps: ['setAdditionalFormData', 'setupFormdataPatient', 'getLabRequest']
                },
                {
                    name: 'barcodeOEGD',
                    deps: ['setAdditionalFormData', 'setupFormdataPatient', 'getLabRequest']
                },
                {name: 'barcode11', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {
                    name: 'barcode12a',
                    deps: ['setupFindingMedicationDiagnoses', 'setAdditionalFormData', 'setupFormdataPatient']
                },
                {
                    name: 'barcode12b',
                    deps: ['setupFindingMedicationDiagnoses', 'setAdditionalFormData', 'setupFormdataPatient']
                },
                {
                    name: 'barcode12c',
                    deps: ['setupFindingMedicationDiagnoses', 'setAdditionalFormData', 'setupFormdataPatient']
                },
                {name: 'barcode13', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {name: 'barcode13_2', deps: ['setAdditionalFormData', 'setupFormdataPatient', 'KBVUtility2Mapper']},
                {name: 'barcode14', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {
                    name: 'barcode15_1',
                    deps: ['setupFindingMedicationDiagnoses', 'setAdditionalFormData', 'setupFormdataPatient', 'getBFBCheckBoxes', 'getHearingAid']
                },
                {name: 'barcode18', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {
                    name: 'barcode19a',
                    deps: ['setupFindingMedicationDiagnoses', 'setAdditionalFormData', 'setupFormdataPatient', 'getBFBCheckBoxes', 'getForm19']
                },
                {
                    name: 'barcode19b',
                    deps: ['setupFindingMedicationDiagnoses', 'setAdditionalFormData', 'setupFormdataPatient', 'getBFBCheckBoxes', 'getForm19']
                },
                {name: 'barcode20b', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {name: 'barcode20c', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {
                    name: 'barcode21',
                    deps: ['setAdditionalFormData', 'setupFormdataPatient', 'getBFBCheckBoxes', 'getForm21']
                },

                {name: 'barcode25', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {name: 'barcode26a', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {name: 'barcode26b', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {name: 'barcode26c', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {name: 'barcode27a', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {name: 'barcode27b', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {name: 'barcode27c', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {name: 'barcode28a', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {name: 'barcode28b', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {name: 'barcode28c', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {name: 'barcode30', deps: ['setAdditionalFormData', 'setupFormdataPatient', 'setupHealthSurvey']},
                {name: 'barcode36', deps: ['setAdditionalFormData', 'setupFormdataPatient']},

                {name: 'barcode39a', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {name: 'barcode39b', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {name: 'barcode52_2', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {name: 'barcode53', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {name: 'barcode55', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {name: 'barcode56_2', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {name: 'barcode61Ab', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {name: 'barcode61Da', deps: ['setAdditionalFormData', 'setupFormdataPatient']},

                {name: 'barcode63a', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {name: 'barcode63b', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {name: 'barcode63c', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {name: 'barcode63d', deps: ['setAdditionalFormData', 'setupFormdataPatient']},

                {name: 'barcode64', deps: ['setAdditionalFormData', 'setupFormdataPatient']},
                {name: 'barcode65', deps: ['setAdditionalFormData', 'setupFormdataPatient']},

                {name: 'documentMetaDataQrCode', deps: ['setupFormdataPatient', 'addActivityContent']}
            ];

        function generateBarcodeMapper( barcode ) {
            var bcName = barcode.name,
                deps = barcode.deps;

            addFormMapper( {
                name: bcName,
                group: [bcName],
                linkedGroup: [bcName],
                deps: deps,
                fn: function( formData, config, callback ) {
                    formData[bcName] = getBarcode( bcName, formData, config );
                    callback();
                }
            } );
        }

        /**
         * helper functions
         */

        /**
         * Format to Money
         * @param {Number} n        number
         * @param {Number} c        floating precision
         * @param {String} d        decimal delimiter
         * @param {String} t        sections delimiter
         * @param {String} symbol   currency symbol
         * @returns {string}
         */
        function formatMoney( n, c, d, t, symbol ) {
            c = Math.abs( c );
            c = isNaN( c ) ? 2 : c;
            d = (d === undefined) ? "." : d;
            t = (t === undefined) ? "," : t;
            var
                s = n < 0 ? "-" : "",
                i = parseInt( n = Math.abs( +n || 0 ).toFixed( c ), 10 ) + "",
                j = i.length;
            j = (i.length > 3) ? j % 3 : 0;
            return s + (j ? i.substr( 0, j ) + t : "") + i.substr( j ).replace( /(\d{3})(?=\d)/g, "$1" + t ) + (c ? d + Math.abs( n - i ).toFixed( c ).slice( 2 ) : "") + ' ' + symbol;
        }

        /**
         *  Replace newlines with spaces
         *  @param {String} txt text from newlines will be removed
         *  @returns {String}
         */
        function stripNewlines( txt ) {
            // eslint-disable-next-line no-control-regex
            return txt.replace( new RegExp( '\n', 'g' ), ', ' );
        }

        /**
         * Sets paid and paidFree on formdata object
         *
         *  @param  {Object}    formData object
         *  @param  {Object}    insurance object
         *  @param  {Boolean}   isKBVForm4
         *  @param  {String}    patientDob
         *  @param  {Object}    config
         */

        function setPaidStatus( formData, insurance, isKBVForm4, patientDob, config ) {
            var
                paidFree = _k.unwrap( insurance.paidFree ) || false,
                paidFreeTo = _k.unwrap( insurance.paidFreeTo ),
                insuranceType = _k.unwrap( insurance.type ),
                insuranceGrpId = _k.unwrap( insurance.insuranceGrpId ),

                currentPatient = (config.context.patient ? config.context.patient : null),
                caseFolderType = (currentPatient ? _k.unwrap( formData.caseFolderType ) : ''),

                currentActivity = (config.context.activity ? config.context.activity : null),
                currentActType = (currentActivity ? _k.unwrap( currentActivity.actType ) : ''),
                paidFreeStatus = (currentActivity ? _k.unwrap( currentActivity.paidFreeStatus ) : null),

                isMatchingForm = -1 !== ['PUBPRESCR', 'PRESCRBTM', 'PRESCRT', 'PRESASSISTIVE'].indexOf( currentActType ) || isKBVForm4;

            // MOJ-10501: override status from insurance, if value is not undefined or "AUTO". Applied only for KBVUTILITY.
            if( paidFreeStatus && -1 !== ['MUST_PAY', 'MUST_NOT_PAY'].indexOf( paidFreeStatus ) ) {
                formData.paidFree = paidFreeStatus === 'MUST_NOT_PAY';
                formData.paid = paidFreeStatus === 'MUST_PAY';
                return;
            }

            // MOJ-9875 defaults for prescriptions in BG case folders
            if( 'BG' === caseFolderType && isMatchingForm ) {
                formData.paidFree = true;
                formData.paid = false;
                return;
            }

            // MOJ-14319: [OK]
            if( Y.doccirrus.schemas.patient.isPublicInsurance( {type: insuranceType} ) &&
                Y.doccirrus.kbvcommonutils.isMax18InCurrentQuarter( patientDob ) &&
                (insuranceGrpId && +insuranceGrpId.substring( 2, 5 ) < 800) ) {
                if( !isKBVForm4 ) {
                    paidFree = true;
                } else {
                    formData.paidFree = false;
                    formData.paid = false;
                    return; // check nothing in this case if "Muster 4"
                }
            } else if( paidFree && paidFreeTo ) {
                paidFreeTo = moment( paidFreeTo );
                if( paidFreeTo.isValid() && moment( formData.timestampDate ).isAfter( paidFreeTo ) ) {
                    paidFree = false;
                }
            }
            formData.paidFree = paidFree;
            formData.paid = !paidFree;
        }

        function setFk4202( formData, config ) {
            var
                currentActivity = config.context.activity,
                caseFolderType = _k.unwrap( formData.caseFolderType ),
                currentActType = _k.unwrap( currentActivity && currentActivity.actType ),
                isKBVForm4 = config.context.template.defaultFor && -1 !== form4FormRoles.indexOf( config.context.template.defaultFor ),
                isMatchingForm = -1 !== ['PUBPRESCR', 'PRESASSISTIVE', 'PRESCRBTM', 'REFERRAL'].indexOf( currentActType ) || isKBVForm4;
            // MOJ-9875 defaults for prescriptions and referral in BG case folders
            if( 'BG' === caseFolderType && isMatchingForm ) {
                formData.arbeitsunfall = true;
                formData.workAccident = true;
            } else {
                formData.arbeitsunfall = _k.unwrap( currentActivity && currentActivity.arbeitsunfall ) || '';
            }
            formData.utUnfall = _k.unwrap( currentActivity && currentActivity.utUnfall ) || false;
            formData.fk4202 = _k.unwrap( currentActivity && currentActivity.fk4202 ) || '';
        }

        /**
         * Special property of GKV insurance, see EXTMOJ-1904
         *
         * @param formData
         * @param config
         */

        function setFk3000( formData, config ) {
            var
                patient = config.context.patient || null,
                insuranceStatus = (patient && patient.insuranceStatus) ? _k.unwrap( patient.insuranceStatus ) : null,
                i;

            formData.createUniqCaseIdentNoOnInvoice = false;

            if( !patient || !insuranceStatus ) {
                return;
            }

            for( i = 0; i < insuranceStatus.length; i++ ) {
                if(
                    insuranceStatus[i].createUniqCaseIdentNoOnInvoice &&
                    _k.unwrap( insuranceStatus[i].createUniqCaseIdentNoOnInvoice )
                ) {
                    formData.createUniqCaseIdentNoOnInvoice = true;
                }
            }

        }

        /**
         *  Chiffre = cypher?
         *  @param patient
         *  @returns {String}
         */

        function makeChiffre( patient ) {
            var lastname = _k.unwrap( patient.lastname ),
                dob = getDob( patient ),
                result = '';

            if( !lastname || !dob ) {
                return '';
            }

            result += lastname.charAt( 0 ).toUpperCase() + ' ';
            result += dob.replace( /\./g, '' );

            return result;
        }

        /**
         *  Return a patient's date of birth
         *  @param      patient
         *  @returns    {String}
         */

        function getDob( patient ) {
            var dob = _k.unwrap( patient.kbvDob );

            if( 'undefined' === dob ) {
                dob = _k.unwrap( patient.dob );
            }

            if( dob ) {
                dob = dob.split( '.' );
                dob[dob.length - 1] = dob[dob.length - 1].slice( 2, dob[dob.length - 1].length );
                dob = dob.join( '.' );
            } else {
                dob = '';
            }
            return dob;
        }

        function getAddressAsString( adrObj ) {
            if( !adrObj ) {
                return '';
            }
            if( !Y.dcforms.isOnServer && adrObj.initAddress ) {
                return adrObj.toString();
            }

            //  TODO: tidy this on server
            var
                addon = _k.unwrap( adrObj.addon ),
                canton = '';

            //  Swiss mode
            if( adrObj.canton ) {
                canton = adrObj.canton + '\n';
            }

            return '' +
                   (addon ? addon + '\n' : '') +
                   _k.unwrap( adrObj.street ) + ' ' +
                   _k.unwrap( adrObj.houseno ) + '\n' +
                   canton +
                   _k.unwrap( adrObj.zip ) + ' ' +
                   _k.unwrap( adrObj.city );
        }

        /**
         *  Given a patient and the type of address needed, find the best matching contact address on file
         *
         *  @param  {Object}    patient     Patient to which the current activity relates
         *  @param  {String}    kind        eg, KIND_OFFICIAL, 'POBOX'
         *  @returns            {String}
         */

        function getAddressByKind( patient, kind ) {
            if( Y.dcforms.isOnServer ) {
                //  array of objects
                return Y.doccirrus.schemas.patient.getAddressByKind( _k.unwrap( patient.addresses ), kind );
            } else {
                //  observable array of viewmodels
                return patient.getAddressByKind( kind );
            }
        }

        /**
         * concatenate any number of strings, taking care with spacing in between.
         * @returns {String}
         */
        function concat() {
            var
                i = arguments.length,
                result = '';
            if( i ) {
                while( 0 < i ) {
                    i--;
                    if( arguments[i] ) {
                        result = ' ' + arguments[i] + result;
                    }
                }
                result = result.slice( 1 );
            }
            return result;
        }

        /**
         *  Some table rows are affected by long unbroken strings from activity content or other user input
         *  @param {String} txt string to break
         *  @returns {String}
         */
        function breakLongStrings( txt ) {
            //txt = txt.replace( new RegExp( ',', 'g' ), 'ꟸ' );
            //txt = txt.replace( new RegExp(',  ', 'g'), ', ' );
            return txt;
        }

        /**
         *  Make a space-padded string of the given size
         *  @param  {String} txt             string to pad or trim
         *  @param  {Number} limit           Length of returned string
         *  @param  {Boolean} alignRight     Align the string to the right, if padding
         *  @returns {String}
         */
        function strLimit( txt, limit, alignRight ) {
            var i;

            if( !txt ) {
                txt = '';
            }
            txt.trim();

            for( i = txt.length; i < limit; i++ ) {
                if( alignRight ) {
                    txt = ' ' + txt;
                } else {
                    txt = txt + ' ';
                }
            }

            txt = txt.substring( 0, limit );
            txt = txt.replace( new RegExp( ' ', 'g' ), '&nbsp;' );
            return txt;
        }

        function strLimitRight( txt, limit ) {
            return strLimit( txt, limit, true );
        }

        /**
         *  Flatten fields from MMI list of active ingredients into comma separated string, MOJ-10758
         *
         *  @paran      {Object}    phIngr      Property of MEDICATION activities from MMI
         *  @returns    {String}                Comma delimted
         */
        function serializePhField( phIngr, field ) {
            var entry, parts = [], i;
            for( i = 0; i < phIngr.length; i++ ) {
                entry = phIngr[i];
                if( entry.hasOwnProperty( field ) ) {
                    parts.push( entry[field] );
                }
            }
            if( 0 === parts.length ) {
                return '';
            }
            return parts.join( ', ' );
        }

        /**
         *  Flatten shortName from MMI list of active ingredients into comma separated string, using short name where
         *  available, MOJ-10758
         *
         *  @paran      {Object}    phIngr      Property of MEDICATION activities from MMI
         *  @returns    {String}                Comma delimted
         */
        function serializePhShortName( phIngr ) {
            var entry, parts = [], i;
            for( i = 0; i < phIngr.length; i++ ) {
                entry = phIngr[i];

                if( entry.hasOwnProperty( 'shortName' ) ) {
                    parts.push( entry.shortName );
                } else {
                    if( entry.hasOwnProperty( 'name' ) ) {
                        parts.push( entry.name );
                    }
                }
            }
            if( 0 === parts.length ) {
                return '';
            }
            return parts.join( ', ' );
        }

        function mapGender( gender ) {
            switch( gender ) {
                case 'MALE':
                    return 'm';
                case 'FEMALE':
                    return 'w';
                case 'UNDEFINED':
                    return 'x';
                case 'VARIOUS':
                    return 'd';
                default:
                    return 'u';
            }
        }

        function findBestPhoneNo( communications ) {
            var phonePrivate, phoneJob, mobile, phoneEmergency;
            if( !Array.isArray( communications ) ) {
                return '';
            }
            communications.forEach( function( communication ) {
                if( 'PHONEPRIV' === _k.unwrap( communication.type ) ) {
                    phonePrivate = _k.unwrap( communication.value );
                } else if( 'PHONEJOB' === _k.unwrap( communication.type ) ) {
                    phoneJob = _k.unwrap( communication.value );
                } else if( 'MOBILEPRIV' === _k.unwrap( communication.type ) ) {
                    mobile = _k.unwrap( communication.value );
                } else if( 'PHONEEMERGENCY' === _k.unwrap( communication.type ) ) {
                    phoneEmergency = _k.unwrap( communication.value );
                }
            } );
            return phonePrivate || phoneJob || mobile || phoneEmergency || '';
        }

        function getCommunicationsCombined( communications, communicationTypes, separator ) {
            return communications.filter( function( item ) {
                return communicationTypes.indexOf( _k.unwrap( item.type ) ) > -1;
            } ).map( function( communication ) {
                return _k.unwrap( communication.value );
            } ).join( separator );
        }

        function patientGetAddress( patient, kind ) {
            var addresses = _k.unwrap( patient.addresses ),
                result = Y.Array.find( addresses, function( address ) {
                    return kind === _k.unwrap( address.kind );
                } );
            return result;
        }

        function mapDocumentData( document ) {
            return {
                documentTags: document.tags,
                documentTagsPlain: (document.tags ? document.tags.join( ', ' ) : ''),
                documentCreatedOn: document.createdOn,
                documentCaption: document.caption,
                documentMediaId: document.mediaId,
                documentContentType: document.contentType,
                documentUrl: document.url,
                documentType: document.type,
                documentId: document._id.toString()
            };
        }

        function mapCaseFolderData( formData, currentCaseFolder ) {

            //  EXTMOJ-2091 get correct currency from casefolder country mode
            formData.currency = 'EUR';      //  default
            formData.currencySymbol = '€';

            if( currentCaseFolder ) {
                formData.caseFolderType = currentCaseFolder.type || null;
                formData.caseFolderAdditionalType = currentCaseFolder.additionalType || null;
                formData.caseFolderIdentity = currentCaseFolder.identity || null;

                //  Use Swiss Francs for activities in Swiss casefolder types
                if( currentCaseFolder.type && currentCaseFolder.type.indexOf( 'PRIVATE_CH' ) > -1 ) {
                    formData.currency = 'CHF';
                    formData.currencySymbol = 'Fr.';
                }
            }
        }

        function mapPatientBasicData( formData, currentPatient, isKBVForm4, config ) {
            /*
             Schema       -   Definition from PO
             ========     ===============
             dob          -  D.o.B. as an existant date DD.MM.YYYY
             dobSmaller   -  KBV DoB DD.MM.YY (can also be 00.00.1987)
             dd
             mm
             yy
             yyyy
             age
             currentDate  -  Date() == today's date
             */

            var
                insuranceStatus, insuranceNames, insurance,
                birthmom = moment.utc( _k.unwrap( currentPatient.dob ) ).local(),
                deathmom = moment.utc( _k.unwrap( currentPatient.dateOfDeath ) ).local(),
                officialAddress = patientGetAddress( currentPatient, KIND_OFFICIAL ), // if available
                billingAddress = patientGetAddress( currentPatient, KIND_BILLING ), // if available
                poboxAddress = patientGetAddress( currentPatient, KIND_POSTBOX ), // po box
                communications,
                i,
                dateOfInActiveMom = moment.utc( _k.unwrap( currentPatient.dateOfInActive ) ).local();

            formData.age = deathmom ? Number( moment( deathmom ).diff( birthmom, 'years' ) ) :
                Number( moment().diff( birthmom, 'years' ) );
            formData.dobSmaller = getDob( currentPatient );  // will always be correctly formatted. (region!)
            formData.dobSmallerWithoutPoints = formData.dobSmaller.replace( /\./g, '' );
            formData.dob = birthmom.format( 'DD.MM.YYYY' );
            formData.kbvDob = _k.unwrap( currentPatient.kbvDob );
            formData.dd = birthmom.format( 'DD' );
            formData.mm = birthmom.format( 'MM' );
            formData.yy = birthmom.format( 'YY' );
            formData.yyyy = birthmom.format( 'YYYY' );
            formData.patientDOB = birthmom.toString();
            formData.dobPlain = birthmom.format();
            formData.patientSince = _k.unwrap( currentPatient.patientSince );

            //  EXTMOJ-1127 Add date of death to forms
            if( _k.unwrap( currentPatient.dateOfDeath ) && deathmom.isValid() ) {
                formData.dateOfDeath = deathmom.format( 'DD.MM.YYYY' );
            } else {
                formData.dateOfDeath = '';
            }

            if( _k.unwrap( currentPatient.dateOfInActive ) && dateOfInActiveMom.isValid() ) {
                formData.dateOfInActive = dateOfInActiveMom.format( TIMESTAMP_FORMAT );
            } else {
                formData.dateOfInActive = '';
            }

            formData.isDeceased = _k.unwrap( currentPatient.isDeceased ) ? TXT_YES : TXT_NO;
            formData.inActive = _k.unwrap( currentPatient.inActive ) ? TXT_YES : TXT_NO;
            formData.reason = _k.unwrap( currentPatient.reason ) || '';

            formData.jobStatus = _k.unwrap( currentPatient.jobStatus ) || '';

            formData.bestPatientPhone = findBestPhoneNo( _k.unwrap( currentPatient.communications ) );

            formData.patPhone = getCommunicationsCombined( _k.unwrap( currentPatient.communications ), ['PHONEPRIV', 'MOBILEPRIV', 'PHONEJOB', 'PHONEEMERGENCY'], ', ' );
            formData.patEmail = getCommunicationsCombined( _k.unwrap( currentPatient.communications ), ['EMAILPRIV', 'EMAILJOB'], ', ' );
            formData.patFax = getCommunicationsCombined( _k.unwrap( currentPatient.communications ), ['FAXPRIV', 'FAXJOB'], ', ' );
            formData.patHttp = getCommunicationsCombined( _k.unwrap( currentPatient.communications ), ['URL', 'GOOGLE', 'LINKEDIN', 'XING'], ', ' );

            formData.patientDbId = _k.unwrap( currentPatient._id ) || '';
            formData.patientId = _k.unwrap( currentPatient.patientNo ) || '';
            formData.patientNo = _k.unwrap( currentPatient.patientNo ) || '';

            formData.title = _k.unwrap( currentPatient.title );
            formData.firstname = _k.unwrap( currentPatient.firstname );
            formData.nameaffix = _k.unwrap( currentPatient.nameaffix ) || '';
            formData.nameinfix = _k.unwrap( currentPatient.fk3120 ) || '';
            formData.lastname = _k.unwrap( currentPatient.lastname );
            formData.fullname = _k.unwrap( currentPatient.firstname ) + ' ' + _k.unwrap( currentPatient.lastname );

            formData.talk = Y.doccirrus.schemaloader.translateEnumValue( '-de', _k.unwrap( currentPatient.talk ), Y.doccirrus.schemas.person.types.Talk_E.list, 'k.A.' );

            formData.patientName = Y.doccirrus.schemas.person.personDisplay( {
                'title': _k.unwrap( currentPatient.title ),
                'firstname': _k.unwrap( currentPatient.firstname ),
                'lastname': _k.unwrap( currentPatient.lastname )
            } );

            //  MOJ-8721 create extended patient name and strip any newlines
            formData.longPatientName = '' +
                                       formData.talk + ' ' +
                                       formData.title + ' ' +
                                       formData.nameaffix + ' ' +
                                       formData.nameinfix + ' ' +
                                       formData.firstname + ' ' +
                                       formData.lastname;

            formData.longPatientName = formData.longPatientName.replace( new RegExp( "\n", 'g' ), '' ); //eslint-disable-line

            formData.address = '';
            formData.postbox = '';
            formData.addon  = '';
            formData.houseno = '';
            formData.street = '';
            formData.zip = '';
            formData.city = '';
            formData.country = '';
            formData.countryCode = '';
            formData.cantonCode = '';       //  Swiss mode only
            formData.dataTransmissionToMediportApproved = _k.unwrap( currentPatient.dataTransmissionToMediportApproved ) ? TXT_YES : TXT_NO;

            formData.workingAt = _k.unwrap( currentPatient.workingAt ) || '';
            formData.jobTitle = _k.unwrap( currentPatient.jobTitle ) || '';
            formData.isPensioner = _k.unwrap( currentPatient.isPensioner ) ? TXT_YES : TXT_NO;

            formData.currentDate = moment.utc( new Date().getTime() ).local().format( 'DD.MM.YYYY' );
            formData.currentSmall = moment.utc( new Date().getTime() ).local().format( 'DD.MM.YY' );
            formData.displayname = _k.unwrap( currentPatient.firstname ) + ' ' + _k.unwrap( currentPatient.lastname );
            formData.chiffre = makeChiffre( currentPatient );

            formData.insuranceName = '';
            formData.insuranceNo = '';
            formData.insuranceId = '';
            formData.insuranceKind = '';
            formData.persGroup = '';
            formData.dmp = '';
            formData.insuranceGrpId = '';
            formData.insuranceBgNumber = '';

            formData.insuranceGLN = '';
            formData.receipientGLN = '';

            //  patients may now have more than one insurance company, MOJ-10032
            formData.insuranceNames = '';

            //  TODO - checkme - is Gultigkeitsdatum the insuraceState.validTo date?

            formData.insuranceValidTo = '';
            formData.insuranceValidToSlash = '';
            formData.isBVG = false;

            formData.commercialNo = formData.commercialNo || '';
            formData.doctorNumber = formData.doctorNumber || '';
            formData.zsrNumber = formData.zsrNumber || '';

            formData.careDegree = Y.doccirrus.schemaloader.translateEnumValue( '-de', _k.unwrap( currentPatient.careDegree ), Y.doccirrus.schemas.patient.types.CareDegree_E.list, '' );

            //  add patient address
            if( !officialAddress ) {
                Y.log( 'current official address not found: ', 'debug', NAME );

                if( poboxAddress ) {
                    formData.street = _k.unwrap( poboxAddress.postbox );
                    formData.houseno = _k.unwrap( poboxAddress.houseno );
                    formData.zip = _k.unwrap( poboxAddress.zip );
                    formData.city = _k.unwrap( poboxAddress.city );
                    formData.country = _k.unwrap( poboxAddress.country );
                    formData.postbox = _k.unwrap( poboxAddress.postbox );
                    formData.addon = _k.unwrap( poboxAddress.addon );
                    formData.countryCode = _k.unwrap( poboxAddress.countryCode );

                    //  Swiss mode only
                    formData.cantonCode = _k.unwrap( poboxAddress.cantonCode );
                } else {
                    Y.log( 'current postbox address not found: ', 'debug', NAME );
                }
            } else {
                formData.address = getAddressAsString( officialAddress );

                formData.street = _k.unwrap( officialAddress.street );
                formData.houseno = _k.unwrap( officialAddress.houseno );
                formData.zip = _k.unwrap( officialAddress.zip );
                formData.city = _k.unwrap( officialAddress.city );
                formData.country = _k.unwrap( officialAddress.country );
                formData.postbox = _k.unwrap( officialAddress.postbox );
                formData.addon = _k.unwrap( officialAddress.addon );
                formData.countryCode = _k.unwrap( officialAddress.countryCode );

                //  Swiss mode only
                formData.cantonCode = _k.unwrap( officialAddress.cantonCode );
            }

            formData.billingAddress = billingAddress;
            if( billingAddress ) {
                formData.billingAddressAndType = getAddressAsString( billingAddress );
                if( 'organization' === billingAddress.payerType ) {
                    formData.billingAddressType = i18n( 'person-schema.Address_T.organization' );
                }

                if( 'person' === billingAddress.payerType ) {
                    formData.billingAddressType = i18n( 'person-schema.Address_T.person' );
                }
            }

            // needed for barcode mapping
            formData.officialAddressBC = {};
            formData.poboxAddressBC = {};
            if( officialAddress ) {
                formData.officialAddressBC = {
                    zip: _k.unwrap( officialAddress.zip ),
                    city: _k.unwrap( officialAddress.city ),
                    street: _k.unwrap( officialAddress.street ),
                    houseno: _k.unwrap( officialAddress.houseno ),
                    countryCode: _k.unwrap( officialAddress.countryCode ),
                    addon: _k.unwrap( officialAddress.addon ),
                    cantonCode: _k.unwrap( officialAddress.cantonCode )
                };
            }

            if( poboxAddress ) {
                formData.poboxAddressBC = {
                    zip: _k.unwrap( poboxAddress.zip ),
                    city: _k.unwrap( poboxAddress.city ),
                    postbox: _k.unwrap( poboxAddress.postbox ),
                    addon: _k.unwrap( poboxAddress.addon ),
                    countryCode: _k.unwrap( poboxAddress.countryCode )
                };
            }

            if( 'INVOICE' === formData.actType && billingAddress ) {
                formData.address = getAddressAsString( billingAddress );

                formData.street = _k.unwrap( billingAddress.street );
                formData.houseno = _k.unwrap( billingAddress.houseno );
                formData.zip = _k.unwrap( billingAddress.zip );
                formData.city = _k.unwrap( billingAddress.city );
                formData.country = _k.unwrap( billingAddress.country );
                formData.postbox = _k.unwrap( billingAddress.postbox );
                formData.addon = _k.unwrap( billingAddress.addon );
                formData.countryCode = _k.unwrap( billingAddress.countryCode );

                //  Swiss mode only
                formData.cantonCode = _k.unwrap( billingAddress.cantonCode );

            }

            formData.gender = mapGender( _k.unwrap( currentPatient.gender ) );
            formData.genderUpperCase = formData.gender.toUpperCase();
            formData.isMale = 'MALE' === _k.unwrap( currentPatient.gender ) ||
                              'UNDEFINED' === _k.unwrap( currentPatient.gender );
            formData.isFemale = 'FEMALE' === _k.unwrap( currentPatient.gender ) ||
                                'UNDEFINED' === _k.unwrap( currentPatient.gender );

            formData.isMaleM = '';
            formData.isFemaleW = '';
            if( 'UNDEFINED' === _k.unwrap( currentPatient.gender ) ) {
                formData.isMaleM = 'X';
                formData.isFemaleW = 'X';
            } else if( 'MALE' === _k.unwrap( currentPatient.gender ) ) {
                formData.isMaleM = 'M';
            } else if( 'FEMALE' === _k.unwrap( currentPatient.gender ) ) {
                formData.isFemaleW = 'W';
            }

            //  additional contact data and Swiss social security
            formData.socialSecurityNo = _k.unwrap( currentPatient.socialSecurityNo ) || '';
            formData.emergencyContact = '';
            formData.internetAddress = '';
            formData.mobilePhone = '';

            communications = _k.unwrap( currentPatient.communications ) || [];
            for( i = 0; i < communications.length; i++ ) {
                switch( _k.unwrap( communications[i].type ) ) {
                    case 'URL':
                        formData.internetAddress = _k.unwrap( communications[i].value );
                        break;
                    case 'PHONEEMERGENCY':
                        formData.emergencyContact = _k.unwrap( communications[i].value );
                        break;
                    case 'MOBILEPRIV':
                        formData.mobilePhone = _k.unwrap( communications[i].value );
                        break;
                }
            }

            //  add insurance details
            insuranceStatus = _k.unwrap( currentPatient.insuranceStatus );

            // get insurance by casefolder
            if( formData.caseFolderType && insuranceStatus && insuranceStatus.length ) {
                insuranceStatus.some( function( _insurance ) {
                    //Y.log('Comparing insurance type with casefolder: ' + _k.unwrap( _insurance.type ) + ' vs ' + caseFolder.type, 'debug', NAME);
                    if( _k.unwrap( _insurance.type ) === formData.caseFolderType ) {
                        insurance = _insurance;
                        return true;
                    }
                } );
            } else {
                insurance = insuranceStatus && insuranceStatus[0];
            }

            if( insurance ) {
                formData.insuranceName = _k.unwrap( insurance.insuranceName ) || '';
                formData.insuranceAddr1 = _k.unwrap( insurance.address1 ) || '';
                formData.insuranceAddr2 = _k.unwrap( insurance.address2 ) || '';
                formData.insurancePrintName = _k.unwrap( insurance.insurancePrintName ) || '';
                formData.insuranceNo = _k.unwrap( insurance.insuranceNo ) || '';
                formData.insuranceId = _k.unwrap( insurance.insuranceId ) || '';
                formData.insuranceKind = _k.unwrap( insurance.insuranceKind ) || '';
                formData.insuranceType = _k.unwrap( insurance.type ) || '';
                formData.persGroup = _k.unwrap( insurance.persGroup ) || '';
                formData.dmp = _k.unwrap( insurance.dmp ) || '';
                formData.insuranceGrpId = _k.unwrap( insurance.insuranceGrpId ) || '';
                formData.insuranceValidTo = _k.unwrap( insurance.fk4110 ) || '';
                formData.insuranceValidToSlash = (_k.unwrap( insurance.fk4110 )) ? moment.utc( _k.unwrap( insurance.fk4110 ) ).local().format( 'MM/YY' ) : '';
                formData.locationFeatures = _k.unwrap( insurance.locationFeatures ) || '';
                formData.isBVG = '02' === _k.unwrap( insurance.costCarrierBillingSection );
                formData.billingFactor = _k.unwrap( insurance.billingFactor );

                formData.costCarrierBillingSection = _k.unwrap( insurance.costCarrierBillingSection );
                formData.lastCardRead = _k.unwrap( insurance.cardSwipe );
                formData.feeSchedule = _k.unwrap( insurance.feeSchedule );

                if( 'BG' === formData.insuranceType ) {
                    formData.insuranceBgNumber = _k.unwrap( insurance.bgNumber ) || '';
                }

                if( formData.insuranceType.indexOf( 'PRIVATE_CH' ) > -1 ) {
                    //  Swiss mode only
                    formData.insuranceGLN = _k.unwrap( insurance.insuranceGLN );
                    formData.recipientGLN = _k.unwrap( insurance.recipientGLN );
                    formData.insuranceMediport = _k.unwrap( insurance.mediport ) ? TXT_YES : TXT_NO;
                }

                // P6-51 remove data of kbv fake insurance
                if( '74799' === formData.insuranceGrpId ) {
                    formData.insuranceGrpId = 'XXXXXXXX';
                    formData.insuranceId = 'XXXXXXXX';
                    formData.insurancePrintName = 'XXXXXXXX';
                    formData.insuranceName = 'XXXXXXXX';
                }

                setPaidStatus( formData, insurance, isKBVForm4, _k.unwrap( currentPatient.dob ), config );
                setFk4202( formData, config );
                setFk3000( formData, config );

                //  Swiss mode only
                if( _k.unwrap( insurance.isTiersPayant ) ) {
                    formData.tiersInsurance = i18n( 'InCaseMojit.casefile_detail.label.IsTiersPayant' );
                }

                if( _k.unwrap( insurance.isTiersGarant ) ) {
                    formData.tiersInsurance = i18n( 'InCaseMojit.casefile_detail.label.IsTiersGarant' );
                }

                formData.vekaCardNo = _k.unwrap( insurance.vekaCardNo ) || '';

            } else {
                Y.log( 'Insurance details not set for this patient.', 'debug', NAME );
            }

            //  Add all insurance names MOJ-10032
            if( insuranceStatus ) {
                insuranceNames = [];
                for( i = 0; i < insuranceStatus.length; i++ ) {
                    insurance = insuranceStatus[i];
                    //  SELFPAYER may not have insurance name, skip
                    if( _k.unwrap( insurance.insuranceName ) ) {
                        insuranceNames.push( _k.unwrap( insurance.insuranceName ) );
                    }
                }
                formData.insuranceNames = insuranceNames.join( ', ' );
            }

            if( billingAddress && 'organization' === _k.unwrap( billingAddress.payerType ) && _k.unwrap( billingAddress.receiver ) ) {
                formData.receiver = _k.unwrap( billingAddress.receiver );
            } else if( billingAddress && 'person' === _k.unwrap( billingAddress.payerType ) ) {
                formData.receiver = Y.doccirrus.schemaloader.translateEnumValue( '-de', _k.unwrap( billingAddress.talk ), Y.doccirrus.schemas.person.types.Talk_E.list, 'k.A.' )
                                    + ' ' + _k.unwrap( billingAddress.firstname ) + ' ' + _k.unwrap( billingAddress.lastname );
            } else {
                formData.receiver = formData.talk + ' ' + formData.displayname;
            }

            if( _k.unwrap( currentPatient.cardSwipe ) ) {
                formData.cardStatus = 'GREEN';
            } else if( _k.unwrap( currentPatient.insuranceWOCard ) ) {
                formData.cardStatus = 'ORANGE';
            } else {
                formData.cardStatus = 'RED';
            }

            return formData;
        }   //   end mapPatientBasicData

        /**
         *  Map patient primary care physician contact / Zuweiser
         *
         *  @param  {Object}    formData                expanded context
         *  @param  {Object}    patientPhysician        Plain basecontact of physician type
         *  @return {*}
         */

        function mapPhysicianData( formData, patientPhysician ) {
            var
                translateTalk = Y.doccirrus.schemaloader.translateEnumValue(
                    '-de',
                    _k.unwrap( patientPhysician.talk ),
                    Y.doccirrus.schemas.person.types.Talk_E.list, ''
                );

            formData.physicianAddress = '';
            formData.physicianName = '';
            formData.physicianNameTemplate = '';
            formData.physicianExpertise = patientPhysician.expertiseText || '';

            //  Available in Swiss country mode
            formData.physicianGLN = patientPhysician.glnNumber ? patientPhysician.glnNumber : '';

            if( patientPhysician.addresses ) {
                formData.physicianAddress = getAddressAsString( patientPhysician.addresses[0] );
            }

            //  physicianName and physicianNameTemplate switched in version 4.4.8 for MOJ-10799
            formData.physicianName = concat(
                'z. Hd. ',
                translateTalk,
                patientPhysician.title,
                patientPhysician.firstname,
                patientPhysician.nameaffix,
                patientPhysician.lastname
            );

            formData.physicianNameTemplate = concat(
                patientPhysician.title,
                patientPhysician.firstname,
                patientPhysician.nameaffix,
                patientPhysician.lastname
            );

            formData.physicianSurnameTemplate = concat(
                translateTalk,
                patientPhysician.title,
                patientPhysician.nameaffix,
                patientPhysician.lastname
            );

            if( formData.physicianName ) {
                formData.physicianName = _k.unwrap( formData.physicianName );
            } else {
                //  placeholder removed for MOJ-6048
                formData.physicianName = '';
            }

            return formData;
        }

        /**
         *  Map patient primary care physician contact / Überweiser
         *
         *  @param  {Object}    formData                expanded context
         *  @param  {Object}    referringDoctor         Plain basecontact of physician type
         *  @return {*}
         */

        function mapReferralDoctorData( formData, referringDoctor ) {
            formData.referringDoctor = '';
            formData.referringDoctorSurnameTemplate = '';
            formData.referringDoctorAddress = '';

            if( !referringDoctor ) {
                return formData;
            }

            var
                translateTalk = Y.doccirrus.schemaloader.translateEnumValue(
                    '-de',
                    _k.unwrap( referringDoctor.talk ),
                    Y.doccirrus.schemas.person.types.Talk_E.list, ''
                );

            formData.referringDoctor = concat(
                referringDoctor.title,
                referringDoctor.firstname,
                referringDoctor.nameaffix,
                referringDoctor.lastname
            );

            formData.referringDoctorSurnameTemplate = concat(
                translateTalk,
                referringDoctor.title,
                referringDoctor.nameaffix,
                referringDoctor.lastname
            );

            if( referringDoctor.addresses ) {
                formData.referringDoctorAddress = getAddressAsString( referringDoctor.addresses[0] );
            }

            // make every contact information obtainable individually as well
            formData.referringDoctorTitle = _k.unwrap( referringDoctor.title );
            formData.referringDoctorFirstname = _k.unwrap( referringDoctor.firstname );
            formData.referringDoctorLastname = _k.unwrap( referringDoctor.lastname );

            if( referringDoctor.addresses && referringDoctor.addresses[0] ) {
                formData.referringDoctorStreet = _k.unwrap( referringDoctor.addresses[0].street );
                formData.referringDoctorHouseNo = _k.unwrap( referringDoctor.addresses[0].houseno );
                formData.referringDoctorZip = _k.unwrap( referringDoctor.addresses[0].zip );
                formData.referringDoctorCity = _k.unwrap( referringDoctor.addresses[0].city );
            }

            // additional describing data for the referring doctor
            formData.referringDoctorId = _k.unwrap( referringDoctor._id ).toString();
            formData.referringDoctorLANR = _k.unwrap( referringDoctor.officialNo );
            formData.referringDoctorBSNR = _k.unwrap( referringDoctor.bsnrs && referringDoctor.bsnrs[0] ) || '';
            formData.referringDoctorInstitutionType = _k.unwrap( referringDoctor.institutionType );

            if ( referringDoctor.expertise && Array.isArray( referringDoctor.expertise ) ) {
                formData.referringDoctorExpertise = referringDoctor.expertise.join( ", " );
            }

            return formData;
        }

        /**
         *  Map patient family doctor contact / Hausarzt
         *
         *  @param  {Object}    formData                expanded context
         *  @param  {Object}    patientFamilyDoctor     Plain basecontact of physician type
         *  @return {*}
         */

        function mapFamilyDoctorData( formData, patientFamilyDoctor ) {

            var
                translateTalk = Y.doccirrus.schemaloader.translateEnumValue(
                    '-de',
                    _k.unwrap( patientFamilyDoctor.talk ),
                    Y.doccirrus.schemas.person.types.Talk_E.list, ''
                );

            formData.familyDoctorAddress = '';
            formData.familyDoctorName = '';
            formData.familyDoctorNameTemplate = '';
            formData.familyDoctorExpertise = patientFamilyDoctor.expertiseText || '';

            if( patientFamilyDoctor.addresses ) {
                formData.familyDoctorAddress = getAddressAsString( patientFamilyDoctor.addresses[0] );
            }

            //  physicianName and physicianNameTemplate switched in version 4.4.8 for MOJ-10799
            formData.familyDoctorName = concat(
                'z. Hd. ',
                translateTalk,
                patientFamilyDoctor.title,
                patientFamilyDoctor.firstname,
                patientFamilyDoctor.nameaffix,
                patientFamilyDoctor.lastname
            );

            formData.familyDoctorNameTemplate = concat(
                translateTalk,
                patientFamilyDoctor.title,
                patientFamilyDoctor.firstname,
                patientFamilyDoctor.nameaffix,
                patientFamilyDoctor.lastname
            );

            formData.familyDoctorSurnameTemplate = concat(
                translateTalk,
                patientFamilyDoctor.title,
                patientFamilyDoctor.nameaffix,
                patientFamilyDoctor.lastname
            );

            if( formData.familyDoctorName ) {
                formData.familyDoctorName = _k.unwrap( formData.familyDoctorName );
            } else {
                formData.familyDoctorName = '';
            }

            if( formData.familyDoctorExpertise && 'object' === typeof formData.familyDoctorExpertise && formData.familyDoctorExpertise[0] ) {
                formData.familyDoctorExpertise = JSON.stringify( formData.familyDoctorExpertise );
            }

            return formData;
        }

        /**
         *  Map patient institution contact / Einrightung
         *
         *  @param  {Object}    formData                expanded context
         *  @param  {Object}    patientInstitution      Plain basecontact of institution type
         *  @return {*}
         */

        function mapInstitutionData( formData, patientInstitution ) {
            var institutionTypeList = Y.doccirrus.schemas.basecontact.types.InstitutionContactType_E.list;

            formData.institutionAddress = '';
            formData.institutionName = '';
            formData.institutionNameTemplate = '';

            formData.institutionType = '';
            if( patientInstitution.institutionType ) {
                formData.institutionType = Y.doccirrus.schemaloader.translateEnumValue(
                    '-de',                                                                  //TODO: from context
                    patientInstitution.institutionType,
                    institutionTypeList, ''
                );
            }

            if( patientInstitution.addresses ) {
                formData.institutionAddress = getAddressAsString( patientInstitution.addresses[0] );
            }

            formData.institutionName = patientInstitution.institutionName;

            if( formData.insitutionName ) {
                formData.insitutionName = _k.unwrap( formData.insitutionName );
            } else {
                formData.insitutionName = '';
            }

            return formData;
        }

        /**
         *  List of addresses of contacts of this patient, for lists and dropdowns, MOJ-9483
         *
         *  @param  {Object}    formData                            Values expanded so far
         *  @param  {Object}    context                             Mapping context, see mappinghelper.x.js
         *  @param  {Object}    context.currentPatient              Plain or KO viewmodel
         *  @param  {Object}    context.patientAdditionalContacts   Array of plain contact objects
         *  @param  {Object}    context.patientFamilyDoctor         Plain contact object
         *  @param  {Object}    context.patientPhysician            Plain contact object
         *  @param  {Object}    context.patientInstutution          Plain contact object
         */

        function mapAdditionalAddresses( formData, context ) {
            var
                currentPatient = context.patient,
                patientAdditionalContacts = context.patientAdditionalContacts || currentPatient.additionalContactsObj || [],
                patientFamilyDoctor = context.patientFamilyDoctor || currentPatient.familyDoctorObj || null,
                patientPhysician = context.patientPhysician || currentPatient.physiciansObj || null,
                patientInstitution = context.patientInstutution || currentPatient.institutionObj || null,
                referringDoctor = context.referringDoctor || null,
                i;

            formData.contactAddresses = [];
            formData.contactAddressesName = [];

            addAllContactAddresses( patientFamilyDoctor );
            addAllContactAddresses( patientPhysician );
            addAllContactAddresses( patientInstitution );
            addAllContactAddresses( referringDoctor );

            if( !patientAdditionalContacts || !patientAdditionalContacts.length ) {
                return;
            }

            for( i = 0; i < patientAdditionalContacts.length; i++ ) {
                addAllContactAddresses( patientAdditionalContacts[i] );
            }

            function addAllContactAddresses( basecontact ) {
                if( !basecontact || !basecontact.addresses || !basecontact.addresses[0] ) {
                    return;
                }
                var
                    talk_E = Y.doccirrus.schemas.person.types.Talk_E.list,
                    addressString, nameString, talkString, j;

                for( j = 0; j < basecontact.addresses.length; j++ ) {

                    if( basecontact.institutionName && '' !== basecontact.institutionName ) {
                        nameString = basecontact.institutionName;
                    } else {
                        //  TODO: get enum language form form
                        talkString = basecontact.talk ? Y.doccirrus.schemaloader.translateEnumValue( '-de', _k.unwrap( basecontact.talk ), talk_E, '' ) : '';
                        nameString = talkString + ' ' + basecontact.title + ' ' + basecontact.firstname + ' ' + basecontact.lastname;
                        nameString = nameString.replace( '  ', ' ', nameString );
                    }

                    addressString = getAddressAsString( basecontact.addresses[j] );
                    formData.contactAddresses.push( addressString );
                    formData.contactAddressesName.push( nameString + '\n' + addressString );
                }
            }
        }

        function castReportingDates( formData ) {
            if( formData.dob ) {
                formData.dob = moment.utc( formData.dob, 'DD.MM.YYYY' ).toDate(); //remove timezone diffs for dob
            }
            if( formData.dateOfDeath ) {
                formData.dateOfDeath = moment.utc( formData.dateOfDeath, 'DD.MM.YYYY' ).toDate();
            }
            if( formData.dateOfInActive ) {
                formData.dateOfInActive = moment.utc( formData.dateOfInActive, TIMESTAMP_FORMAT ).toDate();
            }
            if( formData.currentDate ) {
                formData.currentDate = moment.utc( formData.currentDate, 'DD.MM.YYYY' ).toDate();
            }
            if( formData.dateNormal ) {
                formData.dateNormal = moment.utc( formData.dateNormal, 'DD.MM.YYYY' ).toDate();
            }
            if( formData.editDate ) {
                formData.editDate = moment.utc( formData.editDate, 'DD.MM.YY' ).toDate();
            }

            if( formData.invoiceDate ) {
                if( 'INVOICE' === formData.actType ) {
                    formData.invoiceDate = moment( formData.invoiceDate ).toDate();
                    formData.invoiceBilledDate = formData.invoiceDate;
                } else {
                    formData.invoiceDate = moment.utc( formData.invoiceDate, 'DD.MM.YYYY' ).toDate();
                    formData.invoiceBilledDate = formData.invoiceDate;
                }
            } else {
                formData.invoiceDate = new Date();
                formData.invoiceBilledDate = new Date();
            }
        }

        function castAllTypes( formData ) {

            var inCaseSchema = Y.dcforms.reducedschema.loadSync( 'InCase_T' ),
                currentSchema = {},
                currentType = '',
                dataKey;

            for( dataKey in formData ) {
                if( formData.hasOwnProperty( dataKey ) && formData[dataKey] !== undefined ) {
                    currentSchema = inCaseSchema[dataKey];
                    if( currentSchema && currentSchema.hasOwnProperty( 'type' ) && currentSchema.type !== 'String' ) {

                        if( !currentSchema.type || !currentSchema.type.toLowerCase ) {
                            // we don't cast complex types, they need a special column in reporting, eg [String]
                            currentType = '';
                        } else {
                            currentType = currentSchema.type.toLowerCase();
                        }

                        switch( currentType ) {
                            case 'boolean':
                                formData[dataKey] = Boolean( formData[dataKey] );
                                break;
                            case 'number':
                                //  convert currency values shown in form to numeric values shown in report columns
                                //  (will be re-displayed as currency, but available to aggregations as numbers)
                                if( 'string' === typeof formData[dataKey] ) {
                                    if( -1 !== formData[dataKey].indexOf( '€' ) ) {
                                        formData[dataKey] = formData[dataKey].replace( '€', '' );
                                    }
                                    if( -1 !== formData[dataKey].indexOf( 'CHF' ) ) {
                                        formData[dataKey] = formData[dataKey].replace( 'CHF', '' );
                                    }
                                    if( -1 !== formData[dataKey].indexOf( ',' ) ) {
                                        formData[dataKey] = formData[dataKey].replace( ',', '.' );
                                    }
                                    formData[dataKey] = formData[dataKey].trim();
                                }

                                formData[dataKey] = Number( formData[dataKey] );
                                break;
                        }
                    }
                }
            }
        }

        function generateDiagnosisText( diag, long ) {
            var code = _k.unwrap( diag.code ),
                cert = Y.doccirrus.kbvcommonutils.mapDiagnosisCert( _k.unwrap( diag.diagnosisCert ) ),
                site = _k.unwrap( diag.diagnosisSite ),
                text = long && _k.unwrap( diag.content );
            if( !code || !code.length ) {
                return null;
            }
            return code + (cert ? (' ' + cert) : '') + (site && site.length ? (' ' + site[0]) : '') + (text ? (' ' + text) : '');
        }

        function getInSightKeys( config ) {
            var
                rCache = config.context.rCache || false,
                inCaseSchema,
                activitySchema = Y.doccirrus.schemas.activity.schema,
                inCaseKey,
                keys = [];

            if( rCache && rCache.InSightKeys ) {
                return rCache.InSightKeys;
            }

            inCaseSchema = Y.dcforms.reducedschema.loadSync( 'InCase_T' );

            for( inCaseKey in inCaseSchema ) {
                if( inCaseSchema.hasOwnProperty( inCaseKey ) ) {
                    if( activitySchema[inCaseKey] ) {
                        keys.push( inCaseKey );
                    }
                }
            }

            //  keep for next time if we are on the server
            if( rCache ) {
                rCache.InSightKeys = keys;
            }
            return keys;
        }

        /**
         * Additional patient ID numbers, EXTMOJ-1359
         *
         * @param partnerIds
         * @return {*}
         */

        function renderAdditionalNumber( currentPatient ) {
            var
                partnerIds = (currentPatient && currentPatient.partnerIds) ? _k.unwrap( currentPatient.partnerIds ) : null;

            if( !Array.isArray( partnerIds ) || !partnerIds.length ) {
                return '';
            }

            function hasPartnerPatientId( item ) {
                return _k.unwrap( item.patientId );
            }

            function translateIdLabels( entry ) {
                var
                    entryExtra = entry.extra ? _k.unwrap( entry.extra ) : null,
                    entryPartnerId = entry.partnerId ? _k.unwrap( entry.partnerId ) : null,
                    entryPatientId = entry.patientId ? _k.unwrap( entry.patientId ) : '';

                if( entryExtra ) {
                    return entryPatientId + " (" + entryExtra + ")";
                } else if( entryPartnerId ) {
                    return entryPatientId + " (" + Y.doccirrus.schemaloader.getEnumListTranslation( 'patient', 'PartnerIdsPartnerId_E', entryPartnerId, 'i18n', '' ) + ")";
                } else {
                    return entryPatientId;
                }
            }

            return partnerIds.filter( hasPartnerPatientId ).map( translateIdLabels ).join( ', ' );
        }

        /**
         * setup form mappers
         *
         * TODO: refactor this to the mapping helper, this has become overloaded, we should be populating the context
         * before calling the mappers, rather than overloading the patient, etc
         */

        addFormMapper( {
            name: 'setupFormdataPatient',
            group: [
                'activityId',
                'status',
                "timestampDate",
                "timestamp",
                "timestampBFB",
                "dateNormal",
                "date",
                "editDate",
                "age",
                "dobSmaller",
                "dobSmallerWithoutPoints",
                "dob",
                "dateOfDeath",
                "reason",
                "isDeceased",
                "isPensioner",
                "inActive",
                "dateOfInActive",
                'jobStatus',
                "kbvDob",
                "dd",
                "mm",
                "yy",
                "yyyy",
                "patientDOB",
                "dobPlain",
                "activityId",
                "patientId",
                "actType",
                "subType",
                "title",
                "firstname",
                "nameaffix",
                "lastname",
                "fullname",
                "longPatientName",
                "address",
                "postbox",
                "addon",
                "houseno",
                "street",
                "zip",
                "city",
                "country",
                "countryCode",
                "workingAt",
                "jobTitle",
                "currentDate",
                "currentSmall",
                "displayname",
                "chiffre",
                "insuranceName",
                "insuranceNo",
                "insuranceId",
                "insuranceKind",
                "insuranceNames",
                "insuranceBgNumber",
                "persGroup",
                "dmp",
                "insuranceGrpId",
                "insuranceValidTo",
                "insuranceValidToSlash",
                "isBVG",
                "specialisationText",
                "insuranceAddr1",
                "insuranceAddr2",
                "insurancePrintName",
                "locationFeatures",
                "paidFree",
                "paid",
                "gender",
                "isMale",
                "isFemale",
                "isMaleM",
                "isFemaleW",
                "mobilePhone",
                "emergencyContact",
                "internetAddress",
                "socialSecurityNo",
                "talk",
                "diagnoses",
                "physicianAddress",
                "physicianName",
                "physicianNameTemplate",
                "physicianSurameTemplate",
                "physicianExpertise",
                "familyDoctorAddress",
                "familyDoctorName",
                "familyDoctorNameTemplate",
                "familyDoctorSurnameTemplate",
                "familyDoctorExpertise",
                "referringDoctor",
                "referringDoctorAddress",
                "referringDoctorSurnameTemplate",
                "institutionName",
                "institutionAddress",
                "institutionType",
                "contactAddresses",
                "contactAddressesName",
                'officialAddressBC',
                'poboxAddressBC',
                "bestPatientPhone",
                "patientNo",
                "careDegree",
                "patientAdditionalNumbers",
                "createUniqCaseIdentNoOnInvoice",

                //  Swiss country mmode
                "insuranceGLN",
                "recipientGLN",
                "cantonCode",
                "dataTransmissionToMediportApproved",
                "isTiersGarant",
                "isTiersPayant",
                "vekaCardNo"
            ],
            deps: [
                'setPhysicianData',      //  map patient contacts (hausarzt, zuweiser, etc)
                'setMarkerData'
            ],
            fn: function( formData, config, callback ) {
                var
                    empty = {},
                    currentPatient = config.context.patient,
                    currentActivity = config.context.activity,
                    caseFolder = config.context.caseFolder || null,
                    eds,
                    tsmom;

                if( !currentActivity ) {
                    return callback( null, formData );
                }

                if( !currentPatient ) {
                    Y.log( 'Inconsistent data: Activity without patient reference (ignoring): ' + currentActivity && _k.unwrap( currentActivity._id ), 'error', NAME );
                    Y.log( 'Inconsistent data: Activity timestamp: ' + currentActivity && currentActivity.timestamp, 'info', NAME );
                    return callback( null, formData );
                }

                if( Y.dcforms.isOnServer && !config.context.rCache ) {
                    config.context.rCache = Y.doccirrus.insight2.reportingCache.createReportingCache();
                }

                var
                    isKBVForm4 = config.context.template.defaultFor && -1 !== form4FormRoles.indexOf( config.context.template.defaultFor ),
                    phys = _k.unwrap( currentPatient && currentPatient.physicians ) || empty;

                if( empty === phys ) {
                    Y.log( 'Inconsistent data. Activity without valid patient reference: ' + currentActivity && _k.unwrap( currentActivity._id ), 'warn', NAME );
                }

                if( !caseFolder ) {
                    Y.log( 'casefolder data or primaryDoc data missing: ' + JSON.stringify( caseFolder ), 'warn', NAME );
                }

                // data based on activity
                formData.actType = _k.unwrap( currentActivity.actType ) || '';
                formData.subType = _k.unwrap( currentActivity.subType ) || '';

                if( '' === formData.subType ) {
                    formData.subType = ' ';
                }

                formData.activityId = _k.unwrap( currentActivity._id );
                formData.status = _k.unwrap( currentActivity.status );

                // set caseFolderData
                mapCaseFolderData( formData, caseFolder );

                // set basic data of patient
                mapPatientBasicData( formData, currentPatient, isKBVForm4, config );

                /*
                 Schema       -   Definition from PO
                 ========     ===============
                 date         -  TreatmentDate DD.MM.YY
                 timestamp    -  TreatmentDate DD.MM.YY
                 dateNormal   -  TreatmentDate DD.MM.YYYY
                 dateQuarter  -  TreatmentDate Q
                 dateYearQuarter -  TreatmentDate YYYY-Q
                 dateYearMonth -  TreatmentDate YYYY-M
                 dateYearWeek -  TreatmentDate YYYY-W
                 editDate     -  EditDate
                 time         -  Treatment / activity time MOJ-6047
                 */

                tsmom = moment.utc( _k.unwrap( currentActivity.timestamp ) ).local();
                formData.timestampString = _k.unwrap( currentActivity.timestamp ).toString();
                formData.timestampDate = tsmom.toDate();
                formData.timestamp = tsmom.format( 'DD.MM.YY' );
                formData.timestampBFB = tsmom.format( 'DDMMYY' );
                formData.dateNormal = tsmom.format( 'DD.MM.YYYY' );
                formData.dateQuarter = tsmom.format( 'Q' );
                formData.dateYearQuarter = tsmom.format( 'YYYY-Q' );
                formData.dateYearMonth = tsmom.format( 'YYYY-M' );
                formData.dateYearWeek = tsmom.year() + '-' + tsmom.get( 'isoWeek' );
                formData.date = tsmom.format( 'DD.MM.YY' );
                formData.time = _k.unwrap( currentActivity.time ) || '';
                eds = _k.unwrap( currentActivity.editor || [] ) || [];
                if( eds[0] && eds[0]._id ) {
                    formData.editDate = moment.utc( Y.doccirrus.commonutils.dateFromObjectId( eds[0]._id ) ).local().format( 'DD.MM.YY' );
                }

                // override for Invoices (MOJ-6527)
                formData.billingAddress = getAddressByKind( currentPatient, KIND_BILLING );
                if( "INVOICE" === formData.actType && formData.billingAddress ) {
                    formData.address = getAddressAsString( formData.billingAddress );
                }
                //  KO model messes up saving of form document
                delete formData.billingAddress;

                //formData.patient.transactionDate = moment.utc( formData.patient.transactionDate ).local().format( 'DD.MM.YY' );
                formData.diagnoses = '';

                // add physicians info (placeholders removed for MOJ-6048)
                //  MOJ-9483 Make an array of all contact addresses for a dropdown

                //  Additional ID numbers, EXTMOJ-1359
                formData.patientAdditionalNumbers = (currentPatient.partnerIds ? renderAdditionalNumber( currentPatient ) : '');

                formData.familyDoctorModel = currentPatient.familyDoctorModel ? i18n( 'general.text.YES' ) : i18n( 'general.text.NO' );

                callback( null, formData );
            }
        } );

        addFormMapper( {
            name: 'setLocationData',
            group: [
                'setLocationData',
                'commercialNo',
                'locRegion',
                'locName',
                'locPhone',
                'locFax',
                'locStreet',
                'locHouseno',
                'locZip',
                'locCity',
                'locCountry',
                'locCountryCode',
                'locEmail',
                'locWWW',
                'locBankName',
                'locBankIBAN',
                'locBankBIC',
                'institutionCode',
                'locKV',
                'locDepartment',
                'locCantonCode',
                'zsrNumber'
            ],
            fn: function( formData, config ) {
                if( !config.context.locations && config.context.location ) {
                    config.context.locations = [config.context.location];
                }

                if( !config.context.locations || null === config.context.locations[0] ) {
                    Y.log( 'Mapper context is missing location set: ', config.context, 'warn', NAME );
                    return;
                }

                var locId;

                if( config.context.activity ) {
                    locId = _k.unwrap( config.context.activity.locationId );
                } else if( config.context.locations.length > 0 ) {
                    locId = config.context.locations[0]._id;
                } else {
                    return;
                }

                var
                    initFields = [
                        'commercialNo', 'locName', 'locPhone', 'locFax', 'locStreet', 'locHouseno', 'locZip',
                        'locCity', 'locEmail', 'locWWW', 'locBankName', 'locBankIBAN', 'locBankBIC', 'locRegion',
                        //  swiss mode only
                        'locCantonCode'
                    ],
                    loc,
                    i;

                for( i = 0; i < initFields.length; i++ ) {
                    if( !formData[initFields[i]] ) {
                        formData[initFields[i]] = '';
                    }
                }

                for( i = 0; i < config.context.locations.length; i++ ) {
                    if( config.context.locations[i]._id + '' === locId + '' ) {
                        loc = config.context.locations[i];
                    }
                }

                //  activity has no location set, or location could not be loaded
                if( !loc ) {
                    return;
                }

                formData.commercialNo = loc.commercialNo ? loc.commercialNo + '' : '';
                formData.locRegion = loc.region ? loc.region + '' : '';
                formData.locName = loc.locname ? loc.locname + '' : '';
                formData.locPhone = loc.phone ? loc.phone + '' : ' ';
                formData.locFax = loc.fax ? loc.fax + '' : '';
                formData.locStreet = loc.street ? loc.street + '' : '';
                formData.locHouseno = loc.houseno ? loc.houseno + '' : '';
                formData.locZip = loc.zip ? loc.zip : '';
                formData.locCity = loc.city ? loc.city + '' : '';
                formData.locCountry = loc.country ? loc.country + '' : '';
                formData.locCountryCode = loc.countryCode ? loc.countryCode + '' : '';

                formData.locEmail = loc.email ? loc.email + '' : '';
                formData.locWWW = loc.website ? loc.website + '' : '';
                formData.locBankName = loc.bankName ? loc.bankName + '' : '';
                formData.locBankIBAN = loc.bankIBAN ? loc.bankIBAN + '' : '';
                formData.locBankBIC = loc.bankBIC ? loc.bankBIC + '' : '';
                formData.institutionCode = loc.institutionCode ? loc.institutionCode + '' : '';
                formData.locKV = loc.kv ? loc.kv : '';
                formData.locDepartment = loc.department ? loc.department : '';

                //  Swiss country mode
                formData.locCantonCode = loc.cantonCode ? loc.cantonCode : '';
                formData.zsrNumber = loc.zsrNumber ? loc.zsrNumber : '';
            }
        } );

        addFormMapper( {
            name: 'setPracticeData',
            group: [
                'customerNo',
                'dcCustomerNo',
                'pracName',
                'pracAddress'
            ],
            fn: function( formData, config ) {
                var
                    practice,
                    pracAddress;

                formData.customerNo = '';
                formData.dcCustomerNo = '';
                formData.pracName = '';
                formData.pracAddress = '';

                if( config.context.practice ) {
                    practice = config.context.practice;
                    formData.customerNo = practice.customerNo || '';
                    formData.dcCustomerNo = practice.dcCustomerNo || '';
                    formData.pracName = practice.coname || '';

                    if( Array.isArray( practice.addresses ) && practice.addresses[0] ) {
                        pracAddress = practice.addresses[0];
                        formData.pracAddress = pracAddress.street + ' ' + pracAddress.houseno +
                                               ', ' + pracAddress.zip + ' ' + pracAddress.city;
                    }

                }
            }
        } );

        addFormMapper( {
            name: 'setCalendarData',
            group: [
                'setCalendarData'
            ],
            fn: function( formData, config ) {
                var calendar;

                if( config.context.calendar ) {
                    calendar = config.context.calendar;
                    formData.calName = calendar.name;
                    formData.calType = calendar.type;
                    formData.calIsPublic = calendar.isPublic;
                    formData.calColor = calendar.color;
                }
            }
        } );

        addFormMapper( {
            name: 'setScheduletypeData',
            group: [
                'setScheduletypeData'
            ],
            fn: function( formData, config ) {
                var scheduletype;

                if( config.context.scheduletype ) {
                    scheduletype = config.context.scheduletype;
                    formData.scheduletypeDuration = scheduletype.duration;
                    formData.scheduletypeIsPublic = scheduletype.isPublic;
                    formData.scheduletypeName = scheduletype.name;
                    formData.scheduletypeCapacity = scheduletype.capacity;
                    formData.scheduletypeInfo = scheduletype.info;
                    formData.scheduletypeIsPreconfigured = scheduletype.isPreconfigured;
                }
            }
        } );

        addFormMapper( {
            name: 'setScheduleData',
            group: [
                'setScheduleData'
            ],
            deps: [
                'setCalendarData',
                'setScheduletypeData'
            ],
            fn: function( formData, config ) {
                var schedule, calendar;

                if( config.context.schedule ) {
                    schedule = config.context.schedule;
                    calendar = config.context.calendar;

                    formData._id = schedule._id;
                    formData.scheduleId = schedule._id.toString();
                    formData.locId = calendar && calendar.locationId && calendar.locationId.toString() || Y.doccirrus.schemas.location.getMainLocationId();
                    formData.scheduleTitle = schedule.title;
                    formData.start = schedule.start;
                    formData.end = schedule.end;
                    formData.doctorStart = schedule.doctorStart;
                    formData.doctorEnd = schedule.doctorEnd;
                    formData.userDescr = schedule.userDescr;
                    formData.eta = schedule.eta;
                    formData.pushtime = schedule.pushtime;
                    formData.timestampDate = schedule.start;
                    formData.calltime = schedule.calltime;
                    formData.alertTime = schedule.alertTime;
                    formData.adhoc = schedule.adhoc;
                    formData.group = schedule.group;
                    formData.closeTime = schedule.closeTime;
                    formData.duration = schedule.duration;
                    formData.allCalDay = schedule.allDay;
                    formData.scheduletypePopulated = schedule.scheduletypePopulated;
                    formData.plannedDuration = schedule.plannedDuration;
                    formData.number = schedule.number;
                    formData.lastEditedDate = schedule.lastEditedDate;
                    formData.isFromPortal = schedule.isFromPortal;
                    formData.scheduleDetails = schedule.details;
                    formData.actualWaitingTime = schedule.actualWaitingTimeMinutes;

                    //EXTMOJ-576 Ability to query arrivalTime as boolean
                    if( moment( schedule.arrivalTime ).toDate().toString() !== Y.doccirrus.schemas.calendar.getNotArrivedTime().toString() ) {
                        formData.arrivalTime = schedule.arrivalTime;
                    }

                    formData.url = schedule.url;
                    formData.scheduled = schedule.scheduled;
                    formData.waitingTime = schedule.doctorStart ? Math.max( 0, schedule.doctorStart - schedule.arrivalTime || schedule.doctorStart - schedule.start ) :
                        Math.max( 0, schedule.start - schedule.eta || schedule.start - schedule.arrivalTime );
                    formData.waitingTime = formData.waitingTime && Math.floor( formData.waitingTime / (60 * 1000) );

                    castAllTypes( formData );
                }
            }
        } );

        addFormMapper( {
            name: 'bfbArztstempel',
            group: [
                'bfbArztstempel'
            ],
            deps: [
                'setPatientData',
                'setAdditionalFormData',
                'setEmployeeData',
                'setLocationData'
            ],
            fn: function( formData /*, config */ ) {
                /* format below is from KBV Fehlerbrief attached to MOJ-7769
                 formData.bfbArztstempel = '' +
                 formData.commercialNo + '\n' +
                 formData.locName + '\n' +
                 ( formData.employeeOfficialNo || '' ) + '\n' +
                 formData.employeeTitle + ' ' + formData.employeeLastname + '\n' +
                 formData.employeeFirstname + '\n' +
                 formData.locStreet + ' ' + formData.locHouseno + '\n' +
                 formData.locZip + ' ' + formData.locCity + '\n' +
                 formData.locPhone + '\n' +
                 formData.locFax + '\n';
                 */

                var
                    specLine = '',
                    telLine = '',
                    faxLine = '';

                if( formData.specialisationText && '' !== formData.specialisationText ) {
                    specLine = formData.specialisationText + '\n';
                }

                if( formData.locPhone && '' !== formData.locPhone && ' ' !== formData.locPhone ) {
                    telLine = 'T: ' + formData.locPhone + '\n';
                }

                if( formData.locFax && '' !== formData.locFax && ' ' !== formData.locFax ) {
                    faxLine = 'F: ' + formData.locFax + '\n';
                }

                formData.bfbArztstempel = '' +
                                          formData.employeeTitle + ' ' + formData.employeeFirstname + ' ' + formData.employeeLastname + '\n' +
                                          specLine +
                                          formData.locStreet + ' ' + formData.locHouseno + '\n' +
                                          formData.locZip + ' ' + formData.locCity + '\n' +
                                          telLine +
                                          faxLine +
                                          formData.locName + '\n' +
                                          'LANR: ' + (formData.employeeOfficialNo || '') + '\n' +
                                          'BSNR: ' + formData.commercialNo + '\n';

            }
        } );

        //  MOJ-9048 Add date related to billing of group therapy (Datum der Anerkennungsbescheides) for invoices

        addFormMapper( {
            name: 'setGroupTherapyDates',
            group: [
                'fk4235Date'
            ],
            fn: function( formData, config ) {
                var schein = config.context.lastSchein || null;

                formData.fk4235Date = '';

                if( !schein || !schein.fk4235Set || !schein.fk4235Set[0] || !schein.fk4235Set[0].fk4235 ) {
                    return;
                }

                formData.fk4235Date = moment( schein.fk4235Set[0].fk4235 ).format( 'DD.MM.YYYY' );
            }
        } );

        addFormMapper( {
            name: 'setPregnancyDates',
            group: [
                'maternityLeaveDate',
                'pregnancyDueDate',
                'pregnancyDueDatePicker',
                'pregnancyDueDatePickerYY',
                'weekOfGestation'
            ],
            deps: [
                'setPatientData'
            ],
            fn: function( formData, config ) {
                var
                    currentPatient = config.context.patient,
                    medData = _k.unwrap( currentPatient.latestMedData || [] ),
                    medDataItem,
                    lastMenstruation = -1,                                              //  date, formatted DD.MM.YY
                    cycleLength = Y.doccirrus.schemas.v_meddata.DEFAULT_CYCLE_LENGTH,   //  number, days

                    medDataType,

                    storedDueDate,
                    mappedDueDate,
                    calculatedWeekOfGestation,
                    i;

                formData.maternityLeaveDate = '';
                formData.pregnancyDueDate = '';
                formData.pregnancyDueDatePicker = '';
                formData.pregnancyDueDatePickerYY = '';
                formData.weekOfGestation = '';

                //  note that the following field holds sex, not gender, and so can be used to skip pregnancy checks
                if( 'MALE' === _k.unwrap( currentPatient.gender ) ) {
                    return;
                }

                //  if no cycle length or date of last period then we cannot estimate start of pregnancy
                if( !medData || 0 === medData.length ) {
                    return;
                }

                //  check whether cycle length and date of last pregnancy are recorded in medData
                for( i = 0; i < medData.length; i++ ) {
                    medDataItem = _k.unwrap( medData[i] );
                    medDataType = _k.unwrap( medDataItem.type || '' );

                    switch( medDataType ) {
                        // the due date and last menstruation date are stored inside MedDataItems of type DATE
                        case MedDataTypes.LAST_MENSTRUATION_P:
                            lastMenstruation = _k.unwrap( medDataItem.dateValue || null );
                            break;
                        case MedDataTypes.DUE_DATE:
                            storedDueDate = _k.unwrap( medDataItem.dateValue || null );
                            break;
                        case MedDataTypes.CYCLE_LENGTH:
                            // the CYCLE_LENGTH is stored as MedDataItem of type NUMBER_INT
                            cycleLength = parseFloat( _k.unwrap( medDataItem.value || -1 ) );
                            break;
                    }
                }

                //  check that recorded values are valid
                switch( true ) {
                    case isNaN( cycleLength ):
                    case 0 >= cycleLength:
                    case !lastMenstruation:
                    case !moment( lastMenstruation ).isValid():
                        // invalid value found, ignore this mapper
                        return;
                }

                if( storedDueDate && moment( storedDueDate ).isValid() ) {
                    // if a stored due date is available, prefer that one
                    mappedDueDate = storedDueDate;
                } else {
                    // if no stored due date is available: calculate the correct due date
                    mappedDueDate = Y.doccirrus.schemas.patient.calculateDueDate( {
                        dayOfLastMenorrhoea: lastMenstruation,
                        cycleLength: cycleLength
                    } );
                }

                if( mappedDueDate ) {
                    mappedDueDate = moment( mappedDueDate );
                    formData.pregnancyDueDate = mappedDueDate.format( 'dddd, D.MMMM YYYY' );
                    formData.pregnancyDueDatePicker = mappedDueDate.format( 'DDMMYYYY' );
                    formData.pregnancyDueDatePickerYY = mappedDueDate.format( 'DDMMYY' );
                    formData.maternityLeaveDate = mappedDueDate.subtract( 6, 'weeks' ).format( 'dddd, D.MMMM YYYY' );
                }

                calculatedWeekOfGestation = Y.doccirrus.schemas.patient.calculateWeekOfGestation( {
                    dayOfLastMenorrhoea: lastMenstruation
                } );

                if( calculatedWeekOfGestation ) {
                    formData.weekOfGestation = i18n( 'patient-schema.calculateWeekOfGestation.asString', {
                        data: {
                            week: calculatedWeekOfGestation.week,
                            days: calculatedWeekOfGestation.days
                        }
                    } );
                }
            }
        } );

        addFormMapper( {
            name: 'setTaskData',
            group: [
                'setTaskData'
            ],
            deps: [
                'setPatientData',
                'setEmployeeData',
                'setLocationData'
            ],
            fn: function( formData, config ) {
                var task;

                if( config.context.task ) {
                    task = config.context.task;

                    formData._id = task._id;
                    formData.taskId = task._id.toString();
                    formData.taskTitle = task.title;
                    formData.details = task.details || '';
                    formData.timestampDate = task.alertTime;
                    formData.roles = task.roles.join( ', ' );
                    formData.taskStatus =
                        Y.doccirrus.schemaloader.translateEnumValue( '-de', task.status, Y.doccirrus.schemas.task.types.Status_E.list, '' );
                    formData.urgency =
                        Y.doccirrus.schemaloader.translateEnumValue( '-de', task.urgency, Y.doccirrus.schemas.task.types.Urgency_E.list, '' );
                    formData.allDay = task.allDay;
                }

                formData.locId = Y.doccirrus.schemas.location.getMainLocationId();

                if( config.context.employee ) {
                    formData.employeeId = config.context.employee._id.toString();
                }

                castAllTypes( formData );
            }
        } );

        addFormMapper( {
            name: 'setEmployeeData',
            group: [
                'setEmployeeData',
                'employeeTalk',
                'employeeTitle',
                'employeeFirstname',
                'employeeNameaffix',
                'employeeLastname',
                'employeeOfficialNo',
                'employeeType',
                'employeeDepartment',
                'employeeNo',
                'employeeSpecialities',
                'specialisationText',
                'employeeWorkDescription',
                'doctorNumber',
                'employeePhysicianIknr',
                'employeeGlnNumber',
                'employeeZsrNumber',
                'employeeKNumber',
                'employeePhysicianType',
                'arztstempel'
            ],
            fn: function( formData, config ) {

                var emp,
                    employeeName;

                if( config.context.employee ) {
                    emp = config.context.employee;
                    //  TODO: translate language from form
                    formData.employeeTalk = emp.talk ? Y.doccirrus.schemaloader.translateEnumValue( '-de', emp.talk, Y.doccirrus.schemas.person.types.Talk_E.list, '' ) : '';
                    formData.employeeTitle = emp.title ? emp.title : '';
                    formData.employeeFirstname = emp.firstname ? emp.firstname + '' : '';
                    formData.employeeNameaffix = emp.nameaffix ? emp.nameaffix + '' : '';
                    formData.employeeLastname = emp.lastname ? emp.lastname + '' : '';

                    formData.employeeOfficialNo = emp.officialNo ? emp.officialNo + '' : '';
                    formData.employeeType = emp.type ? emp.type + '' : '';
                    formData.employeeTypeTranslated = emp.type ? Y.doccirrus.schemaloader.getEnumListTranslation( 'employee', 'Employee_E', emp.type, 'i18n' ) : '';
                    formData.employeeDepartment = emp.department ? emp.department + '' : '';
                    formData.employeeNo = emp.employeeNo ? emp.employeeNo + '' : '';
                    formData.employeeSpecialities = (emp.specialities && emp.specialities.length > 0) ? emp.specialities.join( ', ' ) : '';
                    formData.specialisationText = emp.specialisationText ? emp.specialisationText + '' : '';
                    formData.employeeWorkDescription = emp.workDescription ? emp.workDescription + '' : '';
                    formData.doctorNumber = formData.employeeOfficialNo;
                    formData.employeePhysicianIknr = emp.physicianIknr ? emp.physicianIknr + '' : '';
                    formData.employeeGlnNumber = emp.glnNumber ? emp.glnNumber + '' : '';
                    formData.employeeZsrNumber = emp.zsrNumber ? emp.zsrNumber + '' : '';
                    formData.employeeKNumber = emp.kNumber ? emp.kNumber + '' : '';

                    //  TODO: get translation language form form
                    formData.employeePhysicianType = emp.physicianType ? Y.doccirrus.schemaloader.translateEnumValue( '-de', emp.physicianType, Y.doccirrus.schemas.employee.types.PhysicianType_E.list, '' ) : '';

                    if( emp.arztstempel && '' !== emp.arztstempel ) {
                        //  use custom value of arztstempel from user profile if available (not for BFB forms)
                        formData.arztstempel = emp.arztstempel;

                    } else {

                        //  use legacy arztstempel (non-BFB forms)
                        employeeName = '' +
                                       (formData.employeeTitle || '') + ' ' +
                                       (formData.employeeFirstname || '') + ' ' +
                                       (formData.employeeLastname || '');

                        formData.arztstempel = '' +
                                               employeeName + '\n' +
                                               (formData.specialisationText || '') + '\n' +
                                               formData.locStreet + ' ' + formData.locHouseno + '\n' +
                                               formData.locZip + ' ' + formData.locCity + '\n' +
                                               'T: ' + formData.locPhone + ' / F: ' + formData.locFax + '\n' +
                                               'LANR: ' + (formData.employeeOfficialNo || '') + '\n' +
                                               'BSNR: ' + formData.commercialNo + '\n';
                    }

                }

            }
        } );

        /**
         *  The employee specialities are stored in an EBM catalog and will be added to the mapper context only if needed (uncommon)
         *
         *  Specialities are stored on the employee as an array of codes which match this catalog, eg '197' -> 'SP Neuroradiologie'
         */

        addFormMapper( {
            name: 'expandEmployeeSpecialities',
            group: [
                'employeeSpecialitiesText'
            ],
            fn: function( formData, config, callback ) {
                formData.employeeSpecialitiesText = '';

                if( !config.context.employee || !config.context.employee.specialities ) {
                    return callback( null );
                }

                var emp = config.context.employee;

                //  may already be cached
                if( config.context.fachgruppe ) {
                    onSpecialitiesLoaded( null, config.context.fachgruppe );
                    return;
                }

                if( Y.dcforms.isOnServer ) {
                    Y.doccirrus.api.kbv.fachgruppe( {
                        originalParams: {},
                        user: config.context.user,
                        callback: onSpecialitiesLoaded
                    } );
                } else {
                    Y.doccirrus.jsonrpc.api.kbv.fachgruppe().then( function( result ) {
                        onSpecialitiesLoaded( null, result );
                    } ).fail( function( err ) {
                        onSpecialitiesLoaded( err );
                    } );
                }

                function onSpecialitiesLoaded( err, result ) {
                    var
                        specialitiesText = [],
                        kvValue,
                        i, j;

                    if( err ) {
                        Y.log( 'Could not load employee specialities: ' + JSON.stringify( err ), 'error', NAME );
                        //  do not interrupt other mappers
                        return callback( null );
                    }

                    result = result.data ? result.data : result;
                    kvValue = result[0] && result[0].kvValue ? result[0].kvValue : [];

                    for( i = 0; i < emp.specialities.length; i++ ) {
                        for( j = 0; j < kvValue.length; j++ ) {
                            if( emp.specialities[i] === kvValue[j].key ) {
                                specialitiesText.push( kvValue[j].value );
                            }
                        }
                    }

                    formData.employeeSpecialitiesText = specialitiesText.join( ', ' );

                    //  cache it for later
                    config.context.fachgruppe = result;
                    callback( null );
                }

            }
        } );

        addFormMapper( {
            name: 'setPatientData',
            group: [
                'setPatientData'
            ],
            fn: function( formData, config ) {
                var isKBVForm4 = config.context.template.defaultFor && -1 !== form4FormRoles.indexOf( config.context.template.defaultFor );

                var pat;

                if( config.context.patient ) {
                    pat = config.context.patient;
                    if( config.context.activity && config.context.activity.actType ) {
                        formData.actType = _k.unwrap( config.context.activity.actType );
                    } else {
                        if( config.context.activity ) {
                            formData.actType = config.context.activity.actType + '';
                        } else {
                            formData.actType = '';
                        }
                    }
                    mapPatientBasicData( formData, pat, isKBVForm4, config );
                }

            }
        } );

        addFormMapper( {
            name: 'setPhysicianData',
            group: [
                'setPhysicianData',
                'physicianNameTemplateWithFallback'
            ],
            deps: [
                'setAdditionalFormData'
            ],
            fn: function( formData, config ) {

                var
                    currentPatient = config.context.patient || null,
                    patientPhysician = config.context.patientPhysician || (currentPatient && currentPatient.physiciansObj) || null,
                    patientFamilyDoctor = config.context.patientFamilyDoctor || (currentPatient && currentPatient.familyDoctorObj) || null,
                    patientInstitution = config.context.patientInstitution || (currentPatient && currentPatient.institutionObj) || null,
                    referringDoctor = config.context.referringDoctor || null,
                    contact;

                //  If not mapping an activity we may not have a patient, MOJ-10743
                if( !currentPatient ) {
                    return;
                }

                //  TODO: check if this is used anywhere, remove if not
                if( config.context.basecontact ) {
                    contact = config.context.basecontact;
                    mapPhysicianData( formData, contact );
                }

                if( !currentPatient ) {
                    //  should not happen, occasional problem with imported data or dispatcher
                    return;
                }

                if( patientPhysician ) {
                    mapPhysicianData( formData, patientPhysician );
                }

                if( referringDoctor || patientPhysician ) {
                    mapReferralDoctorData( formData, referringDoctor || patientPhysician );
                }

                if( patientFamilyDoctor ) {
                    mapFamilyDoctorData( formData, patientFamilyDoctor );
                }

                if( patientInstitution ) {
                    mapInstitutionData( formData, patientInstitution );
                }

                //  dropdowns and lists of all contact addresses, MOJ-9483
                mapAdditionalAddresses( formData, config.context );
            }
        } );

        /*
         *  Add marker text EXTMOJ-1281
         *
         *  Full marker records already be populated to the patient object on the client, are loaded
         *  into context on the server
         */

        addFormMapper( {
            name: 'setMarkerData',
            group: [
                'markerText',
                'markerArray'
            ],
            fn: function( formData, config ) {
                var
                    markers = config.context.patientMarkers || [],
                    i;
                formData.markerArray = [];
                formData.markerText = '';

                for( i = 0; i < markers.length; i++ ) {
                    formData.markerArray.push( _k.unwrap( markers[i].description ) );
                }

                if( formData.markerArray.length > 0 ) {
                    formData.markerText = formData.markerArray.join( ', ' );
                }
            }
        } );

        addFormMapper( {
            name: 'setCaseFolderData',
            group: [
                'setCaseFolderData'
            ],
            fn: function( formData, config ) {

                var caseFolder;

                if( config.context.caseFolder ) {
                    caseFolder = config.context.caseFolder;
                    mapCaseFolderData( formData, caseFolder );
                }

            }
        } );

        addFormMapper( {
            name: 'setDocumentData',
            group: [
                'setDocumentData'
            ],
            fn: function( formData, config ) {

                var document,
                    mappedDocument;

                if( config.context.document ) {
                    document = config.context.document;
                    mappedDocument = mapDocumentData( document );

                    Object.keys( mappedDocument ).forEach( function( prop ) {
                        formData[prop] = mappedDocument[prop];
                    } );
                }

            }
        } );

        addFormMapper( {
            name: 'castReportingDates',
            group: [
                'castReportingDates'
            ],
            fn: function( formData ) {
                castReportingDates( formData );
            }
        } );

        addFormMapper( {
            name: 'removePatientAddresses',
            group: [
                'removePatientAddresses'
            ],
            fn: function( formData ) {
                delete formData.billingAddress;
                delete formData.officialAddressBC;
                delete formData.poboxAddressBC;
            }
        } );

        addFormMapper( {
            name: 'addBFB10C_guid',
            group: [
                'BFB10C_guid'
            ],
            fn: function( formData, config ) {
                if( formData.BFB10C_guid ) {
                    return;
                }
                if ( config.context.BFB10C_guid ) {
                    formData.BFB10C_guid = config.context.BFB10C_guid;
                    return;
                }
                formData.BFB10C_guid = Math.floor( Math.random() * 16777215 ).toString( 16 ).toUpperCase() + '-' +
                                       Y.dcforms.mapper.objUtils.createUuid().toUpperCase();
                config.context.BFB10C_guid = formData.BFB10C_guid;
            }
        } );

        addFormMapper( {
            name: 'setAdditionalFormData', group: [
                "employeeTitle",
                "employeeTalk",
                "employeeFirstname",
                "employeeNameaffix",
                "employeeLastname",
                "employeeOfficialNo",
                "employeeType",
                "employeeDepartment",
                "employeeNo",
                "employeeWorkDescription",
                "employeeSpecialities",
                "employeePhysicianIknr",
                "employeePhysicianType",
                "employeeZsrNumber",
                "employeeGlnNumber",
                "employeeKNumber",
                "employeeId",
                "specialisationText",
                "doctorNumber",
                "commercialNo",
                "locRegion",
                "institutionCode",
                "locName",
                "locPhone",
                "locFax",
                "locStreet",
                "locHouseno",
                "locZip",
                "locCity",
                "locCountry",
                "locCountryCode",
                "locWWW",
                "locEmail",
                "locId",
                "fk4124",
                "scheinLocationFeatures",
                "scheinTreatmentType",
                "scheinIncludesBSK",
                "scheinIsChiefPhysician",
                "certNumber",
                // BG Forms
                "scheinDayOfAccident",
                "scheinTimeOfAccident",
                "scheinDayOfArrivalt",
                "scheinTimeOfArrival",
                "scheinDayOfFristTreat",
                "scheinFristTreatPhysician",
                "scheinWorkingHoursStart",
                "scheinWorkingHoursEnd",
                "scheinBgAhb",
                "scheinBgBhb",
                "scheinAccidentCompany",
                "scheinAccidentCompanyCity",
                "scheinAccidentCompanyPLZ",
                "scheinAccidentCompanyStreetHouseno",
                // ASV
                "asvTeamnumber",
                "arztstempel",
                // Swiss mode
                "employeeGLN",
                "qualiDignitiesText",
                "quantiDignitiesText",
                "locaCantonCode"
            ],
            fn: function( formData, config, callback ) {

                //  TODO: preload this information in context, remove this callback

                function onAdditionalDataLoaded( response ) {
                    var schein,
                        loc,
                        emp,
                        employeeName,
                        _data = response && response.data;

                    config.context.additional = _data;

                    //  NOTE: on server properties are inherited from schema, so hasOwnProperty will return false
                    //  even if the property exists.  Underyling cause of MOJ-4509
                    if( _data.location ) {
                        loc = _data.location;
                        formData.commercialNo = loc.commercialNo ? loc.commercialNo + '' : '';
                        formData.locRegion = loc.region ? loc.region + '' : '';
                        formData.institutionCode = loc.institutionCode ? loc.institutionCode + '' : '';
                        formData.locName = loc.locname ? loc.locname + '' : '';
                        formData.locPhone = loc.phone ? loc.phone + '' : ' ';
                        formData.locFax = loc.fax ? loc.fax + '' : '';
                        formData.locStreet = loc.street ? loc.street + '' : '';
                        formData.locHouseno = loc.houseno ? loc.houseno + '' : '';
                        formData.locZip = loc.zip ? loc.zip : '';
                        formData.locCity = loc.city ? loc.city + '' : '';
                        formData.locCountry = loc.country ? loc.country + '' : '';
                        formData.locCountryCode = loc.countryCode ? loc.countryCode + '' : '';
                        formData.locEmail = loc.email ? loc.email + '' : '';
                        formData.locWWW = loc.website ? loc.website + '' : '';
                        formData.locBankName = loc.bankName ? loc.bankName + '' : '';
                        formData.locBankIBAN = loc.bankIBAN ? loc.bankIBAN + '' : '';
                        formData.locBankBIC = loc.bankBIC ? loc.bankBIC + '' : '';
                        formData.zsrNumber = loc.zsrNumber ? loc.zsrNumber + '' : '';

                        if( Y.doccirrus.auth.isISD() && loc && loc.isMainLocation ) {
                            formData.locId = Y.doccirrus.schemas.location.getMainLocationId();
                        } else {
                            formData.locId = loc._id ? loc._id + '' : '';
                        }

                        //  Only available in Swiss country mode
                        formData.locGLN = loc.glnNumber ? loc.glnNumber : '';
                        formData.locCantonCode = loc.cantonCode ? loc.cantonCode : '';
                    }
                    if( _data.employee ) {
                        emp = _data.employee;
                        //  TODO: get translation language from form
                        formData.employeeTalk = emp.talk ? Y.doccirrus.schemaloader.translateEnumValue( '-de', emp.talk, Y.doccirrus.schemas.person.types.Talk_E.list, '' ) : '';
                        formData.employeeTitle = emp.title ? emp.title : '';
                        formData.employeeFirstname = emp.firstname ? emp.firstname + '' : '';
                        formData.employeeNameaffix = emp.nameaffix ? emp.nameaffix + '' : '';
                        formData.employeeLastname = emp.lastname ? emp.lastname + '' : '';
                        formData.employeeId = emp._id ? emp._id + '' : '';

                        formData.employeeOfficialNo = emp.officialNo ? emp.officialNo + '' : '';
                        formData.employeeType = emp.type ? emp.type + '' : '';
                        formData.employeeTypeTranslated = emp.type ? Y.doccirrus.schemaloader.getEnumListTranslation( 'employee', 'Employee_E', emp.type, 'i18n' ) : '';
                        formData.employeeDepartment = emp.department ? emp.department + '' : '';
                        formData.employeeNo = emp.employeeNo ? emp.employeeNo + '' : '';
                        formData.employeeSpecialities = (emp.specialities && emp.specialities.length > 0) ? emp.specialities.join( ', ' ) : '';
                        formData.specialisationText = emp.specialisationText ? emp.specialisationText + '' : '';
                        formData.employeeWorkDescription = emp.workDescription ? emp.workDescription + '' : '';
                        formData.doctorNumber = formData.employeeOfficialNo;
                        formData.employeePhysicianIknr = emp.physicianIknr ? emp.physicianIknr + '' : '';
                        formData.employeeGlnNumber = emp.glnNumber ? emp.glnNumber + '' : '';
                        formData.employeeZsrNumber = emp.zsrNumber ? emp.zsrNumber + '' : '';
                        formData.employeeKNumber = emp.kNumber ? emp.kNumber + '' : '';

                        //  TODO: get translation language from form
                        formData.employeePhysicianType = emp.physicianType ? Y.doccirrus.schemaloader.translateEnumValue( '-de', emp.physicianType, Y.doccirrus.schemas.employee.types.PhysicianType_E.list, '' ) : '';

                        //  Only in Swiss country mode:
                        formData.employeeGLN = emp.glnNumber ? emp.glnNumber : '';
                        formData.qualiDignitiesText = emp.qualiDignities ? emp.qualiDignities.join( ', ' ) : '';
                        formData.quantiDignitiesText = emp.quantiDignities ? emp.quantiDignities.join( ', ' ) : '';

                        //  Custom employee signature / stamp block
                        if( emp.arztstempel && '' !== emp.arztstempel ) {
                            formData.arztstempel = emp.arztstempel;

                        } else {

                            //  use legacy arztstempel (non-BFB forms)
                            employeeName = '' +
                                           (formData.employeeTitle || '') + ' ' +
                                           (formData.employeeFirstname || '') + ' ' +
                                           (formData.employeeLastname || '');

                            formData.arztstempel = '' +
                                                   employeeName + '\n' +
                                                   (formData.specialisationText || '') + '\n' +
                                                   formData.locStreet + ' ' + formData.locHouseno + '\n' +
                                                   formData.locZip + ' ' + formData.locCity + '\n' +
                                                   'T: ' + formData.locPhone + ' / F: ' + formData.locFax + '\n' +
                                                   'LANR: ' + (formData.employeeOfficialNo || '') + '\n' +
                                                   'BSNR: ' + formData.commercialNo + '\n';
                        }

                    }
                    if( _data.schein ) {
                        schein = _data.schein;
                        formData.fk4124 = schein.fk4124;
                        formData.scheinLocationFeatures = schein.locationFeatures;
                        formData.scheinTreatmentType = schein.treatmentType;
                        formData.scheinIncludesBSK = schein.includesBSK;
                        formData.scheinIsChiefPhysician = schein.isChiefPhysician;

                        // BG Forms
                        formData.scheinDayOfAccident = schein.dayOfAccident ? moment( schein.dayOfAccident ).format( 'DD.MM.YYYY' ) : '';
                        formData.scheinTimeOfAccident = schein.timeOfAccident ? moment( schein.timeOfAccident ).format( 'HH:mm' ) : '';
                        formData.scheinDayOfArrivalt = schein.dayOfArrival ? moment( schein.dayOfArrival ).format( 'DD.MM.YYYY' ) : '';
                        formData.scheinTimeOfArrival = schein.timeOfArrival ? moment( schein.timeOfArrival ).format( 'HH:mm' ) : '';
                        formData.scheinDayOfFristTreat = schein.dayOfFristTreat ? moment( schein.dayOfFristTreat ).format( 'DD.MM.YYYY' ) : '';
                        formData.scheinFristTreatPhysician = schein.fristTreatPhysician ? schein.fristTreatPhysician : '';
                        formData.scheinWorkingHoursStart = schein.workingHoursStart ? moment( schein.workingHoursStart ).format( 'HH:mm' ) : '';
                        formData.scheinWorkingHoursEnd = schein.workingHoursEnd ? moment( schein.workingHoursEnd ).format( 'HH:mm' ) : '';
                        formData.scheinBgAhb = ('bg_ahb' === schein.uvGoaeType);
                        formData.scheinBgBhb = ('bg_bhb' === schein.uvGoaeType);

                        formData.scheinAccidentCompany = schein.accidentCompany || '';
                        formData.scheinAccidentCompanyCity = schein.accidentCompanyCity || '';
                        formData.scheinAccidentCompanyPLZ = schein.accidentCompanyPLZ || '';
                        formData.scheinAccidentCompanyStreetHouseno = (schein.accidentCompanyStreet || '') + (schein.accidentCompanyStreet && schein.accidentCompanyHouseno ? ' ' : '') + (schein.accidentCompanyHouseno || '');
                    }

                    // ASV stuff
                    formData.isASV = false;
                    if( _data.caseFolder && 'ASV' === _data.caseFolder.additionalType ) {
                        formData.isASV = true;
                        formData.asvTeamnumber = _data.caseFolder.identity;
                    }

                    if( _data.kbvCertNumbers ) {
                        formData.certNumber = _data.kbvCertNumbers.bfbCertNumber;
                    }

                    callback( null, formData );
                }

                function onServerAPICall( err, response ) {
                    if( err ) {
                        Y.log( 'Cannot load additional patient data: ' + JSON.stringify( err ), 'warn', NAME );
                        callback( err );
                        return;
                    }

                    if( Y.dcforms.isOnServer ) {
                        if( !response ) {
                            response = {};
                        }
                        if( !response.data ) {
                            Y.log( 'Running on server, reformatting response...', 'debug', NAME );
                            onAdditionalDataLoaded( {'data': response} );
                            return;
                        }
                    }

                    if( !response.data ) {
                        //  prevents crash for now, otherwise undesirable
                        Y.log( 'Patient API could not load additional form data, empty object returned', 'warn', NAME );
                        response.data = {};
                    }

                    onAdditionalDataLoaded( response );
                }

                if( !config.context.activity ) {
                    //  not mapping an activity, this does not apply
                    return callback( null, formData );
                }

                if( !config.context.patient ) {
                    Y.log( 'Patient context missing. Halting form mapping', 'warn', NAME );
                    return callback( Y.doccirrus.errors.rest( '1001' ) );
                }

                var patient = config.context.patient,
                    patientId = _k.unwrap( patient._id || '' ),
                    activity = config.context.activity,
                    timestamp = _k.unwrap( activity.timestamp ),
                    employeeId = _k.unwrap( activity.employeeId ),
                    locationId = _k.unwrap( activity.locationId ),
                    caseFolderId = _k.unwrap( activity.caseFolderId ),

                    queryArgs = {
                        patientId: patientId,
                        timestamp: timestamp,
                        employeeId: employeeId,
                        locationId: locationId,
                        caseFolderId: caseFolderId
                    };

                if( Y.doccirrus.commonutils.isClientSide() ) {

                    //  do not call out to server if we have loaded this data already and neither location nor
                    //  employee have changed
                    if(
                        config.context.additional &&
                        config.context.additional.location &&
                        config.context.additional.employee &&
                        config.context.additional.employee._id === _k.unwrap( activity.employeeId ) &&
                        config.context.additional.location._id === _k.unwrap( activity.locationId )
                    ) {
                        Y.log( 'Skipping load of additional data, already loaded casefolder and employee', 'debug', NAME );
                        return onAdditionalDataLoaded( {'data': config.context.additional} );
                    }

                    Y.doccirrus.jsonrpc.api.patient
                        .additionalFormData( {query: queryArgs} )
                        .done( onAdditionalDataLoaded )
                        .fail( callback );
                } else {
                    Y.doccirrus.api.patient.additionalFormData( {
                        user: config.context.user,
                        query: queryArgs,
                        rCache: config.context.rCache || false,
                        callback: onServerAPICall
                    } );
                }

            }
        } );

        /**
         *  Add content / userContent fields MOJ-7904

         */

        addFormMapper( {
            name: 'addActivityContent',
            group: [
                'content',
                'userContent'
            ],
            fn: function( formData, config ) {
                var
                    activity = config.context.activity,
                    isKbvUtility = ('KBVUTILITY' === _k.unwrap( activity.actType ));

                if( isKbvUtility ) {
                    formData.userContent = _k.unwrap( activity.userContent ) || '';
                    formData.content = formData.userContent;
                } else {
                    // the following are polymorphic fields, could be moved elsewhere.
                    formData.userContent = _k.unwrap( activity.userContent ) || '';
                    formData.content = _k.unwrap( activity.content ) || '';
                }
            }
        } );

        /**
         *  Fields for BFB61 logic required by KBV in Fehlerbrief MOJ-7769
         *  Note that only FORM type activites support this as of this issue
         */

        addFormMapper( {
            name: 'addBFB61Fields',
            group: [
                "BFB61_Mobility_String",
                "BFB61_Mobility_Check_Limitation",
                "BFB61_Mobility_Check_Help_Needed",
                "BFB61_Mobility_Check_Infeasible"
            ],
            fn: function( formData, config ) {
                var
                    activity = config.context.activity,
                    mobilityOtherCheck = activity.mobilityOtherCheck ? _k.unwrap( activity.mobilityOtherCheck ) : '',
                    mobilityOtherString = activity.mobilityOtherString ? _k.unwrap( activity.mobilityOtherString ) : '';

                formData.BFB61_Mobility_String = mobilityOtherString;
                formData.BFB61_Mobility_Check_Limitation = ('BFB61_Mobility_Check_Limitation' === mobilityOtherCheck);
                formData.BFB61_Mobility_Check_Help_Needed = ('BFB61_Mobility_Check_Help_Needed' === mobilityOtherCheck);
                formData.BFB61_Mobility_Check_Infeasible = ('BFB61_Mobility_Check_Infeasible' === mobilityOtherCheck);
            }
        } );

        addFormMapper( {
            name: 'setupPersonalienfeld',
            group: [
                "patient",
                "patient2"
            ],
            deps: [
                'setupFormdataPatient',
                'setAdditionalFormData',
                'setLocationData'
            ],
            fn: function( formData, config ) {
                // additional KVK logic, see MOJ-2180

                var
                    insuranceId = (7 === (formData.insuranceId && formData.insuranceId.length) ? '10' + formData.insuranceId : formData.insuranceId),
                    currentPatient = config.context.patient,
                    officialAddress = getAddressByKind( currentPatient, KIND_OFFICIAL ),     //  if available
                    postalAddress = getAddressByKind( currentPatient, KIND_POSTAL ),         //  postal preferred
                    poboxAddress = getAddressByKind( currentPatient, KIND_POSTBOX ),      // po box;;
                    activity = config.context.activity,
                    commercialNoOrAsvTeamnumber,
                    actType = _k.unwrap( activity.actType ),
                    isAsvContext = Boolean( formData.isASV ),
                    isSubstitutePrescription = Boolean( _k.unwrap( activity.substitutePrescription ) ),
                    asvTeamReferral = _k.unwrap( activity.asvTeamReferral ),
                    tempStr = '',
                    patient2CountryCode,
                    i,
                    line6Status;

                function getStrOrPob( address, pbox ) {
                    var strOrPob = '',
                        t,
                        street,
                        houseno,
                        postbox;

                    //  We now have all the objects loaded to make the lines of Personalienfeld subforms
                    if( address ) {
                        street = _k.unwrap( address.street ) || '';
                        houseno = _k.unwrap( address.houseno ) || '';
                        t = 30 - houseno.length - 1;
                        if( street && houseno && street.length > t ) {
                            street = street.substr( 0, t );
                        }
                        strOrPob = concat( street, houseno );
                    }

                    if( pbox && '' === strOrPob ) {
                        postbox = _k.unwrap( pbox.postbox ) || '';
                        strOrPob = 'Postfach ' + postbox;
                    }

                    return strOrPob;
                }

                //  Prevent crash on server in case of missing fields
                formData.houseno = formData.houseno || '';
                formData.street = formData.street || '';
                formData.zip = formData.zip || '';
                formData.countryCode = formData.countryCode || '';

                formData.patient = {};
                formData.patient2 = {};

                if( isAsvContext && !(('REFERRAL' === actType || 'LABREQUEST' === actType) && !asvTeamReferral) && 'AU' !== actType ) {
                    commercialNoOrAsvTeamnumber = formData.asvTeamnumber;
                } else {
                    commercialNoOrAsvTeamnumber = formData.commercialNo;
                }

                if( formData.zip && '' !== formData.zip ) {
                    tempStr = ' ';
                }

                line6Status = [
                    strLimit( formData.insuranceKind, 1 ),                                  // 1
                    Y.doccirrus.kbvcommonutils.mapPersGroupToKVDT( formData.persGroup ),    // 2-3
                    Y.doccirrus.kbvcommonutils.mapDmpToKVDT( formData.dmp ),                // 4-5
                    (isSubstitutePrescription ? '1' : '0'),                                 // 6
                    (isAsvContext ? '1' : '0')                                              // 7
                ].join( '' );

                formData.patient.line1 = strLimit( formData.insurancePrintName || formData.insuranceName, 24 ) + '&nbsp;&nbsp;&nbsp;&nbsp;' + strLimitRight( formData.locationFeatures || formData.scheinLocationFeatures, 2 );
                formData.patient.line2 = strLimit( formData.lastname, 30 );
                formData.patient.line3 = strLimit( concat( formData.title, formData.firstname, formData.nameaffix, formData.nameinfix ), 21 ) + '&nbsp;' + formData.dobSmaller;
                formData.patient.line4 = strLimit( getStrOrPob( officialAddress, poboxAddress ), 30 );
                formData.patient.line5 = strLimit( formData.countryCode + (formData.countryCode ? ' ' : '') + formData.zip + tempStr + formData.city, 24 ) + '&nbsp;' + formData.insuranceValidToSlash;
                formData.patient.line6 = strLimit( insuranceId, 9 ) + '&nbsp;' + strLimit( formData.insuranceNo || formData.fk4124, 12 ) + '&nbsp;' + line6Status;
                formData.patient.line7 = strLimit( commercialNoOrAsvTeamnumber, 9 ) + '&nbsp;' + strLimit( formData.doctorNumber, 9 ) + '&nbsp;&nbsp;' + formData.timestamp;

                //  fall back to official address is none other
                if( !postalAddress ) {
                    postalAddress = officialAddress;
                }
                if( !postalAddress ) {
                    postalAddress = poboxAddress;
                }

                //  Secondary personalientfeld binding for forms requiring a postal address
                formData.patient2.line1 = formData.patient.line1;
                formData.patient2.line2 = formData.patient.line2;
                formData.patient2.line3 = formData.patient.line3;

                if( postalAddress ) {
                    patient2CountryCode = _k.unwrap( postalAddress.countryCode );

                    formData.patient2.line4 = strLimit( getStrOrPob( postalAddress, poboxAddress ), 30 );
                    formData.patient2.line5 = strLimit( patient2CountryCode +
                                              (patient2CountryCode ? ' ' : '') + _k.unwrap( postalAddress.zip ) +
                                              (_k.unwrap( postalAddress.zip ) ? ' ' : '') + _k.unwrap( postalAddress.city ), 24 ) +
                                              '&nbsp;' + formData.insuranceValidToSlash;

                } else {
                    formData.patient2.line4 = formData.patient.line4;
                    formData.patient2.line5 = formData.patient.line5;
                }

                formData.patient2.line6 = formData.patient.line6;
                formData.patient2.line7 = formData.patient.line7;

                //  replace non-breaking spaces, MOJ-10439
                for( i = 1; i < 8; i++ ) {
                    formData.patient['line' + i] = formData.patient['line' + i].replace( new RegExp( '&nbsp;', 'g' ), ' ' );
                    formData.patient2['line' + i] = formData.patient2['line' + i].replace( new RegExp( '&nbsp;', 'g' ), ' ' );
                }
            }
        } );

        addFormMapper( {
            name: 'setQuarter',
            group: ['quarter', 'year', 'yearShort'],
            fn: function( formData, config ) {
                var timestamp = moment( _k.unwrap( config.context.activity.timestamp ) );
                formData.quarter = '' + timestamp.quarter();
                formData.year = '' + timestamp.year();
                formData.yearShort = timestamp.format( 'YY' );
            }
        } );

        addFormMapper( {
            name: 'getReferralFields',
            group: ['BFB6diagnosesText', 'BFB6findingsText', 'BFB6medicationsText'],
            linkedGroup: ['BFB6diagnosesText', 'BFB6findingsText', 'BFB6medicationsText'],
            fn: function( formData, config ) {
                formData.BFB6diagnosesText = '';
                formData.BFB6findingsText = '';
                formData.BFB6medicationsText = '';

                var currentActivity = config.context.activity;

                if( 'REFERRAL' === _k.unwrap( currentActivity.actType ) ) {
                    formData.BFB6diagnosesText = stripNewlines( _k.unwrap( currentActivity.diagnosesText || '' ) );
                    formData.BFB6findingsText = stripNewlines( _k.unwrap( currentActivity.findingsText || '' ) );
                    formData.BFB6medicationsText = stripNewlines( _k.unwrap( currentActivity.medicationsText || '' ) );
                }
            }
        } );

        addFormMapper( {
            name: 'getLabRequest',
            group: [
                'kontrollunters',
                'abnDatumZeit',
                'befEilt',
                'befEiltTel',
                'befEiltFax',
                'edtaGrBlutbild',
                'edtaKlBlutbild',
                'edtaHbA1c',
                'edtaReti',
                'edtaBlutsenkung',
                'edtaDiffBlutbild',
                'citratQu',
                'citratQuMarcumar',
                'citratThrombin',
                'citratPTT',
                'citratFibri',
                'svbAlkPhos',
                'svbAmylase',
                'svbASL',
                'svbBiliD',
                'svbBiliG',
                'svbCalc',
                'svbCholesterin',
                'svbCholin',
                'svbCK',
                'svbCKMB',
                'svbCRP',
                'svbEisen',
                'svbEiwE',
                'svbEiwG',
                'svbGammaGT',
                'svbGlukose',
                'svbGOT',
                'svbGPT',
                'svbHarnsäure',
                'svbHarnstoff',
                'svbHBDH',
                'svbHDL',
                'svbLgA',
                'svbLgG',
                'svbLgM',
                'svbKali',
                'svbKrea',
                'svbKreaC',
                'svbLDH',
                'svbLDL',
                'svbLipase',
                'svbNatrium',
                'svbOPVorb',
                'svbPhos',
                'svbTransf',
                'svbTrigl',
                'svbTSHBasal',
                'svbTSHTRH',
                'glu1',
                'glu2',
                'glu3',
                'glu4',
                'urinStatus',
                'urinMikroalb',
                'urinSchwTest',
                'urinGlukose',
                'urinAmylase',
                'urinSediment',
                'sonstiges',
                'sonstigesText',
                'harnStreifenTest',
                'nuechternPlasmaGlukose',
                'lipidprofil',
                'labRequestType',
                'ggfKennziffer',
                'behandlungGemaess',
                'auftrag',
                'fk4202',
                'fk4204',
                'labRequestRemittor',
                'labRequestEstablishment',
                'kurativ',
                'praeventiv',
                'ess',
                'bb',
                'abnahmeDatum',
                'abnahmeZeit',
                'scheinSlipMedicalTreatment',
                'auBis',
                'datumOP',
                'auBisBC',
                'datumOPBC',
                'untersArt',
                'auftragsleistungen',
                'konsiliaruntersuchung',
                'mitWeiterBehandlung',
                'ueberwAn',
                'labRequestId'
            ],
            fn: function( formData, config ) {

                var
                    activity = config.context.activity,
                    abnDatumZeit = _k.unwrap( activity.timestamp ),
                    time = _k.unwrap( activity.time ),
                    auBis = _k.unwrap( activity.auBis ) || '',
                    datumOP = _k.unwrap( activity.datumOP ) || '';

                formData.kontrollunters = _k.unwrap( activity.kontrollunters ) || ''; // TODO: Boolean ... for all of these values....
                formData.abnDatumZeit = (time && abnDatumZeit) || '';
                formData.befEilt = _k.unwrap( activity.befEilt ) || false;
                formData.befEiltTel = _k.unwrap( activity.befEiltTel ) || '';
                formData.befEiltFax = _k.unwrap( activity.befEiltFax ) || '';
                formData.knappschaftskennzeichen = _k.unwrap( activity.knappschaftskennzeichen ) || '';
                formData.befEiltTelBool = _k.unwrap( activity.befEiltTelBool ) || false;
                formData.befEiltFaxBool = _k.unwrap( activity.befEiltFaxBool ) || false;
                formData.befEiltNr = _k.unwrap( activity.befEiltNr ) || '';
                formData.ssw = _k.unwrap( activity.ssw ) || '';
                formData.zuAngaben = _k.unwrap( activity.zuAngaben ) || '';
                formData.edtaGrBlutbild = _k.unwrap( activity.edtaGrBlutbild ) || '';
                formData.edtaKlBlutbild = _k.unwrap( activity.edtaKlBlutbild ) || '';
                formData.edtaHbA1c = _k.unwrap( activity.edtaHbA1c ) || '';
                formData.edtaReti = _k.unwrap( activity.edtaReti ) || '';
                formData.edtaBlutsenkung = _k.unwrap( activity.edtaBlutsenkung ) || '';
                formData.citratQu = _k.unwrap( activity.citratQu ) || '';
                formData.citratQuMarcumar = _k.unwrap( activity.citratQuMarcumar ) || '';
                formData.citratThrombin = _k.unwrap( activity.citratThrombin ) || '';
                formData.citratPTT = _k.unwrap( activity.citratPTT ) || '';
                formData.citratFibri = _k.unwrap( activity.citratFibri ) || '';
                formData.svbAlkPhos = _k.unwrap( activity.svbAlkPhos ) || '';
                formData.svbAmylase = _k.unwrap( activity.svbAmylase ) || '';
                formData.svbASL = _k.unwrap( activity.svbASL ) || '';
                formData.svbBiliD = _k.unwrap( activity.svbBiliD ) || '';
                formData.svbBiliG = _k.unwrap( activity.svbBiliG ) || '';
                formData.svbCalc = _k.unwrap( activity.svbCalc ) || '';
                formData.svbCholesterin = _k.unwrap( activity.svbCholesterin ) || '';
                formData.svbCholin = _k.unwrap( activity.svbCholin ) || '';
                formData.svbCK = _k.unwrap( activity.svbCK ) || '';
                formData.svbCKMB = _k.unwrap( activity.svbCKMB ) || '';
                formData.svbCRP = _k.unwrap( activity.svbCRP ) || '';
                formData.svbEisen = _k.unwrap( activity.svbEisen ) || '';
                formData.svbEiwE = _k.unwrap( activity.svbEiwE ) || '';
                formData.svbEiwG = _k.unwrap( activity.svbEiwG ) || '';
                formData.svbGammaGT = _k.unwrap( activity.svbGammaGT ) || '';
                formData.svbGlukose = _k.unwrap( activity.svbGlukose ) || '';
                formData.svbGOT = _k.unwrap( activity.svbGOT ) || '';
                formData.svbGPT = _k.unwrap( activity.svbGPT ) || '';
                formData.svbHarnsäure = _k.unwrap( activity.svbHarnsäure ) || '';
                formData.svbHarnstoff = _k.unwrap( activity.svbHarnstoff ) || '';
                formData.svbHBDH = _k.unwrap( activity.svbHBDH ) || '';
                formData.svbHDL = _k.unwrap( activity.svbHDL ) || '';
                formData.svbLgA = _k.unwrap( activity.svbLgA ) || '';
                formData.svbLgG = _k.unwrap( activity.svbLgG ) || '';
                formData.svbLgM = _k.unwrap( activity.svbLgM ) || '';
                formData.svbKali = _k.unwrap( activity.svbKali ) || '';
                formData.svbKrea = _k.unwrap( activity.svbKrea ) || '';
                formData.svbKreaC = _k.unwrap( activity.svbKreaC ) || '';
                formData.svbLDH = _k.unwrap( activity.svbLDH ) || '';
                formData.svbLDL = _k.unwrap( activity.svbLDL ) || '';
                formData.svbLipase = _k.unwrap( activity.svbLipase ) || '';
                formData.svbNatrium = _k.unwrap( activity.svbNatrium ) || '';
                formData.svbOPVorb = _k.unwrap( activity.svbOPVorb ) || '';
                formData.svbPhos = _k.unwrap( activity.svbPhos ) || '';
                formData.svbTransf = _k.unwrap( activity.svbTransf ) || '';
                formData.svbTrigl = _k.unwrap( activity.svbTrigl ) || '';
                formData.svbTSHBasal = _k.unwrap( activity.svbTSHBasal ) || '';
                formData.svbTSHTRH = _k.unwrap( activity.svbTSHTRH ) || '';
                formData.glu1 = _k.unwrap( activity.glu1 ) || '';
                formData.glu2 = _k.unwrap( activity.glu2 ) || '';
                formData.glu3 = _k.unwrap( activity.glu3 ) || '';
                formData.glu4 = _k.unwrap( activity.glu4 ) || '';
                formData.urinStatus = _k.unwrap( activity.urinStatus ) || '';
                formData.urinMikroalb = _k.unwrap( activity.urinMikroalb ) || '';
                formData.urinSchwTest = _k.unwrap( activity.urinSchwTest ) || '';
                formData.urinGlukose = _k.unwrap( activity.urinGlukose ) || '';
                formData.urinAmylase = _k.unwrap( activity.urinAmylase ) || '';
                formData.urinSediment = _k.unwrap( activity.urinSediment ) || '';
                formData.sonstiges = _k.unwrap( activity.sonstiges ) || '';
                formData.sonstigesText = _k.unwrap( activity.sonstigesText ) || '';
                formData.harnStreifenTest = _k.unwrap( activity.harnStreifenTest ) || '';
                formData.nuechternPlasmaGlukose = _k.unwrap( activity.nuechternPlasmaGlukose ) || '';
                formData.lipidprofil = _k.unwrap( activity.lipidprofil ) || '';
                formData.labRequestType = _k.unwrap( activity.labRequestType ) || '';
                formData.ggfKennziffer = _k.unwrap( activity.ggfKennziffer ) || '';
                formData.behandlungGemaess = _k.unwrap( activity.behandlungGemaess ) || '';
                formData.auftrag = Y.dcforms.mapper.objUtils.addArrangementCodeToFormFieldValue( _k.unwrap( activity.timestamp ), _k.unwrap( activity.auftrag ) || '', _k.unwrap( activity.eTSArrangementCode ), _k.unwrap( activity.eTSAErrorMessage ) );

                setFk4202( formData, config );
                setFk3000( formData, config );

                formData.fk4204 = _k.unwrap( activity.fk4204 ) || '';

                formData.labRequestRemittor = _k.unwrap( activity.scheinRemittor || '' );
                formData.labRequestEstablishment = _k.unwrap( activity.scheinEstablishment || '' );

                formData.kurativ = '1' === _k.unwrap( activity.scheinSlipMedicalTreatment || '' );
                formData.praeventiv = '2' === _k.unwrap( activity.scheinSlipMedicalTreatment || '' );
                formData.ess = '3' === _k.unwrap( activity.scheinSlipMedicalTreatment || '' );
                formData.bb = '4' === _k.unwrap( activity.scheinSlipMedicalTreatment || '' );

                formData.abnahmeDatum = (time && abnDatumZeit) ? moment( abnDatumZeit ).format( 'DDMMYY' ) : '';
                formData.abnahmeDatumBFB = (time && abnDatumZeit) ? moment( abnDatumZeit ).format( 'YYYYMMDD' ) : '';
                formData.abnahmeZeit = time ? time.split( ":" ).join( "" ) : '';

                // for barcodes
                formData.scheinSlipMedicalTreatment = _k.unwrap( activity.scheinSlipMedicalTreatment || '' );

                // ÜBERW extras
                formData.auBis = '' !== auBis ? moment( auBis ).format( 'DDMMYY' ) : '';
                formData.datumOP = '' !== datumOP ? moment( datumOP ).format( 'DDMMYY' ) : '';
                // bar codes need js dates
                formData.auBisBC = auBis;
                formData.datumOPBC = datumOP;
                formData.untersArt = _k.unwrap( activity.untersArt ) || '';
                formData.auftragsleistungen = '1' === _k.unwrap( activity.untersArt );
                formData.konsiliaruntersuchung = '2' === _k.unwrap( activity.untersArt );
                formData.mitWeiterBehandlung = '3' === _k.unwrap( activity.untersArt );
                formData.ueberwAn = _k.unwrap( activity.ueberwAn ) || '';
                formData.labRequestId = _k.unwrap( activity.labRequestId ) || '';
            }
        } );

        addFormMapper( {
            name: 'getAU',
            group: [
                'erstBesch',
                'folgeBesc',
                'arbeitsunfall',
                'durchgangsarzt',
                'auVonBC',
                'auVorraussichtlichBisBC',
                'festgestelltAmBC',
                'auVon',
                'auVorraussichtlichBis',
                'festgestelltAm',
                'sonstigerUnf',
                'bvg',
                'rehab',
                'reintegration',
                'massnahmen',
                'massnahmenChk',
                'diagnosesAdd',
                'krankengeld',
                'endBesch'
            ],
            fn: function( formData, config ) {
                var activity = config.context.activity,
                    auVon = _k.unwrap( activity.auVon ) || '',
                    auVorraussichtlichBis = _k.unwrap( activity.auVorraussichtlichBis ) || '',
                    festgestelltAm = _k.unwrap( activity.festgestelltAm ) || '';

                formData.erstBesch = _k.unwrap( activity.erstBesch ) || false;
                formData.endBesch = _k.unwrap( activity.endBesch ) || false;
                formData.folgeBesc = _k.unwrap( activity.folgeBesc ) || false;

                setFk4202( formData, config );
                setFk3000( formData, config );

                formData.durchgangsarzt = _k.unwrap( activity.durchgangsarzt ) || '';
                formData.krankengeld = _k.unwrap( activity.krankengeld ) || false;

                // bar codes need js dates
                formData.auVonBC = auVon;
                formData.auVorraussichtlichBisBC = auVorraussichtlichBis;
                formData.festgestelltAmBC = festgestelltAm;

                formData.auVon = '' !== auVon ? moment( auVon ).format( 'DDMMYY' ) : '';
                formData.auVorraussichtlichBis = '' !== auVorraussichtlichBis ? moment( auVorraussichtlichBis ).format( 'DDMMYY' ) : '';
                formData.festgestelltAm = '' !== festgestelltAm ? moment( festgestelltAm ).format( 'DDMMYY' ) : '';

                formData.sonstigerUnf = _k.unwrap( activity.sonstigerUnf ) || false;  // TODO: Boolean
                formData.bvg = _k.unwrap( activity.bvg ) || false;
                formData.rehab = _k.unwrap( activity.rehab ) || '';
                formData.reintegration = _k.unwrap( activity.reintegration ) || false;
                formData.massnahmen = _k.unwrap( activity.massnahmen ) || '';
                formData.massnahmenChk = Boolean( formData.massnahmen );
                formData.diagnosesAdd = _k.unwrap( activity.diagnosesAdd ) || '';
            }
        } );

        addFormMapper( {
            name: 'getHearingAid',
            deps: ['getAU'],
            group: [
                'folgegeraet',
                'erstgeraet',
                'hoerhilfeNotwLinks',
                'hoerhilfeNotwBeiderseits',
                'hoerhilfeNotwRecht'
            ],
            fn: function( formData, config ) {
                var activity = config.context.activity;

                formData.folgegeraet = _k.unwrap( activity.folgegeraet ) || false;
                formData.erstgeraet = _k.unwrap( activity.erstgeraet ) || false;
                formData.hoerhilfeNotwLinks = _k.unwrap( activity.hoerhilfeNotwLinks ) || false;
                formData.hoerhilfeNotwBeiderseits = _k.unwrap( activity.hoerhilfeNotwBeiderseits ) || false;
                formData.hoerhilfeNotwRecht = _k.unwrap( activity.hoerhilfeNotwRecht ) || false;
            }
        } );
        addFormMapper( {
            name: 'getBFBCheckBoxes',
            group: [
                'belegarztBeh',
                'notfall',
                'fk4202',
                'bvg'
            ],
            fn: function( formData, config ) {
                var activity = config.context.activity;

                formData.belegarztBeh = _k.unwrap( activity.belegarztBeh ) || false;
                formData.notfall = _k.unwrap( activity.notfall ) || false;
                setFk4202( formData, config );
                setFk3000( formData, config );

                formData.bvg = /*_k.unwrap( activity.isBVG ) || */ _k.unwrap( activity.bvg ) || false;
            }
        } );

        addFormMapper( {
            name: 'getForm19',
            group: [
                'notfallScheinNotfalldienst',
                'notfallScheinUrlaub',
                'notfallScheinNotfall'
            ],
            fn: function( formData, config ) {
                var activity = config.context.activity;

                formData.notfallScheinNotfalldienst = _k.unwrap( activity.notfallScheinNotfalldienst ) || false;
                formData.notfallScheinUrlaub = _k.unwrap( activity.notfallScheinUrlaub ) || false;
                formData.notfallScheinNotfall = _k.unwrap( activity.notfallScheinNotfall ) || false;
            }
        } );

        addFormMapper( {
            name: 'getForm21',
            group: [
                'betreuungNotwendig',
                'betreuungNichtNotwendig',
                'betreuungUnfall',
                'betreuungKeinUnfall',
                'betreuungVon',
                'betreuungBis'
            ],
            fn: function( formData, config ) {
                var activity = config.context.activity;

                //  initialize optional properties of form activity - non-standard use of form mappers, should otherwise
                //  have an own activity type with mask.

                if( Y.dcforms.isOnServer ) {
                    if( 'undefined' === typeof activity.notwendig ) {
                        activity.notwendig = true;
                    }
                    if( 'undefined' === typeof activity.unfall ) {
                        activity.unfall = false;
                    }
                } else {
                    if( 'undefined' === typeof _k.unwrap( activity.notwendig ) ) {
                        activity.notwendig( true );
                    }
                    if( 'undefined' === typeof _k.unwrap( activity.unfall ) ) {
                        activity.unfall( false );
                    }
                }

                formData.betreuungNotwendig = _k.unwrap( activity.notwendig );
                formData.betreuungNichtNotwendig = !formData.betreuungNotwendig;
                formData.betreuungUnfall = _k.unwrap( activity.unfall ) || false;
                formData.betreuungKeinUnfall = !formData.betreuungUnfall;
                formData.betreuungVon = _k.unwrap( activity.betreuungVon ) || '';
                formData.betreuungBis = _k.unwrap( activity.betreuungBis ) || '';
            }
        } );

        addFormMapper( {
            name: 'setupFindingMedicationDiagnoses',
            group: [
                'findings',
                'medications',
                'diagnosesBC',
                'diagnosesLongBC'
            ],
            linkedGroup: [
                'findings',
                'medications',
                'diagnosesBC',
                'diagnosesLongBC'
            ],
            fn: function( formData, config ) {

                var activity = config.context.activity,
                    linkedActivities = Y.dcforms.mapper.objUtils.getAllLinkedActivities( activity );

                function addSeparation( str ) {
                    if( str.length ) {
                        return ', ';
                    }
                    return '';
                }

                formData.findings = '';
                formData.medications = '';
                formData.diagnosesBC = '';
                formData.diagnosesLongBC = '';

                if( Array.isArray( linkedActivities ) ) {
                    linkedActivities.forEach( function( act ) {
                        if( 'FINDING' === _k.unwrap( act.actType ) && _k.unwrap( act.userContent ) ) {
                            formData.findings += addSeparation( formData.findings );
                            formData.findings += _k.unwrap( act.userContent );
                        } else if( 'MEDICATION' === _k.unwrap( act.actType ) ) {
                            formData.medications += addSeparation( formData.medications );
                            formData.medications += _k.unwrap( act.phNLabel );
                        } else if( 'DIAGNOSIS' === _k.unwrap( act.actType ) &&
                                   // MOJ-11762: exclude invalidated, and invalidating DIAGNOSES
                                   !Y.doccirrus.schemas.activity.isInvalidatedOrInvalidatingDiagnosis( act ) ) {
                            formData.diagnosesBC += addSeparation( formData.diagnosesBC );
                            formData.diagnosesLongBC += addSeparation( formData.diagnosesBC );
                            formData.diagnosesBC += generateDiagnosisText( act );
                            formData.diagnosesLongBC += generateDiagnosisText( act, true );
                        }
                    } );
                }
            }
        } );

        addFormMapper( {
            name: 'getOpthalmology',
            group: [
                'orSphR',
                'orCylR',
                'orAxsR',
                'orAddR',
                'orPsmR',
                'orBasR',
                'orSphL',
                'orCylL',
                'orAxsL',
                'orAddL',
                'orPsmL',
                'orBasL',
                'orHSA'
            ],
            fn: function( formData, config ) {
                var activity = config.context.activity;
                formData.orSphR = _k.unwrap( activity.orSphR ) || '';
                formData.orCylR = _k.unwrap( activity.orCylR ) || '';
                formData.orAxsR = _k.unwrap( activity.orAxsR ) || '';
                formData.orAddR = _k.unwrap( activity.orAddR ) || '';
                formData.orPsmR = _k.unwrap( activity.orPsmR ) || '';
                formData.orBasR = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'orBas_E',
                    _k.unwrap( activity.orBasR ),
                    '-de' );
                formData.orSphL = _k.unwrap( activity.orSphL ) || '';
                formData.orCylL = _k.unwrap( activity.orCylL ) || '';
                formData.orAxsL = _k.unwrap( activity.orAxsL ) || '';
                formData.orAddL = _k.unwrap( activity.orAddL ) || '';
                formData.orPsmL = _k.unwrap( activity.orPsmL ) || '';
                formData.orBasL = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'orBas_E',
                    _k.unwrap( activity.orBasL ),
                    '-de' );

                formData.orHSA = _k.unwrap( activity.orHSA ) || '';
            }
        } );

        addFormMapper( {
            name: 'getUtilityTherapies',
            group: [
                'utAgreement',
                'utAgreementApprovedTill',
                'utIndicationCode',
                'utIcdCode',
                'utIcdText',
                'utSecondIcdCode',
                'utSecondIcdText',
                'utDiagnosisName',
                'utRemedy1Name',
                'utRemedy1Item',
                'utRemedy1Explanation',
                'utRemedy1Seasons',
                'utRemedy1PerWeek',
                'utRemedy2Name',
                'utRemedy2Item',
                'utRemedy2Explanation',
                'utRemedy2Seasons',
                'utRemedy2PerWeek',
                'utVocalTherapy',
                'utSpeakTherapy',
                'utSpeechTherapy',
                'utFirst',
                'utFollowing',
                'utNoNormalCase',
                'utHomeVisit',
                'utNotHomeVisit',
                'utTherapyReport',
                'utNotTherapyReport',
                'utGroupTherapy',
                'utDurationOfSeason',
                'utLatestStartOfTreatment',
                'utMedicalJustification',
                'utTherapyGoals',
                'utUnfall',
                'utBvg',
                'code',
                'utPrescriptionType',
                'utRemedy1ItemPricePlain',
                'utRemedy2ItemPricePlain',
                'utRemedy1ItemPrice',
                'utRemedy2ItemPrice'
            ],
            linkedGroup: [
                'utIcdCode'
            ],
            fn: function( formData, config ) {
                var icds,
                    startOfTreatment,
                    utPrescriptionType,
                    activity = config.context.activity,
                    isKbvUtility = 'KBVUTILITY' === _k.unwrap( activity.actType );

                if( !isKbvUtility && 'UTILITY' !== _k.unwrap( activity.actType ) ) {
                    return;
                }

                formData.utAgreement = Y.doccirrus.schemaloader.translateEnumValue( '-de', _k.unwrap( activity.utAgreement ), Y.doccirrus.schemas.activity.types.KBVUtilityAgreement_E.list, '' );
                formData.utAgreementApprovedTill = activity.utAgreementApprovedTill ? moment( _k.unwrap( activity.utAgreementApprovedTill ) ).format( 'DD.MM.YYYY' ) : '';

                formData.utDiagnosisName = _k.unwrap( activity.utDiagnosisName ) || '';
                formData.utRemedy1Name = _k.unwrap( activity.utRemedy1Name ) || '';
                formData.utRemedy1Item = _k.unwrap( activity.utRemedy1Item ) || '';
                formData.utRemedy1Explanation = _k.unwrap( activity.utRemedy1Explanation ) || '';
                formData.utRemedy1Seasons = _k.unwrap( activity.utRemedy1Seasons ) ? String( _k.unwrap( activity.utRemedy1Seasons ) ) : '';
                formData.utRemedy1PerWeek = _k.unwrap( activity.utRemedy1PerWeek ) ? String( _k.unwrap( activity.utRemedy1PerWeek ) ) : '';
                formData.utRemedy1ItemPrice = _k.unwrap( activity.utRemedy1ItemPrice ) ? String( _k.unwrap( activity.utRemedy1ItemPrice ) ) : '0.00';
                formData.utRemedy2Name = _k.unwrap( activity.utRemedy2Name ) || '';
                formData.utRemedy2Item = _k.unwrap( activity.utRemedy2Item ) || '';
                formData.utRemedy2Explanation = _k.unwrap( activity.utRemedy2Explanation ) || '';
                formData.utRemedy2Seasons = _k.unwrap( activity.utRemedy2Seasons ) ? String( _k.unwrap( activity.utRemedy2Seasons ) ) : '';
                formData.utRemedy2PerWeek = _k.unwrap( activity.utRemedy2PerWeek ) ? String( _k.unwrap( activity.utRemedy2PerWeek ) ) : '';
                formData.utRemedy2ItemPrice = _k.unwrap( activity.utRemedy2ItemPrice ) ? String( _k.unwrap( activity.utRemedy2ItemPrice ) ) : '0.00';
                formData.utVocalTherapy = _k.unwrap( activity.utVocalTherapy ) || false;
                formData.utSpeakTherapy = _k.unwrap( activity.utSpeakTherapy ) || false;
                formData.utSpeechTherapy = _k.unwrap( activity.utSpeechTherapy ) || false;

                //  EXTMOJ-2091
                formData.utRemedy1ItemPricePlain = Y.doccirrus.comctl.numberToLocalString( formData.utRemedy1ItemPrice );
                formData.utRemedy2ItemPricePlain = Y.doccirrus.comctl.numberToLocalString( formData.utRemedy2ItemPrice );
                //  MOJ-7772
                formData.utRemedy1ItemPrice = Y.doccirrus.comctl.numberToLocalCurrency( formData.utRemedy1ItemPrice, true, formData.currency );
                formData.utRemedy2ItemPrice = Y.doccirrus.comctl.numberToLocalCurrency( formData.utRemedy2ItemPrice, true, formData.currency );

                formData.utFirst = ('FIRST' === _k.unwrap( activity.utPrescriptionType )) || false;
                formData.utFollowing = ('FOLLOWING' === _k.unwrap( activity.utPrescriptionType )) || false;

                switch( activity.utPrescriptionType ) {
                    case 'FIRST':
                        utPrescriptionType = 'Erstverordnung';
                        break;
                    case 'FOLLOWING':
                        utPrescriptionType = 'Folgeverordnung';
                        break;
                    default:
                        utPrescriptionType = 'Kein Regelfall';
                }

                formData.utPrescriptionType = utPrescriptionType;

                if( isKbvUtility ) {
                    formData.utNoNormalCase = ('NO_NORMAL_CASE' === _k.unwrap( activity.utPrescriptionType )) || false;
                } else {
                    formData.utNoNormalCase = _k.unwrap( activity.utNoNormalCase ) || false;
                }
                formData.utHomeVisit = _k.unwrap( activity.utHomeVisit ) || false;
                formData.utNotHomeVisit = !(formData.utHomeVisit) || false;

                formData.utTherapyReport = _k.unwrap( activity.utTherapyReport ) || false;
                formData.utNotTherapyReport = !(formData.utTherapyReport) || false;

                formData.utGroupTherapy = _k.unwrap( activity.utGroupTherapy ) || false;
                formData.utDurationOfSeason = _k.unwrap( activity.utDurationOfSeason ) ? String( _k.unwrap( activity.utDurationOfSeason ) ) : '';

                //  logic changed for MOJ-4448
                //formData.utLatestStartOfTreatment = _k.unwrap( activity.utLatestStartOfTreatment ) ? moment( _k.unwrap( activity.utLatestStartOfTreatment ) ).format( 'DD MM YY' ) : '';
                startOfTreatment = _k.unwrap( activity.utLatestStartOfTreatment );
                if( startOfTreatment && '' !== startOfTreatment && moment( startOfTreatment ).isValid() ) {
                    formData.utLatestStartOfTreatment = moment( _k.unwrap( startOfTreatment ) ).format( 'DDMMYY' );
                } else {
                    formData.utLatestStartOfTreatment = '';
                }

                formData.utMedicalJustification = _k.unwrap( activity.utMedicalJustification ) || '';
                if( isKbvUtility ) {
                    formData.utTherapyGoals = (_k.unwrap( activity.utTherapyGoalsList ) || []).join( ', ' );
                } else {
                    formData.utTherapyGoals = _k.unwrap( activity.utTherapyGoals ) || '';
                }

                setFk4202( formData, config );
                formData.utBvg = _k.unwrap( activity.utBvg ) || false;

                formData.utIcdCode = '';
                formData.utSecondIcdCode = '';
                if( isKbvUtility ) {
                    formData.utIcdCode = _k.unwrap( activity.utIcdCode ) || '';
                    formData.utSecondIcdCode = _k.unwrap( activity.utSecondIcdCode ) || '';
                } else {
                    // get linked icd code
                    icds = _k.unwrap( activity._icdsObj );
                    if( icds && icds.length ) {
                        formData.utIcdCode = _k.unwrap( icds[0].code );
                        // TODO check where we need to map the icdCodeText?
                    }
                }

                if( isKbvUtility ) {
                    formData.code = _k.unwrap( activity.utIndicationCode ) || '';
                } else {
                    formData.code = _k.unwrap( activity.code ) || '';
                }

                formData.utNeuroFinding = _k.unwrap( activity.utNeuroFinding ) || '';
                formData.utAudioDiagDate = moment( _k.unwrap( activity.utAudioDiagDate ) ).format( 'DDMMYY' );
                formData.utAudioDiagReact = _k.unwrap( activity.utAudioDiagReact ) || false;
                formData.utAudioDiagCond = _k.unwrap( activity.utAudioDiagCond ) || false;
                formData.utAudioDiagOwn = _k.unwrap( activity.utAudioDiagOwn ) || false;
                formData.utLupenlaryngoskopie = _k.unwrap( activity.utLupenlaryngoskopie ) || '';
                formData.utLupenstroboskopieRight = _k.unwrap( activity.utLupenstroboskopieRight ) || '';
                formData.utLupenstroboskopieLeft = _k.unwrap( activity.utLupenstroboskopieLeft ) || '';
                formData.utAmplitudeRight = _k.unwrap( activity.utAmplitudeRight ) || '';
                formData.utAmplitudeLeft = _k.unwrap( activity.utAmplitudeLeft ) || '';
                formData.utRandkantenverschiebungRight = _k.unwrap( activity.utRandkantenverschiebungRight ) || '';
                formData.utRandkantenverschiebungLeft = _k.unwrap( activity.utRandkantenverschiebungLeft ) || '';
                formData.utRegular = _k.unwrap( activity.utRegular );
                formData.utRegularNo = formData.utRegular === false;
                formData.utGlottisschluss = _k.unwrap( activity.utGlottisschluss );
                formData.utGlottisschlussNo = formData.utGlottisschluss === false;
                formData.utEarDrumFindingRight = _k.unwrap( activity.utEarDrumFindingRight ) || '';
                formData.utEarDrumFindingLeft = _k.unwrap( activity.utEarDrumFindingLeft ) || '';

                //  MOJ-9717 Do not initialize utAudioDiagDate to current date if not in activity
                if( !_k.unwrap( activity.utAudioDiagDate ) ) {
                    formData.utAudioDiagDate = '';
                }

                formData.utUtility1Position1Name = '';
                formData.utUtility1Position1Price = null;

                formData.utUtility1Position2Name = '';
                formData.utUtility1Position2Price = null;

                formData.utUtility1Position3Name = '';
                formData.utUtility1Position3Price = null;

                formData.utUtility2Position1Name = '';
                formData.utUtility2Position1Price = null;

                formData.utUtility2Position2Name = '';
                formData.utUtility2Position2Price = null;

                formData.utUtility2Position3Name = '';
                formData.utUtility2Position3Price = null;

                if( isKbvUtility ) {
                    (_k.unwrap( activity.utRemedy1List ) || []).forEach( function( entry, index ) {
                        var namePath = 'utUtility1Position' + (index + 1) + 'Name',
                            pricePath = 'utUtility1Position' + (index + 1) + 'Price';
                        if( formData.hasOwnProperty( namePath ) ) {
                            formData[namePath] = _k.unwrap( entry.name );
                        }
                        if( formData.hasOwnProperty( pricePath ) ) {
                            formData[pricePath] = _k.unwrap( entry.price );
                        }
                    } );
                    (_k.unwrap( activity.utRemedy2List ) || []).forEach( function( entry, index ) {
                        var namePath = 'utUtility2Position' + (index + 1) + 'Name',
                            pricePath = 'utUtility2Position' + (index + 1) + 'Price';
                        if( formData.hasOwnProperty( namePath ) ) {
                            formData[namePath] = _k.unwrap( entry.name );
                        }
                        if( formData.hasOwnProperty( pricePath ) ) {
                            formData[pricePath] = _k.unwrap( entry.price );
                        }
                    } );
                } else {
                    formData.utUtility1Position1Name = formData.utRemedy1Item;
                    formData.utUtility1Position1Price = _k.unwrap( activity.utRemedy1ItemPrice );
                    formData.utUtility2Position1Name = formData.utRemedy2Item;
                    formData.utUtility2Position1Price = _k.unwrap( activity.utRemedy2ItemPrice );
                }

            }
        } );

        addFormMapper( {
            name: 'KBVUtility2Mapper',
            group: [
                'ut2Chapter_physio',
                'ut2Chapter_podo',
                'ut2Chapter_logo',
                'ut2Chapter_ergo',
                'ut2Chapter_et',
                'utICD',
                'utICD2',
                'utDiagnosisText',
                'ut2DiagnosisGroupCode',
                'ut2ConductionSymptoms_a',
                'ut2ConductionSymptoms_b',
                'ut2ConductionSymptoms_c',
                'ut2PatientSpecificConductionSymptoms',
                'ut2ConductionSymptoms_text',
                'ut2RemedyPosition1',
                'ut2RemedyPosition1Text',
                'ut2RemedyPosition1Unit',
                'ut2RemedyPosition2',
                'ut2RemedyPosition2Text',
                'ut2RemedyPosition2Unit',
                'ut2RemedyPosition3',
                'ut2RemedyPosition3Text',
                'ut2RemedyPosition3Unit',
                'ut2AdditionalRemedyPosition',
                'ut2AdditionalRemedyPositionText',
                'ut2AdditionalRemedyPositionUnit',
                'ut2TherapyFrequency',
                'ut2UrgentNeedForAction',
                'utHomeVisit',
                'utNotHomeVisit',
                'utTherapyReport',
                'utTherapyGoals',
                'utBvg',
                'utUnfall'
            ],
            linkedGroup: [],
            fn: function( formData, config ) {
                var
                    _ = Y.doccirrus.commonutils.getLodash(),
                    activity = config.context.activity,
                    ut2Chapter = _k.unwrap( activity.ut2Chapter ),
                    isKbvUtility2 = 'KBVUTILITY2' === _k.unwrap( activity.actType ),
                    ut2Remedy1List = _k.unwrap( activity.ut2Remedy1List ),
                    ut2Remedy2List = _k.unwrap( activity.ut2Remedy2List ),
                    ut2TherapyFrequencyType = _k.unwrap( activity.ut2TherapyFrequencyType ),
                    frequenzempfehlungstyp = ut2TherapyFrequencyType && Y.doccirrus.schemas.v_kbvutility2.mapTherapyFrequenceTypeToCatalogType( ut2TherapyFrequencyType ),
                    standardizedCombination;

                function wrapRemedyText( text ) {
                    return text && text.length ? ['(', text, ')'].join( '' ) : '';
                }

                function calcPriceForEntry( entry ) {
                    var price = _k.unwrap( entry.price ) || 0;
                    var units = _k.unwrap( entry.units );
                    if( !_.isFinite( units ) ) {
                        units = 1;
                    }

                    return price * units;
                }

                if( !isKbvUtility2 ) {
                    return;
                }

                formData.ut2Chapter = Y.doccirrus.schemaloader.translateEnumValue( 'i18n', ut2Chapter, Y.doccirrus.schemas.activity.types.KBVUtility2Chapter_E.list, '' );

                formData.ut2Chapter_physio = ut2Chapter === 'PHYSIO';
                formData.ut2Chapter_podo = ut2Chapter === 'PODO';
                formData.ut2Chapter_logo = ut2Chapter === 'LOGO';
                formData.ut2Chapter_ergo = ut2Chapter === 'ERGO';
                formData.ut2Chapter_et = ut2Chapter === 'ET';

                formData.utICD = _k.unwrap( activity.utIcdCode );
                formData.utICD2 = _k.unwrap( activity.utSecondIcdCode );
                formData.utDiagnosisText = [
                    _k.unwrap( activity.utIcdText ),
                    _k.unwrap( activity.utSecondIcdText ),
                    _k.unwrap( activity.ut2TreatmentRelevantDiagnosisText )
                ].filter( Boolean ).join( '; ' );

                formData.ut2DiagnosisGroupCode = _k.unwrap( activity.ut2DiagnosisGroupCode );

                formData.ut2ConductionSymptoms_a = false;
                formData.ut2ConductionSymptoms_b = false;
                formData.ut2ConductionSymptoms_c = false;
                formData.ut2PatientSpecificConductionSymptoms = false;
                formData.ut2ConductionSymptoms_text = '';

                if( _k.unwrap( activity.ut2PatientSpecificConductionSymptoms ) ) {
                    formData.ut2PatientSpecificConductionSymptoms = true;
                    formData.ut2ConductionSymptoms_text = _k.unwrap( activity.ut2PatientSpecificConductionSymptomsFreeText );
                } else {
                    (_k.unwrap( activity.ut2ConductionSymptoms ) || []).forEach( function( entry ) {
                        var code = _k.unwrap( entry.code ),
                            name = _k.unwrap( entry.name );
                        if( code === 'a' ) {
                            formData.ut2ConductionSymptoms_a = true;
                        } else if( code === 'b' ) {
                            formData.ut2ConductionSymptoms_b = true;
                        } else if( code === 'c' ) {
                            formData.ut2ConductionSymptoms_c = true;
                        }
                        formData.ut2ConductionSymptoms_text += ((formData.ut2ConductionSymptoms_text.length && name.length ? '; ' : '') + name);
                    } );
                }

                formData.ut2HasBlankRegulation = Boolean( _k.unwrap( activity.ut2BlankRegulation ) && !_k.unwrap( activity.ut2BlankRegulationIgnored ) );

                formData.ut2RemedyPosition1 = '';
                formData.ut2RemedyPosition1Text = '';
                formData.ut2RemedyPosition1Unit = '';

                formData.ut2RemedyPosition2 = '';
                formData.ut2RemedyPosition2Text = '';
                formData.ut2RemedyPosition2Unit = '';

                formData.ut2RemedyPosition3 = '';
                formData.ut2RemedyPosition3Text = '';
                formData.ut2RemedyPosition3Unit = '';

                formData.ut2AdditionalRemedyPosition = '';
                formData.ut2AdditionalRemedyPositionText = '';
                formData.ut2AdditionalRemedyPositionUnit = '';

                formData.ut2PrimaryRemedy = '';
                formData.ut2AdditionalRemedy = '';
                formData.ut2RemedyStandardizedCombination = '';

                formData.ut2UnitsSum = 0;
                formData.ut2PriceSum = 0;

                standardizedCombination = ut2Remedy1List.find( function( entry ) {
                    return _k.unwrap( entry.type ) === 'STANDARDIZED_COMBINATIONS_OF_REMEDIES';
                } );

                if( !formData.ut2HasBlankRegulation && standardizedCombination ) {
                    formData.ut2RemedyPosition1 = _k.unwrap( standardizedCombination.name );
                    formData.ut2RemedyPosition1Text = wrapRemedyText( _k.unwrap( standardizedCombination.text ) );
                    formData.ut2RemedyPosition1Unit = _k.unwrap( standardizedCombination.units );
                    formData.ut2RemedyStandardizedCombination = [
                        formData.ut2RemedyPosition1, formData.ut2RemedyPosition1Text
                    ].filter( Boolean ).join( ' ' );
                    formData.ut2UnitsSum += (formData.ut2RemedyPosition1Unit || 0);
                    formData.ut2PriceSum += calcPriceForEntry( standardizedCombination );
                } else if( !formData.ut2HasBlankRegulation ) {
                    ut2Remedy1List.forEach( function( entry, index ) {
                        formData['ut2RemedyPosition' + (index + 1)] = _k.unwrap( entry.name );
                        formData['ut2RemedyPosition' + (index + 1) + 'Text'] = wrapRemedyText( _k.unwrap( entry.text ) );
                        formData['ut2RemedyPosition' + (index + 1) + 'Unit'] = _k.unwrap( entry.units );
                        if( formData.ut2PrimaryRemedy.length ) {
                            formData.ut2PrimaryRemedy += ', ';
                        }
                        formData.ut2PrimaryRemedy += [
                            formData['ut2RemedyPosition' + (index + 1)], formData['ut2RemedyPosition' + (index + 1) + 'Text']
                        ].filter( Boolean ).join( ' ' );
                        formData.ut2UnitsSum += (formData['ut2RemedyPosition' + (index + 1) + 'Unit'] || 0);
                        formData.ut2PriceSum += calcPriceForEntry( entry );
                    } );
                    if( ut2Remedy2List.length ) {
                        formData.ut2AdditionalRemedyPosition = _k.unwrap( ut2Remedy2List[0].name );
                        formData.ut2AdditionalRemedyPositionText = wrapRemedyText( _k.unwrap( ut2Remedy2List[0].text ) );
                        formData.ut2AdditionalRemedyPositionUnit = _k.unwrap( ut2Remedy2List[0].units );
                        formData.ut2AdditionalRemedy = [
                            formData.ut2AdditionalRemedyPosition, formData.ut2AdditionalRemedyPositionText
                        ].filter( Boolean ).join( ' ' );
                        formData.ut2PriceSum += calcPriceForEntry( ut2Remedy2List[0] );
                        // "Ergänzendes Heilmittel" is only use for "Verordnungsmenge" if prescribed alone
                        if( ut2Remedy1List.length === 0 ) {
                            formData.ut2UnitsSum += (formData.ut2AdditionalRemedyPositionUnit || 0);
                        }
                    }
                } else {
                    formData.ut2RemedyPosition1 = 'BLANKOVERORDNUNG';
                }
                if( !formData.ut2HasBlankRegulation ) {
                    formData.ut2TherapyFrequency = frequenzempfehlungstyp && _k.unwrap( activity.ut2TherapyFrequencyMin ) ? Y.doccirrus.schemas.v_kbvutility2.renderTherapyFrequencyCatalogEntry( frequenzempfehlungstyp, {
                        minimale_anzahl: _k.unwrap( activity.ut2TherapyFrequencyMin ),
                        maximale_anzahl: _k.unwrap( activity.ut2TherapyFrequencyMax )
                    } ) : '';
                } else {
                    formData.ut2TherapyFrequency = '';
                }

                formData.ut2HasAgreementBVB = _k.unwrap( activity.ut2AgreementType ) === 'BVB';
                formData.ut2HasApproval = (_k.unwrap( activity.ut2ApprovalRefs ) || []).length > 0;
                formData.ut2HasAgreementLHM = _k.unwrap( activity.ut2AgreementType ) === 'LHM' || formData.ut2HasApproval;
                formData.ut2UrgentNeedForAction = _k.unwrap( activity.ut2UrgentNeedForAction ) || false;
                formData.utTherapyReport = Boolean( _k.unwrap( activity.utTherapyReport ) === true );
                formData.ut2HasTherapyReport = Boolean( _k.unwrap( activity.utTherapyReport ) === true );
                formData.utHomeVisit = Boolean( _k.unwrap( activity.utHomeVisit ) === true );
                formData.ut2HasHomeVisit = Boolean( _k.unwrap( activity.utHomeVisit ) === true );
                formData.utNotHomeVisit = !formData.utHomeVisit;
                formData.utTherapyGoals = _k.unwrap( activity.utTherapyGoals ) || '';

                setFk4202( formData, config );
                formData.utBvg = _k.unwrap( activity.utBvg ) || false;

            }
        } );

        addFormMapper( {
            name: 'getLastAU',
            group: [
                "auVonBG",
                "auVorraussichtlichBisBG"
            ],
            fn: function( formData, config, callback ) {

                //TODO: remove this callback if possible

                var
                    activity = config.context.activity,
                    timestamp = _k.unwrap( activity.timestamp ),
                    patientId = _k.unwrap( activity.patientId ),
                    caseFolderId = _k.unwrap( activity.caseFolderId );

                function auCb( response ) {
                    var au = response && response.data && response.data[0];
                    if( au ) {
                        formData.auVonBG = au.auVon ? moment( au.auVon ).format( 'DD.MM.YYYY' ) : '';
                        formData.auVorraussichtlichBisBG = au.auVorraussichtlichBis ? moment( au.auVorraussichtlichBis ).format( 'DD.MM.YYYY' ) : '';
                    }

                    //  TODO: can we cache AU on mapper context?

                    callback();
                }

                function onServerAPICall( err, response ) {
                    if( err ) {
                        Y.log( 'Cannot load last AU: ' + JSON.stringify( err ), 'warn', NAME );
                        callback( err );
                        return;
                    }

                    if( !response.data ) {
                        //  prevents crash for now, otherwise undesirable
                        Y.log( 'Patient API could not get last AU, empty object returned', 'warn', NAME );
                        response.data = {};
                    }

                    auCb( response );
                }

                if( Y.doccirrus.commonutils.isClientSide() ) {
                    Y.doccirrus.jsonrpc.api.patient.lastAU( {
                            patientId: patientId,
                            timestamp: timestamp,
                            caseFolderId: caseFolderId
                        }
                    ).done( auCb ).fail( callback );
                } else {
                    Y.doccirrus.api.patient.lastAU( {
                        user: config.context.user,
                        originalParams: {
                            patientId: patientId,
                            timestamp: timestamp,
                            caseFolderId: caseFolderId
                        },
                        callback: onServerAPICall
                    } );
                }

            }
        } );

        /**
         *  Specialized properties of some TREATMENT activities
         */

        addFormMapper( {
            name: 'setupTreatmentOP',
            group: [
                'opAdditional',
                'opPostOpCodes',
                'opAdmissionDate',
                'opDischargeDate',
                'opDate',
                'opDuration',
                'opComplications',
                'opCodes',
                'opJustificationTreatment'
            ],
            fn: function( formData, config ) {
                var currentActivity = config.context.activity;

                //  these fields are only found on treatments
                if( 'TREATMENT' !== _k.unwrap( currentActivity.actType ) ) {
                    return;
                }

                formData.opAdditional = _k.unwrap( currentActivity.fk5023 ) || '';    //  GO numbers addition
                formData.opPostOpCodes = _k.unwrap( currentActivity.fk5024 ) || '';    //  GNR additional identifier
                formData.opAdmissionDate = _k.unwrap( currentActivity.fk5025 ) || '';    //  (surgery) recorded date
                formData.opDischargeDate = _k.unwrap( currentActivity.fk5026 ) || '';    //  (surgery) release date
                formData.opDate = _k.unwrap( currentActivity.fk5034 ) || '';    //  (surgery) operation date
                formData.opDuration = _k.unwrap( currentActivity.fk5037 ) || '';    //  total incision-suture time
                formData.opComplications = _k.unwrap( currentActivity.fk5038 ) || '';    //  complications

                if( formData.opAdmissionDate && '' !== formData.opAdmissionDate ) {
                    formData.opAdmissionDate = moment( formData.opAdmissionDate ).format( 'DD.MM.YYYY' );
                }
                if( formData.opDischargeDate && '' !== formData.opDischargeDate ) {
                    formData.opDischargeDate = moment( formData.opDischargeDate ).format( 'DD.MM.YYYY' );
                }
                if( formData.opDate && '' !== formData.opDate ) {
                    formData.opDate = moment( formData.opDate ).format( 'DD.MM.YYYY' );
                }

                formData.opCodes = formatFk5035( _k.unwrap( currentActivity.fk5035Set ) || [] );     //  OP key
                formData.opJustificationTreatment = formatFk5036( _k.unwrap( currentActivity.fk5036Set ) || [] );     //  GNR code as justification
            }
        } );

        addFormMapper( {
            name: 'setupHealthSurvey',
            group: [ /*'BFB30insurance_AOK', 'BFB30_age_lt35'*/],
            fn: function( formData, config ) {
                var
                    currentActivity = config.context.activity,
                    surveySex = _k.unwrap( currentActivity.surveySex ),
                    ageGroup = _k.unwrap( currentActivity.ageGroup ),
                    insuranceType = _k.unwrap( currentActivity.insuranceType );

                formData.BFB30insurance_AOK = ('1' === insuranceType);
                formData.BFB30insurance_LKK = ('2' === insuranceType);
                formData.BFB30insurance_VDeK = ('3' === insuranceType);
                formData.BFB30insurance_BKK = ('4' === insuranceType);
                formData.BFB30insurance_BKnapp = ('5' === insuranceType);
                formData.BFB30insurance_IKK = ('6' === insuranceType);

                formData.BFB30_age_lt35 = ('01' === ageGroup);
                formData.BFB30_age_35_39 = ('02' === ageGroup);
                formData.BFB30_age_40_44 = ('03' === ageGroup);
                formData.BFB30_age_45_49 = ('04' === ageGroup);
                formData.BFB30_age_50_54 = ('05' === ageGroup);
                formData.BFB30_age_55_59 = ('06' === ageGroup);
                formData.BFB30_age_60_64 = ('07' === ageGroup);
                formData.BFB30_age_65_69 = ('08' === ageGroup);
                formData.BFB30_age_70_74 = ('09' === ageGroup);
                formData.BFB30_age_75_79 = ('10' === ageGroup);
                formData.BFB30_age_gt80 = ('11' === ageGroup);

                formData.BFB30_sex_male = (('MALE' === surveySex) || ('M' === surveySex));
                formData.BFB30_sex_female = (('FEMALE' === surveySex) || ('W' === surveySex));

                formData.BFB30_Wiederholung = _k.unwrap( currentActivity.repeatedExam );

                formData.BFB30_hypertonia_eigen = "1" === _k.unwrap( currentActivity.hypertonia ) || '3' === _k.unwrap( currentActivity.hypertonia );
                formData.BFB30_hypertonia_fam = "2" === _k.unwrap( currentActivity.hypertonia ) || '3' === _k.unwrap( currentActivity.hypertonia );
                formData.BFB30_coronalHeartDisease_eigen = "1" === _k.unwrap( currentActivity.coronalHeartDisease ) || '3' === _k.unwrap( currentActivity.coronalHeartDisease );
                formData.BFB30_coronalHeartDisease_fam = "2" === _k.unwrap( currentActivity.coronalHeartDisease ) || '3' === _k.unwrap( currentActivity.coronalHeartDisease );
                formData.BFB30_otherArterialClosure_eigen = "1" === _k.unwrap( currentActivity.otherArterialClosure ) || '3' === _k.unwrap( currentActivity.otherArterialClosure );
                formData.BFB30_otherArterialClosure_fam = "2" === _k.unwrap( currentActivity.otherArterialClosure ) || '3' === _k.unwrap( currentActivity.otherArterialClosure );
                formData.BFB30_diabetesMellitus_eigen = "1" === _k.unwrap( currentActivity.diabetesMellitus ) || '3' === _k.unwrap( currentActivity.diabetesMellitus );
                formData.BFB30_diabetesMellitus_fam = "2" === _k.unwrap( currentActivity.diabetesMellitus ) || '3' === _k.unwrap( currentActivity.diabetesMellitus );
                formData.BFB30_hyperlipidemia_eigen = "1" === _k.unwrap( currentActivity.hyperlipidemia ) || '3' === _k.unwrap( currentActivity.hyperlipidemia );
                formData.BFB30_hyperlipidemia_fam = "2" === _k.unwrap( currentActivity.hyperlipidemia ) || '3' === _k.unwrap( currentActivity.hyperlipidemia );
                formData.BFB30_kidneyDiseases_eigen = "1" === _k.unwrap( currentActivity.kidneyDiseases ) || '3' === _k.unwrap( currentActivity.kidneyDiseases );
                formData.BFB30_kidneyDiseases_fam = "2" === _k.unwrap( currentActivity.kidneyDiseases ) || '3' === _k.unwrap( currentActivity.kidneyDiseases );
                formData.BFB30_lungDiseases_eigen = "1" === _k.unwrap( currentActivity.lungDiseases ) || '3' === _k.unwrap( currentActivity.lungDiseases );
                formData.BFB30_lungDiseases_fam = "2" === _k.unwrap( currentActivity.lungDiseases ) || '3' === _k.unwrap( currentActivity.lungDiseases );

                formData.BFB30_nicotineAbuse = _k.unwrap( currentActivity.nicotineAbuse );
                formData.BFB30_adipositas = _k.unwrap( currentActivity.adipositas );
                formData.BFB30_chronicEmotionalStressFactor = _k.unwrap( currentActivity.chronicEmotionalStressFactor );
                formData.BFB30_alcoholAbuse = _k.unwrap( currentActivity.alcoholAbuse );
                formData.BFB30_sedentaryLifestyle = _k.unwrap( currentActivity.sedentaryLifestyle );
            }
        } );

        /**
         *  Helper function to add an activity's common fields to an array - used for most tables of linked activities
         *
         *  Implicitly, this is the mapper for Activity_T reduced schema, and may also be used with Treatment_T
         *  reduced schema for more specific tables requiring details of tratments involving surgery.
         *
         *  @param  {Object}    toArray
         *  @param  {Object}    activity
         */

        function addItem( toArray, activity, caseFolder ) {
            var
                diagnosisSite = _k.unwrap( activity.diagnosisSite ) || '',
                actType = _k.unwrap( activity.actType ),
                isSwissCaseFolder = Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[(caseFolder || {}).type || 'ANY'] === 'CH',
                phIngr,
                addedItem,
                dateFormat = i18n( 'general.TIMESTAMP_FORMAT' ),
                newItem = {
                    'actType': actType,                         //  used for filtering in tables
                    'activityId': _k.unwrap( activity._id ),
                    'content': _k.unwrap( activity.content ) || '',
                    'codePlain': _k.unwrap( activity.code ) || '',
                    'tariffCode': _k.unwrap( activity.phGTIN ) || '',
                    'codeDisplay': Y.doccirrus.schemas.activity.displayCode( activity ),
                    'timestamp': _k.unwrap( activity.timestamp ),
                    'date': moment.utc( _k.unwrap( activity.timestamp ) ).local().format( dateFormat ),
                    'time': _k.unwrap( activity.time ) || '',
                    'diagnosisSite': (diagnosisSite && diagnosisSite[0]) ? diagnosisSite[0] : diagnosisSite,
                    'dosis': getDosisStr( activity ),
                    'pzn': _k.unwrap( activity.phPZN || '' ),
                    'phPZN': _k.unwrap( activity.phPZN || '' ),
                    'subType': _k.unwrap( activity.subType || ' ' ) || ' ',
                    'phNote': _k.unwrap( activity.phNote || activity.assCharacteristics || '' )
                };

            //  entities from HTML
            newItem.content = newItem.content.replace( new RegExp( '&nbsp;', 'g' ), ' ' );

            if( isSwissCaseFolder && actType === 'MEDICATION' ) {
                addedItem = toArray.find( function( item ) {
                    return item.phPZN === newItem.phPZN;
                } );

                if( addedItem ) {
                    addedItem.quantity++;
                    addedItem.quantityUnit = addedItem.quantity + getUnits( activity.isDivisible, caseFolder || {} );
                    return;
                }
            }

            switch( actType ) {
                case 'DIAGNOSIS':
                    //  EXTMOJ-825, do not show auto-generated tags in diagnosis description column
                    newItem.content = _k.unwrap( activity.userContent );
                    break;

                case 'MEDICATION':
                    //  Additional medication fields are in the MedicationActivity_T table row type.
                    phIngr = activity.phIngr ? _k.unwrap( activity.phIngr ) : null;

                    //  plaintext list of active ingredients and strength
                    newItem.phIngr = phIngr ? Y.doccirrus.schemas.activity.serializePhIngr( phIngr ) : '';

                    newItem.content = activity.phNLabel ? _k.unwrap( activity.phNLabel ) : newItem.content;

                    newItem.phForm = '';
                    newItem.phName = '';
                    newItem.phShortName = '';
                    newItem.phStringth = '';
                    newItem.phPriceSale = '-';

                    //  name of active ingredient (chemical, not brand)
                    newItem.phName = phIngr ? serializePhField( phIngr, 'name' ) : '';
                    newItem.phShortName = phIngr ? serializePhShortName( phIngr ) : '';

                    //  quantity of active ingredient per dose
                    newItem.phStrength = phIngr ? serializePhField( phIngr, 'strength' ) : '';

                    //  tablets, liquid, powder, etc
                    newItem.phForm = activity.phForm ? _k.unwrap( activity.phForm ) : '';

                    //  unit / einheit
                    newItem.phUnit = activity.phUnit ? _k.unwrap( activity.phUnit ) : '';

                    //  reason / justification / grund
                    newItem.phReason = activity.phReason ? _k.unwrap( activity.phReason ) : '';

                    newItem.phAtc = activity.phAtc ? _k.unwrap( activity.phAtc ) : '';

                    //  price (used in Swiss mode to print labels) MOJ-11922
                    newItem.phPriceSale = activity.phPriceSale ? _k.unwrap( activity.phPriceSale ) : '';

                    newItem.phDosisMorning = activity.phDosisMorning ? _k.unwrap( activity.phDosisMorning ) : '';
                    newItem.phDosisAfternoon = activity.phDosisAfternoon ? _k.unwrap( activity.phDosisAfternoon ) : '';
                    newItem.phDosisEvening = activity.phDosisEvening ? _k.unwrap( activity.phDosisEvening ) : '';
                    newItem.phDosisNight = activity.phDosisNight ? _k.unwrap( activity.phDosisNight ) : '';

                    newItem.phContinuousMedDate = '';
                    if( activity.phContinuousMedDate && _k.unwrap( activity.phContinuousMedDate ) ) {
                        newItem.phContinuousMedDate = moment( _k.unwrap( activity.phContinuousMedDate ) ).format( TIMESTAMP_FORMAT );
                    }

                    if( isSwissCaseFolder && actType === 'MEDICATION' ) {
                        newItem.quantity = 1;
                        newItem.quantityUnit = 1 + getUnits( _k.unwrap( activity.isDivisible ), caseFolder || {} );
                    }

                    break;

                case 'TREATMENT':
                    newItem.opAdditional = _k.unwrap( activity.fk5023 );        //  GO numbers addition
                    newItem.opPostOpCodes = _k.unwrap( activity.fk5024 );       //  GNR additional identifier
                    newItem.opAdmissionDate = _k.unwrap( activity.fk5025 );     //  (surgery) recorded date
                    newItem.opDischargeDate = _k.unwrap( activity.fk5026 );     //  (surgery) release date
                    newItem.opDate = _k.unwrap( activity.fk5034 );              //  (surgery) operation date
                    newItem.opDuration = _k.unwrap( activity.fk5037 );          //  total incision-suture time
                    newItem.opComplications = _k.unwrap( activity.fk5038 );     //  complications

                    if( newItem.opAdmissionDate && '' !== newItem.opAdmissionDate ) {
                        newItem.opAdmissionDate = moment( newItem.opAdmissionDate ).format( 'DD.MM.YYYY' );
                    }
                    if( newItem.opDischargeDate && '' !== newItem.opDischargeDate ) {
                        newItem.opDischargeDate = moment( newItem.opDischargeDate ).format( 'DD.MM.YYYY' );
                    }
                    if( newItem.opDate && '' !== newItem.opDate ) {
                        newItem.opDate = moment( newItem.opDate ).format( 'DD.MM.YYYY' );
                    }

                    newItem.opCodes = formatFk5035( _k.unwrap( activity.fk5035Set ) || [] );                    //  OP key
                    newItem.opJustificationTreatment = formatFk5036( _k.unwrap( activity.fk5036Set || [] ) );   //  GNR code as justification

                    //  Swiss mode treatments

                    break;
            }

            newItem.content = breakLongStrings( newItem.content || '' );
            toArray.push( newItem );
        }

        /**
         *  Flatten an array of operation key codes and locations
         *
         *  @param      {Object}    fk5035Set
         *  @returns    {String}
         */

        function formatFk5035( fk5035Set ) {
            var i, items = [];
            if( !fk5035Set || !fk5035Set.length ) {
                return '';
            }
            for( i = 0; i < fk5035Set.length; i++ ) {
                items.push( fk5035Set[i].fk5035 + (fk5035Set[i].fk5041 ? ' ' + fk5035Set[i].fk5041 : '') );
            }
            if( 0 === items.length ) {
                return '';
            }
            return items.join( ', ' );
        }

        /**
         *  Flatten an array of GNR codes justifying a surgical procedure
         *
         *  @param      {Object}    fk5036Set
         *  @returns    {String}
         */

        function formatFk5036( fk5036Set ) {
            var i, items = [];
            if( !fk5036Set || !fk5036Set.length ) {
                return '';
            }
            for( i = 0; i < fk5036Set.length; i++ ) {
                items.push( fk5036Set[i].fk5036 );
            }
            if( 0 === items.length ) {
                return '';
            }
            return items.join( ', ' );
        }

        /**
         *  The dosage instructions / regimen for medication may take two forms MOJ-6770
         *
         *      SCHEDULE    morning-afternoon-evening-night
         *      TEXT        free text field
         *
         *  @param  activity    {Object}
         *  @returns            {String}
         */

        function getDosisStr( activity, prescriptionType ) {
            var
                dosisType = (activity.phDosisType ? _k.unwrap( activity.phDosisType ) : 'TEXT'),
                dosisStr = (activity.dosis ? _k.unwrap( activity.dosis ) : ''),
                phDosisMorning, phDosisAfternoon, phDosisEvening, phDosisNight;

            if( 'SCHEDULE' === dosisType ) {

                phDosisMorning = _k.unwrap( activity.phDosisMorning ) || '0';
                phDosisAfternoon = _k.unwrap( activity.phDosisAfternoon ) || '0';
                phDosisEvening = _k.unwrap( activity.phDosisEvening ) || '0';
                phDosisNight = _k.unwrap( activity.phDosisNight ) || '0';

                phDosisMorning = (!phDosisMorning || '' === phDosisMorning) ? '0' : phDosisMorning;
                phDosisAfternoon = (!phDosisAfternoon || '' === phDosisAfternoon) ? '0' : phDosisAfternoon;
                phDosisEvening = (!phDosisEvening || '' === phDosisEvening) ? '0' : phDosisEvening;
                phDosisNight = (!phDosisNight || '' === phDosisNight) ? '0' : phDosisNight;

                if( !+phDosisMorning && !+phDosisAfternoon && !+phDosisEvening && !+phDosisNight ) {
                    dosisStr = ' ';
                } else {
                    dosisStr = '' + phDosisMorning + '-' + phDosisAfternoon + '-' + phDosisEvening + '-' + phDosisNight;
                }

                /* alternative implementation - not currently used
                 dosisStr = Y.doccirrus.schemas.activity.getMedicationDosis( {
                 phDosisType: activity.phDosisType && _k.unwrap( activity.phDosisType ),
                 dosis: activity.dosis && _k.unwrap( activity.dosis ),
                 phDosisMorning: activity.phDosisMorning && _k.unwrap( activity.phDosisMorning ),
                 phDosisAfternoon: activity.phDosisAfternoon && _k.unwrap( activity.phDosisAfternoon ),
                 phDosisEvening: activity.phDosisEvening && _k.unwrap( activity.phDosisEvening ),
                 phDosisNight: activity.phDosisNight && _k.unwrap( activity.phDosisNight )
                 } );
                 */
            } else if( 'PAPER' === dosisType ) {
                dosisStr = prescriptionType === 'PRESCRBTM' ? PAPER_DOSIS_LONG2 : PAPER_DOSIS;
            }

            if( 'ASSISTIVE' === _k.unwrap( activity.actType ) ) {
                dosisStr = _k.unwrap( activity.assDose );
            }

            if( !dosisStr || '' === dosisStr ) {
                dosisStr = ' ';
            }
            return dosisStr.length && dosisStr !== ' ' ? ['>>', dosisStr, '<<'].join( '' ) : dosisStr;
        }

        /**
         *  Add date range for treatments
         */

        function addDateRange( formData, validTreatments ) {
            var i;

            if( 0 === validTreatments.length ) {
                formData.from = '';
                formData.to = '';
                return;
            }

            formData.from = -1;
            formData.to = -1;

            for( i = 0; i < validTreatments.length; i++ ) {
                formData.from = (-1 === formData.from) ? _k.unwrap( validTreatments[i].timestamp ) : formData.from;
                formData.to = (-1 === formData.to) ? _k.unwrap( validTreatments[i].timestamp ) : formData.to;

                formData.from = (_k.unwrap( validTreatments[i].timestamp < formData.from ) ? _k.unwrap( validTreatments[i].timestamp ) : formData.from);
                formData.to = (_k.unwrap( validTreatments[i].timestamp > formData.to ) ? _k.unwrap( validTreatments[i].timestamp ) : formData.to);
            }

            formData.from = moment.utc( formData.from ).local().format( 'DD.MM.YYYY' );
            formData.to = moment.utc( formData.to ).local().format( 'DD.MM.YYYY' );

        }

        /**
         * Swiss: returns units for prescribed medications depends on isDivisible value
         * @param isDivisible
         * @returns {string}
         */
        function getUnits( isDivisible, caseFolder ) {
            var sign = ' x ';
            if( Y.doccirrus.schemas.activity.CASE_FOLDER_TYPE_TO_COUNTRY_MAP[caseFolder.type || 'ANY'] === 'CH' ) {
                if( isDivisible === true ) {
                    sign = ' STK ';
                } else {
                    sign = ' OP ';
                }
            }
            return sign;
        }

        /**
         * Adds the diagnoses text to the form
         * @param formData {Object} the current form data
         * @param arr {Array} list of activities
         * @param options {Object} for now only used to pass "isReferralForm"
         */
        function addDiagnoses( formData, arr, options ) {
            var
                additional,
                i, diag,
                content,
                site;

            formData.diagnosesShort = '';
            formData.diagnosesText = '';
            formData.diagnosesTextDate = '';
            formData.diagnoses = '';
            formData.therapyText = '';

            if( arr && arr.length ) {

                // add diagnoses
                for( i = 0; i < arr.length; i++ ) {
                    if( arr[i] && 'DIAGNOSIS' === _k.unwrap( arr[i].actType ) &&
                        // MOJ-11762: exclude invalidated, and invalidating DIAGNOSES
                        !Y.doccirrus.schemas.activity.isInvalidatedOrInvalidatingDiagnosis( arr[i] ) ) {

                        additional = arr[i].diagnosisCert ? ' ' + Y.doccirrus.kbvcommonutils.mapDiagnosisCert( _k.unwrap( arr[i].diagnosisCert ) ) : '';
                        site = arr[i].diagnosisSite ? _k.unwrap( arr[i].diagnosisSite ) : '';
                        site = site.length ? ' ' + site[0] : '';  // just take the first letter
                        additional += site;
                        diag = _k.unwrap( arr[i].code ) + additional;
                        content = _k.unwrap( arr[i].userContent );

                        formData.diagnoses = formData.diagnoses + '**' +
                                             diag + '**: ' +
                                             content + '\n';

                        if( options && options.isReferralForm ) {
                            formData.referralDiagnosesText = (formData.diagnosesShort ?
                                    formData.diagnosesShort += ', ' + diag :
                                    formData.diagnosesShort += diag
                            );
                        } else {
                            formData.diagnosesShort = (formData.diagnosesShort ?
                                    formData.diagnosesShort += ', ' + diag :
                                    formData.diagnosesShort += diag
                            );
                        }
                        formData.diagnosesText = formData.diagnosesText + content +
                                                 (_k.unwrap( arr[i].explanations ) ? ' B: ' + _k.unwrap( arr[i].explanations ) : '') + '\n';

                        formData.diagnosesTextDate = formData.diagnosesTextDate + content +
                                                     (_k.unwrap( arr[i].explanations ) ? ' B: ' + _k.unwrap( arr[i].explanations ) : '') + ' ' +
                                                     moment( _k.unwrap( arr[i].timestamp ) ).format( 'DD.MM.YYYY' ) +
                                                     '\n';

                        Y.log( 'DIAG /// Adding ' + diag + '  /// ' + content, 'debug', NAME );
                    } else if( arr[i] && 'THERAPY' === _k.unwrap( arr[i].actType ) ) {
                        content = _k.unwrap( arr[i].content );
                        formData.therapyText += (content + '\n');
                    }
                }
            }

        }

        addFormMapper( {
            name: 'addLastEditor',
            group: ['lastEditor', 'lastEditorinitials'],
            fn: function( formData, config ) {
                var
                    activity = config.context.activity || {},
                    editor = ((activity.editor && activity.editor[0]) ? activity.editor[0] : null);

                formData.editorName = '';
                formData.editorInitials = '';

                if( editor ) {
                    formData.editorName = editor.name;
                    formData.editorInitials = editor.initials;
                }
            }
        } );

        addFormMapper( {
            name: 'addGravidogrammFields',
            group: [
                'fetuses',
                'initialWeight',
                'pevlivcMeasurementSP25',
                'pevlivcMeasurementCR28',
                'pevlivcMeasurementTR31',
                'pevlivcMeasurementC20',
                'rubellaTiter',
                'antibody1',
                'antibody2',
                'HBsAg',
                'syphillis',
                'toxoplasmosis',
                'HIV',
                'chlamidia',
                'glucoseTolerance'
            ],
            linkedGroup: [],
            allowedActTypes: ['GRAVIDOGRAMM'],
            fn: function( formData, config ) {
                var
                    activity = config.context.activity;

                //  numbers and strings in dashbooard
                formData.fetuses = _k.unwrap( activity.fetuses ) || '';
                formData.initialWeight = _k.unwrap( activity.initialWeight ) || '';
                formData.pelvicMeasurementSP25 = _k.unwrap( activity.pelvicMeasurementSP25 ) || '';
                formData.pelvicMeasurementCR28 = _k.unwrap( activity.pelvicMeasurementCR28 ) || '';
                formData.pelvicMeasurementTR31 = _k.unwrap( activity.pelvicMeasurementTR31 ) || '';
                formData.pelvicMeasurementC20 = _k.unwrap( activity.pelvicMeasurementC20 ) || '';
                formData.glucoseTolerance = _k.unwrap( activity.glucoseTolerance ) || '';

                //  boolean values in dashboard
                formData.rubellaTiter = _k.unwrap( activity.rubellaTiter ) ? 'pos' : 'neg';
                formData.antibody1 = _k.unwrap( activity.antibody1 ) ? 'pos' : 'neg';
                formData.antibody2 = _k.unwrap( activity.antibody2 ) ? 'pos' : 'neg';
                formData.HBsAg = _k.unwrap( activity.HBsAg ) ? 'pos' : 'neg';
                formData.syphillis = _k.unwrap( activity.syphillis ) ? 'pos' : 'neg';
                formData.toxoplasmosis = _k.unwrap( activity.toxoplasmosis ) ? 'pos' : 'neg';  //  Immunity?
                formData.HIV = _k.unwrap( activity.HIV ) ? 'pos' : 'neg';
                formData.chlamidia = _k.unwrap( activity.chlamidia ) ? 'pos' : 'neg';
            }
        } );

        /**
         *  Add rows to gravidogrmm table, content of MEDDATA from link GRAVIDOGRAMMPROCESS activities
         */

        addFormMapper( {
            name: 'addGravidogrammTable',
            group: [
                'gravidogrammTable'
            ],
            linkedGroup: [
                'gravidogrammTable'
            ],
            allowedActTypes: ['GRAVIDOGRAMM'],
            fn: function( formData, config ) {
                var
                    items = [],
                    activity = config.context.activity,
                    GravidogrammDataTypes = Y.doccirrus.schemas.v_meddata.gravidogrammDataTypes,
                    MedDataItemTemplateCollection = Y.doccirrus.schemas.tag.MedDataItemTemplateCollection,

                    // initialize a default collection (this is enough, as no custom tags need to be loaded)
                    medDataItemTemplateCollection = new MedDataItemTemplateCollection( {} ),
                    activities = Y.dcforms.mapper.objUtils.getAllLinkedActivities( activity ),
                    duplicatedTypes = [
                        GravidogrammDataTypes.UTERINE_DISTANCE,
                        GravidogrammDataTypes.FOETAL_POSITION,
                        GravidogrammDataTypes.HEARTBEAT_PRESENT,
                        GravidogrammDataTypes.MOVEMENT_PRESENT
                    ];

                if( Array.isArray( activities ) ) {
                    activities.forEach( function forEachActivity( activity ) {
                        var
                            timestampOfActivity,
                            item,
                            medDataItems;

                        if( activity && activity.actType === 'GRAVIDOGRAMMPROCESS' && Array.isArray( activity.medData ) ) {
                            timestampOfActivity = _k.unwrap( activity.timestamp );
                            item = {
                                '_id': _k.unwrap( activity._id ),
                                'date': moment( timestampOfActivity ).format( 'DD.MM.YYYY' )
                            };
                            medDataItems = activity.medData;

                            // store simple types inside the array (values and textValues)
                            medDataItems.forEach( function forEachMedDataItem( medDataItem ) {

                                var
                                    type = medDataItem.type,
                                    // get corresponding medDataItemConfig from MedDataItemTemplateCollection
                                    medDataItemConfig = medDataItemTemplateCollection.getMedDataItemConfigSchemaForMedDataItem( {
                                        medDataItem: medDataItem,
                                        timestamp: timestampOfActivity
                                    } ),
                                    formattedValue = medDataItemConfig.formatMedDataItemForPDF( medDataItem );

                                // store the formatted value or an empty string
                                item[type] = typeof formattedValue === "string" ? formattedValue : "";

                                // special handling of THERAPY type => add text to footer
                                if( type === GravidogrammDataTypes.THERAPY ) {
                                    item._tableRowFooter = medDataItem.textValue;
                                }

                            } );

                            //  where the patient is pregnant with more than one child, the measurements are comma separated
                            //  in the same table column for all fetuses (all are text values)
                            duplicatedTypes.forEach( function forEachDuplicatedType( duplicateType ) {
                                var matches = [];
                                medDataItems.forEach( function forEachMedDataItem( medDataItem ) {

                                    var
                                        medDataItemConfig,
                                        formattedValue;

                                    if( typeof medDataItem.type === "string" && medDataItem.type.indexOf( duplicateType ) === 0 ) {

                                        // get corresponding medDataItemConfig from MedDataItemTemplateCollection
                                        medDataItemConfig = medDataItemTemplateCollection.getMedDataItemConfigSchemaForMedDataItem( {
                                            medDataItem: medDataItem,
                                            timestamp: timestampOfActivity
                                        } );
                                        formattedValue = medDataItemConfig.formatMedDataItemForPDF( medDataItem );

                                        // push a valid formatted value
                                        if( typeof formattedValue === "string" ) {
                                            matches.push( formattedValue );
                                        }

                                    }

                                } );

                                // overwrite the root-type with the list of types
                                item[duplicateType] = matches.join( ', ' );
                            } );

                            items.push( item );
                        }
                    } );
                }

                formData.gravidogrammTable = items;
            }
        } );

        // Table of scheduled checkups for a child, table on text tabl of CHECKUPPLAN activities MOJ-9465
        addFormMapper( {
            name: 'setupCheckupPlanTable',
            group: ['checkupPlanTable'],
            linkedGroup: ['checkupPlanTable'],
            allowedActTypes: ['CHECKUPPLAN'],
            fn: function( formData, config ) {
                var
                    activity = config.context.activity,
                    examinations = (activity.examinations ? _k.unwrap( activity.examinations ) : []),
                    exam, i;

                formData.checkupPlanTable = [];

                //  format and collect dates for UI
                for( i = 0; i < examinations.length; i++ ) {
                    exam = {
                        'stage': _k.unwrap( examinations[i].stage ),
                        'plannedFrom': _k.unwrap( examinations[i].plannedFrom ),
                        'plannedTo': _k.unwrap( examinations[i].plannedTo ),
                        'toleranceFrom': _k.unwrap( examinations[i].toleranceFrom ),
                        'toleranceTo': _k.unwrap( examinations[i].toleranceTo ),
                        'completed': _k.unwrap( examinations[i].completed ),
                        'completedShort': ''
                    };

                    exam.plannedFromShort = moment( exam.plannedFrom ).format( TIMESTAMP_FORMAT );
                    exam.plannedToShort = moment( exam.plannedTo ).format( TIMESTAMP_FORMAT );
                    exam.toleranceFromShort = moment( exam.toleranceFrom ).format( TIMESTAMP_FORMAT );
                    exam.toleranceToShort = moment( exam.toleranceTo ).format( TIMESTAMP_FORMAT );

                    if( exam.completed ) {
                        exam.completedShort = moment( exam.completed ).format( TIMESTAMP_FORMAT );
                    }

                    //  special case for first appointment
                    if( 'U1' === exam.stage ) {
                        exam.plannedDates = '' +
                                            i18n( 'activity-schema.CheckupPlanItem_T.plannedFrom.i18n' ) + ': ' +
                                            exam.plannedFromShort;

                        exam.toleranceDates = '' +
                                              i18n( 'activity-schema.CheckupPlanItem_T.plannedFrom.i18n' ) + ': ' +
                                              exam.toleranceFromShort;

                    } else {
                        exam.plannedDates = '' +
                                            i18n( 'activity-schema.CheckupPlanItem_T.plannedFrom.i18n' ) + ': ' +
                                            exam.plannedFromShort + ' ' +
                                            i18n( 'activity-schema.CheckupPlanItem_T.plannedTo.i18n' ) + ': ' +
                                            exam.plannedToShort;

                        exam.toleranceDates = '' +
                                              i18n( 'activity-schema.CheckupPlanItem_T.toleranceFrom.i18n' ) + ': ' +
                                              exam.toleranceFromShort + ' ' +
                                              i18n( 'activity-schema.CheckupPlanItem_T.toleranceTo.i18n' ) + ': ' +
                                              exam.toleranceToShort;
                    }

                    formData.checkupPlanTable.push( exam );
                }
            }

        } );

        function setUpTableBindings( formData ) {
            formData.findingsTable = [];
            formData.findingsTableST = [];
            formData.findingsTableNST = [];

            formData.historiesTable = [];
            formData.medicationsTable = [];
            formData.treatmentsTable = [];
            formData.diagnosesTable = [];
            formData.utilitiesTable = [];
            formData.communicationsTable = [];
            formData.assistivesTable = [];
            formData.proceduresTable = [];
            formData.processesTable = [];
            formData.therapyTable = [];
            formData.therapyStepsTable = [];
            formData.formsTable = [];
            formData.docletterDiagnosisTable = [];
            formData.tonometryAll = '';
            formData.refractionAll = '';
            formData.utilitiesAll = '';

            formData.linkedActivitiesTable = [];

            return formData;
        }

        // was onTreatment in docletter
        addFormMapper( {
            name: 'setupTables',
            group: [
                'findingsTable',
                'findingsTableST',
                'findingsTableNST',
                'processesTable',
                'historiesTable',
                'medicationsTable',
                'treatmentsTable',
                'diagnosesTable',
                'utilitiesTable',
                'assistivesTable',
                'communicationsTable',
                'therapyTable',
                'therapyStepsTable',
                'therapyText',
                'proceduresTable',
                'formsTable',
                'docletterDiagnosisTable',
                'linkedActivitiesTable',
                'tonometryAll',
                'refractionAll',
                'utilitiesAll',
                'diagnoses',
                'diagnosesText',
                'diagnosesTextDate',
                'diagnosesShort',
                'from',
                'to'
            ],
            linkedGroup: [
                'findingsTable',
                'findingsTableST',
                'findingsTableNST',
                'processesTable',
                'historiesTable',
                'medicationsTable',
                'treatmentsTable',
                'diagnosesTable',
                'utilitiesTable',
                'assistivesTable',
                'communicationsTable',
                'therapyTable',
                'therapyStepsTable',
                'therapyText',
                'proceduresTable',
                'formsTable',
                'docletterDiagnosisTable',
                'linkedActivitiesTable',
                'tonometryAll',
                'refractionAll',
                'utilitiesAll',
                'diagnoses',
                'diagnosesText',
                'diagnosesTextDate',
                'diagnosesShort',
                'from',
                'to',
                'orSphR',
                'orCylR',
                'orAxsR',
                'orAddR',
                'orPsmR',
                'orBasR',
                'orSphL',
                'orCylL',
                'orAxsL',
                'orAddL',
                'orPsmL',
                'orBasL',
                'orHSA'
            ],
            fn: function( formData, config ) {

                var
                    ok,
                    activity,
                    i,
                    validTreatments = [],
                    activities = Y.dcforms.mapper.objUtils.getAllLinkedActivities( config.context.activity ),
                    utRemedyItems = [];

                formData = setUpTableBindings( formData );

                addDiagnoses( formData, activities );

                //  add items
                for( i = 0; i < activities.length; i++ ) {

                    activity = activities[i];
                    ok = true;

                    if( Y.config.debug ) {
                        Y.log( 'Adding activity: ' + _k.unwrap( activity.actType ), 'debug', NAME );
                    }

                    if(
                        (activity._id) &&
                        (activity.actType)
                    ) {

                        addItem( formData.linkedActivitiesTable, activity );

                        switch( _k.unwrap( activity.actType ) ) {
                            case 'FINDING': /* nobreak */
                            case 'OBSERVATION':
                                addItem( formData.findingsTable, activity );

                                //  special for Schneider, add separate tables for findings with and without subType
                                if( _k.unwrap( activity.subType ) && '' !== _k.unwrap( activity.subType ) ) {
                                    addItem( formData.findingsTableST, activity );
                                } else {
                                    addItem( formData.findingsTableNST, activity );
                                }

                                break;
                            case 'HISTORY':
                            case 'EXTERNAL':
                            case 'FROMPATIENT':
                                addItem( formData.historiesTable, activity );
                                break;
                            case 'DIAGNOSIS':
                                // MOJ-11762: exclude invalidated, and invalidating DIAGNOSES
                                if( !Y.doccirrus.schemas.activity.isInvalidatedOrInvalidatingDiagnosis( activity ) ) {
                                    addItem( formData.diagnosesTable, activity );
                                }
                                break;
                            case 'UTILITY':
                                utRemedyItems.push( _k.unwrap( activity.utRemedy1Item ) );
                                utRemedyItems.push( _k.unwrap( activity.utRemedy2Item ) );
                                addItem( formData.utilitiesTable, activity );
                                break;
                            case 'ASSISTIVE':
                                addItem( formData.assistivesTable, activity );
                                break;
                            case 'PROCEDERE':
                                addItem( formData.proceduresTable, activity );
                                break;
                            case 'MEDICATION':
                                addItem( formData.medicationsTable, activity, config.context.caseFolder );
                                break;
                            case 'TREATMENT':
                                addItem( formData.treatmentsTable, activity );
                                break;
                            case 'COMMUNICATION':
                                addItem( formData.communicationsTable, activity );
                                break;
                            case 'THERAPY':
                                addItem( formData.therapyTable, activity );
                                break;
                            case 'THERAPYSTEP':
                                addItem( formData.therapyStepsTable, activity );
                                break;
                            case 'PROCESS':
                                addItem( formData.processesTable, activity );
                                break;
                            case 'FORM':
                                addItem( formData.formsTable, activity );
                                break;
                            case 'DOCLETTERDIAGNOSIS':
                                addItem( formData.docletterDiagnosisTable, activity );
                                break;
                            case 'OPHTHALMOLOGY_TONOMETRY':
                                formData.tonometryAll = _k.unwrap( activity.content );
                                break;
                            case 'OPHTHALMOLOGY_REFRACTION':
                                formData.refractionAll = _k.unwrap( activity.content );
                                // add ophthalmology
                                Y.dcforms.mapper.objUtils.getOpthalmology( formData, activity );
                                break;
                            default:
                                ok = false;
                        }

                        if( ok ) {
                            validTreatments.push( activity );
                        }

                    } else {
                        if( Y.config.debug ) {
                            Y.log( 'Invalid item(s) in activity table: ' + _k.unwrap( activity.actType ), 'warn', NAME );
                        }
                    }
                }
                if( utRemedyItems.length ) {
                    formData.utilitiesAll = utRemedyItems.filter( Boolean ).join( ', ' );
                }
                //  add date ranges for treatment
                addDateRange( formData, validTreatments );

            }
        } );

        /**
         * Compares the automatically displayed (on "Text" tab) diagnoses text with the one the user has added
         * @param formData
         * @param diagnosesText
         * @returns {boolean}
         */
        function automaticDiagnoseTextAndCustomDiagnoseTextAreDifferent( formData, diagnosesText ) {
            var
                diagnosesLongBC = formData && formData.diagnosesLongBC && formData.diagnosesLongBC.replace( /\s\s/g, " " );
            diagnosesText = diagnosesText && diagnosesText.replace( /\s\s/g, " " );
            return diagnosesLongBC !== diagnosesText;
        }

        /**
         * mapper used for referral form
         *
         * ensure that the referral forms have their diagnosesShort text area (before
         * inSuite v.4.8) as referralDiagnosesText (see InCase_T.common.js for label reference)
         */
        addFormMapper( {
            name: 'updateReferralForm',
            group: [
                "referralDiagnosesText"
            ],
            linkedGroup: [],
            fn: function( formData, config ) {
                var
                    diagnosesText = _k.unwrap( config.context.activity.diagnosesText ),
                    activities;
                if( automaticDiagnoseTextAndCustomDiagnoseTextAreDifferent( formData, diagnosesText ) ) {
                    formData.referralDiagnosesText = diagnosesText;
                } else {
                    activities = Y.dcforms.mapper.objUtils.getAllLinkedActivities( config.context.activity );
                    formData = setUpTableBindings( formData );
                    addDiagnoses( formData, activities, {isReferralForm: true} );
                }
            }
        } );

        addFormMapper( {
            name: 'addGravidogrammData',
            group: ['gd'],
            linkedGroup: ['gd'],
            allowedActTypes: ['GRAVIDOGRAMM'],
            fn: function( formData, config ) {
                var
                    activities = Y.dcforms.mapper.objUtils.getAllLinkedActivities( config.context.activity ),
                    medData,
                    tempItem,
                    i, j;

                for( i = 0; i < activities.length; i++ ) {
                    if( activities[i].actType === 'GRAVIDOGRAMMPROCESS' ) {
                        tempItem = {'content': activities[i].userContent};
                        medData = activities[i].medData;

                        for( j = 0; j < medData.length; i++ ) {
                            tempItem[medData.type] = medData.textValue || medData.value;
                        }

                        formData.gd.push( tempItem );
                    }
                }

            }
        } );

        addFormMapper( {
            name: 'addPatientBankDetails',
            group: [
                'bankName',
                'trial',
                'bankIBAN',
                'bankBIC',
                'accountOwner'
            ],
            fn: function( formData, config ) {
                var patient = config.context.patient,
                    accounts = _k.unwrap( patient.accounts ),
                    account;

                if( accounts && accounts[0] ) {
                    account = accounts[0];
                    formData.bankName = _k.unwrap( account.bankName );
                    formData.trial = _k.unwrap( account.trial );
                    formData.bankIBAN = _k.unwrap( account.bankIBAN );
                    formData.bankBIC = _k.unwrap( account.bankBIC );
                    formData.accountOwner = _k.unwrap( account.accountOwner );
                }
            }
        } );

        function mapReceiverAndAddressData( formData, billingAddress ) {
            //  default receiver to patient name if no billing address or no receiver specified
            var talk, title, displayname;

            formData.receiver = '' +
                                formData.talk + ' ' +
                                formData.title + ' ' +
                                formData.displayname;

            if( billingAddress && 'organization' === _k.unwrap( billingAddress.payerType ) && _k.unwrap( billingAddress.receiver ) ) {
                formData.receiver = _k.unwrap( billingAddress.receiver );
                formData.address = getAddressAsString( billingAddress );
                formData.billingAddressAndType = getAddressAsString( billingAddress );
                formData.billingAddressType = i18n( 'person-schema.Address_T.organization' );
            } else if( billingAddress && 'person' === _k.unwrap( billingAddress.payerType ) ) {
                talk = Y.doccirrus.schemaloader.translateEnumValue( '-de', _k.unwrap( billingAddress.talk ), Y.doccirrus.schemas.person.types.Talk_E.list, 'k.A.' );
                title = _k.unwrap( billingAddress.title ) || '';
                displayname = _k.unwrap( billingAddress.firstname ) + ' ' + _k.unwrap( billingAddress.lastname );

                formData.receiver = talk + ' ' + title + ' ' + displayname;
                formData.address = getAddressAsString( billingAddress );
                formData.billingAddressAndType = getAddressAsString( billingAddress );
                formData.billingAddressType = i18n( 'person-schema.Address_T.person' );
            }

            formData.receiver = formData.receiver.replace( new RegExp( ' {2}', 'g' ), ' ' );
        }

        addFormMapper( {
            name: 'addInvoiceData',
            group: [
                'invoiceNo',
                'patientId',
                'receiver'
            ],
            deps: ['setupFormdataPatient'],
            allowedActTypes: ['INVOICE', 'QUOTATION', 'RECEIPT'],
            fn: function( formData, config ) {
                var patient = config.context.patient,
                    activity = config.context.activity,
                    billingAddress = getAddressByKind( patient, KIND_BILLING );

                // invoice special fields
                formData.invoiceNo = '' + (_k.unwrap( activity.invoiceNo ) || '---');
                formData.patientId = _k.unwrap( patient.patientNo || '' ) || '';

                mapReceiverAndAddressData( formData, billingAddress );
            }
        } );

        /**
         *  Generate mappings for set of linked activities (treatments, total, date range, etc)
         *
         *  Note: now also allowing diagnosis types, not used in table but to use in ICDs string
         *
         *  @param  formData    {Object}    Bound fields processed so far - fields will be added to this
         *  @return             {Object}    Expanded formData
         */
        addFormMapper( {
            name: 'processInvoiceLinkedActivities',
            group: [
                'diagnoses',
                'diagnosesText',
                'diagnosesTextDate',
                'scheinDiagnosis',
                'scheinOrder',
                'items',
                'itemsDesc',
                'itemsAll',
                'itemsAllDesc',
                'itemsAPKCode',
                'itemsAPKCodeDesc',
                'itemsCode',
                'currency',
                //  with currency symbol
                'beforetax',
                'vat',
                'vatList',
                'totalDoc',
                'totalExpense',
                'totalWithoutExpenses',
                'totalWithoutSundries',
                'total75',
                'total25',
                'total15',
                'total',
                'totalOwing',
                'totalASK',
                'totalBSK',
                'totalAHB',
                'totalBHB',
                //  without currency symbol, EXTMOJ-2091
                "beforetaxPlain",
                "vatPlain",
                "totalDocPlain",
                "total75Plain",
                "total25Plain",
                "total15Plain",
                "totalReceiptsPlain",
                "totalPenaltiesPlain",
                "totalReceiptsOutstandingPlain",
                "totalOwingPlain",
                "totalPlain",
                "totalExpensePlain",
                "totalASKPlain",
                "totalBSKPlain",
                "totalAHBPlain",
                "totalBHBPlain",
                "totalWithoutSundriesPlain",
                'from',
                'to'
            ],
            linkedGroup: [
                'diagnoses',
                'diagnosesText',
                'diagnosesTextDate',
                'scheinDiagnosis',
                'scheinOrder',
                'items',
                'itemsDesc',
                'itemsAll',
                'itemsAllDesc',
                'itemsAPKCode',
                'itemsAPKCodeDesc',
                'itemsCode',
                'currency',
                //  with currency symbol
                'beforetax',
                'vat',
                'vatList',
                'totalDoc',
                'totalExpense',
                'totalWithoutExpenses',
                'totalWithoutSundries',
                'total75',
                'total25',
                'total15',
                'total',
                'totalOwing',
                'totalASK',
                'totalBSK',
                'totalAHB',
                'totalBHB',
                //  without currency symbol, EXTMOJ-2091
                "beforetaxPlain",
                "vatPlain",
                "totalDocPlain",
                "total75Plain",
                "total25Plain",
                "total15Plain",
                "totalReceiptsPlain",
                "totalPenaltiesPlain",
                "totalReceiptsOutstandingPlain",
                "totalOwingPlain",
                "totalPlain",
                "totalExpensePlain",
                "totalASKPlain",
                "totalBSKPlain",
                "totalAHBPlain",
                "totalBHBPlain",
                "totalWithoutSundriesPlain",
                'from',
                'to'
            ],
            deps: [
                'setAdditionalFormData'
            ],
            allowedActTypes: ['INVOICE', 'QUOTATION'],
            fn: function processLinkedActivities( formData, config ) {
                var
                    currentActivity = config.context.activity,
                    currentCaseFolder = config.context.caseFolder,
                    caseFolderType = (currentCaseFolder ? currentCaseFolder.type : null),

                    treatments = Y.dcforms.mapper.objUtils.getAllLinkedActivities( currentActivity ),
                    validTreatments = [],           //  to update current selection if bad entries chosen [array]
                    tableRows = [],
                    tableRowsReverse,
                    vatList = {},
                    treatment,
                    ttmp,
                    vat = 0,
                    vatPerc,
                    vatType,
                    hasVat,

                    lastDate = '',
                    thisDate = '',
                    showDate = '',

                    scheinOrder = {},
                    scheinDiagnosis = {},
                    longDescription,

                    materialCostId = null,
                    exASK, exBSK, exAHB, exBHB,
                    isExpense,
                    price,
                    i,
                    diagnosisHashes = {};

                // MOJ-10817: remove duplicated diagnoses
                function diagnosisMapped( diag ) {
                    var diagHash = [
                        diag.code, diag.userContent, diag.explanations, diag.diagnosisCert,
                        diag.diagnosisDerogation, diag.diagnosisSite, diag.diagnosisTreatmentRelevance,
                        diag.diagnosisType
                    ].map( function( str ) {
                        if( typeof str !== 'string' ) {
                            return '';
                        }
                        return str.trim();
                    } ).join();
                    if( diagnosisHashes[diagHash] === true ) {
                        return true;
                    }
                    diagnosisHashes[diagHash] = true;
                    return false;
                }

                //  ensure currency is set
                mapCaseFolderData( formData, config.context.caseFolder );

                //  add items
                formData.diagnoses = '';
                formData.diagnosesText = '';
                formData.diagnosesTextDate = '';

                //  add all treatments to table

                for( i = 0; i < treatments.length; i++ ) {

                    treatment = treatments[i];

                    if( Y.config.debug ) {
                        Y.log( 'Adding activity: ' + _k.unwrap( treatment.actType ), 'info', NAME );
                    }

                    if(
                        (treatment._id) &&
                        (treatment.actType) &&
                        (
                            ('TREATMENT' === _k.unwrap( treatment.actType )) ||
                            ('DIAGNOSIS' === _k.unwrap( treatment.actType )) ||
                            ('MEDICATION' === _k.unwrap( treatment.actType ))
                        )
                    ) {

                        price = treatment.price ? _k.unwrap( treatment.price ) : 0.00;
                        price = +(parseFloat( price ));

                        if( 'MEDICATION' === _k.unwrap( treatment.actType ) ) {
                            price = treatment.phPriceSale ? _k.unwrap( treatment.phPriceSale ) : 0.00;
                            price = +(parseFloat( price ));
                        }

                        exASK = 0;          //  general material expenses / allgemeinkosten
                        exBSK = 0;          //  special material expenses / besondere kosten
                        exAHB = 0;          //
                        exBHB = 0;          //
                        isExpense = false;  //

                        // vat is a vat code, we still need to calculate the amount
                        hasVat = _k.unwrap( treatment.hasVat );
                        vatType = hasVat ? (treatment.vat ? _k.unwrap( treatment.vat ) : 0) : 0;
                        // keep track of the different subtotals by VAT type
                        if( vatList[vatType] ) {
                            vatList[vatType] = vatList[vatType] + price;
                        } else {
                            vatList[vatType] = price;
                        }
                        vatType = +vatType; // this is now the vatType code as a number
                        // get percent from code
                        vatPerc = Y.doccirrus.vat.getPercent( vatType ) + '%';
                        // get amount from code
                        vat = Y.doccirrus.vat.calculateAmt( price, vatType );

                        if( 'TREATMENT' === _k.unwrap( treatment.actType ) || 'MEDICATION' === _k.unwrap( treatment.actType ) ) {

                            ttmp = _k.unwrap( treatment.scheinOrder );
                            if( ttmp ) {
                                scheinOrder[ttmp] = true;
                            }

                            //  disgnosis in schein
                            ttmp = _k.unwrap( treatment.scheinDiagnosis );
                            if( ttmp ) {
                                scheinDiagnosis[ttmp] = true;
                            }

                            //  material costs and tarifvertrag
                            exBSK = _k.unwrap( treatment.BSK ) || 0;
                            exASK = _k.unwrap( treatment.ASK ) || 0;
                            exAHB = _k.unwrap( treatment.AHB ) || 0;
                            exBHB = _k.unwrap( treatment.BHB ) || 0;

                            if( 'PRIVATE' === caseFolderType || 'SELFPAYER' === caseFolderType ) {
                                if( treatment.costType && _k.unwrap( treatment.costType ) && '' !== _k.unwrap( treatment.costType ) ) {
                                    isExpense = true;
                                }
                            }

                            //  group dates
                            thisDate = moment.utc( _k.unwrap( treatment.timestamp ) ).local().format( 'DD.MM.YYYY' );

                            if( lastDate === thisDate ) {
                                showDate = '';
                            } else {
                                lastDate = thisDate;
                                showDate = thisDate;
                            }

                            if( _k.unwrap( treatment.costType ) && treatment.activities.length ) {
                                materialCostId = treatment.activities[0];
                            } else {
                                materialCostId = null;
                            }

                            longDescription = breakLongStrings( _k.unwrap( treatment.content ) || '' );
                            if( treatment.explanations && _k.unwrap( treatment.explanations ) && '' !== _k.unwrap( treatment.explanations ) ) {
                                longDescription = breakLongStrings( _k.unwrap( treatment.content ) + ', ' + _k.unwrap( treatment.explanations ) );
                            }

                            //  Must match InvoiceItem_T.reduced.json
                            tableRows.push( {
                                'activityId': _k.unwrap( treatment._id ),
                                'item': breakLongStrings( _k.unwrap( treatment.content ) || '' ),
                                'code': !_k.unwrap( treatment.costType ) ? _k.unwrap( treatment.code ) : '',
                                'tariffCode': _k.unwrap( treatment.phGTIN ) ? _k.unwrap( treatment.phGTIN ) : '',
                                'unit': treatment.unit ? _k.unwrap( treatment.unit ) : 1,
                                'factor': treatment.billingFactorValue ? _k.unwrap( treatment.billingFactorValue ).toString().replace( '.', ',' ) : 1,
                                'quantity': 1,
                                'costUnformatted': price,
                                'vatUnformatted': vat,
                                'vatPerc': vatPerc,
                                'timestamp': _k.unwrap( treatment.timestamp ),
                                'date': moment.utc( _k.unwrap( treatment.timestamp ) ).local().format( 'DD.MM.YYYY' ),
                                'dateCopy': moment.utc( _k.unwrap( treatment.timestamp ) ).local().format( 'DD.MM.YYYY' ),
                                'time': _k.unwrap( treatment.time ) || '',
                                'dateTime': '',
                                'extraBSKraw': exBSK,
                                'extraASKraw': exASK,
                                'extraAHBraw': exAHB,
                                'extraBHBraw': exBHB,

                                //  with currency symbol
                                'cost': Y.doccirrus.comctl.numberToLocalCurrency( price, true, formData.currency ),
                                'costperitem': Y.doccirrus.comctl.numberToLocalCurrency( price, true, formData.currency ),
                                'vat': vat ? Y.doccirrus.comctl.numberToLocalCurrency( vat, true, formData.currency ) : '',

                                'extraBSK': Y.doccirrus.comctl.numberToLocalCurrency( exBSK, true, formData.currency ),
                                'extraASK': Y.doccirrus.comctl.numberToLocalCurrency( exASK, true, formData.currency ),
                                'extraAHB': Y.doccirrus.comctl.numberToLocalCurrency( exAHB, true, formData.currency ),
                                'extraBHB': Y.doccirrus.comctl.numberToLocalCurrency( exBHB, true, formData.currency ),

                                //  without currency symbol, EXTMOJ-2091
                                'costPlain': Y.doccirrus.comctl.numberToLocalString( price ),
                                'costperitemPlain': Y.doccirrus.comctl.numberToLocalString( price ),
                                'vatPlain': vat ? Y.doccirrus.comctl.numberToLocalString( vat ) : '',

                                'extraBSKPlain': Y.doccirrus.comctl.numberToLocalString( exBSK ),
                                'extraASKPlain': Y.doccirrus.comctl.numberToLocalString( exASK ),
                                'extraAHBPlain': Y.doccirrus.comctl.numberToLocalString( exAHB ),
                                'extraBHBPlain': Y.doccirrus.comctl.numberToLocalString( exBHB ),

                                'explanations': _k.unwrap( treatment.explanations ),
                                'daySeparation': _k.unwrap( treatment.daySeparation ),
                                'docName': _k.unwrap( treatment.employeeName ),
                                'practiceName': getLocName( _k.unwrap( treatment.locationId ) ),
                                'isHidden': false,
                                'materialCostId': materialCostId,
                                'linkedActivities': _k.unwrap( treatment.activities || [] ),
                                'longDescription': longDescription,
                                'markExpenses': isExpense ? '*' : '',   //  MOJ-8355. * indicates Sachkosten / Auslagen
                                'medicalScalingFactor': _k.unwrap( treatment.medicalScalingFactor ),
                                'technicalScalingFactor': _k.unwrap( treatment.technicalScalingFactor ),
                                'medicalTaxPoints': calculateMedicalTaxPointsForSwiss( _k.unwrap( treatment ) ),
                                'technicalTaxPoints': calculateTechnicalTaxPointsForSwiss( _k.unwrap( treatment ) ),
                                'assistanceTaxPoints': _k.unwrap( treatment.assistanceTaxPoints ),
                                'taxPointValue': _k.unwrap( treatment.taxPointValue )
                            } );

                            validTreatments.push( treatment );

                        }

                        if( 'DIAGNOSIS' === _k.unwrap( treatment.actType ) &&
                            !diagnosisMapped( treatment ) &&
                            // MOJ-11762: exclude invalidated, and invalidating DIAGNOSES
                            !Y.doccirrus.schemas.activity.isInvalidatedOrInvalidatingDiagnosis( treatment ) ) {

                            //  used to build diagnosis field
                            //Y.log('Adding DIAGNOSIS: ' + JSON.stringify(treatment, undefined, 2), 'debug', NAME);

                            formData.diagnoses = formData.diagnoses + '**' +
                                                 _k.unwrap( treatment.code ) + '**: ' +
                                                 _k.unwrap( treatment.userContent ) + '\n';

                            formData.diagnosesText = formData.diagnosesText + _k.unwrap( treatment.userContent ) +
                                                     (_k.unwrap( treatment.explanations ) ?
                                                     ' B: ' + _k.unwrap( treatment.explanations ) :
                                                         '') +
                                                     '\n';

                            formData.diagnosesTextDate = formData.diagnosesTextDate + _k.unwrap( treatment.userContent ) +
                                                         (_k.unwrap( treatment.explanations ) ? ' B: ' + _k.unwrap( treatment.explanations ) : '') + ' ' +
                                                         moment( _k.unwrap( treatment.timestamp ) ).format( 'DD.MM.YYYY' ) +
                                                         '\n';

                            validTreatments.push( treatment );
                        }

                    } else {
                        if( Y.config.debug ) {
                            Y.log( 'Invalid item(s) in invoice treatments table: ' + _k.unwrap( treatment.actType ), 'warn', NAME );
                        }
                    }
                }

                //  add diagnoses

                formData.scheinDiagnosis = Object.keys( scheinDiagnosis ).join( ', ' );
                formData.scheinOrder = Object.keys( scheinOrder ).join( ', ' );

                tableRows = sortInvoiceRows( tableRows );           //  sort by date, oldest first  EXTMOJ-1702

                tableRowsReverse = copyTableRows( tableRows );      //  sort by date, newest first  MOJ-10364
                tableRowsReverse.reverse();

                tableRows = sortCostMaterialRows( tableRows );
                tableRows = addInvoiceRowsDateTime( tableRows );

                tableRowsReverse = sortCostMaterialRows( tableRowsReverse );
                tableRowsReverse = addInvoiceRowsDateTime( tableRowsReverse );

                addTreatmentDateRange( tableRows );

                formData.items = clearDuplicateDates( copyTableRows( tableRows ) );
                formData.items = rearrangeLinkedExpenses( formData.items );
                formData.items = makeCollapsedTable( formData.items );
                formData.items = addExplanations( formData.items );

                formData.itemsDesc = clearDuplicateDates( copyTableRows( tableRowsReverse ) );
                formData.itemsDesc = rearrangeLinkedExpenses( formData.itemsDesc );
                formData.itemsDesc = makeCollapsedTable( formData.itemsDesc );
                formData.itemsDesc = addExplanations( formData.itemsDesc );

                formData.itemsAll = rearrangeLinkedExpenses( copyTableRows( tableRows ) );
                formData.itemsAll = clearDuplicateDates( formData.itemsAll );

                formData.itemsAllDesc = rearrangeLinkedExpenses( copyTableRows( tableRowsReverse ) );
                formData.itemsAllDesc = clearDuplicateDates( formData.itemsAllDesc );

                formData.itemsAPKCode = sortByAPKAndCode( copyTableRows( tableRows ) );
                formData.itemsAPKCodeDesc = sortByAPKAndCode( copyTableRows( tableRowsReverse ) );

                formData.itemsCode = sortByCode( copyTableRows( tableRows ) );
                formData.itemsCode = rearrangeLinkedExpenses( formData.itemsCode );
                formData.itemsCode = makeCollapsedTable( formData.itemsCode );
                formData.itemsCode = addExplanations( formData.itemsCode );

                //  get location name given id
                function getLocName( locId ) {
                    var locName = '', i;
                    if( config.context.locations ) {
                        for( i = 0; i < config.context.locations.length; i++ ) {
                            if( config.context.locations[i]._id + '' === locId + '' ) {
                                locName = config.context.locations[i].locname;
                            }
                        }
                    }
                    return locName;
                }

                /**
                 * Rows must be sorted by timestamp.
                 * Rows are first groupes by APK (considering "Tagtrennung") and then sorts APK row by Code.
                 * At the end rows are flattened again.
                 * @param   {Object}    rows
                 * @returns {Array}
                 */
                function sortByAPKAndCode( rows ) {
                    var result = [],
                        apks = [];

                    rows.forEach( function( row ) {
                        var lastAPK = apks[apks.length - 1];

                        if( lastAPK && lastAPK.date === row.date && !row.daySeparation ) {
                            lastAPK.rows.push( row );
                        } else {
                            apks.push( {
                                date: row.date,
                                rows: [row]
                            } );
                        }
                    } );

                    apks.forEach( function( apk ) {
                        addExplanations( makeCollapsedTable( rearrangeLinkedExpenses( sortByCode( apk.rows ) ) ) ).forEach( function( row, idx ) {
                            if( 0 !== idx ) {
                                row.date = '';
                                row.dateTime = '';
                                row.dateCopy = '';
                            }
                            result.push( row );
                        } );
                    } );

                    return result;
                }

                function getSortIndex( _code ) {

                    var score = 0,
                        code = '',
                        valid,
                        isNumber = /^[0-9]$/gm,
                        isChar = /^[a-zA-Z]$/gm;

                    valid = _code.split( '' ).every( function( c, idx, arr ) {
                        if( 0 === idx && c.match( isChar ) ) {
                            score += c.charCodeAt( 0 ) * 100000000;
                            return true;
                        } else {
                            if( c.match( isNumber ) ) {
                                code += c;
                                return true;
                            }
                            if( idx + 1 === arr.length && c.match( isChar ) ) {
                                score += c.charCodeAt( 0 );
                                return true;
                            }
                        }

                        return false;
                    } );

                    return valid ? (score + (code ? parseInt( code, 10 ) : 0) * 100) : Number.MAX_VALUE;
                }

                /**
                 * Rows must be sorted by timestamp.
                 *
                 * Sorts Codes like:
                 *
                 *      100
                 *      100a
                 *      100b
                 *      A
                 *      A10
                 *      A10a
                 *      A10b
                 *      B20
                 *
                 * Codes that do not match this scheme will be at the end of the list.
                 *
                 * @param {Object}  rows
                 * @returns {Array}
                 */
                function sortByCode( rows ) {
                    rows.sort( function( a, b ) {
                        var comparableA = getSortIndex( a.code ),
                            comparableB = getSortIndex( b.code );
                        return comparableA - comparableB;

                    } );
                    return rows;
                }

                function rearrangeLinkedExpenses( rows ) {
                    var expenses = rows.filter( function( row ) {
                        return row.markExpenses;
                    } );
                    expenses.forEach( function( expense ) {
                        var row = rows.find( function( row ) {
                            return -1 < row.linkedActivities.indexOf( expense.activityId );
                        } );
                        var expenseIndex, rowIndex;
                        if( row ) {
                            expenseIndex = rows.indexOf( expense );
                            rows.splice( expenseIndex, 1 );
                            rowIndex = rows.indexOf( row );
                            rows.splice( rowIndex + 1, 0, expense );
                        }
                    } );

                    return rows;
                }

                //  deep copy of objects in table, prevent issue with date column for multiple sort orders
                function copyTableRows( rows ) {
                    var newTable = [], i;

                    for( i = 0; i < rows.length; i++ ) {
                        newTable.push( JSON.parse( JSON.stringify( rows[i] ) ) );
                    }

                    return newTable;
                }

                /**
                 * EXTMOJ-566
                 * @param {Array} rows array
                 * @returns {Array}
                 */
                function sortCostMaterialRows( rows ) {
                    var linkedToIndex = -1,
                        linkedToId,
                        tmpSplicedTreatment = null,
                        i, j;

                    function findLinkedTreatment( activityId ) {
                        return function( t ) {
                            return t.activityId === activityId;
                        };
                    }

                    for( i = 0; i < rows.length; i++ ) {
                        if( rows[i].materialCostId ) {
                            linkedToIndex = rows.findIndex( findLinkedTreatment( rows[i].materialCostId ) );
                            if( linkedToIndex !== -1 ) {
                                tmpSplicedTreatment = rows.splice( i, 1 )[0];
                                tmpSplicedTreatment.relocated = true;
                                rows.splice( linkedToIndex + 1, 0, tmpSplicedTreatment );
                            }
                        }
                    }

                    //  re-arrange rows for additional/special costs (like material costs, but specified by code)
                    //  look for any rows with isLinkedPercentageCode (= 5298 or 5298A) which link to this row

                    for( i = 0; i < rows.length; i++ ) {

                        linkedToId = rows[i].activityId;

                        //  run backwards through the rows to keep the dates in order
                        for( j = (rows.length - 1); j >= 0; j-- ) {

                            if(
                                !rows[j].relocated &&
                                Y.doccirrus.schemas.v_treatment.isLinkedPercentageCode( rows[j].code ) &&
                                (-1 !== rows[j].linkedActivities.indexOf( rows[i].activityId ))
                            ) {

                                //  then row j belongs to row i and should appear immediately after

                                tmpSplicedTreatment = rows.splice( j, 1 )[0];
                                tmpSplicedTreatment.relocated = true;

                                linkedToIndex = rows.findIndex( findLinkedTreatment( linkedToId ) );
                                rows.splice( linkedToIndex + 1, 0, tmpSplicedTreatment );

                                //  start again from the top
                                i = 0;
                            }

                        }

                    }

                    return rows;
                }

                //  sort and group rows by date, oldest first
                function sortInvoiceRows( rows ) {
                    function compareTs( a, b ) {
                        var
                            aTs = moment( a.timestamp ),
                            bTs = moment( b.timestamp );

                        if( aTs.isAfter( bTs ) ) {
                            return 1;
                        }

                        if( bTs.isAfter( aTs ) ) {
                            return -1;
                        }

                        return 0;
                    }

                    rows.sort( compareTs );
                    return rows;
                }

                //  add dateTime field where possible
                function addInvoiceRowsDateTime( toRows ) {
                    for( i = 0; i < toRows.length; i++ ) {
                        toRows[i].dateTime = tableRows[i].date + '';
                        if( '1' === toRows[i].quantity || 1 === toRows[i].quantity ) {
                            if( '' !== toRows[i].time ) {
                                toRows[i].dateTime = toRows[i].dateTime + ' (' + toRows[i].time + ')';
                            }
                        }
                    }
                    return toRows;
                }

                function clearDuplicateDates( rows ) {
                    lastDate = '';                          //  now run more than once
                    for( i = 0; i < rows.length; i++ ) {
                        thisDate = rows[i].date;

                        if( lastDate === thisDate ) {
                            showDate = '';
                        } else {
                            showDate = thisDate;
                        }

                        if( 0 === i ) {
                            showDate = rows[0].date;
                        }

                        rows[i].date = showDate;
                        lastDate = thisDate;
                    }
                    return rows;
                }

                function makeCollapsedTable( allRows ) {
                    //  collapse multiple instances of the same treatment on the same date into single row
                    for( i = 0; i < allRows.length; i++ ) {
                        allRows = collapseDuplicates( allRows[i], allRows );
                    }
                    allRows = removeHiddenRows( allRows );
                    return allRows;
                }

                function collapseDuplicates( treatment, fromRows ) {
                    if( treatment.isHidden ) {
                        return fromRows;
                    }

                    var j, row, toAdd = [];
                    for( j = 0; j < fromRows.length; j++ ) {
                        row = fromRows[j];

                        if(
                            (row.activityId !== treatment.activityId) &&
                            (row.dateCopy === treatment.dateCopy) &&
                            (row.code === treatment.code) &&
                            (row.factor === treatment.factor) &&
                            (row.cost === treatment.cost) &&
                            (row.time === treatment.time) &&
                            (row.item === treatment.item)
                        ) {
                            toAdd.push( row );
                            row.isHidden = true;
                            if( row.explanations && '' !== row.explanations ) {

                                if( !treatment.explanations ) {
                                    treatment.explanations = '';
                                }

                                //  add unique explanations only
                                if( -1 === treatment.explanations.indexOf( row.explanations ) ) {
                                    if( treatment.explanations && '' !== treatment.explanations ) {
                                        treatment.explanations = treatment.explanations + ', ';
                                    }

                                    treatment.explanations = treatment.explanations + row.explanations;
                                }

                            }

                            //  activity _id prevents update in editable tables, change to include collapsed rows, MOJ-10838
                            treatment.activityId = treatment.activityId + ', ' + row.activityId;
                        }
                    }

                    for( j = 0; j < toAdd.length; j++ ) {
                        row = toAdd[j];
                        treatment.quantity = parseFloat( treatment.quantity ) + parseFloat( row.quantity );

                        treatment.costUnformatted = parseFloat( treatment.costUnformatted ) + parseFloat( row.costUnformatted );
                        treatment.vatUnformatted = parseFloat( treatment.vatUnformatted ) + parseFloat( row.costUnformatted );

                        treatment.extraBSKraw = parseFloat( treatment.extraBSKraw ) + parseFloat( row.extraBSKraw );
                        treatment.extraASKraw = parseFloat( treatment.extraASKraw ) + parseFloat( row.extraASKraw );
                        treatment.extraAHBraw = parseFloat( treatment.extraAHBraw ) + parseFloat( row.extraAHBraw );
                        treatment.extraBHBraw = parseFloat( treatment.extraBHBraw ) + parseFloat( row.extraBHBraw );

                        //  with currency symbol
                        treatment.cost = Y.doccirrus.comctl.numberToLocalCurrency( treatment.costUnformatted, true, formData.currency );
                        treatment.vat = Y.doccirrus.comctl.numberToLocalCurrency( treatment.vatUnformatted, true, formData.currency );
                        treatment.extraBSK = Y.doccirrus.comctl.numberToLocalCurrency( treatment.extraBSKraw, true, formData.currency );
                        treatment.extraASK = Y.doccirrus.comctl.numberToLocalCurrency( treatment.extraASKraw, true, formData.currency );
                        treatment.extraAHB = Y.doccirrus.comctl.numberToLocalCurrency( treatment.extraAHBraw, true, formData.currency );
                        treatment.extraBHB = Y.doccirrus.comctl.numberToLocalCurrency( treatment.extraBHBraw, true, formData.currency );

                        //  without currency symbol, EXTMOJ-2091
                        treatment.costPlain = Y.doccirrus.comctl.numberToLocalString( treatment.costUnformatted );
                        treatment.vatPlain = Y.doccirrus.comctl.numberToLocalString( treatment.vatUnformatted );
                        treatment.extraBSKPlain = Y.doccirrus.comctl.numberToLocalString( treatment.extraBSKraw );
                        treatment.extraASKPlain = Y.doccirrus.comctl.numberToLocalString( treatment.extraASKraw );
                        treatment.extraAHBPlain = Y.doccirrus.comctl.numberToLocalString( treatment.extraAHBraw );
                        treatment.extraBHBPlain = Y.doccirrus.comctl.numberToLocalString( treatment.extraBHBraw );
                    }

                    return fromRows;
                }

                function removeHiddenRows( fromRows ) {
                    var i, newRows = [];
                    for( i = 0; i < fromRows.length; i++ ) {
                        if( !fromRows[i].isHidden ) {
                            newRows.push( fromRows[i] );
                        }
                    }
                    return newRows;
                }

                function addExplanations( fromRows ) {
                    var i;
                    for( i = 0; i < fromRows.length; i++ ) {
                        if( fromRows[i].explanations && '' !== fromRows[i].explanations ) {
                            fromRows[i].item = fromRows[i].item + ' (' + fromRows[i].explanations + ')';
                        }
                    }
                    return fromRows;
                }

                Y.log( 'Built diagnosis string: ' + formData.diagnoses, 'debug', NAME );

                //  start over if set of linked activities needs to be corrected

                if( Y.config.debug ) {
                    Y.log( '(processInvoiceLinkedActivities) Mapping TREATMENT and DIAGNOSIS activities to ' + JSON.stringify( tableRows ), 'debug', NAME );
                }

                // MOJ-8355
                formData.totalWithoutExpenses = Y.doccirrus.comctl.numberToLocalCurrency( (_k.unwrap( currentActivity.totalWithoutExpenses ) || 0), false, formData.currency );
                formData.beforetax = Y.doccirrus.comctl.numberToLocalCurrency( (_k.unwrap( currentActivity.beforetax ) || 0), false, formData.currency );
                formData.vat = Y.doccirrus.comctl.numberToLocalCurrency( (_k.unwrap( currentActivity.totalVat ) || 0), false, formData.currency );
                formData.vatList = Y.dcforms.mapper.objUtils.getVatSummary( vatList, formData.currency );

                formData.totalDoc = Y.doccirrus.comctl.numberToLocalCurrency( (_k.unwrap( currentActivity.totalDoc ) || 0), false, formData.currency );
                formData.total75 = Y.doccirrus.comctl.numberToLocalCurrency( (_k.unwrap( currentActivity.total75 ) || 0), false, formData.currency );
                formData.total25 = Y.doccirrus.comctl.numberToLocalCurrency( (_k.unwrap( currentActivity.total25 ) || 0), false, formData.currency );
                formData.total15 = Y.doccirrus.comctl.numberToLocalCurrency( (_k.unwrap( currentActivity.total15 ) || 0), false, formData.currency );
                formData.totalReceipts = Y.doccirrus.comctl.numberToLocalCurrency( (_k.unwrap( currentActivity.totalReceipts ) || 0), false, formData.currency );
                formData.totalPenalties = Y.doccirrus.comctl.numberToLocalCurrency( (_k.unwrap( currentActivity.totalPenalties ) || 0), false, formData.currency );

                formData.totalReceiptsOutstanding = Y.doccirrus.comctl.numberToLocalCurrency( (_k.unwrap( currentActivity.totalReceiptsOutstanding ) || 0), false, formData.currency );

                formData.totalOwing = Y.doccirrus.comctl.numberToLocalCurrency( (_k.unwrap( currentActivity.totalOwing ) || 0), false, formData.currency );

                formData.total = Y.doccirrus.comctl.numberToLocalCurrency( (_k.unwrap( currentActivity.total ) || 0), false, formData.currency );
                formData.totalExpense = Y.doccirrus.comctl.numberToLocalCurrency( (_k.unwrap( currentActivity.totalExpense ) || 0), false, formData.currency );
                formData.totalASK = Y.doccirrus.comctl.numberToLocalCurrency( (_k.unwrap( currentActivity.totalASK ) || 0), false, formData.currency );
                formData.totalBSK = Y.doccirrus.comctl.numberToLocalCurrency( (_k.unwrap( currentActivity.totalBSK ) || 0), false, formData.currency );
                formData.totalAHB = Y.doccirrus.comctl.numberToLocalCurrency( (_k.unwrap( currentActivity.totalAHB ) || 0), false, formData.currency );
                formData.totalBHB = Y.doccirrus.comctl.numberToLocalCurrency( (_k.unwrap( currentActivity.totalBHB ) || 0), false, formData.currency );

                var totalWithoutSundries = _k.unwrap( currentActivity.total ) - _k.unwrap( currentActivity.totalExpense );

                formData.totalWithoutSundries = Y.doccirrus.comctl.numberToLocalCurrency( totalWithoutSundries, false, formData.currency );

                // Add additional versions of total without currency symbol - EXTMOJ-2091
                formData.beforetaxPlain = Y.doccirrus.comctl.numberToLocalString( (_k.unwrap( currentActivity.beforetax ) || 0) );
                formData.vatPlain = Y.doccirrus.comctl.numberToLocalString( (_k.unwrap( currentActivity.totalVat ) || 0) );

                formData.totalDocPlain = Y.doccirrus.comctl.numberToLocalString( (_k.unwrap( currentActivity.totalDoc ) || 0) );
                formData.total75Plain = Y.doccirrus.comctl.numberToLocalString( (_k.unwrap( currentActivity.total75 ) || 0) );
                formData.total25Plain = Y.doccirrus.comctl.numberToLocalString( (_k.unwrap( currentActivity.total25 ) || 0) );
                formData.total15Plain = Y.doccirrus.comctl.numberToLocalString( (_k.unwrap( currentActivity.total15 ) || 0) );
                formData.totalReceiptsPlain = Y.doccirrus.comctl.numberToLocalString( (_k.unwrap( currentActivity.totalReceipts ) || 0) );
                formData.totalPenaltiesPlain = Y.doccirrus.comctl.numberToLocalString( (_k.unwrap( currentActivity.totalPenalties ) || 0) );

                formData.totalReceiptsOutstandingPlain = Y.doccirrus.comctl.numberToLocalString( (_k.unwrap( currentActivity.totalReceiptsOutstanding ) || 0) );

                formData.totalOwingPlain = Y.doccirrus.comctl.numberToLocalString( (_k.unwrap( currentActivity.totalOwing ) || 0) );

                formData.totalPlain = Y.doccirrus.comctl.numberToLocalString( (_k.unwrap( currentActivity.total ) || 0) );
                formData.totalExpensePlain = Y.doccirrus.comctl.numberToLocalString( (_k.unwrap( currentActivity.totalExpense ) || 0) );
                formData.totalASKPlain = Y.doccirrus.comctl.numberToLocalString( (_k.unwrap( currentActivity.totalASK ) || 0) );
                formData.totalBSKPlain = Y.doccirrus.comctl.numberToLocalString( (_k.unwrap( currentActivity.totalBSK ) || 0) );
                formData.totalAHBPlain = Y.doccirrus.comctl.numberToLocalString( (_k.unwrap( currentActivity.totalAHB ) || 0) );
                formData.totalBHBPlain = Y.doccirrus.comctl.numberToLocalString( (_k.unwrap( currentActivity.totalBHB ) || 0) );

                formData.totalWithoutSundriesPlain = Y.doccirrus.comctl.numberToLocalString( totalWithoutSundries );

                // Add date range for treatments
                function addTreatmentDateRange( rows ) {
                    if( 0 === rows.length ) {
                        formData.from = '';
                        formData.to = '';
                    } else {
                        formData.from = -1;
                        formData.to = -1;

                        for( i = 0; i < rows.length; i++ ) {
                            formData.from = (-1 === formData.from) ? rows[i].timestamp : formData.from;
                            formData.to = (-1 === formData.to) ? rows[i].timestamp : formData.to;

                            formData.from = (rows[i].timestamp < formData.from) ? rows[i].timestamp : formData.from;
                            formData.to = (rows[i].timestamp > formData.to) ? rows[i].timestamp : formData.to;
                        }

                        formData.from = moment.utc( formData.from ).local().format( 'DD.MM.YYYY' );
                        formData.to = moment.utc( formData.to ).local().format( 'DD.MM.YYYY' );
                    }
                }

            }
        } );    //  end processInvoiceLinkedActivities

        /**
         *  Mapped fields for RECEIPT type activities (should be masked)
         */

        addFormMapper( {
            name: 'addReceiptData',
            group: [
                'receiptNo',
                'patientId',
                'amount',
                'patientName',
                'invoiceNo',
                'invoiceText'
            ],
            allowedActTypes: ['RECEIPT', 'REMINDER', 'CREDITNOTE', 'WARNING1', 'WARNING2', 'BADDEBT'],
            fn: function( formData, config ) {
                var
                    patient = config.context.patient,
                    activity = config.context.activity,
                    useAmount = parseFloat( _k.unwrap( activity.amount ) || '0.00' );

                // receipt special fields

                formData.receiptNo = '' + (_k.unwrap( activity.receiptNo ) || '---');
                formData.invoiceNo = '' + (_k.unwrap( activity.invoiceNo ) || '---');
                formData.amount = '' + Y.doccirrus.comctl.numberToLocalString( useAmount );
                formData.patientId = _k.unwrap( patient.patientNo || '' ) || '';
                formData.invoiceText = '' + (_k.unwrap( activity.invoiceText ) || '');

                formData.patientName = Y.doccirrus.schemas.person.personDisplay( {
                    'title': _k.unwrap( patient.title ),
                    'firstname': _k.unwrap( patient.firstname ),
                    'lastname': _k.unwrap( patient.lastname )
                } );

            }
        } );

        /**
         *  Mapped fields for measurements from the cardio API
         */

        var xmlTypes = Y.doccirrus.schemas.cardio.xmlTypes,
            getPath = function( path, object ) {
                return path.reduce( function( xs, x ) {
                    return (xs && xs[x]) ? xs[x] : null;
                }, object );
            };

        // safe access

        addFormMapper( {
            name: 'addMeasurementData',
            group: [
                'eventEpisodeTable',
                'eventLeadTable',
                'eventZoneTable',
                'eventMessage',
                'eventDate',

                //  duplicated XML sections, MOJ-10966
                'MDC_IDC_EPISODE',
                'MDC_IDC_EPISODE_CURRENT',
                'MDC_IDC_LEAD',
                'MDC_IDC_SET_ZONE'
            ].concat(
                Object.keys( xmlTypes ).filter( function( xmlKey ) {
                    return xmlKey.indexOf( 'MDC.' ) === 0 || xmlKey.indexOf( 'BIO.' ) === 0;
                } ).map( function( xmlKey ) {
                    return xmlKey.replace( /\./g, '_' );
                } )
            ),
            allowedActTypes: ['FORM', 'MEASUREMENT', 'PROCESS'],
            fn: function( formData, config ) {
                var
                    activity = config.context.activity,
                    eventDate = _k.unwrap( activity.eventDate ),
                    d_extra = _k.unwrap( activity.d_extra );

                // from cardio API via rule
                formData.eventMessage = '' + (_k.unwrap( activity.eventMessage ) || '');
                formData.eventDate = '';

                if( moment( eventDate ).isValid() ) {
                    formData.eventDate = moment( eventDate ).format( TIMESTAMP_FORMAT );
                }

                //  only add cardio XML types if d_extra exists
                if( !d_extra ) {
                    Y.log( 'No cardio data, not adding biotronic fields: ' + _k.unwrap( activity._id ), 'debug', NAME );
                    return;
                }

                Object.keys( xmlTypes ).filter( function( xmlKey ) {
                    return xmlKey.indexOf( 'MDC.' ) === 0 || xmlKey.indexOf( 'BIO.' ) === 0;
                } ).forEach( function( xmlKey ) {
                    var cuttedKey = xmlKey,
                        cuttedKeyWoDots = cuttedKey.replace( /\./g, '_' ),
                        value = getPath( cuttedKey.split( '.' ), d_extra ) || '';
                    if( 'Number' === xmlTypes[xmlKey] ) {
                        value = (typeof value === 'string') ? value.split( ' ' )[0] : value; //cut units
                    }
                    if( 'Date' === xmlTypes[xmlKey] ) {
                        if( value ) {
                            formData[cuttedKeyWoDots + '_TIME'] = moment( value ).utc().format( TIMESTAMP_FORMAT_DOQUVIDE );
                        } else {
                            formData[cuttedKeyWoDots + '_TIME'] = '';
                        }
                    }
                    formData[cuttedKeyWoDots] = '' + value;
                } );

                //  try add tables
                formData.MDC_IDC_EPISODE = [];
                formData.MDC_IDC_EPISODE_CURRENT = [];
                formData.MDC_IDC_LEAD = [];
                formData.MDC_IDC_SET_ZONE = [];

                if( d_extra.MDC && d_extra.MDC.IDC && d_extra.MDC.IDC.EPISODE && Array.isArray( d_extra.MDC.IDC.EPISODE ) ) {
                    d_extra.MDC.IDC.EPISODE.forEach( addEpisodeItem );
                }

                //  XML mapper will sometimes give us an object instead of an array woth single item
                if( d_extra.MDC && d_extra.MDC.IDC && d_extra.MDC.IDC.EPISODE && !Array.isArray( d_extra.MDC.IDC.EPISODE ) ) {
                    addEpisodeItem( d_extra.MDC.IDC.EPISODE );
                }

                function addEpisodeItem( item ) {
                    var
                        dtm = moment( item.DTM ),
                        copyRow = JSON.parse( JSON.stringify( item ) );

                    if( dtm.isValid() ) {
                        copyRow.DTM_date = dtm.utc().format( TIMESTAMP_FORMAT );
                        copyRow.DTM_time = dtm.utc().format( 'HH:mm:ss' );
                    } else {
                        copyRow.DTM_date = '';
                        copyRow.DTM_time = '';
                    }

                    formData.MDC_IDC_EPISODE.push( copyRow );

                    //  when reproducing episodes into their own form from the main measurement activity, we need to
                    //  know which episode ID we are reporting on

                    if( d_extra.SPLIT_FROM_DOCUMENT && d_extra.SPLIT_FROM_DOCUMENT.EPISODE_ID && d_extra.SPLIT_FROM_DOCUMENT.EPISODE_ID === copyRow.ID ) {
                        formData.MDC_IDC_EPISODE_CURRENT.push( copyRow );
                    }
                }

                //  Alternative configuration of rule
                if( d_extra.SPLIT_PATH === 'd_extra.MDC.IDC.EPISODE' && d_extra.SPLIT_ON ) {
                    if( d_extra.SPLIT_ON.DTM ) {
                        d_extra.SPLIT_ON.DTM_date = moment( d_extra.SPLIT_ON.DTM ).utc().format( TIMESTAMP_FORMAT );
                        d_extra.SPLIT_ON.DTM_time = moment( d_extra.SPLIT_ON.DTM ).utc().format( 'HH:mm:ss' );
                    }

                    //  if we have an Episode ID in SPLIT_FROM_DOCUMENT, it must match that in split on, correct
                    //  selection when cardioutils multiplyActivitiesByMedia copies it:

                    if( !d_extra.SPLIT_FROM_DOCUMENT || !d_extra.SPLIT_FROM_DOCUMENT.EPISODE_ID ) {
                        //  no SPLIT_FROM_DOCUMENT
                        formData.MDC_IDC_EPISODE_CURRENT = [d_extra.SPLIT_ON];
                    } else {
                        //  check ID matches, do not override logic above
                        if( d_extra.SPLIT_FROM_DOCUMENT.EPISODE_ID && d_extra.SPLIT_ON && d_extra.SPLIT_ON.ID === d_extra.SPLIT_FROM_DOCUMENT.EPISODE_ID ) {
                            formData.MDC_IDC_EPISODE_CURRENT = [d_extra.SPLIT_ON];
                        }
                    }
                }

                if( d_extra.MDC && d_extra.MDC.IDC && d_extra.MDC.IDC.LEAD && Array.isArray( d_extra.MDC.IDC.LEAD ) ) {
                    d_extra.MDC.IDC.LEAD.forEach( function addLeadItem( item ) {
                        formData.MDC_IDC_LEAD.push( item );
                    } );
                }

                if( d_extra.MDC && d_extra.MDC.IDC && d_extra.MDC.IDC.SET && d_extra.MDC.IDC.SET.ZONE && Array.isArray( d_extra.MDC.IDC.SET.ZONE ) ) {
                    d_extra.MDC.IDC.SET.ZONE.forEach( function addZoneItem( item ) {
                        formData.MDC_IDC_SET_ZONE.push( item );
                    } );
                }

                formData.eventEpisodeTable = formData.MDC_IDC_EPISODE;
                formData.eventLeadTable = formData.MDC_IDC_LEAD;
                formData.eventZoneTable = formData.MDC_IDC_SET_ZONE;

            }
        } );

        var simpleMedicationFields = [
            "date",
            "time",
            "content",
            "codePlain",
            "codeDisplay",
            "phPZN",
            "subType",
            "phNote",
            "phName",
            "phShortName",
            "phStrength",
            "phReason",
            'explanations'
        ];

        addFormMapper( {
            name: 'addMedicationData',
            group: simpleMedicationFields,
            linkedGroup: simpleMedicationFields,
            allowedActTypes: ['MEDICATION'],
            fn: function( formData, config ) {
                var
                    currentActivity = config.context.activity,
                    fields = simpleMedicationFields;

                fields.forEach( function( fieldName ) {
                    if( currentActivity[fieldName] ) {
                        formData[fieldName] = _k.unwrap( currentActivity[fieldName] );
                    } else {
                        formData[fieldName] = '';
                    }
                } );
            }
        } );

        /**
         *  Medication fields for reporting, MOJ-8400
         *  TODO: zuzatsinfo
         */

        addFormMapper( {
            name: 'addMedicationDetails',
            group: [
                'phCompany',
                'phNLabel',
                'phIngr',
                'phAtc',
                'phForm',
                'phReason',
                'phNote',
                'phUnit',
                'phDosisType',
                'phDosisNight',
                'phDosisEvening',
                'phDosisAfternoon',
                'phDosisMorning',
                'dosis',
                'phPackSize',
                'phContinuousMed',
                'phContinuousMedDate',
                'isPrescribed',
                'phSampleMed',
                'isDivisible'
            ],
            linkedGroup: [
                'phCompany',
                'phNLabel',
                'phIngr',
                'phAtc',
                'phForm',
                'phReason',
                'phNote',
                'phUnit',
                'phDosisType',
                'phDosisNight',
                'phDosisEvening',
                'phDosisAfternoon',
                'phDosisMorning',
                'phContinuousMed',
                'phContinuousMedDate',
                'dosis',
                'phPackSize',
                'isPrescribed',
                'phSampleMed',
                'isDivisible'
            ],
            deps: [],
            allowedActTypes: ['MEDICATION'],
            fn: function addMedicationDetails( formData, config ) {
                var
                    currentActivity = config.context.activity,

                    //  simple value types
                    copyFields = [
                        'phCompany',
                        'phNLabel',
                        'phForm',
                        'phReason',
                        'phNote',
                        'phUnit',
                        'phDosisType',
                        'phDosisNight',
                        'phDosisEvening',
                        'phDosisAfternoon',
                        'phDosisMorning',
                        'phPackSize',
                        'isPrescribed',
                        'phContinuousMed',
                        'phContinuousMedDate'
                    ],
                    phAmr,
                    fieldName,
                    i;

                //  default values in case of missing / null properties from catalog
                formData.phContinuousMed = false;
                formData.phContinuousMedDate = '';
                formData.phPriceSale = '0.00';
                formData.phPackSize = ' ';
                formData.phDosisNight = '0';
                formData.phDosisEvening = '0';
                formData.phDosisAfternoon = '0';
                formData.phDosisMorning = '0';

                for( i = 0; i < copyFields.length; i++ ) {
                    fieldName = copyFields[i];
                    if( currentActivity[fieldName] ) {
                        formData[fieldName] = _k.unwrap( currentActivity[fieldName] );
                    } else {
                        formData[fieldName] = '';
                    }
                }

                formData.phIngr = currentActivity.phIngr ? Y.doccirrus.schemas.activity.serializePhIngr( _k.unwrap( currentActivity.phIngr ) ) : '';

                if( currentActivity.phAtc ) {
                    formData.phAtc = _k.unwrap( currentActivity.phAtc ).join( ', ' );
                }

                formData.dosis = '';
                if( currentActivity.phDosisType && 'SCHEDULE' === _k.unwrap( currentActivity.phDosisType ) ) {
                    formData.dosis = '' +
                                     _k.unwrap( currentActivity.phDosisMorning ) + '-' +
                                     _k.unwrap( currentActivity.phDosisAfternoon ) + '-' +
                                     _k.unwrap( currentActivity.phDosisEvening ) + '-' +
                                     _k.unwrap( currentActivity.phDosisNight );

                } else {
                    formData.dosis = _k.unwrap( currentActivity.dosis );
                }

                if( currentActivity.phContinuousMedDate && _k.unwrap( currentActivity.phContinuousMedDate ) ) {
                    formData.phContinuousMedDate = moment( _k.unwrap( currentActivity.phContinuousMedDate ) ).format( TIMESTAMP_FORMAT );
                }

                var PH_SAMPLE_MED = i18n( 'activity-schema.Medication_T.phSampleMed.i18n' );
                var PH_CONTINUOUS_MED = i18n( 'activity-schema.Medication_T.phContinuousMed.i18n' );
                var IS_DIVISIBLE = i18n( 'activity-schema.Medication_CH_T.isDivisible.i18n' );
                formData.phSampleMed = _k.unwrap( currentActivity.phSampleMed ) ? PH_SAMPLE_MED : ' ';
                formData.phContinuousMed = _k.unwrap( currentActivity.phContinuousMed ) ? PH_CONTINUOUS_MED : ' ';
                formData.isDivisible = _k.unwrap( currentActivity.isDivisible ) ? IS_DIVISIBLE : ' ';

                //  TODO: deduplicate with client-side medication model
                var
                    PH_ONLY = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_ONLY' ),
                    PH_PRESCRIPTION_ONLY = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_PRESCRIPTION_ONLY' ),
                    PH_BTM = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_BTM' ),
                    PH_CONTRACEPTIVE = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_CONTRACEPTIVE' ),
                    PH_TER = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_TER' ),
                    PH_TRANS = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_TRANS' ),
                    PH_IMPORT = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_IMPORT' ),
                    PH_NEGATIV = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_NEGATIVE' ),
                    PH_LIFESTYLE = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_LIFESTYLE' ),
                    PH_LIFESTYLE_COND = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_LIFESTYLE_COND' ),
                    AMR1 = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.AMR1' ),
                    AMR3 = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.AMR3' ),
                    AMR5 = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.AMR5' ),
                    PH_GBA = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_GBA' ),
                    PH_DIS_AGR = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_DIS_AGR' ),
                    PH_DIS_AGR_ALT = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_DIS_AGR_ALT' ),
                    PH_OTC = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_OTC' ),
                    PH_OTX = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_OTX' ),
                    PH_ARV = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_ARV' ),
                    PH_MED = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_MED' ),
                    PH_PRESC_MED = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_PRESC_MED' ),
                    PH_CHEAPER_PKG = i18n( 'InCaseMojit.activity_model_clientJS.dropdown.PH_CHEAPER_PKG' ),

                    //  expand additional info
                    flagsMap = [
                        {id: 'phOnly', text: PH_ONLY, origin: 'phOnly'},
                        {id: 'phRecipeOnly', text: PH_PRESCRIPTION_ONLY, origin: 'phRecipeOnly'},
                        {id: 'phBTM', text: PH_BTM, origin: 'phBTM'},
                        {id: 'phContraceptive', text: PH_CONTRACEPTIVE, origin: 'phContraceptive'},
                        {id: 'phTer', text: PH_TER, origin: 'phTer'},
                        {id: 'phTrans', text: PH_TRANS, origin: 'phTrans'},
                        {id: 'phImport', text: PH_IMPORT, origin: 'phImport'},
                        {id: 'phNegative', text: PH_NEGATIV, origin: 'phNegative'},
                        {id: 'phLifeStyle', text: PH_LIFESTYLE, origin: 'phLifeStyle'},
                        {id: 'phLifeStyleCond', text: PH_LIFESTYLE_COND, origin: 'phLifeStyleCond'},
                        {id: 'amr1', text: AMR1, origin: 'phAMR'},
                        {id: 'amr3', text: AMR3, origin: 'phAMR'},
                        {id: 'amr5', text: AMR5, origin: 'phAMR'},
                        {id: 'phGBA', text: PH_GBA, origin: 'phGBA'},
                        {id: 'phDisAgr', text: PH_DIS_AGR, origin: 'phDisAgr'},
                        {id: 'phDisAgrAlt', text: PH_DIS_AGR_ALT, origin: 'phDisAgrAlt'},
                        {id: 'phOTC', text: PH_OTC, origin: 'phOTC'},
                        {id: 'phOTX', text: PH_OTX, origin: 'phOTX'},
                        {id: 'phARV', text: PH_ARV, origin: 'phARV'},
                        {id: 'phMed', text: PH_MED, origin: 'phMed'},
                        {id: 'phPrescMed', text: PH_PRESC_MED, origin: 'phMed'},
                        {id: 'phCheaperPkg', text: PH_CHEAPER_PKG, origin: 'phCheaperPkg'}
                    ];

                formData.phAdditionalInfo = '';
                for( i = 0; i < flagsMap.length; i++ ) {
                    fieldName = flagsMap[i].id;
                    if( currentActivity[fieldName] && _k.unwrap( currentActivity[fieldName] ) ) {
                        if( '' !== formData.phAdditionalInfo ) {
                            formData.phAdditionalInfo = formData.phAdditionalInfo + ', ';
                        }
                        formData.phAdditionalInfo = formData.phAdditionalInfo + flagsMap[i].text;
                    }
                }

                if( currentActivity.phAMR ) {
                    phAmr = _k.unwrap( currentActivity.phAMR );
                    for( i = 0; i < phAmr.length; i++ ) {
                        if( '' !== formData.phAdditionalInfo ) {
                            formData.phAdditionalInfo = formData.phAdditionalInfo + ', ';
                        }
                        switch( phAmr[i] ) {
                            case 'amr1':
                                formData.phAdditionalInfo = formData.phAdditionalInfo + AMR1;
                                break;
                            case 'amr2':
                                formData.phAdditionalInfo = formData.phAdditionalInfo + AMR1;
                                break;
                            case 'amr3':
                                formData.phAdditionalInfo = formData.phAdditionalInfo + AMR1;
                                break;
                        }
                    }
                }
            }
        } );

        addFormMapper( {
            name: 'addPKVScheinData',
            group: [
                "tiers"
            ],
            linkedGroup: [
                "tiers"
            ],
            allowedActTypes: ['PKVSCHEIN'],
            fn: function( formData, config ) {
                var
                    currentActivity = config.context.activity;

                if( currentActivity.isTiersPayant ) {
                    formData.tiers = "Tiers Payant";
                }

                if( currentActivity.isTiersGarant ) {
                    formData.tiers = "Tiers Garant";
                }
            }
        } );

        addFormMapper( {
            name: 'addTreatmentData',
            group: [
                'billingRole'

            ],
            linkedGroup: [
                'billingRole'
            ],
            allowedActTypes: ['TREATMENT'],
            fn: function( formData, config ) {
                var
                    currentActivity = config.context.activity,
                    billingRoleArr = _k.unwrap( currentActivity.billingRole );
                formData.billingRole = [];
                if( billingRoleArr && billingRoleArr.length ) {
                    formData.billingRole = billingRoleArr.map( function( role ){
                        return ['MEDICAL', 'TECHNICAL'].includes( role ) && i18n( 'activity-schema.Treatment_CH_T_BillingRole.' + role + '.i18n' );
                    } ).filter( Boolean );
                }

                var treatmentType = _k.unwrap( currentActivity.treatmentType );
                var treatmentTypeTranslated = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'TreatmentType_E', treatmentType, 'i18n', '' );
                formData.treatmentType = treatmentTypeTranslated;
            }
        } );

        addFormMapper( {
            name: 'addSharedMedicationTreatmentData',
            group: [
                'vat',
                'hasVat'

            ],
            linkedGroup: [
                'vat',
                'hasVat'
            ],
            allowedActTypes: ['TREATMENT', 'MEDICATION'],
            fn: function( formData, config ) {
                var
                    currentActivity = config.context.activity,
                    vat,
                    vatCode = _k.unwrap( currentActivity.vat );

                if( !currentActivity.hasVat ) {
                    formData.vat = ' ';
                }

                if( currentActivity.hasVat && vatCode ) {
                    vat = Y.doccirrus.vat.getPercent( vatCode );
                    formData.vat = vat.toString() + ' %';
                }

                var HASVAT_TEXT = i18n( 'InCaseMojit.casefile_detail.checkbox.VAT' );
                formData.hasVat = currentActivity.hasVat ? HASVAT_TEXT : ' ';

            }
        } );

        /**
         *  Generate mappings for set of linked invoice activities (treatments, total, date range, etc)
         *
         *  These are used for documents created about an invoice, warnings, creditnotes, etc
         *
         *  Note: now also allowing diagnosis types, not used in table but to use in ICDs string
         *
         *  @param  formData    {Object}    Bound fields processed so far - fields will be added to this
         *  @return             {Object}    Expanded formData
         */
        addFormMapper( {
            name: 'processLinkedInvoices',
            group: [
                'invoiceDate',
                'invoiceNo',
                'patientName',
                'address',

                //  ammounts with currency symbol
                'total',
                'price',
                'vat',
                'beforetax',
                'totalVat',
                'totalASK',
                'totalBSK',
                'totalAHB',
                'totalBHB',
                'totalOwing',
                'totalReceipts',
                'totalPenalties',
                'totalReceiptsOutstanding',
                'warning1Price',
                'warning2Price',

                //  without currency symbol EXTMOJ-2091
                'totalPlain',
                'pricePlain',
                'vatPlain',
                'beforetaxPlain',
                'totalVatPlain',
                'totalASKPlain',
                'totalBSKPlain',
                'totalAHBPlain',
                'totalBHBPlain',
                'totalOwingPlain',
                'totalReceiptsPlain',
                'totalPenaltiesPlain',
                'totalReceiptsOutstandingPlain',
                'warning1PricePlain',
                'warning2PricePlain',

                //  table of other linked activities on the invoice
                'invoiceLinkedContents'
            ],
            linkedGroup: [
                'invoiceDate',
                'invoiceNo',
                'patientName',

                //  ammounts with currency symbol
                'total',
                'price',
                'vat',
                'beforetax',
                'totalVat',
                'totalASK',
                'totalBSK',
                'totalAHB',
                'totalBHB',
                'totalOwing',
                'totalReceipts',
                'totalPenalties',
                'totalReceiptsOutstanding',
                'warning1Price',
                'warning2Price',

                //  without currency symbol EXTMOJ-2091
                'totalPlain',
                'pricePlain',
                'vatPlain',
                'beforetaxPlain',
                'totalVatPlain',
                'totalASKPlain',
                'totalBSKPlain',
                'totalAHBPlain',
                'totalBHBPlain',
                'totalOwingPlain',
                'totalReceiptsPlain',
                'totalPenaltiesPlain',
                'totalReceiptsOutstandingPlain',
                'warning1PricePlain',
                'warning2PricePlain',

                //  table of other linked activities on the invoice
                'invoiceLinkedContents'
            ],
            deps: [],
            allowedActTypes: ['WARNING1', 'WARNING2', 'CREDITNOTE', 'REMINDER', 'BADDEBT'],
            fn: function processLinkedInvoices( formData, config, callback ) {
                var currentActivity = config.context.activity,
                    currentPatient = config.context.patient,
                    linkedActivities = Y.dcforms.mapper.objUtils.getAllLinkedActivities( currentActivity ),
                    billingAddress = getAddressByKind( currentPatient, KIND_BILLING ),
                    officialAddress = getAddressByKind( currentPatient, KIND_OFFICIAL ),
                    postboxAddress = getAddressByKind( currentPatient, KIND_POSTBOX ),
                    invoice, linkedInvoiceItem, linkedContents, i;

                //  TODO: Swiss project
                formData.currency = 'EUR';
                formData.displayname = _k.unwrap( currentPatient.firstname ) + ' ' + _k.unwrap( currentPatient.lastname );

                formData.patientName = Y.doccirrus.schemas.person.personDisplay( {
                    'title': _k.unwrap( currentPatient.title ),
                    'firstname': _k.unwrap( currentPatient.firstname ),
                    'lastname': _k.unwrap( currentPatient.lastname )
                } );

                formData.address = getAddressAsString( billingAddress || officialAddress || postboxAddress );
                mapReceiverAndAddressData( formData, billingAddress );

                //  zero unless value of these is available from self or linked invoice
                formData.warning1Price = Y.doccirrus.comctl.numberToLocalCurrency( 0, false, formData.currency );
                formData.warning2Price = Y.doccirrus.comctl.numberToLocalCurrency( 0, false, formData.currency );

                //  version without currency symbol, EXTMOJ-2091
                formData.warning1PricePlain = Y.doccirrus.comctl.numberToLocalString( 0 );
                formData.warning2PricePlain = Y.doccirrus.comctl.numberToLocalString( 0 );

                for( i = 0; i < linkedActivities.length; i++ ) {
                    if( 'INVOICEREF' === linkedActivities[i].actType || 'INVOICE' === linkedActivities[i].actType ) {

                        invoice = linkedActivities[i];

                        //  totals from parent invoice
                        formData.total = Y.doccirrus.comctl.numberToLocalCurrency( invoice.total, false, formData.currency );
                        formData.price = Y.doccirrus.comctl.numberToLocalCurrency( invoice.price, false, formData.currency );

                        formData.vat = Y.doccirrus.comctl.numberToLocalCurrency( invoice.vat, false, formData.currency );
                        formData.beforetax = Y.doccirrus.comctl.numberToLocalCurrency( invoice.beforetax, false, formData.currency );

                        formData.totalVat = Y.doccirrus.comctl.numberToLocalCurrency( invoice.totalVat, false, formData.currency );
                        formData.totalASK = Y.doccirrus.comctl.numberToLocalCurrency( invoice.totalASK, false, formData.currency );
                        formData.totalBSK = Y.doccirrus.comctl.numberToLocalCurrency( invoice.totalBSK, false, formData.currency );
                        formData.totalAHB = Y.doccirrus.comctl.numberToLocalCurrency( invoice.totalAHB, false, formData.currency );
                        formData.totalBHB = Y.doccirrus.comctl.numberToLocalCurrency( invoice.totalBHB, false, formData.currency );
                        formData.totalOwing = Y.doccirrus.comctl.numberToLocalCurrency( invoice.totalOwing, false, formData.currency );

                        formData.totalReceipts = Y.doccirrus.comctl.numberToLocalCurrency( (invoice.totalReceipts || 0), false, formData.currency );
                        formData.totalPenalties = Y.doccirrus.comctl.numberToLocalCurrency( (invoice.totalPenalties || 0), false, formData.currency );

                        formData.totalReceiptsOutstanding = Y.doccirrus.comctl.numberToLocalCurrency( invoice.totalReceiptsOutstanding, false, formData.currency );

                        //  version without currency symbol EXTMOJ-2091
                        formData.totalPlain = Y.doccirrus.comctl.numberToLocalString( invoice.total );
                        formData.pricePlain = Y.doccirrus.comctl.numberToLocalString( invoice.price );

                        formData.vatPlain = Y.doccirrus.comctl.numberToLocalString( invoice.vat );
                        formData.beforetaxPlain = Y.doccirrus.comctl.numberToLocalString( invoice.beforetax );

                        formData.totalVatPlain = Y.doccirrus.comctl.numberToLocalString( invoice.totalVat );
                        formData.totalASKPlain = Y.doccirrus.comctl.numberToLocalString( invoice.totalASK );
                        formData.totalBSKPlain = Y.doccirrus.comctl.numberToLocalString( invoice.totalBSK );
                        formData.totalAHBPlain = Y.doccirrus.comctl.numberToLocalString( invoice.totalAHB );
                        formData.totalBHBPlain = Y.doccirrus.comctl.numberToLocalString( invoice.totalBHB );
                        formData.totalOwingPlain = Y.doccirrus.comctl.numberToLocalString( invoice.totalOwing );

                        formData.totalReceiptsPlain = Y.doccirrus.comctl.numberToLocalString( invoice.totalReceipts || 0 );
                        formData.totalPenaltiesPlain = Y.doccirrus.comctl.numberToLocalString( invoice.totalPenalties || 0 );

                        formData.totalReceiptsOutstandingPlain = Y.doccirrus.comctl.numberToLocalString( invoice.totalReceiptsOutstanding );

                        formData.invoiceNo = invoice.invoiceNo || '';

                        formData.invoiceDate = invoice.timestamp ? moment( invoice.timestamp ).format( TIMESTAMP_FORMAT ) : new Date();
                        formData.invoiceBilledDate = invoice.invoiceDate ? moment( invoice.invoiceDate ).format( TIMESTAMP_FORMAT ) : new Date();

                        // current payment history of this invoice as a table - mini statement
                        formData.invoiceLinkedContents = [];
                        linkedContents = _k.unwrap( invoice.linkedContents || [] );
                        for( i = 0; i < linkedContents.length; i++ ) {

                            linkedContents[i].amount = linkedContents[i].amount || 0.00;

                            linkedInvoiceItem = {
                                activityId: linkedContents[i].receiptId,
                                content: linkedContents[i].content,
                                actType: linkedContents[i].actType,
                                amount: linkedContents[i].amount,
                                amountFormatted: Y.doccirrus.comctl.numberToLocalCurrency( linkedContents[i].amount, false, formData.currency ),
                                amountPlain: Y.doccirrus.comctl.numberToLocalString( linkedContents[i].amount )
                            };

                            if( 'WARNING1' === linkedInvoiceItem.actType || 'WARNING2' === linkedInvoiceItem.actType ) {
                                linkedInvoiceItem.amountFormatted = Y.doccirrus.comctl.numberToLocalCurrency( -1 * linkedInvoiceItem.amount, false, formData.currency );
                                linkedInvoiceItem.amountPlain = Y.doccirrus.comctl.numberToLocalString( -1 * linkedInvoiceItem.amount );
                            }

                            if( invoice.linkedTimestamps[i] && invoice.linkedTimestamps[i].receiptId === linkedInvoiceItem.activityId ) {
                                linkedInvoiceItem.date = moment( invoice.linkedTimestamps[i].timestamp ).format( TIMESTAMP_FORMAT );
                                linkedInvoiceItem.timestamp = invoice.linkedTimestamps[i].timestamp;
                            }

                            formData.invoiceLinkedContents.push( linkedInvoiceItem );
                        }

                        //  warning prices are from most recent warning or self
                        for( i = 0; i < linkedContents.length; i++ ) {
                            if( 'WARNING1' === linkedContents[i].actType ) {
                                formData.warning1Price = Y.doccirrus.comctl.numberToLocalCurrency( linkedContents[i].amount, false, formData.currency );
                                formData.warning1PricePlain = Y.doccirrus.comctl.numberToLocalString( linkedContents[i].amount );
                            }
                            if( 'WARNING2' === linkedContents[i].actType ) {
                                formData.warning2Price = Y.doccirrus.comctl.numberToLocalCurrency( linkedContents[i].amount, false, formData.currency );
                                formData.warning2PricePlain = Y.doccirrus.comctl.numberToLocalString( linkedContents[i].amount );
                            }
                        }

                        if( 'WARNING1' === _k.unwrap( currentActivity.actType ) ) {
                            formData.warning1Price = Y.doccirrus.comctl.numberToLocalCurrency( currentActivity.amount, false, formData.currency );
                            formData.warning1PricePlain = Y.doccirrus.comctl.numberToLocalString( currentActivity.amount );
                        }

                        if( 'WARNING2' === _k.unwrap( currentActivity.actType ) ) {
                            formData.warning2Price = Y.doccirrus.comctl.numberToLocalCurrency( currentActivity.amount, false, formData.currency );
                            formData.warning2PricePlain = Y.doccirrus.comctl.numberToLocalString( currentActivity.amount );
                        }

                        // consider only the first invoice
                        return callback( null );
                    }

                }
                // if any linked activities
                return callback( null );
            }
        } );

        /**
         *  Create mapped values for those elements which depend on linked activities
         *
         *  @param  formData    {Object}    keys and values matching reduced schema
         *  @param  viewModel   {Object}    current activity
         *  @returns            {Object}    formData expanded with fields requiring linked activities
         */

        addFormMapper( {
            name: 'processPubReceiptLinkedActivities',
            group: [
                'p2_840',
                'diagnoses',
                'sysPoints',
                'sysPointsCent',
                'items',
                'total',
                'totalAdjusted',
                'from',
                'to',
                'quarters'
            ],
            linkedGroup: [
                'p2_840',
                'diagnoses',
                'sysPoints',
                'sysPointsCent',
                'items',
                'total',
                'totalAdjusted',
                'from',
                'to',
                'quarters'
            ],
            allowedActTypes: ['PUBRECEIPT'],
            fn: function( formData, config, callback ) {

                //  TODO: get rid of this callback - invoice configuration should aready be loaded and passed in config.context

                var viewModel = config.context.activity;

                if( !formData || !formData.currency || !formData.currencySymbol ) {
                    // map currency data for form if not exists
                    mapCaseFolderData( formData, config.context.caseFolder );
                }

                function onInvoiceConfigurationLoaded( err, invoiceConfig ) {

                    if( err ) {
                        Y.log( 'could not get invoice config ' + err, 'error', NAME );
                        return callback( err );
                    }

                    var
                        adjust = 0.05,
                        treatments,
                        empVal = invoiceConfig.empiricalvalue,
                        validTreatments = [],           //  to update current selection if bad entries chosen [array]
                        tableRows = [],
                        treatment,
                        total = 0,
                        price,
                        actualPrice,
                        tdate,
                        i;

                    //  get all linked activities
                    treatments = Y.dcforms.mapper.objUtils.getAllLinkedActivities( viewModel );

                    if( Y.config.debug ) {
                        Y.log( 'Processing linked activities: ' + treatments.length, 'debug', NAME );
                        Y.log( 'viewModel activities: ' + JSON.stringify( _k.unwrap( viewModel.activities ) ), 'debug', NAME );
                        //Y.log( 'viewModel _activitiesObj: ' + JSON.stringify( _k.unwrap( viewModel._activitiesObj ) ), 'debug', NAME );
                    }
                    // system-wide configurable parameter (deal with err / or swallow)
                    if( empVal ) {
                        empVal = (parseInt( empVal, 10 ) / 100);
                        adjust = empVal;
                        //
                        // MOJ-1710 req.
                        formData.p2_840 = '' +
                                          'Der untenstehende Betrag für die von mir erbrachten ärztlichen Leistungen wird ' +
                                          'wegen der Begrenzung der Finanzmittel der Krankenkassen gegebenenfalls nur zum Teil ' +
                                          'an mich ausbezahlt. Die Bezahlung wird im Nachhinein von der Krankenkasse um ' +
                                          (empVal * 100).toFixed( 2 ) + '% vermindert, damit das von ' +
                                          'Ihrer Krankenkasse zur Verfügung gestellte Geld ausreicht.';
                    } else {
                        formData.p2_840 = '' +
                                          'Der untenstehende Betrag für die von mir erbrachten ärztlichen Leistungen wird wegen ' +
                                          'der Begrenzung der Finanzmittel der Krankenkassen gegebenenfalls nur zum Teil an mich ' +
                                          'ausbezahlt. Die Bezahlung wird im Nachhinein von der Krankenkasse soweit vermindert, ' +
                                          'dass das von Ihrer Krankenkasse zur Verfügung gestellte Geld ausreicht.';
                    }

                    //  add items
                    formData.diagnoses = '';
                    for( i = 0; i < treatments.length; i++ ) {

                        treatment = treatments[i];

                        if( Y.config.debug ) {
                            Y.log( 'Adding activity: ' + _k.unwrap( treatment.actType ), 'info', NAME );
                        }

                        if(
                            (treatment._id) &&
                            (treatment.actType) &&
                            (('TREATMENT' === _k.unwrap( treatment.actType )) || ('DIAGNOSIS' === _k.unwrap( treatment.actType )))
                        ) {

                            if( 'TREATMENT' === _k.unwrap( treatment.actType ) ) {

                                price = treatment.price ? _k.unwrap( treatment.price ) : 0.00;
                                price = +price;
                                actualPrice = treatment.actualPrice ? _k.unwrap( treatment.actualPrice ) : price;
                                actualPrice = +actualPrice;

                                //                          // compensate for junk data --> there should be no more junk data, so removing this MOJ-2637
                                //                          if( 'string' === typeof price ) {
                                //                              price = Y.doccirrus.comctl.localStringToNumber( price );
                                //                          }
                                //                          if( 'string' === typeof actualPrice ) {
                                //                              actualPrice = Y.doccirrus.comctl.localStringToNumber( actualPrice );
                                //                          }

                                actualPrice = actualPrice && Math.round( actualPrice );

                                //  TODO: replace, temporarily removed for testing
                                if( treatment.actualUnit && 'Punkte' !== _k.unwrap( treatment.actualUnit ) ) {
                                    actualPrice = '';
                                }

                                if( treatment.timestamp ) {
                                    tdate = moment( _k.unwrap( treatment.timestamp ) ); // deviation
                                }
                                //  Must match PubReceiptItem_T.reduced.json
                                tableRows.push( {
                                    'activityId': _k.unwrap( treatment._id ),
                                    'content': _k.unwrap( treatment.content ), //lineSplit( _k.unwrap( treatment.content ), 40 ),
                                    'code': !_k.unwrap( treatment.costType ) ? _k.unwrap( treatment.code ) : '',
                                    'unit': treatment.unit ? _k.unwrap( treatment.unit ) : 1,
                                    'costperitem': '',
                                    'quantity': '1',
                                    'price': (price && formatMoney( price, 2, ',', '.', formData.currencySymbol )),
                                    'actualPrice': actualPrice, // DEVIATION
                                    'dateObj': tdate, // Deviation
                                    'timestamp': tdate.format( 'DD.MM.YYYY' ) // DEVIATION
                                } );

                                Y.log( 'Added table row for TREATMENT: ' + treatment._id, 'debug', NAME );

                                // we can only assume this is the same for each entry.
                                // entries spanning time periods can in fact have
                                // varying factor value, but this is not our problem
                                formData.sysPoints = _k.unwrap( treatment.billingFactorValue );
                                formData.sysPointsCent = (parseFloat( formData.sysPoints ) * 100).toFixed( 2 ) + '';
                                formData.sysPointsCent = formData.sysPointsCent.replace( '.', ',' );
                                total = total + price;
                                validTreatments.push( treatment );
                            }

                            if( 'DIAGNOSIS' === _k.unwrap( treatment.actType ) &&
                                // MOJ-11762: exclude invalidated, and invalidating DIAGNOSES
                                !Y.doccirrus.schemas.activity.isInvalidatedOrInvalidatingDiagnosis( treatment ) ) {

                                //  used to build diagnosis field
                                //Y.log('Adding DIAGNOSIS: ' + JSON.stringify(treatment, undefined, 2), 'debug', NAME);

                                formData.diagnoses = formData.diagnoses + '**' + _k.unwrap( treatment.code ) + '**: ' + _k.unwrap( treatment.userContent ) + '\n';
                                validTreatments.push( treatment );
                            }
                        } else {
                            if( Y.config.debug ) {
                                Y.log( 'Invalid item(s) in pubreceipt treatments table: ' + _k.unwrap( treatment.actType ), 'warn', NAME );
                            }
                        }
                    }

                    Y.log( 'Built diagnosis string: ' + formData.diagnoses, 'debug', NAME );

                    if( Y.config.debug ) {
                        Y.log( '(processPubReceiptLinkedActivities) Mapping TREATMENT and DIAGNOSIS activities to ' + JSON.stringify( tableRows ), 'debug', NAME );
                    }
                    //Y.log( 'Number of rows, filtered: ' + mArray.length, 'debug', NAME );
                    formData.items = tableRows;
                    formData.total = formatMoney( total, 2, ',', '.', formData.currencySymbol );

                    // get the original...
                    formData.totalAdjusted = formatMoney( (total * (1 - adjust)), 2, ',', '.', formData.currencySymbol );

                    /**
                     *  Add date range for treatments
                     */

                    function addDateQuarter() {

                        var
                            rows = formData.items,
                            qStart, qEnd,
                            i;

                        formData.from = -1;
                        formData.to = -1;

                        for( i = 0; i < rows.length; i++ ) {
                            formData.from = (-1 === formData.from) ? rows[i].dateObj : formData.from;
                            formData.to = (-1 === formData.to) ? rows[i].dateObj : formData.to;

                            formData.from = (rows[i].dateObj < formData.from) ? rows[i].dateObj : formData.from;
                            formData.to = (rows[i].dateObj > formData.to) ? rows[i].dateObj : formData.to;
                        }

                        if( -1 !== formData.from ) {

                            qStart = moment.utc( formData.from ).local().quarter();
                            qEnd = moment.utc( formData.to ).local().quarter();

                            formData.quarters = moment.utc( formData.from ).local().startOf( 'quarter' ).format( 'MMM' ) +
                                                ' bis ' +
                                                moment.utc( formData.to ).local().endOf( 'quarter' ).format( 'MMM YYYY' );
                            formData.quarters += '  (';
                            if( qEnd === qStart ) {
                                formData.quarters += qEnd + '. Quartal ' + moment.utc( formData.to ).local().endOf( 'quarter' ).format( 'YYYY' );
                            } else {
                                formData.quarters += qStart + '. Quartal ' + moment.utc( formData.from ).local().startOf( 'quarter' ).format( 'YYYY' ) +
                                                     ' bis ' +
                                                     qEnd + '. Quartal ' + moment.utc( formData.to ).local().endOf( 'quarter' ).format( 'YYYY' );
                            }
                            formData.quarters += ')';

                            formData.from = moment.utc( formData.from ).local().format( 'DD.MM.YYYY' );
                            formData.to = moment.utc( formData.to ).local().format( 'DD.MM.YYYY' );
                        } else {
                            formData.quarters = ' ';
                            formData.from = '';
                            formData.to = '';
                        }

                    }

                    //  add date ranges for treatment
                    addDateQuarter();

                    callback();
                }

                Y.dcforms.mapper.objUtils.getInvoiceConfiguration( viewModel._user, onInvoiceConfigurationLoaded );
            }
        } );

        /**
         *  Make plain javacript object for mapped table - checks validity as it goes
         *
         *  @param  formData            {Object}    Any bound fields which are already set
         *  @param  viewModel           {Object}    The object we are mapping into a form
         *  @return                     {Object}    formData with values set from linked activities
         */

        addFormMapper( {
            name: 'processPrescriptionLinkedActivities',
            group: [
                /*
                'medication1',            //  MOJ-8756: do not initially map these
                'medication2',            //  when creating a new prescription
                'medication3',            //  require deliberate map of linked activities
                'dosis1',
                'dosis2',
                'dosis3',
                'pzn1',
                'pzn2',
                'pzn3',
                'medicationStr',
                'items'
                */
            ],
            linkedGroup: [
                'medication1',
                'medication2',
                'medication3',
                'dosis1',
                'dosis2',
                'dosis3',
                'pzn1',
                'pzn2',
                'pzn3',
                'avp1',
                'avp2',
                'avp3',
                'medicationStr',
                'items',
                'prescribedUntil1',
                'prescribedUntil2',
                'prescribedUntil3'
            ],
            allowedActTypes: ['PUBPRESCR', 'PRIVPRESCR', 'LONGPRESCR', 'PRESCRBTM', 'PRESCRG', 'PRESCRT', 'FORM'],
            fn: function( formData, config ) {
                var
                    viewModel = config.context.activity,
                    prescriptionType = _k.unwrap( viewModel.actType ),
                    expandedJSON,
                    medications = Y.dcforms.mapper.objUtils.getAllLinkedActivities( viewModel ),
                    aryComment = [],
                    validIds = [],                  //  to compare with current selection [array]
                    tableRows = [],                 //  exported to form [array]
                    medication,                     //  current item [object]

                    medicationStr = '',             //  description, quantity and code
                    counter = 1,
                    i;                              //  loop counter [int]

                Y.log( 'Number of rows in medication table, filtered: ' + medications.length, 'debug', NAME );

                formData.medication1 = '';
                formData.medication2 = '';
                formData.medication3 = '';
                formData.dosis1 = '';
                formData.dosis2 = '';
                formData.dosis3 = '';
                formData.pzn1 = '';
                formData.pzn2 = '';
                formData.pzn3 = '';
                formData.avp1 = '';
                formData.avp2 = '';
                formData.avp3 = '';
                formData.prescribedUntil1 = '';
                formData.prescribedUntil2 = '';
                formData.prescribedUntil3 = '';

                var quantity1 = 0,
                    quantity2 = 0,
                    quantity3 = 0,
                    prescribedUntil = "";

                //  add items
                for( i = 0; i < medications.length; i++ ) {

                    medication = _k.unwrap( medications[i] );

                    if(
                        (medication._id) &&
                        (medication.actType) &&
                        (
                            ('MEDICATION' === _k.unwrap( medication.actType )) ||
                            ('ASSISTIVE' === _k.unwrap( medication.actType ))         // MOJ-8681
                        )
                    ) {

                        //  Add first three medications as fixed fields MOJ-2451
                        medicationStr = (_k.unwrap( medication.phNLabel ) || _k.unwrap( medication.userContent ) || '');
                        medicationStr = medicationStr.replace( '  ', ' ' );

                        if( formData.medication1 === medicationStr ) {
                            quantity1++;
                        } else if( formData.medication2 === medicationStr ) {
                            quantity2++;
                        } else if( formData.medication3 === medicationStr ) {
                            quantity3++;
                        } else {
                            if( medication.phContinuousMedDate ) {
                                prescribedUntil = moment( medication.phContinuousMedDate ).format( i18n( 'general.TIMESTAMP_FORMAT' ) );
                            } else {
                                prescribedUntil = ' ';
                            }
                            switch( counter ) {
                                case 1:
                                    quantity1++;
                                    formData.medication1 = medicationStr;
                                    formData.dosis1 = getDosisStr( medication, prescriptionType );
                                    formData.prescribedUntil1 = prescribedUntil; //swiss

                                    if( medication.phPZN && '' !== medication.phPZN ) {
                                        formData.pzn1 = 'PZN' + _k.unwrap( medication.phPZN || '' );
                                    }
                                    if( !_k.unwrap( medication.phRecipeOnly ) && _k.unwrap( medication.phPriceSale ) ) {
                                        formData.avp1 = ('AVP: ' + Y.doccirrus.comctl.numberToLocalString( _k.unwrap( medication.phPriceSale ) ));
                                    }
                                    break;
                                case 2:
                                    quantity2++;
                                    formData.medication2 = medicationStr;
                                    formData.dosis2 = getDosisStr( medication, prescriptionType );
                                    formData.prescribedUntil2 = prescribedUntil;
                                    if( medication.phPZN && '' !== medication.phPZN ) {
                                        formData.pzn2 = 'PZN' + _k.unwrap( medication.phPZN || '' );
                                    }
                                    if( !_k.unwrap( medication.phRecipeOnly ) && _k.unwrap( medication.phPriceSale ) ) {
                                        formData.avp2 = ('AVP: ' + Y.doccirrus.comctl.numberToLocalString( _k.unwrap( medication.phPriceSale ) ));
                                    }
                                    break;
                                case 3:
                                    quantity3++;
                                    formData.medication3 = medicationStr;
                                    formData.dosis3 = getDosisStr( medication, prescriptionType );
                                    formData.prescribedUntil3 = prescribedUntil;
                                    if( medication.phPZN && '' !== medication.phPZN ) {
                                        formData.pzn3 = 'PZN' + _k.unwrap( medication.phPZN || '' );
                                    }
                                    if( !_k.unwrap( medication.phRecipeOnly ) && _k.unwrap( medication.phPriceSale ) ) {
                                        formData.avp3 = ('AVP: ' + Y.doccirrus.comctl.numberToLocalString( _k.unwrap( medication.phPriceSale ) ));
                                    }
                                    break;
                            }

                            counter = counter + 1;
                        }

                        //  Must match Prescription_T.reduced.json
                        tableRows.push( {
                            'activityId': _k.unwrap( medication._id ),
                            'description': _k.unwrap( medication.content ),
                            'code': _k.unwrap( medication.code ),
                            'comment': _k.unwrap( medication.comment ),
                            'unit': _k.unwrap( medication.unit )
                        } );

                        aryComment.push( medication.content );
                        validIds.push( _k.unwrap( medication._id ) );

                    } else {
                        if( Y.config.debug ) {
                            Y.log( 'Invalid item(s) in medications table: ' + _k.unwrap( medication.actType ), 'warn', NAME );
                        }
                    }
                }

                if( quantity1 > 1 ) {
                    formData.medication1 = quantity1.toString() + ' x ' + formData.medication1;
                }
                if( quantity2 > 1 ) {
                    formData.medication2 = quantity2.toString() + ' x ' + formData.medication2;
                }
                if( quantity3 > 1 ) {
                    formData.medication3 = quantity3.toString() + ' x ' + formData.medication3;
                }

                // similarly to the invoice, the prescription mapper must write back to the
                // the activity, if it is editable.  This is currently an unresolved problem on
                // the server. MOJ-3662

                //  TODO: move this to a post-process

                if( false === Y.dcforms.isOnServer ) {
                    if( _k.isObservable( viewModel.content ) && _k.unwrap( viewModel._isEditable ) ) {
                        // for prescriptions, we need to set the
                        // usercontent now.
                        // Perhaps a good idea to do this in all mappers, now that we have a feedback channel.
                        if( !_k.unwrap( viewModel.userContent ) ) {
                            viewModel.userContent( config.context.template.name[Y.dcforms.getUserLang()] );
                        }

                        //  This is currently unreliable on the client, may fail with:
                        //
                        //      InvalidStateError: Failed to read the 'selectionStart' property from 'HTMLInputElement':
                        //      The input element's type ('hidden') does not support selection.

                        try {
                            expandedJSON = viewModel.toJSON();
                            expandedJSON._activitiesObj = medications;

                            if( viewModel.content() !== Y.doccirrus.schemas.activity.generateContent( expandedJSON ) ) {
                                viewModel.content( Y.doccirrus.schemas.activity.generateContent( expandedJSON ) );
                            }

                        } catch( visbilityError ) {
                            Y.log( 'Could not set content from viewModel: ' + JSON.stringify( visbilityError ), 'warn', NAME );
                        }

                    }
                }

                formData.medicationStr = formData.medication1 + "\n" + formData.medication2 + "\n" + formData.medication3 + "\n";
                formData.items = tableRows;

                //  Remove leading dash from medication string, '-' or will be interpreted as markdown OL, MOJ-12564
                if( '-' === formData.medication1.substr( 0, 1 ) ) {
                    formData.medication1 = formData.medication1.substr( 1 ).trim();
                }

                if( '-' === formData.medication2.substr( 0, 1 ) ) {
                    formData.medication2 = formData.medication2.substr( 1 ).trim();
                }

                if( '-' === formData.medication3.substr( 0, 1 ) ) {
                    formData.medication3 = formData.medication3.substr( 1 ).trim();
                }

                if( _k.unwrap( viewModel.substitutePrescription ) ) {
                    formData.medication2 = i18n( 'InCaseMojit.ActivityHeadingButtonsViewModel.text.SUBSTITUTE_PRESCRIPTION_PRINT' );
                }

                if( Y.config.debug ) {
                    Y.log( 'Mapping MEDICATION activities to ' + JSON.stringify( tableRows ), 'debug', NAME );
                }
            }

        } );

        addFormMapper( {
            name: 'processAssistivePrescriptionLinkedActivities',
            group: [
                'assistive1',
                'assistive2',
                'assistive3',
                'assistiveDose1',
                'assistiveDose2',
                'assistiveDose3',
                'assisitvePrescPeriod1',
                'assisitvePrescPeriod2',
                'assisitvePrescPeriod3',
                'assistive1All',
                'assistive2All',
                'assistive3All',
                'pzn1',
                'pzn2',
                'pzn3',
                'items'
            ],
            linkedGroup: [
                'assistive1',
                'assistive2',
                'assistive3',
                'assistiveDose1',
                'assistiveDose2',
                'assistiveDose3',
                'assistivePrescPeriod1',
                'assistivePrescPeriod2',
                'assistivePrescPeriod3',
                'assistive1All',
                'assistive2All',
                'assistive3All',
                'pzn1',
                'pzn2',
                'pzn3',
                'items'
            ],
            allowedActTypes: ['PRESASSISTIVE'],
            fn: function( formData, config ) {

                var
                    extendedJSON,
                    assistiveStr,
                    assistiveDoseStr,
                    assistivePrescPeriodStr,
                    viewModel = config.context.activity,
                    activities = Y.dcforms.mapper.objUtils.getAllLinkedActivities( viewModel ),
                    tableRows = [],                  //  exported to form [array]
                    activity,                        //  current item [object]
                    counter = 1,
                    i;                              //  loop counter [int]

                formData.assistive1 = '';
                formData.assistive2 = '';
                formData.assistive3 = '';
                formData.assistiveDose1 = '';
                formData.assistiveDose2 = '';
                formData.assistiveDose3 = '';
                formData.assistivePrescPeriod1 = ' ';
                formData.assistivePrescPeriod2 = ' ';
                formData.assistivePrescPeriod3 = ' ';
                formData.pzn1 = '';
                formData.pzn2 = '';
                formData.pzn3 = '';
                var quantity1 = 0,
                    quantity2 = 0,
                    quantity3 = 0;

                //  add items
                for( i = 0; i < activities.length; i++ ) {

                    activity = _k.unwrap( activities[i] );

                    if( 'ASSISTIVE' === _k.unwrap( activity.actType ) ) {

                        assistiveStr = _k.unwrap( activity.assDescription ) || '';
                        assistiveDoseStr = _k.unwrap( activity.assDose ) || '';
                        assistivePrescPeriodStr = _k.unwrap( activity.assPrescPeriod ) || '';

                        if( formData.assistive1 === assistiveStr && formData.assistiveDose1 === assistiveDoseStr && formData.assistivePrescPeriod1 === assistivePrescPeriodStr ) {
                            quantity1++;
                        } else if( formData.assistive2 === assistiveStr && formData.assistiveDose2 === assistiveDoseStr && formData.assistivePrescPeriod2 === assistivePrescPeriodStr ) {
                            quantity2++;
                        } else if( formData.assistive3 === assistiveStr && formData.assistiveDose3 === assistiveDoseStr && formData.assistivePrescPeriod3 === assistivePrescPeriodStr ) {
                            quantity3++;
                        } else {
                            switch( counter ) {
                                case 1:
                                    quantity1++;
                                    formData.assistive1 = assistiveStr;
                                    formData.assistiveDose1 = assistiveDoseStr;
                                    formData.assistivePrescPeriod1 = assistivePrescPeriodStr;
                                    if( activity.code && '' !== _k.unwrap( activity.code ) ) {
                                        formData.pzn1 = 'PZN' + _k.unwrap( activity.code ) || '';
                                    }
                                    break;
                                case 2:
                                    quantity2++;
                                    formData.assistive2 = assistiveStr;
                                    formData.assistiveDose2 = assistiveDoseStr;
                                    formData.assistivePrescPeriod2 = assistivePrescPeriodStr;
                                    if( activity.code && '' !== _k.unwrap( activity.code ) ) {
                                        formData.pzn2 = 'PZN' + _k.unwrap( activity.code ) || '';
                                    }
                                    break;
                                case 3:
                                    quantity3++;
                                    formData.assistive3 = assistiveStr;
                                    formData.assistiveDose3 = assistiveDoseStr;
                                    formData.assistivePrescPeriod3 = assistivePrescPeriodStr;
                                    if( activity.code && '' !== _k.unwrap( activity.code ) ) {
                                        formData.pzn3 = 'PZN' + _k.unwrap( activity.code ) || '';
                                    }
                                    break;
                            }

                            counter = counter + 1;
                        }

                        //  Must match Prescription_T.reduced.json
                        tableRows.push( {
                            'activityId': _k.unwrap( activity._id ),
                            'description': _k.unwrap( activity.assDescription ),
                            'code': _k.unwrap( activity.code ),
                            'comment': '',
                            'unit': ''
                        } );

                    }
                }

                formData.assistive1All = [formData.assistive1, formData.assistiveDose1, formData.assistivePrescPeriod1].filter( Boolean ).join( ', ' ) || '';
                formData.assistive2All = [formData.assistive2, formData.assistiveDose2, formData.assistivePrescPeriod2].filter( Boolean ).join( ', ' ) || '';
                formData.assistive3All = [formData.assistive3, formData.assistiveDose3, formData.assistivePrescPeriod3].filter( Boolean ).join( ', ' ) || '';

                formData.assistive1All = formData.assistive1All.replace( 'xxxxx,', 'xxxxx ' );
                formData.assistive2All = formData.assistive2All.replace( 'xxxxx,', 'xxxxx ' );
                formData.assistive3All = formData.assistive3All.replace( 'xxxxx,', 'xxxxx ' );

                if( quantity1 > 1 ) {
                    formData.assistive1All = quantity1.toString() + ' x ' + formData.assistive1All;
                }
                if( quantity2 > 1 ) {
                    formData.assistive2All = quantity2.toString() + ' x ' + formData.assistive2All;
                }
                if( quantity3 > 1 ) {
                    formData.assistive3All = quantity3.toString() + ' x ' + formData.assistive3All;
                }

                // similarly to the invoice, the prescription mapper must write back to the
                // the activity, if it is editable.  This is currently an unresolved problem on
                // the server. MOJ-3662
                if( false === Y.dcforms.isOnServer ) {
                    if( _k.isObservable( viewModel.content ) && _k.unwrap( viewModel._isEditable ) ) {
                        // for prescriptions, we need to set the
                        // usercontent now.
                        // Perhaps a good idea to do this in all mappers, now that we have a feedback channel.
                        if( !_k.unwrap( viewModel.userContent ) ) {
                            viewModel.userContent( config.context.template.name[Y.dcforms.getUserLang()] );
                        }

                        try {
                            extendedJSON = viewModel.toJSON();
                            extendedJSON._activitiesObj = activities;
                            viewModel.content( Y.doccirrus.schemas.activity.generateContent( extendedJSON ) );

                        } catch( visbilityError ) {
                            Y.log( 'Could not set content from viewModel: ' + JSON.stringify( visbilityError ), 'warn', NAME );
                        }

                    }
                }

            }

        } );

        addFormMapper( {
            name: 'editorData',
            group: ['userTitle', 'userFirstname', 'userLastname', 'userDepartment', 'userWorkDescription'],
            fn: function( formData, config, callback ) {

                // TODO: get rid of this callback, employee should already be loaded and passed in config.context

                function employeeCb( err, employee ) {
                    employee = employee || {};

                    if( err ) {
                        Y.log( 'could not load employee by user', 'error', NAME );
                        return callback( err );
                    }

                    formData.userTitle = employee.title || '';
                    formData.userNameaffix = employee.nameaffix || '';
                    formData.userFirstname = employee.firstname || '';
                    formData.userLastname = employee.lastname || '';
                    formData.userDepartment = employee.department || '';
                    formData.userWorkDescription = employee.workDescription || '';

                    callback();
                }

                if( Y.doccirrus.commonutils.isClientSide() ) {
                    Y.doccirrus.jsonrpc.api.employee.getLoggedInEmployee().done( function( response ) {
                        employeeCb( null, response.data );
                    } ).fail( function() {
                        employeeCb( new Error( 'could not find employee for logged in user' ) );
                    } );
                } else {
                    Y.doccirrus.api.employee.getLoggedInEmployee( {
                        user: config.context.user,
                        callback: employeeCb
                    } );
                }

            }
        } );

        addFormMapper( {
            name: 'addBgInsuranceData',
            group: ['daleUvInsuranceId', 'daleUvInsuranceName'],
            fn: function( formData, config ) {
                var currentPatient = config.context.patient,
                    insurances = _k.unwrap( currentPatient.insuranceStatus ),
                    bgInsurance;

                insurances.some( function( insurance ) {
                    if( 'BG' === _k.unwrap( insurance.type ) ) {
                        bgInsurance = insurance;
                        return true;
                    }
                } );

                formData.daleUvInsuranceId = bgInsurance && _k.unwrap( bgInsurance.daleUvInsuranceId ) || '';
                formData.daleUvInsuranceName = bgInsurance && _k.unwrap( bgInsurance.daleUvInsuranceName ) || '';
            }
        } );

        addFormMapper( {
            name: 'addInsight2LabData',
            group: ['insight2'],
            deps: [
                'addInsight2Data'
            ],
            fn: function( formData, config ) {
                var
                    currentActivity = config.context.activity,
                    actType = _k.unwrap( currentActivity.actType ),
                    ldtVersion = Y.doccirrus.labdata.utils.getLdtVersion( currentActivity ),
                    tempFindings,                                       //  handle concateneated versions of findings
                    l_extra;

                //  if not valid LABDATA with findings then skip this
                if( 'LABDATA' !== actType || !currentActivity.l_extra || !_k.unwrap( currentActivity.l_extra ) ) {
                    return;
                }

                l_extra = _k.unwrap( currentActivity.l_extra );
                formData.labData = [];
                formData.ldtVersion = ldtVersion;

                if( ldtVersion && ldtVersion.startsWith( 'ldt3' ) ) {

                    //  LDT3
                    if( 'object' === typeof l_extra ) {
                        //  reduce from all LDT entries to just findings
                        tempFindings = Y.doccirrus.schemas.lablog.getRecordTests( l_extra );

                        //  flatten finding objects and annotate
                        l_extra = {testId: tempFindings};
                    }

                    if( l_extra.testId && l_extra.testId.length ) {
                        formData.labData = l_extra.testId.map( function( testResult ) {
                            var expandedResult = Y.doccirrus.labdata.utils.unwrapFindingObjLdt3( testResult );
                            expandedResult = Y.doccirrus.forms.labdata.expandSingleTestResultLdt3( l_extra, ldtVersion, expandedResult );
                            return expandedResult;
                        } );
                    }

                } else {

                    //  previous LDT version and legacy manual entries
                    if( !l_extra.testId && l_extra.sampleRequests ) {
                        l_extra.testId = l_extra.sampleRequests;
                    }

                    if( Array.isArray( l_extra ) ) {
                        tempFindings = Y.doccirrus.labdata.utils.collapseLExtra( currentActivity );
                        l_extra = {testId: tempFindings};
                    }

                    if( l_extra.testId && l_extra.testId.length ) {
                        formData.labData = l_extra.testId.map( function( testResult ) {
                            var expandedResult = Y.doccirrus.forms.labdata.expandSingleTestResult( l_extra, testResult );
                            return expandedResult;
                        } );
                    }

                }

            }
        } );

        addFormMapper( {
            name: 'addInsight2DocumentsData',
            group: ['insight2'],
            deps: [
                'addInsight2Data',
                'addInsight2UserDefinedFields',
                'addDoquvideFields',
                'addMeasurementData',
                'setPracticeData'
            ],
            fn: function( formData, config ) {
                var
                    context = config.context,
                    attachments = context.attachments;
                if( context.addDocumentData && attachments ) {
                    formData.documents = attachments.documents.filter( function( document ) {
                        if( !document || !document.type ) {
                            Y.log( 'Document is missing type: ' + document._id, 'warn', NAME );
                            return false;
                        }
                        return 'dc/form' !== document.contentType;
                    } ).map( mapDocumentData );
                }
            }
        } );

        addFormMapper( {
            name: 'addInsight2Data',
            group: ['insight2'],
            deps: [
                'setupFormdataPatient',
                'setAdditionalFormData',
                'getUtilityTherapies',
                'KBVUtility2Mapper',
                'addMedicationDetails',
                'addTreatmentData',
                'addSharedMedicationTreatmentData',
                'addPKVScheinData',
                'addTreatmentAdditionalCosts',
                'setPhysicianData',
                'addLastEditor',
                'setQuarter',
                'setupTreatmentOP',
                'addDoquvideFields',
                'setMarkerData',
                'processLinkedInvoices',
                'setIngredientplanMedData',
                'setMedData'
            ],
            fn: function( formData, config, callback ) {

                var
                    inSightKeys = getInSightKeys( config ),

                    currentActivity = config.context.activity,
                    specialization = config.context.additional && config.context.additional.specialization,
                    lastSchein = config.context.lastSchein ? config.context.lastSchein : null,
                    u_extra = _k.unwrap( currentActivity.u_extra ),
                    actType = _k.unwrap( currentActivity.actType ),
                    isSchein = Y.doccirrus.schemas.activity.isScheinActType( actType ),
                    billingArea,
                    billingAreaVal,
                    scheinType,
                    scheinTypeVal,
                    scheinSubgroup,
                    scheinSubgroupVal,
                    catalogUsages,
                    scheinSpecialisation,
                    spcializationObj,
                    chapter,
                    reasonTypeTranslated,
                    reasonType,
                    treatmentTypeTranslated,
                    treatmentType,
                    isEBMPsycho = false;

                function mapLatestPatientVersionInformationForSchein() {

                    if( !config.context.patientVersion ) {
                        return;
                    }

                    var
                        latestPatientVersion = config.context.patientVersion,
                        insuranceStatus = _k.unwrap( latestPatientVersion.insuranceStatus ),
                        insurance,
                        officialAddress = patientGetAddress( latestPatientVersion, KIND_OFFICIAL ) ;


                    // get insurance by casefolder
                    if( formData.caseFolderType && insuranceStatus && insuranceStatus.length ) {
                        insuranceStatus.some( function( _insurance ) {
                            if( _k.unwrap( _insurance.type ) === formData.caseFolderType ) {
                                insurance = _insurance;
                                return true;
                            }
                        } );
                    } else {
                        insurance = insuranceStatus && insuranceStatus[0];
                    }

                    formData.patientVersion = _k.unwrap( latestPatientVersion._id );
                    formData.updateDatum = _k.unwrap( latestPatientVersion.timestamp );

                    formData.patVer_title = _k.unwrap( latestPatientVersion.title );
                    formData.patVer_lastname = _k.unwrap( latestPatientVersion.lastname );
                    formData.patVer_gender = mapGender( _k.unwrap( latestPatientVersion.gender ) );
                    // phone number should always be the currently used
                    formData.patVer_bestPatientPhone = findBestPhoneNo( _k.unwrap( config.context.patient.communications ) );

                    if( officialAddress ) {
                        formData.patVer_street = _k.unwrap( officialAddress.street );
                        formData.patVer_houseno = _k.unwrap( officialAddress.houseno );
                        formData.patVer_zip = _k.unwrap( officialAddress.zip );
                        formData.patVer_city = _k.unwrap( officialAddress.city );
                        formData.patVer_countryCode = _k.unwrap( officialAddress.countryCode );
                    }

                    if( insurance ) {
                        formData.patVer_insuranceName = _k.unwrap( insurance.insuranceName );
                        formData.patVer_insuranceKind = _k.unwrap( insurance.insuranceKind );
                        formData.patVer_insuranceNo = _k.unwrap( insurance.insuranceNo );
                        formData.patVer_insuranceId = _k.unwrap( insurance.insuranceId );
                        formData.patVer_persGroup = _k.unwrap( insurance.persGroup );
                        formData.patVer_costCarrierBillingSection = _k.unwrap( insurance.costCarrierBillingSection );
                        formData.patVer_lastCardRead = _k.unwrap( insurance.cardSwipe );
                        formData.patVer_insuranceGrpId = _k.unwrap( insurance.insuranceGrpId );
                    }
                }

                function mapAdditionalKBVInformation( formData, u_extra ) {

                    //leave early if no u_extra exists
                    if( !u_extra ) {
                        return formData;
                    }

                    chapter = _k.unwrap( currentActivity.chapter ) || '';

                    //  Test time/Pruefzeit as defined in 2020 Q2 KBV requirements
                    isEBMPsycho = _k.unwrap( currentActivity.catalogShort ) === 'EBM' && chapter && chapter.match( /^23\./ ) || chapter && chapter.match( /^23$/ );
                    if( !isEBMPsycho && u_extra.pruefzeit && u_extra.pruefzeit.tag ) {
                        formData.pzt = u_extra.pruefzeit.tag;
                    } else if( isEBMPsycho && u_extra && u_extra.zeitbedarfsliste && u_extra.zeitbedarfsliste[0] ) {
                        formData.pzt = u_extra.zeitbedarfsliste[0].zeitbedarf;
                    }

                    //  Test time/Preufzeit for quarterly count
                    if( u_extra && u_extra.pruefzeit && u_extra.pruefzeit.quartal ) {
                        formData.pzq = u_extra.pruefzeit.quartal;
                    }

                    //  Test time/Pruefzeit from catalog, if present
                    if( u_extra.pruefzeit && u_extra.pruefzeit.tag ) {
                        formData.testTime = u_extra.pruefzeit.tag;
                    }

                    var
                        kv_bewertung = u_extra.kv && u_extra.kv.kv_bewertung,
                        bewertung_liste = u_extra && u_extra.bewertung_liste,
                        bewertungsListe = kv_bewertung || bewertung_liste || [],
                        expenseType,
                        timeRequirement,
                        entry1,
                        entry2;

                    bewertungsListe.forEach( function( listEntry ) {
                        if( listEntry.unit === "Punkte" ) {
                            formData.kbvScore = _k.unwrap( listEntry.value );
                        }
                    } );

                    expenseType = u_extra.leistung && u_extra.leistung.art;
                    formData.expenseType = expenseType ? _k.unwrap( expenseType ) : "";

                    timeRequirement = u_extra.zeitbedarfsliste && u_extra.zeitbedarfsliste[0] && u_extra.zeitbedarfsliste[0].zeitbedarf;
                    formData.timeRequirement = timeRequirement ? _k.unwrap( timeRequirement ) : "";

                    if( u_extra.altersbedingung_liste && u_extra.altersbedingung_liste[0] ) {
                        entry1 = _k.unwrap( u_extra.altersbedingung_liste[0].type ) + ': ' + _k.unwrap( u_extra.altersbedingung_liste[0].value );
                        entry2 = u_extra.altersbedingung_liste[1] ? _k.unwrap( u_extra.altersbedingung_liste[1].type ) + ': ' + _k.unwrap( u_extra.altersbedingung_liste[1].value ) : "";

                        formData.ageRestrictions = [entry1, entry2].join( ", " );
                    }

                    return formData;
                }

                function mapContinuousDiagnosisCode( act ) {
                    //  EXTMOJ-1690 - act may be undefined in some circumstances at customers, prevent crash:
                    if( !act || !act.code ) {
                        return '';
                    }

                    //  EXTMOJ-1780 only use continuousDiagnoses / dauserdiagnoses
                    var continuous = _k.unwrap( currentActivity.continuousIcds );
                    if( -1 === continuous.indexOf( act._id.toString() ) ) {
                        return '';
                    }

                    return _k.unwrap( act.code );
                }

                /// ---

                formData.actType = (currentActivity.actType) ? actType : '';
                formData.subType = _k.unwrap( currentActivity.subType ) || '';
                if( '' === formData.subType ) {
                    formData.subType = ' ';
                }

                //  set Dauerdiagnosen / continuousIcds to be codes in mapping, rather than _ids
                if( currentActivity.continuousIcds || isSchein ) {
                    formData.continuousIcds = Y.dcforms.mapper.objUtils
                        .getAllLinkedActivities( currentActivity )
                        .map( mapContinuousDiagnosisCode )
                        .filter( function( icdCode ) {
                            return icdCode.length > 0;
                        } )
                        .join( ', ' );
                }

                if( isSchein ) {
                    scheinSpecialisation = _k.unwrap( currentActivity.scheinSpecialisation );
                    if( scheinSpecialisation ) {
                        spcializationObj = (specialization || []).find( function( el ) {
                            return el.key === scheinSpecialisation;
                        } );
                        if( spcializationObj ) {
                            formData.scheinSpecialisation = spcializationObj.value;
                        } else {
                            formData.scheinSpecialisation = scheinSpecialisation;
                        }
                    }

                    //  schein have their owndetails for scheinDate and scheinId to simplify report configuration, EXTMOJ-2066
                    formData.scheinId = currentActivity._id.toString();
                    formData.scheinDate = currentActivity.timestamp;

                    if( _k.unwrap( currentActivity.scheinDate ) ) {
                        formData.scheinDate = moment.utc( _k.unwrap( currentActivity.scheinDate ) ).local().toDate();
                    }

                    formData.scheinBillingFactorValue = _k.unwrap( currentActivity.scheinBillingFactorValue );
                    reasonType = _k.unwrap( currentActivity.reasonType );
                    reasonTypeTranslated = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'ScheinReasons_E', reasonType, 'i18n', '' );
                    formData.reasonType = reasonTypeTranslated;

                    treatmentType = _k.unwrap( currentActivity.treatmentType );
                    treatmentTypeTranslated = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'TreatmentType_E', treatmentType, 'i18n', '' );
                    formData.treatmentType = treatmentTypeTranslated;
                    formData.scheinBillingArea = _k.unwrap( currentActivity.scheinBillingArea );
                    formData.scheinSettledDate = _k.unwrap( currentActivity.scheinSettledDate );
                    formData.continuousDiagIds = _k.unwrap( currentActivity.continuousIcds.join( ', ' ) );

                    billingArea = _k.unwrap( currentActivity.scheinBillingArea );
                    billingAreaVal = _scheinBillingAreaList.find( function( areaVal ) {
                        return areaVal.key === billingArea;
                    } );
                    scheinType = _k.unwrap( currentActivity.scheinType );
                    scheinTypeVal = _scheinTypeList.find( function( scheinTypeVal ) {
                        return scheinTypeVal.key === scheinType;
                    } );
                    scheinSubgroup = _k.unwrap( currentActivity.scheinSubgroup );
                    scheinSubgroupVal = _scheinTypeList.find( function( scheinSubgroupVal ) {
                        return scheinSubgroupVal.key === scheinSubgroup;
                    } );

                    if( billingArea && billingAreaVal ) {
                        formData.scheinBillingAreaText = billingAreaVal.value;
                    }

                    formData.scheinType = scheinType;
                    if( scheinType && scheinTypeVal ) {
                        formData.scheinTypeText = scheinTypeVal.value;
                    }

                    formData.scheinSubgroup = scheinSubgroup;
                    if( scheinType && scheinSubgroupVal ) {
                        formData.scheinSubgroupText = scheinSubgroupVal.value;
                    }

                    mapLatestPatientVersionInformationForSchein();
                }

                if( 'DIAGNOSIS' === currentActivity.actType &&
                    // MOJ-11762: exclude invalidated, and invalidating DIAGNOSES
                    !Y.doccirrus.schemas.activity.isInvalidatedOrInvalidatingDiagnosis( currentActivity ) ) {
                    formData.diagnosesBC = generateDiagnosisText( currentActivity );
                    formData.diagnosisTreatmentRelevance = _k.unwrap( currentActivity.diagnosisTreatmentRelevance );
                    formData.diagnosisType = _k.unwrap( currentActivity.diagnosisType );
                    formData.diagnosisCert = _k.unwrap( currentActivity.diagnosisCert );
                    formData.diagnosisSite = _k.unwrap( currentActivity.diagnosisSite );

                    if( u_extra && u_extra.abrechenbar ) {
                        formData.abrechenbar = 'j' === u_extra.abrechenbar;
                    }

                    if( u_extra && u_extra.meldepflicht ) {
                        formData.meldepflicht = 'j' === u_extra.meldepflicht;
                    }

                    //  there should generally be a schein for diagnoses, used to group by schein in reports, KUN-204
                    if( lastSchein ) {
                        formData.scheinId = lastSchein._id.toString();
                        formData.scheinDate = lastSchein.timestamp;
                    }
                }

                if( 'MEDICATION' === currentActivity.actType ) {
                    formData.phNLabel = _k.unwrap( currentActivity.phNLabel );
                    formData.phPZN = _k.unwrap( currentActivity.phPZN );
                }

                if( 'TREATMENT' === currentActivity.actType ) {

                    formData.areTreatmentDiagnosesBillable = (_k.unwrap( currentActivity.areTreatmentDiagnosesBillable ) === '0' ? 'nein' : 'ja');
                    formData.costType = _k.unwrap( currentActivity.costType );
                    formData.billingFactorValue = _k.unwrap( currentActivity.billingFactorValue );
                    formData.treatmentExplanations = _k.unwrap( currentActivity.explanations );

                    mapAdditionalKBVInformation( formData, u_extra );

                    if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                        formData.medicalTaxPoints = calculateMedicalTaxPointsForSwiss( currentActivity );
                        formData.technicalTaxPoints = calculateTechnicalTaxPointsForSwiss( currentActivity );
                    }
                }

                //  there should generally be a schein for treatments, used to group by schein in reports, EXTMOJ-2066
                if( lastSchein ) {
                    formData.scheinId = lastSchein._id.toString();
                    formData.scheinDate = lastSchein.timestamp;
                }

                // add all keys prepared for insight
                inSightKeys.forEach( function( key ) {
                    if( !formData[key] ) {
                        formData[key] = currentActivity[key];
                    }
                } );

                formData.caseFolderId = _k.unwrap( currentActivity.caseFolderId );
                if( 'KBVUTILITY' !== formData.actType ) {
                    formData.code = _k.unwrap( currentActivity.code );
                }


                formData.total = _k.unwrap( currentActivity.price );

                // Medications have phPriceSale (not price) - here we map this instead
                if( _k.unwrap( currentActivity.phPriceSale ) ) {
                    formData.total = _k.unwrap( currentActivity.phPriceSale );
                    formData.phPriceSale = _k.unwrap( currentActivity.phPriceSale );
                }

                formData.catalogShort = _k.unwrap( currentActivity.catalogShort );
                formData.activityStatus = Y.doccirrus.schemaloader.translateEnumValue( '-de', _k.unwrap( currentActivity.status ), Y.doccirrus.schemas.activity.types.ActStatus_E.list, '' );
                formData.status = _k.unwrap( currentActivity.status );
                formData.apkState = Y.doccirrus.schemaloader.translateEnumValue( '-de', _k.unwrap( currentActivity.apkState ), Y.doccirrus.schemas.activity.types.ApkState_E.list, '' );
                formData.cancelReason = _k.unwrap( currentActivity.cancelReason );

                castReportingDates( formData );

                formData._id = currentActivity._id;
                delete formData.billingAddress;
                delete formData.officialAddressBC;
                delete formData.poboxAddressBC;

                castAllTypes( formData );

                //  on the server, catalog usage should be pre-stored in context
                if( config.context.catalogUsages ) {
                    catalogUsages = config.context.catalogUsages;

                    if( catalogUsages ) {
                        formData.catalogUsageId = _k.unwrap( catalogUsages._id ).toString();
                        formData.catalogTags = _k.unwrap( catalogUsages.tags ).join( '; ' );
                        formData.seq = _k.unwrap( catalogUsages.seq );
                        formData.catalogUsagecatalogShort = _k.unwrap( catalogUsages.catalogShort );
                        formData.catalogUsageTitle = _k.unwrap( catalogUsages.title );
                    }

                }

                //  TODO: make sync
                return callback( null, formData );
            }
        } );

        addFormMapper( {
            name: 'addDoquvideFields',
            group: [
                'hasDoquvide',
                'doquvidePatientId',
                'dqsPatientId',
                'hasCardiacDevice',
                'cardiacDeviceNumber',
                'cardiacDeviceManufacturer'
            ],
            fn: function( formData, config, callback ) {
                var
                    patient = config.context.patient,
                    partnerIds = _k.unwrap( patient.partnerIds ) || [],
                    patientIsDisabled = _k.unwrap( patient.isDisabled ),
                    i;

                //  EXTMOJ-985 Check for DOQUVIDE partnerId (see PartnerIds_T in patient schema)
                formData.hasDoquvide = false;
                formData.doquvidePatientId = '';

                formData.hasCardiacDevice = false;
                formData.cardiacDeviceNumber = '';
                formData.cardiacDeviceManufacturer = '';

                for( i = 0; i < partnerIds.length; i++ ) {
                    if( 'DOQUVIDE' === _k.unwrap( partnerIds[i].partnerId ) && !patientIsDisabled ) {
                        formData.hasDoquvide = true;

                        //  Record DOQUVIDE patient id
                        if( partnerIds[i].hasOwnProperty( 'patientId' ) ) {
                            formData.doquvidePatientId = _k.unwrap( partnerIds[i].patientId );
                        }

                    }

                    if( 'DQS' === _k.unwrap( partnerIds[i].partnerId ) && !patientIsDisabled ) {
                        formData.hasDoquvide = true;

                        //  Record DOQUVIDE patient id
                        if( partnerIds[i].hasOwnProperty( 'patientId' ) ) {
                            formData.dqsPatientId = _k.unwrap( partnerIds[i].patientId );
                        }
                    }

                    if( 'CARDIO' === _k.unwrap( partnerIds[i].partnerId ) && !patientIsDisabled ) {
                        formData.hasCardiacDevice = true;

                        //  device serial number (pacemaker, defibrilator, loop recorder, etc)
                        if( partnerIds[i].hasOwnProperty( 'patientId' ) ) {
                            formData.cardiacDeviceNumber = _k.unwrap( partnerIds[i].patientId );
                        }

                        //  legacy, in previous version there was no selectedType, alwaysBiotronic
                        formData.cardiacDeviceManufacturer = 'Biotronic';

                        //  if there is a named device manufacturer, use it
                        if( partnerIds[i].selectedType && _k.unwrap( partnerIds[i].selectedType ) ) {
                            formData.cardiacDeviceManufacturer = _k.unwrap( partnerIds[i].selectedType );
                        }
                    }
                }

                //  TODO: make sync
                return callback( null, formData );
            }
        } );

        addFormMapper( {
            name: 'addInsight2UserDefinedFields',
            deps: [
                'addDoquvideFields',
                'addMeasurementData',
                'setupFormdataPatient',
                'setAdditionalFormData',
                'getUtilityTherapies',
                'KBVUtility2Mapper',
                'setQuarter'
            ],
            group: [
                'insight2UserFields'
            ],
            fn: function( formData, config, callback ) {
                var
                    attachments = config.context.attachments,
                    formDoc,
                    userFields = [],
                    k;

                if( !Y.dcforms.isOnServer ) {
                    Y.log( 'insight2UserFields mapper is only applied to server-side reporting', 'warn', NAME );
                    return callback( null, formData );
                }

                if( !attachments ) {
                    Y.log( 'No attachments in activity config, not attempting to record custom fields.', 'debug', NAME );
                    return callback( null, formData );
                }

                formDoc = attachments.findDocument( 'FORM' );

                if( !formDoc ) {
                    Y.log( 'No formDoc in attachments, no attempting to record custom fields.', 'debug', NAME );
                    return callback( null, formData );
                }

                if( !formDoc.reportingData ) {
                    Y.log( 'Missing reportingData in formDoc, assume no custom fields for reporting.', 'debug', NAME );
                    return callback( null, formData );
                }

                for( k in formDoc.reportingData ) {
                    if( formDoc.reportingData.hasOwnProperty( k ) ) {
                        formData[k] = formDoc.reportingData[k];
                        userFields.push( k );
                    }
                }

                formData.insight2UserFields = userFields;
                return callback( null, formData );
            }
        } );

        addFormMapper( {
            name: 'addBasicActivityData',
            group: ['explanations'],
            linkedGroup: ['explanations'],
            fn: function( formData, config ) {

                var activity = config.context.activity,
                    linkedActivities = Y.dcforms.mapper.objUtils.getAllLinkedActivities( activity );
                formData.explanations = linkedActivities[0] && _k.unwrap( linkedActivities[0].explanations ) || '';
            }
        } );

        addFormMapper( {
            name: 'addReportProperties',
            group: ['startDate', 'endDate', 'startDateTime', 'endDateTime', 'creationDate', 'creationDateTime', 'presetName'],
            fn: function( formData, config ) {
                formData.startDate = '';
                formData.endDate = '';
                formData.csvFilename = '';
                if( config && config.context && config.context.report ) {

                    // formData.startDate = config.context.report.startDate || '';
                    if( config.context.report.startDate && '' !== config.context.report.startDate ) {
                        formData.startDate = moment( config.context.report.startDate ).format( 'DD.MM.YY' );
                    }

                    // formData.endDate = config.context.report.endDate || '';
                    if( config.context.report.endDate && '' !== config.context.report.endDate ) {
                        formData.endDate = moment( config.context.report.endDate ).format( 'DD.MM.YY' );
                    }

                    // formData.startDate = config.context.report.startDate || '';
                    if( config.context.report.startDate && '' !== config.context.report.startDate ) {
                        formData.startDateTime = moment( config.context.report.startDate ).format( 'DD.MM.YY HH:mm' );
                    }

                    // formData.endDate = config.context.report.endDate || '';
                    if( config.context.report.endDate && '' !== config.context.report.endDate ) {
                        formData.endDateTime = moment( config.context.report.endDate ).format( 'DD.MM.YY HH:mm' );
                    }

                    formData.creationDate = moment().format( 'DD.MM.YY' );
                    formData.creationDateTime = moment().format( 'DD.MM.YY HH:mm' );

                }
                if( config && config.context && config.context.preset ) {
                    formData.csvFilename = config.context.preset.csvFilename;
                }
            }
        } );

        addFormMapper( {
            name: 'setWorkListData',
            group: ['setWorkListData'],
            deps: [
                'setPatientData',
                'setupFormdataPatient',
                'setLocationData'
            ],
            fn: function( formData, config ) {

                var
                    currentActivity = config.context.activity;

                formData.eingabe = "";
                formData.employeeName = _k.unwrap( currentActivity.employeeName );
                formData.caseFolderId = _k.unwrap( currentActivity.caseFolderId );
            }
        } );

        /**
         *  Add additional/material costs (Sachkosten) for treatments (KAT-326)
         *  Server/inSuite only since treatments do not have forms
         */

        addFormMapper( {
            name: 'addTreatmentAdditionalCosts',
            group: ['setWorkListData'],
            deps: [
                'setPatientData',
                'setupFormdataPatient',
                'setLocationData'
            ],
            fn: function( formData, config ) {

                var
                    currentActivity = config.context.activity,
                    materialCosts = [], i;

                if ( 'TREATMENT' !== currentActivity.actType ) {
                    return;
                }

                formData.totalMaterialCosts = 0;
                formData.materialCostDescription = '';

                // Note that EBM Sachkosten are measured in cents, and GOÄ Sachkosten are measured in Euros
                // to use both in reports, EBM values will be converted.

                if ( 'EBM' === currentActivity.catalogShort && currentActivity.fk5012Set ) {
                    for ( i = 0; i < currentActivity.fk5012Set.length; i++ ) {
                        formData.totalMaterialCosts += parseInt( currentActivity.fk5012Set[i].fk5012, 10 );
                        if ( currentActivity.fk5012Set[i].fk5011Set ) {
                            materialCosts.push( currentActivity.fk5012Set[i].fk5011Set[0].fk5011 );
                        }
                    }
                    formData.totalMaterialCosts = formData.totalMaterialCosts / 100;
                    formData.materialCostDescription = materialCosts.join( ', ' );
                }

                if ( 'GOÄ' === currentActivity.catalogShort ) {
                    formData.totalASK = currentActivity.ASK;
                    formData.totalBSK = currentActivity.BSK;
                    formData.totalMaterialCosts = currentActivity.ASK + currentActivity.BSK;
                }

            }
        } );


        /**
         *  Add latest MEDDATA values from patient
         *
         *  These may be displayed in a table of type MedData_T, or embedded individually like:
         *
         *  TODO: deduplicate with setIngredientplanMedData
         *
         *      {{InCase_T.md.BLOODPRESSURE.value}}
         *      {{InCase_T.md.BLOODPRESSURE.unit}}
         */

        addFormMapper( {
            name: 'setLatestMedData',
            group: [
                'setLatestMedData',
                'latestMedDataTable',
                'md'
            ],
            fn: function( formData, config, callback ) {
                var
                    formDataGroupKey = 'md',
                    formDataArrayKey = 'latestMedDataTable',
                    md = config.context.patient.latestMedData ? _k.unwrap( config.context.patient.latestMedData ) : [];

                if( md.length > 0 ) {
                    Y.dcforms.mapper.objUtils.mapMedDataItems(
                        md,
                        null,
                        formData,
                        config.context,
                        formDataGroupKey,
                        formDataArrayKey
                    ).then(
                        function onMedDataMapped() {
                            callback( null, formData );
                        },
                        function onMedDataMappingFailed( err ) {
                            callback( err );
                        }
                    );
                } else {
                    callback( null, formData );
                }
            }
        } );

        /**
         *  Add INGREDIENTPLAN MEDDATA values
         *
         *  These may be displayed in a table of type MedData_T, or embedded individually like:
         *
         *      {{InCase_T.ip.ASPRIN.value}}
         *      {{InCase_T.ip.ASPRIN.unit}}
         */

        addFormMapper( {
            name: 'setIngredientplanMedData',
            allowedActTypes: ['INGREDIENTPLAN'],
            group: [
                'setIngredientpplanMedData',
                'ingredientplanMedDataTable',
                'ip'
            ],
            fn: function( formData, config, callback ) {
                var
                    formDataGroupKey = 'ip',
                    formDataArrayKey = 'ingredientplanMedDataTable',
                    activity = config.context.activity || {},
                    actType = _k.unwrap( activity.actType ),
                    timestamp = _k.unwrap( activity.timestamp ),
                    ip = config.context.activity.medData ? _k.unwrap( config.context.activity.medData ) : [];

                if( ip.length > 0 && 'INGREDIENTPLAN' === actType ) {
                    Y.dcforms.mapper.objUtils.mapMedDataItems(
                        ip,
                        timestamp,
                        formData,
                        config.context,
                        formDataGroupKey,
                        formDataArrayKey
                    ).then(
                        function onMedDataMapped() {
                            callback( null, formData );
                        },
                        function onMedDataMappingFailed( err ) {
                            callback( err );
                        }
                    );
                } else {
                    callback( null, formData );
                }
            }
        } );

        /**
         *  Add MEDDATA values
         *
         *  These may be displayed in a table of type MedData_T, or embedded individually like:
         *
         *      {{InCase_T.mdt.BLOODPRESSURE.value}}
         *      {{InCase_T.mdt.BLOODPRESSURE.unit}}
         */
        addFormMapper( {
            name: 'setMedData',
            allowedActTypes: ['MEDDATA'],
            group: [
                'setMedData',
                'medDataTable',
                'mdt'
            ],
            fn: function( formData, config, callback ) {
                var
                    formDataGroupKey = 'mdt',
                    formDataArrayKey = 'medDataTable',
                    activity = config.context.activity || {},
                    actType = _k.unwrap( activity.actType ),
                    timestamp = _k.unwrap( activity.timestamp ),
                    mdt = config.context.activity.medData ? _k.unwrap( config.context.activity.medData ) : [];

                if( mdt.length > 0 && 'MEDDATA' === actType ) {
                    Y.dcforms.mapper.objUtils.mapMedDataItems(
                        mdt,
                        timestamp,
                        formData,
                        config.context,
                        formDataGroupKey,
                        formDataArrayKey
                    ).then(
                        function onMedDataMapped() {
                            callback( null, formData );
                        },
                        function onMedDataMappingFailed( err ) {
                            callback( err );
                        }
                    );
                } else {
                    callback( null, formData );
                }
            }
        } );

        /**
         *  Add historic MEDDATA values
         *
         *  These may be embedded individually like:
         *
         *      {{InCase_T.hmdt.0.BLOODPRESSURE.value}}
         *      {{InCase_T.hmdt.1.BLOODPRESSURE.value}}
         *      {{InCase_T.hmdt.3.BLOODPRESSURE.value}}
         */
        addFormMapper( {
            name: 'setHistoricMedData',
            group: [
                'setHistoricMedData',
                'hmdt'
            ],
            fn: function( formData, config, callback ) {
                var
                    formDataGroupKey = "hmdt",
                    /**
                     * Check, if any of the fields references to a historic meddata entry.
                     * @type {boolean}
                     */
                    historicMedDataRequested = config.mappedFields.some( function forEachMappedField( field ) {
                        return field.name === formDataGroupKey;
                    } );

                /**
                 * Just activate, if a mapped field is requesting the historic med data.
                 */
                if( historicMedDataRequested ) {
                    Y.dcforms.mapper.objUtils.mapHistoricalMedData( config.mappedFields, formData, config.context, formDataGroupKey )
                        .then(
                            function onHistoricalMedDataMapped() {
                                callback( null, formData );
                            },
                            function onHistoricalMedDataMappingFailed( err ) {
                                callback( err );
                            }
                        );
                } else {
                    callback( null, formData );
                }
            }
        } );

        addFormMapper( new Y.dcforms.schema.AMTSFormMapper_T() );

        addFormMapper( {
            name: 'setCatalogUsage',
            group: [
                'setCatalogUsage'
            ],
            fn: function( formData, config ) {

                if( !config.context.catalogUsage ) {
                    Y.log( 'Mapper context is missing catalogUsage set: ', config.context, 'warn', NAME );
                    return;
                }

                var
                    catalogUsage = config.context.catalogUsage;

                formData._id = _k.unwrap( catalogUsage.id );
                formData.catalogUsageId = _k.unwrap( catalogUsage._id ).toString();
                formData.seq = _k.unwrap( catalogUsage.seq );
                formData.catalogUsagecatalogShort = _k.unwrap( catalogUsage.catalogShort );
                formData.catalogUsageTitle = _k.unwrap( catalogUsage.title );
                formData.catalogTags = _k.unwrap( catalogUsage.tags ).join( '; ' );
            }
        } );

        addFormMapper( {
            name: 'addPTV11ArrangementCode',
            group: [
                'naehereAngabenZuDenEmpfehlungen'
            ],
            linkedGroup: ['naehereAngabenZuDenEmpfehlungen'],

            fn: function( formData, config ) {
                var
                    activity = config.context.activity;
                formData.naehereAngabenZuDenEmpfehlungen = _k.unwrap( activity.naehereAngabenZuDenEmpfehlungen );
            }
        } );

        function calculateMedicalTaxPointsForSwiss( treatment ) {
            if( !treatment.medicalTaxPoints || !treatment.medicalScalingFactor || !treatment.taxPointValue ) {
                return Y.doccirrus.comctl.numberToLocalString( 0 );
            }
            return Y.doccirrus.comctl.numberToLocalString( treatment.medicalTaxPoints * treatment.medicalScalingFactor * treatment.taxPointValue );
        }

        function calculateTechnicalTaxPointsForSwiss( treatment ) {
            if( !treatment.technicalTaxPoints || !treatment.technicalScalingFactor || !treatment.taxPointValue ) {
                return Y.doccirrus.comctl.numberToLocalString( 0 );
            }
            return Y.doccirrus.comctl.numberToLocalString( treatment.technicalTaxPoints * treatment.technicalScalingFactor * treatment.taxPointValue );
        }

        /**
         * generate all barcode form mappers
         */

        barcodes.forEach( generateBarcodeMapper );

        Y.namespace( 'dcforms.mapper' ).genericformmappers = {
            getAddressAsString: getAddressAsString,
            concat: concat
        };

    },
    '0.0.1',
    {
        requires: [
            'dcgenericmapper-util',
            'activity-schema',
            'calendar-schema',
            'catalogusage-schema',
            'dcforms-schema-InCase-T',
            'dcregexp',
            'dcformmap-util',
            'dcforms-labdata-mapping-helper',
            'dcforms-schema-AMTSFormMapper-T',
            'v_meddata-schema',
            'tag-schema',
            'dc-comctl',
            'dckbvutils',
            'v_treatment-schema'
        ]
    }
);
