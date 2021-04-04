/**
 * User: do
 * Date: 15/12/16  16:30
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, _, jQuery, moment */

'use strict';

YUI.add( 'kbvutility-search-modal', function( Y, NAME ) {

        var defaultCombination = {
            vorrangiges_heilmittel_liste: 0,
            optionales_heilmittel_liste: 0,
            ergaenzendes_heilmittel_liste: 0,
            standardisierte_heilmittel_liste: 0
        };

        function makeCombinations( combinations ) {
            return combinations.map( function( c ) {
                return Object.assign( {}, defaultCombination, c );
            } );
        }

        var
            isPodoIndication = Y.doccirrus.kbvutilitycatalogcommonutils.isPodoIndication,
            isETIndication = Y.doccirrus.kbvutilitycatalogcommonutils.isETIndication,
            i18n = Y.doccirrus.i18n,
            TIMESTAMP_FORMAT = [i18n( 'general.TIMESTAMP_FORMAT' )],
            PLEASE_CHOOSE_ICD10 = [i18n( 'InCaseMojit.kbvutility-search-modalJS.PLEASE_CHOOSE_ICD10' )],
            PLEASE_CHOOSE_ANOTHER_ICD10 = [i18n( 'InCaseMojit.kbvutility-search-modalJS.PLEASE_CHOOSE_ANOTHER_ICD10' )],
            PLEASE_CHOOSE_SECOND_ICD10 = [i18n( 'InCaseMojit.kbvutility-search-modalJS.PLEASE_CHOOSE_SECOND_ICD10' )],
            PLEASE_CHOOSE_ANOTHER_SECOND_ICD10 = [i18n( 'InCaseMojit.kbvutility-search-modalJS.PLEASE_CHOOSE_ANOTHER_SECOND_ICD10' )],
            ICD10_MATCHES_AGREEMENT = [i18n( 'InCaseMojit.kbvutility-search-modalJS.ICD10_MATCHES_AGREEMENT' )],
            KBVUTILITY_UTPRESCRIPTIONTYPE_ERR = [i18n( 'InCaseMojit.kbvutility-search-modalJS.KBVUTILITY_UTPRESCRIPTIONTYPE_ERR' )],
            PHYSIO_COMBINATIONS = i18n( 'InCaseMojit.kbvutility-search-modalJS.PHYSIO_COMBINATIONS' ),
            LOGO_COMBINATIONS = i18n( 'InCaseMojit.kbvutility-search-modalJS.LOGO_COMBINATIONS' ),
            ERGO_COMBINATIONS = i18n( 'InCaseMojit.kbvutility-search-modalJS.ERGO_COMBINATIONS' ),
            ET_COMBINATIONS = i18n( 'InCaseMojit.kbvutility-search-modalJS.ET_COMBINATIONS' ),
            ICD2_SELECTED_INFO = i18n( 'InCaseMojit.kbvutility-search-modalJS.ICD2_SELECTED_INFO' ),
            // unwrap = ko.unwrap,
            peek = ko.utils.peekObservable,
            getSubTypeByChapter = Y.doccirrus.kbvutilitycatalogcommonutils.getSubTypeByChapter,
            physioCombinations = makeCombinations( [
                {
                    vorrangiges_heilmittel_liste: 1
                },
                {
                    vorrangiges_heilmittel_liste: 1,
                    ergaenzendes_heilmittel_liste: 1
                },
                {
                    vorrangiges_heilmittel_liste: 1,
                    ergaenzendes_heilmittel_liste: 1
                },
                {
                    optionales_heilmittel_liste: 1
                },
                {
                    ergaenzendes_heilmittel_liste: 1,
                    optionales_heilmittel_liste: 1
                },
                {
                    standardisierte_heilmittel_liste: 1
                }
            ] ),
            ergoCombinations = makeCombinations( [
                {
                    vorrangiges_heilmittel_liste: [1, 3]

                },
                {
                    vorrangiges_heilmittel_liste: [1, 3],
                    ergaenzendes_heilmittel_liste: 1
                },
                {
                    optionales_heilmittel_liste: 1
                },
                {
                    optionales_heilmittel_liste: 1,
                    ergaenzendes_heilmittel_liste: 1
                }
            ] ),
            etCombinations = makeCombinations( [
                {
                    vorrangiges_heilmittel_liste: 1
                }
            ] );

        // catchUnhandled = Y.doccirrus.promise.catchUnhandled;
        //
        // function showError( code ) {
        //     Y.doccirrus.DCWindow.notice( {
        //         type: 'error',
        //         message: Y.doccirrus.errorTable.getMessages( {code: code} )
        //     } );
        // }

        function checkUtiltities( utiltities, combinations ) {
            var stats = _.countBy( utiltities, 'type' ),
                combination = makeCombinations( [stats] )[0];

            return combinations.some( function( c ) {
                return Object.keys( c ).every( function( key ) {
                    if( 'number' === typeof c[key] ) {
                        return c[key] === combination[key];
                    } else if( Array.isArray( c[key] ) ) {
                        return c[key][0] <= combination[key] && c[key][1] >= combination[key];

                    }
                } );
            } );
        }

        var
            utilityCombinationCheckers = {
                physio: function( selectedUtilites ) {
                    if( selectedUtilites.length === 1 && selectedUtilites[0].type === 'ergaenzendes_heilmittel_liste' ) {
                        return -1 !== ['Elektrotherapie', 'Elektrostimulation', 'Wärmetherapie mittels Ultraschall'].indexOf( selectedUtilites[0].name );
                    }
                    return checkUtiltities( selectedUtilites, physioCombinations );
                },
                logo: function( selectedUtilites ) {
                    var len = selectedUtilites.length;
                    return 0 < len && 3 >= len;
                },
                ergo: function( selectedUtilites, selectedIndication ) {
                    // from P3-31 "Die Verordnung thermischer Anwendungen als ergänzende Heilmittel im Rahmen der Diagno-segruppen (XML-Element ../ kapitel/unterkapitel/diagnosegruppe/@V) EN1 oder EN2 darf nur dann möglich sein, wenn als vorrangige Heilmittel „sensomotorisch-perzeptive Behandlung“ und/oder „motorisch-funktionelle Behandlung“ verordnet werden. ..."
                    var additionalCheck = true,
                        additionalUts = ['Sensomotorisch-perz. Beh.', 'Sensomotorisch-perz. Beh. + ergoth. Schiene/n', 'Motorisch-funkt. Beh.', 'Motorisch-funkt. Beh. + ergoth. Schiene/n', 'Sensomotorisch-perzeptive Behandlung', 'Sensomotorisch-perzeptive Behandlung  + ergotherapeutische Schiene/n', 'Motorisch-funktionelle Behandlung + ergotherapeutische Schiene/n', 'Motorisch-funktionelle Behandlung'],
                        additionalUtsCount = 0,
                        validCombinations = checkUtiltities( selectedUtilites, ergoCombinations );

                    function checklAdditionalUts( name ) {
                        return additionalUts.some( function( utName ) {
                            return 0 === utName.indexOf( name );
                        } );
                    }

                    if( -1 !== ['EN1', 'EN2'].indexOf( selectedIndication.diagnosegruppe_value ) ) {
                        selectedUtilites.forEach( function( utility ) {
                            if( 'Thermische Anwendungen' === utility.name ) {
                                additionalCheck = false;
                            } else if( checklAdditionalUts( utility.name ) ) {
                                additionalUtsCount++;
                            }
                        } );
                        if( 0 < additionalUtsCount ) {
                            additionalCheck = true;
                        }
                    }
                    return additionalCheck && validCombinations;
                },
                et: function( selectedUtilites ) {
                    return checkUtiltities( selectedUtilites, etCombinations );
                }
            };

        function getCombinationCheckerBySubType( subType ) {
            if( 'string' !== typeof subType ) {
                return null;
            }
            return utilityCombinationCheckers[subType.toLowerCase()];
        }

        function select2Mapper( val ) {
            var disabled = false;

            if( true === val.fromCatalog ) {
                return {id: val.seq, text: val.title || '', _type: 'mapped', _data: val, disabled: disabled};
            } else {
                return {
                    id: val.code,
                    text: val.userContent + ' (' + moment( val.timestamp ).format( TIMESTAMP_FORMAT ) + ')',
                    _type: 'mapped',
                    _data: val,
                    disabled: disabled
                };
            }
        }

        function createUtilityIcdCodeAutoComplete( config ) {
            var
                field = config.field,
                fieldText = config.fieldText,
                fieldRef = config.fieldRef,
                getCatalogCodeSearchParams = config.getCatalogCodeSearchParams;

            return {
                data: ko.computed( {
                    read: function() {
                        var
                            code = field();

                        if( code ) {
                            return {id: code, text: code, _type: 'read'};
                        }
                        else {
                            return null;
                        }
                    },
                    write: function( $event ) {
                        var text = $event.added && $event.added.text,
                            data = $event.added && $event.added._data,
                            isFromCaseFolder = data && data.fromCaseFolders,
                            ref = data && data._id;

                        fieldText( text ? text : null );
                        fieldRef( isFromCaseFolder ? ref : null );
                        field( $event.val );
                    }
                } ),
                select2: {
                    allowClear: true,
                    placeholder: 'Diagnose',
                    dropdownAutoWidth: true,
                    dropdownCssClass: 'dc-select2-createActivityCodeAutoComplete',
                    formatResult: function( result, container, query, escapeMarkup ) {
                        var
                            term = query.term,
                            code = result.id,
                            text = result.text,
                            select2formatCode = [],
                            select2formatText = [];

                        window.Select2.util.markMatch( code, term, select2formatCode, escapeMarkup );
                        select2formatCode = select2formatCode.join( '' );
                        window.Select2.util.markMatch( text, term, select2formatText, escapeMarkup );
                        select2formatText = select2formatText.join( '' );

                        return Y.Lang.sub( [
                            '<div class="dc-select2-createActivityCodeAutoComplete-formatResult" title="{code}">',
                            '<span class="dc-select2-createActivityCodeAutoComplete-formatResult-code">{select2formatCode}</span>',
                            '<span class="dc-select2-createActivityCodeAutoComplete-formatResult-text">({select2formatText})</span>',
                            '</div>'
                        ].join( '' ), {
                            code: Y.Escape.html( code ),
                            select2formatCode: select2formatCode,
                            select2formatText: select2formatText
                        } );
                    },
                    formatSelection: function( query ) {
                        return query.id;
                    },
                    formatResultCssClass: function( result ) {
                        var
                            type = 'textform-homecatalog';

                        if( result._data && true === result._data.fromCatalog ) {
                            type = 'textform-originalcatalog';
                        }

                        return type;
                    },
                    query: function( query ) {
                        config.queryFn( query, getCatalogCodeSearchParams );
                    }
                }
            };
        }

        function byIndicationQueryFn( query, getCatalogCodeSearchParams ) {
            var
                params = getCatalogCodeSearchParams();

            if( params && params.query ) {
                params.query.term = query.term;
                Y.doccirrus.jsonrpc.api.catalog.getIcdsFromDiagnosisGroup( params )
                    .done( function( response ) {
                        var
                            results = response.data;
                        results = results.map( select2Mapper );
                        query.callback( {results: results} );
                    } )
                    .fail( function( err ) {
                        Y.log( 'createUtilityIcdCodeAutoComplete: Catalog code search is failed, error: ' + err, 'debug', NAME );
                        query.callback( {results: []} );
                    } );
            }
            else {
                query.callback( {results: []} );
            }
        }

        function byCatalogQueryFn( query, getCatalogCodeSearchParams ) {
            var
                params = getCatalogCodeSearchParams();

            if( params && params.query ) {
                params.query.term = query.term;
                Y.doccirrus.jsonrpc.api.catalog.searchIcdsInCatalogAndPatient( params )
                    .done( function( response ) {
                        var
                            results = response.data;
                        results = results.map( select2Mapper );
                        query.callback( {results: results} );
                    } )
                    .fail( function( err ) {
                        Y.log( 'createUtilityIcdCodeAutoComplete: Catalog code search is failed, error: ' + err, 'debug', NAME );
                        query.callback( {results: []} );
                    } );
            }
            else {
                query.callback( {results: []} );
            }
        }

        function getTemplate() {
            return Y.doccirrus.jsonrpc.api.jade
                .renderFile( {path: 'InCaseMojit/views/kbvutility_search_modal'} )
                .then( function( response ) {
                    return response.data;
                } );
        }

        function getModel( config, onSelection ) {
            var self = {};

            self.indicationChapterSearchI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.PLACEHOLDER.INDICATION_CHAPTER_SEARCH' );
            self.placeholderDiagnosisI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.PLACEHOLDER.DIAGNOSIS' );
            self.diagnosisByIndicationI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.PLACEHOLDER.DIAGNOSIS_BY_INDICATION' );
            self.secondaryDiagnosisI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.PLACEHOLDER.SECONDARY_DIAGNOSIS' );
            self.noRecordsI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.LABEL.NO_RECORDS' );
            self.filterByUtAgreementI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.LABEL.FILTER_BY_UT_AGREEMENT' );
            self.labelDefaultI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.LABEL.DEFAULT' );

            self.labelSelectUtilityI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.LABEL.SELECT_UTILITY' );
            self.labelPrimaryUtilityI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.LABEL.PRIMARY_UTILITY' );
            self.optionalUtilityI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.LABEL.OPTIONAL_UTILITY' );
            self.additionalUtilityI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.LABEL.ADDITIONAL_UTILITY' );
            self.standartizedUtilityI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.LABEL.STANDARDIZED_UTILITY' );
            self.labelPrescriptionI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.LABEL.PRESCRIPTION' );
            self.labelFrequencyRecomendationsI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.LABEL.FREQUENCY_RECOMMENDATIONS' );
            self.labelTherapyDurationsI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.LABEL.THERAPY_DURATION' );
            self.labelPrescriptionAmountsI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.LABEL.PRESCRIPTION_AMOUNTS' );
            self.firstPrescriptionQtyI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.LABEL.FIRST_PRESCRIPTION_QTY' );
            self.nextPrescriptionQtyII8n = i18n( 'InCaseMojit.kbvutility-search-modalJS.LABEL.NEXT_PRESCRIPTION_QTY' );
            self.labelTotalQtyI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.LABEL.TOTAL_QTY' );
            self.totalQtyStdI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.LABEL.TOTAL_QTY_STD' );
            self.totalQtyMassageI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.LABEL.TOTAL_QTY_MASSAGE' );
            self.labelExplanationsI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.LABEL.EXPLANATION' );
            self.labelTherapyAgreementI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.LABEL.THERAPY_AGREEMENT' );
            self.labelNoteTherapyGoalsI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.LABEL.NOTE_THERAPY_GOALS' );
            self.labelNoteI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.LABEL.NOTE' );
            self.labelDiseasesListI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.LABEL.DISEASES_LIST' );
            self.labelImpairmentsI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.LABEL.IMPAIRMENTS' );
            self.therapyGoalsI18n = i18n( 'InCaseMojit.kbvutility-search-modalJS.LABEL.THERAPY_GOALS' );

            if( config.indicationCode ) {
                self.indicationSearch = ko.observable();
            } else {
                self.indicationSearch = ko.observable( '' );
            }
            self.patientId = config.patientId;
            self.indicationList = ko.observable();
            self.filterBySubTypes = ko.observableArray();

            self.onSubTypeClick = function(subType) {
                if( -1 === self.filterBySubTypes().indexOf( subType ) ) {
                    self.filterBySubTypes.push( subType );
                } else {
                    self.filterBySubTypes.remove( subType );
                }
            };

            self.selectedIndication = ko.observable();
            self.seq = ko.observable();
            self.selectedUtilites = ko.observableArray();

            self.patientAge = config.patientAge || null;

            self.agreement = ko.observable();
            self.normalCase = ko.observable( 'boolean' === typeof config.normalCase ? config.normalCase : true );
            self.normalCase.validationMessages = ko.observableArray( KBVUTILITY_UTPRESCRIPTIONTYPE_ERR );
            self.normalCase.toggle = ko.computed( function() {
                var selectedIndication = self.selectedIndication(),
                    normalCase = self.normalCase(),
                    isPodo, isET;
                if( selectedIndication && !normalCase ) {
                    isPodo = isPodoIndication( {entry: selectedIndication} );
                    isET = isETIndication( {entry: selectedIndication} );
                    return isPodo || isET;
                }
                return false;
            } );

            self.noNormalCase = ko.computed( {
                read: function() {
                    return !self.normalCase();
                },
                write: function( val ) {
                    self.normalCase( !val );
                }
            } );

            self.searchByAgreement = ko.observable( false );

            self.icd = ko.observable();
            self.icdText = ko.observable();
            self.icdRef = ko.observable();
            self.icd.toggle = ko.observable( false );
            self.icd.validationMessages = ko.observableArray();
            self.icd.toggleType = ko.observable( 'success' );
            self.icd.readOnly = ko.observable();

            self.icd2 = ko.observable();
            self.icd2Text = ko.observable();
            self.icd2Ref = ko.observable();
            self.icd2.toggle = ko.observable( false );
            self.icd2.validationMessages = ko.observableArray();
            self.icd2.toggleType = ko.observable( 'success' );
            self.icd2.readOnly = ko.observable();

            self.searchByCatalog = ko.computed( function() {
                var selectedIndication = self.selectedIndication(),
                    searchByAgreement = self.searchByAgreement();
                return !(selectedIndication && searchByAgreement);
            } );

            function resetIcd2() {
                self.icd2( null );
                self.icd2Text( null );
                self.icd2Ref( null );
            }

            ko.computed( function() {
                var icd = self.icd();
                if( !icd ) {
                    resetIcd2();
                }
            } );

            self.selectIndication = function( indicationData ) {
                var selectedIndication = peek( self.selectedIndication ),
                    alreadySelected = selectedIndication && selectedIndication.seq === indicationData.seq;
                if( alreadySelected ) {
                    indicationData = null;
                }

                self.selectedIndication( indicationData || null );
                self.seq( indicationData && indicationData.seq || null );
                if( config.utilities ) {
                    self.selectedUtilites( config.utilities );
                    config.utilities = null;
                } else {
                    self.selectedUtilites( [] );
                }
                self.agreement( null );
            };

            self.getUtilityIndex = function( data ) {
                var result = -1;
                if( data ) {
                    peek( self.selectedUtilites ).some( function( ut, index ) {
                        if( data.name === ut.name && data.type === ut.type ) {
                            result = index;
                            return true;
                        }
                    } );
                }
                return result;
            };

            self.selectUtility = function( data, type ) {
                var idx;
                if( data && !data.type ) {
                    data.type = type;
                }
                idx = self.getUtilityIndex( data );
                if( -1 !== idx ) {
                    self.selectedUtilites.splice( idx, 1 );
                } else {
                    self.selectedUtilites.push( data );
                }
            };

            self.isUtilitySelected = function( name, type ) {
                var selectedUtilites = self.selectedUtilites(), // TODOOO fix typo
                    isSelected = false;
                selectedUtilites.some( function( ut ) {
                    if( ut.name === name && ut.type === type ) {
                        isSelected = true;
                        return true;
                    }
                } );
                return isSelected;
            };

            self.displayUtAgreement = function( agreementEntry ) {
                var agreement = agreementEntry && agreementEntry.heilmittel_liste && agreementEntry.heilmittel_liste[0];
                if( !agreement || !agreement.anlage_heilmittelvereinbarung_value || !agreement.anlage_heilmittelvereinbarung_name ) {
                    return 'Keine';
                }
                return agreement.anlage_heilmittelvereinbarung_value + ' - ' + agreement.anlage_heilmittelvereinbarung_name + (agreement.hinweistext ? ('\nHinweis: \n' + agreement.hinweistext) : '');
            };

            self.agreementPatientAgeWarning = ko.computed( function() {
                var result = null,
                    age, noMatch,
                    agreementEntry = self.agreement(),
                    agreement = agreementEntry && agreementEntry.heilmittel_liste && agreementEntry.heilmittel_liste[0];

                function setResult( add, data ) {
                    if( add ) {
                        result = Array.isArray( result ) ? result : [];
                        result.push( data );
                    }
                }

                if( agreement && (0 === self.patientAge || self.patientAge) ) {
                    // check patient age, unit is always year ("Jahr")
                    if( agreement.untere_altersgrenze_value && agreement.untere_altersgrenze_unit ) {
                        age = +agreement.untere_altersgrenze_value;
                        noMatch = self.patientAge <= age;
                        setResult( noMatch, {type: 'MIN', age: age} );

                    }
                    if( agreement.obere_altersgrenze_value && agreement.obere_altersgrenze_unit ) {
                        age = +agreement.obere_altersgrenze_value;
                        noMatch = !result ? self.patientAge >= age : result;
                        setResult( noMatch, {type: 'MAX', age: age} );
                    }
                }
                return result;
            } );

            self.displayAgreementPatientAgeWarning = ko.computed( function() {
                var results = [],
                    agreementPatientAgeWarning = self.agreementPatientAgeWarning();
                if( agreementPatientAgeWarning && 0 < agreementPatientAgeWarning.length ) {
                    agreementPatientAgeWarning.forEach( function( entry ) {
                        results.push( i18n( 'InCaseMojit.kbvutility-search-modalJS.AGREEMENT_PATIENT_' + entry.type + '_AGE', {
                            data: {
                                age: self.patientAge,
                                val_age: entry.age
                            }
                        } ) );
                    } );
                }
                return results.join( ', ' );
            } );

            self.displayFrequence = function( freq ) {
                if( freq && null !== freq.match( /^\d+$/ ) ) {
                    return freq + ' x pro Woche';
                } else {
                    return freq;
                }
            };

            self.getSelection = function() {
                return {
                    icd: self.icd(),
                    icdText: self.icdText(),
                    icdRef: self.icdRef(),
                    icd2: self.icd2(),
                    icd2Text: self.icd2Text(),
                    icd2Ref: self.icd2Ref(),
                    utilities: self.selectedUtilites(),
                    agreement: (null === self.agreementPatientAgeWarning()) ? self.agreement() : null,
                    entry: self.selectedIndication(),
                    normalCase: self.normalCase()
                };
            };

            self.chapters = ko.computed( function() {
                var data = self.indicationList(), result;
                if( !data ) {
                    return [];
                }
                result = Object.keys( data ).sort().map( function( chapter ) {
                    return {
                        chapter: chapter,
                        subChapters: Object.keys( data[chapter] ).sort().map( function( subChapter ) {
                            return {
                                subChapter: subChapter,
                                subSubChapters: Object.keys( data[chapter][subChapter] ).sort().map( function( subSubChapter ) {
                                    return {
                                        subSubChapter: subSubChapter,
                                        data: _.sortBy( data[chapter][subChapter][subSubChapter], function( entry ) {
                                            return entry.leitsymptomatik_value || entry.leitsymptomatik_name;
                                        } )
                                    };
                                } )

                            };
                        } )
                    };
                } );
                return result;
            } );

            self.search = function( indicationSearch, icd, icd2, subTypes ) {
                var params = {
                    indicationSearch: indicationSearch,
                    subTypes: subTypes,
                    kv: config.kv
                };

                if( icd ) {
                    params.icd = icd;
                }

                if( icd2 ) {
                    params.icd2 = icd2;
                }

                return Promise.resolve( Y.doccirrus.jsonrpc.api.catalog.searchKbvUtility( params ) ).then( function( response ) {
                    var data = response.data,
                        selectedIndication = peek( self.selectedIndication ),
                        deselectSelectedIndication = true,
                        groupedByChapter = _.groupBy( data, 'kapitel' );

                    Object.keys( groupedByChapter ).forEach( function( key ) {
                        groupedByChapter[key] = _.groupBy( groupedByChapter[key], 'unterkapitel' );
                        Object.keys( groupedByChapter[key] ).forEach( function( key2 ) {
                            groupedByChapter[key][key2] = _.groupBy( groupedByChapter[key][key2], 'diagnosegruppe_display' );
                        } );
                    } );

                    self.indicationList( groupedByChapter );
                    // select entry if only one entry is received
                    if( Array.isArray( data ) && 1 === data.length && (!selectedIndication || data[0].seq !== selectedIndication.seq) ) {
                        self.selectIndication( data[0] );
                    } else if( Array.isArray( data ) && selectedIndication ) {
                        data.some( function( entry ) {
                            if( entry.seq === selectedIndication.seq ) {
                                deselectSelectedIndication = false;
                                return true;
                            }
                        } );
                        // deselect if result does not contain currently selected indication entry
                        if( deselectSelectedIndication ) {
                            self.selectedIndication( null );
                        }
                    }
                } ).catch( function( err ) {
                    Y.log( 'could not search utility catalog:  ' + err, 'error', NAME );
                } );
            };

            ko.computed( function() {
                var indicationSearch = self.indicationSearch(),
                    icd = peek( self.icd ),
                    icd2 = peek( self.icd2 ),
                    searchByAgreement = self.searchByAgreement(),
                    filterBySubTypes = peek( self.filterBySubTypes );
                self.search( indicationSearch, searchByAgreement ? icd : null, searchByAgreement ? icd2 : null, filterBySubTypes );
            } ).extend( {rateLimit: {timeout: 1500, method: "notifyWhenChangesStop"}} );

            ko.computed( function() {
                var indicationSearch = peek( self.indicationSearch ),
                    icd = self.icd(),
                    icd2 = self.icd2(),
                    searchByAgreement = self.searchByAgreement(),
                    filterBySubTypes = peek( self.filterBySubTypes );
                if( !searchByAgreement ) {
                    return;
                }
                self.search( indicationSearch, icd, icd2, filterBySubTypes );
            } ).extend( {rateLimit: {timeout: 500, method: "notifyWhenChangesStop"}} );

            ko.computed( function() {
                var indicationSearch = peek( self.indicationSearch ),
                    icd = peek(self.icd),
                    icd2 = peek(self.icd2),
                    searchByAgreement = peek(self.searchByAgreement),
                    filterBySubTypes = self.filterBySubTypes();
                self.search( indicationSearch, searchByAgreement ? icd : null, searchByAgreement ? icd2 : null, filterBySubTypes );
            } ).extend( {rateLimit: {timeout: 500, method: "notifyWhenChangesStop"}} );

            self.isUtilityCombinationValid = ko.computed( function() {
                var selectedIndication = self.selectedIndication(),
                    selectedUtilites = self.selectedUtilites(),
                    subType = getSubTypeByChapter( selectedIndication && selectedIndication.kapitel ),
                    checker,
                    validCombination = false;
                if( !subType || 0 === selectedUtilites.length ) {
                    return validCombination;
                }
                checker = getCombinationCheckerBySubType( subType );
                if( 'function' === typeof checker ) {
                    validCombination = checker( selectedUtilites, selectedIndication );
                }
                return validCombination;
            } );

            function setAgreementData( data ) {
                var
                    icd = peek( self.icd ),
                    icd2 = peek( self.icd2 ),
                    agreement = data && data.result && data.result[0] || null,
                    searchByAgreement = self.searchByAgreement(),
                    agreed = data && true === data.agreed,
                    needsIcd = data && true === data.needsIcd,
                    needsIcd2 = data && true === data.needsIcd2;

                if( agreed ) {
                    self.agreement( agreement );
                } else {
                    self.agreement( null );
                }

                if( needsIcd ) {
                    self.icd.readOnly( false );
                    self.icd.toggle( true );
                    self.icd.toggleType( (icd && (agreed || needsIcd2 )) ? 'success' : 'warning' );
                    self.icd.validationMessages( 'success' === peek( self.icd.toggleType ) ? ICD10_MATCHES_AGREEMENT : (icd ? PLEASE_CHOOSE_ANOTHER_ICD10 : PLEASE_CHOOSE_ICD10) );
                } else {
                    //self.icd.readOnly( true );
                    self.icd.toggle( false );
                }

                if( needsIcd2 ) {
                    self.icd2.readOnly( false );
                    self.icd2.toggle( true );
                    self.icd2.toggleType( ( icd2 && agreed ) ? 'success' : 'warning' );
                    self.icd2.validationMessages( 'success' === peek( self.icd2.toggleType ) ? ICD10_MATCHES_AGREEMENT : (icd2 ? PLEASE_CHOOSE_ANOTHER_SECOND_ICD10 : PLEASE_CHOOSE_SECOND_ICD10 ) );
                } else {
                    self.icd2.readOnly( searchByAgreement ? true : false );
                    if( true === peek( self.icd2.readOnly ) ) {
                        resetIcd2();
                    }
                    self.icd2.toggle( false );
                }

            }

            ko.computed( function() {
                var
                    isUtilityCombinationValid = self.isUtilityCombinationValid();

                onSelection( isUtilityCombinationValid );
            } );

            ko.computed( function() {
                var
                    selectedIndication = self.selectedIndication(),
                    diagnosisGroup = selectedIndication && selectedIndication.diagnosegruppe_value,
                    icd = self.icd(),
                    icd2 = self.icd2(),
                    params;

                if( diagnosisGroup ) {
                    params = {
                        patientAge: self.patientAge,
                        diagnosisGroup: diagnosisGroup,
                        kv: config.kv
                    };

                    if( icd ) {
                        params.icd = icd;
                    }

                    if( icd2 ) {
                        params.icd2 = icd2;
                    }

                    Promise.resolve( Y.doccirrus.jsonrpc.api.catalog.getUtilityAgreement( params ) ).then( function( response ) {
                        var data = response && response.data;
                        setAgreementData( data );
                    } ).catch( function( err ) {
                        Y.log( 'could not get utility agreement ' + err, 'error', NAME );
                    } );
                } else {
                    setAgreementData( null );
                    Y.log( 'skipping agreement check', 'debug', NAME );
                }
            } );

            self.select2Code = createUtilityIcdCodeAutoComplete( {
                activity: self,
                field: self.icd,
                fieldText: self.icdText,
                fieldRef: self.icdRef,
                queryFn: byCatalogQueryFn,
                getCatalogCodeSearchParams: function() {
                    return {
                        itemsPerPage: 20,
                        query: {
                            patientId: self.patientId,
                            term: ''
                        }
                    };
                }
            } );

            self.select2CodeIndicationSet = createUtilityIcdCodeAutoComplete( {
                activity: self,
                field: self.icd,
                fieldText: self.icdText,
                fieldRef: self.icdRef,
                queryFn: byIndicationQueryFn,
                getCatalogCodeSearchParams: function() {
                    var selectedIndication = peek( self.selectedIndication ),
                        searchByAgreement = peek( self.searchByAgreement() ),
                        diagnosisGroup = selectedIndication && selectedIndication.diagnosegruppe_value;
                    if( !diagnosisGroup ) {
                        Y.log( 'select2CodeIndicationSet: getCatalogCodeSearchParams: called without diagnosisGroup selected', 'warn', NAME );
                        return null;
                    }
                    return {
                        itemsPerPage: 20,
                        query: {
                            patientId: self.patientId,
                            diagnosisGroup: diagnosisGroup,
                            searchByAgreement: searchByAgreement,
                            kv: config.kv,
                            term: ''
                        }
                    };
                }
            } );

            self.select2Code2 = createUtilityIcdCodeAutoComplete( { // TODOOO disable until is set and results?
                activity: self,
                field: self.icd2,
                fieldText: self.icd2Text,
                fieldRef: self.icd2Ref,
                queryFn: byIndicationQueryFn,
                getCatalogCodeSearchParams: function() {
                    var selectedIndication = peek( self.selectedIndication ),
                        searchByAgreement = peek( self.searchByAgreement ),
                        icd = self.icd(),
                        diagnosisGroup = selectedIndication && selectedIndication.diagnosegruppe_value;
                    if( searchByAgreement && (!diagnosisGroup || !icd ) ) {
                        Y.log( 'select2CodeIndicationSet: getCatalogCodeSearchParams: called without diagnosisGroup selected', 'warn', NAME );
                        return null;
                    }
                    return {
                        itemsPerPage: 20,
                        query: {
                            diagnosisGroup: diagnosisGroup,
                            icd: icd,
                            patientId: self.patientId,
                            kv: config.kv,
                            searchByAgreement: searchByAgreement,
                            term: ''
                        }
                    };
                }
            } );

            self.select2Code2Catalog = createUtilityIcdCodeAutoComplete( {
                activity: self,
                field: self.icd2,
                fieldText: self.icd2Text,
                fieldRef: self.icd2Ref,
                queryFn: byCatalogQueryFn,
                getCatalogCodeSearchParams: function() {
                    return {
                        itemsPerPage: 20,
                        query: {
                            patientId: self.patientId,
                            term: ''
                        }
                    };
                }
            } );

            self.utilityTooltip = ko.computed( function() {
                var selectedIndication = self.selectedIndication(),
                    subType = getSubTypeByChapter( selectedIndication && selectedIndication.kapitel ),
                    tooltip = '';
                if( subType ) {
                    switch( subType ) {
                        case 'PHYSIO':
                            tooltip = PHYSIO_COMBINATIONS;
                            break;
                        case 'LOGO':
                            tooltip = LOGO_COMBINATIONS;
                            break;
                        case 'ERGO':
                            tooltip = ERGO_COMBINATIONS;
                            break;
                        case 'ET':
                            tooltip = ET_COMBINATIONS;
                            break;
                    }
                }
                return tooltip;
            } );

            if( config.icd2 ) {
                self.icd2( config.icd2 );
            }
            if( config.icd2Text ) {
                self.icd2Text( config.icd2Text );
            }
            if( config.icd ) {
                self.icd( config.icd );
            }
            if( config.icdText ) {
                self.icdText( config.icdText );
            }
            if( config.indicationCode ) {
                self.indicationSearch( config.indicationCode );
            }

            return self;
        }

        function showDialog( config, callback ) {
            return getTemplate().then( function( template ) {
                var bodyContent = Y.Node.create( template ),
                    model = getModel( config, onSelection ),
                    modal = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-KBVUtilitySearchModal',
                        bodyContent: bodyContent,
                        title: 'Heilmittel Suche',
                        icon: Y.doccirrus.DCWindow.ICON_LIST,
                        width: (window.innerWidth * 95) / 100,
                        height: (window.innerHeight * 93) / 100,
                        minHeight: 600,
                        minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                        centered: true,
                        modal: true,
                        dragable: true,
                        maximizable: true,
                        resizeable: true,
                        render: document.body,
                        focusOn: [],
                        buttons: {
                            header: ['close', 'maximize'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    isDefault: true,
                                    action: function() {
                                        var selection = model.getSelection();
                                        modal.close();
                                        callback( selection );
                                    }
                                } )
                            ]
                        }
                    } );

                function onSelection( isValid ) {
                    if( !modal ) {
                        return;
                    }
                    var OK = modal.getButton( 'OK' ).button;
                    if( isValid ) {
                        OK.enable();
                    }
                    else {
                        OK.disable();
                    }
                }

                modal.getButton( 'OK' ).button.disable();
                ko.applyBindings( model, bodyContent.getDOMNode() );

                function showIce2Hint() {
                    var messageId = 'kbvutility_icd2_selected_info';
                    Y.doccirrus.DCSystemMessages.removeMessage( messageId );
                    Y.doccirrus.DCSystemMessages.addMessage( {
                        messageId: messageId,
                        content: ICD2_SELECTED_INFO,
                        level: 'INFO'
                    } );
                }

                jQuery( '#icd2_1_Select2' ).on( 'select2-open', showIce2Hint );
                jQuery( '#icd2_2_Select2' ).on( 'select2-open', showIce2Hint );
            } );

        }

        Y.namespace( 'doccirrus.modals' ).kbvutilitySearchModal = {
            showDialog: showDialog
        };

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'dccatalogmap',
            'kbvutilitycatalogcommonutils',
            'DCSystemMessages'
        ]
    }
);
