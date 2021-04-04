/*global YUI */



YUI.add( 'analysisUtils', function( Y/*, NAME*/ ) {

    var firstNode = false;


    /**
     * Creates an instance of Ticketeria.
     */
    var Ticketeria = function() {
        /** @private */    this.curr = 0;
    };

    /**
     * Increments and returns number of current ticket.
     * @return {number} Number of current ticket
     */
    Ticketeria.prototype.draw = function() {
        this.curr = this.curr + 1;
        return this.curr;
    };

    /**
     * Resets number of current ticket to zero.
     */
    Ticketeria.prototype.reset = function() {
        this.curr = 0;
    };
    /*
     * @see ticketeria in the docs
     */

    var ticketeria = new Ticketeria();

    function postProcessData( node, siblingTotal, parentSize, opts ) {

        opts = opts || {};

        if( typeof node === 'undefined' || !node.hasOwnProperty ) {
            return;
        }

        if( node.hasOwnProperty( '_id' ) ) {
            delete node._id;
        }

        var totalVal = opts.showPrice ? node.price : node.total;

        if( node.name === 'root' ) {
            node.sizeOfRoot = 1;
            node.sizeOfParent = 1;
            firstNode = true;
        } else if( node.name === null && firstNode === false ) {
            node.name = 'root';
            node.sizeOfRoot = 1;
            node.sizeOfParent = 1;
            firstNode = true;
        } else {
            node.sizeOfParent = totalVal / siblingTotal;
            node.sizeOfRoot = node.sizeOfParent * parentSize;
        }

        node.n = ticketeria.draw();
        if('children' in node && node.children instanceof Array) {
            node.children.forEach( function( child ) {
                postProcessData( child, totalVal, node.sizeOfRoot, opts );
            } );
        } else {
            node.children = undefined;
        }
        return node;
    }

    //var sTotal = 0;
    //for( var i = 0; i < node.children.length; i++ ) {
    //    var child = node.children[i];
    //    if( child.name === "N/Apl" ) {
    //        if( node.children.length > 1 && typeof child.children === 'undefined' ) {
    //            node.children.splice( i, 1 );
    //            i--;
    //        } else {
    //            child.name = "N/A";
    //        }
    //    }
    //    if( child.total > node.total ) {
    //        child.total = node.total;
    //    }
    //    sTotal += child.total;
    //}

    Y.namespace( 'doccirrus.insight2' ).analysisUtils = {
        postProcessData: postProcessData
    };

}, '0.0.1', {requires: [
]});