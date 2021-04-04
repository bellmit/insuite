/*jslint anon:true, sloppy:true, nomen:true*/
/*global fun:true, $, ko, async  */

fun = function _fn( Y, NAME ) {
    'use strict';
    var i18n = Y.doccirrus.i18n;
    return {

        registerNode: function( node ) {

            this.node = node;

            var self = this,
                domNode = self.node.getDOMNode(),
                MarkerPrioritiesNodeBinder = self.node.one( '.marker_colors_table tbody' ),
                applyBindings = {
                    MarkerSeverityArrayModel: Y.doccirrus.uam.MarkerSeverityArrayModel,
                    MarkerArrayModel: Y.doccirrus.uam.MarkerArrayModel,
                    MarkerIconArrayModel: Y.doccirrus.uam.MarkerIconArrayModel
                };
            //translations
            applyBindings.symbolDesignationI18n = i18n('IncaseAdminMojit.incase_tab_markers.group.SYMBOL_DESIGNATION');
            applyBindings.colorMappingI18n = i18n('IncaseAdminMojit.incase_tab_markers.group.COLOR_MAPPING');
            applyBindings.MarkerArrayModel.labelSymbolI18n = i18n('IncaseAdminMojit.incase_tab_markers.label.SYMBOL');
            applyBindings.MarkerArrayModel.labelDesignationI18n = i18n('IncaseAdminMojit.incase_tab_markers.label.DESIGNATION');
            applyBindings.labelClassI18n = i18n('IncaseAdminMojit.incase_tab_markers.label.CLASS');
            applyBindings.MarkerArrayModel.labelActionI18n = i18n('IncaseAdminMojit.incase_tab_markers.label.ACTION');
            applyBindings.MarkerArrayModel.labelEnterI18n = i18n('IncaseAdminMojit.incase_tab_markers.placeholder.ENTER_LABEL');
            applyBindings.MarkerSeverityArrayModel.labelColorI18n = i18n('IncaseAdminMojit.incase_tab_markers.label.COLOR');

            // enable validation
            ko.computed(function(){
                var items = applyBindings.MarkerArrayModel._data();
                Y.Array.each(items, function(item){
                    var validatable = ko.unwrap(item._validatable);
                    if (!validatable) {
                        item._validatable(true);
                    }
                });
            });

            self.hiddenConfig = false;
            self.hiddenColor = false;

            ko.applyBindings( applyBindings, domNode );

            Y.doccirrus.uam.utils.initDCPanels( domNode );

            function attachAllMiniColors() {

                if ( !MarkerPrioritiesNodeBinder || !MarkerPrioritiesNodeBinder.getDOMNode ) {
                    return false;
                }

                var
                    markerNode = MarkerPrioritiesNodeBinder.getDOMNode(),
                    elementsToAttach = $( '.input-color:not(.minicolors-input)', markerNode );

                if( !elementsToAttach.length ) {
                    Y.log( 'No elements to attach color pickers to.', 'warn', NAME );
                    return false;
                }

                async.eachSeries( elementsToAttach, attachColorPicker, onInitComplete );

                function attachColorPicker( toElem, itcb ) {
                    if ( toElem && toElem.attachedColorPicker ) {
                        Y.log( 'Color picker handler already initialized, not repeating.', 'warn', NAME );
                        return itcb( null );
                    }

                    $( toElem ).minicolors(
                        'create',
                        {
                            theme: 'none',
                            position: 'bottom left',
                            //show: function() { },
                            //hide: function() { },
                            change: function( value ) {
                                var $data = ko.dataFor( toElem );
                                $data.color( value );
                            }
                        }
                    );

                    toElem.attachedColorPicker = true;
                    itcb( null );
                }

                function onInitComplete( err) {
                    if ( err ) {
                        Y.log( 'Problem creating color pickers: ' + JSON.stringify( err ), 'warn', NAME );
                    }
                }

            }

            Y.doccirrus.uam.MarkerSeverityArrayModel._data.subscribe( function() {
                attachAllMiniColors(); // on change
            } );
            attachAllMiniColors(); // initial

        },

        deregisterNode: function() {

        }
    };
};
