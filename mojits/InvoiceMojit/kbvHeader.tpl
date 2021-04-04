{{l '8000' 'con0'  }} {{~DC '**** Container-Header - (do not add this as first line) ****' }}
{{d '9103' __now 'YYYYMMDD' }}
{{l '9106' '4' }}
{{l '9132' '1' }}
{{~DC '*****************************' }}
{{~DC '**** Betriebsstättendaten ****' }}
{{~DC '*****************************' }}
{{l '8000' 'besa' }}
{{~#each locations}}
{{l '0201' commercialNo }}
{{l '0203' locname }}
{{~# each physicians }}
{{~officialNo officialNo }}
{{~o '0219' title }}
{{l '0220' firstname }}
{{~o '0221' nameaffix }}
{{l '0211' title ' ' firstname ' ' lastname }}
{{~#each asvTeamNumbers}}
{{l '0222' this }}
{{~/each}}
{{~/ each }}
{{l '0205' street ' ' houseno }}
{{l '0215' zip }}
{{l '0216' city }}
{{l '0208' phone }}
{{~o '0209' fax }}
{{~o '0218' email }}
{{~o '0224' konnektorProductVersion }}
{{~o '0225' tiServiceFlag }}
{{~o '0226' tiSupportFlag }}
{{~/each}}
{{~DC '*********************************' }}
{{~DC '**** Ringversuchszertifikate ****' }}
{{~DC '*********************************' }}
{{l '8000' 'rvsa' }}
{{~#each locations}}
{{l '0201' commercialNo }}
{{~# iff hasLabDevices '==' true }}
{{l '0300' '1' }}{{!-- Abrechnung von (zertifikatspflichtigen) Laborleistungen --}}
{{l '0301' labDevicesIsUnitUse }}
{{~#each labDevices }}
{{l '0302' deviceType }}
{{l '0303' manufacturer }}
{{~/each}}
{{~#each labDeviceTests}}
{{l '0304' testId }}
{{l '0305' isCertified }}
{{~/each}}
{{~else}}
{{l '0300' '0' }}
{{~/ iff }}
{{~/each}}
{{l '8000' 'adt0' }}
{{l '0105' kbvCertificationNumber }}{{!-- KBV-Prufnummer --}}
{{l '9102' destination }}
{{adtVersion '9212' quarter year }}
{{l '0102' 'Doc Cirrus GmbH' }}
{{l '0121' 'Bessemerstr. 82' }}
{{l '0122' '12103' }}
{{l '0123' 'Berlin' }}
{{l '0124' '+49.30.20898729.0' }}
{{l '0125' '+49.30.20898729.9' }}
{{l '0126' 'Doc Cirrus GmbH' }}
{{l '0127' 'Bessemerstr. 82' }}
{{l '0128' '12103' }}
{{l '0129' 'Berlin' }}
{{l '0130' '+49.30.20898729.0' }}
{{l '0131' '+49.30.20898729.9' }}
{{l '0103' 'inSuite' }}
{{l '0132' version }}
{{l '9204' quarter year }}
{{~oH '9250' avwgNo }}
