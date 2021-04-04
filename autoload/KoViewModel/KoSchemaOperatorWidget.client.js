'use strict';

/* global YUI */
YUI.add( 'KoSchemaOperatorWidget', function( Y, NAME ) {
        var
            operatorList = _getOperatorList(),
            greaterThanOperators = ['$gt', '$gte'],
            lessThanOperators = ['$lt', '$lte'],
            operatorsFor = {
                stringType: ['$eq', '$ne', '$regex', '$exists', '$in', '$nin'],
                numberType: ['$eq', '$ne', '$exists', '$comp'],
                booleanType: ['$eq', '$ne', '$exists'],
                dateType: ['$eqDate', '$neDate', '$exists', '$compDate'],
                datetimeType: ['$eqDate', '$neDate', '$exists', '$compDate']
            };

        function getVisibleOperatorList() {
            return operatorList.filter( function( op ) {
                return false !== op.visible;
            } );
        }

        function _getOperatorList() {
            var operatorList = [
                { val: '$eq', visible: true },
                { val: '$eqDate', visible: true },
                { val: '$ne', visible: true },
                { val: '$neDate', visible: true },
                { val: '$regex', visible: true },
                { val: '$options', visible: false },
                { val: '$in', visible: true },
                { val: '$nin', visible: true },
                { val: '$all', visible: true },
                { val: '$exists', visible: true },

                { val: '$comp', visible: true },
                { val: '$compDate', visible: true },

                { val: '$gt', visible: false },
                { val: '$lt', visible: false },
                { val: '$gte', visible: false },
                { val: '$lte', visible: false }
            ];
            return operatorList.map( function( op ) {
                op.i18n = Y.doccirrus.i18n( 'operator_list.' + op.val );
                return op;
            } );
        }

        function findOperatorByName( name ) {
            var result;
            operatorList.some( function( op ) {
                if( op.val.replace( '$', '' ) === name.replace( '$', '' ) ) {
                    result = op;
                    return true;
                }
            } );
            return result;
        }

        function getComparisonLists() {
            var result = {
                greaterThanList: [],
                lessThanList: []
            };

            operatorList.forEach( function( entry ) {
                if( -1 !== greaterThanOperators.indexOf( entry.val ) ) {
                    result.greaterThanList.push( entry );
                } else if( -1 !== lessThanOperators.indexOf( entry.val ) ) {
                    result.lessThanList.push( entry );
                }
            } );

            return result;
        }

        function getOperatorForType( type, isList, allowedOperators ) {

            var operators = operatorsFor[type.toLowerCase() + 'Type'].slice();

            if( isList !== 'false' ) {
                operators.push( '$all' );
            }

            if( allowedOperators && allowedOperators.length ) {
                operators = operators.filter( function( operator ) {
                    return allowedOperators.includes( operator );
                } );
            }

            return operatorList.filter( function( operator ) {
                return operators.indexOf( operator.val ) >= 0;
            } );
        }

        Y.namespace( 'doccirrus' ).KoSchemaOperatorWidget = {

            name: NAME,

            getVisibleOperatorList: getVisibleOperatorList,
            findOperatorByName: findOperatorByName,
            getComparisonLists: getComparisonLists,
            getOperatorForType: getOperatorForType
        };
    },
    '0.0.1', { requires: ['dcruleutils', 'dcvalidations'] }
);




