 /*jslint anon:true, nomen:true*/
/*global YUI */

YUI.add( 'dcregexp', function( Y/*, NAME*/ ) {

        'use strict';

        Y.namespace( 'doccirrus' );

        var REGEXP = {};

        /**
         * Doc Cirrus Regular Expression Library
         * @class doccirrus.regexp
         * @static
         */
        Y.doccirrus.regexp = REGEXP;

        /**
         * iso 8601 regex
         * @property iso8601
         * @type {RegExp}
         * @example 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
         * @author moment.js
         */
        REGEXP.iso8601 = /^\s*(?:[+-]\d{6}|\d{4})-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/;

        REGEXP.phoneNumber = /^([0+]\d{1,4})[.\-\/ ]?(([0-9]{1,4})[.\-\/ ]?)+$/;
        REGEXP.email = /^([a-zA-Z0-9_+\.\-])+\@(([a-zA-Z0-9\-_])+\.)+([a-zA-Z0-9]{2,16})$/;
        REGEXP.emailUmlauts = /^([a-zA-Z0-9_+\.\-\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df])+\@(([a-zA-Z0-9\-_\u00c4\u00e4\u00d6\u00f6\u00dc\u00fc\u00df])+\.)+([a-zA-Z0-9]{2,16})$/;

        REGEXP.KP2612 = /^11233[a-zA-Z]?$/;
        REGEXP.KP2613 = /^115(11|12|16|17|18|21)[a-zA-Z]?$/;
        REGEXP.KP2614 = /^115(13|14|22)[a-zA-Z]?$/;
        REGEXP.KP2614_2 = /^11449[a-zA-Z]?$/;
        REGEXP.KP2615 = /^194(24|25|53|54|56)[a-zA-Z]?$/;
        REGEXP.KP2616 = /^194(21|51|52)[a-zA-Z]?$/;
        // 11302[G-alpha], 11303[G-alpha]
        REGEXP.KP2617 = /^113(02|03)[a-zA-Z]?$/;
        // 19402[G-alpha]
        REGEXP.KP2617_2 = /^19402[a-zA-Z]?$/;
        // 32901[G-alpha], 32902[G-alpha], 32904[G-alpha], 32906[G-alpha], 32908[G-alpha], 32910[G-alpha] und 32911[G-alpha]
        REGEXP.KP2617_3 = /^329(01|02|04|06|08|10|11|15|16|17|18)[a-zA-Z]?$/;

        REGEXP.isAsvPseudoNo = /^555555[0-9]{3}$/;
        REGEXP.isEdmpCaseNo = /^[0-9a-zA-Z]{1,7}$/;
        REGEXP.isEhksPatientNo = /^[0-9a-zA-Z]{1,8}$/;
        REGEXP.isHgvPatientNo = /^[0-9a-zA-Z]{1,10}$/;
        REGEXP.modalityName = /^[A-Za-z0-9_\-]+$/;

        REGEXP.bloodPressure = /^(\d{1,3})\/(\d{1,3})$/;
        /**
         * test for html tags
         * - use with replace to remove tags
         * @property stripHtmlTags
         * @type {RegExp}
         * @example .replace(stripHtmlTags, '')
         * @author YUI
         * @see Y.EditorSelection.REG_NOHTML
         */
        REGEXP.stripHtmlTags = /<\S[^><]*>/g;
        REGEXP.numRange= /^(\d{1,3})(-\d{1,3})?$/;

        // utils
        REGEXP.some = function( str, regexps ) {
            if( 'string' !== typeof str ) {
                return false;
            }
            return (regexps || []).some( function( regexp ) {
                return null !== str.match( regexp );
            } );
        };

        REGEXP.goaeLabCodeH = /H(1|2|3|4)$/;
        REGEXP.goaeFloatinPointFactor = /^[0-9]{1,2}\.[0-9]{1,6}$/;

        REGEXP.vprcFQHostName = /^insuite\.[a-z\d]([a-z\d\-]{0,61}[a-z\d])?(\.[a-z\d]([a-z\d\-]{0,61}[a-z\d])?)*$/i;

        REGEXP.controlChars = /(\n)|(\r)|(\v)|(\f)|(\t)/gm;

        REGEXP.additionalInsuranceTypeRegex = /_A$/;

        REGEXP.decimal = /^[+-]?[0-9]+(\.[0-9]+)?$/;
        REGEXP.integer = /^[+-]?[0-9]+$/;
        REGEXP.decimalPositive = /^[0-9]+(\.[0-9]+)?$/;
        REGEXP.integerPositive = /^[0-9]+$/;
        REGEXP.decimalNegative = /^-[0-9]+(\.[0-9]+)?$/;
        REGEXP.integerNegative = /^-[0-9]+$/;

        /**
         * Regex for checking treatment code and the need of batch number.
         * @type {RegExp}
         */
        REGEXP.gopBatchNumberRegex = /^883+([3][0-9]|40)+[A-Z]$/;

    },
    '0.0.1',
    {
        requires: []
    }
);

