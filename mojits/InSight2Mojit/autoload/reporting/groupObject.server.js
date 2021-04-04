/*global YUI */



YUI.add( 'GroupObject', function( Y/*, NAME*/ ) {

    function GroupObject() {
        this.q = {
            $group: {}
        };
    }

    GroupObject.prototype.getQuery = function () {
        return this.q;
    };

    GroupObject.prototype.setId = function (idField) {
        this.q.$group._id = idField;
    };

    GroupObject.prototype.setNameFirst = function (val) {
        this.q.$group.name = {
            $first: val
        };
    };

    GroupObject.prototype.setTotalSum = function (val) {
        this.q.$group.total = {
            $sum: val
        };
    };

    GroupObject.prototype.setPriceSum = function (val) {
        this.q.$group.price = {
            $sum: val
        };
    };

    GroupObject.prototype.setFieldPush = function (val) {
        this.q.$group[val] = {
            $push: '$' + val
        };
    };

    GroupObject.prototype.setFieldPushWithPrice = function (val) {
        this.q.$group[val] = {
            $push: {
                val: '$' + val,
                price: {
                    $cond: [
                        {$ne: ['$' + val, '_EMPTY_']},
                        '$price',
                        0
                    ]
                }
            }
        };
    };

    GroupObject.prototype.setFieldAddToSet = function (val) {
        this.q.$group[val] = {
            $addToSet: '$' + val
        };
    };

    GroupObject.prototype.setFieldAddToSetWithPrice = function (val) {
        this.q.$group[val] = {
            $addToSet: {
                val: '$' + val,
                price: {
                    $cond: [
                        {$ne: ['$' + val, '_EMPTY_']},
                        '$price',
                        0
                    ]
                }
            }
        };
    };

    GroupObject.prototype.setFieldWithOperator = function (val, operator) {
        var opWrapper = {};
        opWrapper['$' + operator] = '$' + val;
        this.q.$group[val] = opWrapper;
    };

    GroupObject.prototype.setChildrenInheritance = function (opts) {
        var children = {
            $push: {
                total: "$total",
                price: "$price",
                name: "$name",
                children: {
                    $slice: ["$children", opts.limit || 10]
                }
            }
        };

        if (opts.additionalFields) {
            children.$push.additionalFields = {};
            opts.additionalFields.forEach(function(fieldName) {
                children.$push.additionalFields[fieldName] = '$' + fieldName;
            });
        }

        this.q.$group.children = children;
    };

    Y.namespace( 'doccirrus.insight2' ).GroupObject = GroupObject;

}, '0.0.1', {requires: [

]});