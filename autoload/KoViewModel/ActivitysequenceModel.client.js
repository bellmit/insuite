/**
 * User: pi
 * Date: 13/08/15  11:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI */

'use strict';

YUI.add( 'ActivitysequenceModel', function( Y/*, NAME */ ) {
        /**
         * @module ActivitysequenceModel
         */

        var
            KoViewModel = Y.doccirrus.KoViewModel;

        /**
         * @class ActivitysequenceModel
         * @param {Object} config
         * @constructor
         * @extends KoViewModel
         */
        function ActivitysequenceModel( config ) {
            ActivitysequenceModel.superclass.constructor.call( this, config );
        }

        ActivitysequenceModel.ATTRS = {
            validatable: {
                value: true,
                lazyAdd: false
            },
            activities: {
                value: [],
                lazyAdd: false
            }
        };

        Y.extend( ActivitysequenceModel, KoViewModel.getBase(), {
                initializer: function ActivitysequenceModel_initializer( config ) {
                    var
                        self = this;
                    self.initActivitysequence( config && config.data );
                },
                destructor: function ActivitysequenceModel_destructor() {
                },
                /**
                 * initializes address model
                 */
                initActivitysequence: function ActivitysequenceModel_initActivitysequence() {
                    var

                        self = this;
                    self.prevOrder = self.get( 'data.prevOrder' );
                    self.activities = self.get( 'activities' );
                    self.sequenceGroups = self.get( 'data.sequenceGroups' );
                },
                updateData: function( data, setNotModified ) {
                    var
                        self = this,
                        activities = data.activities;
                    delete data.activities;
                    self.set( 'data', data );
                    self.set( 'activities', activities );
                    self.initActivitysequence();
                    if( setNotModified ) {
                        self.setNotModified();
                    }

                },
                markAsDeleted: function ActivitysequenceModel_markAsDeleted() {
                    var
                        self = this;
                    self.isDeleted( true );
                },
                toJSON: function() {
                    var
                        self = this,
                        result = ActivitysequenceModel.superclass.toJSON.apply( this, arguments );
                    result.prevOrder = self.prevOrder;
                    result.activities = self.activities;
                    result.sequenceGroups = self.sequenceGroups;
                    result.activitiesId = ( self.activities ).map( function( activity ) {
                        return activity._id;
                    } );
                    return result;

                }
            },
            {
                schemaName: 'v_activitysequence',
                NAME: 'ActivitysequenceModel'
            }
        )
        ;
        KoViewModel.registerConstructor( ActivitysequenceModel );

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'activitysequence-schema',
            'v_activitysequence-schema'
        ]
    }
)
;