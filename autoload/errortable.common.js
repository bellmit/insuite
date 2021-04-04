/**
 *
 *  Catch ECONNREST errors, which we don't care about and ignore just those.
 *
 *  All other errors are thrown further to halt the process. Ultimately,
 *  should use domains and clusters to make sure there is 0 downtime.
 *
 *  ideas from http://stackoverflow.com/questions/17245881/node-js-econnreset
 *
 */

/*global YUI*/



YUI.add( 'dcerrortable', function( Y, NAME ) {
        var
            i18n = Y.doccirrus.i18n,
            errorTable,
            table;

        table = {
            '101': {
                '-de': 'Login fehlgeschlagen. Bitte überprüfen Sie Ihre Daten.',
                '-en': 'Login failed: Password or username incorrect.'
            },
            '102': {
                '-de': 'Login fehlgeschlagen. Bitte aktivieren Sie Cookies in Ihrem Browser und laden Sie die Seite erneut.',
                '-en': 'Login failed: Cookies are disabled.  Please enable cookies and then reload the page to continue.'
            },
            '103': {
                '-de': 'Sie können sich nicht an der inSuite anmelden, da Sie keine Berechtigung zum Zugriff außerhalb Ihres Praxisnetzwerkes haben. Bitte sprechen Sie mit Ihrem inSuite Administrator.',
                '-de-ch': 'Sie können sich nicht an der inSuite anmelden, da Sie keine Berechtigung zum Zugriff ausserhalb Ihres Praxisnetzwerkes haben. Bitte sprechen Sie mit Ihrem inSuite Administrator.',
                '-en': 'You cannot login to the inSuite, because access is not permitted outside of practice network. Please contact with your inSuite administrator.'
            },
            '104': {
                '-de': 'Login fehlgeschlagen. Anmeldung wird für $loginDelay Sek. gesperrt.',
                '-en': 'Login failed: you may retry in $loginDelay s.'
            },
            '105': {
                '-de': 'Die Anmeldung ist für Sie derzeitig wegen wiederholter Fehlversuche gesperrt. Bitte versuchen Sie es in $loginDelay Sek nochmal',
                '-en': 'You may currently not login because of repeated login failures.  Please try again in $loginDelay s.'
            },
            '106': {
                '-de': 'Sie haben drei ungültige Anmeldeversuche durchgeführt, daher wird Ihr Account gesperrt. Bitte wenden Sie sich an Ihre Praxis, um Ihren Zugang entsperren zu lassen.',
                '-en': 'Your account has been locked due to three invalid attempts. To unlock it, please contact your practice.'
            },
            '107': {
                '-de': 'Sie haben mehrere ungültige Anmeldeversuche durchgeführt, daher wird Ihr Account für den Zugriff von extern gesperrt. Bitte wenden Sie sich an Ihre inSuite-Administration.',
                '-en': 'You have made several invalid login attempts, so your account will be blocked for external access. Please contact your inSuite administration.'
            },
            '401': {
                '-de': 'Sie verfügen nicht über die notwendigen Rechte. Bitte wenden Sie sich an Ihren Systemadministrator.',
                '-en': 'You do not have the required permissions. Please contact your system administrator.'
            },
            '403': {
                '-de': ' Verboten. Bitte wenden Sie sich an Ihren Systemadministrator.',
                '-en': ' Forbidden. Please contact your system administrator.'
            },
            '404': {
                '-de': 'Nicht gefunden',
                '-en': 'Not found'
            },
            '405': {
                '-de': 'Methode Nicht Erlaubt',
                '-en': 'Method Not Allowed'
            },
            '500': {
                '-de': 'Ein interner Fehler ist aufgetreten.',
                '-en': 'Internal Server Error'
            },
            '503': {
                '-de': 'Dienst aufgrund eines internen Serverfehlers nicht verfügbar',
                '-en': 'Service unavailable due to internal server error'
            },
            '504': {
                '-de': 'Der Dienst hat nicht rechtzeitig geantwortet',
                '-en': "The service didn't respond in time"
            },
            '1001': {
                '-de': 'Ein Fehler ist aufgetreten.',
                '-en': 'An error has occurred.'
            },
            '1002': {
                '-de': '$model konnte nicht gepeichert werden',
                '-en': 'Could not save $model'
            },
            '1003': {
                '-de': 'Keine $entity gefunden.',
                '-en': 'No $entity found.'
            },
            '1004': {
                '-de': '$entity konnte nicht gelöscht werden.',
                '-en': '$entity could be deleted.'
            },
            '1005': {
                '-de': 'Ein Eintrag mit dieser ID existiert nicht.',
                '-en': 'No entry with this ID found.'
            },
            '1401': {
                '-de': 'Die Praxis $pracName hat Ihnen dieses Recht nicht eingeräumt.',
                '-en': 'Die Praxis $pracName hat Ihnen dieses Recht nicht eingeräumt.'
            },
            '1999': {
                '-de': 'KV-Connect Web-Interface Fehler: $message',
                '-en': 'KV-Connect Web-Interface Error: $message'
            },
            // KBVLOG ERROR
            '2000': {
                '-de': 'Für das Quartal $quarter/$year und die Betriebsstätte $commercialNo existiert bereits ein Eintrag. Dieser Eintrag wurde noch nicht versendet!',
                '-en': 'Existing record for quarter $quarter/$year and location $commercialNo. This record was not yet sent!'
            },
            '2001': {
                '-de': '$quarter $year $commercialNo wurde bereits vollständig abgerechnet!',
                '-en': 'Invoice for $quarter $year $commercialNo is already completely invoiced!'
            },
            '2002': {
                '-de': 'KV für die Betriebsstätte $commercialNo nicht gefunden!',
                '-en': 'KV for location $commercialNo not found!'
            },
            '2003': {
                '-de': 'Der Betriebsstätte "$locname" wurde keine Betriebsstättennummer zugeordnet!',
                '-en': 'Location "$locname" has no commercial number!'
            },
            '2004': {
                '-de': 'Abrechnungseintrag muss vor dem Ersetzen erfolgreich versendet worden sein.',
                '-en': 'Invoice entry must be successfully sent before it can be replaced!'
            },
            '2005': {
                '-de': 'KV-Connect ist nicht aktiviert!',
                '-en': 'KV-Connect is not activated!'
            },
            '2006': {
                '-de': 'Versandarten nicht festgelegt!',
                '-en': 'Delivery settings not specified!'
            },
            '2007': {
                '-de': 'Fehler beim Exportieren der Quartalsdaten!',
                '-en': 'Error exporting quarter data!'
            },
            '2008': {
                '-de': 'Fehler beim Erstellen der Abrechnungsdatei!',
                '-en': 'Error creating Invoicefile!'
            },
            '2009': {
                '-de': 'Fehler beim Prüfen der Abrechnungsdatei aufgetreten!',
                '-en': 'Error validating invoice file!'
            },
            '2010': {
                '-de': 'Fehler beim manuellen Senden der Abrechnung!',
                '-en': 'An error has occurred while sending invoice manually.'
            },
            '2011': {
                '-de': 'Beim Prüfen der Abrechnungsdatei sind $warnings Warnung(en) und $errors Fehler aufgetreten!',
                '-en': 'While validating the invoice file $warnings warnings and $errors errors occured!'
            },
            '2012': {
                '-de': 'KV-Connect ist nicht aktiviert!',
                '-en': 'KV-Connect is not activated!'
            },
            '2013': {
                '-de': 'Abrechnungsdatei konnte nicht verschlüsselt werden!',
                '-en': 'Invoice file could not be encrypted!'
            },
            '2014': {
                '-de': 'Abrechnungsdatei konnte gelesen werden!',
                '-en': 'Invoice file could not be read!'
            },
            '2015': {
                '-de': 'Es konnte keine KV-Connect Mailadresse für die Betriebsstätte gefunden werden.',
                '-en': 'There is no KV-Connect mail address for this location.'
            },
            '2017': {
                '-de': 'Fehler beim Prüfen der Kodierregeln!',
                '-en': 'Code validation error!'
            },
            '2018': {
                '-de': 'Es sind nicht abgerechnete Vorquartale für $commercialNo vorhanden. Bitte rechnen Sie diese zunächst ab!',
                '-en': 'Code validation error!'
            },
            '2019': {
                '-de': 'Für die Betriebsstätte $location existiert bereits ein Eintrag. Dieser Eintrag wurde noch nicht versendet!',
                '-en': 'Existing record for location $location. This record was not yet sent!'
            },
            '2020': {
                '-de': 'Es wurden keine $scheinType Scheine gefunden!',
                '-de-ch': 'Es wurden keine $scheinType Fälle gefunden!',
                '-en': 'No $scheinType scheins found!'
            },
            '2021': {
                '-de': 'Beim Versenden der Abrechnung über KV-Connect ist ein Fehler aufgetreten!',
                '-en': 'An error occurred while sending your invoice with KV-Connect!'
            },
            '2022': {
                '-de': 'Kann nicht gelöscht werden, da referenziert von:</br>Kalendern($calendarCount), Akteneinträgen($activityCount), Patienten($patientCount), Mitarbeitern($employeeCount)</br></br>Wenn Sie wirklich löschen möchten, müssen Sie zunächst alle Referenzen löschen.',
                '-en': 'Cannot delete. References are:</br>Calendars($calendarCount), File entries($activityCount), Patients($patientCount), Employees($employeeCount)</br></br>If you really want to delete, you should remove all refences.'
            },
            '2023': {
                '-de': 'Prüfmodul existiert nicht.',
                '-en': 'No available XPM instances.'
            },
            '2024': {
                '-de': 'Für dieses Jahr existieren keine Prüfmodule.',
                '-en': 'No available XPM instances for this year.'
            },
            '2025': {
                '-de': 'Für dieses Qurtal existieren keine Prüfmodule.',
                '-en': 'No available XPM instances for this quarter.'
            },
            '2026': {
                '-de': 'Es existiert kein gültiges Zertifikat.',
                '-en': 'Certificate not exist, nothing to restore. Add new certificate please.'
            },
            '2027': {
                '-de': 'Der Nutzername "$username" wird bereits benutzt!',
                '-en': 'Username "$username" is already in use!'
            },
            '2028': {
                '-de': 'Keine GKV-Versand-Einstellung für diese BS vorhanden!',
                '-en': 'Keine GKV-Versand-Einstellung für diese BS vorhanden!'
            },
            '2029': {
                '-de': 'Die Nachricht konnte nicht verarbeitet werden. Es wurde keine GKV-Abrechnungszeile mit der passenden Message-ID "$messageId" gefunden!',
                '-en': 'Could not process message. Can not find GKV invoice row matching message id "$messageId"!'
            },
            '2030': {
                '-de': 'Die Nachricht mit der Message-ID "$messageId" ist bereits vorhanden!',
                '-en': 'The message with Message-ID "$messageId" already exists!'
            },
            '2031': {
                '-de': 'Abrechnung nicht gefunden!',
                '-en': 'Invoice not found!'
            },
            '2032': {
                '-de': 'Die Betriebstätte der zu ersetzenden Abrechunng ist nicht mehr vorhanden!',
                '-en': 'The location to be replaced is not existing anymore!'
            },
            '2033': {
                '-de': 'Die Abrechnung kann nur ersetzt werden, wenn sie die zeitlich davor liegenden, noch nicht gesendeten Abrechnungen löschen oder abrechnen!',
                '-en': 'The invoice can not be removed until the not yet sent invoices before the one to replace are removed or sent!'
            },
            '2034': {
                '-de': 'Die Abrechnung kann in diesem Zustand nicht mehr gelöscht werden. Bitte schließen Sie die Abrechung ab!',
                '-de-ch': 'Die Abrechnung kann in diesem Zustand nicht mehr gelöscht werden. Bitte schliessen Sie die Abrechung ab!',
                '-en': 'The invoice can not be deleted in this state. Please finish this invoice!'
            },
            '2035': {
                '-de': 'Die Abrechnung kann in diesem Zustand nicht mehr geprüft werden!',
                '-en': 'The invoice can not be validated in this state!'
            },
            '2036': {
                '-de': 'Die Abrechnung kann in diesem Zustand nicht verschlüsselt werden!',
                '-en': 'The invoice can not be encrypted in this state!'
            },
            '2037': {
                '-de': 'Die Abrechnung kann in diesem Zustand nicht ersetzt werden!',
                '-en': 'The invoice can not be replaced in this state!'
            },
            '2038': {
                '-de': 'Es ist kein Geräteadapter angegeben. Bitte wählen Sie den Geräteadapter aus!',
                '-en': 'The Device Server is not specified. Please select a Device Server!'
            },
            '2039': {
                '-de': 'Abrechnungsdatei nicht gefunden!',
                '-en': 'Cashbookfile not found!'
            },
            '2040': {
                '-de': 'Fehler beim lesen der CON-Files von der DB!',
                '-en': 'Error reading the CON files from the DB!'
            },
            '2041': {
                '-de': 'Fehler beim zusammenfügen der CON-Files!',
                '-en': 'Error when merging the CON files!'
            },
            '2042': {
                '-de': 'Datei-Fehler während des zusammenführen der CON-Files! Bitte erzeugen Sie das gewählte CON-File neu und wiederholen den Vorgang!',
                '-en': 'File error while merging the CON files! Please generate the selected CON file again and repeat the process!'
            },
            '2043': {
                '-de': 'Fehler während der Validierung des zusammgeführten CON-Files!',
                '-en': 'Error during validation of the merged CON file!'
            },
            '2044': {
                '-de': 'Packermodul existiert nicht.',
                '-en': 'No available Packer instances.'
            },
            '2045': {
                '-de': 'Fehler während des suchen nach doppelten Ausgaben (Grund- und Zusatzpauschalen) der CON-Files! Bitte erzeugen Sie das gewählte CON-File neu und wiederholen den Vorgang!',
                '-en': 'Errors during the search for double expenses (basic and additional lump sums) of the CON files! Please generate the selected CON file again and repeat the process!'
            },
            '2046': {
                '-de': 'Fehler während das Scan Protocol in der DB gespeichert wird. Bitte erzeugen Sie das gewählte CON-File neu und wiederholen den Vorgang!',
                '-en': 'Errors during process of saving the scan protocol to the db. Please generate the selected CON file again and repeat the process!'
            },


            // kvconnect
            '2100': {
                '-de': 'Bentuzername ist schon vorhanden!',
                '-en': 'Username is already taken'
            },
            '2101': {
                '-de': 'KV-Connect Benutzerkonto ist nicht vorhanden.',
                '-en': 'KV-Connect user account is unknown.'
            },
            '2102': {
                '-de': 'Das eingegebene alte Passwort übereinstimmt nicht mit dem aktuellen Passwort!',
                '-en': 'The entered password does not match the current password'
            },
            '2103': {
                '-de': 'Das neue Passwort darf nicht leer sein.',
                '-en': 'The new password must not be empty!'
            },
            '2104': {
                '-de': 'Das neue Passwort entspricht nicht den Passwortrichtlinien.',
                '-en': 'The new password does not match the password guidelines!'
            },
            '2105': {
                '-de': 'Bitte geben Sie einen PIN ein.',
                '-en': 'Please enter a PIN.'
            },
            '2106': {
                '-de': 'Keine CSR ID vorhanden!',
                '-en': 'No CSR ID available!'
            },

            // TODO: used for everything ....
            '2107': {
                '-de': 'Die signierte Benutzer-Zertifikatsdatei nicht vorhanden!',
                '-en': 'Signed certificate of user not available!'
            },
            '2108': {
                '-de': 'Privater Schlüssel des Benutzers nicht vorhanden.',
                '-en': 'Privat key of user is not available!'
            },

            '2109': {
                '-de': 'Zertifikat des Empfänger nicht gefunden!',
                '-en': 'Certificate of recipient not found!'
            },

            '2110': {
                '-de': 'Kein Benutzer-Zertifikat vorhanden.',
                '-en': 'Certificate of user not available!'
            },

            '2111': {
                '-de': 'Neue Nachrichten werden bereits abgeholt. Bitte warten!',
                '-en': 'New messages are received already. Please wait!'
            },
            '2112': {
                '-de': 'Nachricht bereits empfangen!',
                '-en': 'Message already received!'
            },
            '2113': {
                '-de': 'Das Zertifikat des KV-Connect Servers ist nicht vertrauenswürdig.',
                '-en': 'The certificate of the KV-Connect Server is not trusted.'
            },
            '2114': {
                '-de': 'Das Zertifikat des KV-Connect Servers ist nicht mehr gültig.',
                '-en': 'The certificate of the KV-Connect Server is expired.'
            },
            '2115': {
                '-de': 'KV-Connect Benutzerzertifikat des Senders konnte nicht verifiziert werden. Das Benutzerzertifikat wurde von keiner zulässigen Stelle signiert.',
                '-en': 'The KV-Connect certificate of the sender could not be verified. The certificate was not signed by any authorized party.'
            },

            '2116': {
                '-de': 'Kein Benutzer-Zertifikat vorhanden.',
                '-en': 'Certificate of user not available!'
            },
            '2117': {
                '-de': 'Das Benutzer-Zertifikat ist abgelaufen!',
                '-en': 'Certificate of user is expired!'
            },




            // shiftpatients-api
            '2300': {
                '-de': 'Nicht alle Leistungen konnten zugeordnet werden!',
                '-en': 'Not all treatments could be assigned!'
            },
            // pvslog
            '2501': {
                '-de': 'Keine PADX Einstellungen gefunden. <a href="invoiceadmin#/pvs">Einstellung erstellen?</a>',
                '-en': 'PADX Settings not found. <a href="invoiceadmin#/pvs">Create setting?</a>'
            },
            '2502': {
                '-de': 'Es wird bereits eine PVS-Abrechnung geprüft. Bitte warten Sie bis die Prüfung beendet ist!',
                '-en': 'There is already one PVS invoice validation running. Please wait until this validation is done!'
            },
            '2503': {
                '-de': 'Bitte konfigurieren Sie Betriebsstätten in den <a href="invoiceadmin#/pvs">PADX Einstellungen</a>',
                '-en': 'Please configure locations in <a href="invoiceadmin#/pvs">PADX Settings</a>'
            },
            // cashlog
            '2505': {
                '-de': 'Keine Konfiguration gefunden.<br/><a href="invoiceadmin#/cash">Konfiguration erstellen</a>',
                '-en': 'Settings not found.<br/><a href="invoiceadmin#/cash">Create setting</a>'
            },
            '2506': {
                '-de': 'Bitte konfigurieren Sie Betriebsstätten in den <a href="invoiceadmin#/cash">Rechnungen Einstellungen</a>',
                '-en': 'Please configure locations in <a href="invoiceadmin#/cash">Invoice Settings</a>'
            },
            '2507': {
                '-de': 'Der Vorgang "$log $operation" wurde bereits von $person gestartet. Bitte warten Sie, bis der Vorgang abgeschlossen ist (gestartet vor $started Minuten).',
                '-en': 'The "$log $operation" process has already been started by $person. Please wait until the process is complete (started $started ago).'
            },
            // tarmedlog
            '2508': {
                '-de': 'Keine Konfiguration gefunden.<br/><a href="invoiceadmin#/tarmed">Konfiguration erstellen</a>',
                '-en': 'Settings not found.<br/><a href="invoiceadmin#/tarmed">Create setting</a>'
            },
            '2509': {
                '-de': 'Der Vorgang gestartet. Bitte warten Sie, bis der Vorgang abgeschlossen ist.',
                '-en': 'The process has already been started. Please wait until the process is complete.'
            },
            '3000': {
                '-de': 'Die eGK ist ungültig und darf nicht zur Abrechnung verwendet werden.'
            },
            '3001': {
                '-de': 'Bitte Hinweis an Patient, dass KVK veraltet ist.'
            },
            '3002': {
                '-de': 'Die Versichertenkarte ist abgelaufen!'
            },
            '3003': {
                '-de': 'Die Versichtenkarte ist noch nicht gültig.'
            },
            '3004': { // P2-270
                '-de': 'Die IKNR/VKNR/KTAB Kombination dieser Karte ist nicht bekannt. Bitte halten Sie Rücksprache mit der zuständigen Kassenärztlichen Vereinigung.'
            },
            '3005': {
                '-de': 'Der Kostenträger dieser Karte ist aufgelöst.'
            },
            '3006': {
                '-de': 'Der Kostenträger dieser Karte ist noch nicht gültig. Bitte halten Sie Rücksprache mit der zuständigen Kassenärztlichen Vereinigung.'
            },
            '3007': {
                '-de': 'Die IKNR dieser Karte ist nicht mehr gültig. Ein Weiterarbeiten mit ungültiger IKNR ist möglich.'
            },
            '3008': {
                '-de': 'Die IKNR dieser Karte ist noch nicht gültig. Bitte halten Sie Rücksprache mit der zuständigen Kassenärztlichen Vereinigung.'
            },
            '3009': {
                '-de': 'Der KT-Abrechnungsbereich dieser Karte ist nicht mehr gültig. Bitte halten Sie Rücksprache mit der zuständigen Kassenärztlichen Vereinigung.'
            },
            '3010': {
                '-de': 'Der KT-Abrechnungsbereich dieser Karte ist noch nicht gültig. Bitte halten Sie Rücksprache mit der zuständigen Kassenärztlichen Vereinigung.'
            },
            '3011': {
                '-de': 'Kartenleser Server nicht verfügbar.'
            },
            '3012': {
                '-de': 'Eine Privatversichertenkarte liegt vor.'
            },
            '3013': {
                '-de': 'Der Kostenträger dieser Karte ist aufgelöst.'
            },
            '3014': {
                '-de': 'Kostenträger ist in dieser KV nicht zulässig.'
            },
            '3015': {
                '-de': 'Die Krankenversichertenkarte ist seit dem 01.01.2015 ungültig und darf zur Abrechnung nicht verwendet werden.'
            },
            '3016': {
                '-de': 'Zu den gelesenen Kartendaten konnten mehr als ein passender Patient gefunden werden. Ein neuer Patient wurde angelegt.'
            },
            '3017': {
                '-de': 'SDKT Katalog nicht gefunden!'
            },
            '3018': {
                '-de': 'Bitte Hinweis an Patient, dass eGK veraltet. Eine neuere Karte wurde bereits im aktuellen Quartal gelesen!'
            },
            '3019': {
                '-de': 'Die Karte war nur bis $insurance.ends gültig und darf zur Abrechnung nicht verwendet werden.'
            },
            '3020': {
                '-de': 'Die Karte ist erst ab dem $insurance.starts gültig und darf zur Abrechnung noch nicht verwendet werden.'
            },
            '3021': {
                '-de': 'Keine PADX Konfiguration zugewiesen Bitte löschen Sie die Zeile und erstellen Sie eine Neue.'
            },
            '3022': {
                '-de': 'Zugewiesene PADX Konfiguration nicht gefunden.'
            },
            '3023': {
                '-de': 'Das Kartenlesedatum liegt in der Zukunft! Bitte überprüfen Sie die Einstellungen von Ihrem Kartenleser und korrigieren Sie diese!'
            },
            '3024': {
                '-de': 'Die Kartendaten sind älter als 2 Quartale. $cardSwipe'
            },
            '3025': {
                '-de':  i18n( 'InCaseMojit.insurance-modelJS.messages.NOTICE_ASYLBLG' )
            },
            '3026': {
                '-de':  'Eine neuere Version des Patienten ist vorhanden. Die erfassten Daten werden als frühere Version gespeichert.'
            },
            '3099': {
                '-de': 'BSNR/LANR Kombination im Katalog nicht gefunden.'
            },
            '4000': {
                '-de': 'Die eingelesenen Patientendaten werden beim Speichern in Vergangenheit angelegt.'
            },
            '4001': {
                '-de': 'Eine Patient-Version wurde in der Vergangenheit angelegt.'
            },
            '4002': {
                '-en': 'The insurance could not be deleted, as there are still case folders of this type existing in the patient\'s case file. Please empty and delete all case folders of this type before proceeding.',
                '-de': 'Der Kostenträger kann nicht gelöscht werden, da es noch Fälle für diesen Kostenträger gibt. Löschen Sie bitte zunächst etwaige Einträge in diesen Fällen, dann die Fälle und versuchen Sie es danach bitte erneut.'
            },
            '4500': {
                '-de': 'Der Schein wurde nicht gefunden.',
                '-de-ch': 'Der Fall wurde nicht gefunden.'
            },
            '4501': {
                '-de': 'Fehler beim Laden der Patientenversion..'
            },
            '4502': {
                '-de': 'Patient wurde nicht gefunden.'
            },
            '4503': {
                '-de': 'Die Patientenversion wurde nicht durch ein Kartenlesegerät erfasst!'
            },
            '5000': {
                '-de': 'Dieser Katalog darf nicht erweitert werden.'
            },
            '5001': {
                '-de': 'Dieser Katalog wird nicht mehr benutzt, bitte wählen Sie einen anderen.'
            },
            '5002': {
                '-de': 'Es ist nicht erlaubt einen Folgeschein (der mit der Übernahme und Fortführung Bewilligter Leistungen entsteht) zeitlich vor den ursprünglichen Schein zu datieren.'
            },
            '5003': {
                '-en': 'You can not create new types of medications. Please contact your system administrator!',
                '-de': 'Sie können keine neuen Medizindatentypen anlegen. Bitte wenden Sie sich an Ihren Systemadministrator!'
            },
            '6001': {
                '-de': 'Die Arzneimitteldatenbank konnte nicht erreicht werden.'
            },
            '6002': {
                '-de': 'Bitte wählen Sie ein Produkt aus.'
            },
            '6003': {
                '-de': 'Bitte wählen Sie eine Packung aus.'
            },
            // calendar messages
            '7000': { // -1
                '-de': 'Der angegebene Termin liegt innerhalb einer Sperrzeit.',
                '-en': 'The specified date lies inside a close time.'
            },
            '7001': { // -2
                '-de': 'Der angegebene Termin ist außerhalb der Sprechzeiten.',
                '-de-ch': 'Der angegebene Termin ist ausserhalb der Sprechzeiten.',
                '-en': 'The specified date is outside consulting time.'
            },
            '7002': { // -3
                '-de': 'Sperrzeiten können nicht in der Vergangenheit angelegt werden.',
                '-en': 'Closed periods can not be created in the past.'
            },
            '7003': { // 0
                '-de': 'Der angegebene Termin führt zu einer Überschneidung mit einem anderen Termin.',
                '-en': 'The specified appointment results in an overlap with another appointment.'
            },
            '7004': {
                '-de': 'Für den angegebenen Termin stehen die folgenden Ressourcen nicht ausreichend zur Verfügung: $resources. <br/>Termin trotzdem buchen?',
                '-en': 'For the specified date the following resources are not sufficiently available: $resources. <br/>Book appointment anyway?'
            },
            '7005': { // -7
                '-de': 'Die Termin Zeiten sind ungültig.',
                '-en': 'The appointment time is invalid.'
            },
            '7006': { // for adhoc
                '-de': 'Aktuell kann kein Spontantermin gebucht werden. Nutzen Sie bitte einen Plantermin.',
                '-en': 'Currently no spontaneous appointment can be booked. Please use a planned date.'
            },
            '7007': { // -5
                '-de': 'Ein wartender Patiententermin kann nicht in der Vergagngenheit angelegt werden.',
                '-en': 'A waiting patient appointment can not be created in the past.'
            },
            '7008': { // -6
                '-de': 'Ganztägige Termine können nur in Infokalendern angelegt werden. In Arztkalender können zur ganztägigen Belegung Sperrzeiten verwendet werden.',
                '-en': 'All-day appointments can only be created in info calendars. In doctor`s calendars, closed times can be used for all-day occupancy.'
            },
            '7009': { // -3?
                '-de': 'Die angegebene Sperrzeit betrifft bereits erstellte Termine. Bitte verschieben Sie diese Termine und versuchen Sie es erneut.',
                '-en': 'The specified close time affects already created appointments. Please postpone these dates and try again.'
            },
            '7010': {
                '-de': 'Sie haben die Kapazitätsgrenze dieser Terminart durch mehrere parallele oder überlappende Termine derselben Art erreicht.',
                '-en': 'You have reach the capacity for this activity type due to multiple parallel or overlapping appointments of the same type.'
            },
            '7011': {
                '-de': 'Einige Wiederholungen liegen außerhalb der Sprechzeiten. Wollen Sie dennoch eintragen?',
                '-de-ch': 'Einige Wiederholungen liegen ausserhalb der Sprechzeiten. Wollen Sie dennoch eintragen?',
                '-en': 'A repetition entry lies outside consulting time. Do you still want to proceed with save?'
            },
            '7012': {
                '-de': 'Einige Wiederholungen liegen innerhalb einer Sperrzeit. Wollen Sie dennoch eintragen?',
                '-en': 'A repetition entry lies inside a blocked time. Do you still want to proceed with save?'
            },
            '7013': {
                '-de': 'Diese(r) Patient(in) ist nicht in Ihrer Betriebsstätte. Zugriff nicht erlaubt.',
                '-en': 'Access to this patient is not allowed.'
            },
            '7014': {
                '-de': 'Mehr als 120 Treffer.',
                '-en': 'More than 120 hits.'
            },
            '7015': {
                '-de': 'Diese(r) Patient(in) ist nicht in Ihrer Betriebsstätte. Änderung nicht erlaubt.',
                '-en': 'Updating of this patient is not allowed.'
            },
            '7016': {
                '-de': 'Diese(r) Patient(in) ist nicht in Ihrer Betriebsstätte. Löschung nicht erlaubt.',
                '-en': 'Deletion of this patient is not allowed.'
            },
            '7017': {
                '-de': 'Diese Terminart ist zu dieser Zeit nicht verfügbar. Wollen Sie den Termin trotzdem buchen?',
                '-en': 'This appointment type is not available for that time. Do you want to book this appointment anyhow?'
            },
            // incase settings
            '7100': {
                '-de': 'Die von Ihnen vergebene Patientennummer existiert bereits. Bitte vergeben Sie eine gültige Patientennummer.',
                '-en': 'The number already exists. Please enter another number.'
            },
            // invoice settings
            '7200': {
                '-de': 'Die Standardeinstellung darf nicht entfernt werden.',
                '-en': 'The default setting should not be removed.'
            },
            '7201': {
                '-de': 'Sie können nur eine Einstellung pro Betriebsstätte vornehmen.',
                '-en': 'At most one setting per location is applicable.'
            },
            // employee management
            '7300': {
                '-de': 'Sie können diese Operation nicht auf Ihrem eigenen Eintrag durchführen.',
                '-en': 'You cannot perform this operation on your own entry.'
            },
            '7301': {
                '-de': 'Ungültige PIN',
                '-en': 'Invalid PIN'
            },
            '7302': {
                '-de': 'Der Schlüssel eines oder mehrerer diese Partner hat sich geändert. Bitte bestätigen Sie diese geänderten Schlüssel unter Verwaltung/inSuite/Partner und führen Sie die Aktion dann erneut aus.',
                '-en': 'Partner is not confirmed'
            },
            '7303': {
                '-de': 'Der Schlüssel ist abgelaufen. Bitte erzeugen Sie einen neuen Schlüssel.',
                '-en': 'The key is expired, please create a new key.'
            },
            '7304': {
                '-de': 'Dieser Datensafe ist nicht für Support eingerichtet. Bitte melden Sie dies bei Doc Cirrus.',
                '-en': 'This data safe is not setup to provide support assistance. Please notify Doc Cirrus.'
            },
            '7305': {
                '-de': 'Sie versuchen einen lokalen Benutzer einzuladen. Bitte verwenden Sie die vorhandene Funktion, um mit internen Benutzern zu kommunizieren.',
                '-en': 'You are trying to invite a local user.  Please invite only internal users.'
            },
            '7306': {
                '-de': 'Sie versuchen einen bereits registrierten Partner erneut zu registireren. Bitte verwenden Sie den vorhandenen Account!',
                '-en': 'Try to re-register a registered partners. Please use the existing account!'
            },
            '7307': {
                '-de': 'Mitarbeiter hat abhängige Akteneinträge und kann nicht gelöscht werden. Setzen Sie den Status auf deaktiviert. Damit kann sich der Mitarbeiter nicht mehr einloggen und erscheint nicht mehr in der Mitarbeiter Auswahl.',
                '-en': 'You can\'t delete this Employee, because it still has Activities.'
            },
            '7308': {
                '-de': 'Ein Supportzugang wurde bereitgestellt, aber es konnte keine E-Mail-Benachrichtigung gesendet werden. Bitte benachrichtigen Sie den Support per Telefon.',
                '-en': 'A support request was successfully created, but the e-mail notification could not be sent. Please notify support via telephone.'
            },
            '7309': {
                '-de': 'Netzwerkfehler: Kein Supportzugang aktiviert. Die Cloud-Dienste von Doc Cirrus sind zurzeit nicht erreichbar.',
                '-en': 'Network error: No support request created. The Doc Cirrus cloud service is currently not reachable.'
            },
            '7310': {
                '-de': 'Interner Serverfehler: Es konnte kein Supportzugang bereitgestellt werden. Bitte kontaktieren Sie den Support per Telefon oder über den Feedback-Button.',
                '-en': 'Internal server error: A support account could not be activated. Please contact support via telephone or create an issue via the feedback button.'
            },
            // PRCS CLI
            '8001': {
                '-de': 'Ein unbestimmter Fehler ist aufgetreten.',
                '-en': 'An unspecific error has appeared.'
            },
            '8002': {
                '-de': 'Ein Kommandozeilenparameter fehlt.',
                '-en': 'Command line option is missing.'
            },
            '8010': {
                '-de': 'Ein Gerät wurde nicht gefunden.',
                '-en': 'Device not found.'
            },
            '8012': {
                '-de': 'Das Zeitstempelformat des Wiederherstellungspunktes ist falsch.',
                '-en': 'Invalid timestamp format of the restore point.'
            },
            '8013': {
                '-de': 'RAID Verbund nicht gefunden. Bitte legen Sie zuerst ein RAID Verbund an.',
                '-en': 'RAID device not found. Please create RAID at first.'
            },
            '8014': {
                '-de': 'Es ist kein Massenspeicher eingehängt.',
                '-en': 'Storage device not mounted.'
            },
            '8015': {
                '-de': 'Unbestimmter Ein/Ausgabefehler aufgetreten. Das Gerät wurde eventuell während der Nutzung entfernt oder ist beschädigt.',
                '-en': 'Unspecific I/O error happened. The device was removed during usage or is maybe damaged.'
            },
            '8016': {
                '-de': 'Das Gerät hat zu wenig Kapazität für einen erfolgreiche Backup-Synchronisierung verfügbar.',
                '-en': 'The device does not have enough capacity for a successful backup synchronization.'
            },
            '8017': {
                '-de': 'Backupdaten auf dem Backupmedium sind korrupt. Bitte reinitialisieren Sie das Backupgerät und starten Sie die Synchronisierung erneut.',
                '-en': 'Data on backup device are corrupted. Please reinitilize the backup device and start the synchronization again.'
            },
            '8018': {
                '-de': 'Netzwerkkarte nicht gefunden.',
                '-en': 'Network device not found.'
            },
            '8019': {
                '-de': 'Das Format der Daten ist falsch.',
                '-en': 'Invalid value format.'
            },
            '8020': {
                '-de': 'Eine vorhergehende Netzwerkkonfiguration wurde noch nicht abgeschlossen.',
                '-en': 'Network configuration is still unfinished.'
            },
            '8021': {
                '-de': 'Netzwerkkonfiguration fehlgeschlagen.',
                '-en': 'Network configuration change failed.'
            },
            '8022': {
                '-de': 'RAID Verbund existiert bereits.',
                '-en': 'RAID device already exists.'
            },
            '8023': {
                '-de': 'Es können dem RAID Verbund keine weiteren Festplatten zugeordnet werden.',
                '-en': 'Its not possible to add more disks to the RAID.'
            },
            '8024': {
                '-de': 'Es können keine weiteren Festplatten aus dem RAID Verbund entfernt werden.',
                '-en': 'Its not possible to remove more disks from the RAID.'
            },
            '8025': {
                '-de': 'Das Speichermedium ist nicht eingehängt.',
                '-en': 'Device not mounted.'
            },
            '8026': {
                '-de': 'Das Speichermedium ist gerade durch eine andere Aktion in Benutzung.',
                '-en': 'Device is currently blocked.'
            },
            '8027': {
                '-de': 'Das Backupmedium ist in Ordnung, es wurden keine Backupdaten gefunden.',
                '-en': 'Backup device is ok, but no backup data found.'
            },
            '8028': {
                '-de': 'Es wurde kein USB Key gefunden.',
                '-en': 'No USB key device found.'
            },
            '8029': {
                '-de': 'Ungeeigneter USB Key.',
                '-en': 'Invalid USB key device.'
            },
            '8030': {
                '-de': 'Die Operation wird auf diesem Datensafe nicht unterstützt.',
                '-en': 'Operation unsupported on this Datensafe.'
            },
            '8031': {
                '-de': 'Das Update des Datensafes ist fehlgeschlagen. Bitte versuchen Sie es später erneut.',
                '-en': 'Datensafe update failed, please try again later.'
            },
            '8032': {
                '-de': 'Die Aktion kann nicht ausgeführt werden, da gerade ein Softwareupdate läuft.',
                '-en': 'Action is blocked by a current running software update.'
            },
            '8033': {
                '-de': 'Die Aktion kann nicht ausgeführt werden, da gerade ein Backup läuft.',
                '-en': 'The action will fail because a backup is running.'
            },
            '8034': {
                '-de': 'Der Backup-Key konnte nicht gefunden werden.',
                '-en': 'Backup key not found.'
            },
            '8035': {
                '-de': 'Backupdaten werden aktuell auf ein externes Gerät geschrieben.',
                '-en': 'Backup data synchronization in progress.'
            },
            '8036': {
                '-de': 'Der Backup-Key ist falsch.',
                '-en': 'Invalid backup key.'
            },
            '8037': {
                '-de': 'Das Backup Repository ist durch eine andere Operation blockiert.',
                '-en': 'Backup repository is blocked by another operation.'
            },
            '8038': {
                '-de': 'Das Backup Gerät ist ungeeignet. Eventuell Initialisierung notwendig?',
                '-en': 'Backup device invalid. Maybe initialization needed?'
            },
            '8050': {
                '-de': 'Das Verzeichnis konnte nicht gefunden werden.',
                '-en': 'Directory not found.'
            },
            '8051': {
                '-de': 'Samba: Verbindung zum entfernten Rechner fehlgeschlagen.',
                '-en': 'Samba: Connection to remote host failed.'
            },
            '8052': {
                '-de': 'Samba: Zugangsdaten wurden nicht akzeptiert.',
                '-en': 'Samba: Logon failed.'
            },
            '8053': {
                '-de': 'Samba: Geteiltes Verzeichnis wurde nicht gefunden.',
                '-en': 'Samba: Shared directory not found.'
            },
            '8054': {
                '-de': 'Samba: Passwort enthält ungültige Zeichen. Erlaubt: .#!$%&/()=<>;,:a-zA-Z0-9_-',
                '-en': 'Samba: Password contains illegal characters. Supported: .#!$%&/()=<>;,:a-zA-Z0-9_-'
            },
            '8060': {
                '-de': 'Cloud: Zugangsdaten wurden nicht akzeptiert.',
                '-en': 'Cloud: Access denied.'
            },
            '8061': {
                '-de': 'Cloud: Verbindung zum Backup Server fehlgeschlagen.',
                '-en': 'Cloud: Connection to backup server failed.'
            },
            '8064': {
                '-de': 'Cloud: Zugangsdaten wurden nicht gefunden. Eventuell ist Cloud-Backup für diesen Datensafe noch nicht freigeschaltet.',
                '-en': 'Cloud: Credentials not found. Maybe cloud backup is not unlocked on this Datensafe.'
            },
            '8070': {
                '-de': 'PEM-Datei enthält keinen privaten Schlüssel.',
                '-en': 'PEM file does not contain private key.'
            },
            '8071': {
                '-de': 'PEM-Datei enthält kein X509 Zertifikat.',
                '-en': 'PEM file does not contain X509 certificate.'
            },
            '8072': {
                '-de': 'PEM-Datei enthält ein abgelaufenes X509 Zertifikat.',
                '-en': 'PEM file contains outdated X509 certificate.'
            },
            '8073': {
                '-de': 'PEM-Datei enthält ein X509 Zertifikat, welches noch nicht aktiv ist.',
                '-en': 'PEM file contains X509 certificate, which is not yet valid.'
            },
            '8074': {
                '-de': 'PEM-Datei enthält einen nicht unterstützten verschlüsselten privaten Schlüssel.',
                '-en': 'PEM file contains unsupported encrypted private key.'
            },
            '8075': {
                '-de': 'PEM-Datei enthält ein Zertifikat, dessen Nutzung nicht für die Serverauthentifizierung geeignet ist.',
                '-en': 'PEM file contains X509 certificate, which extended usage is not for server authentication.'
            },
            //mmi-api
            '9000': {
                '-de': 'Ihr MMI Dienst steht aktuell nicht zur Verfügung. Sie sind nicht berechtigt, diesen Dienst zu nutzen.',
                '-en': 'Your MMI service is currently not available. You are not authorized to use this service.'
            },
            '9001': {
                '-de': 'Ihr MMI Dienst steht aktuell nicht zur Verfügung.',
                '-en': 'Your MMI service is currently not available.'
            },
            '9002': {
                '-de': 'Es ist ein Fehler aufgetreten. Der Medikationsplan konnte nicht erstellt werden!',
                '-en': 'An error has occurred. The medication plan could not be created!'
            },
            '9003': {
                '-de': 'MMI Dienst sollte ein Objekt zurückgeben.',
                '-en': 'MMI service should return an object.'
            },
            '10000': {
                '-de': 'Die Leistungen der ausgewählten Kette basieren auf einem Katalog der nicht zum Kostenträger dieses Falls passt.',
                '-de-ch': 'Die Leistungen der ausgewählten Kette basieren auf einem Katalog der nicht zum Kostenträger dieses Fallordners passt.',
                '-en': 'The treatments of this Chain are based on a catalog that is not allowed for this Case and its related Cost Unit.'
            },
            '10001': {
                '-de': 'Die Kette ist nicht gültig.',
                '-en': 'Activity sequence is invalid.'
            },
            '10400': {
                '-de': 'Kette nicht gefunden.',
                '-en': 'Activity sequence not found.'
            },
            //jawbone
            'jawbone_01': {
                '-de': 'Jawbone config is missing. Contact Support!!!',
                '-en': 'Jawbone config is missing. Contact Support!!!'
            },
            //basecontacts
            '12000': {
                '-de': 'Der Kontakt kann nicht gelöscht werden, weil der Kontakt anderen Daten zugeordnet ist.',
                '-en': 'The contact can not be deleted, because the contact is assigned to other Data.'
            },
            //sdmanager
            '13200': {
                '-de': 'Keine Karte vorhanden.',
                '-en': 'No card present.'
            },
            '13210': {
                '-de': 'Diese Karte ist bereits vergeben.',
                '-en': 'This card is already in use.'
            },
            '13220': {
                '-de': 'Der inPort Geräteadapter auf diesem Rechner läuft nicht oder ist nicht korrekt verbunden.',
                '-en': 'The inPort device adapter on this computer is not running or not properly connected.'
            },
            '13230': {
                '-de': 'Die Versicherungskarte konnte nicht gelesen werden. Bitte entfernen Sie die Karte und versuchen es nochmal.',
                '-en': 'The card could not be read, please check the card and try re-inserting it.'
            },
            '13240': {
                '-de': 'Die Anfrage an den XEDO Covercard Service ist fehlgeschlagen. Bitte klicken Sie den Kartenlese-Button erneut.',
                '-de-ch': 'Die Anfrage an den XEDO Covercard Service ist fehlgeschlagen. Bitte klicken Sie den Kartenlese-Button erneut.',
                '-en': 'The request to XEDO Covercard Service failed. Please press the card read button again'
            },
            '13400': {
                '-de': 'Ein oder mehrere Rechner konnten nicht gefunden werden.',
                '-en': 'One or more computer(s) can not be found.'
            },

            //casefolder-api
            '14000': {
                '-de': 'Sie dürfen den Fall nicht löschen solange er noch Einträge enthält. Löschen Sie zunächst diese Einträge oder ordnen Sie sie einem anderen Fall zu.',
                '-de-ch': 'Sie dürfen den Fallordner nicht löschen solange er noch Einträge enthält. Löschen Sie zunächst diese Einträge oder ordnen Sie sie einem anderen Fallordner zu.',
                '-en': 'You can not delete this case while it has entries. First delete these items or move them to another case.'
            },
            '14001': {
                '-de': 'Der Fall "$title" ist abhängig von der ASV Teamnummer. Wenn Sie den Fall löschen wollen entfernen Sie die ASV Teamnummer. Wenn bereits Akteneinträge erstellt wurden kann dieser Fall nicht mehr gelöscht werden.',
                '-de-ch': 'Der Fallordner "$title" ist abhängig von der ASV Teamnummer. Wenn Sie den Fallordner löschen wollen entfernen Sie die ASV Teamnummer. Wenn bereits Akteneinträge erstellt wurden kann dieser Fallordner nicht mehr gelöscht werden.',
                '-en': 'Der Fall "$title" ist abhängig von der ASV Teamnummer. Wenn Sie den Fall löschen wollen entfernen Sie die ASV Teamnummer. Wenn bereits Akteneinträge erstellt wurden kann dieser Fall nicht mehr gelöscht werden.'
            },
            '14002': {
                '-de': 'Ihre Aktion konnte nicht ausgeführt werden. Sie haben nicht die benötigten Rechte einen neuen Fall anzulegen',
                '-de-ch': 'Ihre Aktion konnte nicht ausgeführt werden. Sie haben nicht die benötigten Rechte einen neuen Fallordner anzulegen',
                '-en': 'Action could not be carried out. You do not have sufficient rights to create a new case folder.'
            },
            '14003': {
                '-de': 'Sie dürfen den Fall nicht löschen.',
                '-de-ch': 'Sie dürfen den Fallordner nicht löschen.',
                '-en': 'You can not delete this case.'
            },
            '14004': {
                '-de': 'Sie haben versucht einen Fall für den Kostenträggertyp $type zu erzeugen, der Patient hat allerdings keinen passenden Kostenträger.',
                '-de-ch': 'Sie haben versucht einen Fallordner für den Kostenträggertyp $type zu erzeugen, der Patient hat allerdings keinen passenden Kostenträger.',
                '-en': 'You tried to create a case folder for the type $type, but the patient does not have a suitable insurance.'
            },
            //licensing errors
            '15001': {
                '-de': 'Benutzer konnte nicht gespeichert werden: Ihr Limit an Arzt-Benutzern ist bereits erreicht.<br><br>Bitte reduzieren Sie die Anzahl ensprechend Ihrer aktuellen <a href="/admin/insuite#/license_scope" target="_blank">Lizenz</a> und versuchen Sie es erneut.',
                '-en': 'User could not be saved: LANR user limit has already been reached.<br><br>Please reduce the amount to a level corresponding with your current <a href="/admin/insuite#/license_scope" target="_blank">license</a> and try again.'
            },
            '15002': {
                '-de': 'Benutzer konnte nicht gespeichert werden: Ihr Limit an MFA-/anderen Benutzern ist bereits erreicht.<br><br>Bitte reduzieren Sie die Anzahl ensprechend Ihrer aktuellen <a href="/admin/insuite#/license_scope" target="_blank">Lizenz</a> und versuchen Sie es erneut.',
                '-en': 'User could not be saved: MFA/other user limit has already been reached.<br><br>Please reduce the amount to a level corresponding with your current <a href="/admin/insuite#/license_scope" target="_blank">license</a> and try again.'
            },
            '15003': {
                '-de': 'Betriebstätte konnte nicht gespeichert werden: Ihr Limit an Betriebstätten ist bereits erreicht.<br><br>Bitte reduzieren Sie die Anzahl ensprechend Ihrer aktuellen <a href="/admin/insuite#/license_scope" target="_blank">Lizenz</a> und versuchen Sie es erneut.',
                '-en': 'Location could not be saved: BSNR limit has already been reached.<br><br>Please reduce the amount to a level corresponding with your current <a href="/admin/insuite#/license_scope" target="_blank">license</a> and try again.'
            },
            //PADX
            '17000': {
                '-de': 'Keine PADX Einstellungen vorhanden.',
                '-en': 'PADX is not configured.'
            },
            '16000': {
                '-de': 'Socket nicht mehr verfügbar.',
                '-en': 'Socket no longer available'
            },
            '17001': {
                '-de': 'Keine inVoice Einstellungen vorhanden.',
                '-en': 'inVoice is not configured.'
            },
            '17002': {
                '-de': 'Kann keine PADX-Einträge in MwSt-Einstellungen finden.',
                '-en': 'cannot find PADX-entrues in vat config.'
            },
            '17003': {
                '-de': 'Fehler beim Erstellen von Nutzdaten.',
                '-en': 'Error while creating Nutzdaten.'
            },
            '17004': {
                '-de': 'Fehler beim Erstellen von Auftragsdaten.',
                '-en': 'Error while creating Auftragsdaten.'
            },
            '17005': {
                '-de': 'Kann nicht PADX-Zertifizierungsnummer für dieses System finden.',
                '-en': 'Cannot find PADX certification Number for system.'
            },
            '17006': {
                '-de': 'Ungültige Empfänger RZID.',
                '-en': 'Invalid recipient RZID.'
            },
            '17007': {
                '-de': 'Ungültige Zwischenstelle RZID.',
                '-en': 'Invalid proxy recipient RZID.'
            },
            '17008': {
                '-de': 'Ungültige Absender RZID.',
                '-en': 'Invalid sender RZID.'
            },
            '17009': {
                '-de': 'OneCLick Name und Passwort sind nicht eingetragen.',
                '-en': 'OneCLick name and password have not been entered.'
            },
            '17010': {
                '-de': 'OneCLick Dateiname/Dateibytes fehlen.',
                '-en': 'OneCLick file name/file bytes missing.'
            },
            // activity operations, activity-api
            '18000': {
                '-de': 'Sie können diesen Schein nicht löschen oder stornieren, da es Akteneinträge gibt, die dann nicht mehr mit einem gültigen Schein verbunden sind.',
                '-de-ch': 'Sie können diesen Fall nicht löschen oder stornieren, da es Akteneinträge gibt, die dann nicht mehr mit einem gültigen Fall verbunden sind.',
                '-en': 'You can not delete or cancel this Schein because there are files, which are then no longer connected to a valid license.'
            },
            '18001': {
                '-de': 'Sie können den Schein nicht auf dieses Datum verschieben, da es Akteneinträge gibt, die dann nicht mit einem gültigen Schein verbunden sind.',
                '-de-ch': 'Sie können den Fall nicht auf dieses Datum verschieben, da es Akteneinträge gibt, die dann nicht mit einem gültigen Fall verbunden sind.',
                '-en': 'You can not move on this date the bill because there are files, which are then not connected to a valid license.'
            },
            '18002': {
                '-de': 'Sie können diesen Eintrag nicht speichern, da für die ausgewählte Betriebsstätte kein gültiger Schein existiert.',
                '-de-ch': 'Sie können diesen Eintrag nicht speichern, da für die ausgewählte Betriebsstätte kein gültiger Fall existiert.',
                '-en': 'Storing this treatment / diagnosis is not possible because it is not within a valid Schein.'
            },
            '18003': {
                '-de': 'Es gibt noch nicht aufgebrauchte Leistungen aus dem aktuellen Bewilligungsbescheid. Einen neuen Bewilligungsbescheid können Sie erst anlegen, wenn alle Leistungen aus dem aktuellen erbracht wurden.',
                '-en': ''
            },
            '18004': {
                '-de': 'Bei der Berechnung des Bewilligungsbescheides ist ein Fehler aufgetreten. Bitte wenden Sie sich an den Doc Cirrus Support.',
                '-en': 'In calculating the approval notification was an error. Please contact your Doc Cirrus Support.'
            },
            '18005': {
                '-de': 'Patient wurde nicht gefunden.',
                '-en': 'Patient could not be found.'
            },
            '18006': {
                '-de': 'Der Patient benötigt einen Kostenträger, damit Sie Einträge in einem Fall dokumentieren können.',
                '-de-ch': 'Der Patient benötigt einen Kostenträger, damit Sie Einträge in einem Fallordner dokumentieren können.',
                '-en': 'The patient must have an insurance entry, in order to create entries in the case file.'
            },
            '18007': {
                '-de': 'Ein mal freigegebene Akteneinträge können nachträglich nicht mehr verändert werden.',
                '-en': 'An approved activity can not be subsequently changed.'
            },
            '18008': {
                '-de': 'Die Aktion konnte nicht durchgeführt werden, da Akteneinträge nicht in die Zukunft verschoben werden dürfen.',
                '-en': 'The action could not be performed because entries may not be moved in the future.'
            },
            '18009': {
                '-de': 'Das Speichern ist nicht möglich, da keine Diagnose gewählt wurde.',
                '-en': 'Saving is not possible, since no diagnosis was chosen.'
            },
            '18010': {
                '-de': 'Das Speichern ist nicht möglich, bitte wählen Sie mindestens ein Hilfsmittel.',
                '-en': 'Saving is not possible, please choose at least 1 assistive entry.'
            },
            '18011': {
                '-de': 'Wenn ein OMIM-G-Kode gleich 999999 erfasst wird, dann ist die Eingabe des Feldes "Gen-Name" verpflichtend.',
                '-en': 'Saving is not possible, please choose 1 to 3 assistive entries.'
            },
            '18012': {
                '-de': 'Wenn ein OMIM-P-Kode gleich 999999 erfasst wird, dann ist die Eingabe des Feldes "Art der Erkrankung" verpflichtend.',
                '-en': 'Saving is not possible, please choose 1 to 3 assistive entries.'
            },
            '18016': {
                '-de': 'Für die GOP $gop muss eine gesicherte Diagnose angelegt werden!',
                '-en': 'You need to create a confirmed diagnosis for GOP $gop!'
            },
            '18017': {
                '-de': 'Für die GOP $gop muss mindestens ein OMIM-Code angegebebn werden!',
                '-en': 'You need to add at least one omim code for GOP $gop!'
            },
            '18018': {
                '-de': 'Während des Einlesens ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut. <br/> (Sollte dieser Fehler mehrfach auftreten ist der Barcode entweder nicht lesbar oder defekt.)',
                '-en': 'An error has occurred during reading. Please try again.'
            },
            '18020': {
                '-de': 'Anforderungs-Ident bereits vorhanden.',
                '-en': 'Request ID already in use.'
            },
            '18021': {
                '-de': 'Das Ändern der Betriebsstätte am Schein ist nicht möglich solange es Akteneinträge für diese Betriebsstätte gibt!',
                '-de-ch': 'Das Ändern der Betriebsstätte am Fall ist nicht möglich solange es Akteneinträge für diese Betriebsstätte gibt!',
                '-en': 'Changing the Betriebsstätte at the Fall is not possible as long as there are file records for this Betriebsstätte!'
            },
            '18022': {
                '-de': 'Sie können nicht im Importierten Ordner dokumentieren.',
                '-en': 'You con not create entry in imported case folder.'
            },
            '18023': {
                '-de': 'Kein Schein gefunden.',
                '-de-ch': 'Kein Fall gefunden.',
                '-en': 'No schein found.'
            },
            '18024': {
                '-de': 'Kein GKV Fall gefunden.',
                '-de-ch': 'Kein GKV Fallordner gefunden.',
                '-en': 'No GKV case folder found.'
            },
            '18025': {
                '-de': "Die Sicherheit 'keine Angabe' ist nicht für GKV und BG Fälle gültig.",
                '-en': "Diagnosis certainty 'n/a' is not allowed only for Public and BG case folders"
            },
            '18026': {
                '-de': "Die Leistung wurde bereits an die PVS geschickt und kann nicht nochmal abgerechnet werden.",
                '-en': "The treatment cannot be invoiced because it has already been sent to a billing provider (PVS)."
            },
            '18027': {
                '-de': "Verlinkte Leistungen sind bereits mit einer anderen PVS-Abrechnung oder Rechnung verknüpft!",
                '-en': "Linked treatments are already part of different pvs invoice or invoice!"
            },
            '18028': {
                '-de': "Formular ist nicht  vorhanden",
                '-en': "Form is not exists"
            },
            '18029': {
                '-de': "Fehler beim Erstellen des Abgabe",
                '-en': "Failed to create Dispensing activity"
            },
            '18030': {
                '-de': "Fehler beim Erstellen des Medication-Labels PDF",
                '-en': "Failed to create Medication label PDF"
            },
            '18031': {
                '-de': "Fehler beim Freigeben der Abgabe",
                '-en': "Failed to approve Dispense"
            },
            '18032': {
                '-de': "Es ist kein Formular für Abgaben hinterlegt. Kein Etikett generiert.",
                '-en': "There is no default form label. Cannot automatically create label when dispensing medication."
            },
            '18033': {
                '-de': "InStock license is not available.",
                '-en': "InStock license is not available."
            },
            '18034': {
                '-de': "Der Bestand des Medikaments konnte nicht reduziert werden.",
                '-en': "Failed to reduce medication count in InStock."
            },
            '18035': {
                '-de': "Missing diagnosis argument",
                '-de-ch': "Diagnose fehlt in den Angaben",
                '-en': "Diagnose fehlt in den Angaben"
            },
            '18036': {
                '-de': "Activity type is not DIAGNOSIS",
                '-de-ch': "Akteneintrag ist keine Diagnose",
                '-en': "Akteneintrag ist keine Diagnose"
            },
            '18037': {
                '-de': "Missing diagnosis code",
                '-de-ch': "Diagnosencode fehlt",
                '-en': "Diagnosencode fehlt"
            },
            '18038': {
                '-de': "Wrong catalog selected, cannot run mapping",
                '-de-ch': "Falscher Katalog ausgewählt, der Anzeigetext kann nicht formuliert werden",
                '-en': "Falscher Katalog ausgewählt, der Anzeigetext kann nicht formuliert werden"
            },
            '18039': {
                '-de': "Bitte lesen Sie die elektronische Gesundheitskarte des Patienten ein, um einen Schein anlegen zu können. Wenn Sie im Ersatzverfahren weiterarbeiten möchten, bestätigen Sie die hinterlegten Kostenträgerinformationen, indem Sie die Patientendaten erneut speichern.",
                '-en': "Please read the patient's card to create schein. If you would like to continue in the replacement mode (Ersatzverfahren), please check the insurance details and save the patient details."
            },
            '18040': {
                '-de': "Aktivität ist nicht ausgewählt",
                "-en": "Activity is not selected"
            },
            '18041': {
                '-de': "Aktivitäten konnten nicht abgerufen werden",
                '-en': "Failed to get activities"
            },
            '18042': {
                '-de': "Das Medikament konnte nicht im Katalog gefunden werden und konnte deshalb nicht angelegt werden",
                '-en': "Failed to create medication, cannot locate it in the catalog"
            },
            '18043': {
                '-de': "Es kann kein Medikamentenplan angelegt werden, da keine Medikamente in Documedis ausgewählt wurden",
                '-en': "No selected Medicaments. It is not possible to create a medication plan"
            },
            '18044': {
                '-de': "Fehler beim Abrufen der PDF-Datei von Documedis. Bitte versuchen Sie es später noch einmal.",
                '-en': "Failed to get PDF from Documedis. Please try again later."
            },
            '18045': {
                '-de': "Ab dem 1. Januar 2020 ist der Ersatzwert \"UUU\" nicht erlaubt. Stattdessen verwenden Sie den ICD-Code Z01.7 (Laboruntersuchung).",
                '-en': "The replacement code \"UUU\" is not allowed starting January 1. 2020. Instead use the ICD code Z01.7 (lab treatment)."
            },
            '18046': {
                '-de': 'Das PDF für den Medikationsplan konnte nicht erstellt werden, da das Medikament $content keinen Wert für $property enthält. Korrigieren Sie den Eintrag und starten Sie den Vorgang erneut.',
                '-en': 'The medication plan PDF could not be created because the medication $content does not contain a value for $property. Correct the entry and start the process again.'
            },
             // activitysequence
            '18100': {
                '-de': "Die Leistung mit dem Code \"$treatmentCode\" konnte nicht erstellt werden. Der Code wurde weder im Katalog noch im Hauskatalog gefunden. Bitte entfernen Sie die Ziffer aus der Kette \"$title\".",
                '-en': "Linked treatments are already part of different pvs invoice or invoice!"
            },
            // lab-api
            '19000': {
                '-de': 'Der Name und Fingerabdruck der hochgeladenen Datei stimmt bereits mit einer existierenden Datei überein.',
                '-en': 'The name and fingerprint of the uploaded file matches an already existing file.'
            },
            '19001': {
                '-de': 'Der Datenbankzugriff ist fehlgeschlagen.',
                '-en': 'Unable to access the database.'
            },
            '19002': {
                '-de': 'Keine LDT-Datei zum Verarbeiten vorhanden.',
                '-en': 'Missing LDT file to process.'
            },
            '19003': {
                '-de': 'Parser-Fehler.',
                '-en': 'parser error.'
            },
            '19004': {
                '-de': 'Das LDK-Prüfmodul hat Fehler in der LDT3-Datei gefunden.',
                '-en': 'Das LDK-Prüfmodul hat Fehler in der LDT3-Datei gefunden.'
            },
            '19005': {
                '-de': 'Beim Lesen der LDT Datei ist ein Fehler aufgetreten.',
                '-en': 'Error while reading LDT File.'
            },
            '19006': {
                '-de': 'Fehler: $message',
                '-en': '.'
            },
            '19007': {
                '-de': 'Fehler: $message',
                '-en': '.'
            },
            '19008': {
                '-de': 'Fehler: $message',
                '-en': '.'
            },
            '19009': {
                '-de': 'Fehler: $message',
                '-en': '.'
            },
            '19010': {
                '-de': 'Fehler: $message',
                '-en': '.'
            },
            // lab-api
            '19020': {
                '-de': 'Keine HL7-Datei zum Verarbeiten vorhanden.',
                '-en': 'Missing HL7 file to process.'
            },
            '19021': {
                '-de': 'Beim Lesen der HL7 Datei ist ein Fehler aufgetreten.',
                '-en': 'Error while reading HL7 File.'
            },
            // xdt
            '19100': {
                '-de': 'Fehler beim generieren der XDT-Datei.',
                '-en': 'Generation of the XDT-File failed.'
            },
            '19101': {
                '-de': 'Patient wurde nicht gefunden.',
                '-en': 'Patient could not be found.'
            },
            '19102': {
                '-de': 'Ausführender Arzt konnte nicht gefunden werden.',
                '-en': 'Performing Doctor could not be found.'
            },
            '19103': {
                '-de': 'Betriebsstätte(n) des Arztes konnte nicht gefunden werden.',
                '-en': 'Associated location of the Doctor could not be found'
            },
            '19104': {
                '-de': 'Keine passende XDT-Version verfügbar.',
                '-en': 'No matching XDT-version available.'
            },
            //flow api
            '20400': {
                '-de': 'Gerätekonfiguration nicht gefunden',
                '-en': 'Device configuration not found'
            },
            '20401': {
                '-de': 'Socket timeout',
                '-en': 'Socket timeout'
            },
            '20402':{
                '-de': 'Bitte geben Sie in der Flow-Konfiguration einen gültigen Namen für die Outputdatei an',
                '-en': 'Please enter a valid name for the output file in the flow configuration'
            },
            '20403':{
                '-de': 'Der Pfad der Ausgabedatei in der Flow-Konfiguration ist kein Verzeichnis',
                '-en': 'The output file path in the flow configuration is not a directory'
            },
            '20404':{
                '-de': 'Der Name der Ausgabedatei in der Flow-Konfiguration ist ein Verzeichnis',
                '-en': 'The output file name in the flow configuration is a directory'
            },
            '20405': {
                '-de': 'Berechtigung für diesen Pfad verweigert',
                '-en': 'Permission Denied for this path'
            },
            '20500': {
                '-de': i18n( 'flowlog-api.errMessages.invalidTags' ),
                '-de-ch': i18n( 'flowlog-api.errMessages.invalidTags' ),
                '-en': i18n( 'flowlog-api.errMessages.invalidTags' )
            },
            '20501': {
                '-de': i18n( 'flowlog-api.errMessages.invalidRegex' ),
                '-de-ch': i18n( 'flowlog-api.errMessages.invalidRegex' ),
                '-en': i18n( 'flowlog-api.errMessages.invalidRegex' )
            },
            '20502': {
                '-de': i18n( 'flowlog-api.errMessages.regexMismatch' ),
                '-de-ch': i18n( 'flowlog-api.errMessages.regexMismatch' ),
                '-en': i18n( 'flowlog-api.errMessages.regexMismatch' )
            },
            //file api
            '21000': {
                '-de': 'Netzlaufwerk (mit Pfad), Benutzername und Passwort dürfen nicht leer bleiben.',
                '-en': 'share, username and password are mandatory.'
            },
            '21001': {
                '-de': 'Das Netzlaufwerk ist nicht gültig.',
                '-en': 'the share is not valid'
            },
            '21002': {
                '-de': 'Die genannte Datei konnte nicht erstellt werden. Bitte prüfen Sie das Zielverzeichnis.',
                '-en': 'Target dir does not exist'
            },
            '21003': {
                '-de': 'Das Netzlaufwerk ist nicht erreichbar.',
                '-en': 'the share does not exist'
            },
            '21004': {
                '-de': 'Die Anmeldedaten sind fehlerhaft.',
                '-en': 'The attempted logon is invalid. This is either due to a bad username or authentication information.'
            },
            '21005': {
                '-de': 'Der Pfad ist nicht gültig.',
                '-en': 'The file path is not correct.'
            },
            '21006': {
                '-de': 'Der Dateiname darf nicht mit einen Punkt beginnen.',
                '-en': 'filename can not start from dot.'
            },
            '21007': {
                '-de': 'Der ausgewählte Pfad muss ein gültiges Verzeichnis sein.',
                '-en': 'Path is not directory.'
            },
            '21008': {
                '-de': 'Die GDT Datei wurde bereits importiert. Datei: $filePath und Datei-Hash: $fileHash',
                '-en': 'GDT duplicate file received and ignored. File: $filePath and file-hash: $fileHash'
            },
            // patient registration and patient portal
            'patientreg_1': {
                '-de': 'Das Gesundheitsportal ist aktuell nicht erreichbar. Versuchen Sie es zu einem späteren Zeitpunkt noch einmal.',
                '-en': 'The health portal is currently not available. Try again later.'
            },
            '22000': {
                '-de': 'Sie müssen diesem Patienten eine Handynummer zuweisen, bevor Sie die Portalrechte setzen können.',
                '-en': 'Mobile number is required for this patient before setting portal rights.'
            },
            '22001': {
                '-de': 'Diese E-Mail Adresse ist bereits registriert. Bitte loggen Sie sich ein oder erstellen Sie einen neuen Account mit einer anderen E-Mail Adresse.',
                '-en': 'This email address has already been registered. You can either use this address to login or register a new account with a different email address.'
            },
            '22002': {
                '-de': 'Sie sind noch nicht bei Doc Cirrus registriert.',
                '-en': 'You are not registered with Doc Cirrus yet.'
            },
            '22003': {
                '-de': 'Sie sind bereits registriert.',
                '-en': 'You are already registered.'
            },
            '22004': {
                '-de': 'Given public key is not registered by the patient',
                '-en': 'Given public key is not registered by the patient'
            },
            '22005': {
                '-de': ' Kein Termin gefunden, bitte wählen Sie einen anderen Zeitraum.',
                '-en': 'No appointment found, please select a different time range.'
            },
            // identity process
            '23000': {
                '-de': 'Dieser Benutzername wurde schon einmal verwendet, bitte wählen Sie einen anderen aus.',
                '-en': 'This user name has already been used, please select another.'
            },
            '23001': {
                '-de': 'Nur ein Benutzer aus der Gruppe "Support" kann andere Benutzer dieser Gruppe hinzufügen.',
                '-en': 'Only a user from the group "Support" can add another user to this group.'
            },
            // rule-api
            '24000': {
                '-de': 'Das übergeordnete Verzeichnis existiert nicht!',
                '-en': 'Parent directory does not exist!'
            },
            '24001': {
                '-de': 'Verzeichnisse können nur in anderen Verzeichnissen angelegt werden!',
                '-en': 'Directories can only be created in other directories!'
            },
            '24002': {
                '-de': 'Dieser Bereich kann nicht editiert werden!',
                '-en': 'This area can not be edited!'
            },
            '24003': {
                '-de': 'Bitte wählen Sie ein Verzeichnis oder eine Regelgruppe aus, das sie umbenennen wollen!',
                '-en': 'Please select an directory or RuleSet you want to rename!'
            },
            '24004': {
                '-de': 'Bitte geben Sie einen Namen ein!',
                '-en': 'Please enter a name!'
            },
            '24005': {
                '-de': 'Das Verzeichnis oder die Regelgruppe existiert nicht!',
                '-en': 'Directory or RuleSet does not exist!'
            },
            '24006': {
                '-de': 'Ein Verzeichnis oder eine Regelgruppe mit diesem Namen existiert schon in diesem Verzeichnis!',
                '-en': 'An directory or RuleSet with this name already exists in this directory!'
            },
            '24007': {
                '-de': 'Das Verzeichnis oder die Regelgruppe konnte nicht verschoben werden!',
                '-en': 'Directory or RuleSet could not be moved!'
            },
            '24008': {
                '-de': 'Verzeichnisse können nicht untergeordnete Verzeichnisse verschoben werden!',
                '-en': 'Directories can not be moved to one of it\`s sub directories!'
            },
            '24009': {
                '-de': 'Verzeichnisse können nicht in sich selber verschoben werden!',
                '-en': 'Directories can not be moved to itself!'
            },
            // reporting / insight2
            '25001': {
                '-de': 'Die vorgefertigte Anfrage konnte nicht ausgeführt werden. Bitte kontaktieren Sie den Support.',
                '-en': 'Aggregation request to Mongo failed - incorrect pipeline.'
            },
            '25002': {
                '-de': 'inSight2 konnte nicht gestartet werden. Bitte kontaktieren Sie den Support.',
                '-en': 'InSight2 couldn`t be started. Low-level error, pls contact your administrator.'
            },
            '25003': {
                '-de': 'InSight2 container configuration not found.',
                '-en': 'InSight2 container configuration not found.'
            },
            '25004': {
                '-de': 'InSight2 container name is required.',
                '-en': 'InSight2 container name is required.'
            },
            '25005': {
                '-de': 'Die Queue der Regelengine ist nicht leer',
                '-en': 'Rule engine queue is not empty'
            },
            '25006': {
                '-de': 'Die inSight2 Konfiguration konnte nicht gefunden werden.',
                '-en': 'InSight2 configuration not found.'
            },
            // mediamojit
            '26001': {
                '-en': 'Missing required field',
                '-de': ''
            },
            '26002': {
                '-en': 'Error querying media from the database',
                '-de': 'Fehler beim Abrufen von Medien aus der Datenbank'
            },
            '26003': {
                '-en': 'Error while checking if attached media is referred by media book',
                '-de': 'Fehler beim Überprüfen, ob angehängte Medien von MediaBook referenziert werden'
            },
            '26004': {
                '-en': 'Error while deleting attached media from the database',
                '-de': 'Fehler beim Löschen der angehängten Medien aus der Datenbank'
            },
            '26005': {
                '-en': 'Attached media to delete was not found in the database',
                '-de': 'Angehängte zu löschende Medien wurden nicht in der Datenbank gefunden'
            },
            //importUtility mojit
            '26500': {
                '-de': 'Keine Daten vorhanden zum Importieren',
                '-en': 'No data available to import'
            },
            '26501': {
                '-de': 'Falscher Datei Typ $fileExtension - $mimetype, bitte versuchen Sie es nochmal mit einer ".zip"-Datei',
                '-en': 'Please upload a ".zip file, uploaded file was $fileExtension - $mimetype'
            },
            '26502': {
                '-de': 'Bitte laden Sie die briefe.zip order briefe*.zip datei hoch',
                '-en': 'Please upload briefe.zip or briefe*.zip file'
            },
            '26503': {
                '-de': 'Keine Daten vorhanden. Bitte laden Sie eine Datei hoch vom Typ "*.tar.gz"',
                '-en': 'File is missing, Please upload the briefe file (*.tar.gz)'
            },
            //datasafe stats
            '26510': {
                '-de': 'Bad employee reference in activities.',
                '-en': 'Bad employee reference in activities.'
            },
            '26511': {
                '-de': 'Bad location reference in activities.',
                '-en': 'Bad location reference in activities.'
            },
            '26512': {
                '-de': 'Bad employee reference in calendars.',
                '-en': 'Bad employee reference in calendars.'
            },
            '26513': {
                '-de': 'Bad location reference in calendars.',
                '-en': 'Bad location reference in calendars.'
            },
            '26514': {
                '-de': 'Bad patient reference in schedules.',
                '-en': 'Bad patient reference in schedules.'
            },
            '26515': {
                '-de': 'Bad scheduletype reference in schedules.',
                '-en': 'Bad scheduletype reference in schedules.'
            },
            '26516': {
                '-de': 'Bad physicians reference in patients.',
                '-en': 'Bad physicians reference in patients.'
            },
            //db errors
            '27000': {
                '-de': 'CastError: $message',
                '-en': 'CastError: $message'
            },

            // edmp errors
            '28000': {
                '-de': 'Die eDMP-Fallnummer $caseNo ist bereits vergeben!',
                '-en': 'The eDMP Case No. $caseNo is already taken!'
            },
            '28001': {
                '-de': 'Die eDMP-Fallnummer darf nach der erfolgreichen Übermittelung einer Erstdokumentation nicht mehr geändert werden!',
                '-en': 'You are not allowed to change the eDMP Case No after first successful transmission!'
            },
            '28002': {
                '-de': 'Angabe muss im Wertebereich systolisch 50 - 300 und diastolisch 30 - 180 liegen. Der systolische Wert muss größer als der diastolische Wert sein.',
                '-de-ch': 'Angabe muss im Wertebereich systolisch 50 - 300 und diastolisch 30 - 180 liegen. Der systolische Wert muss grösser als der diastolische Wert sein.',
                '-en': 'Indication must be in range Systolic 50-300 and diastolic 30 - are 180th The systolic value must be greater than the diastolic value.'
            },
            '28003': {
                '-de': 'Die Angabe ist verpflichtend.',
                '-en': 'Value is mandatory'
            },
            '28004': {
                '-de': 'dmpFootStatusArmstrongValue is not allowed',
                '-en': 'dmpFootStatusArmstrongValue is not allowed'
            },
            '28005': {
                '-de': 'Wenn eine Angabe zu „ja“ erfolgt ist, ist keine weitere Angabe zulässig',
                '-en': 'If one entry is carried out "yes", no other indication is admissible'
            },
            '28007': {
                '-de': 'Asthma bronchiale erst ab dem 5. Lebensjahr zugelassen',
                '-en': 'Asthma allowed only from the age of 5'
            },
            '28008': {
                '-de': 'COPD erst ab dem 18. Lebensjahr zugelassen',
                '-en': 'COPD allowed only from the age of 18'
            },
            '28009': {
                '-de': 'Es existieren nicht versendete eDMP Dokumentationen.',
                '-en': 'There are still eDMP documentations that are not sent.'
            },
            // ehks errors
            '28500': {
                '-de': 'Die eHKS Patient Nr. $patNo ist bereits vergeben!',
                '-en': 'The eHKS Patient No. $patNo is already taken!'
            },
            '28501': {
                '-de': 'Die eHKS Patient Nr. darf nach der erfolgreichen Übermittelung einer Erstdokumentation nicht mehr geändert werden!',
                '-en': 'You are not allowed to change the eHKS Patient No. after first successful transmission!'
            },
            /// hgv errors
            '28600': {
                '-de': 'Die HGV Patient Nr. $caseNo ist bereits vergeben!',
                '-en': 'The HGV patient no. $caseNo is already taken!'
            },
            '28601': {
                '-de': 'Die HGV Patient Nr. darf nach der erfolgreichen Übermittelung einer Erstdokumentation nicht mehr geändert werden!',
                '-en': 'You are not allowed to change the HGV patient no after first successful transmission!'
            },
            // mergeImportedPatients
            '29000': {
                '-de': 'Der importierte Patient konnte nicht gefunden werden!',
                '-en': 'The imported patient could not be found!'
            },
            '29001': {
                '-de': 'Es können nur importierte Patienten in aktuelle Patieten gemerged werden!',
                '-en': 'You can only merge improted patients'
            },
            '29002': {
                '-de': 'Der Patient konnte nicht gefunden werden!',
                '-en': 'The patient could not be found!'
            },

            // form portal errors

            '30000': {
                '-de': 'Kiosk Fenster zeigt bereits ein Formular an.',
                '-en': 'Form portal already has active form.'
            },
            '30001': {
                '-de': 'Kein Formular in der Aktivität.',
                '-en': 'Activity does not have a form.'
            },
            '30002': {
                '-de': 'Kein Formular in der Aktivität.',
                '-en': 'Activity does not have a document.'
            },
            '30003': {
                '-de': 'Das aktuelle Formular wurde entfernt. Bitte wenden Sie sich an einem Mitarbeiter.',
                '-en': 'Form portal does not have an active item (form).'
            },
            '30004': {
                '-de': 'Der Kiosk Modus ist nicht mehr verfügbar. Bitte wenden Sie sich an einem Mitarbeiter.',
                '-en': 'Form portal is not registered.'
            },
            '30005': {
                '-de': 'Das ausgewählte Formular enthält Fehler. Bitte erneut speichern.',
                '-en': 'Form is invalid, please save it again.'
            },
            // kbvutility
            '30101': {
                '-de': 'Das Verordnungsdatum der Folgeverordnung muss vor der letzten Vorverordnung liegen!',
                '-en': 'Das Verordnungsdatum der Folgeverordnung muss vor der letzten Vorverordnung liegen!'
            },
            // omimchain
            '30200': {
                '-de': 'Der Name der OMIM-G-Kette muss einzigartig sein!',
                '-en': 'The name of the OMIM G Chain must be unique!.'
            },
            // kbvutilityprice
            '30300': {
                '-de': 'Es existiert bereits ein Preis für das Heilmittel $utilityName in der KV $kv ($insuranceType) mit dem Preis $price! Wollen Sie den Preis überschreiben?',
                '-en': 'A price for the utility $utilityName in the KV $kv with the price $price already exists. Do you want to override the price?'
            },
            '30301': {
                '-de': 'Die ausgewählte Betriebsstätte $locname wurde keiner KV zugeordnet.',
                '-en': 'The selected location $locname was not assigned to a KV.'
            },
            // apptoken
            '31000': {
                '-de': 'Dieses Token wurde bereits verwendet',
                '-en': 'Token is used'
            },
            '31001': {
                '-de': 'Diese Name ist bereits belegt',
                '-en': 'This appName already exists'
            },
            '31002': {
                '-en': 'Sol is not available. (503)',
                '-de': 'Diese Sol ist nicht erreichbar. (503)'
            },

            // locations
            '40000': {
                '-de': 'Die BSNR $commercialNo wurde bereits einer anderen Betriebsstätte zugewiesen!',
                '-en': 'BSNR $commercialNo was already assigned to another location!'
            },
            '40010': {
                '-de': 'Es gibt Betriebsstätten mit derselben Nummer (BSNR):\n$foundLocations\nBitte setzen Sie zuerst eindeutige Betriebsstättennummern!',
                '-en': 'Locations with the same number (BSNR) exist:\n$foundLocations\nPlease set unique location numbers first!'
            },

            // inPacs and related
            '41000': {
                '-de': 'Eintrag beinhaltet keine inPacs-Daten zum Anzeigen',
                '-en': 'Entry does not contain any inPacs data to show'
            },
            '41001': {
                '-de': 'inPacs-System ist nicht erreichbar',
                '-en': 'inPacs System is not available'
            },
            '41002': {
                '-de': 'Ausgewählte Modalität ist nicht in inPacs Konfiguriert',
                '-en': 'Selected modality is not configured in inPacs'
            },
            '41003': {
                '-de': 'Osirix ist nicht erreichbar',
                '-en': 'Osirix is not available'
            },
            '41004': {
                '-de': 'Der angegebene Eintrag konnte nicht in inPacs gefunden werden oder Osirix ist nicht erreichbar',
                '-en': 'The given entry could not be found in inPacs or Osirix is not available'
            },
            //patient merging
            '42000': {
                '-de': 'Es kann nicht der gleiche Patient zweimal ausgewählt werden.',
                '-en': 'The same patient cannot be selected twice.'
            },
            '42001': {
                '-de': 'Primärer Patient ist dem System nicht bekannt.',
                '-en': 'Primary patient is not known by the system.'
            },
            '42002': {
                '-de': 'Sekundärer Patient ist dem System nicht bekannt.',
                '-en': 'secondary patient is not known by the system.'
            },
            '42003': {
                '-de': 'Beim sekundären Patienten müssen alle Versorgungsarten deaktiviert sein und alle Einträge unter "Weitere Identifikationsnummern" müssen von Hand übertragen und gelöscht werden.',
                '-en': 'All health care types have to be deactiviated in the secondary patient and all entries in "Other identification numbers" must be transferred and deleted manually.'
            },
            '42004': {
                '-de': 'Beim sekundären Patienten müssen alle POrtalrechte deaktiviert sein.',
                '-en': 'All portal rights have to be deactiviated in the secondary patient.'
            },
            '42005': {
                '-de': 'Primärer und sekundärer Patient müssen ausgewählt worden sein.',
                '-en': 'Primary and secondary patient must have been selected.'
            },
            // prescription-api
            '50001': {
                '-de': 'Printer not found',
                '-en': 'Printer not found'
            },
            '50002': {
                '-de': 'Auf einem T-Rezept kann immer nur ein Präparat verordnet werden!',
                '-en': 'Only one medication is allowed!'
            },
            '50003': {
                '-de': 'Achtung: Die Aktivität konnte nicht freigegeben werden. Bitte prüfen Sie im Nachgang den Status.',
                '-en': 'Attention: The activity could not be released. Please check the status afterwards.'
            },
            // patientportal-api
            '60001': {
                '-de': 'Diese E-Mail Adresse ist bereits registriert.',
                '-en': 'This email is already registered.'
            },
            'patientportal_01': {
                '-de': 'Ihr Arzt/Ihre Ärztin bietet leider keine Termine für eine Online Sprechstunde an.',
                '-en': "Your physician doesn't offer video conference appointments."
            },
            //calevent-api
            '70001': {
                '-de': 'Diese Terminart ist im Remote-System nicht verfügbar. Bitte wenden Sie sich an den Verantwortlichen für das Remote-System.',
                '-en': 'This schedule type is not available in the remote system. Please contact the remote system owner to clarify this problem.'
            },
            '70002': {
                '-de': 'Diese Terminart ist im Remote-System nicht verfügbar. Bitte wenden Sie sich an den Verantwortlichen für das Remote-System.',
                '-en': 'This schedule type is not available in the remote system. Please contact the remote system owner to clarify this problem.'
            },
            'calevent_01': {
                '-de': 'Partnersystem ist aktuell nicht erreichbar.',
                '-en': 'Partner system is currently not available.'
            },
            'calevent_02': {
                '-de': 'Der Termin konnte nicht erstellt werden. Bitte überprüfen Sie Ihre Eingaben.',
                '-en': 'The appointment could not be created. Please check your entries.'
            },
            'calevent_03': {
                '-de': 'Die folgenden benötigten Ressourcen sind keinem Kalender zugeordnet: $requiredResources.</br> Weisen Sie die Ressourcen einem Kalender zu oder wählen Sie eine andere Terminart aus.',
                '-en': 'The following required resources are not assigned to any calendar: $requiredResources.</br> Please assign the resources to a calendar or select a different appointment type.'
            },
            'calevent_04': {
                '-de': 'Der gewählte Kalender enthält keine der benötigten Ressourcen. Bitte wählen Sie einen passenden Kalender aus.',
                '-en': 'The selected calendar does not contain any of the required resources. Please select a suitable calendar.'
            },
            'calevent_05': {
                '-de': 'Die maximale Anzahl der Patienten für diesen Warteraum ist erreicht. Möchten Sie den Termin ohne Raumzuordnung in der "Termine heute" Liste speichern? Eine Raumzuordnung kann zu einem späteren Zeitpunkt bei frei werdenden Räumen erfolgen.',
                '-en': 'The waiting rooms have reached the maximum number of patients. Do you want to save this appointment without a room allocation in "Appointments today" list? A room allocation can take place later on once a room is available.'
            },
            'calevent_06': {
                '-de': 'Sie können diesen Termin nicht löschen.',
                '-en': 'You can not delete this appointment.'
            },
            'calevent_07': {
                '-de': 'Die Zusage zu dem gebuchten Termin kam leider zu spät. Wir bitten um Entschuldigung. Bitte buchen sie erneut einen Termin.',
                '-en': 'Sorry, your confirmation for the booking was too late. You will have to resubmit your appointment request.'
            },
            'calevent_08': {
                '-de': 'Dieser Termin konnte nicht gefunden werden.',
                '-en': 'This appointment could not be found.'
            },
            //schedule-api
            'schedule_01': {
                '-de': 'Falscher Wert / falsches Format im Feld: $fields.',
                '-en': 'Invalid value in fields: $fields.'
            },
            'schedule_02': {
                '-de': 'Einige Pflichtfelder (start, calendar) fehlen.',
                '-en': 'Some of the required fields (start, calendar) are missed.'
            },
            'schedule_03': {
                '-de': 'Kalender wurde nicht gefunden.',
                '-en': 'Calendar is not found.'
            },
            'schedule_04': {
                '-de': 'Patient wurde nicht gefunden.',
                '-en': 'Patient is not found.'
            },
            'schedule_05': {
                '-de': 'Terminart wurde nicht gefunden.',
                '-en': 'Scheduletype is not found.'
            },
            'schedule_06': {
                '-de': 'Terminart ist für den ausgewählten Kalender nicht verfügbar.',
                '-en': 'Scheduletype is not available for a desired calendar.'
            },
            'schedule_07': {
                '-de': 'Patient muss angegeben werden (Pflichtfeld).',
                '-en': 'Patient is required but missing.'
            },
            'schedule_08': {
                '-de': 'Der Patient hat keine E-Mail-Adresse hinterlegt.',
                '-en': 'Patient doesn`t have an email.'
            },
            'schedule_09': {
                '-de': 'Für diese Terminart muss der Kalender einem Mitarbeiter zugeordnet sein.',
                '-en': 'Desired calendar doesn`t have assigned employee which is required for this scheduletype.'
            },
            //conference-api
            'conference_01': {
                '-de': 'Fehler beim Abrufen des Mitarbeiters. Bitte überprüfen Sie Ihre Angaben.',
                '-en': 'Error on getting employee. Please, check your data.'
            },
            'conference_02': {
                '-de': 'Ungültige Eingabe. Kein Mitarbeiter ausgewählt.',
                '-en': 'Invalid Input. Missing employee.'
            },
            // Device Server
            '80000': {
                '-de': 'Keinen lokalen Device Server gefunden',
                '-en': 'No local Device Server found'
            },
            // xterm
            '90000': {
                '-de': 'xterm wird bereits verwendet, bitte versuchen Sie es nochmal später.',
                '-en': 'xterm is already in use, please try again later.'
            },
            // warnings codes
            '100000': {
                '-de': '',
                '-en': ''
            },
            '100001': {
                '-de': 'Nur-Lese-Eigenschaft $field übersprungen',
                '-en': 'Read only $field skipped'
            },
            '100002': {
                '-de': 'Dieser Patient ist im Remote-System nicht verfügbar. Bitte wenden Sie sich an den Verantwortlichen für das Remote-System.',
                '-en': 'This patient is not available in the remote system. Please contact the remote system owner to clarify this problem.'
            },
            // CardreaderDS
            '110000': {
                '-de': 'Rohdaten abgelehnt',
                '-en': 'Raw Data Rejected'
            },
            '110001': {
                '-de': 'Bei der Verarbeitung der Daten auf einer Karte ist ein Problem aufgetreten',
                '-en': 'There was a problem processing the data of a card'
            },
            '110002': {
                '-de': 'Bitte entsperren Sie den Kartenleser',
                '-en': 'Please unlock the cardreader'
            },
            '110003': {
                '-de': 'Keine Daten vom Gerät erhalten:<br> keine weiteren Karten im Speicher verfügbar (Speicher leer)',
                '-en': 'No card presented within specified time'
            },
            // crlog
            '111000': {
                '-de': 'Action $action ist nicht erlaubt!',
                '-en': 'Action $action rejected!'
            },
            '111001': {
                '-de': 'Bei der Datenübernahme sind Fehler in den Daten entstanden! Bitte korrigieren Sie händisch. Folgende Fehler sind aufgetreten: $errors',
                '-en': 'During the data transfer, errors in the data have arisen! Please correct manually. The following errors occurred: $errors'
            },
            '111002': {
                '-de': 'skip card read because of errors',
                '-en': 'skip card read because of errors'
            },
            '111003': {
                '-de': 'Auf KVK und PKV Karten ist das Geschlecht des Patienten nicht gespeichert. Bitte füllen Sie die Felder Geschlecht und Anrede von Hand aus.',
                '-en': 'The gender of the patient is not saved on KVK and PKV card. Please enter these fields by hand.'
            },
            '111004': {
                '-de': 'Bitte geben Sie einen Kommunikationsweg für den neu erstellten Patienten ein.',
                '-en': 'Please enter communication for created patient.'
            },

        // =============================================== TI ERRORS ================================================ \\
            // TI Error codes begin with 112-4 and are divides as Follows:
            // • In-Suite Error Codes: 112...
            // • Connector Error Codes
            //      • Validation Messages: 11300... (Followed by the status code and a possible error code)
            //      • Card Read Errors: 11400... (Followed by the TI error code as specified in the Implementierungsleitfaden)
        // Generic errors -----------------------------------------------------------------------------------------------
            'TI_00': {
                '-de': 'Es ist beim Testen der TI-Konfigurationen ein unerwarteter Datenbank Fehler aufgetreten.',
                '-en': 'An unexpected database error occurred while attemptint to test the TI-Konfigurations.'
            },
        // In-Suite Error Codes ----------------------------------------------------------------------------------------
            // Connection Errors
            '112000': {
                '-de': 'Es ist ein Verbindungsfehler aufgetreten: der Dienst war nicht erreichbar.<br>Der Dienstverzeichnisdienst wurde erneut abgefragt und die Endpunktinformationen wurden aktualisiert.<br><br>Bitte versuchen Sie es erneut.',
                '-en': 'A connection error occured: the service was not available. The enpointservice was queried and endpoints were updated. Please try again.'
            },
            // Card Read Error
            '112200': {
                '-de': 'Es war nicht möglich die Karten im Terminal abzufragen. Bitte versuchen sie es erneut.',
                '-en': 'It was not possible to read the Cards in the Terminal. Please try again.'
            },            // Card Read Error
            '112201': {
                '-de': 'Es war nicht möglich die Karten im Terminal abzufragen. SMC-B Karte nicht gefunden. Bitte versuchen sie es erneut.',
                '-en': 'It was not possible to read the Cards in the Terminal. SMC-B card could not be located. Please try again.'
            },
            // Card Errors
            '112100': { // No Cards
                '-de': 'Es wurden keine SMC-B und Versichertenkarten gefunden. Bitte überprüfen Sie, dass die Karten richtig gesteckt sind und dass Sie eine SMC-B Karte ausgewählt haben.',
                '-en': 'No SMC-B and insurance cards were found. Please make sure that the cards are inserted correctly and that you selected an SMC-B card.'
            },
            '112101': { // No SMC-B
                '-de': 'Es wurde keine SMC-B Karte gefunden. Bitte überprüfen Sie, dass die Karte richtig gesteckt ist und dass Sie eine SMC-B Karte ausgewählt haben.',
                '-en': 'No SMC-B card was found. Please make sure that the card is inserted correctly and that you selected an SMC-B card.'
            },
            '112102': { // No eGK
                '-de': 'Es wurde keine Versichertenkarte gefunden. Bitte prüfen Sie, dass die Karte richtig gesteckt wurde.',
                '-en': 'No insurance card was found. Please check that the card was insterted correctly.'
            },
            '112103': { // Unknown Card
                '-de': 'Eine Karte wurde vom Konnektor nicht erkannt. Bitte überprüfen Sie folgende mögliche Fehlerursachen:<ul><li>Die Karte ist nicht lesbar.</li><li>Die Karte wurde falsch gesteckt.</li><li>Es wurde eine "alte" eGK gesteckt: im Fall einer "alten" eGK ist diese kein gültiger Leistungsanspruch. Bitte fragen Sie beim Versicherten nach, ob diese Karte seine aktuelle eGK ist. Nur wenn der Versicherte keine aktuellere eGK besitzt, soll er an seine Krankenkasse verwiesen werden.</li></ul>',
                '-en': 'A card was not recognized by the connector. Please check the following possible issues:<ul><li>The card is unreadable.</li><li>The card was not inserted correctly</li><li>An "old" eGK card was inserted: "old" eGK cards are no valid entitlement to benefits. Please ask the insured wheter this card is his most recent eGK. If the insured does not have a more recent eGK, he should contact his insurance.</li></ul> '
            },
            '112104': { // Invalid Card
                '-de': 'Karte gesperrt',
                '-de-ch': 'Karte gesperrt',
                '-en': 'Card is blocked'
            },

        // Connector Error Codes ---------------------------------------------------------------------------------------
        // Validation Messages •••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            '113001': {
                '-de': "Die Aktualisierung wurde erfolgreich durchgeführt.",
                '-en': "The update was performed successfully."
            },
            '113002': {
                '-de': "Es lagen keine Aktualisierungsaufträge vor.",
                '-en': "There were no updating taks."
            },
            '113003': {
                '-de': 'Die Aktualisierung war aufgrund einer fehlenden Online-Verbindung nicht möglich.',
                '-en': 'The update was not possible due to a missing online connection.'
            },
            '11300311999': {
                '-de': 'Die Aktualisiserungsaufträge konnten aus technischen Gründen nicht erfolgreich ermittelt werden.',
                '-en': 'The updating tasks could not be determined due to technical issues.'
            },
            '11300312999': {
                '-de': 'Die Aktualisiserungen konnten aus technischen Gründen nicht erfolgreich durchgeführt werden.',
                '-en': 'The update could not be performed due to technical issues.'
            },
            '113004': {
                '-de': 'Das Authentifizierungszertifikat wurde als ungüglig erkannt.<br>Die eGK ist kein gültiger Leisungsanspruchsnachweis. Bitte fragen Sie bei dem Versicherten nach, ob diese Karte seine aktuelle eGK ist.',
                '-en': 'The authentification certificate is invalid.<br>The eGK is no valid entitlement to benefits. Please ask the insured if this is his most recent eGK.'
            },
            '1130054001': {
                '-de': 'Die Online-Prüfung des Authentifizierungszertifikats war technisch nicht möglich.',
                '-en': 'The online check of the authentication certificate was not feasible technically.'
            },
            '1130064001': {
                '-de': 'Die Online-Prüfung konnte aufgrund von längerer Nichterreichbarkeit der Telematik-Infrastruktur nicht durchgeführt werden.',
                '-en': 'The online check could not be performed due to a prolonged inaccessibility of the Telematik-Infrastruktur.'
            },
        // Card Read Errors ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            '114001': {
                '-de': 'Ein technisches Problem mit der Integration des Konnektors in die inSuite verhindert einen Nachweis des Leistungsanspruchs. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 1]',
                '-en': 'A technical problem concerning the integration of the Connector with the inSuite prevented the verification of the entitlement to benefits. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 1]'
            },
            '114002': {
                '-de': 'Ein technisches Problem mit der Integration des Konnektors in die inSuite verhindert einen Nachweis des Leistungsanspruchs. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 2]',
                '-en': 'A technical problem concerning the integration of the Connector with the inSuite prevented the verification of the entitlement to benefits. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 2]'
            },
            '114003': {
                '-de': 'Ein technisches Problem mit der Integration des Konnektors in die inSuite verhindert einen Nachweis des Leistungsanspruchs. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 3]',
                '-en': 'A technical problem concerning the integration of the Connector with the inSuite prevented the verification of the entitlement to benefits. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 3]'
            },
            '114004': {
                '-de': 'Ein technisches Problem mit der Integration des Konnektors in die inSuite verhindert einen Nachweis des Leistungsanspruchs. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 4]',
                '-en': 'A technical problem concerning the integration of the Connector with the inSuite prevented the verification of the entitlement to benefits. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 4]'
            },
            '114006': {
                '-de': 'Ein technisches Problem mit der Integration des Konnektors in die inSuite verhindert einen Nachweis des Leistungsanspruchs. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 6]',
                '-en': 'A technical problem concerning the integration of the Connector with the inSuite prevented the verification of the entitlement to benefits. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 6]'
            },
            '11400101': {
                '-de': 'Aufgrund eines Kartenfehlers, war das Auslesen der Karte nicht möglich. Die Karte ist kein gültiger Leisungsanspruchsnachweis.<br><br>[Fehlercode: 101]',
                '-en': 'Due to a card error, the card reading was not possible. The card does not constitute a valid entitlement to benefits.<br><br>[Error Code: 101]'
            },
            '11400102': {
                '-de': 'Ein technisches Problem beim Auslesen der Karte verhinderte einen Nachweis des Leistungsanpruchs. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 102]',
                '-en': 'A technical problem during the card reading prevented the verification of the entitlement to benefits. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 102]'
            },
            '11400103': {
                '-de': 'Ein technisches Problem beim Auslesen der Karte verhinderte einen Nachweis des Leistungsanpruchs. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 103]',
                '-en': 'A technical problem during the card reading prevented the verification of the entitlement to benefits. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 103]'
            },
            '11400104': {
                '-de': 'Ein technisches Problem beim Auslesen der Karte verhinderte einen Nachweis des Leistungsanpruchs. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 104]',
                '-en': 'A technical problem during the card reading prevented the verification of the entitlement to benefits. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 104]'
            },
            '11400105': {
                '-de': 'Die eGK ist fehlerhaft/defekt. Bitte setzen Sie sich mit der Krankenkasse in Verbindung.<br><br>[Fehlercode: 105]',
                '-en': 'The eGK is faulty/defective. Please contact the health insurance company.<br><br>[Error Code: 105]'
            },
            '11400106': {
                '-de': 'Das Authentifizierungszertifikat wurde nach der Online-Prüfung als ungüglig erkannt. Die eGK ist kein gültiger Leisungsanspruchsnachweis. Bitte fragen Sie bei dem Versicherten nach, ob diese Karte seine aktuelle eGK ist.<br><br>[Fehlercode: 106]',
                '-en': 'The authentification certificate was identified as invalid after the online check. The eGK is no valid entitlement to benefits. Please ask the insured if this is his most recent eGK.<br><br> [Error Code: 106]'
            },
            '11400107': {
                '-de': 'Das Authentifizierungszertifikat wurde nach der Offline-Prüfung als ungüglig erkannt. Die eGK ist kein gültiger Leisungsanspruchsnachweis. Bitte fragen Sie bei dem Versicherten nach, ob diese Karte seine aktuelle eGK ist.<br><br>[Fehlercode: 107]',
                '-en': 'The authentification certificate was identified as invalid after the offline check. The eGK is no valid entitlement to benefits. Please ask the insured if this is his most recent eGK.<br><br> [Error Code: 107]'
            },
            '11400108': {
                '-de': 'Ein technisches Problem beim Auslesen der Karte verhinderte einen Nachweis des Leistungsanpruchs. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 108]',
                '-en': 'A technical problem during the card reading prevented the verification of the entitlement to benefits. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 108]'
            },
            '11400109': {
                '-de': 'Ein technisches Problem beim Auslesen der Karte verhinderte einen Nachweis des Leistungsanpruchs. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 109]',
                '-en': 'A technical problem during the card reading prevented the verification of the entitlement to benefits. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 104]'
            },
            '11400110': {
                '-de': 'Ein technisches Problem beim Auslesen der Karte verhinderte einen Nachweis des Leistungsanpruchs. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 110]',
                '-en': 'A technical problem during the card reading prevented the verification of the entitlement to benefits. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 104]'
            },
            '11400111': {
                '-de': 'Die Daten konnten nicht von der eGK gelesen werden. Die Karte ist kein gültiger Leisungsanspruchsnachweis.<br><br>[Fehlercode: 111]',
                '-en': 'The data could not be read from the card. The card does not constitute a valid entitlment to benefits.<br><br>[Error Code: 111]'
            },
            '11400112': {
                '-de': 'Ein technisches Problem beim Auslesen der Karte verhinderte einen Nachweis des Leistungsanpruchs. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 112]',
                '-en': 'A technical problem during the card reading prevented the verification of the entitlement to benefits. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 104]'
            },
            '11400113': {
                '-de': 'Die Versichertenkarte wude nicht erkannt, es handelt sich möglicherweise um eine eGK älter als Generation G1+.Die eGK ist kein gültiger Leisungsanspruchsnachweis. Bitte fragen Sie bei dem Versicherten nach, ob diese Karte seine aktuelle eGK ist.<br><br>[Fehlercode: 113]',
                '-en': 'The card was not recognized, it probably concerns an eGK older than generation G1+. The card does not constitute a valid entitlement to benefits. Please ask the insured whether this is his most recent eGK <br><br>[Error Code: 113]'
            },
            '11400114': {
                '-de': 'Die Gesundheitsanwendung wurde als gesperrt erkannt. Die eGK ist kein gültiger Leisungsanspruchsnachweis. Bitte fragen Sie bei dem Versicherten nach, ob diese Karte seine aktuelle eGK ist.<br><br>[Fehlercode: 114]',
                '-en': 'The health application on the eGK was locked. The card does not constitute a valid entitlement to benefits. Please ask the insured whether this is his most recent eGK <br><br>[Error Code: 114]'
            },
        // Basic Error Codes of the Connector (Tabelle 43)
            '114004000': {
                '-de': 'Ein technisches Problem mit der Integration des Konnektors in die inSuite verhindert einen Nachweis des Leistungsanspruchs. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 4000]',
                '-en': 'A technical problem concerning the integration of the connector with the inSuite prevented the verification of the entitlement to benefits. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 4000]'
            },
            '114004001': {
                '-de': 'Ein technisches Problem mit der Integration des Konnektors in die inSuite verhindert einen Nachweis des Leistungsanspruchs. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 4001]',
                '-en': 'A technical problem concerning the integration of the connector with the inSuite prevented the verification of the entitlement to benefits. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 4001]'
            },
            '114004094': {
                '-de': 'Die Operation wurde wegen Zeitüberschreitung beim Zugriff auf eine Karte abgebrochen. Ein Leistungsanspruchnachweis war nicht möglich. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 4094]',
                '-en': 'The operation was aborted due to a timeout during the card access. A verification of the entitlement to benefits was not possible. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 4094]'
            },
            '114004002': {
                '-de': 'Der Konnektor befindet sich in einem kritischen Betriebszustand. Ein Leistungsanspruchnachweis war nicht möglich. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 4002]',
                '-en': 'The connector is in a critical state. A verification of the entitlement to benefits was not possible. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 4002]'
            },
            '114004003': {
                '-de': 'Ein technisches Problem mit der Integration des Konnektors in die inSuite verhindert einen Nachweis des Leistungsanspruchs. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 4003]',
                '-en': 'A technical problem concerning the integration of the connector with the inSuite prevented the verification of the entitlement to benefits. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 4003]'
            },
            '114004004': {
                '-de': 'Ein technisches Problem mit der Integration des Konnektors in die inSuite verhindert einen Nachweis des Leistungsanspruchs. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 4004]',
                '-en': 'A technical problem concerning the integration of the connector with the inSuite prevented the verification of the entitlement to benefits. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 4004]'
            },
            '114004005': {
                '-de': 'Ein technisches Problem mit der Integration des Konnektors in die inSuite verhindert einen Nachweis des Leistungsanspruchs. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 4005]',
                '-en': 'A technical problem concerning the integration of the connector with the inSuite prevented the verification of the entitlement to benefits. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 4005]'
            },
            '114004006': {
                '-de': 'Ein technisches Problem mit der Integration des Konnektors in die inSuite verhindert einen Nachweis des Leistungsanspruchs. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 4006]',
                '-en': 'A technical problem concerning the integration of the connector with the inSuite prevented the verification of the entitlement to benefits. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 4006]'
            },
            '114004007': {
                '-de': 'Ein technisches Problem mit der Integration des Konnektors in die inSuite verhindert einen Nachweis des Leistungsanspruchs. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 4007]',
                '-en': 'A technical problem concerning the integration of the connector with the inSuite prevented the verification of the entitlement to benefits. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 4007]'
            },
            '114004008': {
                '-de': 'Es wurde eine Karte als nicht gesteckt identifiziert. Bitte überprüfen Sie, dass alle Karten richtig gesteckt sind und versuchen Sie es erneut.<br><br>[Fehlercode: 4008]',
                '-en': 'A card was not inserted correctly. Please verify that all cards are correctly inserted and try again.<br><br>[Error Code: 4008]'
            },
            '114004009': {
                '-de': 'Es kam beim Kartenlesen zu einem technischen Problem, ein Nachweis des Leistungsanspruchs war nicht möglich. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 4009]',
                '-en': 'A technical problem occured during the card reading, a verification of the entitlement to benefits was not possible. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 4009]'
            },
            '114004010': {
                '-de': 'Der Konnektor und die inSuite wurden nicht korrekt aufeinander konfiguriert. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 4010]',
                '-en': 'The connector and the inSuite were not correctly configured together. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 4010]'
            },
            '114004011': {
                '-de': 'Der Konnektor und die inSuite wurden nicht korrekt aufeinander konfiguriert. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 4011]',
                '-en': 'The connector and the inSuite were not correctly configured together. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 4011]'
            },
            '114004012': {
                '-de': 'Der Konnektor und die inSuite wurden nicht korrekt aufeinander konfiguriert. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 4012]',
                '-en': 'The connector and the inSuite were not correctly configured together. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 4012]'
            },
            '114004021': {
                '-de': 'Ein technisches Problem mit der Integration des Konnektors in die inSuite verhindert einen Nachweis des Leistungsanspruchs. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 4021]',
                '-en': 'A technical problem concerning the integration of the connector with the inSuite prevented the verification of the entitlement to benefits. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 4021]'
            },
            '114004032': {
                '-de': 'Die Verbindung zu HSM konnte nicht aufgebaut werden. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 4032]',
                '-en': 'The connection to the HSM could not be established. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 4032]'
            },
            '114004040': {
                '-de': 'Es war nicht möglich eine Verbindung zum Kartenterminal herzustellen. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 4040]',
                '-en': 'It was not possible to establish a connection to the card terminal. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 4040]'
            },
            '114004045': {
                '-de': 'Es kam beim Kartenlesen zu einem technischen Problem, ein Nachweis des Leistungsanspruchs war nicht möglich. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 4045]',
                '-en': 'A technical problem occured during the card reading, a verification of the entitlement to benefits was not possible. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 4045]'
            },
            '114004047': {
                '-de': 'Es kam beim Kartenlesen zu einem technischen Problem, ein Nachweis des Leistungsanspruchs war nicht möglich. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 4047]',
                '-en': 'A technical problem occured during the card reading, a verification of the entitlement to benefits was not possible. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 4047]'
            },
            '114004048': {
                '-de': 'Es kam beim Kartenlesen zu einem technischen Problem, ein Nachweis des Leistungsanspruchs war nicht möglich. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 4048]',
                '-en': 'A technical problem occured during the card reading, a verification of the entitlement to benefits was not possible. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 4048]'
            },
            '114004050': {
                '-de': 'Es kam beim Kartenlesen zu einem technischen Problem, ein Nachweis des Leistungsanspruchs war nicht möglich. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 4050]',
                '-en': 'A technical problem occured during the card reading, a verification of the entitlement to benefits was not possible. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 4050]'
            },
            '114004051': {
                '-de': 'Es kam beim Kartenlesen zu einem technischen Problem, ein Nachweis des Leistungsanspruchs war nicht möglich. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 4051]',
                '-en': 'A technical problem occured during the card reading, a verification of the entitlement to benefits was not possible. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 4051]'
            },
            '114004052': {
                '-de': 'Es kam beim Kartenlesen zu einem technischen Problem, ein Nachweis des Leistungsanspruchs war nicht möglich. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 4052]',
                '-en': 'A technical problem occured during the card reading, a verification of the entitlement to benefits was not possible. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 4052]'
            },
            '114004174': {
                '-de': 'Ein technisches Problem bei der Kommunikation mit der TI verhinderte einen Nachweis des Leistungsanspruchs. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 4174]',
                '-en': 'A technical problem occured during the communication with the TI, a verification of the entitlement to benefits was not possible. The service provider should be contacted. Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 4174]'
            },
            '114003001': {
                '-de': 'Die eGK enthält inkonsistente Versichertendaten. Es sollte erneut versucht werden die Karte zu aktualisieren. Falls dann die Karte immer noch denselben Fehler aufweist, soll der Versicherte seinen Kostenträger kontaktieren. .<br><br>[Fehlercode: 3001]',
                '-en': 'The insurance data is not consistent. The card does not constitute a valid entitlement to benefits. An online check is necessary.<br><br>[Error Code: 3001]'
            },
            '114003011': {
                '-de': 'Es kam beim Kartenlesen zu einem technischen Problem.<br><br>[Fehlercode: 3011]',
                '-en': 'A technical problem occured during the card reading.<br><br>[Error Code: 3011]'
            },
            '114003020': {
                '-de': 'Es kam beim Kartenlesen zu einem technischen Problem.<br><br>[Fehlercode: 3020]',
                '-en': 'A technical problem occured during the card reading.<br><br>[Error Code: 3020]'
            },
            '114003021': {
                '-de': 'Es kam beim Kartenlesen zu einem technischen Problem.<br><br>[Fehlercode: 3021]',
                '-en': 'A technical problem occured during the card reading.<br><br>[Error Code: 3021]'
            },
            '114003039': {
                '-de': 'Der Prüfungsnachweis ist nicht entschlüsselbar. Eine Online-Prüfung der eGK ist notwendig.<br><br>[Fehlercode: 3039]',
                '-en': 'The verification certificate cannot be decrypted. An online check is needed.<br><br>[Error Code: 3039]'
            },
            '114003040': {
                '-de': 'Es ist kein Prüfungsnachweis auf der eGK vorhanden. Eine Online-Prüfung ist notwendig.<br><br>[Fehlercode: 3040]',
                '-en': 'There is no verification certificate on the eGK. An online check is needed.<br><br>[Error Code: 3040]'
            },
            '114003041': {
                '-de': 'Bitte entsperren Sie zuerst die SMC-B, um eine Karte zu lesen.<br><br> [Fehlercode 3041]',
                '-en': 'Please first unlock the SMC-B in order to read a card.<br><br> [Error Code 3041]'
            },
            '11400500': {
                '-de': 'Der Konnektor befindet sich in einem unerwarteten Betriebszustand, die Karte kann nicht gelesen werden.<br><br>[Fehlercode: 500]',
                '-en': 'The connector is in an unexpected state, the card could not be read.<br><br>[Fehlercode: 500]'
            },
            '114001011': {
                '-de': 'Es kam zu einem unerwarteten technischen Fehler.<br><br>[Fehlercode: 1011]',
                '-en': 'There was an unexpected technical error.<br><br>[Error Code: 1011]'
            },
            '114001006': {
                '-de': 'Es kam bei der Kommunikation mit dem Konnektor zu einem unerwarteten technischen Fehler. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 1006]',
                '-en': 'An unexpected technical error occured during the communication with the connector. The service provider should be contacted.Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 1006]'
            },
            '114001014': {
                '-de': 'Es kam bei der Kommunikation mit dem Konnektor zu einem unerwarteten technischen Fehler. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 1014]',
                '-en': 'An unexpected technical error occured during the communication with the connector. The service provider should be contacted.Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 1014]'
            },
            '114005': {
                '-de': 'Es kam bei der Kommunikation mit dem Konnektor zu einem unerwarteten technischen Fehler. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 5]',
                '-en': 'An unexpected technical error occured during the communication with the connector. The service provider should be contacted.Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 5]'
            },
            '1140011101': {
                '-de': 'Es kam bei der Kommunikation mit dem Konnektor zu einem unerwarteten technischen Fehler. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 11101]',
                '-en': 'An unexpected technical error occured during the communication with the connector. The service provider should be contacted.Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 11101]'
            },
            '1140011999': {
                '-de': 'Es kam zu einem unerwarteten technischen Fehler. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 11999]',
                '-en': 'There was an unexpected technical error. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Error Code: 11999]'
            },
            '1140011148': {
                '-de': 'Es kam bei der Kommunikation mit dem Konnektor zu einem unerwarteten technischen Fehler. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 11148]',
                '-en': 'An unexpected technical error occured during the communication with the connector. The service provider should be contacted.Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 11148]'
            },
            '1140012101': {
                '-de': 'Es kam bei dem Karten-Update zu einem unerwarteten technischen Fehler. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 12101]',
                '-en': 'An unexpected error occured during the card update. The service provider should be contacted.Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 12101]'
            },
            '1140012102': {
                '-de': 'Es kam bei dem Karten-Update zu einem unerwarteten technischen Fehler. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 12102]',
                '-en': 'An unexpected error occured during the card update. The service provider should be contacted.Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 12102]'
            },
            '1140012103': {
                '-de': 'Es kam bei dem Karten-Update zu einem unerwarteten technischen Fehler. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 12103]',
                '-en': 'An unexpected error occured during the card update. Thee service provider should be contacted.Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 12103]'
            },
            '1140012105': {
                '-de': 'Die eGK ist defekt, es konnte kein Leistungsanspruch nachgewiesen werden.<br><br>[Fehlercode: 12105]',
                '-en': 'The eGK is faulty, no entitlment to benefits could be verified.<br><br>[Error Code: 12105]'
            },
            '1140012999': {
                '-de': 'Ein nicht spezifizierter Fehler ist aufgetreten. Der Dienstleister sollte zu Hilfe gezogen werden. Lesen Sie die Karte erneut, sobald das Problem behoben ist.<br><br>[Fehlercode: 12999]',
                '-en': 'An unspecified error occured. The service provider should be contacted.Read the card again as soon as the problem has been fixed. <br><br>[Error Code: 12999]'
            },
        // QES Errors ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            '11410': {
               '-de': 'Es wurden keine Akivitäten zum Signieren ausgewählt!',
               '-en': 'No activities to sign were selected!'
            },
            '11411': {
               '-de': 'Es wurden keine signierbaren Anhänge gefunden!',
               '-en': 'There are no attachment that can be signed!'
            },
            '11412': {
               '-de': 'Die maximale Signierstapelgröße von 250mb wurde übertroffen!',
               '-en': 'The maximum sign stack size of 250mb was exceeded!'
            },
            '11413': {
               '-de': 'Es wurde keine signierten Daten zurückgegeben!',
               '-en': 'No signed data was returned!'
            },
            '11414': {
               '-de': 'Beim signieren ist eine Fehler im Konnektor aufgetreten: $message',
               '-en': 'An connector error occred during signing: $message'
            },
            '11415': {
               '-de': 'Die Aktivität ist unsigniert!',
               '-en': 'The activity is unsigned'
            },
            '11416': {
               '-de': 'Es wurde kein signierter Anhang gefunden!',
               '-en': 'No signed attachment has been found!'
            },
            '11417': {
               '-de': 'Es ist keine SMC-B oder HBA Karte am Kartenlesegerät gesteckt!',
               '-en': 'There is no SMC-B or HBA card plugged into the card reader!'
            },
            '11418': {
                '-de': 'Es konnte keine Verbindung zum Konnektor hergestellt werden. Bitte überprüfen Sie die Verbindung!',
                '-en': 'A connection to the connector could not be established. Please check the connection!'
            },
            '11419': {
                '-de': 'Fehlerhaftes Zertifikat. Bitte wählen Sie ein gültiges Zertifikat!',
                '-en': 'Bad certificate. Please choose a valid certificate!'
            },
        // ============================================= END: TI ERRORS ============================================= \\
            // eDocLetter Errors ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            '11500': {
                '-de': 'Automatische Erstellung von eArztbrief Versand Leistungen ist per Konfiguration nicht erlaubt!',
                '-en': 'Auto creation of edocletter sent treatment is not allowed by configuration!'
            },
            '11501': {
                '-de': 'Automatische Erstellung von eArztbrief Versand Leistungen ist nur in GKV Fällen möglich!',
                '-en': 'Auto creation of edocletter sent treatment is allowed in GKV cases only!'
            },
            '11502': {
                '-de': 'Die Kostenpauschale wurde bereits angelegt!',
                '-en': 'The flat fee was already created!'
            },
            '11503': {
                '-de': 'XML Anhangn nicht gefunden!',
                '-en': 'XML attachment not found'
            },

            //tasktype-api
            '1130000': {
                '-de': 'Dieser Typ existiert bereits',
                '-en': 'This task type already exists'
            },
            '1130001': {
                '-de': 'Sie können diesen Aufgabentyp nicht löschen',
                '-en': 'You cannot delete this task type'
            },
            '1130002': {
                '-de': '$lastname, $firstname besitzt keinen Fall.',
                '-de-ch': '$lastname, $firstname besitzt keinen Fallordner.',
                '-en': '$lastname, $firstname does not own a casefolder.'
            },
            // Workstations
            '120000': {
                '-de': 'Arbeitsplätze konnten nicht gelöscht werden. Der Arbeitsplatz "<b>$workStationName</b>" wird von folgenden Benutzern und Profilen benutzt: $inUseByUserAndProfiles Bitte löschen sie zuerst die zugeordneten Profile.',
                '-en': 'Workstations could not be deleted. The workstation "<b>$workStationName</b>" is used by the following users and profiles: $inUseByUserAndProfiles Please first delete the related profiles.'
            },
            'cardio_13001': {
                '-de': 'Zugang zum telecardio Server felgeschlagen.',
                '-en': 'Could not access the telecardio server.'
            },

            // ---------------------------------- DeviceLogMojit errors ----------------------------------------------------
            '115000': {
                '-de': 'Fehler beim Abfragen der Datenbank',
                '-en': 'Error while querying the database'
            },
            '115001': {
                '-de': 'Ungültige Eingabe',
                '-en': 'Invalid Input'
            },
            '115002': {
                '-de': 'Dieser Medieneintrag existiert nicht in der Datenbank. Bitte laden Sie die Seite neu',
                '-en': 'This media entry does not exist in the database. Please reload the page'
            },
            '115003': {
                '-de': 'Dieser Medieneintrag ist bereits vergeben. Bitte laden Sie die Seite neu',
                '-en': 'This media entry is already assigned. Please reload the page'
            },
            '115004': {
                '-de': 'Dieser Medieneintrag hat keinen Anhang',
                '-en': 'This media entry does not have any attachment'
            },
            '115005': {
                '-de': 'Der Anhang wurde nicht in der Datenbank gefunden',
                '-en': 'The attachment was not found in the database'
            },
            '115006': {
                '-de': 'Der ausgewählte Patient wurde nicht in der Datenbank gefunden',
                '-en': 'Selected patient not found in the database'
            },
            '115007': {
                '-de': 'Die ausgewählte Aktivität wurde nicht in der Datenbank gefunden',
                '-en': 'The selected activity was not found in the database'
            },
            '115008': {
                '-de': 'Fehler beim Aktualisieren der ausgewählten Aktivität mit Anhang',
                '-en': 'Error updating the selected activity with attachment'
            },
            '115009': {
                '-de': 'Fehler beim Aktualisieren des Medieneintrags mit ausgewählten Aktivitätsdetails',
                '-en': 'Error updating media entry with selected activity details'
            },
            '115010': {
                '-de': 'Kein nicht zugewiesener Medieneintrag im Medienbuch gefunden. Nichts zu importieren',
                '-en': 'No unassigned media entry found in the media book. Nothing to import'
            },
            '115011': {
                '-de': 'Das angehängte Medium für diesen Medieneintrag wurde nicht in der Datenbank gefunden',
                '-en': 'The attached media for this media entry was not found in the database'
            },
            '115012': {
                '-de': 'Fehler beim Abrufen des Medienbucheintrags für den Anhang aus der Datenbank',
                '-en': 'Error querying the media book entry for the attachment from the database'
            },
            '115013': {
                '-de': 'Mehrere Medienbucheinträge für den Anhang gefunden. Erwarte nur einen',
                '-en': 'Multiple media book entries found for the attachment. Expect only one'
            },
            '115014': {
                '-de': 'Der entsprechende Medienbucheintrag mit der ID: $deviceLogId ist zugewiesen, aber nicht mit einer Aktivität verknüpft',
                '-en': 'The corresponding media book entry with ID: $deviceLogId is assigned but not linked to any activity'
            },
            '115015': {
                '-de': 'Fehler beim Abrufen der Aktivität aus der Datenbank, der das Medienbuch zugeordnet ist',
                '-en': 'Error querying the activity from the database to which the media book is assigned'
            },
            '115016': {
                '-de': 'Die Aktivität mit der ID: $activityId, die dem Medienbucheintrag zugeordnet ist, wurde nicht in der Datenbank gefunden',
                '-en': 'The activity with Id: $activityId to which the media book entry is assigned was not found in the database'
            },
            '115017': {
                '-de': 'Fehler beim Teilen des Medienbucheintrags',
                '-en': 'Error while unclaiming media book entry'
            },
            '115018': {
                '-de': 'Fehler beim Freigeben der Anlage von Aktivität',
                '-en': 'Error while unclaiming the attachment from activity'
            },
            '115019': {
                '-de': 'Fehler beim Freigeben des zugehörigen Anhangs mit mediaId: $mediaId aus der Aktivität',
                '-en': 'Error while unclaiming the associated attachment with mediaId: $mediaId from activity'
            },
            '115020': {
                '-de': 'Fehler beim Aktualisieren der Aktivität zum Freigeben der Anlage',
                '-en': 'Error while updating activity to release attachment'
            },
            '115021': {
                '-de': 'Ungültige Eingabe. Fehlende attachmentId',
                '-en': 'Invalid Input. Missing attachmentId'
            },
            '115022': {
                '-de': 'Fehler beim Abfragen des Medienbucheintrags aus der Datenbank',
                '-en': 'Error querying the media book entry from the database'
            },
            '115023': {
                '-de': 'Dieser Medienbucheintrag hat keinen Anhang',
                '-en': 'This media book entry does not have any attachment'
            },
            '115024': {
                '-de': 'Dieser Medienbucheintrag hat mehr als einen Anhang. Erwartet nur eine',
                '-en': 'This media book entry has more than one attachment. Expected only one'
            },
            '115025': {
                '-de': 'Ungültige Eingabe. Fehlende deviceLogId',
                '-en': 'Invalid Input. Missing deviceLogId'
            },
            '115026': {
                '-de': 'Die Mediendatei wurde bereits importiert. Datei: $filePath und Datei-Hash: $fileHash',
                '-en': 'The media file has already been imported. File: $filePath and file hash: $fileHash'
            },
            '115027': {
                '-de': 'Der Medienbucheintrag kann der ausgewählten Aktivität nicht zugeordnet werden, da sein Status lautet $status',
                '-en': 'Cannot assign the media book entry to selected activity because its status is $status'
            },
            '115028': {
                '-de': 'Der Vorgang kann nicht ausgeführt werden, da der verknüpfte Aktivitätsstatus $status',
                '-en': 'Cannot perform the operation because the linked activity status is $status'
            },
            '115029': {
                '-de': 'Es existiert keine Abrechnung zu der Referenznummer dieser Quittung.',
                '-de-ch': 'Es existiert keine Abrechnung zu der Referenznummer dieser Quittung.',
                '-en': 'There is no invoiceref for the given reference number of this receipt.'
            },
            // ------------------------------- END (DeviceLogMojit errors) -----------------------------------------------

            // ------------------------- Document API server errors --------------------------------------------------------
            '116000': {
                '-de': 'Fehler beim Abfragen der Anlage von der Datenbank',
                '-en': 'Error querying attachment from the database'
            },
            '116001': {
                '-de': 'Fehler beim Löschen der Anlage aus der Datenbank',
                '-en': 'Error deleting the attachment from the database'
            },
            '116002': {
                '-de': 'Anhang zum Löschen wurde nicht in der Datenbank gefunden',
                '-en': 'Attachment to delete was not found in the database'
            },
            '116003': {
                '-de': 'Fehler beim Erstellen eines Dokuments',
                '-en': 'Error creating document'
            },
            // ------------------------- END (Document API server errors) --------------------------------------------------------

            // ========================================== COUNTRY MODE ERRORS =========================================== \\
            '117000': {
                '-de': 'Ihr Länder Modus konnte nicht von der Datenbank abgefragt werden.',
                '-en': 'Your country mode could not be retrieved from the database'
            },
            // ======================================== END: COUNTRY MODE ERRORS ======================================== \\
            // ============================================== TARMED ERRORS ============================================== \\
            'tarmed_00': {
                '-de': 'Es ist bei dem Erstellen der Rechnungen ein unerwarteter Fehler aufgetreten.',
                '-en': 'An unexpected error occured while attempting to create the invoices.'
            },
            'tarmed_01': {
                '-de': 'Es wurden keine Betriebsstätten für die Rechnungserzeugung angegeben.',
                '-en': 'No locations were provided for creating the invoice.'
            },
            'tarmed_02': {
                '-de': 'Es wurden keine Versicherungstypen für die Rechnungserzeugung angegeben.',
                '-en': 'No insurance types were provided for creating the invoice.'
            },
            'tarmed_03': {
                '-de': "Für die ausgewählte Betriebsstätte ist keine Kantonsnummer hinterlegt. Bitte wählen Sie einen Kanton für die Betriebsstätte aus.",
                '-en': "No canton code provided in location."
            },
            'tarmed_04': {
                '-de': "No list tax point values provided.",
                '-en': "Keine Taxpunktwerte gefunden. Bitte kontaktieren Sie Ihren Support."
            },
            'tarmed_05': {
                '-de': "Failed to remove invoice log.",
                '-en': "Medidata Rechnung konnte nicht gelöscht werden."
            },
            'tarmed_06': {
                '-en': "Failed to update invoicing row validation status. Please contact a system administrator.",
                '-de': "Der Validierungsstatus der Abrechnung konnte nicht aktualisiert werden. Bitte wenden Sie sich an einen Systemadministrator."
            },
            'tarmed_07': {
                '-de': 'Beim Erstellen oder Verarbeiten der Abrechnung ist ein unerwarteter Fehler aufgetreten. Bitte wenden Sie sich an einen Systemadministrator.',
                '-en': 'An unexpected error occured while attempting to generate or process invoicing row documents. Please contact a system administrator.'
            },
            'tarmed_08': {
                '-de': 'Beim Erstellen der Rechnungen für einige Patienten sind Validierungsfehler aufgetreten. Für die ungültigen Fälle wurde eine neue Abrechnung erstellt. Sie können mit der aktuellen Abrechnung fortfahren.',
                '-en': 'Validation error(s) occured while generating invoices for some patient cases. A new invoicing row was created for invalid patient cases. You can continue with invoicing of this line.'
            },
            'tarmed_09': {
                '-de': 'Der Schein ist gesperrt. $activity konnte nicht erstellt werden',
                '-de-ch': 'Der Fall ist gesperrt. $activity konnte nicht erstellt werden',
                '-en': 'The schein is on hold! $activity cannot be created'
            },
            // ======================================== END: TARMED ERRORS ======================================== \\


            // ------------------------ DeviceMojit Errors -----------------------------------------------------------------------
            'deviceMojit_01': {
                '-de': 'Dateiinformationen von IPP-Drucker nicht erhalten',
                '-en': 'Did not receive file details from IPP printer'
            },
            'deviceMojit_02': {
                '-de': 'Fehler beim Konvertieren der vom IPP-Drucker empfangenen Datei nach PDF',
                '-en': 'Error while converting file received from IPP printer to pdf'
            },
            'deviceMojit_03': {
                '-de': 'Fehler beim Lesen der PDF-Datei-Details (Cache), die vom IPP-Drucker hochgeladen wurden',
                '-en': 'Cache error while reading pdf file details which was uploaded by IPP printer'
            },
            'deviceMojit_04': {
                '-de': 'Der IPP-Drucker konnte keinen Druckauftrag zuweisen, da der Browser keine geöffnete Registerkarte "Externe Dokumente" der Falldatei hatte. Der IPP-Drucker hat versucht, einen Druckauftrag in das Medienbuch zu schreiben. Es ist jedoch ein Fehler aufgetreten.',
                '-en': 'The IPP printer could not assign a print job because the browser did not have any open "External documents" tab of case file. The IPP printer tried to write print job in the media book but there was error in operation.'
            },
            'deviceMojit_05': {
                '-de': 'Der IPP-Drucker konnte einen Druckauftrag nicht zuordnen und hat ihn ins Mediabuch geschrieben. Bitte beachten Sie, dass Sie nur in die Akte drucken können, wenn Sie im Browser einen Akteneintrag und darin den Reiter "Ext. Dokumente" geöffnet haben',
                '-en': 'The IPP printer could not assign a print job and wrote it in the media book. Please note that you can only print to the case file if you have opened a case file "Ext. Documents" tab in the browser'
            },
            'deviceMojit_06': {
                '-de': 'Der IPP-Drucker konnte keinen Druckauftrag zuweisen, da der Browser mehr als eine geöffnete Registerkarte "Externe Dokumente" der Falldatei hat. Der IPP-Drucker hat versucht, einen Druckauftrag in das Medienbuch zu schreiben. Es ist jedoch ein Fehler aufgetreten.',
                '-en': 'The IPP printer could not assign a print job because the browser had more than one open "External documents" tab of case file. The IPP printer tried to write print job in the media book but there was error in operation.'
            },
            'deviceMojit_07': {
                '-de': 'Der IPP-Drucker konnte keinen Druckauftrag zuweisen und schrieb ihn in das Medienbuch. Beachten Sie, dass Sie nur dann in die Falldatei drucken können, wenn Sie genau eine geöffnete Falldatei im Register "Externe Dokumente" haben',
                '-en': 'The IPP printer could not assign a print job and wrote it in the media book. Please note that you can only print to the case file if you have exactly one open case file "Ext. Documents" tab in the browser'
            },
            'deviceMojit_08': {
                '-de': 'Fehler beim Zuweisen eines IPP-Druckerjobs zu einer geöffneten Falldatei.',
                '-en': 'Error while assigning IPP printer job to an open case file.'
            },
            'deviceMojit_09': {
                '-de': 'Fehler beim Erstellen eines Medien Eintrags in der Datenbank für den IPP-Druckerjob.',
                '-en': 'Error while creating media entry in database for IPP printer job.'
            },
            'deviceMojit_10': {
                '-de': 'Der IPP-Drucker konnte keinen Druckauftrag zuweisen, da die geöffnete Falldatei den Status $status hatte.',
                '-en': 'The IPP printer could not assign a print job because the opened case file has the status $status.'
            },
            'deviceMojit_11': {
                '-de': 'Der IPP-Drucker konnte keinen Druckauftrag zuweisen, da die geöffnete Falldatei nicht in der Datenbank gefunden wurde.',
                '-en': 'The IPP printer could not assign a print job because the opened case file was not found in the database.'
            },
            'deviceMojit_12': {
                '-de': 'Der IPP-Drucker konnte keinen Druckauftrag zuweisen, da beim Abfragen der geöffneten Falldatei aus der Datenbank ein Fehler aufgetreten ist.',
                '-en': 'The IPP printer could not assign a print job because there was an error while querying the open case file from the database.'
            },
            // ------------------------------ END ( DeviceMojit Errors) ----------------------------------------------------------

            // -------------------------- UserMgmtMojit ------------------------------
            'userMgmtMojit_01': {
                '-de': 'Proxy-Funktion wird nicht unterstützt',
                '-en': 'proxy feature not supported'
            },
            'userMgmtMojit_02': {
                '-de':'Fehler beim Analysieren des Ergebnisses des Befehls cli',
                '-en': 'Error while parsing the result of the cli command'
            },
            'userMgmtMojit_03': {
                '-de': 'Ungültige Proxy-Konfigurationsantwort von CLI',
                '-en': 'Invalid proxy configuration response from cli'
            },
            'userMgmtMojit_04': {
                '-de': 'Ungültige Proxy-Konfiguration',
                '-en': 'Invalid proxy configuration'
            },
            'userMgmtMojit_05': {
                '-de': 'Fehler beim Überprüfen, ob Kürzel: $initials bereits von einem anderen Mitarbeiter verwendet werden. Fehler: $error',
                '-en': 'Error while checking if initials: $initials are already taken by other employee. Error: $error'
            },
            // ----------------------------- END (UserMgmtMojit) ---------------------

            // ----------------------- communication ---------------------------------
            'communication_01': {
                '-de': 'Kommunikation über Proxy fehlgeschlagen',
                'en': 'Communication via proxy failed'
            },
            // --------------------------- END (Communucation) -----------------------

            // -------------------------- InstockMojit Errors ------------------------------
            'instockMojit_01': {
                '-de': 'Lagerbestand wird gerade geändert. Bitte warten Sie, bis die Änderung abgeschlossen ist.',
                '-en': 'Inventory is being changed. Please wait until changing is done.'
            },
            'instockMojit_02': {
                '-de': 'Ein oder mehrere Artikel aus der Bestellung sind nicht auf Lager.',
                '-en': 'One or more items are not in stock.'
            },
            'instockMojit_03': {
                '-de': 'Der Status der Bestellung konnte nicht gesetzt werden. Falscher vorheriger Status.',
                '-en': 'Could not set order status. Wrong previous status.'
            },
            'instockMojit_04': {
                '-de': 'Der Status der Bestellung konnte nicht gespeichert werden. Falsche Werte.',
                '-en': 'Could not save order. Wrong values.'
            },
            'instockMojit_05': {
                '-de': 'Der Status der Bestellung konnte nicht gesetzt werden. Falscher vorheriger Status oder Artikel existieren nicht.',
                '-en': 'Could not set order status. Wrong previous status or or items do not exist.'
            },
            'instockMojit_06': {
                '-de': 'Falscher Status. Die Bestellung kann nicht gelöscht werden.',
                '-en': 'Wrong orders status. Impossible to remove order.'
            },
            'instockMojit_07': {
                '-de': 'Der Status der Bestellung konnte nicht gesetzt werden. Falsche Parameter.',
                '-en': 'Could not set order status. Wrong parameters.'
            },
            'instockMojit_08': {
                '-de': 'Die Bestellung konnte nicht aktualisiert werden, da sie sich nicht im Status „erstellt“ befindet.',
                '-en': 'Could not update order. Order is not in "created" status.'
            },
            'instockMojit_09': {
                '-de': 'Die Bestellung konnte nicht aktualisiert werden. Es wurden keine Bestellungen gefunden.',
                '-en': 'Could not update order. No orders found.'
            },
            'instockMojit_10': {
                '-de': 'Falsche Anforderung.',
                '-en': 'Wrong request.'
            },
            'instockMojit_11': {
                '-de': 'Die Bestellung wurde nicht gefunden.',
                '-en': 'Could not find order.'
            },
            'instockMojit_12': {
                '-de': 'Die Bestellung wird nicht archiviert. Alle Bestände sollten freigegeben (geprüft) werden.',
                '-en': 'Order is not archived. All order stocks should be approved (checked).'
            },
            'instockMojit_13': {
                '-de': 'Das PDF-Formular wurde nicht gefunden. PDF wird nicht generiert.',
                '-en': "PDF form is not found. PDF is not generated."
            },
            'instockMojit_14': {
                '-en': "Der Auftrag zur Erstellung der Lieferung konnte nicht gefunden werden.",
                '-de': "Could not find order to create delivery."
            },
            'instockMojit_15': {
                '-de': 'Die Lieferung wird gerade geändert. Bitte warten Sie, bis die Änderung abgeschlossen ist.',
                '-en': 'Stock delivery is being changed. Please wait until changing is done.'
            },
            'instockMojit_16': {
                '-de': 'Der Status der Lieferung konnte nicht gesetzt werden. Falscher vorheriger Status.',
                '-en': 'Could not set delivery status. Wrong previous status.'
            },
            'instockMojit_17': {
                '-de': 'Der Status der Lieferung konnte nicht gesetzt werden. Falscher vorheriger Status oder Artikel existieren nicht.',
                '-en': 'Could not set delivery status. Wrong previous status or items do not exist.'
            },
            'instockMojit_18': {
                '-de': 'Der Status der Lieferung konnte nicht gesetzt werden. Lieferung enthält nicht verarbeiteten Artikel.',
                '-en': 'Could not set delivery status. Delivery contains not processed items.'
            },
            'instockMojit_19': {
                '-de': 'Die Lieferung konnte nicht aktualisiert werden, da sie sich nicht im Status „angekommen“ befindet oder die übertragenen Parameter falsch sind.',
                '-en': 'Could not update delivery. Delivery is not in "arrived" status or sent parameters are wrong.'
            },
            'instockMojit_20': {
                '-de': 'Die Bestellung konnte nicht erzeugt werden.',
                '-en': 'Failed to create order.'
            },
            'instockMojit_21': {
                '-de': 'Bitte wählen Sie eine Betriebsstätte mit Lager aus.',
                '-en': 'Please select location with stock locations.'
            },
            'instockMojit_23': {
                '-de': 'Neue Artikel konnten nicht in inStock aufgenommen werden.',
                '-en': 'Failed to put new items into inStock.'
            },
            'instockMojit_24': {
                '-de': 'Methode Nicht Erlaubt.',
                '-en': 'Method Not Allowed.'
            },
            'instockMojit_25': {
                '-de': 'inStock-Lizenz ist nicht aktiviert.',
                '-en': 'inStock license has not been activated .'
            },
            'instockMojit_26': {
              '-de': "Wählen Sie eine Bestellung aus, zu der dieses Medikament hinzugefügt werden soll.",
              '-en': "Select an order to which this medicine should be added."
            },
            'instockMojit_27': {
              '-de': "Eins der Medikamente hat keine PZN.",
              '-en': "Medication is missing a PZN."
            },
            'instockMojit_28': {
              '-de': "Kein Lieferant in der Bestellung.",
              '-en': "Supplier is missing."
            },
            'instockMojit_30': {
                '-de': "Dieser Artikel enthält einen Patientenbezug und kann deshalb nicht gelöscht werden.",
                '-en': "This article can't be deleted because it has a patient relation."
            },
            'instockMojit_31': {
                '-de': "Es ist kein Hauptlieferant festgelegt. Bitte legen Sie einen Hauptlieferanten in den Kontaktdaten fest.",
                '-en': "The main supplier is not set. Please define the main supplier in supplier settings."
            },
            // ----------------------------- END (InstockMojit Errors) ---------------------

            // -------------------- complexprescription ------------------------------
            'complexprescription_01': {
                '-de': 'Es sollte entweder codeHMV oder codePZN angegeben werden',
                '-en': 'Either codeHMV or codePZN should be provided'
            },
            'complexprescription_02': {
                '-de': 'Es sollte mindestens ein Assistent bereitgestellt werden',
                '-en': 'At least one assistive should be provided'
            },
            'complexprescription_03': {
                '-de': 'Betriebsstätte $locationId nicht gefunden',
                '-en': 'requested location $locationId not found'
            },
            'complexprescription_04': {
                '-de': 'Angeforderter Ort von bsnr $bsnr nicht gefunden',
                '-en': 'requested location by bsnr $bsnr not found'
            },
            'complexprescription_05': {
                '-de': 'Mitarbeiter $employeeId nicht gefunden',
                '-en': 'requested employee $employeeId not found'
            },
            'complexprescription_06': {
                '-de': 'Mitarbeiter von lanr $lanr nicht gefunden',
                '-en': 'requested employee by lanr $lanr not found'
            },
            'complexprescription_07': {
                '-de': 'Patient $patientId nicht gefunden',
                '-en': 'requested patient $patientId not found'
            },
            'complexprescription_08': {
                '-de': 'Fall $caseFolderId nicht gefunden',
                '-de-ch': 'Fallordner $caseFolderId nicht gefunden',
                '-en': 'requested casefolder $caseFolderId not found'
            },
            'complexprescription_09': {
                '-de': 'Fehler beim Abrufen des Mitarbeiters für Standort $locationId. Bitte überprüfen Sie Ihre Angaben',
                '-en': 'error on getting employee for location $locationId. Please, check your data'
            },
            'complexprescription_10': {
                '-de': 'Standard-Hauptstandort verwendet',
                '-en': 'used default main location'
            },
            // -------------------- END (complexprescription) -------------------------
        // ------------------------------------------- START (Sumex Errors) --------------------------------------------
            'sumex_00': {
                '-de': 'Es ist beim abfragen der zugehörigen Patienteninformationen ein Fehler aufgetreten.',
                '-en': 'An error occurred while attempting to retrieve the relevant patient information.'
            },
            'sumex_01': {
                '-de': 'Sumex Service ist ausgeschaltet oder nicht erreichbar. Bitte wenden Sie sich an den Systemadministrator',
                '-en': 'Sumex service is off or unreachable. Please contact system administrator'
            },
            'sumex_02': {
                '-de': 'Es war nicht möglich die Patientendaten in ein Format umzuwandeln, das mit dem Sumex Modul kompatibel ist.',
                '-en': 'It was not possible to convert the patient data into a format that is compatible with the Sumex module.'
            },
            'sumex_03': {
                '-de': 'Es ist in der Kommunikation mit dem Sumex Modul ein Fehler aufgetreten.',
                '-en': 'An error occurred in the communication with the Sumex module.'
            },
            'sumex_07': {
                '-de': 'Es ist bei dem erstellen der Rechnungen ein Fehler aufgetreten.',
                '-en': 'An error occurred while generating invoice in the Sumex module.'
            },
            'sumex_08': {
                '-de': 'Es war nicht möglich die Rechnungsdaten in ein Format umzuwandeln, das mit dem Sumex Modul kompatibel ist.',
                '-en': 'It was not possible to convert the invoice data into a format that is compatible with the Sumex module.'
            },
            'sumex_09': {
                '-de': 'Es ist bei dem abfragen der Rechnungsdaten ein Fehler aufgetreten.',
                '-en': 'An error occurred while retrieving invoice data.'
            },
            'sumex_10': {
                '-de': 'Es kam bei dem erstellen der Rechnung zu einem Validierungsfehler. Bitte stellen sie sicher, dass die Rechnungsdaten valide sind.',
                '-en': 'A validation error occured while creating the invoice. Please insure that the invoice data is valid.'
            },
            'sumex_11': {
                '-de': 'Importierte Rechnungen können nicht gemahnt werden. Sie müssen die Rechnung neu erstellen und dann mahnen.',
                '-en': 'Imported invoices cannot be warned. Please create new invoice instead and then warn it.'
            },
            'sumex_12': {
                '-en': 'An invoice has no Sumex XML. Please contact a system administrator.',
                '-de': 'Eine Rechnung enthält keine Sumex-XML. Bitte wenden Sie sich an einen Systemadministrator.'
            },
            'sumex_13': {
                '-de': 'Beim Erstellen des Rechnungseintrags nach Erhalt der Sumex-Antwort ist ein Fehler aufgetreten. Bitte wenden Sie sich an einen Systemadministrator.',
                '-en': 'An error occurred while generating an invoice entry (invoiceref) after receiving Sumex response. Please contact a system administrator.'
            },
            'sumex_14': {
                '-de': 'Es konnten keine Dokumente (PDF, XML) aus der Sumex-Antwort generiert werden. Bitte wenden Sie sich an einen Systemadministrator.',
                '-en': 'Failed to generate documents (PDF, XML) from the Sumex response. Please contact a system administrator.'
            },
            'sumex_15': {
                '-de': 'Beim Erstellen des Dokuments ist ein interner Sumex-Sol Fehler aufgetreten.',
                '-en': 'An unexpected internal Sumex-Sol error occurred while generating documents (PDF, XML)'
            },
            'sumex_16': {
                '-de': 'Eine unerwartete Antwort von Sumex-Sol. Bitte versuchen Sie es nochmal oder wenden Sie sich an einen Systemadministrator.',
                '-en': 'An unexpected response from Sumex-Sol. Please try again or contact a system administrator'
            },
            'sumex_17': {
                '-de': 'Bei der Validierung der Abechnungsdatei ist ein interner Sumex-Sol Fehler aufgetreten.',
                '-en': 'An unexpected internal Sumex-Sol error occurred while validating invoice data'
            },
            'sumex_18': {
                '-de': 'Kostenträger fehlt in den Patientendaten',
                '-en': 'Insurance is missing in patient info'
            },
            'sumex_19': {
                '-de': 'Es war nicht möglich die Arzt/Ärztin Daten in ein Format umzuwandeln, das mit dem Sumex Modul kompatibel ist.',
                '-en': 'It was not possible to convert the physician data into a format that is compatible with the Sumex module.'
            },
        // -------------------------------------------- END (Sumex Errors) ---------------------------------------------

        // ------------------------------------------ START (Medidata Errors) ------------------------------------------
            'medidata_00': {
                '-de': 'Abrechnung, die aus der Medidata-Antwort stammt, kann nicht gefunden werden. Suchparameter: Betriebsstätte GLN: $locationGln, Rechnungsnummer: $invoiceNo, Patienten Sozialversicherungsnummer: $patientSsn',
                '-en': 'Cannot find invoice which comes from medidata response. Search parameters: location GLN: $locationGln, invoice number: $invoiceNo, patient social security number: $patientSsn'
            },
            'medidata_01': {
                '-de': 'Rechnung hat keine verknüpften Aktivitäten',
                '-en': 'Invoice has no linked actities!'
            },
            'medidata_02': {
                '-de': 'Rechnung von Medidata Antwort konnte nich gefunden werden',
                '-en': 'Invoice mentioned in Medidata response cannot be found'
            },
            'medidata_03': {
                '-de': 'Fehler beim Speichern der Mediport Kommunikator Einstellungen',
                '-en': 'Error in saving mediport delivery settings'
            },
            'medidata_04': {
                '-de': 'Fehler bei der Flow aktualisierung nach dem Speichern der Mediport Kommunikator Einstellungen',
                '-en': 'Error in updating flows after saving mediport delivery settings'
            },
            'medidata_05': {
                '-de': 'Fehler beim Analysieren des XML-Dokument von Medidata Antwort',
                '-en': 'Error in parsing XML from Medidata response'
            },
            'medidata_06': {
                '-de': 'Es konnten keine Dokumente (XML) aus der Medidata-Antwort generiert werden. Bitte wenden Sie sich an einen Systemadministrator.',
                '-en': 'Failed to generate documents (XML) from the Medidata response. Please contact a system administrator.'
            },
            'medidata_07': {
                '-de': 'Fehlende Parameter für Medidata-Netz Anfrage: $parameter.',
                '-en': 'Missing parameters for Medidata-Net request: $parameter.'
            },
            'medidata_08': {
                '-de': 'Kann den Empfang der Benachrichtigung nicht bestätigen. Status code: $statusCode, nachricht: $statusMessage.',
                '-en': 'Cannot confirm receipt of notification. Status code: $statusCode, message: $statusMessage.'
            },
        // -------------------------------------------- END (Sumex Errors) ---------------------------------------------

        // ------------------------------------------ START (Dignity Errors) -------------------------------------------
            'dignity_00_quali': {
                '-de': 'Es kam bei dem Abfragen der qualitativen Dignitäten zu einem Fehler.',
                '-en': 'An error occurred while searching for qualitative dignities.'
            },
            'dignity_00_quanti': {
                '-de': 'Es kam bei dem Abfragen der quantitativen Dignitäten zu einem Fehler.',
                '-en': 'An error occurred while searching for quantitative dignities.'
            },
            'dignity_01_quali': {
                '-de': 'Es kam bei dem Abfragen der zugehörigen Texten für die qualitativen Dignitäten zu einem Fehler.',
                '-en': 'An error occurred while trying to fetch the texts for the qualitative dignity codes.'
            },
            'dignity_01_quanti': {
                '-de': 'Es kam bei dem Abfragen der zugehörigen Texten für die quantitativen Dignitäten zu einem Fehler.',
                '-en': 'An error occurred while trying to fetch the texts for the quantitative dignity codes.'
            },
            'dignity_02_quali': {
                '-de': '"0000" darf nicht die einzige qualitative Dignität eines Arztes sein.',
                '-en': '"0000" cannot be the only qualitative dignity for a doctor.'
            },
            'dignity_02': {
                '-de': 'Es kam bei dem Speichern der Dignität zu einem Fehler.',
                '-en': 'An error occurred while saving the dignity.'
            },
            'dignity_03': {
                '-de': 'Die Dignität konnte nicht gespeichert werden, da der Code oder Text schon existieren.',
                '-en': 'The dignity could not be saved as the code or text already exists.'
            },
            'canton_00': {
                '-de': 'Es kam bei dem Abfragen der Kantons zu einem Fehler.',
                '-en': 'An error occurred while searching for cantons.'
            },
            'canton_01': {
                '-de': 'Es kam bei dem Abfragen der zugehörigen Texten für die Kanton Codes zu einem Fehler.',
                '-en': 'An error occurred while trying to fetch the texts for the canton codes.'
            },
            'biller_00': {
                '-de': 'Es kam bei dem Abfragen der möglichen Rechnungssteller zu einem Fehler.',
                '-en': 'An error occurred while searching for possible billers.'
            },
        // ------------------------------------------- END (Dignity Errors) --------------------------------------------

            // ------------------------------ jira-api Errors ---------------------------------------------
            'jiraError_01': {
                '-de': 'Die Jira-Funktionalität wird von diesem Server nicht unterstützt',
                '-en': 'Jira functionality not supported by this server'
            },
            'jiraError_02': {
                '-de': 'Fehler beim Abfragen der Kundennummer aus der Datenbank',
                '-en': 'Error querying customer number from the database'
            },
            'jiraError_03': {
                '-de': 'Falsches Zielsystem für Jira-Suche',
                '-en': 'Wrong target system for Jira search'
            },
            'jiraError_04': {
                '-de': 'jira.json Fehler: $jiraError',
                '-en': 'jira.json error: $jiraError'
            },
            'jiraError_05': {
                '-de': 'Fehler beim Abfragen des Firmendatensatzes aus der Datenbank nach der Kundennummer = $dcCustomerNo',
                '-en': 'Error querying company record from database for customer number = $dcCustomerNo'
            },
            'jiraError_06': {
                '-de': 'Es wurde kein Firmendatensatz für Kundennummer = $dcCustomerNo gefunden',
                '-en': 'No company record found for customer number = $dcCustomerNo'
            },
            'jiraError_07': {
                '-de': 'Nicht unterstützter Jira-Abfragetyp = $jiraQueryType empfangen',
                '-en': 'Unsupported jira query type = $jiraQueryType received'
            },
            'jiraError_08': {
                '-de': 'Jira Server Fehler: $jiraServerError',
                '-en': 'Jira server error: $jiraServerError'
            },
            'jiraError_09': {
                '-de': 'Leere Antwort vom Jira API-Server empfangen. Versuch = $attempt',
                '-en': 'Empty response received from jira api server. Attempt = $attempt'
            },
            'jiraError_10': {
                '-de': 'Fehler beim Abrufen der Daten vom Jira Server. Fehlermeldung = $jiraServerError. Versuch = $attempt',
                '-en': 'Error while fetching data from jira server. Error message = $jiraServerError. Attempt = $attempt'
            },
            'jiraError_11': {
                '-de': '"ticketLabel" wurde in der Datenbank für Kundennummer = $dcCustomerNo nicht gefunden',
                '-en': '"ticketLabel" was not found in database for customer number = $dcCustomerNo'
            },
            // ------------------------------ jira-api errors END ----------------------------------------------------------

            // ------------------------------ resource-api Errors ---------------------------------------------
            'resourceError_01': {
                '-de': 'Diese Ressourcennamen $resourceNames existieren bereits.',
                '-en': 'This names of resources $resourceNames already exist.'
            },
            // ------------------------------ resource-api errors END ----------------------------------------------------------

            // ------------------------------ leanSync Errors ---------------------------------------------
            'leanSync_01': {
                '-de': 'Kein Kontakt von dieser Nummer gefunden: $phoneNumber',
                '-en': 'No contact found by this number: $phoneNumber'
            },
            'leanSync_02': {
                '-de': 'LeanSync Authentifizierungsproblem',
                '-en': 'LeanSync authorization failed!'
            },
            // ------------------------------ leanSync errors END ----------------------------------------------------------
            // ------------------------------ stocklocation Errors ---------------------------------------------
            'stocklocation_01': {
                '-de': 'Lagerort „$stocklocation“ konnte nicht gelöscht werden, da damit nicht bearbeitete Bestellungen verknüpft sind.',
                '-en': 'Stock location "$stocklocation" cannot be removed because there are unprocessed orders linked to it.'
            },
            'stocklocation_02': {
                '-de': 'Lagerort „$stocklocation“ konnte nicht gelöscht werden, da sich Artikel im Lager befinden.',
                '-en': 'Stock location "$stocklocation" cannot be removed because some items are stored there.'
            },
            'stocklocation_03': {
                '-de': 'Beim Bearbeiten oder Speichern des Lagerortes ist ein Fehler aufgetreten.',
                '-en': 'An error occured while updating or saving stock locations.'
            },
            'stocklocation_04': {
                '-de': 'Ein interner Fehler ist aufgetreten. Der Lagerort „$stocklocation“ konnte nicht gelöscht werden.',
                '-en': 'An internal error occured. Stock location "$stocklocation" could not be removed.'
            },
            'stocklocation_05': {
                '-de': 'Lagerort „$stocklocation“ konnte nicht bearbeitet werden, da bereits ein Lagerort mit demselben Namen existiert.',
                '-en': 'Stock location "$stocklocation" cannot be updated because a stock location with the same name already exists.'
            }
            // ------------------------------ stocklocation errors END ----------------------------------------------------------


        };

        function replacePlaceholder( msg, data, locale ) {
            var newMsg = '';
            if( !data || 'object' !== typeof data ) {
                return msg;
            }
            newMsg = msg.slice( 0, msg.length );
            var keys = Object.keys( data );
            keys.forEach( function( key ) {
                var val = data[key];
                if( key[0] !== '$' ) {
                    return;
                }
                val = 'string' === typeof val ? val : val && (val[locale] || val.toString()) || '';
                newMsg = newMsg.replace( key, val );
            } );
            return newMsg.length ? newMsg : msg;
        }

        /**
         * Constructor for the module class.
         *
         * Sets up error table
         *
         * @class DCErrors
         * @private
         */
        function DCErrorTable() {
            Y.log( 'Init DCErrorTable', 'info', NAME );
        }

        /**
         * Return an internationalized error message from error table by error code.
         * Messages can contain "$" prefixed placeholders. These placeholders are replaced
         * with values found in the data object: {$placeholder: value} or {$placeholder: {'-de': valaue, ... }}
         *
         * For example $model in '$model konnte nicht gepeichert werden' will be replaced with on of
         * these values {$model: {'-de': 'Abrechnungslog', '-en': 'Invoice Log' }}.
         *
         * @param options
         *      code Number or String default= "001"
         *      locale {String} default= "-de"
         *      data {Object} default = {}
         * @returns {String}
         */
        DCErrorTable.prototype.getMessage = function( options ) {
            var defaults = {
                code: '1001',
                locale: '-' + Y.doccirrus.comctl.getUserLang(),
                data: {}
            }, error, msg;
            options = Y.merge( {}, defaults, options );
            error = table[options.code] || table[defaults.code];
            msg = error[options.locale] || error['-de'] || ( error[defaults.locale] + ' ' + options.code );
            return replacePlaceholder( msg, options.data, options.locale );
        };

        /**
         * Returns an array of error messages like getMessage does for one error.
         * Second optional param overrides/sets locale for all errors.
         * @param errors
         * @param locale
         * @returns {String}
         */
        DCErrorTable.prototype.getMessages = function( errors, locale ) {
            var messages = [];
            if( !Array.isArray( errors ) ) {
                if( locale ) {
                    errors.locale = locale;
                }
                return this.getMessage( errors );
            }
            errors.forEach( function( error ) {
                if( locale ) {
                    error.locale = locale;
                }
                messages.push( this.getMessage( error ) );
            }, this );
            return messages;
        };

        /**
         * extended default Error
         * @param {Object} config
         * @param {String} [fileName]
         * @param {*} [lineNumber]
         * @constructor
         * @extends Error
         */
        function DCBaseError( config/*, fileName, lineNumber*/ ) {
            var
                self = this;

            self.config = config;
            self.name = config.code || config.name;
            self.message = errorTable.hasCode( config.code ) ? errorTable.getMessage( config ) : config.message || config.reasonPhrase;
            arguments[0] = self.message;

            DCBaseError.superclass.constructor.apply( self, arguments );
        }

        Y.extend( DCBaseError, Error, {
            /**
             * @property level
             * @default 'info'
             * @type {String}
             */
            level: 'info',
            /**
             * logs this error
             * @method log
             */
            log: function() {
                var
                    self = this;

                Y.log( self.name + ': ' + self.message, self.level, self.fileName );
            },
            /**
             * displays this error
             * @method display
             */
            display: function() {
                this.log();
            },
            /** @protected */
            _buildDisplayMessage: function() {
                var
                    self = this,
                    config = self.config,
                    message = '',
                    messageHeader = '',
                    errorType = '',
                    detailsId = null;

                if( errorTable.hasCode( config.code ) ) {
                    return (errorTable.getMessage( config ) || '').replace( /\n/g, '<br>');
                }
                else {
                    messageHeader = errorTable.getMessage();
                    errorType = self.getErrorType();
                    detailsId = Y.guid();

                    message = Y.Node.create( Y.Lang.sub( [
                        '<p>{messageHeader}</p>',
                        '<a data-toggle="collapse" data-target="#{detailsId}" style="cursor: pointer">{showDetails}</a>',
                        '<div id="{detailsId}" class="well collapse" style="overflow: scroll; margin: 0; padding: 8px 10px; font-family: monospace; font-size: 12px; white-space: pre;"></div>'
                    ].join( '' ), {
                        detailsId: detailsId,
                        messageHeader: messageHeader,
                        showDetails: i18n( 'dcerrortable.DCBaseError._buildDisplayMessage.showDetails' )
                    } ) );

                    switch( errorType ) {
                        case 'ValidationError':
                            message.one( '#' + detailsId ).append( Y.Handlebars.render( [
                                '<ul style="margin: 0px; padding-left: 1em;">',
                                '{{#errors}}',
                                '<li>{{message}}</li>',
                                '{{/errors}}',
                                '</ul>'
                            ].join( '' ), {
                                errors: config.errors && Y.Object.values( config.errors )
                            } ) );
                            break;
                        default:
                            message.one( '#' + detailsId ).append( self.message || (self.config && self.config.data) );
                            break;
                    }

                    //  Print stack to console if available
                    if ( self.config && self.config.stack ) {
                        console.log( 'Stack trace for error shown in modal: ', self.config );  //  eslint-disable-line no-console
                    } else {
                        console.log( 'Stack trace for error shown in modal: ', new Error() );  //  eslint-disable-line no-console
                    }
                    return message;
                }
            },
            /**
             * Return a type to identify by
             * @return {string}
             */
            getErrorType: function() {
                var
                    self = this,
                    config = self.config;

                switch( config.name ) {
                    case 'ValidationError':
                        return 'ValidationError';
                    default:
                        if( config.data && config.code ) {
                            return 'ErrorTableError';
                        }
                        return 'Error';
                }
            }
        } );

        /**
         * An Error for response warnings
         * @param {Object} config
         * @param {String} [fileName]
         * @param {*} [lineNumber]
         * @constructor
         * @extends DCBaseError
         */
        function DCResponseWarning() {
            DCResponseWarning.superclass.constructor.apply( this, arguments );
        }

        Y.extend( DCResponseWarning, DCBaseError, {
            /**
             * @property level
             * @default 'warn'
             * @type {String}
             */
            level: 'warn',
            /**
             * displays this error with DCSystemMessages
             * @method display
             */
            display: function() {
                var
                    self = this,
                    messageId = 'DCResponseWarning-' + self.name,
                    content = self.message;

                Y.use( 'DCSystemMessages', function() {
                    Y.doccirrus.DCSystemMessages.addMessage( { messageId: messageId, content: content, level: 'WARNING' } );
                } );

            }
        } );

        /**
         * mapper for Object to DCResponseWarning
         * @param {Object|DCResponseWarning} item
         * @return {DCResponseWarning}
         */
        function DCResponseWarningMapper( item ) {
            var
                mapped;

            if( item instanceof DCResponseWarning ) {
                mapped = item;
            } else {
                mapped = new DCResponseWarning( item );
            }

            return mapped;
        }

        DCErrorTable.prototype.getWarningsFromResponse = function( response ) {
            var
                result = [];

            if( Y.Lang.isObject( response ) && Y.Object.owns( response, 'meta' ) ) {
                if( Y.Object.owns( response.meta, 'warnings' ) && Y.Lang.isArray( response.meta.warnings ) && response.meta.warnings.length ) {
                    result = Y.Array.map( response.meta.warnings, DCResponseWarningMapper );
                }
            }

            return result;
        };

        /**
         * An Error for HTTP errors
         * @param {Object} config
         * @param {String} [fileName]
         * @param {*} [lineNumber]
         * @constructor
         * @extends DCBaseError
         */
        function DCHttpError() {
            DCHttpError.superclass.constructor.apply( this, arguments );
        }

        Y.extend( DCHttpError, DCBaseError, {
            /**
             * @property level
             * @default 'error'
             * @type {String}
             */
            level: 'error',
            /**
             * displays this error with DCWindow.notice
             * @method display
             */
            display: function( type ) {
                var
                    self = this,
                    widgetId = 'DCHttpError-' + self.name,
                    widget;

                Y.use( 'DCWindow', function() {
                    widget = Y.doccirrus.DCWindowManager.noticeDCWindowManager.getById( widgetId );
                    if( widget ) {
                        Y.doccirrus.DCWindowManager.noticeDCWindowManager.bringToFront( widget );
                    } else {
                        widget = Y.doccirrus.DCWindow.notice( {
                            type: type || 'error', message: self._buildDisplayMessage(),
                            window: {id: widgetId, width: 'medium'}
                        } );
                    }
                } );

            }
        } );

        /**
         * An Error for response errors
         * @param {Object} config
         * @param {String} [fileName]
         * @param {*} [lineNumber]
         * @constructor
         * @extends DCBaseError
         */
        function DCResponseError() {
            DCResponseError.superclass.constructor.apply( this, arguments );
        }

        Y.extend( DCResponseError, DCBaseError, {
            /**
             * @property level
             * @default 'error'
             * @type {String}
             */
            level: 'error',
            /**
             * displays this error with DCWindow.notice
             * @method display
             */
            display: function( type ) {
                var
                    self = this,
                    widgetId = 'DCResponseError-' + self.name,
                    widget;

                Y.use( 'DCWindow', function() {
                    widget = Y.doccirrus.DCWindowManager.noticeDCWindowManager.getById( widgetId );
                    if( widget ) {
                        Y.doccirrus.DCWindowManager.noticeDCWindowManager.bringToFront( widget );
                    } else {
                        widget = Y.doccirrus.DCWindow.notice( {
                            type: type || 'error', message: self._buildDisplayMessage(),
                            window: {id: widgetId,
                                width: 'medium',
                                buttons: { footer: [
                                        Y.doccirrus.DCWindow.getButton( 'CLOSE', { isDefault: false } )
                                        ] } }
                        } );
                    }
                } );

            }
        } );

        /**
         * mapper for Object to DCResponseError
         * @param {Object|DCResponseError} item
         * @return {DCResponseError}
         */
        function DCResponseErrorMapper( item ) {
            var
                mapped;

            if( item instanceof DCResponseError ) {
                mapped = item;
            } else {
                mapped = new DCResponseError( item );
            }

            return mapped;
        }

        /**
         * @method getErrorsFromResponse
         * @for doccirrus.errorTable
         */
        DCErrorTable.prototype.getErrorsFromResponse = function( response ) {
            var
                result = [];
            // assumed just a message ~ unknown
            if( Y.Lang.isString( response ) ) {
                Y.log( response, 'error', NAME );
                response = {meta: {errors: [{error: response}]}};
            }

            // assumed rest
            else if( Y.Lang.isObject( response ) && Y.Object.owns( response, 'meta' ) ) {
                if( Y.Object.owns( response.meta, 'errors' ) && Y.Lang.isArray( response.meta.errors ) && response.meta.errors.length ) {
                    result = Y.Array.map( response.meta.errors, DCResponseErrorMapper );
                }
            }
            // assumed http
            else if( Y.Lang.isObject( response ) && Y.Object.owns( response, 'status' ) && Y.Object.owns( response, 'statusText' ) ) {
                result.push( new DCHttpError( { code: response.status, message: response.statusText, XHR: response } ) );
            }
            // assumed jsonrpc
            else if( Y.Lang.isObject( response ) ) {
                result.push( new DCResponseError( response ) );
            }

            return result;
        };

        errorTable = new DCErrorTable();

        /**
         * Check error table knows about code
         * @param {String|Number} code
         * @return {boolean}
         */
        errorTable.hasCode = function hasCode( code ) {
            return String( code ) in table;
        };

        /**
         * @property DCBaseError
         * @for doccirrus.errorTable
         * @type {DCBaseError}
         */
        errorTable.DCBaseError = DCBaseError;

        /**
         * @property DCResponseWarning
         * @for doccirrus.errorTable
         * @type {DCResponseWarning}
         */
        errorTable.DCResponseWarning = DCResponseWarning;

        /**
         * @property DCBaseError
         * @for doccirrus.errorTable
         * @type {DCBaseError}
         */
        errorTable.DCHttpError = DCHttpError;

        /**
         * @property DCResponseError
         * @for doccirrus.errorTable
         * @type {DCResponseWarning}
         */
        errorTable.DCResponseError = DCResponseError;

        Y.namespace( 'doccirrus' ).errorTable = errorTable;

    },
    '0.0.1', {
        requires: [
            'oop',
            'doccirrus'
        ]
    }
);
