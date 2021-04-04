/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, $ */
YUI.add( 'InSightAnalysisViewModel', function( Y/*, NAME*/ ) {
    'use strict';

    var i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        analysisVisualisation = Y.doccirrus.insight2.analysisVisualisation,
        analysisCategories = Y.doccirrus.insight2.analysisCategories,

        CATEGORY_LIST = analysisCategories.list;

    /**
     * @constructor
     * @class InSightAnalysisViewModel
     */
    function InSightAnalysisViewModel() {
        InSightAnalysisViewModel.superclass.constructor.apply( this, arguments );
    }

    Y.extend( InSightAnalysisViewModel, KoViewModel.getDisposable(), {
        /**
         * Defines template name to look up
         * @property templateName
         * @type {String}
         */
        templateName: 'InSightAnalysisViewModel',
        /** @protected */
        initializer: function() {
            var self = this;

            self.initInSightAnalysisViewModel();
            self.analysisTitleI18n = i18n('InSight2Mojit.analysis.TITLE');
            self.analysisLimitI18n = i18n('InSight2Mojit.analysis.LIMIT');
            self.analysisOrderTitleI18n = i18n('InSight2Mojit.analysis.order.TITLE');
            self.analysisOrderASCI18n = i18n('InSight2Mojit.analysis.order.ASC');
            self.analysisOrderDESCI18n = i18n('InSight2Mojit.analysis.order.DESC');
            self.analysisUpdateBtnI18n = i18n('InSight2Mojit.analysis.updateBtn.LABEL');
            self.analysisSelectedCatsI18n = i18n('InSight2Mojit.analysis.categories.SELECTED_CATS');
            self.analysisAvailableCatsI18n = i18n('InSight2Mojit.analysis.categories.AVAILABLE_CATS');
            self.analysisShowPriceI18n = i18n('InSight2Mojit.analysis.categories.SHOW_PRICE');
        },
        /** @protected */
        destructor: function() {
        },
        /** @protected */
        initInSightAnalysisViewModel: function() {
            var self = this;

            self.initTemplate();
        },

        analysisReady: function() {
            var node = document.querySelector( "#upperDiv" );
            if( node ) {
                ko.cleanNode( node );
            }
            runChart();
        },

        /**
         * Defines template object
         * @property template
         * @type {Object}
         */
        template: null,
        /** @protected */
        initTemplate: function(){
            var
                self = this;

            self.template = {
                name: self.get( 'templateName' ),
                data: self
            };
        }
    }, {
        NAME: 'InSightAnalysisViewModel',
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

    function runChart() {

        // URL to the API data endpoint

        // Assoziatives Array, bildet eine Kategorien ID auf das dazugehörige Kategorieobjekt ab
        var categories = CATEGORY_LIST;

        // Enthält die Kategorienobjekte in der Reihenfolge, wie sie in der Visualisierung zu sehen sind.
        var visualisedCategories = [];

        /*
         * Bildet Kategorie ID auf ein Array von Filterwerden ab
         * Bsp: {smoker: [true,unkown] }
         * @type Array
         */
        //var filters = [];

        var euroBtnWrapper = null,
            euroBtnElem = null,
            optLimitElem = null,
            optOrderElem = null,
            optLimit = null,
            optOrder = null;

        $(document).ready(function() {

            setOptElements();

            euroBtnWrapper = $('#euro-btn-wrapper');
            euroBtnElem = euroBtnWrapper.find('input#euro-btn');

            euroBtnElem.on( 'change', function() {
                // workaround screen blocker (MOJ-600)
                // MOJ-3774
                setTimeout( function() {
                    updateVisualisation( 0 );
                } );
            } );

            for( var cat in categories ) {
                if( categories.hasOwnProperty( cat ) ) {
                    createButtonGroup( categories[cat] );
                }
            }
            updateVisualisation( 0 );

            // make the group buttons movable
            $('#menu-buttons').sortable({axis: "y",
                delay: 150,
                update: function(/*event, ui*/) {
                    //setTimeout(updateVisualisation(), 9200000);
                    updateVisualisation( 0 );
                },
                items: ".well"
            });

            $('#opt-update').on('click', function() {
                updateOpts();
            });

        });

        /**
         * Determine the selected categories and filters.
         * Construct a API query string and fetch data.
         * Call D3 method to draw the visualisation
         */

        function updateVisualisation() {

            visualisedCategories = [];

            // Get all selected grouping elements (categories)
            var selectedCategories = $('.well:visible'),
                //selectedLength = selectedCategories.length,
                aggregationData = {
                    groupByFields: [],
                    virtualFields: [],
                    additionalFields: {},
                    filterData: {}
                };

            if (optLimit) {
                aggregationData.childrenLimit = optLimit;
            }

            if (optOrder === 1 || optOrder === -1) {
                aggregationData.childrenOrder = optOrder;
            }

            $.each(selectedCategories, function(index, value) {
                var catID = $(value).attr('catID'),
                    fieldDef = categories[catID];

                if (fieldDef) {

                    visualisedCategories.push(categories[catID]);
                    //visualisedCategories.push(fieldDef.categoryValue);

                    aggregationData.groupByFields.push(fieldDef.categoryValue);

                    if (fieldDef.filter) {
                        updateFilterData(aggregationData.filterData, fieldDef.filter);
                    }

                    if (fieldDef.virtualField) {
                        aggregationData.virtualFields.push(catID);
                    }

                    if (fieldDef.additionalFields && fieldDef.additionalFields) {
                        aggregationData.additionalFields[fieldDef.categoryValue] = fieldDef.additionalFields;
                    }

                    //if (index === selectedLength - 1) {
                    //    if (fieldDef.showPrice) {
                    //        manageEuroBtn('show');
                    //    } else {
                    //        console.log('hide', catID);
                    //        manageEuroBtn('hide');
                    //    }
                    //}
                }
            });

            drawVisualisation( aggregationData );
        }
        
        function setOptElements() {
            optLimitElem = $('#opt-limit');
            optOrderElem = $('#opt-order');
        }

        function updateOpts() {
            var limit = optLimitElem.val(),
                limitInt = parseInt(limit, 10),
                order = optOrderElem.val(),
                orderInt = parseInt(order, 10);

            optLimit = limitInt;
            optOrder = orderInt;

            updateVisualisation(0);
        }

        function updateFilterData(filterData, currentFilter) {
            for (var key in currentFilter) {
                if (currentFilter.hasOwnProperty(key)) {

                    var newValue = currentFilter[key].slice();

                    if (filterData[key]) {
                        filterData[key].forEach(eachItem);
                    }

                    filterData[key] = newValue;

                }
            }

            function eachItem(val) {
                if (newValue.indexOf(val) < 0) {
                    newValue.push(val);
                }
            }

            return filterData;
        }

        /**
         * Clear the current visualisation and trigger the D3 stuff to request
         * and draw the data
         * @param {type} requestURL
         * @returns {undefined}
         */
        function drawVisualisation( aggregationData ) {
            $('#vis').empty();

            var options = {};
            if(euroBtnElem.is( ':checked' )){
                options.showPrice = true;
            }

            Y.doccirrus.jsonrpc.api.reporting.getAnalysis({
                groupByFields: aggregationData.groupByFields,
                virtualFields: aggregationData.virtualFields,
                additionalFields: aggregationData.additionalFields,
                childrenLimit: aggregationData.childrenLimit,
                childrenOrder: aggregationData.childrenOrder,
                filter: aggregationData.filterData,
                analysisOptions: options
            }).then(function (res) {
                analysisVisualisation.makeVisualisation(visualisedCategories, res.data, options);
            }, function (err) {
                analysisVisualisation.visualisationError(err);
            });

        }


        /*
         * Creates category buttons and filter lists from a json definition
         * @param {object} data
         * @returns {undefined}
         */
        function createButtonGroup(data) {
            makeWell(data);
            makeChoiceEntry(data);
            if (!data.inactive){
                showCategory(data.buttonId);
            }
        }

        /*
         * creates "well" a movable option field containing the drop down menu
         * @param {string} catID Category/ Group identifier
         * @returns {getCategoryObject.data}
         */
        function makeWell(data) {
            //console.log('makeWell', data);
            var catName = data.categoryName;
            // Every Category needs a unique ID
            var catID = data.buttonId;
            var catValues = data.values;

            // Create a new button for the category
            $('#menu-buttons').append(
                "<div class='well' catID='" + catID + "' style='display: none;'>" +
                "<a class='close' href='#'>&times;</a>" +
                "<div class=\"btn-group\" id=\"" + catID + "\"></div>" +
                "</i>" +
                "</div>" );

            // Create topdown menu only if needed
            var button;
            if (catValues.length > 0) {
                button = $('#' + catID).append(
                    "<button class='btn dropdown-toggle' data-toggle='dropdown'>" + catName + "<span class='caret'></span>" + "</button>");
                // create a pull down menu
                /* var dropDownMenu =*/
                button.append(
                    "<ul class='dropdown-menu dropdown-menu-insight'>" +
                    "<li><input catID='" + catID + "' type='text' placeholder='Filter...'></li>" +
                    "</ul>" );

                setElements(catID, catValues);

                // Bind Event Listener
                $('#' + catID + ' ul li input[type=text]').bind({
                    click: function() {
                        return false; // pull down menu should not disappear
                    },
                    input: function() {
                        // Hide list elements witch do not match the search expression
                        var inputText = $(this).val();
                        var listElements = $('#' + catID + ' ul li[id]');

                        // Linear search
                        $.each(listElements, function(index, value) {
                            var currentLiText = $.trim($(value).text());
                            if (currentLiText.toLowerCase().indexOf(inputText.toLowerCase()) < 0){
                                $(value).hide();
                            }else{
                                $(value).show();
                            }
                        });
                    }
                });
            } else {
                button = $('#' + catID).append(
                    "<button class='btn'>" + catName + "</button>");
            }

            // Bind Event Listener for close button
            $('.well[catID=' + catID + '] .close').bind({
                click: function() {
                    hideCategory(catID);
                    updateVisualisation( 0 );
                }
            });

            // update visualisation if the user choose a filter
            $('.well[catID=' + catID + '] button').bind({
                click: function(/*event*/) {
                    if ($('.well[catID=diagnosis] div.btn-group').hasClass('open')){
                        updateVisualisation( 0 );
                    }
                }
            });
        }

        /*
         * Append entry in "Verfügbare Kategorien" Menü
         * @param {string} catID Category/ Group identifier
         * @returns {getCategoryObject.data}             */
        function makeChoiceEntry(data) {
            // Every Category needs a unique ID
            var catID = data.buttonId,
                catName = data.categoryName;

            /*var catBtn =*/
            $( '#cat-list' ).append( "<button catID=" + catID + " class='btn btn-link' " +
                                     "type='button' " +
                                     "style='display:block;'>" +
                                     catName + "</button>" );

            // This event listener ist called if the user adds a new category
            // to the visualisation
            $('#cat-list button[catID=' + catID + ']').bind({
                click: function() {
                    showCategory(catID);
                    updateVisualisation( 0 );
                }
            });

        }

        /*
         * Hides a Category from the user interfaces
         * @param {string} catID Category/ Group identifier
         * @returns {getCategoryObject.data}             */
        function hideCategory(catID) {
            // hide the well
            $('.well[catID=' + catID + ']').hide();

            // show entry in "verfügbare Kategorien"
            $('#cat-list button[catID=' + catID + "]").show();
        }

        /**
         *
         * @param {string} catID
         * @returns {undefined}
         */
        function showCategory(catID) {
            // move to the end and make button visible
            $('.well[catID=' + catID + ']').appendTo('#menu-buttons').show();

            // hide entry in "verfügbare Kategorien"
            $('#cat-list button[catID=' + catID + "]").hide();
        }

        /*
         * inserts elements in a certain drop down menu
         * @param {string} catID Category/ Group identifier of the concerned drop down menu
         * @param {array} catValues the values which should be added to the menu
         * @returns {getCategoryObject.data}
         */
        function setElements(catID, catValues) {
            $.each(catValues, function(index, value) {

                var liHtml = "";
                if (value.Description){
                    liHtml = $.parseHTML("<li id='" + catID + index + "' key=" + value.Value + " title='" + value.Description + "'><a href='#'><i class='i' style='width:14px;'></i> " + value.Name + "</a></li>");
                }else{
                    liHtml = $.parseHTML("<li id='" + catID + index + "' key=" + value.Value + "><a href='#'><i class='i' style='width:14px;'></i> " + value.Name + "</a></li>");
                }

                // create new list Element
                $('#' + catID + ' ul').append(liHtml);

                // onclick event listener
                $('#' + catID + index).bind("click", function() {

                    $(this).toggleClass("selected");
                    $(this).find('i').toggleClass("icon-ok"); // set a checkmark

                    return false; // pull down menu should not disappear
                });
            });
        }

        //function manageEuroBtn(action) {
        //    if (action === 'show') {
        //        euroBtnWrapper.show();
        //    } else {
        //        euroBtnElem.prop('checked', false);
        //        euroBtnWrapper.hide();
        //    }
        //}

        ///**
        // * Returns a java script object representing the query part for a specific category.
        // * @param {string} catID unique category identifier
        // * @returns {getCategoryObject.data}             */
        //function getCategoryObject(catID) {
        //    var data = {"$group": {"_id": catID}};
        //    return data;
        //}

        //event handling
        $( '#refresh' ).on( 'click', function() {
            updateVisualisation( 1 );
        } );
    }

    KoViewModel.registerConstructor( InSightAnalysisViewModel );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'dcforms-reducedschema',
        'InSightColSelectorViewModel',
        'InSightFilterElementViewModel',
        'dcforms-schema-InCase-T',
        'dcforms-schema-InSuite-T',
        'dc-comctl',
        'KoUI-all',
        'KoTableNamedRenderers',
        'analysisVisualisation',
        'analysisCategories'
    ]
} );
