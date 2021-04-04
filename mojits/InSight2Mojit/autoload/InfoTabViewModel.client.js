/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'InfoTabViewModel', function( Y, NAME ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,

        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager,

        InSight2MojitViewModel = KoViewModel.getConstructor( 'InSight2MojitViewModel' );

    /**
     * @constructor
     * @class InfoTabViewModel
     * @extends InSight2MojitViewModel
     */
    function InfoTabViewModel() {
        InfoTabViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( InfoTabViewModel, InSight2MojitViewModel, {
        templateName: 'InfoTabViewModel',
        /** @protected */
        initializer: function() {
            //var self = this;

            this.listData = ko.observableArray();
            this.initInfoTabViewModel();
        },
        /** @protected */
        destructor: function() {
        },
        initInfoTabViewModel: function() {
            this.prepareDefaultList();
            //  TODO: consider locking the table during load of additional data
            this.prepareUserDefinedList( function() {
                Y.log( 'Loaded user-defined reporting fields from forms.', 'debug', NAME );
            } );
            this.initTable();
        },
        initTable: function () {
            var self = this;

            this.listTable = KoComponentManager.createComponent( {
                componentType: 'KoTable',
                componentConfig: {
                    stateId: 'list-table', // @see: KoConfigurable.prototype.stateId
                    states: [ 'limit' ], // @see: KoTable.prototype.statesAvailable || KoConfigurable.prototype.states
                    fillRowsToLimit: false,
                    limit: 20,
                    limitList: [20, 40, 60, 500],
                    data: self.listData,
                    columns: [
                        {
                            forPropertyName: 'keyName',
                            label: i18n('InSight2Mojit.infoTab.headers.KEY_NAME'),
                            title: i18n('InSight2Mojit.infoTab.headers.KEY_NAME'),
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'label.de',
                            label: i18n('InSight2Mojit.infoTab.headers.LABEL'),
                            title: i18n('InSight2Mojit.infoTab.headers.LABEL'),
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'modelText',
                            label: i18n('InSight2Mojit.infoTab.headers.MODEL'),
                            title: i18n('InSight2Mojit.infoTab.headers.MODEL'),
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'type',
                            label: i18n('InSight2Mojit.infoTab.headers.TYPE'),
                            title: i18n('InSight2Mojit.infoTab.headers.TYPE'),
                            isSortable: true,
                            isFilterable: true
                        },
                        {
                            forPropertyName: 'insight2',
                            label: i18n('InSight2Mojit.infoTab.headers.IN_INSIGHT'),
                            title: i18n('InSight2Mojit.infoTab.headers.IN_INSIGHT'),
                            isSortable: true,
                            isFilterable: true
                        }
                    ]
                }
            } );
        },
        prepareDefaultList: function () {
            var self = this,
                currentItem;
            /*jshint forin:false*/
            for (var key in Y.dcforms.schema.InCase_T) {
                currentItem = Y.dcforms.schema.InCase_T[key];
                if( currentItem.insight2 ) {
                    currentItem.keyName = key;
                    currentItem.modelText = currentItem.modelLabel && currentItem.modelLabel.de;
                    if (currentItem.model === 'activity' &&
                        currentItem.actTypesLabel &&
                        currentItem.actTypesLabel.de &&
                        currentItem.actTypesLabel.de.length) {
                        // for activities we want to be more precise.
                        currentItem.modelText = currentItem.actTypesLabel.de.join( ' ' );
                    }
                    self.listData.push( currentItem );
                }
            }
        },

        prepareUserDefinedList: function( callback ) {
            var
                self = this,
                binder = self.get( 'binder' ),
                customFields = binder.customFields ? binder.customFields() : [],
                i;

            //  add custom fields to result
            for ( i = 0; i < customFields.length; i++ ) {
                self.listData.push( customFields[i] );
            }

            callback( null );
        }

    }, {
        NAME: 'InfoTabViewModel',
        ATTRS: {}
    } );

    KoViewModel.registerConstructor( InfoTabViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel',
        'KoUI-all',
        'InSight2MojitViewModel',
        'dcforms-schema-InCase-T',
        'dcforms-schema-InSuite-T'
    ]
} );
