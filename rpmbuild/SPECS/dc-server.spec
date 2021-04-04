%global __os_install_post %{nil}
%define _unpackaged_files_terminate_build 1
%define __jar_repack 0

%if 0%{rhel} < 8
%define __build_env scl enable devtoolset-9
%else
%define __build_env eval
%endif

Name: dc-server
Version: 4.19.0
Release: 1
License: Doc Cirrus Commercial
Summary: Doc Cirrus Server
URL: http://doc-cirrus.com
Packager: Doc Cirrus GmbH
BuildArch: x86_64
BuildRoot: dummy

%if 0%{rhel} < 8
BuildRequires: devtoolset-9
%else
BuildRequires: make
BuildRequires: automake
BuildRequires: gcc
BuildRequires: gcc-c++
BuildRequires: python2
%endif

BuildRequires: rsync
BuildRequires: git
BuildRequires: cairo-devel
BuildRequires: pango-devel
BuildRequires: libjpeg-turbo-devel
BuildRequires: giflib-devel
BuildRequires: cups-devel
BuildRequires: java-1.8.0-openjdk-devel
BuildRequires: libharu-devel


%systemd_requires
BuildRequires: systemd

Source1: prc.sudo
Source2: prc.logrotate
Source3: prc.rsyslog.conf
Source5: prc.service
Source6: prc.sysconfig
Source11: puc.logrotate
Source12: puc.rsyslog.conf
Source15: puc.service
Source21: vprc.logrotate
Source22: vprc.rsyslog.conf
Source25: vprc.service
Source26: vprc.sysconfig

%description

%clean
#rm -rf %{buildroot}

%package prc
Provides: dc-insuite
Conflicts: dc-server-vprc
Summary: Doc Cirrus Insuite
AutoReqProv: no
AutoReq: no
AutoProv: no
# common requirements
Requires(pre): shadow-utils
Requires: sudo
Requires: rsyslog
Requires: logrotate
Requires: zip
Requires: unzip
Requires: gzip
Requires: file
Requires: tar
Requires: coreutils
Requires: mongodb-org-tools >= 4.0
# common: pdf & image operations
Requires: ghostscript
Requires: perl-Image-ExifTool
Requires: dc-sejda-console
Requires: GraphicsMagick
Requires: libharu
# INF-34
Requires: tesseract
Requires: tesseract-langpack-deu
Requires: tesseract-langpack-ita
Requires: tesseract-langpack-spa
Requires: tesseract-langpack-fra
# common: canvas
Requires: libjpeg-turbo
Requires: pango
Requires: pangomm
Requires: cairo
Requires: cairomm
Requires: liberation-sans-fonts
Requires: giflib
Requires: lcdf-typetools
# common: dc packages
Requires: dc-catalogs
Requires: dc-catalogs-hci
Requires: dc-device-server-downloads
# (v)prc specific
Requires: dc-forms
Requires: dc-rules
Requires: /usr/bin/smbclient
# node java bridge
Requires: java-1.8.0-openjdk-devel
# Datensafe specific
Requires: dcmtk-static
%description prc

%package puc
Summary: Doc Cirrus Patient Portal
AutoReqProv: no
AutoReq: no
AutoProv: no
# common requirements
Requires(pre): shadow-utils
Requires: sudo
Requires: rsyslog
Requires: logrotate
Requires: zip
Requires: unzip
Requires: gzip
Requires: file
Requires: tar
Requires: coreutils
Requires: mongodb-org-tools >= 4.0
# common: pdf & image operations
Requires: ghostscript
Requires: perl-Image-ExifTool
Requires: dc-sejda-console
Requires: GraphicsMagick
Requires: libharu
# common: canvas
Requires: libjpeg-turbo
Requires: pango
Requires: pangomm
Requires: cairo
Requires: cairomm
Requires: liberation-sans-fonts
Requires: giflib
Requires: lcdf-typetools
# common: dc packages
Requires: dc-catalogs
Requires: dc-device-server-downloads

%description puc

