/**
 * User: do
 * Date: 24.02.21  09:16
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
const moment = require( 'moment' );
exports.get = ( {docLetterId, xmlSetId, patientId, docLetterTimestamp, signer1Timestamp, signer2Timestamp} ) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:voc="urn:hl7-org:v3/voc" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
 <typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
 <templateId extension="CDA-R2-AB100" root="1.2.276.0.76.3.1.13.10"/>
 <id extension="${docLetterId}" root="1.2.276.0.76.3.1.460.0.1337.198212400"/>
 <code code="11490-0" codeSystem="2.16.840.1.113883.6.1"/>
 <title>Arztbrief</title>
 <effectiveTime value="${moment( docLetterTimestamp ).format( 'YYYYMMDDHHmm' )}"/>
 <confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25"/>
 <languageCode code="de-DE"/>
 <setId extension="${xmlSetId}" root="1.2.276.0.76.3.1.460.0.1337.198212400"/>
 <versionNumber value="1"/>
 <recordTarget>
  <patientRole>
   <id extension="${patientId}" root="1.2.276.0.76.3.1.460.0.1337.198212400"/>
   <id extension="A123456789" root="1.2.276.0.76.4.8"/>
   <id extension="109519005" root="1.2.276.0.76.4.5"/>
   <id extension="72101" root="1.2.276.0.76.4.7"/>
   <addr>
    <streetName>23</streetName>
    <houseNumber>123</houseNumber>
    <postalCode>12099</postalCode>
    <city>Berlin</city>
    <country>Deutschland</country>
   </addr>
   <telecom value="tel:+000"/>
   <telecom value="mailto:mocha-test-patient@doc-cirrus.com"/>
   <patient>
    <name>
     <prefix>Dr.</prefix>
     <given>Test</given>
     <family>Patient</family>
     <suffix>von</suffix>
    </name>
    <administrativeGenderCode code="M" codeSystem="2.16.840.1.113883.5.1"/>
    <birthTime value="19900101"/>
   </patient>
   <providerOrganization>
    <id extension="100030468" root="1.2.276.0.76.4.16"/>
    <id extension="200002000" root="1.2.276.0.76.4.17"/>
    <name>Peter Meter</name>
    <telecom value="mailto:do+contactPeterMeter@doc-cirrus.com"/>
    <addr>
     <streetName>sttrr</streetName>
     <houseNumber>1</houseNumber>
     <postalCode>10001</postalCode>
     <city>Berlin</city>
     <country>Deutschland</country>
    </addr>
   </providerOrganization>
  </patientRole>
 </recordTarget>
 <author>
  <functionCode code="ADM" codeSystem="2.16.840.1.113883.5.90"/>
  <time value="${moment( docLetterTimestamp ).format( 'YYYYMMDDHHmm' )}"/>
  <assignedAuthor>
   <id extension="999999900" root="1.2.276.0.76.4.16"/>
   <id extension="198212400" root="1.2.276.0.76.4.17"/>
   <assignedPerson>
    <name>
     <prefix/>
     <given>First name</given>
     <family>Last name</family>
     <suffix/>
    </name>
   </assignedPerson>
   <representedOrganization>
    <name>TestPraxis1</name>
    <telecom use="WP" value="tel:+491111111111"/>
    <telecom use="WP" value="fax:+111111"/>
    <telecom use="WP" value="mailto:asdsd@asdasd.de"/>
    <addr>
     <streetName>prac4Str.</streetName>
     <houseNumber>44</houseNumber>
     <postalCode>44444</postalCode>
     <city>berlin</city>
     <country>Deutschland</country>
    </addr>
   </representedOrganization>
  </assignedAuthor>
 </author>
 <custodian>
  <assignedCustodian>
   <representedCustodianOrganization>
    <id extension="198212400" root="1.2.276.0.76.4.17"/>
    <name>TestPraxis1</name>
    <telecom use="WP" value="tel:+491111111111"/>
    <telecom use="WP" value="fax:+111111"/>
    <telecom use="WP" value="mailto:asdsd@asdasd.de"/>
    <addr>
     <streetName>prac4Str.</streetName>
     <houseNumber>44</houseNumber>
     <postalCode>44444</postalCode>
     <city>berlin</city>
     <country>Deutschland</country>
    </addr>
   </representedCustodianOrganization>
  </assignedCustodian>
 </custodian>
 <legalAuthenticator>
  <time value="${moment( signer1Timestamp ).format( 'YYYYMMDDHHmm' )}"/>
  <signatureCode code="S"/>
  <assignedEntity>
   <id extension="999999900" root="1.2.276.0.76.4.16"/>
   <id extension="198212400" root="1.2.276.0.76.4.17"/>
   <assignedPerson>
    <name>
     <prefix/>
     <given>First name</given>
     <family>Last name</family>
     <suffix/>
    </name>
   </assignedPerson>
   <representedOrganization>
    <name>TestPraxis1</name>
    <telecom use="WP" value="tel:+491111111111"/>
    <telecom use="WP" value="fax:+111111"/>
    <telecom use="WP" value="mailto:asdsd@asdasd.de"/>
    <addr>
     <streetName>prac4Str.</streetName>
     <houseNumber>44</houseNumber>
     <postalCode>44444</postalCode>
     <city>berlin</city>
     <country>Deutschland</country>
    </addr>
   </representedOrganization>
  </assignedEntity>
 </legalAuthenticator>
 <authenticator>
  <time value="${moment( signer2Timestamp ).format( 'YYYYMMDDHHmm' )}"/>
  <signatureCode code="S"/>
  <assignedEntity>
   <id extension="999999900" root="1.2.276.0.76.4.16"/>
   <id extension="198212400" root="1.2.276.0.76.4.17"/>
   <assignedPerson>
    <name>
     <prefix>Dr.</prefix>
     <given>Foo</given>
     <family>Bar</family>
     <suffix>von</suffix>
    </name>
   </assignedPerson>
   <representedOrganization>
    <name>TestPraxis1</name>
    <telecom use="WP" value="tel:+491111111111"/>
    <telecom use="WP" value="fax:+111111"/>
    <telecom use="WP" value="mailto:asdsd@asdasd.de"/>
    <addr>
     <streetName>prac4Str.</streetName>
     <houseNumber>44</houseNumber>
     <postalCode>44444</postalCode>
     <city>berlin</city>
     <country>Deutschland</country>
    </addr>
   </representedOrganization>
  </assignedEntity>
 </authenticator>
 <component>
  <structuredBody>
   <component>
    <section/>
   </component>
  </structuredBody>
 </component>
</ClinicalDocument>`;