/*global YUI, ko */
YUI.add( 'QuotationTreatmentsHandler', function( Y ) {
    'use strict';
    /**
     * @module QuotationTreatmentsHandler
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        ignoreDependencies = ko.ignoreDependencies,

        i18n = Y.doccirrus.i18n,
        readOnlyStates = Y.doccirrus.schemas.activity.readOnlyStates,
        KoViewModel = Y.doccirrus.KoViewModel,
        QuotationModel = KoViewModel.getConstructor( 'QuotationModel' );

    /**
     * Builds an "assemblage"
     * @param treatment
     * @returns {{_id: string, treatment: object, editorModel: {billingFactorValue, price, readOnly: boolean, actualPrice: number, userModified: {billingFactorValue, price}, reset: function}}}
     */
    function toQuotationTreatmentAssemblage( treatment ) {
        var
            id = treatment._id,
            actualPrice = QuotationModel.getActualPrice( treatment ),
            billingFactorValue = QuotationModel.getBillingFactorValue( treatment, actualPrice ),
            result = {
                _id: id,
                treatment: treatment,
                editorModel: {
                    billingFactorValueInitial: billingFactorValue,
                    billingFactorValue: ko.observable( billingFactorValue ),
                    price: ko.observable( treatment.price ),
                    readOnly: -1 !== readOnlyStates.indexOf( treatment.status ),
                    actualPrice: actualPrice,
                    userModified: {
                        billingFactorValue: ko.observable( false ),
                        price: ko.observable( false )
                    },
                    reset: function() {
                        result.editorModel.billingFactorValue( billingFactorValue );
                        result.editorModel.price( treatment.price );
                    }
                }
            };
        return result;
    }

    /**
     * @class QuotationTreatmentsHandler
     * @constructor
     * @extends ActivityEditorModel
     */
    function QuotationTreatmentsHandler( config ) {
        QuotationTreatmentsHandler.superclass.constructor.call( this, config );
    }

    Y.extend( QuotationTreatmentsHandler, KoViewModel.getDisposable(), {
        /** @private **/
        initializer: function() {
            var
                self = this;

            self._initQuotationTreatmentsHandler();
        },
        /** @private **/
        destructor: function() {
            var
                self = this;

            self._destroyQuotationTreatmentsHandler();
        },
        /** @private **/
        _initQuotationTreatmentsHandler: function() {
            var
                self = this;

            self._initNotifyUsersAboutToEditTreatment();
            self._initQuotationTreatmentAssemblages();
            self._initUserModified();
            self._initTotal();
            self._initEditableAssemblages();
            self._initModifiedAssemblages();
        },
        /** @private **/
        _destroyQuotationTreatmentsHandler: function() {
            var
                self = this;

            self._destroyNotifyUsersAboutToEditTreatment();
        },
        /**
         * Array of assembled treatment objects in sync with checked activities.
         * @type {ko.observableArray}
         */
        quotationTreatmentAssemblages: null,
        /** @private **/
        _initQuotationTreatmentAssemblages: function() {
            var
                self = this,
                currentActivity = peek( self.get( 'currentActivity' ) );

            self.quotationTreatmentAssemblages = ko.observableArray();

            // subscribe for notifying users about to edit treatment
            self.addDisposable( self.quotationTreatmentAssemblages.subscribe( function( states ) {

                states.forEach( function( state ) {
                    var
                        assemblage = state.value,
                        editorModel = assemblage.editorModel;

                    if( editorModel.readOnly ) {
                        return;
                    }

                    switch( state.status ) {
                        case 'added':
                            self._addNotifyUsersAboutToEditTreatment( assemblage._id );
                            break;
                        case 'deleted':
                            self._removeNotifyUsersAboutToEditTreatment( assemblage._id );
                            break;
                    }
                } );

            }, null, 'arrayChange' ) );

            // handle items to add /remove from observableArray
            self.quotationTreatmentAssemblages( peek( currentActivity._activitiesObj ).map( toQuotationTreatmentAssemblage ) );
            self.addDisposable( currentActivity._activitiesObj.subscribe( function( states ) {
                var
                    quotationTreatmentAssemblagesMap = peek( self.quotationTreatmentAssemblages ).reduce( function( result, current ) {
                        result[current._id] = current;
                        return result;
                    }, {} );

                states.forEach( function( state ) {
                    var
                        treatment = state.value,
                        found = quotationTreatmentAssemblagesMap[treatment._id];

                    switch( state.status ) {
                        case 'added':
                            self.quotationTreatmentAssemblages.push( toQuotationTreatmentAssemblage( treatment ) );
                            break;
                        case 'deleted':
                            self.quotationTreatmentAssemblages.remove( found );
                            break;
                        // order doesn't matter
                    }
                } );
            }, null, 'arrayChange' ) );
        },
        /**
         * Holds observables to know about what was modified by the user.
         * @type {object}
         */
        userModified: null,
        /** @private **/
        _initUserModified: function() {
            var
                self = this;

            self.userModified = {
                total: ko.observable( false ),
                table: ko.observable( false ),
                /**
                 * Convenient method to toggle that total was modified by the user.
                 */
                setUserModifiedTotal: function() {
                    var
                        assemblages = unwrap( self.quotationTreatmentAssemblages ),
                        userModified = self.userModified;

                    assemblages.forEach( function( assemblage ) {
                        var
                            editorModel = assemblage.editorModel;

                        editorModel.userModified.billingFactorValue( false );
                        editorModel.userModified.price( false );

                    } );
                    userModified.table( false );
                    userModified.total( true );
                },
                /**
                 * Convenient method to toggle that something in the table was modified by the user.
                 * @param {object} assemblage The item that was modified.
                 * @param {string} propertyName The property name of the item that was modified.
                 */
                setUserModifiedTable: function( assemblage, propertyName ) {
                    var
                        userModified = self.userModified,
                        editorModel = assemblage.editorModel;

                    userModified.total( false );
                    userModified.table( true );

                    switch( propertyName ) {
                        case 'billingFactorValue':
                            editorModel.userModified.price( false );
                            editorModel.userModified.billingFactorValue( true );
                            break;
                        case 'price':
                            editorModel.userModified.billingFactorValue( false );
                            editorModel.userModified.price( true );
                            break;
                    }
                }
            };
        },
        /**
         * Holds initial and observable current total values.
         * @type {object}
         */
        total: null,
        /** @private **/
        _initTotal: function() {
            var
                self = this;

            self.total = {
                initial: null,
                current: ko.observable(),
                extent: ko.observable( -1 ),
                readOnly: null,
                calculate: function() { // TODO: move root
                    var
                        total = self.total,
                        assemblages = unwrap( self.quotationTreatmentAssemblages ),
                        totalCurrent = 0;

                    assemblages.forEach( function( assemblage ) {
                        var
                            treatment = assemblage.treatment,
                            editorModel = assemblage.editorModel;

                        if( editorModel.readOnly ) {
                            totalCurrent = Y.doccirrus.comctl.dcSum( totalCurrent, treatment.price );
                        }
                        else {
                            totalCurrent = Y.doccirrus.comctl.dcSum( totalCurrent, unwrap( editorModel.price ) );
                        }

                    } );

                    total.current( totalCurrent );

                }
            };
            self.addDisposable( ko.computed( function() {
                var
                    assemblages = [].concat( unwrap( self.quotationTreatmentAssemblages ) );

                ignoreDependencies( function() {
                    var
                        totalInitial = 0,
                        totalReadOnly = 0,
                        hasTableModifications = false;

                    assemblages.forEach( function( assemblage ) {
                        var
                            treatment = assemblage.treatment,
                            editorModel = assemblage.editorModel,
                            userModified = editorModel.userModified;

                        if( Y.Lang.isNumber( treatment.price ) ) {
                            totalInitial = Y.doccirrus.comctl.dcSum( totalInitial, treatment.price );
                        }

                        if( editorModel.readOnly ) {
                            totalReadOnly = Y.doccirrus.comctl.dcSum( totalReadOnly, treatment.price );
                        }

                        if( unwrap( userModified.billingFactorValue ) || unwrap( userModified.price ) ) {
                            hasTableModifications = true;
                        }

                    } );

                    self.total.initial = totalInitial;
                    self.total.readOnly = totalReadOnly;

                    // total should be explicitly reseted, regardless of it was set by the user
                    self.userModified.total( false );
                    if( hasTableModifications ) {
                        self.total.calculate();
                    }
                    else {
                        // reset modifications done by calculating changes for each treatment when total was set by user
                        self.reset();

                        self.total.current( totalInitial );
                    }

                } );

            } ).extend( {rateLimit: 0} ) );
        },
        /**
         * Array of editable assemblages.
         * @type {ko.computed}
         */
        editableAssemblages: null,
        /** @private **/
        _initEditableAssemblages: function() {
            var
                self = this;

            self.editableAssemblages = self.addDisposable( ko.computed( function() {
                var
                    assemblages = unwrap( self.quotationTreatmentAssemblages );

                return assemblages.filter( function( assemblage ) {
                    return !assemblage.editorModel.readOnly;
                } );
            } ).extend( {rateLimit: 0} ) );
        },
        /**
         * @private
         * @type {object}
         */
        _notifyUsersAboutToEditTreatment: null,
        /** @private **/
        _initNotifyUsersAboutToEditTreatment: function() {
            var
                self = this;

            if( !self._notifyUsersAboutToEditTreatment ) {

                self._notifyUsersAboutToEditTreatment = {};
            }
        },
        /** @private **/
        _destroyNotifyUsersAboutToEditTreatment: function() {
            var
                self = this;

            if( self._notifyUsersAboutToEditTreatment ) {

                Y.each( self._notifyUsersAboutToEditTreatment, function( value, key ) {
                    self._removeNotifyUsersAboutToEditTreatment( key );
                } );
                self._notifyUsersAboutToEditTreatment = null;
            }
        },
        /**
         * Adds listening to treatment id that is about to be edited and vice versa notifies others current user is about to edit that id.
         * @param {string} id
         * @private
         */
        _addNotifyUsersAboutToEditTreatment: function( id ) {
            var
                self = this;

            if( self._notifyUsersAboutToEditTreatment && !self._notifyUsersAboutToEditTreatment[id] ) {
                self._notifyUsersAboutToEditTreatment[id] = {
                    notifyIfCollectionHasSubscriber: Y.doccirrus.communication.notifyIfCollectionHasSubscriber( {
                        collection: 'activity',
                        documentId: id
                    } ),
                    subscribeCollectionId: Y.doccirrus.communication.subscribeCollectionId( {
                        collection: 'activity',
                        documentId: id,
                        options: {skipCurrentUser: true},
                        callback: function( data, meta ) {
                            var
                                text = Y.Lang.sub( i18n( 'activityModel_clientJS.message.ACTIVITY_UPDATED' ), {username: meta.username} );

                            Y.doccirrus.DCSystemMessages.removeMessage( Y.doccirrus.communication.EVENTS.SUBSCRIBE_COLLECTION );
                            Y.doccirrus.DCSystemMessages.addMessage( {
                                messageId: Y.doccirrus.communication.EVENTS.SUBSCRIBE_COLLECTION,
                                content: text,
                                level: 'WARNING'
                            } );
                        }
                    } )
                };
            }
        },
        /**
         * Removes listening to treatment id that was about to be edited.
         * @param {string} id
         * @private
         */
        _removeNotifyUsersAboutToEditTreatment: function( id ) {
            var
                self = this;

            if( self._notifyUsersAboutToEditTreatment && self._notifyUsersAboutToEditTreatment[id] ) {
                self._notifyUsersAboutToEditTreatment[id].notifyIfCollectionHasSubscriber.removeEventListener();
                self._notifyUsersAboutToEditTreatment[id].subscribeCollectionId.removeEventListener();
                delete self._notifyUsersAboutToEditTreatment[id];
            }
        },
        /**
         * Array of modified assemblages.
         * @type {ko.computed}
         */
        modifiedAssemblages: null,
        /** @private **/
        _initModifiedAssemblages: function() {
            var
                self = this,
                attachmentsModel = self.get( 'attachmentsModel' );

            self.modifiedAssemblages = self.addDisposable( ko.computed( function() {
                var
                    editableAssemblages = unwrap( self.editableAssemblages ),
                    result = [];

                editableAssemblages.forEach( function( assemblage ) {
                    var
                        treatment = assemblage.treatment,
                        billingFactorValueInitial = assemblage.editorModel.billingFactorValueInitial,
                        priceInitial = treatment.price || 0,
                        editorModel = assemblage.editorModel,
                        billingFactorValue = unwrap( editorModel.billingFactorValue ),
                        price = unwrap( editorModel.price ),
                        isModified = ((Y.doccirrus.comctl.factorToLocalString( billingFactorValueInitial ) !== Y.doccirrus.comctl.factorToLocalString( billingFactorValue )) || (Y.doccirrus.comctl.numberToLocalString( priceInitial, {decimals: 2} ) !== Y.doccirrus.comctl.numberToLocalString( price, {decimals: 2} )));

                    if( isModified ) {
                        result.push( assemblage );
                    }

                } );

                return result;
            } ).extend( {rateLimit: 0, trackArrayChanges: true} ) );
            // notify "attachmentsModel" about modifications have changed
            self.addDisposable( self.modifiedAssemblages.subscribe( function( states ) {
                var
                    shouldNotify = false;

                states.forEach( function( state ) {
                    switch( state.status ) {
                        case 'added':
                        case 'deleted':
                            shouldNotify = true;
                            break;
                    }
                } );

                if( shouldNotify ) {
                    attachmentsModel.markLinkedActivitiesDirty();
                }

            }, null, 'arrayChange' ) );
        },
        /**
         * Check for modified assemblages.
         * @returns {boolean}
         */
        hasModifications: function() {
            var
                self = this;

            return Boolean( unwrap( self.modifiedAssemblages ).length );
        },
        /**
         * Get modified plain objects.
         * @returns {object[]}
         */
        getModifications: function() {
            var
                self = this,
                modifiedAssemblages = unwrap( self.modifiedAssemblages );

            return modifiedAssemblages.map( function( assemblage ) {
                var
                    editorModel = assemblage.editorModel;

                return Y.merge( assemblage.treatment, {
                    status: 'CREATED',
                    billingFactorValue: unwrap( editorModel.billingFactorValue ),
                    price: unwrap( editorModel.price )
                } );
            } );
        },
        /**
         * Reset assemblages.
         */
        reset: function() {
            var
                self = this,
                assemblages = unwrap( self.quotationTreatmentAssemblages );

            assemblages.forEach( function( assemblage ) {
                assemblage.editorModel.reset();
            } );
        }
    }, {
        NAME: 'QuotationTreatmentsHandler',
        ATTRS: {
            binder: {
                value: null
            },
            currentPatient: {
                valueFn: function() {
                    return this.get( 'binder' ).currentPatient;
                },
                lazyAdd: false
            },
            currentActivity: {
                valueFn: function() {
                    return this.get( 'binder' ).currentActivity;
                },
                lazyAdd: false
            },
            attachmentsModel: {
                value: null
            }
        }
    } );

    KoViewModel.registerConstructor( QuotationTreatmentsHandler );

}, '0.0.1', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',

        'JsonRpcReflection-doccirrus',
        'JsonRpc',

        'dc-comctl',
        'activity-schema',

        'DCSystemMessages',
        'dccommunication-client',
        'QuotationModel'
    ]
} );