%package vprc
Provides: dc-insuite
Conflicts: dc-server-prc
Summary: Doc Cirrus MTS
AutoReqProv: no
AutoReq: no
AutoProv: no
# common requirements
Requires(pre): shadow-utils
Requires: sudo
Requires: rsyslog
Requires: logrotate
Requires: zip
Requires: unzip
Requires: gzip
Requires: file
Requires: tar
Requires: coreutils
Requires: mongodb-org-tools >= 4.0
# common: pdf & image operations
Requires: ghostscript
Requires: perl-Image-ExifTool
Requires: dc-sejda-console
Requires: GraphicsMagick
Requires: libharu
# INF-34
Requires: tesseract
Requires: tesseract-langpack-deu
Requires: tesseract-langpack-ita
Requires: tesseract-langpack-spa
Requires: tesseract-langpack-fra
# common: canvas
Requires: libjpeg-turbo
Requires: pango
Requires: pangomm
Requires: cairo
Requires: cairomm
Requires: liberation-sans-fonts
Requires: giflib
Requires: lcdf-typetools
# common: dc packages
Requires: dc-catalogs
Requires: dc-catalogs-hci
Requires: dc-device-server-downloads
# (v)prc specific
Requires: dc-forms
Requires: dc-rules
Requires: /usr/bin/smbclient
# node java bridge
Requires: java-1.8.0-openjdk-devel
%description vprc


%pre prc
getent group prc >/dev/null || groupadd -r prc
getent passwd prc >/dev/null || \
    useradd -r -g prc -G prc -d /var/lib/prc -s /sbin/nologin prc

if [ "$1" -ge 2 ]; then
    # shutdown before doing anything
    service prc stop &>/dev/null || :
fi


%pre puc
getent group puc >/dev/null || groupadd -r puc
getent passwd puc >/dev/null || \
    useradd -r -g puc -G puc -d /var/lib/puc -s /sbin/nologin puc

if [ "$1" -ge 2 ]; then
    service puc stop &>/dev/null || :
fi


%pre vprc
getent group vprc >/dev/null || groupadd -r vprc
getent passwd vprc >/dev/null || \
    useradd -r -g vprc -G vprc -d /var/lib/vprc -s /sbin/nologin vprc

if [ "$1" -ge 2 ]; then
    service vprc stop &>/dev/null || :
fi


%post prc
service rsyslog restart &>/dev/null || :
%systemd_post prc.service

%post puc
service rsyslog restart &>/dev/null || :
%systemd_post puc.service

%post vprc
service rsyslog restart &>/dev/null || :
%systemd_post vprc.service


%preun prc
%systemd_preun prc.service

%preun puc
%systemd_preun puc.service

%preun vprc
%systemd_preun vprc.service


%postun prc
%systemd_postun prc.service

%postun puc
%systemd_postun puc.service

%postun vprc
%systemd_postun vprc.service

%build
%if 0%{rhel} >= 8
PYTHON_EXECUTABLE=/bin/python2
export PYTHON_EXECUTABLE
%endif


