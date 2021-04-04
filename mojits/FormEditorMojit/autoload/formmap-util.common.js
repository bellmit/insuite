/**
 * User: rrrw
 * Date: 26.01.15  13:08
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */


/*global YUI, async, require */

'use strict';

YUI.add( 'dcformmap-util', function( Y, NAME ) {

        /**
         *
         *
         *   NON-KO HELPER FUNCTIONS
         *
         *
         *   This library of helper functions is available via Y.dcforms.mapper.objUtils
         *
         *   Here you find all text manipulations.  ko.unwrap is mocked here for the server.
         *
         */

            // require moment cross-platform
        var
            i18n = Y.doccirrus.i18n,
            _k = Y.dcforms.mapper.koUtils.getKo(),
            moment = Y.doccirrus.commonutils.getMoment(),

            // get default time formats
            TIMESTAMP_FORMAT = i18n( 'general.TIMESTAMP_FORMAT' ),
            TIMESTAMP_FORMAT_LONG = i18n( 'general.TIMESTAMP_FORMAT_LONG' ),
            TIME_FORMAT = i18n( 'general.TIME_FORMAT' ),

            // class linkers, will become ES6 imports later on
            MedDataItemTemplateCollection = Y.doccirrus.schemas.tag.MedDataItemTemplateCollection;

        /**
         *  Make a space-padded string of the given size
         *  @param  txt         {String}    string to pad or trim
         *  @param  limit       {Number}    Length of returned string
         *  @param  alignRight  {Boolean}   Align the string to the right, if padding
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
         * concatenate any number of strings, taking care with spacing in between.
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

        /**
         * Given a list of subtotals by Vat Type as an object:
         * {
         *   0: 905,
         *   3: 811.66,
         *   7: 120.10
         * }
         *
         * Present the text block:
         *
         *    905,00e (0%);  811,66e (7%, 67,90e);  120,10e (19%, 23,88e)
         *
         * @param   {Object}    vatListObject
         * @param   {String}    currency            EUR/CHF
         * @returns {String}
         */

        function getVatSummary( vatListObject, currency ) {
            var
                result = '',
                keys = Object.keys( vatListObject ) || [];

            keys.forEach( function( item ) {
                var
                    vatPerc,
                    vat,
                    vatType = +item;
                // get percent from code
                vatPerc = Y.doccirrus.vat.getPercent( vatType );
                // get amount from code
                vat = Y.doccirrus.vat.calculateAmt( vatListObject[item], vatType );

                if( result ) {
                    result += ';  ';
                }
                result += Y.doccirrus.comctl.numberToLocalCurrency( vatListObject[item], true, currency ) +
                          ' (' + vatPerc + (vatPerc ? '%, ' + Y.doccirrus.comctl.numberToLocalCurrency( vat, true ) : '%') +
                          ')';
            } );

            return result;
        }

        /**
         * Produce an Arztstempel from data setup with additional data.
         *
         * replaced by profile filed and bfbfArztstempel fields
         *
         * @param data  {Object}    practice object
         *  @deprecated
         */

        function getDocBlock( data ) {
            var tstr1, tstr2, res = '';

            // <Arzt_Name_kompl>
            if( data.employeeTitle ) {
                res += data.employeeTitle;
            }
            if( data.employeeFirstname ) {
                res += res ? ' ' + data.employeeFirstname : data.employeeFirstname;
            }
            if( data.employeeNameaffix ) {
                res += ' ' + data.employeeNameaffix;
            }
            if( data.employeeLastname ) {
                res += ' ' + data.employeeLastname;
            }
            res += '\n';

            // <Praxis_Strasse> <Praxis_Hausnummer>
            res += data.locStreet + ' ' + data.locHouseno;
            res += '\n';

            // <Praxis_PLZ> <Praxis_Ort>
            res += data.locZip + ' ' + data.locCity;
            res += '\n';

            // Tel.: <Praxis_Telefon>
            res += 'Tel.: ' + data.locPhone;
            res += '\n';
            // Fax: <Praxis_Fax>
            res += 'Fax: ' + data.locFax;
            res += '\n';
            // LANR <LANR> / BSNR <BSNR>
            tstr1 = 'LANR ' + data.employeeOfficialNo;
            tstr2 = 'BSNR ' + data.commercialNo;
            if( tstr1.length + tstr2.length + 3 < 25 ) {
                res += tstr1 + ' / ' + tstr2 + '\n';
            }
            else {
                res += tstr1 + ' / \n' + tstr2 + '\n';
            }
            return res;
        }

        /**
         *  Chiffre = standard "anonymous" patient designation for PTV forms
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
         *
         *  @param formData
         *  @param insurance
         */

        function setPaidStatus( formData, insurance ) {
            var
                paidFree = _k.unwrap( insurance.paidFree ) || false,
                paidFreeTo = _k.unwrap( insurance.paidFreeTo );

            if( paidFree && paidFreeTo ) {
                paidFreeTo = moment( paidFreeTo );
                if( paidFreeTo.isValid() && moment().isAfter( paidFreeTo ) ) {
                    paidFree = false;
                }
            }

            //  don't overwrite these on approval
            if( false === Y.dcforms.isOnServer ) {
                formData.paidFree = paidFree;
                formData.paid = !paidFree;
            }
        }

        function getAddressAsString( adrObj ) {
            if( !adrObj ) {
                return '';
            }
            return '' +
                   _k.unwrap( adrObj.street ) + ' ' +
                   _k.unwrap( adrObj.houseno ) + '<br/>' +
                   _k.unwrap( adrObj.zip ) + ' ' +
                   _k.unwrap( adrObj.city );
        }

        /**
         *
         *  @deprecated
         * @param formData
         * @param activity
         */
        function setupFindingMedicationDiagnoses( formData, activity ) {

            var linkedActivities = Y.dcforms.mapper.objUtils.getAllLinkedActivities( activity );

            function addSeparator( str ) {
                if( str.length ) {
                    return ', ';
                }
                return '';
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

            formData.findings = '';
            formData.medications = '';
            formData.diagnosesBC = '';
            formData.diagnosesLongBC = '';

            if( Array.isArray( linkedActivities ) ) {
                linkedActivities.forEach( function( act ) {
                    if( 'FINDING' === _k.unwrap( act.actType ) && _k.unwrap( act.userContent ) ) {
                        formData.findings += addSeparator( formData.findings );
                        formData.findings += _k.unwrap( act.userContent );
                    } else if( 'MEDICATION' === _k.unwrap( act.actType ) ) {
                        formData.medications += addSeparator( formData.medications );
                        formData.medications += _k.unwrap( act.phNLabel );
                    } else if( 'DIAGNOSIS' === _k.unwrap( act.actType ) ) {
                        formData.diagnosesBC += addSeparator( formData.diagnosesBC );
                        formData.diagnosesLongBC += addSeparator( formData.diagnosesBC );
                        formData.diagnosesBC += generateDiagnosisText( act );
                        formData.diagnosesLongBC += generateDiagnosisText( act, true );
                    }
                } );
            }

        }

        /**
         *
         *  @deprecated
         * @param formData
         * @param currentActivity
         * @param currentPatient
         * @param officialAddress
         * @param postalAddress
         * @param poboxAddress
         * @param callback
         */
        function setupFormdataPatient( formData, currentActivity, currentPatient, officialAddress, postalAddress, poboxAddress, callback ) {


            var
                asyncServer,
                phys = _k.unwrap( currentPatient.physicians ),
                currentPhysician = (phys && phys.length && phys[0]) ? phys[0] : null,
                parallelQuery,
                caseFolderId = _k.unwrap( currentActivity.caseFolderId );

            function setupData( response ) {
                var
                    caseFolder,
                    eds,
                    birthmom,
                    tsmom,
                    insuranceStatus,
                    insurance;

                caseFolder = response;

                if( response && response.data && response.data.length ) {
                    caseFolder = response.data[0];
                }

                /*
                 Schema       -   Definition from PO
                 ========     ===============
                 date         -  TreatmentDate DD.MM.YY
                 timestamp    -  TreatmentDate DD.MM.YY
                 dateNormal   -  TreatmentDate DD.MM.YYYY
                 dob          -  D.o.B. as an existant date DD.MM.YYYY
                 dobSmaller   -  KBV DoB DD.MM.YY (can also be 00.00.1987)
                 dd
                 mm
                 yy
                 yyyy
                 age
                 editDate     -  EditDate
                 currentDate  -  Date() == today's date
                 */
                tsmom = moment.utc( _k.unwrap( currentActivity.timestamp ) ).local();
                formData.timestampDate = tsmom.toDate();
                formData.timestamp = tsmom.format( 'DD.MM.YY' );
                formData.timestampBFB = tsmom.format( 'DDMMYY' );
                formData.dateNormal = tsmom.format( 'DD.MM.YYYY' );
                formData.date = tsmom.format( 'DD.MM.YY' );
                eds = _k.unwrap( currentActivity.editor );
                if( eds[0] && eds[0]._id ) {
                    formData.editDate = moment.utc( Y.doccirrus.commonutils.dateFromObjectId( eds[0]._id ) ).local().format( 'DD.MM.YY' );
                }
                birthmom = moment.utc( _k.unwrap( currentPatient.dob ) ).local();
                formData.age = ( currentPatient.dateOfDeath && _k.unwrap( currentPatient.dateOfDeath ) ) ? moment( _k.unwrap( currentPatient.dateOfDeath ) ).diff( birthmom, 'years' ) :
                    moment().diff( birthmom, 'years' );
                formData.dobSmaller = getDob( currentPatient );  // will always be correctly formatted. (region!)
                formData.dob = birthmom.format( 'DD.MM.YYYY' );
                formData.kbvDob = _k.unwrap( currentPatient.kbvDob );
                formData.dd = birthmom.format( 'DD' );
                formData.mm = birthmom.format( 'MM' );
                formData.yy = birthmom.format( 'YY' );
                formData.yyyy = birthmom.format( 'YYYY' );

                Y.mix( formData, {
                    'activityId': currentActivity._id,
                    'patientId': currentPatient._id,
                    'actType': _k.unwrap( currentActivity.actType ),

                    'userContent': _k.unwrap( currentActivity.userContent ) || '',
                    'title': _k.unwrap( currentPatient.title ),
                    'firstname': _k.unwrap( currentPatient.firstname ),
                    'nameaffix': _k.unwrap( currentPatient.nameaffix ) || '',
                    'lastname': _k.unwrap( currentPatient.lastname ),
                    'fullname': _k.unwrap( currentPatient.firstname ) + ' ' + _k.unwrap( currentPatient.lastname ),

                    'address': '',
                    'postbox': '',
                    'houseno': '',
                    'street': '',
                    'zip': '',
                    'city': '',
                    'country': '',
                    'countryCode': '',

                    'workingAt': _k.unwrap( currentPatient.workingAt ) || '',
                    'jobTitle': _k.unwrap( currentPatient.jobTitle ) || '',

                    'currentDate': moment.utc( new Date().getTime() ).local().format( 'DD.MM.YYYY' ),
                    'currentSmall': moment.utc( new Date().getTime() ).local().format( 'DD.MM.YY' ),
                    'displayname': _k.unwrap( currentPatient.firstname ) + ' ' + _k.unwrap( currentPatient.lastname ),
                    'chiffre': makeChiffre( currentPatient ),

                    'insuranceName': '',
                    'insuranceNo': '',
                    'insuranceId': '',
                    'insuranceKind': '',
                    'persGroup': '',
                    'dmp': '',
                    'insuranceGrpId': '',

                    //  TODO - checkme - is Gultigkeitsdatum the insuraceState.validTo date?

                    'insuranceValidTo': '',
                    'insuranceValidToSlash': '',
                    'isBVG': '',

                    'isASV': Boolean(caseFolder && 'ASV' === caseFolder.additionalType ),
                    'asvTeamReferral': _k.unwrap( currentActivity.asvTeamReferral ),
                    'asvTeamnumber': '',

                    'employeeTitle': '',
                    'employeeTalk': '',
                    'employeeFirstname': '',
                    'employeeNameaffix': '',
                    'employeeLastname': '',
                    'employeeOfficialNo': '',
                    'employeeType': '',
                    'employeeDepartment': '',
                    'employeeNo': '',
                    'employeeSpecialities': '',
                    'specialisationText': '',

                    'commercialNo': '',
                    'doctorNumber': ''
                } );

                if ( formData.isASV ) {
                    formData.asvTeamnumber = caseFolder.identity;
                }

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
                        formData.countryCode = _k.unwrap( poboxAddress.countryCode );
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
                    formData.countryCode = _k.unwrap( officialAddress.countryCode );
                }

                //  add insurance details
                insuranceStatus = _k.unwrap( currentPatient.insuranceStatus );
                // get insurance by casefolder
                if( caseFolder && insuranceStatus && insuranceStatus.length ) {
                    insuranceStatus.some( function( _insurance ) {
                        if( _k.unwrap( _insurance.type ) === caseFolder.type ) {
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
                    formData.persGroup = _k.unwrap( insurance.persGroup ) || '';
                    formData.dmp = _k.unwrap( insurance.dmp ) || '';
                    formData.insuranceGrpId = _k.unwrap( insurance.insuranceGrpId ) || '';
                    formData.insuranceValidTo = _k.unwrap( insurance.fk4110 ) || '';
                    formData.insuranceValidToSlash = (_k.unwrap( insurance.fk4110 )) ? moment.utc( _k.unwrap( insurance.fk4110 ) ).local().format( 'MM/YY' ) : '';
                    formData.locationFeatures = _k.unwrap( insurance.locationFeatures ) || '';
                    formData.isBVG = '02' === _k.unwrap( insurance.costCarrierBillingSection );
                    setPaidStatus( formData, insurance );
                }

                //  add personalienfeld / patient data

                formData.patient = {
                    "talk": _k.unwrap( currentPatient.talk ),
                    "title": _k.unwrap( currentPatient.title ),
                    "firstname": _k.unwrap( currentPatient.firstname ),
                    "nameaffix": _k.unwrap( currentPatient.nameaffix ),
                    "nameinfix": _k.unwrap( currentPatient.fk3120 ) || '',
                    "lastname": _k.unwrap( currentPatient.lastname ),
                    "fullname": formData.fullname,
                    "civilStatus": _k.unwrap( currentPatient.civilStatus ),
                    "comment": _k.unwrap( currentPatient.comment ),
                    "gender": _k.unwrap( currentPatient.gender ),
                    "lang": _k.unwrap( currentPatient.lang ),
                    "dob": formData.dob,
                    "jobTitle": formData.jobTitle,
                    "communications": '',
                    "insuranceName": formData.insuranceName,
                    "insuranceNumber": formData.insuranceNo,
                    "insuranceKind": formData.insuranceKind,
                    "persGroup": formData.persGroup,
                    "dmp": formData.dmp,
                    "insuranceGrpId": formData.insuranceGrpId,
                    "doctorNumber": '',
                    "transactionDate": formData.date,
                    "insuranceId": formData.insuranceId,
                    "locationFeatures": formData.locationFeatures,
                    "insurancePrintName": formData.insurancePrintName,
                    "commercialNo": ''
                };

                formData.isMale = 'MALE' === _k.unwrap( currentPatient.gender ) ||
                                  'UNDEFINED' === _k.unwrap( currentPatient.gender );
                formData.isFemale = 'FEMALE' === _k.unwrap( currentPatient.gender ) ||
                                    'UNDEFINED' === _k.unwrap( currentPatient.gender );

                formData.patientId = _k.unwrap( currentPatient.patientNo ) || '';
                formData.patient.talk = Y.doccirrus.schemaloader.translateEnumValue( '-de', _k.unwrap( currentPatient.talk ), Y.doccirrus.schemas.person.types.Talk_E.list, 'k.A.' );

                formData.talk = formData.patient.talk;

                formData.patient.transactionDateSmaller = formData.currentSmall;
                if( currentActivity.hasOwnProperty( 'base' ) && currentActivity.base.hasOwnProperty( 'timestamp' ) ) {
                    formData.patient.transactionDate = _k.unwrap( currentActivity.base.timestamp );
                    formData.patient.transactionDateSmaller = moment.utc( formData.patient.transactionDate ).local().format( 'DD.MM.YY' );
                }

                //  name and address formatted for personalienfeld
                formData.patient.nameAndAddress = '' +
                                                  strLimit( formData.lastname, 30 ) + '<br>' +
                                                  strLimit( formData.title + ' ' + formData.firstname + ' ' + formData.nameaffix, 19 ) + '<br>' +
                                                  strLimit( formData.street + ' ' + formData.houseNo, 19 ) + '<br>' +
                                                  strLimit( formData.zip + ' ' + formData.city, 19 );
                //  secondary personalienfeld mapping for forms which need postal addresses in the personalienfeld
                formData.patient2 = Y.mix( {}, formData.patient );

                //formData.patient.transactionDate = moment.utc( formData.patient.transactionDate ).local().format( 'DD.MM.YY' );
                formData.diagnoses = '';

                // add physicians info
                formData.physicianAddress =
                    'STRASSE HAUSNUMMER\n' +
                    'PLZ STADT';
                formData.physicianName = 'z. Hd. ARZTNAME';
                if( currentPatient.physiciansObj ) {
                    if( currentPatient.physiciansObj.addresses ) {
                        formData.physicianAddress = getAddressAsString( currentPatient.physiciansObj.addresses[0] );
                    }

                    formData.physicianName = concat(
                        Y.doccirrus.schemaloader.translateEnumValue( '-de', _k.unwrap( currentPatient.physiciansObj.talk ), Y.doccirrus.schemas.person.types.Talk_E.list, '' ),
                        currentPatient.physiciansObj.title,
                        currentPatient.physiciansObj.firstname,
                        currentPatient.physiciansObj.nameaffix,
                        currentPatient.physiciansObj.lastname
                    );
                    if( formData.physicianName ) {
                        formData.physicianName = 'z. Hd. ' + formData.physicianName;
                    } else {
                        formData.physicianName = 'z. Hd. ARZTNAME';
                    }
                }
                callback();
            }

            function parallelSetupData( err, response ) {

                if( err ) {
                    Y.log( 'Cannot load casefolder data, or primaryDoc: ' + JSON.stringify( err ), 'warn', NAME );
                    callback( err );
                    return;
                }

                if( response.length > 0 ) {
                    if( response[1] && response[1].data && response[1].data.length ) {
                        // set the primary doc's data
                        currentPatient.physiciansObj = response[1].data[0];
                    }
                    setupData( response[0] );
                } else {
                    Y.log( 'casefolder data or primaryDoc data missing: ' + JSON.stringify( response ), 'warn', NAME );
                    return callback( new Error( 'Cannot load casefolder data, or primaryDoc' ) );
                }

            }

            if( Y.doccirrus.commonutils.isClientSide() ) {
                parallelQuery = [
                    function( _cb ) {
                        Y.doccirrus.jsonrpc.api.casefolder.read( {
                            query: {
                                _id: caseFolderId
                            }
                        } ).done( function( response ) {
                            _cb( null, response );
                        } ).fail( _cb );
                    }
                ];
                if( currentPhysician ) {
                    parallelQuery.push( function( _cb ) {
                            Y.doccirrus.jsonrpc.api.physician.read( {
                                query: {
                                    _id: _k.unwrap( currentPhysician )
                                }
                            } ).done( function( response ) {
                                _cb( null, response );
                            } ).fail( _cb );
                        }
                    );
                }
                async.parallel( parallelQuery, parallelSetupData );

            } else {
                asyncServer = require( 'async' );
                Y.log( 'Loading casefolder: ' + caseFolderId, 'debug', NAME );
                parallelQuery = [
                    function( _cb ) {
                        Y.doccirrus.api.casefolder.getCaseFolderById( currentActivity._user, caseFolderId, _cb );
                    }
                ];
                if( currentPhysician ) {
                    parallelQuery.push( function( _cb ) {
                            Y.doccirrus.api.physician.get( {
                                user: currentActivity._user,
                                query: {
                                    _id: _k.unwrap( currentPhysician )
                                },
                                callback: _cb
                            } );
                        }
                    );
                }
                asyncServer.parallel( parallelQuery, parallelSetupData );
            }

        }

        /**
         *
         *  @deprecated
         * @param formData
         * @param officialAddress
         * @param postalAddress
         * @param poboxAddress
         */
        function setupPersonalienfeld( formData, officialAddress, postalAddress, poboxAddress ) {
            // additional KVK logic, see MOJ-2180
            var
                insuranceId = (7 === (formData.insuranceId && formData.insuranceId.length) ? '10' + formData.insuranceId : formData.insuranceId ),
                useLocationFeatures = formData.locationFeatures;

            function getStrOrPob( address, pbox ) {
                var strOrPob,
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
                } else {
                    if( pbox ) {
                        postbox = _k.unwrap( pbox.postbox ) || '';
                        strOrPob = 'Postfach ' + postbox;
                    }
                }
                return strOrPob;
            }

            function getLine5( address, pbox ) {
                var countryCode, zip, city;
                if( address ) {
                    countryCode = _k.unwrap( address.countryCode ) || '';
                    zip = _k.unwrap( address.zip ) || '';
                    city = _k.unwrap( address.city ) || '';
                } else if( pbox ) {
                    countryCode = _k.unwrap( pbox.countryCode ) || '';
                    zip = _k.unwrap( pbox.zip ) || '';
                    city = _k.unwrap( pbox.city ) || '';
                }
                return strLimit( countryCode +
                       ' ' + zip +
                       ' ' + city, 24 ) +
                       '&nbsp;' + formData.insuranceValidToSlash;
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
                    countryCode: _k.unwrap( officialAddress.countryCode )
                };
            }
            if( poboxAddress ) {
                formData.poboxAddressBC = {
                    zip: _k.unwrap( poboxAddress.zip ),
                    city: _k.unwrap( poboxAddress.city ),
                    postbox: _k.unwrap( poboxAddress.postbox ),
                    countryCode: _k.unwrap( poboxAddress.countryCode )
                };
            }

            //  Prevent crash on server in case of missing fields
            formData.houseno = formData.houseno || '';
            formData.street = formData.street || '';
            formData.zip = formData.zip || '';
            formData.countryCode = formData.countryCode || '';

            //  initialize formData patient object if we don't yet have one
            formData.patient = formData.patient ? formData.patient : {};

            //  WOP may not be displayed if set in schein but not in insurance information, MOJ-7769
            if ( '' === useLocationFeatures && formData.scheinLocationFeatures && '' !== formData.scheinLocationFeatures ) {
                useLocationFeatures = formData.scheinLocationFeatures;
            }

            formData.patient.line1 = strLimit( formData.insurancePrintName || formData.insuranceName, 24 ) + '&nbsp;&nbsp;&nbsp;&nbsp;' + strLimitRight( useLocationFeatures, 2 );
            formData.patient.line2 = strLimit( formData.lastname, 30 );
            formData.patient.line3 = strLimit( concat( formData.title, formData.firstname, formData.nameaffix, formData.patient.nameinfix ), 21 ) + '&nbsp;' + formData.dobSmaller;
            formData.patient.line4 = strLimit( getStrOrPob( officialAddress, poboxAddress ), 30 );
            formData.patient.line5 = strLimit( formData.countryCode + ' ' + formData.zip + ' ' + formData.city, 24 ) + '&nbsp;' + formData.insuranceValidToSlash;
            formData.patient.line6 = strLimit( insuranceId, 9 ) + '&nbsp;' + strLimit( formData.insuranceNo || formData.fk4124, 12 ) + '&nbsp;' + strLimit( formData.insuranceKind, 1 ) + strLimitRight( formData.persGroup, 2 ) + strLimitRight( formData.dmp, 2 ) + '&nbsp;' + strLimit( ' '/*asv*/, 1 );

            var commercialNoOrAsvTeamnumber = formData.commercialNo;

            if( formData.isASV && !(('REFERRAL' === formData.actType || 'LABREQUEST' === formData.actType) && !formData.asvTeamReferral) && 'AU' !== formData.actType ) {
                commercialNoOrAsvTeamnumber = formData.asvTeamnumber;
            }

            formData.patient.line7 = strLimit( commercialNoOrAsvTeamnumber, 9 ) + '&nbsp;' + strLimit( formData.doctorNumber, 9 ) + '&nbsp;&nbsp;' + formData.timestamp;

            //  fall back to official address is none other
            if( !postalAddress ) {
                postalAddress = officialAddress;
            }

            //  initialize formData patient object if we don't yet have one
            formData.patient2 = formData.patient2 ? formData.patient2 : {};

            //  Secondary personalientfeld binding for forms requiring a postal address
            formData.patient2.line1 = formData.patient.line1;
            formData.patient2.line2 = formData.patient.line2;
            formData.patient2.line3 = formData.patient.line3;

            if( postalAddress || poboxAddress ) {
                formData.patient2.line4 = strLimit( getStrOrPob( postalAddress, poboxAddress ), 30 );
                formData.patient2.line5 = getLine5( postalAddress, poboxAddress );

            } else {
                formData.patient2.line4 = formData.patient.line4;
                formData.patient2.line5 = formData.patient.line5;
            }

            formData.patient2.line6 = formData.patient.line6;
            formData.patient2.line7 = formData.patient.line7;
        }

        /**
         *
         *  @deprecated
         * @param data
         * @param activity
         * @param patient
         * @param callback
         */
        function setAdditionalFormData( data, activity, patient, callback ) {

            function onAdditionalDataLoaded( response ) {
                var schein,
                    loc,
                    emp,
                    _data = response && response.data;

                //  NOTE: on server properties are inherited from schema, so hasOwnProperty will return false
                //  even if the property exists.  Underyling cause of MOJ-4509

                if( _data.employee ) {
                    emp = _data.employee;
                    data.employeeTalk = emp.talk ? Y.doccirrus.schemaloader.translateEnumValue( '-de', emp.talk, Y.doccirrus.schemas.person.types.Talk_E.list, '' ) : '';
                    data.employeeTitle = emp.title ? emp.title : '';
                    data.employeeFirstname = emp.firstname ? emp.firstname : '';
                    data.employeeNameaffix = emp.nameaffix ? emp.nameaffix : '';
                    data.employeeLastname = emp.lastname ? emp.lastname : '';

                    data.employeeOfficialNo = emp.officialNo ? emp.officialNo : '';
                    data.employeeType = emp.type ? emp.type : '';
                    data.employeeTypeTranslated = emp.type ? Y.doccirrus.schemaloader.getEnumListTranslation( 'employee', 'Employee_E', emp.type, 'i18n' ) : '';
                    data.employeeDepartment = emp.department ? emp.department : '';
                    data.employeeNo = emp.employeeNo ? emp.employeeNo : '';
                    data.employeeSpecialities = (emp.specialities && emp.specialities.length > 0) ? emp.specialities.join( ', ' ) : '';
                    data.specialisationText = emp.specialisationText ? emp.specialisationText : '';

                    data.doctorNumber = data.employeeOfficialNo;
                    if( !data.patient ) {
                        data.patient = {};
                    }
                    data.patient.doctorNumber = data.employeeOfficialNo;
                }

                if( _data.location ) {
                    loc = _data.location;
                    data.commercialNo = loc.commercialNo ? loc.commercialNo : '';
                    if( !data.patient ) {
                        data.patient = {};
                    }
                    data.locName = loc.locname ? loc.locname : '';
                    data.patient.commercialNo = data.commercialNo;
                    data.locPhone = loc.phone ? loc.phone : '';
                    data.locFax = loc.fax ? loc.fax : '';
                    data.locStreet = loc.street ? loc.street : '';
                    data.locHouseno = loc.houseno ? loc.houseno : '';
                    data.locZip = loc.zip ? loc.zip : '';
                    data.locCity = loc.city ? loc.city : '';
                }

                if( _data.schein ) {
                    schein = _data.schein;
                    data.fk4124 = schein.fk4124;
                    data.scheinLocationFeatures = schein.locationFeatures;
                    data.scheinTreatmentType = schein.treatmentType;
                    data.scheinIncludesBSK = schein.includesBSK;
                    data.scheinIsChiefPhysician = schein.isChiefPhysician;
                }

                if( _data.kbvCertNumbers ) {
                    data.certNumber = _data.kbvCertNumbers.bfbCertNumber;
                }

                callback();
            }

            function onServerAPICall( err, response ) {
                if( err ) {
                    Y.log( 'Cannot load additional patient data: ' + JSON.stringify( err ), 'warn', NAME );
                    callback( err );
                    return;
                }

                if( !response ) {
                    //  prevents crash for now, otherwise undesirable
                    Y.log( 'Patient API could not load additional form data, empty object returned', 'warn', NAME );
                    response = {};
                }

                if( Y.dcforms.isOnServer ) {
                    if( !response.data ) {
                        Y.log( 'Running on server, reformatting response...', 'debug', NAME );
                        onAdditionalDataLoaded( { 'data': response } );
                        return;
                    }
                }

                if( !response.data ) {
                    response.data = {};
                }

                onAdditionalDataLoaded( response );
            }

            var patientId = patient._id,
                timestamp = _k.unwrap( activity.timestamp ),
                employeeId = _k.unwrap( activity.employeeId ),
                locationId = _k.unwrap( activity.locationId ),
                caseFolderId = _k.unwrap( activity.caseFolderId );

            if( Y.doccirrus.commonutils.isClientSide() ) {
                Y.doccirrus.jsonrpc.api.patient.additionalFormData( {
                    query: {
                        patientId: patientId,
                        timestamp: timestamp,
                        employeeId: employeeId,
                        locationId: locationId,
                        caseFolderId: caseFolderId
                    }
                } ).done( onAdditionalDataLoaded ).fail( callback );
            } else {
                Y.doccirrus.api.patient.additionalFormData( {
                    user: activity._user,
                    query: {
                        patientId: patientId,
                        timestamp: timestamp,
                        employeeId: employeeId,
                        locationId: locationId,
                        caseFolderId: caseFolderId
                    },
                    callback: onServerAPICall
                } );
            }

        }

        function getBarcode( type, formData, config ) {
            var timestamp;
            var activity = config && config.context && config.context.activity;

            /**
             *  Cut or pad a string to the given length
             *
             *  @param  str       {String}
             *  @param  len       {Number}
             *  @param  [pad]     {String}
             *  @param  [padLeft] {Boolean}
             *  @param  [leaveEmpty] {Boolean}
             */
            function ll( str, len, pad, padLeft, leaveEmpty ) {

                if( 'undefined' === typeof str || 'null' === str ) {
                    str = '';
                }

                if( !str && leaveEmpty ) {
                    return '';
                }

                if( str.length > len ) {
                    return str.substr( 0, len );
                }
                while( pad && str.length < len ) {
                    if( padLeft ) {
                        str = pad + str;
                    } else {
                        str += pad;
                    }
                }
                return str || "";
            }

            /**
             *  maps a boolean to either 1 or nothing
             *  @param  val {Boolean}
             */
            function ab( val ) {
                return val ? "1" : "";
            }

            /**
             *  maps a boolean to either 1 or nothing
             *  @param  val {Boolean}
             */
            function abz( val ) {
                return val ? "1" : "0";
            }

            /**
             *  formats date in standard barcode format
             *  @param  val {Date||String}
             */
            function fd( val ) {
                return val ? moment( val ).format( "YYYYMMDD" ) : '';
            }
            /**
             *  formats date in short barcode format
             *  @param  val {Date||String}
             */
            function sd( val ) {
                return val ? moment( val ).format( "YYMMDD" ) : '';
            }

            /**
             *  formats date in yearless barcode format
             *  @param  val {Date||String}
             */
            function md( val ) {
                return val ? moment( val ).format( "MMDD" ) : '';
            }
            /**
             *  formats date in dayless barcode format
             *  @param  val {Date||String}
             */
            function ym( val ) {
                return val ? moment( val ).format( "YYMM" ) : '';
            }

            /**
             *  maps a set of key/values to one of their keys for which the value is true
             *  @param  mapData {Object}
             *  @param  [start] {Number} to use as base for numeric mapping
             */
            function reverseMap( mapData, start, defaultRet ) {
                var
                    values = mapData,
                    ret = (typeof defaultRet === 'string') ? defaultRet : '0',
                    i;

                if( "undefined" === typeof start ) {
                    start = 1; //most of these start with 1
                }
                if( mapData.length ) {
                    mapData = {};
                    for( i = 0; i < values.length; i++ ) {
                        mapData[start + i] = values[i];
                    }
                }
                Object.keys( mapData ).forEach( function( key ) {
                    if( mapData[key] ) {
                        ret = key;
                    }
                } );
                return ret;
            }

            timestamp = fd( formData.timestampDate );

            function addressString() {
                var add = "";

                if( !formData.officialAddressBC ) {
                    Y.log( 'Barcode missing official address.', 'warn', NAME );
                    return '';
                }

                if ( !formData.poboxAddressBC ) {
                    //  legacy and imported data may be missing fields in addresses
                    formData.poboxAddressBC = { zip: '', city: '', postbox: '', countryCode: '' };
                }

                add += ll( formData.officialAddressBC.zip, 10 ) + "\t";
                add += ll( formData.officialAddressBC.city, 40 ) + "\t";
                add += ll( formData.officialAddressBC.street, 46 ) + "\t";
                add += ll( formData.officialAddressBC.houseno, 9 ) + "\t";
                add += ll( formData.officialAddressBC.countryCode, 3 ) + "\t";

                add += ll( formData.officialAddressBC.zip ? '' : formData.poboxAddressBC.zip, 10 ) + "\t";
                add += ll( formData.officialAddressBC.city ? '' : formData.poboxAddressBC.city, 40 ) + "\t";
                add += ll( (formData.officialAddressBC.street && formData.officialAddressBC.houseno ) ? '' : formData.poboxAddressBC.postbox, 8 ) + "\t";
                add += ll( formData.officialAddressBC.countryCode ? '' : formData.poboxAddressBC.countryCode, 3 );
                return add;
            }

            function genderString() {
                return formData.genderUpperCase;
            }

            function reformatKbvDob( kbvDob ) {
                var dob = '', splitted;
                if( 'string' === typeof kbvDob ) {
                    splitted = kbvDob.split( '.' );
                    if( 3 === splitted.length ) {
                        dob = splitted[2] + splitted[1] + splitted[0];
                    }
                }
                return dob;
            }

            function nameDobString() {
                return ll( formData.lastname, 45 ) + "\t" +
                       ll( formData.firstname, 45 ) + "\t" +
                       ll( reformatKbvDob( formData.kbvDob ), 8 );
            }

            function insuranceString( isExtended ) {
                var
                    useLocationFeatures = formData.locationFeatures || '',
                    ret = '' +
                        fd( formData.insuranceValidTo ) + "\t" +
                        ll( formData.insuranceId, 9 ) + "\t";

                //  WOP may not be displayed if present in schein but not patient insurance information, MOJ-7769
                if ( '' === useLocationFeatures && formData.scheinLocationFeatures && '' !== formData.scheinLocationFeatures ) {
                    useLocationFeatures = formData.scheinLocationFeatures;
                }

                if( isExtended ) {
                    ret += ll( formData.insurancePrintName || formData.insuranceName, 24 ) + "\t" + //Kostenträgername
                           ll( useLocationFeatures, 2 ) + "\t"; //WOP
                }
                ret += ll( formData.insuranceNo || (isExtended && formData.fk4124), 12 ) + "\t" +
                       ll( formData.insuranceKind, 1 ) + "\t" +
                       ll( Y.doccirrus.kbvcommonutils.mapPersGroupToKVDT( formData.persGroup ), 2 ) + "\t" +
                       ll( Y.doccirrus.kbvcommonutils.mapDmpToKVDT( formData.dmp ), 2 );

                return ret;
            }

            function bsnrlanrString() {
                var isAsvContext = Boolean( formData.isASV ),
                    commercialNoOrAsvTeamnumber,
                    actType = activity && activity.actType && _k.unwrap( activity.actType ),
                    asvTeamReferral = activity && activity.asvTeamReferral && _k.unwrap( activity.asvTeamReferral );

                if( isAsvContext && !(('REFERRAL' === actType || 'LABREQUEST' === actType) && !asvTeamReferral) && 'AU' !== actType ) {
                    commercialNoOrAsvTeamnumber = formData.asvTeamnumber;
                } else {
                    commercialNoOrAsvTeamnumber = formData.commercialNo;
                }
                return ll( commercialNoOrAsvTeamnumber, 9 ) + "\t" +
                       ll( formData.employeeOfficialNo, 9 );
            }

            function gtxnString( options ) { //gender, title and extended name
                var printNoGender = options && options.printNoGender;
                return (!printNoGender ? (genderString() + "\t") : '') +
                       ll( formData.title, 20 ) + "\t" +
                       ll( formData.nameaffix, 20 ) + "\t" +
                       ll( formData.patient && formData.nameinfix, 20 );
            }

            function std1( isExtended ) {
                return nameDobString() + "\t" +
                       insuranceString( isExtended ) + "\t" +
                       bsnrlanrString() + "\t" +
                       timestamp;
            }

            function std2() {
                return insuranceString() + "\t" +
                       bsnrlanrString() + "\t" +
                       timestamp;
            }

            function checkboxString( checkboxes ) {
                var
                    ret = "",
                    atLeastOne = false,
                    i;

                for( i = 0; i < checkboxes.length; i++ ) {
                    if( checkboxes[i] ) {
                        atLeastOne = true;
                        ret += ((i + 1) < 10 ? "0" : "") + (i + 1) + "\t";
                    }
                }
                if( atLeastOne ) {
                    return ret.substring( 0, ret.length - 1 );
                } else {
                    return "";
                }
            }

            function notfallSchein() {
                return reverseMap( [
                    formData.notfallScheinNotfalldienst,
                    formData.notfallScheinUrlaub,
                    formData.notfallScheinNotfall
                ] );
            }

            function fixEncodingToIso8859_15( text ) {
                text = text.replace( /€/g, "¤" );
                text = text.replace( /Š/g, "¦" );
                text = text.replace( /š/g, "¨" );
                text = text.replace( /Ž/g, "´" );
                text = text.replace( /ž/g, "¸" );
                text = text.replace( /Œ/g, "¼" );
                text = text.replace( /œ/g, "½" );
                text = text.replace( /Ÿ/g, "¾" );
                text = text.replace( /™/g, '®' );
                return text;
            }

            function findingsAndMedications() {
                var
                    findingsString = formData.findings || '',
                    medicationsString = formData.medications || '',
                    separator = ( findingsString !== '' && medicationsString !== '' ) ? ', ' : '';

                return findingsString + separator + medicationsString;
                //return formData.findings + ((formData.findings && formData.findings.length && formData.medications && formData.medications.length) ? ', ' : '') + formData.medications;
            }

            /**
             *  Alternate version of this function for REFERRAL / Uberweisungschein, to allow editable text fields
             *  for linked activity description
             *  @return {string}
             */

            function findingsAndMedicationsReferral() {
                var
                    findingsString = formData.BFB6findingsText || formData.findings || '',
                    medicationsString = formData.BFB6medicationsText || formData.medications || '',
                    separator = ( findingsString !== '' && medicationsString !== '' ) ? ', ' : '';

                return findingsString + separator + medicationsString;
            }

            /**
             *  body of barcode 39 a and b including standard fields
             *  @return {string}
             */
            function barcode39() {
                function mapHPVImpfung( values ) {
                    var ret = '';
                    if( values[0] ) {
                        ret = '1';
                    } else if( values[1] ) {
                        ret = '2';
                    } else if( values[2] ) {
                        ret = '3';
                    } else if( values[3] ) {
                        ret = '9';
                    }
                    return ret;
                }

                var auftragsArt = '';
                var auftrag = '';
                var klinischerBefund = '';
                if( formData.BFB39_Auftragsart_Primaerscreening ) {
                    auftragsArt = 'P';
                } else if( formData.BFB39_Auftragsart_Abklaerungsdiagnostik ) {
                    auftragsArt = 'A';
                }
                if(formData.BFB39_Auftrag_Zyto){
                    auftrag = 'Zyto';
                } else  if(formData.BFB39_Auftrag_HPV){
                    auftrag = 'HPV';
                } else  if(formData.BFB39_Auftrag_KoTest){
                    auftrag = 'KoTest';
                }
                if( formData.BFB39_Klinischer_Befund_unauffaellig ) {
                    klinischerBefund = '0';
                } else if( formData.BFB39_Klinischer_Befund_auffaellig ) {
                    klinischerBefund = '1';
                }
                return "" +
                       ((activity && _k.unwrap( activity.requestId )) || "") + "\t" +
                       std1( true ) + "\t" +
                       gtxnString( {printNoGender: true} ) + "\t" +
                       addressString() + "\t" +
                       reverseMap( [formData.BFB39_Alterskategorie_20_29, formData.BFB39_Alterskategorie_30_34, formData.BFB39_Alterskategorie_ab_35], 1, '' ) + "\t" +
                       ll( auftragsArt, 1 ) + "\t" +
                       ll( auftrag, 6 ) + "\t" +
                       reverseMap( [formData.BFB39_Wiederholungsuntersuchung_Nein, formData.BFB39_Wiederholungsuntersuchung_Ja], 0 ) + "\t" +
                       ym( formData.BFB39_Datum_der_letzten_Untersuchung ) + "\t" +
                       ll( formData.BFB39_Gruppe, 5 ) + "\t" +
                       mapHPVImpfung( [formData.BFB39_HPV_Impfung_vollständig, formData.BFB39_HPV_Impfung_unvollständig, formData.BFB39_HPV_Impfung_keine, formData.BFB39_HPV_Impfung_unklar] ) + "\t" +
                       reverseMap( [formData.BFB39_Liegt_ein_HPV_HR_Testergebnis_vor_Nein, formData.BFB39_Liegt_ein_HPV_HR_Testergebnis_vor_Ja], 0, '' ) + "\t" +
                       reverseMap( [formData.BFB39_HPV_HR_Testergebnis_positiv, formData.BFB39_HPV_HR_Testergebnis_negativ, formData.BFB39_HPV_HR_Testergebnis_nicht_verwendbar], 1, '' ) + "\t" +
                       reverseMap( [formData.BFB39_Gyn_OP_Strahlen_oder_Chemotherapie_Nein, formData.BFB39_Gyn_OP_Strahlen_oder_Chemotherapie_Ja], 0 ) + "\t" +
                       ll( formData.BFB39_Art_der_Gyn_OP_Strahlen_oder_Chemotherapie, 16 ) + "\t" +
                       fd( formData.BFB39_Datum_der_Gyn_OP ) + "\t" +
                       fd( formData.BFB39_Letzte_Periode ) + "\t" +
                       reverseMap( [formData.BFB39_Gravidität_Nein, formData.BFB39_Gravidität_Ja], 0 ) + "\t" +
                       reverseMap( [formData.BFB39_Path_Gynäkologische_Blutungen_Nein, formData.BFB39_Path_Gynäkologische_Blutungen_Ja], 0 ) + "\t" +
                       reverseMap( [formData.BFB39_IUP_Nein, formData.BFB39_IUP_Ja], 0 ) + "\t" +
                       reverseMap( [formData.BFB39_Ovulationshemmer_Nein, formData.BFB39_Ovulationshemmer_Ja], 0 ) + "\t" +
                       ll( klinischerBefund, 1) + "\t" +
                       ll( formData.BFB39_Gyn_Diagnose, 240 );
            }

            function barcode10() {
                var isAfterQ32020 = Y.doccirrus.edmpcommonutils.isAfterTimestampQ( formData.timestampDate, '3/2020' );
                if( isAfterQ32020 ) {
                    return fixEncodingToIso8859_15(
                        "10\t\t12\t" +
                        ll( formData.labRequestId, 13 ) + "\t" +
                        nameDobString() + "\t" +
                        insuranceString( true ) + "\t" +
                        ll( formData.labRequestEstablishment, 9 ) + "\t" +
                        ll( formData.labRequestRemittor, 9 ) + "\t" +
                        bsnrlanrString() + "\t" +
                        timestamp + "\t" +
                        gtxnString() + "\t" +
                        addressString() + "\t" +
                        ll( formData.scheinSlipMedicalTreatment, 1 ) + "\t" +
                        ab( formData.fk4202 ) + "\t" +
                        ab( formData.kontrollunters ) + "\t" +
                        ll( formData.knappschaftskennzeichen ) + "\t" +
                        (formData.abnahmeDatumBFB ? formData.abnahmeDatumBFB : '') + "\t" +
                        (formData.abnahmeZeit ? formData.abnahmeZeit : '') + "\t" +
                        ab( formData.fk4204 ) + "\t" +
                        (formData.befEilt ? "2" : "") + "\t" +
                        ab( formData.befEiltTelBool ) + "\t" +
                        ab( formData.befEiltFaxBool ) + "\t" +
                        ll( formData.befEiltNr, 20 ) + "\t" +
                        ll( formData.ssw, 2 ) + "\t" +
                        ll( formData.diagnosesBC || '', 70 ) + "\t" +
                        ll( findingsAndMedications(), 140 ) + "\t" +
                        ll( formData.auftrag, 280 ) + "\t" +
                        ll( formData.certNumber, 15 ) );
                }

                return fixEncodingToIso8859_15(
                    "10\t\t11\t" +
                    ll( formData.labRequestId, 13 ) + "\t" +
                    nameDobString() + "\t" +
                    insuranceString( true ) + "\t" +
                    ll( formData.labRequestEstablishment, 9 ) + "\t" +
                    ll( formData.labRequestRemittor, 9 ) + "\t" +
                    bsnrlanrString() + "\t" +
                    timestamp + "\t" +
                    gtxnString() + "\t" +
                    addressString() + "\t" +
                    ll( formData.scheinSlipMedicalTreatment, 1 ) + "\t" +
                    ab( formData.fk4202 ) + "\t" +
                    ab( formData.kontrollunters ) + "\t" +
                    "\t" + // Ausnahmeindikation not certificated at the moment
                    (formData.abnahmeDatumBFB ? formData.abnahmeDatumBFB : '') + "\t" +
                    (formData.abnahmeZeit ? formData.abnahmeZeit : '') + "\t" +
                    ab( formData.fk4204 ) + "\t" +
                    (formData.befEilt ? "2" : "") + "\t" +
                    ll( formData.befEiltTel, 20 ) + "\t" +
                    ll( formData.befEiltFax, 20 ) + "\t" +
                    ll( formData.diagnosesBC || '', 70 ) + "\t" +
                    ll( findingsAndMedications(), 140 ) + "\t" +
                    ll( formData.auftrag, 280 ) + "\t" +
                    ll( formData.certNumber, 15 ) );
            }

            function barcode10L() {
                var isAfterQ32020 = Y.doccirrus.edmpcommonutils.isAfterTimestampQ( formData.timestampDate, '3/2020' );
                if( isAfterQ32020 ) {
                    return fixEncodingToIso8859_15(
                        "10\tL\t08\t" +
                        ll( formData.labRequestId, 13 ) + "\t" +
                        nameDobString() + "\t" +
                        insuranceString( true ) + "\t" +
                        ll( formData.labRequestEstablishment, 9 ) + "\t" +
                        ll( formData.labRequestRemittor, 9 ) +
                        bsnrlanrString() + "\t" +
                        timestamp + "\t" +
                        gtxnString() + "\t" +
                        addressString() + "\t" +
                        ll( formData.scheinSlipMedicalTreatment, 1 ) + "\t" +
                        ab( formData.fk4202 ) + "\t" +
                        ab( formData.kontrollunters ) + "\t" +
                        ll( formData.knappschaftskennzeichen ) + "\t" +
                        (formData.abnahmeDatumBFB ? formData.abnahmeDatumBFB : '') + "\t" +
                        (formData.abnahmeZeit ? formData.abnahmeZeit : '') + "\t" +
                        ab( formData.fk4204 ) + "\t" +
                        (formData.befEilt ? "2" : "") + "\t" +
                        ab( formData.befEiltTelBool ) + "\t" +
                        ab( formData.befEiltFaxBool ) + "\t" +
                        ll( formData.befEiltNr, 20 ) + "\t" +
                        ll( formData.ssw, 2 ) + "\t" +
                        ll( formData.diagnosesBC || '', 70 ) + "\t" +
                        ll( findingsAndMedications(), 140 ) + "\t" +
                        ll( formData.auftrag, 280 ) + "\t" +
                        ll( formData.certNumber, 15 ) );
                }

                return fixEncodingToIso8859_15(
                    "10\tL\t07\t" +
                    ll( formData.labRequestId, 13 ) + "\t" +
                    nameDobString() + "\t" +
                    insuranceString( true ) + "\t" +
                    ll( formData.labRequestEstablishment, 9 ) + "\t" +
                    ll( formData.labRequestRemittor, 9 ) +
                    bsnrlanrString() + "\t" +
                    timestamp + "\t" +
                    gtxnString() + "\t" +
                    addressString() + "\t" +
                    ll( formData.scheinSlipMedicalTreatment, 1 ) + "\t" +
                    ab( formData.fk4202 ) + "\t" +
                    ab( formData.kontrollunters ) + "\t" +
                    "\t" + // Ausnahmeindikation not certificated at the moment
                    (formData.abnahmeDatumBFB ? formData.abnahmeDatumBFB : '') + "\t" +
                    (formData.abnahmeZeit ? formData.abnahmeZeit : '') + "\t" +
                    ab( formData.fk4204 ) + "\t" +
                    (formData.befEilt ? "2" : "") + "\t" +
                    ll( formData.befEiltTel, 20 ) + "\t" +
                    ll( formData.befEiltFax, 20 ) + "\t" +
                    ll( formData.diagnosesBC || '', 70 ) + "\t" +
                    ll( findingsAndMedications(), 140 ) + "\t" +
                    ll( formData.auftrag, 280 ) + "\t" +
                    ll( formData.certNumber, 15 ) );
            }

            function barcode10A() {
                var isAfterQ32020 = Y.doccirrus.edmpcommonutils.isAfterTimestampQ( formData.timestampDate, '3/2020' );
                if( isAfterQ32020 ) {
                    return fixEncodingToIso8859_15(
                        "10\tA\t08\t" +                                     //  field 01, 02, 03
                        ll( formData.labRequestId, 13 ) + "\t" +            //  field 04
                        nameDobString() + "\t" +
                        insuranceString( true ) + "\t" +
                        bsnrlanrString() + "\t" +
                        timestamp + "\t" +
                        genderString() + "\t" +
                        ll( formData.ssw, 2 ) + "\t" +
                        ll( formData.title, 20 ) + "\t" +
                        ll( formData.nameaffix, 20 ) + "\t" +
                        ll( formData.patient && formData.nameinfix, 20 ) + "\t" +
                        addressString() + "\t" +
                        ll( formData.scheinSlipMedicalTreatment, 1 ) + "\t" +
                        ab( formData.fk4202 ) + "\t" +
                        ll( formData.knappschaftskennzeichen ) + "\t" +
                        (formData.abnahmeDatumBFB ? formData.abnahmeDatumBFB : '') + "\t" +
                        (formData.abnahmeZeit ? formData.abnahmeZeit : '') + "\t" +
                        ll( formData.zuAngaben || '', 60 ) + "\t" +
                        (formData.sonstiges ? ll( formData.sonstigesText, 60 ) : "") + "\t" +
                        ll( formData.certNumber, 15 ) + "\t" +
                        checkboxString( [
                            formData.befEilt,
                            formData.edtaGrBlutbild,
                            formData.edtaKlBlutbild,
                            formData.edtaHbA1c,
                            formData.edtaReti,
                            formData.edtaBlutsenkung,
                            null,
                            formData.citratQu,
                            formData.citratQuMarcumar,
                            formData.citratThrombin,
                            formData.citratPTT,
                            null,
                            formData.svbAlkPhos,
                            formData.svbAmylase,
                            formData.svbASL,
                            formData.svbBiliD,
                            formData.svbBiliG,
                            formData.svbCalc,
                            formData.svbCholesterin,
                            formData.svbCholin,
                            formData.svbCK,
                            null,
                            formData.svbCRP,
                            formData.svbEisen,
                            formData.svbEiwE,
                            formData.svbEiwG,
                            formData.svbGammaGT,
                            formData.svbGlukose,
                            formData.svbGOT,
                            formData.svbGPT,
                            formData.svbHarnsäure,
                            formData.svbHarnstoff,
                            null,
                            formData.svbHDL,
                            formData.svbLgA,
                            formData.svbLgG,
                            formData.svbLgM,
                            formData.svbKali,
                            formData.svbKrea,
                            formData.svbKreaC,
                            formData.svbLDH,
                            formData.svbLDL,
                            formData.svbLipase,
                            formData.svbNatrium,
                            formData.svbOPVorb,
                            formData.svbPhos,
                            formData.svbTransf,
                            formData.svbTrigl,
                            formData.svbTSHBasal,
                            null,
                            formData.glu1,
                            formData.glu2,
                            formData.glu3,
                            formData.glu4,
                            formData.urinStatus,
                            formData.urinMikroalb,
                            null,
                            formData.urinGlukose,
                            null,
                            formData.urinSediment,
                            formData.sonstiges,
                            formData.harnStreifenTest,
                            formData.nuechternPlasmaGlukose,
                            formData.lipidprofil
                        ] )
                    );
                }

                return fixEncodingToIso8859_15(
                    "10\tA\t07\t" +                                     //  field 01, 02, 03
                    ll( formData.labRequestId, 13 ) + "\t" +            //  field 04

                    //  std1( true ) is:
                    //      nameDobString() + "\t" +                    //  field 05, 06, 07
                    //      insuranceString( true ) + "\t" +            //  field 08, 09, 10, 11, 12, 13, 14, 15
                    //      bsnrlanrString() + "\t" +                   //  field 16, 17

                    std1( true ) + "\t" +

                    gtxnString() + "\t" +
                    addressString() + "\t" +
                    ll( formData.scheinSlipMedicalTreatment, 1 ) + "\t" +
                    ab( formData.fk4202 ) + "\t" +
                    "\t" + // Ausnahmeindikation not certificated at the moment
                    (formData.abnahmeDatumBFB ? formData.abnahmeDatumBFB : '') + "\t" +
                    (formData.abnahmeZeit ? formData.abnahmeZeit : '') + "\t" +
                    ll( formData.diagnosesBC || '', 60 ) + "\t" +
                    (formData.sonstiges ? ll( formData.sonstigesText, 60 ) : "") + "\t" +
                    ll( formData.certNumber, 15 ) + "\t" +
                    checkboxString( [
                        formData.befEilt,
                        formData.edtaGrBlutbild,
                        formData.edtaKlBlutbild,
                        formData.edtaHbA1c,
                        formData.edtaReti,
                        formData.edtaBlutsenkung,
                        formData.citratQu,
                        formData.citratQuMarcumar,
                        formData.citratThrombin,
                        formData.citratPTT,
                        formData.svbAlkPhos,
                        formData.svbAmylase,
                        formData.svbASL,
                        formData.svbBiliD,
                        formData.svbBiliG,
                        formData.svbCalc,
                        formData.svbCholesterin,
                        formData.svbCholin,
                        formData.svbCK,
                        formData.svbCRP,
                        formData.svbEisen,
                        formData.svbEiwE,
                        formData.svbEiwG,
                        formData.svbGammaGT,
                        formData.svbGlukose,
                        formData.svbGOT,
                        formData.svbGPT,
                        formData.svbHarnsäure,
                        formData.svbHarnstoff,
                        formData.svbHDL,
                        formData.svbLgA,
                        formData.svbLgG,
                        formData.svbLgM,
                        formData.svbKali,
                        formData.svbKrea,
                        formData.svbKreaC,
                        formData.svbLDH,
                        formData.svbLDL,
                        formData.svbLipase,
                        formData.svbNatrium,
                        formData.svbOPVorb,
                        formData.svbPhos,
                        formData.svbTransf,
                        formData.svbTrigl,
                        formData.svbTSHBasal,
                        formData.glu1,
                        formData.glu2,
                        formData.glu3,
                        formData.glu4,
                        formData.urinStatus,
                        formData.urinMikroalb,
                        formData.urinGlukose,
                        formData.urinSediment,
                        formData.sonstiges
                    ] )
                );
            }

            function barcode10Ca() {
                return "" +
                    ll( formData.labRequestId, 13 ) + "\t" +
                    ll( formData.lastname, 45 ) + "\t" +
                    ll( formData.firstname, 45 ) + "\t" +
                    reformatKbvDob( formData.dob ) + "\t" +
                    fd( formData.insuranceValidTo ) + "\t" +
                    ll( formData.insuranceId, 9 ) + "\t" +
                    ll( formData.insurancePrintName, 24 ) + "\t" +
                    ll( formData.locationFeatures, 2 ) + "\t" +
                    ll( formData.insuranceNo, 12 ) + "\t" +
                    ll( formData.insuranceKind, 1 ) + "\t" +
                    ll( formData.persGroup, 2, '0', true, false ) + "\t" +
                    ll( formData.dmp, 2, '0', true, false ) + "\t" +
                    ll( formData.BFB10C_first_initiator_physican_number, 9 ) + "\t" +
                    ll( formData.BFB10C_first_initiator_location_number, 9 ) + "\t" +
                    bsnrlanrString() + "\t" +
                    fd( formData.timestampDate ) + "\t" +
                    ll( formData.genderUpperCase === 'UNDEFINED' ? 'X' : formData.genderUpperCase, 1 ) + "\t" +
                    ll( formData.title, 20 ) + "\t" +
                    ll( formData.nameaffix, 20 ) + "\t" +
                    ll( formData.nameinfix, 20 ) + "\t" +
                    ll( !formData.postbox ? formData.zip : '', 10 ) + "\t" +
                    ll( !formData.postbox ? formData.city : '', 40 ) + "\t" +
                    ll( !formData.postbox ? formData.street : '', 46 ) + "\t" +
                    ll( !formData.postbox ? formData.houseno : '', 9 ) + "\t" +
                    ll( !formData.postbox ? formData.countryCode : '', 3 ) + "\t" +
                    ll( formData.postbox ? formData.zip : '', 10 ) + "\t" +
                    ll( formData.postbox ? formData.city : '', 40 ) + "\t" +
                    ll( formData.postbox, 8 ) + "\t" +
                    ll( formData.postbox ? formData.countryCode : '', 3 ) + "\t" +
                    fd( formData.BFBOEGD_10C_abnahmeDatum ) + "\t" +
                    (formData.abnahmeZeit ? formData.abnahmeZeit : '') + "\t" +
                    ab( formData.BFB10C_first_scan ) + "\t" +
                    ab( formData.BFB10C_further_scan ) + "\t" +
                    ab( formData.BFB10C_diagnostic_confirmation ) + "\t" +
                    ab( formData.BFB10C_risk_attribute_placing ) + "\t" +
                    ab( formData.BFB10C_risk_attribute_job ) + "\t" +
                    ab( formData.BFB10C_risk_attribute_medical_facility ) + "\t" +
                    ab( formData.BFB10C_risk_attribute_care_facility ) + "\t" +
                    ab( formData.BFB10C_risk_attribute_community_facility ) + "\t" +
                    ab( formData.BFB10C_risk_attribute_other_facility ) + "\t" +
                    ab( formData.BFB10C_consent_result_submit_to_rki ) + "\t" +
                    ll( formData.BFB10C_phone_number, 50 ) + "\t";
            }

            function barcodeOEGD() {
                return "" +
                       ll( formData.labRequestId, 13 ) + "\t" +
                       ll( formData.lastname, 45 ) + "\t" +
                       ll( formData.firstname, 45 ) + "\t" +
                       reformatKbvDob( formData.dob ) + "\t" +
                       fd( formData.insuranceValidTo ) + "\t" +
                       ll( formData.insuranceId, 9 ) + "\t" +
                       bsnrlanrString() + "\t" +
                       fd( formData.timestampDate ) + "\t" +
                       ll( formData.genderUpperCase === 'UNDEFINED' ? 'X' : formData.genderUpperCase, 1 ) + "\t" +
                       ll( formData.title, 20 ) + "\t" +
                       ll( formData.nameaffix, 20 ) + "\t" +
                       ll( formData.nameinfix, 20 ) + "\t" +
                       ll( !formData.postbox ? formData.zip : '', 10 ) + "\t" +
                       ll( !formData.postbox ? formData.city : '', 40 ) + "\t" +
                       ll( !formData.postbox ? formData.street : '', 46 ) + "\t" +
                       ll( !formData.postbox ? formData.houseno : '', 9 ) + "\t" +
                       ll( !formData.postbox ? formData.countryCode : '', 3 ) + "\t" +
                       ll( formData.postbox ? formData.zip : '', 10 ) + "\t" +
                       ll( formData.postbox ? formData.city : '', 40 ) + "\t" +
                       ll( formData.postbox, 8 ) + "\t" +
                       ll( formData.postbox ? formData.countryCode : '', 3 ) + "\t" +
                       ll( formData.BFBOEGD_phs_zip, 5 ) + "\t" +
                       ll( formData.BFBOEGD_phs_note, 22 ) + "\t" +
                       fd( formData.BFBOEGD_10C_abnahmeDatum ) + "\t" +
                       (formData.abnahmeZeit ? formData.abnahmeZeit : '') + "\t" +
                       ab( formData.BFBOEGD_test_v ) + "\t" +
                       ab( formData.BFBOEGD_self_payer ) + "\t" +
                       ab( formData.BFBOEGD_regional_special_agreement ) + "\t" +
                       ll( formData.BFBOEGD_special_number, 5 ) + "\t" +
                       ab( formData.BFBOEGD_paragraph_2_test_v_contact ) + "\t" +
                       ab( formData.BFBOEGD_paragraph_3_test_v_event ) + "\t" +
                       ab( formData.BFBOEGD_paragraph_4_test_v_spread ) + "\t" +
                       ab( formData.BFBOEGD_paragraph_4_test_v_after_positive_antigen_test ) + "\t" +
                       ab( formData.BFBOEGD_paragraph_4_test_v_after_positive_pcr_test ) + "\t" +
                       ab( formData.BFB10C_risk_attribute_placing ) + "\t" +
                       ab( formData.BFB10C_risk_attribute_job ) + "\t" +
                       ab( formData.BFB10C_risk_attribute_medical_facility ) + "\t" +
                       ab( formData.BFB10C_risk_attribute_care_facility ) + "\t" +
                       ab( formData.BFB10C_risk_attribute_community_facility ) + "\t" +
                       ab( formData.BFB10C_risk_attribute_other_facility ) + "\t" +
                       ab( formData.BFB10C_consent_result_submit_to_rki ) + "\t" +
                       ll( formData.BFB10C_phone_number, 50 ) + "\t";
            }

            function barcode12abc() {
                return "" +
                    std1() + "\t" +
                    ll( formData.diagnosesBC || '', 49 ) + "\t" +
                    reverseMap( {
                        e: formData.BFB12_erstverordnung,
                        f: formData.BFB12_folgeverordnung
                    }, undefined, '' ) + "\t" +
                    ab( formData.BFB12_Unfall ) + "\t" +
                    sd( formData.BFB12_ZeitraumVon ) + "\t" +
                    sd( formData.BFB12_ZeitraumBis ) + "\t" +

                    ab( formData.BFB12_MedBoxHerrichten ) + "\t" +
                    ll( formData.BFB12_MedBoxHaeufigkeitTag , 2, "0", true, true ) + "\t" +
                    ll( formData.BFB12_MedBoxHaeufigkeitWoche , 2, "0", true, true ) + "\t" +
                    ll( formData.BFB12_MedBoxHaeufigkeitMonat , 2, "0", true, true ) + "\t" +
                    md( formData.BFB12_MedBoxVon ) + "\t" +
                    md( formData.BFB12_MedBoxBis ) + "\t" +

                    ab( formData.BFB12_MedGabe ) + "\t" +
                    ll( formData.BFB12_MedGabeTag , 2, "0", true, true ) + "\t" +
                    ll( formData.BFB12_MedGabeWoche , 2, "0", true, true ) + "\t" +
                    ll( formData.BFB12_MedGabeMonat , 2, "0", true, true ) + "\t" +
                    md( formData.BFB12_MedGabeVon ) + "\t" +
                    md( formData.BFB12_MedGabeBis ) + "\t" +

                    ab( formData.BFB12_Injektion ) + "\t" +
                    ab( formData.BFB12_InjektionHerrichten ) + "\t" +
                    reverseMap( {
                        i: formData.BFB12_InjektionIntramuskulaer,
                        s: formData.BFB12_InjektionSubkutan,
                        a: formData.BFB12_InjektionIntramuskulaer && formData.BFB12_InjektionSubkutan
                    }, undefined, '' ) + "\t" +
                    ll( formData.BFB12_InjektionTag , 2, "0", true, true ) + "\t" +
                    ll( formData.BFB12_InjektionWoche , 2, "0", true, true ) + "\t" +
                    ll( formData.BFB12_InjektionMonat , 2, "0", true, true ) + "\t" +
                    md( formData.BFB12_InjektionVon ) + "\t" +
                    md( formData.BFB12_InjektionBis ) + "\t" +

                    ab( formData.BFB12_BlutzuckerErst_Neueinstellung ) + "\t" +
                    ab( formData.BFB12_BlutzuckerIntensInsulintherapie ) + "\t" +
                    ll( formData.BFB12_BlutzuckerTag , 2, "0", true, true ) + "\t" +
                    ll( formData.BFB12_BlutzuckerWoche , 2, "0", true, true) + "\t" +
                    ll( formData.BFB12_BlutzuckerMonat , 2, "0", true, true ) + "\t" +
                    md( formData.BFB12_BlutzuckerVon ) + "\t" +
                    md( formData.BFB12_BlutzuckerBis ) + "\t" +

                    reverseMap( {
                        l: formData.BFB12_KompressionsbehandlungLinks,
                        r: formData.BFB12_KompressionsbehandlungRechts,
                        b: formData.BFB12_KompressionsbehandlungBeidseits
                    }, undefined, '' ) + "\t" +

                    ab( formData.BFB12_KompStruempfeAnziehen ) + "\t" +
                    ab( formData.BFB12_KompStruempfeAusziehen ) + "\t" +
                    ll( formData.BFB12_KompStruempfeTag , 2, "0", true, true ) + "\t" +
                    ll( formData.BFB12_KompStruempfeWoche , 2, "0", true, true ) + "\t" +
                    ll( formData.BFB12_KompStruempfeMonat , 2, "0", true, true ) + "\t" +
                    md( formData.BFB12_KompStruempfeVon ) + "\t" +
                    md( formData.BFB12_KompStruempfeBis ) + "\t" +

                    ab( formData.BFB12_KompVerbaendeAnlegen ) + "\t" +
                    ab( formData.BFB12_KompVerbaendeAbnehmen ) + "\t" +
                    ll( formData.BFB12_KompVerbaendeTag , 2, "0", true, true ) + "\t" +
                    ll( formData.BFB12_KompVerbaendeWoche , 2, "0", true, true ) + "\t" +
                    ll( formData.BFB12_KompVerbaendeMonat , 2, "0", true, true ) + "\t" +
                    md( formData.BFB12_KompVerbaendeVon ) + "\t" +
                    md( formData.BFB12_KompVerbaendeBis ) + "\t" +

                    ab( formData.BFB12_Stuetzverbaende ) + "\t" +
                    ll( formData.BFB12_StuetzverbaendeTag , 2, "0", true, true ) + "\t" +
                    ll( formData.BFB12_StuetzverbaendeWoche , 2, "0", true, true ) + "\t" +
                    ll( formData.BFB12_StuetzverbaendeMonat , 2, "0", true, true ) + "\t" +
                    md( formData.BFB12_StuetzverbaendeVon ) + "\t" +
                    md( formData.BFB12_StuetzverbaendeBis ) + "\t" +
                    // @deprecated since Q4 2020
                    // ab( formData.BFB12_Dekubitus ) + "\t" +
                    // ll( formData.BFB12_DekubitusTag , 2, "0", true, true ) + "\t" +
                    // ll( formData.BFB12_DekubitusWoche , 2, "0", true, true ) + "\t" +
                    // ll( formData.BFB12_DekubitusMonat , 2, "0", true, true ) + "\t" +
                    // md( formData.BFB12_DekubitusVon ) + "\t" +
                    // md( formData.BFB12_DekubitusBis ) + "\t" +
                    // for ...
                    ab( formData.BFB12_WunderversorgungAkut ) + "\t" +
                    ab( formData.BFB12_WunderversorgungChronisch ) + "\t" +
                    ll( formData.BFB12_HaeufigkeitTaeglichWunderversorgung , 2, "0", true, true ) + "\t" +
                    ll( formData.BFB12_HaeufigkeitWoechentlichWunderversorgung , 2, "0", true, true ) + "\t" +
                    ll( formData.BFB12_HaeufigkeitMonatlichWunderversorgung , 2, "0", true, true ) + "\t" +
                    md( formData.BFB12_WundversorgungVon ) + "\t" +
                    md( formData.BFB12_WundversorgungBis ) + "\t" +

                    // @deprecated since Q4 2020
                    // ab( formData.BFB12_AndereWundverb ) + "\t" +
                    // ll( formData.BFB12_AndereWundverbTag , 2, "0", true, true ) + "\t" +
                    // ll( formData.BFB12_AndereWundverbWoche, 2, "0", true, true ) + "\t" +
                    // ll( formData.BFB12_AndereWundverbMonat , 2, "0", true, true ) + "\t" +
                    // md( formData.BFB12_AndereWundverbVon ) + "\t" +
                    // md( formData.BFB12_AndereWundverbBis ) + "\t" +
                    // for ...
                    ab( formData.BFB12_PositionswechselDekubitusBehandlung ) + "\t" +
                    ll( formData.BFB12_HaeufigkeitTaeglichPositionswechselDekubitusBehandlung , 2, "0", true, true ) + "\t" +
                    ll( formData.BFB12_HaeufigkeitWoechentlichPositionswechselDekubitusBehandlung , 2, "0", true, true ) + "\t" +
                    ll( formData.BFB12_HaeufigkeitMonatlichPositionswechselDekubitusBehandlung , 2, "0", true, true ) + "\t" +
                    md( formData.BFB12_PositionswechselDekubitusBehandlungVon ) + "\t" +
                    md( formData.BFB12_PositionswechselDekubitusBehandlungBis ) + "\t" +

                    ll( formData.BFB12_SonstigeMassnahmen, 5 ) + "\t" +
                    ll( formData.BFB12_AnleitungBehandlungspflege, 5 ) + "\t" +
                    reverseMap( {
                        u: formData.BFB12_Unterstuetzungspflege,
                        k: formData.BFB12_Krankenhausvermeidungspflege
                    }, undefined, '' ) + "\t" +

                    ab( formData.BFB12_Grundpflege ) + "\t" +
                    ll( formData.BFB12_GrundpflegeTag , 2, "0", true, true ) + "\t" +
                    ll( formData.BFB12_GrundpflegeWoche , 2, "0", true, true ) + "\t" +
                    ll( formData.BFB12_GrundpflegeMonat , 2, "0", true, true ) + "\t" +
                    md( formData.BFB12_GrundpflegeVon ) + "\t" +
                    md( formData.BFB12_GrundpflegeBis ) + "\t" +

                    ab( formData.BFB12_HauswirtVers ) + "\t" +
                    ll( formData.BFB12_HauswirtVersTag , 2, "0", true, true ) + "\t" +
                    ll( formData.BFB12_HauswirtVersWoche , 2, "0", true, true ) + "\t" +
                    ll( formData.BFB12_HauswirtVersMonat , 2, "0", true, true ) + "\t" +
                    md( formData.BFB12_HauswirtVersVon ) + "\t" +
                    md( formData.BFB12_HauswirtVersBis );
            }

            function barcode13_2() {
                function remedy( text ) {
                    if( !text.trim().length ) {
                        text = '';
                    }
                    return ll( text, 51 );
                }

                var chapter;
                var conductionSymptoms = '';
                var chapterMap = [
                    false,
                    formData.ut2Chapter_physio,
                    formData.ut2Chapter_podo,
                    formData.ut2Chapter_logo,
                    formData.ut2Chapter_ergo,
                    formData.ut2Chapter_et
                ];

                chapterMap.some( function( entry, index ) {
                    if( entry ) {
                        chapter = '' + index;
                        return true;
                    }
                } );

                if( formData.ut2ConductionSymptoms_a ) {
                    conductionSymptoms += 'a';
                }
                if( formData.ut2ConductionSymptoms_b ) {
                    conductionSymptoms += 'b';
                }
                if( formData.ut2ConductionSymptoms_c ) {
                    conductionSymptoms += 'c';
                }

                return "" +
                       std1() + "\t" +
                       ll( chapter, 1 ) + "\t" +
                       ll( formData.utICD, 10 ) + "\t" +
                       ll( formData.utICD2, 10 ) + "\t" +
                       ll( formData.ut2DiagnosisGroupCode, 3 ) + "\t" +
                       ll( conductionSymptoms, 3 ) + "\t" +
                       ab( formData.ut2PatientSpecificConductionSymptoms ) + "\t" +
                       remedy( formData.ut2RemedyPosition1 + ' ' + formData.ut2RemedyPosition1Text ) + "\t" +
                       ll( formData.ut2RemedyPosition1Unit, 3 ) + "\t" +
                       remedy( formData.ut2RemedyPosition2 + ' ' + formData.ut2RemedyPosition2Text ) + "\t" +
                       ll( formData.ut2RemedyPosition2Unit, 3 ) + "\t" +
                       remedy( formData.ut2RemedyPosition3 + ' ' + formData.ut2RemedyPosition3Text ) + "\t" +
                       ll( formData.ut2RemedyPosition3Unit, 3 ) + "\t" +
                       remedy( formData.ut2AdditionalRemedyPosition + ' ' + formData.ut2AdditionalRemedyPositionText ) + "\t" +
                       ll( formData.ut2AdditionalRemedyPositionUnit, 3 ) + "\t" +
                       ll( formData.ut2TherapyFrequency, 15 ) + "\t" +
                       ab( formData.ut2HasTherapyReport ) + "\t" +
                       abz( formData.ut2HasHomeVisit ) + "\t" +
                       ab( formData.ut2UrgentNeedForAction );
            }

            switch( type ) {
                case 'barcode1a':
                    return fixEncodingToIso8859_15(
                        "01\ta\t09\t" +
                        std2() + "\t" +
                        /*13*/ab( formData.erstBesch ) + "\t" +
                        /*14*/ab( formData.folgeBesc ) + "\t" +
                        /*15*/ab( formData.arbeitsunfall ) + "\t" +
                        /*16*/ab( formData.durchgangsarzt ) + "\t" +
                        /*17*/fd( formData.auVonBC ) + "\t" +
                        /*18*/fd( formData.auVorraussichtlichBisBC ) + "\t" +
                        /*19*/fd( formData.festgestelltAmBC ) + "\t" +
                        /*20*/ab( formData.sonstigerUnf ) + "\t" +
                        /*21*/ab( formData.bvg ) + "\t" +
                        /*22*/ab( formData.rehab ) + "\t" +
                        /*23*/ab( formData.reintegration ) + "\t" +
                        /*24*/ll( formData.massnahmen || '', 70 ) + "\t" +
                        /*25*/ab( formData.krankengeld ) + "\t" +
                        /*26*/ab( formData.endBesch ) + "\t" +
                        /*27*/ll( formData.diagnosesBC || '', 65 ) + "\t" +
                        /*28*/ll( formData.diagnosesAdd || '', 70 )
                    );
                case 'barcode2a':
                    return fixEncodingToIso8859_15(
                        "02\ta\t06\t" +
                        std1() + "\t" +
                        ab( formData.bb ) + "\t" +
                        ab( formData.notfall ) + "\t" +
                        ab( formData.fk4202 ) + "\t" +
                        ab( formData.bvg ) + "\t" +
                        "1\t" +
                        ll( formData.diagnosesBC || '', 49 )
                    );
                case 'barcode2b':
                    return fixEncodingToIso8859_15(
                        "02\tb\t06\t" +
                        std1() + "\t" +
                        ab( formData.bb ) + "\t" +
                        ab( formData.notfall ) + "\t" +
                        ab( formData.fk4202 ) + "\t" +
                        ab( formData.bvg ) + "\t" +
                        "1\t" +
                        ll( formData.diagnosesBC || '', 49 )
                    );
                case 'barcode3a':
                    return fixEncodingToIso8859_15(
                        "03\ta\t06\t" +
                        std1() + "\t" +
                        fd( formData.BFB3_Voraussichtlicher_Entbindungstermin ) + "\t" +
                        fd( formData.BFB3_Untersuchungsdatum ) + "\t" +
                        ll( formData.BFB3_Besondere_Feststellungen || "", 39 )
                    );
                case 'barcode4':
                    return fixEncodingToIso8859_15(
                        '04\t\t09\t' +
                        std1() + '\t' +
                        ab( formData.BFB4_Unfall_Unfallfolge ) + '\t' +
                        ab( formData.BFB4_Arbeitsunfall_Berufskrankheit ) + '\t' +
                        ab( formData.BFB4_Versorgungsleiden ) + '\t' +
                        ab( formData.BFB4_Hinfahrt ) + '\t' +
                        ab( formData.BFB4_Ruckfahrt ) + '\t' +
                        ab( formData.BFB4_Voll_Teilstationare_Krankenhausbehandlung ) + '\t' +
                        ab( formData.BFB4_Vor_Nachstationare_Behandlung ) + '\t' +
                        ab( formData.BFB4_Dauerhafte_Mobilitatsbeeintrachtigung_Merkzeichen_aG_BI_H_Pflegegrad_3_mit_dauerhafter_Mobilitatsbeeintrachtigung_Pflegegrad_4_oder_5 ) + '\t' +
                        ab( formData.BFB4_Anderer_Grund ) + '\t' +
                        ll( formData.BFB4_Anderer_Grund_Freitext || '', 43 ) + '\t' +
                        ab( formData.BFB4_Hochfrequente_Behandlung_Dialyse_Chemo_Strahlen ) + '\t' +
                        ab( formData.BFB4_Hochfrequente_Behandlung_vergleichbarer_Ausnahmefall ) + '\t' +
                        ab( formData.BFB4_Dauerhafte_Mobilitatsbeeintrachtigung_vergleichbare_Mobilitatsbeeintrachtigung_und_Behandlungsdauer_mindestens_6_Monate ) + '\t' +
                        ab( formData.BFB4_Anderer_Grund_der_Fahrt_mit_KTW_erfordert ) + '\t' +
                        fd( formData.BFB4_Vom_am ) + '\t' +
                        ll( formData.BFB4_X_mal_pro_Woche || '', 1 ) + '\t' +
                        fd( formData.BFB4_Bis_voraussichtlich ) + '\t' +
                        ll( formData.BFB4_Behandlungsstatte || '', 62 ) + '\t' +
                        ab( formData.BFB4_Taxi_Mietwagen ) + '\t' +
                        ab( formData.BFB4_KTW_da_medizinisch_fachliche_Betreuung_und_oder_Einrichtung_notwendig_ist_wegen ) + '\t' +
                        ll( formData.BFB4_KTW_wegen_Begrundung || '', 56 ) + '\t' +
                        ab( formData.BFB4_Rollstuhl ) + '\t' +
                        ab( formData.BFB4_Tragestuhl ) + '\t' +
                        ab( formData.BFB4_liegend ) + '\t' +
                        ab( formData.BFB4_RTW ) + '\t' +
                        ab( formData.BFB4_NAW_NEF ) + '\t' +
                        ab( formData.BFB4_Andere ) + '\t' +
                        ll( formData.BFB4_Andere_Freitext || '', 16 )
                    );
                case 'barcode6':
                    return fixEncodingToIso8859_15(
                        "06\t\t10\t" +
                        ll( formData.labRequestId, 13 ) + "\t" +
                        std1( true ) + "\t" +
                        gtxnString() + "\t" +
                        addressString() + "\t" +
                        ll( formData.scheinSlipMedicalTreatment, 1 ) + "\t" +
                        ab( formData.fk4202 ) + "\t" +
                        fd( formData.datumOPBC ) + "\t" +
                        ll( formData.ueberwAn, 60 ) + "\t" +
                        fd( formData.auBisBC ) + "\t" +
                        ll( formData.untersArt, 1 ) + "\t" +
                        ab( formData.fk4204 ) + "\t" +
                        ll( formData.diagnosesBC, 140 ) + "\t" +
                        ll( findingsAndMedicationsReferral(), 140 ) + "\t" +
                        ll( formData.auftrag, 210 ) );

                case 'barcode8':

                    /*
                    From the KBV documentation Q2 2018, page 24

                    ------------------------------------------------------------------------------------------------
                    #   Field name              Kard    Length  Typ Value   Format
                    ------------------------------------------------------------------------------------------------
                    01  Form code               1       2       n   10      Form number
                    02  For subtype code        1       1       a   A
                    03  Version Nr.             1       2       n   03
                    04  Nachname                1       <=45    a
                    05  Vorname                 1       <=45    a
                    06  Geburtsdatum            1       8       n           YYYYMMDD
                    07  VSS Ende                0..1    8       n           YYYYMMDD
                    08  Kostentragerkennung     1       9       n           Cost recognition
                    09  Insurance Nr.           1       <=12    a           Insurance number / SSN
                    10  Insurance Type          1       1       n   1,3,5
                    11  Special group           0..1    <=2     n   4,6,7,8,9
                    12  DMP marking             0..1    <=2     n   1,2,3,4,5,6
                    13  BSNR of referrer        1       9       n           Location ID of referrer
                    14  LANR of referrer        1       9       n           Dr ID number of referrer
                    15  Date of issue           1       8       n           YYYYMMDD
                    ------------------------------------------------------------------------------------------------
                    */

                    return fixEncodingToIso8859_15(
                        "08\t\t07\t" +                                 //  01, 02, 03
                        std1( false ) // + '\t' +
                        //std2()                                          //  13, 14, 15
                    );

                case 'barcode8a':
                    //  From the KBV documentation Q2 2018, page 24, appears substantially the same as barcode 8

                    return fixEncodingToIso8859_15(
                        "08\tA\t06\t" +                                 //  01, 02, 03
                        std1( false ) // + '\t' +
                        //std2()                                          //  13, 14, 15
                    );

                case 'barcode9':
                    return fixEncodingToIso8859_15(
                        "09\t\t06\t" +
                        std1() + "\t" +
                        fd( formData.BFB9_Entbindungsdatum ) + "\t" +
                        ab( formData.BFB9_weniger_als_2500_gr ) + "\t" +
                        ab( formData.BFB9_nicht_voll_ausgebildete_Reifezeichen ) + "\t" +
                        ab( formData.BFB9_verfrühte_Beendigung_der_Schwangerschaft ) + "\t" +
                        ab( formData.BFB9_Bei_dem_Kind_liegt_eine_Behinderung_vor ) + "\t"
                    );
                case 'barcode10':
                    return barcode10();
                case 'barcode10L':
                    return barcode10L();
                case 'barcode10A':
                    return barcode10A();
                case 'barcode10Ca':
                    return fixEncodingToIso8859_15( "10\tCa\t02\t" + barcode10Ca() );
                case 'barcodeOEGD':
                    return fixEncodingToIso8859_15( "OEGD\ta\t05\t" + barcodeOEGD() );
                case 'barcode11':
                    return fixEncodingToIso8859_15( "11\t\t06\t" + std1() );
                case 'barcode12a':
                    return fixEncodingToIso8859_15( "12\ta\t09\t" + barcode12abc() );
                case 'barcode12b':
                    return fixEncodingToIso8859_15( "12\tb\t09\t" + barcode12abc() );
                case 'barcode12c':
                    return fixEncodingToIso8859_15( "12\tc\t09\t" + barcode12abc() );
                case 'barcode13':
                    return fixEncodingToIso8859_15( "13\t\t07\t" + std1() );
                case 'barcode13_2':
                    return fixEncodingToIso8859_15( "13\t\t08\t" + barcode13_2() );
                case 'barcode14':
                    return fixEncodingToIso8859_15( "14\t\t07\t" + std1() );
                case 'barcode15_1':
                    return fixEncodingToIso8859_15(
                        "15\t\t06\t" +
                        std1() + "\t" +
                        reverseMap( [
                            formData.folgegeraet,
                            formData.erstgeraet
                        ] ) + "\t" +
                        ab( formData.fk4202 ) + "\t" +
                        ab( formData.bvg ) + "\t" +
                        "1\t" + //only icds
                        ll( formData.diagnosesBC || '', 50 ) + "\t" +
                        reverseMap( {
                            l: formData.hoerhilfeNotwLinks,
                            b: formData.hoerhilfeNotwBeiderseits,
                            r: formData.hoerhilfeNotwRechts
                        } )
                    );
                case 'barcode18':
                    return fixEncodingToIso8859_15( "18\t\t07\t" + std1() );
                case 'barcode19a':
                    return fixEncodingToIso8859_15(
                        "19\ta\t08\t" +
                        std1() + "\t" +
                        ll( notfallSchein(), 1 ) + "\t" +
                        ab( formData.fk4202 ) + "\t" +
                        genderString() + "\t" +
                        ll( formData.diagnosesBC || '', 81 )
                    );
                case 'barcode19b':
                    return fixEncodingToIso8859_15(
                        "19\tb\t09\t" +
                        std1() + "\t" +
                        ll( notfallSchein(), 1 ) + "\t" +
                        ab( formData.fk4202 ) + "\t" +
                        genderString() + "\t" +
                        ll( formData.diagnosesBC || '', 81 ) + "\t" +
                        ll( fd( formData.auBisBC || '' ) || '', 8 ) + "\t" +
                        ll( formData.findings || '', 80 )
                    );
                case 'barcode20b':
                    return fixEncodingToIso8859_15( "20\tb\t06\t" + std1() );
                case 'barcode20c':
                    return fixEncodingToIso8859_15( "20\tc\t06\t" + std1() );
                case 'barcode21':
                    return fixEncodingToIso8859_15(
                        "21\t\t06\t" +
                        std1() + "\t" +
                        fd( formData.betreuungVon ) + "\t" +
                        fd( formData.betreuungBis ) + "\t" +
                        reverseMap( [
                            formData.betreuungNotwendig,
                            formData.betreuungNichtNotwendig
                        ] ) + "\t" +
                        reverseMap( [
                            formData.betreuungUnfall,
                            formData.betreuungKeinUnfall
                        ] )
                    );
                case 'barcode25':
                    return fixEncodingToIso8859_15(
                        "25\t\t06\t" +
                        std1() + "\t" +
                        ab( formData.BFB25_Schwächung_der_Gesundheit_Krankheitsverhütung ) + "\t" +
                        ab( formData.BFB25_Vermeidung_der_Verschlimmerung_behandlungsbedingter_Krankheiten ) + "\t" +
                        ab( formData.BFB25_Gefährdung_der_gesundheitlichen_Entwicklung_von_Kindern ) + "\t" +
                        sd( formData.BFB25_In_Behandlung_seit ) + "\t" +
                        sd( formData.BFB25_Letzte_Untersuchung ) + "\t" +
                        ll( formData.BFB25_Empfohlener_Kurort, 37 ) + "\t" +
                        ll( formData.BFB25_Dauer_in_Wochen, 2, "0", true ) + "\t" +
                        reverseMap( [
                            formData.BFB25_Kompaktkur_Ja,
                            formData.BFB25_Kompaktkur_Nein
                        ] )
                    );

                /*
                From the KBV documentation Q2 2018, page 62-70, 73, 88-91 all very similar

                ------------------------------------------------------------------------------------------------
                #   Field name              Kard    Length  Typ Value       Format
                ------------------------------------------------------------------------------------------------
                01  Form code               1       2       n   XX          Form number
                02  For subtype code        1       1       a   a/b/c/d     Form code
                03  Version Nr.             1       2       n   XX          Version
                04  Nachname                1       <=45    a
                05  Vorname                 1       <=45    a
                06  Geburtsdatum            1       8       n               YYYYMMDD
                07  VSS Ende                0..1    8       n               YYYYMMDD
                08  Kostentragerkennung     1       9       n               Cost recognition
                09  Insurance Nr.           1       <=12    a               Insurance number / SSN
                10  Insurance Type          1       1       n   1,3,5
                11  Special group           0..1    <=2     n   4,6,7,8,9
                12  DMP marking             0..1    <=2     n   1,2,3,4,5,6
                13  BSNR of referrer        1       9       n               Location ID of referrer
                14  LANR of referrer        1       9       n               Dr ID number of referrer
                15  Date of issue           1       8       n               YYYYMMDD
                ------------------------------------------------------------------------------------------------
                */

                case 'barcode26a':  return fixEncodingToIso8859_15( "26\ta\t06\t" + std1( false ) );
                case 'barcode26b':  return fixEncodingToIso8859_15( "26\tb\t06\t" + std1( false ) );
                case 'barcode26c':  return fixEncodingToIso8859_15( "26\tc\t06\t" + std1( false ) );

                case 'barcode27a':  return fixEncodingToIso8859_15( "27\ta\t06\t" + std1( false ) );
                case 'barcode27b':  return fixEncodingToIso8859_15( "27\tb\t06\t" + std1( false ) );
                case 'barcode27c':  return fixEncodingToIso8859_15( "27\tc\t06\t" + std1( false ) );

                case 'barcode28a':  return fixEncodingToIso8859_15( "28\ta\t06\t" + std1( false ) );
                case 'barcode28b':  return fixEncodingToIso8859_15( "28\tb\t06\t" + std1( false ) );
                case 'barcode28c':  return fixEncodingToIso8859_15( "28\tc\t06\t" + std1( false ) );

                case 'barcode36':   return fixEncodingToIso8859_15( "36\t\t03\t" + std1( false ) );

                case 'barcode63a':  return fixEncodingToIso8859_15( "63\ta\t05\t" + std1( false ) );
                case 'barcode63b':  return fixEncodingToIso8859_15( "63\tb\t05\t" + std1( false ) );
                case 'barcode63c':  return fixEncodingToIso8859_15( "63\tc\t05\t" + std1( false ) );
                case 'barcode63d':  return fixEncodingToIso8859_15( "63\td\t05\t" + std1( false ) );

                case 'barcode30':
                    return fixEncodingToIso8859_15(
                        "30\t\t03\t" +
                        ( (activity && _k.unwrap( activity.requestId ) ) || "") + "\t" +
                        ( (activity && _k.unwrap( activity.insuranceType ) ) || "") + "\t" +
                        ( (activity && _k.unwrap( activity.ageGroup ) ) || "") + "\t" +
                        ( (activity && _k.unwrap( activity.surveySex ) ) || "X") + "\t" +
                        ( (activity && abz( _k.unwrap( activity.repeatedExam ) ) ) || "0") + "\t" +
                        ( (activity && _k.unwrap( activity.hypertonia ) ) || "0") + "\t" +
                        ( (activity && _k.unwrap( activity.coronalHeartDisease ) ) || "0") + "\t" +
                        ( (activity && _k.unwrap( activity.otherArterialClosure ) ) || "0") + "\t" +
                        ( (activity && _k.unwrap( activity.diabetesMellitus ) ) || "0") + "\t" +
                        ( (activity && _k.unwrap( activity.hyperlipidemia ) ) || "0") + "\t" +
                        ( (activity && _k.unwrap( activity.kidneyDiseases ) ) || "0") + "\t" +
                        ( (activity && _k.unwrap( activity.lungDiseases ) ) || "0") + "\t" +
                        ( (activity && abz( _k.unwrap( activity.nicotineAbuse ) ) ) || "0") + "\t" +
                        ( (activity && abz( _k.unwrap( activity.chronicEmotionalStressFactor ) ) ) || "0") + "\t" +
                        ( (activity && abz( _k.unwrap( activity.sedentaryLifestyle ) ) ) || "0") + "\t" +
                        ( (activity && abz( _k.unwrap( activity.adipositas ) ) ) || "0") + "\t" +
                        ( (activity && abz( _k.unwrap( activity.alcoholAbuse ) ) ) || "0")
                    );
                case 'barcode39a':
                    return fixEncodingToIso8859_15(
                        "39\ta\t09\t" +
                        barcode39()
                    );
                case 'barcode39b':
                    return fixEncodingToIso8859_15(
                        "39\tb\t09\t" +
                        barcode39()
                    );
                case 'barcode52_2':
                    return fixEncodingToIso8859_15( "52\t\t06\t" + std1() );
                case 'barcode53':
                    return fixEncodingToIso8859_15( "53\t\t06\t" + std1() );
                case 'barcode55':
                    return fixEncodingToIso8859_15( "55\t\t03\t" + std1() );
                case 'barcode56_2':
                    return fixEncodingToIso8859_15( "56\t\t06\t" + std1() );
                case 'barcode61Ab':
                    return fixEncodingToIso8859_15( "61\tAb\t04\t" + std1() );
                case 'barcode61Da':
                    return fixEncodingToIso8859_15( "61\tDa\t04\t" + std1() );

                case 'barcode64':
                    return fixEncodingToIso8859_15( "64\tBa\t02\t" + std1() );

                case 'barcode65':
                    return fixEncodingToIso8859_15( "65\ta\t02\t" + std1() );

                //  Non-BFB:
                case 'documentMetaDataQrCode':
                    return JSON.stringify( {
                        'date': formData.dateNormal,
                        'activityId': formData.activityId,
                        'patientId': formData.patientId,
                        'patientNo': formData.patientNo,
                        'actType': Y.doccirrus.schemaloader.translateEnumValue(
                            'i18n',
                            formData.actType,
                            Y.doccirrus.schemas.activity.types.Activity_E.list,
                            ''
                        ),
                        'subType': formData.subType || '',
                        'tag': formData.userContent || ''
                    } );
            }
        }

        /*
         * creates barcode string from formData and form ID
         *
         * RULES:
         * - separate entries with \t (TAB character)
         * - empty strings are ok
         * - ICD Diagnoses are separated by ", " (don't forget the space)
         *
         * example for forename, surname, company: Julius\tMertens\tDocCirrus
         * example for empty surname: jm\t\tDocCirrus
         * example ICD-10: O26.83 G, O12.2 Z, S51.9 G L
         */
        function setBarcodeData( formData ) {
            formData.barcode1a = getBarcode( 'barcode1a', formData );
            formData.barcode2a = getBarcode( 'barcode2a', formData );
            formData.barcode2b = getBarcode( 'barcode2b', formData );
            formData.barcode3a = getBarcode( 'barcode3a', formData );
            formData.barcode4 = getBarcode( 'barcode4', formData );
            formData.barcode6 = getBarcode( 'barcode6', formData );

            formData.barcode8 = getBarcode( 'barcode8', formData );     //  test MOJ-9424
            formData.barcode8a = getBarcode( 'barcode8a', formData );   //  test MOJ-9424

            formData.barcode9 = getBarcode( 'barcode9', formData );
            formData.barcode10 = getBarcode( 'barcode10', formData );
            formData.barcode10L = getBarcode( 'barcode10L', formData );
            formData.barcode10A = getBarcode( 'barcode10A', formData );
            formData.barcode11 = getBarcode( 'barcode11', formData );
            formData.barcode12a = getBarcode( 'barcode12a', formData );
            formData.barcode12b = getBarcode( 'barcode12b', formData );
            formData.barcode12c = getBarcode( 'barcode12c', formData );
            formData.barcode13 = getBarcode( 'barcode13', formData );
            formData.barcode13_2 = getBarcode( 'barcode13_2', formData );
            formData.barcode14 = getBarcode( 'barcode14', formData );
            formData.barcode15_1 = getBarcode( 'barcode15_1', formData );
            formData.barcode18 = getBarcode( 'barcode18', formData );
            formData.barcode19a = getBarcode( 'barcode19a', formData );
            formData.barcode19b = getBarcode( 'barcode19b', formData );
            formData.barcode20b = getBarcode( 'barcode20b', formData );
            formData.barcode20c = getBarcode( 'barcode20c', formData );
            formData.barcode21 = getBarcode( 'barcode21', formData );
            formData.barcode25 = getBarcode( 'barcode25', formData );

            formData.barcode26a = getBarcode( 'barcode26a', formData );
            formData.barcode26b = getBarcode( 'barcode26b', formData );
            formData.barcode26c = getBarcode( 'barcode26c', formData );

            formData.barcode27a = getBarcode( 'barcode27a', formData );
            formData.barcode27b = getBarcode( 'barcode27b', formData );
            formData.barcode27c = getBarcode( 'barcode27c', formData );

            formData.barcode28a = getBarcode( 'barcode28a', formData );
            formData.barcode28b = getBarcode( 'barcode28b', formData );
            formData.barcode28c = getBarcode( 'barcode28c', formData );

            formData.barcode30 = getBarcode( 'barcode30', formData );
            formData.barcode36 = getBarcode( 'barcode36', formData );
            formData.barcode39a = getBarcode( 'barcode39a', formData );
            formData.barcode39b = getBarcode( 'barcode39b', formData );
            formData.barcode52_2 = getBarcode( 'barcode52_2', formData );
            formData.barcode53 = getBarcode( 'barcode53', formData );
            formData.barcode55 = getBarcode( 'barcode55', formData );
            formData.barcode56_2 = getBarcode( 'barcode56_2', formData );
            formData.barcode61Ab = getBarcode( 'barcode61Ab', formData );
            formData.barcode61Da = getBarcode( 'barcode61Da', formData );

            formData.barcode63a = getBarcode( 'barcode63a', formData );
            formData.barcode63b = getBarcode( 'barcode63b', formData );
            formData.barcode63c = getBarcode( 'barcode63c', formData );
            formData.barcode63d = getBarcode( 'barcode63d', formData );

            formData.barcode64 = getBarcode( 'barcode64', formData );
            formData.barcode65 = getBarcode( 'barcode65', formData );
        }

        function getOpthalmology( formData, activity ) {
            formData.orSphR = '' + _k.unwrap( activity.orSphR ) || '';
            formData.orCylR = '' + _k.unwrap( activity.orCylR ) || '';
            formData.orAxsR = '' + _k.unwrap( activity.orAxsR ) || '';
            formData.orAddR = '' + _k.unwrap( activity.orAddR ) || '';
            formData.orPsmR = '' + _k.unwrap( activity.orPsmR ) || '';
            formData.orBasR = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'orBas_E',
                _k.unwrap( activity.orBasR ),
                '-de' );
            formData.orSphL = '' + _k.unwrap( activity.orSphL ) || '';
            formData.orCylL = '' + _k.unwrap( activity.orCylL ) || '';
            formData.orAxsL = '' + _k.unwrap( activity.orAxsL ) || '';
            formData.orAddL = '' + _k.unwrap( activity.orAddL ) || '';
            formData.orPsmL = '' + _k.unwrap( activity.orPsmL ) || '';
            formData.orBasL = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'orBas_E',
                _k.unwrap( activity.orBasL ),
                '-de' );

            formData.orHSA = '' + _k.unwrap( activity.orHSA ) || '';
        }

        function getUtilityTherapies( formData, activity ) {
            var icds, startOfTreatment;

            formData.userContent = _k.unwrap( activity.userContent ) || '';
            formData.utDiagnosisName = _k.unwrap( activity.utDiagnosisName ) || '';
            formData.utRemedy1Name = _k.unwrap( activity.utRemedy1Name ) || '';
            formData.utRemedy1Explanation = _k.unwrap( activity.utRemedy1Explanation ) || '';
            formData.utRemedy1Seasons = _k.unwrap( activity.utRemedy1Seasons ) ? String( _k.unwrap( activity.utRemedy1Seasons ) ) : '';
            formData.utRemedy1PerWeek = _k.unwrap( activity.utRemedy1PerWeek ) ? String( _k.unwrap( activity.utRemedy1PerWeek ) ) : '';
            formData.utRemedy2Name = _k.unwrap( activity.utRemedy2Name ) || '';
            formData.utRemedy2Explanation = _k.unwrap( activity.utRemedy2Explanation ) || '';
            formData.utRemedy2Seasons = _k.unwrap( activity.utRemedy2Seasons ) ? String( _k.unwrap( activity.utRemedy2Seasons ) ) : '';
            formData.utRemedy2PerWeek = _k.unwrap( activity.utRemedy2PerWeek ) ? String( _k.unwrap( activity.utRemedy2PerWeek ) ) : '';
            formData.utVocalTherapy = _k.unwrap( activity.utVocalTherapy ) || false;
            formData.utSpeakTherapy = _k.unwrap( activity.utSpeakTherapy ) || false;
            formData.utSpeechTherapy = _k.unwrap( activity.utSpeechTherapy ) || false;

            formData.utFirst = ('FIRST' === _k.unwrap( activity.utPrescriptionType )) || false;
            formData.utFollowing = ('FOLLOWING' === _k.unwrap( activity.utPrescriptionType )) || false;

            formData.utNoNormalCase = _k.unwrap( activity.utNoNormalCase ) || false;
            formData.utHomeVisit = _k.unwrap( activity.utHomeVisit ) || false;
            formData.utNotHomeVisit = !(formData.utHomeVisit) || false;

            formData.utTherapyReport = _k.unwrap( activity.utTherapyReport ) || false;
            formData.utNotTherapyReport = !(formData.utTherapyReport) || false;

            formData.utGroupTherapy = _k.unwrap( activity.utGroupTherapy ) || false;
            formData.utDurationOfSeason = _k.unwrap( activity.utDurationOfSeason ) ? String( _k.unwrap( activity.utDurationOfSeason ) ) : '';

            //  logic changed for MOJ-4448
            startOfTreatment = _k.unwrap( activity.utLatestStartOfTreatment );
            if( startOfTreatment && '' !== startOfTreatment && getMoment()( startOfTreatment ).isValid() ) {
                formData.utLatestStartOfTreatment = getMoment()( _k.unwrap( startOfTreatment ) ).format( 'DD MM YY' );
            } else {
                formData.utLatestStartOfTreatment = '';
            }

            formData.utMedicalJustification = _k.unwrap( activity.utMedicalJustification ) || '';
            formData.utTherapyGoals = _k.unwrap( activity.utTherapyGoals ) || '';

            formData.utUnfall = _k.unwrap( activity.utUnfall ) || false;
            formData.utBvg = _k.unwrap( activity.utBvg ) || false;

            // get linked icd code
            formData.utIcdCode = '';
            icds = _k.unwrap( activity._icdsObj );

            if( icds && icds.length ) {
                formData.utIcdCode = _k.unwrap( icds[0].code );
            }

            // the following are polymorphic fields, could be moved elsewhere.
            formData.content = _k.unwrap( activity.content ) || '';
            formData.code = _k.unwrap( activity.code ) || '';
        }

        /**
         *  Moment is available on client and server, but loaded differently
         *  @returns {Object}
         */

        function getMoment() {
            if( Y.doccirrus.commonutils.isClientSide() ) {
                return moment;
            }

            var serverMoment = require( 'moment' );
            return serverMoment;
        }

        /**
         *  Place linked activities, ICDs and ICDs extra into a single array for mapping
         *
         *  @param  fullActivity
         *  @return {Object}
         */

        function getAllLinkedActivities( fullActivity ) {
            var allLinkedItems = [];

            function mustExist( item ) {
                if ( !item ) { return false; }
                return true;
            }

            //  on the server we have plain objects and no other state modified by the UI
            //  TODO: use context for this
            if( !Y.doccirrus.commonutils.isClientSide() ) {
                allLinkedItems = allLinkedItems.concat( fullActivity._icdsObj || [] );
                allLinkedItems = allLinkedItems.concat( fullActivity._icdsExtraObj || [] );
                allLinkedItems = allLinkedItems.concat( fullActivity._activitiesObj || [] );
                allLinkedItems = allLinkedItems.concat( fullActivity._continuousIcdsObj || [] );
                allLinkedItems = allLinkedItems.concat( fullActivity._referencedByObj || [] );

                allLinkedItems = allLinkedItems.filter( mustExist );
                return allLinkedItems;
            }

            //  on the client we have observables, and there may be additional modified state from viewModels
            allLinkedItems = allLinkedItems.concat( _k.unwrap( fullActivity._icdsObj ) || [] );
            allLinkedItems = allLinkedItems.concat( _k.unwrap( fullActivity._icdsExtraObj ) || [] );
            allLinkedItems = allLinkedItems.concat( _k.unwrap( fullActivity._activitiesObj ) || [] );
            allLinkedItems = allLinkedItems.concat( _k.unwrap( fullActivity._continuousIcdsObj ) || [] );
            allLinkedItems = allLinkedItems.concat( _k.unwrap( fullActivity._referencedByObj ) || [] );

            var i, j, mod;

            if( fullActivity._modifiedLinkedActivities ) {
                for( i = 0; i < fullActivity._modifiedLinkedActivities.length; i++ ) {
                    mod = fullActivity._modifiedLinkedActivities[i];

                    for( j = 0; j < allLinkedItems.length; j++ ) {
                        if( allLinkedItems[j]._id === mod._id ) {
                            allLinkedItems[j] = mod;
                            //alert( 'inject ' + mod._id );
                            Y.log( 'Inserted modified version of activity ' + mod._id, 'debug', NAME );
                        }
                    }

                }
            }

            allLinkedItems = allLinkedItems.filter( mustExist );
            return allLinkedItems;
        }

        function getInvoiceConfiguration( user, callback ) {

            function onInvoiceConfigurationLoaded( err, result ) {
                if( err ) {
                    Y.log( 'Could not load invoice configuration: ' + JSON.stringify( err ), 'warn', NAME );
                    return callback( err );
                }

                result = result.data ? result.data : result;

                if( 0 === result.length ) {
                    return callback( new Error( 'No invoice configuration is defined.' ) );
                }

                callback( null, result[0] );
            }

            if( Y.dcforms.isOnServer ) {
                Y.doccirrus.api.invoiceconfiguration.getUnpopulated( user, onInvoiceConfigurationLoaded );

            } else {
                Y.doccirrus.comctl.privateGet( '/1/invoiceconfiguration', {}, onInvoiceConfigurationLoaded );
            }

        }

        /**
         * Maps medData,
         * depending on the key and index of the elements.
         * @param {MedDataItemSchema[]} medDataItems
         * @param {Date} timestampOfActivity (null, if not bound to an activity, i.e. for patient's latestMedData)
         * @param {object} formData
         * @param {object} mapperContext
         * @param {object} mapperContext.user
         * @param {string} formDataGroupKey Key under which the entries are stored. e.g. "mdt" = "med-data-table". {{InCase_T.mdt.BLOODPRESSURE.value}}
         * @param {string} formDataArrayKey Key under which the entries are pushed into an array. e.g. "latestMedDataTable" {{InCase_T.latestMedDataTable.0.BLOODPRESSURE.value}}
         * @returns {Promise<void>}
         */
        function mapMedDataItems( medDataItems, timestampOfActivity, formData, mapperContext, formDataGroupKey, formDataArrayKey ) {
            var medDataItemTemplateCollectionPromise;

            // load the med data item templates to correctly format the values within the form
            medDataItemTemplateCollectionPromise = getMedDataItemTemplateCollection( mapperContext.user );

            // ensure that an entry for the formDataGroupKey exists
            if( !Object.prototype.hasOwnProperty.call( formData, formDataGroupKey ) || typeof formData[formDataGroupKey] !== "object" || formData[formDataGroupKey] === null ) {
                formData[formDataGroupKey] = {};
            }
            // ensure that an entry for the formDataArrayKey exists
            if( !Object.prototype.hasOwnProperty.call( formData, formDataArrayKey ) || !Array.isArray( formData[formDataArrayKey] ) ) {
                formData[formDataArrayKey] = [];
            }

            // wait for the MedDataItemTemplateCollection to be fetched
            return medDataItemTemplateCollectionPromise
                .then( function onMedDataItemTemplateCollectionFetched( medDataItemTemplateCollection ) {
                    if( Array.isArray( medDataItems ) ) {
                        medDataItems.forEach( function forEachMedDataItem( medDataItem ) {
                            var
                                // in the UI, the item is passed as KoViewModel, which needs to get unwrapped by toJSON
                                localMedDataItem = (typeof medDataItem.toJSON === "function") ? medDataItem.toJSON() : medDataItem,
                                medDataType = localMedDataItem && localMedDataItem.type || "",
                                timestampOfItem,
                                medDataItemConfig,
                                expandedItem;

                            if( localMedDataItem && medDataType ) {
                                // in patient's latestMedData, the date of the entry is stored as "measurementDate"
                                timestampOfItem = timestampOfActivity || localMedDataItem.measurementDate;

                                // get corresponding medDataItemConfig from MedDataItemTemplateCollection
                                medDataItemConfig = medDataItemTemplateCollection.getMedDataItemConfigSchemaForMedDataItem( {
                                    medDataItem: localMedDataItem,
                                    timestamp: timestampOfItem
                                } );

                                // format the item accordingly
                                expandedItem = expandMedDataItemForForm(
                                    localMedDataItem,
                                    medDataItemConfig,
                                    timestampOfItem
                                );

                                // store the entry in the formData
                                formData[formDataGroupKey][medDataType] = expandedItem;
                                formData[formDataArrayKey].push( expandedItem );
                            }
                        } );
                    }
                    return Promise.resolve( formData );
                } );
        }

        /**
         * Loads historical med data from the schema references,
         * depending on the key and index of the elements.
         * @param {{name: string, format: string, field: string, fieldSequence: string[]}[]} schemaReferences
         * @param {object} formData
         * @param {object} mapperContext
         * @param {object} mapperContext.user
         * @param {string} formDataGroupKey key under which the data is added. Here, this is should be "hmdt" = "historic-med-data-table".
         * E.g. {{InCase_T.hmdt.0.BLOODPRESSURE.value}}
         * @returns {Promise<void>}
         */
        function mapHistoricalMedData( schemaReferences, formData, mapperContext, formDataGroupKey ) {
            var
                /**
                 * key value storage
                 * key: string[] (array with number of history entries to be loaded)
                 * e.g.
                 * HEIGHT: [1,2,3] (load the last three entries for MedData height)
                 * @type {object}
                 */
                medDataTypesToBeLoaded = {},
                historicalMedDataFetchPromise,
                medDataItemTemplateCollectionPromise;

            // first, extract the required indices for each element
            schemaReferences.forEach(function _forEachSchemaReference(reference) {
                var historyIndex, medDataTypesToAdd;
                // only use those which match the hmdt flag
                if( reference.name === formDataGroupKey && Array.isArray(reference.fieldSequence) && reference.fieldSequence.length >= 4 ) {

                    // e.g. {{InCase_T.hmdt.0.BLOODPRESSURE.value}} => 0
                    historyIndex = reference.fieldSequence[2];

                    // Since the key may contain an optional field identifier:
                    // e.g. {{InCase_T.hmdt.0.BLOODPRESSURE}} => BLOODPRESSURE => defaults to "BLOODPRESSURE.display"
                    // e.g. {{InCase_T.hmdt.0.BLOODPRESSURE.value}} => BLOODPRESSURE => requests "BLOODPRESSURE.value"
                    // we have to search always for both possibilities, as we don't know yet, if the keys are defined or not
                    // e.g. {{InCase_T.hmdt.0.KEY.SUBKEY.SUBSUBKEY.value}} => KEY.SUBKEY.SUBSUBKEY
                    // e.g. {{InCase_T.hmdt.0.KEY.SUBKEY.SUBSUBKEY}} => KEY.SUBKEY.SUBSUBKEY => is SUBSUBKEY a value? or does it belong to the key?
                    // e.g. {{InCase_T.hmdt.0.KEY.SUBKEY}} => KEY.SUBKEY
                    medDataTypesToAdd = [
                        reference.fieldSequence.slice( 3, reference.fieldSequence.length ).join( "." ),
                        reference.fieldSequence.slice( 3, reference.fieldSequence.length - 1 ).join( "." )
                    ];

                    medDataTypesToAdd.forEach( function _forEachMedDataTypesToAdd( medDataType ) {
                        if( medDataType ) {
                            // create a new array for the history indices, if not yet exists
                            switch( true ) {
                                case !Object.prototype.hasOwnProperty.call( medDataTypesToBeLoaded, medDataType ):
                                case !Array.isArray( medDataTypesToBeLoaded[medDataType] ):
                                    medDataTypesToBeLoaded[medDataType] = [];
                            }

                            // add each history index just once
                            if( medDataTypesToBeLoaded[medDataType].indexOf( historyIndex ) === -1 ) {
                                medDataTypesToBeLoaded[medDataType].push( historyIndex );
                            }
                        }
                    } );
                }
            });

            // second, load for each requested medDataType the historic medData activities containing the respective entries
            if( Y.dcforms.isOnServer ) {
                // fetch the requested me
                historicalMedDataFetchPromise = Y.doccirrus.api.activity.getHistoricMedDataActivities( {
                    user: mapperContext.user,
                    query: {
                        patient: mapperContext.patient,
                        medDataTypes: medDataTypesToBeLoaded
                    }
                } );
            } else {
                historicalMedDataFetchPromise = Y.doccirrus.jsonrpc.api.activity.getHistoricMedDataActivities( {
                    user: mapperContext.user,
                    query: {
                        patient: mapperContext.patient,
                        medDataTypes: medDataTypesToBeLoaded
                    }
                } ).then( function onHistoricalMedDataFetched( response ) {
                    // on JSONRPC, the data is encapsuled in response.data
                    return (response && Array.isArray( response.data )) ? response.data : [];
                } );
            }

            // third, load all custom med data tags, to be able to correctly format the values within the form
            medDataItemTemplateCollectionPromise = getMedDataItemTemplateCollection( mapperContext.user );

            // ensure that a history entry (hmdt = historical med data table)
            // exist within the form data, which is filled with the fetched items
            if( !Object.prototype.hasOwnProperty.call( formData, formDataGroupKey ) ) {
                formData[formDataGroupKey] = {};
            }

            // wait for the data to be fetched
            return Promise.all([
                historicalMedDataFetchPromise,
                medDataItemTemplateCollectionPromise
            ]).then( function onHistoricalMedDataAndTemplateCollectionFetched( results ) {
                var
                    entriesForEachMedDataType = results[0],
                    medDataItemTemplateCollection = results[1];

                // decompose the list into separate entries
                if( Array.isArray( entriesForEachMedDataType ) ) {
                    entriesForEachMedDataType.forEach( function forEachEntryForEachMedDataType( entryForType ) {
                        // the medDataType is encoded by the aggregate as _id, IF FOUND
                        var medDataType = entryForType._id;
                        if( !medDataType ) {
                            // no value found for the aggregate
                            return;
                        }

                        // for each entry found, create a new entry within the formData
                        Object.keys( entryForType ).forEach( function forEachMedDataEntry( historyIndex ) {
                            var
                                medDataItem,
                                medDataItemConfig,
                                // get all medDataItems for that entry
                                medDataItemsOfEntry = entryForType[historyIndex] && entryForType[historyIndex].medData || [],
                                // get the timestamp for that entry
                                timestampOfEntry = entryForType[historyIndex] && entryForType[historyIndex].timestamp;

                            if( Array.isArray( medDataItemsOfEntry ) ) {
                                // search the matching medDataItem (by medDataType)
                                medDataItem = medDataItemsOfEntry.find( function findMedDataItemMatchingType( item ) {
                                    return item && item.type === medDataType;
                                } );

                                if( medDataItem ) {
                                    // get corresponding medDataItemConfig from MedDataItemTemplateCollection
                                    medDataItemConfig = medDataItemTemplateCollection.getMedDataItemConfigSchemaForMedDataItem( {
                                        // in the UI, the item is passed as KoViewModel
                                        medDataItem: medDataItem,
                                        timestamp: timestampOfEntry
                                    } );

                                    // ensure the entry for the history index exists
                                    if( !Object.prototype.hasOwnProperty.call( formData[formDataGroupKey], historyIndex ) ) {
                                        formData[formDataGroupKey][historyIndex] = {};
                                    }

                                    // format the item accordingly
                                    formData[formDataGroupKey][historyIndex][medDataType] = expandMedDataItemForForm(
                                        medDataItem,
                                        medDataItemConfig,
                                        timestampOfEntry
                                    );
                                }
                            }
                        } );
                    } );
                }
                return Promise.resolve( entriesForEachMedDataType );
            } );
        }

        /**
         * Fetch the current MedDataItemTemplateCollection,
         * which contains all the settings required to format / validate medDataItems.
         * Required for (historical) med data entries.
         * @param {object} user
         * @return {Promise<MedDataItemTemplateCollection>}
         */
        function getMedDataItemTemplateCollection( user ) {
            var medDataItemTemplateCollectionPromise;

            // third, load all custom med data tags, to be able to correctly format the values within the form
            if( Y.dcforms.isOnServer ) {
                medDataItemTemplateCollectionPromise = Y.doccirrus.api.meddata.getMedDataItemTemplateCollection( {
                    user: user
                } );
            } else {
                medDataItemTemplateCollectionPromise = Y.doccirrus.jsonrpc.api.meddata.getMedDataItemTemplateCollection()
                    .then( function( response ) {
                        return new MedDataItemTemplateCollection( response && response.data || {} );
                    } );
            }

            return medDataItemTemplateCollectionPromise;
        }

        /**
         *  Helper to flatten and sanitize medData entries into mapping format
         *  Function was formerly located in genericformmappers.common.js but got relocated here as formmappers for
         *  medData activities moved here as well, as they often require db calls
         *  @param {object} medDataItem Individual entry in the medData array, aka MedDataItem (MEDDATA, INGREDIENTPLAN, etc)
         *  @param {MedDataItemConfigSchema} medDataItemConfig
         *  @param {string} timestampOfActivity
         *  @return {object}
         */
        function expandMedDataItemForForm( medDataItem, medDataItemConfig, timestampOfActivity ) {
            var
                mdTypes = Y.doccirrus.schemas.v_meddata.medDataTypes,
                gdTypes = Y.doccirrus.schemas.v_meddata.gravidogrammDataTypes,
                cleanType,
                plainObj,
                plainValue,
                textValue,
                dateValue,
                boolValue,
                head,
                category,
                categoryTranslated,
                additionalData,
                timestampOfActivityMoment = moment( timestampOfActivity ),
                doseRange = _k.unwrap( medDataItem.sampleNormalValueText ) || '',
                minMax = Array.isArray( doseRange ) && doseRange[0] ? doseRange[0].split( '-' ) : [];

            //  do not display 'null' for empty values
            plainValue = _k.unwrap( medDataItem.value ) || '';
            plainValue = ((null === plainValue) ? '' : plainValue + '');
            textValue = _k.unwrap( medDataItem.textValue );
            textValue = ((null === textValue) ? '' : textValue);
            dateValue = _k.unwrap( medDataItem.dateValue );
            dateValue = ((null === dateValue) ? '' : dateValue);
            boolValue = _k.unwrap( medDataItem.boolValue );
            boolValue = ((null === dateValue) ? '' : boolValue);

            //  translate measurement type if possible
            head = _k.unwrap( medDataItem.type );
            if( mdTypes.hasOwnProperty( head ) ) {
                head = i18n( 'v_meddata-schema.medDataTypes.' + head );
            }

            if( gdTypes.hasOwnProperty( head ) ) {
                head = i18n( 'v_meddata-schema.gravidogrammDataTypes.' + head );
            }

            //  SUP-4345 periods and spaces in meddata types can cause failure when saving form state
            cleanType = _k.unwrap( medDataItem.type );
            cleanType = cleanType.replace( / /g, '_' );
            cleanType = cleanType.replace( /\./g, '_' );

            category = _k.unwrap( medDataItem.category );
            categoryTranslated = Y.doccirrus.schemaloader.getEnumListTranslation( 'v_meddata', 'medDataCategory_E', category, 'i18n', '' );

            additionalData = _k.unwrap( medDataItem.additionalData ) || {};

            plainObj = {
                category: category,
                categoryTranslated: categoryTranslated,
                type: head || _k.unwrap( medDataItem.type ),
                cleanType: cleanType,
                head: head,
                value: plainValue,
                textValue: textValue,
                boolValue: boolValue,
                dateValue: dateValue,
                display: (plainValue + ' ' + textValue).trim(),
                unit: _k.unwrap( medDataItem.unit ),
                _id: _k.unwrap( medDataItem._id ),
                measurementDate: moment( _k.unwrap( medDataItem.measurementDate ) ).format( TIMESTAMP_FORMAT ),

                timestamp: timestampOfActivity,
                date: timestampOfActivityMoment.format( TIMESTAMP_FORMAT ),
                time: timestampOfActivityMoment.format( TIME_FORMAT ),
                datetime: timestampOfActivityMoment.format( TIMESTAMP_FORMAT_LONG ),
                formatted: medDataItemConfig.formatMedDataItem( medDataItem ),

                group: additionalData.ActiveIngredient_Wirkstoffplan_group || '',
                comment: additionalData.ActiveIngredient_Wirkstoffplan_comment || '',
                dosis: additionalData.ActiveIngredient_Wirkstoffplan_dosis || '',
                initialDosis: additionalData.ActiveIngredient_Wirkstoffplan_initialDosis || '',
                targetDosis: additionalData.ActiveIngredient_Wirkstoffplan_targetDosis || '',
                noteOnAdaption: additionalData.ActiveIngredient_Wirkstoffplan_noteOnAdaption || '',
                stage: additionalData.ActiveIngredient_Wirkstoffplan_stage || '',
                strength: additionalData.ActiveIngredient_Wirkstoffplan_strength || ''
            };

            // unwrap additionalData to the root level
            Object.keys( additionalData ).forEach( function forEachAdditionalDataKey( key ) {
                plainObj["additionalData_" + key] = additionalData[key];
            } );

            plainObj.miniChart = plainObj.display;

            //  add mini chart if we have a range and a value, MOJ-12072
            if( 2 === minMax.length ) {

                plainValue = parseFloat( plainValue );
                minMax[0] = parseFloat( minMax[0] );
                minMax[1] = parseFloat( minMax[1] );

                if( !isNaN( minMax[0] ) && !isNaN( minMax[1] ) && !isNaN( plainValue ) ) {
                    plainObj.miniChart = 'CHARTMINMAX|' + minMax[0] + '|' + minMax[1] + '|' + plainValue + '|' + 'X' + '\n';
                }
            }

            return plainObj;
        }

        /**
         *
         * @param formData
         * @param activity
         *  @deprecated
         */
        function setQuarter( formData, activity ) {
            var mom = getMoment(),
                timestamp = mom( _k.unwrap( activity.timestamp ) );

            formData.quarter = '' + timestamp.quarter();
            formData.year = '' + timestamp.year();
            formData.yearShort = timestamp.format( 'YY' );
        }

        function getLabRequest( formData, activity ) {

            var
                mom = getMoment(),
                abnDatumZeit = _k.unwrap( activity.timestamp ),
                auBis = _k.unwrap( activity.auBis ) || '',
                datumOP = _k.unwrap( activity.datumOP ) || '';

            formData.kontrollunters = _k.unwrap( activity.kontrollunters ) || '';
            formData.abnDatumZeit = abnDatumZeit || '';
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
            formData.auftrag = _k.unwrap( activity.auftrag ) || '';
            formData.fk4202 = _k.unwrap( activity.fk4202 ) || '';
            formData.fk4204 = _k.unwrap( activity.fk4204 ) || '';

            formData.labRequestRemittor = _k.unwrap( activity.scheinRemittor || '' );
            formData.labRequestEstablishment = _k.unwrap( activity.scheinEstablishment || '' );

            formData.kurativ = '1' === _k.unwrap( activity.scheinSlipMedicalTreatment || '' );
            formData.praeventiv = '2' === _k.unwrap( activity.scheinSlipMedicalTreatment || '' );
            formData.ess = '3' === _k.unwrap( activity.scheinSlipMedicalTreatment || '' );
            formData.bb = '4' === _k.unwrap( activity.scheinSlipMedicalTreatment || '' );

            formData.abnahmeDatum = abnDatumZeit ? moment( abnDatumZeit ).format( 'DDMMYY' ) : '';
            formData.abnahmeDatumBFB = abnDatumZeit ? moment( abnDatumZeit ).format( 'YYYYMMDD' ) : '';
            formData.abnahmeZeit = abnDatumZeit ? moment( abnDatumZeit ).format( 'HHmm' ) : '';

            // for barcodes
            formData.scheinSlipMedicalTreatment = _k.unwrap( activity.scheinSlipMedicalTreatment || '' );

            // ÜBERW extras
            formData.auBis = '' !== auBis ? mom( auBis ).format( 'DDMMYY' ) : '';
            formData.datumOP = '' !== datumOP ? mom( datumOP ).format( 'DDMMYY' ) : '';
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

        function getAU( formData, activity ) {
            var auVon = _k.unwrap( activity.auVon ) || '',
                auVorraussichtlichBis = _k.unwrap( activity.auVorraussichtlichBis ) || '',
                festgestelltAm = _k.unwrap( activity.festgestelltAm ) || '',
                mom = getMoment();

            formData.erstBesch = _k.unwrap( activity.erstBesch ) || false;
            formData.endBesch = _k.unwrap( activity.endBesch ) || false;
            formData.krankengeld = _k.unwrap( activity.krankengeld ) || false;
            formData.folgeBesc = _k.unwrap( activity.folgeBesc ) || false;
            formData.arbeitsunfall = _k.unwrap( activity.arbeitsunfall ) || '';
            formData.durchgangsarzt = _k.unwrap( activity.durchgangsarzt ) || '';

            // bar codes need js dates
            formData.auVonBC = auVon;
            formData.auVorraussichtlichBisBC = auVorraussichtlichBis;
            formData.festgestelltAmBC = festgestelltAm;

            formData.auVon = '' !== auVon ? mom( auVon ).format( 'DDMMYY' ) : '';
            formData.auVorraussichtlichBis = '' !== auVorraussichtlichBis ? mom( auVorraussichtlichBis ).format( 'DDMMYY' ) : '';
            formData.festgestelltAm = '' !== festgestelltAm ? mom( festgestelltAm ).format( 'DDMMYY' ) : '';

            formData.sonstigerUnf = _k.unwrap( activity.sonstigerUnf ) || '';
            formData.bvg = _k.unwrap( activity.bvg ) || '';
            formData.rehab = _k.unwrap( activity.rehab ) || '';
            formData.reintegration = _k.unwrap( activity.reintegration ) || '';
            formData.massnahmen = _k.unwrap( activity.massnahmen ) || '';
            formData.diagnosesAdd = _k.unwrap( activity.diagnosesAdd ) || '';
        }

        function addArrangementCodeToFormFieldValue( timestamp, formFieldValue, eTSArrangementCode, eTSAErrorMessage ) {
            var eTSArrangementCodeLine;

            if( eTSAErrorMessage ) {
                return Y.doccirrus.i18n( 'InCaseMojit.ReferralEditorModelJS.message.PRINT_ON_ERROR' ) + (formFieldValue ? ' ' : '') + formFieldValue;
            }

            if( !eTSArrangementCode ) {
                return formFieldValue;
            }

            eTSArrangementCodeLine = 'Vermittlungscode: ' + eTSArrangementCode;

            if( moment( timestamp ).year() > 2019 ) {
                eTSArrangementCodeLine = eTSArrangementCodeLine + ', www.116117.de, Tel: 116 117';
            }

            return eTSArrangementCodeLine + (formFieldValue ? ' ' : '') + formFieldValue;
        }

        function cleanArrangementCodeLine( timestamp, arrangementCodeLine ) {
            var regexErr = /www\.eTerminservice\.de, Tel: 116 117/gm,
                regex2020 = /^Vermittlungscode: ([a-zA-Z0-9]{4})-([a-zA-Z0-9]{4})-([a-zA-Z0-9]{4}), www\.eTerminservice\.de, Tel: 116 117/gm,
                regex2019 = /^Vermittlungscode: ([a-zA-Z0-9]{4})-([a-zA-Z0-9]{4})-([a-zA-Z0-9]{4})/gm,
                parsedArrangementCodeLine, cleanArrangementCodeLine;

            parsedArrangementCodeLine = regex2020.exec( arrangementCodeLine ) ||
                                        regexErr.exec( arrangementCodeLine ) ||
                                        regex2019.exec( arrangementCodeLine );

            if( parsedArrangementCodeLine !== null ) {
                cleanArrangementCodeLine = arrangementCodeLine.substring( parsedArrangementCodeLine[0].length ).trim();
            } else {
                cleanArrangementCodeLine = arrangementCodeLine;
            }

            return cleanArrangementCodeLine;
        }

        /**
         * Create an UUID
         *
         * @see RFC4211 version 4
         */
        function createUuid() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        /*
         *  share public methods
         */

        Y.namespace( 'dcforms.mapper' ).objUtils = {
            getOpthalmology: getOpthalmology,
            getUtilityTherapies: getUtilityTherapies,
            getDob: getDob,
            getVatSummary: getVatSummary,
            setup1: setupFormdataPatient,
            setup2: setupPersonalienfeld,
            setup3: setAdditionalFormData,
            docBlock: getDocBlock,
            getAllLinkedActivities: getAllLinkedActivities,
            getMoment: getMoment,
            getInvoiceConfiguration: getInvoiceConfiguration,
            setBarcodeData: setBarcodeData,
            getBarcode: getBarcode,
            setQuarter: setQuarter,
            getLabRequest: getLabRequest,
            getAU: getAU,
            setupFindingMedicationDiagnoses: setupFindingMedicationDiagnoses,
            addArrangementCodeToFormFieldValue: addArrangementCodeToFormFieldValue,
            cleanArrangementCodeLine: cleanArrangementCodeLine,
            createUuid: createUuid,
            mapHistoricalMedData: mapHistoricalMedData,
            mapMedDataItems: mapMedDataItems,
            expandMedDataItemForForm: expandMedDataItemForForm
        };

    },
    '0.0.1',
    {
        requires: [
            'doccirrus',
            'dccommonutils',
            'dcformmap-ko-util',
            'activity-schema',
            'tag-schema'
        ]
    }
);
