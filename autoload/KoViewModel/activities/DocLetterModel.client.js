/**
 * User: pi
 * Date: 17/02/16  16:10
 * (c) 2016, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'DocLetterModel', function( Y, NAME ) {
        /**
         * @module DocLetterModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel,
            FormBasedActivityModel = KoViewModel.getConstructor( 'FormBasedActivityModel' );

        /**
         * @class DocLetterModel
         * @constructor
         * @extends FormBasedActivityModel
         */
        function DocLetterModel( config ) {
            DocLetterModel.superclass.constructor.call( this, config );
        }

        DocLetterModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            }
        };

        Y.extend( DocLetterModel, FormBasedActivityModel, {

                initializer: function DocLetterModel_initializer() {
                    var
                        self = this;
                    self.initDocLetterModel();
                },
                destructor: function DocLetterModel_destructor() {
                },
                initDocLetterModel: function DocLetterModel_initDocLetterModel() {
                },
                /**
                 *  Raised when linked activity is checked in the table
                 *
                 *  Used to add children of linked MEDICATIONPLAN activities, MOJ-10758
                 *
                 *  Might move this logic to linkedactivities-api.client.js if needed by other activity types.
                 */

                onActivityLinked: function( activity ) {
                    var
                        self = this,
                        currentLinked = ko.unwrap( self.activities ),
                        i;

                    //  Only if DOCLETTER is editable

                    if ( !self._isEditable() ) {
                        return false;
                    }

                    //  Special case for MEDICATIONPLAN

                    if ( 'MEDICATIONPLAN' === activity.actType ) {
                        Y.log( 'Linking MEDICATIONPLAN to DOCLETTER: ' + JSON.stringify( activity.activities ), 'debug', NAME );
                        for ( i = 0; i < activity.activities.length; i++ ) {
                            //  add medications only if they are not already linked
                            if ( -1 === currentLinked.indexOf( activity.activities[i] ) ) {
                                Y.log( 'Adding linked activity of medicationplan: ' + activity.activities[i], 'info', NAME );
                                self.activities.push( activity.activities[i] );
                            }
                        }
                    }

                    return true;
                },

                /**
                 *  Get full linked activity given activity _id, might move this to linkedactivities-api.client.js
                 *  @param activityId
                 */

                _getLinkedActivityObj: function( activityId ) {
                    var
                        self = this,
                        activitiesObj = ko.unwrap( self._activitiesObj ),
                        i;

                    //  At this point the actviity is still in _activitiesObj
                    for ( i = 0; i < activitiesObj.length; i++ ) {
                        if ( activitiesObj[i]._id === activityId ) {
                            return activitiesObj[i];
                        }
                    }
                },

                /**
                 *  Raised when linked activity is unchecked in the table
                 *
                 *  At this point the linked activity is still in self._activitiesObj
                 *
                 *  @param activityId
                 */

                onActivityUnlinked: function( activityId ) {
                    var
                        self = this,
                        activity = self._getLinkedActivityObj( activityId ),
                        currentLinked = ko.unwrap( self.activities ),
                        i;

                    if ( !activity ) {
                        //  some other kind of link, not in activities array, eg, icdsExtra
                        return self._isEditable();
                    }

                    //  MOJ-: unlink medications of medicationplan
                    if ( activity && 'MEDICATIONPLAN' === activity.actType ) {
                        for ( i = 0; i < activity.activities.length; i++ ) {

                            //  if a an activity linked by the medicationplan is also linked by the docletter, unlink it too
                            if ( -1 !== currentLinked.indexOf( activity.activities[i] ) ) {
                                Y.log( 'Unlinking child activity along with medicationplan: ' + activity.activities[i], 'debug', NAME );
                                self._unlinkActivity( activity.activities[i] );
                            }

                        }
                    }

                    return self._isEditable();
                }
            },
            {
                schemaName: 'v_docletter',
                NAME: 'DocLetterModel'
            }
        );

        KoViewModel.registerConstructor( DocLetterModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'FormBasedActivityModel',
            'v_docletter-schema'
        ]
    }
)
;