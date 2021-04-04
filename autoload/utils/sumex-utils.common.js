/*global YUI */

'use strict';

YUI.add( 'dcsumexutils', function( Y, NAME ) {

    var moment = Y.doccirrus.commonutils.getMoment();

        /**
         * Maps activities (treatments and medications) into bulks - group by date, code, side, daySeparation
         * @param {Object} args             :REQUIRED:
         * @param {Array} args.treatments   :REQUIRED:
         * @param {Array} args.medications  :REQUIRED:
         * @returns {Object} containing mapped treatments and medications
         */
        function mapActivitiesIntoBulks( args ) {
            var treatments = args.treatments || [],
                medications = args.medications || [],
                // Collecting treatments from schein:
                // have to be very careful with ordering and sorting of the treatments.
                treatmentArraysPartitionedByDate = getDatePartitionedArray( treatments ) || [],
                medicationArraysPartitionedByDate = getDatePartitionedArray( medications ) || [],
                treatmentsBulks, medicationsBulks;

            // divide activities by time split
            treatmentArraysPartitionedByDate.forEach( function( part ) {
                divideActivitiesSessions( part );
            } );

            // have to respect distinct (refactor)
            treatmentsBulks = treatmentArraysPartitionedByDate.map( function( part ) {
                return distinctActivitiesBy( part, ['code', 'side'] );
            } );
            medicationsBulks = medicationArraysPartitionedByDate.map( function( part ) {
                return distinctActivitiesBy( part, ['code', 'side'] );
            } );

            return {
                treatmentsBulks: treatmentsBulks || [],
                medicationsBulks: medicationsBulks || []
            };
        }

        function divideActivitiesSessions( activities ) {
            var lSessionNumber = 1,
                activityFound = activities.find( function( a ) {
                    return a.daySeparation;
                } );

            if( !activityFound ) {
                return;
            }
            activities = activities.map( function( a ) {
                a.timestamp = new Date( a.timestamp );
                return a;
            } ).sort( function( a, b ) {
                return a.timestamp - b.timestamp;
            } );
            activities.forEach( function( activity, index ) {
                if( activity.daySeparation && index !== 0 ) {
                    lSessionNumber++;
                }
                activity.lSessionNumber = lSessionNumber;
            } );
        }

        function distinctActivitiesBy( activities, parameters ) {
            var distinctActivities = [];
            activities = activities || [];

            activities.forEach( function( activity ) {
                var sameParameterExists = distinctActivities.find( function( distinct ) {
                    var allMatch = distinct.lSessionNumber === activity.lSessionNumber,
                        i;

                    for( i = 0; i < parameters.length; i++ ) {
                        if( !allMatch ) {
                            break;
                        }
                        allMatch = allMatch && distinct[parameters[i]] === activity[parameters[i]];
                    }
                    return allMatch;
                } );
                if( !sameParameterExists ) {
                    const dQuantity = activities.filter( function( a ) {
                        var allMatch = a.lSessionNumber === activity.lSessionNumber,
                            j;

                        for( j = 0; j < parameters.length; j++ ) {
                            if( !allMatch ) {
                                break;
                            }
                            allMatch = allMatch && a[parameters[j]] === activity[parameters[j]];
                        }
                        return allMatch;
                    } ).length;
                    distinctActivities.push( Object.assign( {}, {dQuantity: dQuantity}, activity ) );
                }
            } );
            return distinctActivities;
        }

        /**
         * Helper function to partition array by date attribute.  *Warning*: ignores daySeparation.
         * @method getDatePartitionedArray
         * @param {Array} array
         * @returns {Array}
         */
        function getDatePartitionedArray( array ) {
            var idx = -1,
                result = [],
                i;
            if( !array ) {
                Y.log( 'getDatePartitionedArray: invalid param', 'error', NAME );
                return result;
            }
            for( i = array.length - 1; i >= 0; i-- ) {
                if( i === array.length - 1 ) {
                    idx = i;
                } else {
                    // if the succeeding elements belong to different days,
                    // then ...
                    if( moment( array[i].timestamp ).format( "YYYYMMDD" ) !==
                        moment( array[idx].timestamp ).format( "YYYYMMDD" ) ) {
                        // slice the elements that belong together into a partition array
                        result.push( array.slice( i + 1, idx + 1 ) );
                        // and reset idx
                        idx = i;
                    }
                }
            }
            // and do the rest:
            if( idx > -1 ) {
                result.push( array.slice( 0, idx + 1 ) );
            }
            return result;
        }

        Y.namespace( 'doccirrus' ).sumexutils = {
            mapActivitiesIntoBulks: mapActivitiesIntoBulks
        };
    },
    '0.0.1', {requires: ['dccommonutils']} );