'use strict';

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'WareHouseAdvancedFilterViewModel', function( Y/*, NAME*/ ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n,
        unwrap = ko.unwrap;

    /**
     * @constructor
     * @class WareHouseAdvancedFilterViewModel
     */
    function WareHouseAdvancedFilterViewModel() {
        WareHouseAdvancedFilterViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( WareHouseAdvancedFilterViewModel, KoViewModel.getDisposable(), {
            templateName: 'WareHouseAdvancedFilterViewModel',
            /** @protected */
            initializer: function() {
                var
                    self = this;
                self.initTemplate();
                self.initObservables();
                self.initLables();
            },

            initObservables: function() {
                var
                    self = this;
                self.query = ko.observable( "" );
                self.allArticles = ko.observable( false );
                self.moreThanZero = ko.observable( false );
                self.lessThanMinQ = ko.observable( false );

                self.addDisposable( ko.computed( function() {
                    var queries = [
                        unwrap( self.moreThanZero ) ? {$gt: ["$quantity", 0]} : null,
                        unwrap( self.lessThanMinQ ) ? {$lt: ["$quantity", "$minimumQuantity"]} : null
                    ];

                    if( unwrap( self.allArticles ) ) {
                        queries = [];
                    }

                    queries = queries.filter( function( query ) {
                        return query !== null;
                    } );

                    self.query( queries.length ? {$expr: {$or: queries}} : {} );
                } ) );
            },

            initLables: function() {
                var
                    self = this;
                self.gtZeroI18n = i18n( 'InStockMojit.advancedFilter.labels.gtZero' );
                self.ltMinQI18n = i18n( 'InStockMojit.advancedFilter.labels.ltMinQ' );
                self.allI18n = i18n( 'InStockMojit.advancedFilter.labels.all' );
            },
            toObject: function() {
                var self = this;
                return {
                    allArticles: unwrap( self.allArticles ),
                    moreThanZero: unwrap( self.moreThanZero ),
                    lessThanMinQ: unwrap( self.lessThanMinQ )
                };
            },
            unCheckAll: function() {
                var self = this;
                if( unwrap( self.allArticles ) ) {
                    self.allArticles( false );
                }
                return true;
            },
            unCheckOthers: function() {
                var self = this;
                if( unwrap( self.moreThanZero ) || unwrap( self.lessThanMinQ ) ) {
                    self.moreThanZero( false );
                    self.lessThanMinQ( false );
                }
                return true;
            },
            destructor: function() {
            },

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
        },
        {
            NAME: 'WareHouseAdvancedFilterViewModel',
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
                }
            }
        }
    );

    KoViewModel.registerConstructor( WareHouseAdvancedFilterViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'doccirrus',
        'KoViewModel'
    ]
} );
