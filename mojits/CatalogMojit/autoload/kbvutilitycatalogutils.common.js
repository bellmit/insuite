/**
 * User: do
 * Date: 26/01/17  16:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI */
YUI.add( 'kbvutilitycatalogcommonutils', function( Y/*, NAME*/ ) {
        'use strict';
    var subTypeChapterMap = {
            PHYSIO: ['I. A Maßnahmen der Physikalischen Therapie', 'I. B Maßnahmen der Podologischen Therapie'],
            LOGO: 'II. Maßnahmen der Stimm-, Sprech- und Sprachtherapie',
            ERGO: 'III. Maßnahmen der Ergotherapie',
            ET: 'IV. Maßnahmen der Ernährungstherapie'
        };

        function getChapterBySubType( subType ) {
            return subTypeChapterMap[subType];
        }

        function getSubTypeByChapter( chapter ) {
            var subType = null;
            switch( chapter ) {
                case subTypeChapterMap.PHYSIO[0]:
                case subTypeChapterMap.PHYSIO[1]:
                    subType = 'PHYSIO';
                    break;
                case subTypeChapterMap.LOGO:
                    subType = 'LOGO';
                    break;
                case subTypeChapterMap.ERGO:
                    subType = 'ERGO';
                    break;
                case subTypeChapterMap.ET:
                    subType = 'ET';
                    break;
            }

            return subType;
        }

        function isPodoIndication( u_extra ) {
            var
                entry = u_extra && u_extra.entry,
                result = false;
            if( entry && 'I. B Maßnahmen der Podologischen Therapie' === entry.kapitel ) {
                result = true;
            }
            return result;
        }

        function isETIndication( u_extra ) {
            var
                entry = u_extra && u_extra.entry,
                result = false;
            if( entry && 'IV. Maßnahmen der Ernährungstherapie' === entry.kapitel ) {
                result = true;
            }
            return result;
        }

        function makeIcdContent( icd, text ) {
            var str = '';
            if( icd && text ) {
                str = '(' + icd + ')' + (text ? (' ' + text) : '' );
            }
            return str;
        }

        function makeUserContent( leitsymptomatikText, icd, icdText, icd2, icd2Text ) {
            return [
                makeIcdContent( icd, icdText ),
                makeIcdContent( icd2, icd2Text ),
                leitsymptomatikText
            ].filter( Boolean ).join( ', ' );
        }

        function renderPrescriptionType( data ) {
            // following precscription created by repeat method will be handled by generic implementation in activity-schema
            if( data.noOfRepetitions && data.parentPrescriptionId ) {
                return;
            }
            switch( data.utPrescriptionType ) {
                case 'FIRST':
                    return 'Erstverordnung';
                case 'FOLLOWING':
                    return 'Folgeverordnung';
                case 'NO_NORMAL_CASE':
                    return 'Kein Regelfall';
            }
        }

        function makeContent( data ) {
            var
                MAX_CHARS_BEFORE_ADD_CUSTOM_FOLD = 255,
                CUSTOM_FOLD = '{{...}}',
                renderedUtilities = data.utRemedy1List.concat( data.utRemedy2List ).map( function( entry ) {
                    return entry.name + (entry.seasons ? (' (' + entry.seasons + ')') : '');
                } ).join( ', ' ),
                u_extra = data.u_extra || {},

                fullContent = [
                    makeIcdContent( u_extra.icd, u_extra.icdText ),
                    makeIcdContent( u_extra.icd2, u_extra.icd2Text ),
                    renderedUtilities,
                    renderPrescriptionType( data )
                ].filter( Boolean ).join( ', ' ),

                content = fullContent.length > MAX_CHARS_BEFORE_ADD_CUSTOM_FOLD ?
                    (fullContent.substr( 0, MAX_CHARS_BEFORE_ADD_CUSTOM_FOLD ) + CUSTOM_FOLD + fullContent.substr( MAX_CHARS_BEFORE_ADD_CUSTOM_FOLD )) :
                    fullContent;

            return content;
        }


        Y.namespace( 'doccirrus' ).kbvutilitycatalogcommonutils = {
            isPodoIndication: isPodoIndication,
            makeUserContent: makeUserContent,
            makeContent: makeContent,
            isETIndication: isETIndication,
            getSubTypeByChapter: getSubTypeByChapter,
            getChapterBySubType: getChapterBySubType
        };

    },
    '0.0.1', {
        requires: []
    }
);
