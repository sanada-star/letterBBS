#!/usr/bin/perl
print "Content-Type: text/plain\n\n";
eval { require Archive::Zip; Archive::Zip->import(); };
if ($@) {
    print "Error: $@";
} else {
    print "Archive::Zip is installed!";
}
