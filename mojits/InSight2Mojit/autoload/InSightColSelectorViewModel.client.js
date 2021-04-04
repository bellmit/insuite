/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, jQuery */

'use strict';

YUI.add( 'InSightColSelectorViewModel', function( Y/*, NAME*/ ) {

    var KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n;

    /**
     * @constructor
     * @class InSightColSelectorViewModel
     * @extends KoViewModel.getDisposable
     */
    function InSightColSelectorViewModel() {
        InSightColSelectorViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( InSightColSelectorViewModel, KoViewModel.getDisposable(), {
        templateName: 'InSightColSelectorViewModel',
        /** @protected */
        initializer: function( data ) {
            var self = this;

            self.initTemplate();
            self.initInSightColSelectorViewModel( data );
            self.tableSumFieldI18n = i18n( 'InSight2Mojit.table.SUM_FIELD' );
            self.distinctI18n = i18n( 'InSight2Mojit.groupingOptions.STRING_DISTINCT_LIST' );
        },
        /** @protected */
        destructor: function() {
        },
        initInSightColSelectorViewModel: function( data ) {
            var self = this;

            self.cols = data.cols;
            self.isGroup = data.isGroup;
            self.currentValue = ko.observable( data.value );
            self.currentType = ko.observable( null );
            self.currentModel = ko.observable( null );
            self.visibleAtSummaryRow = ko.observable( undefined === data.notVisibleAtSummaryRow ? false : !data.notVisibleAtSummaryRow );

            self.currentGroupOptions = {
                'String': ko.observable( 'stringCompleteList' ),
                'Number': ko.observable( null ),
                'Date': ko.observable( null ),
                'Boolean': ko.observable( 'booleanCompleteList' ),
                'truncateListLimit': ko.observable( data.truncateListLimit || 3 ),
                'stringDistinct': ko.observable( data.stringDistinct || false )
            };

            self.linkOptVisible = ko.computed( function() {
                return /*self.isGroup && !self.isGroup() &&*/ self.currentModel();
            } );
            self.renderLink = ko.observable( data.renderLink );
            self.renderLinkLabel = ko.computed( function() {
                var prefix = i18n( 'InSight2Mojit.table.LINK_TO' ),
                    modelName = self.currentModel(),
                    modelTranslation = i18n( 'audit-schema.ModelMeta_E.' + modelName ),
                    modelLabel = modelTranslation || modelName;
                return prefix + ' ' + modelLabel;
            } );

            self.visibleAtSummaryRowVisible = ko.computed( function() {
                return 'Number' === self.currentType();
            } );

            self.stringGroupOptions = [
                { value: 'stringCompleteList', label: i18n( 'InSight2Mojit.groupingOptions.STRING_COMPLETE_LIST' ) },
                { value: 'stringTruncateList', label: i18n( 'InSight2Mojit.groupingOptions.STRING_TRUNCATE_LIST' ) },
                { value: 'stringCountNotEmpty', label: i18n( 'InSight2Mojit.groupingOptions.STRING_COUNT_NON_EMPTY' ) }
            ];
            self.numberGroupOptions = [
                { value: 'numberSum', label: i18n( 'InSight2Mojit.groupingOptions.NUMBER_SUM' ) },
                { value: 'numberAvg', label: i18n( 'InSight2Mojit.groupingOptions.NUMBER_AVG' ) },
                { value: 'numberMax', label: i18n( 'InSight2Mojit.groupingOptions.NUMBER_MAX' ) },
                { value: 'numberMin', label: i18n( 'InSight2Mojit.groupingOptions.NUMBER_MIN' ) },
                { value: 'numberCount', label: i18n( 'InSight2Mojit.groupingOptions.NUMBER_COUNT' ) }
            ];
            self.dateGroupOptions = [
                { value: 'dateMax', label: i18n( 'InSight2Mojit.groupingOptions.DATE_MAX' ) },
                { value: 'dateMin', label: i18n( 'InSight2Mojit.groupingOptions.DATE_MIN' ) },
                { value: 'dateCount', label: i18n( 'InSight2Mojit.groupingOptions.DATE_COUNT' ) },
                { value: 'dateCountDistinct', label: i18n( 'InSight2Mojit.groupingOptions.DATE_COUNT_DISTINCT' ) },
                { value: 'dateCompleteList', label: i18n( 'InSight2Mojit.groupingOptions.DATE_COMPLETE_LIST' ) },
                { value: 'dateRange', label: i18n( 'InSight2Mojit.groupingOptions.DATE_RANGE' ) }
            ];

            self.select2Config = new ColSelectorModel( {
                data: this.cols,
                val: this.currentValue,
                type: this.currentType,
                groupOptions: this.currentGroupOptions,
                prevGroupOption: data.groupOption,
                fieldModel: this.currentModel
            } );
        },

        /**
         * Defines template object
         * @property template
         * @type {Object}
         */
        template: null,
        /** @protected */
        initTemplate: function() {
            var
                self = this;

            self.template = {
                name: self.get( 'templateName' ),
                data: self
            };
        }

    }, {
        NAME: 'InSightColSelectorViewModel',
        ATTRS: {
            /**
             * Defines template name to look up
             * @attribute templateName
             * @type {String}
             * @default prototype.templateName
             */
            templateName: {
                valueFn: function() {
                    return this.templateName;
                }
            },
            /**
             * DCBinder
             * @attribute binder
             * @type {doccirrus.DCBinder}
             * @default InCaseMojitBinder
             */
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InSight2Mojit' );
                }
            }
        }
    } );

    function ColSelectorModel( opts ) {
        var
            self = this,
            previousVal,
            s2elem;

        self.select2SearchConfig = {
            select2: {
                width: '100%',
                placeholder: i18n( 'CalendarMojit.calendar.placeholder.SEARCH' ),
                minimumInputLength: 0,
                data: opts.data
            },
            init: function ColSelectorModel_select2SearchConfig_init( element ) {
                jQuery( element ).on( 'select2-selected', function ColSelectorModel_select2SearchConfig_init_selected( $event ) {
                    opts.fieldModel( $event.choice.model || null );
                    opts.type( $event.choice.type );
                    self.onSelected( $event.val );
                } );
                var s2data, s2dataType, s2dataModel;
                if( opts.val ) {
                    previousVal = opts.val();

                    if( previousVal ) {
                        s2elem = jQuery( element ).data( 'select2' );

                        s2elem.val( previousVal );

                         s2data = s2elem.data();
                         s2dataType = (s2data && s2data.type) || 'String';
                         s2dataModel = (s2data && s2data.model) || null;

                        opts.type( s2dataType );
                        opts.fieldModel( s2dataModel );

                        //  Special case, Date columns are rendered as DateTime ranges in the report table view, MOJ-9914
                        if ( 'DateTime' === s2dataType ) {
                            s2dataType = 'Date';
                        }

                        if( opts.prevGroupOption ) {
                            opts.groupOptions[s2dataType]( opts.prevGroupOption );
                            opts.prevGroupOption = undefined;
                        }
                    }
                }
            }
        };

        self.onSelected = function( choice ) {
            opts.val( choice );
        };
    }

    KoViewModel.registerConstructor( InSightColSelectorViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel'
    ]
} );
