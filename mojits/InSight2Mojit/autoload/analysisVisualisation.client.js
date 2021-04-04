/*global YUI, $, d3, moment */

'use strict';

YUI.add( 'analysisVisualisation', function( Y/*, NAME*/ ) {

    var i18n = Y.doccirrus.i18n,
        inCaseSchema = Y.dcforms.reducedschema.loadSync('InCase_T');

    /*
     * initial width and height parameters for the visualisation
     * @type Number
     */
    var w = $('#upperDiv').parent().width() - 30,
        h = 400;

    /*
     * The fixed height of a row in the visualisation
     * @type Number
     */
    var blockHeight = 90;

    /**
     * Roote data node of the visualisation
     * @type _root
     */
    var root;

    /**
     * All svg grouping elements
     * @type svg:g
     */
    var g;

    /*
     * contains all highlighted svg:g elements
     * @type svg:g
     */
    var hg;

    /**
     * Scale functions for x and y coordinates.
     * Transforming the viewpoint in a zoomed state
     * @type
     */
    var zoomX = d3.scale.linear().domain( [0, w] ).range( [0, w] );
    var zoomY = d3.scale.linear().domain( [0, h] ).range( [0, h] );

    /*
     * A stretching factor to enlarge the rects in a zoomed state
     * @type @exp;d@pro;dx|w|Number
     */
    var stretchX = 1; // width
    var stretchY = 1; // height

    var zoomedNode;

    var visualisedCategories;

    /**
     * Returns first word in specified text.
     *  separator is ' '(space)
     * @param {String} text
     * @returns {String}
     */
    function getFirstWord( text ) {
        if( !text ) {
            return text;
        }
        return text.split( ' ' )[0];
    }

    /**
     * Checks length of full label, if it fits to cell,
     *  function will return full label.
     *  If not function will check length of first word fits,
     *  if it fits, function will return first word of label.
     *  If both of cases are failed, function returns empty string.
     * @param {Object} d the mentioned node
     * @returns {String}
     */
    function getLabelForNode( d ) {
        var label = mapLabel( d ),
            firstWord = getFirstWord( label );

        if( label.length * 10 > d.dx * stretchX ) {
            if( firstWord.length * 10 > d.dx * stretchX ) {
                return '';
            } else {
                return firstWord;
            }
        } else {
            return label || '-';
        }
    }
    /**
     * Maps the internal data label to a predefined human readable.
     * See category definition object
     * @param {object} d data object
     * @returns {String}
     */
    function mapLabel( d ) {
        //console.log('mapLabel', d);
        // Wurzel
        if( d.depth === 0 ) {
            return i18n('InSight2Mojit.analysis.tooltip.ALL_ENTRIES');
        }

        //console.log(visualisedCategories);
        // Wenn Mapping vorhanden nehmen diesen, sonst Wert in Datenstruktur
        // Wenn Wert in Datenstruktur kein String, benutze "code" Element
        if( visualisedCategories[d.depth - 1].map ) {
            //console.log('d', d, visualisedCategories[d.depth - 1]);
            return visualisedCategories[d.depth - 1].map[d.name] || ""+d.name;
        } else if( d.name === null ) {
            return "-";
        } else if( typeof d.name !== 'string' && typeof d.name !== 'undefined' ) {
            if(typeof d.name.code !== 'undefined'){
                return "" + d.name.code;
            }else{
                return "" + d.name;
            }
        } else if( typeof d.name === 'object' ) {
            return "-";
        } else {
            // convert non-strings to strings
            return "" + d.name;
        }
    }

    /**
     * Decides whether a label node should be visible or not
     * @param {object} d the mentioned node
     * @returns {Number} svg opacity value (0 or 1)
     */
    function getOpacity( d ) {
        var label = getLabelForNode( d );
        if(label === undefined){
            return 1;
        }

        if( label.length * 10/*8.6*/ > d.dx * stretchX ) {
            return 0;
        }
        else {
            return 1;
        }
    }

    /**
     *
     * @param {object} d the node which should be the new root
     * @returns {unresolved}
     */
    function zoom( d ) {
        // Zoomen auf Blätter sinnlos
        if( !d.children ) {
            return;
        }

        /*
         * Skalierungsfunktionen definieren
         * Diese werden benötigt um alle Koordinaten auf die neue (vergrößerte)
         * Position zu verschieben
         */
        zoomX.domain( [d.x, d.x + d.dx] ).range( [0, w] );

        // Lasse von oben 40 Pixel des Elternblockes noch sehen, damit man auch
        // wieder zurück gehen kann.
        zoomY.domain( [d.y, h] ).range( [d.y ? 40 : 0, h] );

        /*
         * Die verschobenen Blöcke müssen in ihrer Breite und Höhe wieder angepasst werden
         * Alle Kinderblöcke des geklickten Elternblocks stecken sich um den Faktor,
         * welcher der Elternblock an der gesamte Höhe/ Breite aht
         */
        stretchX = w / d.dx;
        stretchY = (d.y ? h - 40 : h) / (h - d.y);

        //g.on("mouseover", showPopup(x(d.x), y(d.y),d.dx * stretchX, d.dy * stretchY, d ));

        var t = g.transition()
            .duration( 750 )
            .attr( "transform", function( d ) { // Verschiebe alle Blöcke
                return "translate(" + zoomX( d.x ) + "," + zoomY( d.y ) + ")";
            } );

        // Passe die Breite und Höhe an
        t.select( "rect" )
            .attr( "width", function( d ) {
                return (d.dx * stretchX);
            } )
            .attr( "height", function( d ) {
                return (d.dy * stretchY);
            } );

        // Test auch anpassen
        t.select( "text" )
            .attr( "x", function( d ) {
                return (d.dx * stretchX) / 2;
            } )
            .attr( "y", function( d ) {
                return (d.dy * stretchY) / 2;
            } )
            .attr( "text-anchor", "middle" )
            .style( "opacity", function( d ) {
                return getOpacity( d );
            } ) // Zeige Text nicht an, wenn Rechteck nicht breit genug
            .text( function( d ) {
                return getLabelForNode( d );
            } );

        d3.event.stopPropagation();
    }

    /**
     * Highlight the path from a node towards the root
     * @param {type} d the mentioned node
     * @returns {undefined}
     */
    function highlight( d ) {
        // for the highlight we must know the identifier of all nodes on the
        // path from root towards the selected node

        // contains the id of all nodes which are currently highlighted
        var pathNodesIDs = [];

        if( d.parent ) {
            // Collect the nodes ID from bottom to to
            pathNodesIDs.push( d.n ); // field "n" as defined by Niels

            var parent = d.parent;

            // ascent
            while( parent.parent ) {
                pathNodesIDs.push( parent.n );
                parent = parent.parent;
            }
            pathNodesIDs.push( parent.n );

        } else { // leave
            pathNodesIDs.push( d.n );

        }

        // pathNodesIDs now contains the IDs of all nodes on the path
        hg = d3.selectAll( 'g' ).filter( function( d ) {
            return pathNodesIDs.indexOf( d.n ) >= 0;
        } );

        hg.selectAll( "rect" ).classed( "highlight", true );
        hg.selectAll( "text" ).classed( "highlight", true );

        //console.log(pathNodesIDs);
        //console.log(s);
    }

    /**
     * remove path highlighting
     * @returns {undefined}
     */
    function unhighlight() {
        hg.selectAll( "rect" ).classed( "highlight", false );
        hg.selectAll( "text" ).classed( "highlight", false );
    }

    /**
     * shows a popup window with some useful information
     * @param {object} d the node which triggered the popup
     * @returns {unresolved}
     */
    function showPopup( d, options /*, numPoints*/ ) {
        var svgPos = $( 'svg' ).offset();

        // reset arrow margin alignment
        $( '#tooltip div.arrow' ).css( "margin-left", "-11px" );

        // scales koordinaten des  blocks
        var x = zoomX( d.x );
        var y = zoomY( d.y );
        // stretch
        var dx = d.dx * stretchX;
        var dy = d.dy * stretchY;

        var percentParent = d === root ? 100 : d.sizeOfParent * 100,
            percentRoot = d === root ? 100 : d.sizeOfRoot * 100;

        //breadcrumbs
        var breadcrumbs = "";
        if( d.parent ) {
            // Collect the nodes names from bottom to to
            var path = [];
            path.push( mapLabel( d ) );

            var parent = d.parent;

            // ascent
            while( parent.parent ) {
                path.push( mapLabel( parent ) );
                parent = parent.parent;
            }
            path.push( mapLabel( parent ) );

            // root is the array's last element, reverse it
            path = path.reverse();

            for( var i = 0; i < path.length; i++ ) {
                breadcrumbs = breadcrumbs + path[i];
                if( i < path.length - 1 ) {
                    breadcrumbs += " > ";
                }
            }
        } else { // leave
            breadcrumbs = mapLabel( d );

        }

        //var total;

        // Make visible before calculate the geometry
        $( "#tooltip .popover-title" ).text( breadcrumbs );
        //   $("#tooltip .popover-content").text("Anzahl Patienten: "+d.total+" von "+root.total+ " ("+percentRoot.toFixed(1)+"%)");


        var htmlString = '';

        if( options.showPrice ) {
            if( d === root ) {
                htmlString += d.price.toFixed(1) + '&euro; (100%)';
            } else {
                htmlString += d.price.toFixed(1) + '&euro; von ' + d.parent.price.toFixed(1) + '&euro; ';
                htmlString += i18n('InSight2Mojit.analysis.tooltip.PARENT');
                htmlString += ' (' + percentParent.toFixed(1) + '%)<br>';
                if (d.depth > 1) {
                    htmlString += percentRoot.toFixed(1) + '% von ' + i18n('InSight2Mojit.analysis.tooltip.ROOT');
                }
            }
        } else {

            if ( d === root ) {
                htmlString += d.total + ' (100%)';
            } else {
                htmlString += Math.round( d.total ) + ' von ' + Math.round( d.parent.total ) + ' ';
                htmlString += i18n('InSight2Mojit.analysis.tooltip.PARENT');
                htmlString += ' (' + percentParent.toFixed(1) + '%)<br>';
                if (d.depth > 1) {
                    htmlString += percentRoot.toFixed(1) + '% von ' + i18n('InSight2Mojit.analysis.tooltip.ROOT');
                }
            }
        }

        if (d !== root) {
            if (d.additionalFields) {
                var addKeys = Object.keys(d.additionalFields);
                addKeys.forEach(function(addField) {
                    var fieldDef = inCaseSchema[addField],
                        label = fieldDef && fieldDef.label && fieldDef.label.de || addField,
                        val = d.additionalFields[addField];

                    if (fieldDef.type === 'Date') {
                        val = moment(val).format('DD.MM.YYYY');
                    }

                    htmlString += '<br>' + label + ': ' + val;
                });
            }
        }

        $( "#tooltip .popover-content" ).html(htmlString);
        $( "#tooltip" ).show();

        // Koordinaten vom Popover
        var xPos = x + svgPos.left - $( "#tooltip" ).width() / 2 + dx / 2;
        var yPos = y + svgPos.top + dy;

        if( yPos < $( "#vis" ).offset().top ) {
            return;
        }

        // if space below the visualisation is insufficient display the popover above the item
        var freeSpaceBelow = window.innerHeight - (svgPos.top + parseFloat( $( 'svg' ).height() ));

        if( d.children || $( "#tooltip" ).outerHeight( true ) < freeSpaceBelow ) {
            $( "#tooltip" ).attr( "class", "popover bottom" );
        } else {
            yPos = yPos - blockHeight * stretchY - $( "#tooltip" ).outerHeight();
            $( "#tooltip" ).attr( "class", "popover top" );
        }

        // adjust arrow margin if the tooltip appears out of display (left side)
        if( xPos < 0 ) {
            var xOld = xPos;
            xPos = xPos - xOld;
            var arrowMargin = parseFloat( $( '#tooltip div.arrow' ).css( "margin-left" ) );
            $( '#tooltip div.arrow' ).css( "margin-left", arrowMargin + xOld + "px" );

        }

        // the tooltips position in a zoomed state is differend
        if( stretchX > 1 && zoomedNode.parent === d ) {
            xPos = zoomX( zoomedNode.x ) + svgPos.left - $( "#tooltip" ).width() / 2 + (zoomedNode.dx * stretchX) / 2;
        }

        $( "#tooltip" ).css( "left", xPos + "px" );
        $( "#tooltip" ).css( "top", yPos + "px" );
    }

    /**
     * Draws the visualisation
     * @param {object} _root data root object
     * @param {object} vis DOM-Element where we want to draw
     * @param {object} partition d3 partition object
     * @returns {undefined}
     */
    function drawChart( _root, vis, partition, options ) {
        var nodes = partition.nodes( _root );

        var color = d3.scale.category20();

        // Data join
        g = vis.selectAll( "g" )
            .data( nodes, function( d ) {
                return d.n;
            } );

        g.enter()
            .append( "svg:g" )
            .attr( "transform", function( d ) {
                return "translate(" + (d.x) + "," + (d.y) + ")";
            } )
            .on( "click", function( d ) {
                $( "#tooltip" ).hide();
                zoom( d );
                zoomedNode = d;
            } )
            .on( "mouseover", function( d ) {
                highlight( d );
                showPopup( d, options );
            } )
            .on( "mouseout", function() {
                unhighlight();
                $( "#tooltip" ).hide();
            } );

        // Rechtecke
        g.append( "svg:rect" )
            .attr( "width", function( d ) {
                return (d.dx);
            } )
            .attr( "height", function( d ) {
                return (d.dy);
            } )
            .attr( "class", function( d ) {
                return d.children ? "parent" : "child";
            } )
            .style( "fill", function( d ) {
                if( typeof d.parent === 'undefined' || d.depth <= 1) {
                    return color( d.name );
                } else {
                    return color( (d.children ? d : d.parent).name );
                }

            } );

        // Text
        g.append( "svg:text" )
            .attr( "x", function( d ) {
                return (d.dx) / 2;
            } )
            .attr( "y", function( d ) {
                return (d.dy) / 2;
            } )
            .attr( "text-anchor", "middle" )
            .attr( "dy", ".4em" )
            .style( "opacity", function( d ) {
                return getOpacity( d );
            } ) // Zeige Text nicht an, wenn Rechteck nicht breit genug
            .style( "font-size", "18px" )
            .text( function( d ) {
                return getLabelForNode( d );
            } );

        // Update z.Z. nicht benötigt
        g//.transition().ease("linear")
            .attr( "transform", function( d ) {
                return "translate(" + (d.x) + "," + (d.y) + ")";
            } );

        g.exit().remove();
    }

    /**
     * request data from the API and call a function to draw the visualisation.
     * @param {string} url the url where we request the data from
     * @param {number} n number of categories
     * @returns {undefined}
     */
    //function makeVisualisation( url, numPointsURL, visCategories, query, sortBy, populate ) {
    //    // Höhe so anlegen, dass n + 1  Blöcke immer gleich Groß sind
    //    // + 1 für den Root
    //
    //    visualisedCategories = visCategories;
    //    var n = visCategories.length;
    //    h = blockHeight * (n + 1);
    //    w = $('#upperDiv').parent().width() - 30;
    //
    //    zoomX = d3.scale.linear().domain( [0, w] ).range( [0, w] );
    //    zoomY = d3.scale.linear().domain( [0, h] ).range( [0, h] );
    //    stretchX = 1; // width
    //    stretchY = 1; // height
    //
    //    var partition = d3.layout.partition()
    //        .value(function( d ) {
    //            return d.size;
    //        } ).size( [w, h] ); // Benutze d.size um die Größe der Blöcke zu berechnen
    //
    //    //console.log(categories);
    //    var vis = d3.select( "#vis" )
    //        .style( "width", w + "px" )
    //        .style( "height", h + "px" )
    //        .append( "svg:svg" )
    //        .attr( "width", w )
    //        .attr( "height", h );
    //
    //    console.log('query', query);
    //
    //    $.ajax( {
    //        type: 'POST',
    //        data: {
    //            "myString": JSON.stringify( query ),
    //            "type": sortBy,         //price -> sort by price - else sort by count
    //            "populate": populate
    //        },
    //        xhrFields: { withCredentials: true },
    //        url: url,
    //        query: query
    //    } ).error(function( xhr, status, error ) {
    //            console.log( error );
    //            console.dir( xhr );
    //
    //            $( '#vis' ).empty().append( "<div class='alert alert-error'>" +
    //                                        "<button type='button' class='close' data-dismiss='alert'>&times;</button>" +
    //                                        "<h4>An error occurred!</h4>" +
    //                                        "Loading data from backend failed.<br/>" + error + "</div>" );
    //            return console.error( error );
    //        } ).success( function( data ) {
    //            root = data;
    //
    //            if( data && Object.keys( data ) ) {
    //                drawChart( root, vis, partition, sortBy );
    //
    //            } else {
    //                $( '#vis' ).empty().append( "<div class='alert alert-warning'>" +
    //                                            "<button type='button' class='close' data-dismiss='alert'>&times;</button>" +
    //                                            "<h4>Sie haben noch nicht genügend Daten im System</h4>" );
    //            }
    //        } );
    //}

    function makeVisualisation(visCategories, data, options) {
        visualisedCategories = visCategories;
        var n = visCategories.length;
        h = blockHeight * (n + 1);
        w = $('#upperDiv').parent().width() - 30;

        zoomX = d3.scale.linear().domain( [0, w] ).range( [0, w] );
        zoomY = d3.scale.linear().domain( [0, h] ).range( [0, h] );
        stretchX = 1; // width
        stretchY = 1; // height

        var partition = d3.layout.partition()
            .value(function( d ) {
                return d.sizeOfRoot;
            } ).size( [w, h] ); // Benutze d.size um die Größe der Blöcke zu berechnen

        //console.log(categories);
        var vis = d3.select( "#vis" )
            .style( "width", w + "px" )
            .style( "height", h + "px" )
            .append( "svg:svg" )
            .attr( "width", w )
            .attr( "height", h );

        root = data;

        if( data && Object.keys( data ) ) {
            drawChart( root, vis, partition, options );

        } else {
            $( '#vis' ).empty().append( "<div class='alert alert-warning'>" +
                                        "<button type='button' class='close' data-dismiss='alert'>&times;</button>" +
                                        "<h4>Sie haben noch nicht genügend Daten im System</h4>" );
        }
    }

    function visualisationError(err) {
        console.error( err );

        $( '#vis' ).empty().append( "<div class='alert alert-error'>" +
                                    "<button type='button' class='close' data-dismiss='alert'>&times;</button>" +
                                    "<h4>An error occurred!</h4>" +
                                    "Loading data from backend failed.<br/>" + JSON.stringify(err) + "</div>" );
    }

    Y.namespace( 'doccirrus.insight2' ).analysisVisualisation = {
        makeVisualisation: makeVisualisation,
        visualisationError: visualisationError,
        visualisedCategories: visualisedCategories
    };

}, '0.0.1', {requires: [
    'dcforms-schema-InCase-T'
]});