function _massiveCleanup {
  cleanupDirectory="$1"
  echo "Cleanup directory $cleanupDirectory"
  # function cleans up build files, readmes, tmp files and so on
  # cleanup configs
  rm -rf $cleanupDirectory/config/development
  rm -rf $cleanupDirectory/config/test
  # in case of puc/vprc: configs are created by ansible
  # in case of prc: configs are included in rpm area
  rm -f $cleanupDirectory/db.json
  rm -f $cleanupDirectory/email.json
  rm -f $cleanupDirectory/email-dev-raw.json
  rm -f $cleanupDirectory/jasperserver.json
  rm -f $cleanupDirectory/env.json
  rm -f $cleanupDirectory/sms.json
  rm -f $cleanupDirectory/ice.json
  rm -f $cleanupDirectory/friends.json
  rm -f $cleanupDirectory/jawbone.json
  rm -f $cleanupDirectory/https.json
  rm -f $cleanupDirectory/kvconnect.json
  rm -f $cleanupDirectory/mmiconnect.json
  rm -f $cleanupDirectory/inpacs.json
  rm -f $cleanupDirectory/ldap.json
  rm -f $cleanupDirectory/inpacs-dev.json
  rm -f $cleanupDirectory/puppetry.json
  rm -f $cleanupDirectory/puppetry-dev.json
  rm -f $cleanupDirectory/docs.json
  rm -f $cleanupDirectory/jira.json
  rm -f $cleanupDirectory/cors.json
  rm -f $cleanupDirectory/avscan-dev.json
  # cleanup build related
  rm -rf $cleanupDirectory/.gitlab-ci.yml
  rm -rf $cleanupDirectory/.idea $cleanupDirectory/Gruntfile.js
  rm -rf $cleanupDirectory/*.sh $cleanupDirectory/*.jar $cleanupDirectory/*.tmpl $cleanupDirectory/pre-commit
  # cleanup dc-server/var/
  rm -rf $cleanupDirectory/var
  rm -rf $cleanupDirectory/yuidoc*
  rm -rf $cleanupDirectory/*README*
  rm -f $cleanupDirectory/pre-commit*
  # todo filter stuff in node_modules
  # todo migrate cleanup stuff from original build.sh to here
  find $cleanupDirectory/node_modules -name test -or -name tests -or -name example -or -name examples -or -name demo -or -name '.idea' -type d | grep -v assets | xargs rm -rf
  find $cleanupDirectory/node_modules -iname '*.cc' -or -iname '*.c' -or -iname '*.make' -or -iname '*.mk' -or -iname '*.cmak*' -type f | grep -v assets | xargs rm -f
  find $cleanupDirectory -name *\~ -type f | grep -v assets | xargs rm -f
  find $cleanupDirectory -iname '.gitignore' -or -iname '.npmignore' -or -iname 'Makefil*' -or -iname '.jshint*' -or -iname CHANGELOG -or -name '.travis.yml' -type f | grep -v assets | xargs rm -f
  # cleanup runtime (npm obsolete now after build)
  rm -rf $cleanupDirectory/runtime/bin/npm $cleanupDirectory/runtime/etc $cleanupDirectory/runtime/lib $cleanupDirectory/runtime/share
}

JAVA_HOME=/usr/lib/jvm/java-1.8.0-openjdk
export JAVA_HOME

cd %{_builddir}
mkdir -p %{_builddir}/prc
rsync -a --exclude='rpmbuild' --exclude='.git' ../../ %{_builddir}/prc
cd %{_builddir}/prc
%{__build_env} "./build.sh git prc"
_massiveCleanup %{_builddir}/prc

cd %{_builddir}
mkdir -p %{_builddir}/vprc
rsync -a --exclude='rpmbuild' --exclude='.git' ../../ %{_builddir}/vprc
cd %{_builddir}/vprc
%{__build_env} "./build.sh git vprc"
_massiveCleanup %{_builddir}/vprc


%if 0%{rhel} == 7
cd %{_builddir}
mkdir -p %{_builddir}/puc
rsync -a --exclude='rpmbuild' --exclude='.git' ../../ %{_builddir}/puc
cd %{_builddir}/puc
%{__build_env} "./build.sh git puc"
_massiveCleanup %{_builddir}/puc
%endif

%install
rm -rf %{buildroot}
mkdir -p %{buildroot}

# PRC Area

%{__install} -p -D -m 0644 %{SOURCE5} %{buildroot}%{_unitdir}/prc.service
%{__install} -p -D -m 0640 %{SOURCE1} %{buildroot}%{_sysconfdir}/sudoers.d/prc
%{__install} -p -D -m 0644 %{SOURCE2} %{buildroot}%{_sysconfdir}/logrotate.d/prc
%{__install} -p -D -m 0644 %{SOURCE3} %{buildroot}%{_sysconfdir}/rsyslog.d/prc.conf
%{__install} -p -D -m 0644 %{SOURCE6} %{buildroot}%{_sysconfdir}/sysconfig/prc

%{__install} -m 700 -d %{buildroot}/var/log/prc
%{__install} -m 755 -d %{buildroot}/var/run/prc
%{__install} -m 750 -d %{buildroot}/var/tmp/prc
%{__install} -m 755 -d %{buildroot}/var/lib/prc

mv %{_builddir}/prc/* %{buildroot}/var/lib/prc
%{__install} -p -D -m 0640 ../../puppetry.json %{buildroot}/var/lib/prc/puppetry.json
%{__install} -p -D -m 0640 ../../mmiconnect.json %{buildroot}/var/lib/prc/mmiconnect.json
%{__install} -p -D -m 0640 ../../docs.json %{buildroot}/var/lib/prc/docs.json
%{__install} -p -D -m 0640 ../../cors.json %{buildroot}/var/lib/prc/cors.json

# VPRC Area

%{__install} -p -D -m 0644 %{SOURCE25} %{buildroot}%{_unitdir}/vprc.service
%{__install} -p -D -m 0644 %{SOURCE21} %{buildroot}%{_sysconfdir}/logrotate.d/vprc
%{__install} -p -D -m 0644 %{SOURCE22} %{buildroot}%{_sysconfdir}/rsyslog.d/vprc.conf
%{__install} -p -D -m 0644 %{SOURCE26} %{buildroot}%{_sysconfdir}/sysconfig/vprc

%{__install} -m 700 -d %{buildroot}/var/log/vprc
%{__install} -m 755 -d %{buildroot}/var/run/vprc
%{__install} -m 750 -d %{buildroot}/var/tmp/vprc
%{__install} -m 755 -d %{buildroot}/var/lib/vprc

mv %{_builddir}/vprc/* %{buildroot}/var/lib/vprc
%{__install} -p -D -m 0640 ../../puppetry.json %{buildroot}/var/lib/vprc/puppetry.json
%{__install} -p -D -m 0640 ../../mmiconnect.json %{buildroot}/var/lib/vprc/mmiconnect.json
%{__install} -p -D -m 0640 ../../docs.json %{buildroot}/var/lib/vprc/docs.json
%{__install} -p -D -m 0640 ../../cors.json %{buildroot}/var/lib/vprc/cors.json

# PUC Area

%if 0%{rhel} == 7
%{__install} -p -D -m 0644 %{SOURCE15} %{buildroot}%{_unitdir}/puc.service
%{__install} -p -D -m 0644 %{SOURCE11} %{buildroot}%{_sysconfdir}/logrotate.d/puc
%{__install} -p -D -m 0644 %{SOURCE12} %{buildroot}%{_sysconfdir}/rsyslog.d/puc.conf

%{__install} -m 700 -d %{buildroot}/var/log/puc
%{__install} -m 755 -d %{buildroot}/var/run/puc
%{__install} -m 750 -d %{buildroot}/var/tmp/puc
%{__install} -m 755 -d %{buildroot}/var/lib/puc

mv %{_builddir}/puc/* %{buildroot}/var/lib/puc
%{__install} -p -D -m 0640 ../../docs.json %{buildroot}/var/lib/puc/docs.json
%{__install} -p -D -m 0640 ../../cors.json %{buildroot}/var/lib/puc/cors.json
%endif

%files prc
%{_unitdir}/prc.service
%config(noreplace) %{_sysconfdir}/sysconfig/prc
%config(noreplace) %{_sysconfdir}/logrotate.d/prc
%config(noreplace) %{_sysconfdir}/rsyslog.d/prc.conf
%{_sysconfdir}/sudoers.d/prc
%dir %attr(0700, prc, prc) /var/log/prc
%dir %attr(0700, prc, prc) /var/run/prc
%dir %attr(0750, prc, prc) /var/tmp/prc
%defattr(-,prc,prc,-)
/var/lib/prc
%config(noreplace) /var/lib/prc/config/*.yaml
%config(noreplace) /var/lib/prc/puppetry.json
%config(noreplace) /var/lib/prc/mmiconnect.json
%config(noreplace) /var/lib/prc/docs.json
%config(noreplace) /var/lib/prc/cors.json

%files vprc
%{_unitdir}/vprc.service
%config(noreplace) %{_sysconfdir}/sysconfig/vprc
%config(noreplace) %{_sysconfdir}/logrotate.d/vprc
%config(noreplace) %{_sysconfdir}/rsyslog.d/vprc.conf
%dir %attr(0700, vprc, vprc) /var/log/vprc
%dir %attr(0700, vprc, vprc) /var/run/vprc
%dir %attr(0750, vprc, vprc) /var/tmp/vprc
%defattr(-,vprc,vprc,-)
/var/lib/vprc
%config(noreplace) /var/lib/vprc/config/*.yaml
%config(noreplace) /var/lib/vprc/puppetry.json
%config(noreplace) /var/lib/vprc/mmiconnect.json
%config(noreplace) /var/lib/vprc/docs.json
%config(noreplace) /var/lib/vprc/cors.json

%if 0%{rhel} == 7
%files puc
%{_unitdir}/puc.service
%config(noreplace) %{_sysconfdir}/logrotate.d/puc
%config(noreplace) %{_sysconfdir}/rsyslog.d/puc.conf
%dir %attr(0700, puc, puc) /var/log/puc
%dir %attr(0700, puc, puc) /var/run/puc
%dir %attr(0750, puc, puc) /var/tmp/puc
%defattr(-,puc,puc,-)
/var/lib/puc
%config(noreplace) /var/lib/puc/config/*.yaml
%config(noreplace) /var/lib/puc/docs.json
%config(noreplace) /var/lib/puc/cors.json
%endif
