#!/usr/local/bin/perl

print "Content-type: text/html\n\n";
print "<html><body><h1>Environment Check</h1>";

# Check Archive::Zip
eval { require Archive::Zip; };
if ($@) {
    print "<p style='color:red'>Archive::Zip is NOT installed: $@</p>";
} else {
    print "<p style='color:green'>Archive::Zip is installed.</p>";
}

# Check IO::Compress::Zip
eval { require IO::Compress::Zip; };
if ($@) {
    print "<p style='color:red'>IO::Compress::Zip is NOT installed: $@</p>";
} else {
    print "<p style='color:green'>IO::Compress::Zip is installed.</p>";
}

print "<h2>Perl Version</h2><pre>$]</pre>";
print "<h2>INC</h2><pre>" . join("\n", @INC) . "</pre>";
print "</body></html>";
