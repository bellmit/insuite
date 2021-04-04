/**
 * User: rrrw
 * Date: 16/11/2012  15:45
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global YUI*/
YUI.add( 'repetition-schema', function( Y, NAME ) {

        'use strict';

        var
        // ------- Schema definitions  -------
            types = {};

        NAME = Y.doccirrus.schemaloader.deriveSchemaName( NAME );

        types = Y.mix( types, {
                "root": {
                    "base": {
                        "complex": "ext",
                        "type": "Repetition_T",
                        "lib": "calendar"
                    }
                }
            }
        );

        /**
         * Class REST Schemas
         */
        Y.namespace( 'doccirrus.schemas' )[NAME] = {

            /* MANDATORY */
            name: NAME,

            /* MANDATORY */
            types: types,

            allowComplexUpdate: true,

            getReadOnlyFields: Y.doccirrus.schemas.calendar.getReadOnlyFieldsForCalevent,

            /**
             * Detect changes for repetition events and dispatch them into categories
             * @method detectRepetitionChanges
             * @for doccirrus.schemas.repetition
             * @param {Object} data data to check
             * @param {Object} origin calevent to compare against
             * @return {{changes: {timeSpan: boolean, repetition: boolean, other: boolean, onlySeriesTimeSpan: boolean}, index: *}}
             */
            detectRepetitionChanges: function( data, origin ) {
                var
                    mom = Y.doccirrus.commonutils.getMoment(),
                    changes = {
                        fields: {
                            severity: false,
                            userDescr: false,
                            details: false,
                            patient: false,
                            start: false,
                            end: false,
                            scheduletype: false,
                            calendar: false,
                            duration: false,
                            plannedDuration: false,
                            dtstart: false,
                            until: false,
                            repetition: false,
                            interval: false
                        },
                        timeSpan: false,
                        repetition: false,
                        other: false,
                        onlySeriesTimeSpan: false
                    },
                    result = {
                        changes: changes,
                        index: origin.index
                    },
                    patient = data.patient || undefined;

                changes.repetition = data.repetition !== origin.repetition;
                changes.timeSpan = !mom( data.until || 0 ).isSame( origin.until || 0, 'day' ) || !mom( data.dtstart ).isSame( origin.dtstart, 'day' );

                // non-repetition fields changed
                changes.other = data.severity !== origin.severity || data.userDescr !== origin.userDescr || data.details !== origin.details ||
                                patient !== origin.patient || data.start !== origin.start || data.end !== origin.end ||
                                data.scheduletype !== origin.scheduletype || data.duration !== origin.duration ||
                                data.plannedDuration !== origin.plannedDuration || data.calendar !== origin.calendar;

                changes.fields.severity = data.severity !== origin.severity;
                changes.fields.userDescr = data.userDescr !== origin.userDescr;
                changes.fields.details = data.details !== origin.details;
                changes.fields.patient = patient !== origin.patient;
                changes.fields.start = data.start !== origin.start;
                changes.fields.end = data.end !== origin.end;
                changes.fields.scheduletype = data.scheduletype !== origin.scheduletype;
                changes.fields.duration = data.duration !== origin.duration;
                changes.fields.calendar = data.calendar !== origin.calendar;
                changes.fields.plannedDuration = data.plannedDuration !== origin.plannedDuration;

                changes.fields.dtstart = !mom( data.dtstart || 0 ).isSame( origin.dtstart || 0, 'day' );
                changes.fields.until = !mom( data.until || 0 ).isSame( origin.until || 0, 'day' );
                changes.fields.repetition = data.repetition !== origin.repetition;
                changes.fields.interval = data.interval !== origin.interval;


                // only series time span changed
                changes.onlySeriesTimeSpan = changes.timeSpan && !changes.repetition && !changes.other;

                return result;
            }

        };

        Y.doccirrus.schemaloader.mixSchema( Y.doccirrus.schemas[NAME], true );
    },
    '0.0.1',
    {
        requires: [
            'dccommonutils',
            'dcvalidations',
            'dcschemaloader',
            'calendar-schema'
        ]
    }
);
