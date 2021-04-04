'use strict';
var
    printer =
        {
            "name": "nadel_A5quer_180",
            "status": "idle.",
            "formMounted": "",
            "contentTypes": " any",
            "printerTypes": " unknown",
            "description": " nadel_A5quer_180",
            "alerts": " none",
            "location": " ",
            "connection": " direct",
            "interface": " /etc/cups/ppd/nadel_A5quer_180.ppd",
            "onFault": " no alert",
            "afterFault": " continue",
            "usersAllowed": [
                "(all)"
            ],
            "formsAllowed": [],
            "charsetSets": []
        };

module.exports = {
    getData: function() {
        var
            data = JSON.parse( JSON.stringify( printer ) );

        return data;
    }
};

