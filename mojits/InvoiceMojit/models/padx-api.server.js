/**
 * User: jm
 * Date: 15-01-23  13:12
 * (c) 2014, Doc Cirrus GmbH, Berlin
 */
/*global YUI */

YUI.add( 'padx-api', function( Y, NAME ) {

        /**
         * @module padx-api
         */

        const debug = true,
            util = require( 'util' ),
            {formatPromiseResult, promisifyArgsCallback} = require( 'dc-core' ).utils,
            fs = require( 'fs' ),
            moment = require( 'moment' ),
            Iconv = require( 'iconv' ).Iconv,
            http = require( 'https' ),
            crypto = require( 'crypto' ),
            cwd = process.cwd(),
            async = require( 'async' );

        let xmlIndentation = "    ";

        let java,
            pkcs7_api;

        /**
         * extract number from string
         * @method extractDistFrmCommentStr
         * @param {String} str
         *
         * @returns {Number|String}
         */
        function extractDistFrmCommentStr( str ) {
            let
                distanceArr = str && str.match( /\d+(\s+km|km)/i );
            return distanceArr && distanceArr.length ? +(distanceArr[0].replace( /\s+km|km/ig, '' )) : '';
        }

        /**
         * loqd java library with nnecessary options
         * @method loadJava
         *
         */
        function loadJava() {
            if( !java ) {
                let jc = require( `${process.cwd()}/padx.json` );
                java = require( 'java' );
                java.options.push( '-Xrs' );
                dbg( `jar path: ${cwd}/${jc.jarPath}` );
                java.classpath.push( jc.jarPath );
            }
            if( !pkcs7_api ) {
                pkcs7_api = java.import( "com.doccirrus.padnext.CMSUtil" );
            }
        }

        /**
         * logs debug messages, but only if debug mode is active
         * @method dbg
         * @param {String} text
         */
        function dbg( text ) {
            Y.log( `padx-api debug: ${text}`, "debug", NAME );
        }

        /**
         * stringify a number with leading zeroes
         * @method lz
         * @param {Number} num
         * @param {Number} len
         * @return {Number | String }
         */
        function lz( num, len ) {
            if( num.toString().length < len ) {
                while( num.toString().length < len ) {
                    num = `0${num}`;
                }
                return num;
            }
            if( num.toString().length > len ) {
                return num.toString().substr( num.toString().length - len );
            } else {
                return num;
            }
        }

        /**
         * sanitize XML string
         * @method escapeXML
         * @param {String} str
         *
         * @returns {String}
         */
        function escapeXML( str ) {
            str = str || "";
            return str.replace( /&/g, '&amp;' )
                .replace( /</g, '&lt;' )
                .replace( />/g, '&gt;' )
                .replace( /"/g, '&quot;' )
                .replace( /'/g, '&apos;' );
        }

        dbg( "on." );

        /**
         * fixes malformed numbers based on required format
         * e.g. 0 -> 00.00
         * @method postfixZero
         * @param {Number} num actual number to fix
         * @param {Number} lenpre digits before point
         * @param {Number} lenpost digits after point
         *
         * @returns {String}
         */
        function postfixZero( num, lenpre, lenpost ) {
            let parts = [[], []];
            if( num ) {
                parts = num.toString().split( "." );
            }
            let ret = "";
            if( parts.length > 0 ) {
                ret = parts[0];
            }

            if( ret.length === 0 ) {
                ret += "0";
            }
            while( ret.length < lenpre ) {
                ret = `0${ret}`;
            }
            if( parts.length === 1 ) {
                ret += ".";
                for( let i = 0; i < lenpost; i++ ) {
                    ret += "0";
                }
            } else {
                ret += `.${parts[1]}`;
                for( let j = 0; j < (lenpost - parts[1].length); j++ ) {
                    ret += "0";
                }
            }
            return ret;
        }

        /**
         * returns PADX-internal position of a given provider based on their ID.
         * if the given ID is not part of the list, it is appended.
         * @method getProvId
         * @param {Number} id ID to check for
         * @param {Array} providers list of providers so far
         *
         * @returns {Number}
         */
        function getProvId( id, providers ) {
            for( let i = 0; i < providers.length; i++ ) {
                let curProv = providers[i];
                dbg( `getProvId: checking ${curProv} against ${id}` );
                if( curProv === id ) {
                    dbg( "GET." );
                    return i + 1;
                }
            }
            providers.push( id );
            return providers.length;
        }

        /**
         * adds xml entries for anrede, vorname, name, [titel], [namezusatz]
         * @method createNameBlock
         * @param {Object} curPat patient data object
         * @param {Number} indent indentation level to use
         * @param {Object} padXJson configuration from file
         *
         * @returns {String}
         */
        function createNameBlock( curPat, indent, padXJson ) {
            let xml = "";
            xml += `${ind( indent )}<anrede>${padXJson.talkMap[curPat.talk]}</anrede>`;
            if( curPat.title ) {
                xml += `${ind( indent )}<titel>${curPat.title}</titel>`;
            }
            xml += `${ind( indent )}<vorname>${escapeXML( curPat.firstname )}</vorname>`;
            xml += `${ind( indent )}<name>${escapeXML( curPat.lastname )}</name>`;
            if( curPat.nameaffix ) {
                xml += `${ind( indent )}<namezusatz>${curPat.nameaffix}</namezusatz>`;
            }
            return xml;
        }

        /**
         * adds xml entries for address data for the invoice receiver. This could be a
         * regular address block or a BG "free text" format of addresses
         * @method createInvoiceAddressBlock
         * @param {Object} curPat patient
         * @param {Number} indent indentation level to use
         * @param {Boolean} isBG is this a BG Case
         *
         * @returns {String}
         */
        function createInvoiceAddressBlock( curPat, indent, isBG ) {
            // if we have a billing address it must be used: for BG and Private.
            if( curPat.addresses &&
                curPat.addresses.some( item => {
                    return Boolean( item.kind === "BILLING" );
                } ) ) {
                return createAddressBlock( curPat, indent, "BILLING" );
            }
            // otherwise: BG -> extract address from the BG KT.
            //         Private -> use patients address.
            if( !isBG ) {
                return createAddressBlock( curPat, indent );
            }

            // we are in a BG case
            let xml = "",
                insurance = (curPat.insuranceStatus && curPat.insuranceStatus.length &&
                             curPat.insuranceStatus.find( entry => {
                                 return (entry.type === "BG");
                             } )),
                zip,
                city;

            if( !insurance ) {
                return "";
            }
            if( !insurance.address2 ) {
                insurance.address2 = "";
            }
            zip = /(\d{4,5})/.exec( insurance.address2 );
            if( zip && Array.isArray( zip ) ) {
                zip = zip[0];
                city = insurance.address2.replace( zip, "" ).trim();
            } else {
                zip = '';
                city = insurance.address2;
            }
            xml += `${ind( indent )}<anschrift>`;
            xml += `${ind( indent + 1 )}<hausadresse>`;
            xml += `${ind( indent + 2 )}<plz>${zip}</plz>`;
            xml += `${ind( indent + 2 )}<ort>${city}</ort>`;
            xml += `${ind( indent + 2 )}<strasse>${escapeXML( insurance.address1 )}</strasse>`;
            xml += `${ind( indent + 1 )}</hausadresse>`;
            xml += `${ind( indent )}</anschrift>`;
            return xml;
        }


        /**
         * adds XML entries for the position type SonstigesHonorar
         * @method getFee
         * @param {Object} expense
         * @param {Number} indent indentation level to use
         *
         * @returns {String}
         */
        function getFee( expense, indent ) {
            let result = '';
            result += `${ind( indent )}<sonstigeshonorar positionsnr="${expense.positionNr
                }">`;

            result += `${ind( indent + 1 )}<datum>${expense.datum}</datum>`;
            result += expense.uhrzeit ? `${ind( indent + 1 )}<uhrzeit>${expense.uhrzeit}</uhrzeit>` : '';
            result += `${ind( indent + 1 )}<anzahl>${expense.anzahl}</anzahl>`;
            result += `${ind( indent + 1 )}<text>${escapeXML( expense.text )}</text>`;
            result += `${ind( indent + 1 )}<einzelbetrag>${expense.price}</einzelbetrag>`;

            result += `${ind( indent )}</sonstigeshonorar>`;
            return result;
        }

        /**
         * adds XML entries for the position type Auslagen
         * @method getFee
         * @param {Object} expense
         * @param {Number} indent indentation level to use
         *
         * @returns {String}
         */
        function getExpense( expense, indent ) {
            let result = '';
            result += `${ind( indent )}<auslagen positionsnr="${expense.positionNr
                }" kennzeichen="${expense.kennzeichen}">`;

            result += `${ind( indent + 1 )}<datum>${expense.datum}</datum>`;
            result += expense.uhrzeit ? `${ind( indent + 1 )}<uhrzeit>${expense.uhrzeit}</uhrzeit>` : '';
            result += `${ind( indent + 1 )}<anzahl>${expense.anzahl}</anzahl>`;
            result += `${ind( indent + 1 )}<text>${escapeXML( expense.text )}</text>`;
            result += `${ind( indent + 1 )}<einzelbetrag>${expense.price}</einzelbetrag>`;

            result += `${ind( indent )}</auslagen>`;
            return result;
        }

        /**
         * adds xml entries for address data
         * @method createAddressBlock
         * @param {Object} curPat patient data object
         * @param {Number} indent indentation level to use
         * @param {String} addressType address type that should be rendered (default OFFICIAL)
         *
         * @returns {String}
         */
        function createAddressBlock( curPat, indent, addressType ) {
            let xml = "";
            addressType = addressType || "OFFICIAL";
            dbg( `curGPat.addresses: ${util.inspect( curPat.addresses )}` );

            if( !curPat.addresses ) {
                //  TODO: check that patient has OFFICIAL or POSTBOX address
                throw(Y.doccirrus.errors.rest( '500', `Patient is missing addresses: ${curPat._id}` ));
            }

            for( let i = 0; i < curPat.addresses.length; i++ ) {
                if( addressType === curPat.addresses[i].kind ) {
                    let offAddress = curPat.addresses[i];
                    xml += `${ind( indent )}<anschrift>`;
                    xml += `${ind( indent + 1 )}<hausadresse>`;
                    if( offAddress.countryCode ) {
                        xml += `${ind( indent + 2 )}<land>${offAddress.countryCode}</land>`;
                    }
                    if( offAddress.addon ) {
                        xml += `${ind( indent + 2 )}<zusatz>${offAddress.addon}</zusatz>`;
                    }
                    xml += `${ind( indent + 2 )}<plz>${offAddress.zip}</plz>`;
                    xml += `${ind( indent + 2 )}<ort>${offAddress.city}</ort>`;
                    xml += `${ind( indent + 2 )}<strasse>${escapeXML( offAddress.street )}</strasse>`;
                    if( offAddress.houseno ) {
                        xml += `${ind( indent + 2 )}<hausnr>${offAddress.houseno}</hausnr>`;
                    }
                    xml += `${ind( indent + 1 )}</hausadresse>`;
                    xml += `${ind( indent )}</anschrift>`;
                    break;
                }
                if( "POSTBOX" === curPat.addresses[i].kind ) {
                    let boxAddress = curPat.addresses[i];
                    xml += `${ind( indent )}<anschrift>`;
                    xml += `${ind( indent + 1 )}<postfach>`;
                    xml += `${ind( indent + 2 )}<postfachnr>${boxAddress.postbox}</postfachnr>`;
                    xml += `${ind( indent + 2 )}<plz>${boxAddress.zip}</plz>`;
                    xml += `${ind( indent + 2 )}<ort>${boxAddress.city}</ort>`;
                    xml += `${ind( indent + 1 )}</postfach>`;
                    xml += `${ind( indent )}</anschrift>`;
                    break;
                }
            }
            return xml;
        }

        /**
         * adds xml entries for konktakt data
         * @method createCommBlock
         * @param {Object} curPat patient data object
         * @param {Number} indent indentation level to use
         * @param {Object} padXJson configuration from file
         *
         * @returns {String}
         */
        function createCommBlock( curPat, indent, padXJson ) {
            let xml = "";
            dbg( `curGPat.communications: ${util.inspect( curPat.communications )}` );
            for( let j = 0; j < curPat.communications.length; j++ ) {
                if( padXJson.contacttypeMap[curPat.communications[j].type] ) {
                    xml += `${ind( indent )}<kontakt art="${padXJson.contactkindMap[curPat.communications[j].type]}" typ="${padXJson.contacttypeMap[curPat.communications[j].type]}">${curPat.communications[j].value}</kontakt>`;
                }
            }
            return xml;
        }

        /**
         * fixes the encoding from UTF-8 to ISO-8859-15.
         * @method xmlToIso15Bytes
         * @param {String} xml
         *
         * @returns {String}
         */
        function xmlToIso15Bytes( xml ) {
            const utf8ToIso15 = new Iconv( 'UTF-8', 'ISO-8859-15//TRANSLIT//IGNORE' );

            return utf8ToIso15.convert( xml.replace( "UTF-8", "ISO-8859-15" ) );
        }

        /**
         * @method createXMLs
         * @param {Object} baseConfig complex config object used throughout the process
         * @param {Object} context invoice related args data
         */
        async function createXMLs( baseConfig, context ) {
            const {user, invoiceLogId, excludedPatientIds, excludedScheinIds, unknownInsuranceScheinIds, onProgress} = context;
            dbg( "createXMLs" );
            let counter = 0;

            //list of service providers encountered throughout
            let providers = [];
            let providerLocation = ''; // concept here incomplete MOJ-7669

            //the actual file strings
            let auftragsXML = "";
            let nutzdatenXML = "";

            const processSingleEntry = async function( invoiceEntry, padXJson ) {
                //step
                let curBase = invoiceEntry.data;
                let curPat = curBase.patient;
                let curProv = curBase.employeeId;
                let curDiag = curBase.diagnoses;
                let curCDiag = curBase.continuousDiagnoses;
                let curTreat = curBase.treatments;
                let locationCode = curBase.locations && curBase.locations[0].institutionCode;
                let privInsurance;
                let isBG = Boolean( "BGSCHEIN" === curBase.actType );

                if( locationCode ) {
                    providerLocation = locationCode;
                }

                let invoiceId, invoiceTotal;

                dbg( `invoiceEntry:\n${util.inspect( invoiceEntry )}` );
                if( 'header' === invoiceEntry.type ) {
                    dbg( "type is header" );

                } else if( 'schein' === invoiceEntry.type ) {
                    counter++;
                    dbg( "type is schein" );
                    dbg( "creating new patient block" );
                    // MOJ-14319: [OK] [CASEFOLDER]
                    privInsurance = (curPat.insuranceStatus && curPat.insuranceStatus.length &&
                                     curPat.insuranceStatus.find( entry => {
                                         return (entry.type === invoiceEntry.data.caseFolderTypeSingle);
                                     } ));

                    invoiceId = `${invoiceEntry._id}`;
                    invoiceId = invoiceId.substr( 1, 8 ) + invoiceId.substr( 18 );
                    invoiceTotal = invoiceEntry.data.invoiceData[0].total;

                    let
                        AISInvoiceNumber = ( baseConfig.AISInvoiceNumber ? ` aisrechnungsnr="${invoiceId}"` : '' ),
                        AISAmount = baseConfig.AISAmount ? ` aisendbetrag="${invoiceTotal}"` : '';

                    nutzdatenXML += `${ind( 1 )}<rechnung id="${curBase._id}"${AISInvoiceNumber}${AISAmount}>`;

                    nutzdatenXML += `${ind( 2 )}<rechnungsempfaenger>`;
                    if( isBG ) {
                        let
                            iEnt = (curPat.insuranceStatus && curPat.insuranceStatus.length &&
                                    curPat.insuranceStatus.find( entry => {
                                        return (entry.type === "BG");
                                    } )),
                            insuranceName = iEnt.insuranceName || 'unbekannt';
                        nutzdatenXML += `${ind( 3 )}<organisation>`;
                        nutzdatenXML += `${ind( 4 )}<name>${escapeXML( insuranceName )}</name>`;
                        nutzdatenXML += createInvoiceAddressBlock( curPat, 4, isBG );
                        nutzdatenXML += `${ind( 3 )}</organisation>`;

                    } else if( curPat.addresses &&
                               curPat.addresses.some( item => {
                                   return Boolean( item.kind === "BILLING" );
                               } ) ) {
                        let r = curPat.addresses.filter( item => {
                                return Boolean( item.kind === "BILLING" );
                            } )[0],
                            receiver = r && r.receiver;
                        if( 'organization' === r.payerType ) {
                            nutzdatenXML += `${ind( 3 )}<organisation>`;
                            nutzdatenXML += `${ind( 4 )}<name>${escapeXML( receiver )}</name>`;
                            nutzdatenXML += createInvoiceAddressBlock( curPat, 4, isBG );
                            nutzdatenXML += `${ind( 3 )}</organisation>`;
                        } else {
                            nutzdatenXML += `${ind( 3 )}<person>`;
                            nutzdatenXML += createNameBlock( r, 4, baseConfig.padXJson );
                            nutzdatenXML += createInvoiceAddressBlock( curPat, 4 );
                            nutzdatenXML += createCommBlock( curPat, 4, baseConfig.padXJson );
                            nutzdatenXML += `${ind( 3 )}</person>`;
                        }
                    } else {
                        nutzdatenXML += `${ind( 3 )}<person>`;
                        nutzdatenXML += createNameBlock( curPat, 4, baseConfig.padXJson );
                        if( curPat.kbvDob ) {
                            nutzdatenXML += `${ind( 4 )}<gebdatum>${moment( curPat.kbvDob, "DD.MM.YYYY" ).format( "YYYY-MM-DD" )}</gebdatum>`;
                        }
                        nutzdatenXML += createInvoiceAddressBlock( curPat, 4 );
                        nutzdatenXML += createCommBlock( curPat, 4, baseConfig.padXJson );
                        nutzdatenXML += `${ind( 3 )}</person>`;
                    }
                    nutzdatenXML += `${ind( 2 )}</rechnungsempfaenger>`;

                    nutzdatenXML += `${ind( 2 )}<abrechnungsfall>`;
                    nutzdatenXML += `${ind( 3 )}<humanmedizin>`;

                    nutzdatenXML += `${ind( 4 )}<leistungserbringerid>${getProvId( curProv, providers )}</leistungserbringerid>`;

                    nutzdatenXML += `${ind( 4 )}<behandelter${curPat._id ? ` aisid="${curPat._id}"` : ''}>`;
                    nutzdatenXML += createNameBlock( curPat, 5, baseConfig.padXJson );
                    nutzdatenXML += `${ind( 5 )}<gebdatum>${moment( curPat.kbvDob, "DD.MM.YYYY" ).format( "YYYY-MM-DD" )}</gebdatum>`;
                    nutzdatenXML += `${ind( 5 )}<geschlecht>${baseConfig.padXJson.genderMap[curPat.gender]}</geschlecht>`;
                    nutzdatenXML += createCommBlock( curPat, 5, baseConfig.padXJson );
                    nutzdatenXML += `${ind( 4 )}</behandelter>`;

                    nutzdatenXML += `${ind( 4 )}<versicherter>`;
                    nutzdatenXML += createNameBlock( curPat, 5, baseConfig.padXJson );
                    nutzdatenXML += `${ind( 5 )}<gebdatum>${moment( curPat.kbvDob, "DD.MM.YYYY" ).format( "YYYY-MM-DD" )}</gebdatum>`;
                    nutzdatenXML += `${ind( 5 )}<geschlecht>${baseConfig.padXJson.genderMap[curPat.gender]}</geschlecht>`;

                    // Versicherung
                    let insurance = isBG ? curPat.insuranceStatus.find( entry => {
                        return entry.type === 'BG';
                    } ) : privInsurance;
                    if( insurance && insurance.insuranceId ) {
                        nutzdatenXML += `${ind( 5 )}<versicherung>`;
                        if( insurance.insuranceName ) {
                            nutzdatenXML += `${ind( 6 )}<kassenname>${insurance.insuranceName}</kassenname>`;
                        }

                        nutzdatenXML += `${ind( 6 )}<iknr>${Number( insurance.insuranceId ) === 0 ? '0000001' : insurance.insuranceId}</iknr>`;

                        if( insurance.insuranceNo ) {
                            nutzdatenXML += `${ind( 6 )}<kvnr>${insurance.insuranceNo}</kvnr>`;
                        }

                        if( insurance.fk4110 ) {
                            nutzdatenXML += `${ind( 6 )}<gueltigbis>${moment( insurance.fk4110 ).format( "YYYY-MM-DD" )}</gueltigbis>`;
                        }

                        nutzdatenXML += `${ind( 5 )}</versicherung>`;
                    }

                    nutzdatenXML += createAddressBlock( curPat, 5 );
                    nutzdatenXML += createCommBlock( curPat, 5, baseConfig.padXJson );

                    nutzdatenXML += `${ind( 4 )}</versicherter>`;

                    if( ['STATIONARY', 'AMBULANT'].includes( curBase.treatmentType ) && curBase.scheinClinicalTreatmentFrom && curBase.scheinClinicalTreatmentTo ) {
                        nutzdatenXML += `${ind( 4 )}<zeitraum>`;
                        nutzdatenXML += `${ind( 5 )}<startdatum>${moment( curBase.scheinClinicalTreatmentFrom ).format( "YYYY-MM-DD" )}</startdatum>`;
                        nutzdatenXML += `${ind( 5 )}<endedatum>${moment( curBase.scheinClinicalTreatmentTo ).format( "YYYY-MM-DD" )}</endedatum>`;
                        nutzdatenXML += `${ind( 5 )}<anzahltage>${moment( curBase.scheinClinicalTreatmentTo ).diff( moment( curBase.scheinClinicalTreatmentFrom ), 'days' )}</anzahltage>`;
                        nutzdatenXML += `${ind( 4 )}</zeitraum>`;
                    }

                    nutzdatenXML += `${ind( 4 )}<behandlungsart>${curBase.treatmentType === 'AMBULANT' ? '0' : '1'}</behandlungsart>`;

                    // get the vertragsart from the Schein
                    if( "bg_bhb" === curBase.uvGoaeType ) {
                        nutzdatenXML += `${ind( 4 )}<vertragsart>41</vertragsart>`;
                    } else if( isBG || "bg_ahb" === curBase.uvGoaeType ) {
                        nutzdatenXML += `${ind( 4 )}<vertragsart>40</vertragsart>`;
                    } else if( privInsurance && privInsurance.billingFactor ) {
                        // try and induce the vertragsart from the PKV InsuranceStatus
                        // if there is more than one this is fairly random

                        nutzdatenXML += `${ind( 4 )}<vertragsart>${Y.doccirrus.api.contract.getPrivateContractPVSCode( privInsurance.billingFactor )}</vertragsart>`;

                    } else {
                        nutzdatenXML += `${ind( 4 )}<vertragsart>1</vertragsart>`;
                    }

                    if( baseConfig.participantCustomerNumber && baseConfig.participantValue ) {
                        let value = baseConfig.participantValueType === 'total' ? baseConfig.participantValue : (invoiceTotal * baseConfig.participantValue / 100);
                        value = (Math.round( value * 100 ) / 100).toFixed( 2 );

                        nutzdatenXML += `${ind( 4 )}<beteiligung>`;
                        nutzdatenXML += `${ind( 5 )}<betrag>${value}</betrag>`;
                        nutzdatenXML += `${ind( 5 )}<beteiligter>${baseConfig.participantCustomerNumber}</beteiligter>`;
                        nutzdatenXML += `${ind( 4 )}</beteiligung>`;
                    }

                    if( ['STATIONARY', 'AMBULANT'].includes( curBase.treatmentType ) && curBase.scheinClinicalTreatmentFrom && curBase.scheinClinicalTreatmentTo ) {
                        nutzdatenXML += `${ind( 4 )}<aktenzeichen>${curBase.scheinClinicID || curBase._id}</aktenzeichen>`;
                    }

                    if( isBG ) {
                        // add unfalldaten block
                        nutzdatenXML += `${ind( 4 )}<unfalldaten>`;
                        nutzdatenXML += `${ind( 5 )}<unfalltag>${moment( curBase.dayOfAccident ).format( "YYYY-MM-DD" )}</unfalltag>`;
                        nutzdatenXML += `${ind( 5 )}<personalunfall>` + `0` + `</personalunfall>`;
                        nutzdatenXML += `${ind( 5 )}<arbeitgeber>`;
                        nutzdatenXML += `${ind( 6 )}<name>${escapeXML( curBase.accidentCompany )}</name>`;

                        let accidentAddress = {};
                        accidentAddress.kind = "OFFICIAL";
                        accidentAddress.street = curBase.accidentCompanyStreet;
                        accidentAddress.houseno = curBase.accidentCompanyHouseno;
                        accidentAddress.zip = curBase.accidentCompanyPLZ;
                        accidentAddress.city = curBase.accidentCompanyCity;
                        nutzdatenXML += createAddressBlock( {addresses: [accidentAddress]}, 6 );
                        nutzdatenXML += `${ind( 5 )}</arbeitgeber>`;
                        nutzdatenXML += `${ind( 4 )}</unfalldaten>`;
                    }

                    //diagnoses
                    dbg( `curDiag${util.inspect( curDiag )}` );
                    for( let k = 0; k < curDiag.length; k++ ) {
                        let curIcd = curDiag[k];
                        nutzdatenXML += `${ind( 4 )}<diagnose>`;
                        nutzdatenXML += `${ind( 5 )}<text>${escapeXML( curIcd.content )}</text>`;
                        if( curIcd.code && curIcd.catalogShort ) {
                            nutzdatenXML += `${ind( 5 )}<code system="${curIcd.catalogShort}">${curIcd.code}</code>`;
                        }
                        if( curIcd.diagnosisType ) {
                            if( curIcd.diagnosisType === "ACUTE" ) {
                                nutzdatenXML += `${ind( 5 )}<typ>1</typ>`;
                            } else {
                                nutzdatenXML += `${ind( 5 )}<typ>2</typ>`;
                            }
                        }
                        if( curIcd.timestamp ) {
                            nutzdatenXML += `${ind( 5 )}<datum>${moment( curIcd.timestamp ).format( "YYYY-MM-DD" )}</datum>`;
                        }
                        if( curIcd.diagnosisCert && padXJson.diagnosisCertMap[curIcd.diagnosisCert] ) {
                            nutzdatenXML += `${ind( 5 )}<sicherheit>${padXJson.diagnosisCertMap[curIcd.diagnosisCert]}</sicherheit>`;
                        }
                        if( curIcd.diagnosisSite && padXJson.diagnosisSiteMap[curIcd.diagnosisSite] ) {
                            nutzdatenXML += `${ind( 5 )}<lokalisation>${padXJson.diagnosisSiteMap[curIcd.diagnosisSite]}</lokalisation>`;
                        }
                        nutzdatenXML += `${ind( 4 )}</diagnose>`;
                    }

                    // continuous diagnoses
                    for( let l = 0; l < curCDiag.length; l++ ) {
                        let curCIcd = curCDiag[l];
                        nutzdatenXML += `${ind( 4 )}<diagnose>`;
                        nutzdatenXML += `${ind( 5 )}<text>${escapeXML( curCIcd.content )}</text>`;
                        if( curCIcd.code && curCIcd.catalogShort ) {
                            nutzdatenXML += `${ind( 5 )}<code system="${curCIcd.catalogShort}">${curCIcd.code}</code>`;
                        }
                        if( curCIcd.diagnosisType ) {
                            if( curCIcd.diagnosisType === "ACUTE" ) {
                                nutzdatenXML += `${ind( 5 )}<typ>1</typ>`;
                            } else {
                                nutzdatenXML += `${ind( 5 )}<typ>2</typ>`;
                            }
                        }
                        if( curCIcd.timestamp ) {
                            nutzdatenXML += `${ind( 5 )}<datum>${moment( curCIcd.timestamp ).format( "YYYY-MM-DD" )}</datum>`;
                        }
                        if( curCIcd.diagnosisCert && padXJson.diagnosisCertMap[curCIcd.diagnosisCert] ) {
                            nutzdatenXML += `${ind( 5 )}<sicherheit>${padXJson.diagnosisCertMap[curCIcd.diagnosisCert]}</sicherheit>`;
                        }
                        if( curCIcd.diagnosisSite && padXJson.diagnosisSiteMap[curCIcd.diagnosisSite] ) {
                            nutzdatenXML += `${ind( 5 )}<lokalisation>${padXJson.diagnosisSiteMap[curCIcd.diagnosisSite]}</lokalisation>`;
                        }
                        nutzdatenXML += `${ind( 4 )}</diagnose>`;
                    }

                    // scheinDiagnoses
                    if( curBase.scheinDiagnosis ) {
                        nutzdatenXML += `${ind( 4 )}<diagnose><text>`;
                        nutzdatenXML += escapeXML( curBase.scheinDiagnosis );
                        nutzdatenXML += `${ind( 4 )}</text></diagnose>`;
                    }

                    //treatments
                    dbg( `curTreat${util.inspect( curTreat )}` );

                    nutzdatenXML += `${ind( 4 )}<positionen posanzahl="${curTreat.length}">`;

                    for( let m = 0; m < curTreat.length; m++ ) {
                        let
                            actualPrice = '0.00',
                            curAct = curTreat[m],
                            treatCode = (curAct.code && curAct.code.substring && curAct.code.substring( 0, 8 ).trim()),
                            positionNr = m + 1,
                            datum = moment( curAct.timestamp ).format( "YYYY-MM-DD" ),
                            timeStr = curAct && curAct.time ? moment( curAct.time, 'HH:mm' ).format( "HH:mm:ss" ) : '',
                            vatPadxA = 0,
                            text = curAct.content || "",
                            pfPrice = postfixZero( curAct.price, 7, 2 ),
                            isFee = Y.doccirrus.api.contract.isFee( curAct ),
                            expenseCode = Y.doccirrus.api.contract.isExpense( curAct ),
                            isGoae = curAct.catalogShort === "GOÄ",
                            codeStartsWithW = curAct.code && curAct.code.startsWith( 'W' ),
                            codeStartsWithR = curAct.code && curAct.code.startsWith( 'R' ),
                            isGoaeWegegeld = isGoae && codeStartsWithW && curAct.comment && curAct.comment.startsWith( 'Wegegeld' ),
                            isGoaeReisekosten = isGoae && codeStartsWithR && curAct.comment && curAct.comment.startsWith( 'Reiseentschädigung' ),
                            radiusInKm = isGoaeWegegeld || isGoaeReisekosten ? extractDistFrmCommentStr( curAct.comment ) : '';

                        if( curAct.hasVat ) {
                            dbg( "doing vat." );
                            dbg( `curAct.vat, valid range is [1,3]: ${curAct.vat}` );
                            if( Y.doccirrus.vat.getByCode( curAct.vat ).description ) {
                                vatPadxA = parseInt( Y.doccirrus.vat.getByCode( curAct.vat ).description, 10 );
                                dbg( `added vat with code ${curAct.vat}: ${vatPadxA}` );
                            } else {
                                Y.log( 'padx-api: cannot find vat.json attribute: description;', 'warn' );
                                Y.log( `padx-api: function call was Y.doccirrus.vat.getByCode(${curAct.vat}) which returned:\n${util.inspect( Y.doccirrus.vat.getByCode( curAct.vat ) )}`, 'warn' );
                                throw Y.doccirrus.errors.rest( 17002 );
                            }
                        } else {
                            dbg( "no vat this time." );
                        }

                        if( !expenseCode && !isFee ) {
                            dbg( `doing treatment ${m + 1}/${curTreat.length} with id ${curAct._id}` );

                            if( isGoaeWegegeld || isGoaeReisekosten ) {
                                nutzdatenXML += `${ind( 5 )}<entschaedigung go="${padXJson.catalogMap[curAct.catalogShort]}" positionsnr="${positionNr}">`;
                            } else {
                                nutzdatenXML += `${ind( 5 )}<goziffer go="${padXJson.catalogMap[curAct.catalogShort]}" ziffer="${treatCode}" positionsnr="${positionNr}">`;
                            }
                            // if( curAct.employeeId ) {
                            //     nutzdatenXML += ind( 6 ) + "<leistungserbringerid>" + getProvId( curAct.employeeId, providers ) + "</leistungserbringerid>";
                            // }
                            //
                            // dbg( "providers available: " + util.inspect( providers ) );
                            nutzdatenXML += `${ind( 6 )}<datum>${datum}</datum>`;
                            nutzdatenXML += timeStr ? `${ind( 6 )}<uhrzeit>${timeStr}</uhrzeit>` : '';
                            nutzdatenXML += `${ind( 6 )}<anzahl>1</anzahl>`;
                            nutzdatenXML += `${ind( 6 )}<text>${escapeXML( text ) || treatCode}</text>`;

                            if( curAct.fk5015 && curAct.fk5015.length > 0 ) {//organ
                                nutzdatenXML += `${ind( 6 )}<zusatztext>Organ: ${escapeXML( curAct.fk5015 )}</zusatztext>`;
                            }

                            if( isGoaeWegegeld ) {
                                let
                                    timeOfDay = curAct.code.endsWith( 'N' ) ? 'N' : 'T';

                                nutzdatenXML += `${ind( 6 )}<wegegeld tageszeit="${timeOfDay}">`;
                                nutzdatenXML += radiusInKm ? `${ind( 7 )}<radius>${radiusInKm}</radius>` : '';
                                nutzdatenXML += `${ind( 6 )}</wegegeld>`;

                            } else if( isGoaeReisekosten ) {
                                let
                                    absentTime = /Abwesenheit bis zu 8 Std/ig.test( curAct.comment ) ? 0 : 1;

                                nutzdatenXML += `${ind( 6 )}<reisekosten abwesenheit="${absentTime}">`;
                                nutzdatenXML += radiusInKm ? `${ind( 7 )}<wegstrecke>${radiusInKm}</wegstrecke>` : '';
                                nutzdatenXML += `${ind( 6 )}</reisekosten>`;
                            } else {
                                if( !curAct.billingFactorValue ) {
                                    nutzdatenXML += `${ind( 6 )}<einzelbetrag>${pfPrice}</einzelbetrag>`;
                                } else {
                                    nutzdatenXML += `${ind( 6 )}<faktor>${postfixZero( curAct.billingFactorValue, 2, 6 )}</faktor>`;
                                }
                                if( curAct.explanations ) {
                                    nutzdatenXML += `${ind( 6 )}<begruendung>${escapeXML( curAct.explanations )}</begruendung>`;
                                }
                                if( vatPadxA ) {
                                    nutzdatenXML += `${ind( 6 )}<mwstsatz>${vatPadxA}</mwstsatz>`;
                                }
                            }

                            actualPrice = Number( curAct.price ) ? Number( curAct.price ).toFixed( 2 ) : actualPrice;

                            nutzdatenXML += `${ind( 6 )}<gesamtbetrag>${actualPrice}</gesamtbetrag>`;

                            nutzdatenXML += (isGoaeWegegeld || isGoaeReisekosten) ? `${ind( 5 )}</entschaedigung>` : `${ind( 5 )}</goziffer>`;
                            dbg( "done with treatment." );
                        } else if( isFee ) {
                            let expense = {
                                positionNr: positionNr,
                                datum: datum,
                                uhrzeit: timeStr,
                                anzahl: 1,
                                text: text,
                                price: Number( curAct.price ).toFixed( 2 )
                            };
                            nutzdatenXML += getFee( expense, 5 );
                        } else {
                            let expense = {
                                positionNr: positionNr,
                                kennzeichen: expenseCode,
                                datum: datum,
                                uhrzeit: timeStr,
                                anzahl: 1,
                                text: text,
                                vat: vatPadxA,
                                price: Number( curAct.price ).toFixed( 2 )
                            };
                            nutzdatenXML += getExpense( expense, 5 );
                        }
                    }
                    nutzdatenXML += `${ind( 4 )}</positionen>`;

                    nutzdatenXML += `${ind( 3 )}</humanmedizin>`;
                    nutzdatenXML += `${ind( 2 )}</abrechnungsfall>`;

                    nutzdatenXML += `${ind( 1 )}</rechnung>`;

                    //} else if ('patient' === invoiceEntry.type) {
                } else {
                    dbg( `unexpected type: ${invoiceEntry.type} (skipping entry)` );
                }
            };

            //pre step
            let [err] = await formatPromiseResult(
                Y.doccirrus.invoiceprocess.forEachInvoiceEntry( {
                    user,
                    invoiceLogId,
                    startTime: new Date(),
                    excludedPatientIds,
                    excludedScheinIds,
                    unknownInsuranceScheinIds,
                    onProgress: function( progress ) {
                        dbg( `---------------progress: ${progress.current}/${progress.total} done` );
                        progress.type = 'generatingPadx';
                        onProgress( progress );
                    },
                    iterator: entry => processSingleEntry( entry, baseConfig.padXJson )
                } )
            );
            if( err ) {
                Y.log( `createXMLs: error iterating invoice entries ${err.stack || err}`, 'error', NAME );
                throw err;
            }
            //post step
            let generalXMLheader = '<?xml version="1.0" encoding="UTF-8"?>';
            let nutzdatenHeader = generalXMLheader;
            let nutzdatenFooter = `${ind( 0 )}</rechnungen>`;

            nutzdatenHeader += `${ind( 0 )}<rechnungen xsi:schemaLocation="${baseConfig.padXJson.xmlSchemaNamespace} ${baseConfig.padXJson.xmlSchemaAdl}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="${baseConfig.padXJson.xmlSchemaNamespace}" anzahl="${counter}">`;
            if( baseConfig.invoiceNotice ) {
                nutzdatenHeader += `${ind( 1 )}<hinweistext>${baseConfig.invoiceNotice}</hinweistext>`;
            }
            nutzdatenHeader += `${ind( 1 )}<nachrichtentyp version="${baseConfig.version}">ADL</nachrichtentyp>`; //ADL is only option here

            //rechnungsersteller
            nutzdatenHeader += `${ind( 1 )}<rechnungsersteller>`;
            nutzdatenHeader += `${ind( 2 )}<name>${baseConfig.senderName}</name>`;
            if( baseConfig.senderNameAdd ) {
                for( let i = 0; i < baseConfig.senderNameAdd.length; i++ ) {
                    nutzdatenHeader += `${ind( 2 )}<namezusatz>${baseConfig.senderNameAdd[i].name}</namezusatz>`;
                }
            }
            nutzdatenHeader += `${ind( 2 )}<kundennr>${baseConfig.senderCustomerNo}</kundennr>`;
            nutzdatenHeader += createAddressBlock( {addresses: [baseConfig]}, 2 );
            if( baseConfig.senderIKNR ) {
                nutzdatenHeader += `${ind( 2 )}<iknr>${baseConfig.senderIKNR}</iknr>`;
            }
            if( baseConfig.contacts ) {
                for( let j = 0; j < baseConfig.contacts.length; j++ ) {
                    if( baseConfig.padXJson.contacttypeMap[baseConfig.contacts[j].type] ) {
                        nutzdatenHeader += `${ind( 2 )}<kontakt art="${baseConfig.padXJson.contactkindMap[baseConfig.contacts[j].type]}" typ="${baseConfig.padXJson.contacttypeMap[baseConfig.contacts[j].type]}">${baseConfig.contacts[j].value}</kontakt>`;
                    }
                }
            }
            if( baseConfig.senderUstidnr ) {
                nutzdatenHeader += `${ind( 2 )}<ustidnr>${baseConfig.senderUstidnr}</ustidnr>`;
            }
            if( baseConfig.senderCreditorId ) {
                nutzdatenHeader += `${ind( 2 )}<glaeubigerid>${baseConfig.senderCreditorId}</glaeubigerid>`;
            }

            nutzdatenHeader += `${ind( 1 )}</rechnungsersteller>`;

            //leistungserbringer
            let employees;
            [err, employees] = await formatPromiseResult(
                Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'employee',
                    action: "get",
                    query: {_id: {$in: providers}}
                } )
            );
            if( err ) {
                Y.log( `createXMLs: error getting employees ${providers} : ${err.stack || err}`, 'error', NAME );
                throw err;
            }

            dbg( `provider IDs:\n${providers}` );
            dbg( `employees matching provider IDs:\n${util.inspect( employees )}` );
            dbg( "sorting providers..." ); // *not an actual sorting algorithm
            for( let i = 0; i < employees.length; i++ ) {
                for( let j = 0; j < providers.length; j++ ) {
                    if( providers[j] === employees[i]._id.toString() ) {
                        dbg( `provider match found: ${providers[j]}` );
                        providers[j] = employees[i];
                    }
                }
            }
            dbg( `new providers, all sorted:${util.inspect( providers )}` );
            for( let k = 0; k < providers.length; k++ ) {
                let curProv = providers[k];

                //  prevent silent, mysterious error if employee is missing or does not have address
                if( 'string' === typeof curProv ) {
                    throw(Y.doccirrus.errors.rest( 500, `Could not load employee: ${curProv}`, true ));
                }
                if( !curProv.addresses ) {
                    throw(Y.doccirrus.errors.rest( 500, 'Employee is missing address: ', curProv._id ));
                }

                dbg( `Nutzdaten provider starting provider ${k + 1} of ${providers.length}` );
                nutzdatenHeader += `${ind( 1 )}<leistungserbringer id="${k + 1}" aisid="${curProv._id}">`;
                if( curProv.talk && baseConfig.padXJson.talkMap[curProv.talk] ) {
                    nutzdatenHeader += `${ind( 2 )}<anrede>${baseConfig.padXJson.talkMap[curProv.talk]}</anrede>`;
                }
                if( curProv.title ) {
                    nutzdatenHeader += `${ind( 2 )}<titel>${curProv.title}</titel>`;
                }
                nutzdatenHeader += `${ind( 2 )}<vorname>${curProv.firstname}</vorname>`;
                nutzdatenHeader += `${ind( 2 )}<name>${curProv.lastname}</name>`;
                nutzdatenHeader += `${ind( 2 )}<namezusatz>${curProv.lastname}</namezusatz>`;
                nutzdatenHeader += createAddressBlock( curProv, 2 );
                if( providerLocation ) {
                    nutzdatenHeader += `${ind( 2 )}<betriebsstaette>`;
                    nutzdatenHeader += `${ind( 3 )}<bsnr>${providerLocation}</bsnr>`;
                    nutzdatenHeader += `${ind( 2 )}</betriebsstaette>`;
                }
                nutzdatenHeader += `${ind( 1 )}</leistungserbringer>`;
            }

            nutzdatenXML = nutzdatenHeader + nutzdatenXML + nutzdatenFooter;
            let nutzdatenBytes;
            try {
                nutzdatenBytes = xmlToIso15Bytes( nutzdatenXML );
            } catch( e ) {
                Y.log( `createXMLs: Error converting to ISO-8859-1 ${err.stack || err}`, 'warn', NAME );
                nutzdatenBytes = nutzdatenXML;
            }
            baseConfig.attachments[0].bytes = nutzdatenBytes;

            //Auftrag

            dbg( "starting new Auftragsdaten set..." );
            //auftragsXML

            auftragsXML += generalXMLheader;
            auftragsXML += `${ind( 0 )}<auftrag xsi:schemaLocation="${baseConfig.padXJson.xmlSchemaNamespace} ${baseConfig.padXJson.xmlSchemaAuf}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="${baseConfig.padXJson.xmlSchemaNamespace}" erstellungsdatum="${baseConfig.creationDateLong}" transfernr="${baseConfig.transferNo}" echtdaten="${"PRE" === baseConfig.messageType ? "0" : "1"}" dateianzahl="${baseConfig.attachments.length}">`;

            dbg( "Auftrag: creating recipient..." );
            auftragsXML += `${ind( 1 )}<empfaenger>`;
            let logRecipientAttr = "";
            let phyRecipientAttr = "";
            let recipientPhysicalName = "";

            if( baseConfig.recipientCustomerNo ) {
                logRecipientAttr += ` kundennr="${baseConfig.recipientCustomerNo}"`;
            }
            if( baseConfig.recipientIKNR ) {
                logRecipientAttr += ` iknr="${baseConfig.recipientIKNR}"`;
            }
            if( baseConfig.recipientRZID ) {
                if( baseConfig.padXJson.validRZIDs.indexOf( baseConfig.recipientRZID.toString() ) > -1 ) {
                    logRecipientAttr += ` rzid="${baseConfig.recipientRZID}"`;
                } else {
                    throw Y.doccirrus.errors.rest( 17006 );
                }
            }

            if( baseConfig.proxyRecipientName ) {
                if( baseConfig.proxyRecipientCustomerNo ) {
                    phyRecipientAttr += ` kundennr="${baseConfig.proxyRecipientCustomerNo}"`;
                }
                if( baseConfig.proxyRecipientIKNR ) {
                    phyRecipientAttr += ` iknr="${baseConfig.proxyRecipientIKNR}"`;
                }
                if( baseConfig.proxyRecipientRZID ) {
                    if( baseConfig.padXJson.validRZIDs.indexOf( baseConfig.proxyRecipientRZID.toString() ) > -1 ) {
                        phyRecipientAttr += ` rzid="${baseConfig.proxyRecipientRZID}"`;
                    } else {
                        throw Y.doccirrus.errors.rest( 17007 );
                    }
                }
            } else {
                phyRecipientAttr = logRecipientAttr;
                recipientPhysicalName = baseConfig.recipientName;
            }

            auftragsXML += `${ind( 2 )}<logisch${logRecipientAttr}>${baseConfig.recipientName}</logisch>`;
            auftragsXML += `${ind( 2 )}<physikalisch${phyRecipientAttr}>${recipientPhysicalName}</physikalisch>`;
            auftragsXML += `${ind( 1 )}</empfaenger>`;

            dbg( "Auftrag: creating sender..." );
            auftragsXML += `${ind( 1 )}<absender>`;
            let logSenderAttr = "";
            if( baseConfig.senderCustomerNo ) {
                logSenderAttr += ` kundennr="${baseConfig.senderCustomerNo}"`;
            }
            if( baseConfig.senderIKNR ) {
                logSenderAttr += ` iknr="${baseConfig.senderIKNR}"`;
            }
            if( baseConfig.senderRZID ) {
                if( baseConfig.padXJson.validRZIDs.indexOf( baseConfig.senderRZID.toString() ) > -1 ) {
                    logSenderAttr += ` rzid="${baseConfig.senderRZID}"`;
                } else {
                    throw Y.doccirrus.errors.rest( 17008 );
                }
            }
            auftragsXML += `${ind( 2 )}<logisch${logSenderAttr}>${baseConfig.senderName}</logisch>`;
            auftragsXML += `${ind( 2 )}<physikalisch${logSenderAttr}>${baseConfig.senderName}</physikalisch>`;
            auftragsXML += `${ind( 1 )}</absender>`;

            dbg( "Auftrag: creating system/message meta data..." );
            auftragsXML += `${ind( 1 )}<nachrichtentyp version="${baseConfig.version}">${baseConfig.messageType}</nachrichtentyp>`;
            auftragsXML += `${ind( 1 )}<system>`;
            auftragsXML += `${ind( 2 )}<produkt>${Y.config.insuite.description}</produkt>`;
            auftragsXML += `${ind( 2 )}<version>${Y.config.insuite.version}</version>`;
            auftragsXML += `${ind( 2 )}<hersteller>${Y.config.insuite.author.name}</hersteller>`;
            auftragsXML += `${ind( 1 )}</system>`;
            let encryptionAttr = "";
            if( baseConfig.encryption ) {
                loadJava();
                encryptionAttr = ` verfahren="1" idcert="${pkcs7_api.getSerialNoSync( baseConfig.publicKey )}"`;
            } else {
                encryptionAttr = ' verfahren="0" idcert="0"';
            }
            auftragsXML += `${ind( 1 )}<verschluesselung${encryptionAttr}/>`;

            if( baseConfig.receiptAddress ) {
                auftragsXML += `${ind( 1 )}<empfangsquittung email="${baseConfig.receiptAddress}">1</empfangsquittung>`;
            } else {
                auftragsXML += `${ind( 1 )}<empfangsquittung>0</empfangsquittung>`;
            }

            dbg( "Auftrag: creating attachment meta data..." );
            for( let l = 0; l < baseConfig.attachments.length; l++ ) {
                auftragsXML += `${ind( 1 )}<datei id="${baseConfig.attachments[l].meta.id}" erstellungsdatum="${baseConfig.attachments[l].meta.dateOfCreation}">`;
                let docTypeAttr = "";
                if( baseConfig.attachments[l].format ) {
                    docTypeAttr = `format="${baseConfig.attachments[l].format}"`;
                }
                auftragsXML += `${ind( 2 )}<dokumententyp${docTypeAttr}>${baseConfig.attachments[l].docType}</dokumententyp>`;
                auftragsXML += `${ind( 2 )}<name>${baseConfig.attachments[l].name}</name>`;
                if( baseConfig.attachments[l].desc ) {
                    auftragsXML += `${ind( 2 )}<beschreibung>${baseConfig.attachments[l].desc}</beschreibung>`;
                }
                dbg( `nutz len 2: ${baseConfig.attachments[l].bytes.length}` );

                let checksum = crypto.createHash( "sha1" );
                checksum.update( baseConfig.attachments[l].bytes );
                auftragsXML += `${ind( 2 )}<dateilaenge laenge="${baseConfig.attachments[l].bytes.length}" pruefsumme="${checksum.digest( "hex" )}"/>`;
                auftragsXML += `${ind( 1 )}</datei>`;
            }

            auftragsXML += `${ind( 0 )}</auftrag>`;
            return {nutzdatenXML, auftragsXML};
        }

        //process is:
        // -> get basic practice info from DB
        // -> create basic filenames for zip/padx files
        // -> create Nutzdatendatei
        // -> create Auftragsdatei
        // -> export/send

        /**
         *  Generates padX file into the tmp directory
         *
         *  Non-REST method
         *
         *  @method generatePadX
         *  @param  args                    {Object}    REST v1
         *  @param  args.user               {Object}    REST user or equivalent
         *  @param  args.transferNo         {Number}    Message number as defined in PAD neXt format
         *  @param  args.invoicelogId       {String}    Database _id of a pvslog object
         *  @param  args.onProgress         {Function}  Used to update progress bar in the client?
         *  @param  args.scheine            {Array}     -- not used?
         *  @param  args.callback           {Function}  Of the form fn( err, { fileName, outBuffer } )
         */

        async function generatePadX( args ) {
            Y.log( 'Entering Y.doccirrus.api.padx.generatePadX', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.padx.generatePadX' );
            }
            dbg( `starting padx file generation with args:\n${util.inspect( args )}` );
            dbg( "loading libs..." );

            Y.log( `Loading padx.json: ${process.cwd()}/padx.json`, 'debug', NAME );

            let jc = require( `${process.cwd()}/padx.json` );

            const getConfigP = promisifyArgsCallback( getConfig );

            //getActivities(user, date);

            //get practice data

            let [err, padxSettings] = await formatPromiseResult(
                getConfigP( {
                    user: args.user,
                    padnextSettingId: args.padnextSettingId
                } )
            );
            if( err ) {
                Y.log( `generatePadX: failed to get padx config: ${err.stack || err}`, 'error', NAME );
                return args.callback( err );
            }
            dbg( `settings get: ${util.inspect( padxSettings )}` );

            dbg( `transferNo?: ${args.transferNo}` );
            padxSettings.transferNo = lz( args.transferNo, 6 );

            padxSettings.padXJson = jc;

            if( args.messageType ) {
                jc.messageType = args.messageType;
            }

            if( !padxSettings.recipientRZID ) {
                //undefined recipientRZID, skip obtaining certificate
                padxSettings.encryption = false;
                return setBaseDataStep( padxSettings );
            }

            http.get( jc.certSourcePath + padxSettings.recipientRZID, function( res ) {
                let body = '';
                res.on( 'data', function( chunk ) {
                    body += chunk;
                } );
                res.on( 'end', function() {
                    dbg( `got body:\n${body}` );
                    padxSettings.publicKey = body;
                    padxSettings.publicKeyResCode = res.statusCode;
                    if( res.statusCode >= 300 ) {
                        padxSettings.encryption = false;
                        return setBaseDataStep( padxSettings );
                    }
                    return setBaseDataStep( padxSettings );
                } );
            } ).on( 'error', function( e ) {
                dbg( `Got error: ${e.message}` );
                padxSettings.encryption = false;
                return setBaseDataStep( padxSettings );
            } );

            //----------------------------------------------------------------------------------------file and data prep
            /**
             * @method setBaseDataStep
             * @param {Object} baseConfig complex config object used throughout the process
             *
             * @returns {Function} callback
             */
            function setBaseDataStep( baseConfig ) {
                dbg( "setBaseDataStep" );

                //hard values
                baseConfig.version = baseConfig.padXJson.specVersion; //spec version (remember to update xml namespace files as well if you change this) //hardcoded
                baseConfig.messageType = baseConfig.padXJson.messageType; //can only be "ADL:Arzt–Datenlieferung" or "QADL:Quittung Arzt-Datenlieferung" //hardcoded
                baseConfig.exportPath = `${Y.doccirrus.auth.getTmpDir()}/${baseConfig.padXJson.tempSubdir}/`;
                try {
                    fs.mkdirSync( baseConfig.exportPath );
                } catch( err ) {
                    dbg( `error (EEXIST is ok): ${err}` );
                }

                if( Y.config.insuite.pkv && Y.config.insuite.pkv.padnextCertNumber ) {
                    baseConfig.certNo = Y.config.insuite.pkv.padnextCertNumber;
                } else {
                    Y.log( 'padx-api: cannot find insuite config attribute: pkv.padnextCertNumber.', 'warn' );
                    if( Y.config.insuite.pkv ) {
                        Y.log( `padx-api: pkv obj is: ${util.inspect( Y.config.insuite.pkv )}`, 'warn' );
                    } else {
                        Y.log( 'padx-api: missing Y.config.insuite.pkv', 'warn' );
                    }
                    args.callback( Y.doccirrus.errors.rest( 17005 ) );
                    return;
                }

                //variable values
                baseConfig.creationDate = moment().format( "YYYYMMDD" );
                baseConfig.creationDateLong = `${moment().format( "YYYY-MM-DDTHH:mm:ss" )}Z`;

                dbg( `senderCustomerNo: ${baseConfig.senderCustomerNo}` );

                baseConfig.baseFileName = `${lz( baseConfig.senderCustomerNo, 8 )}_${baseConfig.creationDate}_${baseConfig.messageType}_${baseConfig.transferNo}`;

                baseConfig.attachments = [//won't be implemented further for now, apparently
                    {
                        meta: {
                            id: "0000",
                            dateOfCreation: baseConfig.creationDateLong
                        },
                        docType: "PADneXt",
                        //format: "",
                        name: `${baseConfig.baseFileName}_padx.xml`,
                        desc: "Nutzdatendatei",
                        bytes: []
                    }
                ];

                dbg( `generated base filename: ${baseConfig.baseFileName}` );

                if( baseConfig.recipientName ) {
                    dbg( "ready to start actual creation process!" );
                    createZip( baseConfig );
                } else {
                    Y.log( 'padx-api: cannot create padx file without recipient', 'warn', NAME );
                    return args.callback( Y.doccirrus.errors.rest( 17000 ) );
                }
            }

            //----------------------------------------------------------------------------------------------zip building
            /**
             * @method createZip
             * @param {Object} baseConfig complex config object used throughout the process
             */
            async function createZip( baseConfig ) {
                dbg( "createzip" );
                const {user, invoiceLogId, excludedPatientIds, excludedScheinIds, unknownInsuranceScheinIds, onProgress, callback} = args;

                let [err, result] = await formatPromiseResult( createXMLs( baseConfig, {
                    user,
                    invoiceLogId,
                    excludedPatientIds,
                    excludedScheinIds,
                    unknownInsuranceScheinIds,
                    onProgress,
                    callback
                } ) );
                if( err ) {
                    Y.log( err.stack, 'info', NAME );
                    return args.callback( err );
                }
                let {auftragsXML} = result;

                let nutzdatenBytes = baseConfig.attachments[0].bytes;
                //if (debug) {
                //copy
                fs.writeFile( `${baseConfig.exportPath + baseConfig.baseFileName}_padx.xml`, nutzdatenBytes, function( err ) {
                    if( err ) {
                        dbg( `error writing to file: ${err}` );
                    } else {
                        dbg( `file export successful: ${baseConfig.exportPath}${baseConfig.baseFileName}_auf.xml` );
                    }
                } );
                //}

                //Auftrag
                let auftragsBytes = xmlToIso15Bytes( auftragsXML );
                //if (debug) {
                //copy
                fs.writeFile( `${baseConfig.exportPath + baseConfig.baseFileName}_auf.xml`, auftragsBytes, function( err ) {
                    if( err ) {
                        dbg( `error writing to file: ${err}` );
                    } else {
                        dbg( `file export successful: ${baseConfig.exportPath}${baseConfig.baseFileName}_auf.xml` );
                    }
                } );
                //}

                //file creation done, export
                // dbg("-------------------------------------------------auftragsXML:\n\n"+auftragsXML+"\n\n");
                // dbg("-------------------------------------------------nutzdatenXML:\n\n"+nutzdatenXML+"\n\n");

                let zip = new Y.doccirrus.utils.requireUncached( 'jszip' )();
                let zipSettings = {
                    type: "uint8array",
                    compression: "DEFLATE",
                    compressionOptions: {
                        level: 5
                    }
                };

                //encrypt
                try {
                    if( baseConfig.encryption ) {
                        loadJava();

                        dbg( "encrypting..." );
                        let nutzZip = new Y.doccirrus.utils.requireUncached( 'jszip' )();

                        nutzZip.file( `${baseConfig.baseFileName}_padx.xml`, nutzdatenBytes );
                        let zipBytes_ori = nutzZip.generate( zipSettings );
                        let zipBytes = [];
                        dbg( `nutz source length: ${zipBytes_ori.length} bytes` );
                        for( let ei = 0; ei < zipBytes_ori.length; ei++ ) {
                            zipBytes.push( zipBytes_ori[ei] );
                        }

                        dbg( `call result: ${baseConfig.publicKeyResCode}` );
                        dbg( `RZID: ${baseConfig.recipientRZID}: ${baseConfig.publicKey}` );

                        let resultBytes = new Buffer( pkcs7_api.encryptSync( java.newArray( 'byte', zipBytes ), baseConfig.publicKey, debug ) );
                        dbg( `encryption done; got ${resultBytes.length} bytes` );

                        zip.file( `${baseConfig.baseFileName}_dat_padx.zip.p7m`, resultBytes );

                        dbg( "done with encryption." );

                    } else {
                        dbg( "continuing without encryption" );

                        let nutzZip = new Y.doccirrus.utils.requireUncached( 'jszip' )();

                        nutzZip.file( `${baseConfig.baseFileName}_padx.xml`, nutzdatenBytes );
                        let zipBytes_ori = nutzZip.generate( zipSettings );

                        zip.file( `${baseConfig.baseFileName}_dat_padx.zip`, zipBytes_ori );
                    }
                } catch( e ) {
                    Y.log( `padx-api: error in creating Nutzdaten file: ${e}`, "warn" );
                    return callback( Y.doccirrus.errors.rest( 17003 ) );
                }

                try {
                    zip.file( `${baseConfig.baseFileName}_auf.xml`, auftragsBytes );
                } catch( e ) {
                    Y.log( `padx-api: error in creating Auftragsdaten file: ${e}`, "warn" );
                    return callback( Y.doccirrus.errors.rest( 17004 ) );
                }

                let content = zip.generate( zipSettings );
                let outBuffer = new Buffer( content );
                dbg( `resulting zip file size: ${outBuffer.length}bytes` );

                //if (debug) {
                dbg( "storing extra copy of zip..." );
                let zipFileName = `${baseConfig.exportPath + baseConfig.baseFileName}_padx.zip`;
                fs.writeFile( zipFileName, new Buffer( content ), function( err ) {
                    if( err ) {
                        dbg( `error writing to file: ${err}` );
                    } else {
                        dbg( `file export successful: ${baseConfig.tmp}/${baseConfig.baseFileName}_padx.zip` );
                    }
                } );
                //}

                dbg( "done, not sending to PADline." );
                args.callback( null, {fileName: `${baseConfig.baseFileName}_padx.zip`, data: outBuffer, baseConfig} );
            }
        }

        function getSpecVersion( args ) {
            Y.log( 'Entering Y.doccirrus.api.padx.getSpecVersion', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.padx.getSpecVersion' );
            }
            let jc = require( `${process.cwd()}/padx.json` );

            args.callback( null, jc && jc.specVersion );
        }

        /**
         * fetches invoice configuration
         * @method getConfig
         * @param {Object} args
         * @param {Object} args.user
         * @param {Function} args.callback
         */
        function getConfig( args ) {
            Y.log( 'Entering Y.doccirrus.api.padx.getConfig', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.padx.getConfig' );
            }
            const
                DCError = Y.doccirrus.commonerrors.DCError;
            dbg( `getConfig, args:${util.inspect( args )}` );
            if( !args.padnextSettingId ) {
                args.callback( new DCError( 3021 ) );
                return;
            }
            Y.doccirrus.mongodb.runDb( {
                    user: args.user,
                    model: "invoiceconfiguration",
                    action: "get",
                    query: {},
                    options: {
                        lean: true
                    }
                },
                function( err, invoiceconfiguration ) {
                    dbg( "gettings settigns in invoiceconfiguration..." );
                    if( err ) {
                        args.callback( new DCError( 17001 ) );
                        return;
                    }

                    const
                        padxSettings = invoiceconfiguration && invoiceconfiguration[0] && invoiceconfiguration[0].padxSettings;

                    let padxSetting;

                    if( Array.isArray( padxSettings ) ) {
                        padxSetting = padxSettings.find( _padxSetting => _padxSetting._id.toString() === args.padnextSettingId );
                    }

                    if( !padxSetting ) {
                        args.callback( new DCError( 3022 ) );
                        return;
                    }

                    args.callback( null, padxSetting );
                }
            );
        }

        /**
         * sends padX file to PadLine
         * @method sendFileToPadline
         * @param {Object} args arguments
         * @param {Object} args.user user user for fetching config
         * @param {String} args.fileName file name of file to be sent
         * @param {Buffer} args.fileBytes file bytes of file to be sent
         * @param {Buffer} args.noHttps flag for trying to establish a connection via http instead of https
         * @param {Object} args.baseConfig padx config from db
         * @param {Object} args.baseConfig.oneClickName doctor's account name on PADline's server
         * @param {Object} args.baseConfig.oneClickPass doctor's account name on PADline's server
         * @param {Function} args.callback
         */
        function sendFileToPadline( args ) {
            Y.log( 'Entering Y.doccirrus.api.padx.sendFileToPadline', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.padx.sendFileToPadline' );
            }
            dbg( "sendFileToPadline: checking if config is present..." );

            if( !args.fileName || !args.fileBytes ) {
                args.callback( Y.doccirrus.errors.rest( 17010 ) );
                return;
            }

            sendFileCB( null, args.baseConfig );

            function sendFileCB( err, baseConfig ) {
                if( !err ) {
                    dbg( "sendFileToPadline: creating http POST request..." );

                    //dbg("padxSettings:" + util.inspect(baseConfig));
                    //dbg("args: " + util.inspect(args));

                    //let httpUsed = args.noHttps?require('https'):require('http');
                    //let httpUsed = require('https');

                    if( !baseConfig.oneClickServer || !baseConfig.oneClickName || !baseConfig.oneClickPass ) {
                        args.callback( Y.doccirrus.errors.rest( 17009 ) );
                        return;
                    }

                    let multipartData = {
                        file: {
                            buffer: args.fileBytes,
                            filename: args.fileName,
                            content_type: "multipart/form-data; charset=UTF8"
                        }
                    };

                    let needle = require( 'needle' );

                    needle.post( `https://${baseConfig.oneClickServer}/rest/v1/upload/file`, multipartData, {
                        multipart: true,
                        username: baseConfig.oneClickName,
                        password: baseConfig.oneClickPass
                    }, function( err, res ) {
                        if( err ) {
                            return Y.log( `upload failed:${err}`, "warn", NAME );
                        }
                        dbg( `sendFileToPadline: statusCode: ${res.statusCode}` );
                        dbg( `sendFileToPadline: res:${util.inspect( res )}` );
                    } );

                    return args.callback( null, true );
                } else {
                    return args.callback( err );
                }
            }
        }

        /**
         * function for flexible indentation
         * @method ind
         * @param {Number} level depth of indentation
         * @return {String}
         */
        function ind( level ) {
            let ret = "";
            if( xmlIndentation.length > 0 ) {
                ret += "\r\n";
                for( let i = 0; i < level; i++ ) {
                    ret += xmlIndentation;
                }
            }
            return ret;
        }

        /**
         *  MOJ-6488: Allow a PAD neXt v2.11 file to be created after validation but before being sent to the billing
         *  service.
         *
         *  This PAD file is for validation on remote systems, so that corrections can be made before submission.
         *
         *  Once approved and sent, the PADX file is finalized and should never change.
         *
         *  Initially, this will use an invalid message type ID for the provisional file, to distinguish it from
         *  valid files which may be sent.
         *
         *  This is a REST method, unlike generatePadX
         *
         *  @param  args                            {Object}    REST v1
         *  @param  args.user                       {Object}    REST user or equivalent
         *  @param  args.originalParams             {Object}
         *  @param  args.originalParams.pvslogId    {String}    Database _id of a pvslog
         *  @param  args.callback                   {Function}  Of the form fn( err, gridFsFileName )
         */

        function generateProvisionalPadXFile( args ) {
            Y.log( 'Entering Y.doccirrus.api.padx.generateProvisionalPadXFile', 'info', NAME );
            if( args.callback ) {
                args.callback = require( `${process.cwd()}/server/utils/logWrapping.js` )( Y, NAME )
                    .wrapAndLogExitAsync( args.callback, 'Exiting Y.doccirrus.api.padx.generateProvisionalPadXFile' );
            }
            let
                params = args.originalParams,
                pvslogId = params.pvslog._id.toString() || '',
                padXFile = '',
                padXBuffer = null,
                padXFileId = null;

            async.series(
                [
                    checkArguments,
                    generatePadFiles,
                    saveToGridFS,
                    updatePvsLog
                ],
                onAllDone
            );

            //  1. Sanity check this situation
            function checkArguments( itcb ) {
                if( !pvslogId || '' === pvslogId ) {
                    return itcb( Y.doccirrus.errors.rest( 404, 'PVS log not given.', true ) );
                }
                //  TODO: more checks
                itcb( null );
            }

            //  2. Make a single PadX file
            function generatePadFiles( itcb ) {

                function onPadXCreated( err, result ) {
                    // spurious put err occurs here
                    if( err ) {
                        Y.log( `Could not generate PadX file: ${JSON.stringify( err )}`, 'warn', NAME );
                        return itcb( err );
                    }

                    Y.log( `Generated provisional PAD neXt v2.11 file on disk: ${result.fileName}`, 'debug', NAME );
                    padXFile = result.fileName;
                    padXBuffer = result.data;

                    itcb( null );
                }

                function onPadXProgress( progress ) {
                    Y.log( `PadX generation progress: ${JSON.stringify( progress )}`, 'debug', NAME );
                }

                Y.log( `Generating provisional PAD neXt file for pvslog: ${pvslogId}`, 'debug', NAME );

                generatePadX( {
                    'user': args.user,
                    'transferNo': 0,
                    'invoiceLogId': pvslogId,
                    padnextSettingId: params.pvslog.padnextSettingId,
                    excludedPatientIds: params.pvslog.excludedPatientIds,
                    excludedScheinIds: params.pvslog.excludedScheinIds,
                    unknownInsuranceScheinIds: params.pvslog.unknownInsuranceScheinIds,
                    'onProgress': onPadXProgress,
                    'messageType': 'PRE',
                    'callback': onPadXCreated
                } );
            }

            //  3. Save file to GridFS (DO API, not media API)
            function saveToGridFS( itcb ) {
                function onGridFsStore( err, gridFsFileId ) {
                    if( err ) {
                        Y.log( `Could not store file in GridFS: ${JSON.stringify( err )}`, 'warn', NAME );
                        return itcb( err );
                    }
                    Y.log( `PAD neXt file stored with _id: ${gridFsFileId}`, 'debug', NAME );
                    padXFileId = gridFsFileId;
                    itcb( null );
                }

                Y.log( `Storing PAD neXt file in GridFS: ${padXFile}`, 'debug', NAME );
                Y.doccirrus.gridfs.store( args.user, padXFile, {}, padXBuffer, onGridFsStore );
            }

            //  4. Update pvslog object with GridFS file _id
            function updatePvsLog( itcb ) {

                Y.log( `Updating pvslog with link to provisional PAD neXt file: ${pvslogId}`, 'debug', NAME );

                Y.doccirrus.mongodb.runDb( {
                    'user': args.user,
                    'model': 'pvslog',
                    'action': 'put',
                    'fields': ['padnextFileId'],
                    'data': {
                        'padnextFileId': padXFileId,
                        'skipcheck_': true              //  known safe value
                    },
                    'query': {'_id': pvslogId},
                    'callback': onUpdatePVSLog
                } );

                function onUpdatePVSLog( err ) {
                    if( err ) {
                        Y.log( `Could not update PVS log with PAD neXt file id: ${JSON.stringify( err )}`, 'warn', NAME );
                        return itcb( err );
                    }
                    itcb( null );
                }
            }

            //  Finally, call back to client
            function onAllDone( err ) {
                if( err ) {
                    Y.log( `Could not generate provisional PAD neXt file: ${JSON.stringify( err )}`, 'debug', NAME );
                    return args.callback( err );
                }

                Y.log( `Returning PAD file to client: ${JSON.stringify( padXFile )}`, 'debug', NAME );
                args.callback( null, padXFile );
            }

        }

        /**
         * @class doccirrus.api.padx
         */
        /**
         * @property padx
         * @for doccirrus.api
         * @type doccirrus.api.padx
         */
        Y.namespace( 'doccirrus.api' ).padx = {

            name: NAME,
            generatePadX,
            getConfig,
            sendFileToPadline,
            generateProvisionalPadXFile,
            getSpecVersion,
            // --------- For mocha test ---------
            createXMLs
        };

    },
    '0.0.1', {
        requires: [
            'dcerrortable'
        ]
    }
);
