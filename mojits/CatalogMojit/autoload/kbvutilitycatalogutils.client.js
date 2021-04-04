/**
 * User: do
 * Date: 26/01/17  16:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko, _ */
YUI.add( 'kbvutilitycatalogutils', function( Y, NAME ) {
        'use strict';

        var peek = ko.utils.peekObservable,
            getSubTypeByChapter = Y.doccirrus.kbvutilitycatalogcommonutils.getSubTypeByChapter,
            makeUserContent = Y.doccirrus.kbvutilitycatalogcommonutils.makeUserContent;

        function mapUtilityToUtRemedyEntry( utility ) {
            if( !utility ) {
                return null;
            }
            return {
                name: utility.name,
                type: utility.type,
                groupTherapyAble: 'boolean' === typeof utility.gruppentherapiefaehig ? utility.gruppentherapiefaehig : null,
                seasons: null
            };
        }

        function setCatalogData( self, data ) {
            var
                isNewIcd1Code, isNewIcd2Code,
                typeOrder = [
                    'vorrangiges_heilmittel_liste',
                    'optionales_heilmittel_liste',
                    'ergaenzendes_heilmittel_liste',
                    'standardisierte_heilmittel_liste'
                ],
                utList1Length, utList2Length, maxSeasons = null,
                utPrescriptionType = peek( self.utPrescriptionType ),
                entry = data.entry,
                agreement = data.agreement,
                utilities = data.utilities,
                agreementValue = agreement && agreement.heilmittel_liste && agreement.heilmittel_liste[0] && agreement.heilmittel_liste[0].anlage_heilmittelvereinbarung_value,
                frequenzempfehlung_liste = entry && entry.heilmittelverordnung && entry.heilmittelverordnung.frequenzempfehlung_liste,
                verordnungsmenge = entry && entry.heilmittelverordnung && entry.heilmittelverordnung.verordnungsmenge,
                subType = getSubTypeByChapter( entry && entry.kapitel ),
                groupedUtilities,
                utList1, utList2;

            if( !data || !subType ) {
                return;
            }

            utilities.sort( function( a, b ) {
                var aIdx = typeOrder.indexOf( a.type ),
                    bIdx = typeOrder.indexOf( b.type );
                return aIdx > bIdx;
            } );

            self.catalogShort( 'HMV' );
            self.catalog( true );
            self.catalogRef( entry.catalog );

            self.u_extra( data || null );
            self.subType( subType || null );

            self.utIndicationCode( entry.seq || null );
            self.userContent( makeUserContent( entry.leitsymptomatik_name, data.icd, data.icdText, data.icd2, data.icd2Text ) );
            isNewIcd1Code = peek( self.utIcdCode ) !== data.icd;
            isNewIcd2Code = peek( self.utSecondIcdCode ) !== data.icd2;
            self.utIcdCode( data.icd || null );
            self.utIcdText( data.icd && data.icdText || null );
            self.utIcdRef( data.icd && data.icdRef || (!isNewIcd1Code && peek( self.utIcdRef )) || null );
            self.utSecondIcdCode( data.icd2 || null );
            self.utSecondIcdText( data.icd2 && data.icd2Text || null );
            self.utSecondIcdRef( data.icd2 && data.icd2Ref || (!isNewIcd2Code && peek( self.utSecondIcdRef )) || null );

            if( !data.normalCase ) {
                self.utPrescriptionType( 'NO_NORMAL_CASE' );
            } else {
                self.utPrescriptionType( utPrescriptionType === 'FIRST' || utPrescriptionType === 'FOLLOWING' ?
                    utPrescriptionType : 'FIRST' );
            }

            self.utVocalTherapy( false );
            self.utSpeechTherapy( false );
            self.utSpeakTherapy( false );

            self.utRemedy1Name( null );
            self.utRemedy2Name( null );

            self.utRemedy1List( [] );
            self.utRemedy2List( [] );

            self.utRemedy1PerWeek( null );
            self.utRemedy2PerWeek( null );

            self.utRemedy1Seasons( null );
            self.utRemedy2Seasons( null );

            self.utAgreement( 'NONE' );

            if( 'LOGO' === subType ) {
                utilities.forEach( function( utility ) {
                    if( 'Stimmtherapie' === utility.name ) {
                        self.utVocalTherapy( true );
                    } else if( 'Sprachtherapie' === utility.name ) {
                        self.utSpeechTherapy( true );
                    } else if( 'Sprechtherapie' === utility.name ) {
                        self.utSpeakTherapy( true );
                    }
                } );

            } else {

                if( 2 === utilities.length ) {
                    self.utRemedy1List( [mapUtilityToUtRemedyEntry( utilities[0] )] );
                    self.utRemedy2List( [mapUtilityToUtRemedyEntry( utilities[1] )] );
                } else {
                    groupedUtilities = _.groupBy( utilities, 'type' );
                    Object.keys( groupedUtilities ).forEach( function( group, index ) {
                        if( 1 < index ) {
                            Y.log( 'more utilities groups picked than allowed ' + groupedUtilities, 'error', NAME );
                            return;
                        }
                        self['utRemedy' + (index + 1) + 'List']( groupedUtilities[group].map( mapUtilityToUtRemedyEntry ) );
                    } );
                }
            }

            utList1 = peek( self.utRemedy1List );
            utList2 = peek( self.utRemedy2List );

            utList1Length = utList1.length;
            utList2Length = utList2.length;

            if( 'LOGO' === subType && frequenzempfehlung_liste && frequenzempfehlung_liste.length ) {
                if( 'ST3' !== entry.seq ) {
                    self.utRemedy1PerWeek( frequenzempfehlung_liste[0] );
                }
            } else if( frequenzempfehlung_liste && frequenzempfehlung_liste.length ) {
                if(  utList1Length  ) {
                    self.utRemedy1PerWeek( frequenzempfehlung_liste[0] );
                }
                if( utList2Length ) {
                    self.utRemedy2PerWeek( frequenzempfehlung_liste[0] );
                }
            }

            if( 'FIRST' === utPrescriptionType ) {
                maxSeasons = verordnungsmenge.erstverordnungsmenge || null;
            } else if( 'FOLLOWING' === utPrescriptionType ) {
                maxSeasons = verordnungsmenge.folgeverordnungsmenge || null;
            }

            if( 'LOGO' === subType || utList1Length ) {
                self.utRemedy1Seasons( maxSeasons );
                if( 'LOGO' !== subType ) {
                    if( utList1Length === 1 ) {
                        utList1[0].seasons( maxSeasons );
                    } else if( utList1Length === 2 ) {
                        utList1[0].seasons( Math.round( maxSeasons / 2 ) );
                        utList1[1].seasons( Math.floor( maxSeasons / 2 ) );
                    }
                }
            }
            if( utList2Length ) {
                self.utRemedy2Seasons( maxSeasons );
                if( 'LOGO' !== subType ) {
                    if( utList2Length === 1 ) {
                        utList2[0].seasons( maxSeasons );
                    } else if( utList1Length === 2 ) {
                        utList2[0].seasons( Math.round( maxSeasons / 2 ) );
                        utList2[1].seasons( Math.floor( maxSeasons / 2 ) );
                    }
                }
            }
            // else {
            // TODOOO lookup and check last kbvut and diff amounts etc...
            // TODOOO more validations..
            // }

            if( agreementValue ) {
                self.utAgreement( agreementValue );
            }
        }

        Y.namespace( 'doccirrus' ).kbvutilitycatalogutils = {
            setCatalogData: setCatalogData
        };

    },
    '0.0.1', {
        requires: ['kbvutilitycatalogcommonutils']
    }
);
