/**
 * User: do
 * Date: 16.03.20  14:23
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, ko */
/*eslint prefer-template:0 strict:0 */
YUI.add( 'MMISearchButton', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module KoButton
     */
    Y.namespace( 'doccirrus.KoUI' );
    var
        i18n = Y.doccirrus.i18n,
        OPEN_MEDICATION_SEARCH = i18n( 'InCaseMojit.casefile_detail.button.OPEN_MEDICATION_SEARCH' ),
        peek = ko.utils.peekObservable,
        KoUI = Y.doccirrus.KoUI,
        KoComponentManager = KoUI.KoComponentManager;

    function create( config ) {
        var defaultMmiSearch = ko.observable( Y.doccirrus.utils.localValueGet( 'defaultMmiSearch' ) ),
            mmiSearchButtons = [
                {
                    name: 'productName',
                    text: 'Produktname'
                },
                {
                    name: 'companyName',
                    text: 'Firma'
                },
                {
                    name: 'pznList',
                    text: 'PZN'
                },
                {
                    name: 'companyNameAd',
                    text: 'Erweiterte Suche: Firma'
                },
                {
                    name: 'atcList',
                    text: 'Erweiterte Suche: ATC'
                },
                {
                    name: 'ingredientList',
                    text: 'Erweiterte Suche: Wirkstoffe'
                }
            ].map( function( entry ) {
                entry.icon = ko.computed( function() {
                    if( defaultMmiSearch() === peek( entry.name ) ) {
                        return 'CHECK';
                    }
                } );
                entry.click = function() {
                    Y.doccirrus.utils.localValueSet( 'defaultMmiSearch', peek( entry.name ) );
                    defaultMmiSearch( peek( entry.name ) );
                    config.onClick( peek( entry.name ) );
                };
                return entry;
            } ),
            mmiSearchBtn = KoComponentManager.createComponent( {
                componentType: 'KoButtonSplitDropDown',
                componentConfig: {
                    name: 'mmiSearchBtn',
                    title: OPEN_MEDICATION_SEARCH,
                    text: OPEN_MEDICATION_SEARCH,
                    disabled: ko.computed( config.disabled ),
                    click: function() {
                        var searchButton,
                            _defaultMmiSearch = defaultMmiSearch();
                        if( _defaultMmiSearch ) {
                            mmiSearchButtons.some( function( entry ) {
                                if( peek( entry.name ) === _defaultMmiSearch ) {
                                    searchButton = entry;
                                    return true;
                                }
                            } );
                        }
                        (searchButton || mmiSearchButtons[0]).click();
                    },
                    menu: {
                        items: mmiSearchButtons
                    }
                }
            } );

        return mmiSearchBtn;
    }

    Y.namespace( 'doccirrus' ).MMISearchButton = {create: create};
}, '3.16.0', {
    requires: [
        'oop',
        'dccommonutils',
        'KoUI',
        'KoUI-utils-Function',
        'KoComponentManager',
        'KoButton'
    ]
} );
