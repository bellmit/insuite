/**
 *  This will be mixed into the Activity KO model to allow handling of links between activities on client
 */

/*global YUI, ko, Promise */
/*eslint prefer-template:0 strict:0 */
YUI.add( 'linkedactivities-api', function( Y, NAME ) {
    'use strict';
    /**
     * @module linkedactivities-api
     */
    Y.namespace( 'doccirrus.api.linkedactivities' );
    var
        NS = Y.doccirrus.api.linkedactivities,
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable;

    /**
     * @abstract
     * @class LinkedActivitiesAPI
     * @constructor
     */
    function LinkedActivitiesAPI() {
        var self = this;

        /**
         *  The three linked activity arrays may contain plain activity objects sent from the
         *  server with currentActivity, or loaded on selection in table
         */

        self.initActivityArrays = function() {
            var self = this;

            //  set up observables and listeners to load linked activities for form mapping
            if (!self.activities) { self.activities = ko.observableArray( [] ); }
            if (!self.icds) { self.icds = ko.observableArray( [] ); }
            if (!self.icdsExtra) { self.icdsExtra = ko.observableArray( [] ); }
            if (!self.continuousIcds) { self.continuousIcds = ko.observableArray( [] ); }
            if (!self.continuousMedications) { self.continuousMedications = ko.observableArray( [] ); }
            if (!self.referencedBy) { self.referencedBy = ko.observableArray( [] ); }

            //  initialize observable linked activities array from initial set of expanded activities sent from server
            if( !self._activitiesObj ) {
                self._activitiesObj = ko.observableArray( self.get( 'activitiesObj' ) );
            }

            if( !self._icdsObj ) {
                self._icdsObj = ko.observableArray( self.get( 'icdsObj' ) );
            }

            if( !self._icdsExtraObj ) {
                self._icdsExtraObj = ko.observableArray( self.get( 'icdsExtraObj' ) );
            }

            if( !self._continuousIcdsObj ) {
                self._continuousIcdsObj = ko.observableArray( self.get( 'continuousIcdsObj' ) );
            }

            if( !self._continuousMedicationsObj ) {
                self._continuousMedicationsObj = ko.observableArray( self.get( 'continuousMedicationsObj' ) );
            }

            //  only invoice-related activities use this, used to map REMINDER, RECEIPT, WARNING1, etc
            if( !self._referencedByObj ) {
                self._referencedByObj = ko.observableArray( self.get( 'referencedByObj' ) );
            }

            //  when a form is open, any new linked activities must be downloaded and added to
            //  the appropriate _observableArray, so they can be updated in the form.  When a
            //  form is not open we'll skip this.  see: ActivitySectionFormViewModel.client.js
            self.setUpdateLinkedActivitiesOnChange( self.shouldAlwaysLoadFullLinkedActivity() );

            self.initSubscribeToArrays();
        };

        self.setUpdateLinkedActivitiesOnChange = function(value){
            var self = this;
            self._updateLinkedActivitiesOnChange = value;
            self.skipAfterLinkActivity = value;
        };

        self.shouldAlwaysLoadFullLinkedActivity = function(){
            var
                self = this,
                actType = peek( self.actType );

            return Y.doccirrus.schemas.activity.isPrescriptionType( actType ) || 'REFERRAL' === actType;
        };

        /**
         *  When the selection of linked activities changes (user checking rows of table) the
         *  full activities must be loaded from the server to map into forms.
         *
         *  This can be skipped if a form is not open ( _updateLinkedActivitiesOnChange === false )
         */

        self.initSubscribeToArrays = function() {
            var self = this;

            self.addDisposable( self.activities.subscribe( function onActivitiesChange() {
                if ( false === self._updateLinkedActivitiesOnChange ) { return; }
                self.ensureLoaded( self.activities(), self._activitiesObj, 'activitiesObj' );
            } ) );

            self.addDisposable( self.icds.subscribe( function onIcdsChange() {
                if ( false === self._updateLinkedActivitiesOnChange ) { return; }
                self.ensureLoaded( self.icds(), self._icdsObj, 'icdsObj' );
            } ) );

            self.addDisposable( self.icdsExtra.subscribe( function onIcdsExtraChange() {
                if ( false === self._updateLinkedActivitiesOnChange ) { return; }
                self.ensureLoaded( self.icdsExtra(), self._icdsExtraObj, 'icdsExtra' );
            } ) );

            self.addDisposable( self.icdsExtra.subscribe( function onContinuousDiagnosesChange() {
                if ( false === self._updateLinkedActivitiesOnChange ) { return; }
                self.ensureLoaded( self.continuousIcds(), self._continuousIcdsObj, 'continuousIcdsObj' );
                self.ensureLoaded( self.continuousMedications(), self._continuousMedicationsObj, 'continuousMedicationsObj' );
            } ) );

            self.addDisposable( self.referencedBy.subscribe( function onReferencedByChange() {
                if ( false === self._updateLinkedActivitiesOnChange ) { return; }
                self.ensureLoaded( self.referencedBy(), self._referencedByObj, 'referencedByObj' );
            } ) );
        };

        /**
         *  Ensure all linked activities, icds, icdsExtra and continuous diagnoses referred to by self are loaded
         *
         *  @returns {Object}   Promise to load all outstanding linked activities
         */

        self.loadLinkedActivities = function() {
            var
                self = this,
                promisesToDownload =  [
                    self.ensureLoaded( self.activities(), self._activitiesObj, 'activitiesObj' ),
                    self.ensureLoaded( self.icds(), self._icdsObj, 'icdsObj' ),
                    self.ensureLoaded( self.icdsExtra(), self._icdsExtraObj, 'icdsExtraObj' ),
                    self.ensureLoaded( self.continuousIcds(), self._continuousIcdsObj, 'continuousIcdsObj' ),
                    self.ensureLoaded( self.continuousMedications(), self._continuousMedicationsObj, 'continuousMedicationsObj' )
                ];

            function onLinkedDownloadError( err ) {
                Y.log( 'Could not download linked activities: ' + JSON.stringify( err ), 'warn', NAME );
            }

            return Promise.all( promisesToDownload ).catch( onLinkedDownloadError );
        };

        /**
         *  Given a set if activity _ids and an observable array, download and instantiate any
         *  activities not already in the array
         *
         *  @param  {object}    ids         Plain array of activity _ids
         *  @param  {Function}  obsArray    Observable array of KO ActivityModels
         *  @param  {String}    type        type of linked activity.(icdsObj or activitiesObj)
         *  @return {Object}                Promise
         */
        self.ensureLoaded = function( ids, obsArray, type ) {
            var
                self = this,
                actType = unwrap( self.actType );

            return new Promise( function( resolve, reject ) {
                var

                    toDownload = [],
                    obsArrayPlain = obsArray() || [],
                    readQuery = { query: { _id: { $in: toDownload } } },
                    i;

                if ( !Y.doccirrus.schemas.activity.isInvoiceCommunicationActType( actType ) && type === 'referencedBy' ) {
                    //  skip loading of referencedBy unless this is a child of an invoice (WARNING, RECEIPT, etc)
                    return resolve( true );
                }

                if (!type) {
                    Y.log( 'Type not passed to activity-api.ensureLoaded', 'warn', NAME );
                    return resolve( false );
                }

                //  note any linked activities which are not yet downloaded
                ids.forEach( function checkActivity( id ) {
                    var found;
                    found = obsArray().some( function( linkedActivity ) {
                        return unwrap( linkedActivity._id ) === id;
                    } );
                    if( !found ) {
                        toDownload.push( id );
                    }
                } );

                //  remove any activities which have been deselected
                for ( i = obsArrayPlain.length; i > 0; i-- ) {
                    if( -1 === ids.indexOf( unwrap( obsArrayPlain[i - 1]._id.toString() ) ) ) {
                        Y.log( 'discarding unlinked activity (plain ' + ( i - 1 ) + '):' + unwrap( obsArrayPlain[i - 1]._id ), 'debug', NAME );
                        obsArrayPlain.splice( (i - 1), 1 );
                    }
                }

                //  if all linked activities are already in the observable array then we're done
                if( toDownload.length === 0 ) {
                    obsArray( obsArrayPlain );
                    return resolve( true );
                }

                Y.log( 'need to download the following activities: ' + JSON.stringify( toDownload ), 'debug', NAME );

                Y.doccirrus.jsonrpc.api.activity
                    .read( readQuery )
                    .then( onReadActivities )
                    .fail( reject );

                function onReadActivities( data ) {
                    var
                        //  NOTE: calling afterLinkedActivity is very slow for large batches, due to repeated self.set() calls
                        //  Here we preload the array
                        populatedObj = self.get( type ) || [],
                        i, j;

                    data = data.data ? data.data : data;
                    Y.log( 'downloaded ' + data.length + ' activities', 'debug', NAME );

                    //  MOJ-7633 add linked activities in order of requested _id
                    for ( i = 0; i < toDownload.length; i++ ) {
                        for ( j = 0; j < data.length; j++ ) {
                            if( toDownload[i] === data[ j ]._id ) {
                                addToExistingArray( populatedObj, data[ j ] );
                                addToExistingArray( obsArrayPlain, data[ j ] );
                            }
                        }
                    }

                    obsArray( obsArrayPlain );
                    self.set( type, populatedObj );
                    resolve( true );
                }

                function addToExistingArray( plainAry, fullLinkedActivity ) {
                    var found = false, i;

                    //  can happen if activity is disposed / replaced while waiting for JSONRPC
                    if ( 'undefined' === typeof plainAry ) { return; }

                    for ( i = 0; i < plainAry.length; i++ ) {
                        if ( plainAry[i]._id === fullLinkedActivity._id ) {
                            plainAry[i] = fullLinkedActivity;
                            found = true;
                        }
                    }

                    if ( !found ) {
                        plainAry.push( fullLinkedActivity );
                    }
                }

            } );
        };


        /**
         * Is called when activity is unlinked.
         * @param {String} activityId
         * @returns {boolean}
         * @private
         */
        self._unlinkActivity = function( activityId, activity ) {
            var
                self = this,
                icdsObj = self.get( 'icdsObj' ),
                activitiesObj = self.get( 'activitiesObj' ),
                icds = peek( self.icds ) || [],
                activities = peek( self.activities ) || [],
                receipts = peek( self.receipts ) || [],
                canUnlink = true;

            function removeById( act ) {
                return act._id !== activityId;
            }

            //  allow activity model to handle special cases
            if ( self.onActivityUnlinked ) {
                canUnlink = self.onActivityUnlinked( activityId );
            }

            if ( !canUnlink || !self._isEditable() ) { return false; }

            if( -1 !== receipts.indexOf( activityId ) ) {
                self.receipts.remove( activityId );
            }

            if( -1 !== icds.indexOf( activityId ) ) {
                icdsObj = icdsObj.filter( removeById );
                self.set( 'icdsObj', icdsObj );
                self.icds.remove( activityId );
            }

            if( -1 !== activities.indexOf( activityId ) ) {
                activitiesObj = activitiesObj.filter( removeById );
                self.activities.remove( activityId );
                self.set( 'activitiesObj', activitiesObj );
            }

            if( activity && 'TREATMENT' === activity.actType && 'TREATMENT' === self.actType() && self.hierarchyRules ) {
                self.hierarchyRules().forEach( function( rule ) {
                    if( rule.seq === activity.code ) {
                        rule.checked = false;
                    }
                });
            }

            return canUnlink;
        };


        /**
         * Remove a whole set of linked activities
         *
         * This is called by unlinking a whole page of results by uncheking the 'link all' checkbox
         *
         * Removing activities as a batch helps prevent UI lockup due to self.set and multiple remap
         * of forms.
         *
         * @param activities
         * @returns {boolean}
         * @private
         */

        self._unlinkActivitiesBatch = function( activities ) {
            var
                self = this,
                currentActivityActType = unwrap( self.actType ),

                activitiesObj = self.get( 'activitiesObj' ),
                icdsObj = self.get( 'icdsObj' ),

                //  we add to a plain array to prevent listeners for firing for every link we remove
                activitiesPlain = self.activities(),
                icdsPlain = self.icds(),
                act,
                i;

            //  receipts are a special case in beling linked / unlinked after approval
            if( !self._isEditable() ) {
                Y.log( 'activity is not editable, not unlinking activities', 'warn', NAME );
                return false;
            }

            //  check if an activity is already in the given array of linked activities
            function isNewToArray( act, ary ) {
                var i;
                for ( i = 0; i < ary.length; i++ ) {
                    if ( ary[i]._id.toString() && act._id.toString() && ary[i]._id.toString() === act._id.toString() ) {
                        return false;
                    }
                }
                return true;
            }

            function removeFromArray( act, ary ) {
                var i, newAry = [];
                for ( i = 0; i < ary.length; i++ ) {
                    if ( ary[i]._id && ary[i]._id.toString() !== act._id.toString() ) {
                        newAry.push( ary[i] );
                    }
                }
                return newAry;
            }

            function removeFromIdsArray( _id, ary ) {
                var i, newAry = [];
                for (i = 0; i < ary.length; i++) {
                    if ( ary[i] !== _id ) {
                        newAry.push( ary[i] );
                    }
                }

                return newAry;
            }

            for (i = activities.length; i > 0; i--) {
                act = activities[i - 1];

                if( 'DIAGNOSIS' === act.actType && currentActivityActType ) {
                    if (!self.skipAfterLinkActivity && !isNewToArray(act, icdsObj)) {
                        icdsObj = removeFromArray(act, icdsObj);
                    }
                    if (-1 !== icdsPlain.indexOf(act._id.toString())) {
                        //self.icds.remove( act._id.toString() );
                        icdsPlain = removeFromIdsArray(act._id.toString(), icdsPlain); // splice( icdsPlain.indexOf( act._id.toString() ), 1 )

                        //  allow actType models to respond
                        if (self.onActivityUnlinked) {
                            self.onActivityUnlinked(act._id.toString());
                        }
                    }
                } else if( 'RECEIPT' === act.actType && ( 'INVOICE' === currentActivityActType || 'INVOICEREF' === currentActivityActType ) ) {
                    //  special case for unlinking receipts
                    if ( self.onActivityUnlinked ) { self.onActivityUnlinked( act._id.toString() ); }

                } else {

                    if( !self.skipAfterLinkActivity && !isNewToArray( act, activitiesObj ) ) {
                        activitiesObj = removeFromArray( act, activitiesObj );
                    }
                    if( -1 !== activitiesPlain.indexOf( act._id.toString() ) ) {
                        //console.log( 'removing from activites _id array: ' + act._id.toString(), activitiesPlain );
                        //self.activities.remove( act._id.toString() );
                        //activitiesPlain.splice( activitiesPlain.indexOf( act._id.toString() ), 1 )
                        activitiesPlain =  removeFromIdsArray( act._id.toString(), activitiesPlain );

                        //  allow actType models to respond
                        if ( self.onActivityUnlinked ) { self.onActivityUnlinked( act._id.toString() ); }
                    }
                }

            }

            self.icds( icdsPlain );
            self.activities( activitiesPlain );
            // - note effective duplication here
            self.set( 'activitiesObj', activitiesObj );
            self.set( 'icdsObj', icdsObj );
        };

        self.skipAfterLinkActivity = null;

        /**
         *  Is called when activity is linked
         *  @param {Object} activity
         *  @param {String} type
         */

        self.afterLinkActivity = function( activity, type ) {
            var
                self = this,
                populatedArray = self.get( type ),
                isNew;
            isNew = !populatedArray.some( function( populatedObj, index ) {
                if( populatedObj._id === activity._id ) {
                    if( Object.keys( populatedObj ).length < Object.keys( activity ).length ) {
                        populatedArray[ index ] = activity;
                    }
                    return true;
                }
                return false;
            } );
            if( isNew ) {
                populatedArray.push( activity );
            }
            self.set( type, populatedArray );
        };

        /**
         *  Is called when activity is linked.
         *
         *  TODO: allow models to use an asynchronous function to preempt linking / unlinking
         *
         *  @param {Object}     activity        activity data, plain object
         *  @param {Boolean}    [forceSelect]   select element even if it can not be selected
         *  @returns {boolean}
         *  @private
         */

        self._linkActivity = function( activity, forceSelect ) {
            var
                self = this,
                isEditable = unwrap( self._isEditable ),
                currentActivityActType = unwrap( self.actType ),

                //  special case for assigning receipts from current invoice, which can be linked after approval
                //  (also allowed for creditnotes, bad debt, warning costs, etc since EXTMOJ-2034)
                //  TODO: move logic for special cases onto activity models, is their own business logic
                specialCaseInvoice = (  Y.doccirrus.schemas.activity.isInvoiceCommunicationActType( activity.actType ) && ( 'INVOICE' === currentActivityActType || 'INVOICEREF' === currentActivityActType) ),
                //  special case for receipts to link backwards to invoices, will be corrected on save MOJ-9777
                // extended for more activities can be linked to INVOICE
                specialCaseReceipt = ( ( 'INVOICE' === activity.actType || 'INVOICEREF' === activity.actType ) && Y.doccirrus.schemas.activity.isInvoiceCommunicationActType( currentActivityActType ) ),

                binder = self.get( 'binder' ),
                currentPatient = ko.unwrap( binder.currentPatient ),
                currentCaseFolder = currentPatient.caseFolderCollection.getActiveTab(),
                isSwissCaseFolder = Y.doccirrus.schemas.casefolder.isSwissCaseFolderType( currentCaseFolder.type ),
                linkableTypes,
                canBeSelected;

            if ( activity._id === unwrap( self._id ) ) {
                Y.log( 'Cannot link activity to itself.', 'warn', NAME );
                return false;
            }

            //  special case for receipts, which can be assigned to invoices after approval
            if( false === isEditable && !specialCaseInvoice ) {
                return false;
            }

            //  any child activity may attached until an act type is set - MOJ-6111
            if ( !currentActivityActType || '' === currentActivityActType ) {
                forceSelect = true;
            }

            linkableTypes = Y.doccirrus.schemas.activity.linkAllowedFor( currentActivityActType );
            canBeSelected = ( -1 !== linkableTypes.indexOf( activity.actType ) );

            //  give the activity model a chance to veto this
            if ( ( canBeSelected || specialCaseReceipt ) && self.onActivityLinked ) {
                canBeSelected = self.onActivityLinked( activity );
            }

            if ( ( canBeSelected || forceSelect ) && ( activity && activity._id && activity._id.toString() ) ){
                if( 'DIAGNOSIS' === activity.actType && currentActivityActType ){
                    if( !self.skipAfterLinkActivity ) {
                        self.afterLinkActivity( activity, 'icdsObj' );
                    }
                    if( -1 === self.icds().indexOf( activity._id.toString() ) ) {
                        self.icds.push( activity._id.toString() );
                    }
                } else if( Y.doccirrus.schemas.activity.isInvoiceCommunicationActType( activity.actType ) && ( 'INVOICE' === currentActivityActType || 'INVOICEREF' === currentActivityActType ) ) {
                    //  special case for linking receipts
                    if ( -1 === self.receipts.indexOf( activity._id.toString() ) ) {
                        self.receipts.push( activity._id.toString() );
                    }
                } else if( isSwissCaseFolder && 'TREATMENT' === activity.actType && 'TREATMENT' === self.actType() && self.hierarchyRules ) {
                    self.hierarchyRules().forEach( function( rule ) {
                        if( rule.seq === activity.code ) {
                            rule.checked = true;
                        }
                    });
                } else {
                    if( !self.skipAfterLinkActivity ) {
                        self.afterLinkActivity( activity, 'activitiesObj' );
                    }

                    if( -1 === self.activities().indexOf( activity._id.toString() ) ) {
                        self.activities.push( activity._id.toString() );
                        //  allow actType models to respond
                        //if ( self.onActivityLinked ) { canBeSelected = self.onActivityLinked( activity ); }
                    }
                }

            }

            return canBeSelected;
        };

        /**
         *  Link a whole set of activities
         *
         *  This is called when creating a new activity or adding a whole page of activities with the 'link all'
         *  checkbox in inCase.
         *
         *  The self.set operation is taking a very long time when there are many linked activities (~100),
         *  Adding as a batch makes this more manageable
         *
         *  @param      {Object}    activities          Array of plain activity objects
         *  @param      {String}    caseFolderType      Type of caseFolder with current activity
         *  @returns    {Boolean}
         *  @private
         */

        self._linkActivitiesBatch = function( activities, caseFolderType ) {
            var
                self = this,
                isEditable = unwrap( self._isEditable ),
                currentActivityActType = unwrap( self.actType ),
                noActType = ( !currentActivityActType || '' === currentActivityActType ),
                linkableTypes = Y.doccirrus.schemas.activity.linkAllowedFor( currentActivityActType ),
                isSwissCaseFolder = Y.doccirrus.schemas.casefolder.isSwissCaseFolderType( caseFolderType ),
                activitiesObj = self.get( 'activitiesObj' ),
                icdsObj = self.get( 'icdsObj' ),

                //  we add to a plain array to prevent listeners for firing for every link we add
                activitiesPlain = self.activities(),
                icdsPlain = self.icds ? self.icds() : [],

                canBeSelected,
                act,
                i;

            if( false === isEditable ) {
                return false;
            }

            if( !self.icds || 'function' !== typeof self.icds ) {
                self.icds = ko.observableArray( [] );
            }

            //  check if an activity is already in the given array of linked activities
            function isNewToArray( act, ary ) {
                var i;
                for (i = 0; i < ary.length; i++ ) {
                    if ( ary[i]._id && act._id && ary[i]._id === act._id ) {
                        return false;
                    }
                }
                return true;
            }

            if( 'INVOICE' === currentActivityActType || 'INVOICEREF' === currentActivityActType ) {
                activities = activities.filter( function( activity ) {
                    return 'CANCELLED' !== activity.status;
                } );
            }
            if( 'INVOICE' === currentActivityActType ) {
                if( ( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() && !isSwissCaseFolder ) || !Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                    activities = activities.filter( function( activity ) {
                        return 'MEDICATION' !== activity.actType;
                    } );
                }
            }

            for (i = 0; i < activities.length; i++) {
                act = activities[i];

                if ( act._id === unwrap( self._id ) ) {
                    Y.log( 'Cannot make activity its own parent.', 'warn', NAME );
                    continue;
                }

                canBeSelected = ( -1 !== linkableTypes.indexOf( act.actType ) );

                //  MOJ-7843: When adding treatments to invoices, check that the treatment is VALID or APPROVED
                if ( ( 'INVOICEREF' === currentActivityActType || 'INVOICE' === currentActivityActType ) && 'TREATMENT' === act.actType ) {
                    if( act.invoiceLogId || (act.invoiceId && (unwrap( self._id ) !== act.invoiceId)) ||
                        'VALID' !== act.status && 'APPROVED' !== act.status ) {
                        canBeSelected = false;
                    }
                    if ( act.areTreatmentDiagnosesBillable && '0' === act.areTreatmentDiagnosesBillable ) {
                        //  TREATMENT marked not billable, don't add it to bill
                        canBeSelected = false;
                    }
                }

                if ( ( 'INVOICEREF' === currentActivityActType || 'INVOICE' === currentActivityActType ) && 'DIAGNOSIS' === act.actType ) {
                    if ( act.diagnosisTreatmentRelevance && 'DOKUMENTATIV' === act.diagnosisTreatmentRelevance ) {
                        //  DIAGNOSIS marked documentative only, not relevant to billable treatment
                        canBeSelected = false;
                    }
                }

                if( 'LOCKED' === act.status ) {
                    canBeSelected = false;
                }

                //  give the activity model a chance to veto this
                if ( canBeSelected && self.onActivityLinked ) {
                    canBeSelected = self.onActivityLinked( act );
                }

                //  if an activity link was blocked, allow the activity model to notify the user or otherwise respond MOJ-9777
                if ( !canBeSelected && self.onActivityLinkBlocked ) {
                    canBeSelected = self.onActivityLinkBlocked( act );
                }

                if( canBeSelected || noActType ) {
                    if( 'DIAGNOSIS' === act.actType && currentActivityActType ){
                        if( !self.skipAfterLinkActivity && isNewToArray( act, icdsObj )) {
                            icdsObj.push( act );
                        }
                        if( -1 === icdsPlain.indexOf( act._id.toString() ) ) {
                            //self.icds.push( act._id.toString() );
                            icdsPlain.push( act._id.toString() );
                        }
                    } else if( 'RECEIPT' === act.actType && ( 'INVOICE' === currentActivityActType || 'INVOICEREF' === currentActivityActType ) ) {
                        //  special case for linking receipts
                        if ( -1 === self.receipts.indexOf( act._id.toString() ) ) {
                            self.receipts.push( act._id.toString() );
                        }
                    } else {
                        if( !self.skipAfterLinkActivity && isNewToArray( act, activitiesObj ) ) {
                            activitiesObj.push( act );
                        }
                        if( -1 === activitiesPlain.indexOf( act._id.toString() ) ) {
                            //self.activities.push( act._id.toString() );
                            activitiesPlain.push( act._id.toString() );
                        }
                    }
                }
            }

            self.set( 'activitiesObj', activitiesObj );
            self.set( 'icdsObj', icdsObj );
            self.activities( activitiesPlain );
            self.icds( icdsPlain );
        };

        /**
         *  Discard the current set of linked activity objects and reload from server
         *  Used when linked activities may have been changed on server after save.
         *
         *  @return {Object}
         *  @private
         */

        self._reloadLinkedActivities = function() {
            var self = this;

            //  discard current sets of full linked activities
            self.set( 'activitiesObj', [] );
            self._activitiesObj( [] );
            self.set( 'icdsObj', [] );
            self._icdsObj( [] );
            self.set( 'icdsExtraObj', [] );
            self._icdsExtraObj( [] );

            return self.loadLinkedActivities();
        };

    }

    /**
     * @method getFormBasedActivityAPI
     * @returns {Object}
     */
    NS.getLinkedActivitiesAPI = function() {
        return new LinkedActivitiesAPI();
    };

}, '3.16.0', {
    requires: [
        'oop',
        'promise',

        'JsonRpcReflection-doccirrus',
        'JsonRpc',

        'dc-comctl',
        'dcinfrastructs'
    ]
} );
